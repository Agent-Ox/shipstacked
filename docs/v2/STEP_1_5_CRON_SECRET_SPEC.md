<!-- Phase 7 §E (2026-06-16): original CRON_SECRET value rotated + redacted; historical context only. -->
# ShipStacked — Step 1.5: CRON_SECRET Extraction + Rotation

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** the clean reconciled base at commit a653262 (Tier 4 Phase A live). Closes finding F.3 from `docs/audit/TIER_4_RECONCILIATION.md`.
**Output:** The hardcoded `CRON_SECRET` is removed from source AND the exposed value is rotated dead, so the credential currently sitting in public git history can no longer authenticate anything.
**Status:** Step 1.5 in the post-beacon sequence (before the MCP fast-follow — a live credential outranks a discoverability nicety). Discovery-first. Production-touching (one live route file + a Vercel env var + a value rotation) — small scope, full rigor.

---

## 0. Why this is its own step, and why rotation — not extraction — is the point

Tier 4 discovery found a real hardcoded credential: `const CRON_SECRET = '<ROTATED_CRON_SECRET_REDACTED>'` in `src/app/api/hire-confirm/nudge/route.ts:6`. It is **low-severity in practice** (the endpoint is dormant, the `hire_confirmations` table is empty, it's an internal nudge route, not a data-exfiltration path) — but it is a literal secret in a public GitHub repo, and per the standing discipline, the real thing gets fixed deliberately rather than left because it is *currently* harmless.

**The load-bearing insight, and the whole reason this spec exists:** the string `'<ROTATED_CRON_SECRET_REDACTED>'` is **already in git history** (it predates today; Tier 4 only found and named it — correctly did not fix it under reconciliation cover). Moving the literal to an environment variable removes it from *future* source but does **not** remove it from *past commits*. Anyone reading the repo history can still see it. Therefore:

> **Extraction without rotation is theater.** The exposed value must be ROTATED to a new secret so the value visible in history is dead and authenticates nothing. Rotation is the part that actually closes the exposure. Extraction is just hygiene that prevents *re-leaking the new* value.

This spec requires BOTH, and treats the rotation as the load-bearing deliverable. A "fix" that extracts but reuses the same value would leave the exposure fully open and is explicitly forbidden (§3, §6).

This is not history-rewriting. We are NOT rewriting git history (that is destructive, breaks every clone/fork, and is out of scope). We are making the leaked value *worthless* by rotating it, which achieves the same security outcome without rewriting history.

---

## 1. What this is, in one sentence

Replace the hardcoded `CRON_SECRET` literal with an environment-variable read, set a NEW rotated value in Vercel (and wherever the cron caller lives), verify the dormant endpoint still authenticates correctly with the new value and rejects the old one, so the credential exposed in public history is dead.

---

## 2. Scope

**Ships in this spec:**
- `src/app/api/hire-confirm/nudge/route.ts`: replace `const CRON_SECRET = '<ROTATED_CRON_SECRET_REDACTED>'` with a read of `process.env.CRON_SECRET` (fail-closed if unset — see §3).
- A NEW rotated secret value, set in the Vercel project environment (Thomas does this in the Vercel dashboard — terminal Claude cannot and must not set production env vars; it provides the exact value + exact steps, Thomas applies, same human-in-the-loop pattern as the Supabase Dashboard migrations).
- Whatever *calls* this cron endpoint with the secret must also be updated to the new value (discovery must find the caller — a Vercel cron config, an external scheduler, a GitHub Action, or possibly nothing currently calls it since the endpoint is dormant). If there is a caller config in the repo, it ships here; if the caller is external/dashboard-side, Thomas updates it with provided steps.
- Verification that the endpoint accepts the NEW secret and rejects the OLD one (proving the rotation is real).

**Does NOT ship here:**
- Git history rewriting (out of scope, destructive — rotation makes it unnecessary).
- Any change to the hire-confirm *feature* itself (the Phase B feature-disposition decision is separate and pending — this spec does NOT remove the endpoint, the admin UI refs, or the table; it only fixes the credential).
- `thomasoxlee198` or any other Phase B item.
- Any other secret audit (if discovery finds OTHER hardcoded secrets, that is a §6 escalation — report them, do not fix them here; this spec is scoped to this one credential).
- Any change to Beacon 1–5 / Collections / V2 / Atlas / MCP sources.
- The MCP fast-follow (next step, its own spec).

---

## 3. Hard constraints

- **Rotation is mandatory and is the load-bearing deliverable.** The new value MUST be different from `'<ROTATED_CRON_SECRET_REDACTED>'`. A fix that extracts to env but keeps the same value is forbidden — it leaves the exposure fully open. Verification MUST prove the OLD value is now rejected.
- **Fail closed, never fail open.** If `process.env.CRON_SECRET` is unset or empty, the endpoint must DENY (treat as auth failure), never allow. A common extraction bug is `process.env.CRON_SECRET || 'fallback'` or allowing when unset — both are forbidden. No fallback to the old literal. No "if no secret configured, skip the check." Unset env = endpoint rejects all calls. Discovery must specify the exact fail-closed comparison.
- **The endpoint is dormant but must stay functionally correct.** It currently works (the admin UI POSTs to it; the table is empty but the route is wired). The change must preserve its behavior for a correctly-authenticated call with the NEW secret — this is not "break the dormant thing," it's "rotate its credential cleanly." Discovery maps exactly how the secret is currently checked so the new check is behavior-equivalent except for the value source.
- **Terminal Claude does not set production env vars.** Same rule as Supabase Dashboard migrations: terminal Claude provides the exact new value (or a method to generate a strong one) and exact Vercel steps; Thomas applies it in the Vercel dashboard; terminal Claude verifies afterward by hitting the endpoint. Type-confirm, human-applies, then verify.
- **Sequencing of the rotation matters (no self-inflicted outage, even on a dormant endpoint).** Discovery must specify the safe order: e.g. set the new env var in Vercel FIRST (both old code and new code then have it available), deploy the code that reads env, update the caller to the new value, then confirm old value rejected. The exact safe sequence is part of discovery — a naive order could briefly break the endpoint (acceptable here since dormant, but do it correctly anyway as the pattern matters for future non-dormant rotations).
- **Brand-free / no new secrets in source.** The new value is NEVER written into source, a spec, a discovery doc, a commit message, or any committed file. It lives only in Vercel env + wherever the caller stores it + transiently in the chat handoff to Thomas. Discovery/commit must confirm zero secret values (old or new) are written to any committed artifact. (The OLD value already in history is not re-printed in new commits either — refer to it as "the previously hardcoded value," not the literal.)
- **Discovery before mutation.** Phase 1 read-only: map the current check, find the caller, design the fail-closed comparison + the safe rotation sequence, confirm no other secret in this file. STOP. Thomas approves Section H. Then Phase 2.
- Standard gate: `tsc --noEmit` clean, `npm run build` clean, all prior-tier prod regressions intact, no other source touched, `git revert` reverses the code (the env var rotation is separately documented for manual reversal).

---

## 4. PHASE 1 — Discovery (read-only, STOP, await approval)

Produce `docs/audit/STEP_1_5_DISCOVERY.md`. Mutate nothing. Do not print the old or any new secret value in this doc.

### 4.1 The current secret check
- Read `src/app/api/hire-confirm/nudge/route.ts` fully. Map exactly: where `CRON_SECRET` is defined, how it is compared (header? query? body? what comparison?), what happens on match vs mismatch, what the endpoint does when authorized. Report the exact current auth logic (without printing the literal — refer to "the hardcoded value").
- Identify the exact minimal edit to make it read `process.env.CRON_SECRET` with a FAIL-CLOSED check (specify the exact comparison, including the unset/empty case → deny).

### 4.2 The caller
- Find what calls this endpoint with the secret. Search the repo: `vercel.json` crons, GitHub Actions, any scheduler config, any internal fetch, the admin UI (`AdminActions.tsx` — does it send the secret, or is the secret only for an external cron?). Report precisely who/what authenticates to this endpoint and where that caller's copy of the secret lives (repo config vs Vercel dashboard vs external vs nothing currently).
- This determines what else must be updated on rotation. If nothing currently calls it with the secret (plausible — dormant), state that; rotation is then purely env + code.

### 4.3 The fail-closed design
- Specify the exact new comparison. Must deny when `process.env.CRON_SECRET` is undefined or empty. No fallback literal. No skip-when-unset. State the precise code.

### 4.4 The safe rotation sequence
- Specify the exact ordered steps so the dormant endpoint is never left in an inconsistent state, and so the pattern is correct for future non-dormant rotations:
  1. Thomas sets the NEW `CRON_SECRET` in Vercel (value provided in the Phase 2 handoff, never in a committed doc).
  2. Deploy the code that reads `process.env.CRON_SECRET` (fail-closed).
  3. Update the caller (if any) to the new value.
  4. Verify: a call with the NEW secret authorizes; a call with the OLD value is rejected; a call with no secret is rejected.
- Report the exact sequence and the exact verification calls (curl shapes) — without embedding any secret value in the doc.

### 4.5 Other-secret check (scoped)
- Grep this one file (and only confirm scope) for any OTHER hardcoded secret. If found elsewhere in the codebase incidentally, that is a §6 escalation: list location only, do NOT fix (out of scope; its own future cycle). This spec fixes exactly one credential.

### 4.6 Discovery output
`docs/audit/STEP_1_5_DISCOVERY.md`, sections A–H (NO secret values anywhere in it):
- A: current auth logic in the nudge route (literal not printed)
- B: the caller (who authenticates, where their secret lives, or "nothing currently")
- C: the exact fail-closed code change
- D: the exact safe rotation sequence + the exact verification curl shapes
- E: confirmation no other secret in this file; any incidental other-secret finding flagged as §6 (location only, not fixed)
- F: confirmation scope is exactly this one credential; hire-confirm feature untouched; no Phase B item touched; no other source touched
- G: any surprise (e.g. the secret is checked in more than one place, or the caller is unexpected)
- H: precise numbered Phase 2 change list + the explicit Thomas-does-this-in-Vercel steps, with the load-bearing requirement that the OLD value must be proven rejected

STOP. One-paragraph summary. Await explicit Section H approval.

---

## 5. PHASE 2 — Execution (only after Thomas approves Section H)

Ordered per the approved §4.4 safe sequence. Expected:
- **Step A (Thomas, in Vercel):** terminal Claude provides the exact new secret value (or generates a strong one and provides it for Thomas to paste) + exact Vercel dashboard steps. Thomas sets `CRON_SECRET` in Vercel env. Terminal Claude does NOT do this and does NOT print the value into any file.
- **Step B (terminal Claude):** make the approved fail-closed code edit to `nudge/route.ts`. Commit + push (the commit contains NO secret value — old or new).
- **Step C:** update the caller to the new value if a repo-side caller config exists (per discovery B); if the caller is dashboard/external, provide Thomas the steps.
- **Step D (verification):** prove the rotation is real (below).

### 5.1 Verification (before declaring done)
- **The load-bearing rotation proof:** against production, a request with the NEW secret authorizes the endpoint; a request using the PREVIOUSLY HARDCODED value is REJECTED; a request with no secret is REJECTED. Show the three responses (status codes only; do not print secret values). The OLD-value-rejected response is the proof the exposure is closed.
- **Fail-closed proof:** confirm (by reasoning from the code + the unset behavior) that an unset/empty `CRON_SECRET` denies — not allows. State the exact line that guarantees this.
- The dormant endpoint still behaves correctly for a properly-authenticated NEW-secret call (same behavior as before, only the credential changed).
- Zero secret values (old or new) in any committed file: grep the diff + the commit message + the discovery doc. The old literal must be GONE from current source (`grep` for it returns nothing in the working tree); it remaining in *history* is expected and is why rotation (not history-rewrite) is the chosen fix.
- `tsc` clean, `build` clean. `git status`: only `nudge/route.ts` (+ a caller config file iff discovery found a repo-side one). No other source touched. `person.ts` byte-unchanged (8th commit). No Phase B item touched. Hire-confirm feature otherwise unchanged.
- All 5 prior-tier prod regressions intact + `/api/mcp` initialize 200.

### 5.2 Commit + push + record
Commit message documents: the credential was extracted to `process.env.CRON_SECRET` (fail-closed), the value was ROTATED (state that rotation occurred and that the previously-hardcoded value is now rejected — do NOT print either value), why rotation not history-rewrite (rotation makes the historical value worthless without the destruction of history-rewriting), the verification proof (old value rejected on prod), scope was exactly this one credential, hire-confirm feature + all Phase B items untouched, `git revert` reverses the code (note the env rotation is reversed manually via Vercel if ever needed, but reverting the rotation would re-open the exposure so it should NOT be reverted — the code revert and the secret rotation have intentionally different reversal semantics; document this clearly). Update `docs/audit/TIER_4_RECONCILIATION.md` F.3 → RESOLVED with the closing commit ref (no secret values). Push, poll prod, run the rotation proof against prod, report.

---

## 6. Escalate if
- The secret is checked in more than one place / more than one file (scope assumption breaks — report, get a revised plan)
- A repo-side caller can't be updated without touching something out of scope — escalate
- Fail-closed can't be cleanly guaranteed (some code path allows when unset) — escalate; fail-open is unacceptable
- Other hardcoded secrets are found anywhere — list locations ONLY, do not fix, flag as their own future cycle
- The rotation sequence would cause more than a momentary dormant-endpoint inconsistency, or would affect anything non-dormant — escalate before proceeding
- Anything would require printing a secret value into a committed file — STOP; the value lives only in Vercel + the transient chat handoff

---

## 7. After Step 1.5 ships
The credential exposed in public history is dead (rotated), source reads env fail-closed, F.3 closed. The exposure is closed without history-rewriting. Then the locked sequence:
- **Step 2:** MCP-discovery fast-follow — announce `/api/mcp` in AgentCard / AGENTS.md / llms.txt (own tiny spec, additive).
- **Step 3:** Publish `@shipstacked/atlas-roles` (operational, Thomas-only, irreversible).
- **Step 4:** First real Consented Collection + reach Aniket (operational, Thomas-only — the actual point).
- **Phase B (separate, no urgency):** `thomasoxlee198` + hire-confirm feature disposition — their own future cycles when Thomas chooses; standing recommendation leave-as-is.

Small step, full rigor — the credential issue outranked the discoverability work and was fixed deliberately, not deferred. The protocol holds.

---

*End of Step 1.5 spec.*
