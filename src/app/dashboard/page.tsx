import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import BuilderDashboardClient from './BuilderDashboardClient'
import { listActiveCollections } from '@/lib/collections/collections'
import { listMembershipsForProfile } from '@/lib/collections/consent'
import { extractHost, isSharedDocHost } from '@/lib/ranking/quality-score'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, projects(*), skills(*)')
    .eq('email', user.email)
    .maybeSingle()

  // No profile yet → send to /join. The agent entry point is now Card 3
  // (/join → /api/join/agent); the interim /dashboard?agent=1 AgentOnboarding
  // shim was deleted in Phase 5 §M (a profiled user hitting ?agent=1 just gets
  // the normal dashboard — the param is ignored).
  if (!profile) {
    redirect('/join')
  }

  // Normal dashboard
  const { data: applications } = await supabase
    .from('applications')
    .select('*, jobs(*)')
    .eq('builder_email', user.email)
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

  const { count: provenPostCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .not('outcome', 'is', null)
    .neq('outcome', '')
    .not('url', 'is', null)
    .neq('url', '')

  // Proof-of-Work card data (Phase 1 — replaces the retired dashboard ring). Keyed on the
  // builder's entity; unlinked profiles (entity_id null) show the empty state.
  let l1Count = 0
  let l0Count = 0
  let distinctHosts = 0
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
        if (host && !isSharedDocHost(host)) hosts.add(host)
      } else if (r.verification_level === 'L0_claimed') {
        l0Count++
      }
      if (r.issued_at && (!lastShippedAt || r.issued_at > lastShippedAt)) lastShippedAt = r.issued_at
    }
    distinctHosts = hosts.size
  }

  // Consented collections — per-collection cards rendered in a loop on the
  // dashboard, gated on profile.published in the client component. Zero
  // active collections → empty arrays → no cards → dashboard byte-identical
  // to today. Both queries use the session-bound client; RLS allows the
  // public-read-active policy on collections, and memberships are
  // service-role-only — but the user's own profile_id-keyed memberships
  // can be read via the same path because we use service role for that
  // specific lookup via the helper.
  const activeCollections = await listActiveCollections(supabase)
  const memberships = await listMembershipsForProfile(supabase, profile.id)

  return (
    <BuilderDashboardClient
      profile={profile}
      applications={applications || []}
      hirers={hirers || []}
      email={user.email!}
      githubData={githubData || null}
      l1Count={l1Count}
      l0Count={l0Count}
      distinctHosts={distinctHosts}
      lastShippedAt={lastShippedAt}
      provenPostCount={provenPostCount || 0}
      activeCollections={activeCollections}
      memberships={memberships}
    />
  )
}
