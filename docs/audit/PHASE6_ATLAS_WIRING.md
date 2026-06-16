# Phase 6 — Atlas wiring proper

**Discovery + execution diff plan in one doc.** Makes Atlas load-bearing for the four-pillar customer-type architecture by fixing the cluster-derivation known issue and building a real Atlas-keyed matching engine that backs `/talent` and `/api/v1/talent/search` for builders, teams, and agents.

**Locked decisions (June 16):**
- **Q1 — Scope:** (b) Surface fixes + matching engine. Cluster known-issue resolved. Matching engine is SQL-keyed against Atlas, not JS-filtered on ranked lists.
- **Q2 — Surface coverage:** (ii) Builders + teams + agents. Receipt-level Atlas search deferred to Phase 9+.
- **Q3 — Recompute semantics:** (a) Snapshot. `atlas_inferred` is permanent per receipt. Classifier improvements apply to new receipts only. Recompute deferred.

**What "Atlas wiring proper" delivers:**

1. **Cluster derivation fix** — `atlasClusters` (used by `RankedBuilder`, `RankedTeam`, `RankedAgent`) currently derives from `atlas_inferred` only. Phase 6 fixes to use `atlas_confirmed UNION atlas_inferred` per receipt. Affects all three ranking helpers.

2. **Atlas-keyed matching SQL** — `/api/v1/talent/search` and `/talent` filters become SQL queries against an Atlas-indexed projection, not JS-filtered runtime ranking. Sub-100ms query against any cluster/role across all three pillars.

3. **Atlas JSON-LD enrichment** — Builder, team, and agent JSON-LD declare their Atlas roles as `knowsAbout` extension. Receipts already use `alternativeHeadline` for Atlas role IDs (per existing convention in `src/lib/jsonld/atlas-article.ts`); we audit and confirm correctness, but don't change the receipt-side convention.

4. **`/atlas/roles/[id]` directory page enhancement** — Currently shows receipts at that role with kind-aware subject links. Phase 6 adds a "Practitioners" section above the receipts: the actual builders/teams/agents who have at least one L1 receipt at this role. Atlas role pages become a true practitioner directory per role.

5. **Atlas cluster filter on `/talent`** — Already exists for builders. Phase 6 extends to teams + agents using the new Atlas-keyed query. Same cluster facet drops on all three type tabs.

**Inheritances from prior phases (NO Phase 6 work needed):**
- Atlas taxonomy taxonomy already defined (v0.3 + v0.4, per §M.2 seed using A4)
- `proof_receipts.atlas_confirmed` + `atlas_inferred` array columns exist
- `/atlas/roles/[id]` page exists with kind-aware subject links (Phases 4 §F.3 + 5 §F.5)
- `getRankedBuilders`, `getRankedTeams`, `getRankedAgents` all surface `atlasClusters` per-subject
- `src/lib/atlas/roles.ts` has `getRecentReceiptsAtRole` (Phase 1 Block 3)
- `RankedBuilder.atlasRolesConfirmed` / `atlasRolesInferred` already exposed on RankedBuilder per Phase 3 §G secondary-query batched against profile entity_ids

**Scope estimate:** 10-14 hours focused work across 2 sessions.

**Files (estimated):**
- NEW: 2-3 files (`src/lib/atlas/matching.ts` for the Atlas-keyed query helpers, possibly a SQL materialized view migration, `src/lib/atlas/practitioners.ts` for the practitioner directory query at a role)
- Modified: 8-10 files (`get-ranked-builders.ts`, `get-ranked-teams.ts`, `get-ranked-agents.ts` for cluster fix, `/api/v1/talent/search/route.ts` to use matching engine, `/talent/page.tsx` for SQL-driven filter, `/atlas/roles/[id]/page.tsx` for practitioners section, `src/lib/atlas/roles.ts` to add `getPractitionersAtRole`, `src/lib/jsonld/person.ts` / `team-org.ts` / `agent-org.ts` for `knowsAbout` enrichment)
- DDL: optional new materialized view `subject_atlas_roles` (one-shot recompute) OR a regular view; depends on §A discovery findings

---

## §A — Pre-flight reads required before any code

Execute these before any block. Stop on FROM-string mismatch or unexpected state.

1. **Read `src/lib/atlas/roles.ts` in full.** Confirm:
   - `getRecentReceiptsAtRole(version, roleId)` query shape exactly (already populates `subject_kind` from entities join per Phase 4 §F.3)
   - Whether any other Atlas helpers exist (e.g. for cluster lookup, role label resolution)
   - Atlas version handling — is `v0.4` the current version? How is it resolved?

2. **Read `src/lib/ranking/get-ranked-builders.ts` cluster derivation block.** The known issue per `RESUME_HERE.md`: `atlasClusters` derives from `atlas_inferred` only. Confirm the exact line(s) doing the derivation. Same for `get-ranked-teams.ts` and `get-ranked-agents.ts` (which mirror the pattern).

3. **Read `src/app/api/v1/talent/search/route.ts` in full.** Phase 3 §G.2 built this with JS filters. Confirm:
   - How `cluster=` param is currently handled (JS filter on `ranked.atlasClusters.includes(cluster)`?)
   - How `role=` param is currently handled (similar JS filter?)
   - The secondary-query that joins per-builder Atlas roles (already exists per Phase 3 §G.2)

4. **Read `src/app/atlas/roles/[id]/page.tsx` in full.** Phase 6 adds a Practitioners section above the receipts. Need to know current page structure to slot it cleanly.

5. **Read `src/lib/jsonld/atlas-article.ts`** — per RESUME_HERE.md known-issue table, this is the real source of `alternativeHeadline` for Atlas role IDs (Phase 5 §A flagged `page.tsx:46` as dead code referencing it). Confirm the current shape; we're auditing, not changing.

6. **Read `src/lib/jsonld/person.ts`, `team-org.ts`, `agent-org.ts`** — to confirm where `knowsAbout` should be added. Person already has `knowsAbout` per Phase 1 §0 for builder skills. Need to confirm whether builder JSON-LD currently merges Atlas roles into knowsAbout or treats them separately. Team and agent JSON-LD probably don't have `knowsAbout` yet.

7. **Query prod for Atlas data coverage:**
   ```sql
   -- How many receipts have atlas_confirmed populated?
   SELECT COUNT(*) FROM proof_receipts WHERE array_length(atlas_confirmed, 1) > 0 AND visibility = 'public';
   
   -- How many have atlas_inferred?
   SELECT COUNT(*) FROM proof_receipts WHERE array_length(atlas_inferred, 1) > 0 AND visibility = 'public';
   
   -- Distinct roles across all public receipts (rough cluster distribution check):
   SELECT unnest(atlas_inferred) AS role, COUNT(*) 
   FROM proof_receipts 
   WHERE visibility = 'public' AND array_length(atlas_inferred, 1) > 0
   GROUP BY role 
   ORDER BY COUNT(*) DESC 
   LIMIT 20;
   
   -- Subject-kind distribution of receipts:
   SELECT e.kind, COUNT(*) FROM proof_receipts r 
   JOIN entities e ON r.subject_id = e.id 
   WHERE r.visibility = 'public' AND r.verification_level = 'L1_artifact_confirmed'
   GROUP BY e.kind;
   ```

8. **Confirm Atlas role schema location.** Phase 5 used role 'A4'. Where is the full Atlas role taxonomy defined? Look for:
   - JSON / TS files exporting role definitions
   - Any `getAtlasRoles()` helper
   - Cluster letters → role IDs mapping (clusters are A, B, S etc. — confirm)

9. **PostgREST embed pattern for the multi-table Atlas-keyed query.** Phase 5 §L caught a PGRST201 ambiguous-relationship bug. Phase 6's matching engine joins `proof_receipts` to `entities` to `agent_profiles` / `team_profiles` / `profiles`. Each junction must be evaluated for FK ambiguity. Read existing Phase 4 §G.2 `/api/v1/talent/search` query for the pattern that worked, and confirm whether the multi-FK situation needs explicit hints.

After all 9 reads, paste relevant findings concisely. Don't proceed to §C until architect-Claude reviews.

---

## §B — Architecture overview

### B.1 — Cluster derivation fix

Current (broken): `atlasClusters` derives from `atlas_inferred` only.

Phase 6 fixed:
```ts
const clusters = new Set<string>()
for (const r of receipts) {
  for (const role of [...(r.atlas_confirmed ?? []), ...(r.atlas_inferred ?? [])]) {
    const cluster = role.charAt(0)  // 'B3' → 'B', 'S1' → 'S'
    if (cluster) clusters.add(cluster)
  }
}
```

Applied to all three ranking helpers identically. RESUME_HERE.md known-issue entry updated to "Phase 6 fixed."

### B.2 — Atlas-keyed matching engine

Instead of JS-filtering a ranked list, build a SQL query that returns subjects (builders / teams / agents) with at least one L1 public receipt matching the requested cluster or role.

**Approach: Materialized view OR derived table at query time.**

The view shape (regardless of materialization choice):
```
subject_atlas_roles:
  subject_id     bigint    -- entities.id
  subject_kind   text      -- 'human' | 'team' | 'agent'  
  subject_slug   text      -- entities.slug
  atlas_role     text      -- 'A4', 'B3' etc.
  cluster        text      -- first char of atlas_role
  source         text      -- 'confirmed' | 'inferred'
  receipt_count  bigint    -- count of L1 public receipts at this role for this subject
```

Built from:
```sql
WITH atlas_pairs AS (
  SELECT 
    r.subject_id,
    e.kind AS subject_kind,
    e.slug AS subject_slug,
    role AS atlas_role,
    LEFT(role, 1) AS cluster,
    'confirmed' AS source
  FROM proof_receipts r
  JOIN entities e ON e.id = r.subject_id
  CROSS JOIN LATERAL unnest(r.atlas_confirmed) AS role
  WHERE r.visibility = 'public' AND r.verification_level = 'L1_artifact_confirmed'
  
  UNION ALL
  
  SELECT 
    r.subject_id, e.kind, e.slug,
    role, LEFT(role, 1), 'inferred'
  FROM proof_receipts r
  JOIN entities e ON e.id = r.subject_id
  CROSS JOIN LATERAL unnest(r.atlas_inferred) AS role
  WHERE r.visibility = 'public' AND r.verification_level = 'L1_artifact_confirmed'
)
SELECT subject_id, subject_kind, subject_slug, atlas_role, cluster, source, COUNT(*) AS receipt_count
FROM atlas_pairs
GROUP BY subject_id, subject_kind, subject_slug, atlas_role, cluster, source;
```

**Materialization decision:** materialized view with `REFRESH MATERIALIZED VIEW CONCURRENTLY` triggered on receipt publish/unpublish. Indexed on `(cluster, subject_kind)` and `(atlas_role, subject_kind)` for fast filtered lookups.

If materialization adds operational complexity we don't want yet, fallback: regular (non-materialized) view. Sub-100ms is still likely with proper indexes on `proof_receipts(visibility, verification_level)` + the LATERAL unnest.

**§A.7 discovery determines the call.** If receipt counts are <10K, regular view is fine. If >100K, materialize.

### B.3 — `/api/v1/talent/search` migration to matching engine

Current implementation: `getRankedBuilders()` → JS filter → 6-batched-query secondary join. Phase 6 replacement:

1. If `cluster=` or `role=` query param present: SQL query against `subject_atlas_roles` filtered to `subject_kind='human'` (since this endpoint is builder search per Phase 3 §G.2). Get matching `subject_id` set.
2. JOIN against `getRankedBuilders()` result to preserve Formula E ordering.
3. Apply remaining filters (shipped, profession, location) as before.
4. Return enriched response identical in shape.

**Buyer-side `/api/v1/talent/search` stays builder-only by default.** Adding `?type=team` or `?type=agent` query param activates team-search or agent-search variants. This is consistent with `/talent`'s existing type-facet pattern.

### B.4 — `/atlas/roles/[id]` Practitioners section

Above the existing receipts list, add a "Practitioners" section:
- Query `subject_atlas_roles` WHERE `atlas_role = $1`
- GROUP BY subject_id, return distinct subjects ordered by `MAX(receipt_count)` descending
- Render each as a compact card: subject_kind icon + name + link to `/u/<slug>` / `/team/<slug>` / `/agent/<slug>`
- Limit 20 (with "View all in directory →" link to `/talent?cluster=<first-char>` for deeper exploration)

The receipts list stays unchanged below — Practitioners is the new top section.

### B.5 — JSON-LD `knowsAbout` Atlas enrichment

Per JSON-LD schema.org, `knowsAbout` is appropriate for Atlas role identifiers (which are abstract competency labels).

For each subject type:
- **Person** (`buildPersonJsonLd`): If subject has Atlas roles via the `subject_atlas_roles` view, add them to `knowsAbout` as `["B3", "S1", ...]` (or as full URLs like `https://shipstacked.com/atlas/roles/B3` — operator-style decision, recommend full URLs for SEO).
- **shipstacked:Team** (`buildTeamOrgJsonLd`): same treatment, knowsAbout array.
- **shipstacked:Agent** (`buildAgentOrgJsonLd`): same treatment.

Existing skills array on Person stays as-is. Atlas roles are additive enrichment, not a replacement.

### B.6 — Cluster filter on `/talent` for teams and agents

`/talent?type=team&cluster=B` and `/talent?type=agent&cluster=B` currently don't filter on cluster — only the builder branch does. Phase 6 wires the cluster filter to use the matching engine for teams and agents.

### B.7 — Backwards compatibility

- `RankedBuilder`, `RankedTeam`, `RankedAgent` public shapes stay unchanged. `atlasClusters` field gets richer (now derived from confirmed+inferred), but the shape is identical.
- `/api/v1/talent/search` response shape stays unchanged. Internal implementation switches from JS-filter to SQL-query.
- `/atlas/roles/[id]` page additive: new Practitioners section above existing content. Receipts section unchanged.

---

## §C — Block 1: DDL (materialized view + indexes)

### C.1 — Operator-paste SQL

The materialized view + supporting indexes. Pasted into Supabase Dashboard SQL Editor.

```sql
BEGIN;

CREATE MATERIALIZED VIEW public.subject_atlas_roles AS
WITH atlas_pairs AS (
  SELECT 
    r.subject_id,
    e.kind AS subject_kind,
    e.slug AS subject_slug,
    role AS atlas_role,
    LEFT(role, 1) AS cluster,
    'confirmed'::text AS source
  FROM proof_receipts r
  JOIN entities e ON e.id = r.subject_id
  CROSS JOIN LATERAL unnest(COALESCE(r.atlas_confirmed, ARRAY[]::text[])) AS role
  WHERE r.visibility = 'public' 
    AND r.verification_level = 'L1_artifact_confirmed'
    AND r.atlas_confirmed IS NOT NULL
  
  UNION ALL
  
  SELECT 
    r.subject_id, e.kind, e.slug,
    role, LEFT(role, 1), 'inferred'::text
  FROM proof_receipts r
  JOIN entities e ON e.id = r.subject_id
  CROSS JOIN LATERAL unnest(COALESCE(r.atlas_inferred, ARRAY[]::text[])) AS role
  WHERE r.visibility = 'public' 
    AND r.verification_level = 'L1_artifact_confirmed'
    AND r.atlas_inferred IS NOT NULL
)
SELECT 
  subject_id, 
  subject_kind, 
  subject_slug, 
  atlas_role, 
  cluster, 
  source, 
  COUNT(*) AS receipt_count
FROM atlas_pairs
GROUP BY subject_id, subject_kind, subject_slug, atlas_role, cluster, source;

CREATE UNIQUE INDEX idx_subject_atlas_roles_unique 
  ON public.subject_atlas_roles(subject_id, atlas_role, source);

CREATE INDEX idx_subject_atlas_roles_cluster_kind 
  ON public.subject_atlas_roles(cluster, subject_kind);

CREATE INDEX idx_subject_atlas_roles_role_kind 
  ON public.subject_atlas_roles(atlas_role, subject_kind);

CREATE INDEX idx_subject_atlas_roles_subject 
  ON public.subject_atlas_roles(subject_id);

COMMIT;
```

The unique index on `(subject_id, atlas_role, source)` is required for `REFRESH MATERIALIZED VIEW CONCURRENTLY`.

### C.2 — Verification

```sql
SELECT COUNT(*) AS rows_in_view FROM subject_atlas_roles;
-- Expect: roughly = sum of (array_length(atlas_confirmed) + array_length(atlas_inferred)) per L1 public receipt, deduplicated per (subject, role, source).

SELECT subject_kind, COUNT(DISTINCT subject_id) AS subject_count
FROM subject_atlas_roles
GROUP BY subject_kind
ORDER BY subject_kind;
-- Should show distribution across human / team / agent.

SELECT cluster, COUNT(DISTINCT subject_id) AS subjects, COUNT(*) AS total_pairs
FROM subject_atlas_roles
GROUP BY cluster
ORDER BY cluster;
-- Cluster letter distribution.

SELECT indexname FROM pg_indexes 
WHERE schemaname='public' AND tablename='subject_atlas_roles'
ORDER BY indexname;
-- Expect 4 indexes (unique + 3 lookup).
```

### C.3 — Refresh mechanism

For Phase 6 v1, refresh is **manual** (operator runs `REFRESH MATERIALIZED VIEW CONCURRENTLY subject_atlas_roles;` after significant receipt activity). Automated refresh on receipt publish/unpublish is Phase 7+ work (requires a trigger or a background job).

Document the manual refresh in `RESUME_HERE.md` as a Phase 6 deferred verification.

### C.4 — Reversal

```sql
BEGIN;
DROP MATERIALIZED VIEW IF EXISTS public.subject_atlas_roles;
COMMIT;
```

---

## §D — Block 2: Cluster derivation fix in ranking helpers

### D.1 — Fix `get-ranked-builders.ts`

Find the cluster derivation block. Replace `atlas_inferred`-only iteration with `atlas_confirmed UNION atlas_inferred`. Pattern:

```ts
const clusters = new Set<string>()
for (const role of (r.atlas_confirmed ?? [])) {
  if (role) clusters.add(role.charAt(0))
}
for (const role of (r.atlas_inferred ?? [])) {
  if (role) clusters.add(role.charAt(0))
}
```

Header comment update: remove the "atlas_inferred-only" caveat. Note in commit message that the Phase 6 fix lands here.

### D.2 — Same fix in `get-ranked-teams.ts`

Apply identically. The implementation mirrored `get-ranked-builders.ts` so the bug mirrored too.

### D.3 — Same fix in `get-ranked-agents.ts`

Apply identically.

### D.4 — Validate

```bash
npx tsc --noEmit
```

No callers need to change — `atlasClusters` shape is unchanged. Builder/team/agent directory cluster facet now reflects confirmed+inferred.

---

## §E — Block 3: Atlas matching helpers

### E.1 — Create `src/lib/atlas/matching.ts`

```ts
/**
 * Atlas-keyed matching helpers (Phase 6 §E).
 * 
 * Queries the materialized `subject_atlas_roles` view to return subjects
 * (builders / teams / agents) matching by Atlas cluster or role.
 * Confirmed and inferred are unioned by default; callers can filter to
 * confirmed-only when stricter matching is needed.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type SubjectKind = 'human' | 'team' | 'agent'

export type AtlasMatch = {
  subject_id: number
  subject_kind: SubjectKind
  subject_slug: string
  atlas_role: string
  cluster: string
  source: 'confirmed' | 'inferred'
  receipt_count: number
}

export type MatchFilter = {
  cluster?: string             // single cluster letter, e.g. 'B'
  role?: string                // single role id, e.g. 'B3'  
  roles?: string[]             // OR-match multiple roles
  subjectKind?: SubjectKind    // restrict to one pillar
  confirmedOnly?: boolean      // default false (union)
}

export async function findAtlasMatches(
  admin: SupabaseClient,
  filter: MatchFilter,
): Promise<AtlasMatch[]>

/**
 * For a given Atlas role, return distinct practitioners (subjects with at
 * least one L1 public receipt at this role). Used by /atlas/roles/[id].
 */
export async function getPractitionersAtRole(
  admin: SupabaseClient,
  roleId: string,
  limit = 20,
): Promise<Array<{
  subject_id: number
  subject_kind: SubjectKind  
  subject_slug: string
  display_name: string  // joined from entities
  receipt_count: number
}>>

/**
 * For a given subject (by entity_id), return their Atlas roles.
 * Used for JSON-LD `knowsAbout` enrichment.
 */
export async function getAtlasRolesForSubject(
  admin: SupabaseClient,
  subjectId: number,
): Promise<Array<{ atlas_role: string; source: 'confirmed' | 'inferred'; receipt_count: number }>>
```

Implementation uses standard `from('subject_atlas_roles').select().eq().in()` patterns. Display name join via secondary `entities` query if needed (to avoid embed ambiguity per Phase 5 §L lesson).

### E.2 — Validate

```bash
npx tsc --noEmit
```

Helpers compile. No callers yet (they're plumbed in §F/§G).

---

## §F — Block 4: `/api/v1/talent/search` matching engine integration

### F.1 — Refactor `/api/v1/talent/search/route.ts`

Add `?type=team` / `?type=agent` support (mirror `/talent` page's existing type-facet pattern).

For each type:
1. If `cluster=` or `role=` present: call `findAtlasMatches({ cluster, role, subjectKind })` to get matching subject_ids.
2. Filter `getRankedBuilders/Teams/Agents()` result to those subject_ids (preserving Formula E ordering).
3. Apply remaining filters (shipped, profession, location, services) as before.
4. Return enriched response.

If no `cluster`/`role`: skip the matching engine, behave as before.

### F.2 — Add Atlas role enrichment to response

For each returned subject, include their full Atlas role list (via `getAtlasRolesForSubject`):

```json
{
  "username": "alice",
  "atlas_roles_confirmed": ["B3"],
  "atlas_roles_inferred": ["A4", "S1"]
}
```

(Builder already has these per Phase 3 §G.2; Phase 6 ensures team and agent endpoints also return them.)

### F.3 — Validate

```bash
npx tsc --noEmit
```

---

## §G — Block 5: `/talent` cluster filter for teams + agents

### G.1 — Extend `/talent/page.tsx` team branch

When `type === 'team'` AND `cluster` URL param present: call `findAtlasMatches({ cluster, subjectKind: 'team' })` to get matching team subject_ids, then filter the `ranked + belowThreshold` set.

### G.2 — Same for agents

When `type === 'agent'` AND `cluster` present: identical pattern with `subjectKind: 'agent'`.

### G.3 — Update TalentClient cluster facet

The cluster facet UI (existing chip strip) already renders for builders. Extend to teams + agents — show the same cluster letters with counts per type (counts derived from the matching engine).

### G.4 — Validate

```bash
npx tsc --noEmit
npm run build
```

---

## §H — Block 6: `/atlas/roles/[id]` Practitioners section

### H.1 — Extend `/atlas/roles/[id]/page.tsx`

Above the existing "Recent Receipts" section, add a "Practitioners" section:

```tsx
<section>
  <h2>Practitioners</h2>
  <p>People, teams, and agents shipping work in this role.</p>
  <div className="practitioners-grid">
    {practitioners.map(p => (
      <a key={p.subject_id} href={subjectUrl(p.subject_kind, p.subject_slug)}>
        <kind-icon for={p.subject_kind} />
        <span>{p.display_name}</span>
        <span className="receipt-count">{p.receipt_count}</span>
      </a>
    ))}
  </div>
  {practitioners.length === 20 && (
    <a href={`/talent?cluster=${cluster}`}>View all in directory →</a>
  )}
</section>
```

Use `getPractitionersAtRole(admin, roleId)` from §E.1.

### H.2 — Validate

```bash
npx tsc --noEmit
npm run build
```

---

## §I — Block 7: JSON-LD `knowsAbout` enrichment

### I.1 — `src/lib/jsonld/person.ts`

Add optional `atlasRoles?: string[]` parameter to `buildPersonJsonLd`. If provided, merge into `knowsAbout` alongside existing skills:

```ts
const knowsAbout = [
  ...(skills.map(s => s.name)),
  ...(atlasRoles?.map(role => `${CANONICAL_HOST}/atlas/roles/${role}`) ?? []),
]
```

(Use full URLs for Atlas roles to be machine-resolvable.)

Callers (`/u/[username]/page.tsx`) pass `atlasRoles` from `getAtlasRolesForSubject`.

### I.2 — `src/lib/jsonld/team-org.ts`

Add `knowsAbout` field to `shipstacked:Team` JSON-LD with Atlas role URLs.

### I.3 — `src/lib/jsonld/agent-org.ts`

Same for `shipstacked:Agent`.

### I.4 — Wire callers

Update `/u/[username]/page.tsx`, `/team/[slug]/page.tsx`, `/agent/[slug]/page.tsx` to pass `atlasRoles` to their respective JSON-LD builders.

### I.5 — Validate

```bash
npx tsc --noEmit
npm run build
```

---

## §J — Block 8: Final validation + headless seed-and-verify

### J.1 — Static gates

```bash
npx tsc --noEmit
npm run build
grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"  # expect 0
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000  # exit 0
```

### J.2 — Headless seed-and-verify

Mirror Phase 4 §M.2 / Phase 5 §L pattern. The Phase 4 + 5 seeded subjects already have receipts at A4 — we use them as live test data.

Seed verification script `scripts/v2/_phase6_seed.ts` (TEMP, not committed):

1. Refresh the materialized view: `REFRESH MATERIALIZED VIEW CONCURRENTLY subject_atlas_roles;` via service-role.

2. Confirm view populated correctly:
   - `subject_atlas_roles` should contain ≥1 row with `subject_kind='team'` (from Test Studio Phase4 receipt #88 at A4)
   - ≥1 row with `subject_kind='agent'` (from Test Agent Phase5 receipt #89 at A4)
   - Some rows with `subject_kind='human'` from existing builder receipts

3. Verify matching engine:
   - `findAtlasMatches({ cluster: 'A' })` returns rows from all three pillars
   - `findAtlasMatches({ role: 'A4', subjectKind: 'team' })` returns Test Studio Phase4
   - `findAtlasMatches({ role: 'A4', subjectKind: 'agent' })` returns Test Agent Phase5

4. Headless curl verification:
   - `curl /talent?cluster=A` → builders shown
   - `curl /talent?type=team&cluster=A` → Test Studio Phase4 visible
   - `curl /talent?type=agent&cluster=A` → Test Agent Phase5 visible
   - `curl /atlas/roles/A4` → Practitioners section shows the seeded subjects
   - `curl /api/v1/talent/search?cluster=A` with builder:rw key → returns builders
   - `curl /api/v1/talent/search?type=team&cluster=A` with buyer:rw key → returns Test Studio Phase4
   - `curl /api/v1/talent/search?type=agent&cluster=A` with buyer:rw key → returns Test Agent Phase5

5. JSON-LD enrichment check:
   - Visit `/team/test-studio-phase4`, parse the shipstacked:Team JSON-LD, confirm `knowsAbout` includes `https://shipstacked.com/atlas/roles/A4`
   - Same for `/agent/test-agent-phase5`

6. Cluster derivation fix verification:
   - Confirm `getRankedBuilders` now includes confirmed roles in atlasClusters (verify by SQL query: pick a builder with confirmed-only roles, check that cluster appears in their RankedBuilder output)

7. Cleanup the temp script after verification (file delete).

### J.3 — Report

Same template as prior phases.

---

## §K — Block 9: Ship

### K.1 — Commit

Stage explicitly per the Phase 4/5 lesson:
```bash
git status --short
git add -A src/ docs/decisions/RESUME_HERE.md scripts/v2/verify-agent-card.ts supabase/migrations/<phase6-migration>.sql
git status --short
```

Commit message:
```
Phase 6: Atlas wiring proper

Atlas becomes load-bearing for the four-pillar customer-type architecture
via a materialized SQL view that backs cluster + role matching across
builders, teams, and agents. Resolves the long-standing atlas_inferred-only
cluster derivation issue. Adds practitioner directory to /atlas/roles/[id].
Enriches all three pillar JSON-LD types with knowsAbout Atlas roles.

Shipped:
- subject_atlas_roles materialized view (cluster + role indexed across all
  three pillars; manual REFRESH for v1, automated trigger deferred to
  Phase 7+).
- src/lib/atlas/matching.ts: findAtlasMatches, getPractitionersAtRole,
  getAtlasRolesForSubject helpers.
- /api/v1/talent/search now SQL-keyed against subject_atlas_roles when
  cluster or role filter is present (was JS-filter on ranked list);
  supports ?type=team and ?type=agent.
- /talent cluster filter extended to teams and agents (was builders only).
- /atlas/roles/[id] Practitioners section above receipts list (top 20
  subjects with link to /talent?cluster=<letter> for deeper exploration).
- Cluster derivation fixed across getRankedBuilders/Teams/Agents: now
  uses atlas_confirmed UNION atlas_inferred (was inferred-only — the
  RESUME_HERE.md known-issue is closed).
- buildPersonJsonLd / buildTeamOrgJsonLd / buildAgentOrgJsonLd all emit
  knowsAbout with Atlas role URLs.

DDL applied to prod DB before commit:
- New materialized view subject_atlas_roles + 4 indexes (1 unique for
  concurrent refresh, 3 lookup).

Did NOT change:
- Existing receipt-side Atlas conventions (alternativeHeadline per
  atlas-article.ts stays as-is).
- Snapshot semantics for atlas_inferred (locked Q3 — no recompute).
- RankedBuilder/Team/Agent public shapes (additive knowsAbout only).

Deferred:
- Automated materialized view refresh on receipt publish (Phase 7+).
- Receipt-level Atlas search (find work in role X) — Phase 9 target-list.
- Atlas claim/disclaim UX on builder/team/agent edit pages (locked Q1 (c)
  scope, deferred until paying-buyer demand).

Discovery + diff plan: docs/audit/PHASE6_ATLAS_WIRING.md (untracked
working tree; Phase 7 commits per pattern).
```

Push.

### K.2 — Post-deploy verify

- Poll prod `/atlas/roles/A4` for the Practitioners section
- Run `verify-agent-card.ts --base https://shipstacked.com` → exit 0
- Curl all the `?cluster=` + `?type=` variations on prod
- Confirm JSON-LD knowsAbout enrichment lands on the three seeded subjects

### K.3 — Update RESUME_HERE.md

- Move Phase 6 to completed
- Close the atlasClusters known-issue entry ("Phase 6 closed")
- Add Phase 6 deferred verifications

---

## §L — Decisions locked

- Materialized view over real-time query (perf insurance against future scale)
- Manual refresh for v1, automated trigger deferred to Phase 7+
- Snapshot semantics (atlas_inferred permanent per receipt)
- Builder + team + agent matching (not receipt-level — Phase 9)
- Atlas role URLs in knowsAbout (machine-resolvable, SEO-friendly)
- Practitioner display caps at 20 with directory-link overflow
- Existing RankedX shapes preserved (additive enrichment only)

## §M — Deferred

- Automated materialized view refresh (Phase 7+: trigger on receipt insert/update/delete)
- Atlas role claim/disclaim UX on builder/team/agent edit pages (Q1 (c) scope; defer until paying-buyer demand)
- Receipt-level Atlas search (Phase 9 target-list)
- Atlas role label resolution (currently shows role IDs like "A4"; label like "Atlas Research / A4" is operator-content not architecture)
- Multi-version Atlas migration (v0.3 → v0.4 receipts coexist; recompute deferred per snapshot semantics)

End of Phase 6 doc.
