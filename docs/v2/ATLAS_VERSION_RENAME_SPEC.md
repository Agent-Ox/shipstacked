# ShipStacked — Backlog Cycle: ATLAS_VERSION Rename (defuse the landmine)

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** the clean base at `ab12d9a` (Atlas v0.5 essay live, v0.4 role taxonomy stable).
**Output:** The constant whose name lies about its semantics is renamed so it cannot be misread again. Zero behavior change. The rendered page — essay AND structured data — is byte-equivalent before and after.
**Status:** Reconciliation-backlog cycle. The single backlog item that defuses a trap rather than tidies. Discovery-first, full gate — deliberately, because "this is a low-risk refactor" is the exact framing that caused the original Q4 regression.

---

## 0. Why this, specifically

During the Atlas v0.5 ship, `const ATLAS_VERSION = 'v0.4'` (page.tsx:577) was misclassified as a chrome/essay-version string and flipped to `'v0.5'`. Its real semantics are the **role-taxonomy DB key**: it parameterizes the Supabase `atlas_roles` query and the `DefinedTermSet` `@id`. Flipping it returned 0 rows → the `DefinedTermSet` structured data regressed to absent. The gate caught it; the one-line revert fixed it. But the *root cause* — a constant whose name asserts "essay version" while its semantics are "role-taxonomy version" — is still in the code, unchanged, waiting to bite the next person who edits that file. This cycle removes the trap. It is not cosmetic: it is the only backlog item that prevents a recurrence of a regression that already happened.

---

## 1. What this is, in one sentence

Rename `ATLAS_VERSION` → a name that states its true semantics (recommended: `ROLE_TAXONOMY_VERSION`), add a doc-comment pinning the meaning, update every callsite, change no value and no behavior, and prove the rendered page (essay + DefinedTermSet) is byte-identical before and after.

---

## 2. Scope

**Ships:**
- Rename the constant at `src/app/atlas/page.tsx:577` from `ATLAS_VERSION` to a semantically honest name. Recommended `ROLE_TAXONOMY_VERSION`; discovery may propose an alternative if it finds a stronger convention already in the codebase (e.g. matching `ATLAS_VERSION_DEFAULT` / `ATLAS_VERSIONS` naming in `src/lib/atlas/roles.ts`). Thomas picks the final name.
- Add a doc-comment directly above it stating, unambiguously: this is the role-taxonomy / DB-row version, NOT the essay display version; the essay version is the hardcoded chrome strings (header chip, footer, `atlas-article.ts` alternativeHeadline); changing this value re-points the `atlas_roles` DB query and the `DefinedTermSet` `@id` and must only ever change as part of a deliberate role-schema (Option γ) cycle.
- Update every callsite of the renamed constant (discovery enumerates them — known: page.tsx:582 the `.eq('atlas_version', …)` query, page.tsx:585 the `buildAtlasDefinedTermSetJsonLd(…)` arg; discovery must prove these are the ONLY two and find any others).
- The value stays exactly `'v0.4'`. Not touched. This cycle changes a *name*, never a *value*.

**Does NOT ship:**
- Any value change. `'v0.4'` stays `'v0.4'`. If the diff changes any string value anywhere, that is a defect — stop.
- Any behavior change. The DB query, the DefinedTermSet emission, the essay render must be byte-identical before/after.
- The other backlog items (dead `buildJsonLd`, live-v0.4 cursor refs, person.ts Noah-docstring, AgentCard beacon drifts, untracked discovery docs) — each its own cycle, NOT bundled.
- Any Option γ work (v0.5 role seed, v0.5 DefinedTermSet, MCP role-tools, Beacon 4 package). This cycle makes the *next* γ cycle safer; it does not perform any of it.
- Any DB touch, any production-data mutation, any version-aware infra file change beyond the rename's callsites (which are all in page.tsx).
- Renaming `ATLAS_VERSION_DEFAULT` or `ATLAS_VERSIONS` in `src/lib/atlas/roles.ts` — those names are already accurate (they clearly refer to the role-taxonomy version set). Only the *misleadingly-named* `page.tsx` constant is in scope. If discovery finds those two are also ambiguous, flag it — do NOT rename them here.

---

## 3. Hard constraints

- **Pure rename. Zero value change, zero behavior change.** The point of the cycle is that a future reader cannot misread the constant — achieved entirely by the name + comment. If anything other than an identifier name (and its callsite references) and an added comment changes, that is out of scope — stop and report.
- **Byte-equivalent rendered output is the load-bearing proof.** Capture the served `/atlas` HTML before and after the rename. The `DefinedTermSet` block (@id, the 40 role entries, all `?v=v0.4`), the Article JSON-LD, the essay chrome, must be byte-identical. This is the same proof discipline as the Beacon 4/5 single-source extractions: a rename that changes output is not a rename, it's a bug.
- **All 24 version-aware infra files stay byte-0.** The rename is confined to `page.tsx`. `atlas-v04.md`, `atlas-v05.md`, `roles.ts`, seed script, MCP, Beacon 4 package, etc. — git diff 0 each. If the rename appears to require touching any of them, that means a callsite exists outside page.tsx that discovery must surface FIRST — stop, report, do not spread the rename silently.
- **The doc-comment is mandatory and is half the fix.** The rename alone makes it harder to misread; the comment makes it impossible to misread by stating the trap explicitly ("this is NOT the essay version; the essay version lives in the chrome strings; changing this value is an Option γ action"). A future editor — or a future Claude — must hit that comment before they can flip the value. The comment is not optional polish; it is the landmine sign.
- **Discovery before mutation.** Phase 1 read-only: enumerate every callsite of `ATLAS_VERSION` across the WHOLE repo (not just page.tsx — prove it's not referenced elsewhere), confirm the value is `'v0.4'`, confirm no test/snapshot asserts the identifier name, design the byte-equivalence proof. STOP. Thomas approves Section H + picks the final name. Then Phase 2.
- **`git revert` = clean.** Pure rename; revert restores the old name, no data, no behavior implication.
- Standard gate: tsc/build clean, byte-equivalence proof (before==after rendered /atlas), 24 infra files byte-0, brand-free unaffected (this touches no content), git status only page.tsx.

---

## 4. PHASE 1 — Discovery (read-only, STOP, await approval)

Produce `docs/audit/ATLAS_VERSION_RENAME_DISCOVERY.md`. Mutate nothing.

### 4.1 Callsite enumeration (whole repo)
- `grep -rn` for `ATLAS_VERSION` across the entire repo (src, scripts, packages, tests, configs). Report EVERY occurrence with file:line and what it does. Distinguish the target constant from any false-positive substring matches (e.g. `ATLAS_VERSION_DEFAULT`, `ATLAS_VERSIONS` in roles.ts are DIFFERENT identifiers — confirm they are lexically distinct and NOT in scope).
- Confirm the target constant's only callsites. Known: page.tsx:577 (definition), :582 (`.eq` query), :585 (DefinedTermSet arg). Prove there are no others (no import/export of it, no test asserting the name).
- Confirm the value is exactly `'v0.4'`.

### 4.2 Name proposal
- Recommended `ROLE_TAXONOMY_VERSION`. Check the codebase for an existing naming convention that would make a different name more consistent (esp. vs `roles.ts`'s `ATLAS_VERSION_DEFAULT` / `ATLAS_VERSIONS`). Propose the final name + 1-line rationale. Thomas picks.

### 4.3 The doc-comment text
- Draft the exact comment. It must state: (a) this is the role-taxonomy/DB-row version; (b) it is NOT the essay display version; (c) the essay version is the hardcoded chrome (header chip page.tsx, footer page.tsx, alternativeHeadline atlas-article.ts); (d) changing this value re-points the atlas_roles query + DefinedTermSet @id and is an Option-γ action, not an essay-version bump. Concise but unmissable.

### 4.4 Byte-equivalence proof design
- Exact method: capture served `/atlas` HTML (local) pre-rename → rename → re-capture → diff. Specify what's compared (full HTML, or the JSON-LD blocks + chrome specifically) and the hard-fail condition (any diff = stop). Same discipline as Beacon 4/5 byte-identical proofs.

### 4.5 Output
`docs/audit/ATLAS_VERSION_RENAME_DISCOVERY.md`, A–H:
- A: every `ATLAS_VERSION` occurrence repo-wide, target vs false-positive disambiguated
- B: proven complete callsite list for the target constant
- C: value confirmed `'v0.4'`
- D: proposed name(s) + rationale, Thomas to pick
- E: exact doc-comment text
- F: byte-equivalence proof design
- G: confirmation no test/snapshot asserts the identifier; no infra file involved; no value change
- H: numbered Phase 2 change list (the rename edits + the comment), each approvable

STOP. One-paragraph summary. Await Section H approval + name pick.

---

## 5. PHASE 2 — Execution (only after approval + name pick)

Apply the approved rename + comment. Touch only `src/app/atlas/page.tsx`.

### 5.1 Verification (before commit)
- **Byte-equivalence (load-bearing):** served `/atlas` HTML before == after. DefinedTermSet (@id `?v=v0.4`, 40 roles), Article JSON-LD, chrome — byte-identical. ANY diff = STOP.
- Value unchanged: the renamed constant still `= 'v0.4'`. grep proves no value anywhere changed.
- All callsites updated: no remaining reference to the old `ATLAS_VERSION` identifier; tsc proves no dangling reference.
- 24 version-aware infra files git diff 0 each (incl. atlas-v04.md, atlas-v05.md, roles.ts, seed, MCP, Beacon 4 package).
- `ATLAS_VERSION_DEFAULT` / `ATLAS_VERSIONS` in roles.ts byte-unchanged (different identifiers, not in scope — prove untouched).
- tsc clean, build clean, /atlas 200.
- git status: ONLY src/app/atlas/page.tsx modified (+ the discovery doc). Nothing else.

### 5.2 Commit + push
Commit message documents: pure rename of the misleadingly-named constant that caused the v0.5 Q4 DefinedTermSet regression; new name + the doc-comment (the landmine sign); zero value change, zero behavior change; byte-equivalence proof (rendered /atlas identical before/after, DefinedTermSet 40 roles `?v=v0.4` unchanged); 24 infra files byte-0; `git revert` clean. Push, poll prod, post-deploy re-prove: prod `/atlas` DefinedTermSet still 40 roles `?v=v0.4` byte-identical to pre-deploy (the rename changed a name, the served page did not move). Report SHA + the prod DefinedTermSet count/@id.

---

## 6. Escalate if
- A callsite of `ATLAS_VERSION` exists OUTSIDE page.tsx — stop, report; the rename's blast radius is larger than assumed and must be re-scoped before any mutation
- A test/snapshot asserts the identifier name — stop, report; the rename needs the test updated in the same atomic change and that's a scope addition to approve
- The byte-equivalence proof shows ANY diff in rendered output — stop; a rename that changes output is a bug, not a rename
- Applying the rename appears to require touching any version-aware infra file — stop; that means an undiscovered callsite, re-run discovery
- Anything tempts changing the value `'v0.4'` "while we're here" — absolutely not; value change is Option γ, a separate gated cycle

---

## 7. After this ships
The landmine is defused: the constant's name and comment make its semantics impossible to misread, so the Q4-class regression (essay-version bump silently breaking the role DefinedTermSet) cannot recur. The next Option γ cycle (whoever does the real v0.5 role-schema work) now has an explicit signpost telling them exactly what changing that value means. Remaining backlog (dead buildJsonLd, live-v0.4 cursor refs, person.ts Noah-docstring, AgentCard beacon drifts, untracked discovery docs, the Part C notification email) — each its own cycle, none urgent, none bundled here.

---

*End of ATLAS_VERSION rename spec.*
