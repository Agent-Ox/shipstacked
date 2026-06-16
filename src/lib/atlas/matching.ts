/**
 * Atlas-keyed matching helpers (Phase 6 §E).
 *
 * Query the regular `subject_atlas_roles` view (migration
 * 20260616125219_subject_atlas_roles_view.sql) to return subjects
 * (builders / teams / agents) matching by Atlas cluster or role, the
 * practitioners at a role, and a subject's own Atlas roles.
 *
 * Confirmed and inferred are unioned by default; callers can filter to
 * confirmed-only when stricter matching is wanted. (On current prod the
 * confirmed arm is empty — atlas_confirmed unpopulated, Q1(c) deferred — so
 * confirmedOnly returns nothing today; it is forward-compatible.)
 *
 * Version-scoped: every helper defaults to ATLAS_VERSION_DEFAULT and filters on
 * atlas_version, matching the version-scoped /atlas/roles/[id] page.
 *
 * PostgREST note (Phase 5 §L lesson): `subject_atlas_roles` is a VIEW with no FK
 * metadata, so PostgREST cannot embed `entities` off it. display_name is joined
 * via a SECONDARY entities query, never an embed.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ATLAS_VERSION_DEFAULT } from './roles.ts'

export type SubjectKind = 'human' | 'team' | 'agent'

export type AtlasMatch = {
  subject_id: number
  subject_kind: SubjectKind
  subject_slug: string
  atlas_role: string
  atlas_version: string
  cluster: string
  source: 'confirmed' | 'inferred'
  receipt_count: number
}

export type MatchFilter = {
  cluster?: string             // single cluster letter (A–G), e.g. 'B'
  role?: string                // single role id, e.g. 'B3'
  roles?: string[]             // OR-match multiple roles
  subjectKind?: SubjectKind    // restrict to one pillar
  atlasVersion?: string        // defaults to ATLAS_VERSION_DEFAULT
  confirmedOnly?: boolean      // default false (union)
}

/**
 * Raw Atlas-match rows from the view, filtered by cluster / role(s) / kind /
 * source. Role-dimension precedence: role (single) > roles[] > cluster.
 * Ordered receipt_count DESC, subject_slug ASC. No limit — callers typically
 * collect the matching subject_id set then JOIN against a ranking list.
 */
export async function findAtlasMatches(
  admin: SupabaseClient,
  filter: MatchFilter,
): Promise<AtlasMatch[]> {
  const version = filter.atlasVersion ?? ATLAS_VERSION_DEFAULT
  let q = admin
    .from('subject_atlas_roles')
    .select('subject_id, subject_kind, subject_slug, atlas_role, atlas_version, cluster, source, receipt_count')
    .eq('atlas_version', version)

  if (filter.subjectKind) q = q.eq('subject_kind', filter.subjectKind)
  if (filter.confirmedOnly) q = q.eq('source', 'confirmed')

  // Role-dimension precedence: role > roles > cluster.
  if (filter.role) q = q.eq('atlas_role', filter.role)
  else if (filter.roles && filter.roles.length > 0) q = q.in('atlas_role', filter.roles)
  else if (filter.cluster) q = q.eq('cluster', filter.cluster)

  q = q.order('receipt_count', { ascending: false }).order('subject_slug', { ascending: true })

  const { data, error } = await q
  if (error) {
    console.warn(`[atlas-matching] findAtlasMatches failed:`, error.message)
    return []
  }
  return (data ?? []) as AtlasMatch[]
}

/**
 * Distinct practitioners (subjects with ≥1 L1 public receipt) at a role.
 * receipt_count is SUMmed across confirmed + inferred sources per subject.
 * Aggregated in JS (PostgREST can't GROUP/SUM over a view; the per-role row set
 * is tiny). display_name is resolved via a secondary entities query.
 */
export async function getPractitionersAtRole(
  admin: SupabaseClient,
  roleId: string,
  options?: { atlasVersion?: string; limit?: number },
): Promise<Array<{
  subject_id: number
  subject_kind: SubjectKind
  subject_slug: string
  display_name: string
  receipt_count: number
}>> {
  const version = options?.atlasVersion ?? ATLAS_VERSION_DEFAULT
  const limit = options?.limit ?? 20

  const { data, error } = await admin
    .from('subject_atlas_roles')
    .select('subject_id, subject_kind, subject_slug, receipt_count')
    .eq('atlas_role', roleId)
    .eq('atlas_version', version)
  if (error) {
    console.warn(`[atlas-matching] getPractitionersAtRole failed for ${roleId}@${version}:`, error.message)
    return []
  }

  // Aggregate confirmed + inferred per subject.
  type Agg = { subject_id: number; subject_kind: SubjectKind; subject_slug: string; receipt_count: number }
  const bySubject = new Map<number, Agg>()
  for (const r of (data ?? []) as Array<{ subject_id: number; subject_kind: SubjectKind; subject_slug: string; receipt_count: number }>) {
    const existing = bySubject.get(r.subject_id)
    if (existing) existing.receipt_count += r.receipt_count
    else bySubject.set(r.subject_id, { subject_id: r.subject_id, subject_kind: r.subject_kind, subject_slug: r.subject_slug, receipt_count: r.receipt_count })
  }

  const ranked = [...bySubject.values()]
    .sort((a, b) => b.receipt_count - a.receipt_count || a.subject_slug.localeCompare(b.subject_slug))
    .slice(0, limit)
  if (ranked.length === 0) return []

  // Secondary entities query for display_name (no embed off a view).
  const ids = ranked.map((r) => r.subject_id)
  const { data: ents } = await admin.from('entities').select('id, display_name').in('id', ids)
  const nameById = new Map<number, string>()
  for (const e of (ents ?? []) as Array<{ id: number; display_name: string }>) nameById.set(e.id, e.display_name)

  return ranked.map((r) => ({
    subject_id: r.subject_id,
    subject_kind: r.subject_kind,
    subject_slug: r.subject_slug,
    display_name: nameById.get(r.subject_id) ?? r.subject_slug,
    receipt_count: r.receipt_count,
  }))
}

/**
 * A subject's own Atlas roles (both sources surface independently so callers can
 * render confirmed vs inferred distinctly). Ordered receipt_count DESC,
 * atlas_role ASC. Used for JSON-LD knowsAbout enrichment (§I).
 */
export async function getAtlasRolesForSubject(
  admin: SupabaseClient,
  subjectId: number,
  options?: { atlasVersion?: string },
): Promise<Array<{ atlas_role: string; source: 'confirmed' | 'inferred'; receipt_count: number }>> {
  const version = options?.atlasVersion ?? ATLAS_VERSION_DEFAULT
  const { data, error } = await admin
    .from('subject_atlas_roles')
    .select('atlas_role, source, receipt_count')
    .eq('subject_id', subjectId)
    .eq('atlas_version', version)
    .order('receipt_count', { ascending: false })
    .order('atlas_role', { ascending: true })
  if (error) {
    console.warn(`[atlas-matching] getAtlasRolesForSubject failed for ${subjectId}@${version}:`, error.message)
    return []
  }
  return (data ?? []) as Array<{ atlas_role: string; source: 'confirmed' | 'inferred'; receipt_count: number }>
}
