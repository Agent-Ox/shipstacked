# Site Audit — End-to-End Persona Simulation

**Goal:** before outreach, prove the four customer-type flows actually work end-to-end. Terminal Claude simulates four personas, walks each one's full lifecycle, surfaces every failure, produces a structured findings report. Bugs found get fixed in-session if surgical; queued if expensive.

**Locked decisions:**
- **Stripe testing:** live mode + Stripe test card `4242 4242 4242 4242` against prod. Real Stripe Customer + Subscription created on live account; cleanly deletable.
- **Cleanup strategy:** soft-mark all audit artifacts with prefix `audit-2026-06-16-*` (slugs, usernames, agent names). §Z final block bulk-deletes via service-role paste-back DDL.
- **Execution:** terminal Claude impersonates personas via service-role + anon-key sign-ins. Curls UI routes, queries DB state, drives forms via direct API calls + browser-style flows.

---

## §A — Pre-flight

### §A.1 — Confirm test data isolation

Before any persona signs up, capture baseline counts:

```sql
SELECT COUNT(*) AS profiles FROM profiles;
SELECT COUNT(*) AS entities_team FROM entities WHERE kind='team';
SELECT COUNT(*) AS entities_agent FROM entities WHERE kind='agent';
SELECT COUNT(*) AS subscriptions FROM subscriptions WHERE status='active';
SELECT COUNT(*) AS api_keys FROM api_keys;
SELECT COUNT(*) AS proof_receipts FROM proof_receipts;
```

Report counts. After audit, post-cleanup counts must match these exactly. Any delta = leak.

### §A.2 — Confirm Stripe webhook posture

```bash
curl -sI -X POST https://shipstacked.com/api/stripe/webhook -H "Content-Type: application/json" -d '{}'
```

Expected: 400 or similar — webhook should reject unsigned bodies. If it returns 200 OR a 500: that's a finding before we even start.

Report status.

### §A.3 — Confirm /join page renders and surfaces all four cards

```bash
curl -s https://shipstacked.com/join | grep -c "Builder\|Team\|Agent\|Buyer"
```

Expected: ≥ 4 mentions of customer type labels. Confirm the page renders without auth error.

---

## §B — Persona 1: Builder (Card 1)

**Email:** `audit-2026-06-16-builder@example.com` (or a real deliverable test mailbox — see §B.1)
**Goal:** sign up → publish proof of work → profile renders publicly → /talent shows the builder → JSON-LD validates → dashboard works.

### §B.1 — Email handling

OTP/magic-link auth flows may require a real deliverable email. Options:
- (a) Use a `+audit` plus-alias on operator's gmail (e.g. `oxleethomas+audit-builder@gmail.com`)
- (b) Use a disposable email service
- (c) Bypass via service-role direct insert into `auth.users`

Default to (a). Operator confirms the alias arrives. If OTP flow uses Supabase magic link and operator doesn't want to fish inboxes, service-role bypass per (c).

Report email approach used.

### §B.2 — Signup flow

1. Curl `/join` → confirm Card 1 form renders
2. Submit signup: email + password (use known test password)
3. Confirm redirect to dashboard or onboarding
4. Confirm `auth.users` row created
5. Confirm `profiles` row created (or NOT created if signup is two-step)

Document every step + outcome. If any step errors, capture the exact error.

### §B.3 — Profile completion

1. Hit dashboard / profile edit page
2. Fill out: full_name, username (use `audit-2026-06-16-builder-1`), bio, location, role, skills
3. Submit
4. Confirm DB write: `profiles.username = 'audit-2026-06-16-builder-1'`
5. Curl `/u/audit-2026-06-16-builder-1` → confirm public profile renders 200

### §B.4 — Publish first proof of work

1. Find the "post a build" entry point (likely `/paste/review` or similar)
2. Submit a real URL — propose: a public ShipStacked-related URL (e.g. `https://shipstacked.com/about` or a GitHub repo URL the operator has access to). Avoid posting fake URLs to confuse the receipt verification system.
3. Walk through Atlas role classification confirmation step
4. Confirm `proof_receipts` row written
5. Confirm receipt visible on `/u/audit-2026-06-16-builder-1`
6. Confirm receipt visible on `/feed`

### §B.5 — Talent directory check

1. Curl `/talent` → confirm new builder appears in directory
2. Curl `/talent?cluster=<the cluster the receipt was classified under>` → confirm builder appears in that filter
3. Curl `/api/v1/talent/search?cluster=<cluster>` → confirm builder appears in API response

### §B.6 — JSON-LD validation

1. Curl `/u/audit-2026-06-16-builder-1` → extract the JSON-LD `<script type="application/ld+json">` block
2. Parse it as JSON (no syntax errors)
3. Confirm key fields present: `@type: 'Person'`, `name`, `knowsAbout` (Atlas role URLs), `description`
4. Note any malformed or missing fields

### §B.7 — Builder dashboard

1. Sign in as the audit builder
2. Curl `/dashboard` (with the session cookie) → confirm 200
3. Confirm dashboard shows the proof of work just published
4. Confirm dashboard shows the Atlas role classification
5. Confirm dashboard surfaces the EnableHiringButton (toggle for buyer mode)

### §B.8 — Builder findings report

For each step §B.1 through §B.7: PASS / FAIL / NOTE. For each FAIL: severity (blocker / serious / minor), reproduction steps, proposed fix.

---

## §C — Persona 2: Team (Card 2)

**Team slug:** `audit-2026-06-16-team`
**Admin email:** `audit-2026-06-16-team-admin@example.com` (or plus-alias)
**Goal:** sign up Card 2 → team profile renders → invite a member → team appears in /talent.

### §C.1 — Signup flow

1. Curl `/join` Card 2
2. Submit: team name "Audit Test Studio", slug `audit-2026-06-16-team`, admin email + password
3. Confirm `entities` row written with `kind='team'` and the slug
4. Confirm `team_admins` row written linking the admin user to the team

### §C.2 — Team profile renders

1. Curl `/team/audit-2026-06-16-team` → confirm 200
2. Confirm team name, description, member list (initially empty)
3. Confirm Organization JSON-LD valid

### §C.3 — Add a member via the soft-link flow

The Phase 4 §F mechanism: a builder edits their own profile and adds the team as their employer via autocomplete. To test this with one fresh team and zero existing members, we either:
- (a) Have the audit builder (from §B) link themselves to the audit team
- (b) Create a second audit builder for this purpose

Default to (a) — reuses §B persona. Update `profiles.team_entity_id` to the audit team's entity_id and confirm the linkage renders.

1. As the §B builder, edit profile → add team via autocomplete (or direct DB update via service-role)
2. Curl `/team/audit-2026-06-16-team` → confirm member appears in the Works-with card

### §C.4 — Team admin dashboard

1. Sign in as team admin
2. Curl `/team/audit-2026-06-16-team/edit` → confirm admin access (200)
3. Confirm edit form renders
4. Confirm team services + capabilities can be edited

### §C.5 — Team in /talent directory

1. Curl `/talent?type=team` → confirm audit team appears
2. Curl `/api/v1/talent/search?type=team` → confirm in API response

### §C.6 — Nav verification (team admin role)

1. As team admin, confirm NavBar surfaces "Your team" → /team/audit-2026-06-16-team
2. Confirm when on /team/audit-2026-06-16-team, NavBar surfaces "Edit team" → /team/audit-2026-06-16-team/edit
3. (This is the Block 2 + 2.7 work — runtime verification of the RLS-policy fix)

### §C.7 — Team findings report

---

## §D — Persona 3: Agent via Card 3 signup

**Agent slug:** `audit-2026-06-16-agent`
**Owner email:** `audit-2026-06-16-agent-owner@example.com`
**Goal:** sign up Card 3 → agent profile renders → API key issued → agent appears in /talent → first /api/v1/* call succeeds.

### §D.1 — Signup flow

1. Curl `/join` Card 3
2. Submit: agent name "Audit Test Agent", slug `audit-2026-06-16-agent`, provider (anthropic), model (claude-sonnet-4-6), capabilities (list of Atlas role IDs)
3. Confirm `entities` row written with `kind='agent'` and the slug
4. Confirm `entities.owner_user_id` set to the owner's auth.user.id

### §D.2 — Agent profile renders

1. Curl `/agent/audit-2026-06-16-agent` → confirm 200
2. Confirm Custom shipstacked:Agent JSON-LD valid
3. Confirm capabilities surface as Atlas role chips

### §D.3 — Agent API key generation

1. Sign in as agent owner
2. Navigate to dashboard / API keys section
3. Generate an `agent:rw` key tied to the audit agent
4. Confirm `api_keys` row written with correct scope
5. Confirm key value shown ONCE (not stored plaintext in DB)

### §D.4 — First authenticated agent API call

1. With the generated key, curl `/api/v1/agent` (GET — fetch own agent profile via API)
2. Expected: 200 with JSON response
3. Confirm response shape matches docs

### §D.5 — Agent in /talent directory

1. Curl `/talent?type=agent` → confirm audit agent appears
2. Curl `/api/v1/talent/search?type=agent` → confirm in API response

### §D.6 — Nav verification (agent owner)

1. Confirm NavBar surfaces "Your agent" → /agent/audit-2026-06-16-agent
2. Confirm on /agent/audit-2026-06-16-agent, NavBar surfaces "Edit agent" → /agent/audit-2026-06-16-agent/edit

### §D.7 — Agent findings report

---

## §E — Persona 4: Agent via /auth.md OTP flow

This is the programmatic-registration path (Phase 3). Different shape than Card 3 — no human form submission, purely API-driven.

**Agent slug:** `audit-2026-06-16-agent-otp`
**Owner email:** `audit-2026-06-16-agent-otp-owner@example.com`
**Goal:** auth.md → OTP issued → exchange OTP for API key → agent profile created via API → first authenticated call succeeds.

### §E.1 — Read /auth.md

1. Curl `https://shipstacked.com/auth.md` → confirm 200
2. Confirm the file is machine-readable (markdown with structured directives)
3. Document the steps an agent should follow

### §E.2 — OTP request flow

1. POST to whatever endpoint /auth.md specifies (probably `/api/auth/otp/request`)
2. Body: agent identification + owner email
3. Confirm OTP issued (logged or emailed depending on flow)
4. If emailed: operator confirms receipt
5. Document the actual delivery channel

### §E.3 — Exchange OTP for key

1. POST OTP back to whatever endpoint specified (probably `/api/auth/otp/exchange`)
2. Receive scoped API key in response
3. Confirm `api_keys` row written
4. Confirm scope is correct (`agent:rw`)

### §E.4 — Create agent profile via API

If the auth.md flow expects the agent to self-register fully programmatically:
1. POST to `/api/v1/agent` with the key + agent details
2. Confirm agent profile created
3. Confirm `entities` row written

### §E.5 — First authenticated call

1. Curl `/api/v1/agent` (GET) with the key
2. Confirm 200 + correct shape

### §E.6 — Agent OTP findings report

This block is the highest-risk for finding bugs because /auth.md is the most-architected, least-dogfooded surface. Expect issues.

---

## §F — Persona 5: Buyer (Hiring Access toggle from existing account)

This persona reuses the §B builder, then toggles Hiring Access on. Tests the most consequential UX path: existing free user pays $199/mo.

**Goal:** existing builder → toggle Hiring Access → Stripe checkout → webhook fires → subscription row created → buyer features unlocked → search works → contact a builder.

### §F.1 — Pre-toggle state

1. Sign in as §B builder
2. Confirm dashboard shows EnableHiringButton in OFF state
3. Confirm `/talent` search results are NOT redacted/limited (or DO confirm if they ARE — depends on shipped logic)
4. Confirm contact CTAs on other profiles are gated (or buyable)

### §F.2 — Click EnableHiringButton → Stripe checkout

1. Click triggers `/api/checkout` POST with `product=full_access`
2. Confirm response includes Stripe checkout URL
3. Redirect to Stripe checkout
4. In Stripe checkout: use test card `4242 4242 4242 4242`, any future expiry, any CVC, any postcode
5. Complete checkout
6. Confirm redirect to success URL

### §F.3 — Webhook fires + subscription created

1. Confirm Stripe sends webhook to `/api/stripe/webhook`
2. Confirm webhook signature verified (no 400)
3. Confirm `subscriptions` row written with `status='active'`, correct `email`, `product='full_access'`
4. Confirm `stripe_events` idempotency row written

### §F.4 — Buyer features unlocked

1. As the same user (still signed in), refresh dashboard
2. Confirm EnableHiringButton now shows ON / "Hiring Access active"
3. Confirm `/talent` search results are unrestricted
4. Confirm contact CTAs on other profiles are now active
5. Generate a `buyer:rw` API key from dashboard
6. Curl `/api/v1/talent/search?cluster=A` with the buyer key → confirm 200 + correct response

### §F.5 — Search → contact flow

1. From /talent, click on the audit team's profile
2. Confirm contact CTA renders
3. Click contact → confirm the contact flow (message form, mailto, whatever Phase 4 §M shipped)
4. Document the actual contact UX

### §F.6 — Cancel subscription

1. Cancel via dashboard / account settings (if surfaced) OR via Stripe customer portal
2. Confirm Stripe sends cancel webhook
3. Confirm `subscriptions.status` updated to `canceled` or similar
4. Confirm access continues until end-of-period (per ShipStacked's stated policy)
5. Confirm dashboard reflects cancellation state

### §F.7 — Buyer findings report

---

## §G — Persona 6: Buyer-only (Card 4 fresh signup)

Different shape from §F. A new user who never wanted to be a builder — just wants to hire.

**Email:** `audit-2026-06-16-buyer@example.com`
**Goal:** /join Card 4 → straight to Stripe → subscription → search.

### §G.1 — Signup flow

1. Curl `/join` Card 4
2. Submit: email + password (no profile creation)
3. Expected behavior: routed straight to Stripe checkout? Or to a buyer dashboard with a checkout CTA?
4. Document the actual flow

### §G.2 — Checkout + post-checkout state

1. Complete Stripe checkout (test card)
2. Confirm subscription created
3. Confirm user lands on a usable dashboard (not just a 404 or empty page)
4. Confirm /talent works with `buyer:rw` access
5. Note: does buyer-only have a profile row at all? Or just an auth.users + subscriptions? Document.

### §G.3 — Buyer-only findings report

---

## §H — Cross-cutting checks

### §H.1 — Anonymous user flow

1. Cold visitor lands on `/` (homepage v3)
2. Click through every visible link / CTA
3. Document any 404, 500, empty state, or broken anchor
4. Click "Browse talent" → /talent → confirm anonymous can see the directory
5. Click on a builder/team/agent profile → confirm anon can see profiles
6. Click a contact CTA → confirm anon is gated to signup (or however the contact flow handles unauth)
7. Click "Sign in" → confirm login flow works

### §H.2 — Sign-in / sign-out cycle

1. Sign in as the §B builder
2. Confirm NavBar updates without page nav (Block 3 §F.B3 realtime listener test)
3. Sign out
4. Confirm NavBar updates back to anon state
5. Confirm session cookies cleared

### §H.3 — All Phase 8 marketing pages

For each: `/`, `/how-it-works`, `/faq`, `/pricing`, `/atlas`, `/api-docs`, `/auth.md`:
1. Curl as anonymous → confirm 200
2. Confirm renders + no broken images / 404'd OG cards / missing CSS
3. Confirm internal links all return 200 (sample a few from each page)
4. Confirm CTAs route to `/join` or expected destinations

### §H.4 — Empty states audit

For each pillar's surface, what happens when there's no data?
1. `/talent` with filters that return zero results → confirm graceful empty state
2. A builder profile with zero receipts → confirm graceful empty state
3. A team with zero members → confirm graceful empty state
4. An agent with zero capabilities → confirm graceful empty state

### §H.5 — Mobile responsiveness curls

Mobile testing requires browser-paired verification (operator-when-convenient), but we can check viewport meta tags and confirm CSS includes mobile media queries.

1. Curl each major page, grep for `viewport` meta tag
2. Grep for `@media` rules in served HTML/CSS
3. Note pages missing mobile responsiveness

---

## §I — Findings consolidation

After all §B through §H execute, terminal Claude produces a single findings report:

```
SEVERITY  PERSONA  STEP    FINDING                                FIX
========  =======  ======  =====================================  =================
BLOCKER   §B.4     paste   Atlas classification step 500s on...   Backend issue...
SERIOUS   §D.3     keygen  agent:rw key shown twice (security)    Show once only
MINOR     §F.2     stripe  Loading state missing during redirect  UX polish
NOTE      §H.4     empty   /talent zero-results state is bare     Add "Try broadening"
```

For each:
- Severity: BLOCKER (signup/payment broken) / SERIOUS (functionality degraded) / MINOR (UX rough edges) / NOTE (worth knowing, not fixing)
- Persona + step: where the bug surfaced
- Finding: what specifically happens
- Fix: proposed fix or "needs investigation"

Architect-Claude reviews, classifies which fixes can ship in-session vs. queue.

---

## §J — In-session fixes

Any finding classified as in-session-fixable: terminal Claude implements per the standard rhythm (verbatim FROM/TO, tsc/build gates, commit per Phase pattern). Bulk of findings probably ship as individual small commits OR one omnibus "audit fixes" commit depending on scope.

---

## §Z — Final cleanup

After audit is complete + fixes are shipped:

```sql
-- Bulk delete all audit-2026-06-16-* artifacts.
-- Cascade order matters: receipts/keys/memberships → profiles → entities → users.

BEGIN;

DELETE FROM proof_receipts WHERE subject_id IN (
  SELECT id FROM entities WHERE slug LIKE 'audit-2026-06-16-%'
)
OR subject_id IN (
  SELECT entity_id FROM profiles WHERE username LIKE 'audit-2026-06-16-%'
);

DELETE FROM api_keys WHERE owner_user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'audit-2026-06-16-%' OR email LIKE '%+audit-%'
);

DELETE FROM team_admins WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'audit-2026-06-16-%' OR email LIKE '%+audit-%'
);

DELETE FROM profiles WHERE username LIKE 'audit-2026-06-16-%' OR email LIKE 'audit-2026-06-16-%' OR email LIKE '%+audit-%';

DELETE FROM entities WHERE slug LIKE 'audit-2026-06-16-%';

DELETE FROM subscriptions WHERE email LIKE 'audit-2026-06-16-%' OR email LIKE '%+audit-%';

-- auth.users delete via service-role API (not direct SQL)

COMMIT;
```

Plus Stripe-side cleanup: cancel any active test subscriptions, optionally delete test customers.

Plus baseline-count re-check (§A.1): confirm counts match.

---

## §K — Decisions locked

- Live Stripe + test card `4242 4242 4242 4242`
- All audit personas tagged `audit-2026-06-16-*`
- Soft-mark during audit, bulk-delete at §Z
- Findings classified BLOCKER / SERIOUS / MINOR / NOTE
- In-session fixes shipped if surgical; queued otherwise
- Terminal Claude drives everything; operator validates emails (plus-aliases) where needed
- Persona 5 (existing-builder-toggles-buyer) reuses §B persona — efficient

## §L — What's NOT in this audit

- Accessibility (WCAG) — Tier 2 work, deferred
- Performance (Lighthouse, Core Web Vitals) — Tier 2 work, deferred
- Security (full RLS audit beyond Block 2.7 finding, dependency CVEs) — Tier 3 work, deferred
- Legal (terms of service, privacy policy accuracy) — operator domain
- Marketing copy voice — Phase 8 copywriter handled
- Stripe test mode separation from prod — accepted risk per §K
- Multi-team / multi-agent UX (single team / single agent per owner this audit)

End of audit plan.
