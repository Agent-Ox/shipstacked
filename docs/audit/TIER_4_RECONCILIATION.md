# Tier 4 — Reconciliation Record (Phase A)

**Date:** 2026-05-17
**Commit:** (this commit)
**Spec:** `docs/v2/TIER_4_RECONCILIATION_SPEC.md`
**Discovery:** `docs/audit/TIER_4_DISCOVERY.md`
**Status:** Phase A reconciliation + housekeeping. Phase B explicitly NOT executed (recorded as findings only — see §F).

This document is the consolidated record of the 5-item state-vs-record reconciliation that ran in Tier 4. **In every case the shipped code was correct; the written record drifted. No code change closed any item.** Verification commands and their actual outputs are inlined so future readers can re-verify against live prod / current code without trusting this doc as source-of-truth — same rigor that caught the original drifts.

This doc is brand-clean by construction (no allowlist tokens, no env-var names, no strategic content) so it is safe to commit to permanent history.

---

## A — The 5 reconciled items

### A.1 Tier 0 seed-jobs: commit message said 308; live is 404

**What the record said.** Commit `859dd01` (Tier 0 seed-job teardown) described soft-deleting all 24 seed jobs by flipping `status` from `'active'` to `'paused'`, with `src/app/jobs/[id]/page.tsx` returning HTTP 308 (`permanentRedirect('/jobs')`) for any non-active job.

**What live production actually does** (verified by `curl` 2026-05-17):
```
/jobs/1   → 404
/jobs/5   → 404
/jobs/12  → 404
/jobs/24  → 404
```

**Why** (root cause). After the Tier 0 commit shipped, the seed-job rows were subsequently hard-deleted from the `jobs` table. The code at `src/app/jobs/[id]/page.tsx:48-49` preserves both branches:
```
48:  if (!job) notFound()
49:  if (job.status !== 'active') permanentRedirect('/jobs')
```
With no row present, the `notFound()` branch fires before the `permanentRedirect` can. The 308 path is alive in code but has no qualifying rows.

**Correction.** None to code. Future readers of commit `859dd01` should understand: the described soft-delete + 308 was the intermediate state; the live end state is 404 (hard-deleted). The route's two-branch logic is correct and unchanged.

---

### A.2 Beacon 4 role count: discovery doc narrative said 44; reality is 40

**What the record said.** `BEACON_4_DISCOVERY.md` narrative mentioned "44 v0.4 roles."

**What the code / data actually produces** (verified by running the shared parser `parseAtlas` from `src/lib/atlas/parse.ts` against `src/content/atlas-v04.md` 2026-05-17):
```
v0.4: 40 roles parsed
v0.3: 34 roles parsed
```

**Why.** The discovery doc used an early grep regex that double-counted some markdown lines. The actual parser is unaffected — it emits 40, the live `/atlas/roles/<id>.json` endpoints serve 40, the Beacon-4 package data snapshot contains 40, and the Beacon-4 Layer-2 prod proof at commit `2464bee` compared all 40 (plus 34 for v0.3) against live `https://shipstacked.com/atlas/roles/<id>.json` — every role byte-equivalent.

**Correction.** None to code. Discovery-doc narrative was wrong; everything downstream of it has always been correct.

---

### A.3 Beacon 5 class name: discovery doc said `CollectionNotFoundError`; actual is `CollectionGateError`

**What the record said.** `BEACON_5_DISCOVERY.md` §C.3 + §D.3 described the collections module's thrown-error class as `CollectionNotFoundError` for missing and inactive slugs.

**What the code actually defines** (verified by `grep` against `src/lib/collections/context.ts` 2026-05-17):
```
57:export class CollectionGateError extends Error {
61:    this.name = 'CollectionGateError'
```

**How the drift was caught.** The discovery doc's wrong class name made it into the initial Beacon-5 implementation of `toSafeError` in `src/lib/mcp/schemas.ts`. The first local run of `verify-mcp.ts` caught this as a real test failure (the `get-collection` not-found path returned generic "Internal error" instead of the intended safe "Collection not found"). The class name was corrected in-flight before the commit; the post-deploy PROD `verify-mcp.ts` at commit `5f1a875` returned 31/0 confirming the shipped code uses the correct class name.

**Correction.** None to code (already correct). The discovery doc has the wrong name; future readers should reference `src/lib/collections/context.ts` directly for the canonical class name.

---

### A.4 Beacon 3 housekeeping: audit-trail + `.gitignore .claude/` partial closure

**What the record said.** Beacon 3 §G.5 deferred two housekeeping items to Tier 4: (a) commit the `docs/audit/` audit-trail, and (b) `.gitignore` the local-only `.claude/` directory.

**Reality** (verified by `git status --short` 2026-05-17):
```
?? .claude/
?? docs/audit/
```
Both untracked at the start of Tier 4.

**Partial closure** (this commit):
- `.gitignore` updated to include `.claude/` — full closure.
- **`docs/audit/` partially committed.** Per Tier 4 spec §6 + Section H decision α: only the 4 brand-clean discovery docs are committed in this cycle. 6 other discovery docs in `docs/audit/` contain forbidden allowlist tokens (person names in strategic context, peer-product tool names in adoption-list context, specific historical/test slug strings) and are deliberately kept untracked. Per decision α, they remain untracked indefinitely; the sanitize-then-commit alternative (β) is **not to be proposed again** in any future cycle unless Thomas explicitly reopens it.

**Correction.** Closes the housekeeping ledger items in their final form. The 6 dirty docs are documented in Tier 4 discovery (§B.2) as the records of why they exist + why they don't ship to history.

---

### A.5 Inline-fetcher debt: CLOSED by Beacon 5 Option-B extraction

**What the record said.** Beacon 5 §G.5 logged the `/u/[username]/page.tsx` inline published-gated fetcher as a Tier-4 housekeeping item, with the note "*this happens IN Phase 2 H4 if Option B is approved*."

**Reality** (verified 2026-05-17):
- `src/lib/profiles.ts` exists (2,365 bytes).
- `src/app/u/[username]/page.tsx:3` imports `getPublishedProfile`.
- Lines 13 and 32 call it (replacing the two prior inline queries).

**Closing commit.** `5f1a875` (Beacon 5). The extraction shipped with a byte-identical proof: baseline (inline query) and extracted (via `getPublishedProfile`) profile-fetch outputs both 1,503 bytes with SHA-256 `9df26212fd4dbf7fd3db0b91a22a4f514862e4a82a8a8ea9c5842748f8f19866` — provably behavior-preserving.

**Correction.** None — closed at `5f1a875`. Ledger item RESOLVED.

---

## B — Housekeeping completed this commit

- Committed (newly tracked): the 4 brand-clean discovery docs — `BEACON_4_DISCOVERY.md`, `BEACON_5_DISCOVERY.md`, `MERGE_DISCOVERY.md`, `SEED_JOB_TEARDOWN_DISCOVERY.md` — plus the 2 new Tier 4 docs (`TIER_4_DISCOVERY.md`, this file).
- NOT committed (remain untracked indefinitely per decision α): `BEACON_1_DISCOVERY.md`, `BEACON_2_DISCOVERY.md`, `BEACON_3_DISCOVERY.md`, `GATEWAY_DISCOVERY.md`, `KILLERS_2026-05-16.md`, `SITE_AUDIT_2026-05-16.md` (6 files; contain forbidden allowlist tokens in strategic / partner / peer-product / slug contexts).
- `.gitignore`: `.claude/` added (single-line addition).
- Every committable doc re-grepped against the full Beacon-2 allowlist + env-var-name patterns immediately before commit. Zero hits.

---

## C — Confirmation: no code/production bug found; reconciliation corrected records only

All 5 ledger items closed via record-correction or by reference to a prior commit that already closed them. **No real code or production bug was surfaced during Tier 4 verification.** Per Tier 4 spec §3, any actual bug would have been a §6 escalation (STOP, report, do not fix inline under cover of reconciliation). None were needed.

---

## D — Site behavior + invariants confirmed byte-unchanged

- `src/lib/jsonld/person.ts` byte-unchanged (Beacon 1 invariant since commit `0ceb69a` — now into its 7th commit running).
- All Beacon 1–5 / V2 / Collections / Atlas / middleware source files: untouched in Phase A (verified by `git diff --stat`: only `.gitignore` changed; only new files added).
- `AGENTS.md` (Beacon 3): byte-unchanged.
- `CLAUDE.md`: byte-unchanged.
- Prior-tier prod regressions verified live at the gate: `/atlas/roles/A1.json` 200 application/ld+json; `/u/jennypeterson224` 404; `/u/aniketaslaliya801` 200; `/collections/nonexistent` 404; `/.well-known/agent-card.json` 200 application/a2a+json; `/api/mcp` POST initialize 200 with correct protocol version.

---

## E — Production data: zero mutation. Phase B: zero execution.

**No production data was touched in this commit.** The reconciliation is records-only.

**No Phase B item was executed.** Phase A approval is NOT Phase B approval — that constraint held. The Phase B items below are recorded here as **findings** (per the Spec §0 hard split + the H-DECISION acknowledgement that Phase B remains a separate decision).

---

## F — Phase B findings (recorded; NOT acted on; await separate decisions)

### F.1 `thomasoxlee198` (NULL `user_id` in profiles)

- Read-only investigation 2026-05-17 confirmed: exactly 1 profile in `profiles` table has `user_id IS NULL` (`id = 15ed3a1b-1abf-480c-b10c-9aecee4b60cb`, `username = thomasoxlee198`, `published = true`, `verified = true`, `entity_id = NULL`).
- `/u/thomasoxlee198` returns HTTP 200 on prod; page renders via the shared `getPublishedProfile` fetcher (which does not filter on `user_id`).
- 4 honest options enumerated in `TIER_4_DISCOVERY.md` §D.1 with exact reversal SQL for each (Option A: leave / Option B: link to auth user via single UPDATE / Option C: backfill entities row + link / Option D: delete — not recommended).
- **Current standing recommendation: Option A — leave as-is.** No urgency. The Tier 1 defer continues to be the right call until a specific feature requires linking.
- **Status: PENDING SEPARATE DECISION.** Not acted on in Tier 4; not scheduled. Its own future cycle if and when.

### F.2 `/api/hire-confirm/*` feature disposition

- Read-only investigation 2026-05-17 confirmed: the endpoints are NOT "truly dead" as the Tier 0 commit message implied. Inbound references exist in `src/app/admin/AdminActions.tsx:13` (POSTs `/api/hire-confirm/nudge`) and `src/app/admin/page.tsx:36` (queries the `hire_confirmations` table). The table itself is empty (0 rows / 0 confirmed).
- 4 honest options enumerated in `TIER_4_DISCOVERY.md` §D.2 with exact reversal for each (Option A: leave / Option B: cron-secret-leak-only fix in place — see F.3 below for separate tagging / Option C: remove endpoints + admin UI refs + drop table / Option D: table-only remove — not recommended).
- **Current standing recommendation: Option A — leave the feature as-is.** No urgency on the feature disposition. Removing the endpoints requires concurrent admin-UI changes; the empty-table-but-live-references state is stable and harmless.
- **Status: PENDING SEPARATE DECISION.** Not acted on in Tier 4; not scheduled. Its own future cycle if and when admin UI is being reworked.

### F.3 Hardcoded `CRON_SECRET` in `src/app/api/hire-confirm/nudge/route.ts:6` — **DISTINCT near-term finding**

- A hardcoded string constant `CRON_SECRET = '<ROTATED_CRON_SECRET_REDACTED>'` is present at line 6 of `src/app/api/hire-confirm/nudge/route.ts`. It gates a single cron-style nudger endpoint (low-criticality; not a JWT signing key, not a DB password). It is a secret in committed source code by definition, and the standing no-secrets rule applies.
- **This is a DISTINCT finding, NOT flattened into the F.2 feature-disposition pile.** It is its own small fix-in-place item (replace the constant with `process.env.CRON_SECRET!`, add the env var to Vercel, rotate the value). The fix is independent of any decision on whether `/api/hire-confirm/*` stays or goes — it is correct under any disposition.
- **Sequencing:** should be its own small discovery-first step, scheduled BEFORE the MCP fast-follow (the post-Beacon-5 announcement step). Not acted on in this Tier 4 cycle (correctly out of Phase A scope), but explicitly NOT deferrable to the indefinite Phase B pile.
- ~~**Status: TAGGED FOR NEAR-TERM, BEFORE MCP FAST-FOLLOW.** Its own micro-cycle.~~
- **Status: RESOLVED at commit `551baff` (2026-05-17).** Closed via Step 1.5 (`docs/v2/STEP_1_5_CRON_SECRET_SPEC.md` + `docs/audit/STEP_1_5_DISCOVERY.md`). Closure was independently verified on production *before* this note was written — the record claims closure only because closure is proven. Three POST probes against `https://shipstacked.com/api/hire-confirm/nudge`:
  - **(a) Previously hardcoded literal** in the `x-cron-secret` header → **HTTP 401** (terminal Claude; the literal is already in public git history at the Tier 0 commit, so sending it once for verification created no new exposure). This is the load-bearing proof: the value visible in history is dead and authenticates nothing.
  - **(b) Rotated value** in the `x-cron-secret` header → **HTTP 200** (Thomas, in own terminal; terminal Claude does not have and never had the rotated value).
  - **(c) No `x-cron-secret` header** → **HTTP 401** (fail-closed input-side proof).
  Reversal intentionally NOT-recommended per the commit message (reversing the code re-introduces the literal as the active credential, re-opening the exposure; removing the env var alone causes fail-closed 401-on-every-call). The correct posture is to leave the rotation in place.

---

## G — What's next (the locked post-beacon sequence, per Tier 4 spec §7)

The reconciliation is done; the audit trail (the publishable subset) is in history; repo hygiene is clean.

1. ~~**CRON_SECRET extraction** (F.3) — small discovery-first cycle, before any other forward step.~~ **DONE at commit `551baff` (2026-05-17). See §F.3 closure note for the rotation proof.**
2. **MCP fast-follow** — announce `/api/mcp` in AgentCard / AGENTS.md / `/llms.txt`. Own tiny spec, additive.
3. **Publish `@shipstacked/atlas-roles`** — operational, Thomas-only, irreversible. Pre-publish checklist then the command.
4. **First real Consented Collection + reach the named candidate** — operational, Thomas-only.
5. **Phase B decisions** (F.1 and F.2) — when Thomas chooses to revisit them. No urgency; not scheduled.

Each step its own gate. Reconcile before adding; harden before exposing; the platform earns the signal before the signal is sent. The protocol holds.

---

*End of Tier 4 reconciliation record.*
