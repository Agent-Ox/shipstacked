import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
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
    // empty state instead of the /hirers#pricing bounce. Full Access activates on
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

  // Resolve the user's ORG (team_admins → entity). A team owner already has an
  // org identity — their team; when they hire, they hire AS it (6994de2). Stage 3:
  // this org's team_profiles row IS the company profile the hirer form edits.
  const { data: teamRow } = await supabase
    .from('team_admins')
    .select('team_entity_id, team:entities!team_admins_team_entity_id_fkey(id, slug, display_name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  const teamRel = (teamRow as any)?.team
  const team = Array.isArray(teamRel) ? teamRel[0] : teamRel
  const isTeamOwner = !!teamRow
  const orgEntityId: number | null = (teamRow as any)?.team_entity_id ?? null
  const teamSlug: string | null = team?.slug ?? null
  const teamName: string | null = team?.display_name ?? null

  // Stage 3: load the company profile from the ORG's team_profiles row (mapped to
  // the HirerProfile shape the form expects). team_profiles has no authenticated
  // self-read RLS, so read it with the service-role client, scoped to the org the
  // user is verified team_admin of (resolved above via self-read RLS). Pre-Stage-2
  // hirers (no org) fall back to employer_profiles for compat until Stage 7.
  let hirerProfile: any = null
  if (orgEntityId != null) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: op } = await admin
      .from('team_profiles')
      .select('*')
      .eq('entity_id', orgEntityId)
      .maybeSingle()
    if (op) {
      // team_profiles → HirerProfile (reverse of the /api/hirer/org-profile map).
      hirerProfile = {
        id: String(orgEntityId), // org profile row always exists → hasProfile=true
        email: user.email!,
        company_name: op.team_name ?? undefined,
        about: op.description ?? undefined,
        what_they_build: op.what_they_build ?? undefined,
        location: op.location ?? undefined,
        team_size: op.team_size_range ?? undefined,
        website_url: op.website_url ?? undefined,
        linkedin_url: op.linkedin_url ?? undefined,
        x_url: op.x_url ?? undefined,
        logo_url: op.logo_url ?? undefined,
        industry: op.industry ?? undefined,
        hiring_type: op.hiring_type ?? undefined,
        public: op.published ?? false,
        hires: op.hires ?? false,
        slug: teamSlug ?? undefined,
      }
    }
  } else {
    const { data: ep } = await supabase
      .from('employer_profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()
    hirerProfile = ep
  }

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
      orgEntityId={orgEntityId}
    />
  )
}
