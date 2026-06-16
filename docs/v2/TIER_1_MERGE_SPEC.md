# ShipStacked — Tier 1: The Seamless V1/V2 Merge

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** Tier 0 (seed jobs retired, fabricated badge removed — shipped, commit 859dd01)
**Output:** V1 `profiles` and V2 `entities` become one identity layer. Existing users feel no pain. The duplicate-identity bug the 2026-05-16 audit traced is closed.
**Status:** The gate. Discovery-first. Read-only until Thomas approves the change plan. Nothing user-facing ships after this until it is verified.

---

## 0. Governing constraint (cite this when any decision is ambiguous)

From the handover docs, locked across multiple sessions (Doc 03 May 12, Doc 04 May 13):

> *"Additive reframe over full repositioning. V1 is NOT being pivoted out — it remains the visible foundation. Zero impact to existing users."*

Operationalized for this spec as one rule:

**THE MERGE CAN ADD. IT CANNOT SUBTRACT, MOVE, OR BREAK.**

- An existing user's profile URL never changes (`/u/aniketaslaliya801` stays `/u/aniketaslaliya801`).
- Every existing field (bio, projects, github stats, velocity_score, Build Feed posts, verified flag) still present, still rendering, after the merge.
- Leaderboard position does not move as a side effect of the merge.
- New capabilities (Atlas classification, receipt publishing, receipts on profile) are added on top — visible where they help the user, invisible where they would be noise.
- If any change risks an existing user experiencing *any* friction — a 404, a moved link, a lost project, an imposed confusing element — it does NOT ship in Tier 1, or it ships as backend-only structure with the visible surface deferred.

Every decision in this spec resolves against that rule. When in doubt: preserve, don't impose.

---

## 1. What this merge is, in one sentence

When any of the 14 real verified builders logs in, they see their same profile, same URL, same data, same leaderboard position — now backed by the V2 entity model underneath, capable of carrying Atlas-classified proof receipts, with additive improvements where they make the product better and zero friction anywhere.

---

## 2. The problem being fixed (from audit Part 3, verbatim severity)

`findOrCreateHumanEntity` (`src/lib/entities.ts:60-114`) keys only on `auth.users.id`, finds no entity (there are 0), creates a fresh one with a slug derived from `user_metadata.full_name` — NOT from `profiles.username`. Result for an existing V1 user who uses `/paste`:

- A duplicate identity is created in `entities`
- The returned `entity_canonical_url` (`/u/<new-slug>`) 404s because `/u/[username]` resolves against `profiles.username`
- Their published receipt is invisible from their real V1 profile, the Build Feed, the leaderboard

There is no FK, no resolver, no migration path linking the same human's `profiles` row and `entities` row. This spec builds that link, both directions, and backfills it for the real cohort so the link exists *before* they log in (making the next login seamless, not lazily-repaired).

---

## 3. PHASE 1 — Discovery (read-only, STOP, await Thomas approval)

Produce `docs/audit/MERGE_DISCOVERY.md`. Mutate nothing. Answer all of the following with file:line citations and exact data.

### 3.1 The two fake verified profiles

Confirmed fake by Thomas: **Jenny Peterson** and **John Chambers** — both verified, both point at Thomas's own Agent-Ox GitHub, identical 4-commit graphs (per `docs/audit/KILLERS_2026-05-16.md`).

Report:
- Their exact `profiles` rows (id, username, user_id, verified, published, created_at)
- Every surface that would currently count or display them (the leaderboard, `/talent` counts, any "verified builders" number, sitemap, any public listing)
- The existing mechanism for hiding a profile (the audit noted `profiles.published`; confirm the column and whether setting `published=false` cleanly removes a profile from ALL public surfaces, or whether some surface ignores that flag — same class of check as the Tier 0 status-filter audit)
- Confirm whether `verified` and `published` are independent — we want these flagged as not-real WITHOUT hard-deleting (reversible, data preserved, same principle as Tier 0 seed jobs)

### 3.2 The 14 real verified profiles to backfill

From `docs/audit/KILLERS_2026-05-16.md`: 14 verified-with-substantive-project profiles. The 6 confirmed killers are a subset: Aniket Aslaliya, Sunny Zheng, Emeka Eluwa, Khairul Anwar, Joe Dias, Sumit Dongardive.

Report:
- The exact list of all 14 (username, user_id, full_name, verified, published, velocity_score)
- For each: does a corresponding `auth.users` row exist and is `user_id` populated and valid? (The backfill keys on this — if any of the 14 has a null/orphan user_id, flag it; it needs special handling.)
- Confirm none of the 14 already has an `entities` row (audit said 0 entities total; re-verify at execution time in case the smoke test or anything created one)

### 3.3 The exact code paths to change

Trace and report verbatim (file:line + current code):

- `src/lib/entities.ts:60-114` — `findOrCreateHumanEntity`. The full current logic.
- `src/lib/paste/publish.ts:~165-403` — where `findOrCreateHumanEntity` is called, and what it does with the returned entity (subject_id wiring).
- `src/app/u/[username]/page.tsx` — the full current profile-page data fetch. Exactly what it queries, what it renders, what it would take to ADD a "proof receipts" section without removing or moving anything.
- The `profiles` table full schema (every column) and the `entities` table full schema (every column).
- Whether `profiles` has any spare column usable for an entity link, or whether a migration adds one. Same for `entities` → `profiles`.

### 3.4 The link mechanism — propose, don't implement

Based on 3.3, propose the exact linking mechanism. The audit offered options; evaluate them against the governing constraint (Section 0) and recommend ONE:

- **Option A:** Add `entity_id uuid` to `profiles` and `profile_id uuid` to `entities` (one-to-one, nullable, FK). Resolver enforces the link on creation/backfill. `/u/[username]` gains a join.
- **Option B:** No schema change — `findOrCreateHumanEntity` looks up `profiles WHERE user_id = $1` first and reuses `profiles.username` as the entity slug + `profiles.full_name` as display_name when found. Link is implicit via shared `user_id` / matching slug.
- **Option C:** Hybrid — implicit resolution now (Option B), explicit FK column added in same migration for durability (Option A), so the link is both enforced and queryable.

Recommend with reasoning tied to Section 0 and to "best foundation moving forward" (Thomas's stated priority). State the migration cost of each. Flag any option that risks an existing URL changing — that option is disqualified by Section 0 regardless of other merits.

### 3.5 The reciprocal: receipts on the existing profile

`/u/[username]` currently does NOT query `proof_receipts`. For the merge to be real, a receipt published by a backfilled user must appear on their existing profile page.

Report:
- Exactly how `proof_receipts` links to a subject (audit: `subject_id` → `entities.id`)
- The query that would fetch receipts for the entity linked to a given `profiles.username`
- Where on the existing `/u/[username]` page a "Proof receipts" section could be ADDED without removing, reordering, or visually disrupting the existing sections (projects, build feed, skills, github). The governing constraint: existing content stays exactly where it is; the new section is additive, placed where it reads naturally (likely near Projects, since they're conceptually adjacent).
- Whether the section should render at all when the user has zero receipts (recommend: hidden when empty, so no existing user sees a new empty box they didn't ask for — additive only when there's something to add)

### 3.6 Proactive backfill mechanics

Propose the backfill script shape (do not run it):
- Input: the 14 verified user_ids from 3.2
- For each: create an `entities` row with `kind='human'`, `owner_user_id = profiles.user_id`, `slug = profiles.username` (EXACTLY — not derived, not normalized; the existing username verbatim so the URL is preserved), `display_name = profiles.full_name`, and the link per the 3.4 mechanism
- Idempotent: re-running must not create duplicates (ON CONFLICT on owner_user_id or the link column)
- Excludes: the 2 fakes, the 8 dead accounts, all unverified — only the 14
- Dry-run mode: the script must support a `--dry-run` that reports exactly what it WOULD create without writing, so Thomas sees the 14 entity rows before they exist

### 3.7 The "additive visible improvements" surface

Thomas's directive: *"if visible updates make the product better, we add them — but existing users should feel no pain."* Propose (do not build) what an existing backfilled user could gain that is unambiguously beneficial and zero-friction. Candidates to evaluate:

- A "Proof receipts" section on their profile (empty-hidden) — additive, beneficial, the core of the merge
- A subtle prompt on their profile or dashboard: "Turn your GitHub work into verified proof — paste a repo" — beneficial for Sunny-type users (714 commits, 0 narrated projects), but evaluate whether it's friction or help; recommend it be dismissible and not a modal
- Atlas role(s) shown on their profile if their existing projects can be classified — evaluate feasibility; this may be Tier 3, flag if so
- Nothing visible yet (pure structural merge, visible surface deferred to Tier 3)

For each candidate: state whether it can ship in Tier 1 without ANY risk of friction, or whether it should defer. Recommend the minimal set that makes the product better while honoring "no pain." When uncertain, defer — a deferred improvement costs nothing; an imposed one violates Section 0.

### 3.8 Discovery report output

`docs/audit/MERGE_DISCOVERY.md` with sections A–G:
- A: the 2 fakes + neutralization plan + surfaces they touch
- B: the 14 real profiles + user_id validity check
- C: the exact code paths (verbatim current code)
- D: the recommended link mechanism (with the rejected options and why)
- E: the reciprocal receipt-surfacing plan + exact placement on `/u/[username]`
- F: the backfill script shape + dry-run output sample
- G: the recommended "additive visible improvements" set, each marked Tier-1-safe or deferred
- H: a precise, numbered Phase 2 change list — every data change and code change enumerated, each individually approvable, each reversible — so Thomas approves a concrete plan, not an intent

STOP. Report one-paragraph summary. Await explicit approval of the Section H change list before Phase 2.

---

## 4. PHASE 2 — Execution (only after Thomas approves Section H)

Execute exactly the approved Section H. Expected shape (subject to discovery):

### 4.1 Neutralize the 2 fakes (first, before backfill)

Set the existing hide mechanism (per 3.1, likely `published=false` and/or a `verified=false` flip — whatever discovery determines cleanly removes them from all public/counting surfaces) on Jenny Peterson and John Chambers. Reversible. Data preserved. They are excluded from the backfill set. Verify post-change they no longer appear in: leaderboard, `/talent` verified count, any public listing, sitemap.

### 4.2 Apply the link mechanism

Per approved 3.4. If a migration: `supabase migration new merge_profiles_entities_link`, write it, `supabase db push`, verify advisors clean (same rigor as the V2 Step 1 migrations).

### 4.3 Update `findOrCreateHumanEntity`

Rewrite so it resolves an existing `profiles` row by `user_id` BEFORE creating a new entity:
- `profiles WHERE user_id = $1` found → create/link entity using `profiles.username` as slug (verbatim) and `profiles.full_name` as display_name, write the link both directions
- not found → existing behavior (genuinely new user with no V1 profile)
- already linked → return the linked entity (idempotent)

### 4.4 Reciprocal: surface receipts on `/u/[username]`

Add the receipts section per approved 3.5. Additive only. Existing sections untouched, unmoved. Hidden when the user has zero receipts. Existing users with no receipts see a profile that is byte-for-byte the same experience as before.

### 4.5 Run the proactive backfill

- Run the script in `--dry-run` first, output the 14 proposed entity rows, include in the report
- After confirmation (the dry-run output is in the Phase 2 report; if it looks correct per the spec it proceeds — this is not a second approval gate, the gate was Section H), run for real
- Verify: 14 new `entities` rows, each `slug` EXACTLY equal to the corresponding `profiles.username`, each linked, idempotent re-run creates zero additional rows

### 4.6 Additive improvements

Ship only the approved Tier-1-safe set from 3.7. Defer the rest with a noted follow-up.

### 4.7 Verification (before commit) — named acceptance tests

The 6 killers are the acceptance tests. Against local dev (and read-only against prod DB where stated):

- **Aniket (URL preservation):** the backfilled entity for `aniketaslaliya801` has `slug = 'aniketaslaliya801'` EXACTLY. `/u/aniketaslaliya801` resolves, renders his existing profile (bio, 4 projects, github stats, velocity 100) with zero fields missing or moved. No new empty boxes (he has 0 receipts → receipts section hidden).
- **Sunny (the proof case):** `sunnyzheng606` (714 commits, 0 narrated projects) has a clean linked entity. His profile renders identically to before. If he were to publish a receipt via `/paste`, trace (don't execute) that it would attach to his existing profile via the entity link and appear in the (now-present-but-hidden-until-nonempty) receipts section at his existing URL — NOT create a duplicate, NOT 404.
- **Sumit (Part VII):** `sumitdongardive9` backfills correctly, profile intact.
- **Emeka / Khairul / Joe:** entities created, slugs verbatim, profiles intact, URLs unchanged.
- **The 2 fakes:** Jenny Peterson + John Chambers absent from leaderboard, absent from verified count, absent from public listing, NOT in the 14 backfilled entities.
- **The 8 dead accounts + all unverified:** no entity created (lazy resolution still applies if they ever act — confirm `findOrCreateHumanEntity` still handles the genuinely-new-user path).
- **Regression — existing experience unchanged:** pick one backfilled profile, capture its rendered HTML structure before (from git/prod) and after — confirm no section removed, no link changed, no URL moved. The diff should be purely additive (a hidden-or-populated receipts section) or empty.
- **V2 spine intact:** `/p/<slug>`, `/atlas/roles/<id>` HTML + JSON-LD content negotiation still green (the merge must not break what Tier 0 verified).
- **Duplicate-bug closed:** simulate the audit Part 3 scenario — a backfilled user's publish path now resolves to their existing entity, returns an `entity_canonical_url` that 200s (their real `/u/username`), receipt visible on their profile. The exact bug the audit traced is gone.
- `tsc --noEmit` clean, `npm run build` clean.

### 4.8 Commit + push

Commit message documents: the 2 fakes neutralized (with reversal SQL, per the Tier 0 precedent for data mutations), the link mechanism, the 14 backfilled (list them), the reciprocal receipt surfacing, the additive improvements shipped vs deferred, and the named acceptance test results. Push to origin/main, poll prod, verify on production (not localhost): a killer's URL still 200s and renders their profile, V2 JSON-LD still works, leaderboard count excludes the 2 fakes. Report production verification + deploy state.

Per the Tier 0 precedent: because Phase 2 mutates production data (fake-profile flags, 14 entity rows), the commit message MUST include the exact reversal SQL for every data mutation.

---

## 5. Escalate if

- Any of the 14 has a null/orphan `user_id` (backfill can't key on it — needs Thomas decision)
- The recommended link mechanism would require changing any existing URL (disqualified by Section 0 — escalate, propose alternative)
- A surface counts/displays the 2 fakes in a way the existing hide mechanism doesn't cover (needs a code change, like the Tier 0 status-filter findings)
- `/u/[username]` cannot gain a receipts section without reordering or risking existing layout (escalate — additive-only is non-negotiable; defer the visible surface if needed)
- The backfill dry-run shows any entity slug that does NOT exactly equal the source `profiles.username` (URL preservation is non-negotiable — stop, report)
- Discovery reveals an existing user-facing dependency that makes "zero pain" impossible for some change (escalate with the specific tradeoff — Thomas decides, default to deferring the change)

---

## 6. After Tier 1 ships

The identity layer is one thing. Existing users feel no pain. The duplicate-identity bug is closed. The 14 real builders have clean entities at their existing URLs. The platform is safe to point real users at — which unblocks:

- **Tier 2 follow-through:** individual outreach to the 6 killers (Aniket first per the killers report — freshest signal, most engaged)
- **Tier 3:** beacons in Doc 05 order, starting with Schema.org Person/Org/JobPosting markup. The Noah founding-beta gateway is the first consumer of the Person beacon — built as a CONSENTED collection endpoint over the verified cohort (per Thomas: "hand Noah as many as possible," filtering by per-person opt-in, not hand-curation), with CSV / URL / JSON-LD projections of one canonical machine-readable form.
- **Tier 4:** tech-debt sweep (incl. `/api/hire-confirm/*`, duplicate Stripe keys, middleware→proxy, the rest)

Tier 1 is the gate. Nothing user-facing past this point ships until Tier 1's production verification is green.

---

*End of Tier 1 spec.*
