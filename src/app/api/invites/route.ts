import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'
import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { rateLimit } from '@/lib/rateLimit'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

// Mirrors the agent-claim token shape (claim/route.ts:8-12): 20 random bytes,
// base64url, strip non-alnum, 25 chars — only the sha256 hash is persisted.
function generateInviteToken(): string {
  const base = randomBytes(20).toString('base64url').replace(/[-_]/g, '').slice(0, 25)
  return `inv_${base}`
}

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET — list the caller's own sent invites (never exposes token_hash).
// Optional ?team_entity_id= filter; if present the caller must admin that team.
export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = adminClient()
  const url = new URL(req.url)
  const teamParam = url.searchParams.get('team_entity_id')

  let query = admin
    .from('invites')
    .select('id, invitee_email, status, team_entity_id, created_at, expires_at, accepted_at')
    .eq('inviter_user_id', user.id)
    .order('created_at', { ascending: false })

  if (teamParam) {
    const teamEntityId = Number(teamParam)
    const { data: adminRow } = await admin
      .from('team_admins')
      .select('id')
      .eq('team_entity_id', teamEntityId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!adminRow) return NextResponse.json({ error: 'Not an admin of this team' }, { status: 403 })
    query = query.eq('team_entity_id', teamEntityId)
  }

  const { data: invites, error } = await query
  if (error) return NextResponse.json({ error: 'Could not load invites' }, { status: 500 })
  return NextResponse.json({ invites: invites ?? [] })
}

// POST — create + email a team or generic invite.
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: { email?: string; team_entity_id?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const email = body.email?.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  const teamEntityId = body.team_entity_id ?? null

  // Rate limit: 20 invite sends per inviter per hour.
  const rl = await rateLimit('invite:' + user.id, 3600, 20)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many invites. Try again later.' }, { status: 429 })
  }

  const admin = adminClient()

  // Team invite: caller must be an admin of the team (inline shape mirrors
  // members/[username]/route.ts:36-42).
  if (teamEntityId) {
    const { data: adminRow } = await admin
      .from('team_admins')
      .select('id')
      .eq('team_entity_id', teamEntityId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!adminRow) return NextResponse.json({ error: 'Not an admin of this team' }, { status: 403 })
  }

  const rawToken = generateInviteToken()
  const tokenHash = sha256(rawToken)

  const { data: invite, error: insertErr } = await admin
    .from('invites')
    .insert({
      token_hash: tokenHash,
      invitee_email: email,
      inviter_user_id: user.id,
      team_entity_id: teamEntityId,
      status: 'pending',
    })
    .select('id, invitee_email, status, expires_at')
    .single()

  if (insertErr || !invite) {
    // Partial-unique indexes (per-team-pending / generic-pending) enforce dedupe.
    if (insertErr?.code === '23505') {
      return NextResponse.json({ error: 'That email already has a pending invite.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Could not create invite' }, { status: 500 })
  }

  // Resolve display context for the email (best-effort; never blocks).
  const { data: inviterProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('user_id', user.id)
    .maybeSingle()
  const inviterName = inviterProfile?.full_name?.trim() || user.email || 'A ShipStacked member'

  let teamName: string | null = null
  if (teamEntityId) {
    const { data: teamEnt } = await admin
      .from('entities')
      .select('display_name')
      .eq('id', teamEntityId)
      .maybeSingle()
    teamName = teamEnt?.display_name ?? null
  }

  const acceptUrl = `${siteUrl}/invite/${rawToken}`
  const subject = teamName
    ? `${inviterName} invited you to join ${teamName} on ShipStacked`
    : `${inviterName} invited you to ShipStacked`
  const intro = teamName
    ? `${inviterName} invited you to join <strong>${teamName}</strong> on ShipStacked — the proof-of-work network for AI-native builders.`
    : `${inviterName} invited you to ShipStacked — the proof-of-work network for AI-native builders.`

  // Email is best-effort: a failed send must not roll back a valid invite row.
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: email,
      subject,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h1 style="font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em;">You're invited.</h1>
          <p style="color: #6e6e73; font-size: 15px; line-height: 1.6;">${intro}</p>
          <a href="${acceptUrl}"
            style="display: inline-block; margin: 1.5rem 0 1rem; padding: 0.875rem 2rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 15px; font-weight: 600;">
            Accept invite →
          </a>
          <p style="color: #aeaeb2; font-size: 13px; line-height: 1.6;">If you weren't expecting this, you can ignore this email — no account is created until you accept.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work network for AI-native talent.</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Failed to send invite email:', e)
  }

  return NextResponse.json({
    ok: true,
    invite: {
      id: invite.id,
      invitee_email: invite.invitee_email,
      status: invite.status,
      expires_at: invite.expires_at,
    },
  })
}
