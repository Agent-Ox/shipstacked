# `client` Mode — exhaustive touchpoint map + retirement plan (D2b-1)

READ-ONLY map of everything `client` mode touches, to retire it cleanly in D2b-1.

`client` mode = `user_metadata.role === 'client'`, surfaced as `EntityModes.client`.
The retirement: the demand-side entry creates a real **org identity** (`kind='org'` +
`team_admins` + `team_profiles`, which the buyer route already does) WITHOUT the
`role='client'` stamp; everything keyed on `client` re-keys on **org-ownership +
Full Access** instead.

---

## ⚠️ THE HEADLINE TENSION — `client` marks TWO different populations

`role='client'` is written by **two** endpoints for **two structurally different** users.
Retiring the flag safely requires treating them separately:

| Population | Set by | What they HAVE | Identity WITHOUT `client` |
|---|---|---|---|
| **A. Buyer signups** (proactive) | `/api/join/buyer` | A real `kind='org'` entity + `team_admins` (owner) + `team_profiles` (hires=false) | ✅ `team_admin=true` + org flags (`org_hires`/`!org_offers_services`). Fully identifiable. |
| **B. Project inquirers** (reactive) | `/api/inquiry` | **NOTHING** — passwordless auth user, NO org, NO profile, NO subscription. Only `role='client'` + `conversations.client_email`. | ❌ **All modes false.** Retiring `client` leaves them with **no identity at all.** |

**Population B is the breaking flow.** An anonymous visitor who clicks "message this
builder" on a feed post gets a lightweight passwordless account (`role='client'`, no
org) and a magic link to `/client/inbox`, where they read the builder's replies. Their
conversations live in `conversations` keyed by `client_email = their email`. If `client`
is retired and nothing replaces the `/client/inbox` gate, **these users lose the only
door to their inbox.** The retirement plan (§9) MUST re-home them — recommended: keep
`/client/inbox` but re-gate it on **data-ownership** (has conversations where
`client_email = user.email`) instead of `modes.client`.

---

## 1. WHERE `client` is SET (writes to `user_metadata.role`)

### 1a. `/api/join/buyer` — buyer signup (Population A)
- **`src/app/api/join/buyer/route.ts:58-61`**
  ```ts
  if (currentMeta.role !== 'client') {
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...currentMeta, role: 'client' },
    })
  }
  ```
  Idempotent stamp, alongside minting the org (entity `kind='org'` + `team_profiles`
  hires=false/offers_services=false/published=false + `team_admins` owner row, lines
  70-165). Comment at `:15` — "plus user_metadata.role='client' for routing/badge (a
  buyer is still a client; now they also OWN an org)."

### 1b. `/api/inquiry` — reactive project inquiry (Population B)
- **`src/app/api/inquiry/route.ts:53-60`**
  ```ts
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name, role: 'client' }
  })
  ```
  Creates a passwordless account (`role='client'`) ONLY if the inquirer's email has no
  account yet. NO org, NO profile. Then creates a `conversations` row
  (`conversation_type='project_inquiry'`, `client_email=email`, lines 68-79), a
  `messages` row, and a `project_inquiries` row (lines 86-102). Magic link →
  `/client/inbox` (or `/messages` if the emailer is already a builder/employer; line 105).

**No other writers.** Grep for `role: 'client'` / `role='client'` returns only these two
(+ comments in `NavBar.tsx:99`, `buyer/route.ts:15,55`, `BuyerOnlyEmptyState.tsx:4`,
`hirer/page.tsx:28`, `entities.ts:538`, `user.ts:8`).

---

## 2. WHERE `client` is READ (every gate/route/render)

### 2a. Mode derivation (the field is computed in FOUR mirrors — all identical)
Each derives `client: metaRole === 'client'` from `user.user_metadata.role`:
- **`src/lib/user.ts:143`** — `getUserState()` (server, canonical). Field declared at
  `:8` (`client: boolean // user_metadata.role === 'client'`), in `EMPTY_MODES` at `:51`.
- **`src/app/components/NavBar.tsx:142`** — client-side self-resolve. `EMPTY_MODES` at `:20`.
- **`src/app/auth/callback/page.tsx:32`** — `deriveModesClientSide()` (shared by set/update-password).
- **`src/app/set-password/page.tsx:84`** and **`src/app/update-password/page.tsx:69`** —
  inline mode objects (return `client: metaRole === 'client'`); `EMPTY_MODES` fallbacks at
  `set-password:72` / `update-password:57`.

### 2b. Routing
- **`src/lib/auth-routing.ts:22`** — `if (modes.client && !modes.hirer) return '/client/inbox'`
  Post-auth priority `admin > client > hirer > builder` (`:6`). A client-without-Full-Access
  lands on `/client/inbox`. `defaultMessagingMode()` (`:48-52`) intentionally EXCLUDES
  client (comment `:41-44`: "client-mode-only users are redirected away from /messages to
  /client/inbox").
- **`src/app/hirer/page.tsx:32`** — `if (metaRole === 'client') return <BuyerOnlyEmptyState …>`
  When a `/hirer` visitor has no subscription: `role='client'` → show the buyer empty
  state (Browse-talent + Full Access CTA); otherwise `redirect('/hirers#pricing')` (`:35`).
  This is Population A's no-sub landing.
- **`src/app/messages/page.tsx:76-79`** — forward gate:
  ```ts
  if (!builder && !hirer && metaRole === 'client') { window.location.href = '/client/inbox'; return }
  ```
  A client-only user who hits `/messages` is bounced to `/client/inbox`.
- **`src/app/client/inbox/page.tsx:16-20`** — the inbox's own gate (reverse of the above):
  ```ts
  if (!modes.client) {
    if (modes.hirer) redirect('/messages?as=hirer')
    if (modes.builder) redirect('/messages?as=builder')
    redirect('/dashboard')
  }
  ```
  Only `modes.client` users may see `/client/inbox`; everyone else is redirected out.

### 2c. Render / menu gating
- **`src/app/dashboard/DashboardShell.tsx:38`** — `{modes.client && <BuyerSection email={email} hasSubscription={modes.hirer} />}`
  The `/dashboard` "buyer home" section (talent shortcut + shortlists + Full Access
  toggle) renders only for clients.
- **`src/app/dashboard/page.tsx:133`** — zero-pillar onboarding gate includes `!modes.client`:
  ```ts
  if (!modes.builder && !modes.team_admin && !modes.agent_owner && !modes.hirer && !modes.client) redirect('/join')
  ```
  `client` counts as "has a pillar" so a buyer isn't ejected to `/join`.
- **`src/app/components/NavBar.tsx`** — four uses:
  - **`:62`** — `if (modes.client && !modes.builder && !modes.hirer) return []` — client-only
    users get an EMPTY standard menu (their links come from the special block at `:275`).
  - **`:101`** — `if (modes.team_admin && !modes.builder && !modes.client)` — **⚠️ THE
    LOAD-BEARING PROXY.** Adds the "Dashboard" link for a *service-org* owner but NOT a
    *buyer-org* owner. Comment `:92-100`: team_profiles.offers_services isn't readable
    client-side (no self-read RLS), so NavBar uses `!modes.client` as the proxy — "a buyer
    org is always role='client'; a service-team/agency owner never is." This is the
    CLAUDE.md "NavBar !modes.client decision." **Retiring `client` breaks this
    distinction** unless `org_offers_services` is threaded into the client component.
  - **`:208`** — `messagesHref = modes.client && !modes.builder && !modes.hirer ? null : …`
    Client-only users get no top-level messages href (they use the `/client/inbox` link
    in the special block instead).
  - **`:275-290`** — the client-only JSX block (rendered when
    `modes.client && !modes.builder && !modes.hirer`): links **"My inbox"** (`/client/inbox`),
    **"Showcase your work"** (`/join`), **"Hire talent"** (`/for-hirers`).

### 2d. "Logged-in" signal (cosmetic)
- **`src/app/jobs/JobsClient.tsx:242`** and **`src/app/jobs/[id]/JobDetailClient.tsx:22`** —
  `const isLoggedOut = !modes.builder && !modes.hirer && !modes.client && !modes.admin`
  `client` is one of the OR-signals meaning "this user is logged in." Drives a
  logged-out-vs-in CTA. If `client` is retired, a pure Population-B user reads as
  logged-out here (minor cosmetic — a jobs CTA), unless they gain another mode.

---

## 3. THE `/client/inbox` SURFACE

Three files under `src/app/client/inbox/`:
- **`page.tsx`** — server gate (see §2b). No user → `<ClientInboxGate />`; wrong mode →
  redirect out; client → `<ClientInboxClient>`.
- **`ClientInboxGate.tsx`** — passwordless re-entry. Email input → POST
  `/api/client-magic-link` → "check your email." For a returning inquirer who lost their
  session (magic-link expired).
- **`ClientInboxClient.tsx`** — the inbox UI. Loads `conversations` **by `client_email =
  userEmail`** (`:64`), NOT by mode. Renders threads ("Your enquiries"), realtime message
  subscribe, reply box. An "Upgrade nudge after 2+ conversations" (`:209-220`) links
  `/hirers` "Get full access — $199/mo".

**Supporting endpoint:** `src/app/api/client-magic-link/route.ts` — sends a magic link to
`…/auth/callback?redirect_to=/client/inbox` for any existing account (email-enumeration-safe).

**Who sees it:** Population B (inquirers) primarily; also Population A buyers pre-`/hirer`
(the router sends `client && !hirer` here). **Is it still needed?** YES for Population B —
it is their ONLY inbox (no org, no `/messages` access). The DATA layer already keys on
`client_email` (mode-independent); only the GATE (`page.tsx:16`) and the router
(`auth-routing.ts:22`, `messages:76`) depend on `modes.client`. So the surface can survive
by re-gating on data-ownership (§9).

---

## 4. `routeAfterAuth` — client branches + what each user should route to WITHOUT `client`

Current (`src/lib/auth-routing.ts:15-35`), priority `admin > client > hirer > builder`:
```ts
if (modes.admin)  return '/admin'
if (modes.client && !modes.hirer) return '/client/inbox'   // ← client branch
if (modes.hirer)  return opts.requiresPasswordSet ? '/update-password' : '/hirer'
if (modes.builder) return '/dashboard'
if (modes.team_admin) return '/dashboard'
if (modes.agent_owner) return '/dashboard'
return '/dashboard'
```

Without `client`, by population:
- **A (buyer-org owner, no sub):** falls to `modes.team_admin → '/dashboard'`. But today
  they land on `/hirer` (via the `client && !hirer` route → then `/hirer` shows
  `BuyerOnlyEmptyState`). Decision needed: keep buyer-orgs landing on `/hirer` (re-gate
  `hirer/page.tsx:32` on org-ownership) OR move them to `/dashboard` (BuyerSection). Both
  give them a home; **not broken, just a routing choice.**
- **A (buyer-org owner WITH Full Access):** already `modes.hirer=true` → `/hirer`. Unchanged.
- **B (inquirer, no org):** falls all the way to `return '/dashboard'` → `dashboard/page.tsx:133`
  onboarding gate fires (all modes false) → **`redirect('/join')`.** ❌ They get bounced to
  signup instead of their inbox. **Must be handled** (§9): either route B by
  data-ownership to `/client/inbox`, or accept that B only ever arrives via the inquiry
  magic link (which sets `redirect_to=/client/inbox` explicitly, bypassing
  `routeAfterAuth`'s mode logic via the `opts.redirectTo` short-circuit at `:19`).

  **Mitigating fact:** the inquiry + magic-link flows pass an explicit `redirect_to`
  (`inquiry:109`, `client-magic-link:27`), and `routeAfterAuth` honors `redirectTo` FIRST
  (`:19`). So B's normal path already bypasses the mode branches. The residual risk is B
  landing on `/dashboard`/`/messages` without a redirect param → onboarding bounce.

---

## 5. THE BUYER SIGNUP (`/api/join/buyer` + `join/page.tsx` Card 4)

**Creates now** (`api/join/buyer/route.ts`):
1. `entities` row `kind='org'`, `owner_user_id=user.id` (via `findOrCreateOrgEntity`, `:130`).
2. `team_profiles` row: `hires=false, offers_services=false, published=false` (`:141-148`).
3. `team_admins` row: single `role='owner'` (`:154-156`).
4. `user_metadata.role='client'` stamp (`:58-61`).
Idempotent (one org per `owner_user_id`; reuse path `:92-107`).

**`join/page.tsx` Card 4** (client UI): `handleBuyerSubmit` (`:373`) POSTs `/api/join/buyer`
(`:380`), then `/api/welcome` (`:394`, `type: 'buyer'`), then shows `renderBuyer2` →
"Browse talent / Go to dashboard."

**What changes dropping `role='client'` but keeping org creation:** remove ONLY the
`updateUserById` stamp (`:58-61`). Rows 1-3 stay — the buyer is now identified by
`team_admin=true` + `team_profiles.hires` / `!offers_services`. **No structural change to
org creation.** Every downstream `modes.client` check for Population A must move to an
org-ownership check (see §9). `findOrCreateBuyerEntity` (the legacy `kind='human'` buyer
path, `entities.ts:543-579`) is already dead (comment `buyer/route.ts:25-26`: "retained …
but no longer called").

---

## 6. `/api/inquiry` — the reactive flow

**Flow:** anonymous visitor on a feed post (`/feed/[id]`, "message this builder" via
`FeedPostCTA`/inquiry form) → POST `/api/inquiry` with `{name,email,message,post_id,
builder_profile_id}`. Server: validates builder accepts inquiries (`:28`); creates/reuses a
passwordless account with `role='client'` (`:48-65`); writes `conversations`
(`type='project_inquiry'`, `client_email`), `messages`, `project_inquiries` (`:68-102`);
emails the builder (reply on `/messages`) and the inquirer (magic link to `/client/inbox`,
`:105-111`); adds to the Resend "Clients" segment (`:163-173`).

**Does it need `client`?** The **data** doesn't (conversations key on `client_email`). The
`role='client'` value is used for: (a) the magic-link destination choice (`:105` — `client`
vs builder/employer), and (b) the `/client/inbox` gate + `/messages` bounce. **What
replaces it:** re-gate `/client/inbox` on data-ownership; keep the account passwordless but
DON'T stamp a role (or stamp a neutral marker if a signal is still needed for the magic-link
destination). The builder side is unaffected — builders already see inquiries in `/messages`
via `conversation_type='project_inquiry'` (`messages/page.tsx:225`).

---

## 7. `EntityModes.client` — the field + all mirrors

- **Declaration:** `src/lib/user.ts:8` (`client: boolean`).
- **`EMPTY_MODES` / empty-object literals** (must drop the key together):
  - `src/lib/user.ts:51`
  - `src/app/components/NavBar.tsx:20`
  - `src/app/update-password/page.tsx:57`
  - `src/app/set-password/page.tsx:72`
- **Computed mirrors** (`client: metaRole === 'client'`): `user.ts:143`,
  `NavBar.tsx:142`, `auth/callback/page.tsx:32`, `set-password/page.tsx:84`,
  `update-password/page.tsx:69` (same set that carries `member`/`hirer`).
- Retiring the field = TypeScript-breaking change to the `EntityModes` type → every literal
  and every `modes.client` reader must be updated in the same commit (tsc enforces
  completeness — a good guardrail).

---

## 8. Other `client` references (paths, infra, analytics, comments)

- **`src/app/robots.ts:22`** — `'/client'` in Disallow list (keep or drop with the route).
- **`src/middleware.ts:99`** — `'/client'` in `authRequired` array (auth-gate for the route).
- **Analytics:** `src/app/api/inquiry/route.ts:167-168` — Resend `RESEND_SEGMENT_CLIENTS`
  segment (env-keyed; a marketing audience, not a mode gate — independent of retirement).
- **Comments naming the role** (update for honesty): `NavBar.tsx:99`,
  `buyer/route.ts:15,55`, `BuyerOnlyEmptyState.tsx:4`, `hirer/page.tsx:28`,
  `entities.ts:536-538`, `user.ts:8`.
- **No CSS** keyed on client. **No PostHog `source` enum** value `'client'`
  (EnableHiringButton sources are `hirers_authed`/`buyer_empty_state`/`talent_teaser`/… —
  none is `client`).
- **NOT this retirement:** a legacy `role==='employer'` value also exists
  (`inquiry.ts:105,138`) — separate legacy concept, out of scope.

---

## 9. RETIREMENT PLAN — per touchpoint

Legend: **DELETE** = remove · **RE-KEY** = swap the condition to org-ownership / Full Access ·
**KEEP** = survives, re-gated on data · **⚠️** = breaks a flow if done naively.

### Writes
| Touchpoint | Action |
|---|---|
| `buyer/route.ts:58-61` stamp | **DELETE** the `updateUserById` role stamp. Keep org rows 1-3. Buyer = org owner. |
| `inquiry/route.ts:53-60` `role:'client'` | **DELETE** the role from `user_metadata` (keep passwordless account). If the magic-link destination (`:105`) still needs a signal, branch on data instead (does this email own conversations / a profile?). |

### The `EntityModes.client` field
| Touchpoint | Action |
|---|---|
| `user.ts:8` field, `:143` compute, `:51` empty | **DELETE** the field + all mirrors (`NavBar:20,142`, `auth/callback:32`, `set-password:72,84`, `update-password:57,69`). tsc will enforce every reader is updated. |

### Routing
| Touchpoint | Action |
|---|---|
| `auth-routing.ts:22` `client → /client/inbox` | **RE-KEY / ⚠️.** Population A (org owner) routes via `team_admin`/`hirer` already. Population B relies on the explicit `redirect_to` from the inquiry/magic-link flow (honored at `:19` before mode logic) — verify EVERY B entry passes `redirect_to=/client/inbox`; else B bounces to `/join`. Safest: add a data-ownership branch "has project_inquiry conversations → `/client/inbox`" OR keep a minimal marker for B. |
| `hirer/page.tsx:32` `metaRole==='client'` | **RE-KEY** to org-ownership: a no-sub visitor who OWNS a `kind='org'` (team_admin) → `BuyerOnlyEmptyState`; else `/hirers#pricing`. |
| `messages/page.tsx:76` bounce | **RE-KEY / ⚠️.** Re-gate on "has no builder/hirer/team identity but owns inquiry conversations → `/client/inbox`," or DELETE if B is guaranteed to arrive via magic link. |
| `client/inbox/page.tsx:16` gate | **KEEP, RE-GATE.** Replace `if (!modes.client)` with a data check: user has conversations where `client_email = user.email` (mode-independent). This is the linchpin that keeps Population B whole. |

### Render / menu
| Touchpoint | Action |
|---|---|
| `DashboardShell.tsx:38` `{modes.client && <BuyerSection>}` | **RE-KEY** to org-ownership without services: `modes.team_admin && !refs.org_offers_services` (buyer-org), or a dedicated `is_buyer_org` ref. |
| `dashboard/page.tsx:133` onboarding gate | **RE-KEY:** drop `!modes.client`; buyer-orgs already satisfy `!modes.team_admin`=false so they're not ejected. Verify a bare Population-B user (no pillar) is intended to reach `/dashboard` at all (probably not — they belong on `/client/inbox`). |
| `NavBar.tsx:62` empty menu | **RE-KEY** to the Population-B signal (no pillars, inquiry-only) — or DELETE if B never renders the app NavBar (they use `/client/inbox`, which has its own chrome). |
| `NavBar.tsx:101` **the proxy** | **⚠️ RE-KEY (needs data).** Thread `refs.org_offers_services` into the client NavBar (via `navUser`) and gate the "Dashboard" link on `!org_offers_services` instead of `!modes.client`. Without this, buyer-orgs and service-orgs become indistinguishable client-side. This is the one spot where retiring `client` needs a real data addition, not just a rename. |
| `NavBar.tsx:208` messagesHref | **RE-KEY / DELETE** with the same B signal. |
| `NavBar.tsx:275-290` client-only block | **RE-KEY / DELETE** with the same B signal. |
| `jobs/JobsClient.tsx:242`, `JobDetailClient.tsx:22` isLoggedOut | **RE-KEY:** drop `!modes.client`; add whatever mode B carries (or accept the minor cosmetic that a bare inquirer reads as logged-out on jobs CTAs). |

### Infra / misc
| Touchpoint | Action |
|---|---|
| `robots.ts:22`, `middleware.ts:99` `/client` | **KEEP** if `/client/inbox` survives (recommended); DELETE both only if the route is removed. |
| `inquiry.ts:167-168` Resend segment | **KEEP** (marketing audience, mode-independent). |
| Comments (§8) | **UPDATE** for honesty. |
| `entities.ts:543-579` `findOrCreateBuyerEntity` | Already dead — **DELETE** opportunistically (not called since Stage 2). |

### 🚩 Flags — where retiring `client` BREAKS a flow if done naively
1. **`/client/inbox` for Population B (inquirers).** The inbox is their only home and has no
   other door. If the gate (`page.tsx:16`) is deleted without a data-ownership replacement,
   every past inquirer is locked out of live builder replies. **Re-gate on `client_email`
   ownership — do not simply delete.**
2. **The NavBar `!modes.client` proxy (`:101`).** Buyer-org vs service-org is currently
   distinguished ONLY by this flag client-side. Retiring it requires threading
   `org_offers_services` into the NavBar. A rename alone regresses the menu.
3. **`routeAfterAuth` fallthrough for B.** Without a data-ownership branch, a Population-B
   user without an explicit `redirect_to` falls to `/dashboard` → onboarding → `/join`.
   Confirm all B entry points carry `redirect_to=/client/inbox` (they do today: `inquiry:109`,
   `client-magic-link:27`) OR add the data branch.

---

## Method
Live grep over `src/**/*.{ts,tsx}` for `role.*client` / `modes.client` /
`metaRole === 'client'` / `EntityModes` / `/client`, filtered to exclude Supabase
`createClient` noise, + full reads of the 14 mode-relevant files (user.ts, auth-routing.ts,
api/join/buyer, api/inquiry, api/client-magic-link, client/inbox/{page,ClientInboxClient,
ClientInboxGate}, NavBar, hirer/page, messages/page, DashboardShell, dashboard/page,
entities.ts, auth/callback, set/update-password). Read-only — no source mutated.
