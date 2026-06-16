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

## Site Audit (in-flight, pre-launch) — PAUSED at §E.7

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

**Audit artifacts accumulated (clean at §Z; respect FK order):**
- auth.users: `cb76662c` (builder), `c954352c` (team admin), `13a81dc9` (agent owner), `f66d3639` (otp-owner orphan), `da2ca1fa` (otp-owner-v2, §E.7 local verify), `8aa9f478` (otp-owner-v3, §E.7 prod verify)
- entities: 41 (human/builder), 42 (team), 43 (agent), 44 (human, otp orphan, profile_id null), 45 (human, otp-owner-v2, slug `audit-2026-06-16-agent-otp-owner-v2`), 46 (human, otp-owner-v3, slug `audit-2026-06-16-agent-otp-owner-v3`)
- profiles: `audit-2026-06-16-builder-1` (entity 41), `audit-2026-06-16-agent-owner` (minimal, entity-less) + `profiles.team_entity_id=42` soft-link on the builder, `audit20260616agentot545` (entity 45, email `…-v2@example.com`, §E.7 fix output — username hyphen-stripped per /api/keys regex but caught by §Z email/slug LIKE), `audit20260616agentot11` (entity 46, email `…-v3@example.com`)
- team_profiles (entity 42) · agent_profiles (entity 43) · team_admins #4
- api_keys: builder:rw (`audit-2026-06-16-builder-key`), buyer:rw (`audit-2026-06-16-buyer-key`), agent:rw (`audit-2026-06-16-agent-key`), builder:rw `sk_ss_4TD88…` (v2 local), builder:rw `sk_ss_2LeTD…` (v3 prod), buyer:rw (`audit-2026-06-16-buyer-key-v2`, §F.3 curl) + builder:rw (`audit-2026-06-16-builder-key-v2`, §F.3 403 test) — both on the §B builder profile
- subscriptions: `48763eb7` (§F.2 simulated, email `audit-2026-06-16-builder@example.com`, status active, product full_access, synthetic `cus_/sub_audit_2026_06_16`) — **no Stripe-side object**, pure DB; §Z catches via `email LIKE 'audit-2026-06-16-%'`
- posts: 2 (builder) · proof_receipts: #90 · enrichment_runs: #6 (failed-credit), #7 (ok) · agent_registrations: #1 (stuck pending), #2 (v2, completed), #3 (v3, completed)

**Resume order (next session):**
1. ✅ DONE — §E.7 fix applied + shipped (`e2e360b`).
2. ✅ DONE — §E.3–§E.5 re-verified green with fresh users (v2 local, v3 prod). Orphan `f66d3639` left stuck-pending for §Z.
3. ✅ DONE — §F via approach (a) DB-simulation (sk_live blocker → no Stripe calls). **Real-Stripe verification queued as Phase 8.5** (architect to draft). §F findings all clean.
4. **← NEXT: §G** — Buyer-only Card 4 fresh signup. Awaiting architect review (+ Phase 8.5 draft) before starting.
5. §H — cross-cutting checks.
6. §I — findings consolidation.
7. §J — in-session fixes (≥ the §E.7 BLOCKER if not done in step 1).
8. §Z — bulk-delete all `audit-2026-06-16-*` via paste-back DDL; verify counts match the §A baseline.

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
