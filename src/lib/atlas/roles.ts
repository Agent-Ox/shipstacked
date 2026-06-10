/**
 * Atlas role fetcher — the canonical source for /atlas/roles/[id].
 *
 * Reads from the `atlas_roles` Postgres table seeded by
 * scripts/seed-atlas-roles.ts. Replaces the Step 5/6 deviation that
 * parsed roles from the classifier prompt file.
 *
 * Spec: docs/v2/STEP_7_PUBLIC_PAGES_SPEC.md §5.1.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const ATLAS_VERSION_DEFAULT = 'v0.4'
export const ATLAS_VERSIONS = ['v0.3', 'v0.4'] as const
export type AtlasVersion = (typeof ATLAS_VERSIONS)[number]

export interface AtlasRoleRow {
  role_id: string
  atlas_version: string
  cluster: string
  name: string
  short_description: string
  long_description_md: string | null
  automation_trajectory: 'resistant' | 'partial' | 'collapsible' | null
  isco_08_code: string | null
  soc_2018_code: string | null
  onet_code: string | null
  crosswalk_status: 'confident' | 'partial' | 'gap' | 'combined' | null
  eu_ai_act_articles: string[] | null
  iso_42001_sections: string[] | null
  created_at: string
}

export interface RecentReceiptAtRole {
  slug: string
  title: string
  issued_at: string
  subject_name: string
  subject_slug: string
  // Phase 4 (Adjustment 3): drives the kind-aware subject link on the role
  // page — 'team' → /team/<slug>, anything else → /u/<slug>. Team-subject
  // receipts flow into this query unchanged (it's kind-agnostic), so without
  // the kind a team subject would resolve to /u/<slug> and 404.
  subject_kind: string
}

export function isValidAtlasVersion(v: string): v is AtlasVersion {
  return ATLAS_VERSIONS.includes(v as AtlasVersion)
}

/**
 * Fetch a single role by id + version. Returns null when the row doesn't
 * exist — caller decides 404. Anon-readable via Step 1 RLS so any client
 * (service-role or anon) works; service-role for consistency with the
 * receipt fetcher.
 */
export async function getAtlasRole(
  supabase: SupabaseClient,
  roleId: string,
  version: string,
): Promise<AtlasRoleRow | null> {
  const { data } = await supabase
    .from('atlas_roles')
    .select('*')
    .eq('role_id', roleId)
    .eq('atlas_version', version)
    .maybeSingle()
  return (data as AtlasRoleRow) ?? null
}

/**
 * Up to 5 recent public receipts that confirmed this role.
 */
export async function getRecentReceiptsAtRole(
  supabase: SupabaseClient,
  roleId: string,
  version: string,
  limit = 5,
): Promise<RecentReceiptAtRole[]> {
  // Match receipts where the role appears in EITHER atlas_confirmed OR
  // atlas_inferred (Phase 1 — confirmed-OR-inferred). gin(atlas_confirmed)
  // exists; atlas_inferred has no gin index yet (Phase 5 adds it), so that
  // arm falls back to a seq scan — acceptable at current receipt scale.
  // Filter by atlas_version to keep cross-version receipts off this page;
  // v0.3 receipts only show on v0.3 pages.
  const { data, error } = await supabase
    .from('proof_receipts')
    .select('slug, title, issued_at, subject:entities!proof_receipts_subject_id_fkey(display_name, slug, kind)')
    .or(`atlas_confirmed.cs.{${roleId}},atlas_inferred.cs.{${roleId}}`)
    .eq('atlas_version', version)
    .eq('visibility', 'public')
    .order('issued_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.warn(`[atlas-roles] recent receipts query failed for ${roleId}@${version}:`, error.message)
    return []
  }
  return ((data ?? []) as Array<{
    slug: string
    title: string
    issued_at: string
    subject:
      | { display_name: string; slug: string; kind: string }
      | { display_name: string; slug: string; kind: string }[]
      | null
  }>).map((r) => {
    const subj = Array.isArray(r.subject) ? r.subject[0] : r.subject
    return {
      slug: r.slug,
      title: r.title,
      issued_at: r.issued_at,
      subject_name: subj?.display_name ?? 'ShipStacked builder',
      subject_slug: subj?.slug ?? 'builder',
      subject_kind: subj?.kind ?? 'human',
    }
  })
}

/**
 * Parse an "Adjacent roles" paragraph out of the role's long_description_md.
 * Best-effort — many rows have null long_description_md and this returns []
 * gracefully. Looks for a line starting with `**Adjacent roles.**` (the
 * format used in the Atlas markdown), then extracts cluster-letter+digit
 * role IDs from the following inline text.
 */
export function extractAdjacentRoleIds(longMd: string | null): string[] {
  if (!longMd) return []
  const lines = longMd.split('\n')
  let inAdjacent = false
  let buffer = ''
  for (const raw of lines) {
    const line = raw.trim()
    if (/^\*\*Adjacent roles\.?\*\*/i.test(line)) {
      inAdjacent = true
      buffer = line.replace(/^\*\*Adjacent roles\.?\*\*/i, '')
      continue
    }
    if (inAdjacent) {
      if (/^\*\*[^*]+\.?\*\*/.test(line) || line.length === 0) break
      buffer += ' ' + line
    }
  }
  if (!buffer) return []
  const ids = new Set<string>()
  for (const m of buffer.matchAll(/\b([A-G][1-9][0-9]?)\b/g)) {
    ids.add(m[1])
  }
  return Array.from(ids)
}
