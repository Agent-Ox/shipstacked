import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// DELETE — soft-remove a member association (Phase 4 §G.4).
// Sets profiles.team_entity_id back to NULL. No DDL, just an UPDATE. This is
// the team's lever to boot a hostile/incorrect self-association (LinkedIn
// stance: members link themselves, the team can unlink). Auth: cookie session,
// caller must be in team_admins for the team identified by <slug>.

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; username: string }> },
) {
  const { slug, username } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const db = admin()

  const { data: entity } = await db
    .from('entities')
    .select('id')
    .eq('slug', slug)
    .eq('kind', 'team')
    .maybeSingle()
  if (!entity) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const { data: adminRow } = await db
    .from('team_admins')
    .select('id')
    .eq('team_entity_id', entity.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!adminRow) return NextResponse.json({ error: 'Not an admin of this team' }, { status: 403 })

  // Only unlink a profile that is actually linked to THIS team.
  const { data: updated } = await db
    .from('profiles')
    .update({ team_entity_id: null })
    .eq('username', username)
    .eq('team_entity_id', entity.id)
    .select('id')
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Member not linked to this team' }, { status: 404 })
  }

  return NextResponse.json({ removed: true })
}
