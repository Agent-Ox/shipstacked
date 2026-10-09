# Tier 4 — Reconciliation + Tech-Debt Sweep — DISCOVERY (Phase 1)

**Author:** Claude (Opus 4.7, 1M context) — read-only discovery
**Date:** 2026-05-17
**Spec:** `docs/v2/TIER_4_RECONCILIATION_SPEC.md` §4
**Status:** Phase 1 complete. STOP. Awaiting explicit Section H (PHASE A ONLY) approval.
**Governing principles (Spec §0, §3, §6):** the Phase A / Phase B wall is absolute; Phase A approval is NOT Phase B approval; every reconciliation claim verified against live prod or current code right now (not asserted from drifted prior docs); every doc proposed for committing must be brand-free / secret-free / no strategic content because committing it makes it permanent history.
**Method:** read-only. Re-verified each ledger item by `curl` against prod or `grep`/read against the working tree right now. Mechanically grepped every `docs/audit/` file against the standing brand allowlist + env-var-name patterns. Performed read-only SELECT-only investigation of Phase B production-data items. No DB mutation, no repo files modified except this report.

---

## ⚠️ TWO §6 ESCALATIONS SURFACED IN PHASE 1 — REPORTED, NOT ACTED ON

### Escalation #1 — Brand-allowlist hits in 6 of 10 `docs/audit/` files

Per Spec §6: *"Any `docs/audit/` file proposed for committing contains a secret / partner / strategic content — STOP, do not commit it, report (the brand-free rule applies to history too)."* The mechanized grep against the Beacon-2 `BRAND_ALLOWLIST_FORBIDDEN` allowlist surfaced forbidden-token occurrences in 6 of the 10 discovery docs sitting in `docs/audit/`. Categorized:

| File | Hit class A (person/founder names in strategic context) | Hit class B (commercial brand names) | Hit class C (peer-product tool names — adoption context) | Hit class D (collection-slug strings) |
|---|---:|---:|---:|---:|
| `BEACON_1_DISCOVERY.md`              | 9 | 0 | 0 | 0 |
| `BEACON_2_DISCOVERY.md`              | 4 | 1 | 0 | 1 |
| `BEACON_3_DISCOVERY.md`              | 5 | 1 | 12 | 3 |
| `BEACON_4_DISCOVERY.md`              | 0 | 0 | 0 | 0 |
| `BEACON_5_DISCOVERY.md`              | 0 | 0 | 0 | 0 |
| `GATEWAY_DISCOVERY.md`               | 4 | 0 | 0 | 37 |
| `KILLERS_2026-05-16.md`              | 0 | 0 | 2 | 0 |
| `MERGE_DISCOVERY.md`                 | 0 | 0 | 0 | 0 |
| `SEED_JOB_TEARDOWN_DISCOVERY.md`     | 0 | 0 | 0 | 0 |
| `SITE_AUDIT_2026-05-16.md`           | 8 | 1 | 9 | 0 |

(Specific tokens enumerated to Thomas in the chat-only report accompanying this discovery — not transcribed here so this discovery doc itself stays brand-clean and committable.)

Hit-class semantics:
- **Class A (person/founder names in strategic context)** — names of specific individuals where the surrounding paragraph discusses commercial intent or persona-as-target.
- **Class B (commercial brand names)** — names of commercial entities/programs the project has commercial-adjacent context for.
- **Class C (peer-product tool names — adoption context)** — names of other AI-coding tools, cited as the agents.md convention's adoption list (factual, not endorsement).
- **Class D (collection-slug strings)** — specific historical/test collection slugs, forbidden by the brand-free rule that says collections are data not names.

Per Spec §6: I do **NOT** propose committing the 6 dirty files. Section H proposes committing **only the 4 clean files**. Thomas decides separately what to do with the 6 dirty ones (Option set in §B.3 below).

### Escalation #2 — `/api/hire-confirm/*` is NOT truly dead

Per Spec §6: *"Phase B investigation reveals the items are riskier/more entangled than 'deferred cleanup' implies — report fully; still do not execute."* The Tier 0 commit message described `/api/hire-confirm/*` as "known likely-dead." Read-only investigation right now finds:

- **`src/app/admin/AdminActions.tsx:13`** — admin UI actively `fetch`'s `/api/hire-confirm/nudge` (POST cron-style nudger).
- **`src/app/admin/page.tsx:36`** — admin page actively queries `hire_confirmations` table.
- **`src/app/api/hire-confirm/nudge/route.ts:6`** — contains a hardcoded constant `CRON_SECRET = '<ROTATED_CRON_SECRET_REDACTED>'` (a secret-in-committed-code, separate concern from removal).
- **`hire_confirmations` table state on prod:** 0 total rows, 0 confirmed (verified via read-only count query). The table is *empty* but the endpoints + admin UI references + the cron-secret leak are *not*.

The "dead endpoints" framing in the Tier 0 commit was a planning assumption that doesn't survive verification. Removing the endpoints alone would break the admin UI inbound references. This is more entangled than the spec's framing implies — fully reported in §D.2 below; still **not executed**.

---

## SECTION A — Reconciliation ledger (verified live, all 5 items)

For each: record-said / reality-verified-right-now / proposed record-correction. **Every item has been re-verified against live prod or current code in this Phase 1; none of the prior discovery docs were trusted as source-of-truth.**

### A.1 — Tier 0 seed-jobs: 308 vs 404 (RECORD DRIFT, CODE CORRECT)

- **Record said** (commit `859dd01`): *"All 24 jobs… flipped from status='active' to status='paused'… `src/app/jobs/[id]/page.tsx`: server-component `permanentRedirect('/jobs')` for any job not status='active'. Returns HTTP 308."*
- **Reality verified** (live prod curls 2026-05-17, IDs 1, 2, 5, 8, 12, 20, 24): all return **HTTP 404**.
- **Code reality** (verified): `src/app/jobs/[id]/page.tsx:48-49` reads `if (!job) notFound(); if (job.status !== 'active') permanentRedirect('/jobs')` — both branches alive. Seed-job rows were hard-deleted from the DB after the commit shipped, so the `notFound()` branch fires before the `permanentRedirect` can. Code is correct; DB state diverged from the commit message's described state.
- **Proposed correction:** add a reconciliation note in `TIER_4_RECONCILIATION.md` documenting: the commit's described soft-delete-with-308 was not the final DB state; rows were subsequently hard-deleted; live behavior is 404; code preserves both branches; no code change needed.

### A.2 — Beacon 4 "44 vs 40" role count (RECORD DRIFT, CODE CORRECT)

- **Record said** (`BEACON_4_DISCOVERY.md` narrative): *"v0.4 narrative; 44 roles."*
- **Reality verified** (parser run right now on `src/content/atlas-v04.md` via `parseAtlas`): **40 v0.4 roles, 34 v0.3 roles.** Live prod `/atlas/roles/<id>.json` for every role in the package data matched verify-mcp.ts's Layer-2 proof at commit `5f1a875` (40 + 34 = 74 roles compared, all PASS).
- **Root cause** (already known per the Beacon 4 ship handoff): the BEACON_4 discovery doc used a regex that double-counted some markdown matches; the actual parser output is 40.
- **Proposed correction:** reconciliation note documenting: narrative count was an arithmetic artifact; parser + live + package all agree on 40 (v0.4) and 34 (v0.3); no code change needed.

### A.3 — Beacon 5 class-name in discovery doc (RECORD DRIFT, CODE CORRECT)

- **Record said** (`BEACON_5_DISCOVERY.md` §C.3 + §D.3): collections module throws `CollectionNotFoundError` for missing AND inactive slugs.
- **Reality verified** (read right now of `src/lib/collections/context.ts:57-63`): the actual exported class is **`CollectionGateError`** (with `this.name = 'CollectionGateError'` set at line 61). The class is correctly handled in the shipped MCP server (`src/lib/mcp/schemas.ts` `toSafeError` pattern-matches against `'CollectionGateError'` — verified by the post-deploy PROD `verify-mcp.ts` run that returned 31/0 with the correct safe `"Collection not found"` message).
- **Proposed correction:** reconciliation note documenting: discovery doc used the wrong class name (`CollectionNotFoundError`); actual class is `CollectionGateError`; shipped MCP code uses the correct name; the first local verify-mcp run caught this as a real test failure, which is exactly the mechanism that prevented it from shipping wrong. No code change needed.

### A.4 — Beacon 3 housekeeping (HOUSEKEEPING, NOT-A-DRIFT)

- **Record said** (Beacon 3 §G.5): the audit-trail commit + `.gitignore .claude/` are deferred to Tier 4.
- **Reality verified** (`git status` right now): `docs/audit/` and `.claude/` are both untracked.
- **Proposed plan:** see §B below. **Partial only** — see Escalation #1: only the 4 brand-clean audit docs are proposed for commit; the 6 dirty docs are flagged and stay untracked pending a separate decision.

### A.5 — Inline-fetcher debt closure (CLOSED, RESOLUTION-CONFIRMED)

- **Record said** (Beacon 5 §G.5): the `/u/[username]` page's inline published-gated fetcher should be extracted; *"this happens IN Phase 2 H4 if Option B is approved."*
- **Reality verified** (right now): `src/lib/profiles.ts` exists (2,365 bytes); `src/app/u/[username]/page.tsx:3` imports `getPublishedProfile`; lines 13 and 32 call it. Extraction shipped at commit `5f1a875` with a byte-identical proof (SHA-256 `9df26212fd4dbf7fd3db0b91a22a4f514862e4a82a8a8ea9c5842748f8f19866`, 1,503 bytes baseline === extracted).
- **Proposed correction:** mark CLOSED in `TIER_4_RECONCILIATION.md` with the closing-commit reference (`5f1a875`).

---

## SECTION B — Housekeeping plan + the brand-free/secret-free audit of every doc proposed for commit

### B.1 Files PROPOSED for commit (the brand-clean 4 + the new reconciliation doc + this discovery doc)

| File | Brand allowlist | Env-var leak | Strategic context | Proposed |
|---|:---:|:---:|:---:|:---:|
| `docs/audit/BEACON_4_DISCOVERY.md` | clean (0 hits) | clean | none — technical-only | **commit** |
| `docs/audit/BEACON_5_DISCOVERY.md` | clean (0 hits) | clean | none — technical-only | **commit** |
| `docs/audit/MERGE_DISCOVERY.md` | clean (0 hits) | clean | none — technical-only | **commit** |
| `docs/audit/SEED_JOB_TEARDOWN_DISCOVERY.md` | clean (0 hits) | clean | none — technical-only | **commit** |
| `docs/audit/TIER_4_DISCOVERY.md` (this file) | will-verify-before-commit | clean | none | **commit** |
| `docs/audit/TIER_4_RECONCILIATION.md` (to be written in Phase 2) | will-write-brand-clean | will-be-clean | none | **commit** |

Six files in total proposed for commit under Phase A.

### B.2 Files NOT PROPOSED for commit (the brand-dirty 6 — pending separate decision)

| File | Brand hits | Recommendation |
|---|---|---|
| `docs/audit/BEACON_1_DISCOVERY.md` | 9 Class-A hits | KEEP LOCAL — do not commit in Phase A |
| `docs/audit/BEACON_2_DISCOVERY.md` | 6 mixed-class hits | KEEP LOCAL |
| `docs/audit/BEACON_3_DISCOVERY.md` | 21 mixed-class hits | KEEP LOCAL |
| `docs/audit/GATEWAY_DISCOVERY.md` | 41 mixed-class hits (mostly Class D) | KEEP LOCAL |
| `docs/audit/KILLERS_2026-05-16.md` | 2 Class-C hits | KEEP LOCAL |
| `docs/audit/SITE_AUDIT_2026-05-16.md` | 18 mixed-class hits | KEEP LOCAL |

These files remain on disk, untracked, available to Claude in future sessions and to Thomas at any time, but **NOT committed to git history**. Per Spec §6, the brand-free rule applies to permanent history.

### B.3 Options for the 6 dirty docs (Thomas decides; not in Phase A scope)

| Option | Description |
|---|---|
| **α (recommended)** | Leave the 6 dirty docs untracked indefinitely. They served their purpose during development. Future sessions still have access via the local working tree. Zero history pollution. |
| β | Sanitize each dirty doc (redact specific tokens to `<REDACTED>`) and commit the sanitized versions. Preserves audit trail in history; loses some readability where redactions remove context. |
| γ | Defer the entire question to a future "Tier 5 / archival cleanup" cycle with its own scope. |

Recommendation: α. The brand-clean 4 + the two new Tier 4 docs are enough audit trail to justify every shipped invariant; the dirty 6 are working notes that don't need to be permanent.

### B.4 `.gitignore` addition

```
.claude/
```

Single-line addition to existing `.gitignore`. Stops the local-only `.claude/` dir (per-machine permissions + scheduled-tasks lock) from ever being accidentally staged. Verified the dir is untracked currently; verified no other file paths reference it.

### B.5 `git revert` cleanliness

If `git revert <tier-4-sha>` is run: the 6 newly-committed files (4 clean audit docs + 2 Tier 4 docs) disappear from history; the `.gitignore` line is removed (so `.claude/` would re-appear as untracked, harmless). No runtime impact (no code touched), no DB impact (no SQL run).

---

## SECTION C — Confirmation: reconciliation corrects records, NO code/production bug found

Re-verified read-only against live prod + current code. **No real code/production bug surfaced** during this Phase 1. All 5 ledger items are documentation-only drifts. The shipped code in every case is correct (Tier 0 jobs route preserves both branches; Beacon 4 parser emits correct counts; Beacon 5 toSafeError handles `CollectionGateError`; Beacon 3 housekeeping has no code; Beacon 5 extraction shipped with byte-identical proof). Per Spec §3, no code-fix-under-cover-of-reconciliation; if any were needed, that would be a §6 escalation. None were needed.

---

## SECTION D — Phase B scoped proposals — **NOT AUTHORIZED BY THIS SPEC. PROPOSAL ONLY. SEPARATE DECISION REQUIRED.**

### D.1 — `thomasoxlee198` (NULL `user_id` profile row)

**Read-only investigation (verified via SELECT against prod DB right now, 2026-05-17):**

The row exists with these fields:
- `id`: `15ed3a1b-1abf-480c-b10c-9aecee4b60cb`
- `username`: `thomasoxlee198`
- `full_name`: Thomas Oxlee
- `user_id`: **NULL**
- `published`: `true`
- `verified`: `true`
- `role`: AI Automation Engineer
- `entity_id`: **NULL** (not linked to a V2 entity)

**Aggregate context:**
- Exactly **1 profile** in the entire `profiles` table has NULL `user_id` (this one).
- **Zero entities** rows reference this profile (no `entities.profile_id = 15ed3a1b-...`).
- Live page render verified: `/u/thomasoxlee198` returns **HTTP 200** on prod (the published gate passes; the page renders via the shared `getPublishedProfile` fetcher which doesn't filter on `user_id`).
- No grep hits for the string `thomasoxlee198` in any code file (only in the Tier 4 spec itself).

**Honest options (each with exact change + exact reversal SQL; NONE EXECUTED):**

| Option | Change | Reversal SQL | Risk | Recommendation |
|---|---|---|---|---|
| **A (lowest-risk default)** | **Leave as-is.** No change to data or code. | n/a — nothing changed | Zero. Page renders. Published gate works. Tier 1 backfill chose to defer; that choice has held without issue. | **Recommend A.** |
| B | Link to Thomas's auth-user via `UPDATE profiles SET user_id = '<thomas-auth-user-id>' WHERE id = '15ed3a1b-1abf-480c-b10c-9aecee4b60cb' AND user_id IS NULL` (the IS NULL guard makes it idempotent and self-aborting if already linked). | `UPDATE profiles SET user_id = NULL WHERE id = '15ed3a1b-1abf-480c-b10c-9aecee4b60cb'` | Low. Enables future login-as-this-profile flows. Requires Thomas's auth-user-id (not investigated here; Thomas knows it). Could be a precondition for some V2 capability later. | Consider only when a specific feature requires it. |
| C | Backfill an `entities` row + link via `INSERT INTO entities (...) VALUES (...); UPDATE profiles SET entity_id = <new-entity-id> WHERE id = '15ed3a1b-...'` | `DELETE FROM entities WHERE id = <new-entity-id>; UPDATE profiles SET entity_id = NULL WHERE id = '15ed3a1b-...'` | Medium. Adds V2-entity parity with the 17 builders backfilled at Tier 1. Spec parallel to Tier 1 H3 logic. Requires fresh discovery on what cluster/role/external_id this entity should have. | Only if/when a feature demands V2-entity parity for the founder profile. |
| D | Delete the profile row (`DELETE FROM profiles WHERE id = '15ed3a1b-...'`). | Requires backup-and-restore — not a single-statement reversal. Effectively non-reversible without point-in-time recovery. | **HIGH.** Removes `/u/thomasoxlee198` (currently 200). Likely loses inbound links. | **Do not recommend.** |

**My recommendation: Option A** — leave as-is. The profile is functional, published, verified, and the NULL `user_id` has not caused any observable issue across 9 ships. The "deferred at Tier 1" framing in the spec is correct: defer continues to be the right call until a specific feature requires linking.

### D.2 — `/api/hire-confirm/*` (the Tier 0 "dead endpoints")

**Read-only investigation:**

Files that exist:
- `src/app/hire-confirm/page.tsx` (HTML thank-you page after confirmation)
- `src/app/api/hire-confirm/route.ts` (GET — confirms a hire by id+role)
- `src/app/api/hire-confirm/count/route.ts` (GET — returns count of confirmed hires)
- `src/app/api/hire-confirm/nudge/route.ts` (POST — cron-style nudge endpoint; hardcoded CRON_SECRET)

**Inbound references (NOT dead):**
- `src/app/admin/AdminActions.tsx:13` — admin UI POSTs `/api/hire-confirm/nudge`.
- `src/app/admin/page.tsx:36` — admin page queries the `hire_confirmations` table.

**DB state (verified):** `hire_confirmations` table has **0 rows** total, 0 confirmed. The Tier 0 commit message's "table has 0 rows" assertion still holds.

**The §6 escalation finding (per Spec §6):** these endpoints are NOT "truly dead." They're "0-rows-but-still-wired-into-admin-UI dead." Removing them in isolation breaks the two admin UI inbound references. The Tier 0 "known likely-dead" framing was a planning assumption; verification disproves it.

**Adjacent finding (separate concern, not a removal-blocker):** `src/app/api/hire-confirm/nudge/route.ts:6` contains a hardcoded `CRON_SECRET = '<ROTATED_CRON_SECRET_REDACTED>'`. This is a secret in committed code. Low-criticality (gates a single email-nudger endpoint), but per the standing brand-free / no-secrets rule, secrets do not belong in committed source. Same concern applies whether the endpoints stay or go.

**Honest options (each with exact change + exact reversal; NONE EXECUTED):**

| Option | Change | Reversal | Risk | Recommendation |
|---|---|---|---|---|
| **A (lowest-risk default)** | **Leave entirely.** No file or table changes. | n/a | Zero. Endpoints stay; admin UI keeps working; the (empty) table stays; the cron-secret leak stays. | **Recommend A** — defer to a separate cycle when there's appetite to also touch admin UI. |
| B | Remove just the cron-secret leak: replace the hardcoded `CRON_SECRET` with a `process.env.CRON_SECRET!` read; add `CRON_SECRET=…` to Vercel env vars; rotate the value. | Restore the hardcoded constant + revert env var. Single-file revertible. | Low — addresses the secret-in-code issue without touching functionality. | A reasonable standalone fix-in-place — but still NOT this beacon's scope; would need its own cycle. |
| C | Remove the endpoints + the admin UI references + drop the (empty) `hire_confirmations` table. Multi-file + DDL change. | Restore files (git revert), restore the table via the SQL preserved in the reversal block. | Medium — touches admin UI + DDL. Requires admin-UI behavior decision (what does AdminActions show when the action doesn't exist?). | Only if/when admin UI is being reworked anyway. Not before. |
| D | Remove only the empty table; leave the endpoints as no-ops that return empty data. | `CREATE TABLE hire_confirmations (...)` from the original migration. | High coupling: endpoints would silently fail or return 0 forever; no win. | **Do not recommend.** |

**My recommendation: Option A** — leave entirely; the cron-secret leak (Option B) is a defensible standalone fix-in-place item but **NOT in this beacon's scope**, and should be its own micro-cycle if Thomas wants to address it. Per Spec §6 *"still do not execute"*: even though Option B is small, it is a code change to an existing surface and warrants its own decision.

### D.3 — Phase B summary header

> **PHASE B — NOT AUTHORIZED BY THIS SPEC. PROPOSAL ONLY. SEPARATE DECISION REQUIRED.**
>
> Both D.1 (thomasoxlee198) and D.2 (hire-confirm) are presented as scoped read-only investigations + option enumeration with exact reversal SQL/diffs. NEITHER will be executed in Phase 2 of this spec. Phase A approval is NOT Phase B approval. If Thomas wants to pursue any Phase B option, that is its own discovery-first cycle with its own gate.
>
> **My recommendation for both: Option A (leave as-is for both).** The Tier 1 + Tier 0 deferrals were correct calls; verification reaffirms them.

---

## SECTION E — Confirmation: Phase A modifies no Beacon/Collections/V2 behavior, no production data, no single source

Phase A's mutations are limited to:
1. **NEW file** `docs/audit/TIER_4_RECONCILIATION.md` (the per-item reconciliation record — written in Phase 2).
2. **NEW file** `docs/audit/TIER_4_DISCOVERY.md` (this discovery doc — already on disk; would be staged in Phase 2).
3. **NEWLY-TRACKED** 4 brand-clean discovery docs (BEACON_4, BEACON_5, MERGE, SEED_JOB_TEARDOWN) — content byte-unchanged.
4. **MODIFIED** `.gitignore` — add `.claude/` line.

**No existing tracked source file is modified.** Phase A's `git diff --stat` (excluding new files): one line added to `.gitignore`, nothing else. Beacon 1 `person.ts` byte-unchanged (the invariant since `0ceb69a` — now into its 7th commit running). All Beacon 2-5 / V2 / Collections / Atlas modules unchanged. `AGENTS.md`, `CLAUDE.md`, `src/middleware.ts` unchanged.

**No production data is mutated** in Phase A (no SQL of any kind; the read-only SELECTs done in Phase 1 are not in Phase 2).

**No Phase B item is executed** — explicitly confirmed at the Phase 2 H6 gate.

---

## SECTION F — Entanglement check (Phase A/B wall)

**No Phase A item entangles with a Phase B mutation.** Each of the 5 ledger items closes via a record-correction only:
- A.1 (Tier 0 seed-jobs) — reconciliation note documents the divergence. No DB touch.
- A.2 (Beacon 4 count) — reconciliation note documents the arithmetic artifact. No code touch.
- A.3 (Beacon 5 class name) — reconciliation note documents the discovery-doc error; shipped code is correct.
- A.4 (housekeeping) — commit 4 docs + `.gitignore` line; the 6 dirty docs stay untracked per Escalation #1.
- A.5 (inline-fetcher debt) — already closed at `5f1a875`; reconciliation note marks it.

**No Phase A item requires production-data mutation to close. Wall holds.**

---

## SECTION G — Findings & surprises surfaced during verification (flagged, not fixed)

### G.1 (Escalation #1) — 6 of 10 `docs/audit/` files contain brand-allowlist hits

Detailed in the top-of-doc escalation banner + §B.2. Per Spec §6, those files are NOT proposed for commit. Phase A commits only the 4 clean ones + the 2 new Tier 4 docs.

### G.2 (Escalation #2) — `/api/hire-confirm/*` is more entangled than "deferred cleanup" implies

Detailed in §D.2. Admin UI inbound references; cron-secret in committed code. Reported, not acted on.

### G.3 — Hardcoded `CRON_SECRET` in `src/app/api/hire-confirm/nudge/route.ts:6`

`const CRON_SECRET = '<ROTATED_CRON_SECRET_REDACTED>'`. Low-criticality cron-only token, but a secret-in-committed-code by definition. The brand-free + no-secrets rule's standing form. **Flagged, NOT fixed in this beacon** (would be Phase B Option B — its own decision). Not unique to this beacon's work.

### G.4 — One profile row with NULL `user_id` and zero entity link (`thomasoxlee198`)

Detailed in §D.1. Page renders fine; published gate works. Functional but architecturally incomplete. Recommend leave as-is.

---

## SECTION H — Proposed Phase 2 change list — **PHASE A ONLY**

Each item individually approvable. **Section H approval authorizes PHASE A ONLY. Phase B (the §D scoped proposals) remains pending a separate decision and is NOT approved by approving Section H.**

### **H-DECISION — Brand-dirty audit docs (Escalation #1)**

> Choose ONE for the 6 brand-dirty `docs/audit/` files (BEACON_1, BEACON_2, BEACON_3, GATEWAY, KILLERS, SITE_AUDIT):
> - **α (recommended)** — leave untracked (current state); not committed in Phase A; no further action.
> - β — sanitize each (redact tokens to `<REDACTED>`) and commit sanitized versions (separate Phase A2 / its own scope).
> - γ — defer entire question to its own future cycle.

### H1 — Write `docs/audit/TIER_4_RECONCILIATION.md`

The consolidated per-item reconciliation record. Brand-clean by construction (token names absent; uses category-and-count phrasing matching this discovery doc). Six sections, one per ledger item, plus a summary header noting that the shipped code was correct in every case and only the records drifted. Includes the verification command outputs from this Phase 1 inline so future readers can re-verify.

### H2 — Commit the 4 brand-clean audit docs to git history

`git add docs/audit/BEACON_4_DISCOVERY.md docs/audit/BEACON_5_DISCOVERY.md docs/audit/MERGE_DISCOVERY.md docs/audit/SEED_JOB_TEARDOWN_DISCOVERY.md`. These are the discovery docs whose content can ship to permanent history (re-verified brand-clean and env-var-clean immediately before the commit; same audit as the gate).

### H3 — Commit the 2 new Tier 4 docs

`git add docs/audit/TIER_4_DISCOVERY.md docs/audit/TIER_4_RECONCILIATION.md`. (This file + the new reconciliation record.)

### H4 — Add `.claude/` to `.gitignore`

Single-line addition. Re-verify `.claude/` is untracked before the change; re-verify after that `git status` no longer lists `.claude/` as untracked.

### H5 — Verification (before commit)

- Each reconciliation note in `TIER_4_RECONCILIATION.md` matches the verified reality (re-check live prod + code right before commit — same rigor that caught the drifts).
- Each of the 6 docs being committed to history (4 prior + 2 new) is re-grepped against the full Beacon-2 brand allowlist + env-var-name patterns immediately before the commit. ZERO hits required.
- `git status`: only the 6 newly-tracked docs + the `.gitignore` line. No Beacon/Collections/V2 source touched. `src/lib/jsonld/person.ts` byte-unchanged (7+ commits running).
- **No production data mutated. No Phase B item executed** (explicit confirmation in the commit message).
- `tsc --noEmit` clean (a docs-and-gitignore-only commit shouldn't affect this but verified).
- `npm run build` clean.
- Prior-tier prod regressions intact (the standard 5-curl spot-check: `/atlas/roles/A1.json` 200, `/u/jennypeterson224` 404, `/u/aniketaslaliya801` 200, `/collections/nonexistent` 404, `/.well-known/agent-card.json` 200; plus a quick `/api/mcp` initialize POST 200).
- Site behavior byte-unchanged (no source touched in Phase A).

### H6 — Commit + push

Commit message documents: the 5 ledger items (record-said → reality → correction); the housekeeping (4 audit docs + 2 Tier 4 docs committed; `.claude/` ignored); the 6 docs deliberately NOT committed per Escalation #1; explicit confirmation NO production data was touched and Phase B was NOT executed (only scoped in §D, awaiting a separate decision); the 2 §6 escalations (Escalation #1 + Escalation #2) surfaced and reported; brand-free + env-var-free audit of every committed doc; `git revert` reverses cleanly. Push, poll prod, confirm site byte-unchanged, report.

### H7 — Explicit non-goals (Phase A ONLY)

- ❌ Does NOT commit the 6 brand-dirty audit docs to history.
- ❌ Does NOT execute either Phase B item (D.1 or D.2).
- ❌ Does NOT touch `src/app/api/hire-confirm/*` (including the cron-secret leak — separate decision).
- ❌ Does NOT touch the `thomasoxlee198` row, the `hire_confirmations` table, or any production data.
- ❌ Does NOT modify any Beacon 1-5 / V2 / Collections / Atlas / middleware source.
- ❌ Does NOT modify CLAUDE.md or AGENTS.md.
- ❌ Does NOT run `npm publish` (Beacon 4's package remains publish-ready but unpublished).

---

## Sources verified during this discovery (read-only)

- **Tier 0 live behavior:** `curl -sI -L https://shipstacked.com/jobs/{1,2,5,8,12,20,24}` — all 404.
- **Beacon 4 parser counts:** ran `parseAtlas` from `src/lib/atlas/parse.ts` against `src/content/atlas-v04.md` and `atlas-v03.md` — 40 v0.4, 34 v0.3.
- **Beacon 5 class name:** `grep -n "class.*GateError\|this.name" src/lib/collections/context.ts` — `CollectionGateError` at line 57, name set at line 61.
- **Beacon 3 housekeeping state:** `git status --short | grep -E "^\?\? (docs/audit/|\.claude/)"` — both untracked.
- **Inline-fetcher debt closure:** `ls -la src/lib/profiles.ts` (2,365 bytes); `grep -n "getPublishedProfile" src/app/u/[username]/page.tsx` (import + 2 callsites).
- **Brand-free audit of all 10 `docs/audit/` files:** per-file `grep -ic` against the 15-token Beacon-2 allowlist.
- **Env-var-name grep across `docs/audit/`:** zero leakage.
- **`thomasoxlee198` profile row:** SELECT from `profiles` table via service-role admin client (read-only), 2026-05-17. Confirmed NULL `user_id`, `published=true`, `entity_id=null`, exactly 1 row in entire table with NULL `user_id`.
- **`hire_confirmations` table state:** SELECT count from `hire_confirmations` via service-role admin client, 2026-05-17. 0 rows total, 0 confirmed.
- **`/api/hire-confirm/*` inbound refs:** `grep -rnE "hire-confirm|hire_confirm" src/ scripts/ supabase/` — admin UI references found in `src/app/admin/AdminActions.tsx:13` and `src/app/admin/page.tsx:36`.
- **Hardcoded cron-secret:** `grep -n "CRON_SECRET\s*=" src/app/api/hire-confirm/nudge/route.ts` — line 6.
- **`/u/thomasoxlee198` page render:** `curl -s -o /dev/null -w "%{http_code}" https://shipstacked.com/u/thomasoxlee198` — 200.

---

*End of Phase 1 discovery. STOP. Awaiting Thomas's review of:*
- *Section H change list (Phase A items, item-by-item or as-a-whole approval).*
- *H-DECISION on the 6 brand-dirty audit docs (α recommended — leave untracked).*
- *Explicit acknowledgement that Phase B (§D) remains pending a separate decision and is NOT approved by approving Section H.*

*Before Phase 2.*
