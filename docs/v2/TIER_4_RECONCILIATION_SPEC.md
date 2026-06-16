# ShipStacked — Tier 4: Reconciliation + Tech-Debt Sweep

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** the full clean state through commit 5f1a875 (Tiers 0–1, Beacons 1–5, Consented Collections — all live, all verified)
**Output:** The written record (commit messages, discovery docs, audit trail) is reconciled to match verified production reality; safe housekeeping done; production-data items SCOPED AND PRESENTED but NOT executed (they require a separate, explicit, gated authorization).
**Status:** Step 1 of the post-beacon sequence. Discovery-first. **HARD SPLIT: Phase A is safe and authorizable now; Phase B (production-data) is discovery-and-proposal-ONLY in this spec — terminal Claude STOPS before any production-data mutation and does not proceed without a separate Thomas authorization that this spec does not grant.**

---

## 0. Why this is Step 1, and why the split is non-negotiable

Across nine clean ships, a small number of places accumulated where the *written record* (a commit message, a discovery doc) says something slightly different from what production *actually does*. In every known case the **shipped code is correct** and the **document is the thing that drifted** — these are documentation-accuracy gaps, not production bugs. They were deliberately logged (not fixed inline) so they could be reconciled in one honest pass rather than piecemeal. That pass is Tier 4, and it comes first in the post-beacon sequence because every subsequent act (publishing a package, announcing an endpoint, reaching real people) should proceed from a base whose record matches reality.

**The split that must not be violated:**
- **Phase A — Reconciliation + safe housekeeping.** Correcting documents to match verified production reality, plus low-risk repo housekeeping (commit the audit trail, gitignore a local-settings dir). This mutates *records and repo hygiene*, not production data or behavior. Authorizable via this spec's normal discovery→approve→execute gate.
- **Phase B — Production-data items.** `thomasoxlee198` (a profile row with NULL `user_id`) and `/api/hire-confirm/*` (dead endpoints from the Tier 0 teardown). These touch production data / live routes. **This spec does NOT authorize Phase B execution.** Discovery may SCOPE and PROPOSE Phase B (read-only investigation + a precise plan + exact reversal SQL), but Phase 2 executes **Phase A only**. Phase B is presented for a *separate* decision Thomas makes consciously, with fresh scrutiny, as its own gated cycle — exactly the standing rule held all session for production-data work.

If at any point Phase A and Phase B appear entangled (a reconciliation item can't be closed without a production-data mutation), that is a §6 escalation — STOP, report, do not cross the line to "just fix it."

---

## 1. What this is, in one sentence

A discovery-first pass that (Phase A) corrects every logged state-vs-record drift so the documentation matches verified production reality and does safe repo housekeeping, while (Phase B) only investigates and proposes the production-data items behind a hard stop for a separate authorization.

---

## 2. Scope

**Phase A — ships in this spec (after Section H approval):**
- Reconcile the 5-item ledger (below) — for each: verify the current production/code reality read-only, then correct the *document* (discovery doc and/or add a reconciliation note) so the record is accurate. Where the shipped code is already correct (expected for all known items), the fix is to the *record*, not the code.
- Housekeeping: commit the `docs/audit/` audit trail (the discovery docs from this whole engagement are on disk but untracked — they are the reasoning behind every invariant and should be in history); add `.claude/` (local-settings dir) to `.gitignore`.
- A single consolidated `docs/audit/TIER_4_RECONCILIATION.md` recording, per ledger item: what the record said, what production actually does (verified), and the correction made.

**Phase B — discovery/proposal ONLY in this spec (NOT executed):**
- `thomasoxlee198`: a `profiles` row with NULL `user_id` (the founder profile, deferred at Tier 1). Discovery: investigate read-only what it is, what references it, what the options are (leave / link / other), and the exact reversible change each option would require. PROPOSE; do not execute.
- `/api/hire-confirm/*`: dead endpoints left from the Tier 0 badge/hire teardown. Discovery: confirm read-only they are truly dead (no inbound references, no traffic path), and propose exact removal + reversal. PROPOSE; do not execute.
- Output is a scoped plan + exact reversal for each, behind the Phase B hard stop.

**Does NOT ship here (either phase):**
- Any production-data mutation (Phase B is proposal-only).
- Any change to Beacon 1–5 / Collections / V2 behavior or any single source.
- Any new feature, any operational act (publishing, collections, outreach — those are later steps).
- Bundling Phase B into Phase A's approval.

---

## 3. Hard constraints

- **The Phase A / Phase B wall is absolute.** Phase 2 executes Phase A only. Phase B is discovery + written proposal + reversal SQL, presented for a separate decision. Terminal Claude does NOT execute any Phase B item even if it seems trivial, even if Phase A approval is given — Phase A approval is NOT Phase B approval. Crossing this is the single worst failure mode of this spec.
- **Reconciliation corrects the record, not the code (unless a real code bug is found).** The known items are documentation drift; the shipped code is correct. If reconciliation *discovers an actual code/production bug* (not just a doc gap), that is a §6 escalation — STOP and report it as a finding; do not fix it inline under cover of "reconciliation." A real bug gets its own discovery-first decision.
- **Every reconciliation claim is verified against live production or current code, not asserted.** Same discipline that caught the drifts originally: read the actual code / curl the actual endpoint / check the actual class name. The reconciliation doc states only verified reality.
- **Brand-free / no secrets / no strategic context.** Standing rule. The reconciliation doc and any committed audit-trail docs must be checked: committing `docs/audit/` means those docs become permanent history — verify they contain zero secrets, zero partner/strategic content before committing them (they were written under the brand-free rule, but verify, do not assume — this is the one place a historical doc could carry something that shouldn't ship).
- **Housekeeping is additive/hygiene only.** Committing untracked docs + a gitignore line. No existing tracked file's content changes for housekeeping. `git revert` reverses cleanly.
- **Discovery before mutation.** Phase 1 read-only. Terminal Claude produces: the verified reality for each ledger item, the proposed record-corrections, the housekeeping plan, AND the Phase B scoped proposals (read-only) — STOPS, Thomas approves Section H **for Phase A only**, Phase B remains pending a separate decision.
- Standard gate: `tsc --noEmit` clean, `npm run build` clean (a reconciliation/housekeeping pass should not affect these — confirm nothing does), prior-tier prod regressions intact, site behavior byte-unchanged.

---

## 4. PHASE 1 — Discovery (read-only, STOP, await approval)

Produce `docs/audit/TIER_4_DISCOVERY.md`. Mutate nothing.

### 4.1 The reconciliation ledger — verify each against reality (read-only)
For each, report: what the record currently says (cite the file/commit), what production/code *actually* does (verified now — curl/read/grep), and the exact proposed record-correction:
1. **Tier 0 seed-jobs:** commit `859dd01` described soft-delete + 308; live `/jobs/<seeded-id>` behavior is 404 (rows hard-deleted). Verify current behavior; propose the reconciliation note.
2. **Beacon 4 "44 vs 40":** `BEACON_4_DISCOVERY.md` narrative says 44 v0.4 roles; parser + live site serve 40. Verify the live count; propose the doc correction (root cause already known: a double-counting regex).
3. **Beacon 5 class name:** `BEACON_5_DISCOVERY.md` assumed `CollectionNotFoundError`; actual class is `CollectionGateError` (`src/lib/collections/context.ts`). Shipped code correct. Verify; propose the doc correction.
4. **Beacon 3 housekeeping:** `docs/audit/` untracked; `.claude/` untracked. Confirm current `git status`; propose the housekeeping plan.
5. **Inline-fetcher debt:** logged as CLOSED by Beacon 5's Option-B extraction (`src/lib/profiles.ts`). Verify it is in fact closed (the shared source exists and both consumers import it); propose marking it resolved with the closing commit reference.

### 4.2 Housekeeping plan
- Exact list of what `docs/audit/` files would be committed (enumerate them) + confirmation each is brand-free / secret-free / no strategic content (this is mandatory — they become permanent history).
- The exact `.gitignore` addition for `.claude/`.
- Confirm no tracked file content changes; `git revert` reverses cleanly.

### 4.3 Phase B scoping (READ-ONLY, PROPOSAL ONLY — do not execute)
- **`thomasoxlee198`:** investigate read-only — what the row is, NULL `user_id` implications, what references it (FKs, code paths, the entities/profiles link from Tier 1), and enumerate the honest options (leave as-is / link / other) each with its exact reversible change and reversal SQL. Recommend, but execute nothing.
- **`/api/hire-confirm/*`:** read-only confirm whether truly dead (grep inbound references, route definitions, any client calls), and propose exact removal + the exact reversal (restore SQL/files). Execute nothing.
- Clearly label this entire section: **PHASE B — NOT AUTHORIZED BY THIS SPEC. PROPOSAL ONLY. SEPARATE DECISION REQUIRED.**

### 4.4 Discovery output
`docs/audit/TIER_4_DISCOVERY.md`, sections A–H:
- A: ledger item 1–5, each with record-said / reality-verified / proposed-correction
- B: housekeeping plan + the brand-free/secret-free audit of every doc to be committed
- C: confirmation reconciliation corrects records (and that NO real code bug was found — or if one was, it's flagged as a §6 escalation, not fixed)
- D: **Phase B scoped proposals (read-only) — explicitly marked NOT AUTHORIZED, proposal only, with exact reversal for each**
- E: confirmation Phase A modifies no Beacon/Collections/V2 behavior, no production data, no single source
- F: any entanglement found between a Phase A item and a Phase B mutation (§6 escalation if so)
- G: any real bug or surprise surfaced during verification (flag, do not fix)
- H: precise numbered **Phase A** change list, each individually approvable — and an explicit statement that Section H approval authorizes **Phase A ONLY**, Phase B remaining pending a separate decision

STOP. One-paragraph summary. Await explicit Section H (Phase A) approval. Phase B is reported, not approved.

---

## 5. PHASE 2 — Execution (Phase A ONLY, only after Thomas approves Section H)

- Execute approved Phase A: write `docs/audit/TIER_4_RECONCILIATION.md` with the verified per-item reconciliation; apply approved record-corrections; commit the audited `docs/audit/` trail; add `.gitignore` line for `.claude/`.
- **Do NOT execute any Phase B item.** If Phase B seems trivial or "while we're here," that instinct is the failure mode — do not act on it.

### 5.1 Verification (before commit)
- Each reconciliation note in `TIER_4_RECONCILIATION.md` matches verified production/code reality (re-check, do not trust the discovery doc alone — same rigor that caught the drifts).
- Every `docs/audit/` file being committed is brand-free / secret-free / no strategic content (mechanized grep + the brand allowlist; this is permanent history).
- `git status`: only the new reconciliation doc + the newly-tracked `docs/audit/` files + the `.gitignore` line. No Beacon/Collections/V2 source touched. `person.ts` byte-unchanged (7+ commits running).
- No production data mutated. No Phase B item executed (explicit confirmation).
- `tsc` clean, `build` clean, prior-tier prod regressions intact, site behavior byte-unchanged.

### 5.2 Commit + push
Commit message documents: the 5 reconciliation items (record-said → reality → correction), the housekeeping (audit trail committed, `.claude/` ignored), explicit confirmation NO production data was touched and Phase B was NOT executed (only scoped/proposed and awaiting a separate decision), brand-free/secret-free audit of the committed docs, code/record-only / `git revert` reverses. Push, poll prod, confirm site byte-unchanged, report — **and surface Phase B as the explicit next decision, not as done.**

---

## 6. Escalate if
- Any reconciliation item cannot be closed without a production-data mutation (Phase A/B entanglement) — STOP, report, do not cross
- Verification surfaces a real code/production bug (not a doc gap) — STOP, report as a finding, do NOT fix inline
- Any `docs/audit/` file proposed for committing contains a secret / partner / strategic content — STOP, do not commit it, report (the brand-free rule applies to history too)
- Phase B investigation reveals the items are riskier/more entangled than "deferred cleanup" implies — report fully; still do not execute
- Anything tempts executing a Phase B item because Phase A approval was given — it is NOT Phase B approval; STOP

---

## 7. After Tier 4 Phase A ships
The written record matches verified production reality, the audit trail is in history, repo hygiene is clean — the base is reconciled. Then, in the locked post-beacon sequence:
- **Phase B decision (separate, gated):** Thomas reviews the scoped `thomasoxlee198` + `/api/hire-confirm/*` proposals with fresh scrutiny and decides if/when they execute as their own discovery-first cycle. Not bundled, not assumed.
- **Step 2:** MCP-discovery fast-follow (announce `/api/mcp` in AgentCard/AGENTS.md/llms.txt — own tiny spec, additive).
- **Step 3:** Publish `@shipstacked/atlas-roles` (operational, Thomas-only, irreversible — pre-publish checklist then the command).
- **Step 4:** First real Consented Collection + reach Aniket (operational, Thomas-only — the actual point; sequence of decisions, chat-Claude advises, Thomas acts).

Each step its own gate. Reconcile before adding; harden before exposing; the platform earns the signal before the signal is sent. The protocol holds.

---

*End of Tier 4 spec.*
