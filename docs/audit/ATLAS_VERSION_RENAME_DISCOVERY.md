# Discovery — ATLAS_VERSION Rename (Phase 1, read-only)

**Spec:** `docs/v2/ATLAS_VERSION_RENAME_SPEC.md`
**Base:** `ab12d9a` (Atlas v0.5 essay live, v0.4 role taxonomy stable)
**Status:** Phase 1 read-only — STOP at Section H, awaiting human approval.
**§6 escalation:** **TRIGGERED** — see "§6 escalation" block below, before Section A.

---

## §6 escalation — bare `ATLAS_VERSION` exists at THREE definition sites, not one

Per spec §6: *"A callsite of `ATLAS_VERSION` exists OUTSIDE page.tsx — stop, report; the rename's blast radius is larger than assumed and must be re-scoped before any mutation."*

This is exactly that condition. The spec's known target (page.tsx:577) is ONE of three independent definitions of the bare identifier `ATLAS_VERSION`, each in a different module, each with the same misleading name and the same role-taxonomy-version semantics:

| # | File | Def line | Refs in file | In load-bearing list? | Downstream callers? |
|---|---|---|---|---|---|
| 1 | `src/app/atlas/page.tsx` | 577 | 3 (577 def, 582 `.eq`, 585 DefinedTermSet arg) | No | n/a (file-local) |
| 2 | `scripts/generate-classifier-prompt.ts` | 16 | 4 (16 def, 54/64 log msg, 58 `.eq`) | No | n/a (file-local; admin script) |
| 3 | `src/services/atlas-classifier/roles.ts` | 16 | 2 (16 def, 56 `return` inside `getAtlasVersion()`) | No | `getAtlasVersion()` is **dead export** (defined but never called) |

The spec's strict reading assumes the rename touches only `page.tsx`. **It does not.** Re-scoping options are presented in Section H (the Phase 2 change list); Thomas picks one before any mutation.

**No mutation has occurred.** The doc below documents the full state. Phase 2 is blocked pending the re-scope decision.

---

## A — Every `ATLAS_VERSION` occurrence repo-wide

Repo-wide grep on the literal string `ATLAS_VERSION` (case-sensitive). Results below are partitioned into **target identifier** (bare `ATLAS_VERSION`) and **false-positive substrings** (`ATLAS_VERSION_DEFAULT`, `ATLAS_VERSIONS`, which are lexically distinct identifiers).

### A.1 Target identifier — bare `ATLAS_VERSION` (10 occurrences across 3 files)

```
src/app/atlas/page.tsx:577:  const ATLAS_VERSION = 'v0.4'
src/app/atlas/page.tsx:582:    .eq('atlas_version', ATLAS_VERSION)
src/app/atlas/page.tsx:585:    ? buildAtlasDefinedTermSetJsonLd(ATLAS_VERSION, roleRows.map((r: any) => r.role_id))

scripts/generate-classifier-prompt.ts:16:const ATLAS_VERSION = 'v0.4';
scripts/generate-classifier-prompt.ts:54:  console.log(`Querying atlas_roles where atlas_version = '${ATLAS_VERSION}'…`);
scripts/generate-classifier-prompt.ts:58:    .eq('atlas_version', ATLAS_VERSION);
scripts/generate-classifier-prompt.ts:64:    console.error(`No rows for atlas_version='${ATLAS_VERSION}'. Reseed first.`);

src/services/atlas-classifier/roles.ts:16:const ATLAS_VERSION = 'v0.4';
src/services/atlas-classifier/roles.ts:56:  return ATLAS_VERSION;
```

All three definitions are file-scope `const` (not `export`ed). Each is independent — there is no shared import of any of them.

### A.2 False-positive substrings (NOT in scope per spec §2)

`ATLAS_VERSION_DEFAULT` and `ATLAS_VERSIONS` are **different identifiers**, each lexically distinct from bare `ATLAS_VERSION`. They are explicitly out of scope per spec §2 ("those names are already accurate"). Listed here for disambiguation only.

`ATLAS_VERSION_DEFAULT` defined at:
- `src/lib/atlas/roles.ts:13` — canonical (in 24-file load-bearing list)
- `packages/atlas-roles/src/index.ts:17` — package mirror (in 24-file load-bearing list)
- `src/schemas/proof-receipt-v0.1.ts:50` — schema-local mirror (NOT in 24-file load-bearing list; out of scope; **flagged for reconciliation backlog** as a third independent copy of the "default Atlas version" constant — interesting pattern, not this cycle)

`ATLAS_VERSIONS` defined at:
- `src/lib/atlas/roles.ts:14` — canonical (in 24-file load-bearing list)
- `packages/atlas-roles/src/index.ts:20` — package mirror (in 24-file load-bearing list)

Both `ATLAS_VERSION_DEFAULT` and `ATLAS_VERSIONS` are consumed widely (Beacon 4 build/verify, MCP tools, llms.txt route, per-role JSON-LD route, atlas roles page). Per the spec, NONE of these are in scope for this cycle.

### A.3 Documentation references (NOT in scope)

Spec files, audit docs, AGENTS.md, package READMEs mention `ATLAS_VERSION_DEFAULT` and `ATLAS_VERSIONS` as architectural references. These are docs about the constants, not callsites. NOT in scope.

---

## B — Proven complete callsite list for the target identifier

For each of the 3 definition sites, the callsite list is **exhaustively** enumerated:

### B.1 `src/app/atlas/page.tsx` (3 references)

```
577:  const ATLAS_VERSION = 'v0.4'                                                   ← definition
582:    .eq('atlas_version', ATLAS_VERSION)                                          ← Supabase query key
585:    ? buildAtlasDefinedTermSetJsonLd(ATLAS_VERSION, roleRows.map(...))           ← DefinedTermSet @id ?v= param
```

Local-scope const. Not exported. Not imported by any other module. Renaming requires updates at these 3 lines only.

### B.2 `scripts/generate-classifier-prompt.ts` (4 references)

```
16:const ATLAS_VERSION = 'v0.4';                                                     ← definition
54:  console.log(`Querying atlas_roles where atlas_version = '${ATLAS_VERSION}'…`);  ← log message
58:    .eq('atlas_version', ATLAS_VERSION);                                          ← Supabase query key
64:    console.error(`No rows for atlas_version='${ATLAS_VERSION}'. Reseed first.`); ← error message
```

Module-level const in a standalone CLI script. Not exported. The script is invoked manually (`node --env-file=.env.local scripts/generate-classifier-prompt.ts`); no module imports it. Referenced in `src/services/atlas-classifier/README.md` and `docs/v2/STEP_4_ATLAS_CLASSIFIER_SPEC.md` as documentation only (no code reference). Renaming requires updates at these 4 lines only.

### B.3 `src/services/atlas-classifier/roles.ts` (2 references)

```
16:const ATLAS_VERSION = 'v0.4';                                                     ← definition
56:  return ATLAS_VERSION;                                                           ← returned by getAtlasVersion()
```

Module-level const in a service module. Not exported with that name. Exposed indirectly via `getAtlasVersion(): string`. **`getAtlasVersion()` is dead code** — defined but never called anywhere in the repo (grep verified). The companion `getAtlasRoles()` IS live (consumed by `src/app/paste/review/page.tsx:4,34` and `src/lib/paste/publish.ts:22,121`).

Renaming the constant requires updates at lines 16 and 56 only. `getAtlasVersion()` is independently flagged for reconciliation backlog as dead code; this cycle does NOT remove it (out of scope; would touch the file's API surface).

### B.4 No cross-module references

- No `import { ATLAS_VERSION }` anywhere (grep verified).
- No `export const ATLAS_VERSION` anywhere (grep verified — all 3 are file-private `const`).
- No string-literal reference to the identifier name (e.g. no `'ATLAS_VERSION'` in any reflection or test code).

---

## C — Value confirmed

All three definitions hold the literal `'v0.4'`:

```
page.tsx:577                              const ATLAS_VERSION = 'v0.4'
scripts/generate-classifier-prompt.ts:16  const ATLAS_VERSION = 'v0.4';
services/atlas-classifier/roles.ts:16     const ATLAS_VERSION = 'v0.4';
```

Per spec §3 (Hard constraints): "**The value stays exactly `'v0.4'`. Not touched. This cycle changes a *name*, never a *value*.**"

If Phase 2 produces any diff that changes any of these values, that is a defect per spec §6: "Anything tempts changing the value `'v0.4'` 'while we're here' — absolutely not; value change is Option γ, a separate gated cycle."

---

## D — Proposed name(s) + rationale (Thomas picks)

### D.1 Recommended: `ROLE_TAXONOMY_VERSION`

**Rationale:**
- States the true semantics (the version of the *role-taxonomy* in the DB, NOT the essay).
- Reads as a noun phrase that names what the value IS, not what it's tagged in some peripheral way.
- Does NOT collide with `ATLAS_VERSION_DEFAULT` / `ATLAS_VERSIONS` (the existing accurate names in `roles.ts`).
- Makes the misclassification that caused the v0.5 Q4 regression impossible — a future reader sees "role taxonomy" and cannot mistake it for an essay-display string.

### D.2 Alternative: `ATLAS_ROLE_VERSION`

**Rationale:**
- Slightly closer to existing `ATLAS_VERSION_DEFAULT` / `ATLAS_VERSIONS` naming family (shares the `ATLAS_` prefix).
- "Role" makes the role-taxonomy meaning explicit without using the longer "taxonomy" word.
- Mildly more compact (17 chars vs 22).
- Trade-off vs D.1: marginally less explicit about the "taxonomy / controlled-vocabulary" semantics (which matters because the DefinedTermSet IS a controlled vocabulary).

### D.3 Alternative: `ATLAS_VERSION_DB`

**Rationale:**
- Names the data binding directly ("the version key that goes to the DB query").
- Compact (16 chars).
- Trade-off: emphasizes the *data binding* over the *semantic meaning*. The constant is the role-taxonomy version *because* the DB stores rows tagged with that version — the DB is the medium, not the meaning.

### D.4 NOT recommended

- `ATLAS_VERSION_v04` / similar value-baked names — couples the identifier to the current value, defeating the rename's purpose of being safe to change in a future Option γ cycle.
- Any name reusing the bare token `ATLAS_VERSION` — defeats the entire defuse.

**Default if Thomas does not specify: `ROLE_TAXONOMY_VERSION` (D.1).**

---

## E — Exact doc-comment text

The comment is mandatory per spec §3 ("the landmine sign — half the fix"). Drafted to be unmissable, concise, and state every trap-related fact a future editor needs.

### E.1 Draft (placeholder `<NAME>` is the picked name from Section D)

```ts
/**
 * The role-taxonomy / DB-row version. NOT the essay display version.
 *
 * Used to:
 *   - parameterize the Supabase `atlas_roles` query (.eq('atlas_version', ...))
 *   - build the DefinedTermSet @id (?v=...) and per-role @id refs
 *
 * The essay version is the hardcoded chrome strings, NOT this constant:
 *   - header chip in page.tsx
 *   - footer "This is v0.X" in page.tsx
 *   - alternativeHeadline in src/lib/jsonld/atlas-article.ts
 *
 * Changing this value re-points the atlas_roles query + the DefinedTermSet
 * @id and is an Option-γ action (full role-schema cycle: re-seed v0.X rows,
 * bump ATLAS_VERSION_DEFAULT/ATLAS_VERSIONS in src/lib/atlas/roles.ts,
 * update MCP role tools, regenerate Beacon 4 package snapshots). It is NOT
 * an essay-version bump.
 *
 * History: flipping this from 'v0.4' to 'v0.5' during the Atlas v0.5 essay
 * ship returned 0 DB rows and silently dropped the DefinedTermSet structured
 * data — caught by the byte-equivalence gate, fixed by the one-line revert,
 * landmine defused by this rename.
 */
const <NAME> = 'v0.4'
```

### E.2 Per-file variants (under re-scope Option B — see Section H)

If the rename extends to all 3 files (Section H Option B), the comment template above applies to each file with file-specific "Used to:" details. Specifically:

- **page.tsx** — full comment as drafted above (rendering surface + DefinedTermSet).
- **scripts/generate-classifier-prompt.ts** — same comment, with "Used to: parameterize the Supabase `atlas_roles` query when regenerating the classifier prompt file" (4 references in the script).
- **services/atlas-classifier/roles.ts** — same comment, with "Used to: returned by `getAtlasVersion()` (currently a dead export — flagged for reconciliation backlog)".

Each variant carries the same core trap statement (NOT essay version; changing value is Option γ; history of the v0.5 Q4 regression). Thomas approves the final text per file.

### E.3 Comment length consideration

The drafted comment is 20 lines. Spec §3 says "Concise but unmissable." If Thomas prefers tighter, a 6-line version:

```ts
/**
 * Role-taxonomy / DB-row version — NOT the essay display version.
 * Parameterizes the atlas_roles Supabase query + DefinedTermSet @id.
 * Essay version = hardcoded chrome strings (header chip page.tsx, footer
 * page.tsx, alternativeHeadline atlas-article.ts).
 * Changing this value is an Option-γ action (re-seed + roles.ts bump +
 * MCP + Beacon 4 package). Flipping it caused the v0.5 Q4 regression.
 */
```

Thomas picks comment length (E.1 full or E.3 tight). Default if unspecified: E.1 full (maximizes landmine-sign visibility).

---

## F — Byte-equivalence proof design

Per spec §3 ("Byte-equivalent rendered output is the load-bearing proof") and §4.4.

### F.1 Method

```bash
# Pre-rename (current state, before Phase 2 edits)
npm run dev > /tmp/dev-pre.log 2>&1 &
sleep 10
curl -s http://localhost:3000/atlas > /tmp/atlas-pre.html
pkill -f "next.*dev"; sleep 1

# Phase 2 mutation (the approved rename + comment edits per Section H)

# Post-rename
npm run dev > /tmp/dev-post.log 2>&1 &
sleep 10
curl -s http://localhost:3000/atlas > /tmp/atlas-post.html
pkill -f "next.*dev"; sleep 1

# Diff — hard-fail on ANY difference
diff /tmp/atlas-pre.html /tmp/atlas-post.html
# Expected: empty (exit 0). ANY output = STOP per spec §6.
```

### F.2 What's compared

**Full HTML body** is compared, not a subset. Rationale: a rename should affect zero rendered bytes; the only safe assertion is "every byte identical." Subsetting (only JSON-LD blocks, only the chrome) would mask hypothetical leaks.

### F.3 Hard-fail condition

ANY diff output = STOP per spec §6: "The byte-equivalence proof shows ANY diff in rendered output — stop; a rename that changes output is a bug, not a rename."

### F.4 Additional structured-data spot-checks (defense-in-depth)

After the full-HTML diff passes, also independently verify:

```bash
# Article alternativeHeadline (unchanged at "v0.5 — ...")
grep -oE '"alternativeHeadline":"[^"]+"' /tmp/atlas-post.html

# DefinedTermSet @id (must be ...?v=v0.4)
grep -oE '"@id":"https://shipstacked\.com/atlas\?v=v0\.[0-9]"' /tmp/atlas-post.html

# DefinedTermSet hasDefinedTerm count (must be 40)
grep -oE 'atlas/roles/[a-zA-Z0-9_-]+\?v=v0\.4' /tmp/atlas-post.html | sort -u | wc -l
```

If the full-HTML diff is empty AND these three values match pre-rename ("v0.5 —", "?v=v0.4", 40), byte-equivalence is proven.

### F.5 If re-scope Option B (Section H) is chosen — extending the proof to scripts + services

`scripts/generate-classifier-prompt.ts` produces a rendered prompt file (`src/services/atlas-classifier/prompts/v0.1.0.md`). The byte-equivalence proof for this script:

```bash
# Pre-rename: capture current state of the generated prompt file
sha256sum src/services/atlas-classifier/prompts/v0.1.0.md   # → pre-sha

# Phase 2: rename in scripts/generate-classifier-prompt.ts (NOT re-run the script)
# (The rename doesn't change the script's output — but to PROVE that, see below.)

# Post-rename verification: re-run the script (read-only on the DB) and compare
node --env-file=.env.local --experimental-strip-types scripts/generate-classifier-prompt.ts
sha256sum src/services/atlas-classifier/prompts/v0.1.0.md   # → post-sha

# Expected: pre-sha == post-sha. Restore the file if necessary.
```

**Caveat:** re-running the script requires `.env.local` access. If unavailable in Phase 2 verification, alternative proof: visual inspection of the rename diff in the script — confirm only identifier-name + comment lines changed; all output-affecting code paths (the `.eq` query, the renderRoleTable, the writeFile path) are byte-unchanged.

`src/services/atlas-classifier/roles.ts` has no rendered output of its own (`getAtlasVersion()` is dead; `getAtlasRoles()` doesn't touch ATLAS_VERSION). Byte-equivalence proof: tsc clean + grep confirms no consumer is affected.

---

## G — Confirmations (no infra, no value change, no test)

### G.1 No test/snapshot asserts the identifier name

- No test framework configured in this repo (AGENTS.md §Quick commands: "There is no `npm test` script and no test framework configured").
- No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, `*.snap` files exist anywhere (find verified).
- No test directory (`test/`, `tests/`, `__tests__/`) exists (find verified).
- Grep for `ATLAS_VERSION` in any file matching test/snap patterns returns empty.

Result: the rename cannot break a test.

### G.2 No version-aware infra file involved

The 24 version-aware infra files (the load-bearing list from the Atlas v0.5 ship) are:
```
src/content/atlas-v04.md, src/content/atlas-v03.md, scripts/seed-atlas-roles.ts,
src/lib/mcp/{tools,server,schemas}.ts, src/app/api/mcp/route.ts,
src/lib/atlas/{roles,parse,jsonld}.ts, src/lib/agent-card/builder.ts,
scripts/v2/verify-{agent-card,mcp}.ts,
packages/atlas-roles/{package.json, scripts/{build,verify}.ts, src/{data/roles-v0.4.ts,
data/roles-v0.3.ts, index.ts, types.ts, jsonld.ts}},
src/lib/jsonld/person.ts, AGENTS.md, CLAUDE.md
```

None of the 3 target-identifier-bearing files (`src/app/atlas/page.tsx`, `scripts/generate-classifier-prompt.ts`, `src/services/atlas-classifier/roles.ts`) is in this list. Phase 2 will NOT touch any of the 24.

Per spec §3: "All 24 version-aware infra files stay byte-0." This holds for either re-scope option in Section H.

### G.3 No value change

Per Section C: all 3 definitions hold `'v0.4'`. Phase 2 changes names only. The Phase 2 verification will grep-prove that the value at each renamed callsite is still `'v0.4'`.

### G.4 No DB touch, no Option γ leak

Phase 2 makes no DB query (other than what the renamed code path already makes), no schema mutation, no seed re-run. The constant's value `'v0.4'` is preserved; the DB query still returns the existing v0.4 rows; DefinedTermSet still emits the existing 40 entries at `?v=v0.4`.

---

## H — Numbered Phase 2 change list (each item approvable)

**§6-driven re-scope: Thomas picks one of the four options below. The change list bodies vary by option; each item within the chosen option is individually approvable.**

### H.OPT — Re-scope decision (pick exactly one)

**Option A (spec-strict)** — Rename ONLY `page.tsx`. Leave the other 2 files unchanged.
- Pro: matches the spec's strict reading; minimal scope; smallest possible diff.
- Con: the SAME landmine name with the SAME misleading semantics persists in 2 other modules. A future Q4-class regression can still bite anyone editing scripts/generate-classifier-prompt.ts or src/services/atlas-classifier/roles.ts.
- Spec quote (§0): *"the root cause — a constant whose name asserts 'essay version' while its semantics are 'role-taxonomy version' — is still in the code, unchanged, waiting to bite the next person who edits that file."* — Option A leaves this true for 2 of the 3 files.

**Option B (defuse-all — recommended)** — Rename in all 3 files with the same new name + same doc-comment template. Each file's local `const` is renamed independently (no shared import).
- Pro: fully defuses the landmine repo-wide; uniform name + uniform comment; mechanical rename per file; no behavior change in any of the 3 (each file's tsc/byte-equivalence proof applies independently).
- Con: scope expands from 1 file to 3 files. The byte-equivalence proof must extend to the classifier-prompt regeneration check (see F.5).
- Risk: still purely textual; no infra file touched; no DB touched; no value changed.

**Option C (defuse-all + unify)** — Rename + replace all 3 local definitions with one shared import (e.g. import the renamed identifier from a single source).
- Pro: removes duplication; single source of truth for the role-taxonomy version.
- Con: introduces a new shared export, which means picking a "canonical home" for the new identifier. The natural home is `src/lib/atlas/roles.ts` — but that file IS in the 24-file load-bearing list and the spec explicitly says NOT to touch it. Creating a NEW shared module is also additive scope.
- **Recommended against**: violates spec's "no infra-file touch" constraint OR introduces a new shared module beyond the cycle's scope. Defer to a future cycle if Thomas wants this.

**Option D (page.tsx now, follow-up for the other 2)** — Apply Option A this cycle, file a separate backlog item for the scripts + services renames.
- Pro: keeps THIS cycle pure-spec-strict; doesn't bundle.
- Con: same as Option A — landmine persists in 2 places until the follow-up cycle lands. Adds a backlog item that may or may not get done.

---

### H.A — Change list under Option A (spec-strict; page.tsx only)

1. **src/app/atlas/page.tsx:577 — rename** `const ATLAS_VERSION = 'v0.4'` → `const <NAME> = 'v0.4'` (where `<NAME>` is the picked name from Section D; recommended `ROLE_TAXONOMY_VERSION`).
2. **src/app/atlas/page.tsx:582 — update reference** `.eq('atlas_version', ATLAS_VERSION)` → `.eq('atlas_version', <NAME>)`.
3. **src/app/atlas/page.tsx:585 — update reference** `buildAtlasDefinedTermSetJsonLd(ATLAS_VERSION, ...)` → `buildAtlasDefinedTermSetJsonLd(<NAME>, ...)`.
4. **src/app/atlas/page.tsx, directly above the renamed line** — insert the doc-comment from Section E (E.1 full or E.3 tight, per Thomas's pick).

Files touched: 1. Lines changed: 4 (3 identifier renames + 1 comment block insertion). Value at line 577: `'v0.4'` (unchanged). 24 infra files: byte-0 each.

---

### H.B — Change list under Option B (defuse-all; recommended)

**B.1 (`src/app/atlas/page.tsx`)** — identical to H.A items 1-4 above.

**B.2 (`scripts/generate-classifier-prompt.ts`)**

5. Line 16 — rename `const ATLAS_VERSION = 'v0.4';` → `const <NAME> = 'v0.4';`.
6. Line 54 — update reference in log message: `'${ATLAS_VERSION}'` → `'${<NAME>}'`.
7. Line 58 — update reference in `.eq` query: `.eq('atlas_version', ATLAS_VERSION);` → `.eq('atlas_version', <NAME>);`.
8. Line 64 — update reference in error message: `'${ATLAS_VERSION}'` → `'${<NAME>}'`.
9. Directly above line 16 — insert the doc-comment (Section E variant for this file: classifier-prompt regeneration purpose).

**B.3 (`src/services/atlas-classifier/roles.ts`)**

10. Line 16 — rename `const ATLAS_VERSION = 'v0.4';` → `const <NAME> = 'v0.4';`.
11. Line 56 — update reference: `return ATLAS_VERSION;` → `return <NAME>;`.
12. Directly above line 16 — insert the doc-comment (Section E variant for this file: noting `getAtlasVersion()` is currently dead export).

Files touched: 3. Lines changed: 8 identifier renames + 3 comment blocks = 11 line-edits across 3 files. Values at each renamed line: `'v0.4'` (unchanged). 24 infra files: byte-0 each.

**Byte-equivalence proof for Option B:**
- For page.tsx: served `/atlas` HTML diff (F.1 method).
- For scripts/generate-classifier-prompt.ts: SHA-256 comparison of `src/services/atlas-classifier/prompts/v0.1.0.md` pre- and post-rename, via script re-run (F.5 method). Requires `.env.local` access during Phase 2; falls back to visual-diff inspection if unavailable.
- For src/services/atlas-classifier/roles.ts: no rendered output of its own; proof is tsc clean + grep of consumers (`getAtlasRoles()` users in paste/review and paste/publish — unchanged).

---

### H.C — Change list under Option C (NOT recommended — see H.OPT)

Skipped here per recommendation. If Thomas wants Option C, a separate discovery cycle is needed to design the shared module / canonical home without violating the spec's no-infra-touch constraint.

---

### H.D — Change list under Option D (page.tsx now, follow-up for the other 2)

Phase 2 of this cycle: H.A items 1-4 (page.tsx only).

Phase 2 follow-up cycle (separate backlog item): H.B items 5-12 (scripts + services). Same name + same comment template as H.A (kept consistent across cycles).

---

## STOP — Phase 1 complete

No mutation has occurred. Awaiting Thomas's:

1. **Re-scope decision (Section H.OPT)** — A, B (recommended), C (deferred), or D.
2. **Name pick (Section D)** — D.1 `ROLE_TAXONOMY_VERSION` (recommended), D.2 `ATLAS_ROLE_VERSION`, D.3 `ATLAS_VERSION_DB`, or another.
3. **Comment length (Section E)** — E.1 full (recommended) or E.3 tight.

Approval of items 1-3 unblocks Phase 2. Each numbered item in the chosen H.X change list is then individually approvable, or approvable as a block.

---

*End of Phase 1 discovery. Phase 2 blocked pending §6 re-scope decision.*
