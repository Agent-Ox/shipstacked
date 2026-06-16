// Server-side ranked-team fetch — the team-directory analogue of
// get-ranked-builders.ts (Phase 4 §I.2). Mirrors its structure exactly:
// Formula E computed at query time over each team's public receipts.
//
// Receipt linkage: proof_receipts.subject_id -> entities.id; a team's receipts
// are those with subject_id == team_profiles.entity_id. Only PUBLISHED teams
// enter the directory (inner published gate on team_profiles).
//
// Deliberately a separate file/type from getRankedBuilders — the Phase 3 §G.2
// /api/v1/talent wrapper depends on getRankedBuilders staying stable, so it is
// not touched.

import { createClient } from '@supabase/supabase-js'
import { computeQualityScore, type ReceiptForScoring, L1 } from './quality-score.ts'
import { clusterOf } from './facets.ts'

export interface RankedTeam {
  id: number          // team_profiles.id
  entity_id: number
  slug: string
  team_name: string
  tagline: string | null
  logo_url: string | null
  description: string | null
  services: string[]
  location: string | null
  verified: boolean
  team_size_range: string | null
  l1_receipt_count: number
  atlas_clusters: string[]   // distinct Atlas clusters across the team's receipts (atlas_confirmed UNION atlas_inferred via clusterOf — Phase 6 §D)
  quality_score: number | null
  ranked: boolean
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function getRankedTeams(
  limit?: number,
): Promise<{ ranked: RankedTeam[]; belowThreshold: RankedTeam[] }> {
  const admin = adminClient()

  const [{ data: teams }, { data: receipts }] = await Promise.all([
    admin
      .from('team_profiles')
      .select('id, entity_id, team_name, tagline, logo_url, description, services, location, verified, team_size_range, entity:entities(slug)')
      .eq('published', true),
    admin
      .from('proof_receipts')
      .select('subject_id, atlas_confidence, verification_level, event_type, artifacts, issued_at, atlas_inferred, atlas_confirmed')
      .eq('visibility', 'public'),
  ])

  // Group receipts by entity (subject_id). String keys avoid bigint/number drift.
  const receiptsByEntity = new Map<string, ReceiptForScoring[]>()
  const clustersByEntity = new Map<string, Set<string>>()
  const l1ByEntity = new Map<string, number>()
  for (const r of (receipts ?? []) as any[]) {
    const key = String(r.subject_id)
    const rec: ReceiptForScoring = {
      atlas_confidence: r.atlas_confidence ?? null,
      verification_level: r.verification_level ?? null,
      event_type: r.event_type ?? null,
      artifacts: Array.isArray(r.artifacts) ? r.artifacts : null,
      issued_at: r.issued_at ?? null,
    }
    const list = receiptsByEntity.get(key)
    if (list) list.push(rec)
    else receiptsByEntity.set(key, [rec])

    if (r.verification_level === L1) l1ByEntity.set(key, (l1ByEntity.get(key) ?? 0) + 1)

    // Cluster fix (Phase 6 §D): atlas_confirmed UNION atlas_inferred via
    // clusterOf (curated A–G gating). Was atlas_inferred-only (known issue).
    let cset = clustersByEntity.get(key)
    if (!cset) { cset = new Set(); clustersByEntity.set(key, cset) }
    for (const role of (Array.isArray(r.atlas_confirmed) ? r.atlas_confirmed : [])) {
      const c = clusterOf(role)
      if (c) cset.add(c)
    }
    for (const role of (Array.isArray(r.atlas_inferred) ? r.atlas_inferred : [])) {
      const c = clusterOf(role)
      if (c) cset.add(c)
    }
  }

  const scored: Array<RankedTeam & { _receiptCount: number }> = (teams ?? []).map((t: any) => {
    const ek = String(t.entity_id)
    const teamReceipts = receiptsByEntity.get(ek) ?? []
    const result = computeQualityScore(teamReceipts, {})
    const entity = Array.isArray(t.entity) ? t.entity[0] : t.entity
    return {
      id: t.id,
      entity_id: t.entity_id,
      slug: entity?.slug ?? '',
      team_name: t.team_name,
      tagline: t.tagline ?? null,
      logo_url: t.logo_url ?? null,
      description: t.description ?? null,
      services: Array.isArray(t.services) ? t.services : [],
      location: t.location ?? null,
      verified: !!t.verified,
      team_size_range: t.team_size_range ?? null,
      l1_receipt_count: l1ByEntity.get(ek) ?? 0,
      atlas_clusters: [...(clustersByEntity.get(ek) ?? [])],
      quality_score: result.score,
      ranked: result.ranked,
      _receiptCount: teamReceipts.length,
    }
  })

  // Same deterministic ordering as builders: score DESC, receipts DESC, slug ASC.
  const byRank = (a: typeof scored[number], b: typeof scored[number]) =>
    (b.quality_score ?? -1) - (a.quality_score ?? -1) ||
    b._receiptCount - a._receiptCount ||
    a.slug.localeCompare(b.slug)
  const byVolume = (a: typeof scored[number], b: typeof scored[number]) =>
    b._receiptCount - a._receiptCount || a.slug.localeCompare(b.slug)
  const strip = ({ _receiptCount, ...rest }: typeof scored[number]): RankedTeam => rest

  let ranked = scored.filter(s => s.ranked).sort(byRank).map(strip)
  let belowThreshold = scored.filter(s => !s.ranked).sort(byVolume).map(strip)

  if (limit != null) {
    ranked = ranked.slice(0, limit)
    belowThreshold = belowThreshold.slice(0, Math.max(0, limit - ranked.length))
  }

  return { ranked, belowThreshold }
}
