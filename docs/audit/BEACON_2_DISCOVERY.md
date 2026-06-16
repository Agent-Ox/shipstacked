# Tier 3 — Beacon 2: AgentCard at `/.well-known/agent-card.json` — DISCOVERY (Phase 1)

**Author:** Claude (Opus 4.7, 1M context) — read-only discovery
**Date:** 2026-05-16
**Spec:** `docs/v2/TIER_3_BEACON_2_AGENTCARD_SPEC.md` §4
**Status:** Phase 1 complete. STOP. Awaiting Thomas's explicit Section H approval before any Phase 2 mutation.
**Governing principle (Spec §3):** accurate, not aspirational; standards-shaped; brand-free; exposes nothing new; additive code-only.
**Method:** read-only. Web-verified the AgentCard convention via 4 fetches against a2a-protocol.org + alternative-convention sources (NOT assumed from memory, per Spec §4.1). Live accuracy audit via `curl` against `https://shipstacked.com` for every surface the card might declare. No DB queries, no repo files modified except this report.

---

## ⚠️ Section 6 escalation surfaced — recommendation, not unilateral choice

Spec §6: *"No single dominant AgentCard convention exists (multiple frameworks, incompatible shapes) — report the options, recommend, let Thomas choose the target."*

Discovery confirms **the convention is real but the publisher-side fit is awkward** for ShipStacked. Three competing/adjacent conventions:

| Convention | Path | Required-field shape | Adoption | Designed for |
|---|---|---|---|---|
| **A2A AgentCard v1.0** (Linux Foundation, ex-Google) | `/.well-known/agent-card.json` | `protocolVersion`, `name`, `description`, `url`, `version`, `capabilities`, `defaultInputModes`, `defaultOutputModes`, `skills` | **Dominant** — 150+ orgs (Google, Microsoft, AWS, Salesforce, SAP, ServiceNow, Workday, IBM); Linux Foundation since June 2025; Apache 2.0 | **Interactive agents** that respond to A2A messages (JSON-RPC) |
| **IETF draft AgentCard** (`draft-aevum-agentcard-00`, March 2026) | `/.well-known/agentcard` (no .json) | `agent_id` (ULID), `name`, `version`, `capabilities`, `endpoint` | Emerging — IETF draft only | **Explicitly framework-neutral, supports data publishers** — quote: *"AgentCard is a pure data schema: it carries no execution logic and imposes no transport requirements"* |
| Various community schemas (`SecureAgentTools` gist, `ai-agent.json` by Aiia, ERC-8004, `robots-trust.json`) | various | various | Minor / experimental | various |

**The mismatch:** A2A is the dominant standard but assumes the publisher is an **A2A server** capable of responding to JSON-RPC `message/send` calls with task state, streaming, etc. ShipStacked is **not** that — it's a structured-data publisher (HTML + JSON-LD + CSV). Honestly populating A2A's `skills` and `capabilities` for a non-A2A-server requires deliberate framing.

**My recommendation: serve an A2A-v1.0-shaped card at `/.well-known/agent-card.json` with explicit `metadata` extensions clarifying ShipStacked is a *data publisher*, not an interactive agent.** Reasoning tied to Spec §3:
- **Accurate** — `capabilities.streaming=false`, `capabilities.pushNotifications=false`, `skills` describe the actual data surfaces honestly (each one a "fetch this URL, get this content-type" skill, not an "invoke this RPC").
- **Standards-shaped** — A2A's shape is the one tooling probes for. Using A2A's required fields gives discoverability today.
- **Honest about scope** — a `shipstacked:cardKind = "data-publisher"` extension under `metadata` is the truthful explicit-flag, plus the `description` text says "publishes structured data; does not currently respond to A2A messages."
- **Same path Doc 05 corrected to.**

**Thomas's alternatives if you disagree:**
- (a) **Use IETF draft instead** at `/.well-known/agentcard` — purer fit for "data publisher" but path agents won't probe yet. Less discoverable. Could later be ADDED as a second well-known file once adoption grows.
- (b) **Defer Beacon 2** until/unless we build the MCP server (Beacon 5), which IS a data-publisher-shaped convention.
- (c) **Publish both**: A2A-shape at the dominant path + IETF-shape at `/.well-known/agentcard` for crawlers that follow the draft. Doubles surface; doubles maintenance.

**Default recommendation if you don't pick: (the body of my recommendation above) — A2A v1.0 shape at `/.well-known/agent-card.json` with `metadata` extensions for honest framing.** All Section H below assumes this default; switch easily if you pick (a) or (c).

---

## SECTION A — The chosen AgentCard convention

### Recommended: A2A AgentCard v1.0 (Linux Foundation, ex-Google)

- **Path:** `/.well-known/agent-card.json` (RFC 8615 well-known URI)
- **Current version:** `1.0.0` (per [a2a-protocol.org/latest/specification/](https://a2a-protocol.org/latest/specification/))
- **Content-Type:** the spec specifies `application/a2a+json`; in practice clients accept `application/json` and the IANA registration is in progress
- **Source-of-truth schema:** `spec/a2a.proto` in `a2aproject/A2A` GitHub (the gh fetch returned 404 directly but the public docs at a2a-protocol.org describe the shape)

### Required fields (from the A2A v1.0 spec + the community schema gist)

The spec text is partially behind protobuf source; aggregated from authoritative docs:

| Field | Type | Note |
|---|---|---|
| `protocolVersion` | string | A2A version this card targets (e.g. `"1.0.0"`) |
| `name` | string | Agent identity name |
| `description` | string | Human-readable description |
| `url` | string (URL) | Agent service base URL (A2A clients POST JSON-RPC here) |
| `version` | string | Agent version (semver) |
| `capabilities` | object | `{ streaming: bool, pushNotifications: bool, stateTransitionHistory: bool, extensions: [] }` |
| `defaultInputModes` | string[] | Media types accepted (e.g. `["text/plain"]`) |
| `defaultOutputModes` | string[] | Media types produced (e.g. `["application/ld+json"]`) |
| `skills` | AgentSkill[] | Array of `{ id, name, description, tags[], examples[], inputModes[], outputModes[] }` |
| `provider` | object | `{ organization, url }` — author/operator metadata |

### Optional fields used in our card

- `metadata` — free-form object for `shipstacked:` extensions (matches Beacon 1's `shipstacked:` namespace convention).
- `securitySchemes` / `security` — not applicable to public read-only surfaces; can be omitted or set to "none".
- `documentationUrl` — point at `/api-docs` if relevant.

### Why not the IETF draft (`/.well-known/agentcard`)

- Path is `agentcard` without `.json` — agents probing `agent-card.json` (the A2A convention) won't find it.
- IETF draft is at `draft-aevum-agentcard-00` — pre-RFC; subject to change; minor adoption today.
- Better as a future Beacon-2.5 addition once IETF stabilises and tooling probes it. Not the right v1 target.

---

## SECTION B — Serving `/.well-known/` in this Next.js app + collision check

### Existing `/.well-known/` content — none

- **Local repo:** `public/.well-known/` directory does NOT exist (`ls public/` shows only SVG icons + `og-default.svg`).
- **Production:** every common well-known path tested returns `404` — `agent-card.json`, `agent.json`, `security.txt`, `change-password`, `assetlinks.json`, `apple-app-site-association`. **Zero collision risk**, zero existing resource to preserve.
- **Code references to `/.well-known/`** (grep'd in `src/`): exclusively the V2 paste-classifier probing **external** URLs for MCP servers (`src/services/extractors/mcp_server.ts:73,201`, `src/lib/paste/classifier.ts:221,232`). These probe `<external-url>/.well-known/mcp` to detect agent servers being pasted into ShipStacked — they do NOT expose anything at our own `/.well-known/`. **Not a collision; not modified by Beacon 2.**

### Two ways to serve the card in Next.js 16 App Router

**B.1 — Static file at `public/.well-known/agent-card.json`**
- Pro: simplest; Next.js serves it without any code path; zero runtime cost.
- Con: hand-maintained; drifts when the surface inventory changes (new collection routes, new V2 pages); has no programmatic content-type override (Next.js infers from extension — `.json` → `application/json`, NOT `application/a2a+json`).

**B.2 — Route handler at `src/app/.well-known/agent-card.json/route.ts`** ← recommended
- Pro: content is generated from one canonical card-builder function (analogous to `src/lib/jsonld/` Beacon 1 pattern); programmatic `Content-Type: application/a2a+json` + `Cache-Control` headers; commit-controlled (the card source is reviewed in PRs); can include `dateModified` ETag.
- Con: tiny runtime cost per request (negligible — no DB queries, the card is a constant).

**Recommended: B.2.** Matches the V2 + Beacon 1 + Collections pattern (route handler with content-negotiation-friendly cache headers). Aligns with Spec §4.2: *"lean route handler if the content should reflect live config."* The card content is mostly fixed but the surface inventory could grow in Beacons 3–5 — a route handler is the right home for that single source of truth.

Note: in Next.js App Router, `src/app/.well-known/agent-card.json/route.ts` works because dots are allowed in route segment names — the directory `agent-card.json` is treated as a literal segment. Verified by pattern: the existing `/llms.txt` route uses `src/app/llms.txt/route.ts` (also a dot in the segment name). Safe pattern.

---

## SECTION C — Accuracy audit (every surface the card could declare, verified live on production)

Tested by `curl` against `https://shipstacked.com/` 2026-05-16. Every surface the proposed card declares **MUST be confirmed live**; nothing aspirational.

| Surface | Path | Live status | Content-Type(s) | Declare? |
|---|---|---|---|---|
| Homepage | `/` | 200 | text/html (with inline Beacon 1 Organization + WebSite JSON-LD) | ✓ |
| Builder profile | `/u/[username]` | 200 (e.g. `/u/aniketaslaliya801`) | text/html (with Beacon 1 Person + shipstacked:Builder JSON-LD) | ✓ — declare as `fetch-builder` skill |
| Atlas long-form | `/atlas` | 200 | text/html (with Article + DefinedTermSet JSON-LD) | ✓ — declare as `read-atlas` skill |
| Atlas role (HTML) | `/atlas/roles/[id]` | 200 (e.g. `/atlas/roles/A1`) | text/html (with V2 DefinedTerm + shipstacked:AtlasRole) | ✓ — content-negotiated |
| Atlas role (JSON-LD) | `/atlas/roles/[id].json` | 200 | application/ld+json | ✓ |
| Atlas role (Accept-negotiated) | `/atlas/roles/[id]` + `Accept: application/ld+json` | 200 | application/ld+json | ✓ |
| Proof receipt (HTML) | `/p/[slug]` | route live; 404 for unknown (V2 receipts table currently empty) | text/html when row exists | ✓ — declare as `read-receipt` skill |
| Proof receipt (JSON-LD) | `/p/[slug].json` | route live; 404 for unknown | application/ld+json | ✓ |
| Build Feed list | `/feed` | 200 | text/html | ✓ |
| Build Feed post | `/feed/[id]` | 200 (or 404 for fake-authored posts after Beacon 1's H9a fix) | text/html (with Article JSON-LD) | ✓ |
| Jobs board | `/jobs` | 200 | text/html (with Organization JSON-LD; ItemList suppressed when 0 active jobs) | ✓ |
| Job detail | `/jobs/[id]` | 200 when active; 308 → `/jobs` when paused (Tier 0) | text/html with JobPosting JSON-LD when active | ✓ — declare the live-when-active behavior |
| Talent directory | `/talent` | 200 | text/html (paywall-aware Person ItemList) | ✓ |
| Leaderboard | `/leaderboard` | 200 | text/html (Person ItemList top-10) | ✓ |
| Employer page | `/company/[slug]` | 200 when public + exists, 404 otherwise | text/html (Organization JSON-LD) | ✓ |
| **Consented Collections** (capability) | `/collections/[slug]` family | route family live (unknown/inactive slug → 404; that's the active-collection gate) | text/html / application/ld+json / text/csv per content-negotiation | ✓ — declare **generically** as `read-collection` capability with the route family, NEVER a specific slug |
| `/llms.txt` | `/llms.txt` | 200 | text/plain | ✓ |
| `/sitemap.xml` | `/sitemap.xml` | 200 | application/xml | ✓ |
| `/robots.txt` | `/robots.txt` | 200 | text/plain | ✓ |
| **`shipstacked:` schema namespace** (IRI) | `https://shipstacked.com/schema/v0.1#` | 404 (namespace IRIs typically don't dereference) | — | **Mention in `metadata.shipstacked:namespace` only; do NOT claim it as a fetchable URL** — false declaration |

### Surfaces explicitly NOT declared

- `/dashboard`, `/admin*`, `/employer*`, `/messages`, `/client*`, `/post-job`, `/login`, `/signup`, `/join`, `/auth/*`, `/reset-password`, `/set-password`, `/update-password`, `/success`, `/privacy`, `/terms`, `/hire*`, `/claim*`, `/get-found/*`, `/paste*` — all auth-gated, transactional, or non-agent-relevant. No structured public data.
- `/api/*` other than the public JSON-LD/CSV endpoints — application-internal.
- `/collections/<specific-slug>` — **never name a specific slug** (collections are data; brand-free rule).
- Any partner/program/brand name — anywhere.
- `/api/paste/*`, intake forms, etc. — interactive only with auth.

---

## SECTION D — The card JSON draft (brand-free, accurate, post-Tier-1 truth)

```jsonc
{
  "protocolVersion": "1.0.0",
  "name": "ShipStacked",
  "description": "Proof-of-work hiring platform for AI-native builders. Machine-readable graph of public builder profiles, the Atlas role taxonomy, proof receipts, and consented collections. Publishes structured data via HTML + JSON-LD + CSV; does not currently respond to A2A messages.",
  "url": "https://shipstacked.com/",
  "version": "0.1.0",
  "documentationUrl": "https://shipstacked.com/api-docs",
  "provider": {
    "organization": "ShipStacked",
    "url": "https://shipstacked.com/"
  },
  "capabilities": {
    "streaming": false,
    "pushNotifications": false,
    "stateTransitionHistory": false,
    "extensions": []
  },
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": [
    "text/html",
    "application/ld+json",
    "application/json",
    "text/csv",
    "text/plain"
  ],
  "skills": [
    {
      "id": "fetch-builder-profile",
      "name": "Fetch a public builder profile",
      "description": "Returns a builder's public profile as HTML with embedded schema.org/Person + shipstacked:Builder JSON-LD. The Person @id matches the identity used in proof receipts and consented collections.",
      "tags": ["schema.org", "Person", "shipstacked:Builder", "read-only"],
      "examples": ["GET https://shipstacked.com/u/<username>"],
      "inputModes": ["text/plain"],
      "outputModes": ["text/html"]
    },
    {
      "id": "read-atlas-role",
      "name": "Read an Atlas role by id",
      "description": "Returns the canonical definition of an Atlas role (the practitioner-defined taxonomy of agentic-economy labor). HTML by default; application/ld+json when negotiated via Accept header or .json suffix. Each role is a schema.org/DefinedTerm + shipstacked:AtlasRole, part of the Atlas DefinedTermSet.",
      "tags": ["schema.org", "DefinedTerm", "shipstacked:AtlasRole", "taxonomy"],
      "examples": [
        "GET https://shipstacked.com/atlas/roles/A1",
        "GET https://shipstacked.com/atlas/roles/A1.json",
        "GET https://shipstacked.com/atlas/roles/A1 (Accept: application/ld+json)"
      ],
      "inputModes": ["text/plain"],
      "outputModes": ["text/html", "application/ld+json"]
    },
    {
      "id": "read-atlas-overview",
      "name": "Read the Atlas overview document",
      "description": "Long-form practitioner-defined map of the agentic-economy labor market. HTML with embedded schema.org/Article and a DefinedTermSet linking to every per-role DefinedTerm.",
      "tags": ["schema.org", "Article", "DefinedTermSet", "shipstacked:AtlasArticle"],
      "examples": ["GET https://shipstacked.com/atlas"],
      "inputModes": ["text/plain"],
      "outputModes": ["text/html"]
    },
    {
      "id": "read-proof-receipt",
      "name": "Read a public proof receipt by slug",
      "description": "Returns a published proof receipt — an atomic, verifiable record of work shipped by a builder. HTML by default; application/ld+json when negotiated. Each receipt is a schema.org/CreativeWork + shipstacked:ProofReceipt with Atlas role classification and verification ladder state.",
      "tags": ["schema.org", "CreativeWork", "shipstacked:ProofReceipt", "verification"],
      "examples": [
        "GET https://shipstacked.com/p/<slug>",
        "GET https://shipstacked.com/p/<slug>.json"
      ],
      "inputModes": ["text/plain"],
      "outputModes": ["text/html", "application/ld+json"]
    },
    {
      "id": "read-consented-collection",
      "name": "Read a consented collection by slug",
      "description": "Returns a named, consented collection of builders — only builders who have explicitly opted in are included. Unknown or inactive slugs return 404 by design. HTML by default; application/ld+json (schema.org/ItemList of schema.org/Person + shipstacked:Builder) or text/csv via content negotiation or .json/.csv suffix.",
      "tags": ["schema.org", "ItemList", "shipstacked:BuilderCollection", "consent"],
      "examples": [
        "GET https://shipstacked.com/collections/<slug>",
        "GET https://shipstacked.com/collections/<slug>.json",
        "GET https://shipstacked.com/collections/<slug>.csv"
      ],
      "inputModes": ["text/plain"],
      "outputModes": ["text/html", "application/ld+json", "text/csv"]
    },
    {
      "id": "fetch-llms-txt",
      "name": "Fetch the LLM-discoverable index",
      "description": "Plain-text index of Atlas roles and recent public proof receipts, formatted per the llms.txt convention.",
      "tags": ["llms.txt", "discovery"],
      "examples": ["GET https://shipstacked.com/llms.txt"],
      "inputModes": ["text/plain"],
      "outputModes": ["text/plain"]
    },
    {
      "id": "fetch-sitemap",
      "name": "Fetch the public sitemap",
      "description": "XML sitemap of public pages (homepage, builder profiles where published=true, active job listings, public employer pages, build feed posts). Drives crawl discovery for any agent that prefers sitemaps to ad-hoc probing.",
      "tags": ["sitemap"],
      "examples": ["GET https://shipstacked.com/sitemap.xml"],
      "inputModes": ["text/plain"],
      "outputModes": ["application/xml"]
    }
  ],
  "metadata": {
    "shipstacked:cardKind": "data-publisher",
    "shipstacked:interactiveAgent": false,
    "shipstacked:namespace": "https://shipstacked.com/schema/v0.1#",
    "shipstacked:graphNote": "All public surfaces share one @id graph keyed by canonical URLs. A builder's Person @id at /u/<username> is the same @id used in proof-receipt author refs at /p/<slug> and in collection ItemList items at /collections/<slug>. One URL keys both per-page and aggregated structured data.",
    "shipstacked:beacons": {
      "schemaOrg": { "status": "live", "since": "2026-05-16" },
      "consentedCollections": { "status": "live", "since": "2026-05-16", "note": "Capability is live; named collections are operational and created out-of-band." },
      "agentCard": { "status": "live", "since": "2026-05-16" },
      "agentsMd": { "status": "deferred", "note": "Beacon 3 — not yet shipped." },
      "atlasPackage": { "status": "deferred", "note": "Beacon 4 — not yet shipped." },
      "mcpServer": { "status": "deferred", "note": "Beacon 5 — not yet shipped." }
    }
  }
}
```

### Why every field is what it is

- **`protocolVersion: "1.0.0"`** — declares we target A2A v1.0 shape. If we later target v1.x, bump this. Independent of `version`.
- **`name`, `description`** — accurate, post-Tier-1 truth. The description names no partner, no program, no brand. The phrase *"does not currently respond to A2A messages"* is the honest disclosure that we're a data publisher, not an interactive agent.
- **`url`** — `https://shipstacked.com/`. A2A clients POST JSON-RPC here. We currently return 200 HTML (the homepage); a JSON-RPC-shaped POST would fail. That's correct behaviour: we're not an A2A server, and the card's `capabilities` are all false. Clients that respect the card don't try to message us.
- **`version: "0.1.0"`** — initial Beacon 2 shipping version. Bumps when surface inventory changes.
- **`capabilities`** — all false. Honest. No streaming, no push, no state history. Not lying about being an interactive agent.
- **`defaultInputModes` / `defaultOutputModes`** — the actual media types in play (output includes text/html for pages, application/ld+json for content-negotiated endpoints, text/csv for collection projections, application/json for some API responses, text/plain for llms.txt).
- **`skills`** — 7 skills, each one a documented "fetch this URL, get this content-type" action. **No skill is invokable by JSON-RPC** — they're all HTTP GETs against canonical URLs. The card declares the surfaces; agents call them via standard HTTP.
- **`metadata.shipstacked:cardKind = "data-publisher"`** — explicit flag. Agents that recognize the extension know not to try A2A message-send.
- **`metadata.shipstacked:graphNote`** — explains the one-graph invariant (Beacon 1's Noah-gateway-critical property that the same URL `@id` keys per-page and aggregated markup).
- **`metadata.shipstacked:beacons`** — honest status of each beacon. Spec §3: no aspirational claims; deferred beacons are clearly marked deferred.
- **NO brand/partner/program/specific-collection-slug anywhere.** Grep-verified before writing.

### Skills explicitly NOT in the card

- Apply-to-job, post-job, opt-in-to-collection — these require auth; not agent-discoverable actions for a public crawl.
- Anything under `/api/v1/*` (the Builder API) — auth-gated; future Beacon (likely Beacon 5 MCP) is the right home.

---

## SECTION E — Cache + serving headers

Recommendation:
```
Content-Type:   application/a2a+json; charset=utf-8
Cache-Control:  public, max-age=300, stale-while-revalidate=3600
ETag:           "agent-card-<short-hash-of-card-content>-<release-tag-or-commit-short-sha>"
```

- **`application/a2a+json`** is what the A2A v1.0 spec asks for (IANA registration in progress per the spec text). Browsers / `curl` will handle it the same as `application/json`; A2A-aware clients prefer it. **Fallback acceptable: serve `application/json` if any client tooling chokes on the custom media type.**
- **`max-age=300, stale-while-revalidate=3600`** is consistent with the longer-lived nature of the card vs the V2 per-page endpoints (which use `max-age=60`). The card changes only on deploy; 5-minute fresh + 1-hour SWR is conservative and easily revalidated by deploy invalidation.
- **ETag** — content-hash + commit SHA gives both content-based and version-based freshness signal. Lets agents do `If-None-Match` for cheap polling.

The values are read-only — no DB queries during card generation, so latency is microseconds.

---

## SECTION F — No Beacon 1 / Collections / V2 modification; no new exposure

Beacon 2 is **pure-additive code-only**. Verified before writing the change list:

- **Beacon 1 files** (`src/lib/jsonld/*`, every page that emits Beacon 1 markup) — **NOT modified** by H1–H6.
- **V2 files** (`src/lib/receipts/*`, `src/lib/atlas/*`, `/p/[slug]`, `/atlas/roles/[id]`) — **NOT modified.**
- **Consented Collections files** (`src/lib/collections/*`, `/api/collections/[slug]/*`, `/collections/[slug]*`) — **NOT modified.**
- **V2 paste-classifier code** (`src/services/extractors/mcp_server.ts`, `src/lib/paste/classifier.ts`) — references EXTERNAL `/.well-known/mcp` probes (for detecting MCP servers being pasted *into* ShipStacked); this is a different scope and is NOT modified.
- **No new public data exposed.** Every surface the card declares is already publicly reachable. The card is a directory of the already-public — Spec §3 explicit invariant.
- **Production data: zero mutation.** This is code-only.

---

## SECTION G — Convention-expects-adjacent-files finding

A2A v1.0 mentions two adjacent-file concepts; both are OPTIONAL for our card:

1. **Signed AgentCard / public key** — A2A v1.2 (NOT v1.0) introduced JWS-signed AgentCards with a public key published at `/.well-known/agent-public-key.pem`. **Out of scope for Beacon 2.** Signed-card / DID-based identity is a future Beacon (likely Beacon 5+ alongside MCP server work). The unsigned card we publish is fine for v1.0.0 conformance.

2. **A2A registry submission** — A2A's curated agent-registry is opt-in submission, not a well-known file. Not auto-discovery; not in scope.

3. **Adjacent: `/.well-known/security.txt`** (RFC 9116, unrelated to A2A) — would be a small additional well-known file declaring a security contact. Industry-standard for anyone exposing structured data at scale. **Not in Beacon 2's scope per the spec; suggest as a fast-follow.** Flagging here, not auto-expanding.

4. **Adjacent: IETF AgentCard draft at `/.well-known/agentcard`** — could be added as a second well-known file once the draft stabilises. **Defer.**

No convention requires us to ship anything alongside `/.well-known/agent-card.json` to be valid for A2A v1.0 discovery. Beacon 2 ships one file; that's complete.

---

## SECTION H — Proposed Phase 2 change list (FOR THOMAS APPROVAL)

Numbered, each individually approvable, each individually reversible (this is code-only — `git revert <commit>` is full reversal; **no DDL, no production data mutation**).

### H1 — Route handler at `src/app/.well-known/agent-card.json/route.ts`

New file. GET-only handler. Returns the AgentCard JSON with `Content-Type: application/a2a+json; charset=utf-8`, `Cache-Control: public, max-age=300, stale-while-revalidate=3600`, content-hash ETag. ~50 lines.

### H2 — Card-builder module at `src/lib/agent-card/builder.ts`

New file. `buildAgentCard()` function returns the typed AgentCard object. Single source of truth for the card content. All the JSON from §D lives here. Reuses `CANONICAL_HOST` + `SHIPSTACKED_NS` from `src/lib/jsonld/context.ts` (consistent with Beacon 1's pattern of one shared canonical-host helper). Exports a TypeScript interface `AgentCard` matching the A2A v1.0 shape.

### H3 — Validation script `scripts/v2/verify-agent-card.ts`

Small admin/CI script. Fetches the card from `http://localhost:3000/.well-known/agent-card.json` (and optionally a production URL via arg), parses JSON, asserts every required A2A v1.0 field is present and correctly typed, asserts every declared `examples[]` URL actually 200s (or returns the expected 404 for slug-parameterised routes), grep-asserts no brand/partner/program names appear anywhere in the served card body. Phase 2's H7 verification runs this script.

### H4 — Optional: README `src/lib/agent-card/README.md`

Module quick-ref. Documents: shape, where the spec lives (link to a2a-protocol.org), the "data publisher, not interactive agent" choice + reasoning, how to update the card (`buildAgentCard()` is the only writer; updating means PR'ing the function).

### H5 — Middleware passthrough check

`src/middleware.ts` matcher already excludes `/api`, `_next/static`, `_next/image`, `favicon.ico`, `sitemap.xml`, `robots.txt`. **Confirm `/.well-known/*` is reached cleanly** — current matcher pattern `'/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|og-default.svg|api).*)'` should let `/.well-known/agent-card.json` through without auth-gate interference. If for some reason the middleware redirects or otherwise interferes, adjust the matcher to exclude `/.well-known/*`. **Likely no code change needed — verify in H7.**

### H6 — Cross-references in `/llms.txt` (optional, low-cost)

Add a single line near the top of `src/app/llms.txt/route.ts`'s generated output: a reference to the agent card location. Honest cross-linkage between the two machine-readable discovery surfaces. Small change to one file. **Flag this as optional** — Spec §3 forbids modifying existing surfaces beyond what's strictly needed; on the other hand, `/llms.txt` is the other "where to look" file and pointing one at the other is a natural improvement. Thomas decides.

### H7 — Verification (before commit) — per Spec §5.1

- `curl http://localhost:3000/.well-known/agent-card.json` → 200, `Content-Type: application/a2a+json`, body parses as JSON, all required fields present.
- `verify-agent-card.ts` passes: every required field correct type; every `examples[]` URL is independently `curl`-tested live (per-builder skill example uses a real published builder like `aniketaslaliya801`; Atlas role example uses `A1`; receipt example uses a known nonexistent slug expecting 404; collection example uses a nonexistent slug expecting 404 — the route family being LIVE is what's being declared, not a specific slug being LIVE).
- `grep` of the served card body: ZERO matches for brand/partner/program names (a literal allowlist of strings checked: `appsumo`, `noah`, `kagan`, `founding-beta`, `gergely`, etc. — all must return 0). Generic "approved partners" allowed.
- **No Beacon 1 / V2 / Collections file modified** — `git status` of those paths empty; Beacon 1 person.ts `git diff` returns 0 lines.
- **Tier 0 + Tier 1 + Beacon 1 + Collections regressions**: seed-job 308, 3 fakes 404, fake-feed 404, V2 spine 200 ld+json, `/collections/nonexistent` 404, three new tables still 0 rows.
- `npx tsc --noEmit` clean; `npm run build` clean; `/.well-known/agent-card.json` route appears in the build output.
- **Crawler's-eye check**: `curl -A "ExampleBot/1.0"` returns the same body (server-rendered; no JS required).

### H8 — Commit + push

Code-only commit. Message documents:
- Chosen convention (A2A v1.0) + path (`/.well-known/agent-card.json`) + Doc 05 reference.
- Why A2A despite the publisher-side mismatch (dominant adoption; `shipstacked:cardKind="data-publisher"` extension makes scope honest).
- Every declared surface (and that each was verified live in H7).
- Brand-free / no-new-exposure confirmation.
- Adjacent files NOT shipped (signed-card / agent-public-key.pem, IETF draft, security.txt) — listed as fast-follows.
- Reversal: `git revert <commit>` fully reverses. No DB rollback.

### H9 — What this spec does NOT do (explicit non-goals)

- Does NOT ship a signed AgentCard (A2A v1.2 JWS feature — future).
- Does NOT ship `/.well-known/agentcard` (IETF draft — defer until draft stabilises).
- Does NOT ship `/.well-known/security.txt` (RFC 9116 — fast-follow).
- Does NOT modify ANY Beacon 1 / V2 / Collections file.
- Does NOT submit to any agent registry.
- Does NOT name any partner / program / brand / specific collection slug.
- Does NOT auto-enroll any builder in anything.
- Does NOT mutate any production data.

---

## Sources verified during this discovery

- [Agent2Agent (A2A) Protocol Specification (latest v1.0.0)](https://a2a-protocol.org/latest/specification/) — the dominant convention's spec.
- [A2A Agent Discovery topic](https://a2a-protocol.org/latest/topics/agent-discovery/) — well-known path conventions.
- [IETF draft-aevum-agentcard-00](https://www.ietf.org/archive/id/draft-aevum-agentcard-00.html) — alternative, data-publisher-friendly.
- [Agent Card v1.0 Schema gist (SecureAgentTools)](https://gist.github.com/SecureAgentTools/0815a2de9cc31c71468afd3d2eef260a) — minimal example reference.
- [A2A community page](https://agent2agent.info/docs/concepts/agentcard/) — adoption context.

Plus live `curl` audit of `https://shipstacked.com/*` for every claimable surface (Section C table), and local `ls` / `grep` of `public/` and `src/` for collision/reference detection (Section B).

---

*End of Phase 1 discovery. STOP. Awaiting Thomas's review and explicit Section H approval before Phase 2.*
