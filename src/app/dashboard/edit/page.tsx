import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import EditProfileForm from './EditProfileForm'

export default async function EditProfilePage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!profile) redirect('/join')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('profile_id', profile.id)
    .order('display_order')

  const { data: skills } = await supabase
    .from('skills')
    .select('*')
    .eq('profile_id', profile.id)

  // Phase 4 §H.3: hydrate the linked team (if any) server-side so the form's
  // autocomplete field shows the current link without a client fetch on mount.
  // Service-role read (matches §F/§G) to avoid anon-grant ambiguity on the new
  // team tables. Hydrated regardless of published — the builder should see
  // their current link state even if the team later unpublished.
  let initialTeam: { entity_id: number; slug: string; team_name: string; logo_url: string | null } | null = null
  if (profile.team_entity_id) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: te } = await admin
      .from('entities')
      .select('slug, display_name')
      .eq('id', profile.team_entity_id)
      .eq('kind', 'team')
      .maybeSingle()
    if (te) {
      const { data: tp } = await admin
        .from('team_profiles')
        .select('team_name, logo_url')
        .eq('entity_id', profile.team_entity_id)
        .maybeSingle()
      initialTeam = {
        entity_id: profile.team_entity_id,
        slug: te.slug,
        team_name: tp?.team_name || te.display_name,
        logo_url: tp?.logo_url ?? null,
      }
    }
  }

  return (
    <EditProfileForm
      profile={profile}
      projects={projects || []}
      skills={skills || []}
      initialTeam={initialTeam}
    />
  )
}