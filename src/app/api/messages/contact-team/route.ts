import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { notifyTeamAdminsOfContact } from '@/lib/team/notify'

// Contact a team (GAP 3). Anyone logged-in can message a PUBLISHED team; the
// conversation is keyed to subject_entity_id (not a builder_profile_id), and any
// admin of the team can read/reply (the shared inbox — see participant auth in
// /api/messages/[id] GET and /api/messages POST).
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

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
    const { data: conv, error } = await admin
      .from('conversations')
      .insert([{
        employer_email: user.email!,
        subject_entity_id: team_entity_id,
        builder_profile_id: null,
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
