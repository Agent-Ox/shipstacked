import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import BuilderDashboardClient from './BuilderDashboardClient'
import DashboardShell from './DashboardShell'
import { getUserState } from '@/lib/user'
import { listActiveCollections } from '@/lib/collections/collections'
import { listMembershipsForProfile } from '@/lib/collections/consent'
import { extractHost, isSharedDocHost } from '@/lib/ranking/quality-score'

// Phase 9 Part 1: pillar-aware dashboard.
// - Builder-only users render the existing BuilderDashboardClient unchanged
//   (byte-identical — zero regression for the 40+ existing solo builders).
// - Multi-pillar OR non-builder users render DashboardShell with stacked
//   pillar sections. No user is redirected to /join unless they have zero
//   pillar identity (no profile, team, agent, subscription, or client role).

// Loads the exact data BuilderDashboardClient expects (unchanged from the
// original dashboard data-load). Returned as props so both the builder-only
// path and the multi-pillar path render an identical builder experience.
async function loadBuilderProps(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, email: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, projects(*), skills(*)')
    .eq('email', email)
    .maybeSingle()

  if (!profile) return null

  const { data: applications } = await supabase
    .from('applications')
    .select('*, jobs(*)')
    .eq('builder_email', email)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: hirers } = await supabase
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

  // The "has a build" signal now lives in projects (the signup build was
  // rerouted from posts → projects). Count proven projects (prose + link,
  // mirroring the old outcome+url bar) AND keep counting legacy proven posts
  // so existing builders don't regress. provenPostCount = the sum.
  const { count: provenProjectCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .not('description', 'is', null)
    .neq('description', '')
    .not('project_url', 'is', null)
    .neq('project_url', '')

  const { count: provenLegacyPostCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .not('outcome', 'is', null)
    .neq('outcome', '')
    .not('url', 'is', null)
    .neq('url', '')

  const provenPostCount = (provenProjectCount || 0) + (provenLegacyPostCount || 0)

  // Proof-of-Work card data — keyed on the builder's entity; unlinked profiles
  // (entity_id null) show the empty state.
  let l1Count = 0
  let l0Count = 0
  let distinctHosts = 0
  // True effective-receipt count (L1 with a non-blocklisted host) — mirrors
  // quality-score.ts l1HostStats EXACTLY. l1Count counts ALL L1 (incl.
  // shared-doc hosts) so it is an UPPER BOUND, not the ranking input; the
  // ranking gate must use effectiveReceiptCount.
  let effectiveReceiptCount = 0
  let lastShippedAt: string | null = null
  if (profile.entity_id) {
    const { data: powReceipts } = await supabase
      .from('proof_receipts')
      .select('verification_level, artifacts, issued_at')
      .eq('subject_id', profile.entity_id)
    const hosts = new Set<string>()
    for (const r of (powReceipts || [])) {
      if (r.verification_level === 'L1_artifact_confirmed') {
        l1Count++
        const artifacts = Array.isArray(r.artifacts) ? (r.artifacts as Array<{ url?: string | null }>) : []
        const host = extractHost(artifacts[0]?.url)
        if (host && !isSharedDocHost(host)) { hosts.add(host); effectiveReceiptCount++ }
      } else if (r.verification_level === 'L0_claimed') {
        l0Count++
      }
      if (r.issued_at && (!lastShippedAt || r.issued_at > lastShippedAt)) lastShippedAt = r.issued_at
    }
    distinctHosts = hosts.size
  }

  const activeCollections = await listActiveCollections(supabase)
  const memberships = await listMembershipsForProfile(supabase, profile.id)

  return {
    profile,
    applications: applications || [],
    hirers: hirers || [],
    email,
    githubData: githubData || null,
    l1Count,
    l0Count,
    distinctHosts,
    effectiveReceiptCount,
    lastShippedAt,
    provenPostCount: provenPostCount || 0,
    activeCollections,
    memberships,
  }
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { modes, refs } = await getUserState()

  // Zero pillar identity → onboarding. This is the ONLY remaining redirect to
  // /join — team admins, agent owners, buyers, and builders all have a home.
  if (!modes.builder && !modes.team_admin && !modes.agent_owner && !modes.hirer && !modes.client) {
    redirect('/join')
  }

  // Single-pillar builder → unchanged BuilderDashboardClient, no shell chrome.
  if (modes.builder && !modes.team_admin && !modes.agent_owner) {
    const props = await loadBuilderProps(supabase, user.email!)
    if (!props) redirect('/join')
    return <BuilderDashboardClient {...props} />
  }

  // Multi-pillar OR non-builder → pillar-aware shell. If the user is also a
  // builder, render the full builder dashboard as the leading block.
  const builderProps = modes.builder ? await loadBuilderProps(supabase, user.email!) : null
  const builderNode = builderProps ? <BuilderDashboardClient {...builderProps} /> : null

  return <DashboardShell modes={modes} refs={refs} email={user.email!} builderNode={builderNode} />
}
