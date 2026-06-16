// Server-side ranked-builder fetch — the single data path behind /talent, the
// homepage, and /hirers (via /api/builders/ranked). Computes Formula E quality
// scores at query time (D4: no DDL, no stored column) over published profiles
// and their public receipts.
//
// Receipt linkage: proof_receipts.subject_id -> entities.id; profiles.entity_id
// -> entities.id. A profile's receipts are those with subject_id == entity_id.

import { createClient } from '@supabase/supabase-js'
import { computeQualityScore, type ReceiptForScoring } from './quality-score.ts'
import { clusterOf } from './facets.ts'

// Public-safe projection only — this shape is serialized to anonymous clients
// via /api/builders/ranked. No email / private columns.
export interface RankedBuilder {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  role: string | null
  location: string | null
  bio: string | null
  verified: boolean
  availability: string | null
  primary_profession: string | null
  featured: boolean
  created_at: string
  skills: Array<{ id: number; name: string; category: string | null }>
  atlasClusters: string[]   // distinct Atlas cluster letters across the builder's receipts
  eventTypes: string[]      // distinct raw event_types across the builder's receipts
  quality_score: number | null
  ranked: boolean
}

const PROFILE_FIELDS =
  'id, username, full_name, avatar_url, role, location, bio, verified, ' +
  'availability, primary_profession, featured, created_at, entity_id, skills(*)'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Returns published builders split into ranked (sorted by quality_score DESC,
 * deterministic tiebreak) and belowThreshold ("not yet ranked"). When `limit`
 * is given, ranked is capped to it and belowThreshold fills any remaining
 * slots — labels stay honest (below-threshold is never relabeled as ranked).
 */
export async function getRankedBuilders(
  limit?: number
): Promise<{ ranked: RankedBuilder[]; belowThreshold: RankedBuilder[] }> {
  const admin = adminClient()

  const [{ data: profiles }, { data: receipts }] = await Promise.all([
    admin.from('profiles').select(PROFILE_FIELDS).eq('published', true),
    admin
      .from('proof_receipts')
      .select('subject_id, atlas_confidence, verification_level, event_type, artifacts, issued_at, atlas_inferred, atlas_confirmed')
      .eq('visibility', 'public'),
  ])

  // Group receipts by entity (subject_id). Key as string to avoid bigint/number drift.
  const receiptsByEntity = new Map<string, ReceiptForScoring[]>()
  const facetsByEntity = new Map<string, { clusters: Set<string>; events: Set<string> }>()
  for (const r of (receipts ?? []) as any[]) {
    const key = String(r.subject_id)
    const list = receiptsByEntity.get(key)
    const rec: ReceiptForScoring = {
      atlas_confidence: r.atlas_confidence ?? null,
      verification_level: r.verification_level ?? null,
      event_type: r.event_type ?? null,
      artifacts: Array.isArray(r.artifacts) ? r.artifacts : null,
      issued_at: r.issued_at ?? null,
    }
    if (list) list.push(rec)
    else receiptsByEntity.set(key, [rec])

    // Facet derivation (Batch 8; cluster fix Phase 6 §D) — distinct Atlas
    // clusters + event types per entity. Clusters derive from atlas_confirmed
    // UNION atlas_inferred via clusterOf (curated A–G gating, NOT charAt(0)).
    // Closes the long-standing atlas_inferred-only known issue (RESUME_HERE.md).
    let f = facetsByEntity.get(key)
    if (!f) { f = { clusters: new Set(), events: new Set() }; facetsByEntity.set(key, f) }
    if (r.event_type) f.events.add(r.event_type)
    for (const role of (Array.isArray(r.atlas_confirmed) ? r.atlas_confirmed : [])) {
      const c = clusterOf(role)
      if (c) f.clusters.add(c)
    }
    for (const role of (Array.isArray(r.atlas_inferred) ? r.atlas_inferred : [])) {
      const c = clusterOf(role)
      if (c) f.clusters.add(c)
    }
  }

  const scored: Array<RankedBuilder & { _receiptCount: number }> = (profiles ?? []).map((p: any) => {
    const ek = p.entity_id != null ? String(p.entity_id) : null
    const builderReceipts = ek ? receiptsByEntity.get(ek) ?? [] : []
    const facets = ek ? facetsByEntity.get(ek) : undefined
    const result = computeQualityScore(builderReceipts, { featured: !!p.featured })
    return {
      id: p.id,
      username: p.username,
      full_name: p.full_name,
      avatar_url: p.avatar_url ?? null,
      role: p.role ?? null,
      location: p.location ?? null,
      bio: p.bio ?? null,
      verified: !!p.verified,
      availability: p.availability ?? null,
      primary_profession: p.primary_profession ?? null,
      featured: !!p.featured,
      created_at: p.created_at,
      skills: Array.isArray(p.skills) ? p.skills : [],
      atlasClusters: facets ? [...facets.clusters] : [],
      eventTypes: facets ? [...facets.events] : [],
      quality_score: result.score,
      ranked: result.ranked,
      _receiptCount: builderReceipts.length,
    }
  })

  // §G.6.b deterministic ordering: score DESC, then receipt count DESC, then username ASC.
  const byRank = (a: typeof scored[number], b: typeof scored[number]) =>
    (b.quality_score ?? -1) - (a.quality_score ?? -1) ||
    b._receiptCount - a._receiptCount ||
    a.username.localeCompare(b.username)

  const byVolume = (a: typeof scored[number], b: typeof scored[number]) =>
    b._receiptCount - a._receiptCount || a.username.localeCompare(b.username)

  const strip = ({ _receiptCount, ...rest }: typeof scored[number]): RankedBuilder => rest

  let ranked = scored.filter(s => s.ranked).sort(byRank).map(strip)
  let belowThreshold = scored.filter(s => !s.ranked).sort(byVolume).map(strip)

  if (limit != null) {
    ranked = ranked.slice(0, limit)
    const remaining = Math.max(0, limit - ranked.length)
    belowThreshold = belowThreshold.slice(0, remaining)
  }

  return { ranked, belowThreshold }
}
