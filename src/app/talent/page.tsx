import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import TalentClient from './TalentClient'
import { buildItemListJsonLd } from '@/lib/jsonld/item-list'
import { CANONICAL_HOST, personId } from '@/lib/jsonld/context'
import { getRankedBuilders } from '@/lib/ranking/get-ranked-builders'
import { getRankedTeams } from '@/lib/ranking/get-ranked-teams'
import { getRankedAgents } from '@/lib/ranking/get-ranked-agents'
import { CLUSTER_LABELS, CLUSTER_ORDER, SHIPPED_BUCKETS, bucketsForEvents } from '@/lib/ranking/facets'
import { findAtlasMatches } from '@/lib/atlas/matching'
import { loadVocab, type CapabilityLayer } from '@/lib/capability/vocab'
import { getSubjectsForCapability } from '@/lib/capability/practitioners'

export const metadata: Metadata = {
  title: 'AI-Native Builder Directory | ShipStacked',
  description: 'AI-native builders ranked by verified proof of work — prompt engineers, agent builders, and automation specialists, each with real shipped projects and outcomes.',
  openGraph: {
    title: 'AI-Native Builder Directory | ShipStacked',
    description: 'Find and hire verified AI-native builders with real proof of work.',
    url: 'https://shipstacked.com/talent',
  },
  alternates: { canonical: 'https://shipstacked.com/talent' },
}

const PAGE_WRAP: React.CSSProperties = { minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', overflowX: 'hidden' }
const PAGE_INNER: React.CSSProperties = { maxWidth: 1000, margin: '0 auto', padding: '4rem 1.5rem 5rem' }

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Build cluster facet chips for a pillar from its full Atlas-match set
// (distinct subjects per cluster, L1-only). CLUSTER_ORDER + CLUSTER_LABELS keep
// the curated A–G vocabulary; clusters with zero subjects are dropped.
function clusterFacetsFromMatches(
  matches: Array<{ cluster: string; subject_id: number }>,
): Array<{ value: string; label: string; count: number }> {
  const bySet: Record<string, Set<number>> = {}
  for (const m of matches) (bySet[m.cluster] ??= new Set()).add(m.subject_id)
  return CLUSTER_ORDER
    .filter((c) => bySet[c]?.size)
    .map((c) => ({ value: c, label: CLUSTER_LABELS[c], count: bySet[c].size }))
}

export default async function TalentPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams

  // Type facet (Phase 4 §I.4). Default 'builder' for unchanged backwards behavior.
  const rawType = params.type
  const type: 'builder' | 'team' | 'agent' = rawType === 'team' || rawType === 'agent' ? rawType : 'builder'

  // ── Team directory — Atlas cluster filter via matching engine (§G.1). ──
  if (type === 'team') {
    const cluster = params.cluster || ''
    const admin = adminClient()
    const { ranked, belowThreshold } = await getRankedTeams()
    let teams = [...ranked, ...belowThreshold]
    const allMatches = await findAtlasMatches(admin, { subjectKind: 'team' })
    if (cluster) {
      const matched = new Set(allMatches.filter(m => m.cluster === cluster).map(m => m.subject_id))
      teams = teams.filter(t => matched.has(t.entity_id))
    }
    return (
      <div style={PAGE_WRAP}>
        <div style={PAGE_INNER}>
          <TalentClient type="team" teams={teams} clusterFacets={clusterFacetsFromMatches(allMatches)} activeCluster={cluster} />
        </div>
      </div>
    )
  }

  // ── Agent directory — Atlas cluster filter via matching engine (§G.2). ──
  if (type === 'agent') {
    const cluster = params.cluster || ''
    const admin = adminClient()
    const { ranked, belowThreshold } = await getRankedAgents()
    let agents = [...ranked, ...belowThreshold]
    const allMatches = await findAtlasMatches(admin, { subjectKind: 'agent' })
    if (cluster) {
      const matched = new Set(allMatches.filter(m => m.cluster === cluster).map(m => m.subject_id))
      agents = agents.filter(a => matched.has(a.entity_id))
    }
    return (
      <div style={PAGE_WRAP}>
        <div style={PAGE_INNER}>
          <TalentClient type="agent" agents={agents} clusterFacets={clusterFacetsFromMatches(allMatches)} activeCluster={cluster} />
        </div>
      </div>
    )
  }

  // ── Builder directory (default) — existing flow, unchanged. ──
  const filterProfession = params.profession || ''
  const filterAvailability = params.availability || ''
  const filterVerified = params.verified === 'true'
  const filterCluster = params.cluster || ''   // Atlas cluster letter (Batch 8)
  const filterShipped = params.shipped || ''    // Shipped bucket key (Batch 8)
  const filterCapabilityRaw = params.capability || '' // Canonical capability slug (Stage E)
  const filterSort = params.sort || 'quality'

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = adminClient()

  // Capability filter (Stage E) — validate against the canonical vocabulary; an
  // unknown slug is ignored (no filter). The grouped facet is always rendered
  // (one cheap vocab read); the heavier capability→subjects match only runs when
  // a capability is actually active.
  const vocab = await loadVocab(admin)
  const filterCapability = filterCapabilityRaw && vocab.some(v => v.slug === filterCapabilityRaw) ? filterCapabilityRaw : ''
  const CAP_LAYERS: { layer: CapabilityLayer; label: string }[] = [
    { layer: 'capability', label: 'Capabilities' },
    { layer: 'tool', label: 'Tools' },
    { layer: 'domain', label: 'Domains' },
  ]
  const capabilityGroups = CAP_LAYERS
    .map(g => ({ layer: g.layer as string, label: g.label, options: vocab.filter(v => v.layer === g.layer).map(v => ({ slug: v.slug, label: v.label })).sort((a, b) => a.label.localeCompare(b.label)) }))
    .filter(g => g.options.length > 0)

  // Active membership (any paid user with a full_access subscription). Members
  // see the FULL directory (vs the 6-profile teaser). Same subscription query as
  // before — the semantics are now "member", not "hirer": a paying BUILDER gets
  // the full directory too, not just hirers. (cap-stage 2)
  let isMember = false
  if (user) {
    const now = new Date().toISOString()
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('email', user.email)
      .eq('status', 'active')
      .eq('product', 'full_access')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle()
    isMember = !!sub
  }

  // Quality-ranked builders (Formula E).
  // Ranked first (quality_score DESC), then "not yet ranked" builders below.
  const { ranked, belowThreshold } = await getRankedBuilders()
  const allBuilders = [...ranked, ...belowThreshold] as any[]
  const totalPublished = allBuilders.length

  // Phase 6 §G.1 + Phase 7 §D: ONE matching-engine call (L1-only, all clusters)
  // serves BOTH the cluster filter and the facet counts — same definition as the
  // team/agent branches and /api/v1/talent/search. RankedBuilder has no
  // entity_id, so resolve profile.id -> entity_id to key the cluster filter.
  const humanMatches = await findAtlasMatches(admin, { subjectKind: 'human' })
  let clusterMatchedProfiles: Set<string> | null = null
  if (filterCluster) {
    const profIds = allBuilders.map((p: any) => p.id)
    const entityByProfile = new Map<string, number>()
    if (profIds.length > 0) {
      const { data: profRows } = await admin.from('profiles').select('id, entity_id').in('id', profIds)
      for (const r of (profRows ?? [])) if (r.entity_id != null) entityByProfile.set(r.id, r.entity_id)
    }
    const matchedIds = new Set(humanMatches.filter(m => m.cluster === filterCluster).map(m => m.subject_id))
    clusterMatchedProfiles = new Set(
      [...entityByProfile.entries()].filter(([, eid]) => matchedIds.has(eid)).map(([pid]) => pid),
    )
  }

  // Capability match set (Stage E) — same logic as the /talent/[slug] pages
  // (crosswalk ∪ resolved freetext). Only computed when a capability is active.
  let capabilityMatchedUsernames: Set<string> | null = null
  if (filterCapability) {
    const subj = await getSubjectsForCapability(admin, filterCapability, vocab)
    capabilityMatchedUsernames = new Set(subj.builders.map(b => b.username))
  }

  // Filters applied in JS (small dataset; keeps one ranking source of truth).
  // `verified` is a filter + badge only — no longer a sort key (D3).
  let profiles = allBuilders
  if (filterVerified) profiles = profiles.filter((p: any) => p.verified)
  if (filterProfession) profiles = profiles.filter((p: any) => p.primary_profession === filterProfession)
  if (filterAvailability) profiles = profiles.filter((p: any) => p.availability === filterAvailability)
  // Cluster — matching engine (L1-only, §G.1). Shipped stays JS (bucketsForEvents).
  if (filterCluster) profiles = profiles.filter((p: any) => clusterMatchedProfiles?.has(p.id))
  if (filterShipped) profiles = profiles.filter((p: any) => bucketsForEvents(p.eventTypes || []).includes(filterShipped))
  // Capability — the searchable capability/tool/domain axis (Stage E). Composes.
  if (filterCapability && capabilityMatchedUsernames) profiles = profiles.filter((p: any) => capabilityMatchedUsernames!.has(p.username))

  // Default sort is the quality order from getRankedBuilders; "newest" overrides.
  if (filterSort === 'newest') {
    profiles = [...profiles].sort((a: any, b: any) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }

  // Cluster facet counts from the matching engine (Phase 7 §D) — global distinct
  // L1-matched human subjects per cluster, identical definition to team/agent and
  // to the cluster filter itself. Replaces the legacy all-public atlasClusters
  // count that could overstate clickable results. clusterFacetsFromMatches drops
  // zero-count clusters and orders A–G.
  const clusterFacets = clusterFacetsFromMatches(humanMatches)
  // Shipped facet chips: render values present in the full published set; counts
  // reflect the current filtered set.
  const shippedFacets = SHIPPED_BUCKETS
    .filter(b => allBuilders.some((p: any) => bucketsForEvents(p.eventTypes || []).includes(b.key)))
    .map(b => ({ value: b.key, label: b.label, count: profiles.filter((p: any) => bucketsForEvents(p.eventTypes || []).includes(b.key)).length }))
  const verifiedCount = profiles.filter((p: any) => p.verified).length
  // GEO (stage A): the full ranked list is public to everyone — every /u profile
  // it links to is already public + indexable + in the sitemap, so walling the
  // LIST hid the biggest citable asset for no monetization benefit. The paywall
  // is on CONTACT, not visibility (isTeaser still drives the "become a member to
  // contact" CTA; per-card contact/save stay member-gated).
  const displayProfiles = profiles
  const isTeaser = !isMember

  // Total unfiltered count for the header (only when filters are active)
  const hasFilters = !!(filterProfession || filterAvailability || filterVerified || filterCluster || filterShipped || filterCapability)
  const totalUnfilteredCount = hasFilters ? totalPublished : profiles.length

  // Has the member set up their company? Stage 5d: check the member's owned org
  // (kind org/team) → team_profiles.team_name, replacing the employer_profiles lookup.
  let hasHirerProfile = false
  if (isMember && user) {
    const { data: ownedOrg } = await admin
      .from('entities')
      .select('id')
      .eq('owner_user_id', user.id)
      .in('kind', ['org', 'team'])
      .limit(1)
      .maybeSingle()
    if (ownedOrg) {
      const { data: tp } = await admin
        .from('team_profiles')
        .select('team_name')
        .eq('entity_id', (ownedOrg as { id: number }).id)
        .maybeSingle()
      hasHirerProfile = !!(tp as { team_name?: string } | null)?.team_name
    }
  }

  // Fetch saved profile IDs for this hirer
  let savedIds: string[] = []
  if (isMember && user) {
    const { data: saved } = await admin
      .from('saved_profiles')
      .select('profile_id')
      .eq('employer_email', user.email)
    savedIds = saved?.map((s: any) => s.profile_id) || []
  }

  // Beacon 1 — ItemList over the FULL public ranked list. The list is not behind
  // a paywall: every /u/{username} it links to is already public + indexable + in
  // the sitemap, so the structured data supports visible content (GEO rule). Only
  // CONTACT is member-gated, not the list. Query above already filters
  // published=true so the 3 fakes are excluded at source.
  const listedProfiles = profiles
  const talentItemListLd = buildItemListJsonLd({
    listUrl: `${CANONICAL_HOST}/talent`,
    listName: 'AI-native builders on ShipStacked, ranked by verified proof of work',
    items: listedProfiles.map((p: any) => ({
      url: personId(p.username),
      id: personId(p.username),
      name: p.full_name?.trim() || p.username,
    })),
  })

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', overflowX: 'hidden' }}>
      {talentItemListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(talentItemListLd) }} />
      )}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>
        <TalentClient
          type="builder"
          profiles={displayProfiles}
          savedIds={savedIds}
          isPaidHirer={isMember}
          isTeaser={isTeaser}
          verifiedCount={verifiedCount}
          totalCount={profiles.length}
          totalUnfilteredCount={totalUnfilteredCount}
          user={user}
          hasHirerProfile={hasHirerProfile}
          clusterFacets={clusterFacets}
          shippedFacets={shippedFacets}
          capabilityGroups={capabilityGroups}
          filters={{ profession: filterProfession, availability: filterAvailability, verified: filterVerified, sort: filterSort, cluster: filterCluster, shipped: filterShipped, capability: filterCapability }}
        />
      </div>
    </div>
  )
}
