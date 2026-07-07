# Kill the project-inquiry / passwordless-client flow (Population B) — safety assessment (2026-07-06)

READ-ONLY assessment of retiring the passwordless project-inquiry flow (anonymous visitor →
`/api/inquiry` → passwordless `role='client'` account + `project_inquiry` conversation →
`/client/inbox`). Scope: **Population B only** (reactive inquirers). Population A
(buyer-signup org owners) is retired separately by the `client`-mode plan
([[CLIENT_MODE_MAP_2026-07-06]]) — this kill does NOT touch buyer signup.

## VERDICT — safe to kill. Zero real data, zero real users, paywall fallback already exists.

- **All inquiry data is test.** 4 conversations, 4 `project_inquiries` rows, 5 `role='client'`
  auth users — every one a `oxleethomas+*` / `@shipstacked.com` test address. **No real user
  is orphaned.**
- **The paywall fallback already ships.** `FeedPostCTA` already renders a permanent
  "Get Full Access" block beside the inquiry form; `/api/messages` already 403s non-members.
  Killing the form leaves a clean paywall.
- **No builder-side breakage.** The builder inbox queries by `builder_profile_id` across ALL
  conversation types; `project_inquiry` is only a display label.
- **Bonus:** killing Population B *removes the hardest part* of the `client`-mode retirement —
  there is no longer an orphan population needing a data-ownership re-gate on `/client/inbox`.

---

## 1. REAL vs TEST DATA (queried live via service role)

### 1a. `conversations WHERE conversation_type='project_inquiry'` — **4 rows, 100% test**
| conv id (abbrev) | client_email | created | verdict |
|---|---|---|---|
| 7aa4f8c4… | oxleethomas+client1@gmail.com | 2026-04-06 | test |
| 8dddb735… | oxleethomas+client2@gmail.com | 2026-04-06 | test |
| 37f8fe92… | oxleethomas+client3@gmail.com | 2026-04-06 | test |
| 5c7bd9f0… | oxleethomas+client4@gmail.com | 2026-04-06 | test |

4 distinct `client_email`, **0 real-looking**, all `oxleethomas+clientN@gmail.com`, all
seeded same day (2026-04-06).

### 1b. `project_inquiries` table — **4 rows, 100% test**
Same 4 emails (`oxleethomas+client1..4@gmail.com`). 0 real.

### 1c. Passwordless `role='client'` auth users — **5 total, 100% test, 0 real**
| email | owns kind='org'? | profile? | password_set? | population |
|---|---|---|---|---|
| oxleethomas+client1@gmail.com | NONE | no | no | B (inquiry) |
| oxleethomas+client2@gmail.com | NONE | no | no | B (inquiry) |
| oxleethomas+client3@gmail.com | NONE | no | no | B (inquiry) |
| oxleethomas+client4@gmail.com | NONE | no | no | B (inquiry) |
| test-batch5-buyer@shipstacked.com | NONE | no | no | A-test (buyer signup) |

The 4 inquiry clients (Population B) hold NO org, NO profile, NO password — exactly the
"orphan" shape. All test. `test-batch5-buyer` is a Population-A buyer test (out of this kill's
scope; retired by the client-mode plan).

### Bottom line
**There is NO real inquiry data and NO real passwordless client.** The entire flow's live
footprint is seed/test rows from one day in April. Purging is zero-risk to real users.

---

## 2. THE FULL FLOW TO REMOVE — every file

| # | File | Role | Action |
|---|---|---|---|
| 1 | `src/app/api/inquiry/route.ts` | The whole inquiry endpoint: creates passwordless `role='client'` user, `project_inquiry` conversation, `project_inquiries` row, dual emails, Resend "Clients" segment write (`:167-168`). | **DELETE** |
| 2 | `src/app/feed/[id]/FeedPostCTA.tsx` | Client component. Renders the inquiry FORM (`:70-119`, `acceptsInquiries`-gated) that POSTs `/api/inquiry` (`:47`) **AND** the permanent "Get Full Access" paywall block (`:121-132`). | **EDIT** — remove the form block + its state (`:27-32`, `:39-65`, `:70-119`); KEEP the paywall block. (Becomes paywall-only.) |
| 3 | `src/app/feed/[id]/page.tsx` | Passes `acceptsInquiries={profile?.accepts_project_inquiries !== false}` (`:229`) + selects `accepts_project_inquiries` (`:74`). | **EDIT** — drop the `acceptsInquiries` prop + the column select. |
| 4 | `src/app/client/inbox/page.tsx` | The inbox route (server gate on `modes.client`). | **DELETE** (whole `/client/inbox` route) |
| 5 | `src/app/client/inbox/ClientInboxClient.tsx` | The inbox UI (loads `conversations` by `client_email`). | **DELETE** |
| 6 | `src/app/client/inbox/ClientInboxGate.tsx` | Passwordless re-entry (email → `/api/client-magic-link`). | **DELETE** |
| 7 | `src/app/api/client-magic-link/route.ts` | Magic-link sender for `/client/inbox`. | **DELETE** |
| 8 | `src/lib/types.ts:127-142` | `ProjectInquiry` type. | **DELETE** the type |
| 9 | `src/app/dashboard/BuilderDashboardClient.tsx:134,141` | Builder "accept project inquiries" toggle (reads/writes `profiles.accepts_project_inquiries`). Dead once inquiries die. | **EDIT** — remove the toggle |
| 10 | `src/app/join/page.tsx:227` | Sets `accepts_project_inquiries: true` on builder signup. | **EDIT** — drop the field |
| 11 | Resend "Clients" segment | `RESEND_SEGMENT_CLIENTS` write lives inside `/api/inquiry:167-168` — removed with file #1. Env var + Resend audience are external (leave). | (goes with #1) |

**Overlapping client-mode refs** (dangling `/client/inbox` links once #4-6 are gone — these
are ALSO on the `client`-mode retirement list, do them together):
- `src/lib/auth-routing.ts:22` — `if (modes.client && !modes.hirer) return '/client/inbox'`
- `src/app/messages/page.tsx:75-77` — bounce to `/client/inbox`
- `src/app/components/NavBar.tsx:277` — "My inbox" → `/client/inbox` (+ `:206` comment)
- `src/app/robots.ts:22` — `'/client'` disallow (harmless if route gone; tidy)
- `src/middleware.ts:99` — `'/client'` in `authRequired` (harmless; tidy)
- `src/lib/entities.ts:536` — comment referencing `/api/inquiry`

---

## 3. WHAT REPLACES "contact a builder" for a non-member — ✅ paywall already there

Killing the inquiry backdoor correctly funnels non-members to Full Access. The gate already
exists and is enforced server-side:

- **`src/app/api/messages/route.ts:28`** (`?new=`): `if (!modes.member) return 403 "An active
  subscription is required to message members"`.
- **`src/app/api/messages/route.ts:233`** (POST new conversation): same `!modes.member` → 403.
- `modes.member` = active `full_access` subscription (`src/lib/user.ts:142`).

So the **only** unauthenticated way to reach a builder's inbox today is `/api/inquiry`. Remove
it and a non-member who wants to contact a builder hits the paywall. The paywall CTA is
already present on every relevant surface:
- **`FeedPostCTA.tsx:121-132`** — permanent "Get full access to the talent directory … $199/month"
  → `/hirers` (survives the edit in §2 #2).
- `src/app/u/[username]/page.tsx:621-624` — "Subscribe to message {name} — Full access … $199/month".
- `src/app/messages/page.tsx:342-344` — "Subscribe to message builders … Get full access".
- `src/app/talent/TalentClient.tsx:742-746` — talent teaser "Get full access — $199/mo".

**Confirmed:** the fallback is real and enforced. No new paywall work is required — only
re-pointing the feed CTA (§6c), which is just deleting the form half of a component that
already contains the paywall half.

---

## 4. BUILDER SIDE — no breakage

Builders receive `project_inquiry` conversations in `/messages`. Assessment:
- **Inbox query is type-agnostic.** `src/app/api/messages/route.ts:142-146` loads the builder's
  conversations by `.eq('builder_profile_id', profile.id)` with NO `conversation_type` filter.
  Every type (project_inquiry, job_application, direct hirer) is returned the same way.
- **`project_inquiry` is only a label.** `src/app/messages/page.tsx:225` maps the type to a
  purple "Project enquiry" badge. If no such conversations exist, the branch simply never
  fires. Removing the branch (or leaving it) is harmless.
- **Reply path has no paywall by design.** `route.ts:280-281` comment: "No paywall here so
  builders (and inquiry clients) can always reply." Builders keep replying into any existing
  thread; only the passwordless *client's* reply UI (`/client/inbox`) disappears — moot once
  the test threads are purged.
- **The `accepts_project_inquiries` toggle** (BuilderDashboardClient) becomes a dead control →
  remove (§2 #9). No functional dependency elsewhere.

**Verdict:** zero builder-facing breakage. After purge, builders simply have no
project_inquiry threads; the rest of their inbox is untouched.

---

## 5. DEPENDENCIES — everything referencing the flow (grep-verified)

`conversation_type` / `project_inquiry`:
- `messages/page.tsx:225` (label, project_inquiry) — **remove/leave**
- `messages/page.tsx:226` (label, **job_application**) — **KEEP.** ⚠️ `conversation_type` is
  SHARED with job applications — the COLUMN and the `job_application` value must stay. Only the
  `project_inquiry` VALUE goes unused.
- `api/inquiry/route.ts:67,74` — removed with the file.

`client_email` / `client_name`:
- `api/inquiry/route.ts:75-76,96-97` — removed with the file.
- `client/inbox/ClientInboxClient.tsx:64` — removed with the route.
- `lib/types.ts:130-131` — removed with the `ProjectInquiry` type.
- **Columns** `conversations.client_email` / `client_name` become dormant (inquiry-only). Safe
  to leave in place; dropping is optional Dashboard DDL (low value).

`/client/inbox` / `ClientInbox*` / `client-magic-link` / `/api/inquiry` / `project_inquiries`:
- All callers enumerated in §2. After the deletes, the only residual references are the
  overlapping client-mode routing refs (auth-routing:22, messages:75-77, NavBar:277,
  robots:22, middleware:99) — dangling links that MUST be updated in the same change (they're
  already on the client-mode retirement list).

Schema provenance:
- **No in-repo migration** for `project_inquiries`, `conversations.client_email/client_name`,
  or `conversation_type` — these were applied via the Dashboard SQL Editor (per the repo's
  Dashboard-DDL invariant) with no committed migration file. Dropping `project_inquiries` is
  therefore a **Dashboard DDL** op (with a reversal block), not a repo migration.

---

## 6. KILL PLAN — safe removal order

### (a) DELETE — routes / components / CTA
1. `src/app/api/inquiry/route.ts` (whole file)
2. `src/app/client/inbox/` (all three: `page.tsx`, `ClientInboxClient.tsx`, `ClientInboxGate.tsx`)
3. `src/app/api/client-magic-link/route.ts`
4. `src/lib/types.ts` — the `ProjectInquiry` type block
5. **EDIT** `FeedPostCTA.tsx` — strip the inquiry form (keep the Full Access paywall block)
6. **EDIT** `feed/[id]/page.tsx` — drop `acceptsInquiries` prop + `accepts_project_inquiries` select
7. **EDIT** `BuilderDashboardClient.tsx` — remove the accept-inquiries toggle
8. **EDIT** `join/page.tsx:227` — drop `accepts_project_inquiries: true`
9. **EDIT** the dangling `/client/inbox` refs (auth-routing:22, messages:75-77, NavBar:277,
   robots:22, middleware:99) — coordinate with the client-mode retirement.
10. Optionally remove the `messages/page.tsx:225` project_inquiry label (harmless if left).

Order: do the EDITs that remove *callers* (5,6,9,10) first or together with the DELETEs; tsc
will flag any missed reference (e.g. the `ProjectInquiry` import, the `/client/inbox` route).
`npm run build` catches dangling route links.

### (b) DB data — purge vs keep (all test; purge)
Purge (all confirmed test):
- `project_inquiries` — 4 rows (delete rows; optionally DROP the table via Dashboard DDL + reversal).
- `conversations WHERE conversation_type='project_inquiry'` — 4 rows (+ cascade their `messages`).
- 4 passwordless auth users `oxleethomas+client1..4@gmail.com` (`role='client'`, no org).
- (Population-A test `test-batch5-buyer@shipstacked.com` — leave to the client-mode/buyer cleanup.)

Keep:
- The `conversation_type` COLUMN and its `job_application` value (shared — load-bearing).
- `conversations.client_email/client_name` columns (dormant; drop optional).

### (c) RE-POINT — the feed CTA
`FeedPostCTA` already contains the Full Access paywall block. "Re-pointing" = deleting the
inquiry-form half so the component renders paywall-only. No new copy/route needed. Every other
"contact a builder" surface already routes non-members to `/hirers` (§3).

### (d) Confirm no real user orphaned — ✅
- 0 real `project_inquiry` conversations, 0 real `project_inquiries` rows, 0 real
  passwordless `role='client'` users (§1). Every affected row is a test address.
- Builders keep their inbox intact (§4). Non-members get the existing paywall (§3).
- **No real user loses access to anything.** The only "population" the flow served (B) has zero
  real members.

### 🔗 Strategic note — this SIMPLIFIES the client-mode retirement
Killing Population B removes the single hardest item in [[CLIENT_MODE_MAP_2026-07-06]] §9: the
`/client/inbox` data-ownership re-gate and the `routeAfterAuth` fallthrough for orphan
inquirers. With B gone, `role='client'` is left marking ONLY Population A (buyer-org owners),
who are cleanly identified by org-ownership. **Recommend sequencing: kill inquiry (this doc)
BEFORE, or in the same change as, the client-mode retirement.**

---

## Method
Live DB reads via service role (`conversations`, `project_inquiries`, `auth.admin.listUsers` +
per-user org/profile lookup; test-classified by email pattern). Full reads of the flow files
(`api/inquiry`, `FeedPostCTA`, `client/inbox/*`, `api/client-magic-link`, `api/messages`,
`messages/page`, `types.ts`) + grep over `project_inquiry|client_email|/client/inbox|
ClientInbox|conversation_type|api/inquiry|project_inquiries`. Read-only — no source or data
mutated.
