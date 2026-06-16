// Server-side ranked-agent fetch — the agent-directory analogue of
// get-ranked-teams.ts (Phase 5 §I.1). Mirrors its structure exactly:
// Formula E computed at query time over each agent's public receipts.
//
// Receipt linkage: proof_receipts.subject_id -> entities.id; an agent's receipts
// are those with subject_id == agent_profiles.entity_id. Only PUBLISHED agents
// enter the directory (inner published gate on agent_profiles).
//
// atlas_clusters is derived from atlas_inferred only — inherits the known
// atlas_inferred-only limitation documented in RESUME_HERE.md (Phase 6 revisits).
//
// Deliberately a separate file/type from getRankedBuilders / getRankedTeams —
// those stay stable for their existing callers.

import { createClient } from '@supabase/supabase-js'
import { computeQualityScore, type ReceiptForScoring, L1 } from './quality-score.ts'
import { clusterOf } from './facets.ts'

export interface RankedAgent {
  id: number          // agent_profiles.id
  entity_id: number
  slug: string
  agent_name: string
  provider: string
  model: string | null
  description: string | null
  capabilities: string[]
  focus: string | null
  logo_url: string | null
  verified: boolean
  l1_receipt_count: number
  atlas_clusters: string[]   // distinct Atlas clusters across the agent's receipts (atlas_confirmed UNION atlas_inferred via clusterOf — Phase 6 §D)
  quality_score: number | null
  ranked: boolean
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function getRankedAgents(
  limit?: number,
): Promise<{ ranked: RankedAgent[]; belowThreshold: RankedAgent[] }> {
  const admin = adminClient()

  const [{ data: agents }, { data: receipts }] = await Promise.all([
    admin
      .from('agent_profiles')
      // Disambiguate the embed: agent_profiles has TWO FKs to entities
      // (entity_id + principal_entity_id), so the constraint name is required
      // or PostgREST raises PGRST201 (ambiguous relationship) → empty result.
      .select('id, entity_id, agent_name, provider, model, description, capabilities, focus, logo_url, verified, entity:entities!agent_profiles_entity_id_fkey(slug)')
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

  const scored: Array<RankedAgent & { _receiptCount: number }> = (agents ?? []).map((a: any) => {
    const ek = String(a.entity_id)
    const agentReceipts = receiptsByEntity.get(ek) ?? []
    const result = computeQualityScore(agentReceipts, {})
    const entity = Array.isArray(a.entity) ? a.entity[0] : a.entity
    return {
      id: a.id,
      entity_id: a.entity_id,
      slug: entity?.slug ?? '',
      agent_name: a.agent_name,
      provider: a.provider,
      model: a.model ?? null,
      description: a.description ?? null,
      capabilities: Array.isArray(a.capabilities) ? a.capabilities : [],
      focus: a.focus ?? null,
      logo_url: a.logo_url ?? null,
      verified: !!a.verified,
      l1_receipt_count: l1ByEntity.get(ek) ?? 0,
      atlas_clusters: [...(clustersByEntity.get(ek) ?? [])],
      quality_score: result.score,
      ranked: result.ranked,
      _receiptCount: agentReceipts.length,
    }
  })

  // Same deterministic ordering as builders/teams: score DESC, receipts DESC, slug ASC.
  const byRank = (a: typeof scored[number], b: typeof scored[number]) =>
    (b.quality_score ?? -1) - (a.quality_score ?? -1) ||
    b._receiptCount - a._receiptCount ||
    a.slug.localeCompare(b.slug)
  const byVolume = (a: typeof scored[number], b: typeof scored[number]) =>
    b._receiptCount - a._receiptCount || a.slug.localeCompare(b.slug)
  const strip = ({ _receiptCount, ...rest }: typeof scored[number]): RankedAgent => rest

  let ranked = scored.filter(s => s.ranked).sort(byRank).map(strip)
  let belowThreshold = scored.filter(s => !s.ranked).sort(byVolume).map(strip)

  if (limit != null) {
    ranked = ranked.slice(0, limit)
    belowThreshold = belowThreshold.slice(0, Math.max(0, limit - ranked.length))
  }

  return { ranked, belowThreshold }
}
