/**
 * Capability → proof-backed subjects (Stage C + D1).
 *
 * Resolves the ranked, proof-backed builders / teams / agents for a canonical
 * capability slug — the data behind /talent/[slug].
 *
 * Every subject matches via a dual path (declared ∪ proven), unioned:
 *   1. resolved freetext: what the subject entered — a builder's skills, a team's
 *      services[], an agent's capabilities[] — resolved via resolveCapability to
 *      this slug (B1 aliases collapse the fragmenting variants).
 *   2. crosswalk / proof: capability_atlas_crosswalk (capability_slug → atlas_role_id)
 *      → subjects with those proof-inferred Atlas roles (subject_atlas_roles view,
 *      any subject_kind).
 *
 * Ordering per pillar reuses the Formula-E ranking (getRankedBuilders /
 * getRankedTeams / getRankedAgents: ranked first, then below-threshold), filtered
 * to the matched set — so a capability page is /talent scoped to one capability.
 *
 * A module-level memo loads the global data ONCE so a 77-page static build shares
 * a single fetch rather than re-querying per page.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getRankedBuilders, type RankedBuilder } from '@/lib/ranking/get-ranked-builders'
import { getRankedTeams, type RankedTeam } from '@/lib/ranking/get-ranked-teams'
import { getRankedAgents, type RankedAgent } from '@/lib/ranking/get-ranked-agents'
import { ATLAS_VERSION_DEFAULT } from '@/lib/atlas/roles'
import { resolveCapability, type CapabilityVocabEntry } from '@/lib/capability/vocab'

export interface CapabilityBuilder {
  username: string
  full_name: string
  avatar_url: string | null
  role: string | null
  receipt_count: number
  ranked: boolean
  quality_score: number | null
  atlasClusters: string[]
  skills: string[]
}

export interface CapabilityOrg {
  kind: 'team' | 'agent'
  slug: string
  name: string
  logo_url: string | null
  receipt_count: number
  ranked: boolean
  atlasClusters: string[]
}

export interface CapabilitySubjects {
  builders: CapabilityBuilder[]
  teams: CapabilityOrg[]
  agents: CapabilityOrg[]
}

interface CapabilityGlobal {
  buildersOrdered: RankedBuilder[]
  teamsOrdered: RankedTeam[]
  agentsOrdered: RankedAgent[]
  rolesBySlug: Map<string, string[]>          // capability_slug → atlas_role_ids
  humansByRole: Map<string, Set<string>>      // atlas_role → human usernames
  teamsByRole: Map<string, Set<string>>       // atlas_role → team slugs
  agentsByRole: Map<string, Set<string>>      // atlas_role → agent slugs
  skillUsersBySlug: Map<string, Set<string>>  // capability_slug → human usernames (resolved skills)
  teamsByServiceSlug: Map<string, Set<string>>   // capability_slug → team slugs (resolved services)
  agentsByCapSlug: Map<string, Set<string>>      // capability_slug → agent slugs (resolved capabilities)
  receiptCountByUsername: Map<string, number>
}

let _global: Promise<CapabilityGlobal> | null = null

function addTo(map: Map<string, Set<string>>, key: string, val: string) {
  const set = map.get(key) ?? new Set<string>()
  set.add(val)
  map.set(key, set)
}

async function loadGlobal(admin: SupabaseClient, vocab: CapabilityVocabEntry[]): Promise<CapabilityGlobal> {
  if (_global) return _global
  _global = (async () => {
    const [buildersRes, teamsRes, agentsRes, xwRes, sarRes, prRes, profRes, tsvcRes, acapRes] = await Promise.all([
      getRankedBuilders(),
      getRankedTeams(),
      getRankedAgents(),
      admin.from('capability_atlas_crosswalk').select('capability_slug, atlas_role_id'),
      admin.from('subject_atlas_roles').select('subject_slug, subject_kind, atlas_role').eq('atlas_version', ATLAS_VERSION_DEFAULT),
      admin.from('proof_receipts').select('subject_id').eq('visibility', 'public'),
      admin.from('profiles').select('username, entity_id').eq('published', true),
      admin.from('team_profiles').select('entity_id, services').eq('published', true),
      admin.from('agent_profiles').select('entity_id, capabilities').eq('published', true),
    ])
    const buildersOrdered = [...buildersRes.ranked, ...buildersRes.belowThreshold]
    const teamsOrdered = [...teamsRes.ranked, ...teamsRes.belowThreshold]
    const agentsOrdered = [...agentsRes.ranked, ...agentsRes.belowThreshold]

    const pubUsernames = new Set(buildersOrdered.map((b) => b.username))
    const teamSlugs = new Set(teamsOrdered.map((t) => t.slug))
    const agentSlugs = new Set(agentsOrdered.map((a) => a.slug))
    const teamSlugByEntity = new Map<number, string>(teamsOrdered.map((t) => [t.entity_id, t.slug]))
    const agentSlugByEntity = new Map<number, string>(agentsOrdered.map((a) => [a.entity_id, a.slug]))

    // capability_slug → role ids
    const rolesBySlug = new Map<string, string[]>()
    for (const r of (xwRes.data ?? []) as any[]) {
      const list = rolesBySlug.get(r.capability_slug)
      if (list) list.push(r.atlas_role_id)
      else rolesBySlug.set(r.capability_slug, [r.atlas_role_id])
    }

    // atlas_role → subject slugs, split by kind (published subjects only)
    const humansByRole = new Map<string, Set<string>>()
    const teamsByRole = new Map<string, Set<string>>()
    const agentsByRole = new Map<string, Set<string>>()
    for (const r of (sarRes.data ?? []) as any[]) {
      if (r.subject_kind === 'human') { if (pubUsernames.has(r.subject_slug)) addTo(humansByRole, r.atlas_role, r.subject_slug) }
      else if (r.subject_kind === 'team') { if (teamSlugs.has(r.subject_slug)) addTo(teamsByRole, r.atlas_role, r.subject_slug) }
      else if (r.subject_kind === 'agent') { if (agentSlugs.has(r.subject_slug)) addTo(agentsByRole, r.atlas_role, r.subject_slug) }
    }

    // resolved freetext → capability_slug
    const skillUsersBySlug = new Map<string, Set<string>>()
    for (const b of buildersOrdered) {
      for (const s of b.skills) {
        const slug = resolveCapability(s.name, vocab)
        if (slug) addTo(skillUsersBySlug, slug, b.username)
      }
    }
    const teamsByServiceSlug = new Map<string, Set<string>>()
    for (const t of (tsvcRes.data ?? []) as any[]) {
      const teamSlug = teamSlugByEntity.get(t.entity_id)
      if (!teamSlug) continue
      for (const svc of (Array.isArray(t.services) ? t.services : [])) {
        const slug = resolveCapability(svc, vocab)
        if (slug) addTo(teamsByServiceSlug, slug, teamSlug)
      }
    }
    const agentsByCapSlug = new Map<string, Set<string>>()
    for (const a of (acapRes.data ?? []) as any[]) {
      const agentSlug = agentSlugByEntity.get(a.entity_id)
      if (!agentSlug) continue
      for (const cap of (Array.isArray(a.capabilities) ? a.capabilities : [])) {
        const slug = resolveCapability(cap, vocab)
        if (slug) addTo(agentsByCapSlug, slug, agentSlug)
      }
    }

    // total public receipts per human username (via entity_id)
    const countByEntity = new Map<string, number>()
    for (const r of (prRes.data ?? []) as any[]) {
      const k = String(r.subject_id)
      countByEntity.set(k, (countByEntity.get(k) ?? 0) + 1)
    }
    const receiptCountByUsername = new Map<string, number>()
    for (const p of (profRes.data ?? []) as any[]) {
      if (p.entity_id == null) continue
      receiptCountByUsername.set(p.username, countByEntity.get(String(p.entity_id)) ?? 0)
    }

    return {
      buildersOrdered, teamsOrdered, agentsOrdered,
      rolesBySlug, humansByRole, teamsByRole, agentsByRole,
      skillUsersBySlug, teamsByServiceSlug, agentsByCapSlug, receiptCountByUsername,
    }
  })()
  return _global
}

/** Test/rebuild hook — drop the memo. */
export function clearCapabilityGlobal(): void {
  _global = null
}

/**
 * Ranked, proof-backed builders + teams + agents for one capability slug. Each
 * pillar is Formula-E ordered, filtered to (crosswalk roles ∪ resolved freetext).
 * Empty lists are valid (the page still renders an answer-first shell).
 */
export async function getSubjectsForCapability(
  admin: SupabaseClient,
  capabilitySlug: string,
  vocab: CapabilityVocabEntry[],
): Promise<CapabilitySubjects> {
  const g = await loadGlobal(admin, vocab)
  const roles = g.rolesBySlug.get(capabilitySlug) ?? []

  const matchHumans = new Set<string>()
  for (const role of roles) for (const u of g.humansByRole.get(role) ?? []) matchHumans.add(u)
  for (const u of g.skillUsersBySlug.get(capabilitySlug) ?? []) matchHumans.add(u)

  const matchTeams = new Set<string>()
  for (const role of roles) for (const s of g.teamsByRole.get(role) ?? []) matchTeams.add(s)
  for (const s of g.teamsByServiceSlug.get(capabilitySlug) ?? []) matchTeams.add(s)

  const matchAgents = new Set<string>()
  for (const role of roles) for (const s of g.agentsByRole.get(role) ?? []) matchAgents.add(s)
  for (const s of g.agentsByCapSlug.get(capabilitySlug) ?? []) matchAgents.add(s)

  const builders: CapabilityBuilder[] = g.buildersOrdered
    .filter((b) => matchHumans.has(b.username))
    .map((b) => ({
      username: b.username,
      full_name: b.full_name,
      avatar_url: b.avatar_url,
      role: b.role,
      receipt_count: g.receiptCountByUsername.get(b.username) ?? 0,
      ranked: b.ranked,
      quality_score: b.quality_score,
      atlasClusters: b.atlasClusters,
      skills: b.skills.map((s) => s.name),
    }))

  const teams: CapabilityOrg[] = g.teamsOrdered
    .filter((t) => matchTeams.has(t.slug))
    .map((t) => ({ kind: 'team', slug: t.slug, name: t.team_name, logo_url: t.logo_url, receipt_count: t.l1_receipt_count, ranked: t.ranked, atlasClusters: t.atlas_clusters }))

  const agents: CapabilityOrg[] = g.agentsOrdered
    .filter((a) => matchAgents.has(a.slug))
    .map((a) => ({ kind: 'agent', slug: a.slug, name: a.agent_name, logo_url: a.logo_url, receipt_count: a.l1_receipt_count, ranked: a.ranked, atlasClusters: a.atlas_clusters }))

  return { builders, teams, agents }
}
