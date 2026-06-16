# ShipStacked — Full Architecture Map (READ-ONLY DISCOVERY)

**For:** Claude Code, executing in `shipstacked` repo at current HEAD (post-`ab12d9a`)
**Type:** Read-only architecture inventory. Mutate nothing. No spec, no rename, no recommendations, no decisions.
**Output:** `docs/audit/SHIPSTACKED_ARCHITECTURE_MAP.md` — the authoritative system-of-record map. Accuracy and completeness over brevity. Cited to real file:line. Every component tagged **LIVE / PARKED / DEAD** with evidence.
**Why:** Strategic and build decisions are blocked until an accurate, code-derived map exists. Two sections are already verified by prior traces (see §2 and §4 below) — incorporate them, do not redo them.

---

## Hard rules
- Read-only. No file mutation, no DB writes. Read-only `SELECT COUNT(*)` is permitted and required where row counts are asked for.
- Cite everything to real `file:line` or migration/SQL source. No assertions from memory or from other audit docs without re-verifying against current code.
- Where something is ambiguous or unverifiable from the codebase, write **"ambiguous — needs deeper trace"**. Never guess, never fill a gap with a plausible answer.
- Distinguish, for every component: **LIVE** (wired, runs in prod path), **PARKED** (exists but inert/stub/manual-only/no consumer), **DEAD** (unreachable/orphaned).
- HOLD at completion. No decisions. No rename action (the A/B/C/D ATLAS_VERSION re-scope remains held).

---

## Sections required

### 1. DATA LAYER — complete
Every table (at minimum: `profiles`, `entities`, `proof_receipts`, `atlas_roles`, `claim_submissions`, `hire_confirmations`, chat/realtime tables, any consented-collections table, and any others found). For each:
- Schema (columns + types), source of truth (migration file or, if created out-of-band per AGENTS.md, the audit doc — note which and that it's unverified-in-migrations).
- Current prod row count (read-only `SELECT COUNT(*)`). Explicitly include `proof_receipts` and `claim_submissions` current counts.
- What code writes it (file:line). What code reads it (file:line).
- Every foreign key / linkage.
- **Produce the full linkage graph**: `claim_submissions` ↔ `profiles` ↔ `entities` ↔ `proof_receipts` ↔ `atlas_roles`. Show every real join/FK and every *absent* bridge (e.g. claim.email ↔ auth.users.email — is there a join or not). This graph is the spine of the map.

### 2. THE /paste + CLASSIFIER PIPELINE — incorporate verified trace
The atlas-classifier end-to-end trace is already completed and verified. Incorporate it verbatim as this section's core. **Add only** what it did not cover:
- The **analyzer** that produces the metadata the classifier ingests: what is it, where (file:line), what does it do to a pasted URL, what does it output, is it LIVE.
- The `prompts/v0.1.0.md` ↔ `generate-classifier-prompt.ts` ↔ `atlas_roles` DB-snapshot coupling (how the locked prompt stays in sync with the taxonomy).

### 3. SIGNUP / ONBOARDING — end to end
Full path from a user signing up to a `profiles` row existing. Every field written to `profiles` on creation. What is structured vs. freetext (esp. the `profiles.role` freetext column). Whether `published` auto-sets true. What an auth.users row vs. a profiles row vs. an entities row is, and how they link (the Tier-1 merge). Confirm or refute, against current code: a freshly signed-up profile has NO Atlas-role association.

### 4. THE /claim PIPELINE — incorporate verified trace
The /claim end-to-end trace is already completed and verified. Incorporate it verbatim as this section's core (form → `/api/intakes/claim` → `claim_submissions` row + 2 Resend emails; `routable` column with no in-code reader; `/admin/intakes` not built; no bridge to profiles/entities/receipts; essay-vs-reality gap). **Add only**: anything in the codebase that references `claim_submissions` for *reading* (any select, any view, any script, any admin component) — prove the "no consumer of `routable=true`" finding still holds at current HEAD, or surface a consumer if one exists.

### 5. ATLAS ESSAY / TAXONOMY PIPELINE
`atlas-v04.md` / `atlas-v05.md` → `seed-atlas-roles.ts` → `atlas_roles` table → `page.tsx` render → `DefinedTermSet` JSON-LD → MCP role-tools → Beacon 4 package. Every stage. Every `ATLAS_VERSION`-class version-coupling point across ALL files (the 3 known landmine sites: `page.tsx:577`, `scripts/generate-classifier-prompt.ts:16`, `src/services/atlas-classifier/roles.ts:16`, plus seed/MCP/package version constants). State which are LIVE vs DEAD per file.

### 6. DISCOVERY / OUTPUT SURFACES
For each: what it emits, sourced from which table/file, LIVE in prod or not.
- `src/lib/jsonld/person.ts` (the Step 3 B-1 identifier work)
- `src/lib/jsonld/atlas-article.ts`, receipt JSON-LD (`src/lib/receipts/jsonld.ts`)
- AgentCard (`src/lib/agent-card/builder.ts`), `AGENTS.md`, `llms.txt`, `/api/mcp`
- `/u/[username]`, `/p/[slug]`, `/og` — what profile/receipt/role data they render
- Beacons 1–5, Consented Collections — locate each in code, what each does, LIVE/PARKED/DEAD
- **Explicitly:** what currently consumes profile/role data and emits it to a discoverable/machine-readable surface — i.e. what is the existing "discoverability" surface, so a future routing build extends it rather than duplicating it.

### 7. WHAT THIS ENGAGEMENT SHIPPED — verify in real code
Locate in actual code each claimed shipped change; confirm present and matching claimed behavior, or flag divergence:
- Beacons 1–5; Consented Collections; Tier 4 reconciliation
- CRON_SECRET rotation (`551baff`/`0c855df`)
- MCP discovery (`781b543`)
- Step 3 B-1 person identifier (`12adb4c`)
- Privacy/Terms delta (`00db498`)
- Atlas v0.5 (`ab12d9a`)

### 8. PARKED / DEAD / DEFERRED INVENTORY
Every dead export, orphaned script, stub route, untracked doc, and deferred item, located in code:
- The 3-site `ATLAS_VERSION` landmine; dead `buildJsonLd` (`page.tsx:40-71`); dead `getAtlasVersion()`
- C-1 entity_id backfill; Option γ (full v0.5 role-infra); §F.1 profile-level role-linkage; npm publish; Part C notification email
- `/admin/intakes` (referenced in email, not built); `routable` column (no consumer)
- Any other stub/parked surface found

### 9. THE ROUTABLE-POOL PATH (surface only — do NOT design or recommend)
Read-only and descriptive ONLY. Given everything in §1–§8, surface — without proposing a solution — every existing component that sits on the path from *a vetted `claim_submissions` row* to *being discoverable on a machine-readable/routable surface*. I.e.: what tables, columns, surfaces, and code already exist that such a pipeline would have to touch or could reuse (the `routable` column, the manual-vetting columns, Consented Collections, the discovery surfaces from §6, the entities/profiles bridge, the proof_receipts role structure). List the existing pieces and the absent bridges. **No recommendation, no design, no spec — just an inventory of what's already there on that path and what is missing.** This is so a future build extends the system instead of duplicating it.

### 10. PLAIN-LANGUAGE SYSTEM SUMMARY
How ShipStacked actually works end to end, derived strictly from §1–§9, no assumptions. Written so a reader with zero prior context understands the real architecture: what a user can do, what each pipeline produces, what's live vs. aspirational, and where the essay's stated intent ("/claim is the structural mechanism by which practitioners self-classify into the routable supply pool") stands relative to implemented reality.

---

HOLD at completion. This document becomes the authoritative map. No decisions, no rename, no spec, no mutation until it is reviewed.
