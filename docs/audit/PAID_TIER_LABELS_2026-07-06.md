# Paid-Tier Label Inventory — the complete D2 relabel target list (2026-07-06)

READ-ONLY inventory. Every user-facing string that names or refers to the $199 paid
subscription (the `full_access` / member tier), so the D2 relabel to **"Full Access"**
(membership language) can be complete and consistent.

## THE HEADLINE FINDING — the tier is currently called FOUR different things

The paid tier has **no single name** in the live product. The same $199 subscription is
surfaced to users under four competing labels, plus bare price strings:

| Current user-facing label | What it means | Relabel status for D2 |
|---|---|---|
| **"Hiring Access"** | The paid tier (pricing/marketing framing) | ⛔ RELABEL → Full Access |
| **"Buyer Mode"** | The paid tier (toggle/activation framing) | ⛔ RELABEL → Full Access |
| **"Full Access" / "full access"** | The paid tier (already the target name) | ✅ ALREADY CORRECT (keep) |
| **bare "$199/mo" / "$199/month"** | Price, no tier noun | ➖ price string (keep price, ensure adjacent noun = Full Access) |

**So the D2 job is: converge "Hiring Access" (21 hits) and "Buyer Mode" (18 hits) onto
the already-partially-adopted "Full Access" (22 hits).** The inconsistency is live today —
e.g. the `/hirer` dashboard already says "Full Access · active" (HirerDashboardClient:222)
while the `/hirers` pricing page and homepage still say "Hiring Access", and the activation
button says "Buyer Mode".

Global counts (`src/**/*.ts{,x}`): `Hiring Access` = 21 · `Buyer Mode` = 18 ·
`full access` (case-insensitive) = 22 · `$199`-family = 28. 24 files touch the tier.

**Scope boundary (read before relabeling):** internal identifiers are NOT user-facing and
MUST NOT be relabeled — see the "DO NOT TOUCH" section at the end. The Stripe DB product
value `full_access`, the `source` enums, the `Mode`/`EntityModes` types, and the
subscription-query `product='full_access'` filters are load-bearing and internal.

---

## 1. Signup cards — `src/app/join/page.tsx` (Card 4 = Buyer-only)

Currently calls the tier **"Buyer Mode"**.

- **`join/page.tsx:439`** — Card 1 (Builder) subtitle:
  > `<p style={{ fontSize: 12, color: '#6e6e73' }}>Free supply profile. Optional Buyer Mode later.</p>`
- **`join/page.tsx:481`** — Card 4 (Buyer-only) subtitle:
  > `<p style={{ fontSize: 12, color: '#6e6e73' }}>Lightweight buyer-only entity. Buyer Mode active by default.</p>`
- **`join/page.tsx:731`** — Buyer form body copy (activation + price):
  > `Free signup. You'll see the talent directory next. When you're ready to message a builder directly or post a job, that's where Buyer Mode activates ($199/mo, cancel anytime).`
- **`join/page.tsx:745`** — Buyer form bullet:
  > `<li>Pay only when you message or post a job</li>`
- **`join/page.tsx:757`** — Buyer step-2 CTA:
  > `<a href="/talent" ...>Browse talent →</a>`

Note: Card 4's visible **title** is rendered from a heading above line 481 (the card `<button>` block, `join/page.tsx:473-481`); the subtitle at :481 is the tier-naming line. The word "Buyer" also appears in non-user-facing state machine values (`'buyer'`, `'buyer-form'`, `'buyer-2'`, `handleBuyerSubmit`) — those are internal, not labels.

---

## 2. Activation button — `src/app/components/EnableHiringButton.tsx`

Currently calls the tier **"Buyer Mode"** (active-state label) and **"Enable hiring"** (CTA). The
component's own doc comment (`:31-38`) frames it as the "Buyer Mode toggle."

- **`EnableHiringButton.tsx:125`** — active-state, card variant, eyebrow label:
  > `<p style={{ ... }}>Buyer Mode</p>`
- **`EnableHiringButton.tsx:128`** — active-state, card variant, manage link:
  > `<a href="/hirer" ...>Manage at hirer dashboard →</a>`
- **`EnableHiringButton.tsx:137`** — active-state, inline variant:
  > `}}>✓ Buyer Mode active — Manage at hirer dashboard</a>`
- **`EnableHiringButton.tsx:148`** — inactive-state, card variant, eyebrow label:
  > `<p style={{ ... }}>Buyer Mode</p>`
- **`EnableHiringButton.tsx:156`** — inactive CTA (card variant):
  > `}}>{submitting ? 'Loading…' : 'Enable hiring — $199/mo'}</button>`
- **`EnableHiringButton.tsx:168`** — inactive CTA (primary/inline variant):
  > `}}>{submitting ? 'Loading…' : 'Enable hiring — $199/mo'}</button>`

Doc-comment copy (not rendered, but describes the intended labels — update for consistency):
- **`:37`** > `- Authed, no hiring: "Enable hiring — $199/mo" + "Billed to <email>" → session-keyed checkout.`
- **`:38`** > `- Authed, hiring active: "✓ Buyer Mode active — Manage at hirer dashboard" → links to /hirer.`

---

## 3. Pricing pages — `src/app/pricing/page.tsx` AND `src/app/hirers/page.tsx` AND homepage

There are **two** pricing surfaces plus the homepage pricing block. They disagree.

### 3a. `src/app/pricing/page.tsx` — calls it **"Hiring Access"** throughout

- **`pricing/page.tsx:6`** — page meta description:
  > `description: 'Free for builders, teams, and agents. $199/month for Hiring Access. No commission, cancel anytime.',`
- **`pricing/page.tsx:48`** — free-tier "not included" bullet:
  > `<li style={liNot}>— Outbound search (no Hiring Access without subscription)</li>`
- **`pricing/page.tsx:56`** — section comment: `{/* Hiring Access */}`
- **`pricing/page.tsx:59`** — paid card **heading**:
  > `<h2 style={{ ... }}>Hiring Access</h2>`
- **`pricing/page.tsx:60`** — paid card price:
  > `<p style={{ ... }}>$199<span style={{ ... }}>/month</span></p>`
- **`pricing/page.tsx:64`** — paid feature list (array of 5):
  > `{['Unlimited search across builders, teams, and registered agents', 'Direct contact with any practitioner on the network', 'Atlas-keyed filtering at full depth', 'buyer:rw API key for buyer-agents', 'Cross-pillar discovery (one search, all three customer types)'].map(...)`
- **`pricing/page.tsx:74`** — paid CTA:
  > `<Link href="/join" ...>Get Hiring Access →</Link>`
- **`pricing/page.tsx:84`** — how-it-works step:
  > `<li>From your dashboard, toggle Hiring Access on.</li>`
- **`pricing/page.tsx:95`** — FAQ body:
  > `... Buyers pay because Hiring Access is the surface that converts attention into money.`
- **`pricing/page.tsx:96`** — FAQ question:
  > `<h3 style={Q}>Why is it $199 a month?</h3>`
- **`pricing/page.tsx:97`** — FAQ body:
  > `Because that's roughly what it costs to keep the lights on per active buyer ... it's the price.`
- **`pricing/page.tsx:103`** — agencies FAQ body:
  > `... they add Hiring Access to the same account. $199 a month, same as anyone else.`

### 3b. `src/app/hirers/page.tsx` — MIXED: "Get full access" CTA but bare "$199" card

- **`hirers/page.tsx:186`** — anonymous CTA button:
  > `{loading ? 'Redirecting...' : 'Get full access — $199/mo'}`
- **`hirers/page.tsx:346-347`** — pricing card price (no tier noun):
  > `<span style={{ ... }}>$199</span>` / `<span style={{ ... }}>/month</span>`
- **`hirers/page.tsx:351`** — feature list item:
  > `'Full access to the verified talent directory',`
- **`hirers/page.tsx:378`** — authed CTA button:
  > `{loading ? 'Redirecting...' : 'Get full access — $199/mo'}`
- **`hirers/page.tsx:392`** — secondary link:
  > `<a href="/talent" ...>Browse talent</a>`
- (`:174`, `:366` render `<EnableHiringButton variant="primary" />` — inherits the "Enable hiring — $199/mo" / "Buyer Mode" strings from §2.)

### 3c. Homepage pricing block — `src/app/page.tsx` — calls it **"Hiring Access"**

- **`page.tsx:125`** > `<h3>Hiring Access</h3>`
- **`page.tsx:127`** > `<span className="price" ...>$199/month · add to any account · cancel anytime</span>`
- **`page.tsx:175`** > `<h3>Add Hiring Access</h3>`
- **`page.tsx:177`** > `<Link href="/join">Get Hiring Access →</Link> <span className="note">$199/month</span>`

### 3d. Help / marketing pages — `how-it-works` + `faq` — call it **"Hiring Access"**

- **`how-it-works/page.tsx:68`** — body:
  > `You sign up free at /join Card 4 if you only want to hire. If you already have a Builder, Team, or Agent account, you toggle Hiring Access on from your dashboard — same effect, $199 a month, cancel anytime.`
- **`faq/page.tsx:50`** — QA answer ("Do I have to pay?"):
  > `No. Builders, teams, and agents are free forever. You only pay if you also want to hire — that adds Hiring Access for $199 a month.`
- **`faq/page.tsx:57`** — QA question + answer ("What does Hiring Access get me?"):
  > `<QA q="What does Hiring Access get me?">Unlimited search across the full network ... Direct contact with practitioners. Atlas-keyed filtering at full depth. A buyer:rw API key ...</QA>`
- **`faq/page.tsx:65`** — QA answer (scopes), inline mention:
  > `... buyer:rw lets a key run searches and contact practitioners (requires active Hiring Access). ...`

---

## 4. Dashboard sections

### 4a. `src/app/dashboard/HirerSection.tsx` — calls it **"Hiring Access"**

- **`HirerSection.tsx:8`** — eyebrow label:
  > `<p style={{ ... }}>Hiring Access</p>`
- **`HirerSection.tsx:9`** — status line:
  > `<p style={{ ... }}>You have an active Hiring Access subscription.</p>`
- **`HirerSection.tsx:11`** — manage link:
  > `<a href="/hirer" ...>Manage at hirer dashboard →</a>`

### 4b. `src/app/dashboard/BuyerSection.tsx` — calls it **"Buyer Mode"** (+ "Hiring Access" in comments)

- **`BuyerSection.tsx:12`** — file comment: `Talent shortcut + saved shortlists + Hiring Access + subscription status.`
- **`BuyerSection.tsx:32`** — talent shortcut CTA:
  > `<a href="/talent" ...>Browse talent →</a>`
- **`BuyerSection.tsx:43`** — section comment: `{/* Subscription status + Hiring Access toggle */}`
- **`BuyerSection.tsx:48`** — active-state eyebrow label:
  > `<p style={{ ... }}>Buyer Mode</p>`
- **`BuyerSection.tsx:51`** — manage link:
  > `<a href="/hirer" ...>Manage at hirer dashboard →</a>`
- **`BuyerSection.tsx:54`** — inactive: `<EnableHiringButton source="buyer_empty_state" variant="card" />` (inherits §2 strings).

### 4c. `src/app/dashboard/AgentSection.tsx` — calls it **"Hiring Access"**

- **`AgentSection.tsx:66`** — section comment: `{/* Hiring Access — per-user billing for Part 1 */}`
- **`AgentSection.tsx:69`** — billing note (user-facing):
  > `<p style={{ ... }}>Hiring Access is billed per-user, on your account email.</p>`

### 4d. `src/app/dashboard/BuilderDashboardClient.tsx` — **"Buyer Mode"** (comment only)

- **`BuilderDashboardClient.tsx:218`** — comment: `{/* Buyer Mode toggle — composable, per Phase 2 spec */}` (renders EnableHiringButton; no own tier string). Line 33 "upgrade to verified" is receipt-verification copy, NOT the paid tier — exclude.

---

## 5. NavBar — `src/app/components/NavBar.tsx`

No tier-NAME string is rendered in the nav (no "Hiring Access"/"Buyer Mode"/"Full Access"
label). The nav links for a paid hirer are generic:

- **`NavBar.tsx:57`** > `{ label: 'Browse talent', href: '/talent' }`
- **`NavBar.tsx:77`** > `links.push({ label: 'Browse talent', href: '/talent' })`
- **`NavBar.tsx:78`** > `links.push({ label: 'Post a job', href: '/post-job' })`
- **`NavBar.tsx:79`** > `links.push({ label: 'Hirer dashboard', href: '/hirer' })`
- **`NavBar.tsx:80`** > `links.push({ label: 'Edit company', href: '/hirer#company-form' })`
- **`NavBar.tsx:285`** > `<a href="/for-hirers" ...>` (client-mode drawer link)

**D2 relevance:** these are navigation verbs ("Browse talent", "Post a job", "Hirer
dashboard"), not tier names — they likely stay. The subscription **detection** query at
`NavBar.tsx:130` (`.eq('product', 'full_access')`) is internal (see DO NOT TOUCH). Flagging
"Hirer dashboard" as a *possible* rename candidate only if D2 rebrands the `/hirer` surface.

---

## 6. Hirer dashboard + empty state + messages "As hirer"

### 6a. `src/app/hirer/BuyerOnlyEmptyState.tsx` — calls it **"Buyer Mode"**

- **`BuyerOnlyEmptyState.tsx:20`** — eyebrow:
  > `<p style={{ ... }}>Hirer dashboard</p>`
- **`BuyerOnlyEmptyState.tsx:22`** — body (activation framing):
  > `<p style={{ ... }}>Signed in as {email}. Browse the talent directory free — Buyer Mode activates when you message a builder or post a job.</p>`
- **`BuyerOnlyEmptyState.tsx:28`** — primary CTA heading:
  > `<h2 style={{ ... }}>Browse talent</h2>`
- **`BuyerOnlyEmptyState.tsx:30`** > `<span ...>Browse talent →</span>`
- **`BuyerOnlyEmptyState.tsx:38`** — `<EnableHiringButton source="buyer_empty_state" variant="card" />` (inherits §2).
- Comments `:6`, `:8` also say "Buyer Mode."

### 6b. `src/app/hirer/HirerDashboardClient.tsx` — calls it **"Full Access"** (ALREADY the target ✅)

- **`HirerDashboardClient.tsx:222`** — status line:
  > `<p style={{ ... }}>Full Access · active<span ...>·</span>Renews {renewsString}</p>`
- **`HirerDashboardClient.tsx:233`** — onboarding body (team hirer):
  > `` `You have full access to the builder directory. Browse talent and message builders you like. You're hiring as ${teamLabel}, so builders see your team's identity — no separate company profile needed.` ``
- **`HirerDashboardClient.tsx:234`** — onboarding body (solo hirer):
  > `'You have full access to the builder directory. To get started: browse talent, message builders you like, and set up your company profile so builders know who is reaching out.'`
- **`HirerDashboardClient.tsx:298`** > `<h3 ...>Browse talent</h3>` · **`:308`** > `<h3 ...>Post a job</h3>`
- **`HirerDashboardClient.tsx:609-610`** — subscription block (tier + price):
  > `<p style={{ ... }}>Subscription</p>` / `<p style={{ ... }}>Full Access · $199/month</p>`
- **`HirerDashboardClient.tsx:623`** > `<p style={{ ... }}>Cancel subscription</p>`

### 6c. `src/app/hirer/page.tsx` — no tier NAME string (routing/gating only)

Renders `BuyerOnlyEmptyState` (no sub) or `HirerDashboardClient` (active). The
`.from('subscriptions')` gate (`:14`) and `redirect('/hirers#pricing')` (`:35`) are logic,
not labels.

### 6d. `src/app/messages/page.tsx` — "As hirer" tab + paywall says **"full access"**

- **`messages/page.tsx:273`** — tab label:
  > `{availableModes.hirer && <button ...>As hirer</button>}`
- **`messages/page.tsx:290`** — empty hirer inbox:
  > `<p style={{ ... }}>Browse talent and message builders.</p>`
- **`messages/page.tsx:291`** > `<a href="/talent" ...>Browse talent</a>`
- **`messages/page.tsx:296`** — empty builder inbox: `<p ...>Hirers will message you when interested.</p>`
- **`messages/page.tsx:342`** — paywall heading:
  > `<p style={{ ... }}>Subscribe to message builders</p>`
- **`messages/page.tsx:343`** — paywall body:
  > `<p style={{ ... }}>Get full access to the verified builder directory and message builders directly — $199/month.</p>`
- **`messages/page.tsx:344`** — paywall CTA:
  > `<a href="/hirers#pricing" ...>Get full access — $199/month</a>`

---

## 7. Paywall / teaser strings that name the tier

### 7a. `src/app/talent/TalentClient.tsx` — teaser + "Full access" badge

- **`TalentClient.tsx:585`** — active-hirer badge:
  > `<div style={{ ... }}>Full access</div>`
- **`TalentClient.tsx:742`** — teaser body:
  > `Get full access to every verified ShipStacked builder. Read their Build Feed, see their proof of work, and message them directly — $199/month flat.`
- **`TalentClient.tsx:746`** — teaser CTA:
  > `Get full access — $199/mo`
- (`isPaidHirer`, `hasHirerProfile`, `source: 'talent_teaser'` are internal props/enums — not labels.)

### 7b. `src/app/u/[username]/page.tsx` — profile paywall says **"Full Access" / "full access"**

- **`u/[username]/page.tsx:365`** — locked contact line:
  > `<p style={{ ... }}>🔒 Contact details visible to Full Access subscribers</p>`
- **`u/[username]/page.tsx:367`** > `Get full access`
- **`u/[username]/page.tsx:615`** > `Get full access`
- **`u/[username]/page.tsx:621`** — message paywall heading:
  > `<p style={{ ... }}>Subscribe to message {profile.full_name.split(' ')[0]}</p>`
- **`u/[username]/page.tsx:622`** — message paywall body:
  > `<p style={{ ... }}>Full access to the verified builder directory + direct messaging — $199/month.</p>`
- **`u/[username]/page.tsx:624`** > `Get full access`

### 7c. `src/app/feed/[id]/FeedPostCTA.tsx` — teaser says **"full access"** but CTA says **"hirer plans"**

- **`FeedPostCTA.tsx:126`** — heading:
  > `Get full access to the talent directory`
- **`FeedPostCTA.tsx:129`** — body:
  > `Search verified AI builders, message them directly, and post roles. $199/month.`
- **`FeedPostCTA.tsx:131`** — CTA (mismatched noun — "hirer plans"):
  > `<a href="/hirers" ...>See hirer plans</a>`

### 7d. `src/app/client/inbox/ClientInboxClient.tsx` — upgrade nudge says **"full access"**

- **`ClientInboxClient.tsx:208`** — comment: `{/* Upgrade nudge after 2+ conversations */}`
- **`ClientInboxClient.tsx:217`** — CTA:
  > `Get full access — $199/mo`

---

## 8. Checkout / success / webhook / welcome-email flows

### 8a. `src/app/success/SuccessClient.tsx` — **"Full Access"** ✅

- **`SuccessClient.tsx:104`** — confirmation:
  > `Your Full Access subscription is confirmed.`

### 8b. `src/app/api/webhooks/stripe/route.ts` — welcome email says **"Full Access"** ✅

- **`webhooks/stripe/route.ts:130`** — email subject:
  > `subject: 'Welcome to ShipStacked Full Access',`
- **`webhooks/stripe/route.ts:135`** — email body:
  > `Your Full Access subscription is active. You can now message builders, post jobs, and use the full hiring features.`
- (`:106` insert `product: 'full_access'` etc. are the internal DB value — DO NOT TOUCH.)

### 8c. `src/app/api/welcome/route.ts` — signup welcome email says **"Buyer Mode"** ⛔

- **`welcome/route.ts:77`** — email body:
  > `Hi ${name}, your account is ready. Browse the talent directory free — when you're ready to message a builder or post a job, that's where Buyer Mode activates ($199/mo, cancel anytime).`

### 8d. `src/app/api/checkout/route.ts` — NO in-code tier name (Stripe-Dashboard product)

- **`checkout/route.ts:8`** — price key `full_access` → env `STRIPE_PRICE_FULL_ACCESS`.
- **`checkout/route.ts:31`** — `line_items: [{ price: priceId, quantity: 1 }]` — uses the pre-created
  Stripe **price/product**, so the name shown on Stripe's **hosted checkout page** is defined
  in the **Stripe Dashboard**, NOT in this repo. ⚠️ **OUT-OF-REPO relabel surface** — D2 must
  verify the Stripe product's display name matches "Full Access" (cannot be changed by a code
  diff; operator changes it in the Stripe Dashboard).

### 8e. `src/app/admin/page.tsx` — internal admin (not customer-facing) — **"$199" as MRR math**

- **`admin/page.tsx:45-49`** — `199` as the price constant for MRR/LTV math (`activeSubscriptions.length * 199`, `199 / (churnRate/100)`). Internal admin dashboard.
- **`admin/page.tsx:123`** — `sub: totalHirers + ' hirer accounts'` (admin stat).
- **`admin/page.tsx:314`** — `{s.status === 'active' ? '$199' : '$0'}` (admin table).
- Admin-only; relabel not required for customer-facing D2, but note the `199` price constant
  is hard-coded here (and in `pricing`/`hirers`/CTAs) — if the price ever changes, these are
  the scattered literals.

---

## MASTER SUMMARY TABLE — current label → where it appears → count

### ⛔ "Hiring Access" (21 occurrences) — RELABEL → Full Access
| File | Lines | Kind |
|---|---|---|
| `pricing/page.tsx` | 6, 48, 56*, 59, 74, 84, 95, 103 | meta, bullet, heading, CTA, steps, FAQ body |
| `page.tsx` (homepage) | 125, 175, 177 | pricing card heading + CTA |
| `how-it-works/page.tsx` | 68 | body copy |
| `faq/page.tsx` | 50, 57, 65 | QA question + answers |
| `dashboard/HirerSection.tsx` | 8, 9 | eyebrow + status line |
| `dashboard/AgentSection.tsx` | 66*, 69 | billing note |
| `dashboard/BuyerSection.tsx` | 12*, 43* | comments |
_(*=comment/section marker; still update for consistency.)_

### ⛔ "Buyer Mode" (18 occurrences) — RELABEL → Full Access
| File | Lines | Kind |
|---|---|---|
| `components/EnableHiringButton.tsx` | 31*, 37*, 38*, 125, 137, 148 | doc-comment + active/inactive eyebrow + inline label |
| `dashboard/BuyerSection.tsx` | 48 | active-state eyebrow |
| `hirer/BuyerOnlyEmptyState.tsx` | 6*, 8*, 22 | comment + activation body |
| `join/page.tsx` | 439, 481, 731 | card subtitles + form body |
| `api/welcome/route.ts` | 77 | signup welcome email |
| `dashboard/BuilderDashboardClient.tsx` | 218* | comment |
| `team/[slug]/edit/TeamEditClient.tsx` | 359* | comment |
| `client/inbox/page.tsx` | 14* | comment |

### ⛔ "Enable hiring" (CTA verb, tied to the tier) — RELABEL for consistency
| File | Lines | Kind |
|---|---|---|
| `components/EnableHiringButton.tsx` | 156, 168 | inactive CTA button `Enable hiring — $199/mo` |

### ✅ "Full Access" / "full access" (22 occurrences) — ALREADY CORRECT (keep, verify casing)
| File | Lines | Kind |
|---|---|---|
| `hirer/HirerDashboardClient.tsx` | 222, 233, 234, 610 | status + onboarding + subscription block |
| `success/SuccessClient.tsx` | 104 | confirmation |
| `api/webhooks/stripe/route.ts` | 130, 135 | welcome email subject + body |
| `talent/TalentClient.tsx` | 585, 742, 746 | badge + teaser + CTA |
| `u/[username]/page.tsx` | 365, 367, 615, 622, 624 | paywall lines + CTAs |
| `messages/page.tsx` | 343, 344 | paywall body + CTA |
| `hirers/page.tsx` | 186, 351, 378 | CTAs + feature item |
| `feed/[id]/FeedPostCTA.tsx` | 126, 129 | teaser heading + body |
| `client/inbox/ClientInboxClient.tsx` | 217 | upgrade CTA |

### ➖ Mismatched / adjacent nouns to reconcile in D2
| String | File:line | Issue |
|---|---|---|
| `See hirer plans` | `feed/[id]/FeedPostCTA.tsx:131` | CTA noun ≠ "Full Access" (body already says "full access") |
| bare `$199` price card, no tier noun | `hirers/page.tsx:346-347` | ensure the card heading/label reads "Full Access" |
| `As hirer` tab | `messages/page.tsx:273` | role tab, not tier — likely keep |
| `Hirer dashboard` | `NavBar.tsx:79`, `BuyerOnlyEmptyState.tsx:20` | surface name, not tier — keep unless `/hirer` rebrands |

### ⚠️ OUT-OF-REPO — Stripe Dashboard
| Surface | Where | Action |
|---|---|---|
| Stripe product/price **display name** on hosted checkout | `api/checkout/route.ts:8,31` → `STRIPE_PRICE_FULL_ACCESS` (Stripe Dashboard) | Operator verifies product name = "Full Access"; not a code diff |

---

## DO NOT TOUCH — internal identifiers (NOT user-facing; relabeling breaks the gate)

These contain "buyer"/"hirer"/"full_access" but are code, DB values, or enums. Changing them
is a behavior change, not a relabel:

- **DB product value `product = 'full_access'`** — the subscription-tier row value. Queried in
  `NavBar.tsx:130`, `EnableHiringButton.tsx:57`, `messages/page.tsx:68`, `hirer/page.tsx`, and
  written in `api/webhooks/stripe/route.ts:106`. This IS the canonical internal tier key
  (already "full_access" — happily aligns with the target name, but it is a DB/Stripe value,
  not a label).
- **`EntityModes` fields `hirer` / `member` / `client`** (`NavBar.tsx:20,140-141`, etc.) — mode flags.
- **`Mode` / `activeMode` type `'builder' | 'hirer' | 'team'`** (`messages/page.tsx:24`) — routing.
- **`EnableHiringButton` `Source` enum** (`hirers_authed`, `buyer_empty_state`, `talent_teaser`,
  `dashboard_enable_hiring`, …) — PostHog analytics source keys.
- **Component/file names** (`EnableHiringButton`, `BuyerSection`, `HirerSection`, `BuyerOnlyEmptyState`),
  route paths (`/hirer`, `/hirers`, `/for-hirers`, `/api/hirer/*`, `/api/join/buyer`), URL
  params (`?as=hirer`), CSS var `--hiring` — all internal wiring.
- **`join/page.tsx` state values** `'buyer' | 'buyer-form' | 'buyer-2'`, `handleBuyerSubmit`.
- **`isPaidHirer` / `hasHirerProfile` props** (`talent/TalentClient.tsx`) — internal booleans.
- **`admin/page.tsx`** — internal admin dashboard (not customer-facing); the `199` literals are
  MRR math, not tier labels.

---

## Method (reproducibility)
Live grep over `src/**/*.{ts,tsx}` for `hiring access|buyer mode|full access|$199|enable hiring`
(case-insensitive) + per-file reads of the 24 matching files. Counts verified via
`grep -rn ... | wc -l`. Read-only — no source mutated. Checkout product name confirmed as
Stripe-Dashboard-defined (out of repo). Complete file set (24): admin, api/webhooks/stripe,
api/welcome, api/checkout, client/inbox/{ClientInboxClient,page}, components/EnableHiringButton,
components/NavBar, dashboard/{AgentSection,BuilderDashboardClient,BuyerSection,HirerSection},
faq, feed/[id]/FeedPostCTA, hirer/{BuyerOnlyEmptyState,HirerDashboardClient,page}, hirers,
how-it-works, join, messages, page (homepage), pricing, success/SuccessClient, talent/TalentClient,
team/[slug]/edit/TeamEditClient, u/[username].
