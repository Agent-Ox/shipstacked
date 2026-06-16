# DISCOVERY — Phase 1: Foundation (honesty pass + agent enrichment wiring + checkout footgun close)

**Status:** Phase 1 discovery doc per the discovery-first protocol (AGENTS.md §"How this codebase ships").
**Drafted:** 2026-05-26 by architect-Claude (Opus 4.7).
**Target session:** ~4-5 focused hours, single session.
**Prerequisite:** None. This is the first phase.
**Successor phase:** Phase 2 (Generic Buyer Mode toggle).

This document is read-only enumeration. **No code is to be written based on this doc until the operator approves it verbatim.** Each numbered item under §F is the unit of operator approval — items can be approved individually, amended, or rejected.

---

## A. Scope and goal

Phase 1's job: make the shopfront tell the truth, structurally connect the agent flow to the ranking engine, and close the email-keyed checkout footgun. After Phase 1 ships, **the live site at every user-visible surface matches what is actually built underneath it**, and the four customer-type flows are structurally sound (even if Card 2 and Card 3 are still skeleton-grade pending their dedicated build phases).

This phase touches all four customer types simultaneously per the coordinated-phase principle (§B.3): velocity eradication is platform-wide, atlas_confirmed read-fix is platform-wide, copy honesty applies to Card 2 and Card 3, agent enrichment wires Card 3 to the ranking engine, checkout fix protects Card 1 + Card 4's revenue path.

**What "done" means for Phase 1 (the gate):**
- Zero references to "Velocity Score" in user-visible copy, machine-output, or contract surfaces.
- All three atlas_confirmed-empty reader sites render confirmed-OR-inferred role chips.
- `/api/v1/builds` writes proof receipts via enrichment; agent-posted builds appear on `/talent`.
- `/api/checkout` cannot create an email-mismatched subscription for an authenticated user.
- Card 2 and Card 3 copy at `/join` matches what clicking each card actually produces today.
- The 3 junk profiles (`paddybot130`, `batch5-test`, `hyy922`) no longer appear in any public surface.
- `npx tsc --noEmit` clean. `npm run build` clean. `verify-agent-card.ts` green against prod.

---

## B. Operating principles governing this phase (operator-locked)

1. **Mid-phase divergence is acceptable, end-of-phase truth is not.** The site may temporarily show inconsistent state between code touches. The gate is end-of-phase: when the phase ships, the tin tells the truth.

2. **Revenue-proximity drives trade-offs within the phase.** Solo (Card 1) and Buyer-only (Card 4) are closest to revenue today. If something has to flex inside this phase, agent-flow items (Item 5) flex before checkout-fix (Item 7) or velocity-cleanup (Items 1-2). Strategic positioning for the agentic economy is preserved by completing Item 5; Item 5 is not optional in Phase 1.

3. **Coordinated phasing across all four customer surfaces.** Shared infrastructure (JSON-LD builders, ranking engine, atlas readers, copy honesty) gets touched once across all four customer types in this phase, not once per customer in successive phases.

4. **Standing Copy Rule applies at phase boundary.** Every live user-visible claim must match shipped backend capability at the end of Phase 1. Phase 1 copy is honest about Phase 1 state, not aspirational about Phase 3/4 state.

5. **"Probably" is the operator's red flag.** Where this doc cites a line number, file path, or row count, it has been verified against HEAD `f58567a` via terminal-Claude reads. Where verification was not possible (e.g. live DB state of junk profiles), the doc says so explicitly and gates the relevant work behind a verification step.

---

## C. State at start of Phase 1 (verified 2026-05-26)

- HEAD: `f58567a` (matches handoff bundle exactly; zero commits since).
- Working tree: clean on tracked files; 30 untracked docs in `docs/audit/`, `docs/v2/`, `docs/handover/`, plus 2 untracked scripts in `scripts/v2/`. These are Phase 5 cleanup, not Phase 1 scope.
- Published profiles: 41 (32 entity-linked, 9 unlinked).
- Active subscriptions: 11 (all operator/test; 0 real paying customers).
- Public receipts: 77 (66 L1, 11 dead L0, 0 atlas_confirmed).
- `entities.kind` distribution: 33 human, 1 team (orphan, write-only), 1 agent (orphan, write-only).
- Active jobs: 0.
- API keys issued: 48.

**Junk in published-41 (not yet verified against live DB at draft time):** `paddybot130`, `batch5-test`, `hyy922`. Item 6 below gates DDL against an explicit DB SELECT performed via Dashboard before any UPDATE runs.

---

## D. Invariants that apply to this phase

From `AGENTS.md` invariants (the source-of-truth file at `~/shipstacked/AGENTS.md`, verified 2026-05-26):

- **#1 Slug == username for human entities, verbatim.** No code in Phase 1 touches `entities.slug` derivation; honored by inheritance.
- **#2 Published-gate fake exclusion is universal.** Item 6 (junk profile cleanup) flips three profiles' `published = false`. After this runs, every public surface that lists/aggregates honors the gate automatically.
- **#3 Brand-free.** No item in Phase 1 introduces partner/program/brand/specific-collection-slug names. Mechanized by `verify-agent-card.ts BRAND_ALLOWLIST_FORBIDDEN`.
- **#4 Migrations apply via the Supabase Dashboard SQL Editor, not from a terminal session.** Item 6 (junk profile UPDATE) and any Phase 1 SQL goes through Dashboard. Type-confirm SQL is drafted in §H below; the human pastes it. Every SQL block ships with a reversal.
- **#5 One-source-of-truth markup builders.** Item 3 (atlas_confirmed read fix) extends existing readers; does not fork or duplicate the markup builders in `src/lib/jsonld/` or `src/lib/receipts/`. The fix pattern is the existing pattern at `src/app/p/[slug]/page.tsx:189-209`.
- **#6 Additive, never subtractive, on existing user-facing surfaces.** Item 2 (Dashboard VelocityRing → "Proof of Work" card) replaces in place, never deletes. Item 4 (Card 2/3 copy) replaces in place.
- **#7 Content negotiation.** No new public surfaces introduced in Phase 1, so no new `.json` rewrites to add. Existing negotiation continues to work.
- **#8 The verify-agent-card.ts accuracy guarantee stays green.** Phase 1 introduces no new AgentCard skills; the existing 8 skills must still resolve. Verification step in §I.

From `02_DECISIONS_2026-05-19.md` and updates:
- **D11 (agent type, phased).** Phase 1 of D11 is "agent-as-supply, linked to a human/team, extending the existing agent path." Item 5 (agent enrichment wiring) advances Phase 1 of D11. Wallet/DID/on-chain remains Phase 2 of D11, out of scope.
- **D12 (Velocity Score cut from extension).** Phase 1 fully eradicates Velocity Score from supply identities — confirms D12 by removing the readers entirely.
- **Standing Copy Rule (2026-05-19 update).** Phase 1's copy items (Item 4) are the most direct execution of this rule for surfaces that overclaim Phase 2/3/4 state.

From `04_OPERATOR_PROTOCOL.md`:
- DDL only via Dashboard, with reversal block.
- Read-only verification needs no gate; irreversible/structural changes go through pre-flight diff before push.

---

## E. Code touch points (enumerated)

Every file Phase 1 touches, with current state cited against HEAD `f58567a`. Verified via terminal-Claude reads.

### E.1 Velocity Score residue (16+ sites, 15 files)

User-visible copy/UI (5 files, replace-in-place per Invariant #6):
- `src/app/page.tsx:320` — homepage "how it works" step copy. Verified.
- `src/app/privacy/page.tsx:110` — GDPR processing-purpose row. Verified.
- `src/app/api-docs/page.tsx:6,149,194,261` — page metadata description + body copy + sample JSON `"velocity_score":74`. Verified.
- `src/lib/autoVerify.ts:86` — congratulations email body referencing the killed metric. Verified.
- `src/app/dashboard/BuilderDashboardClient.tsx:8-35,31,64,75,84,164-170,194` — VelocityRing component, prop chain, render usage, GitHub-card copy. Detail in Item 2 below. Verified.

Operator-only UI (1 file, pure delete):
- `src/app/admin/page.tsx:61,275` — `highVelocity` aggregate counter + per-row stat. Verified.

Machine-output / API contracts (7 files, pure delete per Invariant #5):
- `src/lib/jsonld/person.ts:39,93,183-185` — `'shipstacked:velocityScore'` in Person JSON-LD graph. **Most-visible machine leak; affects every `/u/[username]` JSON-LD response and every collection JSON-LD via `assemble.ts`.** Verified.
- `src/lib/collections/assemble.ts:88,119,196` — selects + threads `velocity_score` into the Person markup input. Verified.
- `src/app/api/v1/me/route.ts:34` — V1 agent API response payload. Verified.
- `src/app/api/v1/profile/route.ts:98` — V1 agent API PATCH response payload. Verified.
- `src/app/api/apply/route.ts:21,75` — application-notification email select + body interpolation ("Velocity Score: N/100"). Verified.
- `src/app/api/messages/route.ts:31,49,73` — conversation join selects. Verified.
- `src/app/api/messages/[id]/route.ts:23` — conversation messages select. Verified.

Other thread-through (2 files, pure delete):
- `src/app/u/[username]/page.tsx:125` — passes `velocity_score` into `buildPersonJsonLd` input. Verified.
- `src/app/dashboard/page.tsx:80` — passes `velocityScore={profile?.velocity_score || 0}` into `BuilderDashboardClient`. Verified.

**Database column:** `profiles.velocity_score` exists in the live DB but is NOT in any tracked migration (Dashboard-applied per AGENTS.md Invariant #4). **Phase 1 leaves the column in place.** Phase 5 drops it (after readers are cleared and stale-value risk is zero). Drafted as Phase 5 work, recorded in §G.

**Total sites: 16+ distinct line references across 15 files plus 1 schema artifact deferred.** (Count corrected at pre-flight — see §M.)

### E.2 atlas_confirmed empty-render sites (3 sites, 3 files)

- `src/lib/atlas/roles.ts:82` — `getRecentReceiptsAtRole` does `.contains('atlas_confirmed', [roleId])`. Every `/atlas/roles/[id]` page renders zero recent receipts because `atlas_confirmed` is empty everywhere. Verified.
- `src/app/u/[username]/page.tsx:69,442-446` — line 69 selects `atlas_confirmed` in the receipt query; lines 442-446 render role chips from `r.atlas_confirmed` only. Chips never appear on builder profiles. Verified.
- `src/app/og/route.tsx:48,64` — line 48 selects `atlas_confirmed`; line 64 reads `roles: string[] = Array.isArray(receipt?.atlas_confirmed) ? (receipt!.atlas_confirmed as string[]).slice(0, 4) : []`. OG cards show no roles. Verified.

**The precedent that does it right** (do not duplicate; apply this pattern):
- `src/app/p/[slug]/page.tsx:189-209` — renders confirmed first, then `inferred.filter(id => !confirmed.includes(id))` with a distinct `background: '#fafafd'` and `inferred →` label. Verified verbatim.

### E.3 Agent enrichment wiring (2 files + 1 helper addition)

- `src/app/api/v1/builds/route.ts` (full file, 96 lines) — currently inserts `posts` row + fires a useless throwaway 90-day count query + runs `checkAutoVerify`. Does NOT call `/api/enrich`. Verified.
- `src/app/api/enrich/route.ts` (lines 1-200 of ~304) — currently auth-gates on cookie-session via `createServerSupabaseClient()` + `supabase.auth.getUser()`. Returns 401 for any non-cookie request (i.e., any API-key bearer). Resolver accepts `body.profile_id` (admin path) or self-lookup by `user.email`. Entity resolution calls `findOrCreateHumanEntity` unconditionally. Verified.
- `src/lib/apiAuth.ts` (full file) — exports `authenticateApiKey(req)`. Returns `{ ok: true, auth: { profile, email, keyId } } | { ok: false, status, error }`. The resolved `profile` has no entity-kind field. The API key links to a profile, not to an entity. Verified.
- `src/lib/entities.ts` — exports `findOrCreateHumanEntity`, `findOrCreateAgentEntity`, `findOrCreateTeamEntity`, `findOrCreateBuyerEntity`. Agent factory checks `entities WHERE owner_user_id=X AND kind='agent'`. No existing helper to detect "is this profile an agent" from just a profile_id. Verified.

**Design constraint surfaced by verification:** an agent's profile row is structurally identical to a human's profile row. There is NO `is_agent`, `profile_kind`, or `profile_type` column anywhere in `src/` (grep confirmed zero matches). The only "agent-ness" signal lives on `entities.kind='agent'`, set in two places (`findOrCreateAgentEntity` in entities.ts, `/api/keys` POST path at line 79). Agent entities are created with no `profile_id` link (the bidirectional `profiles.entity_id ↔ entities.profile_id` link is human-only per Spec §0). Item 5 below resolves this by detecting agent-ness through `entities WHERE owner_user_id=X AND kind='agent'` lookup, then routing through `findOrCreateAgentEntity` for receipt subject resolution. The agent entity gets receipts via `subject_id = agent_entity_id` without modifying the profile↔entity link contract.

### E.4 Checkout session-keying (1 file + 1 client surface)

- `src/app/api/checkout/route.ts` (full file, 30 lines) — accepts `{product, email}` from POST body with no auth check at all. Hands `email` straight to `stripe.checkout.sessions.create({customer_email: email})`. Verified.
- `src/app/hirers/page.tsx` — client component with email input that flows into `/api/checkout`. Needs UI adjustment for authenticated users (read session email, lock field, "Subscribing as <email>" indicator). Verified path; specific line range to be enumerated during pre-flight diff.

### E.5 Join page copy honesty (1 file, 4 lines)

- `src/app/join/page.tsx:313-315` — Card 2 (Team / Agency / Studio) title (313), subline (314), supporting line (315). Verified verbatim.
- `src/app/join/page.tsx:327-329` — Card 3 (Autonomous Agent) title (327), subline (328: "I'm an agent with my own wallet, tasks, and outcomes."), supporting line (329). Verified verbatim.

**AgentOnboarding.tsx is NOT touched in Phase 1.** Verified read of the full file shows no "wallet/autonomous" language in user-facing copy or SYSTEM_PROMPT. The build map's earlier reference to "soften AgentOnboarding wallet/autonomous language" was a misread; the language lives only on `/join` Card 3 subline. Recording this drift correction in §G.

### E.6 Junk profile cleanup (live-DB DDL)

- Three profile rows where `published=true` per the handoff bundle's published-41 snapshot: `paddybot130`, `batch5-test`, `hyy922`.
- Plus `proof_receipts.visibility='public'` rows owned by these profiles (the bundle cites `subject_id = 22` for one of them; the others to be verified by the SELECT in §H).
- **Live-DB existence not yet verified.** §H.1 below contains the operator-paste SELECT that runs before any UPDATE drafts.

### E.7 Defensive `getEntityModes` hardening

- `src/lib/user.ts` (66 lines, function `getEntityModes()`). Currently logs nothing on email-keyed misses. Adds one console.warn line for users with `user_id` populated whose `subscriptions` lookup misses, to surface email↔auth drift before it becomes a paying-customer issue.

---

## F. Phase 2 execution items (numbered, operator-reviewable)

Each item is approvable individually. Items are ordered to minimize cross-item conflict and to surface verification-needed gates early.

### Item 1 — Velocity Score eradication across 17 sites

**Goal:** zero references to "Velocity Score" in user-visible copy, machine-output, or contract surfaces.

**Replace-in-place per Invariant #6 (user-visible, 5 files):**

1a. **`src/app/page.tsx:320`** — replace homepage step copy:
- FROM: *"Get auto-verified when your proof is real. Your Velocity Score shows you're active. Hirers with real budgets find you — no applications, no guessing."*
- TO: *"Get auto-verified when your proof is real. Your shipped work is ranked and discoverable. Hirers with real budgets find you — no applications, no guessing."*

1b. **`src/app/privacy/page.tsx:110`** — GDPR row label change:
- FROM: `['Calculating Velocity Scores', 'Performance of a contract']`
- TO: `['Calculating proof-of-work rankings', 'Performance of a contract']`

1c. **`src/app/api-docs/page.tsx:6`** — page metadata description:
- FROM: *"ShipStacked has a real API. Let your agent keep your profile updated, post your builds, and maintain your Velocity Score — automatically."*
- TO: *"ShipStacked has a real API. Let your agent keep your profile updated, post your builds, and maintain your proof-of-work record — automatically."*

1d. **`src/app/api-docs/page.tsx:149`** — body copy:
- FROM: *"ShipStacked has a real API. Bearer token auth. Clean JSON. Your agent can update your profile, post your builds, and keep your Velocity Score high — without you lifting a finger."*
- TO: *"ShipStacked has a real API. Bearer token auth. Clean JSON. Your agent can update your profile, post your builds, and keep your proof-of-work record current — without you lifting a finger."*

1e. **`src/app/api-docs/page.tsx:194,261`** — two distinct edits (line 194 confirmed at pre-flight to carry lowercase "velocity score" body copy that the case-sensitive guard missed; it is NOT covered by 1d):
- **Line 194** (Endpoint description): FROM `description="Fetch your full profile, skills, projects, velocity score, and verification status."` TO `description="Fetch your full profile, skills, projects, and verification status."` — drops the lowercase "velocity score," phrase.
- **Line 261** (GET /me sample JSON): remove the `"velocity_score": 74,` line from the example response.

1f. **`src/lib/autoVerify.ts:86`** — congratulations email body:
- FROM: *"Every build you post strengthens your Velocity Score and your proof-of-work record."*
- TO: *"Every build you post strengthens your proof-of-work record."*

**Pure delete (machine output / contracts, 7 files):**

1g. **`src/lib/jsonld/person.ts:39,93,183-185`** — remove `velocity_score` from `PersonProfileInput`, remove `'shipstacked:velocityScore'?: number` from output type, remove the emit block at 183-185. Diff: 4-5 lines deleted, no replacements.

1h. **`src/lib/collections/assemble.ts:88,119,196`** — remove `velocity_score` from the select string (88), the `ConsentedBuilder` type (119), and the input thread-through (196).

1i. **`src/app/api/v1/me/route.ts:34`** — remove `velocity_score: profile.velocity_score,` from the returned profile object.

1j. **`src/app/api/v1/profile/route.ts:98`** — remove `velocity_score` from the `.select()` string. The PATCH response object will no longer include it.

1k. **`src/app/api/apply/route.ts:21,75`** — remove `velocity_score` from select (line 21) and the conditional email-body interpolation (line 75: ` profile.velocity_score ? \` — Velocity Score: ${profile.velocity_score}/100.\` : '.',`).

1l. **`src/app/api/messages/route.ts:31,49,73`** — remove `velocity_score` from each of the three conversation-join select strings.

1m. **`src/app/api/messages/[id]/route.ts:23`** — remove `velocity_score` from the conversation-messages select string.

1n. **`src/app/u/[username]/page.tsx:125`** — remove `velocity_score: profile.velocity_score,` from the `buildPersonJsonLd` input call.

1o. **`src/app/dashboard/page.tsx:80`** — remove the `velocityScore={profile?.velocity_score || 0}` prop pass-through (depends on Item 2 below, which removes the prop entirely).

**Operator-only UI pure delete (1 file):**

1p. **`src/app/admin/page.tsx:61,148,264,275`** — remove the `highVelocity` filter aggregate (61), remove its consumer in the stats row (148), remove the `'Velocity'` table column header (264), remove the per-row velocity span (275). Reduce the table header array from 7 cols to 6. (Expanded at pre-flight: the original 61,275-only edit would have broken `tsc`/`build` by leaving `highVelocity` referenced at 148 — see §M.)

1q. **`src/app/talent/page.tsx:53`** — remove the 'replaces the frozen velocity sort' comment. Formula E is the only ranking now; the comment is stale.

### Item 2 — Dashboard VelocityRing → "Proof of Work" card

**Goal:** replace the most-visible Velocity Score UI with an honest proof-of-work card. Invariant #6 (additive, never subtractive) — the dashboard's verification/identity card slot is preserved; only the contents change.

2a. **`src/app/dashboard/BuilderDashboardClient.tsx:8-35`** — delete `VelocityRing` component, write `ProofOfWorkCard` in its place. New component renders (using data already pulled by the dashboard at `dashboard/page.tsx`):
- L1 receipt count (numerator: receipts where `verification_level='L1'` AND `subject_id=entity_id`; data already in the proven-post count or computable from receipts already fetched).
- L0 dead count (similar, for transparency).
- Distinct hosts (computable from receipts).
- Last-shipped date (most recent receipt's `issued_at`).
- Link to public profile (`/u/<username>`).

Visual treatment: same card chrome as the existing VelocityRing card (white background, `1px solid #e0e0e5`, `borderRadius: 14`, padding `1.5rem`). Heading "Proof of Work" in the same uppercase 12px style as today. Body shows the four stats with the public-profile link as a CTA.

2b. **`src/app/dashboard/BuilderDashboardClient.tsx:64,75,84`** — remove `velocityScore` from `BuilderDashboardClientProps`, the props destructuring, and the `useState(initialScore)` hook. Add new props for the proof-of-work card data (`l1Count`, `l0Count`, `distinctHosts`, `lastShippedAt`). These flow in from `dashboard/page.tsx` via Item 2c.

2c. **`src/app/dashboard/page.tsx:80`** — replace `velocityScore={profile?.velocity_score || 0}` with the new proof-of-work data props. Compute them server-side by:
- Querying `proof_receipts` where `subject_id = profile.entity_id` (skip if `entity_id` null — the card shows the "no proof yet, post your first build" empty state).
- Counting L1 / L0 / distinct hosts (`extractHost` from `src/lib/ranking/quality-score.ts`).
- Taking max `issued_at`.

2d. **`src/app/dashboard/BuilderDashboardClient.tsx:164-170`** — replace the "Velocity Score" card render block with `<ProofOfWorkCard ...>`. Section heading changes from "Velocity Score" to "Proof of Work".

2e. **`src/app/dashboard/BuilderDashboardClient.tsx:194`** — replace GitHub card copy:
- FROM: *"Connect to prove your builds are real. Feeds 40 points into your Velocity Score."*
- TO: *"Connect to prove your builds are real. Your GitHub activity strengthens your proof-of-work record."*

2f. **`src/app/dashboard/BuilderDashboardClient.tsx:31`** — VelocityRing's internal subtitle removed along with the component (subsumed by 2a).

**Empty state:** if the user has no entity_id or zero L1 receipts, the card shows: *"Post your first build below. Your proof-of-work record starts the moment your work is verified."*

### Item 3 — atlas_confirmed → confirmed-OR-inferred on 3 reader sites

**Goal:** apply the established pattern from `src/app/p/[slug]/page.tsx:189-209` to the three sites that currently render empty.

3a. **`src/lib/atlas/roles.ts:82`** — `getRecentReceiptsAtRole` currently does `.contains('atlas_confirmed', [roleId])`. Extend to read both arrays using Supabase `or` filter:
```
.or(`atlas_confirmed.cs.{${roleId}},atlas_inferred.cs.{${roleId}}`)
```
This requires both `gin(atlas_confirmed)` and a `gin(atlas_inferred)` index to plan efficiently. **Verify before drafting the final diff:** does `gin(atlas_inferred)` exist? If not, the query falls back to a sequential scan on ~77 receipts (acceptable at current scale, but worth knowing). The fix can land without the index; Phase 5 adds the index as part of schema-of-record work.

3b. **`src/app/u/[username]/page.tsx:69`** — extend the receipt select to include `atlas_inferred`:
- FROM: `.select('id, slug, title, description, event_type, atlas_confirmed, verification_level, issued_at, artifacts')`
- TO: `.select('id, slug, title, description, event_type, atlas_confirmed, atlas_inferred, verification_level, issued_at, artifacts')`

3c. **`src/app/u/[username]/page.tsx:442-446`** — apply the precedent from `/p/[slug]:189-209`:
```jsx
{(Array.isArray(r.atlas_confirmed) && r.atlas_confirmed.length > 0) ||
 (Array.isArray(r.atlas_inferred) && r.atlas_inferred.length > 0) ? (
  <div style={...existing chip container styles...}>
    {r.atlas_confirmed.map((roleId: string) => (
      <ConfirmedChip key={`c-${roleId}`} roleId={roleId} />
    ))}
    {r.atlas_inferred
      .filter((roleId: string) => !r.atlas_confirmed.includes(roleId))
      .map((roleId: string) => (
        <InferredChip key={`i-${roleId}`} roleId={roleId} />
      ))}
  </div>
) : null}
```
Inferred chips visually distinguished from confirmed (lighter background `#fafafd` per the `/p/[slug]` precedent, or an "inferred" marker).

3d. **`src/app/og/route.tsx:48`** — extend the receipt select to include `atlas_inferred`:
- FROM: `.select('title, atlas_confirmed, verification_level, subject_id')`
- TO: `.select('title, atlas_confirmed, atlas_inferred, verification_level, subject_id')`

3e. **`src/app/og/route.tsx:64`** — change roles derivation:
- FROM: `const roles: string[] = Array.isArray(receipt?.atlas_confirmed) ? (receipt!.atlas_confirmed as string[]).slice(0, 4) : []`
- TO: combine confirmed first, then inferred-not-in-confirmed, slice to 4:
```ts
const confirmed: string[] = Array.isArray(receipt?.atlas_confirmed) ? (receipt!.atlas_confirmed as string[]) : []
const inferred: string[] = Array.isArray(receipt?.atlas_inferred) ? (receipt!.atlas_inferred as string[]) : []
const roles: string[] = [...confirmed, ...inferred.filter(id => !confirmed.includes(id))].slice(0, 4)
```
The OG image shows the first 4 roles; whether they're confirmed or inferred is not visually distinguished at the OG image level (4 small role pills, that's the design).

### Item 4 — Card 2 + Card 3 copy honesty on /join

**Goal:** what each card promises matches what clicking the card actually produces today. Phase 3 will revise Card 2 again; Phase 4 will revise Card 3 again. This is the Phase 1 honesty cut.

4a. **`src/app/join/page.tsx:314`** — Card 2 subline: **KEEP as-is.**
- Current: *"We deliver AI implementation for clients. We may also hire specialists."*
- Rationale: this describes what Card 2 will be after Phase 3 ships; it's accurate as the customer-type self-identification statement. The Phase-1 dishonesty is in the *supporting* line (4b), not the subline.

4b. **`src/app/join/page.tsx:315`** — Card 2 supporting line:
- FROM: *"Free collective supply profile. Optional Buyer Mode."*
- TO: *"Reserve your team name. Full profile editor and shipped-work display ship next."*

4c. **`src/app/join/page.tsx:328`** — Card 3 subline:
- FROM: *"I'm an agent with my own wallet, tasks, and outcomes."*
- TO: *"I'm an AI agent operating on behalf of my principal."*

4d. **`src/app/join/page.tsx:329`** — Card 3 supporting line:
- FROM: *"Free supply profile. API key issued at signup."*
- TO: *"API-keyed agent identity, principal-linked, posts builds and proof. Wallet/autonomous identity ships later."*

**Note on Card 3 visual treatment:** the dark theme with purple accents (`linear-gradient(135deg, #0f0f18, #1a1a2e)` background, `#f0f0f5` text) stays. Only text content changes.

**Note on AgentOnboarding.tsx:** verified no edits needed. The component's user-facing copy and SYSTEM_PROMPT are already honest about Phase 1 capability (API key, principal-link reference is absent because Phase 4 adds that explicitly).

### Item 5 — Agent enrichment wiring (the load-bearing structural fix)

**Goal:** `/api/v1/builds` writes proof receipts, agent-posted builds enter the ranking engine, agents appear on `/talent`.

**Design (option γ from architect-Claude analysis): API-key auth on `/api/enrich` + agent detection via `entities.kind='agent'` lookup + routing through `findOrCreateAgentEntity` for receipt subject resolution. No modification to the `profiles.entity_id ↔ entities.profile_id` link contract (which remains human-only per Spec §0).**

5a. **Add helper to `src/lib/entities.ts`:** `resolveEntityKindForOwner(admin, userId): Promise<'agent' | 'human' | null>`. Query: does an `entities` row exist for `owner_user_id=X AND kind='agent'`? If yes → return `'agent'`. Else, does one exist for `kind='human'`? If yes → return `'human'`. Else → return `null` (caller decides whether to mint).

5b. **Extend `src/app/api/enrich/route.ts` POST handler:** add dual-auth detection at the top of the handler. Pseudo-flow:

```ts
// Detect auth path: Bearer API key OR cookie session
const authHeader = req.headers.get('authorization')
let resolvedProfile: any
let resolvedUserId: string
let resolvedUserEmail: string
let isApiKeyAuth = false

if (authHeader && authHeader.startsWith('Bearer sk_ss_')) {
  // API-key path (agent enrichment trigger from /api/v1/builds)
  const apiAuth = await authenticateApiKey(req)
  if (!apiAuth.ok) return NextResponse.json({ error: apiAuth.error }, { status: apiAuth.status })
  resolvedProfile = apiAuth.auth.profile
  resolvedUserId = resolvedProfile.user_id
  resolvedUserEmail = apiAuth.auth.email
  isApiKeyAuth = true
} else {
  // Cookie-session path (existing Card 1 signup + EditProfileForm + admin re-enrich)
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  // ... existing body parsing + profile_id-or-self resolution logic unchanged ...
  resolvedUserId = user.id
  resolvedUserEmail = user.email!
  // resolvedProfile populated from existing flow
}
```

5c. **Branch entity resolution by kind:** after the profile is resolved, call `resolveEntityKindForOwner` (5a). Based on the result:
- If `'agent'` → call `findOrCreateAgentEntity(admin, targetUser)`. Set `entityId = agentEntity.id`.
- If `'human'` or `null` → call `findOrCreateHumanEntity(admin, targetUser)` as today.

The `targetUser` is constructed for API-key auth by fetching `auth.admin.getUserById(resolvedUserId)` (the API-key auth doesn't carry a `User` object).

5d. **Pass entity_id to `runRealWriteForOne`:** the adapter currently looks up entity via `findOrCreateHumanEntity` internally. For agent enrichment, the adapter needs to skip this and use the pre-resolved agent entity. Two options:
- **5d-i:** Add an optional `entity` param to `runRealWriteForOne(profileId, options?: { entity?: EntityRow })`. When provided, the adapter uses it directly; when absent, falls back to current `findOrCreateHumanEntity` behavior. Minimally invasive.
- **5d-ii:** Add an optional `entityKind` param and let the adapter route internally. More invasive but cleaner.

**Recommendation: 5d-i.** Smaller surface area, preserves the existing adapter contract for human enrichment.

5e. **`src/app/api/v1/builds/route.ts:` add enrichment trigger.** After the `posts` insert succeeds and `checkAutoVerify` runs, fire-and-forget:
```ts
import { after } from 'next/server'
// ... in POST handler, after the posts insert ...
after(async () => {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'}/api/enrich`, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('authorization')!,  // pass through the agent's Bearer key
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
  } catch (err) {
    console.warn('[v1/builds] enrichment trigger failed', err)
  }
})
```

The useless throwaway 90-day count query on line ~55 of the current builds route gets deleted in this same edit (it does nothing with the count).

5f. **Verification gate for Item 5:** after this lands, an agent with a valid API key posts a build via `/api/v1/builds`; within ~60s, a `proof_receipts` row should appear with `subject_id = agent_entity_id`. The agent should then rank on `/talent`. Item §I covers the cold-walkthrough verification.

**What this item does NOT do (deferred to Phase 4):**
- Build a dedicated `/agent/<slug>` profile page.
- Add a `kind='agent'` filter to `/talent` (agents currently rank alongside builders on the existing single facet — Phase 4 adds the type facet).
- Modify the agent's JSON-LD `@type` to be `SoftwareApplication` (still emits `Person + shipstacked:Builder` until Phase 4).
- Link `agent_profiles` table (doesn't exist yet; Phase 4 creates it).

### Item 6 — Junk profile cleanup (DDL via Dashboard, gated on SELECT)

**Goal:** three known junk profiles no longer appear in any public-listing surface.

**Hard gate: §H.1 SELECT must run first and operator must confirm results before drafting the UPDATE.**

After §H.1 confirms which of the three usernames are in fact currently `published=true`, terminal Claude drafts the matching UPDATE block (forward + reversal) using Dashboard. The DDL pattern is exactly:

```sql
-- FORWARD (only includes usernames confirmed published by §H.1 SELECT)
UPDATE public.profiles SET published = false
WHERE username IN ('paddybot130', 'batch5-test', 'hyy922') AND published = true;

UPDATE public.proof_receipts SET visibility = 'private'
WHERE subject_id IN (
  SELECT entity_id FROM public.profiles
  WHERE username IN ('paddybot130', 'batch5-test', 'hyy922') AND entity_id IS NOT NULL
);

-- REVERSAL
UPDATE public.profiles SET published = true
WHERE username IN ('paddybot130', 'batch5-test', 'hyy922');

UPDATE public.proof_receipts SET visibility = 'public'
WHERE subject_id IN (
  SELECT entity_id FROM public.profiles
  WHERE username IN ('paddybot130', 'batch5-test', 'hyy922') AND entity_id IS NOT NULL
);
```

Final exact SQL drafted at pre-flight diff time, conditioned on §H.1 actual results.

### Item 7 — Checkout session-keying for authenticated users

**Goal:** an authenticated user cannot create a subscription keyed to an email other than their auth-session email.

7a. **`src/app/api/checkout/route.ts`** — add cookie-session read at top, override `email` from session when authenticated. Full replacement (entire file is 30 lines today):

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

  // Session-keying: if the user is authenticated, override the body email
  // with the auth-session email. Prevents the email-mismatch footgun where
  // a logged-in user creates a subscription on a different email than the
  // one getEntityModes reads.
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

Note the `authed_user_id` metadata addition: the webhook can use it later (Phase 5 lifecycle test) to reconcile if email mismatch ever happens despite this fix.

7b. **`src/app/hirers/page.tsx`** — client UI: when the user is authenticated, show "Subscribing as `<email>`" instead of the email input. Disabled state with a "use a different email" sign-out link. Exact JSX to be drafted at pre-flight diff time after view of the current hirers/page.tsx checkout block (need terminal-Claude to read the surrounding UI before drafting).

### Item 8 — Defensive `getEntityModes` hardening

**Goal:** surface email↔auth drift before it becomes a paying-customer issue.

8a. **`src/lib/user.ts`** — after the `subscriptions` query in `getEntityModes`, if the subscription is null AND `user.id` is set AND there exists a `subscriptions` row matching by `user_id`-via-some-future-FK that isn't this email, log a warning. **However:** subscriptions table has no `user_id` FK today (codebase read §4 confirms). So the realistic hardening is:

After the `subscriptions` lookup, if `hasSubscription=false` AND `user.id` is set, run a follow-up query: `SELECT email FROM subscriptions WHERE email != user.email AND status='active' LIMIT 1` joined heuristically. Skip if there's no plausible match.

**Simpler version (recommended):** just add a single `console.warn` line when `hasSubscription` resolves false for a user that *has* a `user_id` populated in their profile. This surfaces the most-likely class of drift: user with profile, expected to be a customer, no sub found. Drops to logs only, no runtime impact:

```ts
// Inside getEntityModes(), after `subscription` is queried:
if (!subscription && user && profile?.user_id) {
  console.warn(`[getEntityModes] user ${user.id} (email ${user.email}) has profile but no active subscription — verify email match if expected as paying customer`)
}
```

Minimal. Logs only. Surfaces drift early.

---

## G. Out of scope (what this phase does NOT do)

Explicitly deferred to keep Phase 1 from creeping into Phases 2-5:

- **Column drops** (`profiles.velocity_score`, `hire_confirmations`, `claim_submissions`) — Phase 5.
- **Generic `<EnableHiringButton>` component** — Phase 2.
- **Team profile page, team_profiles table, `/team/[slug]`** — Phase 3.
- **Agent profile page, agent_profiles table, `/agent/[slug]`, principal-link UX** — Phase 4.
- **Type facet ("Builder/Team/Agent") on `/talent`** — Phase 3.
- **Atlas role facet on `/talent`** — Phase 4.5.
- **JSON-LD `shipstacked:atlasRole` emit on `/u/[username]`** — Phase 4.5.
- **`/atlas/roles/[id]` populated discovery surface** — Phase 4.5 (Phase 1 just fixes the empty-render bug; Phase 4.5 makes the page actually list practitioners).
- **Practitioner classification-confirm UI** — Phase 4.5.
- **Stripe lifecycle CLI test (5 scenarios)** — Phase 5.
- **Subscriptions `cancelled`/`canceled` British/American unification** — Phase 5.
- **Hardcoded Stripe price ID → env var** — Phase 5.
- **Decision back-port + 4 untracked continuity docs commit** — Phase 5.
- **`information_schema` audit / schema-of-record doc** — Phase 5.
- **Content pass (Phase 6) + target list (Phase 7) + launch (Phase 8)** — later phases.
- **Anything wallet/DID/on-chain/Moltbook/RentAHuman for agents** — D11 Phase 2, post-revenue.

**Build-map drift corrections recorded by Phase 1 verification (incorporate at Phase 5 back-port):**

- Build map said "soften AgentOnboarding wallet/autonomous language." Verification shows AgentOnboarding has no such language; the wallet/autonomous claim lives only on `/join` Card 3 subline. Phase 1 Item 4c fixes the one site.
- Build map referenced "`/api/v1/profile/route.ts:98`" as a velocity site. Confirmed — but the line also selects `velocity_score` in the `.select()`, not just returns it. Phase 1 Item 1j removes from select string.
- Build map item 5 ("`/api/v1/builds` triggers enrichment") was described as a "single-file change." Verification shows it requires changes to both `/api/v1/builds/route.ts` AND `/api/enrich/route.ts` (dual-auth path) AND `src/lib/entities.ts` (new helper) AND `src/lib/enrichment/profile-adapter.ts` (optional `entity` param). Four files. Still single-session work but worth recording the true scope.
- The `/get-found/[id]` route is live, not dead (build map / codebase read §697 implied ambiguous). Recording for Phase 5 cleanup.
- `/api/intakes/claim` route is already removed from `src/` (no grep hits). The `claim_submissions` table still exists in DB (Phase 5 drops).

---

## H. SQL / DDL drafts (Dashboard-paste, with reversal)

### H.1 Operator-paste SELECT (verification gate for Item 6)

**Run this in the Supabase Dashboard SQL Editor before Item 6 drafts its UPDATE. Paste the result back to architect-Claude.**

```sql
SELECT
  username,
  published,
  entity_id,
  verified,
  created_at
FROM public.profiles
WHERE username IN ('paddybot130', 'batch5-test', 'hyy922');

-- Also count public receipts owned by these profiles' entities
SELECT
  p.username,
  p.entity_id,
  COUNT(pr.id) AS public_receipt_count
FROM public.profiles p
LEFT JOIN public.proof_receipts pr
  ON pr.subject_id = p.entity_id AND pr.visibility = 'public'
WHERE p.username IN ('paddybot130', 'batch5-test', 'hyy922')
GROUP BY p.username, p.entity_id;
```

Architect-Claude uses the result to (a) confirm the three usernames still exist + are published, (b) decide if any of the three need to be excluded from the UPDATE (e.g., if `paddybot130` was already unpublished by some prior operator action), and (c) enumerate which `entity_id` values to flip `visibility='private'` for in `proof_receipts`.

### H.2 Junk profile cleanup UPDATE (drafted after H.1 confirms)

Pre-flight draft only. Final SQL conditioned on H.1 results.

```sql
-- FORWARD
BEGIN;
UPDATE public.profiles
SET published = false
WHERE username IN ('paddybot130', 'batch5-test', 'hyy922')
  AND published = true;

UPDATE public.proof_receipts
SET visibility = 'private'
WHERE subject_id IN (
  SELECT entity_id FROM public.profiles
  WHERE username IN ('paddybot130', 'batch5-test', 'hyy922')
    AND entity_id IS NOT NULL
);
COMMIT;

-- REVERSAL
BEGIN;
UPDATE public.profiles
SET published = true
WHERE username IN ('paddybot130', 'batch5-test', 'hyy922');

UPDATE public.proof_receipts
SET visibility = 'public'
WHERE subject_id IN (
  SELECT entity_id FROM public.profiles
  WHERE username IN ('paddybot130', 'batch5-test', 'hyy922')
    AND entity_id IS NOT NULL
);
COMMIT;
```

No schema DDL needed in Phase 1. The `velocity_score` column stays (Phase 5 drops). The `atlas_inferred` array already exists per Migration `20260515150752_proof_receipts_v0_1.sql`.

---

## I. Verification after ship (the phase-boundary gate)

Each of these must pass before Phase 1 is considered complete. Run order matters: build/type checks first, then automated invariant guard, then live cold walkthroughs.

### I.1 Build + type clean

```
npx tsc --noEmit
npm run build
```

Both must exit 0. Any error → fix or revert before proceeding.

### I.2 Invariant #8 mechanical check

```
# Against local dev server
npm run dev  # in one tab
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000

# Against production after deploy
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base https://shipstacked.com
```

Must be green on both. The script enforces:
- A2A v1.0 required fields.
- `BRAND_ALLOWLIST_FORBIDDEN` zero matches.
- Every declared example URL responds 200 (real substitutions) or 404 (probe-substitutions).
- MCP `initialize` probe round-trips successfully.

### I.3 Velocity-removal grep guard

```
grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"
```

Expected: zero matches, OR only matches that are explicitly known legitimate variable-name reuse with no relation to the killed metric. (Case-insensitive per pre-flight Flag B — the prior case-sensitive guard missed lowercase "velocity score" at api-docs:194 and the "High velocity"/"Velocity" admin strings.)

### I.4 atlas_confirmed-only-render check

Three cold-walkthrough verifications:
- Visit `/atlas/roles/A2` (or any classified role) on prod. Verify at least 1 practitioner now appears in "Recent receipts at this role." Before Phase 1: empty list. After: populated.
- Visit `/u/<a-classified-builder>` on prod. Verify Atlas role chips render under at least one receipt in the Proof of Work section. Before Phase 1: zero chips on any builder. After: chips visible on classified builders.
- Visit `/og?slug=<a-receipt-slug>` (or trigger it via a share link). Verify role pills render on the OG image. Before Phase 1: no roles. After: up to 4 roles.

### I.5 Agent enrichment end-to-end

```bash
# With a test agent API key
curl -X POST https://shipstacked.com/api/v1/builds \
  -H "Authorization: Bearer sk_ss_<test-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test agent build for Phase 1 verification",
    "outcome": "Reduced manual review time by 60% for a customer support workflow",
    "url": "https://github.com/<test-org>/<test-repo>"
  }'

# Wait ~60s for enrichment

# Query: is there now a proof_receipt with subject_id = the agent's entity_id?
# Via Supabase Dashboard:
SELECT * FROM proof_receipts pr
JOIN entities e ON e.id = pr.subject_id
WHERE e.kind = 'agent' AND e.owner_user_id = '<test-agent-user-id>'
ORDER BY pr.issued_at DESC LIMIT 5;
```

Expected: at least one new `proof_receipt` row with `subject_id = agent_entity.id`. Before Phase 1: agent posts to `/api/v1/builds` produced zero receipts indefinitely. After: agent posts trigger enrichment and produce receipts within ~60s.

Visit `/talent` and confirm the agent now appears in the directory (filtering not yet by type — that's Phase 3. But the agent should appear alongside builders since their receipts make them ranked).

### I.6 Checkout session-keying

Manual walkthrough:
- Logged out → visit `/hirers#pricing` → type any email → click subscribe → Stripe checkout email matches typed email. (Existing behavior; should not regress.)
- Logged in → visit `/hirers#pricing` → field is locked, shows "Subscribing as <my-auth-email>" → click subscribe → Stripe checkout `customer_email` matches auth-session email regardless of what was attempted in the body.

### I.7 Junk profiles gone from public surfaces

- `https://shipstacked.com/talent` — none of `paddybot130`, `batch5-test`, `hyy922` should appear.
- `https://shipstacked.com/u/paddybot130` — should 404 (`getPublishedProfile` returns null for unpublished, page calls `notFound()`).
- Same for the other two.
- `/api/builders/ranked?limit=50` — none of the three usernames in the response.

### I.8 Dashboard "Proof of Work" card renders

Log in as a builder with receipts. Visit `/dashboard`. Confirm:
- No "Velocity Score" anywhere on the page.
- "Proof of Work" card shows correct L1 count, distinct hosts, last-shipped date.
- Link to public profile works.
- GitHub card copy no longer references Velocity Score.

Log in as a builder with NO receipts. Visit `/dashboard`. Confirm empty-state copy renders.

### I.9 Card 2 + Card 3 copy live

Visit `/join` in incognito. Confirm:
- Card 2 supporting line reads: *"Reserve your team name. Full profile editor and shipped-work display ship next."*
- Card 3 subline reads: *"I'm an AI agent operating on behalf of my principal."*
- Card 3 supporting line reads: *"API-keyed agent identity, principal-linked, posts builds and proof. Wallet/autonomous identity ships later."*

### I.10 Smoke-test prod end-to-end after deploy

Cold walkthrough from incognito:
- `/` homepage renders.
- `/hirers` renders.
- `/talent` renders, no broken cards, no orphan profiles.
- `/u/<any-published-builder>` renders, role chips visible if classified, no velocity references.
- `/p/<any-receipt-slug>` renders (untouched by Phase 1; smoke test only).
- `/atlas/roles/A2` renders with at least 1 practitioner.
- `/.well-known/agent-card.json` returns valid JSON, 8 skills, all URLs live.
- `/api/mcp` responds to `initialize` correctly.

---

## J. Reversal paths

Per the discovery-first protocol, every change ships with a reversal:

- **Velocity eradication code (Items 1, 2):** `git revert <commit>`. The deleted code returns; the column was never touched.
- **atlas_confirmed reader fix (Item 3):** `git revert <commit>`. Three readers return to their `atlas_confirmed`-only state. Surfaces re-render empty (the bug-state we started from).
- **Card 2 + Card 3 copy (Item 4):** `git revert <commit>`. Old copy returns.
- **Agent enrichment wiring (Item 5):** `git revert <commit>`. The dual-auth path on `/api/enrich` disappears, the trigger in `/api/v1/builds` disappears, the new helper in `entities.ts` disappears. Existing human-enrichment path was not modified, so it continues to work.
- **Junk profile UPDATE (Item 6):** the REVERSAL SQL block in §H.2. Pasted in Dashboard. Idempotent.
- **Checkout session-keying (Item 7):** `git revert <commit>`. Returns to body-email-only behavior.
- **getEntityModes warning (Item 8):** `git revert <commit>`. Logs become silent again.

---

## K. Acceptance criteria summary

Phase 1 ships when:

1. ✅ `npx tsc --noEmit` clean.
2. ✅ `npm run build` clean.
3. ✅ `verify-agent-card.ts` green against prod.
4. ✅ Zero case-insensitive grep hits for `velocity` in `src/` (`grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"`), except known-legitimate unrelated variable reuse.
5. ✅ All three atlas_confirmed reader sites render confirmed-OR-inferred chips on prod.
6. ✅ A test agent API call to `/api/v1/builds` produces a `proof_receipts` row within ~60s.
7. ✅ Authenticated checkout cannot create a subscription on a non-session email.
8. ✅ `/u/paddybot130`, `/u/batch5-test`, `/u/hyy922` all return 404.
9. ✅ `/join` Card 2 and Card 3 copy matches §F Item 4.
10. ✅ `/dashboard` shows "Proof of Work" card, no "Velocity Score" anywhere.
11. ✅ `/atlas/roles/<a-classified-id>` lists at least 1 practitioner.

When all 11 pass, **the tin tells the truth** for Phase 1. Phase 2 starts.

---

## L. Open operator decisions before Phase 2 execution

None blocking Phase 1.

For Phase 2 (next phase): the `<EnableHiringButton>` component design will need an operator copy review when its discovery doc is drafted. Not Phase 1's concern.

---

## M. Pre-flight verification log (2026-05-26)
- HEAD f58567a, tracked tree clean, baseline tsc/build/verify-agent-card all green.
- Velocity enumeration corrected: Item 1p expanded to 4 lines (61, 148, 264, 275); Item 1q added for talent/page.tsx:53 stale comment; case-insensitive grep guard adopted in §I.3 and §K.4.
- File count corrected to 15 (was 13).
- Junk profiles confirmed published in live DB: paddybot130 (no entity), hyy922 (no entity), batch5-test (entity_id=22, 2 public receipts). Item 6's UPDATE will hit all three; the receipt-flip subquery correctly affects only entity 22's receipts.
- gin(atlas_inferred) index confirmed NOT in tracked migrations; query falls back to seq scan on ~77 receipts (acceptable at current scale). Phase 5 will add the index.
- All other discovery-doc citations verified accurate against HEAD f58567a.

### Post-ship reconciliation — commit `11e9a31` message drift (recorded 2026-05-26)

The shipped Phase 1 commit `11e9a31` carries the message *"Phase 1: honesty pass + agent enrichment wiring + checkout session-keying"* but contains **Blocks 1–5R only** (24 files). Verified against the commit: it touched **neither** `src/app/api/checkout/route.ts` **nor** `src/app/hirers/page.tsx`, and `src/lib/user.ts` has no warning line. Therefore:

- **Block 6 (junk-profile SQL)** — not run in `11e9a31`. Executed separately on 2026-05-26 via service-role script (operator-authorized), forward SQL per §H.2. Not a code commit.
- **Block 7 (checkout session-keying)** — did NOT ship. The `/api/checkout` email-mismatch footgun remained live after `11e9a31`. The fix rides in **Phase 2's commit as Item 2** (`docs/audit/DISCOVERY_phase2_buyer_mode.md`), where it is also the backstop for the authenticated `<EnableHiringButton>` path.
- **Block 8 (getEntityModes warn log)** — did NOT ship. Single-line addition; folded into Phase 2 (rides along with Item 2).

History is not rewritten (`11e9a31` is pushed). This note is the record of the message-vs-code gap; full Tier 4 reconciliation may restate it. The phrase "+ checkout session-keying" in `11e9a31` should be read as *intended-but-deferred-to-Phase-2*, not shipped-in-`11e9a31`.

### Deferred Phase 1 verifications (outstanding as of 2026-05-26)

Not run before/after the `11e9a31` ship; still open (mirrored into `docs/decisions/RESUME_HERE.md`):

1. **Agent enrichment smoke test (Block 5R §5R.5)** — no real `sk_ss_` `POST /api/v1/builds` has been run on prod to confirm receipts land with `subject_id` → a `kind='agent'` entity. Confirm with:
   ```sql
   SELECT pr.id, pr.slug, pr.subject_id, e.kind, e.slug, pr.verification_level, pr.issued_at
   FROM proof_receipts pr JOIN entities e ON e.id = pr.subject_id
   WHERE pr.issued_at > NOW() - INTERVAL '5 minutes' ORDER BY pr.issued_at DESC LIMIT 5;
   ```
   Expected: `e.kind = 'agent'`. If `human`, Block 5R is wrong — stop and report.

2. **Full §I cold walkthrough on prod** — homepage step-03 copy (no "Velocity Score"), dashboard "Proof of Work" card, Atlas role chips on `/u/<classified-builder>`, OG image role pills, `/atlas/roles/<id>` practitioner population, `/join` Card 2 + Card 3 copy, junk profiles 404 (`/u/paddybot130` etc.), and `verify-agent-card.ts --base https://shipstacked.com` green.

---

End of Phase 1 discovery doc.
