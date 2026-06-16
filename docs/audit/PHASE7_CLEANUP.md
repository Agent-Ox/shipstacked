# Phase 7 — State restoration + cleanup

**Discovery + execution diff plan in one doc.** Closes the long-running deferred items that have accumulated across Phases 1-6 without justifying their own phase. Lean scope: real cleanup, not exhaustive verification. Gets the working tree, schema, and docs to a state that matches what's actually on prod.

**Locked decisions (June 16, post-Phase-6):**
- **Q1 — Scope:** (a) Lean cleanup. Deferred items that are real bugs or real inconsistencies only. Browser-paired UI verifications, Stripe lifecycle, operator dogfooding deferred to operator-when-convenient (not blocking outreach).
- **Q2 — velocity_score columns:** (c) Discover-then-drop. §A confirms zero readers + zero non-null values, then §C drops. If anything surfaces, defer to Phase 8+ with documented reason.
- **Q3 — Phase docs:** (a) Commit all phase docs verbatim. Historical archive of decisions and corrections. Future readers benefit from the actual reasoning.

**What Phase 7 ships:**

1. **Builder cluster facet count parity** — Today builder cluster facet *counts* use legacy all-public `atlasClusters` derivation while the *filter* uses L1-only matching engine. Counts can overstate. Fix: derive counts from matching engine, aligned with team/agent.

2. **velocity_score column cleanup** — If zero readers + zero non-null values, drop the columns. Otherwise defer with documented reason.

3. **Phase docs committed** — All `docs/audit/PHASE*_*.md` files in the working tree become tracked. Future Claude / future operator reading the repo sees the decision history.

4. **Audit scripts decision** — `scripts/v2/audit-direction.ts` and `scripts/v2/audit-ground-truth.ts` have been untracked for 5 phases. §A checks whether they're still relevant. Then ship to git OR delete.

5. **AgentOnboarding shim URL handling polish** — `/dashboard?agent=1` currently redirects to `/join` (Phase 5 §M.2). Verify on prod that the redirect is clean (no 500s, no stale references). Discovery-only — if anything's off, fix; otherwise close the deferred item.

6. **Inconsistency audit on the rename to `findOrCreateSignupSlug`** — Phase 5 §E.2 noted `deriveTeamSlug` was reused for agent signup. The function is now used by both team and agent Card 2/3 flows. Rename for clarity if no callers break, or document the dual-use if rename adds risk.

**What Phase 7 does NOT do:**

- No new features
- No new pillars
- No matching engine extensions
- No browser-paired UI verifications (operator-dogfood class)
- No Stripe lifecycle work (Phase 8+ when payment flow is exercised again)
- No materialized view migration (no perf need at current scale)

**Inheritances from prior phases (NO Phase 7 work needed):**
- All six pillars / customer surfaces shipped
- Atlas wiring proper (Phase 6)
- AgentCard skill #10 fetch-agent-profile (Phase 5)
- All static gates (tsc + build + verify-agent-card) pass on every commit

**Scope estimate:** 3-5 hours, one session.

**Files (estimated):**
- NEW: 0-1 (possible velocity_score drop migration if §A confirms safe)
- Modified: 4-6 (`src/lib/ranking/get-ranked-builders.ts` or `src/app/talent/page.tsx` for cluster facet fix, possibly a rename across team/agent join routes if `deriveTeamSlug` renames, RESUME_HERE.md as always)
- New tracked (was untracked): all Phase 1-6 docs in `docs/audit/`, possibly `scripts/v2/audit-*.ts`

---

## §A — Pre-flight discovery (READ-ONLY)

Five investigations. Stop and report after each block; architect-Claude reviews.

### §A.1 — velocity_score column audit

```sql
-- 1. Which tables have velocity_score?
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name LIKE 'velocity%'
ORDER BY table_schema, table_name;

-- 2. For each table found, count non-null values:
-- (Run for each table the above returns. Example:)
SELECT COUNT(*) FROM profiles WHERE velocity_score IS NOT NULL;
SELECT COUNT(*) FROM <other_table> WHERE velocity_score IS NOT NULL;

-- 3. Any indexes on velocity_score?
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='public' AND indexdef LIKE '%velocity%';

-- 4. Any views referencing velocity_score?
SELECT viewname, definition FROM pg_views
WHERE schemaname='public' AND definition LIKE '%velocity%';
```

Then code-side:
```bash
grep -rn "velocity" src/ --include="*.ts" --include="*.tsx" --include="*.sql"
grep -rn "velocity" supabase/migrations/ --include="*.sql"
grep -rn "velocity" scripts/ --include="*.ts"
```

Report:
- Tables + columns + data_type
- Non-null counts per table
- Index/view references
- All code references (should be zero in src/ per Phase 1 honesty pass; any non-zero is suspicious)

If zero non-null values AND zero code references: §C can drop safely. If anything surfaces: report what + recommend defer or alternative.

### §A.2 — Builder cluster facet count audit

Read `src/app/talent/page.tsx` and `src/app/talent/TalentClient.tsx`. Find the builder cluster facet derivation. Per Phase 6 §G the *filter* uses matching engine but the *facet counts* use legacy `atlasClusters` derivation.

Confirm:
- Where exactly are builder cluster facet counts computed?
- Is it from `RankedBuilder.atlasClusters` (which derives from confirmed+inferred all-public per Phase 6 §D fix) OR from a separate facet derivation?
- What does the team and agent branch do (per Phase 6 §G.1 implementation)?

Show the FROM string verbatim so we have a clean diff target for §D.

### §A.3 — Phase docs inventory

```bash
ls -la docs/audit/
git ls-files docs/audit/ | head -50
git status --short docs/audit/
```

Report:
- All files in `docs/audit/`
- Which are tracked vs untracked
- File sizes
- Each `PHASE*_*.md` discovered

Also check for stale references:
```bash
grep -rn "PHASE5_AGENT_FLOW\|PHASE6_ATLAS_WIRING\|PHASE4_TEAM_FLOW" src/ docs/ scripts/ --include="*.md" --include="*.ts" --include="*.tsx"
```

If any code references these as imports or required files: flag (shouldn't be — docs are reference, not required).

### §A.4 — Audit scripts

```bash
ls -la scripts/v2/audit-*.ts
head -50 scripts/v2/audit-direction.ts
head -50 scripts/v2/audit-ground-truth.ts
git log --all --oneline -- scripts/v2/audit-direction.ts scripts/v2/audit-ground-truth.ts
git status --short scripts/v2/
```

Report:
- File presence + size + creation date (git log)
- What each does (from the head)
- Last modified (mtime)
- Whether anything else references them (`grep -rn "audit-direction\|audit-ground-truth" src/ scripts/`)

Decision tree:
- Still relevant to current platform → ship (track + commit)
- Stale or single-use → delete
- Active development on them but never committed → ship as draft state

### §A.5 — `/dashboard?agent=1` URL handling verification (read-only on prod)

```bash
# Curl prod, follow redirects, confirm clean behavior:
curl -sI https://shipstacked.com/dashboard?agent=1
curl -sL https://shipstacked.com/dashboard?agent=1 | head -50
```

Report:
- HTTP status sequence (302/307?)
- Final landing URL
- Anything stale (404 elements, broken redirects, references to AgentOnboarding)

Also code-side:
```bash
grep -rn "agentMode\|agent=1" src/ --include="*.ts" --include="*.tsx"
```

Should be zero or just descriptive comments (per Phase 5 §M.2 deletion). If anything functional surfaces: flag.

### §A.6 — `deriveTeamSlug` cross-pillar usage

Per Phase 5 §E.2 the team-slug-derivation helper is reused by agent signup. Confirm:

```bash
grep -rn "deriveTeamSlug\|deriveSignupSlug\|deriveAgentSlug" src/ --include="*.ts" --include="*.tsx"
```

Report:
- All callers
- Current name + signature
- Whether the name accurately reflects its usage (used by team + agent)

Decision:
- If only used in 2-3 places and a rename to `deriveSignupSlug` is mechanical: rename in §G
- If used in 5+ places or rename adds risk: keep name, add a one-line comment documenting dual-use, no functional change

---

## §B — Architecture overview

### B.1 — Cluster facet count fix (§A.2 dependent)

After §A.2 reveals the current derivation, replace the facet-count source with matching-engine-derived counts. Pattern (mirroring Phase 6 §G for teams/agents):

```ts
const builderMatches = await findAtlasMatches(admin, { subjectKind: 'human' })
const clusterFacets = clusterFacetsFromMatches(builderMatches)
// pass to TalentClient
```

Counts now reflect L1-only matched subjects — same definition as the filter. Click "B (5)" returns up to 5 results, not "B (5)" returning 3.

### B.2 — velocity_score drop (§A.1 dependent)

If §A.1 confirms safe:

```sql
-- Drop columns. Indexes auto-drop with columns.
BEGIN;
ALTER TABLE profiles DROP COLUMN IF EXISTS velocity_score;
-- (and any other tables §A.1 surfaces)
COMMIT;
```

Operator pastes via Dashboard. Verification via information_schema query.

### B.3 — Phase docs as tracked files

```bash
git add docs/audit/PHASE1_*.md docs/audit/PHASE2_*.md docs/audit/PHASE3_*.md docs/audit/PHASE4_*.md docs/audit/PHASE5_*.md docs/audit/PHASE6_*.md
```

Only files that actually exist; §A.3 discovery determines the list.

### B.4 — Audit scripts decision

§A.4 determines. Either:

```bash
git add scripts/v2/audit-direction.ts scripts/v2/audit-ground-truth.ts
```

OR:

```bash
git rm scripts/v2/audit-direction.ts scripts/v2/audit-ground-truth.ts
# (or rm if not tracked)
```

### B.5 — deriveTeamSlug optional rename

§A.6 determines. Either rename to `deriveSignupSlug` across callers, OR leave with a documentation comment.

---

## §C — Block 1: velocity_score column drop (conditional)

### §C.1 — Operator-paste SQL (only if §A.1 confirms safe)

```sql
BEGIN;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS velocity_score;
-- Other tables added here based on §A.1 discovery
COMMIT;
```

### §C.2 — Verification

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND column_name LIKE 'velocity%';
-- Expect: 0 rows
```

### §C.3 — Reversal

```sql
BEGIN;
ALTER TABLE public.profiles ADD COLUMN velocity_score numeric;
COMMIT;
```

(For pedantic backout. In practice this won't be needed — velocity_score has been dead code since Phase 1.)

If §A.1 surfaces non-zero values or code references: skip §C entirely, document deferred reason in RESUME_HERE.md, proceed to §D.

---

## §D — Block 2: Builder cluster facet count fix

### §D.1 — Fix the count derivation in `/talent/page.tsx`

Currently builders use a different derivation than teams/agents (per §A.2 discovery). Align by calling `findAtlasMatches({ subjectKind: 'human' })` once at page-load, then computing `clusterFacets = clusterFacetsFromMatches(matches)`.

The `clusterMatchedProfiles` variable (already exists per Phase 6 §G) can be derived from the same query if cluster filter is also active — single matching-engine call serves both purposes.

### §D.2 — Validate

```bash
npx tsc --noEmit
npm run build
```

Manual check: visit `/talent` locally, confirm cluster chip counts now reflect L1-matched subjects (likely smaller numbers than before for clusters where non-L1 work exists).

---

## §E — Block 3: Phase docs commit

### §E.1 — Confirm files (§A.3 result)

List `docs/audit/PHASE*_*.md` files that actually exist. These get tracked.

### §E.2 — Stage

```bash
git add docs/audit/
```

Or more precisely (per §A.3 list):
```bash
git add docs/audit/PHASE5_AGENT_FLOW.md docs/audit/PHASE6_ATLAS_WIRING.md
# (and any others discovered)
```

---

## §F — Block 4: Audit scripts (ship or delete per §A.4)

If §A.4 says "still relevant":
```bash
git add scripts/v2/audit-direction.ts scripts/v2/audit-ground-truth.ts
```

If §A.4 says "stale":
```bash
rm scripts/v2/audit-direction.ts scripts/v2/audit-ground-truth.ts
```

Document the choice in §K commit message.

---

## §G — Block 5: deriveTeamSlug rename (optional per §A.6)

If §A.6 says "rename mechanical":

1. Rename the function: `deriveTeamSlug` → `deriveSignupSlug`.
2. Update all 2-3 callers found in §A.6.
3. Update any comments / docstrings.

If §A.6 says "leave with documentation":
1. Add one-line comment above the function: `// Used by both /api/join/team and /api/join/agent — sanitization is identical (Phase 5 §E.2).`
2. No code change.

### §G.1 — Validate

```bash
npx tsc --noEmit
```

---

## §H — Block 6: AgentOnboarding URL handling polish (§A.5 dependent)

If §A.5 surfaced anything stale (broken redirect, 500, dangling reference): fix per finding.

If §A.5 says everything's clean: close the Phase 5 deferred item in RESUME_HERE.md, document the verified-clean state.

---

## §I — Block 7: Final validation

```bash
npx tsc --noEmit
npm run build
grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"   # expect 0
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000  # expect exit 0
```

No headless seed-and-verify this phase (Phase 7 changes are cleanup, not new features — existing tests / verifications still cover).

Manual cluster-facet check: visit `/talent`, click a cluster chip, confirm the chip's reported count matches actual filtered results. (Browser-paired but optional — terminal Claude can curl + grep the counts in HTML.)

---

## §J — Block 8: Ship

### §J.1 — Pre-commit stage check

```bash
git status --short
```

Confirm expected set:
- Modified: src/app/talent/page.tsx (§D), possibly src/app/join/page.tsx + src/lib/* (§G rename)
- New (was untracked): docs/audit/PHASE*_*.md (§E), possibly scripts/v2/audit-*.ts (§F)
- Possible migration if §C ran: supabase/migrations/<phase7-velocity-drop>.sql

### §J.2 — Stage explicitly

```bash
git status --short
git add -A src/ docs/decisions/RESUME_HERE.md docs/audit/ <other paths per §A>
git status --short
```

### §J.3 — Update RESUME_HERE.md

A. Add "Phase 7 (completed, committed this session) — State restoration + cleanup" section.
B. Move/close all deferred items that this phase addressed.
C. Update "Known issues" section.
D. Remove (or mark closed) any other resolved items.

### §J.4 — Commit + push

```
Phase 7: State restoration + cleanup

Closes deferred items accumulated across Phases 1-6 that didn't justify
their own phase. Lean scope: real cleanup only, no new features, no
browser-paired UI verifications. Gets working tree, schema, and docs
in sync with prod.

Shipped:
- Builder cluster facet count parity (was: counts via legacy all-public
  atlasClusters; filter via L1-only matching engine — could overstate).
  Counts now derived from matching engine, aligned with team/agent.
- [§A.1-dependent] velocity_score column drop OR documented deferral.
- All Phase 1-6 discovery + diff plan docs committed to docs/audit/.
- [§A.4-dependent] Audit scripts shipped to git OR deleted.
- [§A.5-dependent] /dashboard?agent=1 URL handling verified clean OR fixed.
- [§A.6-dependent] deriveTeamSlug rename OR documentation comment.

DDL applied to prod DB (if §C ran):
- velocity_score columns dropped.

Did NOT change:
- Phase 1-6 architecture / contracts
- Public-facing surfaces (visual diff zero unless §D's facet count fix
  shows visible count change)
- New features

Discovery + diff plan: docs/audit/PHASE7_CLEANUP.md (committed in this
phase, mirroring its own pattern).

Co-Authored-By: Claude <noreply@anthropic.com>
```

### §J.5 — Post-deploy verify

- Poll prod for deploy
- verify-agent-card.ts --base https://shipstacked.com → exit 0
- curl https://shipstacked.com/talent → check cluster facet counts look reasonable (no zero where Phase 6 had non-zero, ideally smaller numbers reflecting L1-only)

### §J.6 — Final report

Standard template.

---

## §K — Decisions locked

- Lean cleanup (no browser-paired verifications, no operator-dogfooding required)
- velocity_score: discover-then-drop (safe path)
- Phase docs committed verbatim (no redactions)
- Audit scripts decision deferred to §A.4 discovery
- Rename decision deferred to §A.6 discovery
- No new features; cleanup-class only

## §L — Deferred (next phases)

- Phase 4/5/6 browser-paired UI verifications (operator-driven; not blocking outreach)
- Stripe lifecycle test (Phase 8+ when payment flow is exercised)
- Materialized-view migration (no current need; revisit at scale)
- Q1(c) Atlas classification UX (post-revenue per Q1 lock)
- Multi-agent-per-owner UX
- Agent-as-buyer

End of Phase 7 doc.
