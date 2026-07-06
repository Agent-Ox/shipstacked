import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import HirerDashboardClient from './HirerDashboardClient'
import BuyerOnlyEmptyState from './BuyerOnlyEmptyState'

export default async function HirerDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('email', user.email)
    .eq('status', 'active')
    .eq('product', 'full_access')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    // Align with getEntityModes (src/lib/user.ts:42): even if a lifecycle event
    // was missed and status is still 'active', access expires at the paid-through
    // period end. Keeps the /hirer dashboard gate consistent with the platform gate.
    .or(`current_period_end.is.null,current_period_end.gt.${now}`)
    .maybeSingle()

  if (!sub) {
    // Batch 4 D3=(b): Card 4 buyer-only users (no subscription, came in via
    // the /join Card 4 path with user_metadata.role='client') see a dedicated
    // empty state instead of the /hirers#pricing bounce. Buyer Mode activates on
    // first paid action via /api/checkout (D1=b).
    const metaRole = user.user_metadata?.role
    if (metaRole === 'client') {
      return <BuyerOnlyEmptyState email={user.email!} />
    }
    redirect('/hirers#pricing')
  }

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('employer_email', user.email)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: hirerProfile } = await supabase
    .from('employer_profiles')
    .select('*')
    .eq('email', user.email)
    .maybeSingle()

  // A team owner (team_admins row) already has an org identity — their team.
  // When they enable hiring they hire AS their team, so the /hirer dashboard
  // must NOT push a second, overlapping company profile. Resolve team ownership
  // + the team's slug/display name (mirrors getUserState / NavBar team query).
  const { data: teamRow } = await supabase
    .from('team_admins')
    .select('team:entities!team_admins_team_entity_id_fkey(slug, display_name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  const teamRel = (teamRow as any)?.team
  const team = Array.isArray(teamRel) ? teamRel[0] : teamRel
  const isTeamOwner = !!teamRow
  const teamSlug: string | null = team?.slug ?? null
  const teamName: string | null = team?.display_name ?? null

  const jobIds = (jobs || []).map(j => j.id)
  const { data: applications } = jobIds.length > 0
    ? await supabase
        .from('applications')
        .select('*, profiles(username)')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const createdAt = new Date(sub.created_at)
  const renewsAt = new Date(createdAt)
  renewsAt.setMonth(renewsAt.getMonth() + 1)
  const renewsString = renewsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <HirerDashboardClient
      email={user.email!}
      renewsString={renewsString}
      jobs={jobs || []}
      hirerProfile={hirerProfile}
      applications={applications || []}
      isTeamOwner={isTeamOwner}
      teamSlug={teamSlug}
      teamName={teamName}
    />
  )
}
