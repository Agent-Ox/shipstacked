# Tier 3 — Beacon 3: AGENTS.md — DISCOVERY (Phase 1)

**Author:** Claude (Opus 4.7, 1M context) — read-only discovery
**Date:** 2026-05-16
**Spec:** `docs/v2/TIER_3_BEACON_3_AGENTS_MD_SPEC.md` §4
**Status:** Phase 1 complete. STOP. Awaiting Thomas's explicit Section H approval AND verbatim Section E review before any Phase 2 mutation.
**Governing principle (Spec §3):** accurate, not aspirational; AGENTS.md must NOT become drift #3; brand-free; zero secrets; standards-shaped; only what is verifiable from code or live state during this discovery.
**Method:** read-only. Verified the AGENTS.md convention via WebFetch against agents.md + an example AGENTS.md from a major adopter (OpenAI Codex). Inventoried existing repo agent-instruction files. Re-verified the two known documentation-vs-live-state drifts directly against PROD. Sourced each candidate invariant by grepping the code AND tracing it to its `docs/` origin. No DB queries, no repo files modified except this report.

---

## ⚠️ One critical resolution surfaced during this discovery

**The "Beacon 1 homepage Person+WebSite vs Organization+WebSite" drift is a FALSE POSITIVE — Beacon 1 is shipping correctly.**

What happened: my Beacon 2 regression spot-check used the regex `"@type":\s*"[^"]+"` against prod homepage HTML. That regex matches only string-valued `@type`. The homepage Organization actually emits `@type` as an array `["Organization","shipstacked:Organization"]` — the regex skipped it entirely. The `Person` match was a NESTED `founder: {"@type":"Person","name":"Thomas Oxlee"}` inside the Organization graph.

Re-verified verbatim against prod 2026-05-16:
- Script #1: `{"@type":["Organization","shipstacked:Organization"],"@id":"https://shipstacked.com/#org",...,"founder":{"@type":"Person","name":"Thomas Oxlee"},...}` — emitted by `src/app/layout.tsx:73` via `buildOrganizationJsonLd()`
- Script #2: `{"@type":"WebSite","@id":"https://shipstacked.com/#website",...}` — emitted by `src/app/page.tsx:75` via `buildWebsiteJsonLd()`

This matches the original Beacon 1 discovery exactly. **AGENTS.md can state the homepage markup shape accurately.** Tier 4 reconciliation only needs to address the one remaining real drift (Tier 0 seed-jobs 404, see §D).

---

## SECTION A — The current AGENTS.md convention

### Adopted convention: `AGENTS.md` per agents.md (Linux Foundation, Agentic AI Foundation)

- **Source:** https://agents.md
- **Status:** "stewarded by the Agentic AI Foundation under the Linux Foundation"
- **Adoption:** 60,000+ open-source projects; tools include OpenAI Codex, Google Jules, Factory, Aider, goose, Zed, Warp, VS Code, GitHub Copilot, Cursor, JetBrains Junie, Cognition Devin, Windsurf, UiPath, Semgrep
- **Structure:** **Entirely flexible.** Verbatim from the spec: *"AGENTS.md is just standard Markdown. Use any headings you like."* No required sections, no required ordering, no version field.

### Common sections (referenced as examples, all optional)
- Project overview
- Setup / build commands
- Code style guidelines
- Testing instructions
- Security considerations
- Dev environment tips
- PR instructions

### Cross-check: an actual large-codebase AGENTS.md (openai/codex)
Project-specific cascading detail, no mandated ordering. Major headings observed include: language/area-specific conventions (e.g. "Rust/codex-rs"), per-crate guidance, style sections, test sections, API best-practices. Confirms that real-world AGENTS.md files are shaped to the codebase, not to a template.

### Chosen shape for ShipStacked

Because the convention is flexible, the shape is driven by what an agent landing in this repo actually needs. Proposed top-level sections (verbatim form in §E):

1. The Next.js warning that already exists (preserved verbatim, markers and all — see §B)
2. Quick commands (build/dev/typecheck/lint + the project's own verify scripts)
3. Project layout (key directories at useful altitude — not an exhaustive tree)
4. The invariants you must not break (§C list, with code-location + docs-source citations)
5. The discovery-first protocol (how this codebase ships)
6. Drift caveat + Tier 4 ownership
7. What's outside this file (no secrets, no strategy, no partners — and why)

No required convention is being violated by this shape — agents.md explicitly allows it. The Section H approval gate includes the verbatim AGENTS.md (§E) for word-by-word review before any Phase 2 mutation.

---

## SECTION B — Existing repo agent-instruction files + real build/test commands + structure

### Existing agent-instruction files (inventoried 2026-05-16)

| Path | Lines | Content (full) | Status |
|---|---|---|---|
| `AGENTS.md` | 5 | `<!-- BEGIN:nextjs-agent-rules -->`<br>`# This is NOT the Next.js you know`<br>`This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in node_modules/next/dist/docs/ before writing any code. Heed deprecation notices.`<br>`<!-- END:nextjs-agent-rules -->` | **EXISTS — reconciliation required.** |
| `CLAUDE.md` | 1 | `@AGENTS.md` | Claude Code import directive. Pulls AGENTS.md into the system prompt. **Updating AGENTS.md is sufficient — no separate CLAUDE.md changes needed.** |
| `.cursorrules` | — | (does not exist) | n/a |
| `.windsurfrules` | — | (does not exist) | n/a |
| `.continuerules` | — | (does not exist) | n/a |
| `.aider.conf.yml` | — | (does not exist) | n/a |
| `.github/copilot-instructions.md` | — | (`.github/` itself does not exist) | n/a |
| `.claude/` directory | — | Local-only: `settings.local.json` + `scheduled_tasks.lock`. Not part of repo agent config. | n/a |

### The reconciliation question (Spec §4.2)

**`AGENTS.md` already exists** with the `<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->` HTML-comment markers. The markers strongly suggest an automated tool (likely a `nextjs-agent-rules` package or codemod) that re-applies the warning block. **Preserve the markers and the inner content byte-exactly** — overwriting them risks both losing a load-bearing rule AND causing whatever tool wrote them to re-add a duplicate next time it runs.

Proposed reconciliation: keep the `<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->` block intact at the top of the new AGENTS.md, append the Beacon-3 content below. The warning's content (don't use training-data Next.js patterns; read `node_modules/next/dist/docs/`) IS itself one of the load-bearing invariants — keeping it at the top is correct on the merits, not just for the marker-preservation reason.

CLAUDE.md is a 1-line `@AGENTS.md` (Claude Code's file-import directive). It auto-loads AGENTS.md into the system prompt. **No CLAUDE.md change needed** — updating AGENTS.md updates what every Claude Code session sees.

### Real build / dev / typecheck / lint commands (verified from `package.json`)

```json
"scripts": {
  "dev":   "next dev",
  "build": "next build",
  "start": "next start",
  "lint":  "eslint"
}
```

- **No `test` script.** No Vitest, Jest, or Playwright config. Testing is done via per-feature verify scripts under `scripts/v2/` (each one a Node-runnable `*.ts` file using `--experimental-strip-types`).
- **No `typecheck` script.** Convention: `npx tsc --noEmit` (verified by every Tier 0 / 1 / Beacon 1 / Beacon 2 commit gate; also stored in user memory as the commit gate).
- **`npm run build`** is the route-correctness gate (verified by every commit gate).
- **`npm run lint`** runs eslint (`eslint.config.mjs` uses `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`).

### Real per-feature verify scripts (verified from `scripts/`)

| Script | Purpose | Invocation pattern |
|---|---|---|
| `scripts/v2/verify-agent-card.ts` | Beacon 2 accuracy guarantee (A2A v1.0 shape + every declared URL probed live + brand-free allowlist) | `node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000` (or `--base https://shipstacked.com`) |
| `scripts/v2/verify-step-6.ts` | V2 Step 6 publish API verification | `node --experimental-strip-types scripts/v2/verify-step-6.ts` |
| `scripts/v2/verify-step-7.ts` | V2 Step 7 public pages verification | `node --experimental-strip-types scripts/v2/verify-step-7.ts` |
| `scripts/v2/backfill-entities.ts` | Tier 1 cohort backfill (V1 profiles → V2 entities) | `node --env-file=.env.local --experimental-strip-types scripts/v2/backfill-entities.ts` |
| `scripts/v2/create-collection.ts` | Create a consented collection (no slug hardcoded in code) | `node --env-file=.env.local --experimental-strip-types scripts/v2/create-collection.ts <slug> "<display>" "<description>"` |
| `scripts/v2/mint-consent-token.ts` | Mint a single-use consent token for collection opt-in | `node --env-file=.env.local --experimental-strip-types scripts/v2/mint-consent-token.ts <slug> <profile-id>` |

### Real project structure (verified at useful altitude)

```
src/
├── app/                          Next.js 16 App Router routes
│   ├── .well-known/agent-card.json/   Beacon 2 (route handler)
│   ├── api/                      API routes (REST + content-negotiation projections)
│   │   ├── collections/[slug]/{jsonld,csv,optin,optout,optin/redeem}/
│   │   ├── paste/{analyze,classify,publish}/      V2 paste pipeline
│   │   └── ...                   apply, webhooks, etc.
│   ├── atlas/                    /atlas long-form + /atlas/roles/[id] (content-negotiated)
│   ├── collections/[slug]/       Consented Collections HTML route family
│   ├── p/[slug]/                 V2 proof receipt pages (content-negotiated)
│   ├── u/[username]/             Builder profile pages (Person JSON-LD)
│   ├── feed/                     Build feed (filtered by published=true — H9a)
│   ├── jobs/                     Job board (post-Tier-0 — see drift caveat §D)
│   ├── llms.txt/                 LLM discovery surface
│   ├── layout.tsx                Root layout — emits Organization JSON-LD site-wide
│   └── page.tsx                  Homepage — emits WebSite JSON-LD
├── lib/
│   ├── agent-card/               Beacon 2 — single-source A2A AgentCard builder
│   ├── atlas/                    V2 — Atlas role + classification helpers
│   ├── collections/              Consented Collections — assemble, jsonld, csv, consent, tokens
│   ├── jsonld/                   Beacon 1 — Schema.org markup builders (the canonical writers)
│   ├── paste/                    V2 paste classifier
│   ├── receipts/                 V2 proof-receipt assemblers
│   ├── supabase.ts               browser client
│   ├── supabase-server.ts        server client (cookies)
│   └── entities.ts               findOrCreateHumanEntity (post-Tier-1)
├── middleware.ts                 Content-negotiation rewrites (.json/.csv suffixes + Accept header)
├── components/                   (sparse) shared UI
├── services/                     atlas-classifier + paste extractors
├── schemas/                      zod schemas
└── content/                      MDX/markdown content
docs/
├── v2/                           Spec files (V2 build, Tier 0/1, Beacon 1/2/3, Gateway)
├── audit/                        Discovery docs (the read-only-Phase-1 artifacts)
└── handover/                     6 handover documents (01–06)
scripts/v2/                       Per-feature verify + admin scripts (see table above)
supabase/migrations/              SQL migrations — applied via Dashboard SQL Editor, NOT terminal
```

---

## SECTION C — The invariants (sourced from code + docs/ record)

This is the load-bearing section. Each invariant: one-line statement, code-enforcement location, `docs/` source. **Every entry is verified against code reading + the docs/ record. Any candidate I could not verify is OMITTED, not weakened.**

### C.1 Slug == username (the Tier 1 §0 invariant)

For human entities backfilled from V1 profiles, the entity `slug` is the verbatim `profile.username`. No transformation, no slugification, no lowercasing.

- **Code:** `scripts/v2/backfill-entities.ts:139-141` — `const slug = profile.username; const slugVerbatim = slug === profile.username` (logged per row; the invariant is asserted, not silently accepted).
- **Code:** `src/lib/jsonld/person.ts:123` — `const url = personId(profile.username)`; `src/lib/jsonld/context.ts` `personId(u)` resolves to `${CANONICAL_HOST}/u/${u}`.
- **Source:** `docs/v2/TIER_1_MERGE_SPEC.md` §0 (Slug == username rule); `docs/audit/MERGE_DISCOVERY.md`.

### C.2 The published-gate fake exclusion (the universal post-Tier-1 rule)

Every public surface that lists / aggregates / renders builders MUST filter on `profiles.published = true`. The 3 known test personas (`jennypeterson224`, `johnchambers73`, `oxleethomasagentox598`) have `published = false` post-Tier-1; the gate hides them everywhere a single check is enough.

- **Code — Collections:** `src/lib/collections/assemble.ts:50-66` — 4-gate filter chain explicitly documented in comments (`collections.active = true` + `profiles.published = true` + `memberships.opted_out_at IS NULL` + implicit-fake-via-published).
- **Code — Build feed list:** `src/app/feed/page.tsx:21-27` — inner-join + `.eq('profiles.published', true)`, with `// H9a` comment naming the Beacon-1 fix.
- **Code — Build feed detail:** `src/app/feed/[id]/page.tsx:16-22`, `:67-76` — same H9a pattern on both the post fetch and the author profile fetch.
- **Code — Job-apply defense-in-depth:** `src/app/api/apply/route.ts` — `.eq('status', 'active')` on the existence check (Tier 0).
- **Source:** Tier 0 `SEED_JOB_TEARDOWN_DISCOVERY.md`; Tier 1 fake-neutralization; Beacon 1 H9a (commit 0ceb69a); Consented Collections `GATEWAY_DISCOVERY.md` (revised §A/F).
- **Verified live:** /u/jennypeterson224 → 404 (gate works on prod).

### C.3 Brand-free / no-partner / no-program / no-specific-collection-slug names

**Anywhere.** Not in code, copy, comments, commit messages, tests, seeds, fixtures, specs, or shipped artifacts. Collections capability is declared GENERICALLY via the slug-parameter route family; the code never knows or cares what any collection is for.

- **Code — mechanized enforcement:** `scripts/v2/verify-agent-card.ts` `BRAND_ALLOWLIST_FORBIDDEN` array (15 tokens including all 3 collection slugs ever created); the script asserts zero matches in the served Beacon 2 body.
- **Source:** Consented Collections standing rule (verbatim in user-approval message); Beacon 2 spec §3; Beacon 2 verification §H7.
- **Verified live (Beacon 2 prod card):** zero matches across the literal allowlist.

### C.4 Migrations apply via Supabase Dashboard SQL Editor, never from terminal

No migration tool is in `package.json` scripts (verified). The terminal cannot apply DDL (no `SUPABASE_ACCESS_TOKEN`, no DB password, pooler URL has no password). The established pattern: type-confirm the DDL, hand it to Thomas to paste into the Supabase Dashboard SQL Editor, then verify the applied schema via `information_schema` SELECTs from the terminal (where SELECT-only access works).

- **Source:** Tier 1 H1 establishing the precedent (`MERGE_DISCOVERY.md`); Consented Collections H1 reapplying it (`GATEWAY_DISCOVERY.md`).
- **Files:** `supabase/migrations/` carries the canonical SQL of what was applied (5 files post-V2; commit messages cite each one).
- **Reversal:** every DDL ships with a reversal SQL block in the discovery doc + the commit message, executable by the same Dashboard route.

### C.5 One-source-of-truth markup builders

The canonical JSON-LD / AgentCard builders live in `src/lib/jsonld/`, `src/lib/agent-card/`, `src/lib/collections/jsonld.ts`, `src/lib/atlas/jsonld.ts`, `src/lib/receipts/jsonld.ts`. Each module owns one shape; each shape has exactly one writer. Downstream callers re-use the writers — they do not re-implement.

- **Beacon 1 Person:** `src/lib/jsonld/person.ts` is the SOLE full-graph Person writer for `/u/[username]`. Other modules (`atlas-article.ts`, `article.ts`, `receipts/jsonld.ts`) emit Person *references* (`@id` + `@type` + name + url) — references are not full nodes; the full node is published exactly once at the canonical URL.
- **Beacon 1 Organization / WebSite:** `src/lib/jsonld/organization.ts` (rendered by `src/app/layout.tsx:73` site-wide); `src/lib/jsonld/website.ts` (rendered by `src/app/page.tsx:75` on the homepage).
- **Beacon 2 AgentCard:** `src/lib/agent-card/builder.ts` `buildAgentCard()` is the SOLE writer; `src/app/.well-known/agent-card.json/route.ts` is a thin shell.
- **Collections JSON-LD + CSV:** `src/lib/collections/jsonld.ts` + `csv.ts` derive from one `loadConsentedCollection(slug)` in `assemble.ts` — the "one-source invariant" (HTML/JSON-LD/CSV all from one query).
- **Source:** Beacon 1 spec; Beacon 2 spec §4.2; `GATEWAY_DISCOVERY.md` §A.
- **Verified (Beacon 2 H7 + this discovery):** `src/lib/jsonld/person.ts` byte-unchanged across both Consented-Collections and Beacon-2 commits (`git diff src/lib/jsonld/person.ts` = 0 lines).

### C.6 Additive, never subtractive, on existing user-facing surfaces

When merging V2 capability into V1 surfaces (the Tier 1 §0 governing rule), changes are additive: no section removed, no link changed, no URL moved. New sections appear empty-hidden when there's nothing to show, so no existing user sees a new empty box they didn't ask for.

- **Source:** `docs/v2/TIER_1_MERGE_SPEC.md` line 32 ("same profile, same URL, same data, same leaderboard position … additive improvements where they make the product better"), line 98 ("could be ADDED without removing, reordering, or visually disrupting the existing sections"), line 110 ("additive visible improvements"), line 198 ("additive-only is non-negotiable").
- **Code witness:** Beacon 1 ships pure JSON-LD additions; no existing HTML moved. Beacon 2 added `/.well-known/agent-card.json/` only — zero tracked-file modifications (verified at commit gate). Consented Collections added new route families; touched no existing surface.

### C.7 Content-negotiation pattern (V2 → Beacon 1 → Collections consistency)

Three parallel forms for the same resource: HTML at the canonical URL, `.json` suffix → `application/ld+json`, `Accept: application/ld+json` header → `application/ld+json`. Collections adds `.csv` for the same shape under `text/csv`.

- **Code — middleware rewrites:** `src/middleware.ts:13-50` — `/p/<slug>.json` → `/api/p/<slug>/jsonld`; `/atlas/roles/<id>.json` → `/api/atlas/roles/<id>/jsonld?v=`; `/collections/<slug>.json` → `/api/collections/<slug>/jsonld`; `/collections/<slug>.csv` → `/api/collections/<slug>/csv`. Accept-header branch handles the same paths without `.json` suffix.
- **Code — projections:** `src/app/api/collections/[slug]/jsonld/route.ts` + `.csv/route.ts` (Collections); `src/app/api/p/[slug]/jsonld/route.ts` (V2 receipt); `src/app/api/atlas/roles/[id]/jsonld/route.ts` (V2 atlas role).
- **Code — `<link rel="alternate">`** wiring: `src/app/atlas/roles/[id]/page.tsx:63`, `src/app/p/[slug]/page.tsx:89` — HTML pages advertise the JSON-LD alternate.
- **Source:** V2 Step 7 spec; Beacon 1 design notes (re-use); GATEWAY_DISCOVERY.md §B (Collections extends the pattern to CSV).

### C.8 The verify-agent-card.ts accuracy guarantee (the mechanized truthfulness gate for Beacon 2)

When new public surfaces are added (Beacons 4/5, etc.), they must be added to the AgentCard `skills[]` AND `verify-agent-card.ts` must stay green. The script asserts every required A2A v1.0 field, the 4 disclaimer signals, the brand-free allowlist, and CURLS every declared `examples[]` URL live.

- **Code:** `scripts/v2/verify-agent-card.ts` (282 lines). Invocation pattern documented in C.4 commands table.
- **Source:** Beacon 2 spec §H3; commit f47a347.

### C.9 (preserved from existing AGENTS.md) Don't use training-data Next.js patterns

This version of Next.js (16.2.1) has breaking changes vs training data. Always read `node_modules/next/dist/docs/` for the relevant feature before writing route handlers, middleware, server components, or anything else where the API may have shifted. Heed deprecation notices.

- **Source:** existing `AGENTS.md` (5-line block delimited by `<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->` markers).
- **Code witness:** `package.json` pins `"next": "16.2.1"`; the codebase routinely uses App-Router-era patterns (server components by default, `permanentRedirect`, `notFound`, middleware rewrites in TypeScript) that diverge from older Next.js training-data conventions.

### Candidate invariants OMITTED (could not be verified — better short and true than long and drifted)

- **"The 14 backfilled Tier-1 cohort consists of usernames X, Y, Z..."** — could not enumerate without a DB query in this read-only phase, and the count itself has drifted (Tier 1 backfilled 17, not 14, per `backfill-entities.ts` comment line 26). Stated generically: "the post-Tier-1 verified cohort exists; published=true is the gate." No specific count or list claimed.
- **"All seed jobs return 308"** — Tier 0 commit said 308, live state is 404 (see drift §D.1). Not stated as an invariant.
- **"Every well-known file under /.well-known/ is X"** — only one well-known file exists today; over-generalizing would be aspirational.
- **"The Atlas version is X"** — read-only this phase; the version is in `src/lib/atlas/roles.ts` as `ATLAS_VERSION_DEFAULT` but the *invariant* would be "the canonical Atlas version is exposed through that constant" — true, but the value changes, so AGENTS.md cites the constant location, not the value.

---

## SECTION D — The drift caveat (handled per Spec §4.4)

### D.1 — Tier 0 seed jobs: live state is 404, commit message said 308 (real drift; DB-state vs code)

- **Live (re-verified 2026-05-16 against PROD):** `/jobs/1`, `/jobs/2`, `/jobs/3`, `/jobs/5`, `/jobs/8`, `/jobs/12`, `/jobs/20`, `/jobs/24` → **all HTTP 404**.
- **Code at `src/app/jobs/[id]/page.tsx:48-49`:**
  ```ts
  if (!job) notFound()                            // line 48 — fires for unknown ids → 404
  if (job.status !== 'active') permanentRedirect('/jobs')   // line 49 — fires for paused → 308
  ```
- **Root cause:** the rows must have been hard-deleted from the `jobs` table after the Tier 0 commit (which described soft-delete via `status='paused'` preserving rows). With no row present, line 48's `notFound()` triggers before line 49's 308. The 308 branch is alive in code; it has no qualifying rows to apply to.
- **AGENTS.md handling:** AGENTS.md does NOT claim either 308 or 404 as a "Tier 0 result." It DOES state, accurately, what the code does (`if (!job) notFound()`; `if (status !== 'active') permanentRedirect('/jobs')`) — both verifiable from the code. The historical seed-job state is irrelevant to a future agent working in the repo.
- **Ownership:** Tier 4 reconciliation owns the formal commit-vs-DB reconciliation (per spec §7).

### D.2 — Beacon 1 homepage markup: NOT A DRIFT (resolved during this discovery)

- **Live (re-verified 2026-05-16 against PROD with full HTML extraction):** the homepage emits exactly 2 `application/ld+json` scripts:
  - Script #1: `{"@type":["Organization","shipstacked:Organization"],...,"founder":{"@type":"Person","name":"Thomas Oxlee"},...}` from `src/app/layout.tsx:73` via `buildOrganizationJsonLd()`.
  - Script #2: `{"@type":"WebSite",...}` from `src/app/page.tsx:75` via `buildWebsiteJsonLd()`.
- **Root cause of the false-positive flag:** my Beacon 2 regression check used `grep -oE '"@type":\s*"[^"]+"'` — that regex matches string-valued `@type` only, and missed the array-valued `["Organization","shipstacked:Organization"]`. The `Person` match was the nested `founder` Person inside the Organization graph, not a top-level Person script.
- **AGENTS.md handling:** AGENTS.md can confidently describe the markup shape (Organization site-wide via layout; WebSite homepage-only via page) — verified true.
- **Ownership:** none — this was a flag-from-grep-artifact, not a real drift. Removing it from the "drift" tracking is appropriate; Tier 4 only owns D.1 now.

### Summary: AGENTS.md does not become drift #3

- D.1 (real): AGENTS.md states only what code says, not what historical commit messages claimed.
- D.2 (false positive, now resolved): AGENTS.md states the live-verified shape.
- Spec §3's sharpest constraint is honored: AGENTS.md asserts nothing it cannot verify from current code or current live state.

---

## SECTION E — The full proposed AGENTS.md (verbatim — for word-by-word review)

> Thomas: this is the exact content that would be written to `AGENTS.md`. Verbatim. No edits between this block and Phase 2 unless you call them out. The `<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->` markers are preserved BYTE-EXACT at the top so any tool that re-applies the warning block remains compatible.

```markdown
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# ShipStacked — repo guidance for coding agents

This file is loaded by Claude Code (via `CLAUDE.md` → `@AGENTS.md`) and by any other coding agent that reads `AGENTS.md` per the [agents.md](https://agents.md) convention. Its job is to give you the build/test commands and the load-bearing invariants of this codebase so you can work here without breaking what previous ships established.

## Quick commands

```bash
# Dev server (Turbopack)
npm run dev

# Production build — also the route-correctness gate before every commit
npm run build

# TypeScript check — also the commit gate (no separate `typecheck` script)
npx tsc --noEmit

# Lint
npm run lint
```

There is no `npm test` script and no test framework configured. Feature correctness is verified by per-feature scripts under `scripts/v2/`, each runnable with Node's TS-strip mode:

```bash
# Beacon 2 mechanized accuracy guarantee — A2A AgentCard, every declared URL probed live
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base https://shipstacked.com

# V2 step verifications
node --experimental-strip-types scripts/v2/verify-step-6.ts
node --experimental-strip-types scripts/v2/verify-step-7.ts

# Admin / data scripts (need .env.local for service-role credentials)
node --env-file=.env.local --experimental-strip-types scripts/v2/backfill-entities.ts
node --env-file=.env.local --experimental-strip-types scripts/v2/create-collection.ts <slug> "<display>" "<description>"
node --env-file=.env.local --experimental-strip-types scripts/v2/mint-consent-token.ts <slug> <profile-id>
```

Commit gate (per memory: run before commit, not after): `npx tsc --noEmit` (always) + `npm run build` (when routes change).

## Project layout

```
src/
├── app/                          Next.js 16 App Router routes
│   ├── .well-known/agent-card.json/   A2A AgentCard route handler
│   ├── api/                      REST + content-negotiation projections
│   ├── atlas/                    /atlas long-form + /atlas/roles/[id]
│   ├── collections/[slug]/       Consented Collections HTML route family
│   ├── p/[slug]/                 Proof receipt pages
│   ├── u/[username]/             Builder profile pages
│   ├── feed/                     Build feed (published-gate enforced)
│   ├── jobs/                     Job board
│   ├── llms.txt/                 LLM discovery surface
│   ├── layout.tsx                Root layout — emits Organization JSON-LD site-wide
│   └── page.tsx                  Homepage — emits WebSite JSON-LD
├── lib/
│   ├── agent-card/               A2A AgentCard builder (single source)
│   ├── atlas/                    Atlas role + classification helpers
│   ├── collections/              Consented Collections — assemble, jsonld, csv, consent, tokens
│   ├── jsonld/                   Schema.org markup builders (the canonical writers)
│   ├── paste/                    Paste classifier
│   ├── receipts/                 Proof-receipt assemblers
│   ├── supabase.ts               browser client
│   ├── supabase-server.ts        server client (cookies)
│   └── entities.ts               findOrCreateHumanEntity (post-merge)
├── middleware.ts                 Content-negotiation rewrites (.json/.csv + Accept header)
├── components/                   shared UI
├── services/                     atlas-classifier + paste extractors
└── schemas/                      zod schemas
docs/
├── v2/                           Spec files (V2 build, Tier 0/1, Beacons, Gateway)
├── audit/                        Discovery docs (read-only Phase 1 artifacts)
└── handover/                     Handover documents
scripts/v2/                       Per-feature verify + admin scripts
supabase/migrations/              SQL migrations (applied via Dashboard SQL Editor)
```

## The invariants you must not break

Each invariant cites a code-enforcement location and the spec/discovery doc it traces back to. If you find yourself wanting to violate one, **stop and escalate** — these are load-bearing.

1. **Slug == username for human entities.** For builders backfilled from V1 profiles, `entity.slug` is the verbatim `profile.username` — no slugification, no lowercasing.
   - Code: `scripts/v2/backfill-entities.ts:139-141` (`slug = profile.username`; verbatim equality asserted per row), `src/lib/jsonld/person.ts:123` (`personId(profile.username)`).
   - Source: `docs/v2/TIER_1_MERGE_SPEC.md` §0; `docs/audit/MERGE_DISCOVERY.md`.

2. **Published-gate fake exclusion is universal.** Every public surface that lists, aggregates, or renders builders MUST filter on `profiles.published = true`. Three test personas have `published=false` and the gate hides them everywhere a single check is enough.
   - Code: `src/lib/collections/assemble.ts:50-66` (4-gate filter chain, comments explain each gate); `src/app/feed/page.tsx:21-27` and `src/app/feed/[id]/page.tsx:16-22,67-76` (inner-join + `.eq('profiles.published', true)`, with `// H9a` provenance comments); `src/app/api/apply/route.ts` (`.eq('status', 'active')` defense-in-depth).
   - Source: Tier 0 `docs/audit/SEED_JOB_TEARDOWN_DISCOVERY.md`; Tier 1 fake-neutralization; Beacon 1 H9a; `docs/audit/GATEWAY_DISCOVERY.md`.

3. **Brand-free.** No partner / program / brand / specific-collection-slug name appears anywhere — not in code, copy, comments, commit messages, tests, seeds, fixtures, or shipped artifacts. Collections are *data*; their slugs are parameters. The code never knows or cares what any collection is for.
   - Mechanized: `scripts/v2/verify-agent-card.ts` `BRAND_ALLOWLIST_FORBIDDEN` array asserts zero matches in the served Beacon 2 body.
   - Source: Consented Collections standing rule; Beacon 2 spec §3 + verification §H7.

4. **Migrations apply via the Supabase Dashboard SQL Editor, not from a terminal session.** The terminal cannot apply DDL (no access token, no DB password). Pattern: type-confirm the DDL, hand it to the human to paste into the Dashboard, then verify the applied schema via `information_schema` SELECTs from the terminal. Every DDL ships with a reversal SQL block in the discovery doc and the commit message.
   - Source: Tier 1 H1 (`docs/audit/MERGE_DISCOVERY.md`); Consented Collections H1 (`docs/audit/GATEWAY_DISCOVERY.md`).
   - Files: `supabase/migrations/` carries the canonical SQL of what was applied.

5. **One-source-of-truth markup builders.** Each markup shape has exactly one writer. Downstream callers re-use the writers; they do not re-implement.
   - `src/lib/jsonld/person.ts` is the sole full-graph Person writer for `/u/[username]`. Other modules emit Person *references* (`@id` + `@type` + name + url) — not full nodes.
   - `src/lib/jsonld/organization.ts` is rendered by `src/app/layout.tsx:73` site-wide.
   - `src/lib/jsonld/website.ts` is rendered by `src/app/page.tsx:75` on the homepage only.
   - `src/lib/agent-card/builder.ts` `buildAgentCard()` is the sole A2A AgentCard writer; `src/app/.well-known/agent-card.json/route.ts` is a thin shell.
   - `src/lib/collections/jsonld.ts` + `csv.ts` derive from one `loadConsentedCollection(slug)` in `src/lib/collections/assemble.ts` (HTML / JSON-LD / CSV all from one query).
   - Source: Beacon 1 spec; Beacon 2 spec §4.2; `docs/audit/GATEWAY_DISCOVERY.md` §A.

6. **Additive, never subtractive, on existing user-facing surfaces.** When merging new capability into existing pages, do not remove sections, reorder content, or move URLs. New sections render empty-hidden if there's nothing to show.
   - Source: `docs/v2/TIER_1_MERGE_SPEC.md` lines 32, 98, 110, 198 ("additive-only is non-negotiable").

7. **Content negotiation: HTML + `.json` + `Accept: application/ld+json` (+ `.csv` for Collections).** The same resource is reachable three (or four) ways. Middleware rewrites `.json` / `.csv` suffix and the Accept header to the underlying API projection.
   - Code: `src/middleware.ts:13-50` (rewrites for `/p/`, `/atlas/roles/`, `/collections/`).
   - `<link rel="alternate" type="application/ld+json">` wiring in `src/app/atlas/roles/[id]/page.tsx:63`, `src/app/p/[slug]/page.tsx:89`.

8. **The `verify-agent-card.ts` accuracy guarantee stays green.** When a new public surface ships, it MUST be added to the AgentCard `skills[]` (`src/lib/agent-card/builder.ts`) AND the verify script must continue to pass against both local and production. The script CURLS every declared URL — a declared endpoint that 404s is a machine-readable lie at the agent front door.
   - Code: `scripts/v2/verify-agent-card.ts`; Beacon 2 commit `f47a347`.

## How this codebase ships (the discovery-first protocol)

Every non-trivial change follows the same shape:

1. **Phase 1 — Discovery (read-only).** Write a discovery doc under `docs/audit/` that enumerates the relevant code, sources each invariant the change might touch, drafts the exact change list as numbered Phase-2 items, and STOPS for human review. No code mutation in Phase 1.
2. **Human approval gate.** The discovery doc's Section H change list is approved explicitly (item-by-item or as a whole) before Phase 2 starts. Verbatim artifacts (DDL, copy, configs) are reviewed word-for-word.
3. **Phase 2 — Execution.** Make the approved changes only. Confirm with `npx tsc --noEmit` clean + `npm run build` clean. Verify regressions on the surfaces previous ships established (a quick spot-check is part of the gate). Show the diff before pushing.
4. **Push + production verification.** After push, poll for prod live, then re-run the relevant mechanized verify (e.g. `verify-agent-card.ts --base https://shipstacked.com`) against PROD. Report the proof.
5. **Reversal path stays on hand.** Code-only changes: `git revert <sha>` is full reversal. DDL changes: a reversal SQL block lives in the discovery doc + the commit message; runs through the same Dashboard SQL Editor.

The protocol exists because earlier in this codebase's history we shipped changes that drifted from their commit messages (one such drift is documented in the next section). The cost of slowing down to write a discovery doc is paid once; the cost of a silent drift is paid by every future agent that trusts the wrong document.

## Drift caveat — what this file does NOT claim

Documentation can drift from live state. To keep this file from becoming one of those drifted documents, it deliberately does NOT make these claims:

- **About the historical "seed-job" state:** the live `/jobs/<id>` behavior is what `src/app/jobs/[id]/page.tsx` says it is (`notFound()` for unknown ids → 404; `permanentRedirect('/jobs')` for non-active rows → 308). Earlier commit messages described soft-delete + 308 for specific historical ids; the rows have since changed state. Trust the code, not the historical message.
- **About specific cohort counts / usernames / collection slugs:** these are data, not invariants. The published-gate, the slug-equals-username rule, the brand-free rule — those are stable. Specific usernames or counts may change; check the DB / the relevant file before relying on them.
- **About the Atlas version number:** the canonical Atlas version is `ATLAS_VERSION_DEFAULT` in `src/lib/atlas/roles.ts`. The value changes; this file cites the constant, not the value.

A separate Tier 4 reconciliation pass will reconcile any remaining commit-message-vs-live-state gaps. Until then, this file stays honest by stating only what is currently verifiable.

## What this file does NOT contain (and why)

This file is at the repo root and the repo is public. Therefore:

- **Zero secrets, zero credentials, zero Supabase keys.** Service-role keys, JWT secrets, webhook signing secrets, and OAuth client secrets live in `.env.local` (gitignored) and in Vercel's encrypted env var store. Nothing here references them.
- **Zero internal strategic context.** No commercial reasoning, no consumer/customer details, no go-to-market context, no partner relationships. This file is operational repo guidance only.
- **Zero partner / program / brand names.** As stated in invariant #3 — the rule applies to *this file* too. Discussing the brand-free rule does not require naming any actual brand.
- **No README rewrite, no CONTRIBUTING.md, no other doc surface.** Just this one file. The specs live in `docs/v2/`; the discovery docs live in `docs/audit/`; the handovers live in `docs/handover/`.

If you need any of the above, ask the human operator — don't infer, don't guess, don't fabricate.
```

---

## SECTION F — Confirmation: no other file modified; zero secrets; brand-free; no strategic context

Phase 2 (when approved) writes ONE file: `AGENTS.md` at the repo root, content byte-matching §E. The pre-flight verification will confirm:

- **Single-file diff:** `git status` shows `AGENTS.md` modified and nothing else.
- **`<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->` markers byte-preserved** at the top — any tool that re-applies the warning block remains compatible.
- **CLAUDE.md unchanged** (1-line passthrough; updating AGENTS.md updates what Claude Code sees).
- **Beacon 1 `src/lib/jsonld/person.ts` byte-unchanged.** (Verified in this discovery: `git diff src/lib/jsonld/person.ts` = 0 lines.)
- **Beacon 2 `src/lib/agent-card/`, `src/app/.well-known/`, `scripts/v2/verify-agent-card.ts` byte-unchanged.**
- **Consented Collections (`src/lib/collections/`, `src/app/collections/`, `src/app/api/collections/`) byte-unchanged.**
- **V2 (`src/lib/receipts/`, `src/lib/atlas/`, `src/app/p/`, `src/app/atlas/`, `src/middleware.ts`) byte-unchanged.**
- **Zero secrets:** the §E content contains no API keys, no JWT secrets, no DB URLs/passwords, no OAuth secrets. Grep against the served body: zero matches for any `SUPABASE_`, `STRIPE_`, `NEXTAUTH_`, `OPENAI_`, or other env-var-name pattern.
- **Zero strategic context:** the §E content contains no commercial rationale, no consumer reference, no go-to-market context, no investor or advisor reference. (Spec §3.)
- **Brand-free verified:** grep against the §E content for the Beacon 2 literal allowlist (`appsumo`, `noah`, `kagan`, `gergely`, `orosz`, `lovable`, `cursor`, `replit`, `bolt`, `windsurf`, `anthropic-deal`, `openai-deal`, `founding-beta`, `test-alpha`, `test-beta`) — zero matches confirmed during draft.
- **`tsc` clean + `build` clean:** verified that no tooling parses AGENTS.md in a way that a content change would break (`eslint.config.mjs` doesn't include markdown; `tsconfig.json` excludes only `node_modules`; no markdown linter wired into the project).
- **Tier 0 / Tier 1 / Beacon 1 / Beacon 2 / Collections regressions intact:** a doc file change cannot affect runtime behavior, but the Phase 2 gate will include a quick spot-check on the same surfaces Beacon 2's gate exercised — same 4 prod curls.

---

## SECTION G — Existing agent-config-must-reference finding

**`CLAUDE.md` is a 1-line `@AGENTS.md` Claude Code import directive.** It already references AGENTS.md and pulls its content into the system prompt. No change required — the reference is already in place.

**No other agent-instruction file exists** (`.cursorrules`, `.windsurfrules`, `.continuerules`, `.aider.conf.yml`, `.github/copilot-instructions.md` — none present in this repo). No reconciliation needed; no other file to update.

**Note on the existing AGENTS.md content (5-line Next.js warning):** the HTML-comment markers `<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->` look like the work of an automated tool (a `nextjs-agent-rules` npm package, codemod, or CI step that re-applies the warning block on schedule). The Phase 2 plan **preserves these markers byte-exact** at the top of the new AGENTS.md, with the new Beacon-3 content appended below the closing marker (separated by `---`). This means: (a) the warning still gets re-applied cleanly if the tool runs; (b) the new content lives outside the marker block where the tool won't touch it. If you (Thomas) know which tool placed the markers, confirm — if it has special re-write behavior beyond match-replace within the markers, escalate before Phase 2.

---

## SECTION H — Proposed Phase 2 change list (FOR THOMAS APPROVAL)

Numbered, each individually approvable, each fully reversible (`git revert <sha>` reverts the whole commit; AGENTS.md being deleted would leave the codebase in its current working state — no DB, no runtime impact).

### H1 — Write `AGENTS.md` at repo root with content byte-matching §E

The single file. Preserves the existing `<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->` markers and inner content byte-exact at the top; appends the new content below a `---` separator. No other file modified.

### H2 — Pre-commit verification gate

- `npx tsc --noEmit` clean.
- `npm run build` clean (AGENTS.md is not a TS/JS file and is excluded by `tsconfig.json`; this is a paranoia check that no tooling reads it).
- `git status` shows exactly one file changed: `AGENTS.md`. Beacon 1 `person.ts`, all of `src/lib/agent-card/`, all of `src/lib/collections/`, all of `src/lib/receipts/`, `src/middleware.ts`, all V2 routes: byte-unchanged.
- `grep` AGENTS.md content for the brand-free allowlist (15 forbidden tokens) — zero matches.
- `grep` AGENTS.md content for env-var-name patterns (`SUPABASE_`, `STRIPE_`, `OPENAI_`, `NEXTAUTH_`, etc.) — zero matches.
- Spot-check that every cited code location actually exists at the cited line range (e.g. `sed -n '139,141p' scripts/v2/backfill-entities.ts` shows the slug-verbatim assertion; `sed -n '21,27p' src/app/feed/page.tsx` shows the H9a inner-join; etc.). **AGENTS.md must not become drift #3** — every cited reference is spot-checked at the gate, not at write time.
- Spot-check that every cited `docs/` source actually says what's claimed (open each cited file and confirm the line / section reference).
- Production regression spot-check (same 4 curls as Beacon 2's gate): `/atlas/roles/A1.json` 200 ld+json; `/u/jennypeterson224` 404; `/u/aniketaslaliya801` 200; `/collections/nonexistent` 404. A doc change cannot regress runtime, but this is the standing protocol.

### H3 — Commit + push

Commit message documents:
- The chosen convention (agents.md per Linux Foundation's Agentic AI Foundation; 60k+ adopters; entirely flexible structure).
- Reconciliation with existing AGENTS.md (5-line Next.js warning preserved byte-exact inside its markers).
- That invariants are sourced from code AND docs (each one has both a code line and a docs reference).
- The drift caveat handling: AGENTS.md does NOT claim the historical seed-job 308 behavior (Tier 4 owns reconciliation); the Beacon 1 homepage markup "drift" was a regex false-positive resolved during this discovery (NOT a drift).
- Brand-free / zero-secrets / zero-strategic-context confirmation.
- Code-only; `git revert` = full reversal; no DDL, no production data mutation; no runtime behavior change (a doc file at the repo root is not served).

Push to `origin/main`. Poll Vercel deploy (out of paranoia — AGENTS.md is not served, so prod behavior is unchanged). Final verification: production curls match pre-deploy. Report.

### H4 — What this spec does NOT do (explicit non-goals)

- Does NOT create a `CONTRIBUTING.md`, `README.md` rewrite, or any other doc surface.
- Does NOT modify CLAUDE.md (the 1-line passthrough already works).
- Does NOT modify any code, route, builder, schema, migration, or RLS policy.
- Does NOT resolve the Tier 0 seed-jobs DB-state drift (Tier 4 owns that).
- Does NOT add a `test` or `typecheck` script to `package.json` (the conventions are documented; adding scripts is a separate decision).
- Does NOT touch `.claude/settings.local.json` (local-only; gitignored).
- Does NOT name any partner, program, brand, or specific collection slug.

---

## Sources verified during this discovery

- **AGENTS.md convention:** https://agents.md (WebFetch — "stewarded by Agentic AI Foundation under the Linux Foundation"; 60k+ projects; flexible structure).
- **AGENTS.md example (OpenAI Codex):** https://github.com/openai/codex/blob/main/AGENTS.md (WebFetch — confirms project-specific cascading detail; no mandated ordering).
- **Existing repo state:** `ls`, `cat` of `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `.continuerules`, `.aider.conf.yml`, `.github/copilot-instructions.md`, `.claude/` — full inventory in §B.
- **`package.json` scripts + tooling:** `node -e` query (4 scripts: dev/build/start/lint, no test, no typecheck). Tooling: `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`.
- **Invariant code locations:** grep + targeted Read against each cited file (§C entries).
- **Drift #1 re-verify (Tier 0 seed jobs):** `curl -sI -L https://shipstacked.com/jobs/{1,2,3,5,8,12,20,24}` — all 404; code at `src/app/jobs/[id]/page.tsx:48-49` reads `if (!job) notFound(); if (job.status !== 'active') permanentRedirect('/jobs')`.
- **Drift #2 re-verify (Beacon 1 homepage) — resolved as false positive:** `curl -s https://shipstacked.com/ | grep -oE '<script type="application/ld\+json"[^>]*>[^<]+</script>'` — full extraction shows `["Organization","shipstacked:Organization"]` + `"WebSite"` (with nested `founder` Person inside Organization).
- **Beacon 1 `person.ts` byte-unchanged across Consented-Collections and Beacon-2 commits:** `git diff src/lib/jsonld/person.ts` = 0 lines.

---

*End of Phase 1 discovery. STOP. Awaiting Thomas's review of:*
- *Section H change list (item-by-item or as-a-whole approval)*
- *Section E verbatim AGENTS.md content (word-by-word approval; this is what gets written to disk)*

*Before Phase 2.*
