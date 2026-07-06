/**
 * AgentCard builder — the single source of truth for the document
 * served at /.well-known/agent-card.json.
 *
 * Shape: A2A AgentCard v1.0 (the dominant convention, Linux Foundation,
 * https://a2a-protocol.org/latest/specification/). Path matches Doc 05's
 * corrected `/.well-known/agent-card.json`.
 *
 * IMPORTANT — this card is a DATA-PUBLISHER card, not an interactive
 * A2A agent server card. ShipStacked publishes structured data (HTML +
 * JSON-LD + CSV); it does NOT respond to A2A JSON-RPC messages. The
 * non-interactivity disclaimer is load-bearing and unmissable:
 *
 *   1. `description` opens with the disclaimer in plain language.
 *   2. `capabilities` are all false.
 *   3. `metadata.shipstacked:cardKind = "data-publisher"`.
 *   4. Each skill description is phrased as "Fetch <URL> → returns
 *      <media-type>" — never as an invokable RPC action.
 *   5. The `url` field exists only because A2A v1.0 requires it; we
 *      do NOT serve JSON-RPC at that URL.
 *
 * Spec: docs/v2/TIER_3_BEACON_2_AGENTCARD_SPEC.md
 * Discovery: docs/audit/BEACON_2_DISCOVERY.md §A §D (decision: A2A v1.0
 * with unmissable data-publisher disclaimer; Section H approved 2026-05-16).
 *
 * Standing rules enforced in this file:
 *   - No brand, partner, program, or specific-collection-slug names
 *     anywhere in this card body. Collections capability is declared
 *     GENERICALLY via the slug-parameter route family.
 *   - The skills list is what the card declares about ShipStacked's
 *     surfaces; updating means PR-ing this function.
 *   - The `metadata.shipstacked:` extensions use the same namespace
 *     Beacon 1 + V2 already publish, so the whole site is one graph.
 */

import { CANONICAL_HOST, SHIPSTACKED_NS } from '../jsonld/context.ts'

// ─── A2A v1.0 types (minimal — only the fields we populate) ──────────

export interface AgentSkill {
  id: string
  name: string
  description: string
  tags?: string[]
  examples?: string[]
  inputModes?: string[]
  outputModes?: string[]
}

export interface AgentCapabilities {
  streaming: boolean
  pushNotifications: boolean
  stateTransitionHistory: boolean
  extensions: unknown[]
}

export interface AgentProvider {
  organization: string
  url: string
}

export interface AgentCard {
  protocolVersion: string
  name: string
  description: string
  url: string
  version: string
  documentationUrl?: string
  provider: AgentProvider
  capabilities: AgentCapabilities
  defaultInputModes: string[]
  defaultOutputModes: string[]
  skills: AgentSkill[]
  metadata: Record<string, unknown>
}

// ─── Constants ───────────────────────────────────────────────────────

const A2A_PROTOCOL_VERSION = '1.0.0'
const CARD_VERSION = '0.1.0'

// Unmissable non-interactivity disclaimer. Lead clause of `description`.
// Anyone parsing this card cannot reasonably miss that this is NOT an
// interactive A2A agent server.
const DESCRIPTION = [
  'NOT AN INTERACTIVE A2A AGENT SERVER — this is a data-publisher card.',
  'ShipStacked publishes structured data (HTML + JSON-LD + CSV) describing',
  'public builder profiles, the Atlas role taxonomy, proof receipts, and',
  'consented collections. All declared skills below are HTTP GET targets',
  'returning the listed media types; they are NOT invokable A2A tasks.',
  'The `url` field exists only because A2A v1.0 requires it — we do NOT',
  'respond to JSON-RPC at that endpoint. Capabilities are all false. See',
  '`metadata.shipstacked:cardKind = "data-publisher"`.',
].join(' ')

// ─── Skill helpers ───────────────────────────────────────────────────

const TEXT_PLAIN_IN: string[] = ['text/plain']

function fetchSkill(opts: {
  id: string
  name: string
  description: string
  tags: string[]
  examples: string[]
  outputModes: string[]
}): AgentSkill {
  // Every skill name leads with "Fetch …" or "Read …" so it cannot be
  // mistaken for an invokable A2A action. The description starts with
  // "Fetch <url> → returns <media-type>" for the same reason.
  return {
    id: opts.id,
    name: opts.name,
    description: opts.description,
    tags: opts.tags,
    examples: opts.examples,
    inputModes: TEXT_PLAIN_IN,
    outputModes: opts.outputModes,
  }
}

// ─── The builder ─────────────────────────────────────────────────────

export function buildAgentCard(): AgentCard {
  const skills: AgentSkill[] = [
    fetchSkill({
      id: 'fetch-builder-profile',
      name: 'Fetch a public builder profile',
      description:
        'Fetch https://shipstacked.com/u/<username> → returns text/html with embedded schema.org/Person + shipstacked:Builder JSON-LD. ' +
        'The Person @id matches the identity used in proof receipts and consented collections (one URL keys the whole graph). ' +
        'This is a plain HTTP GET; no A2A invocation.',
      tags: ['schema.org', 'Person', 'shipstacked:Builder', 'http-get'],
      examples: [`GET ${CANONICAL_HOST}/u/<username>`],
      outputModes: ['text/html'],
    }),
    fetchSkill({
      id: 'fetch-team-profile',
      name: 'Fetch a public team / agency profile',
      description:
        'Fetch https://shipstacked.com/team/<slug> → returns text/html with embedded schema.org/Organization + shipstacked:Team JSON-LD. ' +
        'Lists the team\'s services, linked members (Person @id refs into /u/<username>), and recent proof receipts. ' +
        'Published teams only; unknown or unpublished slugs return 404 by design. ' +
        'This is a plain HTTP GET; no A2A invocation.',
      tags: ['schema.org', 'Organization', 'shipstacked:Team', 'team', 'agency', 'http-get'],
      examples: [`GET ${CANONICAL_HOST}/team/<slug>`],
      outputModes: ['text/html'],
    }),
    fetchSkill({
      id: 'fetch-agent-profile',
      name: 'Fetch a public AI agent profile',
      description:
        'Fetch https://shipstacked.com/agent/<slug> → returns text/html with embedded shipstacked:Agent JSON-LD. ' +
        'Lists the agent\'s provider, model, capabilities, focus, principal, and recent proof receipts. ' +
        'Published agents only; unknown or unpublished slugs return 404 by design. ' +
        'This is a plain HTTP GET; no A2A invocation.',
      tags: ['shipstacked:Agent', 'agent', 'http-get'],
      examples: [`GET ${CANONICAL_HOST}/agent/<slug>`],
      outputModes: ['text/html'],
    }),
    fetchSkill({
      id: 'fetch-atlas-role',
      name: 'Fetch an Atlas role definition by id',
      description:
        'Fetch https://shipstacked.com/atlas/roles/<id> → returns text/html with embedded schema.org/DefinedTerm + shipstacked:AtlasRole. ' +
        'Append .json or send Accept: application/ld+json to receive the pure JSON-LD body instead. ' +
        'Plain HTTP GET with content negotiation; no A2A invocation.',
      tags: ['schema.org', 'DefinedTerm', 'shipstacked:AtlasRole', 'taxonomy', 'http-get'],
      examples: [
        `GET ${CANONICAL_HOST}/atlas/roles/<id>`,
        `GET ${CANONICAL_HOST}/atlas/roles/<id>.json`,
        `GET ${CANONICAL_HOST}/atlas/roles/<id> (Accept: application/ld+json)`,
      ],
      outputModes: ['text/html', 'application/ld+json'],
    }),
    fetchSkill({
      id: 'fetch-atlas-overview',
      name: 'Fetch the Atlas overview document',
      description:
        'Fetch https://shipstacked.com/atlas → returns text/html with embedded schema.org/Article + shipstacked:AtlasArticle and a DefinedTermSet linking to every per-role DefinedTerm. ' +
        'Plain HTTP GET; no A2A invocation.',
      tags: ['schema.org', 'Article', 'DefinedTermSet', 'shipstacked:AtlasArticle', 'http-get'],
      examples: [`GET ${CANONICAL_HOST}/atlas`],
      outputModes: ['text/html'],
    }),
    fetchSkill({
      id: 'fetch-capability-page',
      name: 'Fetch a per-capability answer page by slug',
      description:
        'Fetch https://shipstacked.com/talent/<slug> → returns text/html with embedded schema.org/ItemList JSON-LD. ' +
        'One page per canonical capability, tool, or domain in the vocabulary — a ranked, proof-verified list of the builders, teams, and agents with real shipped work in that area (each item an @id ref into /u/<username>, /team/<slug>, or /agent/<slug>). ' +
        'Every /talent/<slug> URL is enumerated in /llms.txt and /sitemap.xml; unknown slugs return 404 by design. ' +
        'This is a plain HTTP GET; no A2A invocation.',
      tags: ['schema.org', 'ItemList', 'capability', 'directory', 'geo', 'http-get'],
      examples: [`GET ${CANONICAL_HOST}/talent/rag`],
      outputModes: ['text/html'],
    }),
    fetchSkill({
      id: 'fetch-proof-receipt',
      name: 'Fetch a public proof receipt by slug',
      description:
        'Fetch https://shipstacked.com/p/<slug> → returns text/html with embedded schema.org/CreativeWork + shipstacked:ProofReceipt. ' +
        'Append .json or send Accept: application/ld+json to receive the pure JSON-LD body. ' +
        'Each receipt carries Atlas role classification and verification-ladder state. ' +
        'Plain HTTP GET with content negotiation; no A2A invocation.',
      tags: ['schema.org', 'CreativeWork', 'shipstacked:ProofReceipt', 'verification', 'http-get'],
      examples: [
        `GET ${CANONICAL_HOST}/p/<slug>`,
        `GET ${CANONICAL_HOST}/p/<slug>.json`,
      ],
      outputModes: ['text/html', 'application/ld+json'],
    }),
    fetchSkill({
      id: 'fetch-consented-collection',
      name: 'Fetch a named consented collection (generic route family)',
      description:
        'Fetch https://shipstacked.com/collections/<slug> → returns text/html, .json (application/ld+json: schema.org/ItemList + shipstacked:BuilderCollection of Person items), or .csv (text/csv) per suffix or Accept header. ' +
        'Only builders who explicitly opted in are included. Unknown or inactive slugs return 404 by design (active-collection gate). ' +
        'This card declares the route FAMILY generically — it does not name any specific collection slug. ' +
        'Plain HTTP GET with content negotiation; no A2A invocation.',
      tags: ['schema.org', 'ItemList', 'shipstacked:BuilderCollection', 'consent', 'http-get'],
      examples: [
        `GET ${CANONICAL_HOST}/collections/<slug>`,
        `GET ${CANONICAL_HOST}/collections/<slug>.json`,
        `GET ${CANONICAL_HOST}/collections/<slug>.csv`,
      ],
      outputModes: ['text/html', 'application/ld+json', 'text/csv'],
    }),
    fetchSkill({
      id: 'fetch-llms-index',
      name: 'Fetch the LLM-discoverable plain-text index',
      description:
        'Fetch https://shipstacked.com/llms.txt → returns text/plain. ' +
        'A flat index of Atlas roles, the per-capability answer pages (/talent/<slug>), and recent public proof receipts, formatted per the llms.txt convention. ' +
        'Plain HTTP GET; no A2A invocation.',
      tags: ['llms.txt', 'discovery', 'http-get'],
      examples: [`GET ${CANONICAL_HOST}/llms.txt`],
      outputModes: ['text/plain'],
    }),
    fetchSkill({
      id: 'fetch-sitemap',
      name: 'Fetch the public sitemap',
      description:
        'Fetch https://shipstacked.com/sitemap.xml → returns application/xml. ' +
        'XML sitemap of public pages (homepage, published builder profiles, published team and agent pages, active job listings, public hirer pages, build-feed posts, per-capability answer pages, Atlas role definitions, and public proof receipts). ' +
        'Plain HTTP GET; no A2A invocation.',
      tags: ['sitemap', 'discovery', 'http-get'],
      examples: [`GET ${CANONICAL_HOST}/sitemap.xml`],
      outputModes: ['application/xml'],
    }),
    // Read-via-MCP-server skill — Step 2 announcement. The MCP server is a
    // SEPARATE non-A2A protocol (Streamable HTTP per MCP spec 2025-06-18).
    // This skill is announced here so A2A clients walking skills[] can
    // discover the MCP endpoint. The skill description explicitly carves
    // itself out of Beacon 2's "HTTP GET targets" disclaimer (MCP is POST
    // JSON-RPC) and reasserts "no A2A invocation" so verify-agent-card.ts's
    // existing per-skill assertion regex still matches.
    fetchSkill({
      id: 'read-via-mcp-server',
      name: 'Read via the MCP server (separate non-A2A protocol)',
      description:
        `Read via the MCP server at ${CANONICAL_HOST}/api/mcp — a separate non-A2A JSON-RPC protocol (MCP Streamable HTTP, protocol version 2025-06-18) exposing the same read-only data the other skills fetch over HTTP. ` +
        'POST a JSON-RPC initialize, then tools/list and tools/call. Tools: get-atlas-role, list-atlas-roles, get-collection, get-builder. ' +
        'This skill is itself NOT a fetch URL in the HTTP-GET sense (MCP is POST JSON-RPC) — it is announced here so A2A clients walking skills can discover the MCP endpoint. ' +
        'No A2A invocation; this is a separate protocol entirely, parallel to the HTTP-GET skills above.',
      tags: ['mcp', 'streamable-http', 'json-rpc', 'read-only', 'discovery'],
      examples: [
        `POST ${CANONICAL_HOST}/api/mcp  (with JSON-RPC initialize body)`,
      ],
      outputModes: ['application/json', 'text/event-stream'],
    }),
  ]

  return {
    protocolVersion: A2A_PROTOCOL_VERSION,
    name: 'ShipStacked',
    description: DESCRIPTION,
    url: `${CANONICAL_HOST}/`,
    version: CARD_VERSION,
    documentationUrl: `${CANONICAL_HOST}/api-docs`,
    provider: {
      organization: 'ShipStacked',
      url: `${CANONICAL_HOST}/`,
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
      extensions: [],
    },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: [
      'text/html',
      'application/ld+json',
      'application/json',
      'text/csv',
      'text/plain',
      'application/xml',
    ],
    skills,
    metadata: {
      // Unmissable extension flag — agents that read shipstacked: extensions
      // get the explicit non-interactivity signal.
      'shipstacked:cardKind': 'data-publisher',
      'shipstacked:interactiveAgent': false,
      'shipstacked:respondsToA2AMessages': false,
      'shipstacked:namespace': SHIPSTACKED_NS,
      // Phase 3: pointer to the authenticated write/action surface (auth.md open
      // protocol). Additive only — the card stays a read-only data-publisher card;
      // this just lets agents discover the action surface in one hop.
      'shipstacked:agentAuth': `${CANONICAL_HOST}/auth.md`,
      'shipstacked:graphNote':
        'All public surfaces share one @id graph keyed by canonical URLs. ' +
        'A builder Person @id at /u/<username> is the same @id used in receipt author refs at /p/<slug> ' +
        'and in collection ItemList items at /collections/<slug>. One URL keys both per-page and aggregated data.',
      // Step 2 — typed descriptor for the separate MCP server. No canonical A2A
      // field exists for cross-protocol announcement (verified at STEP_2_DISCOVERY
      // §A.1/§G); using the shipstacked: namespace Beacon 2 already publishes.
      // Every property here matches what the live /api/mcp server already serves.
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
      'shipstacked:beacons': {
        schemaOrg:            { status: 'live',     since: '2026-05-16' },
        consentedCollections: { status: 'live',     since: '2026-05-16', note: 'Capability is live; specific collections are operational and created out-of-band.' },
        agentCard:            { status: 'live',     since: '2026-05-16' },
        agentsMd:             { status: 'deferred', note: 'Beacon 3 — not yet shipped.' },
        atlasPackage:         { status: 'deferred', note: 'Beacon 4 — not yet shipped.' },
        mcpServer:            { status: 'live',     since: '2026-05-17', path: '/api/mcp', protocolVersion: '2025-06-18', transport: 'streamable-http', note: 'Read-only MCP tool calls over the same public data.' },
      },
    },
  }
}
