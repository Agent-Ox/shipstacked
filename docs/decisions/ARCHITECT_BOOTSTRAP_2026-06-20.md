# ARCHITECT BOOTSTRAP BUNDLE — 2026-06-20

Single self-contained bundle for a fresh architect-Claude session resuming ShipStacked after Phase 9 Part 1.6. Assembled by terminal Claude on 2026-06-20 at HEAD `1633de0` (code unchanged since `c3a2174`).

**Contents**
- PART 1 — Session handoff (`SESSION_HANDOFF_2026-06-20.md`, verbatim)
- PART 2 — Form fields inventory (`FORM_FIELDS_INVENTORY.md`, verbatim)
- PART 3 — Resume Here (`RESUME_HERE.md`, verbatim)
- PART 4 — Comprehensive sign-up-variables diagnostic (re-run live on `1633de0`)
- PART 5 — Live DB inventory snapshot (queried live 2026-06-20)
- PART 6 — Current main code state
- PART 7 — Architect-Claude bootstrap prompt (paste-to-start)

Every file:line citation in Part 4 was re-verified against live code this session, not carried from recall.

---

# PART 1 — SESSION HANDOFF

*(verbatim copy of `docs/decisions/SESSION_HANDOFF_2026-06-20.md`)*

# SESSION HANDOFF — 2026-06-20 (post Phase 9 Part 1.6)

Single bootstrap doc for a fresh terminal Claude. Read this + `RESUME_HERE.md` and you're oriented.

## Where we are
- **Current HEAD on main:** `c3a2174` ("Phase 9 Part 1.6: unify NavBar menu — mode-driven, not path-dependent"). Verify: `git log -1`.
- **This session's commits (in order):**
  - `35db509` — Builder signup skills fix (insert was missing `category` → all selections silently dropped).
  - `0efcb2b` — self-message CTA owner guard + stale post-payment email (copy + landing guard).
  - `c3a2174` — NavBar unified (mode-driven; removed all `pathname.startsWith` branching).
- **Working tree:** clean.
- **Vercel prod:** deployed and live (each commit verified Production deployment `state=success`; `shipstacked.com` 200, `/dashboard` anon 307→/login).

## What's shipped (Phase 9 Part 1 complete)
- **Pillar-aware `/dashboard`** (`5a3726e`, merged to prod): builder-only renders the unchanged `BuilderDashboardClient`; multi-pillar/non-builder renders `DashboardShell` with Team/Agent/Buyer/Hirer sections; only a zero-pillar user is sent to `/join`. Fixed the team/agent "kicked to /join" bug.
- **Skills persistence on Builder signup** (`35db509`): `join/page.tsx` now inserts skills with `category` (`claude_use_case`/`ai_tool`/`framework`/`domain`) + captures the insert error.
- **Owner doesn't see self-message CTA** (`0efcb2b` A): `isOwner` is the first branch of the `/u/[username]` CTA ternary → owner sees "Edit profile", not "Message {self}".
- **Post-payment email password-agnostic + safe stale-link landing** (`0efcb2b` C): Stripe webhook email copy no longer says "set your password" and routes to `/hirer`; `/set-password` skips the form + routes via `routeAfterAuth` if `password_set` is already true. (`/auth/callback` was already safe.)
- **NavBar mode-driven** (`c3a2174`): `getMenuLinks()` resolves purely from modes (no pathname); Edit-team/Edit-agent moved out of `getIdentityLinks` into `getMenuLinks`; same menu on every page.

## What was diagnosed but NOT shipped (intentional deferrals)
- **Issue B** (verify-congrats email on profile-complete) — intended idempotent product behavior; no fix needed.
- **Issue D** (hirer messaging "requires" a company profile) — it's a SOFT client-side nudge only (server `/api/messages` does NOT require `employer_profiles`); operator-deferred to backlog.
- **Stripe $1 price in Production env** (`STRIPE_PRICE_FULL_ACCESS=price_1TIBUCE3cjWtx7BryE30mxxK`) — INTENTIONAL operator override for testing. **Must flip back to $199 (unset the var, fallback is the $199 `price_1TJhIzE3cjWtx7BrDkZxLavC`) before outreach unpauses.**
- **"$199/mo" hardcoded label on EnableHiringButton** (`:156,:168`) — INTENTIONAL; $199 is the real launch price. The label is static and does NOT reflect the env price (so during the $1 test the button still says $199).
- **Stale `GITHUB_TOKEN` in `.env.local:31`** — the pre-rotation (dead) token; 401s the GitHub API and breaks `scripts/v2/enrich-by-usernames.ts`. Git push works (keychain re-stored). Operator backlog.

## What the diagnostic just surfaced (full reality map)
From the comprehensive signup-variables diagnostic (this session, all cited to source on `c3a2174`):

1. **Multi-pillar accumulation is unrestricted** — one auth account can be builder + N teams + N agents + buyer + hirer simultaneously. `/api/join/{team,agent,buyer}` gate on "logged in" only (no pillar guard); modes are independent OR-able booleans (`user.ts:105-112`). Team/agent are multi-per-owner (slug-keyed); buyer one-per-owner.
2. **AgentSection has NO EnableHiringButton** (`AgentSection.tsx` — no import/usage) — an agent-only owner has no in-app path to subscribe.
3. **Subscription is per-human-email, never pillar-scoped.** Webhook writes `subscriptions.email` with no entity id (`webhooks/stripe:107`); all gates read `.eq('email', user.email)`. A team admin paying $199 makes THEM a hirer, not their team.
4. **The $199 unlocks ONLY:** builder messaging (`/api/messages:164` paywall), builder contact reveal (`/u/[username]:118` `hasAccess`, lock `:363`), and the full builder directory (`/talent:174` — non-subs see a 6-builder teaser). **Nothing else.** Team/agent contacts are public `mailto:` for ALL users, paid or anonymous (`team/[slug]:325`, `agent/[slug]:295`); team/agent directories on `/talent` are fully public (`:55-92`). No buyer/hirer badge exists.
5. **routeAfterAuth Client+Hirer inconsistency:** a Card-4 user who toggles lands on `/client/inbox` because `client` outranks `hirer` in `auth-routing.ts:22-23` — yet NavBar then shows the full hirer menu (state 9 mismatch).
6. **Team/agent in-app messaging doesn't exist** — `conversations` has only `employer_email` + `builder_profile_id→profiles` (no team/agent subject column or path). The Messages link appears for team/agent-only users but leads to an effectively empty inbox.
7. **Team/agent job authorship doesn't exist** — `jobs.employer_email` is per-user, not per-entity.

## Phase 9 Part 2 — what would need to ship for true four-pillar parity
(Documented as the gap, NOT a sprint plan — scope deliberately not estimated.)
1. **Entity-keyed subscription** — `subscriptions` needs `team_entity_id`/`agent_entity_id` columns; gates read by entity when the subject is entity-scoped.
2. **Entity-targeted conversations** — `conversations` needs a subject-entity column; `/api/messages` must allow team/agent as recipient subjects.
3. **Entity-scoped job ownership** — `jobs.employer_email` → `jobs.poster_entity_id`.
4. **AgentSection EnableHiringButton** — or an explicit decision that agents don't subscribe.
5. **routeAfterAuth Client+Hirer fix** (state 9).
6. **Confusion-mitigation copy** on the team/agent toggle ("billed per-user, not per-team").

## How to resume next session
1. Read this file (`docs/decisions/SESSION_HANDOFF_2026-06-20.md`) first.
2. Then read `docs/decisions/RESUME_HERE.md` for older-decisions context (incl. the §I site-audit findings + Phase 8.5 real-Stripe pre-launch BLOCKER).
3. Then read `docs/audit/PHASE1_BLOCK5_REVISED.md` *only if* Phase 1 receipts work resumes (conditional pointer; confirm it exists before relying on it).
4. **Operator (Thomas) decides what Part 2 scope to take on — DO NOT auto-start any code.**

## Files modified this session (`git log --name-only 5a3726e..HEAD`)
```
## c3a2174 Phase 9 Part 1.6: unify NavBar menu — mode-driven, not path-dependent
src/app/components/NavBar.tsx

## 0efcb2b Fix owner-self-message CTA + stale post-payment password email
src/app/api/webhooks/stripe/route.ts
src/app/set-password/page.tsx
src/app/u/[username]/page.tsx

## 35db509 Fix Builder signup: skills silently dropped due to missing category
src/app/join/page.tsx
```
(Phase 9 Part 1 itself — `DashboardShell`, `TeamSection`, `AgentSection`, `BuyerSection`, `HirerSection`, `dashboard/page.tsx`, `lib/user.ts`, `lib/auth-routing.ts` — shipped in `5a3726e`, before the range above.)

## Open standing rules (preserve from prior sessions)
- **Architect-Claude diagnoses first** — full discovery/reality map before any code spec.
- **Paste-back terminal blocks** ready to copy (DDL/destructive ops go to the operator's Supabase Dashboard, not run from terminal).
- **Operator's red-flag word: "probably"** — never act on "probably"; verify.
- **Facts come from `cat`/`grep`/live verification, never recall.**
- **Commit gate:** `npx tsc --noEmit` (always) + `npm run build` (when routes change) before commit.
- **Git identity:** `Thomas Oxlee <ox@agentagous.com>`.
- **Stripe is on a live account the terminal key can't see** (terminal `acct_1T0PU6…` ≠ prod `…E3cjWtx7Br`); confirm charges/subscriptions in the Stripe dashboard, not from terminal.
- **Vercel deploy status / preview URLs** aren't readable from terminal (no vercel CLI/gh); read them via the public GitHub deployments API on the commit SHA, or the operator's dashboard.

---

# PART 2 — FORM FIELDS INVENTORY

*(verbatim copy of `docs/operator/FORM_FIELDS_INVENTORY.md`, created 2026-06-16, unchanged)*

# ShipStacked — Form Fields Inventory (every signup/onboarding flow)

**Purpose:** source-of-truth field reference for building a manual, copy-paste-ready operator smoke-test script. Every field below was extracted from actual source (not memory), with `file:line` citations. Verbatim labels, placeholders, validation rules, and enum option lists are quoted exactly.

**Date compiled:** 2026-06-17. Repo state: `main @ cdd0ed0`.

---

## 0. Orientation — read this first

### The "two save paths" model (load-bearing)
ShipStacked has two distinct submission threat models (documented in project memory):
- **Dashboard / browser path** — writes **direct-to-Supabase from the client** via the RLS-scoped browser client. **Light or zero server-side validation.** Used by: Builder signup (Card 1), Builder profile edit (`/dashboard/edit`), team-member self-linking.
- **Agent / `/api/v1/*` + `/api/join/*` path** — POSTs to a server route with **full server-side validation**. Used by: Team signup, Agent signup, Buyer signup, team/agent profile edits, the paste-publish flow, and all bearer-key agent endpoints.

This means **builder fields have no server-side length/format/required enforcement** — only client gating + DB constraints. Team and agent fields are validated server-side. Keep this in mind when designing negative tests.

### Universal gotchas (flag these in the script)
1. **Password min-length is inconsistent across pages:** signup/auth = **6** (`join`), `/update-password` = **6**, `/set-password` = **8**, `/reset-password` = none (request-only).
2. **`/reset-password` redirect is hardcoded to `https://shipstacked.com/update-password`** — reset links always point at prod, even from localhost.
3. **No zod schemas exist for signup/profile/team/agent input.** The only zod schema is `proof-receipt-v0.1.ts` (the paste-publish flow). Team/agent validation is hand-rolled in `src/lib/{team,agent}/validate.ts`.
4. **`/api/keys` scope is fail-open:** an invalid `scope` is silently coerced to `'builder:rw'`, not rejected.
5. **Agent pillar has NO hiring/checkout button** — hiring is a builder/team/hirer affordance only.
6. **`POST /api/v1/builds` returns `build_posted:true` even if enrichment (the receipt-producing step) fails** — it only confirms the `posts` insert (known SERIOUS audit finding).
7. **Username is auto-generated, never user-chosen** (builder signup + `/api/keys`): `name→[a-z0-9]≤20 + random number`, no uniqueness pre-check.
8. **Builder publishes immediately** (`published:true` on insert); team & agent default `published:false` and require a publish toggle.

### Realistic test-value seed set (suggested, for copy-paste)
Use a deliverable plus-alias for OTP/magic-link flows. Tag everything for cleanup. Example pattern from prior audits: `smoketest-<date>-*` slugs/usernames/agent-names, emails like `oxleethomas+st-builder@gmail.com`.

---

## 1. `/join` — Card selector

**Route:** `/join` · **Component:** `src/app/join/page.tsx` (`'use client'`). Client-rendered — cards are NOT in SSR HTML.

**What renders:** page heading `How do you build?` (`:363`), intro `Pick the path that matches how you work. You can always change later.` (`:366`), then 4 `<button>` cards. Footer: `Already have an account?` → `Sign in →` to `/login` (`:428-430`).

**Click behavior (`onCardClick`, `:132-141`):** does NOT navigate or open a modal — it changes a `view` state. If logged out → `view='auth'` (shared email/password step) → on success routes to the card subflow. If already logged in → straight to the subflow. (`View` states: `cards`, `auth`, `builder-0`, `builder-1`, `builder-2`, `team-form`, `agent-form`, `buyer-form`, `buyer-2`.) On mount, a logged-in user who already has a `profiles.username` is redirected to `/dashboard` (`:118-129`).

| # | Card heading (verbatim) | Quote line (verbatim) | Detail line (verbatim) | `card` value | Routes to |
|---|---|---|---|---|---|
| 1 | `Solo AI Builder` | `"I ship AI work. I want my real builds to get me opportunities."` | `Free supply profile. Optional Buyer Mode later.` | `builder` | `builder-0` |
| 2 | `Team / Agency / Studio` | `"We deliver AI implementation for clients. We may also hire specialists."` | `Show what your team has shipped. Get found by the SMBs and Series-A's looking for AI implementation capability.` | `team` | `team-form` |
| 3 | `Autonomous Agent` | `"I'm an AI agent operating on behalf of my principal."` | `API-keyed agent identity. Register via the open auth.md protocol or generate keys directly. Post builds, manage your profile, integrate into any agent platform — Claude, Cursor, ChatGPT, custom.` | `agent` | `agent-form` |
| 4 | `I want to hire builders` | `"I'm here to hire, not to sell my own work."` | `Lightweight buyer-only entity. Buyer Mode active by default.` | `buyer` | `buyer-form` |

### Shared auth step (`renderAuth` `:435-453`, `handleAuth` `:144-170`)
Heading `Create your account` (`:437`). Sub-copy: `One step. We'll continue with {your builder profile | your team setup | your agent setup | your hiring setup} after.` (`:439`).

| Field | Label (verbatim) | Type | Required | Validation | Placeholder |
|---|---|---|---|---|---|
| Email | `Email` | `email` (autoComplete `email`) | yes | trimmed, non-empty | `you@example.com` |
| Password | `Password` + helper `(min 6 characters)` | `password` (autoComplete `new-password`) | yes | `password.length < 6` rejected → `Email and password (min 6 chars) required.` | (none) |

**Call:** `supabase.auth.signUp({ email, password })` (`:153`). No REST endpoint. Button `Create account` / `Creating account...`, disabled when `loading || !email.trim() || password.length < 6` (`:708-709`). Terms/Privacy links to `/terms`, `/privacy`.

---

## 2. Builder flow (Card 1)

### 2A. Signup — `/join` Card 1 (two steps: `builder-0` → `builder-1`)

**Submit:** `handleBuilderSubmit` (`:173-242`) writes **direct-to-Supabase** (no `/api/join/builder` route). Inserts `profiles` (`:185-198`), conditionally `posts` (`:202-212`) and `skills` (`:214-220`); fire-and-forget `POST /api/welcome` + `POST /api/enrich`. Profile insert hardcodes `published:true`, `verified:false`, `accepts_project_inquiries:true`.

**Username (auto-generated, NOT a field, `:181-183`):** `fullName.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20) + (random 100–999)`. No uniqueness check.

**Step 0 (`renderBuilder0` `:456-491`)** — gate to advance: `fullName && role && bio` all non-empty (`:355`).

| Field | Label (verbatim) | Type | Required | Placeholder (verbatim) | Notes |
|---|---|---|---|---|---|
| Full name | `Full name` | text (autoComplete `name`) | **required** (gate) | `Sara Rodriguez` | drives username |
| Email | `Email` | email, **disabled** | locked | (none) | helper `Linked to your account.` |
| Role / title | `Role / title` | text | **required** (gate) | `AI Automation Engineer` | → `profiles.role` |
| One-line bio | `One-line bio` | text | **required** (gate) | `I build AI agents that run without human input` | → `profiles.bio` |
| Location | `Location` `(optional)` | text | optional | `Barcelona, Spain` | saved `||null` |
| GitHub | `GitHub` `(optional but recommended)` | url | optional | `https://github.com/username` | `github_url` |
| X / Twitter | `X / Twitter` `(optional)` | url | optional | `https://x.com/username` | `x_url` |

**Step 1 (`renderBuilder1` `:494-537`)** — all optional. A `posts` row is created **only if** `What did you build?` AND `What was the outcome?` are both non-empty (`:202`).

| Field | Label (verbatim) | Type | Placeholder (verbatim) | Maps to |
|---|---|---|---|---|
| What did you build? | `What did you build?` `(optional)` | text | `AI invoice parser for a 3-person law firm` | `posts.title` |
| What was the outcome? | `What was the outcome?` `(optional)` | text | `Cut review time from 4 hours to 20 minutes` | `posts.outcome` |
| Link | `Link` `(optional)` | url | `https://github.com/you/project` | `posts.url` |
| How do you use AI? | `How do you use AI?` `(optional)` | tag multi-select | — | `skills` |
| AI tools you use | `AI tools you use` `(optional)` | tag multi-select | — | `skills` |
| Frameworks & tools | `Frameworks & tools` `(optional)` | tag multi-select | — | `skills` |
| Domain expertise | `Domain expertise` `(optional)` | tag multi-select | — | `skills` |

Tag option values (signup, `page.tsx:6-9`): see **Appendix A**. No regex/maxLength on any text input. On success → `builder-2` success screen showing `shipstacked.com/u/{username}`.

### 2B. Builder profile edit — `/dashboard/edit`

**Route:** `/dashboard/edit` · server `src/app/dashboard/edit/page.tsx`, client `EditProfileForm.tsx`. Loads profile by `email == user.email`; redirects `/login` (no user) or `/join` (no profile). **Submit:** direct-to-Supabase `profiles.update(...).eq('id', profile.id)` (`:277-290`) + delete/reinsert `projects` & `skills`; fire-and-forget `POST /api/profile/verify-check` + `POST /api/enrich`. **No `required`, maxLength, or regex on any field** (avatar is the only validated input). Heading `Edit profile`; button `Save changes`/`Saving...`. **No `username` field** (slug==username invariant), **no `contact_email` field**; `email` shown disabled.

| Field (DB col) | Label (verbatim) | Type | Validation | Placeholder/options |
|---|---|---|---|---|
| `avatar_url` | button `Upload photo`/`Change photo`; helper `JPG, PNG or WebP. Max 5MB.` | file `image/*` | type ∈ `image/jpeg,png,webp`; >5MB rejected; resized client-side to ≤400px JPEG q0.85; uploads `POST /api/avatar` (multipart `file`) | — |
| `full_name` | `Full name` | text | none | — |
| `email` | `Email` | email, **disabled** | not submitted | — |
| `role` | `Role / title` | text | none | — |
| `location` | `Location` | text | none | — |
| `availability` | `Availability` | single-select pills | ∈ AVAILABILITY_OPTIONS | default `freelance` |
| `primary_profession` | `Primary profession` | single-select | ∈ PROFESSIONS | — |
| `seniority` | `Seniority` | single-select | ∈ SENIORITY_OPTIONS | — |
| `work_type` | `Work type preference` | single-select | ∈ WORK_TYPE_OPTIONS | — |
| `day_rate` | `Day rate (optional)` | single-select | ∈ DAY_RATE_OPTIONS | — |
| `timezone` | `Timezone` | `<select>` | ∈ TIMEZONES | empty option `Select timezone` |
| `languages` | `Languages spoken (optional)` | multi-select | ⊆ SPOKEN_LANGUAGES | saved `null` if empty |
| `team_entity_id` | `Team / Agency / Studio you're with (optional)` | autocomplete | debounced 300ms `GET /api/teams/search?q=…`; stores `entity_id` | placeholder `Search your team's name…` |
| `bio` | `One-line bio` | text | none | — |
| `about` | `What do you build with AI?` | textarea (5 rows) | none | — |
| `github_url` | `GitHub` | url | none | — |
| `x_url` | `X / Twitter` | url | none | — |
| `linkedin_url` | `LinkedIn` | url | none | — |
| `website_url` | `Personal website` | url | none | — |

**Projects** (repeatable, max 5): per project — `Project title` (text), `What did you build?` (textarea), `How did you use AI?` (textarea, `prompt_approach`), `Outcome` (text), `Project URL` (url). All optional; only rows with non-empty title persist.

**Skills** (6 multi-select groups, saved to `skills` with a `category`): `AI use cases` (`claude_use_case`), `Other LLMs` (`llm`), `Coding languages` (`language`), `Frameworks and tools` (`framework`), `AI-native platforms` (`ai_tool`), `Domain expertise` (`domain`). Option values → **Appendix A**.

Enum option lists (`EditProfileForm.tsx:10-16`) → **Appendix B**.

---

## 3. Team flow (Card 2)

### 3A. Signup — `/join` Card 2 (`renderTeamForm` `:568-607`)
**Submit:** `handleTeamSubmit` → `POST /api/join/team` (`:254`). Server route `src/app/api/join/team/route.ts`; auth = cookie session (401 `Not authenticated`).

**Slug auto-derivation** while typing team name (`deriveSignupSlug`, lowercases, `[^a-z0-9]+`→`-`, collapse/trim hyphens, slice 40). Typing in slug field forces lowercase + marks manual.

**Slug regex (client + server identical):** `/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/` (3–40 chars, kebab-case).

| Field (body key) | Label (verbatim) | Type | Required | Client | Server validation + exact error | Placeholder |
|---|---|---|---|---|---|---|
| `team_name` | `Team / agency / studio name` | text | **yes** | gate | non-empty `Invalid team_name: required`; ≤80 `Invalid team_name: max 80 characters` | `Acme AI Studio` |
| `slug` | `URL slug` | text | **yes** | live regex (red border) | `SLUG_RE`; `Invalid slug: required` / `Invalid slug: must be 3–40 chars, lowercase letters/numbers/hyphens, no leading/trailing hyphen` | `acme-ai-studio` |
| `email` | `Email` | email, **disabled** | locked | — | server defaults `contact_email` to `user.email` | helper `Linked to your account.` |
| `description` | `One-line description` `(optional)` | text | no | — | ≤2000 `Invalid description: max 2000 characters`; empty→null | `We build AI agents for legal teams` |

Submit `handleTeamSubmit` validation: `Team name is required.` / `Enter a valid URL slug (3–40 lowercase letters, numbers, hyphens; no leading/trailing hyphen).` Button `Create team →`. On success → `data.edit_url` (`/team/{slug}/edit`).

**Server-side (`/api/join/team`):** also validates (if present) `tagline` ≤200, `services` (array ≤20 items, each string ≤100), `location` ≤200, `website_url` (must be http(s) URL), `contact_email` (used verbatim, **no format check**). Slug uniqueness pre-check → 409 `Team slug already taken`. Writes 3 rows: `entities` (kind=team, owner=user), `team_profiles` (`published:false`), `team_admins` (`role:'owner'`). Returns `{ slug, entity_id, edit_url, was_created }`.

### 3B. Team profile edit — `/team/[slug]/edit`
Client `TeamEditClient.tsx`. **Auth:** must be in `team_admins` for this team (else "You're not an admin of this team"). **Submit:** `PATCH /api/v1/team` (JSON, cookie path, always sends `entity_id`); server validator `src/lib/team/validate.ts`. Empty update → 400 `No valid fields to update`. `verified` is admin-only, not editable.

| Field | Label (verbatim) | Type | Required | Client max | Server validation | Placeholder |
|---|---|---|---|---|---|---|
| `team_name` | `Team name` | text | **required** | `maxLength=80` | non-empty, ≤80; syncs `entities.display_name` | — |
| `tagline` | `Tagline` | text | opt | `maxLength=200` | ≤200 | `One line on what your team does` |
| `description` | `Description` | textarea (4 rows) | opt | `maxLength=2000` | ≤2000 | — |
| `services` | `Services (one per line, max 20)` | textarea (newline-split) | opt | — | array ≤20, each ≤100 chars | `AI agent development⏎Custom integrations⏎RAG pipelines` |
| `location` | `Location` | text | opt | `maxLength=200` | ≤200 | `Remote` |
| `team_size_range` | `Team size` | select | opt | — | ∈ TEAM_SIZE_RANGES | empty option `—` |
| `founded_year` | `Founded` | number `min=1900 max=<currentYear>` | opt | HTML min/max | int 1900..currentYear or null | `2024` |
| `website_url` | `Website URL` | url | opt | — | optional http(s) URL | `https://…` |
| `logo_url` | `Logo URL (paste an image URL)` | url | opt | — | optional http(s) URL | `https://…/logo.png` |
| `contact_email` | `Contact email` | email | opt | — | ≤320 chars, **no regex**; defaults to owner email | — |
| `published` | toggle button `Publish team →`/`Unpublish` | button | — | — | boolean | — |

**TEAM_SIZE_RANGES (verbatim):** `1-5`, `6-20`, `21-50`, `51-100`, `100+`.

### 3C. Members & admins
- **No invite/accept flow.** LinkedIn-style: members self-link. A builder adds their team via the `/dashboard/edit` autocomplete (`GET /api/teams/search?q=…`, returns ≤10 **published** teams) → on save writes `profiles.team_entity_id` directly. No team approval needed.
- **Remove a member:** TeamEditClient "People" section → confirm → `DELETE /api/team/{slug}/members/{username}` (admin-only; sets `profiles.team_entity_id=null` if linked to this team).
- **First admin:** auto-created at signup — the single `team_admins` row `{role:'owner'}`. **No UI to add additional admins** anywhere.

---

## 4. Agent flow (Card 3 UI + auth.md OTP)

### 4A. Signup — `/join` Card 3 (`renderAgentForm` `:610-662`)
**Submit:** `handleAgentSubmit` → `POST /api/join/agent` (`:292`). Server `src/app/api/join/agent/route.ts`; cookie-session auth. Same slug auto-derivation + `SLUG_RE` as team.

| Field (body key) | Label (verbatim) | Type | Required | Server validation + exact error | Placeholder / options |
|---|---|---|---|---|---|
| `agent_name` | `Agent name` | text | **yes** | non-empty `Invalid agent_name: required`; ≤80 `Invalid agent_name: max 80 characters` | `Atlas Researcher` |
| `slug` | `URL slug` | text | **yes** | `SLUG_RE`; `Invalid slug: …` | `atlas-researcher` |
| `provider` | `Provider` | **select** | **yes** | ∈ PROVIDERS; `Invalid provider: required` / `Invalid provider: must be one of: claude, openai, cursor, gemini, custom, other` | default `claude` |
| `model` | `Model` `(optional)` | text | no | ≤200 or null | `claude-opus-4-8` |
| `focus` | `One-line focus` `(optional)` | text | no | ≤300 or null | `Atlas role classification + receipt drafting` |
| `capabilities` | `Capabilities` `(optional — one per line)` | **textarea** (4 rows) | no | array ≤20, each ≤100; split on `\n`, trimmed, empties dropped | `research⏎writing⏎code-review` |
| `description` | `Description` `(optional)` | **textarea** (3 rows) | no | ≤2000 or null | `What this agent does, who it acts for, and how it ships work.` |

**Provider option values + labels (verbatim, `PROVIDERS` `page.tsx:20-27`):** `claude`→`Claude (Anthropic)`, `openai`→`OpenAI`, `cursor`→`Cursor`, `gemini`→`Gemini (Google)`, `custom`→`Custom`, `other`→`Other`.

Client validation: `Agent name is required.` / slug error / `Provider is required.` Button `Register agent →`. Slug uniqueness pre-check → 409 `Agent slug already taken`. Writes `entities` (kind=agent) + `agent_profiles` (`principal_entity_id:null`, `published:false`). On success → `data.edit_url` (`/agent/{slug}/edit`).

### 4B. Agent profile edit — `/agent/[slug]/edit`
Client `AgentEditClient.tsx`. **Auth:** single-owner (`entity.owner_user_id == user.id`; no admins table; else "You don't own this agent"). **Submit:** `PATCH /api/v1/agent` (cookie path, `entity_id`); validator `src/lib/agent/validate.ts`. **NO hiring/checkout button on this page.**

| Field | Label (verbatim) | Type | Required | Client max | Server validation | Placeholder/options |
|---|---|---|---|---|---|---|
| `agent_name` | `Agent name` | text | **required** | `maxLength=80` | non-empty ≤80; syncs `display_name` | — |
| slug | `URL slug (fixed)` | text, **disabled** | — | — | not submitted | — |
| `provider` | `Provider` | select | sent | — | ∈ AGENT_PROVIDERS | labels per **Appendix C** |
| `model` | `Model (optional)` | text | opt | `maxLength=200` | ≤200 or null | `claude-opus-4-8` |
| `focus` | `Focus` | text | opt | `maxLength=300` | ≤300 or null | `One line on what this agent does` |
| `description` | `Description` | textarea (4 rows) | opt | `maxLength=2000` | ≤2000 or null | — |
| `capabilities` | `Capabilities (one per line, max 20)` | textarea (newline-split) | opt | — | array ≤20, each ≤100 | `research⏎writing⏎code-review` |
| `principal_entity_id` | `Acts on behalf of (principal)` | select | opt | — | positive int or null; route enforces owner-owns-human / owner-admins-team | default option `Default (acts on behalf of your profile)`, then one per team the owner admins |
| `logo_url` | `Logo URL (paste an image URL)` | url | opt | — | optional http(s) URL | `https://…/logo.png` |
| `contact_email` | `Contact email (optional)` | email | opt | — | ≤320 + **regex** `/^[^@\s]+@[^@\s]+\.[^@\s]+$/` | `you@example.com` |
| `contact_url` | `Contact URL (optional)` | url | opt | — | optional http(s) URL | `https://…` |
| `published` | toggle `Publish agent →`/`Unpublish` | button | — | — | boolean | — |

**AGENT_PROVIDERS (verbatim):** `claude`, `openai`, `cursor`, `gemini`, `custom`, `other`.

### 4C. Agent registration via auth.md (browserless OTP — no UI form)
Served doc: `GET /auth.md` (`text/markdown`, route handler). Two-step API:

**Step 1 — `POST /api/agent/auth/claim`:**
| Body key | Required | Rules |
|---|---|---|
| `email` | **yes** | trimmed, lowercased |
| `scope` | **yes** | ∈ `['builder:rw','buyer:rw']` (only these two — NO `agent:rw`) |
| `agent_provider` | no | stored or null |
| `agent_name` | no | stored or null |

Errors: `Invalid JSON` (400), `email and scope required` (400), `Invalid scope. Allowed: builder:rw, buyer:rw` (400), `Too many recent claim attempts. Try again in an hour.` (429, ≥3/hr/email). Emails a **6-digit OTP** (Resend, from `noreply@shipstacked.com`, subject `Agent registration code: <otp>`, **expires 10 min**). Returns `{ claim_token, expires_at, otp_sent_to_email:true, next_endpoint:'/api/agent/auth/claim/complete' }`.

**Step 2 — `POST /api/agent/auth/claim/complete`:**
| Body key | Required |
|---|---|
| `claim_token` | **yes** |
| `otp_code` | **yes** |

Errors: `claim_token and otp_code required` (400), `Invalid or used claim token` (404), `Claim token expired` (410), `Too many OTP attempts. Restart the claim flow.` (410, ≥5 attempts), `OTP code incorrect` (401). On success: creates auth user (if new) + human entity + minimal `published:false` profile (if none), mints `sk_ss_<32>` key with the requested scope, returns `{ api_key, scope, key_id, key_prefix, expires_at:null }` (**raw key shown once**).

> **Architecture note (deferred to Phase 9):** auth.md issues `builder:rw`/`buyer:rw` only — it does NOT create Agent-pillar (`kind='agent'`) entities. The only way to create an agent identity is Card 3 (cookie-gated UI).

### 4D. Agent API key generation (UI) — `POST /api/keys`
From the dashboard "Connect an Agent" affordance. Body: `full_name?` (only used to derive username if no profile), `name?` (key label, default `My agent`), `scope?` (∈ `['builder:rw','buyer:rw','agent:rw','team:rw']`, **invalid silently → `builder:rw`**). Max 5 keys/profile (else 400). If no profile exists, creates a minimal `published:false` profile first. Returns raw key once.

---

## 5. Buyer-only flow (Card 4)

### 5A. Signup — `/join` Card 4 (`renderBuyerForm` `:665-681`)
**No editable fields.** Heading `You're set up to hire.` Intro (verbatim): `Free signup. You'll see the talent directory next. When you're ready to message a builder directly or post a job, that's where Buyer Mode activates ($199/mo, cancel anytime).` Static bullets: `Browse verified builders free`, `Save shortlists for later`, `Pay only when you message or post a job`.

| Field | Label | Type | Editable |
|---|---|---|---|
| Email | `Email` | email, **disabled** | read-only, pre-filled |

**Submit:** `handleBuyerSubmit` → `POST /api/join/buyer` with **empty body** + `POST /api/welcome` (`name: email.split('@')[0]`). Button `Continue to talent →`. On success → `buyer-2` (links `/talent` + `/hirer`).

**Server (`/api/join/buyer`):** reads **no body**. Auth required (401). Stamps `user_metadata.role='client'`; creates `findOrCreateBuyerEntity` (kind=human, **no profile, no subscription**). One human entity per owner. Returns `{ entity_id, external_id, slug, display_name, was_created }`.

**Buyer-only user model:** auth.users + `entities(kind='human', profile_id=null)` + `role='client'`. **No `profiles` row** until they mint an API key (FK forces a hidden `published:false` profile). Dashboard `/hirer`: `role='client'` + no sub → `<BuyerOnlyEmptyState>`; with sub → full hirer dashboard.

---

## 6. Subscription / EnableHiringButton

**Component:** `src/app/components/EnableHiringButton.tsx`. Resolves one of 4 states from `getUser()` + active-sub query (`status='active' AND product='full_access' AND (expires_at null|future) AND (current_period_end null|future)`):
- `anonymous` → renders `null` (host page shows its own email-input checkout)
- `authed_no_hiring` → button `Enable hiring — $199/mo` + `Billed to {email}`
- `authed_hiring` → `✓ Buyer Mode active — Manage at hirer dashboard` → `/hirer`

**Click:** `posthog.capture('subscribe_clicked')` → `POST /api/checkout` `{ product:'full_access' }` (empty email; server uses session email) → `window.location.href = data.url` (**direct Stripe redirect, no intermediate page**).

**Placement per pillar:**
| Page | source prop | Variant |
|---|---|---|
| Builder `/dashboard` (`BuilderDashboardClient`) | `dashboard_enable_hiring` | card |
| Team `/team/[slug]/edit` (`TeamEditClient`) | `team_dashboard` | card |
| Hirer `/hirer` empty state (`BuyerOnlyEmptyState`) | `buyer_empty_state` | card |
| `/hirers` marketing, authed (hero + pricing) | `hirers_authed` | primary |
| **Agent `/agent/[slug]/edit`** | **NONE — no hiring control** | — |

`/hirers` ALSO has its own **anonymous email-input checkout** (`<input email>` → `POST /api/checkout { product:'full_access', email }`). This is the anon path; the shared component returns `null` for anon.

**`POST /api/checkout`:** body `{ product, email? }`; price map `full_access → price_1TJhIzE3cjWtx7BrDkZxLavC`; invalid product → 400 `Invalid product`. `customer_email = session.email || body.email`. Stripe subscription session. **success_url:** `<SITE_URL>/success?session_id={CHECKOUT_SESSION_ID}`; **cancel_url:** `<SITE_URL>/hirers#pricing`. Returns `{ url }`.

> ⚠️ **Live key:** `STRIPE_SECRET_KEY` is `sk_live_` — test card `4242…` will NOT work against prod. Real-Stripe verification is gated to **Phase 8.5** on a Preview deploy with test-mode keys. For a smoke test on prod, do NOT attempt a real checkout; simulate the post-checkout subscription row via service-role (per the audit §F approach).

**Post-checkout `/success`:** polls `POST /api/magic-link { session_id }` up to 8×1.5s waiting for the webhook to write the subscription, then shows `Access your account →` (magic link → `/auth/callback` → `/set-password`), or falls back to a `/login` link.

---

## 7. Sign-in & password flows

### 7A. `/login` (`src/app/login/page.tsx` → server action `login`)
| Field | Label (verbatim) | Type | Required | Placeholder | autoComplete |
|---|---|---|---|---|---|
| Email | `Email` | email | yes (HTML `required`) | `you@company.com` | `email` |
| Password | `Password` | password | yes (HTML `required`) | `••••••••` | `current-password` |

Hidden passthrough inputs: `return_to`, `pasted_url`. Button `Sign in →`. **Call:** `supabase.auth.signInWithPassword({email,password})` — **password-only, no magic link on this page.** Error → `?error=` banner. Redirect priority: `return_to` starting `/paste` → else mode-aware `routeAfterAuth` (hirers without `password_set` → `/set-password`). Secondary links: `Forgot password?` → `/reset-password`, `/join`.

### 7B. `/reset-password` (request)
| Field | Label | Type | Placeholder |
|---|---|---|---|
| Email | `Email` | email | `you@example.com` |

Button `Send reset link →`. Call: `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://shipstacked.com/update-password' })` — **hardcoded prod redirect.** No password field here. Success copy: `Check your email`.

### 7C. `/update-password` (set new password after reset email)
| Field | Label (verbatim) | Type | Placeholder | Validation |
|---|---|---|---|---|
| New password | `New password` | password | `Min 6 characters` | `password.length < 6` blocks; needs active recovery session |

Call: `supabase.auth.updateUser({ password, data:{password_set:true} })`. Button `Set password and continue →`. **Min length 6.**

### 7D. `/set-password` (post-payment first password)
| Field | Label (verbatim) | Type | Placeholder | Validation |
|---|---|---|---|---|
| Password | `Password` | password (autoFocus) | `At least 8 characters` | `length < 8` → `Password must be at least 8 characters` |
| Confirm password | `Confirm password` | password | `Same password again` | `password !== confirm` → `Passwords do not match` |

Live `✓ Passwords match`. Call: `updateUser({ password, data:{password_set:true} })`. Button `Set password and go to dashboard →`. **Min length 8** (differs from 7C).

### 7E. Magic-link endpoints (no form; programmatic)
- `POST /api/magic-link { session_id }` — used by `/success`; resolves email by `stripe_session_id`, generates magiclink → `/auth/callback`.
- `POST /api/client-magic-link { email }` — client-inbox access; email-enumeration-safe (`{success:true}` even if user missing); emails link → `/auth/callback?redirect_to=/client/inbox`.

---

## 8. Proof-of-work / receipt publication ("paste") flow

**Two distinct paths** (different threat models):

### 8A. Browser paste flow → writes `proof_receipts`
`/paste` → `POST /api/paste/classify` → `POST /api/paste/analyze` → `createPasteDraft` server action (Atlas classify + Redis stash, 15-min TTL) → `/paste/review` → `POST /api/paste/publish`.

**Step 1 — `/paste` (`PasteForm.tsx`), single field:**
| Field | Label / copy | Type | Required | Validation | Placeholder |
|---|---|---|---|---|---|
| `url` | heading `Paste what you built.` / sub `We turn it into a proof receipt you can edit and publish.` | `url` | **yes** | client: required (`URL is required.`), parseable (`That doesn't look like a valid URL.`), `https:` only (`URL must start with https://.`), host ∉ shipstacked (`Pick a URL outside shipstacked.com.`). Server `validateUrl`: ≤2048, no whitespace, https only, non-shipstacked | `https://...` |

Button `Continue →`. Footer: `Works with GitHub, Lovable, Bolt, v0, Replit, Vercel, Netlify, MCP servers, or any deployed URL.` Auth deferred to the `createPasteDraft` action (redirects to `/login?return_to=/paste&pasted_url=…` if no session).

**`/api/paste/classify`** body `{ url }` (rate 30/min IP, 200/min global; 24h cache). Returns source/reachable/metadata/event_type_candidate. **`/api/paste/analyze`** body `{ url, source (∈ github,lovable,bolt,v0,replit,vercel,netlify,mcp_server,generic), metadata? }`. Returns title/description drafts, artifacts, stack, outcome suggestions, capabilities.

**Step 2 — `/paste/review` (`ReviewForm.tsx`, client) — the Atlas-classification confirmation step:**
| Field | Section label (verbatim) | Type | Required | Validation | Default |
|---|---|---|---|---|---|
| identity | `Post as:` | select (IdentityPicker) | only if >1 owned entity | hidden if ≤1 | human entity, else first owned |
| `title` | `Title` | text | **yes** (`Title is required.`) | hard-sliced 80 | `title_draft` |
| `description` | `What happened` | textarea (10 rows, markdown) | **yes** (`Description is required.`) | hard-sliced 2000 | `description_draft` |
| `occurred_at` | `When` | date | yes (defaulted) | → ISO at publish | today |
| `precision` | `When` (2nd) | select | yes (defaulted) | day/month/quarter/year | `day` |
| Atlas roles | `Atlas roles we detected` | checkboxes + add | **≥1 required** (`Pick at least one Atlas role before publishing.`) | inferred checked by default | inferred set |
| `stack` | `Stack we detected` | chip list | no | — | detected |
| outcomes | `Outcomes` `optional · +trust` | repeatable | no | see OutcomeAdder | `[]` |
| attestation | `Attestation` `optional · +trust` | button `Request attestation (coming soon)` | no | no real submit | false |
| `visibility` | `Visibility` | radio | yes (defaulted) | `Public` / `Unlisted` | `public` |

OutcomeAdder sub-form: `kind` (select; revenue/cost_reduction/time_saved/performance/uptime/users/compliance/qualitative, default `qualitative`), `value` (number, `Value (optional)`), `unit` (text, `Unit (e.g. %, hrs)`), `description` (textarea, required, ≤500, `Describe the outcome…`).

Button `Publish proof receipt →`. **`POST /api/paste/publish`** — auth required (401 `Sign in to publish.`); body `{ draft_id, draft (full PasteDraftSchema), subject_entity_id? }`. The inline `draft` is authoritative; Redis draft must still exist (else 400 `draft_expired`). `subject_entity_id` (sent only when >1 owned entity) must be a positive int owned by the user. Returns `{ canonical_url, slug, id, … }`.

**`PasteDraftSchema` key constraints (`src/lib/paste/publish.ts`):** `title` 1–80, `description` 1–2000, `artifacts` **≥1 required**, `occurred_at` ISO, `visibility` ∈ `public|unlisted`, `atlas_confidence` 0–1. `verification_level = L1_artifact_confirmed` if `classifier_reachable && ≥1 artifact` else `L0_claimed`.

### 8B. Structured agent API → writes `posts` (legacy), then async enrich
**`POST /api/v1/builds`** (Bearer `sk_ss_…`, 60/min). **No zod.**
| Body key | Type | Required | Validation |
|---|---|---|---|
| `title` | string | **yes** | non-empty trimmed (`title is required`) |
| `what_built` | string | no | none |
| `problem_solved` | string | no | none |
| `outcome` | string | no | none |
| `tools_used` | — | no | none |
| `time_taken` | — | no | none |
| `url` | string | no | **not URL-validated** |

Returns `{ build_posted:true, post_id, post_url, verified, verification_tip }`. ⚠️ `build_posted:true` reflects only the `posts` insert — enrichment (which produces the `proof_receipt`) is fire-and-forget and its failure is only logged. `GET /api/v1/builds` lists last 20.

**`POST /api/enrich`** — orchestration, not a user form. API-key or cookie path; body `profile_id?`/`entity_id?` (cookie) or `{}` (key). Derives material from profile projects/posts; caps + fingerprints; writes `enrichment_runs`; returns 202 or 429.

### IdentityPicker
`src/app/components/IdentityPicker.tsx` — renders `null` when ≤1 owned entity (solo builders never see it). Options = owned entities of kind human|team|agent. Default = human entity if present. Selected id → `subject_entity_id` → `proof_receipts.subject_id` (ownership-checked).

### Classifier/extractor User-Agents (do not spoof — project invariant)
- Classifier + MCP probe: **`ShipStacked-Classifier/0.1`**
- Analyzer extractors (github/vercel/netlify/v0/mcp_server): **`ShipStacked-Analyzer/0.1`**

---

## Appendix A — Builder skill/tag option values (verbatim)

**Signup Card 1 tags (`join/page.tsx:6-9`):**
- *How do you use AI?* (`CLAUDE_USE_CASES`): `Automation and workflows`, `Content creation`, `Coding and development`, `Data analysis`, `Customer support`, `Research`, `Document processing`, `API integration`, `Agent systems`, `Education and training`
- *AI tools you use* (`AI_TOOLS`): `Cursor`, `Replit`, `Bolt`, `Lovable`, `v0`, `Windsurf`, `Claude Code`, `Midjourney`, `ElevenLabs`, `Pinecone`
- *Frameworks & tools* (`FRAMEWORKS`): `Next.js`, `React`, `Vue`, `LangChain`, `LlamaIndex`, `n8n`, `Make`, `Zapier`, `Supabase`, `Firebase`, `FastAPI`, `Node.js`, `Vercel`, `AWS`, `Docker`
- *Domain expertise* (`DOMAINS`): `Legal`, `Healthcare`, `Finance`, `Marketing`, `Education`, `E-commerce`, `Real estate`, `HR`, `Customer support`, `Research`, `Media`, `Gaming`

**Edit form skill groups (`EditProfileForm.tsx:17-22`):**
- *AI use cases* (`claude_use_case`): same as CLAUDE_USE_CASES above
- *Other LLMs* (`llm`): `ChatGPT / GPT-4`, `Gemini`, `Mistral`, `Llama`, `Grok`, `Perplexity`, `Cohere`, `Other`
- *Coding languages* (`language`): `Python`, `JavaScript`, `TypeScript`, `Ruby`, `Go`, `Rust`, `Java`, `C#`, `PHP`, `SQL`, `Swift`, `Kotlin`
- *Frameworks and tools* (`framework`): same as FRAMEWORKS above
- *AI-native platforms* (`ai_tool`): `Cursor`, `Replit`, `Bolt`, `Lovable`, `v0`, `Windsurf`, `Midjourney`, `ElevenLabs`, `Pinecone`, `Weaviate`, `Claude Code`
- *Domain expertise* (`domain`): same as DOMAINS above

## Appendix B — Builder edit single/multi-select enums (verbatim, `EditProfileForm.tsx:10-16`)
- `AVAILABILITY_OPTIONS`: `freelance`, `full-time`, `contract`, `part-time`, `open`
- `PROFESSIONS`: `Developer`, `Designer`, `Product Manager`, `Consultant`, `Marketer`, `Operator`, `Founder`, `Other`
- `SENIORITY_OPTIONS`: `Junior`, `Mid-level`, `Senior`, `Principal`, `Founder / Independent`
- `WORK_TYPE_OPTIONS`: `Freelance`, `Full-time`, `Contract`, `Open to all`
- `DAY_RATE_OPTIONS`: `Under $200/day`, `$200-500/day`, `$500-1000/day`, `$1000+/day`, `Prefer not to say`
- `TIMEZONES`: `UTC-8 (PST)`, `UTC-7 (MST)`, `UTC-6 (CST)`, `UTC-5 (EST)`, `UTC+0 (GMT)`, `UTC+1 (CET)`, `UTC+2 (EET)`, `UTC+3 (Moscow)`, `UTC+5:30 (IST)`, `UTC+8 (SGT/HKT)`, `UTC+9 (JST)`, `UTC+10 (AEST)`, `UTC+12 (NZST)`
- `SPOKEN_LANGUAGES`: `English`, `Spanish`, `French`, `German`, `Portuguese`, `Mandarin`, `Japanese`, `Arabic`, `Hindi`, `Italian`, `Dutch`, `Russian`, `Korean`

## Appendix C — Provider enum (signup + agent edit)
Enum keys (both forms): `claude`, `openai`, `cursor`, `gemini`, `custom`, `other`. Display labels: `Claude (Anthropic)`, `OpenAI`, `Cursor`, `Gemini (Google)`, `Custom`, `Other`.

## Appendix D — Endpoint & save-path summary
| Flow | Submit target | Validation |
|---|---|---|
| Shared auth | `supabase.auth.signUp` | client min-6 password |
| Builder signup | direct Supabase `profiles`/`posts`/`skills` insert (+ `/api/welcome`, `/api/enrich`) | **none server-side** |
| Builder edit | direct Supabase `profiles` update (+ `/api/avatar`, `/api/profile/verify-check`, `/api/enrich`) | **none server-side** |
| Team signup | `POST /api/join/team` | heavy (8 fields) |
| Team edit | `PATCH /api/v1/team` | `validateTeamPatch` |
| Agent signup | `POST /api/join/agent` | heavy (7 fields) |
| Agent edit | `PATCH /api/v1/agent` | `validateAgentPatch` |
| Agent OTP | `POST /api/agent/auth/claim` → `/complete` | scope enum, OTP, rate-limit |
| API key gen | `POST /api/keys` | light (scope fail-open) |
| Buyer signup | `POST /api/join/buyer` (empty body) | none (auth only) |
| Checkout | `POST /api/checkout` | product enum |
| Paste publish | `POST /api/paste/publish` | `PasteDraftSchema` (zod) |
| Agent build | `POST /api/v1/builds` | manual (`title` only) |
| Member link | direct Supabase `profiles.team_entity_id` (via `/api/teams/search`) | none |
| Member remove | `DELETE /api/team/{slug}/members/{username}` | admin check |

---

*Compiled from source inspection across `src/app/join/page.tsx`, `src/app/api/join/{buyer,team,agent}/route.ts`, `src/app/api/keys/route.ts`, `src/lib/entities.ts`, `src/app/dashboard/edit/EditProfileForm.tsx`, `src/app/team/[slug]/edit/*`, `src/app/agent/[slug]/edit/*`, `src/lib/{team,agent}/validate.ts`, `src/app/login/*`, `src/app/{reset,set,update}-password/*`, `src/app/components/EnableHiringButton.tsx`, `src/app/api/checkout/route.ts`, `src/app/api/agent/auth/claim/*`, `src/app/auth.md/route.ts`, and the paste flow (`src/components/paste/*`, `src/app/api/paste/*`, `src/lib/paste/*`, `src/schemas/proof-receipt-v0.1.ts`, `src/app/api/v1/builds/route.ts`). Not committed — pending operator review.*

---

# PART 3 — RESUME HERE

*(verbatim copy of `docs/decisions/RESUME_HERE.md`)*

# Resume guide for next Claude chat

You are picking up multi-session work on ShipStacked. Operator = Thomas Oxlee.
Architecture: three-party loop (operator + architect-Claude in chat + terminal Claude in ~/shipstacked).

## Read these files in order before responding:

1. `AGENTS.md` — invariants (especially: published-gate, additive-not-subtractive, Supabase Dashboard for DDL)
2. `docs/decisions/SESSION_2026-05-19_DECISIONS.md` — locked yardstick (Customer/Entity/Mode/Role spec, with UPDATE 2026-05-22)
3. `docs/decisions/SESSION_2026-05-23.md` — latest session journal (most recent date)
4. `docs/decisions/AUDIT_alignment_5_bucket.md` — current platform map (CORE/WEAK/LEGACY-KILL/MISSING/AMBIGUOUS)
5. `docs/decisions/DISCOVERY_batch7_quality_scoring.md` — next planned batch (Formula A vs D pending). NOTE: this + 3 other session docs are UNTRACKED on disk as of 2026-05-23 — confirm they exist / commit them.

## Operating discipline:

- Audit first, kill first, patch only what stays
- Read-only verification needs no gate
- Calibrated friction: reversible single-file ships on operator approval; irreversible/DDL/structural needs full pre-flight gate
- Never propose decisions based on assumptions; verify against code/DB
- FK-check is mandatory before any table kill (lesson from 2026-05-23: a Dashboard-applied table + FK chain were invisible to migration-scan)
- Research-first methodology: for any design problem, web-search established 
  solutions BEFORE first-principles design. Billions has been spent solving 
  these problems already; use / adapt / copy from real platforms (GitHub, 
  Stack Overflow, LinkedIn, etc.) rather than reinventing. First-principles 
  design is appropriate only for genuinely novel problems unique to this 
  platform. See SESSION_2026-05-19_DECISIONS.md "Methodology principle — 
  Research-first, then adapt" for full discipline.

## Communication style:

- Short answers (operator typically on mobile)
- Plain English, no walls of text
- Questions numbered at end if any
- Reflect findings back before recommending
- One question per turn when possible
- "Probably" is a red flag — operator does not allow action on probably

## Three-party loop mechanics:

- Architect-Claude (this chat) does analysis + drafts instructions
- Operator relays between this chat and terminal Claude
- Terminal Claude (in ~/shipstacked) executes
- Terminal Claude's session memory has been unreliable (freezes); rely on git-tracked artifacts not its in-memory state

## Current pending work:

Read the most recent SESSION_<date>.md for the live to-do. Top of the queue at last journal close:
- Batch 7b — Quality scoring algorithm §H decision + code execution (Formula A leading)
- Path D after — Builder mode auto-badge on first verified receipt
- Path B last — Entity graph (D2/D3)

## Operator identity (known facts)

- **Auth account (auth.users):** `oxleethomas@gmail.com` — uuid `d6b1c972-882c-4a6a-988b-4c9aeda8619e`. This is the login/session identity; entity ownership + team_admins rows key off this uuid.
- **Git-commit identity (NOT the auth account):** `ox@agentagous.com` (Thomas Oxlee). Used for commit attribution only — there is no auth.users row with this email.
- **No `profiles` row yet** — operator has not done Card 1 (builder) signup. Consequences: no `/u/<username>` page, cannot own a builder profile, several Phase 4 builder-side flows (worksFor, IdentityPicker) can't be dogfooded by the operator until they sign up. Open question post-Phase-4: should the operator dogfood Card 1.

## Security maintenance log

- **CRON_SECRET rotated 2026-06-16 (Phase 7 §E pre-flight).** The old value had been hardcoded in source historically, rotated to `process.env.CRON_SECRET` in commit `551baff`, but the literal string was still present in committed public docs (`docs/audit/TIER_4_DISCOVERY.md`, `TIER_4_RECONCILIATION.md`). The Vercel env value was rotated + redeployed; the old value was verified dead (POST with the old `x-cron-secret` header to `…/api/hire-confirm/nudge` → 401). The literal is now inert historical noise everywhere. Untracked-doc copies were redacted before staging (Phase 7 §E); tracked-doc copies remain as inert historical strings (scrub deferred — see Phase 7 deferred verifications).

## In-flight phases

## Site Audit CLOSED 2026-06-16

**Site Audit CLOSED 2026-06-16.** All 8 blocks (§A-§H + §I synthesis + §J fixes + §Z cleanup) complete. Findings consolidated in §I. 2 BLOCKERs CLOSED in-flight (§B.4 credits, §E.3 OTP). 3 §J MINORs shipped this session (e228677, 470de64, 6d36407). §Z verified — baseline counts restored exactly. Pre-launch BLOCKER queued: Phase 8.5 real-Stripe verification. Cross-cutting operator decisions pending: contact-gating positioning + §B silent-enrich-failure triage (both deferred to Phase 9 — Agency Positioning).

End-to-end persona simulation against prod. Plan: `docs/audit/SITE_AUDIT_E2E_PLAN.md` (485 lines, locked decisions intact). **No code shipped in the audit** — findings are observation-only + accumulated test data (all tagged `audit-2026-06-16-*`). Paused at the §E BLOCKER (context boundary), §E.7 fix designed but NOT applied.

**§A baseline (post-cleanup §Z must match exactly):** profiles 67 · entities team 2 · entities agent 2 · subscriptions active 11 · api_keys 48 · proof_receipts 79 · zero pre-tagged `audit-2026-06-16-*`.

**Corrections found:**
- Stripe webhook path is **`/api/webhooks/stripe`** (NOT the plan's `/api/stripe/webhook`). Fix §F.3 when resumed.
- Anthropic API credits were empty pre-audit → topped up mid-audit. Q2 confirmed **zero real-user blast radius** (24 days of zero enrichment activity before the audit; the audit's own run #6 was the first-ever credit failure).

**Persona results:**
- **§B Builder — COMPLETE / clean** (B.1–B.7 PASS after credit top-up). Receipt #90 (subject 41) classified A4/D2/B2, L1. Enrichment confirmed production-grade (Q1: fresh receipts match established field-for-field; Q3: stack auto-detected by per-host extractors). _Queued SERIOUS:_ `/api/v1/builds` returns `build_posted:true` even when the background enrich fails silently.
- **§C Team — COMPLETE / clean.** Team entity 42, member soft-link from §B builder. Block 2.7 `team_admins` self-read RLS confirmed live with the real admin (nav "Your team" resolves).
- **§D Agent Card-3 — COMPLETE / clean.** Agent entity 43, agent:rw key (sha256-hashed), `GET /api/v1/agent` 200. _Queued MINOR:_ provider enum is `claude` not `anthropic`. _NOTE:_ `agent_profiles.capabilities` (self-declared strings) ≠ receipt-derived Atlas roles.
- **§E Agent OTP — §E.3 BLOCKER CLOSED (fix shipped `e2e360b`); §E.1 SERIOUS still deferred:**
  - **BLOCKER (§E.3) — ✅ CLOSED 2026-06-16, commit `e2e360b`.** `/api/agent/auth/claim/complete` used to 500 for **new users** — `"Profile row missing post-entity-create"`. Root cause: `findOrCreateHumanEntity` creates the entity but no `profiles` row for a brand-new email; the route then required a profile before issuing the key. **Fix applied** (34-line diff in `src/app/api/agent/auth/claim/complete/route.ts`): after `findOrCreateHumanEntity`, if no profile, create a minimal `published=false` profile (mirrors `/api/keys` agent-mode: `{user_id, email, username derived-from-email, full_name:'', published:false}`), bind it bidirectionally (`profiles.entity_id` ↔ `entities.profile_id`), then issue the key. Original 500 kept as an unreachable final safety net; a new `"Profile creation failed"` 500 surfaces only if the insert itself errors. **Verified green local + prod** (claim → complete 200 + `builder:rw` key → `GET /api/v1/me/scope` 200). The prior session's orphan (auth `f66d3639`, entity 44, `agent_registrations #1`) was left untouched for §Z.
  - **SERIOUS / architectural (§E.1):** auth.md claim issues `builder:rw`/`buyer:rw` only — **no `agent:rw`, no agent-create endpoint**. It registers an agent to act on behalf of a human; it does NOT create Agent-pillar (`kind='agent'`) entities. Deferred to Phase 9+ (clarify docs OR extend auth.md with agent:rw + agent-create).
- **§F Buyer (existing-builder-toggles-Hiring-Access) — COMPLETE / clean via approach (a) DB-simulation. Real-Stripe verification queued as Phase 8.5.**
  - **BLOCKER avoided pre-execution:** `STRIPE_SECRET_KEY` is `sk_live_` (no test key in env) — test card `4242` can't run in live mode + creating real Stripe objects = real charges. Approach (a) (service-role insert of the post-checkout `subscriptions` row) authorized; **no Stripe API calls made, zero Stripe-side artifacts.** Real Checkout-UI + webhook-signature verification deferred to **Phase 8.5** (architect to draft steps; needs a test-mode key OR accepted live charge).
  - **§F.2:** subscription row `48763eb7` inserted, mirroring the webhook's `checkout.session.completed` field set (table has **no** `current_period_start`/`cancel_at_period_end` cols — webhook writes `email, stripe_customer_id, stripe_session_id, stripe_subscription_id, product, status, expires_at, current_period_end`). Synthetic ids `cus_/cs_/sub_audit_2026_06_16`.
  - **§F.3 — two independent authz layers (key finding):** (1) **API** `/api/v1/talent/search` gates purely on **key scope** (`requireScope(['buyer:rw'])`), NOT on subscription — buyer:rw → 200 (15 builders, audit team 42 + agent 43 present); builder:rw → **403** "Insufficient scope". (2) **Web** hirer-mode flips via `getEntityModes` on the subscriptions row (email + active + full_access + period). The sub unlocks the *web* hirer experience, not the API. Builder-self absent from results = **ranking threshold** (builder branch returns only `ranked`; team/agent include `belowThreshold`), **not** self-exclusion (no self-exclusion logic exists).
  - **§F.4 — team contact CTA is a PUBLIC `mailto:` link** (`/team/[slug]/page.tsx:325-334`), conditional only on `team_profiles.contact_email`; renders for **anonymous** users (verified HTTP 200, ungated). **Not** subscription-gated — the sub is irrelevant to this CTA.
  - **§F.5 — cancel behavior matches stated "access until end of period" policy:** state 1 cancel-at-period-end (status stays `active`, period future) → hirer **true** (access continues ✓); state 2 `status=canceled` → hirer **false**; state 3 active-but-`current_period_end`-past → hirer **false** (belt-and-suspenders clause `user.ts:42`). The buyer:rw **API key is subscription-independent** (works in all states). Sub restored to `active` (+30d) post-test, left for §Z.
- **§G Buyer-only (Card 4 fresh signup) — COMPLETE / clean (DB-simulation; no Stripe calls).**
  - **§G.1 flow:** `/join` Card 4 → `signUp(email,password)` → `handleBuyerSubmit` → `POST /api/join/buyer` (stamps `user_metadata.role='client'` + `findOrCreateBuyerEntity` kind=human, **no profile, no subscription** — paywall deferred to first paid action per D1=b) → `POST /api/welcome` → success view linking `/talent` + `/hirer`.
  - **§G.2:** simulated via service-role — auth `3c6bed47` + entity 47 (human, slug `audit-2026-06-16-buyer`, `profile_id=null`). Post-signup state confirmed: **profiles=NONE, subscription=NONE.** Then paid-state sub `30583eea` inserted (§F.2 pattern) → gate hirer:true. buyer:rw key → `/api/v1/talent/search` 200 (15 builders). `/talent` web publicly browsable (anon 200). `/hirer` anon → 307→`/login`.
  - **§G.3 buyer-only user model:** auth.users + `entities(kind='human', profile_id=null)` + `role='client'`. **No `profiles` row** until they mint an API key — `api_keys.profile_id` is a NOT NULL FK, so key-gen forces a minimal `published=false` profile (mirrors `/api/keys` agent-mode). Dashboard: `/hirer` with `role='client'` + no sub → dedicated `<BuyerOnlyEmptyState>` (not bounced to `/hirers#pricing`); with sub → full hirer dashboard (jobs/applications/employer_profiles). `getEntityModes` → builder:false (no profile), client:true, hirer:true-when-subscribed. **Unavailable vs builder+hiring:** no public `/u/<username>`, not in talent directory (no published profile), no proof-of-work surface — pure demand-side.
  - _Queued MINOR (§G.3):_ `/hirer` page sub-check (`page.tsx:12-19`) lacks the `current_period_end` clause that `getEntityModes` has (`user.ts:42`) — a sub with `status='active'` but past `current_period_end` would show the full `/hirer` dashboard while `getEntityModes` says hirer:false. Divergence; low-risk (webhook flips status to `canceled` on deletion) but worth unifying.
  - _NOTE (§G.3):_ minting an API key flips a buyer-only user's `builder` mode on (`hasProfile=true`) via the hidden `published=false` profile. Hidden from public surfaces by the published-gate, but the model now carries a latent builder identity.
- **§H Cross-cutting checks — COMPLETE / clean (read-only, no writes). 2 MINOR + 2 NOTE queued.**
  - **§H.1 anon flow — PASS.** All 14 homepage links resolve (2 clean canonical 308s: `/for-hirers`→`/hirers`, `/signup`→`/join`, both final 200). All 3 pillar profiles render anon 200 (`/u/`, `/team/`, `/agent/`). `/login` form renders (email+password). `/join` client-renders 4 cards (source-confirmed; client component so not in SSR HTML). **0 dead `href="#"` anchors** (Phase 8 §F Block 1 fix holds). Footer = all real routes.
    - _NOTE (contact-gating asymmetry — extends the §F public-mailto NOTE):_ **builder** contact is subscription-gated (`/u/[username]:341-360` — anon sees "🔒 Contact details visible to Full Access subscribers" → `/hirers#pricing`; subscribers get `MessageButton`); **team** (`/team/[slug]:325-334`) AND **agent** (`/agent/[slug]:294-307`) contact are **public ungated** mailto/URL. So supply contact is paywalled for builders but free for teams+agents. Confirm intended pre-launch.
  - **§H.2 sign-in/out — PASS.** `/dashboard` anon → 307→`/login`; `/api/logout` → `supabase.auth.signOut()` + redirect `/` (NavBar links it). Full session-cookie round-trip + Block 3 realtime nav = **browser-paired** (builder password not recorded; reset would be a write — audit is read-only).
  - **§H.3 marketing pages — PASS w/ 2 MINOR.** `/`, `/how-it-works`, `/faq`, `/pricing`, `/atlas`, `/api-docs` all 200 + unique titles; sampled internal links all 200 (`/dashboard` 307 = expected gate). `/auth.md` 200 `text/markdown` ("# ShipStacked Agent Registration"). No `<img>` tags (CSS/SVG — no broken-image risk).
    - _MINOR:_ **`/atlas` has no `og:image` and no `twitter:image`** — social shares show no card image (every other HTML page has og:title/image/description).
    - _MINOR:_ **title-suffix duplication** — `/atlas` renders `…mapped | ShipStacked | ShipStacked` and `/api-docs` renders `Builder API | ShipStacked | ShipStacked` (page-level title already carries the suffix, then the layout template appends `| ShipStacked` again). `/faq`/`/pricing` have a softer brand redundancy (`— ShipStacked … | ShipStacked`).
  - **§H.4 empty states — PASS.** `/talent?cluster=Z` → 200 "No builders match"; zero-receipt team 42 + agent 43 → 200 (receipts/PoW sections conditional); unknown atlas role (`ZZ99`/`G9`) → **404** (graceful); valid-but-unused roles (A1/B1/D2/E1/F1/G1…) → 200 empty practitioners section.
    - _NOTE (low):_ practitioners empty-state copy inconsistent across roles — some valid-unused roles show a "no practitioners" prompt, others just an empty section.
  - **§H.5 mobile markers — PASS.** Every page (`/`, 4 Phase-8, `/atlas`, `/talent`) has `<meta name="viewport">` + ≥1 `@media` rule.

**Audit artifacts accumulated (clean at §Z; respect FK order):**
- auth.users: `cb76662c` (builder), `c954352c` (team admin), `13a81dc9` (agent owner), `f66d3639` (otp-owner orphan), `da2ca1fa` (otp-owner-v2, §E.7 local verify), `8aa9f478` (otp-owner-v3, §E.7 prod verify), `3c6bed47` (buyer-only, §G)
- entities: 41 (human/builder), 42 (team), 43 (agent), 44 (human, otp orphan, profile_id null), 45 (human, otp-owner-v2, slug `audit-2026-06-16-agent-otp-owner-v2`), 46 (human, otp-owner-v3, slug `audit-2026-06-16-agent-otp-owner-v3`), 47 (human/buyer-only, slug `audit-2026-06-16-buyer`, profile_id null)
- profiles: `audit-2026-06-16-builder-1` (entity 41), `audit-2026-06-16-agent-owner` (minimal, entity-less) + `profiles.team_entity_id=42` soft-link on the builder, `audit20260616agentot545` (entity 45, email `…-v2@example.com`, §E.7 fix output — username hyphen-stripped per /api/keys regex but caught by §Z email/slug LIKE), `audit20260616agentot11` (entity 46, email `…-v3@example.com`), `audit20260616buyer323` (entity-less, email `audit-2026-06-16-buyer@example.com`, published=false, §G key-gen hidden profile)
- team_profiles (entity 42) · agent_profiles (entity 43) · team_admins #4
- api_keys: builder:rw (`audit-2026-06-16-builder-key`), buyer:rw (`audit-2026-06-16-buyer-key`), agent:rw (`audit-2026-06-16-agent-key`), builder:rw `sk_ss_4TD88…` (v2 local), builder:rw `sk_ss_2LeTD…` (v3 prod), buyer:rw (`audit-2026-06-16-buyer-key-v2`, §F.3 curl) + builder:rw (`audit-2026-06-16-builder-key-v2`, §F.3 403 test) — both on the §B builder profile
- api_keys (cont.): buyer:rw (`audit-2026-06-16-buyer-only-key`, §G — on the hidden buyer-only profile `17912a84`)
- subscriptions: `48763eb7` (§F.2 simulated, email `audit-2026-06-16-builder@example.com`), `30583eea` (§G simulated, email `audit-2026-06-16-buyer@example.com`, synthetic `cus_/sub_audit_2026_06_16_buyer`) — both status active/full_access, **no Stripe-side object**, pure DB; §Z catches via `email LIKE 'audit-2026-06-16-%'`
- posts: 2 (builder) · proof_receipts: #90 · enrichment_runs: #6 (failed-credit), #7 (ok) · agent_registrations: #1 (stuck pending), #2 (v2, completed), #3 (v3, completed)

**Resume order (next session):**
1-8. ✅ DONE — Audit closed.
9. **← NEXT: Phase 8.5** — Real-Stripe lifecycle verification (~60-90 min operator-driven, spec in RESUME_HERE).
10. **← OR: Phase 9** — Agency Positioning (homepage/pricing/how-it-works reframe + agency-targeted outreach list + outreach copy). Operator-driven; architect-Claude as structured-thinking partner not market-truth source.

## §I — Findings consolidation (Site Audit §B–§H synthesis)

Decision-ready synthesis of every finding across the four-persona + cross-cutting audit. No new investigation; no fixes applied yet (those are §J, gated on architect/operator review). **Headline: zero open BLOCKER, one open SERIOUS (§B silent-enrich-failure) needing triage. Site works end-to-end for anonymous visitors and all four personas. The one hard launch gate is Phase 8.5 (real-Stripe verification).**

### Master findings table

| SEVERITY | BLOCK/STEP | FINDING | STATUS | DISPOSITION |
|----------|-----------|---------|--------|-------------|
| BLOCKER | §B.4 | Anthropic API credits empty → 24d of zero enrichment; audit run #6 first failure | Topped up mid-audit; zero real-user blast radius | **CLOSED** |
| BLOCKER | §E.3 | `/api/agent/auth/claim/complete` 500s for new users (no profile post-entity-create) | Fixed, verified local+prod | **CLOSED** (`e2e360b`) |
| BLOCKER | §F pre-flight | `STRIPE_SECRET_KEY` is `sk_live_`; live Checkout→webhook→insert path never tested end-to-end | §F simulated via DB; real path untested | **Phase 8.5** (pre-launch BLOCKER) |
| SERIOUS | §B `/api/v1/builds` | Returns `build_posted:true` even when background enrich fails silently — false success signal to API callers | Open | **OPERATOR DECISION → §J or Phase 9** (not pre-dispositioned; needs triage) |
| SERIOUS | §E.1 | auth.md issues `builder:rw`/`buyer:rw` only — no `agent:rw`, no Agent-pillar (`kind='agent'`) self-registration | Open (documented) | **Phase 9** |
| SERIOUS | §F / §H.1 | **Contact-gating asymmetry**: builder contact paywalled (Full Access); team + agent contact public ungated mailto/URL. Marketing implies all three gated at $199/mo | Open | **OPERATOR DECISION** (cross-cutting, pre-launch) |
| MINOR | §G.3 | `/hirer` page sub-check (`page.tsx:12-19`) lacks the `current_period_end` clause `getEntityModes` has (`user.ts:42`) — past-period active sub shows full dashboard while gate says hirer:false | Open | **§J** (surgical) |
| MINOR | §H.3 | `/atlas` missing `og:image` + `twitter:image` — social shares show no card image | Open | **§J** (surgical) |
| MINOR | §H.3 | Title-suffix duplication: `/atlas` + `/api-docs` render `… \| ShipStacked \| ShipStacked` | Open | **§J** (surgical) |
| MINOR | §D.3 | Agent provider enum stored as `claude`, plan/UX said `anthropic` | Open | **§J** (1-line) or doc |
| NOTE | §F | API scope is subscription-independent → a canceled subscriber's `buyer:rw` key keeps working (search route checks scope only, not sub) — "cancellation leak" | Open | **Phase 9** |
| NOTE | §G.3 | Minting an API key flips a buyer-only user's `builder` mode on via a hidden `published=false` profile — latent builder identity | Open | **Phase 9** |
| NOTE | §D | `agent_profiles.capabilities` (self-declared strings) ≠ receipt-derived Atlas roles | Open | **Phase 9** (doc/clarity) |
| NOTE | §H.4 | Practitioners empty-state copy inconsistent across roles (some show a prompt, others a bare empty section) | Open | **Phase 9** (polish) |
| NOTE | §F.3 | Builder-self absent from buyer search = ranking threshold (builder branch returns only `ranked`), NOT self-exclusion | Documented; no action | — |

### Grouped by disposition

**A. CLOSED during audit (2):** §B.4 Anthropic credits (topped up); §E.3 auth.md OTP complete 500 (`e2e360b`, verified local+prod).

**B. §J surgical in-session candidates (3 confirmed + 1 optional) — all independent, no ordering dependency:**
1. `/hirer` sub-check — add the `current_period_end` clause to match `getEntityModes` (single file, `src/app/hirer/page.tsx`).
2. `/atlas` `og:image` + `twitter:image` — add to the page metadata (single file).
3. Title-suffix duplication — strip the redundant `| ShipStacked` from `/atlas` + `/api-docs` page titles (the layout template already appends it).
4. _(optional)_ §D provider enum `claude`→`anthropic` (or document the intended value).

**C. Phase 9+ architectural deferrals (5):** §E.1 auth.md Agent-pillar creation; §F API-scope cancellation leak; §G.3 buyer-only latent builder identity; §D capabilities-vs-Atlas-roles clarity; §H.4 practitioners empty-state copy.

**D. Pre-launch BLOCKER (1):** Phase 8.5 — real-Stripe lifecycle verification (full spec already in RESUME_HERE).

**E. Operator decisions required (2):** (1) **Contact-gating asymmetry** — is team+agent public contact intended, or should all three sit behind Hiring Access as marketing implies? (2) **§B `/api/v1/builds` silent-enrich-failure** — is a `build_posted:true` on a failed enrich acceptable at launch, or must the response surface enrich status? (decide §J vs Phase 9).

### §J fix-scope recommendation

- **Ship this session (surgical, low-risk, no decision needed):** the 3 confirmed §J MINORs (B.1–B.3 above). Independent single-file edits; commit per phase pattern with tsc+build gates; spot-check the touched surfaces.
- **Hold for operator decision before any fix:** contact-gating asymmetry (product call); §B silent-enrich-failure (scope call — surgical "return enrich status" vs Phase 9 async-pipeline rework).
- **Dependencies:** none among the 3 surgical fixes. The §D enum tweak is optional and independent.

### Launch-readiness gate

- **MUST before outreach (hard gate):** ✅ **Phase 8.5 real-Stripe verification PASS** (live Checkout→webhook→subscription-insert→gate-flip is the one untested money path). Resolve the **contact-gating asymmetry** operator decision (intended, or fix before launch). Triage the **§B silent-enrich-failure** SERIOUS (accept or fix).
- **SHOULD before outreach (high-value, surgical):** the 3 §J MINOR fixes — `/hirer` divergence (a real correctness edge on missed-webhook), `/atlas` og:image (social sharing), title-dup (SEO/polish).
- **CAN wait (post-launch):** all Phase 9 NOTEs (auth.md agent-pillar, cancellation leak, latent builder identity, capabilities-vs-roles doc, practitioners copy) + §D enum.
- **Cleanup gate:** §Z must run (delete all `audit-2026-06-16-*`; re-verify §A baseline: profiles 67 · entities team 2 · agent 2 · subs active 11 · api_keys 48 · receipts 79) before/at launch — the audit added live rows (entities 44–47, 2 simulated subs, multiple keys/profiles, 3 agent_registrations).
- **Bottom line:** the platform is functionally launch-ready for all four personas pending **one hard gate (Phase 8.5)** + **two operator decisions**. No structural rebuild required.

## Phase 8.5 — Real-Stripe lifecycle verification (PRE-LAUNCH BLOCKER)

**Goal:** verify the actual Stripe Checkout → webhook → subscription insert → gate-flip path works end-to-end on prod. Phase 8 §F simulated the post-checkout state but skipped the Stripe-coupled half. This phase closes that gap.

**Why this matters:** if any link in the chain (Checkout config, webhook secret, signature verification, event handler, DB insert) is broken, every real $199 toggle on launch day fails silently. Customer pays, no access unlocks, support fire. Must be verified before first real prospect sees the toggle.

**Pre-flight setup (operator, ~15-30 min):**

1. Stripe Dashboard → Test Mode toggle (top-right of dashboard)
2. Test Mode → Developers → API Keys → copy `sk_test_...`
3. Test Mode → Developers → Webhooks → copy `whsec_test_...` for the prod webhook endpoint
4. Test Mode → Products → create test product mirroring `full_access` at $199/mo, copy the price ID `price_test_...`
5. Vercel env vars (Preview environment, NOT Production):
   - `STRIPE_SECRET_KEY` = `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_test_...`
   - `STRIPE_PRICE_FULL_ACCESS` (or whatever the env var is) = `price_test_...`
6. Deploy a preview branch (any small commit, or just trigger redeploy on a preview URL)

**Verification flow:**

1. Sign up as a fresh audit Builder on the **preview URL** (not prod)
2. Click EnableHiringButton in dashboard
3. Stripe Checkout opens — paste test card `4242 4242 4242 4242`, any future expiry, any CVC, any postcode
4. Complete checkout
5. Verify on preview env:
   - Redirected to success URL
   - Webhook fired (Stripe Dashboard → Webhooks → Events log shows `checkout.session.completed` succeeded)
   - `subscriptions` row written in preview DB with `status='active'`, correct `email`, correct `stripe_*` IDs
   - `stripe_events` idempotency row written
   - Dashboard shows Hiring Access ON
   - `/talent` search unrestricted

6. Cancel the subscription via Stripe customer portal (test mode)
7. Verify:
   - Webhook fires `customer.subscription.updated` with `cancel_at_period_end=true`
   - `subscriptions.status` updates correctly
   - Access continues until `current_period_end` per stated policy

8. Force period-end:
   - Stripe Dashboard test mode → fast-forward subscription to past period end
   - Webhook fires `customer.subscription.deleted`
   - `subscriptions.status = 'canceled'`
   - Hiring Access removed from dashboard
   - `/talent` returns to restricted state

**Cleanup:**

- Delete test subscriptions + customers from Stripe Test Mode
- Delete test rows from preview DB
- Revert Vercel preview env vars OR leave for future regression testing
- Production env vars never touched (live keys remain intact)

**Sign-off criteria (all must PASS before outreach launch):**

- ✅ Checkout completes with test card
- ✅ Webhook signature verifies
- ✅ subscriptions row INSERTed on checkout.session.completed
- ✅ Gate flips to hirer:true post-checkout
- ✅ buyer:rw key issuable after subscription
- ✅ Cancellation respects period-end
- ✅ Period-end transition removes access

**If any step fails:** STOP launch. Diagnose. Fix. Re-verify.

**Estimated time:** 60-90 minutes including setup, verification, cleanup.

**Critical: must be done on a Preview deployment, NOT Production.** Production has live keys; mixing test mode with live keys breaks both. Vercel Preview branches with their own env vars are the clean way to do this.

## Phase 7 (completed, committed this session) — State restoration + cleanup

- Lean cleanup of deferred items across Phases 1-6. Plan: docs/audit/PHASE7_CLEANUP.md (committed this phase).
- **§A discovery surfaced two urgent items:**
  - **CRON_SECRET** old literal value present in 5 about-to-be-staged untracked docs + 2 already-tracked public docs → **ROTATED mid-phase** in Vercel + redeployed; old value verified dead (401). See Security maintenance log above.
  - **67 non-null `velocity_score` values** on profiles (0 src readers, 0 migration refs, 1 diagnostic script ref) → trips the §C safety gate (required zero non-null AND zero readers). **Drop DEFERRED.**
- **§C velocity_score drop — DEFERRED.** 67 non-null legacy V1 values. Future: drop with operator confirmation OR migrate to `legacy_velocity_score`. Not blocking outreach.
- **§D builder cluster facet count parity** — counts now matching-engine-derived via `clusterFacetsFromMatches({subjectKind:'human'})` (L1-only, global distinct subjects per cluster), aligned with team/agent across all three pillars. Was: legacy all-public `atlasClusters` derivation (could overstate).
- **§E 44 docs committed verbatim** (23 docs/audit + 15 docs/v2 + 6 docs/handover), with redaction: 5 files had the old CRON_SECRET literal → `<ROTATED_CRON_SECRET_REDACTED>`; 2 files had real builder emails (10 distinct personal addresses) → `<redacted-email>`. All 7 carry a top-of-file redaction note. Sensitivity scan confirmed zero secret + zero third-party PII in the staged set.
- **§F 2 audit scripts tracked** (`audit-direction.ts`, `audit-ground-truth.ts`); `audit-profiles.ts` was already tracked.
- **§G rename** `deriveTeamSlug` → `deriveSignupSlug` (1 def + 2 callers, all in `src/app/join/page.tsx`; dual-use team+agent).
- **§H dead `agentMode` prop removed** from `BuilderDashboardClient.tsx` (Phase 5 §M.2 orphan: no body usage, caller stopped passing it).
- **§I/§J** four static gates green (tsc, build, velocity=0, verify-agent-card 10 skills); cluster facet renders cleanly with L1-only counts.

## Phase 7 — deferred verifications

1. **Builder cluster facet count visual UX** — counts may visibly differ from the Phase 6 ship (L1-only derivation vs legacy all-public). Operator-when-convenient.
2. **velocity_score column drop OR migrate to `legacy_velocity_score`** — destructive DDL; requires operator confirmation (67 non-null values).
3. **Pre-existing public exposure scrub** — `TIER_4_DISCOVERY.md` + `TIER_4_RECONCILIATION.md` (inert rotated CRON_SECRET string) + `SEED_JOB_TEARDOWN_DISCOVERY.md` (real builder emails) are already tracked/public. Future decision: leave-as-archive OR `git filter-repo`/BFG history rewrite. Operator-only call; not blocking outreach.

## Phase 6 (completed, committed this session) — Atlas wiring proper

- §C–§I shipped clean. Plan: docs/audit/PHASE6_ATLAS_WIRING.md (untracked; Phase 7 commits per pattern).
- DDL applied to prod DB before commit: **`subject_atlas_roles` regular VIEW** (NOT materialized). Canonical migration: supabase/migrations/20260616125219_subject_atlas_roles_view.sql.
- **§A surfaced 5 plan corrections, all locked + applied:** (1) regular view not materialized — §A.7 data (77 public receipts) made materialization an unjustified staleness footgun; (2) `clusterOf` not `charAt(0)` — codebase has curated A–G gating in facets.ts; (3) `atlas_version` column on the view — role page is version-scoped; (4) zero-confirmed-roles forward-compat note (atlas_confirmed unpopulated on prod, Q1(c) deferred); (5) `buildPersonJsonLd` positional→options-object refactor.
- **§D cluster-derivation fix** across getRankedBuilders/Teams/Agents: `atlas_confirmed UNION atlas_inferred` via clusterOf. Receipt SELECT extended to fetch `atlas_confirmed` (was inferred-only — plan oversight caught). Forward-correct; byte-identical today (confirmed arm empty).
- **§E** `src/lib/atlas/matching.ts`: `findAtlasMatches`, `getPractitionersAtRole`, `getAtlasRolesForSubject` (version-scoped; secondary `entities` query for display_name, NOT an embed — Phase 5 §L PGRST201 lesson applied since views carry no FK metadata).
- **§F** `/api/v1/talent/search` migrated JS-filter → SQL-keyed matching engine; added `?type=team` / `?type=agent`. type=builder response shape preserved. Two intentional filter shifts (locked): L1-only matching (was all-public), role-precedence when cluster+role both passed (was AND).
- **§G** all three `/talent` type branches migrated to the matching engine (builder consistency + team/agent activation); server-driven `?cluster=` nav + per-pillar `<ClusterStrip>` facet on team/agent tabs.
- **§H** `/atlas/roles/[id]` Practitioners section above receipts: top-20 subjects, kind icons (👤/👥/🤖), receipt counts, overflow link at the cap.
- **§I** `buildPersonJsonLd` → options-object; `buildTeamOrgJsonLd`/`buildAgentOrgJsonLd` extended with `atlasRoles` input + `knowsAbout` output (machine-resolvable `…/atlas/roles/<role>` URLs, deduped+sorted). Collections caller wrapped positional→options, emission byte-identical.
- **§J 25/25 headless verifications passed** incl. negative-test (cluster=B excludes the agent). Baselines reused: entity #39 (team) + #40 (agent) + 10 humans at A4; view = 85 rows, A4 = 11 distinct subjects across all three pillars.
- **Known-issue CLOSED:** the atlas_inferred-only cluster derivation (was in Known issues below) is fixed in §D.

## Phase 5 (completed, committed this session) — Autonomous Agent flow

- §C–§K shipped clean. Plan: docs/audit/PHASE5_AGENT_FLOW.md (untracked; Phase 7 commits per pattern).
- DDL applied to prod DB before commit: agent_profiles (16 cols). Canonical migration: supabase/migrations/20260616111547_agent_profiles.sql.
- Agents are a first-class surface: /join Card 3 → /api/join/agent; /agent/<slug> public profile with custom **shipstacked:Agent** JSON-LD (locked Q1 — fourth pillar, no schema.org parent); /agent/<slug>/edit (owner-only, principal repoint dropdown); /api/v1/agent (GET+PATCH, agent:rw + cookie+owner); /api/v1/agent/<slug> (public fetch); /talent?type=agent (getRankedAgents Formula E + cyan <AgentCard> + provider/capabilities/verified filters); fetch-agent-profile AgentCard skill (verify-agent-card 6d).
- **§J folded into §G** via type-dependency: ConnectAnAgent's `Record<Scope,…>` system-prompt map forced the agent:rw entry the moment AgentEditClient referenced `scope="agent:rw"`. So agent:rw scope + agent_dashboard variant + prompt + blurb all shipped in §G.
- **§D factory change:** findOrCreateAgentEntity is now 4-arg (admin, user, agentName, slug), slug-keyed (multi-agent-per-owner for Card 3). New `findOrCreateAgentEntityLazy(admin, user)` wrapper preserves one-agent-per-email for the /api/enrich + /api/keys lazy-mint paths (owner-keyed precheck + deterministic `<email-local>-agent` slug + hex-retry on cross-owner collision). `resolveAgentPrincipal` added (owner-default-or-team-repoint; returns null gracefully when owner has no human entity).
- **§L seed-and-verify caught a real bug:** get-ranked-agents.ts embed `entity:entities(slug)` was ambiguous — agent_profiles has TWO FKs to entities (entity_id + principal_entity_id) → PostgREST **PGRST201** → silently-empty agents array → empty /talent?type=agent. Fixed with explicit FK hint `entity:entities!agent_profiles_entity_id_fkey(slug)`. Would have shipped a silently-empty directory without the headless catch.
- **AgentOnboarding.tsx DELETED this commit** (advanced from Phase 7): it was a misleadingly-labeled builder-key generator with no real agent functionality. /dashboard now redirects `!profile` → /join; the vestigial `?agent=1` param is ignored (profiled users get the normal dashboard).
- **§M.2 seed-and-verify (headless):** seeded the platform's first published agent via service-role:
  - entities id=40 (kind=agent, slug=test-agent-phase5, owner=operator), agent_profiles id=1 (provider=claude, model=claude-opus-4-7, published=true, principal_entity_id=NULL), proof_receipts id=89 (agent-subject, atlas_inferred=[A4], v0.4, public, L1) — left as baseline data.
  - Verified green (14/14): `/agent/test-agent-phase5` 200 + shipstacked:Agent JSON-LD + "Acts on its own behalf" (NULL-principal graceful degrade); `/talent?type=agent` shows the agent; `GET /api/v1/agent/<slug>` 200 (provider=claude, capabilities[2], principal:null, recent_receipts:1); `/atlas/roles/A4` renders the kind-aware `/agent/` subject link (§F.5 proven on prod data). Transient builder:rw key generated + deleted in-run.

## Phase 4 (completed, committed this session) — Team flow

- §A–§M shipped. Plan: docs/audit/PHASE4_TEAM_FLOW.md (untracked; Phase 7 commits per pattern).
- DDL applied to prod DB before session: team_profiles (16 cols), team_admins (5 cols), profiles.team_entity_id column.
- **§M.2 seed-and-verify (headless, operator could not drive browser):** seeded a real team directly via service-role:
  - entities id=39 (kind=team, slug=test-studio-phase4, owner=operator), team_profiles id=1 (published=true), team_admins id=1 (owner).
  - proof_receipts id=88 (team-subject, atlas_inferred=[A4], v0.4, public, L1) — left as baseline data.
  - Verified green: `/team/test-studio-phase4` 200 + Organization JSON-LD; `/talent?type=team` shows the team; `GET /api/v1/team/<slug>` 200 with payload; `/atlas/roles/A4` renders the kind-aware `/team/` subject link (Adjustment 3 proven on prod data).
- **§G deferred verification CLOSED ✅** — api_keys.scope CHECK constraint empirically ALLOWS `team:rw` (real insert succeeded, no 23514, no ALTER TABLE needed). Tested via a transient key (deleted in-run).
- §M.2 §4 (worksFor) NOT run — operator has no profiles row (see Operator identity below); deferred.

## Recovery artifacts (external, not in repo):

- `/tmp/outreach_engine_recovery_2026-05-23.sql` (outreach engine schema, dropped 2026-05-23)

## Outstanding TO-DOs (manually verify when bandwidth permits)

- **Stripe webhook lifecycle test plan execution** — see `SESSION_2026-05-23.md` "Late-late-session arc" section. Code shipped SHA `04373c7`, all events subscribed in Stripe Dashboard, but local CLI test (5 scenarios) deferred. Run before first real cancellation if possible; definitely before customer count >10. Full execution steps + acceptance criteria in the session journal.

- **British/American spelling split on `subscriptions.status`** — `/api/hirer/cancel` writes 'cancelled' (British), webhook writes 'canceled' (American). Both correctly fail the `status='active'` gate, so access-wise harmless. Tiny cleanup batch to unify (pick 'canceled' since Stripe uses American).

- **Hardcoded Stripe price ID** in `src/app/api/checkout/route.ts:7` — should move to env var. Not blocking. Refactor when bandwidth permits.

- **`current_period_end` clause duplication** — currently in canonical `getEntityModes()` only. The 9 inline `.eq('status', 'active')` checks across the codebase should consolidate into the canonical helper (separate batch).

- **Phase 1 (`11e9a31`) — agent enrichment smoke test (Block 5R §5R.5)** — NOT yet run on prod. With a real `sk_ss_` key, `POST /api/v1/builds`, wait ~30s, then confirm the receipt subject is an agent entity: `SELECT pr.id, pr.slug, pr.subject_id, e.kind, e.slug, pr.verification_level, pr.issued_at FROM proof_receipts pr JOIN entities e ON e.id = pr.subject_id WHERE pr.issued_at > NOW() - INTERVAL '5 minutes' ORDER BY pr.issued_at DESC LIMIT 5;` — expected `e.kind = 'agent'`. If `human`, Block 5R is wrong.

- **Phase 1 (`11e9a31`) — full §I cold walkthrough on prod** — NOT yet run. Verify: homepage step-03 copy (no "Velocity Score"), dashboard "Proof of Work" card, Atlas role chips on `/u/<classified-builder>`, OG image role pills, `/atlas/roles/<id>` lists ≥1 practitioner, `/join` Card 2 + Card 3 copy, junk profiles 404, `verify-agent-card.ts --base https://shipstacked.com` green. Full list in `docs/audit/DISCOVERY_phase1_foundation.md` §M.

## Phase 3 (`c191ad1`) — deferred verifications

Agent-native foundation shipped + prod-verified (discovery endpoints 200, `verify-agent-card` green against prod). These four need a real session / agent / email inbox and were NOT run automatically. Plan: `docs/audit/PHASE3_AGENT_NATIVE_R1.md`.

1. **auth.md OTP end-to-end with a real agent:** `POST /api/agent/auth/claim` → check inbox for the 6-digit code → `POST /api/agent/auth/claim/complete` → confirm a scoped `sk_ss_` key is returned → `GET /api/v1/me/scope` returns `buyer:rw` or `builder:rw` matching the requested scope.

2. **Buyer-key smoke test on prod (after #1):**
   - `GET /api/v1/talent/search` → ranked builders returned
   - `GET /api/v1/builders/<username>` → deep-fetch works
   - `POST /api/v1/messages` with `{ to_username, body }` → 200; message lands in the builder's inbox + email notification fires
   - `POST /api/v1/jobs` with `{ role_title, ... }` → 200; job appears at `/jobs`
   - `POST /api/v1/saved-profiles` with `{ builder_username, action: 'save' }` → 200; shows in `GET`

3. **Builder-key 403 enforcement:**
   - `POST /api/v1/jobs` with a `builder:rw` key → 403 "Insufficient scope"
   - `POST /api/v1/messages` with a `builder:rw` key → 403

4. **ConnectAnAgent UI walkthrough:**
   - `/dashboard` (logged in as builder): "Connect an Agent" card with the `builder:rw` system prompt, auth.md path, manual key-gen path, list/revoke of existing keys.
   - `/hirer` (logged in as buyer with active sub): "Connect an Agent" card with the `buyer:rw` system prompt.

## Phase 4 — deferred verifications

Shipped + headless-verified (seed-and-verify §M.2: team page, /talent?type=team, /api/v1/team, atlas kind-aware link, team:rw CHECK constraint all green on prod data). These remaining flows need a real browser session / a profile and were NOT run automatically:

1. **Card 2 team signup form end-to-end** (browser-paired) — `/join` Card 2 → fill form → POST `/api/join/team` → redirect to `/team/<slug>/edit`; confirm entity + team_profiles (published=false) + team_admins rows.
2. **EditProfileForm team autocomplete + initial-team hydration display** (browser-paired) — type team name, `/api/teams/search` fires, select, save; confirm hydrated team chip on reload.
3. **IdentityPicker on `/paste/review`** when the user owns >1 entity (browser-paired) — **blocked until operator has a profile** (needs a human + team entity owned by same user to surface the picker).
4. **ConnectAnAgent `team:rw` key-gen UI** on `/team/<slug>/edit` (browser-paired) — generate a team:rw key through the card (DB-level constraint already proven; this verifies the UI path).
5. **worksFor "Works with" card + JSON-LD on `/u/<username>`** (browser-paired) — **blocked until operator has a profile.** §M.2 §4 was deferred specifically because the operator has no profiles row. Open question post-Phase-4: should the operator dogfood Card 1 signup so this can be verified on their own profile.
6. **`/team/[slug]/edit` member-remove action** (browser-paired) — link a member, then remove; confirm `profiles.team_entity_id` set back to NULL and member drops from the People list.

## Phase 5 — deferred verifications

Shipped + headless-verified (§M.2 seed-and-verify: agent page, /talent?type=agent, /api/v1/agent/<slug>, atlas kind-aware link, NULL-principal graceful degrade all green on prod data — entity #40, agent_profiles #1, proof_receipt #89). These remaining flows need a real browser session and were NOT run automatically:

1. **Card 3 agent signup form end-to-end** (browser-paired) — `/join` Card 3 → fill form → POST `/api/join/agent` → redirect to `/agent/<slug>/edit`; confirm entity (kind=agent) + agent_profiles (published=false, principal_entity_id=NULL) rows.
2. **Agent edit page** (browser-paired) — profile editor save + publish toggle + **principal repoint dropdown** (the operator admins Test Studio Phase4 / entity #39, so that team should appear as a repoint option — confirm selecting it sets agent_profiles.principal_entity_id, and the /agent page then shows "Acts on behalf of <team>" → /team/<slug>).
3. **ConnectAnAgent `agent:rw` key-gen UI** on `/agent/<slug>/edit` (browser-paired) — generate an agent:rw key through the card (DB-level scope already proven via §L transient key; this verifies the UI path).
4. **`/talent?type=agent` filter UX** (browser-paired) — provider / capabilities / verified chip filters (basic render verified in §L; full interactive UX deferred).
5. **Agent profile contact CTA** (browser-paired) — set contact_email + contact_url in edit, confirm the mailto + external-link buttons render on /agent/<slug>.
6. **`/dashboard?agent=1` → `/join` redirect** (browser-paired) — AgentOnboarding-deletion side effect: a logged-in user with no profile hitting `/dashboard?agent=1` should land on `/join` (not 500, not a blank onboarding shim).

## Phase 6 — deferred verifications

Shipped + headless-verified (§J 25/25: view, matching engine, all 5 surface paths, JSON-LD knowsAbout, negative cluster filter — all green on prod data). These need a real browser / external validator and were NOT run automatically:

1. **`/talent?type=team&cluster=<X>` facet UX** (browser-paired) — click the Atlas cluster chips, confirm URL nav + active-chip highlight + result filtering feel right.
2. **`/talent?type=agent&cluster=<X>` facet UX** (browser-paired) — same.
3. ~~**Builder cluster facet count parity**~~ — **CLOSED in Phase 7 §D.** Builder facet counts now derive from the matching engine (`clusterFacetsFromMatches({subjectKind:'human'})`), L1-only, aligned with team/agent. Count == filter definition.
4. **JSON-LD `knowsAbout` external validation** — run a real `/agent/<slug>`, `/team/<slug>`, `/u/<username>` URL through Google Rich Results test or schema.org validator; confirm `knowsAbout` Atlas URLs parse cleanly.
5. **`/atlas/roles/[id]` Practitioners UX** (browser-paired) — live browse (not just curl): grid layout, icons, receipt-count chips, the cluster overflow link at the 20 cap.
6. **Materialized-view migration design** — N/A while the view is regular (always-fresh). If receipts cross ~10K and Phase 7+ migrates to materialized for scale, an automated REFRESH trigger (on receipt insert/update/delete) must be designed first.

## Deploy-time + manual verification checklist (do once, after current session ships)

These accumulated through Session N+1 — none are blocking outreach but each is a 1-2 minute check that closes a real gap.

### Vercel environment variable verification

Confirm in Vercel Dashboard → ShipStacked project → Settings → Environment Variables → Production scope:
- `SUPABASE_SERVICE_ROLE_KEY` — needed by the new `/api/builders/ranked` route (Task 2) and the webhook (Task 3). Should already exist.
- `STRIPE_SECRET_KEY` — Task 3 webhook needs to retrieve subscription.current_period_end on checkout completion
- `STRIPE_WEBHOOK_SECRET` — verified matching Stripe Dashboard live endpoint signing secret (OX agent confirmed)
- `RESEND_API_KEY` — Task 4 feedback widget needs this
- `INTAKE_NOTIFY_EMAIL` — Task 4 feedback widget routes to this

If any are missing in Vercel but present in `.env.local`, copy them over.

### Live behavior smoke tests (after Vercel deploy completes)

Run these in order, ~5 min total:

1. **Formula E ranking live** — hit `https://shipstacked.com/api/builders/ranked?limit=6` in browser. Expect: `{builders:[...]}` JSON with 6 builders. If 500 → env var missing.
2. **Homepage + /hirers builder grids** — load each, confirm 6 builder cards render (no infinite loading state, no empty grid).
3. **/talent anonymous top-6** — load while logged out. Confirm top-6 order: ryangrant144, aniketaslaliya801, janwinum9, sumitdongardive9, sunnyzheng606, joedias995. Confirm "Top ranked" sort label (not "Velocity"), "Ranked by proof of work" header (not "✓ Verified builders").
4. **/talent as paid hirer** — log in with an existing test subscription email. Scroll to confirm "Not yet ranked" badge appears on sub-threshold cards.
5. **Hirer feedback widget** — load `/hirer` as a paying hirer, scroll to the feedback card at the bottom. Submit a test message ("test from launch verification, please ignore"). Confirm it lands in `INTAKE_NOTIFY_EMAIL` inbox within ~30 seconds.

If any step fails, that's the priority bug to fix before outreach.

### Stripe webhook lifecycle test (deferred — see SESSION_2026-05-23.md)

Full 5-scenario Stripe CLI test plan deferred to a later session. Code shipped SHA `04373c7`, events subscribed in Stripe Dashboard, signing secret confirmed matching. Run before first real cancellation if possible; definitely before customer count >10.

### Optional cleanup items (do anytime — none blocking)

- 6 ambiguous-item decisions from `AUDIT_alignment_5_bucket.md`: `/client/inbox`, `/api/client-magic-link`, `/get-found/[id]`, `/api/jobs/xpost`, `claim_submissions` retention, `hire_confirmations` retention
- batch5-test profile cleanup (below-threshold test row sitting in published profiles)
- British/American spelling unification on `subscriptions.status`
- Hardcoded Stripe price ID → env var refactor
- Consolidate 9 inline `status='active'` checks into canonical `getEntityModes()`
- **`/hirer` vs `/hirers` route collision** — singular = paid dashboard, plural = marketing landing. Typo-prone for users; both routes exist and serve different purposes. Defer naming consolidation; for now both stay as-is. Future: consider renaming dashboard to `/dashboard/hirer` or similar.

## Known issues

- ~~**`getRankedBuilders` derives `atlasClusters` from `atlas_inferred` only**~~ — **CLOSED in Phase 6 §D.** All three ranking helpers now derive clusters from `atlas_confirmed UNION atlas_inferred` via clusterOf; receipt SELECT fetches both columns. Output is byte-identical today (confirmed arm empty on prod) but forward-correct once classification UX lands.

## Analytics

- **Tool:** PostHog (free tier, cookieless mode, US region)
- **Dashboard:** https://us.posthog.com (project: ShipStacked)
- **Project API key:** stored in `NEXT_PUBLIC_POSTHOG_KEY` (`.env.local` + Vercel Production scope)
- **Events instrumented:** `talent_page_viewed`, `profile_viewed`, `subscribe_clicked`, `message_button_clicked`, `feedback_submitted`, `hirer_dashboard_viewed`
- **GA4 removed** during Task 5 (replaced by PostHog single-tool model — measurement ID `G-Z6MBHJVV7S` no longer wired)
- **Session replay:** intentionally disabled (privacy-aligned, no consent banner)

---

# PART 4 — COMPREHENSIVE SIGN-UP-VARIABLES DIAGNOSTIC

Re-run live this session against HEAD `1633de0` (code unchanged since `c3a2174`). Every file:line was re-verified against live code, not carried from the prior session's recall. The mode vocabulary in code is six independent booleans — `builder, hirer, client, admin, team_admin, agent_owner` (`src/lib/user.ts:3-10`). Note the "buyer" pillar (Card 4) sets the **`client`** boolean (`user_metadata.role='client'`) — there is no separate `buyer` boolean. "Hirer" = an active `full_access` subscription, email-keyed.

## Part 1 — The signup paths (path × DB rows × role/mode × landing × email × enrich)

All four `/join` cards share one auth step — `supabase.auth.signUp({email,password})` (`join/page.tsx:144-170`) — then diverge. Builder writes direct-to-Supabase client-side (the "two save paths" light-validation path); team/agent/buyer POST to server routes using the service-role admin client. Hirer has no `/join` card — it is conferred by Stripe.

| # | Path | Handler | DB rows written | Role/mode set | Landing | Welcome email | Enrich |
|---|---|---|---|---|---|---|---|
| 1 | **Builder** | `join/page.tsx:173-253` (client, direct-to-Supabase) | `profiles` (`published:true`, `verified:false`, auto username) `:185-198`; `posts` if project given `:202-212`; `skills` **with `category`** `:217-231`. **No `entities` row** (human entity minted lazily later). | `builder` = `!!profile` (`user.ts:106`) | local `builder-2` success → links `/dashboard` + `/u/{username}` (`:572-573`). No `routeAfterAuth`. | YES — `/api/welcome type:'builder'` `:233-239`; subject "Your ShipStacked profile is live" (`welcome/route.ts:120-125`); added to `RESEND_SEGMENT_BUILDERS` (`:129-138`). | **YES** — fire-and-forget `/api/enrich` `:244` → `findOrCreateHumanEntity` + enrich via `after()` (`enrich/route.ts:201-202,298`). |
| 2 | **Team** | `/api/join/team/route.ts:39-186` (server, service-role) | `entities` `kind='team'`, slug-keyed (multi-per-owner) via `findOrCreateTeamEntity` `:131` / `entities.ts:402-436`; `team_profiles` `published:false` `:149-159`; `team_admins` `role:'owner'` `:167-171`. Best-effort rollback `:160-177`. | `team_admin` = `!!teamRow` (`user.ts:110`) | redirect `/team/{slug}/edit` (`:284` / route `:183`) | YES — `/api/welcome type:'team'` `:276-282`; "{teamName} is set up…" (`welcome/route.ts:34-50`); no segment. | NO |
| 3 | **Agent** | `/api/join/agent/route.ts:40-161` (server, service-role) | `entities` `kind='agent'`, slug-keyed (multi-per-owner) via `findOrCreateAgentEntity` `:119` / `entities.ts:247-285`; `agent_profiles` `published:false`, `principal_entity_id:null` `:137-147`. Best-effort rollback `:148-152`. | `agent_owner` = owns `kind='agent'` entity (`user.ts:111`, query `:87-93`) | redirect `/agent/{slug}/edit` (`:326` / route `:158`) | YES — `/api/welcome type:'agent'` `:318-324`; "Your ShipStacked agent account is ready" (`welcome/route.ts:52-69`); no segment. | NO |
| 4 | **Buyer** | `/api/join/buyer/route.ts:16-47` (server, service-role) | Stamps `user_metadata.role='client'` `:29-34`; `entities` `kind='human'` **one-per-owner** via `findOrCreateBuyerEntity` `:36` / `entities.ts:476-512`. **No profile, no subscription, no Stripe touch** (`:10-15`). | `client` = `metaRole==='client'` (`user.ts:108`) | local `buyer-2` success → links `/talent` + `/hirer` (`:701-702`). No `routeAfterAuth`. | YES — `/api/welcome type:'buyer'` `:341-347`; "Welcome to ShipStacked" (`welcome/route.ts:71-87`); no segment. | NO |
| 5 | **Hirer** (no card) | `/api/webhooks/stripe/route.ts` `checkout.session.completed` `:51` | **`subscriptions` row keyed by `email` ONLY** — `:106-115` writes `email, stripe_customer_id, stripe_session_id, stripe_subscription_id, product, status:'active', expires_at, current_period_end`. **No `entity_id`, no `user_id`.** Creates auth user w/ `password_set:false` if none `:62-72`. Idempotency via `stripe_events` `:45-49`. | `hirer` = active `full_access` sub matched by email (`user.ts:107`, gate `:62-73`) | magic link → `/set-password` `:78`; email CTA → `/hirer` `:137`; post-password `routeAfterAuth` → `/hirer`. | YES — sent **inline in webhook** via Resend (NOT `/api/welcome`); "Welcome to ShipStacked Full Access" `:126-152`; added to `RESEND_SEGMENT_EMPLOYERS` `:158-166`. | NO |

**Load-bearing fact:** the **hirer is the only role with no entity-graph linkage**. `subscriptions` is keyed solely by `email` (`stripe/route.ts:106-115`) and reconciled to a user only at read time by `subscriptions.email == user.email` (`user.ts:62-73`). Every other role links via `owner_user_id` / `user_id` / `profiles.user_id`.

## Part 2 — Toggle mechanics per path

The "toggle" into hiring is `EnableHiringButton` (`src/app/components/EnableHiringButton.tsx:40`).

- **Placement (renders the button):** `BuyerSection.tsx:54`, `TeamSection.tsx:95`, `BuilderDashboardClient.tsx:178`, `hirer/BuyerOnlyEmptyState.tsx:38`, `team/[slug]/edit/TeamEditClient.tsx:266`, `hirers/page.tsx:174` + `:366`.
- **Does NOT render it:** **`AgentSection.tsx`** (no import/usage — an agent-only owner has no in-app subscribe path) and **`HirerSection.tsx`** (only shows when already subscribed). DashboardShell wiring: `team_admin`→TeamSection, `agent_owner`→AgentSection, `client`→BuyerSection, `hirer`→HirerSection (`DashboardShell.tsx:35-38`).
- **Price label:** hardcoded "Enable hiring — $199/mo" at `EnableHiringButton.tsx:156` (card) and `:168` (primary). **Static — does NOT reflect the env price**, so during the $1 test it still reads $199. (Intentional — $199 is the real launch price.)
- **Billing key / endpoint:** button POSTs `/api/checkout {product:'full_access'}` (`:88-93`) → `checkout/route.ts` resolves `PRICES.full_access = process.env.STRIPE_PRICE_FULL_ACCESS || 'price_1TJhIzE3cjWtx7BrDkZxLavC'` (`:8`, the $199 fallback) → Stripe Checkout `line_items` `:31`. **Prod env currently overrides to the $1 test price `price_1TIBUCE3cjWtx7BryE30mxxK` — intentional; must unset before outreach.**
- **What toggling changes:** completing checkout fires the webhook (Part 1 #5) → writes the email-keyed `subscriptions` row → `modes.hirer` flips true on next mode resolution. **It changes the human's mode, never an entity's.**
- **NavBar after toggle:** mode-driven (`NavBar.tsx:45-92`); `hirer` adds Browse talent / Post a job / Hirer dashboard (`:72-76`). Messages href becomes `/messages?as=hirer` for hirer-only (`:185-188`).
- **Landing after toggle:** `routeAfterAuth` → `/hirer` *unless* the user is also `client` (then `/client/inbox` wins — see Part 5).

## Part 3 — Cross-role transitions A–E

Modes are independent OR-able booleans (`user.ts:105-112`) with **no mutual-exclusion guard** — adding a role never removes another; it only changes which surface wins the single landing precedence `admin > client > hirer > builder` (`auth-routing.ts:5-8, 21-34`; team_admin/agent_owner fall through to `/dashboard`).

- **A. Builder → also Hirer.** Keeps `profiles` (`builder`); webhook adds email-keyed `subscriptions` (`hirer`). Precedence `hirer > builder` flips landing `/dashboard` → `/hirer`. Builder dashboard still reachable manually.
- **B. Team-owner → also Builder.** `team_admins` + new `profiles`. Both land `/dashboard` (`auth-routing.ts:26,32`) — pillar-aware dashboard is the convergence point; no flip. The explicit `team_admin → /dashboard` branch (`:32`) exists to stop the old no-profile gate from ejecting team-only users (the Phase 9 Part 1 fix).
- **C. Builder/Team/Agent → also Buyer (client).** Card 4 stamps `role='client'` (`buyer/route.ts:29-34`). `client` outranks all but `admin` → default landing becomes `/client/inbox` regardless of other pillars. But Card-4 success screen sends them to `/talent`/`/hirer` (`join/page.tsx:701-702`) — success destination ≠ next-login destination.
- **D. Buyer (client) → also Hirer.** `client` AND `hirer` true; `client > hirer` → lands `/client/inbox`, **but the post-payment email CTA points at `/hirer`** (`stripe/route.ts:137`). Two separate buyer-side mechanisms (metadata string vs email-keyed sub) never reconciled.
- **E. Multi-pillar accumulation.** One account can be builder + N teams + N agents + buyer + hirer simultaneously — nothing prevents it. `refs` surface only the FIRST team and FIRST agent (`user.ts:84-93,117-120`), so additional teams/agents are invisible to NavBar/dashboard identity affordances and reachable only by direct URL. The mode-driven menu can advertise multiple pillars even though `routeAfterAuth` picks exactly one landing.

## Part 4 — Hiring Access semantics: "$199 unlocks builder-messaging ONLY" (CONFIRMED)

The `full_access` subscription gates **exactly three builder-messaging-adjacent capabilities, and nothing else**:

1. **Start a conversation with a builder** — paywall `if (!modes.hirer) → 403 "An active hirer subscription is required to message builders"` (`api/messages/route.ts:163-166`), fires only on new-conversation creation (`:158`). `modes.hirer` IS the subscription check.
2. **See a builder's contact/social details** on `/u/[username]` — `hasAccess = owner || hasSubscription || isAdmin` (`u/[username]/page.tsx:118`); else a blurred lock overlay "🔒 Contact details visible to Full Access subscribers" + CTA → `/hirers#pricing` (`:354-369`). Only the contact links are gated; profile content stays public.
3. **See the full builder directory** — `displayProfiles = isPaidHirer ? profiles : profiles.slice(0,6)`; non-subs get a 6-builder teaser (`talent/page.tsx:174-175`, `isPaidHirer` from subscriptions query `:108-119`).

**Everything else is ungated:**
- **Team & agent directories are fully public** — the `type==='team'` (`talent/page.tsx:55-72`) and `type==='agent'` (`:74-92`) branches return *before* the `isPaidHirer` query at `:108` even runs.
- **Team & agent contact is a public `mailto:` for ALL users** (paid or anonymous) — `team/[slug]/page.tsx:325,329`; `agent/[slug]/page.tsx:295,301` — no subscription/auth check.
- **No buyer/hirer badge** exists anywhere (the only "buyer mode" UI is the EnableHiringButton's own status block, `EnableHiringButton.tsx:125,148`).

## Part 5 — User-confusion surfaces

- **A. Buyer-vs-Hirer split (the biggest one).** `client` (Card-4 metadata) and `hirer` (paid subscription) are two unreconciled buyer-side mechanisms, and `client` outranks `hirer` in routing (`auth-routing.ts:22-23`). A Card-4 buyer who then pays lands on `/client/inbox` while the post-payment email tells them to go to `/hirer` (`stripe/route.ts:137`) and the NavBar shows the full hirer menu — three surfaces disagree (the prior session's "state 9 mismatch").
- **B. Card-4 re-routes a builder's home.** A builder who clicks Card 4 ("I want to hire") permanently changes their default landing from `/dashboard` to `/client/inbox`, while the Card-4 success screen sends them to `/talent`/`/hirer` (`join/page.tsx:701-702`) — neither matches the next-login landing.
- **C. Agent-only owner can't subscribe.** `AgentSection` renders no `EnableHiringButton`, so an agent-only owner has no in-app path to Full Access (must reach `/hirers` or a builder profile to find the button).
- **D. Team/agent toggle implies team-billing but bills the human.** A team admin who clicks "Enable hiring — $199/mo" from `TeamSection`/`TeamEditClient` becomes a hirer *personally* (email-keyed sub), not their team — but nothing on the button says so. The Messages link then appears for team/agent-only users yet leads to an effectively empty inbox (conversations has no team/agent subject).

## Part 6 — State × toggle matrix (10 rows)

Modes resolved from `user.ts:105-112`; landing from `auth-routing.ts:21-34`; menu from `NavBar.tsx:45-92`.

| # | Account state | builder | client | hirer | team_admin | agent_owner | Default landing | Menu highlights | Notes |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| 1 | Anon | – | – | – | – | – | (public) | Atlas, How it works, Pricing, Feed, Browse talent | `NavBar.tsx:47-54` |
| 2 | Builder only | ✓ | – | – | – | – | `/dashboard` | Builder dashboard, Edit profile | `auth-routing.ts:26` |
| 3 | Team only | – | – | – | ✓ | – | `/dashboard` (TeamSection) | Edit team, Your team | `:32`; EnableHiring shown |
| 4 | Agent only | – | – | – | – | ✓ | `/dashboard` (AgentSection) | Edit agent, Your agent | `:33`; **no EnableHiring (C)** |
| 5 | Buyer (client) only | – | ✓ | – | – | – | `/client/inbox` | (client JSX; menu links `[]`) | `:22`; `NavBar.tsx:58-60` |
| 6 | Hirer only (paid) | – | – | ✓ | – | – | `/hirer` | Browse talent, Post a job, Hirer dashboard | `:23-25` |
| 7 | Builder + Hirer | ✓ | – | ✓ | – | – | `/hirer` | builder + hirer links | flip from `/dashboard` (A) |
| 8 | Team + Builder | ✓ | – | – | ✓ | – | `/dashboard` | builder + Edit team | converges (B) |
| 9 | Buyer + Hirer | – | ✓ | ✓ | – | – | **`/client/inbox`** | full hirer menu | **mismatch: email says `/hirer` (D)** |
| 10 | Builder + Team + Agent + Hirer (multi) | ✓ | – | ✓ | ✓ | ✓ | `/hirer` | all pillar links; only 1st team/agent shown | refs limit `user.ts:84-93` (E) |

## Part 7 — Honest gaps + "absolute minimum" for team subscription / messaging / jobs

**Honest gaps (what does NOT exist today):**
- **Subscription is never pillar-scoped.** `subscriptions` has only `email` (no `team_entity_id`/`agent_entity_id`/`user_id`). A team admin paying $199 becomes a hirer *personally*, not their team (`stripe/route.ts:106-115`).
- **Team/agent in-app messaging does not exist.** `conversations` has only `employer_email` + `builder_profile_id` (+ `job_id`) — no team/agent subject column anywhere (`messages/route.ts:178-179,189,197`; `admin/page.tsx:35`). The Messages link shown to team/agent-only users leads to an empty inbox.
- **Job authorship is per-user, not per-entity.** `jobs.employer_email` keys ownership (`post-job/PostJobForm.tsx:115`, `post-job/page.tsx:40`, `hirer/HirerDashboardClient.tsx:149,163`) — no team/agent FK.
- **Agent owners have no subscribe path** (no EnableHiringButton in AgentSection).
- **`client`/`hirer` routing collision** (state 9) is unresolved.

**Absolute minimum to make team subscription / messaging / jobs real (the gap list — scope, not a sprint plan):**
1. **Entity-keyed subscription** — add `team_entity_id` / `agent_entity_id` (or generic `subject_entity_id`) to `subscriptions`; gates read by entity when the subject is entity-scoped instead of `.eq('email', user.email)`.
2. **Entity-targeted conversations** — add a subject-entity column to `conversations`; `/api/messages` must accept team/agent as recipient subjects (today it 403s/keys to builder only).
3. **Entity-scoped job ownership** — migrate `jobs.employer_email` → `jobs.poster_entity_id` (or add it alongside) so teams/agents author jobs.
4. **AgentSection EnableHiringButton** — or an explicit decision that agents don't subscribe.
5. **routeAfterAuth `client`/`hirer` fix** (state 9) — reconcile the two buyer-side mechanisms or reorder precedence.
6. **Confusion-mitigation copy** on the team/agent toggle ("billed per-user, not per-team").

> DDL items (1–3) apply via the Supabase Dashboard SQL Editor per CLAUDE.md invariant #4 — the terminal cannot apply DDL. Each ships with a reversal SQL block. **No code is auto-started — the operator decides Part 2 scope.**

---

# PART 5 — LIVE DB INVENTORY SNAPSHOT

Captured live on 2026-06-20 from the production Supabase (service-role, read-only) via `scripts/v2/inventory-db.ts` (PostgREST OpenAPI table list + exact `head:true` counts).

## All 34 public objects, grouped by domain

**Identity / pillars (7)**
`profiles` · `entities` · `employer_profiles` · `team_profiles` · `agent_profiles` · `team_admins` · `agent_registrations`

**Skills / portfolio / social (6)**
`skills` · `projects` · `posts` · `post_comments` · `comment_likes` · `github_data`

**Proof / verification / Atlas (6)**
`proof_receipts` · `verification_events` · `attestations` · `atlas_roles` · `subject_atlas_roles` (view) · `capabilities_vocab`

**Consented Collections (3)**
`collections` · `collection_memberships` · `consent_tokens`

**Hiring / jobs / messaging (7)**
`jobs` · `applications` · `conversations` · `messages` · `hire_confirmations` · `project_inquiries` · `saved_profiles`

**Billing / API access (3)**
`subscriptions` · `stripe_events` · `api_keys`

**Enrichment / ingestion (2)**
`enrichment_runs` · `ingestion_log`

## Row counts (foundational tables, live)

| Table | Rows |
|---|---|
| profiles | 69 |
| entities | 40 |
| subscriptions | 12 |
| proof_receipts | 83 |
| conversations | 162 |
| messages | 250 |
| jobs | 24 |
| applications | 122 |

## Full count dump (all 34)

```
       1  agent_profiles
       0  agent_registrations
      48  api_keys
     122  applications
      74  atlas_roles
       0  attestations
      15  capabilities_vocab
       0  collection_memberships
       0  collections
       1  comment_likes
       0  consent_tokens
     162  conversations
       7  employer_profiles
       5  enrichment_runs
      40  entities
      21  github_data
     160  hire_confirmations
      90  ingestion_log
      24  jobs
     250  messages
      13  post_comments
      72  posts
      69  profiles
       4  project_inquiries
      37  projects
      83  proof_receipts
       3  saved_profiles
     958  skills
       1  stripe_events
      91  subject_atlas_roles
      12  subscriptions
       2  team_admins
       2  team_profiles
      81  verification_events
```

## Migration coverage — live DB is the source of truth

Only **8 migration files** exist under `supabase/migrations/`, covering roughly 7–8 of the 34 objects:

```
20260515150752_proof_receipts_v0_1.sql          → proof_receipts
20260515152135_fix_overlapping_policies.sql     → (RLS policy fix)
20260515152326_unify_proof_receipts_select.sql  → (RLS policy fix)
20260516142038_merge_profiles_entities_link.sql → entities ↔ profiles link
20260516162601_consented_collections.sql        → collections, collection_memberships, consent_tokens
20260616111547_agent_profiles.sql               → agent_profiles
20260616125219_subject_atlas_roles_view.sql     → subject_atlas_roles (view)
20260616165858_phase8_f_team_admins_self_read.sql → team_admins (RLS)
```

The remaining ~26 tables (the entire V1 identity/skills/hiring/messaging/billing core — `profiles`, `skills`, `projects`, `posts`, `conversations`, `messages`, `jobs`, `applications`, `subscriptions`, `employer_profiles`, `team_profiles`, etc.) have **no migration file**. They were applied directly to the live DB before the migrations folder existed. **The live DB schema is canonical, not the migrations folder.** Any DDL must be type-confirmed against live `information_schema`, applied via the Supabase Dashboard SQL Editor (per CLAUDE.md invariant #4), and back-written as a migration file.

> Prior-session diagnostic stated "23 of 34 tables have no migration file." The exact split depends on whether you count RLS-only migrations and the view; the load-bearing fact is unchanged: **the large majority of tables predate migrations and live DB is the source of truth.**

---

# PART 6 — CURRENT MAIN CODE STATE

Captured 2026-06-20.

- **HEAD (latest on `main`):** `1633de0` — "docs: session handoff 2026-06-20 (Phase 9 Part 1.6 complete)"
- **Working tree:** clean (before this bootstrap bundle was written). `origin/main` up to date.

## Commits since site-audit close (`5a3726e..HEAD`), chronological

```
35db509  Fix Builder signup: skills silently dropped due to missing category
0efcb2b  Fix owner-self-message CTA + stale post-payment password email
c3a2174  Phase 9 Part 1.6: unify NavBar menu — mode-driven, not path-dependent
1633de0  docs: session handoff 2026-06-20 (Phase 9 Part 1.6 complete)
```

(`5a3726e` "Phase 9 Part 1: pillar-aware /dashboard" is the audit-close anchor itself — the first commit of Phase 9 Part 1, already on prod.)

## `git log --stat -5 --oneline`

```
1633de0 docs: session handoff 2026-06-20 (Phase 9 Part 1.6 complete)
 docs/decisions/SESSION_HANDOFF_2026-06-20.md | 77 ++++++++++++++++++++++++++++
 1 file changed, 77 insertions(+)

c3a2174 Phase 9 Part 1.6: unify NavBar menu — mode-driven, not path-dependent
 src/app/components/NavBar.tsx | 133 ++++++++++--------------------------------
 1 file changed, 31 insertions(+), 102 deletions(-)

0efcb2b Fix owner-self-message CTA + stale post-payment password email
 src/app/api/webhooks/stripe/route.ts | 10 +++++-----
 src/app/set-password/page.tsx        | 19 +++++++++++++++++--
 src/app/u/[username]/page.tsx        | 14 +++++++++++++-
 3 files changed, 35 insertions(+), 8 deletions(-)

35db509 Fix Builder signup: skills silently dropped due to missing category
 src/app/join/page.tsx | 17 ++++++++++++++---
 1 file changed, 14 insertions(+), 3 deletions(-)

5a3726e Phase 9 Part 1: pillar-aware /dashboard — fixes team/agent kicked-out bug
 [Phase 9 Part 1 — DashboardShell, Team/Agent/Buyer/HirerSection, dashboard/page.tsx,
  lib/user.ts, lib/auth-routing.ts; shipped before the range above]
```

- **Vercel prod:** each commit verified Production `state=success`; `shipstacked.com` → 200; `/dashboard` anon → 307→/login. Deploy status read via the public GitHub deployments API on the SHA (no vercel CLI / gh in terminal).

---

# PART 7 — ARCHITECT-CLAUDE BOOTSTRAP PROMPT

*(Copy everything below the line into a fresh architect-Claude chat to resume.)*

---

I'm continuing ShipStacked work. Previous architect-Claude session hit context limits.

Three-party loop:
- You (architect-Claude in this chat): strategy, specs, decision-routing. NEVER answer present-day market questions from training data. Diagnose first via tc, then spec, then execute. No "use judgment" hedges in specs.
- Terminal Claude (tc) in ~/shipstacked: executes all code, DB work, shell. Operator relays paste-blocks.
- Operator (Thomas): judgment, credentials, final decisions.

Where the platform is:
- Repo github.com/Agent-Ox/shipstacked on main HEAD c3a2174 (or later if commits since)
- Phase 9 Part 1 + 1.6 shipped: pillar-aware /dashboard, unified mode-driven NavBar, skills-on-signup fix, owner-self-CTA fix, post-payment email fix
- Prod live, working tree clean

Standing rules:
- Red-flag word: "probably." Don't act on uncertainty.
- Facts come from cat/grep/live verification, NEVER recall
- Stripe price in prod env is $1 INTENTIONALLY for testing — don't "fix" it. Real price is $199, must flip before outreach.
- Hardcoded "$199/mo" on EnableHiringButton is correct — launch price
- Operator prefers short answers, numbered questions at end
- Diagnose-first for anything touching multiple files or architecture

Bootstrap prompt to send tc immediately upon starting:
