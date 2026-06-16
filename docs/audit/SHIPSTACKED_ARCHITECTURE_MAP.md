<!-- Phase 7 §E (2026-06-16): real builder/contact emails redacted; historical context only. -->
# ShipStacked — Architecture Map (READ-ONLY, AUTHORITATIVE)

**HEAD:** `ab12d9a` (Atlas v0.5 essay live, v0.4 role taxonomy stable)
**Method:** Read-only. Grep + file reads + `SELECT COUNT(*)` against prod DB (service-role, no mutation). Every claim cited to `file:line` or migration source. Where a table's DDL is not in `supabase/migrations/`, it was applied via Supabase Dashboard SQL Editor per `AGENTS.md` H4 — schema known only from code-references and prior audit; flagged as "unverified-in-migrations" each time.
**Status tags:** LIVE = wired, runs in prod request/cron path · PARKED = exists in code/DB but inert/stub/manual-only/no consumer · DEAD = unreachable/orphaned. Where unverifiable → **"ambiguous — needs deeper trace"**.

---

## SECTION 1 — DATA LAYER

### 1.1 Tables — schema, row count, writers, readers (LIVE prod counts at HEAD)

Counts obtained via `SELECT COUNT(*)` through service-role client at HEAD (`ab12d9a`).

#### V2 spine (created via `supabase/migrations/20260515150752_proof_receipts_v0_1.sql`)

| Table | Cols (migration line) | Rows | Writers | Readers | Tag |
|---|---|---|---|---|---|
| `entities` | `proof_receipts_v0_1.sql:10-19` — `id (bigserial PK), external_id (unique), kind ∈ {human,operator,fleet,agent}, display_name, slug (unique), owner_user_id → auth.users(id), created_at, updated_at`. Plus `profile_id uuid → profiles(id)` added by `merge_profiles_entities_link.sql:13`. | **17** | `src/lib/entities.ts` `findOrCreateHumanEntity()` (called from `src/lib/paste/publish.ts:179`); `scripts/v2/backfill-entities.ts:158,201`; `scripts/v2/verify-step-6.ts:73`, `scripts/v2/verify-step-7.ts:66` (test cleanup) | `src/lib/jsonld/person.ts` via consumer reads in `src/app/u/[username]/page.tsx`; `src/lib/agent-card/builder.ts`; `src/lib/mcp/tools.ts`; `src/lib/paste/publish.ts:179`; `src/lib/collections/assemble.ts` | **LIVE** — populated by Tier 1 backfill (`1e9c81a`), would grow further via `/paste/publish` once a non-backfilled user publishes a receipt |
| `atlas_roles` | `proof_receipts_v0_1.sql:33-52` — `role_id, atlas_version, cluster, name, short_description, long_description_md, automation_trajectory, isco_08_code, soc_2018_code, onet_code, crosswalk_status, eu_ai_act_articles[], iso_42001_sections[], PK(role_id, atlas_version)` | **74** (40 v0.4 + 34 v0.3) | `scripts/seed-atlas-roles.ts` (manual seed) | `src/app/atlas/page.tsx:579-583` (DefinedTermSet); `src/app/atlas/roles/[id]/page.tsx`; `src/app/api/atlas/roles/[id]/jsonld/route.ts`; `src/app/llms.txt/route.ts:64`; `src/lib/mcp/tools.ts`; `scripts/generate-classifier-prompt.ts:58` | **LIVE** — canonical role taxonomy, served by every role-aware surface |
| `proof_receipts` | `proof_receipts_v0_1.sql:60-102` — `id, external_id, slug, schema_version, atlas_version, subject_id → entities, on_behalf_of_id → entities, event_type, event_subtype, title, description, occurred_at, occurred_at_precision, duration_seconds, artifacts (jsonb), stack (jsonb), outcomes (jsonb), capabilities text[], atlas_claimed text[], atlas_inferred text[], atlas_confirmed text[], atlas_confidence numeric(3,2), classifier_version, classified_at, verification_level, visibility ∈ {public,unlisted,private}, ingestion_source, ingestion_metadata jsonb, issued_at, updated_at` | **0** | `src/lib/paste/publish.ts:215-256` (the only writer); `verify-step-6.ts:72`, `verify-step-7.ts:65` (test cleanup) | `src/app/u/[username]/page.tsx:66`; `src/app/p/[slug]/page.tsx`; `src/app/og/route.tsx:48`; `src/app/llms.txt/route.ts` (recent receipts); `src/lib/receipts/jsonld.ts:74,84,95`; `src/lib/receipts/render.ts`; `src/lib/mcp/tools.ts` | **LIVE table, EMPTY data** — schema wired into 7+ surfaces but no row has ever survived in prod (every test ingestion was rolled back) |
| `verification_events` | `proof_receipts_v0_1.sql:114-121` — `id, receipt_id → proof_receipts ON DELETE CASCADE, level, achieved_at, method, evidence jsonb`. APPEND-ONLY by convention. | **0** | `src/lib/paste/publish.ts:301` | `src/lib/receipts/render.ts` (the ladder display on `/p/[slug]`) | **PARKED** — depends on `proof_receipts` having rows |
| `attestations` | `proof_receipts_v0_1.sql:132-141` — `id, receipt_id → proof_receipts, attestor_id → entities, attestor_role ∈ {client,employer,peer,platform}, statement, signed_at, signature, signature_method` | **0** | none in code (service-role manual only — ambiguous — needs deeper trace for any out-of-code writer) | `src/lib/receipts/render.ts` | **PARKED** — no writer in code, no live data |
| `capabilities_vocab` | `proof_receipts_v0_1.sql:148-153` — `tag (PK), first_seen_at, receipt_count, promoted` | **4** (`agent-loop`, `tool-use`, `verification-marker`, `step7-marker` — all `receipt_count=4`, all from Beacon 4/5 test fixtures left behind after step-6/7 verify rollbacks) | `src/lib/paste/publish.ts:347-367` (counter bump per receipt capability) | `src/app/llms.txt/route.ts` (likely — ambiguous — needs deeper trace) | **LIVE writer / leftover data** — current 4 rows are fixture residue, not real |
| `ingestion_log` | `proof_receipts_v0_1.sql:161-170` — `id, receipt_id → proof_receipts ON DELETE SET NULL, source, source_url, request_id, status, error, created_at` | **8** (all `source='paste'`, `source_url='https://github.com/anthropics/claude-code'`, `receipt_id=null` — fixture residue from rolled-back test receipts) | `src/lib/paste/publish.ts:323` | none in code (admin debug only) | **LIVE writer / leftover data** — append-only debug trail |

#### Tier 1 merge (`supabase/migrations/20260516142038_merge_profiles_entities_link.sql`)

Adds bidirectional FK: `entities.profile_id uuid → profiles(id)` (line 13) and `profiles.entity_id bigint → entities(id)` (line 14), with unique partial indexes (lines 16-22). **profiles `WHERE entity_id IS NOT NULL` = 17** (matches the Tier 1 backfilled cohort that has entities).

#### Consented Collections (`supabase/migrations/20260516162601_consented_collections.sql`)

| Table | Cols | Rows | Writers | Readers | Tag |
|---|---|---|---|---|---|
| `collections` | line 28-34 — `slug PK, title, description, created_at, active default true` | **0** | `scripts/v2/create-collection.ts` (admin); `src/lib/collections/collections.ts` | `src/lib/collections/assemble.ts`; `/collections/[slug]` page; `/api/collections/[slug]/*` routes | **LIVE schema, ZERO collections defined** — feature exists but no slug has ever been added |
| `collection_memberships` | line 37-45 — `id, profile_id → profiles, collection_slug → collections ON DELETE RESTRICT, opted_in_at, opted_out_at, source ∈ {dashboard,link}, source_metadata jsonb` | **0** | `src/lib/collections/consent.ts`; `/api/collections/[slug]/optin/redeem`; `/api/collections/[slug]/optout` | `src/lib/collections/assemble.ts` | **PARKED** — schema ready, no collection has consenting members because no collection exists |
| `consent_tokens` | line 55-63 — `token PK (256-bit base64url), profile_id → profiles, collection_slug → collections ON DELETE RESTRICT, created_at, expires_at, used_at, revoked_at` | **0** | `src/lib/collections/tokens.ts`; `scripts/v2/mint-consent-token.ts` (admin) | `/api/collections/[slug]/optin/redeem` | **PARKED** — no tokens minted (no collection exists) |

#### V1 tables (NOT in `supabase/migrations/` — created via Supabase Dashboard SQL Editor, schema known only from code-references + `docs/audit/SITE_AUDIT_2026-05-16.md:287` — **unverified-in-migrations**)

Schemas listed are derived from authoritative live SELECT on the columns in prod (live `Object.keys()` introspection where executed; otherwise from audit doc, flagged).

| Table | Cols (source) | Rows | Writers | Readers | Tag |
|---|---|---|---|---|---|
| `profiles` | **Live column introspection (this audit, 2026-05-17):** `id, user_id (→ auth.users), email, username, full_name, role, bio, about, avatar_url, availability, location, primary_profession, seniority, work_type, day_rate, timezone, languages, published, verified, accepts_project_inquiries, github_url, github_connected, github_username, linkedin_url, website_url, x_url, hire_count, last_seen_at, velocity_score, profile_views, featured, featured_order, entity_id (→ entities, added by Tier 1), created_at` (34 columns). **NO `atlas_role_id`, NO `primary_role`, NO `claimed_role_id` column.** | **67** (published=**41**, verified=**19**, entity_id NOT NULL=**17**) | `src/app/join/page.tsx:89-103` (signup insert); `src/app/dashboard/edit/EditProfileForm.tsx:229-241` (full profile update); `src/app/dashboard/BuilderDashboardClient.tsx:99` (inquiry toggle); `src/app/login/actions.ts:46` (`last_seen_at`); `src/app/api/github/callback/route.ts:215` (github connect); `scripts/v2/backfill-entities.ts:158,201` (entity_id backfill) | 62 distinct `.from('profiles')` callsites across `src/`; primary readers: `src/app/u/[username]/page.tsx` (via `getPublishedProfile`); `src/app/feed/*`; `src/app/dashboard/*`; `src/lib/mcp/tools.ts`; `src/lib/jsonld/person.ts` (via consumer); `src/lib/collections/assemble.ts` | **LIVE** — the primary builder-identity table |
| `skills` | `id, profile_id → profiles, category ∈ {claude_use_case,llm,language,framework,ai_tool,domain}, name` (per `EditProfileForm.tsx:264-272` insert shape; categories enumerated there) | **1,014** | `src/app/join/page.tsx:125`; `src/app/dashboard/edit/EditProfileForm.tsx:273`; `src/app/api/v1/profile/route.ts:62` | `src/app/u/[username]/page.tsx:53`; many others | **LIVE** — closed-vocab tagging per-profile |
| `projects` | `id, profile_id, title, description, prompt_approach, outcome, project_url, display_order` (per `EditProfileForm.tsx:250-260`) | **38** | `src/app/dashboard/edit/EditProfileForm.tsx:250`; `src/app/api/v1/profile/route.ts:78` | `src/app/u/[username]/page.tsx:48` | **LIVE** |
| `posts` | `id, profile_id, title, what_built, problem_solved, tools_used, time_taken, url, reactions, outcome, featured` (per audit + per `/feed` SELECTs) | **73** | `src/app/join/page.tsx:111` (first-post-on-signup); other build-feed write paths (ambiguous — needs deeper trace) | `src/app/feed/page.tsx`; `src/app/feed/[id]/page.tsx`; `src/app/u/[username]/page.tsx:60-64`; `src/app/admin/page.tsx:33`; `src/app/api/admin/...` | **LIVE** — Build Feed primary table |
| `post_comments` | `id, post_id, author_email, author_name, author_role, author_username, content, likes_count` (per `src/app/api/comments/route.ts:29` insert shape) | **13** | `src/app/api/comments/route.ts:29`; `src/app/api/comments/likes/route.ts:38,45` (likes_count bump) | `src/app/feed/[id]/page.tsx`; admin | **LIVE** |
| `comment_likes` | `id, comment_id, user_email` (per `src/app/api/comments/likes/route.ts:28,42`) | **1** | `src/app/api/comments/likes/route.ts:42`; delete at `:28` | `src/app/api/comments/likes/route.ts` | **LIVE** |
| `github_data` | per `src/app/api/github/callback/route.ts:191-199` upsert: `profile_id (unique), github_username, repos_count, commits_90d, top_languages, contribution_data, last_synced` | **20** | `src/app/api/github/callback/route.ts:191`; `src/app/api/github/sync/route.ts` | `src/app/u/[username]/page.tsx:56` | **LIVE** — GitHub OAuth-attached stats |
| `api_keys` | per `src/app/api/keys/route.ts` (ambiguous — needs deeper trace for full column list) — schema includes `profile_id, created_at, last_used_at, name` per audit | **48** | `src/app/api/keys/route.ts` | `src/app/api/v1/*` (Bearer key auth) | **LIVE** |
| `employer_profiles` | per `EmployerDashboardClient.tsx:123-125` upsert | **7** (1 public) | `src/app/employer/EmployerDashboardClient.tsx:123,125` | `src/app/employers/page.tsx`; `/api/employer-logo` | **LIVE** |
| `jobs` | per `src/app/post-job/PostJobForm.tsx:109-115` insert/update shape | **24** | `src/app/post-job/PostJobForm.tsx:109,115`; `src/app/employer/EmployerDashboardClient.tsx:142,156`; `src/app/api/jobs/*` | `src/app/jobs/*`; `src/app/feed/jobs`; `src/app/admin/page.tsx`; many | **LIVE** |
| `applications` | per `src/app/api/apply/route.ts:58` insert: `job_id, builder_email, builder_name, profile_id, employer_email, status, created_at` | **122** | `src/app/api/apply/route.ts:58` | admin; `/api/admin/candidates/*` | **LIVE** |
| `subscriptions` | per `src/app/api/webhooks/stripe/route.ts:67`: `email, stripe_customer_id, stripe_session_id, product, status, expires_at, magic_link` | **11** | `src/app/api/webhooks/stripe/route.ts:67`; `src/app/api/employer/cancel/route.ts` | `src/app/admin/page.tsx` (MRR calc); `src/app/employer/*` | **LIVE** |
| `saved_profiles` | (ambiguous — needs deeper trace for columns) | **3** | `src/app/api/saved-profiles/route.ts` | employer dashboard | **LIVE** |
| `conversations` | per `/api/messages/route.ts:177` + `/api/inquiry/route.ts:86`: `id, employer_email, builder_profile_id, job_id, last_message_at, conversation_type, client_email, client_name, created_at` | **162** | `src/app/api/messages/route.ts:177`; `src/app/api/inquiry/route.ts`; `src/app/api/apply/route.ts`; `src/app/client/inbox/ClientInboxClient.tsx:94` | `src/app/api/hire-confirm/nudge/route.ts:25-30` (cron source); many | **LIVE** |
| `messages` | (ambiguous — needs deeper trace for column list) | **250** | `src/app/api/apply/route.ts:92`; `src/app/api/inquiry/route.ts:86`; `src/app/api/messages/route.ts`; `src/app/client/inbox/ClientInboxClient.tsx:88` | `src/app/api/messages/*` | **LIVE** |
| `hire_confirmations` | per `src/app/api/hire-confirm/nudge/route.ts:55-60` insert: `id (uuid), conversation_id, builder_email, employer_email, builder_confirmed bool, employer_confirmed bool, confirmed_at, nudge_sent_at, created_at` | **160** | `src/app/api/hire-confirm/nudge/route.ts:53-60` (the cron); `src/app/api/hire-confirm/route.ts:34,43` (toggle on builder/employer click) | `src/app/api/hire-confirm/count/route.ts:11-14` (homepage badge — counts `confirmed_at IS NOT NULL` only → **0**); `src/app/admin/page.tsx:36` | **LIVE writer, IDLE confirmation flow** — 160 rows all between **same builder/employer pair** (`<redacted-email>` ↔ `oxleethomas+shipstacked@gmail.com`), all unconfirmed (`confirmed_at=null` on all 160), all created today (2026-05-17) in one nudge cron burst across 160 distinct `conversation_id`s. **0 confirmed hires.** Audit (2026-05-16) reported 0 rows; the 160 appeared today. |
| `hire_intakes` | (per audit; ambiguous — needs deeper trace for live introspection) | **5** | `src/app/api/intakes/hire/route.ts` | admin only (manual via Supabase Studio) | **LIVE writer, all Thomas-test rows** (per audit + live row-list confirms emails are `ox@agentagous.com` on all 5) |
| `claim_submissions` | per `src/app/api/intakes/claim/route.ts:170-192` insert: `id, created_at, name, email, location, linkedin_url, github_url, twitter_url, website_url, atlas_roles text[], verticals text[], domain_practitioner, domain_field, proof_of_work, engagement_modes text[], comp_expectation, notes, user_agent, referrer`. Additional columns (`status, thomas_notes, vetted_at, routable`) exist per audit and are server-defaulted/manual-only. | **2** (both `email='ox@agentagous.com'`, both `status='new'`, both `routable=false`) | `src/app/api/intakes/claim/route.ts:170-192` (the ONLY writer) | **NONE in repo** — see §4 for the verification | **LIVE writer, NO in-code reader, all Thomas-test rows** |
| `candidates` | (ambiguous — needs deeper trace; 0 rows so no live introspection) | **0** | `src/app/api/admin/candidates/import/route.ts` | `/api/admin/candidates/next` `/draft` `/log`; `/admin/candidates` UI | **PARKED** — admin outreach queue, empty |
| `project_inquiries` | per `/api/inquiry/route.ts:94` insert | **4** | `src/app/api/inquiry/route.ts:94` | admin (ambiguous) | **LIVE** |
| `outreach_log` | (ambiguous — needs deeper trace) | **0** | `/api/admin/candidates/log/route.ts` (action='sent') | admin | **PARKED** |
| `outreach_drafts` | (ambiguous — needs deeper trace) | **0** | `/api/admin/candidates/draft/route.ts` | `/admin/candidates` UI | **PARKED** |
| `auth.users` | Supabase Auth, opaque schema | **ambiguous — needs deeper trace** (live count not queried this pass; audit 2026-05-16 reported **131**) | Supabase Auth (signup, magic-link, GitHub OAuth) | `profiles.user_id` FK; entity owner_user_id FK | **LIVE** |

### 1.2 Linkage graph (the spine)

```
auth.users (Supabase Auth)
  │  id (uuid)
  │
  ├──► profiles.user_id (uuid)                 ← V1 builder identity
  │      │
  │      ├──► profiles.email          [also queryable by email — NOT FK]
  │      ├──► profiles.username       [the slug; the URL key for /u/<username>]
  │      ├──► profiles.entity_id      → entities.id  (Tier 1 bidirectional, 17 rows linked)
  │      └──► profiles.role           FREE TEXT (e.g. "AI Automation Engineer")
  │                                   — NOT a FK to atlas_roles.role_id
  │
  └──► entities.owner_user_id (uuid)           ← V2 entity (subject of receipts)
         │
         ├──► entities.profile_id     → profiles.id  (Tier 1 bidirectional)
         ├──► entities.slug           VERBATIM = profiles.username (per AGENTS.md invariant #1)
         └──► entities.id ◄────┐
                               │
proof_receipts.subject_id      ─┘  (FK → entities.id)
  │
  ├──► proof_receipts.atlas_claimed   text[]   ← per-receipt role IDs
  ├──► proof_receipts.atlas_inferred  text[]   ← from atlas-classifier
  ├──► proof_receipts.atlas_confirmed text[]   ← user-confirmed in /paste/review
  ├──► proof_receipts.atlas_confidence numeric ← from atlas-classifier
  └──► proof_receipts.classifier_version       ← from atlas-classifier
       └──► loose semantic ref to atlas_roles (filterAtlasRoles in publish.ts:120-132
            validates against getAtlasRoles() — the prompt-parsed role list, not the DB)

atlas_roles (canonical role taxonomy, 74 rows = 40 v0.4 + 34 v0.3)
  │  Primary key: (role_id, atlas_version)
  └──► READ-ONLY referenced by: page.tsx DefinedTermSet (.eq('atlas_version','v0.4'));
       /atlas/roles/[id]; llms.txt; MCP get-atlas-role; per-role JSON-LD route.
       NOT FK-referenced by proof_receipts (the role-id values in atlas_claimed etc.
       are just text strings; no DB-level integrity constraint).

claim_submissions  (2 rows, both Thomas tests)
  │
  ├──► claim_submissions.email          FREE TEXT
  │    └──► NO FK / NO bridge to auth.users / profiles
  │    └──► NO code reads this column
  ├──► claim_submissions.atlas_roles    text[]
  │    └──► NO FK to atlas_roles, NO validation against atlas_roles, NO reader
  └──► claim_submissions.routable bool default false
       └──► NO code reads this column (verified §4)

hire_confirmations (160 rows, all unconfirmed, all between same builder/employer pair)
  │
  ├──► hire_confirmations.conversation_id  → conversations.id (no DB FK, code-level only)
  ├──► hire_confirmations.builder_email    → profiles.email (joinable by code, no FK)
  ├──► hire_confirmations.employer_email   → conversations.employer_email (no FK)
  ├──► hire_confirmations.confirmed_at     → drives homepage "10+ hires" badge (count = 0)
  └──► hire_confirmations.nudge_sent_at    → cron deduplication key
```

### 1.3 Absent bridges (the load-bearing gaps)

- **`claim_submissions.email` ↔ `auth.users.email` / `profiles.email`** — no FK, no join, no resolver. A `/claim` submission and a `/signup` profile from the same person are two disconnected rows.
- **`claim_submissions.atlas_roles[]` ↔ `atlas_roles.role_id`** — no FK, no validation. The server accepts any string ≤50 chars (`route.ts:139-140`); the client constrains to the hardcoded 35-code map in `ClaimForm.tsx:6-41`.
- **`profiles` ↔ `atlas_roles`** — no column on profiles references atlas_roles. Step 3 §F.1 finding (`docs/audit/STEP_3_DISCOVERY.md:103-122`) holds at HEAD: no `profiles.atlas_role_id`, `profiles.primary_role`, `profiles.claimed_role_id` columns.
- **`proof_receipts.atlas_claimed/inferred/confirmed[]` ↔ `atlas_roles`** — text array stored, no DB-level FK; integrity enforced only at write time in `publish.ts:120-132`.
- **No `claim_submissions` → `profiles`/`entities`/`proof_receipts` bridge** — a vetted+routable claim does not flow into any existing row in those tables. Manual workflow only.

---

## SECTION 2 — /paste + CLASSIFIER PIPELINE

### 2.1 Verified end-to-end trace (incorporated from prior cycle)

The atlas-classifier path was traced end-to-end in the prior cycle. Findings re-verified at HEAD by grep:

- **Entry point:** `classifyAtlasRoles()` at `src/services/atlas-classifier/index.ts:207-239`. Input `AtlasClassifierInput` (`:66-73`): `{event_type, title, description, artifacts[], stack[], capabilities[]}`. Output `AtlasClassifierResult` (`:75-80`): `{inferred[], confidence, reasoning, classifier_version}`. Single Anthropic API call (`claude-sonnet-4-6`, `:36`) with strict `tool_use` (`:42-64`). System prompt loaded once at module init from `prompts/v0.1.0.md` (`:86-103`). Hallucinated role IDs filtered against the v0.4 ID list parsed from the prompt (`:92-96`).
- **Sole production caller:** `src/app/paste/actions.ts:42` inside the Server Action `createPasteDraft` (`actions.ts:33-61`). Triggered when a logged-in user submits a URL in `/paste` after analyzer returns.
- **NOT invoked in any signup/onboarding flow.** Re-verified: zero hits across `src/app/login/`, `src/app/api/auth/`, `src/app/api/magic-link/`, `src/app/api/github/`, `src/app/api/welcome/`, `src/app/welcome/`, `src/app/join/`, `src/app/dashboard/`.
- **Persistence:** classifier output stashed in Upstash Redis as draft (`actions.ts:51-58`); on user-confirmed publish from `/paste/review`, `publishProofReceipt()` at `src/lib/paste/publish.ts:165-404` writes one row to `proof_receipts` with columns `atlas_claimed/inferred/confirmed text[]`, `atlas_confidence`, `classifier_version`, `classified_at` (publish.ts:234-239), plus `classifier_reasoning` in `ingestion_metadata` jsonb (`:244`).
- **Profile→role linkage:** NONE direct. Indirect via the 3-hop chain `profiles ← entity_id ↔ profile_id → entities ← subject_id → proof_receipts.atlas_*[]`. Currently empty: `proof_receipts` has **0 rows** at HEAD.
- **Live vs. vestigial inventory:** `classifyAtlasRoles()` LIVE · `loadPrompt()` LIVE · `getAtlasRoles()` (in `roles.ts:50`) LIVE (called from `paste/review/page.tsx:34` and `paste/publish.ts:121`) · `getAtlasVersion()` (`roles.ts:55`) DEAD · `scripts/generate-classifier-prompt.ts` LIVE-but-manually-invoked · `scripts/test-atlas-classifier.ts` test-harness.

### 2.2 The analyzer (NEW — gap-fill from spec §29)

The `/paste` pipeline has THREE distinct stages, of which the LLM atlas-classifier is the third. The first two stages have their own implementations.

**Stage 1: URL classifier (source/event-type guess)** — `src/lib/paste/classifier.ts` (file exists; full impl not read this pass). Used by `src/app/api/paste/classify/route.ts:21-24` (`classifyUrl, validateUrl, InvalidUrlError`). The route at `/api/paste/classify` (header at `route.ts:2-7`): receives URL → validates → cache-checks via Upstash Redis (`route.ts:100`) → calls `classifyUrl(parsed)` (`route.ts:106`). Returns `ClassifyResult` with `event_type_candidate` + source guess. **TAG: LIVE.** Note: the file is named "classifier" but is NOT the atlas-classifier — it classifies a URL's *source* (`github | lovable | bolt | v0 | replit | vercel | netlify | mcp_server | generic` per `publish.ts:67-69`) and proposes an `event_type`.

**Stage 2: Analyzer (per-source extractor)** — `src/lib/paste/analyzer.ts` (file exists; per `src/app/api/paste/analyze/route.ts:14-15` imports `ClassifierMetadata`, `InvalidUrlError`, `validateUrl`). The route at `/api/paste/analyze` (header at `route.ts:4-15`): "Given a URL + the classifier's source guess + the classifier's already-extracted metadata, runs the per-source extractor and [returns `AnalyzeResponse`]." Output goes into `AnalyzeResponse` (`actions.ts:19` imports `AnalyzeResponse` from `@/lib/paste/analyzer`) — contains `title_draft`, `description_draft`, `artifacts`, `stack`, `capabilities` (per the field-by-field consumption in `actions.ts:42-49`). **TAG: LIVE.**

**Stage 3: Atlas classifier (LLM role mapper)** — `src/services/atlas-classifier/index.ts` (already covered in §2.1).

Pipeline shape: `URL → /api/paste/classify (source/event guess) → /api/paste/analyze (extract artifacts/stack/capabilities) → createPasteDraft Server Action → classifyAtlasRoles (LLM → role IDs) → Redis draft → /paste/review (user edits) → /api/paste/publish → publishProofReceipt → proof_receipts row + verification_event + ingestion_log + capabilities_vocab bumps`.

### 2.3 The prompt ↔ DB-snapshot coupling (NEW — gap-fill)

The locked prompt file `src/services/atlas-classifier/prompts/v0.1.0.md` is the source-of-truth the LIVE classifier reads at module init (`index.ts:90-92`). It is regenerated FROM the `atlas_roles` DB rows via `scripts/generate-classifier-prompt.ts`:

- Script reads `.env.local`, opens service-role Supabase client (`script:50-52`).
- Queries `.from('atlas_roles').select('role_id, cluster, name, short_description').eq('atlas_version', ATLAS_VERSION)` (`script:55-58`) — value `ATLAS_VERSION = 'v0.4'` (`script:16`).
- Sorts results by cluster letter then numeric suffix (`script:32-38`), renders into a `- **<role_id>** — <name>. <short_description>` markdown table (`script:39-42`), substitutes into the `[ROLE_TABLE]` placeholder of `prompts/_template.md` (`script:73-77`), and writes to `prompts/<VERSION>.md` (`script:78-79`).
- Manual invocation: `node --env-file=.env.local scripts/generate-classifier-prompt.ts` (per `src/services/atlas-classifier/README.md:23-43`).

Coupling discipline (per `README.md:18-22`): the prompt is "hand-baked" — generated once per Atlas version and committed. The LIVE classifier never queries `atlas_roles` at runtime; it reads only the committed `prompts/v0.1.0.md` snapshot. This makes the classifier reproducible across deploys but means DB reseeds do NOT auto-propagate to the classifier (a manual regen + commit is required).

**Constants in this stack:** `CLASSIFIER_VERSION = 'claude-classifier-v0.1.0'` (`index.ts:22`); `PROMPT_FILE = 'v0.1.0.md'` (`index.ts:23`); `ATLAS_VERSION = 'v0.4'` in two places — `scripts/generate-classifier-prompt.ts:16` and `src/services/atlas-classifier/roles.ts:16` (both are the same misleadingly-named landmine const tracked separately in §8 and the held rename re-scope).

---

## SECTION 3 — SIGNUP / ONBOARDING

### 3.1 End-to-end path

**A. Account creation (auth.users row):**
- `/signup` page (`src/app/signup/`) — entry surface (file not read this pass beyond directory presence; ambiguous — needs deeper trace for exact form fields).
- Auth options: magic-link via `/api/magic-link/route.ts` + `/api/auth/confirm/route.ts`; GitHub OAuth via `/api/github/connect/route.ts` + `/api/github/callback/route.ts:215`; client magic-link via `/api/client-magic-link/route.ts`.
- Result: a row in `auth.users` (Supabase Auth schema, opaque from app code).

**B. Profile creation (the `/join` step):**
- `/join` page (`src/app/join/page.tsx`) — checks for existing profile by email (line 65) and redirects to `/dashboard` if found.
- If no profile, user fills the multi-step form. On submit (`page.tsx:77-105`), client-side INSERT into `profiles` with these fields (`page.tsx:89-103`):
  ```ts
  {
    user_id: user.id,             // ← FK to auth.users.id
    email: user.email,
    username: generatedUsername,  // ← derived: lowercased fullName regex-stripped to [a-z0-9], sliced 20 chars, suffix = Math.floor(Math.random() * 900) + 100
    full_name: fullName.trim(),
    role: role.trim(),            // ← FREE TEXT (e.g. "AI Engineer") — not Atlas role
    location: location.trim() || null,
    bio: bio.trim(),
    github_url: githubUrl.trim() || null,
    x_url: xUrl.trim() || null,
    published: true,              // ← AUTO-SET TRUE on signup
    verified: false,              // ← false until admin verifies
    accepts_project_inquiries: true,
    velocity_score: 0,
  }
  ```
- Optional first build post inserted if `projectTitle.trim() && projectOutcome.trim()` (`page.tsx:108-118`) → `posts` row.
- Optional skills inserted from `selectedUseCases + selectedAITools + selectedFrameworks + selectedDomains` (`page.tsx:121-127`) → `skills` rows.
- Triggers welcome email via `fetch('/api/welcome', POST)` (`page.tsx:131-136`).

**C. Welcome email:**
- `src/app/api/welcome/route.ts` requires authenticated session matching the email being welcomed (`:9-14`). Sends a Resend email with subject "Your ShipStacked profile is live 🎉" (`:20`) and adds the contact to a Resend audience segment (`RESEND_SEGMENT_BUILDERS` env var, `:42-44`). **TAG: LIVE.**

**D. Tier 1 entity backfill (manual cohort only):**
- `scripts/v2/backfill-entities.ts` (admin script, manual). For approved profiles, creates an `entities` row with `slug = profile.username` (verbatim, per AGENTS.md invariant #1) and back-links `profiles.entity_id = entity.id` (`:158,201`). Result on prod: 17 profiles have `entity_id`. The 50 other published+unpublished profiles have NULL `entity_id` — entity-linkage is lazy: `findOrCreateHumanEntity()` in `src/lib/entities.ts` (called from `publish.ts:179`) creates the entity on first `/paste/publish` for any non-backfilled user, deriving slug from `user_metadata.full_name` (not from username — flagged in `SITE_AUDIT_2026-05-16.md:14` as a critical V1/V2 disconnect risk for non-backfilled users).

### 3.2 Field census — structured vs. freetext

Of 34 `profiles` columns (live introspection), structured fields are: `id`, `user_id`, `email`, `username`, `entity_id` (FK + UUIDs + system bools/timestamps), `published`, `verified`, `accepts_project_inquiries`, `featured`, `github_connected`, `hire_count` (numeric counter), `velocity_score` (numeric), `profile_views` (numeric), `last_seen_at`, `created_at`, `featured_order`, `languages` (array — ambiguous — needs deeper trace for whether typed array or free).

**The `profiles.role` column is FREE TEXT.** Set by user in `/join` step 0 (`page.tsx:73`) and editable in `/dashboard/edit` (`EditProfileForm.tsx:232`). Example values per audit: "AI Automation Engineer" etc. NO validation against `atlas_roles.role_id`. NO FK. NO normalization. This is the V1 self-describing job title; it is NOT an Atlas role.

Other freetext: `full_name`, `bio`, `about`, `availability`, `location`, `primary_profession`, `seniority`, `work_type`, `day_rate`, `timezone`, `avatar_url`, all `_url` columns. Per audit, the only enums/constrained columns are `published bool`, `verified bool`, `accepts_project_inquiries bool`.

### 3.3 Confirmation per the brief's question

**Does a freshly signed-up profile have an Atlas-role association?** **NO.** Verified by:
- No `profiles.atlas_role_id` column exists (live introspection; the 34-column list contains no atlas-typed field).
- The signup INSERT at `join/page.tsx:89-103` writes no Atlas-related field.
- No code path between signup and any Atlas role mechanism (atlas-classifier is `/paste`-only; `/claim` writes only `claim_submissions` and has no bridge to `profiles`).
- The free-text `profiles.role` column may contain a role-flavored string (e.g. "AI Engineer") but is not structurally linked to the Atlas taxonomy.

A profile gains an Atlas role association ONLY by publishing a `/paste` proof receipt, and only at the per-receipt level (each receipt's `atlas_confirmed[]`). At HEAD, `proof_receipts` has 0 rows, so **0 profiles have any structured Atlas-role association**.

---

## SECTION 4 — /claim PIPELINE

### 4.1 Verified end-to-end trace (incorporated from prior cycle)

The /claim path was traced end-to-end in the prior cycle. Re-verified at HEAD:

- **Front-end:** `src/app/claim/page.tsx` (220 lines) renders hero + form mount + Atlas preview footer. `src/app/claim/ClaimForm.tsx` (731 lines, `'use client'`) — controlled form. Fields: name (required), email (required, contains @), location (optional), 4 URL fields (optional, http?:// validated), **atlas_roles** (multi-select from hardcoded 35-code map at `ClaimForm.tsx:6-41`, ≥1 required), verticals (optional, 9 hardcoded options), domain_practitioner (optional bool), domain_field (revealed if true), proof_of_work (textarea, ≥100 ≤3000), engagement_modes (≥1 from 5 hardcoded options), comp_expectation (optional), notes (optional).
- **Submit** (`ClaimForm.tsx:323-375`): POST JSON to `/api/intakes/claim`; on `{ok:true}` → `router.push('/claim/thanks')`.
- **API handler** (`src/app/api/intakes/claim/route.ts:103-331`): validates 15 fields (`:131-150`) → rate-limit 3/email/day (`:154`) → INSERT one row into `claim_submissions` (`:170-192`) → fire 2 Resend emails (auto-response to claimant `:205-230`, internal notification to `INTAKE_NOTIFY_EMAIL` `:268-306`) → return `{ok:true}` (`:323`).
- **Thanks page:** `src/app/claim/thanks/page.tsx` (157 lines, static, `robots: { index: false, follow: true }`).
- **No writes anywhere else.** No `profiles`, no `entities`, no `proof_receipts`, no `atlas_roles`. Only writes `claim_submissions`. Re-confirmed by full repo grep: only writer is `route.ts:171`.
- **`atlas_roles` text[] is opaque** to the server validation (`route.ts:139-140` accepts any string ≤50 chars); client constrains to the hardcoded 35-code map; no FK to `atlas_roles` table.
- **`claim_submissions` schema:** NOT in `supabase/migrations/`. Per AGENTS.md, applied via Dashboard SQL Editor. Authoritative column list from audit + live introspection (this pass): `id, created_at, name, email, location, linkedin_url, github_url, twitter_url, website_url, atlas_roles text[], verticals text[], domain_practitioner, domain_field, proof_of_work, engagement_modes text[], comp_expectation, notes, status, thomas_notes, vetted_at, routable, user_agent, referrer`. The `status, thomas_notes, vetted_at, routable` columns are NEVER written by the API handler — manual-vetting-only.
- **Notification email links to `${siteUrl}/admin/intakes` (`route.ts:300`).** This admin route DOES NOT EXIST in the codebase (re-verified — see §4.2). Dead link in production emails.
- **Live data:** 2 rows total, both `email='ox@agentagous.com'`, both `status='new'`, both `routable=false`, both Thomas test data (`name='Test Claimer'`, `name='End To End Claim Test'`). **0 routable claims.**

### 4.2 Re-verification at HEAD — `claim_submissions` readers (NEW — gap-fill from spec §4)

Full repo grep on `claim_submissions` at HEAD returns exactly **2 hits**, both in the WRITER file:

```
src/app/api/intakes/claim/route.ts:171:      .from('claim_submissions')
src/app/api/intakes/claim/route.ts:195:      console.error('claim_submissions insert error:', insertError)
```

Zero `.select` against `claim_submissions`. Zero admin UI components reading it. Zero scripts in `scripts/` enumerate or process it. Zero MCP tools expose it. **No in-code consumer exists at HEAD.**

Full repo grep on `routable` returns exactly **3 hits**, all copywriting strings in the /claim front-end + email body (`route.ts:216`, `ClaimForm.tsx:726`, `thanks/page.tsx:136`). Zero queries reference the `routable` column.

`/admin/intakes` is referenced exactly **once** in code: as a URL string in the notification email body (`src/app/api/intakes/claim/route.ts:300`). The corresponding route does not exist — `find src/app/admin -type d` returns only `src/app/admin`, `src/app/admin/candidates`, `src/app/admin/candidates/import`. There is no `intakes/` subdirectory and no `/admin/intakes/page.tsx`. The link 404s.

**The "no consumer of `routable=true`" finding holds at HEAD.** The routable supply pool exists as a `bool` column with no programmatic reader; the only access path is direct DB query via Supabase Studio.

### 4.3 Essay-vs-reality gap (incorporated)

Atlas essay claim: *"/claim is the structural mechanism by which practitioners self-classify into the routable supply pool."*

| Essay component | Implementation reality at HEAD |
|---|---|
| "self-classify" | ✅ Captured. Multi-select of 35 Atlas codes, stored as `claim_submissions.atlas_roles text[]`. |
| "routable supply pool" | ⚠️ A `routable bool default false` column exists, manually flipped by Thomas via Supabase Studio. **0 in-code readers; 0 rows currently routable.** |
| "structural mechanism" | ❌ Gap. Captured data has no programmatic use beyond email notification + manual DB-Studio triage. No bridge to `profiles`/`entities`/`atlas_roles`/`proof_receipts`. |

---

## SECTION 5 — ATLAS ESSAY / TAXONOMY PIPELINE

### 5.1 Stages, end to end

```
docs/v2/ATLAS_V05.md  +  src/content/atlas-v05.md       ← essay source (post-ab12d9a)
src/content/atlas-v04.md                                 ← essay source (Option β stable)
       │
       │  (manual: copy → src/content/<file>.md per the Option β / Option γ cycle)
       │
       ▼
src/app/atlas/page.tsx:567 (path) → renders the v0.5 essay body to /atlas (○ prerender)
       │
       ├── chrome strings (hardcoded literals):
       │     L608  "Version 0.5 — Practitioner-defined"  (header chip)
       │     L718  "This is v0.5"                         (footer)
       │     L46   "v0.5 —…" alternativeHeadline (DEAD CODE in unused buildJsonLd)
       │
       └── DefinedTermSet (the controlled-vocabulary entry-point):
             L577  const ATLAS_VERSION = 'v0.4'          ← role-taxonomy version (NOT essay)
             L582  .eq('atlas_version', ATLAS_VERSION)   → atlas_roles DB query
             L585  buildAtlasDefinedTermSetJsonLd(ATLAS_VERSION, roleIds)
                                          (src/lib/jsonld/atlas-article.ts:78-93)
                                                ↓
                  JSON-LD: @id = .../atlas?v=v0.4 + hasDefinedTerm[40 × /atlas/roles/X?v=v0.4]

scripts/seed-atlas-roles.ts                              ← parses src/content/atlas-v04.md
       │                                                   and inserts atlas_roles rows
       ▼
atlas_roles table (74 rows: 40 v0.4 + 34 v0.3)
       │
       ├── /atlas/roles/[id]/page.tsx           ← per-role page (read at HEAD)
       │   src/app/api/atlas/roles/[id]/jsonld/route.ts
       │     L16 imports ATLAS_VERSION_DEFAULT
       │     L37 `version = v && isValidAtlasVersion(v) ? v : ATLAS_VERSION_DEFAULT`
       │
       ├── /llms.txt route
       │   src/app/llms.txt/route.ts:15,64 (.eq('atlas_version', ATLAS_VERSION_DEFAULT))
       │
       ├── MCP role tools
       │   src/lib/mcp/tools.ts:31 imports ATLAS_VERSION_DEFAULT; :201 `void` (unused-import suppression)
       │
       ├── Beacon 4 package — packages/atlas-roles/
       │   src/index.ts:17 export const ATLAS_VERSION_DEFAULT: AtlasVersion = 'v0.4'
       │   src/index.ts:20 export const ATLAS_VERSIONS = ['v0.3','v0.4']
       │   scripts/build.ts:43,71,74 (binds package.json version to ATLAS_VERSION_DEFAULT)
       │
       └── atlas-classifier prompt regen
           scripts/generate-classifier-prompt.ts:58 (.eq('atlas_version', ATLAS_VERSION))
                 → src/services/atlas-classifier/prompts/v0.1.0.md (LIVE classifier reads)
```

### 5.2 ALL `ATLAS_VERSION`-class version-coupling points (every site)

Two distinct identifiers — disambiguated:

**Identifier `ATLAS_VERSION` (bare — the misleading-name landmine, 3 sites, all value `'v0.4'`)** — TAG: LIVE in each, identical role-taxonomy semantics, file-private `const`, NOT exported:

| File | Line | Reference | What it does |
|---|---|---|---|
| `src/app/atlas/page.tsx` | 577, 582, 585 | local const + 2 uses | DB query + DefinedTermSet `@id ?v=` param for the /atlas page |
| `scripts/generate-classifier-prompt.ts` | 16, 54, 58, 64 | local const + 3 uses | DB query in the prompt-regen script + log/error messages |
| `src/services/atlas-classifier/roles.ts` | 16, 56 | local const + 1 use | returned by `getAtlasVersion()` — which itself is DEAD (no callers anywhere; `getAtlasRoles()` in the same file IS live but doesn't reference the const) |

The held A/B/C/D rename re-scope decision concerns this identifier.

**Identifier `ATLAS_VERSION_DEFAULT` (the accurate name per spec, 3 sites)** — TAG: LIVE in each:

| File | Line | Role |
|---|---|---|
| `src/lib/atlas/roles.ts` | 13 | **canonical** — `export const ATLAS_VERSION_DEFAULT = 'v0.4'`, plus `ATLAS_VERSIONS = ['v0.3', 'v0.4']` at L14 |
| `packages/atlas-roles/src/index.ts` | 17 | **package mirror** — `export const ATLAS_VERSION_DEFAULT: AtlasVersion = 'v0.4'`. The Beacon 4 publish-ready package; build script (`packages/atlas-roles/scripts/build.ts:43-77`) asserts `package.json version === atlasVersionToSemver(ATLAS_VERSION_DEFAULT)` on every build |
| `src/schemas/proof-receipt-v0.1.ts` | 50 | **schema mirror** — `export const ATLAS_VERSION_DEFAULT = 'v0.4' as const;` (third independent copy — out of spec scope but worth recording). Used inside the proof-receipt zod schema package |

Consumer routes for `ATLAS_VERSION_DEFAULT`:
- `src/app/llms.txt/route.ts:15,64`
- `src/app/api/atlas/roles/[id]/jsonld/route.ts:16,37`
- `src/app/atlas/roles/[id]/page.tsx:8,39,41`
- `src/lib/mcp/tools.ts:31,201`
- `packages/atlas-roles/scripts/build.ts:43,71,74,76,77`

### 5.3 Atlas v0.5 essay current state (verified at HEAD)

- Essay body: `src/content/atlas-v05.md` (post-redaction sha256 `acb1e6c2378783251d3340fe8af1ad7f18a89ebec1452bf9b00a3111d4c73f2a`).
- Source pre-redaction copy: `docs/v2/ATLAS_V05.md` (same sha256).
- `src/content/atlas-v04.md` still exists, byte-unchanged from pre-Atlas-v0.5 cycle — feeds the seed script + Beacon 4 package + remains historically queryable as v0.4 essay.
- The v0.4 role taxonomy is THE published machine-readable contract; v0.5 essay sits over it. DefinedTermSet on prod = 40 hasDefinedTerm @ids all at `?v=v0.4` (verified by live curl during the v0.5 ship verification).

---

## SECTION 6 — DISCOVERY / OUTPUT SURFACES

### 6.1 Single-source-of-truth markup builders (Beacon 1 pattern)

| Builder | File | Purpose | Consumers | Tag |
|---|---|---|---|---|
| Person JSON-LD | `src/lib/jsonld/person.ts` (220 lines) | The Noah-gateway-critical Person emitter. Person `@id` = canonical profile URL (matches V2 receipt author `@id`). For 17 entity-linked builders, emits `identifier = entity external_id` per Step 3 B-1; for the rest, fallback identifier `shipstacked:profile:<username>` (per `12adb4c` commit + B-1 spec). | `src/app/u/[username]/page.tsx` (imports `buildPersonJsonLd` at L7) | **LIVE** |
| Atlas Article JSON-LD | `src/lib/jsonld/atlas-article.ts` (93 lines) | Article + DefinedTermSet for `/atlas`. `alternativeHeadline = "v0.5 —…"` post-Q3 of v0.5 ship. `buildAtlasDefinedTermSetJsonLd(atlasVersion, roleIds)` at L78-93. | `src/app/atlas/page.tsx:13,576` (single consumer) | **LIVE** |
| Organization JSON-LD | `src/lib/jsonld/organization.ts` (44 lines) | Site-wide `Organization` markup. | `src/app/layout.tsx` (per AGENTS.md invariant #5 — emitted site-wide) | **LIVE** |
| WebSite JSON-LD | `src/lib/jsonld/website.ts` (35 lines) | Homepage-only `WebSite` markup. | `src/app/page.tsx` (per AGENTS.md invariant #5) | **LIVE** |
| Article JSON-LD (generic) | `src/lib/jsonld/article.ts` (file present; not read this pass) | Generic Article markup. | ambiguous — needs deeper trace | LIVE (presumed) |
| Employer Org JSON-LD | `src/lib/jsonld/employer-org.ts` | Employer-page Organization markup. | `src/app/employer/`/`/employers/` pages (ambiguous — needs deeper trace) | LIVE (presumed) |
| ItemList JSON-LD | `src/lib/jsonld/item-list.ts` | List collections. | ambiguous — needs deeper trace | LIVE (presumed) |
| JobPosting JSON-LD | `src/lib/jsonld/job-posting.ts` | Job page markup. | `src/app/jobs/` pages (ambiguous — needs deeper trace) | LIVE (presumed) |
| Receipt JSON-LD | `src/lib/receipts/jsonld.ts` (142 lines) | Per-receipt `CreativeWork`/Atlas role refs. Consumes `receipt.atlas_confirmed/inferred/claimed[]` at lines 74, 84, 95. | `src/app/p/[slug]/page.tsx`; `src/app/api/p/[slug]/jsonld/route.ts` | **LIVE writer / 0 receipt rows** — wired but emits empty list because `proof_receipts` is empty |
| AgentCard | `src/lib/agent-card/builder.ts` (302 lines) | A2A v1.0 AgentCard. Sole writer; the route is a thin shell. | `src/app/.well-known/agent-card.json/route.ts` (thin shell at `:7-17`) | **LIVE** |
| MCP server | `src/lib/mcp/server.ts` (124 lines) + `src/lib/mcp/tools.ts` (201 lines) + `src/lib/mcp/schemas.ts` | Streamable HTTP MCP server, 2025-06-18 protocol. Tools are read-only (per BEACON_5 spec). | `src/app/api/mcp/route.ts` | **LIVE** |
| Consented Collections | `src/lib/collections/assemble.ts` (214 lines) — `getConsentedCollection(slug)` single-source; `jsonld.ts` (57), `csv.ts` (63) derive from it | One assembly query → HTML+JSON-LD+CSV (per AGENTS.md invariant #5) | `/collections/[slug]/page.tsx`; `/api/collections/[slug]/jsonld`; `/api/collections/[slug]/csv` | **LIVE schema, 0 rows in `collections` table** |

### 6.2 Discovery routes

| Route | File | Emits | Source data | Tag |
|---|---|---|---|---|
| `/u/[username]` | `src/app/u/[username]/page.tsx` | Builder profile HTML + Person JSON-LD + skills/projects/posts/github | `profiles`, `skills`, `projects`, `github_data`, `posts`, `proof_receipts` (atlas_confirmed chips at `:436-438`) | **LIVE** (renders for 41 published builders) |
| `/p/[slug]` | `src/app/p/[slug]/page.tsx` | Receipt page + Receipt JSON-LD | `proof_receipts` + `verification_events` + `attestations` via `getReceiptBundle` | **LIVE route, 0 receipts** — every request 404s |
| `/atlas` | `src/app/atlas/page.tsx` | Long-form essay (atlas-v05.md) + Article JSON-LD + DefinedTermSet (40 role refs) | `src/content/atlas-v05.md` + `atlas_roles WHERE atlas_version='v0.4'` | **LIVE** |
| `/atlas/roles/[id]` | `src/app/atlas/roles/[id]/page.tsx` | Per-role page + DefinedTerm JSON-LD | `atlas_roles` row by `role_id` + `atlas_version` query param (default = `ATLAS_VERSION_DEFAULT` = `v0.4`) | **LIVE** |
| `/api/atlas/roles/[id]/jsonld` | `src/app/api/atlas/roles/[id]/jsonld/route.ts` | DefinedTerm JSON-LD as standalone resource (content-negotiation projection) | same as above | **LIVE** |
| `/api/p/[slug]/jsonld` | `src/app/api/p/[slug]/jsonld/route.ts` | Receipt JSON-LD as standalone (.json suffix middleware-rewritten) | `proof_receipts` | **LIVE route, 0 data** |
| `/collections/[slug]` | `src/app/collections/[slug]/page.tsx` | Collection HTML | `collections` + memberships | **LIVE route, 404 always** — 0 collections defined |
| `/api/collections/[slug]/jsonld` | same family | Collection JSON-LD | same | **PARKED** — no slug to query |
| `/api/collections/[slug]/csv` | same family | Collection CSV | same | **PARKED** |
| `/.well-known/agent-card.json` | `src/app/.well-known/agent-card.json/route.ts` | A2A AgentCard JSON | `src/lib/agent-card/builder.ts` (static + queries) | **LIVE** (verified by `scripts/v2/verify-agent-card.ts`) |
| `/api/mcp` | `src/app/api/mcp/route.ts` | MCP Streamable HTTP JSON-RPC | tools at `src/lib/mcp/tools.ts` | **LIVE** (verified by `scripts/v2/verify-mcp.ts`) |
| `/llms.txt` | `src/app/llms.txt/route.ts` | LLM discovery markdown — header + Atlas role URLs + recent public receipts | `atlas_roles WHERE atlas_version=ATLAS_VERSION_DEFAULT`; `getRecentPublicReceipts` (proof_receipts, 0 rows) | **LIVE route, recent-receipts list empty** |
| `AGENTS.md` (root file) | `/AGENTS.md` (loaded by Claude via `CLAUDE.md → @AGENTS.md`) | Agent guidance (operational, not output) | static text | **LIVE** |
| `/og` | `src/app/og/route.tsx` | OG image cards for builder / company / job / receipt | `profiles`, `employer_profiles`, `jobs`, `proof_receipts` | **LIVE** |

### 6.3 What currently consumes profile/role data and emits to discoverable surfaces

The existing discoverability surface — what a future routing build could extend instead of duplicating:

- **`/u/[username]` HTML + Person JSON-LD** — already emits per-builder structured data (incl. skills, projects, GitHub linkage, free-text role, sameAs URLs). 41 published profiles currently. NO Atlas-role emission because no schema linkage (Step 3 §F.1).
- **`/feed`** — published-gated build feed (`src/app/feed/page.tsx:21-27`).
- **MCP `/api/mcp`** — `get-builder` tool returns full profile by username; no-oracle property holds (`scripts/v2/verify-mcp.ts`).
- **AgentCard `/.well-known/agent-card.json`** — declares the discovery surfaces machine-readably; `verify-agent-card.ts` CURLs every declared URL.
- **`/llms.txt`** — LLM crawl-discovery surface; lists Atlas role URLs + (empty) recent receipts.

Atlas roles only enter these surfaces via `proof_receipts.atlas_confirmed[]` (currently 0 rows) or via the per-role pages at `/atlas/roles/[id]` (which are role-pages, not builder-pages).

---

## SECTION 7 — WHAT THIS ENGAGEMENT SHIPPED (real-code verification)

Each commit verified by `git log -1 --format='%s' <sha>` + spot-check of the claimed code present in the working tree:

| SHA | Commit subject | Code verified present | Tag |
|---|---|---|---|
| `0ceb69a` | feat(v2): Beacon 1 — Schema.org JSON-LD across V1 pages (additive) | `src/lib/jsonld/{person,organization,website,article}.ts` present + consumed in pages | **LIVE** |
| `a7822d7` | feat(v2): Consented Collections — permanent platform feature | `supabase/migrations/20260516162601_consented_collections.sql`; `src/lib/collections/*.ts` (8 files); `src/app/collections/[slug]/`; `src/app/api/collections/[slug]/*` (5 endpoints); `scripts/v2/create-collection.ts`, `mint-consent-token.ts` | **LIVE code / 0 data (no collection ever defined)** |
| `1e9c81a` | feat(v2): Tier 1 merge — unify V1 profiles ↔ V2 entities | `supabase/migrations/20260516142038_merge_profiles_entities_link.sql`; `scripts/v2/backfill-entities.ts`; `src/lib/entities.ts` `findOrCreateHumanEntity` | **LIVE** — 17 entities backfilled, 17 profiles with `entity_id` |
| `859dd01` | chore: retire 24 seed jobs (soft-delete + 308 → /jobs), remove fabricated hires badge | `src/app/jobs/[id]/page.tsx` (`notFound()` + `permanentRedirect('/jobs')` per AGENTS.md drift caveat); homepage badge edit (ambiguous — needs deeper trace for current `>=10? :10` floor) | **LIVE** (per AGENTS.md drift caveat — historical 308 behavior changed; current code is what file says) |
| `f47a347` | feat(v2): Beacon 2 — /.well-known/agent-card.json (A2A v1.0) | `src/app/.well-known/agent-card.json/route.ts`; `src/lib/agent-card/builder.ts` (302 lines); `scripts/v2/verify-agent-card.ts` (with the 15-token `BRAND_ALLOWLIST_FORBIDDEN` at :56-73) | **LIVE** |
| `c2502fa` | docs(v2): Beacon 3 — AGENTS.md at repo root | `/AGENTS.md` (current root file, referenced by `CLAUDE.md → @AGENTS.md`) | **LIVE** |
| `2464bee` | feat(v2): Beacon 4 — @shipstacked/atlas-roles publish-ready (NOT published) | `packages/atlas-roles/{package.json, scripts/{build,verify}.ts, src/{index,types,jsonld}.ts, src/data/roles-v0.{3,4}.ts, dist/, README.md, LICENSE}` | **LIVE (publish-ready, not on npm)** |
| `5f1a875` | feat(v2): Beacon 5 — MCP server at /api/mcp (Streamable HTTP 2025-06-18) | `src/app/api/mcp/route.ts`; `src/lib/mcp/{server,tools,schemas}.ts`; `scripts/v2/verify-mcp.ts` | **LIVE** |
| `a653262` | docs(audit): Tier 4 — reconciliation record + audit-trail (Phase A only) | docs-only commit (the working tree shows `docs/audit/*` files untracked here — reconciliation docs are out-of-history-tracking) | **LIVE (docs)** |
| `551baff` | fix(security): rotate hardcoded CRON_SECRET to env (fail-closed) | `src/app/api/hire-confirm/nudge/route.ts:7,12-15` shows `CRON_SECRET = process.env.CRON_SECRET` + fail-closed gate | **LIVE** |
| `0c855df` | docs(audit): F.3 -> RESOLVED — CRON_SECRET rotation proven on prod | docs-only | **LIVE (docs)** |
| `781b543` | feat(discovery): Step 2 — announce /api/mcp in AgentCard + AGENTS.md + llms.txt | AgentCard `skills[]` includes MCP; AGENTS.md references MCP; `/llms.txt` (ambiguous — needs deeper trace for full announce text) | **LIVE** |
| `12adb4c` | feat(jsonld): Step 3 B-1 — Person identifier fallback for builders without entity link | `src/lib/jsonld/person.ts:10-14` docstring says "For the 17 Tier-1-backfilled builders … `identifier` carries the V2 entity external_id" → the fallback for builders without entity_id is `shipstacked:profile:<username>` | **LIVE** |
| `00db498` | docs(legal): Privacy + Terms partner-discovery delta — closes §4 contradiction | `src/app/privacy/page.tsx:153,155` includes "Discovery and hiring partners" paragraph; `src/app/terms/page.tsx:62-63` includes 4.5 subsection | **LIVE** |
| `ab12d9a` | feat(atlas): v0.5 essay over stable v0.4 role taxonomy | `src/content/atlas-v05.md` present; `src/app/atlas/page.tsx:567` reads `atlas-v05.md`; `src/lib/jsonld/atlas-article.ts:46` says `"v0.5 —…"`; `src/app/atlas/page.tsx:608,718` say `Version 0.5` / `This is v0.5`; `src/app/atlas/page.tsx:577 ATLAS_VERSION='v0.4'` preserved | **LIVE** |

All 15 commits present in code at HEAD; no divergence detected this pass.

---

## SECTION 8 — PARKED / DEAD / DEFERRED INVENTORY

### 8.1 Dead code in current source

- **`buildJsonLd` function at `src/app/atlas/page.tsx:40-71`** — local function, defined but never called (grep verified). Superseded by `buildAtlasArticleJsonLd` imported from `src/lib/jsonld/atlas-article.ts` at `page.tsx:13` and called at `:576`. TAG: **DEAD**.
- **`getAtlasVersion()` at `src/services/atlas-classifier/roles.ts:50-57`** (declaration line per file structure; `:55-57` actual function) — exported function with zero callers anywhere in the repo (grep verified across `--include="*.ts" --include="*.tsx"`). The companion `getAtlasRoles()` in the same file IS live. TAG: **DEAD EXPORT**.
- **`void ATLAS_VERSION_DEFAULT` at `src/lib/mcp/tools.ts:198-201`** — explicit suppress-unused-import marker. The import at `:31` exists but the value isn't consumed in current code paths; the `void` keeps tsc/lint quiet. TAG: **DEAD IMPORT (deliberately preserved as guard)**.

### 8.2 Identifier landmines (the 3-site ATLAS_VERSION)

Per §5.2, the bare `ATLAS_VERSION` identifier (file-private `const`) exists at 3 sites — `page.tsx:577`, `scripts/generate-classifier-prompt.ts:16`, `services/atlas-classifier/roles.ts:16`. All three hold value `'v0.4'` and all three are the role-taxonomy version (data-binding). The held A/B/C/D re-scope decision concerns these. TAG: **LIVE-but-trap** (renamed nothing pending decision).

### 8.3 Parked routes / surfaces

- **`/admin/intakes`** — referenced in `src/app/api/intakes/claim/route.ts:300` (notification email body). NOT BUILT (verified by `find src/app/admin -type d` — no `intakes/` subdir). The notification email's "Open in admin →" link 404s. TAG: **PARKED (dead URL in production emails)**.
- **`/api/intakes/hire`** — POST handler exists at `src/app/api/intakes/hire/route.ts`; writes `hire_intakes` (5 rows, all Thomas tests). No admin UI consumer; Thomas reviews via Supabase Studio. TAG: **LIVE writer / no in-code admin reader**.
- **Consented Collections — all 3 tables (`collections`, `collection_memberships`, `consent_tokens`)** — 0 rows each. Feature is fully built (schema + 5 API routes + assemble/jsonld/csv builders + admin scripts) but no collection has been defined. TAG: **PARKED — feature complete, zero data**.
- **`proof_receipts` ecosystem (`proof_receipts`, `verification_events`, `attestations`)** — 0 rows each. Schema + paste pipeline + verification scripts + receipt page + JSON-LD all exist; no real ingest has ever survived. TAG: **PARKED — pipeline complete, zero data**.
- **`/scout` (route exists per `src/app/api/scout/route.ts`)** — per audit (`SITE_AUDIT_2026-05-16.md:14`), was "410 Gone" stub; ambiguous — needs deeper trace whether still 410 at HEAD.
- **`candidates` table + `/admin/candidates` outreach queue** — 0 rows. Full admin queue UI + 4 API routes (`/api/admin/candidates/{draft,import,log,next}`) + Anthropic-haiku-based draft generator (`draft/route.ts:6`). TAG: **LIVE code / 0 data**.

### 8.4 Deferred items (per spec + per prior cycle escalations)

| Item | Origin | Tag |
|---|---|---|
| Option γ — full v0.5 role-infra (re-seed v0.5 atlas_roles + v0.5 DefinedTermSet + MCP v0.5 + Beacon 4 v0.5 + ATLAS_VERSION_DEFAULT='v0.5') | Atlas v0.5 ship §6 ESCALATION #2 | **DEFERRED (separate gated cycle)** |
| Step 3 C-1 — entity_id backfill for the 24 non-backfilled-but-published builders | Step 3 spec §C-C-1 | **DEFERRED (separate §6 sub-item, needs DDL + reversal SQL)** |
| Step 3 §F.1 — profile-level Atlas-role-linkage mechanism (DDL `profiles.atlas_role_id` + claim UI + Person hasOccupation rendering) | Step 3 discovery §F.1 (`docs/audit/STEP_3_DISCOVERY.md:265-272`) | **DEFERRED (separate spec, separate authorization)** |
| Beacon 4 npm publish (`@shipstacked/atlas-roles`) | Beacon 4 spec (built publish-ready, intentionally not published) | **DEFERRED (manual `npm publish` action)** |
| Part C notification email (announce Privacy/Terms partner-discovery delta to registered users) | `/tmp/delta-commit-msg.txt:85-100` (commit body) | **DEFERRED (separate task)** |
| ATLAS_VERSION rename (3-site defuse per `docs/v2/ATLAS_VERSION_RENAME_SPEC.md`) | This engagement's reconciliation backlog | **PENDING re-scope decision (A/B/C/D held)** |

### 8.5 Untracked documentation files

(per `git status --porcelain` at HEAD — these are docs written during the engagement that were not committed):

```
?? docs/audit/BEACON_1_DISCOVERY.md
?? docs/audit/BEACON_2_DISCOVERY.md
?? docs/audit/BEACON_3_DISCOVERY.md
?? docs/audit/GATEWAY_DISCOVERY.md
?? docs/audit/KILLERS_2026-05-16.md
?? docs/audit/SITE_AUDIT_2026-05-16.md
?? docs/audit/STEP_1_5_DISCOVERY.md
?? docs/audit/STEP_2_DISCOVERY.md
?? docs/handover/
?? docs/v2/PRIVACY_TERMS_PARTNER_DELTA.md
?? docs/v2/STEP_1_5_CRON_SECRET_SPEC.md
?? docs/v2/STEP_2_MCP_DISCOVERY_SPEC.md
?? docs/v2/STEP_3_PROFILE_ENRICHMENT_SPEC.md
?? docs/v2/TIER_0_SEED_JOBS_AND_BADGE_SPEC.md
?? docs/v2/TIER_1_MERGE_SPEC.md
?? docs/v2/TIER_3_BEACON_1_SCHEMA_ORG_SPEC.md
?? docs/v2/TIER_3_BEACON_2_AGENTCARD_SPEC.md
?? docs/v2/TIER_3_BEACON_3_AGENTS_MD_SPEC.md
?? docs/v2/TIER_3_BEACON_4_ATLAS_PACKAGE_SPEC.md
?? docs/v2/TIER_3_BEACON_5_MCP_SERVER_SPEC.md
?? docs/v2/TIER_3_FOUNDING_BETA_GATEWAY_SPEC.md
?? docs/v2/TIER_4_RECONCILIATION_SPEC.md
```

All exist in the working tree; none are git-tracked. TAG: **PARKED (untracked artifacts)**.

### 8.6 Operational anomaly worth flagging (not in spec sections; surfaced during count)

**`hire_confirmations`: 160 rows, all unconfirmed, all between same pair, all created 2026-05-17.**

All 160 rows have:
- `builder_email = '<redacted-email>'`
- `employer_email = 'oxleethomas+shipstacked@gmail.com'`
- `confirmed_at = null`
- `builder_confirmed = false`, `employer_confirmed = false`
- distinct `conversation_id` (160 different conversations)
- `nudge_sent_at` set (this run by the cron)
- `created_at` clustered in one second on `2026-05-17T09:09:33-34Z`

Caused by: the cron at `src/app/api/hire-confirm/nudge/route.ts:25-30` queries `conversations WHERE last_message_at < 14d ago AND employer_email IS NOT NULL`, dedups per-conversation via existing-row check (`:40-44`), then inserts. The 160 conversations meeting the criteria all happen to share the same `(builder_email, employer_email)` pair — apparently the same builder and same employer-test-account have 160 distinct conversation rows older than 14 days. This is a downstream symptom of conversations-table population, not a bug in the nudge cron itself.

Reader is `src/app/api/hire-confirm/count/route.ts:11-14`: counts only `confirmed_at IS NOT NULL` → returns 0 → homepage "10+ hires" badge displays the hardcoded floor of 10 (per audit `SITE_AUDIT_2026-05-16.md:135`).

TAG: **LIVE cron / FALSE-DATA accumulation**. Audit (2026-05-16) reported 0 rows; the 160 appeared today.

---

## SECTION 9 — THE ROUTABLE-POOL PATH (inventory only, NO recommendations)

Components that exist on the path from "vetted `claim_submissions` row" → "discoverable on a machine-readable / routable surface":

### 9.1 Existing pieces on the path

**A. Claim capture layer (LIVE):**
- `claim_submissions` table (live writer, 2 test rows) — captures: self-classified Atlas role codes (`text[]`, opaque), proof-of-work textarea, engagement modes, comp expectation, identity + URLs.
- `claim_submissions.routable bool default false` — manual-vetting flag column. Manually flipped via Supabase Studio.
- `claim_submissions.status, thomas_notes, vetted_at` — manual-vetting columns.

**B. Identity layer (LIVE — but disconnected from claims):**
- `auth.users` (Supabase Auth, ~131 users per audit).
- `profiles` (67 rows, 41 published) — V1 builder identity. `profiles.user_id → auth.users(id)`. Has `published bool`, `verified bool`. 34 columns.
- `entities` (17 rows) — V2 subject identity. `entities.owner_user_id → auth.users(id)`, `entities.profile_id → profiles(id)` (Tier 1, bidirectional).
- `entities.slug` verbatim = `profiles.username` (AGENTS.md invariant).
- `findOrCreateHumanEntity()` in `src/lib/entities.ts` — lazy entity creation on first `/paste/publish` (creates a duplicate if non-backfilled; `SITE_AUDIT_2026-05-16.md:14` flags this risk).

**C. Atlas taxonomy layer (LIVE):**
- `atlas_roles` table (74 rows: 40 v0.4 + 34 v0.3). PK `(role_id, atlas_version)`.
- Per-role pages at `/atlas/roles/[id]` + JSON-LD route.
- DefinedTermSet emission on `/atlas` (40 role refs at `?v=v0.4`).
- Atlas role IDs in proof_receipts emitted via `src/lib/receipts/jsonld.ts:74-96` (`atlas_claimed/inferred/confirmed` arrays).

**D. Per-receipt role-binding (LIVE writer / 0 data):**
- `proof_receipts.atlas_claimed/inferred/confirmed text[]` — per-receipt role assignments.
- `publish.ts:120-132 filterAtlasRoles()` validates role IDs against `getAtlasRoles()` (the prompt-parsed v0.4 list).
- Receipt JSON-LD includes role refs (`src/lib/receipts/jsonld.ts:74-96`).
- `/u/[username]:436-438` renders per-receipt role chips on the builder profile.

**E. Discoverability surfaces (LIVE):**
- `/u/[username]` (HTML + Person JSON-LD; 41 published profiles).
- `/api/mcp` `get-builder` tool (returns profile by username; no-oracle proven).
- `/.well-known/agent-card.json` (declares discoverable surfaces; verified by `verify-agent-card.ts`).
- `/llms.txt` (lists Atlas role URLs + recent public receipts).
- `/feed` (published-gated build feed).
- `/og` (per-profile OG cards including role text).
- AgentCard `skills[]` enumerates the machine surfaces.

**F. Permanent consent + grouping primitive (LIVE schema / 0 rows):**
- `collections` table + `collection_memberships` (per-profile-per-collection consent record with `opted_in_at`, `opted_out_at`) + `consent_tokens` (per-profile-per-collection single-use tokens).
- `/collections/[slug]` page family + 3 content-negotiation surfaces (HTML / JSON-LD / CSV).
- `scripts/v2/create-collection.ts` (admin).
- `scripts/v2/mint-consent-token.ts` (admin).
- 4-gate filter chain in `src/lib/collections/assemble.ts:50-66` enforces the published-gate + active-membership.

**G. Search / matching primitives that could be reused:**
- `capabilities_vocab` (4 fixture rows) — harvested-from-receipts open vocabulary.
- `skills` table (1,014 rows) — closed-vocab V1 tagging per profile.
- `profiles.role` free text — current self-described title.
- `proof_receipts.capabilities text[]` — per-receipt capability tags.

### 9.2 Absent bridges (the missing wires)

(stated as facts, no proposals):

- **`claim_submissions.email ↔ auth.users.email / profiles.email`** — no join, no resolver, no `auth.users` linkage from a claim.
- **`claim_submissions.atlas_roles[] ↔ atlas_roles.role_id`** — no FK, no validation, no normalization.
- **`claim_submissions ↔ profiles/entities/proof_receipts`** — no bridge of any kind. A routable claim and the same person's profile are two disconnected rows.
- **`profiles.atlas_role_id` / `profile_roles` join table** — does not exist (Step 3 §F.1).
- **No reader of `claim_submissions WHERE routable=true`** — the column is queryable only via direct DB SELECT.
- **No surface that aggregates "routable builders" — by role, by vertical, by engagement mode** — every existing builder-aggregation surface reads `profiles` (with the published-gate), not `claim_submissions`.
- **No matching algorithm** between any pair of (`claim_submissions`, `profiles`, `entities`, `proof_receipts`) that produces a "this builder fits this brief" output. Matching is currently in Thomas's head + Supabase Studio queries.
- **`hire_intakes` (5 rows, Thomas test data)** captures employer/hirer demand; **no programmatic link** between `hire_intakes` and `claim_submissions` or `profiles`. Demand-side and supply-side intake forms are both park-as-rows-in-tables-with-no-consumer.

### 9.3 What is already published machine-readably about a builder

For the 41 published profiles at HEAD, the following data is currently discoverable through ShipStacked's machine surfaces:
- Free-text `profiles.role` (e.g. "AI Automation Engineer") — emitted in Person JSON-LD + OG cards.
- Skills / projects / GitHub stats / build-feed posts.
- For the 17 entity-linked builders: V2 entity `external_id` as the Person `identifier` field.
- For all 41: a fallback `shipstacked:profile:<username>` identifier per Step 3 B-1.
- Per-receipt Atlas role IDs (currently empty — 0 receipts).

**The Atlas role IDs a builder might "self-classify" into via `/claim` are NOT emitted anywhere machine-readable about that builder today.** Even after vetting + routable-flip, that information lives only in the `claim_submissions` row.

---

## SECTION 10 — PLAIN-LANGUAGE SYSTEM SUMMARY

(derived strictly from §1–§9; no assumptions)

ShipStacked is a 2026-vintage Next.js 16 hiring platform with two co-existing data spines.

**Spine 1 (V1, the marketplace that actually has users):** A `profiles` table with 67 rows (41 published) is the builder identity. Users sign up via magic-link or GitHub OAuth, fill `/join` to create their profile (auto-published, with a free-text "role" string they pick themselves — NOT structurally tied to anything), and can subsequently edit it at `/dashboard/edit`, post to a build feed (`posts`, 73 rows), add skills (`skills`, 1,014 rows tagged across 6 categories), and connect GitHub for stats. Employers pay a Stripe subscription (`subscriptions`, 11 rows, 9 active — all Thomas test accounts per the 2026-05-16 audit), post jobs (`jobs`, 24 active), and message builders (`conversations`, 162; `messages`, 250). Hire outcomes are tracked by `hire_confirmations` — a cron sends "did you get hired?" emails 14 days after a conversation goes quiet, creating one row per conversation. The "10+ hires made" homepage badge counts `hire_confirmations WHERE confirmed_at IS NOT NULL`, which is currently 0; the badge displays a hardcoded floor of 10 instead. Today 160 unconfirmed nudge-rows accrued for one builder/employer pair from the cron firing on 160 distinct conversations between them.

**Spine 2 (V2, the new proof-of-work infrastructure):** Layered on top this engagement. Schema = `entities` (subjects of receipts, 17 rows, all Tier-1 backfilled from V1 profiles via the `1e9c81a` merge); `atlas_roles` (the canonical 40-role v0.4 + 34-role v0.3 taxonomy, served at `/atlas/roles/[id]`); `proof_receipts` (the atomic primitive — 0 rows ever survived in prod); plus `verification_events`, `attestations`, `capabilities_vocab`, `ingestion_log` (all empty or test-fixture residue). The `/paste` flow lets a logged-in builder paste a URL → a URL classifier guesses source + event type → a per-source analyzer extracts artifacts/stack/capabilities → an LLM "atlas-classifier" maps that to Atlas v0.4 role IDs (single Anthropic call, hand-baked prompt) → a Redis draft is created → the user reviews/edits → on publish, one `proof_receipts` row is written with the role IDs in `atlas_claimed/inferred/confirmed text[]` columns. Nobody has done this end-to-end-in-prod successfully yet; the only rows the receipts pipeline has ever produced were rolled back by verification scripts (`scripts/v2/verify-step-{6,7}.ts`).

**The Atlas essay** at `/atlas` is the human-readable manifesto describing 35+ AI-economy roles. It now renders the v0.5 essay body (post-`ab12d9a`) over the stable v0.4 role taxonomy. Each role is dereferenceable at `/atlas/roles/[id]`; the page emits an Article + DefinedTermSet JSON-LD pair, where the DefinedTermSet `@id` is `.../atlas?v=v0.4` and `hasDefinedTerm` references all 40 v0.4 role pages. This is the published machine-readable role taxonomy contract.

**Discoverability machinery** built this engagement: per-builder Person JSON-LD (`/u/[username]`), per-receipt CreativeWork JSON-LD (`/p/[slug]`, 0 receipts so always 404), an A2A AgentCard at `/.well-known/agent-card.json` declaring every machine surface, a read-only MCP server at `/api/mcp` with tools for `get-builder` and `get-atlas-role`, a dynamic `/llms.txt`, an AGENTS.md repo-root file, and a `@shipstacked/atlas-roles` npm package (built but never published). Every machine surface respects a "published-gate" (only `profiles.published=true` builders appear); 3 known fake profiles have `published=false` and are universally hidden. A "Consented Collections" primitive ships full schema + 3 tables + 5 API routes + HTML/JSON-LD/CSV emission, designed for opt-in subsets of builders accessible to authorized partners — but there are zero collections defined in the DB.

**The `/claim` form** lets anyone fill a 15-field intake describing which Atlas roles they claim to do plus proof-of-work text plus URLs. Submitting writes one `claim_submissions` row, sends two Resend emails (auto-response + internal-notification), and returns. Thomas then reviews via Supabase Studio and may set the row's `routable bool` to `true`. **No code reads the `routable` column, no surface consumes vetted claims, and there is no bridge of any kind from `claim_submissions` to the `profiles`/`entities`/`proof_receipts` graph.** A claim and the same person's signed-up profile are two disconnected rows joinable only by email — and no code joins them. The notification email links to `/admin/intakes`, which doesn't exist as a route. Current data: 2 claims, both Thomas test rows, both `routable=false`.

**Where the Atlas essay's stated intent stands relative to implemented reality:** the essay says "/claim is the structural mechanism by which practitioners self-classify into the routable supply pool." The form captures the self-classification (Atlas role codes stored as opaque text array). The "routable supply pool" exists as one `bool` column with no reader. The "structural mechanism" connecting captured claims to discoverable surfaces does not exist — the captured Atlas roles never become structured data emitted from any machine surface about any builder. A vetted+routable claim and the published builder profile remain two disconnected rows; no aggregation, no matching, no routing pipeline reads them together. The Step 3 §F.1 finding — "no profile-level role-linkage mechanism in the schema" — holds, and the `/claim` infrastructure does not bridge that gap. A future routing build would extend (not duplicate) the existing pieces inventoried in §9.1, traversing absent bridges (§9.2) to connect intake → identity → discoverability.

---

**HOLD.** This document is the authoritative architecture map as of HEAD `ab12d9a`. No decisions, no recommendations, no rename action. The ATLAS_VERSION rename re-scope (A/B/C/D) remains held per the prior cycle's instruction.

*End of map.*
