# ShipStacked — Tier 3, Beacon 3: AGENTS.md

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** Beacon 1 (Schema.org graph), Consented Collections, Beacon 2 (commit f47a347 — AgentCard live)
**Output:** An `AGENTS.md` at the repo root following the current convention, so any coding agent working in this repo has accurate, standards-shaped instructions for how to build, test, and respect the invariants this codebase has accumulated across V2 + Tiers 0–1 + Beacons 1–2 + Consented Collections.
**Status:** Third beacon in Doc 05's locked order. Additive, code-only, repo-facing. Discovery-first. Read-only until Thomas approves the change plan.

---

## 0. Why this is Beacon 3 (the strategic frame)

From handover Doc 05, the locked order:

> Schema.org → AgentCard → **AGENTS.md** → Atlas-as-package → MCP server → NLWeb → Agent Skill

Beacons 1 and 2 made ShipStacked machine-readable to agents that *consume the running site*. Beacon 3 is a different audience: agents that *work on the repo itself*. `AGENTS.md` is the emerging cross-tool convention (adopted across multiple coding-agent ecosystems) for a single, predictable file at the repo root that tells a coding agent how to build, test, lint, and — critically here — what invariants it must not break.

For this specific codebase that last part is the real value. Six production ships have accumulated hard-won invariants that are *not obvious from the code*: the slug-equals-username rule, the published-gate fake-exclusion across multiple surfaces, the brand-free/no-partner-name rule, the Dashboard-SQL-Editor migration loop, the discovery-first protocol, the "additive never subtractive" merge constraint, the one-source-of-truth builders. An agent (or a future session) that touches this repo without knowing these will reintroduce exactly the bugs the protocol caught. `AGENTS.md` encodes them where any agent will look.

This beacon is code-only, additive, a single new file (plus possibly references), `git revert`-reversible, and changes nothing the running site does.

---

## 1. What this is, in one sentence

A single accurate `AGENTS.md` at the repo root, following the current convention, that gives any coding agent the build/test commands and the load-bearing invariants of this codebase so it can work here without breaking what six production ships established.

---

## 2. Scope

**Ships in this spec:**
- `AGENTS.md` at the repo root, current-convention-shaped.
- Content: how to build/dev/typecheck/test; the project's structure at a useful altitude; and an explicit, accurate "invariants you must not break" section derived from the actual shipped history (the spec/discovery/commit record in `docs/`).
- Discovery determines the *current* AGENTS.md convention (it's young — verify, don't assume) and whether any agent tooling in this repo already expects a specific file.

**Does NOT ship here:**
- Atlas npm package (Beacon 4), MCP server (Beacon 5) — separate specs
- Any change to Beacon 1 / 2 / Collections / V2 code or behavior
- Any production data mutation
- Any new functionality (this is a documentation artifact for repo-working agents)
- Resolving the two known documentation-drift items (Tier 0 404-vs-308, Beacon 1 homepage markup) — those are Tier 4's reconciliation; AGENTS.md must not assert anything about them it can't verify (see §3)
- A CONTRIBUTING.md, README rewrite, or any other doc surface — just AGENTS.md

---

## 3. Hard constraints

- **Accurate, not aspirational — and this one is sharp here.** Two documentation-vs-live-state drifts are already known (Tier 0 seed jobs 404 vs the commit's 308 description; Beacon 1 homepage emits Person+WebSite vs a discovery doc's Organization+WebSite). `AGENTS.md` must NOT restate claims it cannot verify against the live code/state. Where an invariant is verifiable from code, state it. Where the historical record is known-drifted, either omit it or state only the verifiable part. AGENTS.md becoming a third drifted document is the specific failure to avoid — it is the file agents will trust most.
- **Standards-shaped.** Use the current, actually-adopted `AGENTS.md` convention (discovery determines it; if multiple/ambiguous, pick the most widely adopted and note the choice). Don't invent a bespoke structure if a convention exists.
- **Brand-free / partner-free.** Same standing rule. The invariants section will *document the rule itself* ("no partner/program/brand names anywhere in code, copy, commits, comments") but must not, in doing so, name any actual partner. Document the constraint without violating it.
- **Invariants must be the real ones, sourced.** The "do not break" section is the heart of this file. Each invariant must be traceable to the actual shipped record in `docs/` (specs, discovery docs, commit history) — not invented, not aspirational. Discovery enumerates them with their source.
- **Additive, code-only, single file.** No existing file modified (unless discovery finds an existing agent-config file that conventionally must reference AGENTS.md — if so, that's an escalation, propose don't auto-edit). `git revert` = full reversal, no DB.
- **No secrets, no internal-only context.** AGENTS.md is repo-root and effectively public (the repo is on GitHub). It must contain zero credentials, zero Supabase keys, zero internal strategic context (nothing about *why* beacons exist commercially, nothing about consumers, nothing partner-related). It is operational repo guidance only.
- **Discovery before mutation.** Phase 1 read-only. Terminal Claude produces the plan + the exact proposed AGENTS.md content, STOPS, Thomas approves Section H, then Phase 2.
- Standard gate: `tsc --noEmit` clean, `npm run build` clean (a doc file shouldn't affect these, but confirm nothing — e.g. a tooling config that parses AGENTS.md — breaks).

---

## 4. PHASE 1 — Discovery (read-only, STOP, await approval)

Produce `docs/audit/BEACON_3_DISCOVERY.md`. Mutate nothing.

### 4.1 The current AGENTS.md convention

- Determine the current, actually-adopted `AGENTS.md` structure/convention from real sources (it's young — verify, cite sources, do not assume from memory). Report the typical sections (build/test commands, project layout, conventions, etc.), required vs optional.
- If multiple conventions exist, enumerate and recommend the most widely adopted.

### 4.2 Existing repo state

- Is there already an `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, or any agent-instruction file? Report all that exist, verbatim location + a summary of content. If one exists, this beacon RECONCILES (does not duplicate or contradict) — report how.
- What are the actual build/dev/typecheck/test/lint commands for this repo (from `package.json` scripts, CI config, the patterns terminal Claude itself has used across this engagement)? These must be the real, working commands.
- The actual project structure at a useful altitude (the `src/lib/jsonld/`, `src/lib/agent-card/`, `src/lib/collections/`, the V2 `src/lib/receipts/` `src/lib/atlas/`, the route layout) — enough for an agent to orient, not an exhaustive tree.

### 4.3 The invariants — sourced from the shipped record

This is the load-bearing section. From the actual `docs/` record (specs, discovery docs, commit messages) and the code, enumerate the real invariants an agent must not break. Expected (verify each against code/record, cite source, do NOT include any that can't be verified):
- Slug-equals-username for entities (Tier 1 §0; verifiable in `src/lib/jsonld/person.ts` / entity backfill).
- The published-gate fake-exclusion pattern across surfaces (Tier 0 `/api/apply`, Tier 1 fake neutralization, Beacon 1 H9a feed filter, Collections 4-gate) — the universal "published=true is the fake gate" rule.
- Brand-free / no-partner/program/brand names anywhere in code, copy, commits, comments (Collections rule; Beacon 2 allowlist).
- Migrations apply via Supabase Dashboard SQL Editor, never from a terminal session; type-confirm DDL; verify via information_schema; record reversal SQL in the commit (Tier 1 precedent).
- One-source-of-truth builders: `src/lib/jsonld/person.ts` is the only Person-markup writer; collections reuse it byte-unchanged; same single-source pattern for agent-card and collections.
- Additive-never-subtractive for anything touching existing user-facing surfaces (Tier 1 §0).
- Content-negotiation pattern for `.json` / `Accept: application/ld+json` parallels (V2 → Beacon 1 → Collections consistency).
- The `verify-agent-card.ts` accuracy guarantee must stay green when surfaces change (Beacon 2).
For each: one-line statement, where it's enforced in code, source in `docs/`. **Omit any candidate invariant that cannot be verified from code or the record** — better a shorter true list than a longer drifted one.

### 4.4 The drift caveat

- Explicitly handle the two known documentation drifts: AGENTS.md must not assert the Tier 0 seed-job redirect behavior or the Beacon 1 homepage markup shape unless verified live during this discovery. Report what's actually true for each (quick read-only check) and have AGENTS.md state only the verified reality, or omit. Note in the discovery doc that Tier 4 owns the formal reconciliation; AGENTS.md just must not become drift #3.

### 4.5 Proposed AGENTS.md content

- Produce the exact, full proposed `AGENTS.md` text, verbatim, in the discovery doc for Thomas to read word-for-word. Standards-shaped, accurate, brand-free, no secrets, invariants sourced.

### 4.6 Discovery output

`docs/audit/BEACON_3_DISCOVERY.md`, sections A–H:
- A: the current AGENTS.md convention (sourced; chosen shape)
- B: existing repo agent-instruction files + real build/test commands + structure
- C: the sourced invariants list (each with code location + docs source; drifted/unverifiable ones omitted)
- D: the drift-caveat handling (what's verified-true for the 2 known drifts; what AGENTS.md says or omits)
- E: the full proposed AGENTS.md verbatim
- F: confirmation it modifies no other file, contains no secrets/credentials/strategic-context, names no partner
- G: any existing-agent-config-must-reference-it finding (propose, don't auto-edit)
- H: precise numbered Phase 2 change list

STOP. One-paragraph summary. Await explicit Section H approval.

---

## 5. PHASE 2 — Execution (only after Thomas approves Section H)

- Create `AGENTS.md` at repo root with the approved content.
- If discovery found an existing agent-instruction file: reconcile per approved plan (no duplication, no contradiction) — only as explicitly approved in Section H.
- Modify nothing else.

### 5.1 Verification (before commit)
- `AGENTS.md` exists at repo root, content byte-matches the approved D.
- Every build/test command in it actually runs (terminal Claude executes each to confirm it's real and current).
- Every invariant's cited code location actually exists and the cited `docs/` source actually says what's claimed (spot-check each — AGENTS.md must not be drift #3).
- grep: zero credentials, zero partner/program/brand names, zero internal strategic context.
- No other tracked file modified (`git status` — only the new file). Beacon 1 `person.ts` and all prior surfaces byte-unchanged.
- `tsc` clean, `build` clean; no tooling that parses agent-config breaks.
- Tier 0 / Tier 1 / Beacon 1 / Beacon 2 / Collections regressions intact (quick spot-check; a doc file shouldn't affect them — confirm).

### 5.2 Commit + push
Commit message documents: the convention followed + source, that invariants are sourced from the shipped record, the drift-caveat handling (AGENTS.md states only verified reality; Tier 4 owns reconciliation), brand-free / no-secrets confirmation, code-only / `git revert` = full reversal. Push, poll prod (no behavior change expected — confirm site unaffected, AGENTS.md is repo-only and not even served), report.

---

## 6. Escalate if
- No single dominant AGENTS.md convention exists — report options, recommend, let Thomas choose
- An existing agent-instruction file conflicts and reconciliation isn't clean — propose, don't auto-merge
- A candidate invariant cannot be verified from code or the record — omit it and note why (do NOT include unverifiable invariants to be "complete")
- Either known drift turns out worse than documented (e.g. the live state contradicts multiple records) — report it; still don't fix it here (Tier 4), just keep AGENTS.md truthful
- Writing accurate invariants would require including a partner/strategic detail — it must not; document the *rule* generically, escalate if that seems impossible

---

## 7. After Beacon 3 ships
Any agent (or future session) working in this repo has accurate, standards-shaped guidance and the real invariants — the protocol's hard-won rules are now in the file agents trust most, not just in scattered specs. Then, Doc 05 order:
- **Beacon 4:** Atlas as an installable package — own spec
- **Beacon 5:** MCP server — own spec
- **Tier 4:** isolated tech-debt sweep — separate spec; FIRST task is the locked state-vs-record reconciliation (Tier 0 redirect behavior, Beacon 1 homepage markup, any other discovery-vs-live drift), THEN the split safe-code vs production-data work, discovery-first, production-data items reviewed fresh.

Each remaining beacon one focused spec, discovery-first. The protocol holds.

---

*End of Beacon 3 spec.*
