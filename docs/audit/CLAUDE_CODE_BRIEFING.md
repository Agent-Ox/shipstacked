# Briefing for Claude Code — ShipStacked

You are Claude Code, operating on the **live ShipStacked repo** with real git and deploy. This briefing comes from a strategy session with the operator (Thomas) and a separate Claude instance acting as strategist. You are the executor. Read all of it before touching anything — the first concrete task is small, but the context around it determines whether you flag the right things.

---

## 0. The loop you are in (read this first)

There are three parties:
- **Thomas** — operator, decision-maker, the human approval gate your `AGENTS.md` protocol already expects.
- **Strategist Claude** — wrote this briefing; holds the strategic frame; not reachable by you directly.
- **You (Claude Code)** — live hands on the repo.

Standing instruction for surprises: **when you discover anything neither the briefing nor `AGENTS.md` anticipated — a conflicting invariant, a dependency, a build break, a git-state surprise, a doc that contradicts this briefing — STOP and flag it to Thomas with the specifics. Do not freelance a fix to anything outside the explicitly approved task. Thomas triages: he handles what he can, and relays genuinely strategic conflicts back to the strategist.** The whole point of using you here is that you see things this briefing didn't predict. Flagging them is the job, not a failure.

Do not declare anything committed without verifying git state (`git status`, `git log`) and showing it. This is an existing hard rule in your `AGENTS.md`; it is restated here because the relay makes drift easy.

---

## 1. Why any of this is happening (strategic frame — do not re-litigate, but you need it to flag well)

ShipStacked is being repositioned. The locked conclusion from the strategy session:

- The site currently sells three incompatible stories ("proof-of-work hiring platform" / "discovery layer" / "labor layer"). The defensible one is: **ShipStacked is the independent accountability layer of the agentic economy — the verifiable record of which human is answerable for an agent's work, and whether they have been right before.**
- This is a *repointing of an existing engine, not a rebuild*. The proof-receipt schema (`src/schemas/proof-receipt-v0.1.ts`), the L0–L4 verification ladder, the `entities` table (`human|operator|fleet|agent` + `owner_user_id`), `OutcomeKind.compliance`, Atlas C-cluster roles with EU AI Act / ISO 42001 mappings — all already exist and were aimed at the wrong target.
- The buyer is the regulated operator who must produce audit trails for AI-assisted decisions. The budget line is verified real (AI-governance compliance tooling / external assurance / E&O insurance).
- **Correction made after the strategy doc was written:** the EU AI Act high-risk deadline was *delayed* on 7 May 2026 via the Digital Omnibus — standalone Annex III high-risk now applies **2 December 2027** (not August 2026), Annex I embedded **2 August 2028**. Article 50(2) watermarking/transparency still bites **2 December 2026**, and deployer transparency obligations still apply **2 August 2026**. The wedge therefore re-anchors on the **liability / insurance / customer-contract lever (live in 2026)** with the December 2027 regulatory mandate as the scale-by horizon, NOT a panic deadline. Any shipped copy that asserts an August-2026 high-risk deadline is now factually wrong.

You do not need to act on the full frame yet. You need it so that if H0 (below) touches something that conflicts with this direction, you recognize it and flag it instead of stepping on it.

---

## 2. The only approved task right now: H0 — resolve the Atlas v0.4/v0.5 incoherence

**Problem (as understood from a snapshot; verify against live before acting):**
- `src/app/atlas/page.tsx` loads `src/content/atlas-v05.md` and the hero renders "Version 0.5".
- But `ATLAS_VERSION = 'v0.4'` appears hardcoded around `src/app/atlas/page.tsx:577` (used for the DB role query and DefinedTermSet JSON-LD).
- `ATLAS_VERSION_DEFAULT = 'v0.4'` in `src/lib/atlas/roles.ts:13`.
- `src/schemas/proof-receipt-v0.1.ts:47` pins `AtlasVersion` enum to `['v0.3','v0.4']` and `ATLAS_VERSION_DEFAULT='v0.4'`.
- The page-level `DESCRIPTION` / JSON-LD `alternativeHeadline` reference "v0.4".

Net: human-visible Atlas is v0.5; its machine-readable structured data and role-set query are pinned to v0.4. For a site whose strategy is "be the machine-readable beacon / controlled vocabulary," this is a credibility defect on the exact surface the repositioning makes load-bearing.

**Constraint — do NOT freelance this.** Your repo already contains an `ATLAS_VERSION_RENAME` spec/discovery pair (`docs/v2/ATLAS_VERSION_RENAME_SPEC.md` and `docs/audit/ATLAS_VERSION_RENAME_DISCOVERY.md`). H0 must be executed *through that existing protocol artifact*, not as an ad-hoc edit. If those docs already prescribe the resolution, follow them. If they conflict with what's described above, **that is exactly the kind of surprise to flag to Thomas before proceeding** — do not reconcile it silently.

**Execution shape (follow your own AGENTS.md discovery-first protocol):**
1. Phase 1 — read-only. Open the `ATLAS_VERSION_RENAME` spec + discovery docs and the five+ cited code locations. Confirm or correct the problem statement against live code. Produce a numbered change list. **STOP. Show Thomas the change list and `git status`. Wait for explicit approval.**
2. Phase 2 — execute only the approved list. `npx tsc --noEmit` clean + `npm run build` clean (build is the route-correctness gate; run it because this touches a route + schema). Spot-check `/atlas` renders and the JSON-LD version is now coherent.
3. Verify the invariant: if the receipt-schema `AtlasVersion` enum changes, that is a schema change — check whether `schema_version` semantics in `proof-receipt-v0.1.ts` require a bump and flag the call to Thomas rather than deciding unilaterally.
4. Show the diff before pushing. After push, poll prod, confirm `/atlas` JSON-LD coherent on `https://shipstacked.com`.
5. Reversal path on hand: code-only → `git revert <sha>`. If any DDL is implicated (it should not be for H0), it goes through the Dashboard SQL Editor per AGENTS.md invariant #4, with a reversal block.

**What H0 is NOT:** it is not the repositioning, not copy changes, not the wedge. It is a contained defect fix that is a prerequisite for later citing the Atlas as a stable controlled vocabulary. Scope discipline: if you find yourself wanting to "also fix" adjacent things, flag them as a list for later, don't absorb them into H0.

---

## 3. What comes after (so you can flag forward-conflicts, not act on them)

Not approved yet. Listed so you recognize related surfaces:
- Correct the strategy discovery doc's now-false August-2026 urgency (documentation only).
- H1: homepage repositioning copy (gated on Thomas's word-for-word sign-off).
- H2: single accountability JSON-LD writer (extend `src/lib/receipts/jsonld.ts`, never fork — invariant #5).
- H3: L3/L4 paid attestation surface.
- Wedge: one real regulated AI-assisted flow, run by an existing ShipStacked power-user on their own live work, producing one independently-verifiable L4 accountability receipt. Kill-condition: if no external verifier (auditor/insurer) will say the attestation changes a price or sign-off by ~day 60, the thesis is falsified and we stop.

If H0 work surfaces anything that materially changes the viability of any of the above, flag it now — cheap to know early.

---

## 4. Hard rules (from AGENTS.md, restated because the relay makes them easy to lose)

- Brand-free (invariant #3): never name the regulated practice or any partner/brand anywhere — code, copy, comments, commits.
- Additive, never subtractive on live user-facing surfaces (invariant #6).
- Published-gate universal (invariant #2).
- One-source-of-truth markup builders (invariant #5).
- verify-agent-card stays green against prod (invariant #8).
- Discovery-first, human approval gate before Phase 2, show diff before push, verify prod after.
- No git/commit claims without showing `git status` / `git log`.
- Flag surprises; do not freelance outside the approved change list.

Begin with Phase 1 of H0. Stop at the change list. Show Thomas.
