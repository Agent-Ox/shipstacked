import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// DELETE — revoke a pending invite. Allowed for the inviter, or an admin of the
// invite's team. Only pending invites can be revoked.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const admin = adminClient()

  const { data: invite } = await admin
    .from('invites')
    .select('id, inviter_user_id, team_entity_id, status')
    .eq('id', id)
    .maybeSingle()
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  // Authorize: the inviter, or an admin of the invite's team.
  let allowed = invite.inviter_user_id === user.id
  if (!allowed && invite.team_entity_id) {
    const { data: adminRow } = await admin
      .from('team_admins')
      .select('id')
      .eq('team_entity_id', invite.team_entity_id)
      .eq('user_id', user.id)
      .maybeSingle()
    allowed = !!adminRow
  }
  if (!allowed) return NextResponse.json({ error: 'Not allowed to revoke this invite' }, { status: 403 })

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: `Cannot revoke an invite that is ${invite.status}` }, { status: 409 })
  }

  const { error: updErr } = await admin
    .from('invites')
    .update({ status: 'revoked' })
    .eq('id', invite.id)
    .eq('status', 'pending')
  if (updErr) return NextResponse.json({ error: 'Could not revoke invite' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
