-- Phase 6 §C — Atlas wiring: subject_atlas_roles projection view.
--
-- Atlas-keyed projection of L1 public receipts → one row per
-- (subject, atlas_role, atlas_version, source). Backs the cluster/role
-- matching engine for builders, teams, and agents (/talent + /api/v1/talent/search)
-- and the practitioner directory on /atlas/roles/[id].
--
-- REGULAR VIEW (not materialized) — Adjustment 1: at current scale (~77 public
-- receipts) materialization buys no measurable perf and introduces a real
-- correctness footgun (newly-published receipts invisible until a manual
-- REFRESH). A regular view is always-fresh and sub-ms here. Revisit if receipts
-- cross ~10K.
--
-- atlas_version is carried per-row (Adjustment 3) because /atlas/roles/[id] is
-- version-scoped; a subject with receipts at the same role across versions
-- appears as distinct rows (one per version).
--
-- The 'confirmed' arm currently yields 0 rows on prod: atlas_confirmed is
-- unpopulated (Q1(c) classification UX deferred). The confirmed arm is
-- forward-compatible architecture, NOT an active feature — a 100%
-- source='inferred' result is expected, not a bug.
--
-- cluster = LEFT(atlas_role, 1); the JS side (src/lib/ranking/facets.ts
-- clusterOf) gates to the curated A–G vocabulary. All current prod roles are
-- A–G, so the view cluster and clusterOf agree.
--
-- Applied via the Supabase Dashboard SQL Editor (Invariant #4). This file is
-- the canonical record of what was pasted.
--
-- Spec: docs/audit/PHASE6_ATLAS_WIRING.md §C.

BEGIN;

CREATE VIEW public.subject_atlas_roles AS
WITH atlas_pairs AS (
  SELECT
    r.subject_id,
    e.kind         AS subject_kind,
    e.slug         AS subject_slug,
    role           AS atlas_role,
    r.atlas_version AS atlas_version,
    LEFT(role, 1)  AS cluster,
    'confirmed'::text AS source
  FROM proof_receipts r
  JOIN entities e ON e.id = r.subject_id
  CROSS JOIN LATERAL unnest(COALESCE(r.atlas_confirmed, ARRAY[]::text[])) AS role
  WHERE r.visibility = 'public'
    AND r.verification_level = 'L1_artifact_confirmed'

  UNION ALL

  SELECT
    r.subject_id,
    e.kind,
    e.slug,
    role,
    r.atlas_version,
    LEFT(role, 1),
    'inferred'::text
  FROM proof_receipts r
  JOIN entities e ON e.id = r.subject_id
  CROSS JOIN LATERAL unnest(COALESCE(r.atlas_inferred, ARRAY[]::text[])) AS role
  WHERE r.visibility = 'public'
    AND r.verification_level = 'L1_artifact_confirmed'
)
SELECT
  subject_id,
  subject_kind,
  subject_slug,
  atlas_role,
  atlas_version,
  cluster,
  source,
  COUNT(*) AS receipt_count
FROM atlas_pairs
GROUP BY subject_id, subject_kind, subject_slug, atlas_role, atlas_version, cluster, source;

COMMENT ON VIEW public.subject_atlas_roles IS
  'Phase 6: Atlas-keyed projection of L1 public receipts → (subject, role, version, source). Regular always-fresh view; materialization unjustified at current scale. confirmed arm currently 0 rows on prod (atlas_confirmed unpopulated, Q1(c) deferred) — forward-compatible, not active. cluster = LEFT(atlas_role,1); JS gates A-G via clusterOf().';

COMMIT;

-- Reversal (Phase 6 §C.4):
-- BEGIN;
-- DROP VIEW IF EXISTS public.subject_atlas_roles;
-- COMMIT;
