# ShipStacked — Tier 0: Seed Job Teardown + Fabricated Badge Removal

**For:** Claude Code, executing in `shipstacked` repo
**Context:** Post-V2-spine cleanup, before the V1/V2 merge (Tier 1). Two truthfulness/cleanliness fixes on the live production site.
**Status:** Ready to execute. Discovery-first — enumerate before mutate. Read-only until Thomas approves the discovery report.

---

## 0. Why this exists

Two problems on the live production site, both flagged by the 2026-05-16 site audit:

1. **Seed jobs.** ~20-30 jobs were posted via the ShipStacked employer profile as a test of how real jobs behave on the live site (listing, application flow, builder interaction). They are test data. Their `/jobs/[id]` URLs are public and referenced from external tweets. They surface in multiple places across the site (jobs board, builder dashboards, possibly homepage/talent cross-refs). They need to be cleanly and completely removed from all user-facing surfaces, with their URLs 301-redirected to `/jobs`, WITHOUT destroying the real application records of users who applied to them.

2. **Fabricated hires badge.** The homepage renders a "hires made" count as `hireCount >= 10 ? hireCount : 10` over a `hire_confirmations` table with 0 rows and a `profiles.hire_count` sum of 0. The number displayed (10+) is fabricated. It must be removed or replaced with a true value.

This is Tier 0: small, safe, makes the live site truthful and clean. It is a prerequisite for any user outreach and for the Tier 1 merge.

---

## 1. Hard constraints (non-negotiable)

- **Discovery before mutation.** Phase 1 is pure read-only enumeration. Terminal Claude produces a discovery report and STOPS. Thomas reviews it. Only then does Phase 2 (mutation) run. Do not mutate anything in Phase 1.
- **Soft-delete only.** Seed jobs are flagged inactive/hidden, NOT hard-deleted. All rows stay in the database. The interaction data (who applied, when, how) is test signal worth keeping. Fully reversible.
- **Preserve all application records.** Applications submitted to seed jobs by real users are NOT deleted, NOT anonymized, NOT modified. The applicant data is signal about who engaged. Only the *jobs* become inaccessible; the *applications* persist intact.
- **301, never 404.** Every seed-job URL that is publicly reachable (and referenced from external tweets) must 301-redirect to `/jobs`. Zero 404s introduced by this work.
- **Zero impact to non-seed jobs.** Real jobs (if any exist that are NOT seed/test) are untouched. The teardown is scoped strictly to jobs posted via the ShipStacked employer profile identified in Phase 1.
- **Zero impact to current users' visible experience** except the intended removal of seed jobs and the badge.
- Standard commit gate: `npx tsc --noEmit` clean, `npm run build` clean.

---

## 2. PHASE 1 — Discovery (read-only, STOP at end, await Thomas review)

Terminal Claude must produce `docs/audit/SEED_JOB_TEARDOWN_DISCOVERY.md` answering all of the following with file:line citations and exact data. Do not change any code or data in this phase.

### 2.1 Identify the ShipStacked employer profile

The seed jobs were posted via an internal "ShipStacked" employer profile/account. Find it:

- Inspect the `employer_profiles` table (or whatever the audit identified as the employer table). Look for a row whose name/company/email indicates it is the internal ShipStacked account (e.g. company name containing "ShipStacked", an internal/admin email, an obvious test pattern).
- Inspect the `jobs` table. Determine the linking column (the audit noted `jobs.employer_email` links by string, not FK). Identify the employer email/identifier that the seed jobs were posted under.
- Report: the exact employer identifier (email or row), how many jobs are attributed to it, and the full list of those job IDs + titles + created_at + current status column value.

If there is ambiguity (e.g. some jobs under that employer look real, not seed), DO NOT GUESS. List the ambiguous ones separately and flag for Thomas to disambiguate. Better to ask than to 301 a real job.

### 2.2 Enumerate every surface that reads the jobs table

This is the core of the discovery. Trace every code path that reads `jobs` (or renders job data) and report each as a surface that will need handling. At minimum check, but do not limit to:

- `/jobs` board listing page — file, query, how it filters
- `/jobs/[id]` (or equivalent) individual job detail page — file, query, the URL pattern that is public/tweeted
- Builder dashboard(s) — any "recommended jobs", "jobs for you", "your applications" sections — file, query
- `/talent` page — any job cross-references
- Homepage (`src/app/page.tsx`) — any job counts, featured jobs, "X open roles" copy
- `/api/*` routes that return job data (job search, job list, application endpoints)
- Any email/digest/notification code that references jobs (search for job references in Resend/email-sending code)
- Leaderboard / Build Feed — confirm whether either references job activity (audit said leaderboard reads `profiles.velocity_score`, feed reads `posts` — confirm jobs don't leak in)
- Sitemap generation (if any) — does it enumerate `/jobs/[id]` URLs?
- `/llms.txt` route — does it enumerate jobs? (V2 work made this dynamic — confirm whether jobs are listed)
- Any structured data / JSON-LD that emits JobPosting markup
- Builder API (`/api/v1/*` or `/api-docs`) — does any public API endpoint return these jobs?

For each surface: file:line, the exact query/filter, and a one-line statement of what will happen to that surface when seed jobs are soft-deleted (does it filter on a status column already? will it break? will it just stop showing them?).

### 2.3 Determine the soft-delete mechanism that already exists

The audit and Thomas both indicate job-removal mechanisms are already in place. Find them:

- Does the `jobs` table have a `status`, `active`, `published`, `archived`, `deleted_at`, or similar column? Report the exact column, its type, its current distinct values across all rows.
- How does the `/jobs` listing currently decide which jobs to show? (e.g. `WHERE status = 'active'`). This is the lever — setting seed jobs to the non-visible value should remove them from listings automatically IF every surface respects the same filter.
- CRITICAL: check whether EVERY surface from 2.2 respects that same filter. A surface that queries jobs without the status filter will still show seed jobs after soft-delete. List any surface that does NOT currently filter on the status column — these are the ones that need a code change, not just a data change.

### 2.4 Map applications to seed jobs

- Identify the `applications` table linking column to jobs.
- Count applications attached to the seed job IDs from 2.1.
- For those applications: list applicant identifiers (profile_id / username), so Thomas can see WHO applied to seed jobs (this is signal — some applicants may be killers).
- Confirm the exact mechanism by which applications will be PRESERVED when jobs are soft-deleted (i.e. soft-delete sets a flag on `jobs`, does not cascade to `applications`; verify there is no `ON DELETE CASCADE` that would fire — though since we're soft-deleting not hard-deleting, cascade shouldn't trigger; confirm anyway).

### 2.5 Map the public URL → 301 requirement

- Determine the exact public URL pattern for an individual seed job (e.g. `/jobs/<id>` or `/jobs/<slug>`).
- Confirm what currently happens when you request a seed job URL (200 with job detail).
- Confirm what SHOULD happen after teardown: 301 → `/jobs`.
- Identify where the redirect should be implemented: middleware, the `[id]` page server component (detect soft-deleted → `redirect()`), or `next.config` redirects. Recommend the cleanest approach given the existing middleware already does content negotiation (V2 work). Flag if adding job redirects to middleware risks interfering with the V2 content-negotiation logic.
- Note: the redirect must be a 301 (permanent), not 302/307, because these URLs are permanently dead and we want search engines + social cards to update.

### 2.6 The fabricated hires badge

- Locate the exact homepage code rendering the hires count. The audit cited `hireCount >= 10 ? hireCount : 10`. Find file:line.
- Report the exact expression, what `hireCount` resolves from (which table/query), and confirm the underlying real value is 0 (cross-check `hire_confirmations` row count and `profiles.hire_count` sum).
- Identify every other place on the live site that displays a hires/placements number or any other potentially-fabricated metric (search homepage, /talent, marketing copy, OG card generators, meta descriptions for hardcoded traction numbers like "10+ hires", "X builders", "Y placements"). Report all of them. Thomas wants no fabricated numbers anywhere on the live surface, not just this one.

### 2.7 Discovery report output

Produce `docs/audit/SEED_JOB_TEARDOWN_DISCOVERY.md` with:

- Section A: the ShipStacked employer identifier + full seed job list (IDs, titles, created_at, status) + any ambiguous jobs flagged for Thomas
- Section B: every surface jobs touch (the 2.2 enumeration) with per-surface impact statement
- Section C: the existing soft-delete mechanism + list of any surfaces that do NOT respect the status filter (these need code changes)
- Section D: applications-to-seed-jobs map (counts + applicant list)
- Section E: the 301 implementation recommendation
- Section F: the badge location + every other fabricated-number location found
- Section G: a precise proposed Phase 2 change list — exactly what data changes and what code changes, enumerated, so Thomas approves a concrete plan not a vague intent

STOP after producing this report. Do not proceed to Phase 2. Report to Thomas with a one-paragraph summary and await explicit approval of the Section G change list.

---

## 3. PHASE 2 — Execution (only after Thomas approves Section G)

Execute exactly the approved Section G change list. The expected shape (subject to what discovery finds):

### 3.1 Soft-delete the seed jobs

- Set the existing status/active column on the identified seed job rows to the non-visible value (whatever the existing mechanism uses — do NOT invent a new column if one exists).
- If no soft-delete column exists (unexpected — audit and Thomas indicate mechanisms exist), ESCALATE before adding a migration. Do not hard-delete as a fallback.
- Do NOT touch the `applications` rows. Verify post-change that application count is unchanged.

### 3.2 Patch any surface that doesn't respect the status filter

For each surface identified in discovery Section C as NOT filtering on the status column: add the filter so seed jobs stop appearing there. Minimal change — match the existing filter pattern used by `/jobs`. Do not refactor surrounding code.

### 3.3 Implement the 301 redirects

- Implement per the discovery Section E recommendation.
- Requesting any soft-deleted seed job URL returns HTTP 301 with `Location: /jobs`.
- Must NOT interfere with V2 middleware content negotiation (the `.json` / Accept-header routing). If the redirect lives in middleware, it must be ordered/guarded so it only fires for soft-deleted job URLs and bails cleanly otherwise.
- Real (non-seed) job URLs are unaffected — they still 200.

### 3.4 Remove the fabricated hires badge

- Per Thomas's decision: REMOVE the badge entirely (not replace with 0 — a "0 hires" badge is worse than no badge).
- Remove the rendering code and any now-unused `hireCount` query if it's not used elsewhere. If `hireCount` is used elsewhere, leave the query, remove only the badge display.
- Remove/neutralize every other fabricated number found in discovery Section F. For each: if it's a real metric that happens to be low, Thomas decides per-item during discovery review. Default: remove fabricated, keep true.

### 3.5 Verification (terminal Claude, before commit)

- `/jobs` board: seed jobs absent, real jobs (if any) present
- A known seed job URL: returns 301 → `/jobs` (test with `curl -I`)
- A real job URL (if any exist): still 200
- Builder dashboard surfaces: seed jobs absent
- Homepage: hires badge gone, no fabricated numbers
- `applications` table: row count for seed-job applications UNCHANGED from discovery Section D
- `jobs` table: seed job rows still present (soft-deleted, not hard-deleted), just flagged non-visible
- V2 content negotiation still works (`/p/<slug>.json` and `/atlas/roles/<id>.json` still return JSON-LD — confirm the job redirect didn't break middleware)
- `tsc --noEmit` clean, `npm run build` clean

### 3.6 Commit

```
chore: retire seed jobs (soft-delete + 301 → /jobs), remove fabricated hires badge

- Soft-delete ~N seed jobs posted via the internal ShipStacked employer
  profile. Rows preserved (test-interaction signal); flagged non-visible
  via existing status mechanism.
- All seed-job URLs 301 → /jobs (URLs are referenced from external
  tweets; no 404s introduced).
- Application records to seed jobs preserved intact (N applications,
  unchanged).
- Patched <list> surfaces that did not respect the status filter.
- Removed fabricated "10+ hires" homepage badge (hire_confirmations = 0;
  number was a hardcoded floor). Removed <other fabricated numbers if any>.
- No impact to non-seed jobs or current users' experience.

Discovery + approved change list: docs/audit/SEED_JOB_TEARDOWN_DISCOVERY.md
```

Push to origin/main. Confirm Vercel green. Report deploy state + the verification results.

---

## 4. Escalate if

- The seed jobs cannot be cleanly distinguished from real jobs (ambiguous employer attribution) — list ambiguous ones, do not guess
- No soft-delete column exists on `jobs` (would require a migration — escalate, do not hard-delete)
- A surface reads jobs in a way that can't be filtered without a structural change
- The 301 implementation would require modifying V2 middleware in a way that risks the content-negotiation logic
- Discovery finds fabricated numbers whose "true" replacement value isn't obvious (Thomas decides per-item)
- Applications to seed jobs include data that looks like it would be lost by the soft-delete mechanism (it shouldn't, but if discovery shows a cascade risk, escalate)

---

## 5. After Tier 0 ships

The live site is truthful (no fabricated metrics) and clean (no dead seed-job URLs, no test jobs cluttering surfaces). This unblocks:

- **Tier 1:** the seamless V1/V2 merge (proactive backfill, profiles ↔ entities, zero user-facing change)
- **Tier 2:** the killers query (verified profiles ranked by velocity_score) — can run in parallel, read-only
- **Tier 3:** beacons in Doc 05 order, starting with Schema.org Person/Org/JobPosting markup, with the Noah founding-beta gateway as the first consumer of the Person beacon

Tier 0 does not touch identity, entities, or the merge. It is deliberately isolated so it can ship safely first.

---

*End of Tier 0 spec.*
