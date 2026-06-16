import { rateLimit } from '@/lib/rateLimit'
import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { getRankedBuilders } from '@/lib/ranking/get-ranked-builders'
import { getRankedTeams } from '@/lib/ranking/get-ranked-teams'
import { getRankedAgents } from '@/lib/ranking/get-ranked-agents'
import { bucketsForEvents } from '@/lib/ranking/facets'
import { extractHost, isSharedDocHost } from '@/lib/ranking/quality-score'
import { findAtlasMatches, type SubjectKind } from '@/lib/atlas/matching'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/v1/talent/search — Formula E ranked subjects, filterable (buyer:rw).
//
// Phase 3 §G.2: builder-only, JS-filtered. Phase 6 §F: Atlas cluster/role
// filtering is now SQL-keyed against the subject_atlas_roles view (L1-only,
// version-scoped), and ?type=team / ?type=agent activate team/agent search.
//
// BACKWARDS COMPAT: type defaults to 'builder'; the type=builder response shape
// + enrichment (atlas_roles + proof_of_work from proof_receipts) are unchanged.
// Two Phase-6 semantic shifts on the FILTER (not the shape): (1) cluster/role
// matching is now L1-only (the matching engine matches verified work, per §B.2);
// (2) when both cluster and role are passed, role takes precedence (was AND).

const KIND_BY_TYPE: Record<string, SubjectKind> = { builder: 'human', team: 'team', agent: 'agent' }

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)

  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')

  const scopeErr = requireScope(auth.auth, ['buyer:rw'])
  if (scopeErr) return scopeErr

  const url = new URL(req.url)
  const rawType = url.searchParams.get('type')?.trim() || 'builder'
  const type = (rawType === 'team' || rawType === 'agent') ? rawType : 'builder'
  const cluster = url.searchParams.get('cluster')?.trim() || null
  const rolesParam = url.searchParams.get('role')?.trim() || null
  const roles = rolesParam ? rolesParam.split(',').map(s => s.trim()).filter(Boolean) : null
  const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20
  const rawOffset = parseInt(url.searchParams.get('offset') || '0', 10)
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0

  const db = admin()

  // ── Atlas filter (SQL-keyed, L1-only, version-scoped). Applies to all types.
  // Role-dimension precedence: role(s) > cluster (findAtlasMatches enforces).
  let matchedIds: Set<number> | null = null
  if (cluster || (roles && roles.length > 0)) {
    const matches = await findAtlasMatches(db, {
      cluster: cluster ?? undefined,
      roles: roles ?? undefined,
      subjectKind: KIND_BY_TYPE[type],
    })
    matchedIds = new Set(matches.map(m => m.subject_id))
    if (matchedIds.size === 0) {
      return apiOk({ results: [], total: 0, limit, offset })
    }
  }

  // Batch-enrich Atlas roles for a set of entity ids from the view (L1-only).
  // One query for the whole response (§F.2 approach (a)).
  const atlasRolesByEntity = async (entityIds: number[]) => {
    const map = new Map<number, { confirmed: Set<string>; inferred: Set<string> }>()
    if (entityIds.length === 0) return map
    const { data } = await db
      .from('subject_atlas_roles')
      .select('subject_id, atlas_role, source')
      .in('subject_id', entityIds)
    for (const r of (data ?? []) as Array<{ subject_id: number; atlas_role: string; source: string }>) {
      let e = map.get(r.subject_id)
      if (!e) { e = { confirmed: new Set(), inferred: new Set() }; map.set(r.subject_id, e) }
      if (r.source === 'confirmed') e.confirmed.add(r.atlas_role)
      else e.inferred.add(r.atlas_role)
    }
    return map
  }

  // ─────────────────────────── BUILDER (backwards-compatible) ────────────────
  if (type === 'builder') {
    const shipped = url.searchParams.get('shipped')?.trim() || null
    const { ranked } = await getRankedBuilders()

    // Secondary query 1: profile.id -> entity_id (not on the public RankedBuilder shape).
    const profileIds = ranked.map(b => b.id)
    const entityByProfile = new Map<string, number>()
    if (profileIds.length > 0) {
      const { data: profRows } = await db.from('profiles').select('id, entity_id').in('id', profileIds)
      for (const r of (profRows ?? [])) if (r.entity_id != null) entityByProfile.set(r.id, r.entity_id)
    }
    const entityIds = [...new Set([...entityByProfile.values()])]

    // Secondary query 2: receipts -> roles (confirmed+inferred, all public) + PoW
    // aggregates. UNCHANGED from Phase 3 §G.2 — builder enrichment stays identical.
    const rolesByEntity = new Map<string, { confirmed: Set<string>; inferred: Set<string> }>()
    const powByEntity = new Map<string, { l1: number; hosts: Set<string>; last: string | null }>()
    if (entityIds.length > 0) {
      const { data: receipts } = await db
        .from('proof_receipts')
        .select('subject_id, atlas_confirmed, atlas_inferred, verification_level, artifacts, issued_at')
        .in('subject_id', entityIds)
        .eq('visibility', 'public')
      for (const r of (receipts ?? []) as any[]) {
        const ek = String(r.subject_id)
        let rr = rolesByEntity.get(ek)
        if (!rr) { rr = { confirmed: new Set(), inferred: new Set() }; rolesByEntity.set(ek, rr) }
        for (const c of (Array.isArray(r.atlas_confirmed) ? r.atlas_confirmed : [])) rr.confirmed.add(c)
        for (const i of (Array.isArray(r.atlas_inferred) ? r.atlas_inferred : [])) rr.inferred.add(i)
        let pw = powByEntity.get(ek)
        if (!pw) { pw = { l1: 0, hosts: new Set(), last: null }; powByEntity.set(ek, pw) }
        if (r.verification_level === 'L1_artifact_confirmed') {
          pw.l1++
          const arts = Array.isArray(r.artifacts) ? (r.artifacts as Array<{ url?: string | null }>) : []
          const host = extractHost(arts[0]?.url)
          if (host && !isSharedDocHost(host)) pw.hosts.add(host)
        }
        if (r.issued_at && (!pw.last || r.issued_at > pw.last)) pw.last = r.issued_at
      }
    }

    const rolesFor = (b: { id: string }) => {
      const eid = entityByProfile.get(b.id)
      const rr = eid != null ? rolesByEntity.get(String(eid)) : undefined
      const confirmed = rr ? [...rr.confirmed] : []
      const inferred = rr ? [...rr.inferred].filter(x => !rr.confirmed.has(x)) : []
      return { confirmed, inferred }
    }

    // Filters: atlas (matching engine) + shipped (bucketsForEvents). Was: cluster
    // via atlasClusters + role via the confirmed+inferred set (now matching engine).
    let filtered = ranked
    if (matchedIds) filtered = filtered.filter(b => {
      const eid = entityByProfile.get(b.id)
      return eid != null && matchedIds!.has(eid)
    })
    if (shipped) filtered = filtered.filter(b => bucketsForEvents(b.eventTypes).includes(shipped))

    const total = filtered.length
    const page = filtered.slice(offset, offset + limit)

    return apiOk({
      results: page.map(b => {
        const eid = entityByProfile.get(b.id)
        const pw = eid != null ? powByEntity.get(String(eid)) : undefined
        const { confirmed, inferred } = rolesFor(b)
        return {
          username: b.username,
          full_name: b.full_name,
          role: b.role,
          location: b.location,
          atlas_clusters: b.atlasClusters,
          atlas_roles_confirmed: confirmed,
          atlas_roles_inferred: inferred,
          proof_of_work: {
            l1_receipts: pw?.l1 ?? 0,
            distinct_hosts: pw?.hosts.size ?? 0,
            last_shipped: pw?.last ?? null,
          },
          quality_score: b.quality_score,
          verified: b.verified,
          profile_url: `https://shipstacked.com/u/${b.username}`,
        }
      }),
      total,
      limit,
      offset,
    })
  }

  // ─────────────────────────── TEAM ──────────────────────────────────────────
  if (type === 'team') {
    const servicesParam = url.searchParams.get('services')?.trim() || null
    const servicesFilter = servicesParam ? servicesParam.split(',').map(s => s.trim()).filter(Boolean) : null
    const verifiedOnly = url.searchParams.get('verified') === 'true'

    const { ranked, belowThreshold } = await getRankedTeams()
    let teams = [...ranked, ...belowThreshold]
    if (matchedIds) teams = teams.filter(t => matchedIds!.has(t.entity_id))
    if (verifiedOnly) teams = teams.filter(t => t.verified)
    if (servicesFilter && servicesFilter.length > 0) {
      teams = teams.filter(t => servicesFilter.some(s => (t.services || []).includes(s)))
    }

    const rolesMap = await atlasRolesByEntity(teams.map(t => t.entity_id))
    const total = teams.length
    const page = teams.slice(offset, offset + limit)

    return apiOk({
      results: page.map(t => {
        const rr = rolesMap.get(t.entity_id)
        const confirmed = rr ? [...rr.confirmed] : []
        const inferred = rr ? [...rr.inferred].filter(x => !rr.confirmed.has(x)) : []
        return {
          team_name: t.team_name,
          slug: t.slug,
          tagline: t.tagline,
          location: t.location,
          services: t.services,
          atlas_clusters: t.atlas_clusters,
          atlas_roles_confirmed: confirmed,
          atlas_roles_inferred: inferred,
          l1_receipt_count: t.l1_receipt_count,
          quality_score: t.quality_score,
          verified: t.verified,
          profile_url: `https://shipstacked.com/team/${t.slug}`,
        }
      }),
      total,
      limit,
      offset,
    })
  }

  // ─────────────────────────── AGENT ─────────────────────────────────────────
  // type === 'agent'
  const providerParam = url.searchParams.get('provider')?.trim() || null
  const providerFilter = providerParam ? providerParam.split(',').map(s => s.trim()).filter(Boolean) : null
  const capsParam = url.searchParams.get('capabilities')?.trim() || null
  const capsFilter = capsParam ? capsParam.split(',').map(s => s.trim()).filter(Boolean) : null
  const verifiedOnly = url.searchParams.get('verified') === 'true'

  const { ranked, belowThreshold } = await getRankedAgents()
  let agents = [...ranked, ...belowThreshold]
  if (matchedIds) agents = agents.filter(a => matchedIds!.has(a.entity_id))
  if (verifiedOnly) agents = agents.filter(a => a.verified)
  if (providerFilter && providerFilter.length > 0) {
    agents = agents.filter(a => providerFilter.includes(a.provider))
  }
  if (capsFilter && capsFilter.length > 0) {
    agents = agents.filter(a => capsFilter.some(c => (a.capabilities || []).includes(c)))
  }

  const rolesMap = await atlasRolesByEntity(agents.map(a => a.entity_id))
  const total = agents.length
  const page = agents.slice(offset, offset + limit)

  return apiOk({
    results: page.map(a => {
      const rr = rolesMap.get(a.entity_id)
      const confirmed = rr ? [...rr.confirmed] : []
      const inferred = rr ? [...rr.inferred].filter(x => !rr.confirmed.has(x)) : []
      return {
        agent_name: a.agent_name,
        slug: a.slug,
        provider: a.provider,
        model: a.model,
        focus: a.focus,
        capabilities: a.capabilities,
        atlas_clusters: a.atlas_clusters,
        atlas_roles_confirmed: confirmed,
        atlas_roles_inferred: inferred,
        l1_receipt_count: a.l1_receipt_count,
        quality_score: a.quality_score,
        verified: a.verified,
        profile_url: `https://shipstacked.com/agent/${a.slug}`,
      }
    }),
    total,
    limit,
    offset,
  })
}
