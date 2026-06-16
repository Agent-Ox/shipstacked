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

## In-flight phases

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

- **`getRankedBuilders` derives `atlasClusters` from `atlas_inferred` only** (not `atlas_confirmed`). `/api/v1/talent/search` (Phase 3) inherits this behavior for parity with the `/talent` UI. Phase 6 (Atlas wiring) revisits.

## Analytics

- **Tool:** PostHog (free tier, cookieless mode, US region)
- **Dashboard:** https://us.posthog.com (project: ShipStacked)
- **Project API key:** stored in `NEXT_PUBLIC_POSTHOG_KEY` (`.env.local` + Vercel Production scope)
- **Events instrumented:** `talent_page_viewed`, `profile_viewed`, `subscribe_clicked`, `message_button_clicked`, `feedback_submitted`, `hirer_dashboard_viewed`
- **GA4 removed** during Task 5 (replaced by PostHog single-tool model — measurement ID `G-Z6MBHJVV7S` no longer wired)
- **Session replay:** intentionally disabled (privacy-aligned, no consent banner)
