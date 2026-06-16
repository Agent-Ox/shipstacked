# ShipStacked — Tier 3, Beacon 5: MCP Server

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** Beacons 1–4 (Schema.org, AgentCard, AGENTS.md, Atlas package — commit 2464bee, live), Consented Collections
**Output:** A read-only MCP endpoint inside the existing Next.js app that lets agents *call* ShipStacked as a tool — query the Atlas, look up a builder, fetch a collection — instead of scraping. The last core beacon in Doc 05's order.
**Status:** Discovery-first, with elevated rigor: unlike Beacons 1–4 (static artifacts), this one RUNS. Read-only until Thomas approves the change plan.

---

## 0. Why this is Beacon 5, and why it's different (the strategic + risk frame)

From handover Doc 05, the locked order:

> Schema.org → AgentCard → AGENTS.md → Atlas-as-package → **MCP server** → NLWeb → Agent Skill

Beacons 1–4 made ShipStacked machine-*readable* (consume the markup, discover the front door, work in the repo, depend on the package). Beacon 5 makes it machine-*callable*: an agent asks ShipStacked a question through a standard protocol and gets a structured answer, without scraping HTML or guessing URLs. This is the strongest "meet them where they are" — the agent's own runtime calls ShipStacked as a native tool.

**This beacon is materially different in risk class from 1–4 and the spec treats it that way:**
- Beacons 1–4 were static or build-time artifacts. `git revert` = the thing is gone, no runtime trace.
- Beacon 5 is a **live request-handling surface**. It accepts input, executes handlers, returns data, on every call, forever, to anyone. That introduces a request surface (input validation, abuse/rate, error leakage, exactly-what's-exposed) that no prior beacon had.

Therefore the hard constraints below are stricter and discovery is deeper. The default posture is **minimal, read-only, public-data-only, reusing existing single sources** — the smallest correct surface, not the most capable one.

---

## 1. What this is, in one sentence

A read-only MCP server, served as a route inside the existing Next.js app (same repo, same Vercel deploy, same domain — per the architecture decision), exposing a small set of tools over data that is ALREADY public, each tool backed by the exact single source its corresponding site surface already uses, with no writes, no auth-gated data, and no new exposure.

---

## 2. Scope

**Ships in this spec:**
- One MCP endpoint as a route in the existing app (path + transport per the current MCP-over-HTTP standard — discovery determines exactly; the convention is young, verify don't assume).
- A SMALL set of strictly read-only tools over already-public data, each reusing the existing single source:
  - Atlas: get a role / list roles — backed by the same source Beacon 4's package + `/atlas/roles/[id]` use (`src/lib/atlas/` / the shared parser / `getAtlasRole`).
  - Builder lookup: fetch a public builder profile by username — backed by the same path `/u/[username]` + Beacon 1's `person.ts` use, and MUST honor the universal `published=true` fake-exclusion gate (Beacon 3 Invariant #2).
  - Collections: fetch a consented collection by slug — backed by the same single `getConsentedCollection(slug)` Consented Collections already uses (the one-source invariant), honoring the 4-gate exclusion; unknown/inactive slug → clean not-found, never an error leak.
  - (Discovery recommends the minimal honest tool set; do NOT add tools "because we can" — each tool is justified by an existing public surface it mirrors.)
- Standard MCP server metadata (name, description, tool schemas) — brand-free, accurate, reusing the `shipstacked:` identity where relevant.

**Does NOT ship here:**
- Any write/mutation tool. Read-only, full stop. No opt-in, no create-collection, no anything that changes state — those are operational/admin paths, never exposed via MCP.
- Any tool over non-public or consent-gated data. The 3 fakes, unpublished profiles, consent records, tokens, anything service-role — NONE reachable through any tool.
- Auth, accounts, write-back, or "agent does something on ShipStacked." This is a read interface to public data only.
- NLWeb / Agent Skill (Doc 05 tail) — separate specs if pursued.
- Any change to Beacons 1–4 / Collections / V2 surfaces or their single sources (reuse only — if a tool needs a source, it imports the existing one unchanged; modifying a single source is a §6 escalation).
- Any production data mutation.
- Registering/announcing the MCP server in the AgentCard/AGENTS.md/llms.txt (fast-follow after it's live and verified — its own tiny change, not bundled here).

---

## 3. Hard constraints (stricter than prior beacons — it runs)

- **Read-only, absolutely.** No tool mutates anything. No tool touches the DB except through an existing read path. There is no code path from an MCP tool to a write. Discovery must confirm every proposed tool is read-only by construction, not by convention.
- **Public data only — the published/active gates are load-bearing here.** Every tool that returns builder or collection data MUST enforce the same `published=true` (and collection `active=true` + consent) gates the corresponding site surface enforces — reusing the same single source is the mechanism (the gate lives in the source; reuse inherits it). Discovery must prove each tool inherits the gate, and verification must adversarially confirm a fake/unpublished/unconsented entity is NOT returnable through any tool. This is the Beacon 1 H9a / Collections-4-gate / Tier-1 discipline at a new surface — the highest-stakes check in this beacon.
- **Reuse existing single sources — never re-implement, never duplicate.** Each tool calls the exact module its site surface uses (`getAtlasRole`, `getConsentedCollection`, the `person.ts` path, etc.). No parallel query, no second source of truth. A tool that re-implements a query instead of reusing the source is a §6 escalation. (Same invariant class as Beacon 4's one-source proof and Collections' one-query rule.)
- **Bounded request surface.** Input to every tool is validated (schema-constrained — likely the existing zod patterns). Unknown/invalid input → a clean, structured MCP error, never a stack trace, never an internal detail, never a DB error string. No tool accepts free-form anything that reaches a query unsanitized. Discovery defines the input schema per tool and the error-shaping.
- **No information leak via errors or enumeration.** A not-found is a clean not-found. Errors never reveal schema, internal paths, env, or whether a *non-public* entity exists (an unpublished profile must be indistinguishable from a nonexistent one through the tool — no oracle). Discovery addresses enumeration/oracle risk explicitly.
- **Abuse posture stated, even if minimal.** It's a public running endpoint. Discovery must state the rate/abuse posture: at minimum, confirm it can't be used to cheaply enumerate the whole DB, confirm responses are bounded in size, and recommend whether any rate limiting is needed for v1 or is an accepted documented risk (Thomas decides). Don't over-build, but don't ship a running endpoint with zero consideration of abuse.
- **Brand-free / no secrets / no strategic context.** Same standing rule, applied to server metadata, tool descriptions, and any served text. No partner/program/brand names; no env values; no internal/commercial context.
- **Additive, code-only, in the existing app.** New route + new tool/handler module(s), reusing existing sources. No existing site behavior changes. `git revert` = full reversal (it's code; reverting removes the endpoint entirely). No DB. Note: unlike static beacons, "reverted" must mean the running endpoint is gone — confirm the route fully disappears on revert.
- **Accurate to the current MCP standard.** MCP (and MCP-over-HTTP transport) is evolving. Discovery determines the *current, actually-adopted* server shape and transport — verify from real sources, don't assume from memory. If multiple transport conventions exist, enumerate, recommend, Thomas chooses.
- **Discovery before mutation.** Phase 1 read-only. Terminal Claude produces the plan + exact tool list + input/output schemas + the gate-inheritance proof design + abuse posture, STOPS, Thomas approves Section H, then Phase 2.
- Standard gate plus: `tsc --noEmit` clean, `npm run build` clean, site unaffected, AND a working MCP client handshake against the local server (the server actually speaks the protocol, not just "a route exists").

---

## 4. PHASE 1 — Discovery (read-only, STOP, await approval)

Produce `docs/audit/BEACON_5_DISCOVERY.md`. Mutate nothing.

### 4.1 The current MCP-over-HTTP standard
- Determine the current, actually-adopted way to expose an MCP server over HTTP that agents (Claude and others) actually connect to — the transport, the route/path convention, the handshake, the server/tool metadata shape. Verify from real current sources (the convention moves; do not assume from memory). If multiple transports exist (e.g. streamable HTTP vs SSE vs other), enumerate, state adoption, recommend one, Thomas chooses at Section H.
- Report required vs optional server metadata and the tool-definition schema shape.

### 4.2 How it slots into this Next.js app
- The exact route/handler approach in this codebase (consistent with how `/.well-known/agent-card.json` and the API routes are done). Confirm same-deploy, same-domain, no separate service, no new infra.
- Confirm it does not collide with existing routes/middleware; confirm middleware (content-negotiation) does not interfere and the MCP route is excluded from any rewrite that would break protocol framing.
- Confirm `git revert` removes the running endpoint cleanly (route gone, no orphaned handler reachable).

### 4.3 The tool set (minimal, each justified by an existing public surface)
- Propose the SMALLEST honest tool set. For each tool: name, what it returns, the EXACT existing single source it reuses (file:function), the input schema, the output shape, and the public-data gate it inherits *via that source*.
- Expected candidates (discovery confirms/justifies/trims): get-atlas-role, list-atlas-roles, get-builder (published-gated), get-collection (active+consent-gated). Reject any tool not backed by an existing public surface.
- For each: prove read-only by construction (the reused source is a read path; no write exists downstream).

### 4.4 The gate-inheritance proof (highest-stakes section)
- For get-builder and get-collection specifically: show exactly how the `published=true` / `active=true` + consent gates are inherited by reusing the existing source, and design the adversarial verification: a fake (`published=false`) username and an unpublished profile and an unconsented/inactive collection must each be NON-returnable through the tool, indistinguishable from nonexistent (no oracle). This is the load-bearing safety property — specify the exact test.

### 4.5 Request-surface hardening
- Per-tool input schema (reuse existing zod where possible). Error-shaping: every failure path returns a clean structured MCP error — no stack trace, no internal path, no DB string, no schema leak. Enumeration/oracle analysis: can the tool set be used to cheaply dump the DB or detect non-public entities? State the mitigation or the accepted documented risk.
- Abuse/rate posture: state it explicitly. Recommend v1 posture (minimal rate limit / response-size bounds / accepted-documented-risk) — Thomas decides at Section H. Don't over-build; don't ignore.

### 4.6 Discovery output
`docs/audit/BEACON_5_DISCOVERY.md`, sections A–H:
- A: current MCP-over-HTTP standard (sourced; transports enumerated; recommended)
- B: route/handler approach in this app; collision + middleware + revert-cleanliness check
- C: the minimal tool set — each with source-reuse (file:function), schemas, read-only proof
- D: the gate-inheritance proof + the exact adversarial test design (the load-bearing section)
- E: request-surface hardening (input schemas, error-shaping, enumeration/oracle analysis, abuse posture recommendation)
- F: confirmation it modifies no Beacon 1–4 / Collections / V2 source, exposes nothing non-public, no secrets/brand/strategic content
- G: any "current standard expects X" finding (propose, don't auto-expand)
- H: precise numbered Phase 2 change list, each item individually approvable; transport choice + abuse-posture decision explicitly surfaced for Thomas

STOP. One-paragraph summary. Await explicit Section H approval (including transport + abuse-posture decisions).

---

## 5. PHASE 2 — Execution (only after Thomas approves Section H)

Execute approved Section H. Expected shape: the MCP route + handler module(s), the approved minimal read-only tool set each reusing its existing single source, input schemas, clean error-shaping, the chosen transport, the agreed abuse posture. No existing source modified.

### 5.1 Verification (before commit)
- **The gate-inheritance adversarial proof (load-bearing):** a known fake username (`published=false`), an unpublished profile, and an inactive/unconsented collection are each NON-returnable through the relevant tool, and indistinguishable from nonexistent (no oracle). Show the actual tool responses.
- **Read-only proof:** demonstrate (code-trace + the reused-source confirmation) there is no write path from any tool; the reused sources are the same read paths the site uses, unmodified (diff them: byte-unchanged).
- **Protocol proof:** an actual MCP client handshake against the local server succeeds; each tool is callable and returns the expected shape (not just "the route 200s" — it speaks MCP).
- **Equivalence to site:** a tool's output for a given input is consistent with what the corresponding site surface serves for the same entity (e.g. get-atlas-role(G3) consistent with `/atlas/roles/G3.json`; reuse of the same source should make this hold by construction — confirm it).
- **Request-surface:** invalid/oversized/malformed input → clean structured MCP error, no leak (show the actual error responses; confirm no stack trace / path / DB string).
- Brand-free + no-secrets greps on all new files: zero matches.
- Site byte-unchanged: Beacons 1–4 surfaces + V2 + Collections + `person.ts` + middleware all unaffected; `git status` shows only new files; `git revert` removes the endpoint cleanly (verify the route is gone after a simulated revert or reason it precisely).
- `tsc` clean, `build` clean, prior-tier prod regressions intact.

### 5.2 Commit + push
Commit message documents: the MCP route + transport, the minimal read-only tool set and the exact existing single source each reuses, the gate-inheritance adversarial proof results (fakes/unpublished/inactive non-returnable, no oracle), read-only-by-construction proof, the protocol-handshake proof, the abuse posture shipped, brand-free/no-secrets, code-only / `git revert` = full reversal (endpoint gone). Push, poll prod, then run the adversarial gate proof + an MCP handshake **against production** (the load-bearing post-deploy check — a fake must be non-returnable through the live MCP endpoint, and the live server must speak the protocol). Report.

---

## 6. Escalate if
- No single dominant MCP-over-HTTP transport (enumerate, recommend, Thomas chooses — don't guess)
- Any proposed tool can't inherit its gate purely by reusing the existing source (i.e. it would need its own query) — escalate; do NOT hand-reimplement a gated query
- Any tool would expose non-public, consent-gated, or service-role data — stop, escalate; the surface is wrong
- Read-only can't be proven by construction for any tool — escalate; convention isn't sufficient, it must be structural
- Enumeration/oracle risk can't be mitigated without rate/auth the spec didn't scope — escalate with the tradeoff; Thomas decides posture vs scope
- Reusing a source would require modifying that source — escalate; modifying a Beacon 1–4/Collections/V2 single source is out of scope
- The MCP route conflicts with middleware/content-negotiation framing — escalate before working around it

---

## 7. After Beacon 5 ships
ShipStacked is machine-readable (1–2), repo-workable (3), depend-able as a package (4), and **callable as a native agent tool (5)** — the full core beacon set in Doc 05's order, the infrastructure thesis complete: an agent in its own runtime can discover, read, depend on, and now directly query ShipStacked without ever scraping or visiting. Then:
- **Fast-follow (own tiny change):** register the MCP server in the AgentCard / AGENTS.md / llms.txt so agents discover it (deliberately not bundled here).
- **Doc 05 tail (own specs if pursued):** NLWeb, Agent Skill.
- **Tier 4:** isolated tech-debt sweep — separate spec; FIRST task the locked state-vs-record reconciliation ledger (now 3 logged items + the Beacon-3 housekeeping: commit `docs/audit/`, gitignore `.claude/`), THEN split safe-code vs production-data, discovery-first, production-data items reviewed fresh.
- **Operational, decoupled, Thomas-only (off-codebase):** publishing `@shipstacked/atlas-roles`; creating the first real Consented Collection + minting killer opt-in tokens (Aniket first). These remain deliberate human acts, not engineering tasks.

Beacon 5 is the heaviest beacon; it shipped under the strictest constraints because it runs. The protocol holds.

---

*End of Beacon 5 spec.*
