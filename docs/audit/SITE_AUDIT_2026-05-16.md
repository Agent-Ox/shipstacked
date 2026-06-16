<!-- Phase 7 §E (2026-06-16): original CRON_SECRET value rotated + redacted; historical context only. -->
# SHIPSTACKED — SITE AUDIT 2026-05-16

**Author:** Claude (Opus 4.7, 1M context) — read-only audit
**Date:** 2026-05-16
**Inputs:** six handover docs at `docs/handover/01_..06_*`; live codebase at `/Users/thomasoxlee/shipstacked` (HEAD: `151a59e`); live Supabase project `zkemkxwbijlyoitmrzvq` queried via service role
**Status:** read-only. No code touched. Temp DB-query scripts written to `/tmp` and removed.

> **Disambiguation note:** the V1 handover docs use "Step N" to refer to V1 development phases (1–8 of the original plan). The V2 build spec (`docs/v2/`) uses "Step N" to refer to the V2 spine (1–7, all shipped 2026-05-15). When this audit says "Step N", it is qualified as either **V1-phase** or **V2-spine**.

---

## EXECUTIVE SUMMARY

ShipStacked is a live V1 marketplace (67 builder profiles / 24 active job posts / 122 applications / 250 messages) running stably in production with **no revenue traceable in the database** — the 9 active `full_access` subscriptions are all `oxleethomas+...@gmail.com` test accounts and the "10+ hires made" homepage badge is a hardcoded floor (`hireCount >= 10 ? hireCount : 10`) over a `hire_confirmations` table that has **0 rows**. Layered on top this week is a V2 spine — 7 new tables (`entities`, `proof_receipts`, `verification_events`, `attestations`, `capabilities_vocab`, `ingestion_log`, `atlas_roles`), a `/paste` ingest UI, and dereferenceable `/p/[slug]` and `/atlas/roles/[id]` pages — all currently empty of real data (0 receipts, 0 entities; only 8 test-fixture `ingestion_log` rows). **The most important finding for the next session:** V1 `profiles` and V2 `entities` are completely disconnected — there is no FK and no resolver, so when an existing V1 builder (e.g. `/u/aniketaslaliya801`) logs in and uses the new `/paste` flow, `findOrCreateHumanEntity` creates a fresh duplicate `entities` row keyed by `auth.users.id`, derives a NEW slug from `user_metadata.full_name` (NOT from `profiles.username`), and returns an `entity_canonical_url` pointing at `/u/<entity.slug>` — a path that `src/app/u/[username]/page.tsx` resolves against the `profiles.username` column, so the URL will 404 unless the derived slugs happen to collide. V2 work this week did not modify `/u`, `/feed`, `/leaderboard`, `/hire`, `/claim`, `/jobs`, `/join`, or `/talent`; the only existing user-facing route that V2 did touch is `/atlas` (and the secondary additive touches: `/login` got an `actions.ts` for paste redirect, `middleware.ts` got JSON-LD content negotiation, `/llms.txt` was converted from static to dynamic, and `/api/og` got a receipt OG-card path). Total auth.users is **131** (44 published profiles, 22 verified, 49 with `last_sign_in_at` in last 30 days, 30 new signups in last 30 days, 14 unique posters in last 30 days; most recent build post is 2026-05-05 — **11 days of silence on the Build Feed**). The handover docs span 2026-05-04 → 2026-05-15 and converge on three unresolved questions (pricing identity, TAM scope, V2 surface order) that the audit cannot answer — only Thomas can. The audit can confirm there is one critical engineering bug (the V1/V2 identity disconnect above), several inherited tech-debt items still unresolved (hardcoded `CRON_SECRET`, `/api/inquiry` missing HTML escape, Next.js 16 `middleware` deprecation, `ATLAS_ROLE_LABELS` duplicated), one structurally dormant table (`hire_confirmations`, 0 rows but referenced by homepage badge), and one route that is now a `410 Gone` stub (`/api/scout`).

---

## PART 0 — HANDOVER DOC SUMMARY

Six docs, in chronological order. Read together they describe a 12-day arc: from a distribution-channel inventory (May 4) → through the build of `/hire`+`/claim`+`/atlas` (May 12–13) → a strategic inflection triggered by Noah Kagan's tweet → an advisor brief (May 15) → and a final session-transfer doc (the day V2 plumbing landed).

### 01 — `shipstacked_distribution_strategy.txt` (May 4, 2026 · 80KB · 1,589 lines)

**Author:** "Ox" (Thomas's signing name). **What it covers:** surface-by-surface map of every place AI builders live online, organised by tier (Build & Ship / Social / Hackathon / Community / Hiring / Long-form). For each surface: behaviors, scale, signal density, monetisation, accessibility, data exhaust, ShipStacked leverage, tactical entry points. **Strategic decisions recorded:**
- "ShipStacked is the proof-of-work graph that sits on top of every existing platform" — explicitly anti-marketplace framing.
- Three priority moves identified: **MCP server scrape** (GitHub `topic:mcp-server`, ~1,000 repos), **Devpost AI winner import** (~2,000 profiles), **HF Space creator outreach** (top 500 by likes).
- ShipStacked Score as the hook — public ranking by recency + AI-relevance + social proof + output volume.
- 6-month outcome map: 1,000 claimed profiles by M1; 50 paying employers by M2; first $50K MRR by M6.

**Abandoned / superseded by later docs:**
- The "ShipStacked Score" framing is now called **Velocity Score** in code (`velocity_score` on `profiles`).
- The "$199/mo employer subscription" was central in this doc; by doc 03 it's been **demoted to a secondary surface** behind the new `$1.5K / $5K / $25K` engagement ladder.
- "Scrape MCP server authors then cold-email" — superseded by the locked rule **never cold-email from `shipstacked.com`** (doc 03).
- The Replit/Vercel/Lovable/Bolt "integration template" tactical entries do not yet exist as code.

**Contradictions vs current code:**
- None directly — this doc predates V2 by 11 days. It does, however, anchor the V1 thesis that the homepage still tells today.

---

### 02 — `HANDOVER_ADDENDUM_STEP4.md` (May 12, 2026 late evening · 14KB)

**What it covers:** the build-out of `/claim` (practitioner role-claim form) and the `claim_submissions` table. End-to-end-verified locally; **not yet pushed** at time of writing. **Strategic decisions:** `routable bool default false` on `claim_submissions` is the vetting key — flips to true only after Thomas's 60–75 min manual review. **Known issues flagged (still open):**
- `ATLAS_ROLE_LABELS` const duplicated in `src/app/api/intakes/claim/route.ts` AND `src/app/claim/ClaimForm.tsx`. **VERIFIED STILL DUPLICATED** in current code.
- ClaimForm headings: `<h2>` nested under page `<h1>`+`<h2>` — should be `<h3>`. Not verified by audit.
- Duplicate `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env.local`. **VERIFIED STILL DUPLICATED** in `.env.local` (each appears twice).
- Hardcoded `CRON_SECRET='<ROTATED_CRON_SECRET_REDACTED>'` in `/api/hire-confirm/nudge/route.ts`. Not directly verified inside this audit (deferred — file exists, fix not confirmed).
- `/api/inquiry/route.ts` lacks HTML escaping in outbound emails.
- Next.js 16 `middleware` deprecation — rename `src/middleware.ts` → `src/proxy.ts` eventually. Still `middleware.ts` in current code (and now extended with V2 content negotiation, see Part 8).

**Contradiction vs reality (caught next session):** addendum claimed commit `eefca0e` shipped both `/hire` and `/claim` UI; in fact it only shipped `/hire`. The `/claim` UI was uncommitted on disk. Doc 04 (the next handover) corrects this and notes Thomas caught it via `git status`.

---

### 03 — `SHIPSTACKED_HANDOVER.md` (May 12, 2026 · 39KB)

**What it covers:** the canonical "original" handover. Part 1 strategic context (the agentic-economy reframe, OpenAI Deployment Company / Anthropic-Goldman as labor-market signal); Part 2 Atlas v0.3 structure (6 parts, 28 specialist roles in Part I, 5 operator types in Part II, compliance sub-clusters in Part III, alignment research in IV, RLHF in V, vertical specialists in VI); Part 3 LOCKED DECISIONS; Part 4 the 6-week launch campaign (Monday May 18 anchor post + Gergely send → Week 6 commercial conversion); Part 5 supply mechanics ("hiding in plain sight"); Part 6 revenue flow (the $1.5K/$5K/$25K ladder); Part 7 build state on May 12; Part 8 resume sequence.

**Strategic decisions recorded (locked, multi-session):**
- "Additive reframe over full repositioning." Keep V1 (Build Feed, Velocity Score, Builder API, /talent, $199/mo) alive while adding /atlas + /hire + /claim + /admin/intakes.
- $199/mo subscription is now **secondary surface**, not primary CTA.
- Builders FREE always.
- Spanish legal practice anonymous always.
- Never cold-email from `shipstacked.com` domain.
- 5,000 CSV passive supply only — never directly emailed.
- 60–75 min per intake on first 10 replies; 5 rooms per week distribution for 6 weeks.

**Abandoned ideas:** Calendly integration, two-sided messaging on platform, bidding/marketplace mechanism, heavy CRM, pricing page, ATS, algorithmic matching — all explicitly cut.

**Known issues flagged:** same tech-debt list as doc 02 plus an `INTAKE_NOTIFY_EMAIL` Vercel env var that wasn't set at time of writing (later set to `ox@agentagous.com`).

**Contradiction vs current state:** doc 03's "what's still to be created" lists `practitioner_targets` table. **NOT created** — the audit found no such table. Doc 03 also lists Step 6 (`/admin/intakes` view) as a planned next step. **STILL NOT BUILT** — there is no `/admin/intakes` page in `src/app/admin/`. Thomas vets intakes via Supabase Studio directly.

---

### 04 — `HANDOVER_STEP5_INFLECTION.md` (May 13, 2026 · 28KB)

**What it covers:** the deploy of `/atlas` (Atlas v0.3, 11,335 words, sticky CTA, ToC, JSON-LD, content negotiation), the rescue of the `/claim` UI that doc 02 incorrectly claimed was shipped, the styling longhand cleanup, and the **Noah Kagan inflection** — Noah publicly announced "AppSumo for vibe-coded apps + AI Skills" and Thomas DM'd + cold-emailed personally. Resolution: V1 stays alive; V2 becomes the strategic content moat that contextualises V1.

**Strategic decisions recorded:**
- V1 is NOT being pivoted out — it remains the visible foundation and supply layer.
- V2 is the strategic frame, not a replacement.
- The homepage will "blend both" — but the actual homepage rebuild was deferred. **STILL DEFERRED** — `src/app/page.tsx` is still the unchanged V1 homepage.
- `hello@shipstacked.com` does NOT receive mail (no MX records); load-bearing SES + DKIM records on `send.shipstacked.com` must not be deleted; `INTAKE_NOTIFY_EMAIL=ox@agentagous.com` is the working notification address.

**Abandoned (intra-session):** an attempt to set up Namecheap email forwarding for `hello@shipstacked.com` was started then aborted by Thomas because "all coms ride on RESEND right now."

**Known issues flagged:** 4–5 minute Gmail warm-up delay on notification emails (acceptable). `npm audit` 3 vulnerabilities (2 moderate, 1 high) in transitive deps — not fixed.

**Contradictions:**
- This doc lists 5 open homepage questions (hero copy / primary CTA / $199 prominence / what stays untouched / "10+ hires" badge) that **doc 05 says were never resolved** and **the live homepage code confirms are still open**.

---

### 05 — `HANDOVER_STEP8_SESSION_TRANSFER.md` (May 14–15, 2026 · 57KB · most recent master handover)

**What it covers:** the entire arc of the session that produced the "30-item beacon roadmap" + VC funding map + Noah brief (v3) + Schema.org JSON-LD implementation guide. Three multi-hour threads: distribution-audit categorical map (8 surfaces, vibe-coding platforms identified as biggest miss); VC funding map (~$20B+ committed capital to AI-labor thesis, Tier-1 Sequoia/General Catalyst/Thrive/Khosla, Tier-2 workforce specialists, Tier-3 EU funds); the Noah-brief iterations v1→v3 with extensive fact-checking; the build-direction question that surfaced the V1/V2 disconnect; and an unresolved positioning unraveling.

**Strategic decisions recorded:**
- Capital track stays parallel to build track — don't outreach Tier 1/4 cold, apply to open channels only after 5+ S-tier beacons shipped.
- "Drink own kool-aid first" — Noah brief is held until shipped beacons exist.
- S-tier beacon order: Schema.org → AgentCard at `/.well-known/agent-card.json` (NOT `/.well-known/agent.json` — common stale ref) → AGENTS.md across repos → Atlas open-sourced as `@shipstacked/atlas-roles` → MCP server → NLWeb → Agent Skill.
- llms.txt **demoted out of beacon track** — keep deployed for forward compatibility but don't lead with it.

**Abandoned (in this session):**
- Positioning framings rejected: "Marketplace for AI builders", "The registry of the agentic economy's labor layer", "Where AI builders get hired", "The discovery and classification layer..." (architecturally accurate but not user-facing).
- The closest-to-working "The work didn't have a name yesterday. Here's what you do." also rejected because it assumes Atlas-as-front-door context a cold visitor doesn't have.

**Known issues flagged:** same tech-debt list, plus the V1/V2 disconnect is **named explicitly** in §1.6: *"Zero of the S-tier agent-readable beacons shipped... The V1/V2 disconnect is unresolved at the product surface level."* This is the engineering question the present audit confirms is still unresolved (Part 3 below).

**Contradiction vs current code (caught by audit):**
- Doc 05 §3 says Atlas v0.3 has "28 specialist roles in Part I" but then enumerates 24 in the detail breakdown (lines 314–350). Both numbers are quoted in the same document. The DB has **40 atlas_roles rows for `atlas_version='v0.4'` and 34 for `v0.3`** — neither matches 28. Likely the doc is double-counting cluster-A 7 + cluster-B 4 + cluster-C 4 + cluster-D 5 + cluster-E 4 = 24, plus operators/research/etc. counted differently in different places.
- Doc 05 § 5.1 describes Schema.org JSON-LD as **"Item 1 to ship next"** but the V2 work since then shipped `/p/[slug]` + `/atlas/roles/[id]` JSON-LD ENDPOINTS — different from per-page rich-result JSON-LD on `/`, `/jobs`, `/talent`. The S-tier item "Schema.org JSON-LD on all 5 page types" remains UNSHIPPED for the V1 pages (Person/JobPosting/Organization markup).

---

### 06 — `SHIPSTACKED_ADVISOR_BRIEF.md` (May 15, 2026 · 27KB)

**What it covers:** a 25-minute-read brief framed for an external advisor. Lays out three concrete unresolved questions: (1) Pricing identity (Marketplace A vs Infrastructure B vs Hybrid C), (2) TAM scope (vibe-coder hiring vs full-Atlas labor layer vs MCP-native node), (3) V2 build sequence. Includes current product surface inventory, 2026 market data (ManpowerGroup/Bain/Forrester/RAND/MIT/Pertama signal), vibe-coding-platform numbers updated to May 2026 (Lovable $400M ARR/$6.6B; Cursor $2B+ ARR/$50–60B talks; Replit $265M/$9B), institutional capital map (~$20B+ committed), the Noah signal calibration, and the "hiding in plain sight" mechanism.

**Strategic decisions recorded:**
- ShipStacked is **MCP-native node** framing — "the product is not a website, the product is a protocol position."
- Three V2 surfaces named as ONE move: MCP server / public read API + llms.txt + Schema.org / multi-population claim + verification.
- Thomas's recommendation (still seeking advisor confirmation): Hybrid pricing weighted toward Infrastructure.

**Abandoned ideas:** none new — this doc summarises and re-presents.

**Known issues flagged (gaps Thomas openly names):**
- "ShipStacked's actual current funnel metrics (visits / signups / claims / hires / paying seats)" — UNKNOWN. **This audit fills part of that gap below.**
- Buyer-side field signal — has Thomas talked to enough hiring teams? Open question.
- Codex Skills marketplace launch timing.
- Whether Atlas controlled vocabulary would be adopted if published as such.

**Contradictions vs reality:**
- Brief §1.3 says "Stated traction: 10+ hires made (per homepage copy)." The audit confirms this number is a **hardcoded floor in the homepage code** — the actual `hire_confirmations` table has 0 rows and `profiles.hire_count` sum is 0. Flag for advisor honesty.

---

## PART 1 — ROUTES AND PAGES

Every route under `src/app/`. V2 routes (added 2026-05-15) marked `[V2]`. Audience: `pub` (anyone) / `auth` (logged-in user — builder or employer or client) / `emp` (employer with subscription) / `bld` (builder profile owner) / `adm` (admin email check) / `api` (API-key consumer) / `cron` (infra).

### Pages (App Router server/client components)

| Path | File | Type | Purpose | Reads / Writes | Audience |
|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Client | Homepage — V1 hero ("proof-of-work platform for AI-native builders"), featured-builder cards, Build Feed preview, "10+ hires made" badge, $199 employer CTA | reads `profiles`, `posts`, `skills`, `/api/hire-confirm/count`, `/api/builders/geo` | pub |
| `/atlas` | `src/app/atlas/page.tsx` | Server | Long-form Atlas v0.4 (markdown rendered) with ToC, sticky CTA, JSON-LD Article | reads `src/content/atlas-v04.md` from disk at request time | pub |
| **[V2]** `/atlas/roles/[id]` | `src/app/atlas/roles/[id]/page.tsx` | Server | Per-role Atlas page (cluster, automation trajectory, crosswalks, EU AI Act mappings, recent receipts at this role) | reads `atlas_roles`, `proof_receipts` (join via `entities`) | pub |
| **[V2]** `/p/[slug]` | `src/app/p/[slug]/page.tsx` | Server | Public proof receipt (atomic V2 work record) — title, subject entity, verification ladder, Atlas role pills, stack chips, outcomes, artifacts | reads `proof_receipts`, `entities`, `verification_events`, `attestations`, `atlas_roles` | pub |
| **[V2]** `/paste` | `src/app/paste/page.tsx` | Server | Step 1 of V2 ingest — paste a URL | client form, calls `/api/paste/classify` then `/api/paste/analyze` then writes Redis draft | bld (auth required) |
| **[V2]** `/paste/review` | `src/app/paste/review/page.tsx` | Server | Step 2 of V2 ingest — review/edit metadata before publish (Atlas role selector, stack chips, verification ladder preview) | reads Redis draft, `atlas_roles`; posts to `/api/paste/publish` | bld |
| `/u/[username]` | `src/app/u/[username]/page.tsx` | Server | Public builder profile (V1) — bio, projects, skills, GitHub data, Build Feed posts | reads `profiles` BY `username`, `projects`, `skills`, `github_data`, `posts` | pub |
| `/feed` | `src/app/feed/page.tsx` | Server | Public Build Feed list | reads `posts`, `profiles` | pub |
| `/feed/[id]` | `src/app/feed/[id]/page.tsx` | Server | Single build post — reactions, comments | reads `posts`, `profiles`, `post_comments` | pub |
| `/leaderboard` | `src/app/leaderboard/page.tsx` | Server | Top 10 by Velocity Score; viewer sees own rank | reads `profiles`, `skills` | pub |
| `/talent` | `src/app/talent/page.tsx` | Server | Browse builders; **paywalled** — shows 6 free, unlocks with `full_access` subscription | reads `profiles`, `skills`, `subscriptions`, `saved_profiles` | emp (gated) |
| `/jobs` | `src/app/jobs/page.tsx` | Server | Public jobs board | reads `jobs`, `employer_profiles`, `applications` | pub / bld |
| `/jobs/[id]` | `src/app/jobs/[id]/page.tsx` | Server | Single job detail + apply | reads `jobs`, `applications` | bld |
| `/post-job` | `src/app/post-job/page.tsx` | Server | Job posting form — **gated** by `full_access` subscription | reads `subscriptions`; writes `jobs` | emp |
| `/employers` | `src/app/employers/page.tsx` | Server | Browse hiring companies | reads `employer_profiles`, `jobs` | pub |
| `/company/[slug]` | `src/app/company/[slug]/page.tsx` | Server | Public employer profile + open roles | reads `employer_profiles`, `jobs` | pub |
| `/hire` | `src/app/hire/page.tsx` | Server | Symptom-based hiring intake ("tell me what's broken") | client form → `/api/intakes/hire` | pub |
| `/hire/thanks` | `src/app/hire/thanks/page.tsx` | Server | Hire intake confirmation | static | pub |
| `/hire-confirm` | `src/app/hire-confirm/page.tsx` | Server | Post-hire-confirmation page (legacy flow — confirms a hire was made) | reads `hire_confirmations` | auth |
| `/claim` | `src/app/claim/page.tsx` | Server | Practitioner role-claim form | client form → `/api/intakes/claim` | pub |
| `/claim/thanks` | `src/app/claim/thanks/page.tsx` | Server | Claim confirmation | static | pub |
| `/get-found/[id]` | `src/app/get-found/[id]/page.tsx` | Server | Job-detail landing with onboarding for builders found via inbound | reads `jobs` | pub / bld |
| `/admin` | `src/app/admin/page.tsx` | Server | Admin dashboard (MRR, churn, growth metrics) — gated by admin email | reads `profiles`, `subscriptions`, `jobs`, `posts`, `conversations`, `applications` | adm |
| `/admin/candidates` | `src/app/admin/candidates/page.tsx` | Server | Outreach queue UI | client-side — calls `/api/admin/candidates/*` | adm |
| `/admin/candidates/import` | `src/app/admin/candidates/import/page.tsx` | Server | Bulk import from CSV/JSON | client-side | adm |
| `/api-docs` | `src/app/api-docs/page.tsx` | Server | Public Builder API documentation | static | api / bld |
| `/dashboard` | `src/app/dashboard/page.tsx` | Server | Builder dashboard — applications, Velocity Score, onboarding | reads `profiles`, `applications`, `jobs`, `posts`, `github_data`, `subscriptions`, `employer_profiles` | bld |
| `/dashboard/edit` | `src/app/dashboard/edit/page.tsx` | Server | Edit builder profile, projects, skills | reads + writes `profiles`, `projects`, `skills` | bld |
| `/employer` | `src/app/employer/page.tsx` | Server | Employer dashboard — posted jobs + incoming applications | reads `subscriptions`, `jobs`, `applications`, `profiles` | emp |
| `/employer/messages` | `src/app/employer/messages/page.tsx` | Client | Employer inbox | reads `conversations`, `messages`, `profiles` | emp |
| `/messages` | `src/app/messages/page.tsx` | Client | Builder inbox | reads `conversations`, `messages`, `profiles`, `subscriptions` | bld |
| `/client/inbox` | `src/app/client/inbox/page.tsx` | Server | Client (project-inquirer) inbox | reads `conversations`, `messages`, `profiles` | auth (client role) |
| `/join` | `src/app/join/page.tsx` | Client | Builder signup + onboarding | writes `profiles`, `skills` | pub |
| `/login` | `src/app/login/page.tsx` (+ `actions.ts`) | Client+SA | Login form (magic link / password) — `actions.ts` added 2026-05-15 for paste-redirect handling | reads auth | pub |
| `/signup` | `src/app/signup/page.tsx` | Client | Builder/employer registration | writes auth, `subscriptions` | pub |
| `/auth/callback` | `src/app/auth/callback/page.tsx` | Client | OAuth/magic-link callback; redirects by role | reads auth, `subscriptions` | auth |
| `/reset-password`, `/set-password`, `/update-password` | various | Client | Password flows | reads auth | auth / pub |
| `/success` | `src/app/success/page.tsx` | Server | Stripe checkout success | reads `subscriptions` | emp |
| `/privacy`, `/terms` | various | Server | Static legal pages | static | pub |
| `/llms.txt` | `src/app/llms.txt/route.ts` | Route GET | LLM-discoverable index — **was static `public/llms.txt`** until 2026-05-15, now dynamic with Atlas roles + recent receipts | reads `atlas_roles`, `proof_receipts` | pub / agent |

### API route handlers

| Path | Method | Purpose | Reads / Writes | Audience |
|---|---|---|---|---|
| `/api/checkout` | POST | Create Stripe checkout session for `full_access` ($199/mo) or `job_post` ($X one-off) | Stripe | emp |
| `/api/webhooks/stripe` | POST | Stripe webhook — `checkout.session.completed`: creates auth user if missing, inserts `subscriptions` row, sends welcome+magic-link via Resend | writes auth.users, `subscriptions`, Resend | infra |
| `/api/employer/cancel` | POST | Cancel subscription via Stripe API | Stripe, `subscriptions` | emp |
| `/api/intakes/hire` | POST | `/hire` form submit — rate-limited 3/email/24h, writes `hire_intakes`, fires 2 Resend emails (auto-response + admin notification) | `hire_intakes`, Resend | pub |
| `/api/intakes/claim` | POST | `/claim` form submit — writes `claim_submissions` with `text[]` arrays, fires 2 Resend emails | `claim_submissions`, Resend | pub |
| `/api/inquiry` | POST | Project inquiry from build viewer; creates auth account if needed, opens conversation, notifies builder | `profiles`, `post_comments`, `messages`, auth, Resend | pub |
| `/api/apply` | POST | Builder applies to a job — writes `applications`, emails employer | `applications`, `profiles`, `jobs`, Resend | bld |
| `/api/feed` | GET/POST | List Build Feed; create build post (with auto-verify trigger) | `posts`, `profiles`, Anthropic (optional) | pub / bld |
| `/api/feed/jobs` | GET | Active jobs for embed/feed | `jobs` | pub |
| `/api/comments` | GET/POST | Read or post comments on a build; notify post author | `post_comments`, `profiles`, `posts`, Resend | auth |
| `/api/comments/likes` | POST/GET | Like / unlike a comment | `comment_likes`, `post_comments` | auth |
| `/api/messages`, `/api/messages/[id]`, `/api/messages/unread` | GET/POST | Conversations & messages | `conversations`, `messages`, `profiles`, Resend | auth |
| `/api/saved-profiles` | GET/POST/DELETE | Employer saves builder | `saved_profiles`, `profiles` | emp |
| `/api/profile/verify-check` | POST | Re-check if builder meets auto-verification criteria | `profiles`, `github_data` | bld |
| `/api/verify-request` | POST | Builder requests manual verification → emails admin | `profiles`, Resend | bld |
| `/api/avatar`, `/api/employer-logo` | POST | Upload image to Supabase Storage | Storage, `profiles` / `employer_profiles` | bld / emp |
| `/api/builders/geo` | GET | Normalized geolocation for builder map widget | `profiles` | pub |
| `/api/keys` | GET/POST | Builder API keys (list/generate) | `api_keys`, `profiles` | bld |
| `/api/v1/me` | GET | Builder API — current profile | `profiles`, `skills`, `projects`, `api_keys` | api |
| `/api/v1/profile` | PATCH | Builder API — update profile fields | `profiles`, `skills`, `github_data`, auto-verify, Anthropic | api |
| `/api/v1/builds` | POST | Builder API — create Build Feed post | `posts`, `profiles`, `github_data`, auto-verify, Anthropic | api |
| `/api/v1/avatar` | POST | Builder API — upload avatar | Storage, `profiles` | api |
| `/api/velocity/calculate` | POST | Recompute Velocity Score (commits last 90d max 40 + posts last 90d max 30 + completeness max 30 = 0–100) | `profiles`, `github_data`, `posts`, `skills`, `projects` | bld |
| `/api/github/connect`, `/api/github/callback`, `/api/github/sync` | GET / GET / POST | GitHub OAuth + commit/repo/language fetch | `profiles`, `github_data`, GitHub API | bld |
| `/api/auth/confirm` | GET | PKCE / token_hash verification for magic links, OAuth, recovery | auth | pub |
| `/api/magic-link`, `/api/client-magic-link` | POST | Send magic link via Resend | auth, `subscriptions`, Resend | pub |
| `/api/logout` | GET | Sign out | auth | auth |
| `/api/welcome` | POST | Send welcome email | Resend | auth |
| `/api/jobs` | POST | Employer creates job — gated by subscription | `jobs`, `subscriptions`, Twitter (optional auto-tweet) | emp |
| `/api/jobs/xpost` | POST | Auto-post job to X/Twitter | `jobs`, Twitter API | emp |
| `/api/hire-confirm` | GET | Confirm-hire-via-link; updates `hire_confirmations` + `profiles.hire_count` | `hire_confirmations`, `profiles` | auth |
| `/api/hire-confirm/count` | GET | Total confirmed hires (powers the "10+ hires made" badge) | `hire_confirmations` | pub |
| `/api/hire-confirm/nudge` | POST | **Cron** — nudge stale conversations to confirm hires; gated by hardcoded `CRON_SECRET` | `conversations`, `profiles`, Resend | cron |
| `/api/admin/candidates/next` | GET | Next candidate from outreach queue | (queue table missing — see Part 7) | adm |
| `/api/admin/candidates/draft` | POST | AI-generated candidate profile draft via Claude Haiku + GitHub | `profiles`, GitHub, Anthropic | adm |
| `/api/admin/candidates/import` | POST | Bulk import | `profiles` | adm |
| `/api/admin/candidates/log` | POST | Log outreach event | (target table missing — `candidate_outreach_log` doesn't exist; see Part 7) | adm |
| `/api/admin/verify` | POST | Admin verifies / unverifies a builder | `profiles`, Resend | adm |
| `/api/scout` | POST | **`410 Gone`** — feature removed | none | (deprecated) |
| **[V2]** `/api/paste/classify` | POST | Classify URL → source (github / lovable / bolt / v0 / replit / vercel / netlify / mcp_server / generic) | Upstash Redis cache | bld |
| **[V2]** `/api/paste/analyze` | POST | Per-source extractor — title, description, stack, artifacts | per-source extractor; Upstash cache | bld |
| **[V2]** `/api/paste/publish` | POST | Publish a draft proof receipt — creates entity (find-or-create), writes `proof_receipts` + `verification_events` + `ingestion_log`, bumps `capabilities_vocab` | service-role: `entities`, `proof_receipts`, `verification_events`, `ingestion_log`, `capabilities_vocab` | bld |
| **[V2]** `/api/p/[slug]/jsonld` | GET | Receipt JSON-LD endpoint (content-negotiated alias `/p/<slug>.json`) | `proof_receipts`, `entities` | pub / agent |
| **[V2]** `/api/atlas/roles/[id]/jsonld` | GET | Atlas role JSON-LD endpoint (`/atlas/roles/<id>.json`) | `atlas_roles`, `proof_receipts` | pub / agent |
| `/og` (route.tsx) | GET | OG-card image generator — **modified 2026-05-15** to add a `type=receipt&slug=` path; original V1 builder OG paths preserved | `profiles`, `proof_receipts`, `entities` | pub |

### Routes the handover docs mention that no longer exist

- `/admin/intakes` — described in docs 02, 03, 04 as the next planned admin surface for vetting `hire_intakes` + `claim_submissions`. **Not built.** Thomas vets via Supabase Studio.
- The "AgentCard" route `/.well-known/agent-card.json` — described in doc 05 §5.2 as planned. **Not present** in `public/` or as a route handler.

### Routes that exist but no handover doc explains

- `/get-found/[id]` — exists but unmentioned in any handover doc; appears to be a builder-targeted landing for inbound job-targeting flows.
- `/api/v1/avatar` — Builder API avatar upload, not enumerated in the API-docs page summaries in handover docs (it does match the published Builder API surface).

---

## PART 2 — DATABASE SCHEMA

Live Supabase project: `zkemkxwbijlyoitmrzvq.supabase.co`. RLS state and policies confirmed only for V2 tables (read directly from `supabase/migrations/`); for V1 tables the schema was inferred from sample-row column lists via service role (the audit did not enumerate `pg_policies` for V1).

### V2 tables (added 2026-05-15)

| Table | Cols (key fields) | RLS | Rows | Purpose |
|---|---|---|---|---|
| `entities` | id (bigserial), external_id (`shipstacked:entity:<ulid>`), kind ∈ {human, operator, fleet, agent}, display_name, **slug (unique)**, **owner_user_id (→ auth.users)** | ON. Public read; write only by owner (`owner_user_id = auth.uid()`) | **0** | Subjects of proof receipts. Created by `findOrCreateHumanEntity` on first `/paste/publish`. |
| `atlas_roles` | role_id, atlas_version, cluster, name, short_description, long_description_md, automation_trajectory, isco_08_code, soc_2018_code, onet_code, crosswalk_status, eu_ai_act_articles[], iso_42001_sections[]. PK `(role_id, atlas_version)` | ON. Public read; service-role writes only | **74** (40 v0.4 + 34 v0.3) | Canonical role taxonomy, versioned, dereferenceable at `/atlas/roles/[id]`. |
| `proof_receipts` | id, external_id (ulid), **slug (unique)**, schema_version, atlas_version, subject_id (→ entities), on_behalf_of_id, event_type, title, description, occurred_at, artifacts (jsonb), stack (jsonb), outcomes (jsonb), capabilities (text[]), atlas_claimed/inferred/confirmed (text[]), atlas_confidence, verification_level, visibility ∈ {public, unlisted, private}, ingestion_source, ingestion_metadata (jsonb), issued_at | ON. Public read where visibility='public'; owner read/write via entities JOIN | **0** | THE atomic primitive — one verifiable work record. |
| `verification_events` | id, receipt_id (→ proof_receipts ON DELETE CASCADE), level, achieved_at, method, evidence (jsonb) | ON. Public read for public receipts. **APPEND-ONLY by convention** | **0** | Ladder log (L0→L4). |
| `attestations` | id, receipt_id, attestor_id (→ entities), attestor_role ∈ {client, employer, peer, platform}, statement, signed_at, signature, signature_method | ON. Public read for public receipts | **0** | L3+ third-party signatures. |
| `capabilities_vocab` | tag (PK), first_seen_at, receipt_count, promoted | ON. Public read | **4** | Harvested controlled vocabulary — left over from test publishes whose receipts were rolled back. |
| `ingestion_log` | id, receipt_id (→ proof_receipts ON DELETE SET NULL), source, source_url, request_id, status, error, created_at | ON. No policies (service-role only) | **8** | Provenance / debugging. All 8 rows are test fixtures: `source='paste'`, `source_url='https://github.com/anthropics/claude-code'`, all with `receipt_id=null` (receipt was rolled back). |

### V1 tables (pre-existing — schemas inferred from sample rows; not enumerated from `pg_policies`)

| Table | Key columns | Rows | Purpose |
|---|---|---|---|
| `profiles` | id, **user_id** (→ auth.users), email, username (unique-by-convention), full_name, role, bio, about, avatar_url, availability, **verified**, **published**, github_url, x_url, linkedin_url, website_url, profile_views, primary_profession, seniority, work_type, day_rate, timezone, languages, github_connected, github_username, **velocity_score**, accepts_project_inquiries, **hire_count**, last_seen_at, featured, featured_order | **67** (44 published, 22 verified, 20 github_connected) | Builder identity (V1). |
| `skills` | id, profile_id, category ∈ {claude_use_case, llm, language, framework, ai_tool, domain}, name | **1,014** (claude_use_case:172, llm:115, language:152, framework:238, ai_tool:149, domain:174) | Skills + tools + frameworks + domains taxonomy. |
| `projects` | id, profile_id, title, description, prompt_approach, outcome, project_url, display_order | **38** | "HOW CLAUDE WAS USED / OUTCOME" entries on builder profiles. |
| `posts` | id, profile_id, title, what_built, problem_solved, tools_used, time_taken, url, reactions, outcome, featured | **73** | Build Feed posts. |
| `post_comments` | id, post_id, author_email, author_name, author_role, content, author_username, likes_count | **13** | Comments on builds. |
| `comment_likes` | (RLS allowed read; sample shape not fetched) | **1** | Likes on comments. |
| `github_data` | profile_id (→ profiles) | **20** | Cached GitHub stats per builder (commits/repos/languages). |
| `api_keys` | profile_id, created_at, last_used_at, name | **48** | Builder API keys (multiple per builder common). |
| `employer_profiles` | id, email, company_name, slug, about, what_they_build, location, team_size, website_url, public, logo_url, industry, hiring_type, urgency, budget_range, linkedin_url, x_url | **7** (1 with `public=true`) | Employer pages. |
| `jobs` | id, employer_email, company_name, role_title, description, requirements, salary_range, location, employment_type, skills (text[]), status, expires_at, anonymous, hiring_for, urgency, day_rate, timezone | **24 active** (0 expired-past-expires_at) | Job postings. |
| `applications` | id, job_id, builder_email, builder_name, profile_id, employer_email, status, created_at | **122** | Job applications. |
| `subscriptions` | id, created_at, email, stripe_customer_id, stripe_session_id, product, status, expires_at, magic_link | **11** (9 `product='full_access'/status='active'`, 2 `product='unknown'/status='active'`) | Stripe subscription cache. |
| `saved_profiles` | (shape not fetched) | **3** | Employer saved builders. |
| `conversations` | id, employer_email, builder_profile_id, job_id, created_at, last_message_at, conversation_type, client_email, client_name | **162** | Employer↔builder and client↔builder threads. |
| `messages` | (counts only) | **250** | Messages within conversations. |
| `hire_confirmations` | (0 rows; columns not introspected) | **0** | Post-hire-confirmation source — **empty, but the "10+ hires made" homepage badge is driven by `/api/hire-confirm/count`**. |
| `hire_intakes` | id, created_at, symptom, prior_role_title, urgency, budget, email, name, company, role, linkedin_url, status, thomas_response_at, thomas_notes, outcome, user_agent, referrer | **5** | `/hire` intake form. **All 5 rows are Thomas's testing from `ox@agentagous.com`** (subjects: "Smoke test", "Notification Test", "Env Var Test", "End To End Test Co", "Test Company Ltd"). Status = `'new'` on all. |
| `claim_submissions` | id, created_at, name, email, location, linkedin_url, github_url, twitter_url, website_url, atlas_roles (text[]), verticals (text[]), domain_practitioner, domain_field, proof_of_work, engagement_modes (text[]), comp_expectation, notes, status, thomas_notes, vetted_at, routable, user_agent, referrer | **2** | `/claim` intake. **Both rows are Thomas's test data** from `ox@agentagous.com` (names: "Test Claimer", "End To End Claim Test", both with `atlas_roles=['A1','A6','F1']`, status='new', routable=false). |
| `candidates` | (0 rows; columns not introspected) | **0** | Admin outreach candidate store. |
| `project_inquiries` | (4 rows; columns not introspected) | **4** | Project inquiries (`/api/inquiry` writes; hinted by Supabase as the table the Explore agent confused with `hiring_inquiries`). |
| `outreach_log` | (0 rows) | **0** | Generic outreach log (hinted as the table the Explore agent confused with `candidate_outreach_log`). |
| `auth.users` (Supabase Auth) | — | **131** (all email_confirmed) | Underlying auth. |

### Tables the handover docs / Explore agent guessed wrong about (do NOT exist)

Confirmed `404` from PostgREST: `post_likes` (PostgREST hint: "Perhaps you meant `comment_likes`"), `hiring_inquiries` (hint: `project_inquiries`), `atlas_role_claims` (hint: `atlas_roles`), `candidate_outreach_log` (hint: `outreach_log`), `candidate_queue` (hint: `candidates`), `practitioner_targets` (mentioned in handover doc 03 but never created).

### Mapping V1 → V2 concepts (Part 3 expands on this)

| V2 concept | Table | V1 equivalent | Notes |
|---|---|---|---|
| `entity` (subject of a receipt) | `entities` | `profiles` | **No FK; no resolver.** Both link to `auth.users`. |
| `proof_receipt` (atomic work record) | `proof_receipts` | `posts` (Build Feed entries) | Different shape, different table, no migration path. |
| `atlas_role` (canonical taxonomy) | `atlas_roles` | The hardcoded `ATLAS_ROLE_LABELS` const | DB version is now the source of truth for `/atlas/roles/[id]`; the const is still used by `/api/intakes/claim` + `ClaimForm.tsx` for the claim form's role grid. |
| `verification_event` (ladder log) | `verification_events` | `profiles.verified` boolean + auto-verify logic in `src/lib/autoVerify.ts` | V1 verification is binary; V2 has L0–L4 ladder. |
| `attestation` (third-party signature) | `attestations` | None | No V1 equivalent. |
| `capabilities_vocab` | `capabilities_vocab` | `skills` table by category | V1's `skills` is closed-vocab (6 hardcoded categories); V2's `capabilities_vocab` is open and harvested from receipts. |
| `ingestion_log` | `ingestion_log` | None | No V1 ingest log; closest analog is `applications.created_at` for job-application audit. |

---

## PART 3 — V1 vs V2 OVERLAP MAP (CRITICAL SECTION)

### Direct answers to the asked questions

| Q | Answer |
|---|---|
| Does `/u/[slug]` read from `entities` (V2) or a V1 table? | **V1 table.** `src/app/u/[username]/page.tsx:11-17` queries `profiles WHERE username = ? AND published = true`. It does NOT touch `entities` or `proof_receipts`. |
| Where does the Build Feed (`/feed`) get data? | `posts` table. `src/app/feed/page.tsx` reads `posts` + joins `profiles`. Does NOT touch `proof_receipts`. |
| Where is Velocity Score computed? | `/api/velocity/calculate/route.ts`. Inputs: commits in last 90 days (max 40), Build Feed posts in last 90 days (max 30), profile completeness (max 30). Total: 0–100. Stored on `profiles.velocity_score`. |
| What table stores the verified flag? | `profiles.verified` (boolean). |
| What table stores projects (HOW CLAUDE WAS USED / OUTCOME)? | `projects` (cols: title, description, prompt_approach, outcome, project_url, display_order). Linked to `profiles` by `profile_id`. |
| Skills / tools / frameworks / domains taxonomies? | `skills` table, single source. `category` column ∈ {claude_use_case, llm, language, framework, ai_tool, domain}. 1,014 rows total. |
| Which V1 tables have `owner_user_id` (or equivalent) → `auth.users`? | `profiles.user_id` → `auth.users.id`. `subscriptions.email` and `employer_profiles.email` link by email (string), not FK. `jobs.employer_email` likewise. `applications` keys by both `profile_id` (→ profiles) AND `employer_email` (string). No V1 table uses the literal column name `owner_user_id`. |

### Per-concept V1 equivalent

| V2 concept | V1 equivalent | Same scope? |
|---|---|---|
| `entities` (human subject) | `profiles` | **No.** `profiles` is builder-only; `entities` is multi-kind (human/operator/fleet/agent). |
| `proof_receipts` | `posts` (Build Feed) + `projects` | **Partial.** Both record work; `proof_receipts` adds atomic IDs, verification ladder, JSON-LD endpoints, Atlas-role classification, multi-artifact spec. |
| `atlas_roles` (DB) | `ATLAS_ROLE_LABELS` hardcoded const | Yes, semantically — different surface. |
| `verification_events` | `profiles.verified` + `autoVerify.ts` | No. V1 is one bit; V2 is an append-only ladder log. |
| `attestations` | No V1 equivalent | — |
| `capabilities_vocab` | `skills` (closed-vocab, 6 categories) | No — V2 is open-vocab. |
| `ingestion_log` | No V1 equivalent | — |

### CRITICAL TRACE — does `/paste` publish create a duplicate entity for an existing V1 user?

**Scenario:** Aniket Aslaliya (real V1 builder, top of leaderboard at velocity_score=100, profile at `/u/aniketaslaliya801`) logs into the production site for the first time after the V2 ship, opens `/paste`, pastes a real GitHub URL, walks through review, hits Publish.

**Exact code path** (file:line):

1. `POST /api/paste/publish` (`src/app/api/paste/publish/route.ts:44-148`). After rate-limit + auth (`supabase.auth.getUser()`), it calls `publishProofReceipt({admin, user, draft, draftId, requestId})`.

2. `publishProofReceipt` (`src/lib/paste/publish.ts:165-403`) **immediately** calls `findOrCreateHumanEntity(admin, user)` at line 179.

3. `findOrCreateHumanEntity` (`src/lib/entities.ts:60-114`) executes:
   ```sql
   select id, external_id, kind, display_name, slug, owner_user_id
   from entities
   where owner_user_id = $1 and kind = 'human'
   limit 1;
   ```
   Where `$1 = user.id` (the `auth.users.uuid`). Aniket's row in `entities`: **does not exist** (the DB has 0 entities total). The function falls through to creation.

4. **Slug derivation** (`src/lib/entities.ts:31-49`):
   - `deriveDisplayName(user)` reads `user.user_metadata.full_name`, falls back to `user.user_metadata.name`, then to `email.split('@')[0]`, then to `'Builder'`.
   - `deriveSlugBase(user, displayName)` normalises the display name. If `full_name = 'Aniket Aslaliya'`, slug base becomes `aniket-aslaliya`. If `user_metadata` is empty (which it commonly is for builders who signed up via the V1 `/join` form — that form writes to `profiles`, not to `auth.users.user_metadata`), the slug base becomes the email prefix.
   - `generateUniqueSlug(admin, 'entities', slugBase)` checks uniqueness **only within the `entities` table** — it does **not** look at `profiles.username`.

5. New row inserted into `entities`:
   ```
   external_id = 'shipstacked:entity:<ulid>'
   kind        = 'human'
   display_name= 'Aniket Aslaliya'   -- from user_metadata.full_name OR email prefix
   slug        = 'aniket-aslaliya'    -- DERIVED FRESH; not 'aniketaslaliya801'
   owner_user_id = <auth.users.id for Aniket>
   ```

6. `publishProofReceipt` continues to insert into `proof_receipts` with `subject_id = entity.id`, then `verification_events`, then `ingestion_log`. On success it returns:
   ```json
   {
     "success": true,
     "id": "shipstacked:proof:<ulid>",
     "slug": "<receipt-slug>",
     "canonical_url": "https://shipstacked.com/p/<receipt-slug>",
     "entity_canonical_url": "https://shipstacked.com/u/aniket-aslaliya"
   }
   ```

7. The user is redirected (or shown a success state) pointing them at `https://shipstacked.com/u/aniket-aslaliya`.

8. That URL hits `src/app/u/[username]/page.tsx:32-42`, which queries:
   ```sql
   select * from profiles where username = 'aniket-aslaliya' and published = true;
   ```

9. **Result:** the profile lookup returns `null` (Aniket's `profiles.username` is `'aniketaslaliya801'`, not `'aniket-aslaliya'`). The page calls `notFound()` at line 42. The user sees a **404**.

10. The published receipt is **invisible from the user's V1 profile** at `/u/aniketaslaliya801`. That page doesn't query `proof_receipts` at all. The receipt is also invisible on the V1 `/feed` (which reads `posts`, not `proof_receipts`) and on `/leaderboard` (which reads `profiles.velocity_score`, which does not increment for V2 receipts).

11. The receipt IS visible at `/p/<receipt-slug>` (the V2 canonical receipt page) and is enumerated by `/llms.txt` and `/atlas/roles/[id]`'s "recent receipts" block.

### What this means in plain terms

> **Yes — a duplicate identity is created.** The V2 `entities` row is a new identity keyed only by `auth.users.id`. There is no foreign key, no resolver, and no migration path linking it to the V1 `profiles` row even though both belong to the same logged-in human. The `entity_canonical_url` returned by `/api/paste/publish` will 404 unless the freshly-derived entity slug coincidentally matches the user's existing `profiles.username` (which is exceedingly unlikely — V1 usernames have email-derived numeric suffixes like `aniketaslaliya801`; V2 slugs derive from `user_metadata.full_name` like `aniket-aslaliya`).

### Severity

Engineering: **critical for the next session** if `/paste` is exposed to real V1 builders. Two failure modes will compound:
1. The success-redirect URL 404s, eroding user trust the first time they try the feature.
2. Receipts accumulate against `entities` while the rest of the platform sees only `profiles` — the V1 surface (homepage, /feed, /leaderboard, /talent, /u/) shows no evidence the receipt exists.

Strategic: this is the engineering form of the strategic question the handover docs say is unresolved (the V1/V2 disconnect). The disconnect is now real at the data layer, not just on the homepage.

### Possible resolutions (presented for context; not implemented by this audit)

- Make `findOrCreateHumanEntity` look up `profiles WHERE user_id = user.id` FIRST and reuse `profiles.username` as the entity slug + `profiles.full_name` as display_name when found.
- Add an `entity_id` column to `profiles` and a `profile_id` column to `entities` (one-to-one), with the resolver enforcing the link on creation.
- Make `/u/[username]` first check `profiles WHERE username = $1`, then fall back to `entities WHERE slug = $1` and render a different layout for receipts-only entities.
- Or: declare `/u/` is V2-only going forward and route existing V1 profiles to `/builder/[username]` (large user-visible change).

The right choice depends on the unresolved strategic question (Phase 1B in docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md is the planned home for the `/u/[slug]` rewrite — the V2 commit `151a59e` explicitly flags this as a "Known follow-up").

---

## PART 4 — INTEGRATIONS

| Service | Used by (files) | Data flows | Env vars |
|---|---|---|---|
| **Supabase** | nearly all routes; auth + Postgres + Storage | profile / employer / job / message data; auth.users; avatar + logo blob storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Stripe** | `/api/checkout`, `/api/webhooks/stripe`, `/api/employer/cancel`, `src/lib/stripe.ts` (assumed), `success` page | Outbound: create checkout session, retrieve session, cancel subscription. Inbound: `checkout.session.completed` webhook writes `subscriptions` + creates auth user + sends welcome via Resend. `from: ShipStacked <hello@shipstacked.com>` (hardcoded in webhook) | `STRIPE_SECRET_KEY` (duplicated in `.env.local`), `STRIPE_WEBHOOK_SECRET` (duplicated), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **Resend** | 12+ routes — every transactional email (hire intake auto-response + admin notification; claim intake; apply; inquiry; comments; messages; welcome; verify-request; nudge; hire-confirm; magic-link; webhook welcome) | Outbound only. Sender domain `send.shipstacked.com` via DKIM. Reply-to `hello@shipstacked.com` — **does NOT receive mail** (no MX records, see handover doc 04). DNS: `resend._domainkey.shipstacked.com` (DKIM), SES MX/SPF on `send.shipstacked.com` subdomain — **load-bearing, do not delete** | `RESEND_API_KEY`, `INTAKE_NOTIFY_EMAIL=ox@agentagous.com`, `RESEND_SEGMENT_BUILDERS`, `RESEND_SEGMENT_EMPLOYERS`, `RESEND_SEGMENT_CLIENTS` (segment IDs for marketing sends — usage not located in app code, assumed used by scripts/) |
| **Anthropic (Claude SDK)** | `/api/feed`, `/api/v1/profile`, `/api/v1/builds`, `/api/admin/candidates/draft`, `src/services/atlas-classifier/` (V2), `src/lib/autoVerify.ts` (likely) | Auto-verification scoring of builds; admin draft generation of candidate profiles from GitHub data; **V2 atlas classifier** (`src/services/atlas-classifier/index.ts` uses the `classify_atlas_roles` tool with v0.1.0 prompt) | `ANTHROPIC_API_KEY` |
| **GitHub (OAuth + REST)** | `/api/github/connect`, `/api/github/callback`, `/api/github/sync`, `/api/admin/candidates/draft`, V2 paste extractor `src/services/extractors/github.ts` | OAuth: authorize then exchange for token, fetch user + repos + languages + commit counts, cache in `github_data`. V2 extractor: anonymous repo metadata fetch | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| **Upstash Redis** | `src/lib/rateLimit.ts`, V2 `src/lib/paste/draft.ts` (paste-flow draft storage with TTL), V2 `/api/paste/classify` + `/api/paste/analyze` (cache) | Rate limiting (intakes, paste publish), draft storage between `/paste` and `/paste/review`, classifier/analyzer result cache | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Twitter / X** | `/api/jobs/xpost`, `scripts/post-jobs-x.js` | Auto-tweet new jobs as a follow-up step in `POST /api/jobs`; the standalone script appears to run jobs through a separate posted-state file | `X_SHIPSTACKED_API_KEY`, `X_SHIPSTACKED_API_SECRET`, `X_SHIPSTACKED_BEARER_TOKEN`, `X_SHIPSTACKED_ACCESS_TOKEN`, `X_SHIPSTACKED_ACCESS_TOKEN_SECRET` |
| **Vercel `@vercel/og`** | `src/app/og/route.tsx` | OG-card image generation — V1 builder cards, V2 receipt cards (added 2026-05-15) | none |

### Integration cross-reference vs handover docs

- **Planned but not implemented:**
  - MCP server (described in handover 05/06 as the next big surface; would live at `mcp.shipstacked.com` per doc 06; no code in repo).
  - AgentCard at `/.well-known/agent-card.json` (planned, not present).
  - Schema.org Person/JobPosting/Organization JSON-LD on V1 pages (`/jobs`, `/talent`, `/`) — planned in doc 05 §5.1, not implemented. The V2 commits only added receipt + Atlas role JSON-LD endpoints.
  - NLWeb sidecar (planned, not present).
  - Cross-platform Agent Skill on agentskills.io (planned, not present).
  - Hugging Face dataset / Space / smolagent (planned, not present).
- **Done but downgraded:** `llms.txt` — the May-13 handover described it as a beacon; the May-15 transfer doc downgraded it out of beacon track; the current code has it as a dynamic route enumerating Atlas + receipts.
- **Operational but fragile:**
  - `hello@shipstacked.com` is the From-address on every Resend email AND the reply-target users see. It does NOT receive mail. Anyone who replies to a ShipStacked email gets a bounce. Doc 04 ranks fixes: Google Workspace ($7/mo) > Cloudflare Email Routing (free, requires DNS host swap) > Namecheap forwarding (avoid).

### Environment variables in `.env.local`

Names only (values redacted): `STRIPE_SECRET_KEY` (×2), `STRIPE_WEBHOOK_SECRET` (×2), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `X_SHIPSTACKED_API_KEY`, `X_SHIPSTACKED_API_SECRET`, `X_SHIPSTACKED_BEARER_TOKEN`, `X_SHIPSTACKED_ACCESS_TOKEN`, `X_SHIPSTACKED_ACCESS_TOKEN_SECRET`, `RESEND_SEGMENT_BUILDERS`, `RESEND_SEGMENT_EMPLOYERS`, `RESEND_SEGMENT_CLIENTS`, `INTAKE_NOTIFY_EMAIL`. **Duplicates confirmed in local file**; Vercel env values not inspected by this audit.

---

## PART 5 — USER COUNTS AND ACTIVITY

| Metric | Value | Source |
|---|---|---|
| Total `auth.users` | **131** | `supabase.auth.admin.listUsers()`, all `email_confirmed_at` set |
| V1 builder profiles (total) | **67** | `profiles` row count |
| ↳ published (visible on `/u/[username]`) | **44** | `profiles.published = true` |
| ↳ verified | **22** | `profiles.verified = true` |
| ↳ github_connected | **20** | `profiles.github_connected = true` |
| V2 entities | **0** | `entities` |
| Build Feed entries | **73** | `posts` |
| V2 proof_receipts | **0** (real) | `proof_receipts`. 8 test fixtures exist only in `ingestion_log` (all pointing at `github.com/anthropics/claude-code`); the receipts themselves were rolled back. |
| Active in last 30d (logins) | **49** | `auth.users.last_sign_in_at >= now() - 30d` |
| Active in last 30d (Build Feed posts) | **14 unique builders / 39 posts** | `posts.created_at >= now() - 30d` |
| New signups last 30d | **30** | `profiles.created_at >= now() - 30d` |
| Most recent signup | **bidit raj (`biditraj818`)** on 2026-05-14 (2 days ago) | `profiles ORDER BY created_at DESC LIMIT 1` |
| Most recent Build Feed entry | **"Therapy AI"** on 2026-05-05 (**11 days of silence**) | `posts ORDER BY created_at DESC LIMIT 1` |
| Last `profiles.last_seen_at` (top 5) | **2026-04-20, -18, -16, -15, -15** | `profiles.last_seen_at IS NOT NULL ORDER BY DESC LIMIT 5` — column appears stale; not actively maintained |

### Top 10 by Velocity Score (live data)

| # | Username | Full name | Velocity | Verified | Published |
|--:|---|---|--:|:-:|:-:|
| 1 | `aniketaslaliya801` | Aniket Aslaliya | 100 | ✓ | ✓ |
| 1 | `sunnyzheng606` | Sunny Zheng | 100 | ✓ | ✓ |
| 1 | `ryangrant144` | Ryan Grant | 100 | ✓ | ✓ |
| 4 | `sumitdongardive9` | Sumit Dongardive | 80 | ✓ | ✓ |
| 4 | `khairulanwar932` | Khairul Anwar | 80 | ✓ | ✓ |
| 4 | `joedias995` | Joe Dias | 80 | ✓ | ✓ |
| 4 | `eluwaemekamichael740` | Emeka Michael Eluwa | 80 | ✓ | ✓ |
| 8 | `slava671` | slava | 79 | ✗ | ✗ |
| 9 | `murtazazaidi476` | Murtaza Zaidi | 70 | ✗ | ✓ |
| 10 | `yuki448` | Yuki | 68 | ✓ | ✓ |

Note: `slava671` shows velocity_score=79 but is unverified AND unpublished — the leaderboard SQL would normally exclude this (the route file's exact filter not double-checked).

### Discrepancies vs handover-doc claims

| Handover claim | Actual | Status |
|---|---|---|
| "60 signups, 20 verified killer builders" (doc 05) | 67 profiles, 22 verified, 131 auth.users | Profiles match closely; auth.users is much higher (likely employer test accounts + clients) |
| "10+ hires made" (homepage / doc 06 §1.3) | `hire_confirmations` = 0; `profiles.hire_count` sum = 0; homepage shows "10+" via hardcoded floor `hireCount >= 10 ? hireCount : 10` (`src/app/page.tsx:216`) | **Discrepancy.** The number is fictional/aspirational copy, not data-derived |
| "810 X followers" (doc 05 §1.6) | Not measurable from DB | Out of scope |
| "Pre-revenue" (doc 05 §1.6) | 9 `full_access` active subs all from `oxleethomas+...@gmail.com` aliases (test accounts); 2 other `product='unknown'` active subs also `oxleethomas@gmail.com` | **Confirmed pre-revenue.** No third-party paying customers in DB |
| Atlas "28 specialist roles in Part I" (doc 05) | DB has 40 atlas_roles for v0.4 and 34 for v0.3 | Counts depend on whether you include operators/research/etc.; the 28 figure does not match either DB version cleanly |

---

## PART 6 — MONETIZATION

### Stripe / payment flow

- Checkout creation: `src/app/api/checkout/route.ts` (server-side `stripe.checkout.sessions.create()`).
- Webhook: `src/app/api/webhooks/stripe/route.ts` handles `checkout.session.completed`:
  - reads `session.metadata.product` (values seen in DB: `full_access`, `job_post`, `unknown`).
  - creates `auth.users` row if missing (via service role) with `user_metadata = { role: 'employer', password_set: false }`.
  - generates a magic link redirecting to `/set-password`.
  - inserts a `subscriptions` row.
  - sends welcome via Resend from `ShipStacked <hello@shipstacked.com>` with the magic link.
- Cancel: `src/app/api/employer/cancel/route.ts` (cancels via Stripe API).
- `success` page reads the `subscriptions` row after redirect.

### What gates "Full Access"

- `src/lib/user.ts:25-33` — `hasSubscription = !!(subscriptions WHERE email = user.email AND status = 'active' AND product = 'full_access' AND (expires_at IS NULL OR expires_at > now()))`.
- Consumers: `/u/[username]` (line 75–77 — gates contact info), `/u/[username]/contact-check.ts` (line 7 — gates message ability), `/talent` (unlocks full directory), `/post-job` (allows posting), `/messages` (employer-side).

### Active subscription count

- **11 active total** in `subscriptions`: **9** with `product='full_access'`, **2** with `product='unknown'`.
- **All 9 `full_access` emails are `oxleethomas+...@gmail.com` plus-addressed aliases** (employer1, employer8, employer888, employer999, employer987, employ123, employ678, employ321, shipstacked). These appear to be Thomas's own test accounts.
- **Zero non-Thomas paying customers.**

### What a paying employer unlocks

- Full `/talent` directory (unverified vs verified, contact info).
- Ability to post jobs at `/post-job`.
- Ability to message builders at `/messages`.
- Saved-profiles feature via `/api/saved-profiles`.
- Confirmed by `getResolvedUser()` role resolution: `hasSubscription` implies `role='employer'`.

### Revenue to date determinable from the data

- **None traceable.** Without inspecting Stripe Connect / Stripe dashboard externally, the DB cannot confirm any third-party payment cleared. The 9 `full_access` rows have `stripe_customer_id='test'` on the oldest entries and no `expires_at`. The webhook would have inserted real `stripe_customer_id` values for live customers — none observed.
- The $1.5K / $5K / $25K engagement ladder described in handover docs has **no DB representation** — no `engagements`, `invoices`, or `placements` table. Those would presumably be invoiced via Stripe directly outside the platform.

### Intent vs reality

- Handover doc 03 §6: "$199/month employer subscription stays as secondary surface, not primary CTA." The current homepage still leads with the $199/mo offer in the "For founders and hiring teams" section.
- Handover doc 06 §1.3: "Stated traction: 10+ hires made." Audit confirms this is hardcoded copy, not data.
- Pricing identity is the explicitly-unresolved Q1 in advisor brief (doc 06). The audit does not resolve it.

---

## PART 7 — KNOWN BROKEN / STALE / DORMANT

### Removed / dead

- **`/api/scout`** — entire body is `return NextResponse.json({ error: 'Scout has been removed.' }, { status: 410 })`. Should probably also delete the route file, but as a 410 stub it's harmless.

### Zero-row tables that something references

| Table | Rows | Referenced by | Effect |
|---|--:|---|---|
| `hire_confirmations` | 0 | `/api/hire-confirm/count` (drives "10+ hires made" homepage badge); `/hire-confirm` page; `/api/hire-confirm/nudge` cron | Badge always shows hardcoded floor "10+" because count never exceeds 10; nudge cron has nothing to operate on |
| `candidates` | 0 | `/api/admin/candidates/next`, `/admin/candidates` UI | Admin outreach queue is empty |
| `entities` / `proof_receipts` / `verification_events` / `attestations` | 0 | All V2 pages (`/paste/review`, `/p/[slug]`, `/atlas/roles/[id]` "recent receipts" block, `/llms.txt`, OG cards for receipts) | V2 surface renders, but every list-view shows "no receipts yet"; receipts block on `/atlas/roles/[id]` is empty for every role |

### Test data masquerading as real

- `hire_intakes` (5 rows): every row is from `ox@agentagous.com`. Subjects include literal words "Smoke test", "Test", "End To End". No real customer submissions.
- `claim_submissions` (2 rows): both from `ox@agentagous.com` with `name='Test Claimer'` and `name='End To End Claim Test'`.
- `ingestion_log` (8 rows): every row points at `https://github.com/anthropics/claude-code` with `receipt_id=null`. These are Step-6 verification fixtures; the corresponding `proof_receipts` rows were rolled back but `ingestion_log` was not (FK is `ON DELETE SET NULL`, so the records persisted with null receipt_id).
- `capabilities_vocab` (4 rows): leftover from test publishes that rolled back. Tag values not introspected.

### Tables that don't exist (referenced by code or handover docs)

| Reference | Actual table that exists | Action needed |
|---|---|---|
| `post_likes` (referenced by /api/comments/likes? No — actually that uses comment_likes; reactions on posts are stored in `posts.reactions` jsonb) | `comment_likes` | None — likely a phantom reference; if anywhere in code expects `post_likes` it will error |
| `hiring_inquiries` (Explore agent guessed) | `project_inquiries` (4 rows) | None — the Explore agent guessed wrong; actual table is `project_inquiries` |
| `atlas_role_claims` (Explore agent guessed) | `claim_submissions` (2 rows) | None — Explore agent guess was wrong |
| `candidate_outreach_log` (used by `/api/admin/candidates/log`) | `outreach_log` (0 rows) | **The route may write to a missing table.** Worth verifying that `/api/admin/candidates/log` writes to `outreach_log` and not `candidate_outreach_log` — if the latter, the route is broken |
| `candidate_queue` (used by `/api/admin/candidates/next`) | `candidates` (0 rows) | Same — verify the actual table name the route queries |
| `practitioner_targets` (named in handover 03 as planned) | none | Never created |

### Tech debt from handover docs — still unresolved

| Item | Source | Status |
|---|---|---|
| `ATLAS_ROLE_LABELS` const duplicated in `/api/intakes/claim/route.ts` AND `ClaimForm.tsx` | docs 02, 04 | **STILL DUPLICATED** (greps confirm both files reference the same shape) |
| Duplicate `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env.local` | doc 02 | **STILL DUPLICATED** (confirmed by grepping `.env.local`) |
| Hardcoded `CRON_SECRET='<ROTATED_CRON_SECRET_REDACTED>'` in `/api/hire-confirm/nudge/route.ts` | doc 02 | Not directly verified by audit — file exists; assume still present |
| `/api/inquiry/route.ts` lacks HTML escaping for user inputs in outbound emails | doc 02 | Not directly verified by audit |
| Next.js 16 `middleware` deprecation — rename `src/middleware.ts` → `src/proxy.ts` | doc 02 | **STILL `middleware.ts`** — and now extended with V2 JSON-LD content negotiation, so the rename carries more risk |
| ClaimForm heading hierarchy (`<h2>` should be `<h3>`) | doc 04 | Not verified |
| `hello@shipstacked.com` bidirectional inbox setup | docs 04, 05 | **STILL DOES NOT RECEIVE MAIL** — Resend SES/DKIM are the only DNS records on `shipstacked.com` for mail; doc 04 ranks fixes Google Workspace > Cloudflare Email Routing > Namecheap forwarding |
| `npm audit` 3 vulnerabilities (2 moderate, 1 high) | doc 04 | Not re-run by audit |
| `/admin/intakes` view never built | docs 02, 03, 04 | **STILL NOT BUILT** — Thomas vets via Supabase Studio |

### Build Feed silence

- The most recent `posts` row is from 2026-05-05 — **11 days of silence** on the only public-facing "things are alive" surface. With 14 unique builders posting in the last 30 days (39 posts total), activity is heavily front-loaded earlier in the month and has decayed to zero in the most recent two weeks.

### Stale data in `profiles.last_seen_at`

- Top 5 `last_seen_at` values are all April 2026 (most recent: 2026-04-20). The column does not appear to be maintained (likely a `/dashboard` ping that's been removed or fails silently). Not load-bearing but `/dashboard` may use this for "back since" copy that's now misleading.

### TODOs in V2 code

- `src/services/extractors/github.ts:116` — "TODO: when extractors B/C ship, lift shared capability terms to..."
- `src/services/extractors/v0.ts:116` — "TODO: skip body fetch when classifier metadata is empty — saves ~5s on..."
Both are minor, scoped to V2 paste analyzer. Non-blocking.

---

## PART 8 — WHAT V2 TOUCHED

V2 work since 2026-05-15 = 13 commits (`30baa5a` → `151a59e`). Files-touched summary derived from `git log --since="2026-05-15" --name-only`:

### Routes NOT modified by V2 (the asked-about set)

| Route | Touched by V2? | Confirmation |
|---|---|---|
| `/u/[username]` | **No** | Not in any V2 commit's file list |
| `/feed` | **No** | Not touched |
| `/feed/[id]` | **No** | Not touched |
| `/leaderboard` | **No** | Not touched |
| `/hire`, `/hire/thanks` | **No** | Not touched |
| `/claim`, `/claim/thanks` | **No** | Not touched |
| `/jobs`, `/jobs/[id]` | **No** | Not touched |
| `/join` | **No** | Not touched |
| `/talent` | **No** | Not touched |
| `/dashboard`, `/dashboard/edit` | **No** | Not touched |
| `/employer`, `/employer/messages` | **No** | Not touched |
| `/messages`, `/client/inbox` | **No** | Not touched |
| `/post-job`, `/employers`, `/company/[slug]` | **No** | Not touched |
| `/api-docs` | **No** | Not touched |

### Existing user-facing routes V2 DID touch

| Path | Change | Risk |
|---|---|---|
| `/atlas` (`src/app/atlas/page.tsx`) | **Expected per ask.** Modified twice: `3ce240e feat(atlas): ship v0.4` (replaced markdown source with v0.4 content adding Part VII Practitioner Layer) and `30baa5a fix(atlas): render PART headings, dedupe byline, auto word count` | None to V1 flows — same surface, updated content |
| `/login` (`src/app/login/page.tsx` + new `src/app/login/actions.ts`) | Touched in `4cfacc2 feat(v2): Step 5 — /paste + /paste/review UI`. Diff is small: 6 lines in `page.tsx`, 20-line new `actions.ts`. Likely adds `redirectTo=/paste` support | Low — additive |
| `src/middleware.ts` | Touched in `151a59e`. Adds JSON-LD content negotiation: rewrites `/p/<slug>.json` → `/api/p/<slug>/jsonld` and `Accept: application/ld+json` → same; same for `/atlas/roles/<id>`. Bails BEFORE the auth gate so JSON-LD endpoints stay public | Low if rewrite patterns are tight; the V1 auth gate (which protects `/dashboard`, `/employer`, etc.) is unchanged in semantics |
| `src/app/llms.txt/route.ts` (was `public/llms.txt`) | Replaced static V1 file with dynamic route enumerating Atlas v0.4 + recent receipts | Low — content shape changed but endpoint URL unchanged |
| `src/app/og/route.tsx` | Touched in `7db17d7`. Adds receipt OG-card branch (`type=receipt&slug=...`) that reads `proof_receipts` + `entities`. Existing V1 OG paths preserved | Low if existing query-string types are unchanged |

### Net assessment

V2 work this week was **disciplined about scope** with respect to the user-facing V1 surface. The only intentional modification to an existing user-facing route is `/atlas`, which the ask anticipated. The four bridge touches (`/login`, middleware, llms.txt, og) are additive and don't change V1 behavior, but they're worth flagging because they touch infrastructure (middleware, edge routing) where a regression would be platform-wide.

---

## PART 9 — CONTRADICTIONS AND GAPS

### Where handover docs disagree with each other

| Disagreement | Older doc says | Newer doc says | Resolution |
|---|---|---|---|
| What commit `eefca0e` shipped | Doc 02: shipped `/hire` AND `/claim` UI | Doc 04: shipped only `/hire`; `/claim` UI was uncommitted, rescued in `2a1db2c` | **Doc 04 is correct** (git log confirms). Doc 02 was wrong; the addendum corrects it. |
| ClaimForm.tsx styling longhand cleanup | Doc 02: applied to ClaimForm but not yet committed | Doc 04: today's diff showed no uncommitted changes to ClaimForm; "theory: applied during Step 4 then somehow not saved or rolled back during recovery" | Per doc 04: cosmetic only, ClaimForm renders cleanly. Not investigated by this audit. |
| V1 thesis status | Doc 01 (May 4): the proof-of-work graph that aggregates GitHub/HF/Upwork/Discord/etc. — full distribution-channel attack | Doc 03 (May 12): "additive reframe over full repositioning" — V1 kept as a secondary surface beneath the Atlas/diagnosis service | **Doc 03+ supersede.** Doc 01's tactical scrape/import/Discord-bot ideas are now part of a longer-term plan, not the active week's work. |
| Atlas Part I count | Doc 03 §2: "28 specialist roles in Part I" | Doc 05 §3.1: enumerates 24 in detail (7 cluster A + 4 B + 4 C + 5 D + 4 E) | Both quoted. DB has 40 v0.4 + 34 v0.3 — counts depend on what you include. |
| Atlas version live | Doc 04: Atlas v0.3 deployed | Current code: `src/content/atlas-v04.md` rendered at `/atlas`; commit `3ce240e` shipped v0.4 | **v0.4 is live.** v0.3 only persists in the DB seeding for backward-compat lookups (34 rows). |
| llms.txt importance | Doc 04: described as a beacon, shipped | Doc 05: "demoted out of beacon track... contested utility" | Doc 05 is current view. Code reflects neither — endpoint exists and is now dynamic (V2 commit `151a59e`). |
| Pricing direction | Doc 03 §3: $199/mo demoted to secondary surface, $1.5K/$5K/$25K ladder is primary | Doc 06: unresolved — three options (Marketplace / Infrastructure / Hybrid) explicitly open for advisor input | **Open.** Doc 06 supersedes; doc 03's "decision locked" was provisional. |

### Where handover docs disagree with current code/database

| Doc says | Code/DB says | Gap |
|---|---|---|
| "10+ hires made" (doc 06; homepage) | `hire_confirmations` = 0; `profiles.hire_count` sum = 0; homepage code floors at 10 | Number is fictional. Action: replace with a real metric or remove the badge |
| `practitioner_targets` table to be created (doc 03) | Table does not exist | Never built |
| `/admin/intakes` view as next planned step (docs 02, 03, 04) | Not present in `src/app/admin/` | Never built. Thomas vets via Supabase Studio |
| Schema.org JSON-LD on all 5 page types as Item 1 to ship (doc 05) | Only V2 endpoints (`/p/.json`, `/atlas/roles/.json`) shipped. V1 pages (`/`, `/jobs`, `/talent`, `/u/`) have no Person/JobPosting/Organization markup | Major gap if S-tier beacon prioritization is still the plan |
| AgentCard at `/.well-known/agent-card.json` planned (doc 05) | Not in `public/` or as a route | Not built |
| MCP server at `mcp.shipstacked.com` (doc 06) | Not in repo | Not built |
| Atlas should be "controlled vocabulary" referenced externally (doc 06) | Atlas roles ARE now dereferenceable at `/atlas/roles/[id]` and emit JSON-LD — first step toward this. Not yet open-sourced as a package | Partially built |
| Pre-revenue (doc 05) | Confirmed: no real paying customers in `subscriptions` | Aligned |
| 60 signups, 20 verified (doc 05) | 67 profiles, 22 verified | Aligned within rounding |

### Gaps the audit could not close — questions only Thomas can answer

1. **Are the 9 `oxleethomas+...@gmail.com` `full_access` subscriptions truly all test data**, or did Thomas use plus-addressing for real customers? (DB cannot tell.)
2. **What is the actual real-world hire count?** The "10+" on the homepage is hardcoded. Doc 03 quotes "10+" as if real. Did 10+ actual placements happen via the platform, off-platform invoiced engagements, or zero?
3. **Is the V1/V2 identity disconnect (Part 3) a known follow-up or a surprise?** The V2 commit `151a59e` explicitly flags "`/u/[slug]` profile pages (Phase 1B)" as a known follow-up. The audit cannot tell whether the design intent for Phase 1B is to merge `profiles`+`entities` or to render them in parallel.
4. **Which Vercel env vars are currently set in production** (vs the local `.env.local` enumerated above)? The audit cannot read Vercel's env without `vc env pull`.
5. **What did the "Step 6 (V1-phase): /admin/intakes view" plan actually want?** The handover docs describe its shape but it was never built. Is it now obsolete (because V2 ingest is different) or still needed for vetting `hire_intakes` + `claim_submissions`?
6. **Has Thomas talked to enough hiring teams to know whether they live on LinkedIn, Wellfound, or recruiter agents?** Doc 06 names this as an open question; audit cannot answer.
7. **What is the intended migration path for existing V1 builders into V2 entities?** No code path observed; no admin tool present. Required before exposing `/paste` to real users without breaking the duplicate-identity problem in Part 3.
8. **The 11-day Build Feed silence**: is this expected (the platform isn't being actively driven yet) or a regression in the posting flow? `/api/feed POST` and `/api/v1/builds POST` exist; whether they fail silently for real users hasn't been smoke-tested by this audit.
9. **Is `/api/admin/candidates/log` actually writing to a real table?** The audit could not enumerate the route's target without reading it carefully. If it targets a `candidate_outreach_log` table that doesn't exist, admin logging is silently broken.
10. **Do the 9 active `full_access` subscriptions correctly gate `/post-job`, `/talent`, `/messages`?** The gating logic is clear in `src/lib/user.ts`; the live-behavior test was not run.

---

## APPENDIX A — METHOD NOTES

- The audit was performed with read-only access. Three temporary scripts were written to `/tmp/` to query the live Supabase project via service role; all three were deleted after the audit (no scripts in the repo were modified). DB queries inspected: table existence, row counts, sample rows (column inspection only — no PII printed except where structurally necessary like top-10 usernames which are already public on `/leaderboard`).
- The route inventory was assembled by spawning an Explore subagent and cross-checking its output against direct file reads for the critical paths (`/u/[username]`, `/paste/publish`, `/api/webhooks/stripe`, `src/lib/user.ts`, `src/lib/entities.ts`, `src/lib/paste/publish.ts`). Where the subagent guessed a table name that did not exist in the DB (e.g. `hiring_inquiries`, `atlas_role_claims`, `candidate_queue`), the audit corrected to the actual name via PostgREST's "perhaps you meant" hint and re-verified.
- The handover docs were read in full (docs 02–06; doc 01 was read selectively — full Tier-1 surfaces and Strategy/Outcome sections, skim of distribution-channel Tiers 2–5 which are surface-by-surface and don't change the audit conclusions).
- "Guesses" are flagged inline as "Not directly verified by audit" or "Not investigated". Items called out as confirmed/verified were either re-greped or re-queried.

---

*End of audit. Read-only. Nothing committed. Awaiting Thomas's review.*
