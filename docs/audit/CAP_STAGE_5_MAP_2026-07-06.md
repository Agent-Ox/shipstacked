# Cap-Stage 5 — org-unification finish: full map (2026-07-06)

READ-ONLY map of the last org-unification piece, against the corrected model now live
(member = active subscription; `hires` / `offers_services` capability flags on `team_profiles`;
`client` mode retired in D2b-1; buyers are `kind='org'` owners). HEAD = `74cd4f6`.

Cap-Stage 5 = **(a)** re-merge the parked stage-4 unified org page · **(b)** re-key jobs
`employer_email → subject_entity_id` · **(c)** confirm messaging on `subject_entity_id` ·
**(d)** deprecate `employer_profiles`.

## TL;DR
- **(a)** The parked branch is **ONE commit, 2 files, and merges CLEAN** — main never touched
  either file since the fork, and it references **nothing** that D2b-1 removed (uses live
  `offers_services`/`hires` + `buildHirerOrgJsonLd` + `jobs.subject_entity_id`). Re-mergeable
  **as-is**. Caveat: its hiring-lens "Open roles" reads `jobs.subject_entity_id`, which is
  **0/25 populated**, so it renders empty until (b).
- **(b)** `jobs.subject_entity_id` **column exists but is 0/25 populated**. The standard post
  path (`/api/jobs`) writes only `employer_email`; only `/api/jobs/post-as-team` dual-writes
  `subject_entity_id`. Re-key = make the standard path resolve+write the org entity, migrate
  the read paths, backfill. **All 25 jobs are test** → backfill is trivial/moot for real data.
- **(c)** Conversations **already have `subject_entity_id`** and the team-inbox read path
  (`/api/messages ?as=team`) uses it — but **0/159 conversations are populated** (all 159 are
  `employer_dm` keyed on `employer_email`). Messaging is **still employer_email-keyed in
  practice**; the entity path exists in code with no data.
- **(d)** `employer_profiles` = **10 rows, ALL test, 22 code references** (reads dominate:
  company display, job→company, messaging contacter resolution, NavBar, sitemap). Deprecation
  is a **code migration** (repoint reads to `entities`/`team_profiles`), not a data problem.

---

## 1. THE PARKED STAGE-4 BRANCH — `hold/stage4-org-page` (`32cde80`)

### Shape
- **One commit:** `32cde80 feat(org): unified public org page — team + company render by capability (stage 4)`
- **Merge-base:** `88545c9` (stage 3, "company profile edits the org profile, not employer_profiles") — 2026-07-06.
- **1 ahead, 21 behind main.** Files touched (2):
  - `src/app/team/[slug]/page.tsx` (+142/-25)
  - `src/app/company/[slug]/page.tsx` (+18)

### What it builds — the unified org public page
`team/[slug]/page.tsx` becomes the **canonical org page for BOTH service teams and hiring orgs**:
- `resolveTeam` widened: `.eq('kind','team')` → **`.in('kind', ['team','org'])`** — serves
  Stage-2 buyer orgs (`kind='org'`) on the same route. Lens driven by capability flags, not kind.
- **Two capability lenses**, gated on the live `team_profiles` flags:
  - `offersServices = profile.offers_services` → **service lens**: Services, Proof of work, Recent
    shipped, People, Contact CTA (each now wrapped `offersServices && …`). Existing teams
    (`offers_services=true/hires=false`) render byte-unchanged.
  - `hires = profile.hires` → **hiring lens**: "What they build", "Hiring" (industry/hiring_type),
    and **"Open roles"** — reads `jobs WHERE subject_entity_id = entity.id AND status='active'`.
- **JSON-LD**: emits `buildTeamOrgJsonLd` when `offersServices`, `buildHirerOrgJsonLd` when
  `hires` (both when both). `buildHirerOrgJsonLd` **exists** (`src/lib/jsonld/hirer-org.ts:48`).
- Adds to the local `TeamProfile` type: `offers_services, hires, what_they_build, industry,
  hiring_type, linkedin_url, x_url` (all already returned by the `select('*')`).

`company/[slug]/page.tsx`:
- Adds: if an entity (`kind in team,org`) owns this slug → **`redirect('/team/'+slug)`** (the
  unified page is canonical). Only pre-Stage-2 hirers (an `employer_profiles` row with no org
  entity) fall through to the legacy company page.

### Re-mergeability — CLEAN (no conflict), no stale refs
- **No drift:** `git log 88545c9..main -- team/[slug]/page.tsx` and `… company/[slug]/page.tsx`
  are **both empty** — main's 21 intervening commits never touched either file. So the 3-way
  merge base == main's version for these files → the parked diff applies cleanly. ✅
- **No removed-mode references:** the diff uses only **live** primitives — `offers_services`,
  `hires` (Stage-1 capability flags, live), `buildHirerOrgJsonLd`, `getTeamMembers`,
  `getAtlasRolesForSubject`, `jobs.subject_entity_id`. **It does NOT reference `EntityModes.client`
  or any field D2b-1 removed** (it's a server component resolving via `admin`/service-role reads,
  not `getEntityModes`). The `company` page imports `getEntityModes` (pre-existing, still exists).
  ✅ Parked BEFORE client retirement, but touches nothing that was retired.

### ⚠️ Flags on the parked page
1. **Hiring lens renders empty until (b).** "Open roles" reads `jobs.subject_entity_id` = **0/25
   populated** → every hiring org shows "No open roles right now." Graceful (handled), but the
   lens has no data until jobs are re-keyed. Re-merge (a) is **coherent but incomplete** without (b).
2. **Published gate:** buyer orgs are `team_profiles.published=false` by default → the org page
   404s for them until they publish (Invariant #2 — correct, but means a fresh buyer's page is
   hidden). Worth an explicit product decision (should a hiring org auto-publish?).
3. **`/company/[slug]` redirect:** fires only when a team/org entity owns the slug. The 3 *public*
   test `employer_profiles` (northwind-talent-partners, test-company-3, the-ai-company) have no
   org entity → they still render the legacy page. No breakage, but confirms legacy path stays
   until (d).

---

## 2. JOBS DATA MODEL

### Schema (live — not in `supabase/migrations/`, Dashboard-applied)
`jobs` columns: `id, created_at, employer_email, company_name, role_title, description,
requirements, salary_range, location, employment_type, skills, status, expires_at, anonymous,
hiring_for, urgency, day_rate, timezone, subject_entity_id`.
- **`subject_entity_id` EXISTS but is 0/25 populated.** `employer_email` is 25/25.
- **25 rows, ALL test** (every `employer_email` is `oxleethomas+*`). Status: 24 `paused`, 1 `active`.

### How a job is tied to its owner today
- **Standard post (`/api/jobs/route.ts:28`)** — the browser `PostJobForm` path — inserts
  `employer_email: user.email` **and NOT `subject_entity_id`**. So a normally-posted job is
  keyed on **employer_email only**.
- **`/api/jobs/post-as-team/route.ts:75-76`** — inserts **both** `employer_email` AND
  `subject_entity_id: entity.id` (validates the entity is a team/agent the poster owns). This is
  the only path that dual-writes the entity key — and it's evidently unused for the 25 test jobs.
- **Read paths key on `employer_email`:** `jobs/page.tsx` and `jobs/[id]/page.tsx` resolve the
  posting company via `employer_profiles` keyed by `employer_email` (job → company logo/slug).

### What re-keying actually needs
1. **Write:** make the standard `/api/jobs` path resolve the poster's org entity and write
   `subject_entity_id` (dual-write during transition; `post-as-team` already does this).
2. **Read:** repoint `jobs/page.tsx` + `jobs/[id]/page.tsx` company resolution from
   `employer_email → employer_profiles` to `subject_entity_id → entities/team_profiles`.
3. **Backfill:** set `subject_entity_id` on existing jobs from `employer_email`'s owner entity.
   **All 25 are test → backfill is a throwaway** (or purge the test jobs and start clean).
   The parked org page's "Open roles" lights up once (1)+(3) land.

---

## 3. MESSAGING / CONVERSATIONS

### Schema (live)
`conversations` columns: `id, employer_email, builder_profile_id, job_id, created_at,
last_message_at, conversation_type, client_email, client_name, subject_entity_id`.
- **`subject_entity_id` EXISTS but is 0/159 populated.** `employer_email` is 159/159.
- **159 rows, ALL `conversation_type='employer_dm'`** (the 4 `project_inquiry` rows were purged
  in D2b-1 cleanup; `job_application` type is defined in code but no live rows).

### How conversations are keyed today
- **Practice: still `employer_email`.** All 159 rows key the hirer side on `employer_email`; the
  builder side on `builder_profile_id`. `subject_entity_id` is unused (0 rows).
- **Code already has the entity path:** `/api/messages/route.ts` `?as=team` branch (`:57-113`)
  reads `conversations WHERE subject_entity_id = <team>` for the team shared inbox, and the POST
  reply path checks `subject_entity_id` for team-admin participation (`:294-301`). So the
  **entity-keyed messaging path exists in code but has no data** — a team-posted contact would
  populate it, but the 159 existing DMs predate/bypass it.
- **Contacter resolution reads `employer_profiles`** (`/api/messages/route.ts` ×3: resolve the
  hirer's `company_name`/`logo_url` by `employer_email`). This is the messaging tie to (d).

### What (c) needs
Mostly **confirm + migrate reads**, not a schema change: the `subject_entity_id` column and the
team-inbox path already exist. The work is (i) writing `subject_entity_id` on new employer_dm
conversations (resolve the hirer's org entity), and (ii) repointing the contacter-name resolution
from `employer_profiles` to `entities/team_profiles`. All 159 rows are test → no real migration.

---

## 4. `employer_profiles` — deprecation surface

### Data
**10 rows, ALL test** (every email `oxleethomas+*`), 3 `public=true` (northwind-talent-partners,
test-company-3, the-ai-company). **Zero real employer_profiles.** So data deprecation = purge test.

### Code references (22) — reads dominate; deeply embedded
**Read (display / resolution):**
- `src/app/company/[slug]/page.tsx` — the legacy company public page (2 reads).
- `src/app/jobs/page.tsx`, `src/app/jobs/[id]/page.tsx` — job → company logo/slug/name.
- `src/app/api/messages/route.ts` (×3) — contacter/hirer `company_name`/`logo_url` resolution.
- `src/app/components/NavBar.tsx` — `slug, public` by email (nav "View company profile" link).
- `src/app/sitemap.ts` — public company page URLs.
- `src/app/talent/page.tsx`, `src/app/dashboard/TeamSection.tsx`, `src/app/dashboard/page.tsx`,
  `src/app/admin/page.tsx`, `src/lib/team/notify.ts` — various company-name/logo lookups.
- `src/app/hirer/page.tsx` — "pre-Stage-2 hirers (no org) fall back to employer_profiles for compat."

**Write:**
- `src/app/hirer/HirerDashboardClient.tsx` — insert/update `employer_profiles` for **pre-Stage-2
  hirers with no org** (the compat write, `:157`). Stage-2+ hirers write `team_profiles` via
  `api/hirer/org-profile` instead.

### What "deprecate" requires
`employer_profiles` is still the **compat home for pre-Stage-2 hirers** (email-keyed, no org
entity). Since **all real hirers are now Stage-2 org owners** (buyers mint `kind='org'` +
`team_profiles`; 0 real employer_profiles rows), deprecation is:
1. **Stop writing** — remove the `HirerDashboardClient` compat insert/update (all real hirers use
   `team_profiles`).
2. **Migrate every read** to `subject_entity_id → entities/team_profiles` (company display, job→
   company, messaging contacter, NavBar, sitemap, talent, admin, notify).
3. **Purge the 10 test rows**, then the table can be dropped (Dashboard DDL + reversal).
This is the **largest** of the four sub-tasks (22 call sites) and gates on (b)+(c) supplying the
`subject_entity_id` those reads will pivot to.

---

## 5. SEQUENCING RECOMMENDATION

The parked page (a) is **safe to re-merge as-is** (clean, no stale refs), but its hiring lens is
dormant until jobs carry `subject_entity_id`. Recommended order:

1. **5a — Re-merge the parked org page (`32cde80`).** Clean 3-way merge; additive; existing team
   pages render byte-unchanged (service lens). Ships the unified page + the `/company → /team`
   redirect. Hiring lens renders "No open roles" until 5b. **Lowest risk, do first.**
   - Decide up front: should a hiring org's page auto-publish, or stay behind the published gate?
2. **5b — Re-key jobs write + backfill.** Make `/api/jobs` dual-write `subject_entity_id` (resolve
   poster's org entity; `post-as-team` already does). Backfill existing jobs (all test → or purge).
   This lights up the parked page's "Open roles." Then migrate job read paths (`jobs/page`,
   `jobs/[id]/page`) company resolution to `subject_entity_id`.
3. **5c — Confirm/settle messaging on `subject_entity_id`.** Write `subject_entity_id` on new
   employer_dm conversations; repoint contacter-name resolution off `employer_profiles`. The
   column + team-inbox read path already exist. All 159 rows test.
4. **5d — Deprecate `employer_profiles`.** With (b)+(c) supplying `subject_entity_id`, migrate the
   remaining ~22 reads to `entities/team_profiles`, remove the `HirerDashboardClient` compat write,
   purge the 10 test rows, drop the table (Dashboard DDL + reversal). **Last** — it depends on
   every consumer having an entity-keyed replacement.

**Can the parked page be re-merged as-is?** — **Yes.** It compiles/merges against current main
and references nothing removed. It is *functionally partial* (hiring lens empty) until 5b, but
that's a graceful empty state, not a regression. No rework required before merge; the only pre-
merge decision is the published-gate/auto-publish question for hiring orgs.

### Risk flags
- **Test-data cleanup is entangled:** re-keying (b)/(c) against the 25 jobs / 159 convs / 10
  employer_profiles is throwaway since all are test — cleanest to **purge test jobs/convs/
  employer_profiles** before/around 5b–5d rather than backfill junk. (Same entity-first, scoped
  method used for the batch5 sweep.)
- **`employer_profiles` reads are load-bearing for display** (job cards, message threads, nav) —
  migrating them is the real work; miss one and a company name/logo silently drops to null.
- **Published gate** on the unified page hides fresh buyer orgs — product call needed.
- **`job_application` conversation_type** is defined but unused; don't remove the value (parity
  with the `project_inquiry`-value lesson from D2b-1 — shared `conversation_type` column stays).

## Method
`git log/diff/merge-base` on `hold/stage4-org-page` vs main (`74cd4f6`); full read of the parked
diff (both files); live schema + population + real/test counts for `jobs` (25), `conversations`
(159), `employer_profiles` (10) via service role; grep of `employer_profiles` (22 refs) and jobs
creation paths (`/api/jobs`, `/api/jobs/post-as-team`); confirmed `buildHirerOrgJsonLd` exists.
Read-only — no source or data mutated.
