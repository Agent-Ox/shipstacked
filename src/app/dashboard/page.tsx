import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import BuilderDashboardClient from './BuilderDashboardClient'
import AgentOnboarding from './AgentOnboarding'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const agentMode = params.agent === '1'

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, projects(*), skills(*)')
    .eq('email', user.email)
    .maybeSingle()

  // Agent mode: show onboarding screen regardless of profile state
  // No profile + not agent mode: redirect to join
  if (agentMode || !profile) {
    return <AgentOnboarding />
  }

  // Normal dashboard
  const { data: applications } = await supabase
    .from('applications')
    .select('*, jobs(*)')
    .eq('builder_email', user.email)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: employers } = await supabase
    .from('employer_profiles')
    .select('*')
    .eq('public', true)
    .order('created_at', { ascending: false })
    .limit(6)

  const { data: githubData } = await supabase
    .from('github_data')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle()

  const { count: provenPostCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .not('outcome', 'is', null)
    .neq('outcome', '')
    .not('url', 'is', null)
    .neq('url', '')

  return (
    <BuilderDashboardClient
      profile={profile}
      applications={applications || []}
      employers={employers || []}
      email={user.email!}
      githubData={githubData || null}
      velocityScore={profile?.velocity_score || 0}
      provenPostCount={provenPostCount || 0}
    />
  )
}
