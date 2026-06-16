# Phase 2 — Execution diff plan

**For terminal Claude.** Execute blocks in order. Validate after each via `npx tsc --noEmit`. Stop on any FROM-string mismatch or tsc failure.

**Scope:** Build `<EnableHiringButton>` once; integrate three places; roll in the two Phase 1 items (checkout session-keying, getEntityModes warn) that didn't ship with 11e9a31.

**Files touched (8 total):**
- NEW: `src/components/EnableHiringButton.tsx`
- Modified: `src/app/hirers/page.tsx`, `src/app/dashboard/BuilderDashboardClient.tsx`, `src/app/dashboard/page.tsx`, `src/app/api/checkout/route.ts`, `src/lib/user.ts`
- Possibly modified: `src/app/hirer/BuyerOnlyEmptyState.tsx` (TBD per Block 4 pre-flight read)
- Possibly modified: `src/lib/supabase.ts` (only if we need a new client helper — likely not)

---

## Block 1 — Build the `<EnableHiringButton>` component

### 1.1 — Pre-edit read

View `src/app/hirers/page.tsx` once more to confirm the existing `goToCheckout` handler's exact structure (lines 41-54). The new component reuses its essential mechanic but with session-aware variations.

Run:
```
ls -la src/components/ 2>/dev/null || ls -la src/app/components/ 2>/dev/null
```

Confirm where component files currently live. The codebase read mentioned `src/app/components/NavBar.tsx`. New component should live alongside existing components — likely `src/app/components/EnableHiringButton.tsx`. Use that path unless the listing shows a different convention.

### 1.2 — Create the component

Create `src/app/components/EnableHiringButton.tsx` (or whichever path matches the existing convention from 1.1):

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import posthog from 'posthog-js'

type Source = 'hirers_authed' | 'hirers' | 'dashboard_enable_hiring' | 'buyer_empty_state' | 'homepage' | 'talent_teaser'

type Props = {
  /**
   * Where the button is rendered. Drives the posthog event source and influences copy slightly.
   * Anonymous-state callers (e.g. /hirers logged-out) typically render their own email-input
   * flow and don't use this component; if they do, pass source explicitly.
   */
  source: Source
  /**
   * Visual variant. 'primary' = filled solid button (homepage hero, hirers pricing card).
   * 'card' = full-width card-style block (dashboard slot, buyer empty state).
   * Defaults to 'primary'.
   */
  variant?: 'primary' | 'card'
}

type State =
  | { kind: 'loading' }
  | { kind: 'anonymous' }
  | { kind: 'authed_no_hiring'; email: string }
  | { kind: 'authed_hiring'; email: string }

/**
 * Phase 2: composable Buyer Mode toggle. Renders one of four UI states based on session +
 * subscription. Self-resolves via supabase.auth.getUser() + a subscriptions check
 * (decision D1 in docs/audit/DISCOVERY_phase2_buyer_mode.md).
 *
 * - Loading: brief spinner during initial auth resolve.
 * - Anonymous: returns null. Host page renders its existing email-input flow.
 * - Authed, no hiring: "Enable hiring — $199/mo" + "Billed to <email>" → session-keyed checkout.
 * - Authed, hiring active: "✓ Buyer Mode active — Manage at hirer dashboard" → links to /hirer.
 */
export default function EnableHiringButton({ source, variant = 'primary' }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user || !user.email) {
          setState({ kind: 'anonymous' })
          return
        }
        // Check subscription server-side via lightweight query.
        // Mirrors getEntityModes' hirer-mode logic (status='active', product='full_access',
        // not expired by expires_at OR current_period_end).
        const now = new Date().toISOString()
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('email', user.email)
          .eq('status', 'active')
          .eq('product', 'full_access')
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .or(`current_period_end.is.null,current_period_end.gt.${now}`)
          .maybeSingle()
        if (cancelled) return
        if (sub) {
          setState({ kind: 'authed_hiring', email: user.email })
        } else {
          setState({ kind: 'authed_no_hiring', email: user.email })
        }
      } catch {
        if (!cancelled) setState({ kind: 'anonymous' })
      }
    })()

    return () => { cancelled = true }
  }, [])

  const handleEnable = async () => {
    if (state.kind !== 'authed_no_hiring' || submitting) return
    setSubmitting(true)
    try {
      posthog.capture('subscribe_clicked', { source })
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Empty body — /api/checkout reads the session email server-side (Phase 2 Item 2a).
        body: JSON.stringify({ product: 'full_access' }),
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        setSubmitting(false)
      }
    } catch {
      setSubmitting(false)
    }
  }

  if (state.kind === 'loading') {
    // Render a placeholder of the same approximate height to avoid layout shift.
    return <div style={{ height: variant === 'card' ? 80 : 44 }} aria-hidden="true" />
  }

  if (state.kind === 'anonymous') {
    // Host page renders its own email-input checkout. This component is a no-op for anon.
    return null
  }

  if (state.kind === 'authed_hiring') {
    // Active state. Link to /hirer (the hirer dashboard) for management.
    if (variant === 'card') {
      return (
        <div style={{
          background: '#f0faf0', border: '1px solid #b3e0b3', borderRadius: 14,
          padding: '1.25rem 1.5rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#1a7f37', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Buyer Mode</p>
            <p style={{ fontSize: 14, color: '#1d1d1f' }}>✓ Active — Billed to {state.email}</p>
          </div>
          <a href="/hirer" style={{ fontSize: 13, padding: '0.5rem 1.25rem', background: 'white', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Manage at hirer dashboard →</a>
        </div>
      )
    }
    return (
      <a href="/hirer" style={{
        display: 'inline-block', fontSize: 14, padding: '0.75rem 1.5rem',
        background: '#1a7f37', color: 'white', borderRadius: 980,
        textDecoration: 'none', fontWeight: 600,
      }}>✓ Buyer Mode active — Manage at hirer dashboard</a>
    )
  }

  // authed_no_hiring
  if (variant === 'card') {
    return (
      <div style={{
        background: 'white', border: '1px solid #e0e0e5', borderRadius: 14,
        padding: '1.5rem', marginBottom: '1rem',
      }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Buyer Mode</p>
        <p style={{ fontSize: 14, color: '#1d1d1f', marginBottom: '0.5rem', lineHeight: 1.5 }}>Hire AI builders, teams, and agents from this network. Browse the full talent directory, message builders, post jobs.</p>
        <p style={{ fontSize: 12, color: '#6e6e73', marginBottom: '1rem' }}>Billed to {state.email}</p>
        <button onClick={handleEnable} disabled={submitting} style={{
          fontSize: 14, padding: '0.75rem 1.5rem',
          background: submitting ? '#aeaeb2' : '#0071e3',
          color: 'white', border: 'none', borderRadius: 980,
          cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit',
        }}>{submitting ? 'Loading…' : 'Enable hiring — $199/mo'}</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
      <button onClick={handleEnable} disabled={submitting} style={{
        fontSize: 14, padding: '0.75rem 1.5rem',
        background: submitting ? '#aeaeb2' : '#0071e3',
        color: 'white', border: 'none', borderRadius: 980,
        cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit',
      }}>{submitting ? 'Loading…' : 'Enable hiring — $199/mo'}</button>
      <p style={{ fontSize: 11, color: '#6e6e73' }}>Billed to {state.email}</p>
    </div>
  )
}
```

### 1.3 — Validate

```
npx tsc --noEmit
```

Expected: clean. Component is self-contained, no imports broken yet (nothing imports it).

---

## Block 2 — Roll in Phase 1 Items 7 + 8

These were drafted for Phase 1 but didn't ship in 11e9a31. They're prerequisites for Phase 2's button (the checkout fix means the empty-body POST works correctly).

### 2.1 — Checkout session-keying (`/api/checkout/route.ts`)

View `src/app/api/checkout/route.ts` (30 lines).

Replace the whole file with:

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

  // Session-keying: if the user is authenticated, override the body email with the
  // auth-session email. Prevents the email-mismatch footgun where a logged-in user
  // creates a subscription on a different email than the one getEntityModes reads.
  // Phase 2 rollover from Phase 1 Item 7 (was drafted but not shipped in 11e9a31).
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

### 2.2 — `getEntityModes` warning log (`src/lib/user.ts`)

View `src/lib/user.ts`. After the `subscription` resolution, before the `modes` object is built, add a console.warn for the email/auth drift early-warning case.

Find this section (approx lines 35-50 of the file):

```ts
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    const hasSubscription = !!subscription
    const hasProfile = !!profile
    const metaRole = user.user_metadata?.role
```

Insert a warn between `hasProfile` and `metaRole`:

```ts
    const hasSubscription = !!subscription
    const hasProfile = !!profile

    // Phase 2 (rollover from Phase 1 Item 8): surface email/auth drift early.
    // If a user has a profile but no active sub, AND the profile has a user_id,
    // log so we can spot mismatch before paying-customer issues hit support.
    if (!hasSubscription && hasProfile && profile?.user_id) {
      console.warn(`[getEntityModes] user ${user.id} (email=${user.email}) has profile but no active subscription — verify email match if expected as paying customer`)
    }

    const metaRole = user.user_metadata?.role
```

### 2.3 — Validate Block 2

```
npx tsc --noEmit
```

Expected: clean.

---

## Block 3 — Integrate into `/hirers/page.tsx`

The hirers page has TWO checkout entry points (hero at ~lines 162-175, pricing card at ~lines 348-360). The pattern: anonymous users keep the existing email-input form; authenticated users see `<EnableHiringButton>` instead.

### 3.1 — Pre-edit read

View `src/app/hirers/page.tsx` once more to confirm the exact JSX structure of both checkout blocks. Note any styling specifics (button colors, container widths) we want to match.

### 3.2 — Add the import

Near the existing imports at the top of `src/app/hirers/page.tsx`, add:

```ts
import EnableHiringButton from '@/app/components/EnableHiringButton'
```

(Adjust path to match where Block 1.2 created the file.)

### 3.3 — Add session-aware state

`/hirers/page.tsx` is already a client component. Near the existing state declarations (the `email` state for the input), add:

```ts
const [isAuthed, setIsAuthed] = useState<boolean | null>(null)

useEffect(() => {
  const supabase = createClient()
  supabase.auth.getUser().then(({ data: { user } }) => {
    setIsAuthed(!!user)
  }).catch(() => setIsAuthed(false))
}, [])
```

(Assumes `createClient` is already imported. If not, view the file and add the import.)

### 3.4 — Wrap the hero checkout block

Find the hero block (around lines 162-175). It contains an email input + "Get full access — $199/mo" button wired to `goToCheckout`.

Wrap the entire block in a conditional. Pseudo-structure (adapt to actual JSX):

```tsx
{isAuthed === null ? (
  <div style={{ height: 96 }} aria-hidden="true" />  /* placeholder during auth resolve */
) : isAuthed ? (
  <EnableHiringButton source="hirers_authed" variant="primary" />
) : (
  /* existing email input + button block, unchanged */
)}
```

Preserve the existing block's children verbatim inside the `else` branch.

### 3.5 — Wrap the pricing-card checkout block

Find the pricing card block (around lines 348-360). Same pattern — wrap the email input + button in the same conditional. Use `source="hirers_authed"` (not a different value — both come from the hirers page).

### 3.6 — Validate Block 3

```
npx tsc --noEmit
```

Expected: clean.

Run locally:
```
npm run dev
```

Visit `/hirers` in incognito → email input visible at hero + pricing card.
Log in as a builder (or any auth account) → email input replaced by `<EnableHiringButton>` showing "Enable hiring — $199/mo" with "Billed to <email>" subtext.

---

## Block 4 — Integrate into builder dashboard

### 4.1 — Pre-edit read

View `src/app/dashboard/BuilderDashboardClient.tsx` lines 160-220 (the Proof of Work card area + GitHub/Verified grid).

### 4.2 — Add the import

In `src/app/dashboard/BuilderDashboardClient.tsx`, add to the existing imports:

```ts
import EnableHiringButton from '@/app/components/EnableHiringButton'
```

### 4.3 — Place the button after the Proof of Work card

Find the closing `</div>` of the "Proof of Work" card render block (approx lines 174-180). Immediately after that block, insert:

```tsx
            {/* Buyer Mode toggle — composable, per Phase 2 spec */}
            <EnableHiringButton source="dashboard_enable_hiring" variant="card" />
```

Match the indentation of the surrounding JSX. The component handles its own loading/anon/authed states; the dashboard always renders it (the user IS authed here, so the placeholder→authed_no_hiring flow is fast).

### 4.4 — Validate Block 4

```
npx tsc --noEmit
```

Expected: clean.

Run locally (`npm run dev` already running from Block 3):

Visit `/dashboard` as a builder with no subscription → see "Buyer Mode" card below Proof of Work with "Enable hiring — $199/mo" button.
Visit `/dashboard` as a builder WITH subscription → see "Buyer Mode: ✓ Active — Billed to <email>" + "Manage at hirer dashboard" link.

---

## Block 5 — Integrate into `BuyerOnlyEmptyState`

### 5.1 — Pre-edit read

```
find src/app/hirer/ -type f -name "*.tsx" | xargs grep -l "BuyerOnlyEmptyState\|buyer.*only\|buyer-only" 2>/dev/null
```

Then view whichever file defines `BuyerOnlyEmptyState`. The codebase read mentioned it lives in the `/hirer` route surface. Likely at `src/app/hirer/BuyerOnlyEmptyState.tsx` or imported into `src/app/hirer/page.tsx` from that location.

### 5.2 — Add import + placement

Add the EnableHiringButton import to the file that renders `BuyerOnlyEmptyState`.

Inside the BuyerOnlyEmptyState component's render output, find the natural place for the CTA (probably where it currently directs the user toward subscribing). Add:

```tsx
<EnableHiringButton source="buyer_empty_state" variant="card" />
```

If the existing empty-state already has a CTA button that redirects to `/hirers#pricing`, replace it with `<EnableHiringButton ... />`. If it has explanatory copy + multiple actions, place the button inline as a primary CTA.

**Use judgment on placement.** The exact JSX of BuyerOnlyEmptyState wasn't pre-read in the discovery. View first, then place the button where it fits naturally. If the empty state has no clear CTA slot today, add the button at the bottom of the main content area.

### 5.3 — Validate Block 5

```
npx tsc --noEmit
```

Expected: clean.

Run locally: visit `/hirer` as a buyer-only user (one with `user_metadata.role === 'client'` and no subscription). The empty state should now render `<EnableHiringButton>` in the card variant.

---

## Block 6 — Final validation

### 6.1 — Type + build clean

```
npx tsc --noEmit
npm run build
```

Both exit 0.

### 6.2 — verify-agent-card.ts against local

```
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
```

Exit 0. Phase 2 doesn't add any new public surfaces or AgentCard skills — the verify should be byte-identical to Phase 1.

### 6.3 — grep guard against regressions

```
grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"
```

Expected: zero matches (Phase 1's bar holds).

```
grep -rn "goToCheckout" src/app/hirers/page.tsx
```

Expected: at least 1-2 matches (the function is still defined and used in the anonymous-state branch). If it's gone, the anonymous-state path was accidentally removed.

### 6.4 — Manual cold walkthrough (local)

1. **Incognito at `/hirers`** → see email input + "Get full access" button at hero AND pricing card. NO `<EnableHiringButton>` visible.
2. **Logged in (no sub) at `/hirers`** → see `<EnableHiringButton>` in primary variant at hero + pricing card. Email input gone. Click button → redirects to Stripe checkout. Confirm Stripe's `customer_email` matches the logged-in user's email (NOT whatever was typed anywhere).
3. **Logged in (no sub) at `/dashboard`** → see "Buyer Mode" card below Proof of Work card with "Enable hiring" button.
4. **Logged in WITH sub at `/dashboard`** → see "Buyer Mode: ✓ Active" card with "Manage at hirer dashboard" link.
5. **Buyer-only user at `/hirer`** → empty state shows `<EnableHiringButton>` card variant.

### 6.5 — Report state before commit

- `npx tsc --noEmit` exit code
- `npm run build` exit code (last 10 lines)
- `grep -rni "velocity" src/` (full output)
- `git status --short`
- `git diff --stat`
- Manual cold walkthrough results (5 surfaces, pass/fail each)

Stop. Wait for operator approval before commit + push.

---

## Block 7 — Commit and ship (after operator approves Block 6 report)

```
git add -A src/
git commit -m "Phase 2: composable Buyer Mode toggle (<EnableHiringButton>)

- New <EnableHiringButton> component (src/app/components/EnableHiringButton.tsx)
  - Three states: anonymous (no-op, host renders email input), authed-no-hiring,
    authed-hiring-active. Self-resolves session + subscription client-side.
  - Two variants: primary (inline button), card (full block).
- Integrated on /hirers (hero + pricing card; anonymous fallback preserved),
  /dashboard (after Proof of Work card), and BuyerOnlyEmptyState.
- /api/checkout session-keying: authed users get their session email regardless
  of body input. Closes the email-mismatch footgun (was Phase 1 Item 7, deferred
  from 11e9a31 — see docs/audit/DISCOVERY_phase1_foundation.md §M).
- getEntityModes: console.warn when profile exists but no active subscription
  for users with user_id populated (was Phase 1 Item 8, deferred from 11e9a31).
- PostHog subscribe_clicked event extended with new source values:
  'hirers_authed', 'dashboard_enable_hiring', 'buyer_empty_state'.

Discovery + diff plan: docs/audit/DISCOVERY_phase2_buyer_mode.md and
docs/audit/PHASE2_DIFF_PLAN.md (untracked working-tree only; Phase 5 commits)."

git push origin main
```

After push, wait for Vercel deploy. Then report:
- Commit SHA
- Push success
- Vercel deploy status (poll or `vercel ls`)
- `verify-agent-card.ts --base https://shipstacked.com` exit code + summary

Stop. Phase 2 ships. Operator can run cold walkthrough against prod.

---

## Notes for terminal Claude

- **Path for new component:** Block 1.1 confirms whether it's `src/components/` or `src/app/components/`. The latter is what NavBar uses per codebase read. Match that.
- **Verbatim FROM/TO discipline:** same as Phase 1. If any FROM doesn't match, view the file, paste actual content, stop.
- **BuyerOnlyEmptyState (Block 5):** the discovery wasn't able to pre-read this file because its exact path wasn't enumerated. View first, then place the button using judgment. If the placement isn't obvious, paste the file content back to architect-Claude and stop for direction.
- **No new DDL.** Phase 2 is code-only.
- **No commit until Block 6 report is operator-approved.** Working tree only until then.

End of Phase 2 diff plan.
