# ShipStacked — Tier 3, Beacon 4: Atlas as an Installable Package

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** Beacon 1 (Schema.org), Consented Collections, Beacon 2 (AgentCard), Beacon 3 (AGENTS.md — commit c2502fa, live)
**Output:** The Atlas role taxonomy becomes a versioned, importable artifact other projects and agents can depend on — not just a page they scrape. The Atlas stops being a destination and becomes a dependency.
**Status:** Fourth beacon in Doc 05's locked order. Additive, code-only. Discovery-first. Read-only until Thomas approves the change plan.

---

## 0. Why this is Beacon 4 (the strategic frame)

From handover Doc 05, the locked order:

> Schema.org → AgentCard → AGENTS.md → **Atlas-as-package** → MCP server → NLWeb → Agent Skill

Beacons 1–3 made ShipStacked machine-readable (consume the site, discover the front door, work in the repo). Beacon 4 is a different kind of distribution: the Atlas — the role taxonomy that is ShipStacked's most reusable intellectual asset — becomes a thing other codebases and agents *take a dependency on* rather than scrape.

The strategic point, in the pivot's own terms: a taxonomy that lives only as HTML at `/atlas` is a destination — people have to come look at it. A taxonomy that's an importable, versioned package is *infrastructure* — it propagates into other people's tools, gets pinned in their dependency manifests, shows up in their builds. That is "meet them where they are" at the strongest possible level: the Atlas becomes part of *their* toolchain, not a page they remember to visit. Every project that imports it is a place ShipStacked's taxonomy now lives.

This beacon is code-only, additive, and `git revert`-reversible. It exposes nothing not already public (the Atlas is already a public page + already-public JSON-LD). It does not change the running site.

---

## 1. What this is, in one sentence

A versioned package (the Atlas roles + their machine-readable structure) generated from the SAME single source the live `/atlas` and `/atlas/roles/[id]` pages already use, published in a form other projects can install and pin, with the package and the site provably never able to disagree.

---

## 2. Scope

**Ships in this spec:**
- A package representation of the Atlas: the role taxonomy data + types, generated from the existing single source of truth (whatever `/atlas` and `/atlas/roles/[id]` already read — discovery identifies it; likely `src/lib/atlas/roles.ts` and the `ATLAS_VERSION_DEFAULT` constant Beacon 3 already cited).
- Package scaffolding: name, version (tied to `ATLAS_VERSION_DEFAULT` — the package version and the Atlas content version must not be able to drift), entry point, types, a minimal README, license.
- The one-source guarantee: the package content is *derived from* the same source the site renders, not a hand-maintained parallel copy. A build/generation step, or a shared module both consume — discovery recommends which. The site and the package must be provably incapable of disagreeing (the same invariant class as Consented Collections' one-source rule and Beacon 1's reuse rule).
- Whatever the *current standard* publish-readiness shape is for such a package (discovery determines it — package conventions evolve; verify, don't assume). NOTE: discovery determines readiness; this spec does NOT itself run `npm publish` to a public registry — see §3.

**Does NOT ship here:**
- MCP server (Beacon 5) — separate spec
- An actual `npm publish` to the public npm registry (that's an irreversible public act with a name claim — see §3; this spec makes the package *publish-ready and correct*, and the publish itself is a separate, explicit, Thomas-decides act, exactly like creating the first real Consented Collection was decoupled from building the capability)
- Any change to `/atlas`, `/atlas/roles/[id]`, the V2 atlas JSON-LD, or any Beacon 1–3 / Collections surface (reference + reuse only)
- Any production data mutation
- Any new taxonomy content — the package *packages the existing Atlas*; it does not author roles
- Versioning the package independently of the Atlas content version (they are bound — §3)

---

## 3. Hard constraints

- **One source of truth, provably.** The package's taxonomy content is generated from / shares the exact source the live site uses. It is not a hand-copied parallel. Discovery must produce a mechanism (codegen step, or a shared importable module) such that the site and the package *cannot* disagree, and a verification that proves byte/structural equivalence between what the site serves and what the package exports. This is the load-bearing invariant — a package that drifts from the live Atlas is a distributed machine-readable lie, worse than a single drifted page because consumers pin it.
- **Package version is bound to Atlas content version.** The package version derives from / is checked against `ATLAS_VERSION_DEFAULT` (Beacon 3 Inv: the canonical Atlas version is that constant). The package cannot be a version the Atlas content isn't. A mismatch is a build failure, not a silent publish.
- **Publish-ready, not published.** This spec produces a correct, installable, publish-ready package and verifies it. It does NOT execute `npm publish`. Publishing claims a public package name irrevocably and is a deliberate operational act for Thomas, decoupled from the build — the same decoupling principle as Consented Collections (build the capability; instantiating it is a separate human decision). Discovery proposes the package name; Thomas approves the name before any future publish; publishing itself is out of this spec's scope.
- **Brand-free / partner-free.** Same standing rule. The package name, README, and metadata name no partner/program/brand and contain no strategic/commercial context. It is the Atlas taxonomy and how to use it — nothing about consumers or why.
- **No secrets.** Package and its metadata contain zero credentials, zero env values. (Lower risk here than AGENTS.md but verify — a stray token in a generated file would be published.)
- **Additive, code-only.** No existing site file's behavior changes. New package files + possibly a generation script + possibly a package-aware build step that does not alter site output. `git revert` = full reversal, no DB.
- **Accurate to the current standard.** Use the current, actually-adopted shape for a publishable typed data package (discovery determines: package manifest fields, types entry, ESM/CJS expectations, etc. — verify against real current conventions, don't assume from memory).
- **Discovery before mutation.** Phase 1 read-only. Terminal Claude produces the plan + the exact proposed package structure and the one-source mechanism, STOPS, Thomas approves Section H, then Phase 2.
- Standard gate: `tsc --noEmit` clean, `npm run build` clean (the site build must be unaffected); plus the package itself must build/typecheck and its exported content must verify byte/structurally equal to the live Atlas source.

---

## 4. PHASE 1 — Discovery (read-only, STOP, await approval)

Produce `docs/audit/BEACON_4_DISCOVERY.md`. Mutate nothing.

### 4.1 The Atlas single source

- Identify exactly where the Atlas taxonomy lives in code today — the single source `/atlas` and `/atlas/roles/[id]` render from. (Beacon 3 cited `src/lib/atlas/roles.ts` + `ATLAS_VERSION_DEFAULT`; confirm and fully map: the role data shape, the version constant, any helpers, how the page and the JSON-LD builder consume it.)
- Report the exact data structure (roles, fields, the DefinedTerm/DefinedTermSet mapping Beacon 1 emits) so the package can expose the same structure without re-authoring it.

### 4.2 The current packaging standard

- Determine the current, actually-adopted shape for a publishable typed data/taxonomy package (manifest required fields, `types`/`exports` conventions, ESM vs CJS expectations as of now, what "publish-ready" means currently). Verify from real sources — package conventions move; do not assume from memory. Report required vs optional.
- Recommend the package name (brand-free, descriptive — e.g. an `@scope/atlas-roles`-style name; discovery proposes, Thomas approves before any future publish). Check name availability is NOT done here (that probes the registry / implies intent) — just propose the name; the availability check + claim is part of the separate future publish act.

### 4.3 The one-source mechanism (the load-bearing design)

- Propose HOW the package stays provably in sync with the site source. Options to evaluate:
  - **Shared module:** the package *is* (or directly re-exports) the same module the site imports — no copy exists, so drift is structurally impossible.
  - **Codegen:** a generation script reads the site source and emits the package data; a verification asserts the emitted package equals the source; the script is run in the gate and the equivalence is checked in CI/the commit gate.
- Recommend one, with the reasoning tied to §3's "provably cannot disagree." The shared-module option is structurally stronger (no copy to drift) if the repo layout allows it; codegen is acceptable if it must be a standalone artifact, but then the equivalence check is mandatory and must run at the gate. State the tradeoff and the exact verification that proves equivalence.

### 4.4 Version binding

- Propose exactly how the package version binds to `ATLAS_VERSION_DEFAULT` so they cannot drift (derive the package version from the constant; a build/gate assertion that they match; a mismatch is a hard failure). Report the current value and how the binding is enforced.

### 4.5 Publish-readiness (without publishing)

- Enumerate what makes the package publish-ready under the current standard (manifest completeness, types, license, README, files allowlist so nothing internal leaks, `.npmignore`/`files` field). Confirm NOTHING internal (specs, discovery docs, `.env`, source unrelated to the Atlas, anything brand/strategic) would be included in the published tarball — propose the `files`/ignore configuration and a verification (e.g. `npm pack --dry-run` equivalent) that lists exactly what would ship.
- Explicitly: the dry-run/pack inspection is allowed (local, no network, no registry interaction); an actual publish is NOT in scope.

### 4.6 Discovery output

`docs/audit/BEACON_4_DISCOVERY.md`, sections A–H:
- A: the Atlas single source, fully mapped (data shape, version constant, consumers)
- B: the current packaging standard (sourced; chosen shape; proposed brand-free package name)
- C: the one-source mechanism recommendation (shared-module vs codegen) + the exact equivalence verification
- D: the version-binding mechanism (package version ↔ ATLAS_VERSION_DEFAULT, mismatch = hard fail)
- E: publish-readiness checklist + the `files`/ignore config + the pack-contents verification (proving nothing internal leaks) — publish itself explicitly out of scope
- F: confirmation it modifies no site file's behavior, no Beacon 1–3 / Collections file, exposes nothing new, contains no secrets/brand/strategic content
- G: any "current standard expects X we don't do" finding (propose, don't auto-expand)
- H: precise numbered Phase 2 change list, each item individually approvable; explicitly mark the publish as a separate future Thomas-only act NOT performed in Phase 2

STOP. One-paragraph summary. Await explicit Section H approval.

---

## 5. PHASE 2 — Execution (only after Thomas approves Section H)

Execute approved Section H. Expected shape:
- Package scaffolding + the one-source mechanism (shared module or codegen per approved C)
- Version binding to `ATLAS_VERSION_DEFAULT` per approved D
- Publish-readiness config (manifest, types, README, license, `files`/ignore) per approved E — **publish-ready, NOT published**
- The equivalence verification (package exports == live Atlas source) wired so it runs at the gate
- No change to any site file's behavior

### 5.1 Verification (before commit)
- The package builds and typechecks standalone.
- **The one-source equivalence proof:** the package's exported taxonomy is byte/structurally equal to what the live site source produces — run the equivalence check, show its output. This is the load-bearing proof; a drift here is the whole failure mode.
- Package version == `ATLAS_VERSION_DEFAULT` (assert; show the values match; confirm a deliberate mismatch would hard-fail).
- Pack-contents inspection (dry-run, no network): list exactly what the published tarball *would* contain — confirm zero internal files (no specs, discovery docs, env, unrelated source), zero secrets, zero brand/strategic content, no partner names.
- Site unaffected: `/atlas` and `/atlas/roles/[id]` (HTML + `.json` + `Accept: application/ld+json`) byte-identical to pre-beacon; Beacon 1 atlas JSON-LD unchanged; `src/lib/jsonld/person.ts` byte-unchanged.
- `npx tsc --noEmit` clean, `npm run build` clean (site build unaffected).
- Tier 0 / Tier 1 / Beacon 1 / Beacon 2 / Beacon 3 / Collections regressions intact (the standard prod spot-check curls).
- `git status`: only the new package files (+ generation script / gate wiring if approved) — no unrelated tracked file modified.
- Explicit confirmation: **`npm publish` was NOT run.** No registry interaction occurred.

### 5.2 Commit + push
Commit message documents: the package + the one-source mechanism (and that site/package provably cannot disagree, with the equivalence proof), the version binding, the publish-readiness (and the explicit statement that publish was NOT performed and is a separate future Thomas-only act with the name to be approved then), brand-free / no-secrets / nothing-internal-in-pack confirmation, code-only / `git revert` = full reversal. Push, poll prod, confirm site surfaces byte-unchanged (a package addition changes no runtime behavior — confirm exactly that), report.

---

## 6. Escalate if
- The Atlas source can't be cleanly shared/codegen'd without restructuring site code (restructuring site code is NOT in scope — escalate, propose the minimal non-invasive option or defer)
- No single dominant current packaging standard (report options, recommend, Thomas chooses)
- The one-source mechanism can't *prove* equivalence (only "probably equal") — escalate; provable non-drift is the point, "probably" is not acceptable
- Making it publish-ready would require including anything internal/brand/strategic in the tarball — it must not; escalate the packaging conflict
- Version binding can't be made a hard-fail-on-mismatch — escalate (silent version drift is the exact failure to prevent)
- Anything tempts a publish "to test it" — do NOT; publish is irreversible and out of scope; escalate if verification seems to require it (it does not — pack dry-run is sufficient)

---

## 7. After Beacon 4 ships
The Atlas is a publish-ready, version-bound, provably-in-sync importable artifact — ShipStacked's most reusable asset is now infrastructure other toolchains can depend on, not a page they scrape. The publish itself remains a deliberate, decoupled, Thomas-only future act (name approved at that time), exactly as creating the first real Consented Collection was. Then, Doc 05 order:
- **Beacon 5:** MCP server — own spec
- **(Doc 05 tail:** NLWeb, Agent Skill — own specs if pursued)
- **Tier 4:** isolated tech-debt sweep — separate spec; FIRST task the locked state-vs-record reconciliation (Tier 0 redirect-vs-commit-message; any other discovery-vs-live drift), PLUS now the housekeeping items surfaced during Beacon 3 (commit `docs/audit/` audit trail; `.gitignore` the `.claude/` local-settings dir), THEN the split safe-code vs production-data work, discovery-first, production-data items reviewed fresh.

Each remaining beacon one focused spec, discovery-first. The protocol holds.

---

*End of Beacon 4 spec.*
