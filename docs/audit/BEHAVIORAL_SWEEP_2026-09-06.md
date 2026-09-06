# Behavioural sweep — 2026-09-06

Autonomous adversarial sweep of every rebuilt flow, run against **production**
with disposable `sweeptest-*` data. All test data was deleted afterwards and the
real-builder invariant re-verified (§CLEANUP).

**139 assertions across 9 flows — 113 PASS, 26 FAIL.** Of the 26 failures, 8 are
harness artefacts (superseded by a corrected re-probe, marked ⓘ) and 18 trace to
**6 real defects**, 4 of them production-blocking.

Harness: `scripts/sweep/` — `lib.ts` (auth/cookie/assert), `run.ts` (flows 1–9),
`run2.ts`/`run3.ts`/`run4.ts` (targeted re-probes of each failure), `cleanup.ts`
(scoped teardown + invariant verification). Re-runnable:
`node --env-file=.env.local --experimental-strip-types scripts/sweep/run.ts`.

> Naming note: entity slugs use the `sweeptest-` prefix verbatim
> (`sweeptest-team-a`, `sweeptest-buyerco`, `sweeptest-agent-a`); the one human
> username is `sweeptestbuilder1` — unhyphenated, because the real signup path
> generates alphanumeric usernames and a hyphen would have tested an
> impossible-in-production shape. Still unambiguously `sweeptest*` for cleanup.

---

## BUG LIST — prioritised

### 🔴 B1 · CRITICAL · The entire API-key `/api/v1/*` surface returns 500
**The Upstash Redis database behind `rateLimit()` no longer exists.**

`src/lib/rateLimit.ts:3-6` constructs an Upstash client from
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` and calls `redis.incr()`
with no try/catch. The configured host **`smooth-ram-80560.upstash.io` does not
resolve** (`curl: (6) Could not resolve host`) — the database has been deleted or
expired. Every route that awaits `rateLimit()` throws an unhandled network error
→ 500.

Measured against production with a valid `sk_ss_` key:

| endpoint | result |
|---|---|
| `GET /api/v1/me` | **500** |
| `GET /api/v1/talent/search?q=claude` | **500** |
| `GET /api/v1/builders/<username>` | **500** |
| `GET /api/v1/agent/<slug>` | **500** |
| `GET /api/v1/team/<slug>` | **500** |
| `GET /api/v1/builds` | 200 ← its GET is the one that does **not** call `rateLimit` |
| `POST /api/mcp` initialize | 200 ← no rate limiting |
| `GET /api/v1/me` (no key / bad key) | 401 ← auth rejects before `rateLimit` |

Every other `rateLimit()` caller is affected too: `/api/v1/me/scope`,
`/api/v1/profile`, `/api/v1/builds` **POST**, `/api/v1/agent`, `/api/v1/team`
(GET + bearer PATCH), `/api/v1/messages`, `/api/v1/saved-profiles`,
`/api/v1/avatar`, `/api/v1/jobs` POST.

Why nothing caught it: `verify-agent-card.ts` probes only unauthenticated
surfaces (llms.txt, sitemap, MCP initialize) — all of which skip rate limiting.
The AgentCard advertises an API that 500s on every authenticated call. That is
exactly the "machine-readable lie at the agent front door" invariant #8 exists to
prevent, but the script's coverage stops short of the keyed routes.

**Fix**: re-provision the Upstash DB (or point the env vars at a live one) **and**
wrap `rateLimit` in try/catch so a Redis outage fails open (or fails closed with a
503) instead of 500ing the whole API. The second half matters more than the first.

### 🔴 B2 · CRITICAL · Contacting a team is impossible — NOT NULL violation
`POST /api/messages/contact-team` inserts `builder_profile_id: null`
(`src/app/api/messages/contact-team/route.ts`, conversation insert), but
`conversations.builder_profile_id` is **NOT NULL** (PostgREST spec:
`required: ["id","employer_email","builder_profile_id"]`).

Every call fails:
```
500 {"error":"null value in column \"builder_profile_id\" of relation
     \"conversations\" violates not-null constraint"}
```
Reproduced twice — as a paying member and as a non-member — against a published
sweeptest team. The team-contact path (the whole point of publishing a service
team) has never worked. The column needs to become nullable (DDL, Dashboard) or
the route needs a different conversation shape.

### 🔴 B3 · CRITICAL · A buyer org cannot attribute a job to its company
Two `kind` gates omit `'org'` — the same class of defect as the `0d9feaf` edit-404:

- `src/app/api/jobs/post-as-team/route.ts` ownership check: `.in('kind', ['team','agent'])`
- `src/app/post-job/page.tsx:42` postable-entity lookup: `.in('kind', ['team','agent'])`

Measured:
- buyer org → `POST /api/jobs/post-as-team` → **403** `"subject_entity_id must reference a team or agent you own."`
- because `/post-job` offers an org owner no entity to post as, the form falls through to the browser direct-insert path (`PostJobForm.tsx:143-150`), which writes **no `subject_entity_id` at all**
- resulting job row: `subject_entity_id = NULL`
- consequence: **the org's own `/team/<slug>` page does not show the role it just posted**

The Stage-5b re-key therefore does not apply to the identity the buyer flow was
rebuilt for. A service team (`kind='team'`) posts correctly and its role *does*
render on its team page — verified PASS — so the hiring lens itself works; only
orgs are locked out.

### 🟠 B4 · HIGH · `POST /api/jobs` always 500s — writes a column that doesn't exist
```
500 {"error":"Could not find the 'job_type' column of 'jobs' in the schema cache"}
```
`src/app/api/jobs/route.ts:58` inserts `job_type: job_type || 'contract'`
unconditionally, and `jobs` has no `job_type` column (columns confirmed against
the live schema). The route can never succeed. `src/lib/xPost.ts:20` and
`route.ts:79` also read the phantom `job.job_type`.

Severity is HIGH not CRITICAL only because the UI posts via
`/api/jobs/post-as-team` (`PostJobForm.tsx:119`) — `/api/jobs` is the
non-UI/legacy path. It is still a permanently-broken public endpoint.

### 🔴 B5 · CRITICAL (latent, code-confirmed) · `/api/v1/team` resolves a team by *nothing*
`src/app/api/v1/team/route.ts:24-34`:
```ts
async function resolveTeamByOwner(db, userId) {
  const { data } = await db.from('entities').select(ENTITY_SELECT)
    .in('kind', ['team', 'org']).limit(1).maybeSingle()   // ← userId never used
  return data
}
```
The `userId` argument is accepted and ignored. Any `team:rw` key resolves to
**whatever team/org row Postgres returns first**, not the caller's. Both the
bearer `GET` and the bearer `PATCH` use it, so this is a cross-tenant **read and
write**: an agent key could rewrite another company's public profile, including
its `published` flag.

I could not demonstrate it end-to-end because B1 makes the route 500 before it
returns — the probe got `500`, not a leaked slug. The defect is plain in the
source and **will become exploitable the moment B1 is fixed**, so it must be
fixed in the same change. The cookie/dashboard path is correctly gated
(`team_admins` membership check) — verified: a non-admin PATCH returns 403.

### 🟠 B6 · HIGH · Enrichment is failing in production — Anthropic API has no credit
The sweeptest builder's enrichment run:
```
status=failed  failures=2  receipts_written=0
classify_atlas: 400 {"type":"invalid_request_error",
  "message":"Your credit balance is too low to access the Anthropic API.
             Please go to Plans & Billing to upgrade or purchase credits."}
```
`/api/enrich` itself behaves correctly — 202, a run row, a clean `failed` status,
no crash — so the orchestration is sound. But **no new builder gets proof
receipts or Atlas roles** until the API account is funded, which means no
capability-page placement via the proven path and no receipt-backed ranking. The
two most recent *real* builders enriched fine earlier, so this is recent.

### 🟡 B7 · MEDIUM · Contacting a team bypasses Full Access (design gap)
`/api/messages/contact-team` has no `modes.member` check — its comment says
"Anyone logged-in can message a PUBLISHED team". Meanwhile messaging a *builder*
is paywalled (403, verified). So once B2 is fixed, a free account can contact
every published team while paying to contact a single builder. Flagging as a
monetisation inconsistency for Thomas to rule on, not a code error.

### 🟡 B8 · MEDIUM · Capability-page nav gap (handoff item 3) — still open
Confirmed still true: **zero** in-app links to `/talent/<slug>` anywhere in the
crawled surfaces, and builder skill chips on `/u/<username>` are **not** links.
The 77 capability pages remain reachable only by typing the URL or arriving from
a crawler.

---

## Flow-by-flow results

| Flow | Step | Expected | Actual | Result |
|---|---|---|---|---|
| **1 Builder** | profiles insert via real signup path (anon key + RLS) | succeeds | inserted, `published=true` | PASS |
| 1 | skills written | 4 rows | 4 rows | PASS |
| 1 | project written | succeeds | inserted | PASS |
| 1 | `POST /api/enrich` | 200/202, never 5xx | 202 + run row | PASS |
| 1 | entity minted `kind=human` | kind=human | id=78 kind=human | PASS |
| 1 | **invariant #1** slug == username verbatim | `sweeptestbuilder1` | `sweeptestbuilder1` | PASS |
| 1 | enrichment produces a receipt or a clean no-artifact outcome | run row, no crash | run row, `status=failed` | PASS (no crash) |
| 1 | enrichment pipeline healthy | receipts written | **Anthropic credit exhausted** | **FAIL → B6** |
| 1 | `GET /u/<username>` | 200 + name + skills | 200, name + "Claude Code" rendered | PASS |
| 1 | appears on `/talent` | listed | listed | PASS |
| 1 | skills resolve onto capability vocab | `claude-code` | `["claude-code","cursor","rag"]` | PASS |
| 1 | appears on `/talent/claude-code` | listed | not yet — ISR `revalidate=3600` | ⓘ see note |
| **2 Team** | `POST /api/join/team` | 200 + entity_id | 200, entity 79 | PASS |
| 2 | entity `kind=team` | team | team | PASS |
| 2 | `team_profiles` `offers_services=true` | true | true, published=false | PASS |
| 2 | `team_admins` owner row | owner | owner, correct user | PASS |
| 2 | `/team/<slug>/edit` as owner | 200 | 200 | PASS |
| 2 | unpublished team not public | 404 | 404 | PASS |
| 2 | publish toggle (`PATCH /api/v1/team` cookie path) | 200 + persisted | 200, `published=true` | PASS |
| 2 | `/team/<slug>` logged out after publish | 200 | 200 | PASS |
| 2 | renders SERVICE lens | services shown | "Claude Code" rendered | PASS |
| 2 | edit persists (tagline round-trip) | persisted | persisted | PASS |
| 2 | services resolve onto capability vocab (D1) | `claude-code` | `["claude-code","rag"]` | PASS |
| **3 Agent** | `POST /api/join/agent` | 200 + entity_id | 200, entity 80 | PASS |
| 3 | entity `kind=agent` | agent | agent | PASS |
| 3 | `agent_profiles` row | published=false | published=false | PASS |
| 3 | unpublished agent not public | 404 | 404 | PASS |
| 3 | `/agent/<slug>/edit` as owner | 200 | 200 | PASS |
| 3 | edit page owner-gated | non-owner ≠ 200 | 307 redirect | PASS |
| 3 | publish (`PATCH /api/v1/agent`) | 200 + persisted | 200, `published=true` | PASS |
| 3 | `/agent/<slug>` public | 200 + name + provider | 200, both rendered | PASS |
| 3 | capabilities resolve onto capability vocab | `claude-code` | `["claude-code","rag"]` | PASS |
| 3 | `GET /api/v1/agent/<slug>` with a key | 200 | **500** | **FAIL → B1** |
| **4 Buyer** | `POST /api/join/buyer` | 200 + entity_id | 200, entity 81 | PASS |
| 4 | entity `kind=org` | org | org | PASS |
| 4 | `offers_services=false`, `hires=false` | both false | both false | PASS |
| 4 | `team_admins` owner row | owner | owner | PASS |
| 4 | **no `role='client'` stamp** | absent | `undefined` | PASS |
| 4 | nav data resolves the org ("Your company") | org flags present | `org_offers_services=false` | PASS |
| 4 | `/team/<slug>` owner preview (unpublished) | 200 | 200 | PASS |
| 4 | **`/team/<slug>/edit` ← the `0d9feaf` bug** | **200, not 404** | **200** | **PASS — fix holds** |
| 4 | publish toggle flips `team_profiles.published` | true | true | PASS |
| 4 | `/team/<slug>` **logged out** after publish | 200, not 404 | 200 + company name | **PASS — chain complete** |
| 4 | `/hirer` for a no-sub buyer | 200 empty state | 200, empty state rendered | PASS |
| **5 Paywall** | non-member starts a conversation | 403, no rows | 403, 0 conversations | PASS |
| 5 | anonymous messaging | 401 | 401 | PASS |
| 5 | free project-inquiry backdoor | gone | 404 | PASS |
| 5 | simulated active sub → messaging unlocks | 200 + conversation | 200 + conversation | PASS |
| 5 | conversation carries `subject_entity_id` | org id | 81 | PASS |
| 5 | checkout session reachable (no charge made) | 200 + Stripe URL | 200 + URL | PASS |
| 5 | feed-post CTA is paywall-framed | Full Access CTA | paywalled CTA | PASS |
| 5 | **contact a published team** | 200 | **500 NOT NULL** | **FAIL → B2** |
| 5 | team contact requires Full Access | paywalled | no member check | **FAIL → B7** |
| **6 Jobs** | `POST /api/jobs` | 200 | **500 `job_type`** | **FAIL → B4** |
| 6 | buyer org posts as its company | 200 | **403** | **FAIL → B3** |
| 6 | service team posts as itself | 200 | 200 | PASS |
| 6 | buyer's job carries `subject_entity_id` | org id | **NULL** | **FAIL → B3** |
| 6 | `/jobs/<id>` renders + shows company | 200 + name | 200 + name | PASS |
| 6 | job listed on `/jobs` | listed | listed | PASS |
| 6 | buyer's job on its own `/team/<slug>` | shown | **not shown** | **FAIL → B3** |
| 6 | team's job on its `/team/<slug>` hiring lens | shown | shown | PASS |
| **7 Messaging** | conversation carries `subject_entity_id` | set | set | PASS |
| 7 | builder inbox resolves hirer via `team_profiles` | company name | `{"company_name":"Sweeptest Buyer Co"}` | PASS |
| 7 | **published gate hides an unpublished hirer** | hidden | `employer_profile=null` | PASS |
| 7 | team shared inbox (`?as=team&entity=`) | 200 | 200 | PASS |
| 7 | `/messages?as=hirer` (target of the `/hirer/messages` 308) | 200 | 200 | PASS |
| 7 | builder replies without a subscription | 200 | 200 | PASS |
| 7 | **non-participant cannot inject into a thread** | 403 | 403 | PASS |
| **8 Nav** | builder / team / agent / buyer / member × `/dashboard` `/talent` `/feed` `/jobs` `/messages` | 200 or intentional redirect | all 200 | PASS ×25 |
| 8 | every crawled in-app link resolves, per identity | no 4xx/5xx | **0 dead links** (76–77 unique links per identity) | PASS ×5 |
| **9 Adversarial** | unauthenticated `POST /api/join/{team,agent,buyer}` | 401 | 401 ×3 | PASS |
| 9 | slug squatting across kinds | 409 | 409 | PASS |
| 9 | cookie path: non-admin PATCHes another team | 403 | 403 | PASS |
| 9 | invalid API key | 401, never 500 | 401 | PASS |
| 9 | `team:rw` key of a user owning no team | 404 | 500 (blocked by B1) | **FAIL → B1/B5** |
| 9 | in-app links to `/talent/<slug>` | some | **zero** | **FAIL → B8** |
| 9 | builder skill chips link to capability pages | links | not links | **FAIL → B8** |

ⓘ **Harness artefacts, not defects** (8 failures, all superseded by a corrected
re-probe): three `phase execution` throws from `@/lib` path aliases not resolving
under Node's `--experimental-strip-types` (re-probed via direct queries — all
PASS); `/api/v1/agent/<slug>` 401 (called without a key — it requires one *by
design*); `/hirer/messages` 308 (an intentional `permanentRedirect` to
`/messages?as=hirer`, documented in the file); and three messaging assertions
made against server HTML for a client-rendered page (re-probed via
`GET /api/messages` — all PASS).

ⓘ **`/talent/<slug>` ISR delay** — the capability pages are
`generateStaticParams` + `revalidate = 3600`, so a new builder/team/agent does
not appear for up to an hour. Correct by design, but it is the surface behind
"why isn't my profile showing up?", and combined with B8 (no in-app links) a new
signup has no way to see their capability placement.

---

## Known open items from the handoff (§9)

- **"$199 at hiring entry"** — `/hirers` contains both `$199/mo` and free-to-start
  framing on the same page. Reported as observed; the call is Thomas's.
- **Capability-page nav gap** — still open, now measured: zero in-app links (B8).

---

## CLEANUP — verified

Scoped teardown of `sweeptest-*` only, entity-first, same method as the
2026-09-06 test-data cleanup. Every deleted row was backed up first.

| | before | after |
|---|---:|---:|
| **real published builders** | **40** | **40 ✓** |
| profiles | 62 | 61 |
| entities | 44 | 40 |
| team_profiles | 2 | 0 |
| agent_profiles | 1 | 0 |
| subscriptions | 3 | 0 |
| jobs | 2 | 0 |
| conversations / messages | 1 / 2 | 0 / 0 |
| skills | 621 | 617 |
| api_keys | 49 | 45 |
| proof_receipts | 80 | 80 (untouched) |

Deleted: 1 profile, 4 entities, 2 team_profiles, 1 agent_profile, 2 team_admins,
3 subscriptions, 2 jobs, 1 conversation, 2 messages, 4 skills, 1 project,
1 enrichment_run, 4 api_keys, 5 auth users — all `sweeptest*`.

Verification: **real published builders 40 → 40**, sweeptest leftovers **NONE**
(checked `profiles.username`, `entities.slug`, and full-row scans of
`subscriptions`, `jobs`, `conversations`, plus `auth.users`). Every count returns
to the post-cleanup baseline from earlier today. No real row was touched — the
sweep only ever created its own data and only ever deleted rows matching
`sweeptest`.
