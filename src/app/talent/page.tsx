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

export const metadata: Metadata = {
  title: 'AI-Native Builder Directory | ShipStacked',
  description: 'Browse verified AI-native builders. Vibe coders, prompt engineers, AI automation specialists — all with proven build histories and real outcomes.',
  openGraph: {
    title: 'AI-Native Builder Directory | ShipStacked',
    description: 'Find and hire verified AI-native builders with real proof of work.',
    url: 'https://shipstacked.com/talent',
  },
  alternates: { canonical: 'https://shipstacked.com/talent' },
}

const PAGE_WRAP: React.CSSProperties = { minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', overflowX: 'hidden' }
const PAGE_INNER: React.CSSProperties = { maxWidth: 1000, margin: '0 auto', padding: '4rem 1.5rem 5rem' }

export default async function TalentPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams

  // Type facet (Phase 4 §I.4). Default 'builder' for unchanged backwards behavior.
  const rawType = params.type
  const type: 'builder' | 'team' | 'agent' = rawType === 'team' || rawType === 'agent' ? rawType : 'builder'

  // ── Team directory — public, client-side filtered (§I.5). ──
  if (type === 'team') {
    const { ranked, belowThreshold } = await getRankedTeams()
    const teams = [...ranked, ...belowThreshold]
    return (
      <div style={PAGE_WRAP}>
        <div style={PAGE_INNER}>
          <TalentClient type="team" teams={teams} />
        </div>
      </div>
    )
  }

  // ── Agent directory (Phase 5 §I.4). ──
  if (type === 'agent') {
    const { ranked, belowThreshold } = await getRankedAgents()
    const agents = [...ranked, ...belowThreshold]
    return (
      <div style={PAGE_WRAP}>
        <div style={PAGE_INNER}>
          <TalentClient type="agent" agents={agents} />
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
  const filterSort = params.sort || 'quality'

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check paid hirer subscription
  let isPaidHirer = false
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
    isPaidHirer = !!sub
  }

  // Quality-ranked builders (Formula E).
  // Ranked first (quality_score DESC), then "not yet ranked" builders below.
  const { ranked, belowThreshold } = await getRankedBuilders()
  const allBuilders = [...ranked, ...belowThreshold] as any[]
  const totalPublished = allBuilders.length

  // Filters applied in JS (small dataset; keeps one ranking source of truth).
  // `verified` is a filter + badge only — no longer a sort key (D3).
  let profiles = allBuilders
  if (filterVerified) profiles = profiles.filter((p: any) => p.verified)
  if (filterProfession) profiles = profiles.filter((p: any) => p.primary_profession === filterProfession)
  if (filterAvailability) profiles = profiles.filter((p: any) => p.availability === filterAvailability)
  // Batch 8 facets — ANY-match: builder kept if any of their clusters / shipped buckets match.
  if (filterCluster) profiles = profiles.filter((p: any) => (p.atlasClusters || []).includes(filterCluster))
  if (filterShipped) profiles = profiles.filter((p: any) => bucketsForEvents(p.eventTypes || []).includes(filterShipped))

  // Default sort is the quality order from getRankedBuilders; "newest" overrides.
  if (filterSort === 'newest') {
    profiles = [...profiles].sort((a: any, b: any) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }

  // Facet chips: render values present in the full published set; counts reflect
  // the current filtered set ("Operators (3)" when another filter narrows it).
  const clusterFacets = CLUSTER_ORDER
    .filter(c => allBuilders.some((p: any) => (p.atlasClusters || []).includes(c)))
    .map(c => ({ value: c, label: CLUSTER_LABELS[c], count: profiles.filter((p: any) => (p.atlasClusters || []).includes(c)).length }))
  const shippedFacets = SHIPPED_BUCKETS
    .filter(b => allBuilders.some((p: any) => bucketsForEvents(p.eventTypes || []).includes(b.key)))
    .map(b => ({ value: b.key, label: b.label, count: profiles.filter((p: any) => bucketsForEvents(p.eventTypes || []).includes(b.key)).length }))
  const verifiedCount = profiles.filter((p: any) => p.verified).length
  const displayProfiles = isPaidHirer ? profiles : profiles.slice(0, 6)
  const isTeaser = !isPaidHirer

  // Total unfiltered count for the header (only when filters are active)
  const hasFilters = !!(filterProfession || filterAvailability || filterVerified || filterCluster || filterShipped)
  const totalUnfilteredCount = hasFilters ? totalPublished : profiles.length

  // Fetch hirer profile to check if they have set up their company
  let hasHirerProfile = false
  if (isPaidHirer && user) {
    const { data: hirerProfile } = await admin
      .from('employer_profiles')
      .select('id, company_name')
      .eq('email', user.email)
      .maybeSingle()
    hasHirerProfile = !!(hirerProfile?.company_name)
  }

  // Fetch saved profile IDs for this hirer
  let savedIds: string[] = []
  if (isPaidHirer && user) {
    const { data: saved } = await admin
      .from('saved_profiles')
      .select('profile_id')
      .eq('employer_email', user.email)
    savedIds = saved?.map((s: any) => s.profile_id) || []
  }

  // Beacon 1 — paywall-aware ItemList. JSON-LD reflects the 6-builder
  // teaser slice that's HTML-visible to anonymous viewers, NOT the full
  // unpaywalled list (emitting the full list to crawlers would expose
  // data behind a paywall). Query above already filters published=true so
  // the 3 fakes are excluded at source.
  const teaserSlice = profiles.slice(0, 6)
  const talentItemListLd = buildItemListJsonLd({
    listUrl: `${CANONICAL_HOST}/talent`,
    listName: 'AI-native builders on ShipStacked',
    items: teaserSlice.map((p: any) => ({
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
          isPaidHirer={isPaidHirer}
          isTeaser={isTeaser}
          verifiedCount={verifiedCount}
          totalCount={profiles.length}
          totalUnfilteredCount={totalUnfilteredCount}
          user={user}
          hasHirerProfile={hasHirerProfile}
          clusterFacets={clusterFacets}
          shippedFacets={shippedFacets}
          filters={{ profession: filterProfession, availability: filterAvailability, verified: filterVerified, sort: filterSort, cluster: filterCluster, shipped: filterShipped }}
        />
      </div>
    </div>
  )
}
