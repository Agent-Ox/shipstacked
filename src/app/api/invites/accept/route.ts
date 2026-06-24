import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { findOrCreateHumanEntity } from '@/lib/entities'

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

// POST — accept an invite. Provisions a new user (or links an existing one) and,
// for team invites, links the accepting user's profile to the team.
export async function POST(req: Request) {
  let body: { token?: string; password?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const rawToken = body.token?.trim()
  if (!rawToken) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const tokenHash = sha256(rawToken)

  const { data: invite } = await admin
    .from('invites')
    .select('id, invitee_email, team_entity_id, status, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'This invite is no longer valid' }, { status: 409 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    await admin.from('invites').update({ status: 'expired' }).eq('id', invite.id).eq('status', 'pending')
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  // Determine new-vs-existing BEFORE the redeem so a password-validation failure
  // never consumes the invite.
  // TODO: listUsers() returns only the first page — acceptable at current scale;
  // revisit with a getUserByEmail/pagination path as the user base grows.
  const { data: userList } = await admin.auth.admin.listUsers()
  let authUser = userList?.users.find(u => u.email === invite.invitee_email) ?? null
  const isNewUser = !authUser

  // Only NEW users set a password here. An existing user accepting an invite is
  // already a real account — we must NOT reset their password from this route,
  // or a pending invite would become a password-reset vector. Existing users
  // just get linked + the invite marked accepted; they log in normally.
  const password = body.password
  if (isNewUser && (!password || password.length < 6)) {
    return NextResponse.json({ error: 'A password of at least 6 characters is required' }, { status: 400 })
  }

  // ATOMIC single-use redeem (checked CAS — only the winner proceeds).
  const { data: claimed } = await admin
    .from('invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id)
    .eq('status', 'pending')
    .select('id')
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'This invite was already accepted' }, { status: 409 })
  }

  // --- Provisioning (mirrors agent claim/complete/route.ts:49-103) ---
  if (isNewUser) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: invite.invitee_email,
      email_confirm: true,
      password,
      user_metadata: { created_via: 'invite' },
    })
    if (createErr || !created.user) {
      return NextResponse.json({ error: `Auth user creation failed: ${createErr?.message}` }, { status: 500 })
    }
    authUser = created.user
  }

  let entityResult
  try {
    entityResult = await findOrCreateHumanEntity(admin, authUser!)
  } catch {
    return NextResponse.json({ error: 'Entity creation failed' }, { status: 500 })
  }

  let { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', authUser!.id)
    .maybeSingle()

  if (!profile) {
    // Neutral, email-free placeholder username. The real name-based username is
    // generated on first publish (EditProfileForm). NEVER derive it from the
    // email — that would leak the email local-part into the public /u URL.
    let username = 'member' + Math.floor(100000 + Math.random() * 900000)
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await admin.from('profiles').select('id').eq('username', username).maybeSingle()
      if (!clash) break
      username = 'member' + Math.floor(100000 + Math.random() * 900000)
    }
    const { data: newProfile, error: profileErr } = await admin
      .from('profiles')
      .insert({
        user_id: authUser!.id,
        email: invite.invitee_email,
        username,
        full_name: '',
        published: false,
      })
      .select('id')
      .single()
    if (profileErr || !newProfile) {
      return NextResponse.json({ error: 'Profile creation failed' }, { status: 500 })
    }
    profile = newProfile

    await admin.from('profiles').update({ entity_id: entityResult.entity.id }).eq('id', profile.id)
    await admin.from('entities').update({ profile_id: profile.id }).eq('id', entityResult.entity.id)
  }

  // Team link (team invites only): link the accepting user's OWN profile row.
  if (invite.team_entity_id) {
    await admin.from('profiles').update({ team_entity_id: invite.team_entity_id }).eq('user_id', authUser!.id)
  }

  // Stamp who accepted, for attribution.
  await admin.from('invites').update({ accepted_user_id: authUser!.id }).eq('id', invite.id)

  return NextResponse.json({ ok: true, redirect: '/dashboard/edit' })
}
