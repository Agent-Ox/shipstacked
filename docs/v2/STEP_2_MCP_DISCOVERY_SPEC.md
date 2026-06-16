# ShipStacked — Step 2: MCP-Discovery Fast-Follow

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** the clean base at commit 0c855df (Beacons 1–5 live, Tier 4 reconciled, CRON_SECRET rotated). Beacon 5 deferred this announcement deliberately (§2 of the Beacon 5 spec — "not bundled here").
**Output:** The live `/api/mcp` server is announced in the discovery surfaces so agents can find it without being told it exists. Additive, code-only, smallest possible change.
**Status:** Step 2 in the post-beacon sequence. Discovery-first. The change is small; the rigor is not — the AgentCard has a mechanized accuracy guarantee (Beacon 2's `verify-agent-card.ts`) that must stay green.

---

## 0. Why this is Step 2

Beacon 5 shipped a working MCP server at `/api/mcp` — verified, protocol-compliant, no-oracle proven on production. But Beacon 5 *deliberately did not announce it* (its spec §2 explicitly deferred this as a separate tiny follow-up so the beacon stayed single-purpose). Result today: the server runs, but an agent discovering ShipStacked through the AgentCard or AGENTS.md or llms.txt has no pointer to it. The capability exists but is undiscoverable except by knowing the URL.

This step closes that gap: add the MCP server to the surfaces agents actually read for discovery. It is the smallest meaningful change in the whole sequence — but it touches the AgentCard, which Beacon 2 protected with a mechanized accuracy guarantee (`scripts/v2/verify-agent-card.ts` curls every declared URL — a declared endpoint that 404s is a machine-readable lie). So: tiny diff, full gate.

---

## 1. What this is, in one sentence

Announce the existing, unchanged `/api/mcp` endpoint in the AgentCard, AGENTS.md, and llms.txt — reusing Beacon 2's single-source AgentCard builder, changing no behavior, adding only discovery pointers — with the AgentCard accuracy verification staying green.

---

## 2. Scope

**Ships in this spec:**
- **AgentCard:** add the MCP server to the card via the single-source builder (`src/lib/agent-card/builder.ts` — Beacon 2's sole writer; the route is a thin shell). Exactly how MCP is represented in an A2A AgentCard is for discovery to determine from the current standard (a declared interface/endpoint, a skill, a documented URL — verify the correct A2A-shaped representation, do not guess). The disclaimer Beacon 2 established (this is a data-publisher, not an interactive agent) must remain accurate and consistent.
- **AGENTS.md:** add a short, accurate pointer to the MCP server (what it is, the path, that it's read-only, the protocol version) in the appropriate existing section — additive, preserving the byte-exact `<!-- BEGIN/END:nextjs-agent-rules -->` block and the existing structure/invariants. No invariant rewritten.
- **llms.txt:** add a discovery line/section pointing to `/api/mcp` consistent with that file's existing format.
- Whatever the *current* correct representation is in each surface (discovery determines per-surface; the conventions differ and may have moved — verify, don't assume).

**Does NOT ship here:**
- Any change to the MCP server itself (`/api/mcp`, `src/lib/mcp/*`) — it is announced, not modified. Touching it is a §6 escalation.
- Any change to MCP tools, schemas, the no-oracle behavior, or any Beacon 1–5 / Collections / V2 source.
- Any new capability, any operational act (publish, collections, outreach — later steps).
- Re-running or altering the Beacon 5 verification (it already passed on prod; this step does not re-litigate it).
- Any production data mutation.
- Rewriting AGENTS.md invariants or restructuring it (additive pointer only).

---

## 3. Hard constraints

- **The MCP server is not touched.** This step is pure announcement. `src/app/api/mcp/*` and `src/lib/mcp/*` are byte-unchanged. Discovery confirms; verification proves (git diff = 0 on those paths). If announcing it *correctly* seemed to require changing it, that is a §6 escalation — stop.
- **Single-source AgentCard.** The AgentCard change goes through `src/lib/agent-card/builder.ts` (Beacon 2's sole writer). The route handler stays a thin shell. No second place emits card content. Re-implementing card content elsewhere is a §6 escalation.
- **The AgentCard accuracy guarantee must stay green.** `scripts/v2/verify-agent-card.ts` curls every declared URL and asserts the disclaimer + brand-free allowlist. After adding the MCP pointer, the declared MCP URL must resolve correctly (the script must curl `/api/mcp` and get a valid response, not a 404 or error) and the script must pass against BOTH local and production. A declared endpoint that doesn't behave as declared is the exact "machine-readable lie" Beacon 2 exists to prevent. If `verify-agent-card.ts` needs extending to cover the new MCP declaration, that extension is in scope and must itself be correct.
- **Accurate to each current standard.** A2A AgentCard MCP representation, AGENTS.md convention, llms.txt convention — verify each from real current sources (they move). If the correct representation is ambiguous, enumerate and recommend; Thomas chooses.
- **Disclaimer consistency.** Beacon 2 established that the AgentCard discloses ShipStacked is a data-publisher, not an interactive A2A agent. Adding an MCP server (which IS an interactive callable surface) must not make that disclaimer false or contradictory. Discovery must address how the MCP declaration and the existing disclaimer coexist accurately (the MCP server is read-only tool calls over public data — represent it truthfully without overclaiming "interactive agent").
- **Brand-free / no secrets / no strategic context.** Standing rule, all three surfaces.
- **Additive, code-only.** No behavior changes anywhere. `git revert` = full reversal (the pointers disappear; the MCP server keeps running exactly as before because it was never touched).
- **Discovery before mutation.** Phase 1 read-only: determine the correct per-surface representation, map the exact additive edits, confirm the MCP server needs no change, design the verify-agent-card extension. STOP. Thomas approves Section H. Then Phase 2.
- Standard gate plus: `verify-agent-card.ts` green local AND prod; `tsc`/`build` clean; prior-tier prod regressions intact; MCP server byte-unchanged and still passing its own Beacon 5 behavior (spot-check `/api/mcp` initialize still 200 + the no-oracle property still holds — announcing it must not have disturbed it).

---

## 4. PHASE 1 — Discovery (read-only, STOP, await approval)

Produce `docs/audit/STEP_2_DISCOVERY.md`. Mutate nothing.

### 4.1 Current per-surface representation
- **AgentCard / A2A:** how is an MCP server correctly represented in a current A2A AgentCard? (A declared additionalInterface, a skill entry, a documented endpoint URL, a capability flag?) Verify from the current A2A spec / real sources. Report the exact correct shape and how it coexists with Beacon 2's data-publisher disclaimer without contradiction.
- **AGENTS.md:** the current convention for pointing at a callable endpoint; where in the existing file it belongs (which existing section), as a minimal additive insert that preserves the marker block and all invariants byte-exact.
- **llms.txt:** the current llms.txt convention for declaring an API/endpoint; the exact line/section consistent with the file's existing format.

### 4.2 The exact additive edits
- For each of the 3 surfaces: the precise minimal diff (additive only). For the AgentCard: the exact change to `src/lib/agent-card/builder.ts` (single source) and confirmation the route stays a thin shell.
- Confirm each edit is purely additive — nothing removed, no invariant/disclaimer/structure altered beyond the addition.

### 4.3 The MCP server needs no change (prove it)
- Confirm announcing it requires zero change to `src/app/api/mcp/*` or `src/lib/mcp/*`. The declared URL/shape must match what the server *already* does. If there's a mismatch (the standard wants something the server doesn't currently expose), that's a §6 escalation — report, do not modify the server to fit.

### 4.4 The verification design
- How `scripts/v2/verify-agent-card.ts` must be extended so it curls the newly-declared MCP endpoint and asserts it responds correctly (e.g. a valid MCP initialize response, not 404). The extension must be precise and must itself be brand-free. Report the exact added assertion(s).
- Confirm the disclaimer/brand-free assertions still hold with the MCP addition.

### 4.5 Discovery output
`docs/audit/STEP_2_DISCOVERY.md`, sections A–H:
- A: current correct representation per surface (sourced; AgentCard MCP shape; AGENTS.md insert point; llms.txt format)
- B: the exact additive diffs for all 3 surfaces (AgentCard via the single-source builder)
- C: proof the MCP server itself needs zero change (and §6 escalation if a mismatch exists)
- D: the verify-agent-card.ts extension (exact assertions; brand-free; disclaimer-consistent)
- E: confirmation no Beacon 1–5/Collections/V2 source touched, MCP server byte-unchanged, no production data, no secrets/brand/strategic content
- F: disclaimer-coexistence analysis (MCP-as-callable vs the data-publisher disclaimer — accurate, non-contradictory)
- G: any standard ambiguity (enumerate, recommend, Thomas chooses)
- H: precise numbered Phase 2 change list, each individually approvable

STOP. One-paragraph summary. Await explicit Section H approval.

---

## 5. PHASE 2 — Execution (only after Thomas approves Section H)

Execute approved Section H: the additive AgentCard change (via `builder.ts`), the AGENTS.md pointer, the llms.txt pointer, the `verify-agent-card.ts` extension. Touch nothing else.

### 5.1 Verification (before commit)
- `verify-agent-card.ts` passes LOCAL — including the new assertion that the declared MCP endpoint resolves and responds correctly (not 404).
- MCP server byte-unchanged: `git diff` on `src/app/api/mcp/*` and `src/lib/mcp/*` = 0. The announcement did not modify the thing announced.
- `/api/mcp` still behaves: spot-check `initialize` returns 200 + protocol version, and the no-oracle property still holds (a known fake via get-builder still byte-identical to nonexistent) — announcing it must not have disturbed Beacon 5's proven behavior.
- AGENTS.md: the `<!-- BEGIN/END:nextjs-agent-rules -->` block byte-exact; all 8 invariants byte-unchanged; only an additive pointer added.
- Single-source held: AgentCard content only from `builder.ts`; route still a thin shell.
- Brand-free + no-secrets greps on all changed surfaces: zero hits.
- `git status`: only the intended surfaces (`builder.ts`, AGENTS.md, llms.txt route, `verify-agent-card.ts`). `person.ts` byte-unchanged (continuing its run). No Beacon 1–5/Collections/V2 source otherwise touched.
- `tsc` clean, `build` clean.
- Prior-tier prod regressions intact (the standard sweep).

### 5.2 Commit + push
Commit message documents: the MCP server announced in 3 surfaces (additive only), the single-source AgentCard path, the verify-agent-card.ts extension and that it passes local + (post-deploy) prod, explicit confirmation the MCP server itself is byte-unchanged and still behaves (initialize 200 + no-oracle intact), AGENTS.md marker/invariants byte-exact, brand-free/no-secrets, code-only / `git revert` = full reversal (pointers vanish, server unaffected). Push, poll prod, then run `verify-agent-card.ts --base https://shipstacked.com` (the declared MCP URL must resolve correctly on prod — the load-bearing post-deploy check that the announcement is truthful) + the standard regression sweep + an `/api/mcp` initialize + no-oracle spot-check against prod. Report.

---

## 6. Escalate if
- Correctly announcing the MCP server would require modifying the MCP server (the declared standard shape ≠ what the server does) — report the mismatch; do NOT modify the server to fit a card
- No single correct representation for a surface (enumerate, recommend, Thomas chooses)
- The MCP declaration makes Beacon 2's data-publisher disclaimer false/contradictory and it can't be represented truthfully without overclaiming — escalate
- `verify-agent-card.ts` can't be extended to truthfully assert the MCP endpoint without weakening an existing assertion — escalate
- Any surface edit can't be made purely additive (would remove/alter an invariant, the marker block, or existing content) — escalate

---

## 7. After Step 2 ships
An agent that discovers ShipStacked through any front door (AgentCard, AGENTS.md, llms.txt) now finds the callable `/api/mcp` server — the infrastructure is not just built but *discoverable*, end to end. The AgentCard accuracy guarantee now also covers the MCP declaration (a declared MCP URL that breaks would fail the gate). Then the remaining sequence — both operational, Thomas-only, decoupled by design:
- **Step 3:** Publish `@shipstacked/atlas-roles` (irreversible name claim — pre-publish checklist, then the command; chat-Claude advises, Thomas acts).
- **Step 4:** First real Consented Collection + reach Aniket (the actual point — a sequence of Thomas's decisions; chat-Claude advises, Thomas acts).
- **Phase B (separate, no urgency):** `thomasoxlee198` + hire-confirm feature disposition — their own future cycles; standing recommendation leave-as-is.

Smallest engineering change of the sequence, full gate because it touches the accuracy-guaranteed AgentCard. The protocol holds.

---

*End of Step 2 spec.*
