# Tier 3 — Beacon 1: Schema.org Markup — DISCOVERY (Phase 1)

**Author:** Claude (Opus 4.7, 1M context) — read-only discovery
**Date:** 2026-05-16
**Spec:** `docs/v2/TIER_3_BEACON_1_SCHEMA_ORG_SPEC.md` §3
**Status:** Phase 1 complete. STOP. Awaiting Thomas's explicit Section H approval before any Phase 2 mutation.
**Governing constraint reminder:** additive-only by construction (JSON-LD is invisible to humans). The Tier-0/Tier-1 truthfulness rules apply at the structured-data layer — no fabricated fields, no fake-author leakage.
**Method:** read-only. Temp DB script run + deleted. No repo files modified except this report.

---

## ⚠️ One Section 5 escalation surfaced during discovery

### Escalation — `/feed` list query does NOT filter on author `published` status

`src/app/feed/page.tsx:20-23` selects the latest 20 posts with no filter on the author's `profiles.published` flag. The 3 fakes (`jennypeterson224` × 3 posts, `johnchambers73` × 1 post, `oxleethomasagentox598` × 3 posts) all have authored posts that are still in the `posts` table — Tier 1 neutralized their *profiles*, not their posts.

**Current state (verified live DB):** the last 20 posts contain 0 fake-authored entries by recency luck — the most recent fake-authored post predates the most recent 20. **But this isn't a stable filter** — if posting volume drops or older posts get surfaced, fake-authored posts will appear on `/feed`.

**Impact on Beacon 1:** an ItemList wrapping `/feed` Article items would emit author Person references to neutralized profiles whenever a fake-authored post happens to be in the recent 20. Same class of finding as Tier 0's "surface that doesn't respect the status filter" — flagged per Spec §5.

**Two principled responses, your call:**
1. **Fix the underlying query** as part of Beacon 1: change `/feed/page.tsx:20` to inner-join on `profiles!inner(...)` with `eq('profiles.published', true)`. This filters fake-authored posts out of the visible feed AND out of any ItemList markup. Same precedent as Tier 0's `.eq('status','active')` hardening of `/api/apply`. Low-risk, additive (fakes were never supposed to surface). **Recommended.**
2. **Defer the ItemList wrapper for `/feed`** and add it after a separate query-filter fix ships. Beacon 1 still ships everything else.

Beacon 1's other ItemList recommendations (`/leaderboard`, `/talent`, `/employers`) are clean — their underlying queries already filter `published=true`, the fakes are excluded at the source.

Same class of finding also exists for `/feed/[id]` direct hits — a direct URL to a fake-authored build post still 200s (the page doesn't check `profiles.published`). The existing inline Article JSON-LD at `src/app/feed/[id]/page.tsx:87-112` would emit a Person author reference for a neutralized profile. Same fix recommendation: filter on author published in the page's data fetch.

**Default recommendation:** option (1) — fix both `/feed` (list) and `/feed/[id]` (detail) queries as part of Beacon 1's H-list. Tiny diff (`profiles!inner` + `.eq('profiles.published', true)`), zero risk, eliminates a real surface leak. If you'd rather keep Beacon 1 purely additive (no V1-code touch), choose (2) and we file the filter fix as a Tier 4 item.

---

## SECTION A — Public-page inventory + recommended schema type

Every page under `src/app/` that renders for a public URL. **Already has JSON-LD** column shows what the codebase emits today (pre-Beacon-1).

### Pages WITH meaningful structured-data representation

| Path | File | Already has JSON-LD? | Recommended schema type | Status (B1 work) |
|---|---|---|---|---|
| `/` (homepage) | `src/app/page.tsx` | No per-page (inherits site-level Organization from layout) | **`WebSite`** (top-level) — no SearchAction (see §E) | ADD WebSite emitter |
| layout (every page) | `src/app/layout.tsx:55-86` | **YES** — inline `Organization` | `Organization` (already there) | RECONCILE to `shipstacked:` namespace |
| `/u/[username]` (builder profile) | `src/app/u/[username]/page.tsx:100-113` | **YES** — inline `Person` | `Person` + `shipstacked:` extensions + `@id` link to entity | UPGRADE (load-bearing for Noah) |
| `/atlas` (long-form atlas) | `src/app/atlas/page.tsx:38-63` | **YES** — `Article` (`buildJsonLd`) | `Article` (keep) + optionally wrap as `DefinedTermSet` referencing per-role DefinedTerms | RECONCILE namespace |
| `/atlas/roles/[id]` (per role) | `src/app/atlas/roles/[id]/page.tsx` | **YES** — V2 `DefinedTerm` + `shipstacked:AtlasRole` (uses `src/lib/atlas/jsonld.ts`) | already correct | **UNTOUCHED** (V2 work, gold standard) |
| `/p/[slug]` (V2 receipt) | `src/app/p/[slug]/page.tsx` | **YES** — V2 `CreativeWork` + `shipstacked:ProofReceipt` (uses `src/lib/receipts/jsonld.ts`) | already correct | **UNTOUCHED** (V2 work, gold standard) |
| `/jobs/[id]` (job detail) | `src/app/jobs/[id]/page.tsx:88-129` | **YES** — inline `JobPosting` (already gated: page 308-redirects when `status !== 'active'` per Tier 0 work, so JSON-LD only renders for active jobs) | `JobPosting` (already there) | RECONCILE namespace — dormant today (0 active jobs) |
| `/jobs` (jobs board) | `src/app/jobs/page.tsx` | No | `ItemList of JobPosting` — empty today (0 active jobs); build dormant-ready | ADD ItemList emitter |
| `/company/[slug]` (employer page) | `src/app/company/[slug]/page.tsx:76-88` | **YES** — inline `Organization` (filtered to `public=true`) | `Organization` (already there) | RECONCILE namespace |
| `/employers` (employer list) | `src/app/employers/page.tsx` | No | `ItemList of Organization` (only `public=true` employers; currently 0 after Tier-0 `/company/shipstacked` unpublish) | ADD ItemList emitter (empty today) |
| `/feed/[id]` (single build post) | `src/app/feed/[id]/page.tsx:87-112` | **YES** — inline `Article` with Person author | `Article` (keep) | RECONCILE namespace + **fix author-published filter** (see escalation) |
| `/feed` (build feed list) | `src/app/feed/page.tsx` | No | `ItemList of Article` | **DEFERRED OR FILTER FIX** — see escalation |
| `/leaderboard` (top 10) | `src/app/leaderboard/page.tsx` | No | `ItemList of Person` (top 10 by velocity; query already filters `published=true AND velocity_score > 0` — fakes auto-excluded) | ADD ItemList emitter |
| `/talent` (browse builders) | `src/app/talent/page.tsx` | No | `ItemList of Person` (paywalled — JSON-LD must reflect what unauthenticated visitors see, which is the 6-builder teaser; emitting the full unpaywalled list to crawlers would expose data behind a paywall to agents) | ADD ItemList emitter with **paywall-aware projection** (only the teaser slice that's HTML-visible to anonymous viewers) — see §F |
| `/api-docs` (Builder API docs) | `src/app/api-docs/page.tsx` | No | `TechArticle` (low-priority — docs page) | DEFER (low ROI; not Noah-critical) |
| `/atlas` | (covered above) | | | |

### Pages with NO honest structured representation (emit NOTHING per §5)

These are auth/form/transactional UI pages. They have no canonical structured-data form that's accurate AND useful to a crawler. **Emit nothing — don't invent markup.**

`/login`, `/signup`, `/join`, `/auth/callback`, `/reset-password`, `/set-password`, `/update-password`, `/success`, `/dashboard`, `/dashboard/edit`, `/admin`, `/admin/candidates`, `/admin/candidates/import`, `/employer`, `/employer/messages`, `/messages`, `/client/inbox`, `/privacy`, `/terms`, `/hire-confirm`, `/hire`, `/hire/thanks`, `/claim`, `/claim/thanks`, `/get-found/[id]` (308-redirects for seed jobs anyway per Tier 0), `/post-job`, `/paste`, `/paste/review` (V2 ingest UI).

`/llms.txt` already serves a non-HTML machine-readable format (text/plain index of Atlas roles + recent receipts). Not JSON-LD; out of scope.

### Honest summary of the inventory

There are **6 pages with pre-existing inline JSON-LD** that need reconciliation to the V2 namespace, **2 V2 surfaces already gold-standard** that we don't touch, **5 pages with no JSON-LD that should add it** (`/`, `/jobs` board, `/employers`, `/leaderboard`, `/talent`), and **1 page with a query-filter prerequisite** before its ItemList ships (`/feed` — escalation). The remaining ~25 pages have no honest structured form.

---

## SECTION B — Existing JSON-LD inventory + namespace pattern to match

### Pre-Beacon-1 JSON-LD emitters in the codebase

| File:lines | Page surface | Type | `@context` | `@id`? | shipstacked: ns? |
|---|---|---|---|---|---|
| `src/app/layout.tsx:55-86` | every page (site-wide) | `Organization` | `https://schema.org` | no | no |
| `src/app/u/[username]/page.tsx:100-113` | builder profile | `Person` | `https://schema.org` | no | no |
| `src/app/atlas/page.tsx:38-63` | long-form Atlas | `Article` | `https://schema.org` | no (uses `mainEntityOfPage @id`) | no |
| `src/app/jobs/[id]/page.tsx:88-129` | job detail | `JobPosting` | `https://schema.org` | no | no |
| `src/app/company/[slug]/page.tsx:76-88` | employer page | `Organization` | `https://schema.org` | no | no |
| `src/app/feed/[id]/page.tsx:87-112` | single build post | `Article` | `https://schema.org` | no | no |
| `src/lib/receipts/jsonld.ts` (V2) | `/p/[slug]` | `[CreativeWork, shipstacked:ProofReceipt]` | `[https://schema.org, {shipstacked:…}]` | **YES** (`@id` = canonical URL) | **YES** |
| `src/lib/atlas/jsonld.ts` (V2) | `/atlas/roles/[id]` | `[DefinedTerm, shipstacked:AtlasRole]` | `[https://schema.org, {shipstacked:…}]` | **YES** | **YES** |

### The V2 namespace pattern (the one Beacon 1 matches)

From `src/lib/receipts/jsonld.ts:14-18` and `src/lib/atlas/jsonld.ts:13-17`:

```ts
'@context': [
  'https://schema.org',
  { shipstacked: 'https://shipstacked.com/schema/v0.1#' },
]
'@type': ['<schema.org type>', 'shipstacked:<our type>']
'@id': '<canonical URL of the resource>'
identifier: '<external_id ULID>'   // optional, for V2 entities
```

Property convention: vanilla schema.org fields stay vanilla (`name`, `description`, `url`, `sameAs`, `knowsAbout`, `worksFor`); ShipStacked-specific extensions are prefixed `shipstacked:` (e.g. `shipstacked:eventType`, `shipstacked:atlasRoles`, `shipstacked:verificationLevel`).

**Beacon 1's job:** lift the 6 V1 inline emitters to this dual-context format and add the 5 new emitters in the same shape. One coherent graph, not two dialects.

### Conflicts / duplication risk

- `src/app/layout.tsx` emits site-wide `Organization`. The `/company/[slug]` page also emits `Organization` for the specific employer. **Not a conflict** — multiple JSON-LD `<script>` blocks on one page is canonical (each describes a different resource). Google/Bing/Yandex handle this correctly. Beacon 1 keeps both, ensures their `@id` values are distinct.
- `src/app/atlas/page.tsx` emits an `Article` for the long-form. The page also has per-role anchor links to `/atlas/roles/[id]` (which have their own `DefinedTerm` markup at their canonical URL). Beacon 1 optionally adds a top-level `DefinedTermSet` wrapper at `/atlas` linking to the per-role DefinedTerms — turns the long-form into the controlled-vocabulary entry point. Low-cost addition; recommended.

---

## SECTION C — Person markup (the Noah-gateway prerequisite)

### Data available for Aniket (real killer, verified live DB)

| Field | Value | Maps to |
|---|---|---|
| `profiles.full_name` | "Aniket Aslaliya" | `name` |
| `profiles.role` | "AI Systems Engineer" | `jobTitle` |
| `profiles.bio` | "Building AI agents that replace workflows, not just assist them." | `description` |
| `profiles.about` | (richer narrative) | fallback for `description` |
| `profiles.location` | (empty for Aniket — handle null gracefully) | `address.PostalAddress.addressLocality` when present |
| `profiles.github_url` + `x_url` + `linkedin_url` + `website_url` | 4 URLs (all present) | `sameAs` array (filter nulls) |
| `profiles.primary_profession`, `seniority`, `work_type`, `day_rate`, `timezone`, `languages` | rich V2-era fields | `shipstacked:` extensions |
| `profiles.verified` | `true` | `shipstacked:verified` (honest boolean; emit absent or `false` when not verified) |
| `profiles.velocity_score` | 100 | `shipstacked:velocityScore` (numeric; documented in `shipstacked:` schema) |
| `profiles.entity_id` | `4` | **`@id` → `https://shipstacked.com/u/aniketaslaliya801`** (canonical builder identity, post-Tier-1 entity-linked) |
| `entities.external_id` | `shipstacked:entity:01KRRKECDDYKXMVBV1GBHFY58V` | `identifier` |
| `skills[].name` (48 skills for Aniket across 6 categories) | tag list | `knowsAbout` array |
| `projects[]` (4 for Aniket, each with `project_url` + `outcome`) | structured project list | `subjectOf: CreativeWork[]` array (optional but recommended; lets agents traverse to the work itself) |
| `github_data.commits_90d`, `repos_count`, `top_languages[]` | live GitHub stats | `shipstacked:github` (object) — optional extension |

### Proposed `Person` JSON-LD shape (Beacon 1)

```jsonc
{
  "@context": [
    "https://schema.org",
    { "shipstacked": "https://shipstacked.com/schema/v0.1#" }
  ],
  "@type": ["Person", "shipstacked:Builder"],
  "@id": "https://shipstacked.com/u/aniketaslaliya801",
  "identifier": "shipstacked:entity:01KRRKECDDYKXMVBV1GBHFY58V",     // only when entity_id is set (the 17 backfilled)
  "name": "Aniket Aslaliya",
  "jobTitle": "AI Systems Engineer",
  "description": "Building AI agents that replace workflows, not just assist them.",
  "url": "https://shipstacked.com/u/aniketaslaliya801",
  "sameAs": ["https://github.com/AniketAslaliya", "https://x.com/aniketaslaliya3", "https://www.linkedin.com/in/aniket-aslaliya/", "https://www.aniketaslaliya.dev/"],
  "knowsAbout": ["Python", "TypeScript", "RAG", /* … skills.name list */],
  "subjectOf": [
    {
      "@type": "CreativeWork",
      "name": "Legal SahAI — GenAI Legal Assistant (RAG System)",
      "url": "https://legalsahai.vercel.app/login",
      "description": "<truncated outcome string>"
    }
    /* one per project */
  ],
  "worksFor": {                                                    // emit only when employer info present; Aniket: omit
    "@type": "Organization",
    "name": "<company_name when known>"
  },
  "address": {                                                     // emit only when location present
    "@type": "PostalAddress",
    "addressLocality": "<profiles.location>"
  },
  "shipstacked:verified": true,                                    // emit as actual boolean; false-suppressed (omit when false to keep markup tidy)
  "shipstacked:velocityScore": 100,                                // numeric, omit when null/0
  "shipstacked:primaryProfession": "Founder",                      // optional, omit when null
  "shipstacked:seniority": "Founder / Independent",                // optional
  "shipstacked:workType": "Open to all",                           // optional
  "shipstacked:dayRate": "$200-500/day",                           // optional
  "shipstacked:timezone": "UTC+5:30 (IST)",                        // optional
  "shipstacked:languages": ["English", "Hindi"],                   // optional
  "shipstacked:github": {                                          // optional, emit when github_data row exists
    "@type": "shipstacked:GithubProfile",
    "username": "AniketAslaliya",
    "url": "https://github.com/AniketAslaliya",
    "shipstacked:repoCount": 15,
    "shipstacked:commits90d": 207,
    "shipstacked:topLanguages": ["Python", "JavaScript", "TypeScript", "HTML", "Dart"]
  }
}
```

### `@id` decision (Noah-gateway critical)

For the **17 backfilled builders** (where `profile.entity_id` is set), `@id` = their canonical URL (`https://shipstacked.com/u/<username>`). The `identifier` field carries the V2 entity external_id (the `shipstacked:entity:<ulid>`). This means the Person beacon and the V2 entity graph share `@id` — same URL keys both. A receipt's `author['@id']` (currently `https://shipstacked.com/u/<entity.slug>` from `src/lib/receipts/jsonld.ts:111`) resolves to the SAME `@id` as the Person markup at that URL. **One graph, two surfaces, identical identifiers.** This is what makes the Noah gateway buildable.

For **non-backfilled verified profiles** (`andreaschristodoulou643` — real-account-but-not-cohort) and any post-Tier-1 lazily-resolved builder, the `@id` is still `https://shipstacked.com/u/<username>` — the entity link writes itself in on first `/paste` action. The `identifier` field is omitted when `entity_id` is null. Honest about the entity-link state.

### Fake-exclusion confirmation

- All 3 fakes have `published=false` post-Tier-1 (confirmed live).
- `src/app/u/[username]/page.tsx:15+39` filters `eq('published', true)` and `notFound()` if absent.
- **Result: visiting `/u/jennypeterson224`, `/u/johnchambers73`, `/u/oxleethomasagentox598` returns HTTP 404 with no page rendered — therefore no Person `<script type="application/ld+json">` block is emitted.** Verified live in Tier 1 production verification (P3 in the prior report).
- No fake will appear in any ItemList on `/leaderboard`, `/talent`, or any other surface — every such query already filters `published=true` (verified via query mirrors in the DB probe).
- ⚠ **One exception:** `/feed` and `/feed/[id]` do NOT filter on author published. See escalation above.

### Projects as `subjectOf` — recommendation

**Include them** in the Person markup for the cohort. Reasoning: Aniket's 4 projects have full `outcome` + `project_url` — they're the proof the Person markup is about. For Sunny (0 narrated projects but 714 commits 90d on real GitHub), `subjectOf` is empty but `shipstacked:github` carries the proof. The Person markup remains honest in both cases. The `subjectOf` field is the cheapest way to give Noah's gateway crawlable proof-of-work URLs without it having to re-query ShipStacked.

---

## SECTION D — JobPosting recommendation

### Current state

- `jobs WHERE status='active'`: **0** (Tier 0 paused all 24 seed jobs).
- `src/app/jobs/[id]/page.tsx:46` `permanentRedirect('/jobs')` when `status !== 'active'` — guarantees the JSON-LD at lines 88-129 only renders for active jobs.
- Net: **the existing `JobPosting` markup is already dormant-ready.** When a real job is posted with `status='active'`, the redirect doesn't fire, the page renders, and the markup emits automatically.

### Recommendation: **RECONCILE namespace, don't defer.**

The cost to bring the existing `JobPosting` block to the V2 namespace is ~10 lines of diff. It costs nothing today (no active jobs → no JSON-LD on the wire) but light up the moment a real job is posted with `status='active'`. **Build it.** Same recommendation for the `/jobs` board: a tiny `ItemList of JobPosting` wrapper that currently emits an empty list (or omits the script when the array is empty — recommended; an empty ItemList is noisy).

### Optional honest field additions

The existing `JobPosting` block already covers the Google Jobs required fields (`title`, `description`, `datePosted`, `validThrough`, `employmentType`, `hiringOrganization`, `directApply: false`, `url`). Beacon 1 adds:
- `shipstacked:atlasRoles` — array of `/atlas/roles/<id>` refs for the role(s) this job maps to (when the employer or admin classifies). Empty array today; future-ready.
- `shipstacked:dayRate` — already on the job row.
- Match the Tier-1 `@id`/`identifier` pattern so a job becomes part of the same graph.

---

## SECTION E — Organization / WebSite (homepage + layout)

### Reconciliation of the layout-level Organization

`src/app/layout.tsx:55-69` already emits a clean Organization with `name`, `url`, `logo`, `description`, `foundingDate`, `founder` (Thomas Oxlee as Person), `sameAs` (X + LinkedIn). Beacon 1:
- ADD `@id: "https://shipstacked.com/#org"` (anchor `@id` for cross-references; lets receipts/jobs/builders reference the company by `@id`).
- ADD dual-context (`shipstacked:` namespace) and `shipstacked:Organization` type (allows future ShipStacked-specific extensions without breaking schema.org consumers).
- KEEP everything else as-is. The description copy is accurate (post-Tier-0 wording — no fabricated hires metric reintroduced in structured form, confirmed by reading the current copy).

### NEW: WebSite on the homepage

```jsonc
{
  "@context": [
    "https://schema.org",
    { "shipstacked": "https://shipstacked.com/schema/v0.1#" }
  ],
  "@type": "WebSite",
  "@id": "https://shipstacked.com/#website",
  "url": "https://shipstacked.com",
  "name": "ShipStacked",
  "publisher": { "@id": "https://shipstacked.com/#org" }     // cross-ref to layout-level Organization
}
```

### `SearchAction` — should it be on WebSite?

Spec §3.5 asks. **Recommendation: NO** for Beacon 1. Reasoning:
- `/talent` accepts filter params (`?profession=`, `?availability=`, `?verified=`, `?sort=`) but **NOT a free-text `?q=` search**.
- A schema.org `SearchAction` with a `{search_term_string}` urlTemplate would falsely claim a search API the site doesn't expose. That's a structured-data lie — the exact thing the Tier 0 "no fabricated metrics" rule was about. Avoid.
- If `/talent?q=` (or a dedicated `/search` route) ships later, add SearchAction then.

---

## SECTION F — Collection-page ItemList recommendations

Per page, paired with **honest fake-exclusion confirmation** (verified against live DB queries in the discovery script).

### `/leaderboard` → ADD `ItemList of Person` (top 10 by velocity)

- Query (live `src/app/leaderboard/page.tsx:38-44`): `.eq('published', true).gt('velocity_score', 0).order('velocity_score').limit(10)`
- Fake-exclusion: ✓ automatic (`published=true` filter; 3 fakes are `published=false`)
- Verified against live DB: top 10 today contains Sunny / Ryan / Aniket / Joe / Sumit / Emeka / Khairul / Murtaza / Yuki / Sayan. **No fake present.**
- ItemList items: each a Person with `@id` = `https://shipstacked.com/u/<username>` (cross-references the full Person markup on the profile page).
- Honest field: include `position` (1–10 rank) as `ListItem.position`.

### `/talent` → ADD `ItemList of Person` (paywalled — teaser slice only)

- Query (`src/app/talent/page.tsx:48-66`): `.eq('published', true)` with optional filter params; sort verified-first then velocity. Result sliced to **6 for unpaid viewers, full list for paid employers**.
- **Paywall-aware projection:** the JSON-LD ItemList on `/talent` must mirror what unauthenticated viewers see (the 6-builder teaser), NOT the full unpaywalled list. Emitting the full list to crawlers would expose data behind a paywall to agents — a real consent + monetisation issue.
- Recommendation: emit `ItemList` with **6 items max** (the teaser slice). If a paid employer visits, the page still emits the 6 teaser items in JSON-LD (the additional builders they see in HTML are not part of the structured-data projection). Consistent contract for crawlers.
- Fake-exclusion: ✓ automatic.

### `/employers` → ADD `ItemList of Organization`

- Query (`src/app/employers/page.tsx:34`): `.eq('published', true)` on profiles + employer profiles surfaced by `public=true`.
- Current state: ShipStacked's own employer profile was unpublished in Tier 0 (`public=false`). **Currently 0 public employer profiles in DB.** ItemList emits an empty list (recommend: emit the `<script>` only when the array is non-empty — no noise).

### `/jobs` (board) → ADD `ItemList of JobPosting`

- Query (`src/app/jobs/page.tsx:28-33`): `.eq('status', 'active').gt('expires_at', now())`
- Currently 0 active jobs (Tier 0). ItemList empty → omit emitter when empty.
- Future: lights up automatically when real jobs land.

### `/feed` (Build Feed list) → **DEFERRED OR REQUIRES QUERY FIX** (see escalation)

`src/app/feed/page.tsx:20` does NOT filter on `profiles.published`. Recommendation: option (1) — fix the query AND add the ItemList in Beacon 1. Option (2) — defer the ItemList and let Beacon 1 ship everything else.

### `/atlas` (long-form) → OPTIONALLY ADD `DefinedTermSet` (alongside existing Article)

Wraps the per-role DefinedTerms emitted at `/atlas/roles/[id]` into a single set. Low-cost (~20 lines), high-value for Atlas-as-controlled-vocabulary use cases. Already in the V2 pattern at `inDefinedTermSet: '${CANONICAL_HOST}/atlas?v=${row.atlas_version}'` (per `src/lib/atlas/jsonld.ts:53`) — the per-role markup already references the set; we just emit it.

---

## SECTION G — Implementation module plan

### Proposed structure

`src/lib/jsonld/` — new directory mirroring the existing `src/lib/receipts/jsonld.ts` and `src/lib/atlas/jsonld.ts` patterns. One builder per type:

```
src/lib/jsonld/
├── context.ts       — shared @context constant + namespace IRI (single source of truth)
├── organization.ts  — buildOrganizationJsonLd() — reconciles + extends current layout-level Org
├── website.ts       — buildWebsiteJsonLd() — homepage
├── person.ts        — buildPersonJsonLd(profile, entity?, skills, projects, githubData)
├── job-posting.ts   — buildJobPostingJsonLd(job) — reconciles current inline + extends
├── employer-org.ts  — buildEmployerOrgJsonLd(employer) — for /company/[slug]
├── article.ts       — buildArticleJsonLd(post, author) — for /feed/[id]
├── item-list.ts     — buildItemListJsonLd(items, urlBase) — generic ItemList wrapper for collection pages
└── README.md        — quick-ref for which page calls which builder + namespace + reconciliation notes
```

Plus a small render helper component (or just direct `<script>` injection per page, matching the existing inline pattern). The V2 pattern uses direct `<script>` injection (e.g. `src/app/atlas/roles/[id]/page.tsx`); Beacon 1 stays consistent.

### Wire-up per page (additive only)

| Page | Builder calls | Notes |
|---|---|---|
| `src/app/layout.tsx` | `buildOrganizationJsonLd()` (REPLACE existing inline) | dual-context, `@id: "/#org"` |
| `src/app/page.tsx` | `buildWebsiteJsonLd()` (NEW) | homepage adds WebSite alongside layout's Organization |
| `src/app/u/[username]/page.tsx` | `buildPersonJsonLd()` (REPLACE existing inline; add entity-link arg) | the Noah-critical one |
| `src/app/jobs/[id]/page.tsx` | `buildJobPostingJsonLd()` (REPLACE existing inline) | dormant today; reconciliation only |
| `src/app/jobs/page.tsx` | `buildItemListJsonLd(activeJobs)` (NEW; omit when empty) | currently empty list |
| `src/app/company/[slug]/page.tsx` | `buildEmployerOrgJsonLd()` (REPLACE existing inline) | namespace reconciliation |
| `src/app/employers/page.tsx` | `buildItemListJsonLd(publicEmployers)` (NEW; omit when empty) | currently empty list |
| `src/app/feed/[id]/page.tsx` | `buildArticleJsonLd()` (REPLACE existing inline + author-published guard) | namespace + escalation fix |
| `src/app/feed/page.tsx` | `buildItemListJsonLd(...)` (NEW, if query fix shipped) | gated on escalation decision |
| `src/app/leaderboard/page.tsx` | `buildItemListJsonLd(top10)` (NEW) | clean — query already filters |
| `src/app/talent/page.tsx` | `buildItemListJsonLd(teaserSlice)` (NEW; max 6 items — paywall-aware) | always emits the 6-builder teaser projection |
| `src/app/atlas/page.tsx` | `buildArticleJsonLd()` reconciled + optional `DefinedTermSet` block | namespace reconciliation |
| `src/app/atlas/roles/[id]/page.tsx` | **UNTOUCHED** — already gold-standard | |
| `src/app/p/[slug]/page.tsx` | **UNTOUCHED** — already gold-standard | |

### SSR + crawler-readability invariant

All emissions go in the server-rendered `<script type="application/ld+json">` in the page body (same pattern the V2 spine already uses). Crawlers see the JSON-LD without executing JS. Verification check: `curl -s <url> | grep -c 'application/ld+json'` must return ≥1 on every JSON-LD-emitting page — same shape as the Tier 1 verification.

### One coherent graph — `@id` cross-references

- Site-wide `Organization` at `@id: "https://shipstacked.com/#org"`.
- Site-wide `WebSite` at `@id: "https://shipstacked.com/#website"` referencing the Organization.
- Each `Person` at `@id: "https://shipstacked.com/u/<username>"` — same `@id` the V2 receipt's `author['@id']` already uses (`src/lib/receipts/jsonld.ts:111-112`). **One graph keyed by URL.**
- Each `Organization` (employer) at `@id: "https://shipstacked.com/company/<slug>"`.
- Each `JobPosting` at `@id: "https://shipstacked.com/jobs/<id>"` referencing the employer's `@id`.
- Each Atlas role at its V2 canonical (already done — `https://shipstacked.com/atlas/roles/<id>?v=<atlas_version>`).
- Each receipt at its V2 canonical (already done — `https://shipstacked.com/p/<slug>`).
- ItemList items reference their target `@id` (don't re-emit the full record — point at the canonical).

---

## SECTION H — Proposed Phase 2 change list (FOR THOMAS APPROVAL)

Numbered, each individually approvable, each individually reversible (Beacon 1 is code-only — no production data mutation, so `git revert <commit>` fully reverses everything).

### H1 — Create the `src/lib/jsonld/` module

New files only. ~600 lines total across 9 files. Each builder is a pure function (no side effects, no DB calls inside the builder itself — DB queries stay on the page, builder takes inputs and returns the JSON-LD object).

### H2 — Reconcile site-wide Organization

`src/app/layout.tsx:55-86` — replace the inline `orgLd` object with `buildOrganizationJsonLd()` call. Dual-context, `@id: "/#org"`, otherwise identical fields. No human-visible change.

### H3 — Add WebSite to homepage

`src/app/page.tsx` — add a `<script type="application/ld+json">` rendering `buildWebsiteJsonLd()`. Single new line at the top of the JSX. No SearchAction (per §E honesty).

### H4 — Upgrade Person markup on `/u/[username]`

`src/app/u/[username]/page.tsx:100-113` — replace the inline `jsonLd` with `buildPersonJsonLd(profile, entity, skills, projects, githubData)`. Adds:
- dual-context + `shipstacked:Builder` type
- `@id` = `https://shipstacked.com/u/<username>`
- `identifier` = entity external_id when `profile.entity_id` is set (17 backfilled)
- `shipstacked:` extensions (verified, velocityScore, primaryProfession, seniority, workType, dayRate, timezone, languages, github)
- `subjectOf: CreativeWork[]` from projects (filtered to those with `outcome` AND `project_url`)
- `address.PostalAddress.addressLocality` when location present
- everything emitted ONLY when the underlying field is non-null/non-empty (honest field hygiene)

### H5 — Reconcile JobPosting on `/jobs/[id]`

`src/app/jobs/[id]/page.tsx:88-129` — replace inline with `buildJobPostingJsonLd(job, employerProfile)`. Dormant today (no active jobs). Namespace reconciliation only.

### H6 — Add ItemList wrappers (empty-suppressed)

- `src/app/jobs/page.tsx` — emit `ItemList of JobPosting` when array non-empty (currently always empty → no emission).
- `src/app/employers/page.tsx` — emit `ItemList of Organization` when public employer count > 0 (currently 0 → no emission).
- `src/app/leaderboard/page.tsx` — emit `ItemList of Person` (top 10, always non-empty given current data).
- `src/app/talent/page.tsx` — emit `ItemList of Person` with **6-item teaser projection** (paywall-aware).

### H7 — Reconcile employer page

`src/app/company/[slug]/page.tsx:76-88` — replace inline with `buildEmployerOrgJsonLd(company, jobs?)`. Adds `@id` cross-ref to layout `@id`. Page itself already 404s for unpublished employers (Tier 0 unpublished `/company/shipstacked`).

### H8 — Reconcile feed-detail Article

`src/app/feed/[id]/page.tsx:87-112` — replace inline with `buildArticleJsonLd(post, author)`. Dual-context + author `@id` cross-ref to Person markup at `/u/<author.username>`.

### H9 — ESCALATION DECISION — feed list + feed detail author-published filter

Two sub-options, your call:
- **H9a (recommended):** add `profiles!inner(...)` join with `.eq('profiles.published', true)` to BOTH `src/app/feed/page.tsx:20-23` AND `src/app/feed/[id]/page.tsx` data fetch. Then emit `buildItemListJsonLd(feedPosts.map(...))` on `/feed`. Same Tier-0/1-class status-filter fix.
- **H9b (defer):** skip the ItemList on `/feed`, skip the author-published filter in code. Beacon 1 ships everything else. File the filter fix as Tier 4.

H9a is a 4-line code change with the same precedent and risk profile as Tier 0's `/api/apply` hardening.

### H10 — Atlas long-form reconciliation + optional DefinedTermSet

`src/app/atlas/page.tsx:38-63` — replace `buildJsonLd()` call with `buildArticleJsonLd()` from the new module. **Optionally** emit a second `<script>` block with a `DefinedTermSet` linking to all per-role DefinedTerms (small extra emit; high value for Atlas-as-controlled-vocabulary). Default: include the DefinedTermSet.

### H11 — Verification (before commit)

For each page that should emit JSON-LD: `curl -s <local-dev-url>` shows `<script type="application/ld+json">` present, JSON structurally valid, `@id` correct, no fabricated fields. Specifically:
- `/u/aniketaslaliya801` — Person markup contains `@id`, `identifier` (entity external_id), all sameAs URLs, 48 knowsAbout skills, 4 subjectOf projects, shipstacked:verified=true, shipstacked:velocityScore=100.
- `/u/jennypeterson224` (and the other 2 fakes) — 404 (no script emitted, no Person markup anywhere on the site referencing them).
- `/u/sunnyzheng606` — Person markup with `subjectOf` empty (he has 0 narrated projects) but `shipstacked:github` present (commits 90d, languages).
- `/` — both Organization AND WebSite scripts present (two separate `<script>` blocks).
- `/leaderboard` — ItemList of 10 Person refs, none of which are the 3 fakes.
- `/talent` — ItemList of exactly 6 Person refs (the teaser).
- `/jobs/<seed-id>` — 308 (no JSON-LD; redirect fires before render — Tier 0 preserved).
- `/jobs` board — when empty, no ItemList script emitted (no noise).
- V2 surfaces untouched: `/p/<slug>.json` still returns the V2 receipt JSON-LD; `/atlas/roles/A1.json` still returns the V2 DefinedTerm JSON-LD. Beacon 1 doesn't regress the V2 graph.
- Tier 0 + Tier 1 regressions intact: seed-job 308s, homepage badge gone, 17 entities linked.
- `npx tsc --noEmit` clean; `npm run build` clean.
- **Crawler's-eye view:** `curl` (not `curl -A "browser"`, not headless browser) returns the JSON-LD blocks server-rendered — agents don't need to execute JS.

### H12 — Commit + push

Code-only (no production data mutation). Commit message documents:
- Pages that gained markup (5 new) + pages reconciled (6 existing).
- Namespace consistency with V2 (`shipstacked: https://shipstacked.com/schema/v0.1#`).
- Fake-exclusion: 3 fakes emit zero markup (404 on direct hit, absent from every ItemList).
- The H9 escalation decision Thomas made (a or b).
- Reversal: `git revert <commit>` fully reverses. No DB rollback needed (no DB mutations).
- Production verification: `curl https://shipstacked.com/u/aniketaslaliya801 | grep ld+json` returns ≥1 script; the JSON validates; `/u/jennypeterson224` still 404 with no Person markup; V2 spine + Tier-0 + Tier-1 regressions intact.

### H13 — What Beacon 1 explicitly does NOT do

- Does NOT touch the V2 emitters at `src/lib/receipts/jsonld.ts` or `src/lib/atlas/jsonld.ts`.
- Does NOT change any human-visible HTML or page layout.
- Does NOT add a SearchAction (site search doesn't exist; would be a structured-data lie).
- Does NOT atlas-classify existing projects on profiles (deferred per Spec §0 and Tier 1 escalation).
- Does NOT build AgentCard, MCP server, AGENTS.md, npm package — those are Beacons 2–5, separate specs.
- Does NOT build the Noah gateway — Beacon 1 is the *prerequisite*; the gateway is its own spec.
- Does NOT include consent UI for the Person markup — the markup includes only what's ALREADY publicly visible on the human-readable profile page (per Spec §5 consent boundary). Anything beyond that is the Noah gateway spec's domain.

---

## Method notes

- Every existing `application/ld+json` reference in `src/` was grep'd and file:line-cited.
- Pre-existing inline JSON-LD was read in full from `src/app/layout.tsx`, `src/app/u/[username]/page.tsx`, `src/app/atlas/page.tsx`, `src/app/jobs/[id]/page.tsx`, `src/app/company/[slug]/page.tsx`, `src/app/feed/[id]/page.tsx`.
- V2 namespace pattern read verbatim from `src/lib/receipts/jsonld.ts:14-18` and `src/lib/atlas/jsonld.ts:13-17`.
- Person markup data coverage (Aniket as the concrete worked example) verified against live DB: 4 sameAs URLs, 48 skills, 4 projects with URLs+outcomes, entity at id=4 with external_id, GitHub data with 207 commits 90d.
- Fake-exclusion confirmed at every collection-page query source: `/leaderboard` and `/talent` filter `published=true`; `/feed` does NOT (escalation flagged).
- Active job count = 0 (JobPosting markup dormant today, reconcile-and-build is cheap).
- All `from('profiles')` reads cross-checked against the Tier-0/Tier-1 status-filter pattern.

---

*End of Phase 1 discovery. STOP. Awaiting Thomas's review and explicit Section H approval (with H9 escalation decision) before Phase 2.*
