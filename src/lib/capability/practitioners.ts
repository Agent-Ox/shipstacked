/**
 * Capability → proof-backed builders (Stage C).
 *
 * Resolves the ranked, proof-backed builders for a canonical capability slug —
 * the data behind the per-capability answer pages at /talent/[slug].
 *
 * Two match paths, unioned:
 *   1. crosswalk: capability_atlas_crosswalk (capability_slug → atlas_role_id) →
 *      the human practitioners at those Atlas roles (subject_atlas_roles view).
 *   2. skill-resolution: builders whose entered skills resolve (resolveCapability)
 *      to this slug — covers pure tools (python, langchain) that have no crosswalk.
 *
 * Ordering is the SAME Formula-E order as /talent (getRankedBuilders: ranked
 * first, then below-threshold, deterministic), filtered to the matched set — so a
 * capability page is /talent scoped to one capability.
 *
 * A module-level memo loads the global data (ranked builders + crosswalk +
 * subject roles + receipt counts + skill index) ONCE, so a 77-page static build
 * shares a single fetch rather than re-querying per page.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getRankedBuilders, type RankedBuilder } from '@/lib/ranking/get-ranked-builders'
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

interface CapabilityGlobal {
  ordered: RankedBuilder[]                 // Formula-E order (ranked then below)
  rolesBySlug: Map<string, string[]>       // capability_slug → atlas_role_ids
  humansByRole: Map<string, Set<string>>   // atlas_role_id → human usernames
  skillUsersBySlug: Map<string, Set<string>> // capability_slug → usernames whose skills resolve to it
  receiptCountByUsername: Map<string, number>
}

let _global: Promise<CapabilityGlobal> | null = null

async function loadGlobal(admin: SupabaseClient, vocab: CapabilityVocabEntry[]): Promise<CapabilityGlobal> {
  if (_global) return _global
  _global = (async () => {
    const [{ ranked, belowThreshold }, xwRes, sarRes, prRes, profRes] = await Promise.all([
      getRankedBuilders(),
      admin.from('capability_atlas_crosswalk').select('capability_slug, atlas_role_id'),
      admin.from('subject_atlas_roles').select('subject_slug, subject_kind, atlas_role').eq('atlas_version', ATLAS_VERSION_DEFAULT),
      admin.from('proof_receipts').select('subject_id').eq('visibility', 'public'),
      admin.from('profiles').select('username, entity_id').eq('published', true),
    ])
    const ordered = [...ranked, ...belowThreshold]
    const pubUsernames = new Set(ordered.map((b) => b.username))

    // capability_slug → role ids
    const rolesBySlug = new Map<string, string[]>()
    for (const r of (xwRes.data ?? []) as any[]) {
      const list = rolesBySlug.get(r.capability_slug)
      if (list) list.push(r.atlas_role_id)
      else rolesBySlug.set(r.capability_slug, [r.atlas_role_id])
    }

    // atlas_role → human usernames (published only)
    const humansByRole = new Map<string, Set<string>>()
    for (const r of (sarRes.data ?? []) as any[]) {
      if (r.subject_kind !== 'human' || !pubUsernames.has(r.subject_slug)) continue
      const set = humansByRole.get(r.atlas_role) ?? new Set<string>()
      set.add(r.subject_slug)
      humansByRole.set(r.atlas_role, set)
    }

    // capability_slug → usernames whose entered skills resolve to it
    const skillUsersBySlug = new Map<string, Set<string>>()
    for (const b of ordered) {
      for (const s of b.skills) {
        const slug = resolveCapability(s.name, vocab)
        if (!slug) continue
        const set = skillUsersBySlug.get(slug) ?? new Set<string>()
        set.add(b.username)
        skillUsersBySlug.set(slug, set)
      }
    }

    // total public receipts per username (via entity_id)
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

    return { ordered, rolesBySlug, humansByRole, skillUsersBySlug, receiptCountByUsername }
  })()
  return _global
}

/** Test/rebuild hook — drop the memo. */
export function clearCapabilityGlobal(): void {
  _global = null
}

/**
 * The ranked, proof-backed builders for one capability slug — Formula-E order,
 * filtered to (crosswalk practitioners ∪ resolved-skill matches). Empty array is
 * a valid result (the page still renders an answer-first shell).
 */
export async function getBuildersForCapability(
  admin: SupabaseClient,
  capabilitySlug: string,
  vocab: CapabilityVocabEntry[],
): Promise<CapabilityBuilder[]> {
  const g = await loadGlobal(admin, vocab)

  const matched = new Set<string>()
  for (const role of g.rolesBySlug.get(capabilitySlug) ?? []) {
    for (const u of g.humansByRole.get(role) ?? []) matched.add(u)
  }
  for (const u of g.skillUsersBySlug.get(capabilitySlug) ?? []) matched.add(u)

  const out: CapabilityBuilder[] = []
  for (const b of g.ordered) {
    if (!matched.has(b.username)) continue
    out.push({
      username: b.username,
      full_name: b.full_name,
      avatar_url: b.avatar_url,
      role: b.role,
      receipt_count: g.receiptCountByUsername.get(b.username) ?? 0,
      ranked: b.ranked,
      quality_score: b.quality_score,
      atlasClusters: b.atlasClusters,
      skills: b.skills.map((s) => s.name),
    })
  }
  return out
}
