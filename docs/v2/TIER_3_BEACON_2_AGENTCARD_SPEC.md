# ShipStacked — Tier 3, Beacon 2: AgentCard

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** Beacon 1 (commit 0ceb69a — Schema.org graph live), Consented Collections (commit a7822d7 — capability live, empty)
**Output:** A discoverable, machine-readable AgentCard at `/.well-known/agent-card.json` declaring what ShipStacked is, what it exposes, and how an agent interacts with it. The standardized "front door" agents look for.
**Status:** Second beacon in Doc 05's locked order. Additive, code-only. Discovery-first. Read-only until Thomas approves the change plan.

---

## 0. Why this is Beacon 2 (the strategic frame)

From handover Doc 05, the locked beacon order:

> Schema.org → **AgentCard at /.well-known/agent-card.json** → AGENTS.md → Atlas-as-package → MCP server → NLWeb → Agent Skill

**Note the corrected path:** Doc 05 specifies `/.well-known/agent-card.json` — NOT `/.well-known/agent.json`. Use the corrected path.

Beacon 1 made every existing *page* machine-readable (Schema.org per-page). Beacon 2 is different: it's the single, well-known, top-level **declaration** an agent fetches *first* to discover what this site is and what it offers — before crawling any page. It's the difference between "every room is labeled" (Beacon 1) and "there's a directory at the entrance" (Beacon 2).

`/.well-known/` is the RFC 8615 standard location for site-level metadata; agents and agent frameworks increasingly probe `/.well-known/agent-card.json` (and adjacent) to discover capabilities without scraping. Putting an accurate, standards-shaped card there means ShipStacked is *discoverable as agent infrastructure* by anything that follows the convention — meeting agents where they are, the core thesis.

This beacon is code-only, additive, invisible to humans, and `git revert`-reversible. It exposes nothing not already public.

---

## 1. What this is, in one sentence

A static-ish JSON document at `/.well-known/agent-card.json` that accurately declares ShipStacked's identity, the public machine-readable surfaces it offers (Beacon 1's Schema.org, the Consented Collections endpoints, the Atlas, the V2 receipt/role JSON-LD), and how an agent should interact with them — generated from the same truthful, post-Tier-1 reality as everything else.

---

## 2. Scope

**Ships in this spec:**
- A route serving `/.well-known/agent-card.json` with a valid, accurate AgentCard document.
- The card's content: ShipStacked's identity, description, the public agent-relevant endpoints that already exist (Beacon 1 Schema.org surfaces, the Consented Collections `/collections/[slug]` family, the Atlas at `/atlas` and `/atlas/roles/[id]`, the V2 receipt pages `/p/[slug]`, `/llms.txt`), each with its content-type and purpose — and a pointer to the `shipstacked:` namespace/`@context` Beacon 1 established.
- Discovery determines the exact current standard shape for an AgentCard (the spec/convention is young and evolving — terminal Claude must check what the current widely-adopted shape actually is, not assume).

**Does NOT ship here:**
- AGENTS.md (Beacon 3), Atlas npm package (Beacon 4), MCP server (Beacon 5) — separate specs
- Any change to Beacon 1 / Consented Collections / V2 surfaces (reference + reuse only; do not modify)
- Any new capability — the card *declares* what already exists; it does not add functionality
- Any production data mutation (this is a code-only static-ish endpoint)
- Listing any collection by name (collections are data and currently zero exist; the card points at the *capability*/route family generically, never a specific slug or partner)

---

## 3. Hard constraints

- **Accurate, not aspirational.** The card declares only surfaces that actually exist and work, in their actual content-types, reflecting post-Tier-1 truth. No fabricated capability, no endpoint that 404s, no claimed feature that isn't live. (Tier 0 truthfulness principle, applied to the agent-facing front door — an inaccurate AgentCard is a machine-readable lie at the most-trusted location.)
- **Standards-shaped.** Use the current, actually-adopted AgentCard shape (discovery determines it — do NOT invent a bespoke schema if a convention exists; if multiple conventions exist, pick the most widely adopted and note the choice). Where ShipStacked-specific extension is needed, use the existing `shipstacked:` namespace consistent with Beacon 1, never a new dialect.
- **Brand-free / partner-free.** Consistent with the Consented Collections rule: the card names no partner, no program, no brand, no specific collection slug. It declares the *collections capability* and its route family generically. Who consumes anything is operational and lives nowhere in the card.
- **Exposes nothing new.** Every endpoint the card points at is already publicly reachable. The card is a directory of the already-public, not a new disclosure surface.
- **Additive, no human-visible change, code-only.** No existing route, page, behavior, or layout changes. `git revert <commit>` is full reversal; no DB rollback.
- **Consistent with the well-known path conventions.** `/.well-known/agent-card.json` per Doc 05's correction. If discovery finds the convention now expects adjacent files (e.g. a companion at a related well-known path), report it; do not silently expand scope — propose and let Thomas decide.
- **Discovery before mutation.** Phase 1 read-only. Terminal Claude produces the plan, STOPS, Thomas approves Section H, then Phase 2.
- Standard gate: `tsc --noEmit` clean, `npm run build` clean. The served JSON must validate structurally and against whatever the current AgentCard convention requires.

---

## 4. PHASE 1 — Discovery (read-only, STOP, await approval)

Produce `docs/audit/BEACON_2_DISCOVERY.md`. Mutate nothing.

### 4.1 The current AgentCard standard

- Determine the current, actually-adopted shape of an AgentCard at `/.well-known/agent-card.json`. The convention is young — report what the widely-used shape actually is *as of now*, with source. If there are competing conventions (e.g. different agent frameworks expecting different shapes), enumerate them and recommend the most widely adopted, or a shape that satisfies the broadest set. Do NOT invent a schema if a real convention exists; do NOT assume a shape from memory — verify.
- Report the required vs optional fields of the chosen shape.

### 4.2 How to serve `/.well-known/` in this stack

- Determine how this Next.js app serves `/.well-known/*`. Options: a static file in `public/.well-known/`, a route handler, a rewrite. Report which is correct for this codebase given that the card's content references live surfaces (a route handler can generate it from truth at request time; a static file can drift). Recommend the approach that keeps the card accurate without manual maintenance — lean route handler if the content should reflect live config, static if it's genuinely static. State the tradeoff.
- Confirm the chosen approach doesn't collide with any existing `/.well-known/` usage (e.g. an existing `security.txt`, ACME challenge, Apple/Google association files). Report what's already there.

### 4.3 What surfaces the card should declare (accuracy audit)

Enumerate every public, agent-relevant, currently-working surface, each verified to actually exist post-Tier-1:
- Beacon 1 Schema.org surfaces (per-page JSON-LD — describe what types exist where)
- The Consented Collections route family (`/collections/[slug]`, `.json`, `.csv`, the content-negotiation) — declared generically, never a specific slug
- The Atlas (`/atlas`, `/atlas/roles/[id]` with content negotiation)
- V2 receipt pages (`/p/[slug]` with content negotiation)
- `/llms.txt` (already live)
- The `shipstacked:` namespace / `@context` location
For each: exact path, content-type(s), one-line purpose. Flag any that does NOT currently work (must not be declared if it 404s).

### 4.4 The card content draft

- Propose the exact AgentCard JSON: identity (name, description — accurate, brand-free), the declared surfaces from 4.3, the namespace pointer, any standard fields the chosen convention requires.
- The description must reflect post-Tier-1 truth: ShipStacked as proof-of-work infrastructure for AI-native builders, machine-readable, consented. No fabricated metrics (Tier 0). No partner/program names (Collections rule).
- If the convention has a "capabilities"/"skills"/"endpoints" section, populate it only with what genuinely exists.

### 4.5 Caching / serving headers

- Recommend cache headers consistent with the other JSON-LD endpoints (Beacon 1 / Collections used `public, max-age=…, stale-while-revalidate=…`). The card changes rarely; a sane cache is fine. Content-Type per the convention (likely `application/json`; confirm whether the convention wants `application/ld+json` or plain `application/json`).

### 4.6 Discovery output

`docs/audit/BEACON_2_DISCOVERY.md`, sections A–H:
- A: the current AgentCard standard (the shape, with source; competing conventions if any; recommended choice)
- B: how to serve `/.well-known/` here + existing `/.well-known/` contents (collision check)
- C: the accuracy audit — every surface to declare, each verified live
- D: the exact card JSON draft (brand-free, accurate, post-Tier-1 truth)
- E: cache/serving headers + content-type
- F: confirmation it modifies no Beacon 1 / Collections / V2 file and exposes nothing new
- G: any convention-expects-adjacent-files finding (propose, don't auto-expand)
- H: precise numbered Phase 2 change list, each item individually approvable

STOP. One-paragraph summary. Await explicit Section H approval.

---

## 5. PHASE 2 — Execution (only after Thomas approves Section H)

Execute approved Section H. Expected shape:
- The `/.well-known/agent-card.json` serving mechanism (route handler or static, per approved A/B)
- The accurate, brand-free card content per approved D
- Cache/content-type headers per approved E
- No modification to any Beacon 1 / Collections / V2 file

### 5.1 Verification (before commit)

- `curl https://localhost:3000/.well-known/agent-card.json` → 200, correct content-type, body is valid JSON and conforms to the chosen convention's required fields
- Every endpoint the card declares is independently curled and confirmed to actually return what the card claims (no declared surface 404s; content-types match) — the accuracy guarantee
- The card names NO partner/program/brand/specific-collection-slug (grep the served output)
- No Beacon 1 / Collections / V2 file modified (`git status` of those paths empty); Beacon 1 person.ts byte-unchanged
- Tier 0 / Tier 1 / Beacon 1 / Collections regressions all intact (seed-job 308, fakes 404, fake-feed 404, V2 spine 200 ld+json, `/collections/nonexistent` 404, collections/memberships/tokens still 0 rows)
- No existing `/.well-known/` resource broken (if any existed, it still serves)
- `tsc` clean, `build` clean

### 5.2 Commit + push

Commit message documents: the served path (Doc 05's corrected `/.well-known/agent-card.json`), the chosen AgentCard convention + source, every surface declared (and that each was verified live), brand-free confirmation, no-new-exposure confirmation, code-only / `git revert` = full reversal (no DB). Push, poll prod, verify on production: `curl https://shipstacked.com/.well-known/agent-card.json` → 200 valid card, and spot-check that 2–3 declared endpoints actually work on prod. Report.

---

## 6. Escalate if

- No single dominant AgentCard convention exists (multiple frameworks, incompatible shapes) — report the options, recommend, let Thomas choose the target rather than guessing
- The convention expects adjacent well-known files or a richer multi-document structure — propose, do NOT auto-expand scope
- An existing `/.well-known/` resource would be disturbed — escalate before touching
- Any surface the card should declare turns out not to actually work post-Tier-1 — do NOT declare it; report the broken surface separately
- Making the card accurate would require referencing a specific collection/partner — it must not; declare the capability generically, escalate if the convention seemingly forces specificity

---

## 7. After Beacon 2 ships

ShipStacked has both the per-page machine-readable graph (Beacon 1) and the top-level agent-discoverable front door (Beacon 2) — an agent following standard conventions can find ShipStacked and understand what it offers without scraping. Then, Doc 05 order:

- **Beacon 3:** AGENTS.md (repo/agent-instruction convention) — own spec
- **Beacon 4:** Atlas as an installable package (`@shipstacked/atlas-roles` or similar) — own spec
- **Beacon 5:** MCP server — own spec
- **Tier 4:** isolated tech-debt sweep — separate spec, internally split safe-code vs. production-data, discovery-first, the production-data items reviewed fresh

Each beacon one focused spec, discovery-first. The protocol holds.

---

*End of Beacon 2 spec.*
