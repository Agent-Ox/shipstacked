import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getEntityModes } from '@/lib/user'
import { defaultMessagingMode } from '@/lib/auth-routing'
import { notifyTeamAdminsOfContact } from '@/lib/team/notify'
import { resolveOrgByEmail } from '@/lib/org/resolve-by-email'

const resend = new Resend(process.env.RESEND_API_KEY)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

// Stage 5c: resolve the authed hirer's org entity to attribute a new conversation
// to (subject_entity_id). Mirrors /api/jobs (5b) — a hirer IS an org owner
// post-D2b-1 (buyers mint kind='org'; teams have kind='team'). Returns null if
// none — callers dual-write with employer_email (don't block messaging).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveOwnedOrgId(admin: any, userId: string): Promise<number | null> {
  const { data } = await admin
    .from('entities')
    .select('id')
    .eq('owner_user_id', userId)
    .in('kind', ['org', 'team'])
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()
  return (data as { id: number } | null)?.id ?? null
}

// GET — fetch conversations for current user (?as=builder|hirer),
// or create/get one for ?new=profileId (hirer only)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const newProfileId = searchParams.get('new')
  const asParam = searchParams.get('as')

  const { user, modes, profile } = await getEntityModes()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Handle ?new=profileId — find existing or create new conversation (member only)
  if (newProfileId) {
    if (!modes.member) return NextResponse.json({ error: 'An active subscription is required to message members' }, { status: 403 })

    const { data: existing } = await admin
      .from('conversations')
      .select('*, profiles!builder_profile_id(username, full_name, avatar_url, verified), jobs(role_title, company_name)')
      .eq('employer_email', user.email!)
      .eq('builder_profile_id', newProfileId)
      .is('job_id', null)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ conversation: existing })
    }

    const { data: conv } = await admin
      .from('conversations')
      .insert({
        employer_email: user.email!,
        subject_entity_id: await resolveOwnedOrgId(admin, user.id),
        builder_profile_id: newProfileId,
        job_id: null,
        last_message_at: new Date().toISOString(),
      })
      .select('*, profiles!builder_profile_id(username, full_name, avatar_url, verified), jobs(role_title, company_name)')
      .single()
    return NextResponse.json({ conversation: conv })
  }

  // ?as=team&entity={id} — a team's shared inbox. Self-contained (the
  // builder/hirer paths below are untouched). Only an admin of the team may list.
  if (asParam === 'team') {
    const entityId = searchParams.get('entity')
    if (!entityId) return NextResponse.json({ error: 'entity required' }, { status: 400 })
    const { data: ta } = await admin
      .from('team_admins')
      .select('id')
      .eq('team_entity_id', entityId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!ta) return NextResponse.json({ error: 'Not an admin of this team' }, { status: 403 })

    const { data: rawTeamConvs } = await admin
      .from('conversations')
      .select('*, jobs(role_title, company_name)')
      .eq('subject_entity_id', entityId)
      .order('last_message_at', { ascending: false })
    const teamConvsRaw = rawTeamConvs || []

    // Resolve the OTHER party (the contacter on employer_email) for display.
    // Stage 5d: entity-first via the shared resolveOrgByEmail helper (the
    // contacter's org is NOT this conv's subject_entity_id — that's the team being
    // viewed). Fall back to the builder profile name, then the raw email.
    const contacterEmails = [...new Set(teamConvsRaw.map((c: any) => c.employer_email))]
    const { data: profs } = contacterEmails.length > 0
      ? await admin.from('profiles').select('email, full_name, username, avatar_url').in('email', contacterEmails)
      : { data: [] as any[] }
    const prMap = Object.fromEntries((profs || []).map((p: any) => [p.email, p]))
    const orgByEmail = await resolveOrgByEmail(admin, contacterEmails)

    const teamConvs = teamConvsRaw.map((c: any) => {
      const pr = prMap[c.employer_email]
      const org = orgByEmail.get(c.employer_email)
      return {
        ...c,
        contacter: {
          name: org?.team_name || pr?.full_name || c.employer_email,
          logo_url: org?.logo_url || pr?.avatar_url || null,
          username: pr?.username || null,
        },
      }
    })

    // Same last-message + unread enrichment as the builder/hirer paths.
    const ids = teamConvs.map((c: any) => c.id)
    const lastMap: Record<string, any> = {}
    const unread: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: recent } = await admin
        .from('messages').select('conversation_id, content, sender_email, created_at')
        .in('conversation_id', ids).order('created_at', { ascending: false })
      for (const m of (recent || [])) if (!lastMap[m.conversation_id]) lastMap[m.conversation_id] = m
      const { data: un } = await admin
        .from('messages').select('conversation_id')
        .in('conversation_id', ids).eq('read', false).neq('sender_email', user.email!)
      for (const m of (un || [])) unread[m.conversation_id] = (unread[m.conversation_id] || 0) + 1
    }
    return NextResponse.json({
      conversations: teamConvs.map((c: any) => ({ ...c, last_message: lastMap[c.id] || null, unread_count: unread[c.id] || 0 })),
    })
  }

  // Resolve which side the request is fetching for
  const as = (asParam === 'builder' || asParam === 'hirer')
    ? asParam
    : defaultMessagingMode(modes)

  if (!as) return NextResponse.json({ conversations: [] })

  if (as === 'hirer' && !modes.hirer) {
    return NextResponse.json({ error: 'Hirer mode not active' }, { status: 403 })
  }
  if (as === 'builder' && !modes.builder) {
    return NextResponse.json({ error: 'Builder mode not active' }, { status: 403 })
  }

  let conversations: any[] = []

  if (as === 'hirer') {
    const { data } = await admin
      .from('conversations')
      .select('*, profiles!builder_profile_id(username, full_name, avatar_url, verified), jobs(role_title)')
      .eq('employer_email', user.email)
      .order('last_message_at', { ascending: false })
    conversations = data || []
  } else {
    // as === 'builder' — use the profile already fetched by getEntityModes()
    if (profile) {
      const { data } = await admin
        .from('conversations')
        .select('*, jobs(role_title, company_name)')
        .eq('builder_profile_id', profile.id)
        .order('last_message_at', { ascending: false })

      const convs = data || []

      // Hirer identity — Stage 5d: resolve via the conv's subject_entity_id (the
      // hirer's org) → team_profiles. Published-gated: builders see the org name
      // only if it's published (the private-hirer promise — an unpublished or
      // legacy/unkeyed conv shows no name/logo). employer_profiles is gone.
      const subjIds = [...new Set(convs.map((c: any) => c.subject_entity_id).filter(Boolean))]
      const { data: orgTps } = subjIds.length > 0
        ? await admin.from('team_profiles').select('entity_id, team_name, logo_url, published').in('entity_id', subjIds)
        : { data: [] }
      const orgByEnt = Object.fromEntries((orgTps || []).map((t: any) => [t.entity_id, t]))

      conversations = convs.map((conv: any) => {
        const org = conv.subject_entity_id ? orgByEnt[conv.subject_entity_id] : null
        const employer_profile = (org && org.published)
          ? { company_name: org.team_name, logo_url: org.logo_url ?? null }
          : null
        return { ...conv, employer_profile }
      })
    }
  }

  // Bulk fetch last messages and unread counts — 2 queries total instead of 2N
  const convIds = conversations.map((c: any) => c.id)

  let lastMsgMap: Record<string, any> = {}
  let unreadMap: Record<string, number> = {}

  if (convIds.length > 0) {
    const { data: recentMsgs } = await admin
      .from('messages')
      .select('conversation_id, content, sender_email, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })

    for (const msg of (recentMsgs || [])) {
      if (!lastMsgMap[msg.conversation_id]) {
        lastMsgMap[msg.conversation_id] = msg
      }
    }

    const { data: unreadMsgs } = await admin
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .eq('read', false)
      .neq('sender_email', user.email!)

    for (const msg of (unreadMsgs || [])) {
      unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1
    }
  }

  const enriched = conversations.map((conv: any) => ({
    ...conv,
    last_message: lastMsgMap[conv.id] || null,
    unread_count: unreadMap[conv.id] || 0,
  }))

  return NextResponse.json({ conversations: enriched })
}

// POST — send a message (creates conversation if needed)
export async function POST(req: Request) {
  const { user, modes } = await getEntityModes()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const { conversation_id, content, employer_email, builder_profile_id, job_id } = body

  if (!content?.trim()) return NextResponse.json({ error: 'Message content required' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let convId = conversation_id

  if (!convId) {
    if (!employer_email || !builder_profile_id) {
      return NextResponse.json({ error: 'employer_email and builder_profile_id required for new conversation' }, { status: 400 })
    }

    // Paywall: only a paid member, acting as themselves, may START a conversation.
    if (!modes.member) {
      return NextResponse.json({ error: 'An active subscription is required to message members' }, { status: 403 })
    }
    if (employer_email !== user.email) {
      return NextResponse.json({ error: 'employer_email must match the authenticated user' }, { status: 403 })
    }

    // Stage 5c: attribute the new conversation to the hirer's org entity
    // (employer_email === user.email, validated above). Dual-write with
    // employer_email; null if no entity resolves (don't block messaging).
    const subjectEntityId = await resolveOwnedOrgId(admin, user.id)

    let conv: any = null
    let convError: any = null

    if (!job_id) {
      const { data: existing } = await admin
        .from('conversations')
        .select()
        .eq('employer_email', employer_email)
        .eq('builder_profile_id', builder_profile_id)
        .is('job_id', null)
        .maybeSingle()

      if (existing) {
        conv = existing
        await admin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', existing.id)
      } else {
        const { data: newConv, error } = await admin
          .from('conversations')
          .insert([{ employer_email, subject_entity_id: subjectEntityId, builder_profile_id, job_id: null, last_message_at: new Date().toISOString() }])
          .select().single()
        conv = newConv
        convError = error
      }
    } else {
      const { data: newConv, error } = await admin
        .from('conversations')
        .upsert({ employer_email, subject_entity_id: subjectEntityId, builder_profile_id, job_id, last_message_at: new Date().toISOString() },
          { onConflict: 'employer_email,builder_profile_id,job_id' })
        .select().single()
      conv = newConv
      convError = error
    }

    if (convError || !conv) {
      return NextResponse.json({ error: convError?.message || 'Failed to create conversation' }, { status: 500 })
    }
    convId = conv.id
  } else {
    // Reply into an existing conversation — sender must be a participant (the
    // hirer/client on employer_email, or the builder). Blocks injecting messages
    // into threads you're not part of. No paywall here so builders (and inquiry
    // clients) can always reply.
    const { data: existingConv } = await admin
      .from('conversations')
      .select('employer_email, subject_entity_id, profiles!builder_profile_id(email)')
      .eq('id', convId)
      .maybeSingle()
    if (!existingConv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    const builderEmail = (existingConv as any).profiles?.email
    let isParticipant = user.email === existingConv.employer_email || user.email === builderEmail
    // Team conversations (subject_entity_id set): any team admin can reply
    // (shared inbox). Never fires for null subject_entity_id.
    if (!isParticipant && (existingConv as any).subject_entity_id) {
      const { data: ta } = await admin
        .from('team_admins')
        .select('id')
        .eq('team_entity_id', (existingConv as any).subject_entity_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (ta) isParticipant = true
    }
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 })
    }
  }

  const { data: message, error: msgError } = await admin
    .from('messages')
    .insert([{
      conversation_id: convId,
      sender_email: user.email!,
      content: content.trim(),
      read: false,
    }])
    .select()
    .single()

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })

  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', convId)

  const { data: conv } = await admin
    .from('conversations')
    .select('*, profiles!builder_profile_id(email, full_name, username)')
    .eq('id', convId)
    .maybeSingle()

  // Stage 5d: hirer identity for the notification email — resolve the org's
  // team_profiles via subject_entity_id (published-gated), not employer_profiles.
  let hirerProfileRow: any = null
  if (conv && (conv as any).subject_entity_id) {
    const { data: tp } = await admin
      .from('team_profiles')
      .select('team_name, published')
      .eq('entity_id', (conv as any).subject_entity_id)
      .maybeSingle()
    if (tp && (tp as any).published) hirerProfileRow = { company_name: (tp as any).team_name, public: true }
  }
  ;(conv as any).employer_profile = hirerProfileRow

  // Team conversation: when the contacter (employer_email) sends inbound, notify
  // the team's admins (fire-and-forget). Admin replies are handled by the
  // existing block below (which emails the contacter) — that path is untouched.
  if (conv && (conv as any).subject_entity_id && user.email === conv.employer_email) {
    notifyTeamAdminsOfContact({
      admin,
      teamEntityId: (conv as any).subject_entity_id,
      senderEmail: user.email!,
      messagePreview: content.trim(),
    }).catch(() => {})
  }

  if (conv) {
    const builderEmail = (conv.profiles as any)?.email
    const builderName = (conv.profiles as any)?.full_name
    const recipientEmail = user.email === conv.employer_email ? builderEmail : conv.employer_email

    const { count: msgCount } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', convId)

    if ((msgCount || 0) <= 1 && recipientEmail) {
      const isHirerSending = user.email === conv.employer_email
      // Recipient's inbox URL — unified /messages page with mode tab
      const inboxUrl = isHirerSending
        ? `${siteUrl}/messages?as=builder`
        : `${siteUrl}/messages?as=hirer`

      try {
        await resend.emails.send({
          from: 'ShipStacked <hello@shipstacked.com>',
          to: recipientEmail,
          subject: isHirerSending
            ? `New message about your ShipStacked profile`
            : `New message from ${builderName} on ShipStacked`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
              <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 0.5rem;">
                New message on ShipStacked
              </h2>
              <p style="color: #6e6e73; font-size: 14px; line-height: 1.6; margin-bottom: 1rem;">
                ${isHirerSending ? ((conv.employer_profile?.public && conv.employer_profile?.company_name) ? conv.employer_profile.company_name : 'A hirer on ShipStacked') : builderName} sent you a message:
              </p>
              <div style="background: #f5f5f7; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem; font-size: 14px; color: #3d3d3f; line-height: 1.6;">
                ${content.trim()}
              </div>
              <a href="${inboxUrl}"
                style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500;">
                Reply on ShipStacked →
              </a>
              <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
              <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work platform for AI-native builders.</p>
            </div>
          `
        })
      } catch (e) {
        console.error('Message notification email failed:', e)
      }
    }
  }

  return NextResponse.json({ message, conversation_id: convId })
}
