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
