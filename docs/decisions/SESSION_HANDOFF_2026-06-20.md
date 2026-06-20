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
