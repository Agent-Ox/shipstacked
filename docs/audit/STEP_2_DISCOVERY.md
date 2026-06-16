# Step 2 — MCP Discovery Fast-Follow — DISCOVERY (Phase 1)

**Author:** Claude (Opus 4.7, 1M context) — read-only discovery
**Date:** 2026-05-17
**Spec:** `docs/v2/STEP_2_MCP_DISCOVERY_SPEC.md` §4
**Status:** Phase 1 complete. STOP. Awaiting explicit Section H approval — one §G ambiguity surfaced; one H-DECISION required.
**Governing principles (Spec §3):** additive only; the MCP server byte-UNCHANGED (touching `src/app/api/mcp/*` or `src/lib/mcp/*` is a §6 escalation); AgentCard goes through the single-source builder; Beacon 2's accuracy guarantee must stay green after the addition; disclaimer-coexistence must be honest (the MCP server is callable, but read-only over the same public data the disclaimer scopes to — represent truthfully, do not overclaim "interactive A2A agent server").
**Method:** read-only. Re-read the served AgentCard JSON + the `builder.ts` source + the existing `AGENTS.md` structure + the `llms.txt` route handler + the live MCP server response shape. Researched the current A2A standard for declaring an MCP server in an AgentCard via the A2A v1.0 spec (two pages: `/specification/` and `/topics/a2a-and-mcp/`) plus a targeted web search. No DB queries, no repo files modified except this report.

---

## ⚠️ Standard ambiguity (§G escalation surfaced — one H-DECISION required)

**There is no single canonical A2A field for declaring a separate MCP server endpoint inside an AgentCard.** The current A2A v1.0 spec documents `additionalInterfaces[]` — but it is for A2A-transport variants (stdio / json-rpc / grpc), NOT for declaring a non-A2A protocol like MCP. The A2A community's "A2A and MCP" topic page explicitly defers the question ("A2A and MCP are complementary protocols… implementation details deferred to other documentation sections"). The MCP side (modelcontextprotocol.io PR SEP-2127) is actively drafting "MCP Server Cards" as the inverse-direction discovery convention. Both communities acknowledge "ongoing work to unify discovery mechanisms" — none of it stable today.

**The non-recommendation is also clear:** declaring the MCP endpoint as `additionalInterfaces[{ transport: "mcp", url: "..." }]` would be technically off-spec (A2A clients walking `additionalInterfaces` would try to send A2A JSON-RPC to a non-A2A endpoint, breaking gracefully or otherwise). Don't do that.

**What CAN be done correctly today (per-spec-compliant + truthful):**
1. Use Beacon 2's already-established `shipstacked:` metadata-extension pattern to add the MCP endpoint declaration. (`metadata` is the A2A spec's documented place for non-canonical, namespaced fields — Beacon 2 already publishes 6 such keys including the per-beacon status object that ALREADY tracks the MCP server's status — currently as `deferred`, which is itself a drift to be reconciled in this commit.)
2. Add a `skill` entry for the MCP server (with phrasing that preserves Beacon 2's already-asserted "Fetch / Read… no A2A invocation" disclaimer-pattern that `verify-agent-card.ts` mechanically enforces).
3. Both — they're complementary (metadata gives the canonical extension; skill makes the endpoint discoverable to A2A clients that walk skills).

§H-DECISION below presents all four options (recommendation: γ = both metadata + skill).

---

## SECTION A — Current correct representation per surface

### A.1 — AgentCard (A2A)

**Verified from sources (2025-06-18 spec era):**
- A2A v1.0 spec (`a2a-protocol.org/latest/specification/`) — defines AgentCard with `additionalInterfaces[]` for A2A-transport variants. The field details are partially truncated in the public docs; the linked example shows `{ url, transport }` shape with `transport ∈ {stdio, jsonrpc, grpc}`.
- A2A "topics/a2a-and-mcp" page — confirms A2A and MCP are complementary; explicitly does NOT define an AgentCard MCP-pointer field; defers.
- WebSearch surfaced: the modelcontextprotocol.io SEP-2127 PR (in-flight) is drafting "MCP Server Cards" as the inverse-direction discovery (MCP-side `.well-known/mcp-server-card`). Not stable.

**What's currently in our card** (`curl https://shipstacked.com/.well-known/agent-card.json` 2026-05-17):
- Top-level keys: `protocolVersion, name, description, url, version, documentationUrl, provider, capabilities, defaultInputModes, defaultOutputModes, skills, metadata`
- `metadata` keys: `shipstacked:cardKind, shipstacked:interactiveAgent, shipstacked:respondsToA2AMessages, shipstacked:namespace, shipstacked:graphNote, shipstacked:beacons`
- `metadata.shipstacked:beacons.mcpServer` currently `{ status: 'deferred', note: 'Beacon 5 — not yet shipped.' }` — **this is a drift**: Beacon 5 shipped at commit `5f1a875`. Step 2 closes both this drift AND the announcement in one move.
- `capabilities.extensions[]` is currently `[]` (empty array — A2A spec allows extension objects here).

**Recommended representation** (after H-DECISION γ): combined — add `metadata.shipstacked:mcpEndpoint` object + a skill entry. The metadata is the canonical extension in the namespace Beacon 2 already publishes; the skill is the A2A-walker-discoverable surface. See §B.1 for the exact JSON.

### A.2 — AGENTS.md

**Convention** (per Beacon 3 discovery + the agents.md spec): "entirely flexible." Any additive line that doesn't disrupt invariants is correct. The file already has:
- `<!-- BEGIN/END:nextjs-agent-rules -->` byte-exact marker block at top — MUST preserve byte-exact.
- 8 numbered invariants — none get rewritten (Step 2 doesn't add a new invariant; it adds a layout pointer).
- Project layout tree section — has `/.well-known/agent-card.json/` listed as a sub-entry of `app/`; has `api/` listed with description "REST + content-negotiation projections" but no individual `/api/<x>/` sub-entries.

**Best additive insertion point:** add a single line under the `api/` entry in the Project layout tree:
```
│   │   └── mcp/                Streamable HTTP MCP endpoint (read-only, 2025-06-18)
```
This is symmetric with the existing `.well-known/agent-card.json/` sub-entry. Adds one line to the tree (purely additive, no invariant touched, no other content modified, marker block untouched).

### A.3 — llms.txt

**Convention** (per the existing llms.txt route handler and the llms.txt convention): markdown sections with a header + sectioned link lists. The file is dynamically generated at `src/app/llms.txt/route.ts` with a constant `HEADER` containing the Primary documents and Atlas-roles intro.

**Best additive insertion point:** add a new top-level section between "Primary documents" and "Atlas roles" in the `HEADER` constant:
```
## Callable interface — MCP server

- [/api/mcp](https://shipstacked.com/api/mcp): Streamable HTTP MCP endpoint (protocol 2025-06-18). POST JSON-RPC; read-only tools over the same public data the rest of this site exposes. The AgentCard at /.well-known/agent-card.json declares this endpoint in `metadata.shipstacked:mcpEndpoint`.
```
Additive section, consistent with the file's existing markdown-section format. Doesn't modify any existing section.

---

## SECTION B — The exact additive edits (3 surfaces)

### B.1 — AgentCard (via `src/lib/agent-card/builder.ts` — the single source)

**Two changes inside the `buildAgentCard()` return object's `metadata` field + one new skill** (assuming H-DECISION γ — both metadata + skill):

**(B.1.a) Replace the stale `shipstacked:beacons.mcpServer` entry:**
```ts
// BEFORE:
mcpServer:            { status: 'deferred', note: 'Beacon 5 — not yet shipped.' },

// AFTER:
mcpServer:            { status: 'live',     since: '2026-05-17', path: '/api/mcp',
                        protocolVersion: '2025-06-18', transport: 'streamable-http',
                        note: 'Read-only MCP tool calls over the same public data.' },
```

**(B.1.b) Add a new dedicated `metadata.shipstacked:mcpEndpoint` key** (the canonical pointer for any agent that reads the `shipstacked:` extension namespace):
```ts
'shipstacked:mcpEndpoint': {
  url: `${CANONICAL_HOST}/api/mcp`,
  protocol: 'mcp',
  protocolVersion: '2025-06-18',
  transport: 'streamable-http',
  method: 'POST',
  acceptedContentTypes: ['application/json', 'text/event-stream'],
  readOnly: true,
  toolCount: 4,
  toolNames: ['get-atlas-role', 'list-atlas-roles', 'get-collection', 'get-builder'],
  note: 'Separate non-A2A JSON-RPC protocol. Not an A2A messaging endpoint; the data-publisher disclaimer in `description` and `shipstacked:respondsToA2AMessages: false` continue to hold. MCP tools are all read-only over already-public data; gate-inherited per Beacon 5.',
},
```

**(B.1.c) Append a new skill entry to `skills[]`** (preserves Beacon 2's "Read … no A2A invocation" pattern that `verify-agent-card.ts` mechanically asserts):
```ts
fetchSkill({
  id: 'read-via-mcp-server',
  name: 'Read via the MCP server (separate non-A2A protocol)',
  description:
    'Read via the MCP server at https://shipstacked.com/api/mcp — a separate non-A2A JSON-RPC protocol (MCP Streamable HTTP, protocol version 2025-06-18) exposing the same read-only data the other skills fetch over HTTP. POST a JSON-RPC initialize, then tools/list and tools/call. Tools: get-atlas-role, list-atlas-roles, get-collection, get-builder. ' +
    'This skill is itself NOT a fetch URL in the HTTP-GET sense (MCP is POST JSON-RPC) — it is announced here so A2A clients walking skills can discover the MCP endpoint. No A2A invocation; this is a separate protocol entirely, parallel to the HTTP-GET skills above.',
  tags: ['mcp', 'streamable-http', 'json-rpc', 'read-only', 'discovery'],
  examples: [
    `POST ${CANONICAL_HOST}/api/mcp  (with JSON-RPC initialize body)`,
  ],
  outputModes: ['application/json', 'text/event-stream'],
}),
```

The skill `name` starts with "Read" (passes the existing `verify-agent-card.ts` `name` regex `/^Fetch\s|^Read\s/i`). The `description` starts with "Read" and contains the literal string "no A2A invocation" (passes the existing `description` regex). The `examples[]` URL is `POST <url>` — the existing verify script's URL extractor (`/^GET\s+(\S+)/`) won't match it, so it'll be skipped by the existing per-URL prober; a NEW MCP-specific probe in the verify extension (see §D) handles it.

**(B.1.d) Confirm `route.ts` stays a thin shell:**
`src/app/.well-known/agent-card.json/route.ts` is byte-UNCHANGED. The builder produces the new card; the route serializes. Single-source invariant held.

### B.2 — AGENTS.md (single-line additive insert)

**Exact diff** (one line added under the `api/` entry in the Project layout tree):
```diff
 │   ├── .well-known/agent-card.json/   A2A AgentCard route handler
 │   ├── api/                      REST + content-negotiation projections
+│   │   └── mcp/                  Streamable HTTP MCP endpoint (read-only, 2025-06-18)
 │   ├── atlas/                    /atlas long-form + /atlas/roles/[id]
```

Nothing else touched. `<!-- BEGIN/END:nextjs-agent-rules -->` marker block byte-EXACT. All 8 invariants byte-EXACT. The "Drift caveat" + "What this file does NOT contain" sections byte-EXACT.

### B.3 — llms.txt (additive section in `src/app/llms.txt/route.ts`'s `HEADER` constant)

**Exact diff** (a new section added between "Primary documents" and "Atlas roles (v0.4)" in the HEADER):
```diff
 ## Primary documents

 - [The Atlas of the Agentic Economy](https://shipstacked.com/atlas): A practitioner-defined map of the labor market for AI integration. Specialist roles, operator types, the compliance layer, alignment research, vertical specialists. By Thomas Oxlee.

+## Callable interface — MCP server
+
+- [/api/mcp](https://shipstacked.com/api/mcp): Streamable HTTP MCP endpoint (protocol 2025-06-18). POST JSON-RPC; read-only tools over the same public data the rest of this site exposes. The AgentCard at /.well-known/agent-card.json declares this endpoint in metadata.shipstacked:mcpEndpoint.
+
 ## Atlas roles (v0.4)
```

No existing section text modified. Section ordering: new section sits between the "Primary documents" and "Atlas roles" sections — natural placement (the MCP server is a callable interface that exposes the SAME data the Atlas roles section enumerates).

---

## SECTION C — The MCP server itself needs ZERO change (proof)

The proposed additions:
- AgentCard's `metadata.shipstacked:mcpEndpoint`: declares `url`, `protocol`, `protocolVersion: '2025-06-18'`, `transport: 'streamable-http'`, `method: 'POST'`, `toolNames[]` — every declared property matches what the server already serves (verified by `curl -X POST .../api/mcp -d '{"jsonrpc":"2.0","id":1,"method":"initialize",...}'` 2026-05-17 → returns `protocolVersion: '2025-06-18'`, `serverInfo.name: 'shipstacked-mcp'`, `capabilities: {tools:{}}`).
- The skill's `examples[]` `POST <url>` describes the same call shape `verify-mcp.ts` (Beacon 5's gate) already uses.
- `toolCount: 4` and `toolNames: ['get-atlas-role', 'list-atlas-roles', 'get-collection', 'get-builder']` match exactly what the live `tools/list` returns (confirmed at Beacon 5 commit `5f1a875`).

**No mismatch exists between what the announcement claims and what the server does.** Zero change to `src/app/api/mcp/*` or `src/lib/mcp/*`. The announcement is purely declarative of existing behavior. (Per Spec §6: if a mismatch existed, that would be a §6 escalation — none does.)

`git diff` on the MCP-server-side will be exactly 0 lines for both files after Phase 2.

---

## SECTION D — `verify-agent-card.ts` extension (exact assertions)

The script currently asserts (Beacon 2):
- A2A v1.0 required fields, the data-publisher disclaimer (4 places), brand-free allowlist, and every `examples[]` URL of every skill is live-probed via HTTP GET.

**Extension needed for Step 2** — add a NEW section (Section 6) that:

1. **Reads the MCP endpoint URL from the card's `metadata.shipstacked:mcpEndpoint.url`.** Asserts it's present, is a string, and points at the expected `/api/mcp` path under the configured `base`.
2. **Performs a full MCP `initialize` POST** against that URL:
   ```
   POST <url>
   Accept: application/json, text/event-stream
   Content-Type: application/json
   Body: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"verify-agent-card","version":"1.0"}}}
   ```
3. **Asserts the response:**
   - HTTP status 200
   - Body parses as JSON
   - Body matches `{ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'shipstacked-mcp', ... } } }`
   - Body contains NO leak patterns (the existing 8 LEAK_PATTERNS already used in `verify-mcp.ts` — re-use them here)
4. **Asserts the metadata fields are internally consistent:**
   - `metadata.shipstacked:mcpEndpoint.protocolVersion` equals the response's `result.protocolVersion`
   - `metadata.shipstacked:mcpEndpoint.toolCount` matches a real probe of `tools/list` (optional but cheap — adds one extra POST)
5. **Asserts the `metadata.shipstacked:beacons.mcpServer.status` is now `'live'`** (catches future regression to `'deferred'`).
6. **Brand-free allowlist re-run on the FULL served card body** (already runs; the new metadata + skill addition is auto-covered because the body grep runs on the full JSON).

**The existing per-skill URL-probe loop's regex** `/^GET\s+(\S+)/` (verify-agent-card.ts:240) **won't match** the new skill's `examples` entry `POST <url>` — that's intentional. The MCP skill's URL is exercised by the NEW Section 6 (POST initialize), not by the existing Section 5 (GET probes).

**The disclaimer assertions in the existing Section 3** continue to hold byte-identical:
- `metadata.shipstacked:cardKind === 'data-publisher'` — STILL TRUE (the MCP tools are all read-only over already-public data; consistent with "data-publisher")
- `metadata.shipstacked:interactiveAgent === false` — STILL TRUE (we are not an interactive A2A *agent server*; we have a separate MCP *tool server*, which is a different category per A2A's own taxonomy)
- `metadata.shipstacked:respondsToA2AMessages === false` — STILL TRUE (MCP is NOT A2A; the disclaimer is specifically about A2A messages)
- `description` lead clause "NOT AN INTERACTIVE A2A AGENT SERVER" — STILL TRUE (the disclaimer is specifically about A2A, and the description's existing wording explicitly says "All declared skills below are HTTP GET targets… they are NOT invokable A2A tasks" — the new MCP skill is consistent because it's announced as a separate non-A2A protocol, NOT an A2A task).
- Every skill `name` starts with Fetch/Read — STILL TRUE ("Read via the MCP server" passes).
- Every skill `description` is fetch-shaped + contains "no A2A invocation" — STILL TRUE for the new skill (starts with "Read"; contains literal "no A2A invocation").

Estimated extension size: ~60-80 lines added to `verify-agent-card.ts` (one new PHASE block at the bottom, following the existing 5-phase pattern).

---

## SECTION E — Confirmation: no Beacon 1-5 / Collections / V2 source touched; no production data; no secrets/brand/strategic content

Phase 2's mutations are limited to:
1. `src/lib/agent-card/builder.ts` — MODIFIED (metadata.shipstacked:beacons.mcpServer status update + new metadata.shipstacked:mcpEndpoint key + new skill entry).
2. `AGENTS.md` — MODIFIED (one line added to project layout tree).
3. `src/app/llms.txt/route.ts` — MODIFIED (one new section in the HEADER constant).
4. `scripts/v2/verify-agent-card.ts` — MODIFIED (extension added; existing assertions unchanged).

**Files NOT modified** (verified by structural review):
- `src/app/api/mcp/route.ts` — the MCP server route handler (byte-UNCHANGED — confirms Spec §3).
- All of `src/lib/mcp/` (`server.ts`, `tools.ts`, `schemas.ts`, `README.md`) — byte-UNCHANGED.
- `src/app/.well-known/agent-card.json/route.ts` — the thin shell stays a thin shell.
- All of `src/lib/jsonld/`, `src/lib/atlas/`, `src/lib/collections/`, `src/lib/receipts/`, `src/lib/profiles.ts` — Beacon 1 / V2 / Collections / Atlas sources untouched.
- `src/middleware.ts` — untouched.
- `CLAUDE.md` — untouched (1-line passthrough; nothing to change).
- `src/lib/jsonld/person.ts` — byte-UNCHANGED (the Beacon 1 invariant; would be its 9th consecutive commit preserving it).
- All Tier 4 reconciliation docs — untouched (this Step 2 is its own concern; F.3 stays RESOLVED).

**No production data mutated** in Phase A. No DB SQL of any kind.

**No secrets:** the changes contain no env-var values, no credentials, no Supabase keys.

**No brand / partner / program / specific-collection-slug** names in any of the proposed additive content — verified at draft time by mental scan; will be re-grepped against the Beacon-2 15-token allowlist immediately before commit per §H5.

**No strategic / commercial content** in the additions — every new line is operational documentation (URL, protocol, transport, tools).

---

## SECTION F — Disclaimer coexistence (MCP-as-callable vs the data-publisher disclaimer)

**The disclaimer Beacon 2 established:**

> *"NOT AN INTERACTIVE A2A AGENT SERVER — this is a data-publisher card. ShipStacked publishes structured data (HTML + JSON-LD + CSV) describing public builder profiles, the Atlas role taxonomy, proof receipts, and consented collections. All declared skills below are HTTP GET targets returning the listed media types; they are NOT invokable A2A tasks. The `url` field exists only because A2A v1.0 requires it — we do NOT respond to JSON-RPC at that endpoint. Capabilities are all false. See `metadata.shipstacked:cardKind = "data-publisher"`."*

**The honest coexistence with the MCP announcement:**

1. **"NOT AN INTERACTIVE A2A AGENT SERVER"** — REMAINS TRUE. The MCP server is NOT an A2A agent server. A2A and MCP are *different protocols* (A2A's own docs explicitly position them as complementary, not equivalent). An A2A client that POSTs an A2A `message/send` to our `url` will still get a non-A2A response (the homepage HTML). The disclaimer continues to scope precisely to A2A.

2. **"this is a data-publisher card"** — REMAINS TRUE. All 4 MCP tools (get-atlas-role, list-atlas-roles, get-collection, get-builder) are READ-ONLY over already-public data — verified by Beacon 5's adversarial 31/0 prod proof. The category "data publisher" is about what the surface exposes (public data only, no writes), not about whether the access method is HTTP-GET or POST-JSON-RPC. MCP tools that fetch the SAME public data the HTTP-GET skills fetch are still data publication.

3. **"All declared skills below are HTTP GET targets… they are NOT invokable A2A tasks"** — REMAINS TRUE for all 7 existing skills (unchanged). The NEW 8th skill (read-via-mcp-server) is honestly framed in its own description: *"This skill is itself NOT a fetch URL in the HTTP-GET sense (MCP is POST JSON-RPC) — it is announced here so A2A clients walking skills can discover the MCP endpoint. No A2A invocation; this is a separate protocol entirely, parallel to the HTTP-GET skills above."* The phrasing makes the parallel-protocol nature explicit; an A2A client cannot reasonably interpret the new skill as an A2A task because the skill's own description says it isn't.

4. **"The `url` field exists only because A2A v1.0 requires it — we do NOT respond to JSON-RPC at that endpoint"** — REMAINS TRUE. The top-level `url` continues to point at `https://shipstacked.com/` (the homepage), and we continue to NOT serve JSON-RPC at the homepage. The MCP server at `/api/mcp` is a DIFFERENT URL declared in the metadata extension and in the new skill's examples; the disclaimer about the top-level `url` is preserved.

5. **"Capabilities are all false"** — REMAINS TRUE. The MCP server's existence does not require flipping any A2A capability flag (streaming / pushNotifications / stateTransitionHistory) — those flags are A2A-specific. The MCP server's capabilities are described in `metadata.shipstacked:mcpEndpoint` (a different namespace).

6. **`metadata.shipstacked:cardKind = "data-publisher"`** — REMAINS TRUE. MCP doesn't change the kind of card this is; it adds a parallel callable interface to the same published data.

7. **The three metadata flags `shipstacked:interactiveAgent: false`, `shipstacked:respondsToA2AMessages: false`, `shipstacked:cardKind: "data-publisher"`** — all REMAIN TRUE under their existing semantics. The new `shipstacked:mcpEndpoint` object is a SEPARATE addition that doesn't contradict them.

**Net result:** Zero existing disclaimer claim becomes false; the new MCP announcement is honestly scoped via Beacon 2's already-established `shipstacked:` namespace; the verify gate's existing 4-place unmissable-disclaimer assertions all continue to pass byte-identical.

---

## SECTION G — Standard ambiguity (the §G escalation, per Spec §6 "no single dominant convention")

Detailed at the top of this discovery. Restating succinctly:

**Finding:** No single canonical A2A field exists today for declaring a separate MCP server from an AgentCard.
- `additionalInterfaces[]` is for A2A-transport variants (stdio/grpc/jsonrpc), NOT for non-A2A protocols.
- `capabilities.extensions[]` is permitted but the per-extension shape is itself ambiguous; no community consensus on an MCP-extension shape.
- The MCP side has an in-flight RFC (SEP-2127, "MCP Server Cards") that would create a separate MCP-side discovery file at `.well-known/mcp-server-card` — inverse direction, not yet stable.
- Multiple blog posts and Google/Anthropic/community pages call A2A and MCP "complementary protocols" but defer the question of cross-protocol announcement.

**My escalation recommendation: γ (combined — metadata extension + skill)**, with the metadata under the `shipstacked:` namespace Beacon 2 already established. Reasoning:
- Doesn't claim a canonicalization that doesn't exist (no `additionalInterfaces[{ transport: "mcp" }]` which would be off-spec).
- Reuses Beacon 2's pattern (`shipstacked:` namespace is already documented; agents recognizing the extension get the typed MCP descriptor).
- Skill entry makes the endpoint visible to A2A clients that just walk `skills[]` (the most common discovery path).
- Future-proof: if the A2A community standardizes a canonical field later (e.g. through SEP-2127 or an A2A spec update), the card can ADD that field without removing the `shipstacked:mcpEndpoint` — we don't paint ourselves into a corner.
- Honest about the disclaimer (the new skill explicitly says it's a separate protocol, not an A2A task).

**Thomas chooses at H-DECISION below.** Recommendation γ; alternatives α, β, δ honestly enumerated.

---

## SECTION H — Proposed Phase 2 change list

**Section H approval is for Step 2 only.** No source other than the four files in §E is touched. The MCP server (`src/app/api/mcp/*`, `src/lib/mcp/*`) is byte-UNCHANGED — touching it is explicitly forbidden (Spec §6).

### **H-DECISION — How the MCP server is represented in the AgentCard**

| Option | What | Pros | Cons |
|---|---|---|---|
| α | `metadata.shipstacked:mcpEndpoint` only (no skill entry) | Most conservative. Reuses Beacon 2's namespace cleanly. | Agents that walk only `skills[]` won't discover the endpoint. |
| β | Skill entry only (no new metadata key); update `metadata.shipstacked:beacons.mcpServer` status | Discoverable via the existing skills walker. | Loses the typed descriptor (no `protocolVersion` / `transport` / etc. accessible to extension-aware clients). |
| **γ (recommended)** | **BOTH α + β** | Maximum discoverability without spec violations; future-proof; preserves all of Beacon 2's disclaimer/asserts. | Slightly more code in `builder.ts` (~25 lines added). |
| δ (NOT recommended) | `additionalInterfaces[{ transport: "mcp", url: "..." }]` | Looks A2A-canonical. | Off-spec — `additionalInterfaces` is documented for A2A-transport variants only. A2A clients walking it could mis-dispatch A2A JSON-RPC to the MCP endpoint. **Don't choose.** |

**Recommendation: γ.** If you pick α, drop the skill addition from H1; if β, drop the dedicated metadata key; if δ — please reconsider.

### H1 — Modify `src/lib/agent-card/builder.ts` (single-source AgentCard edit)

Per H-DECISION γ (recommended):

(a) Replace the `mcpServer` entry inside `metadata.shipstacked:beacons`:
- BEFORE: `{ status: 'deferred', note: 'Beacon 5 — not yet shipped.' }`
- AFTER:  `{ status: 'live', since: '2026-05-17', path: '/api/mcp', protocolVersion: '2025-06-18', transport: 'streamable-http', note: 'Read-only MCP tool calls over the same public data.' }`

(b) Add a new top-level key `'shipstacked:mcpEndpoint'` inside `metadata`. Shape per §B.1.b.

(c) Append a new skill entry to `skills[]` (using the existing `fetchSkill` helper). Shape per §B.1.c.

Estimated diff: ~30 lines added to `builder.ts`. Zero lines removed. Zero behavior change to the route handler.

### H2 — Modify `AGENTS.md` (single-line additive)

Per §B.2: one line added under the `api/` tree entry in the Project layout section. Marker block byte-EXACT. All 8 invariants byte-EXACT. Other sections byte-EXACT.

### H3 — Modify `src/app/llms.txt/route.ts` (additive section in HEADER constant)

Per §B.3: one new markdown section (3-4 lines including blank lines) added inside the `HEADER` constant between "Primary documents" and "Atlas roles (v0.4)" sections. No existing section text modified.

### H4 — Extend `scripts/v2/verify-agent-card.ts` (new Section 6: MCP endpoint probe)

Per §D: a new PHASE block added at the bottom of the script (after the existing Section 5 URL-probe loop, before the summary). The new block:
1. Asserts `card.metadata['shipstacked:mcpEndpoint'].url` is present + a string.
2. Performs an MCP initialize POST against that URL (with the Accept header MCP requires).
3. Asserts the response is the expected JSON-RPC initialize result (`protocolVersion === '2025-06-18'`, `serverInfo.name === 'shipstacked-mcp'`, `capabilities.tools` present).
4. Re-uses the existing leak-pattern check (the 8 patterns from `verify-mcp.ts`) — if not already imported, the patterns are copied in (a small dependency-free duplication is acceptable; the patterns are short).
5. Asserts `card.metadata['shipstacked:beacons'].mcpServer.status === 'live'`.

The new block adds ~80 lines. Zero lines removed from existing assertions.

### H5 — Verification (before commit)

- **`verify-agent-card.ts` passes against LOCAL** (after dev server start): the new Section 6 returns PASS for the MCP endpoint probe.
- **MCP server byte-UNCHANGED**: `git diff src/app/api/mcp/route.ts` = 0 lines, `git diff src/lib/mcp/` = empty.
- **MCP server still behaves**: spot-check `POST /api/mcp` initialize on local → 200 with `protocolVersion: '2025-06-18'`; no-oracle still holds (single probe: `get-builder('jennypeterson224')` matches `get-builder('__nonexistent__')` bytewise — re-run the Beacon-5 verify-mcp.ts to be sure).
- **AGENTS.md byte-checks**: marker block `<!-- BEGIN/END:nextjs-agent-rules -->` unchanged; the 8 numbered invariants unchanged (regex: `grep -E "^\d\. \*\*" AGENTS.md | wc -l` = 8 before and after).
- **Single-source held**: `src/app/.well-known/agent-card.json/route.ts` byte-UNCHANGED.
- **Brand-free + env-var-free grep on the 4 modified files**: zero hits against the 15-token allowlist + env-var-name patterns.
- **`git status`**: only `src/lib/agent-card/builder.ts`, `AGENTS.md`, `src/app/llms.txt/route.ts`, `scripts/v2/verify-agent-card.ts` modified. `person.ts` byte-unchanged (9th commit running). No Beacon 1-5 / Collections / V2 source otherwise touched.
- **`tsc --noEmit` clean**. **`npm run build` clean** — confirms route handlers all still register.
- **Prior-tier prod regressions intact** (the standard 5 + `/api/mcp` initialize 200).

### H6 — Commit + push

Commit message documents: MCP server announced in 3 surfaces (AgentCard via single-source builder, AGENTS.md project layout, llms.txt HEADER); §G ambiguity surfaced and recommendation γ chosen; the MCP server itself is byte-UNCHANGED; disclaimer-coexistence preserved (Beacon 2's 4-place unmissable-disclaimer assertions still pass); `verify-agent-card.ts` extended with MCP-endpoint probe; verify passes local AND (post-deploy) prod; `git revert` reverses cleanly (pointers vanish, server unaffected).

Push, poll prod, then run `scripts/v2/verify-agent-card.ts --base https://shipstacked.com` (the declared MCP URL must resolve correctly on prod — load-bearing post-deploy check) + the standard regression sweep + an `/api/mcp` initialize + a quick no-oracle spot-check (one fake + one nonexistent via get-builder MUST still be byte-identical on prod). Report.

### H7 — Explicit non-goals

- ❌ Does NOT modify `src/app/api/mcp/*` or `src/lib/mcp/*`. The MCP server is announced, not modified.
- ❌ Does NOT modify any Beacon 1-4 / Collections / V2 / Atlas source.
- ❌ Does NOT modify `CLAUDE.md`, `src/middleware.ts`, or `src/lib/jsonld/person.ts`.
- ❌ Does NOT add or remove any AGENTS.md invariant (only adds one Project layout tree line).
- ❌ Does NOT use `additionalInterfaces[{ transport: "mcp" }]` (off-spec; explicitly rejected at H-DECISION).
- ❌ Does NOT introduce any new credential, env-var, or secret.
- ❌ Does NOT change `verify-mcp.ts` (Beacon 5's gate) — it stays as is; `verify-agent-card.ts` gains the MCP-URL probe as a separate concern.
- ❌ Does NOT run `npm publish` (Beacon 4 package remains publish-ready unpublished).
- ❌ Does NOT touch any Phase B item (thomasoxlee198, hire-confirm feature disposition).
- ❌ Does NOT name any partner, program, brand, or specific collection slug.

---

## Sources verified during this discovery

- **A2A v1.0 spec (top-level):** `https://a2a-protocol.org/latest/specification/` — `additionalInterfaces` exists for A2A-transport variants; the field definitions for AgentCard are partially truncated in the public docs.
- **A2A "A2A and MCP" topic:** `https://a2a-protocol.org/latest/topics/a2a-and-mcp/` — explicitly defers the cross-protocol announcement question; "complementary, not equivalent."
- **WebSearch:** `"A2A AgentCard additionalInterfaces field schema MCP server declaration JSON example 2025"` — confirms `additionalInterfaces` is for A2A transports (stdio/jsonrpc/grpc), NOT for non-A2A protocols.
- **WebSearch:** `"A2A AgentCard mcp extensions field metadata coexist MCP server discovery point"` — confirms NO canonical pattern exists; modelcontextprotocol.io SEP-2127 ("MCP Server Cards") is the closest in-flight standard (MCP-side discovery, not A2A-side announcement).
- **Live AgentCard at prod:** `curl https://shipstacked.com/.well-known/agent-card.json` — verified current `metadata.shipstacked:beacons.mcpServer.status === 'deferred'` (drift to be closed by Step 2).
- **Live MCP at prod:** `POST https://shipstacked.com/api/mcp` initialize → 200, `{ protocolVersion: '2025-06-18', serverInfo: { name: 'shipstacked-mcp', version: '0.1.0' }, capabilities: { tools: {} } }`.
- **`src/lib/agent-card/builder.ts`** — read in full; confirmed the metadata pattern + how skills are added via the `fetchSkill` helper.
- **`src/app/.well-known/agent-card.json/route.ts`** — read; thin shell over `buildAgentCard()`. Will stay byte-UNCHANGED.
- **`AGENTS.md`** — read; Project layout section identified for the single additive line. All 8 invariants located; none requires rewriting.
- **`src/app/llms.txt/route.ts`** — read in full; HEADER constant is the natural insertion point for the new Callable interface section.
- **`scripts/v2/verify-agent-card.ts`** — re-read (specifically the 5-section structure; the URL-extractor regex `/^GET\s+(\S+)/` at line 240; the leak-pattern style copied in `verify-mcp.ts`).

---

*End of Phase 1 discovery. STOP. Awaiting Thomas's review of:*
- *H-DECISION on MCP AgentCard representation (γ recommended — combined metadata extension + skill entry).*
- *Section H change list (Phase 2 items).*
- *Acknowledgement that the §G standard ambiguity is real (no canonical A2A field for MCP server declarations today) and that γ is the honest choice given current state of both specs.*

*Before Phase 2.*
