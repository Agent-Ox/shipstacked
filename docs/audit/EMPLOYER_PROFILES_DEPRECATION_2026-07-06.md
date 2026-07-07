# `employer_profiles` deprecation inventory — every reference for Stage 5d (2026-07-06)

READ-ONLY. Every `employer_profiles` reference in `src`, so 5d migrates all of them — a
missed read silently drops a company name/logo. HEAD after 5c = `9960823`.

## DATA — re-verified: 10 rows, ALL test, 0 real
`total=10 · real=0 · test=10 (all oxleethomas+) · public=3`. The 3 public: `northwind-talent-partners`,
`test-company-3`, `the-ai-company` (all test). **Deprecation is a code migration, not a data
migration** — purge the 10 test rows, drop the table.

## SHAPE OF THE MIGRATION
`employer_profiles` (email-keyed legacy hirer profile) → **`entities` + `team_profiles`** (the
org identity). Three resolution shapes, by call site:
- **(A) already entity-primary, `employer_profiles` is just the FALLBACK** (5b/5c) → 5d removes the fallback.
- **(B) the authed user's OWN org** → resolve by `user.id → entities(owner_user_id, kind org/team) → team_profiles`. Clean.
- **(C) a contacter/other party's org, or a listing** → needs `email→entity` (auth.users → entities) or an entity query. This is the awkward set (same `listUsers` pattern 5c introduced).
- **(D) the WRITE** → remove (all real hirers write `team_profiles`).

---

## FULL INVENTORY TABLE

| # | file:line | R/W | Resolves (keyed on) | Migration target | subject_entity_id here? |
|---|---|---|---|---|---|
| 1 | `sitemap.ts:55` | R | `slug, updated_at` where public (email n/a) | published-org `/team/<slug>` URLs — **already emitted by the Stage-F team sitemap block**; drop this | listing (n/a) |
| 2 | `dashboard/TeamSection.tsx:92` | R | `email, company_name` by convEmails → contacter name | email→org→`team_profiles.team_name` (like 5c team-inbox) | **no — needs email→entity** (conv.subject_entity_id = the team, not the contacter) |
| 3 | `dashboard/page.tsx:37` | R | `select *` where public, limit 6 → "hirers" showcase list | query `entities` kind org/team + published `team_profiles` (hires) | listing (n/a) — entity query |
| 4 | `admin/page.tsx:39` | R | `select *` → admin dashboard hirer list (internal) | show orgs, or leave until table drop (admin-only) | listing (n/a) |
| 5 | `api/messages/route.ts:97` | R | `email, company_name, logo_url` by contacterEmails → team-inbox contacter **FALLBACK** | already entity-primary (5c `orgByEmail`); **remove fallback** | (A) fallback only |
| 6 | `api/messages/route.ts:213` | R | `email, company_name, logo_url, public` → builder-inbox hirer **FALLBACK** | already entity-primary (5c `subject_entity_id→team_profiles`); **remove fallback** | (A) fallback only |
| 7 | `api/messages/route.ts:408` | R | `company_name, public` by `conv.employer_email` → POST-reply notification `employer_profile` | `conv.subject_entity_id → team_profiles(published)`, ep fallback | **YES — `conv.subject_entity_id` available. ⚠️ MISSED BY 5c** |
| 8 | `NavBar.tsx:134` | R | `slug, public` by email → own "View company profile" link (`companySlug`/`companyPublic`) | own org: derive from the already-fetched `teamAdmin` team slug + published `team_profiles`; **point link to `/team/<slug>`** | (B) own — by user.id (already has teamAdmin) |
| 9 | `jobs/page.tsx:39` | R | `email, logo_url, slug` by hirerEmails → list hirer logo **FALLBACK** | already entity-primary (5b `subject_profile`); **remove fallback** | (A) fallback only |
| 10 | `jobs/[id]/page.tsx:88` | R | `slug` by email where public → detail company **FALLBACK** | already entity-primary (5b); **remove fallback** | (A) fallback only |
| 11 | `company/[slug]/page.tsx:15` | R | `employer_profiles` by slug (generateMetadata) → legacy page meta | legacy page — see §Legacy company page | slug-keyed |
| 12 | `company/[slug]/page.tsx:57` | R | `select *` by slug where public → legacy company page body | legacy page — **delete or stub** (org entities redirect to `/team` at :55) | slug-keyed |
| 13 | `talent/page.tsx:221` | R | `id, company_name` by user.email → `hasHirerProfile` (is the member's company set up?) | own org: `user.id → team_profiles.team_name` set? | (B) own — by user.id |
| 14 | `hirer/page.tsx:106` | R | `select *` by user.email → `/hirer` compat profile for pre-Stage-2 hirers (no org) | dead for real users (all orgs use the `op`/team_profiles branch above at :90-103) | (B) own — but legacy branch |
| 15 | `hirer/HirerDashboardClient.tsx:171` | **W** | `update` by email (compat) | **REMOVE** — all real hirers write `team_profiles` via `api/hirer/org-profile` | 🚩 write |
| 16 | `hirer/HirerDashboardClient.tsx:173` | **W** | `insert` (compat) | **REMOVE** — same | 🚩 write |
| 17 | `lib/team/notify.ts:36` | R | `company_name` by senderEmail → team-notify email contacter name | email→org→`team_profiles.team_name`, ep fallback | **no — needs email→entity** (or pass from caller) |

_(`talent/page.tsx` has one ref, #13. `company/[slug]` also reads `jobs` by `company.email` at :70 — legacy, dies with the page.)_

**Comment-only references** (no query — update for honesty when the reads go): `api/messages/route.ts:201-202`,
`api/jobs/route.ts:31`, `api/hirer/org-profile/route.ts:9`, `api/join/buyer/route.ts:18`,
`company/[slug]/page.tsx:43`, `HirerDashboardClient.tsx:77,157`, `hirer/page.tsx:71`, `jobs/[id]/page.tsx:72-73`.

---

## GROUPED BY MIGRATION SHAPE

### (A) Already entity-primary — `employer_profiles` is only the FALLBACK → 5d removes it (4 sites)
`api/messages:97`, `api/messages:213`, `jobs/page:39`, `jobs/[id]:88`. These were migrated in
5b/5c; the `employer_profiles` read is the transitional fallback. **Lowest-risk** — deleting the
fallback once every job/conv is entity-keyed. (With 0 live jobs/convs, they're already dry.)

### (B) The authed user's OWN org → resolve by `user.id` (clean, 4 sites)
`NavBar:134`, `talent:221`, `hirer/page:106`, `HirerDashboardClient` (write, see D). Resolve the
signed-in user's org via `entities(owner_user_id=user.id, kind org/team) → team_profiles`. NavBar
already fetches the `teamAdmin` team slug — reuse it (a buyer org IS the user's team_admin team).

### (C) A contacter/other party's org, or a listing → needs `email→entity` or an entity query (4 sites)
- `dashboard/TeamSection:92` + `lib/team/notify:36` — contacter name; same `email→entity` need as
  the 5c team-inbox (auth.users `listUsers` → entities → team_profiles). **Reuse/extract the 5c
  `orgByEmail` helper** rather than re-implement per site.
- `dashboard/page:37` — public-hirers listing → replace with an `entities`+`team_profiles` query
  (published orgs that hire). No email needed.
- `admin:39` — internal admin list; lowest priority, can wait for the drop.

### (D) 🚩 The WRITE — MUST BE REMOVED
`HirerDashboardClient.tsx:157-175` — the compat path writes `employer_profiles` (update `:171` /
insert `:173`) **only for pre-Stage-2 hirers with no org**. Post-D2b-1 every hirer is an org owner
(buyers mint `kind='org'`; the Stage-2 branch above at `:145-155` writes `team_profiles` via
`api/hirer/org-profile`). **There are zero real pre-Stage-2 hirers** (all 10 employer_profiles are
test). Remove the entire `else` compat branch — the org branch is the only path real users take.

---

## 🚩 FLAGS

1. **`api/messages:408` was MISSED by 5c.** The POST-reply notification still resolves the hirer's
   `employer_profile` by email only (`company_name, public`). It **has `conv.subject_entity_id`
   available** — 5d (or a 5c patch) should pivot it to `team_profiles(published)` with ep fallback,
   matching the GET-side resolution. Not user-visible-breaking (it feeds a notification), but it's
   the one live read still email-only where an entity is in hand.

2. **The WRITE (`HirerDashboardClient:171,173`) must be removed** — see (D). Leaving it means the
   `/hirer` "save company profile" for a (hypothetical) org-less hirer keeps writing the doomed
   table. No real user hits it, but it's the one thing that re-populates `employer_profiles`.

3. **Sites needing `email→entity` are the real work** (C): `TeamSection:92`, `notify:36`,
   `dashboard/page:37`. The contacter ones (`TeamSection`, `notify`) need the `listUsers`-based
   `orgByEmail` resolution (flagged in 5c for eventual denormalization). If 5c's team-inbox helper
   isn't extracted/shared, these three will each re-derive it — **extract a shared
   `resolveOrgByEmail(admin, emails)` helper** to avoid three copies.

4. **Migration completeness gate:** after 5d, `grep -rn "employer_profiles" src` must return **only
   removed/updated comments** — any surviving `.from('employer_profiles')` is a dropped name/logo.

---

## THE LEGACY `/company/[slug]` PAGE

Post-5a, `company/[slug]/page.tsx:45-55` **redirects any org/team-entity slug to `/team/<slug>`**.
Only a **pre-Stage-2 `employer_profiles` row with no matching entity** falls through to the legacy
body (`:57`, `select * where slug, public=true` → else `notFound()`). **All 10 employer_profiles
are test**, and every real hirer is an org (→ redirected). So the legacy body has **zero real
traffic**.

**Recommendation:** after purging the 10 test rows, **delete `company/[slug]/page.tsx` entirely**
(the route 404s for unknown slugs anyway) — OR keep it as a thin stub that only does the
`/company/<slug> → /team/<slug>` redirect (a nice permanent alias so old `/company/*` links still
resolve). **Prefer the redirect-stub**: it preserves any external `/company/<slug>` links (they
resolve to the unified `/team/<slug>` page) at ~10 lines, vs a hard 404. Either way, **drop the
`employer_profiles` read** and the `sitemap.ts:55` company block (Stage-F already sitemaps
`/team/<slug>` for published orgs).

---

## SUGGESTED 5d ORDER
1. **Remove the WRITE** (`HirerDashboardClient` compat `else` branch) — stops re-population.
2. **Extract `resolveOrgByEmail`** (from 5c's team-inbox `orgByEmail`) into a shared lib; repoint
   `TeamSection:92` + `notify:36` to it (entity-first, ep fallback).
3. **Migrate the own-org reads (B)** — `NavBar:134` (→ team slug + `/team` link), `talent:221`,
   `hirer/page:106` (fold the legacy branch into the org branch).
4. **Migrate the listing** `dashboard/page:37` → entity/team_profiles query.
5. **`api/messages:408`** → `subject_entity_id → team_profiles`.
6. **Remove the (A) fallbacks** — `api/messages:97,213`, `jobs/page:39`, `jobs/[id]:88`.
7. **Legacy `/company/[slug]`** → redirect-stub (or delete); drop `sitemap.ts:55` company block.
8. **Purge the 10 test rows**, then **DROP `employer_profiles`** (Dashboard DDL + reversal).
9. **Verify:** `grep -rn "\.from('employer_profiles')" src` returns 0.

## Method
`grep -rniE "employer_profiles|employerProfile|EmployerProfile"` over `src` (28 hits: 18
DB-touching + comments); per-site read of each call context; live re-verify of the table
(10 rows, all test) via service role. Read-only — no source or data mutated.
