# DISCOVERY — Phase 2: Generic Buyer Mode toggle (`<EnableHiringButton>`)

**Status:** Phase 2 discovery doc per the discovery-first protocol (AGENTS.md §"How this codebase ships").
**Drafted:** 2026-05-26 by architect-Claude (Opus 4.7), from terminal-Claude pre-flight reads against HEAD `11e9a31`.
**Prerequisite:** Phase 1 (shipped as `11e9a31`, Blocks 1–5R only — see §C.1 drift note).
**Successor phase:** Phase 3 (Team profile surface).

This document is read-only enumeration. **No code is to be written based on this doc until the operator approves it verbatim.** Each numbered item under §F is a unit of operator approval. The button-state copy in §F/§H needs word-for-word sign-off (flagged in Phase 1 §L as the open Phase-2 review).

---

## A. Scope and goal

Phase 2 ships one reusable client component — **`<EnableHiringButton>`** — that lets any visitor or signed-in entity activate **Buyer Mode** (a `full_access` subscription) through honest, session-correct, state-aware UI, and retires the two raw email-input checkout blocks on `/hirers`. It also closes the **still-open checkout email-mismatch footgun** that Phase 1 intended to fix but did not ship (former Block 7), because that fix is the safety backstop for the button's authenticated path.

"Buyer Mode" is not a new column or table — it is the existing derived state `modes.hirer === hasSubscription` (`src/lib/user.ts:57`). Enabling it = creating a `full_access` subscription via the existing `/api/checkout` + Stripe + webhook path. Phase 2 changes **how that activation is presented and triggered**, not the underlying subscription model.

**What "done" means for Phase 2 (the gate):**
- A single `<EnableHiringButton>` component renders three correct states: anonymous (convert), authenticated-without-hiring (enable), authenticated-with-hiring (active).
- The two `/hirers` checkout blocks (hero + pricing) render via the component; anonymous conversion behavior is byte-for-byte preserved.
- An authenticated user can no longer create a subscription keyed to a non-session email (former Block 7 closed).
- The builder dashboard offers a supply→demand "enable hiring" entry that reflects live mode state.
- No live user-visible claim overstates capability (Standing Copy Rule).
- `npx tsc --noEmit` clean. `npm run build` clean. `verify-agent-card.ts` green against prod (no AgentCard surface touched, must stay green).

---

## B. Operating principles governing this phase (operator-locked, inherited from Phase 1 §B)

1. **Additive on existing surfaces (Invariant #6).** The `/hirers` landing is a high-intent conversion page. The component must preserve the existing anonymous email→checkout funnel exactly; only the authenticated experience changes.
2. **Revenue-proximity drives trade-offs.** `/hirers` (the paying-customer front door) and the checkout-footgun fix are the revenue-critical items. If anything flexes, it's the dashboard cross-sell slot (Item 4), not the `/hirers` integration (Item 3) or the checkout fix (Item 2).
3. **Coordinated phasing across surfaces.** One component, integrated once across `/hirers`, the builder dashboard, and the buyer-only empty state — not three bespoke buttons.
4. **Standing Copy Rule at phase boundary.** Every button-state string is honest about what the click produces *today*.
5. **"Probably" is the red flag.** Every line/file citation below was verified against HEAD `11e9a31` via terminal-Claude reads. Where a surface was not yet read in full (BuyerOnlyEmptyState), the doc says so and gates it behind a pre-flight read.

---

## C. State at start of Phase 2 (verified 2026-05-26 against HEAD `11e9a31`)

### C.1 — ⚠ Phase 1 shipped Blocks 1–5R only (drift to reconcile)

The commit `11e9a31` ("Phase 1: honesty pass + agent enrichment wiring + checkout session-keying") contains **24 files, none of which are `src/app/api/checkout/route.ts` or `src/app/hirers/page.tsx`**. Verified:
- `src/app/api/checkout/route.ts` is the original 30-line file: `POST` reads `{ product, email }`, no `getUser()`, hands `email` straight to `stripe.checkout.sessions.create({ customer_email: email })`. **No session-keying. No `authed_user_id` metadata. The email-mismatch footgun is live in prod.**
- `src/lib/user.ts` has no `console.warn` — Block 8 (getEntityModes hardening) was not applied.
- Block 6 (junk-profile SQL: `paddybot130`, `batch5-test`, `hyy922`) was not run in `11e9a31`; subsequently EXECUTED 2026-05-26 via service-role script — all three now `published=false`; entity-22 public receipts (ids 64, 66) flipped to `private`. Done (see §G).

**Consequence for the commit record:** the commit message over-claims "checkout session-keying." This is a documentation-vs-code drift of the exact kind the protocol exists to catch. **Recommended reconciliation:** fold the checkout session-keying into Phase 2 (Item 2 below — it's the backstop for the authed button anyway), and handle the message drift via the Tier 4 reconciliation pass / a corrected note. Block 6 (junk SQL) and Block 8 (warn) remain separately pending and are listed in §G as not-Phase-2.

### C.2 — Current `/hirers` checkout flow (`src/app/hirers/page.tsx`, `'use client'`)

- No auth/session awareness anywhere on the page — it never calls `getUser()` or reads `modes`. It holds one `email` text-input state (line 10).
- `goToCheckout` (lines 41–54): `posthog.capture('subscribe_clicked', { source: 'hirers' })` → `POST /api/checkout { product: 'full_access', email }` → `window.location.href = url`.
- **Two identical checkout entry points**, both bound to the same `email` + `goToCheckout`:
  - Hero (lines 162–175): email input + "Get full access — $199/mo".
  - Pricing card `#pricing` (lines 348–360): email input + "Get full access — $199/mo".

### C.3 — Modes contract (`src/lib/user.ts`, server-side)

- `getEntityModes()` is **async + server-only** (`createServerSupabaseClient`). `modes.hirer = hasSubscription` where the subscription is `status='active'` AND `product='full_access'` AND not expired by `expires_at` or `current_period_end`.
- A fully client page (`/hirers`) cannot call it directly → see §E.1 / Decision D1.

### C.4 — Manage-subscription surface

- **No Stripe `billing_portal` / `customer_portal` route exists.** The only management path is `src/app/hirer/HirerDashboardClient.tsx:537` — a `<form action="/api/hirer/cancel" method="POST">` (cancel only).

### C.5 — Buyer-only entities (Card 4)

- `/join` Card 4 → `/api/join/buyer` creates a `kind='human'` entity + `user_metadata.role='client'`, **no Stripe at signup** (paywall fires at first paid action — exactly what `<EnableHiringButton>` is).
- `src/app/hirer/page.tsx`: a `role='client'` user with no subscription renders `BuyerOnlyEmptyState`; everyone else with no sub is redirected to `/hirers#pricing`. (`BuyerOnlyEmptyState.tsx` not yet read in full — gated behind a pre-flight read in Item 4.)

### C.6 — Dashboard render (`src/app/dashboard/BuilderDashboardClient.tsx`, `'use client'`)

- `ProofOfWorkCard` component at lines 8–40; rendered in the "Proof of Work" card at lines 174–180; the 2-col GitHub/Verified grid follows at 182+.
- The client component receives `profile`, `email`, `githubData`, the four PoW props, etc. — **it does not receive `modes`.** A dashboard "enable hiring" slot therefore needs the same client-side mode resolution as `/hirers` (Decision D1).

### C.7 — PostHog

- `posthog-js` (client) is the established pattern. `subscribe_clicked { source }` is the existing checkout-intent event (`hirers`, `homepage`, `talent_teaser`).

---

## D. Invariants that apply to this phase

- **#3 Brand-free.** No partner/program/brand names in the component or copy. (Pricing copy already brand-free.)
- **#5 One-source-of-truth.** `<EnableHiringButton>` becomes the single source for "activate Buyer Mode" UI; existing surfaces re-use it, they do not re-implement checkout buttons.
- **#6 Additive, never subtractive.** The `/hirers` anonymous funnel is preserved verbatim; the component replaces the *authenticated* experience and leaves anon untouched. No sections removed/reordered.
- **#8 verify-agent-card green.** Phase 2 introduces no AgentCard skills and touches no `/.well-known`, `/api/mcp`, JSON-LD, or content-negotiation surface. The guard must stay green (regression check only).
- **No DDL.** The subscription model and `modes` derivation already exist. Phase 2 is **code-only**. (Contrast Phase 1's Item 6, still pending.)

---

## E. Code touch points (enumerated against HEAD `11e9a31`)

### E.1 New component — `src/app/components/EnableHiringButton.tsx` (new file, client)

A self-contained client component that resolves its own auth/mode state (Decision D1 = encapsulated, so host pages stay drop-in). States:

1. **Loading** — resolving session; render a disabled placeholder matching the host's button chrome.
2. **Anonymous** (no session) — render the existing email input + primary CTA; `goToCheckout` behavior preserved exactly (email → `/api/checkout`). *Funnel unchanged.*
3. **Authenticated, no hiring** (`session && !modes.hirer`) — render a single button "Enable hiring — $199/mo" + a small "Billed to `<session-email>`" line; click → `POST /api/checkout { product:'full_access' }` (no email in body; the Item 2 fix keys it to session). No email input.
4. **Authenticated, hiring active** (`session && modes.hirer`) — render "✓ Buyer Mode active — Manage at hirer dashboard" linking to `/hirer`. No checkout button, no Stripe billing portal (D2 — deferred to Phase 5).

Client-side mode resolution: `supabase.auth.getUser()` + a single subscription existence check, OR a tiny read-only `GET /api/me/modes` returning `{ authed, hirer }`. (Decision D1 picks which.)

### E.2 `src/app/api/checkout/route.ts` (full file, 30 lines) — fold in the deferred session-keying

Currently no auth. Add a cookie-session read that overrides `customer_email` with the session email when authenticated, and stamp `authed_user_id` into metadata for webhook reconciliation. (This is the verbatim former Phase 1 Block 7 / §F Item 7a — see §H.1 for the exact replacement.)

### E.7 `src/lib/user.ts` — getEntityModes warn (folded from Phase 1 Block 8, D4)

One `console.warn` after the subscription + profile queries resolve: when `!subscription` AND `user` AND `profile?.user_id`, log an email↔auth drift warning. Logs-only, no control-flow change. Verbatim in §H.3.

### E.3 `src/app/hirers/page.tsx` — replace both checkout blocks with the component

- Hero block (162–175) and pricing block (348–360) → `<EnableHiringButton source="hirers_authed" />` in both (D3: authed-enable analytics use `'hirers_authed'`; the component's internal anon path keeps the existing `'hirers'` source).
- The page stays `'use client'`; the component encapsulates auth so no page-level refactor. `goToCheckout`/`email`/`loading` state on the page is removed only if no longer referenced after substitution (verify at pre-flight diff).

### E.4 `src/app/dashboard/BuilderDashboardClient.tsx` — supply→demand slot

- Insert `<EnableHiringButton source="dashboard_enable_hiring" variant="card" />` after the Proof of Work card (after line 180), as a new card in the existing chrome. Renders state 3 (enable) for builders without a sub, state 4 (active) for builder+hirer dual-mode. Empty/edge: never blocks the dashboard.

### E.5 `src/app/hirer/page.tsx` / `BuyerOnlyEmptyState.tsx` — align the buyer-only CTA

- `BuyerOnlyEmptyState` currently has its own CTA (not yet read in full). Align it to use `<EnableHiringButton source="buyer_empty_state" />` so a Card-4 buyer activates through the same path. **Gated on a pre-flight read of `BuyerOnlyEmptyState.tsx`.**

### E.6 PostHog event

- Component fires `posthog.capture('subscribe_clicked', { source })` (D3 — reuse the existing event for funnel continuity). Locked `source` values for the authed-enable click: `'hirers_authed'` (both /hirers placements), `'dashboard_enable_hiring'`, `'buyer_empty_state'`. The anonymous /hirers click keeps the existing `'hirers'` source unchanged.

---

## F. Phase 2 execution items (numbered, operator-reviewable)

### Item 1 — Build `<EnableHiringButton>` (the shared component)

Create `src/app/components/EnableHiringButton.tsx`. Props: `{ source: string; variant?: 'inline' | 'card' }`. Implements the 4 states in §E.1. Self-resolves auth/mode via Decision D1's chosen mechanism. Copy per §H.2 (operator-approved). No host-page changes in this item — component is built + unit-renderable in isolation first.

### Item 2 — Close the deferred Phase 1 safety fixes (checkout session-keying + getEntityModes warn)

**2a — checkout (former Block 7):** Replace `src/app/api/checkout/route.ts` per §H.1: cookie-session read, override `customer_email` with session email when authenticated, add `authed_user_id` metadata. Anonymous behavior (body email → Stripe) unchanged. This is the backstop that makes State 3 safe regardless of client.

**2b — getEntityModes warn (former Block 8, D4):** Add the single `console.warn` line to `src/lib/user.ts` per §H.3. Logs-only, surfaces email↔auth drift. Rides along.

### Item 3 — Integrate into `/hirers` (hero + pricing)

Replace both checkout blocks (§E.3). **Hard requirement:** anonymous render + behavior is byte-for-byte the same as today (same email input, same CTA label, same `goToCheckout` → `/api/checkout`). Only the authenticated render changes. Verify the hero and pricing both still convert anon users.

### Item 4 — Builder dashboard supply→demand slot

Insert the component after the Proof of Work card (§E.4) and align `BuyerOnlyEmptyState` (§E.5). **Gated on a pre-flight read of `BuyerOnlyEmptyState.tsx`** before drafting its exact diff. This item flexes first if the phase runs long (principle B.2).

### Item 5 — Verification + copy lock

Cold-walkthrough all three states on prod (logged out, logged-in-no-sub, logged-in-hirer), confirm anon funnel intact, confirm authed checkout is session-keyed, `verify-agent-card` green. (§I.)

---

## G. Out of scope (deferred)

- **Stripe `billing_portal` "manage subscription" route** — none exists today (§C.4). Phase 2's active state links to the existing `/hirer` dashboard (where cancel lives). A real billing portal is a later phase (Decision D2).
- **Block 6 — junk-profile SQL** (`paddybot130`, `batch5-test`, `hyy922`) — EXECUTED 2026-05-26 via service-role script: all three `published=false`, entity-22 receipts (64, 66) `private`, verified 0 public receipts for subject 22. Done; not Phase 2 code.
- **Team/Agent dedicated Buyer Mode nuances** (per-kind billing, seats) — Phase 3/4.
- **Anonymous-funnel redesign** (e.g., force account before pay) — explicitly NOT touched; preserves current conversion.
- **Commit-message drift correction for `11e9a31`** — Tier 4 reconciliation.

---

## H. Verbatim artifacts (operator reviews word-for-word)

### H.1 `src/app/api/checkout/route.ts` — full replacement (Item 2)

```ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICES = {
  full_access: 'price_1TJhIzE3cjWtx7BrDkZxLavC',
}

export async function POST(req: Request) {
  const { product, email: bodyEmail } = await req.json()

  const priceId = PRICES[product as keyof typeof PRICES]
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
  }

  // Session-keying: if the user is authenticated, override the body email with
  // the auth-session email. Prevents the email-mismatch footgun where a logged-in
  // user creates a subscription on a different email than getEntityModes reads.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const customerEmail: string | undefined = user?.email || bodyEmail || undefined

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { product, ...(user ? { authed_user_id: user.id } : {}) },
    subscription_data: { metadata: { product, ...(user ? { authed_user_id: user.id } : {}) } },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'}/hirers#pricing`,
  })

  return NextResponse.json({ url: session.url })
}
```

### H.2 `<EnableHiringButton>` copy (proposed — needs sign-off)

- **State 2 (anon):** input placeholder `your@company.com`; button `Get full access — $199/mo`; note `No commission. No placement fee. Cancel anytime.` *(verbatim current /hirers copy — preserves funnel).*
- **State 3 (authed, no hiring):** button `Enable hiring — $199/mo`; sub-line `Billed to {email}.` ; helper `Unlimited job posts, direct messaging, full talent directory.`
- **State 4 (authed, hiring active):** `✓ Buyer Mode active — Manage at hirer dashboard` (the whole line links to `/hirer`). *(D5-locked.)*
- **Loading:** disabled button, label `Loading…`.

(Locked 2026-05-26. State-4 copy was tweaked from the draft per D5 to make the link's purpose explicit.)

### H.3 `src/lib/user.ts` — getEntityModes warn (Item 2b)

Insert after both the `subscription` and `profile` queries resolve (so `profile` is in scope), no control-flow change:
```ts
if (!subscription && user && profile?.user_id) {
  console.warn(`[getEntityModes] user ${user.id} (email=${user.email}) has profile but no active subscription — verify email match if expected as paying customer`)
}
```

---

## I. Verification after ship (phase-boundary gate)

1. `npx tsc --noEmit` + `npm run build` — both exit 0.
2. `verify-agent-card.ts --base https://shipstacked.com` — green (regression check; no AgentCard change).
3. Cold walkthroughs on prod:
   - **Logged out** → `/hirers` hero + `#pricing`: email input present, type email, Stripe checkout `customer_email` = typed email. (Funnel unchanged.)
   - **Logged in, no subscription** → `/hirers`: no email input; "Enable hiring — $199/mo" + "Billed to <my-email>"; click → Stripe `customer_email` = session email **regardless of any body value**.
   - **Logged in, active subscription** → `/hirers`: "✓ Buyer Mode active" + dashboard link; no checkout button.
   - **Builder dashboard** (logged-in builder, no sub) → enable-hiring card renders state 3; (builder+hirer) → state 4.
4. Confirm `/hirer` BuyerOnlyEmptyState routes a Card-4 buyer through the same component.

---

## J. Reversal paths

- All Phase 2 code is `git revert <commit>` — new component file removed, `/hirers` + dashboard + checkout return to pre-Phase-2 state. No DDL, no data migration, nothing to unwind in the DB.
- Item 2 (checkout) revert returns to body-email-only behavior (the current live footgun) — acceptable rollback; no data loss.

---

## K. Acceptance criteria summary

Phase 2 ships when:
1. ✅ `npx tsc --noEmit` clean.
2. ✅ `npm run build` clean.
3. ✅ `verify-agent-card.ts` green against prod.
4. ✅ `<EnableHiringButton>` renders the correct state for all three auth/mode combinations.
5. ✅ `/hirers` anonymous funnel behavior is byte-for-byte preserved (email → checkout).
6. ✅ Authenticated checkout cannot create a subscription on a non-session email (Item 2).
7. ✅ Builder dashboard shows a live-mode-correct enable-hiring entry.
8. ✅ No "Velocity Score"/stale-claim copy introduced; brand-free.

---

## L. Decisions locked (2026-05-26)

- **D1 — modes→client:** option (a) — the component self-resolves via `supabase.auth.getUser()` + a subscription existence check. Fully encapsulated; host pages stay drop-in. No `/api/me/modes` endpoint, no `/hirers` server refactor.
- **D2 — manage-subscription:** active state links to `/hirer` (existing cancel form). **No Stripe billing portal in Phase 2** (deferred to Phase 5).
- **D3 — analytics:** reuse `subscribe_clicked { source }`. New `source` values: `'hirers_authed'`, `'dashboard_enable_hiring'`, `'buyer_empty_state'`. Anonymous /hirers click keeps `'hirers'`.
- **D4 — fold-ins:** checkout session-keying (former Block 7) rides as **Item 2a**; getEntityModes warn (former Block 8) rides as **Item 2b**. Block 6 junk-SQL executed 2026-05-26 (see §G).
- **D5 — copy:** active-state copy locked to `✓ Buyer Mode active — Manage at hirer dashboard`. Other state strings per §H.2.

---

End of Phase 2 discovery doc.
