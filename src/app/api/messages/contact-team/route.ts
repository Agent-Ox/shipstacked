import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEntityModes } from '@/lib/user'
import { notifyTeamAdminsOfContact } from '@/lib/team/notify'

// Contact a team (GAP 3). The conversation is keyed to subject_entity_id (not a
// builder_profile_id), and any admin of the team can read/reply (the shared
// inbox — see participant auth in /api/messages/[id] GET and /api/messages POST).
//
// Paywalled: starting a conversation with a team requires an active Full Access
// membership, exactly as starting one with a builder does (/api/messages POST).
// Contact is contact — the gate does not depend on who is on the other end.
export async function POST(req: Request) {
  const { user, modes } = await getEntityModes()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!modes.member) {
    return NextResponse.json(
      { error: 'An active subscription is required to message members' },
      { status: 403 },
    )
  }

  const body = await req.json()
  const { team_entity_id, message } = body
  if (!team_entity_id) return NextResponse.json({ error: 'team_entity_id required' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Must be a real team.
  const { data: entity } = await admin
    .from('entities')
    .select('id, kind')
    .eq('id', team_entity_id)
    .eq('kind', 'team')
    .maybeSingle()
  if (!entity) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  // Only PUBLISHED teams are contactable.
  const { data: tp } = await admin
    .from('team_profiles')
    .select('published')
    .eq('entity_id', team_entity_id)
    .maybeSingle()
  if (!tp?.published) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  // Can't contact a team you run.
  const { data: ownAdmin } = await admin
    .from('team_admins')
    .select('id')
    .eq('team_entity_id', team_entity_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (ownAdmin) return NextResponse.json({ error: "You can't contact your own team." }, { status: 400 })

  // Find-or-create the conversation (one per contacter ↔ team, job_id null).
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('subject_entity_id', team_entity_id)
    .eq('employer_email', user.email!)
    .is('job_id', null)
    .maybeSingle()

  let convId: string
  if (existing) {
    convId = existing.id
    await admin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    // A team conversation has no builder on the other end — the team IS the
    // counterparty, carried by subject_entity_id. builder_profile_id is left
    // unset rather than written as null: the column was NOT NULL, which made
    // every call to this route fail the insert. See
    // supabase/migrations/20260906_conversations_builder_profile_id_nullable.sql
    // (readers already tolerate a null builder: /api/messages resolves the team
    // inbox by subject_entity_id, and the hirer-side embed yields null).
    const { data: conv, error } = await admin
      .from('conversations')
      .insert([{
        employer_email: user.email!,
        subject_entity_id: team_entity_id,
        job_id: null,
        last_message_at: new Date().toISOString(),
      }])
      .select('id')
      .single()
    if (error || !conv) return NextResponse.json({ error: error?.message || 'Failed to create conversation' }, { status: 500 })
    convId = conv.id
  }

  // Optional first message.
  if (message?.trim()) {
    await admin.from('messages').insert([{
      conversation_id: convId,
      sender_email: user.email!,
      content: message.trim(),
      read: false,
    }])
    await admin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId)

    // Notify the team's admins of the inbound lead (fire-and-forget).
    notifyTeamAdminsOfContact({
      admin,
      teamEntityId: team_entity_id,
      senderEmail: user.email!,
      messagePreview: message.trim(),
    }).catch(() => {})
  }

  return NextResponse.json({ conversation: { id: convId } })
}
