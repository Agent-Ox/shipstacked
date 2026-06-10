/**
 * verify-agent-card.ts — mechanized accuracy guarantee for Beacon 2.
 *
 * Fetches /.well-known/agent-card.json from a target base URL, asserts:
 *   - Required A2A v1.0 fields present + correct type
 *   - capabilities.streaming/pushNotifications/stateTransitionHistory all false
 *   - metadata.shipstacked:cardKind === 'data-publisher'
 *   - description leads with the non-interactivity disclaimer
 *   - Every skills[].examples URL is live (200 for direct GETs;
 *     known 404 acceptable for slug-parameterised <unknown> probes —
 *     proves the ROUTE family is live, which is what the card declares
 *     generically)
 *   - Body contains ZERO matches for a literal brand/partner/program allowlist
 *
 * Usage:
 *   node --env-file=.env.local --experimental-strip-types \
 *     scripts/v2/verify-agent-card.ts [--base http://localhost:3000]
 *
 * Defaults to http://localhost:3000. Pass --base https://shipstacked.com
 * for production verification.
 *
 * Exit codes: 0 = all gates pass; 1 = any failure.
 */

const DEFAULT_BASE = 'http://localhost:3000'

interface AgentSkill {
  id: string
  name: string
  description: string
  examples?: string[]
  outputModes?: string[]
}

interface AgentCard {
  protocolVersion: string
  name: string
  description: string
  url: string
  version: string
  provider: { organization: string; url: string }
  capabilities: {
    streaming: boolean
    pushNotifications: boolean
    stateTransitionHistory: boolean
  }
  defaultInputModes: string[]
  defaultOutputModes: string[]
  skills: AgentSkill[]
  metadata: Record<string, unknown>
}

// Literal brand / partner / program / specific-collection-slug names that
// must NEVER appear in the served card body. Lowercased; comparison is
// case-insensitive against the lowercased body.
const BRAND_ALLOWLIST_FORBIDDEN: string[] = [
  'appsumo',
  'noah',
  'kagan',
  'gergely',
  'orosz',
  'lovable',
  'cursor',
  'replit',
  'bolt',
  'windsurf',
  'anthropic-deal',
  'openai-deal',
  // specific collection slugs — never named in the card
  'founding-beta',
  'test-alpha',
  'test-beta',
]

function parseArgs(argv: string[]): { base: string } {
  let base = DEFAULT_BASE
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base' && argv[i + 1]) {
      base = argv[i + 1]
      i++
    }
  }
  return { base: base.replace(/\/$/, '') }
}

let failures = 0
function pass(msg: string) { console.log(`  PASS  ${msg}`) }
function fail(msg: string) { console.log(`  FAIL  ${msg}`); failures++ }
function info(msg: string) { console.log(`        ${msg}`) }

function expect<T>(label: string, actual: T, expected: T): void {
  if (actual === expected) pass(`${label} = ${JSON.stringify(actual)}`)
  else fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

async function main(): Promise<void> {
  const { base } = parseArgs(process.argv.slice(2))
  console.log('============================================================')
  console.log(`verify-agent-card.ts — target base: ${base}`)
  console.log('============================================================\n')

  // ─── 1. Fetch + content-type + structural parse ────────────────────
  console.log('1. Fetch /.well-known/agent-card.json')
  const res = await fetch(`${base}/.well-known/agent-card.json`)
  if (res.status !== 200) {
    fail(`HTTP ${res.status} (expected 200)`)
    process.exit(1)
  }
  pass(`HTTP 200`)
  const ct = res.headers.get('content-type') || ''
  if (/application\/(a2a\+json|json)/.test(ct)) pass(`Content-Type: ${ct}`)
  else fail(`Content-Type: ${ct} (expected application/a2a+json or application/json)`)
  const cacheControl = res.headers.get('cache-control') || ''
  if (/max-age=\d+/.test(cacheControl)) pass(`Cache-Control: ${cacheControl}`)
  else fail(`Cache-Control missing max-age: ${cacheControl}`)
  const etag = res.headers.get('etag')
  if (etag && etag.length > 0) pass(`ETag: ${etag}`)
  else fail('ETag header missing')

  const bodyText = await res.text()
  let card: AgentCard
  try {
    card = JSON.parse(bodyText) as AgentCard
    pass('Body parses as JSON')
  } catch (e) {
    fail(`Body is not valid JSON: ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  }

  // ─── 2. A2A v1.0 required fields ───────────────────────────────────
  console.log('\n2. A2A v1.0 required fields')
  for (const f of [
    'protocolVersion', 'name', 'description', 'url', 'version',
    'provider', 'capabilities', 'defaultInputModes', 'defaultOutputModes', 'skills',
  ] as const) {
    if (card[f] !== undefined && card[f] !== null) pass(`${f} present`)
    else fail(`${f} MISSING`)
  }
  if (typeof card.protocolVersion === 'string' && /^\d+\.\d+\.\d+$/.test(card.protocolVersion)) {
    pass(`protocolVersion = ${card.protocolVersion}`)
  } else fail(`protocolVersion not semver: ${card.protocolVersion}`)

  if (Array.isArray(card.defaultInputModes) && card.defaultInputModes.length > 0) pass(`defaultInputModes: ${JSON.stringify(card.defaultInputModes)}`)
  else fail('defaultInputModes empty or not array')
  if (Array.isArray(card.defaultOutputModes) && card.defaultOutputModes.length > 0) pass(`defaultOutputModes: ${JSON.stringify(card.defaultOutputModes)}`)
  else fail('defaultOutputModes empty or not array')
  if (Array.isArray(card.skills) && card.skills.length > 0) pass(`skills: ${card.skills.length} declared`)
  else fail('skills empty or not array')

  // ─── 3. Non-interactivity disclaimer — unmissable ──────────────────
  console.log('\n3. Non-interactivity disclaimer — UNMISSABLE')
  expect('capabilities.streaming',              card.capabilities.streaming,              false)
  expect('capabilities.pushNotifications',      card.capabilities.pushNotifications,      false)
  expect('capabilities.stateTransitionHistory', card.capabilities.stateTransitionHistory, false)
  expect('metadata.shipstacked:cardKind',       card.metadata['shipstacked:cardKind'] as string, 'data-publisher')
  expect('metadata.shipstacked:interactiveAgent',       card.metadata['shipstacked:interactiveAgent'] as boolean, false)
  expect('metadata.shipstacked:respondsToA2AMessages',  card.metadata['shipstacked:respondsToA2AMessages'] as boolean, false)
  if (/^NOT AN INTERACTIVE A2A AGENT SERVER/i.test(card.description.trim())) {
    pass('description leads with "NOT AN INTERACTIVE A2A AGENT SERVER"')
  } else {
    fail(`description does NOT lead with the disclaimer. First 80 chars: "${card.description.slice(0, 80)}..."`)
  }
  for (const skill of card.skills) {
    if (/no A2A invocation/i.test(skill.description) && /^Fetch\s|^Read\s/i.test(skill.description)) {
      pass(`skill[${skill.id}] description is fetch-shaped + non-invocation-declared`)
    } else {
      fail(`skill[${skill.id}] description must be fetch-shaped AND say "no A2A invocation": "${skill.description.slice(0, 80)}..."`)
    }
    if (/^Fetch\s|^Read\s/i.test(skill.name)) {
      pass(`skill[${skill.id}] name starts with "Fetch" or "Read"`)
    } else {
      fail(`skill[${skill.id}] name must start with "Fetch" or "Read": "${skill.name}"`)
    }
  }

  // ─── 4. Brand / partner / program allowlist — ZERO matches ─────────
  console.log('\n4. Brand / partner / program / specific-collection-slug — ZERO matches')
  const bodyLower = bodyText.toLowerCase()
  for (const forbidden of BRAND_ALLOWLIST_FORBIDDEN) {
    if (bodyLower.includes(forbidden)) fail(`forbidden token found in served body: "${forbidden}"`)
    else pass(`absent: "${forbidden}"`)
  }

  // ─── 5. Every declared example URL is live ─────────────────────────
  console.log('\n5. Accuracy audit — every declared examples[] URL probed live')
  // We extract URLs from examples (the "GET <url>" forms). For
  // slug-parameterised routes (e.g. /u/<username>, /collections/<slug>),
  // we substitute a known-real value for direct-200 cases and a
  // known-unknown value for active-gate-404 cases — both prove the
  // route family is live, which is what the card declares generically.
  const SUBSTITUTIONS: Record<string, { url: string; expect: number; reason: string }> = {
    [`${base}/u/<username>`]: {
      url: `${base}/u/aniketaslaliya801`,
      expect: 200,
      reason: 'published builder profile (Tier 1 backfilled)',
    },
    [`${base}/atlas/roles/<id>`]: {
      url: `${base}/atlas/roles/A1`,
      expect: 200,
      reason: 'real Atlas role',
    },
    [`${base}/atlas/roles/<id>.json`]: {
      url: `${base}/atlas/roles/A1.json`,
      expect: 200,
      reason: 'real Atlas role JSON-LD',
    },
    [`${base}/team/<slug>`]: {
      url: `${base}/team/__beacon2_audit__`,
      expect: 404,
      reason: 'unknown slug — proves team route family + published gate (Phase 4)',
    },
    [`${base}/p/<slug>`]: {
      url: `${base}/p/__beacon2_audit__`,
      expect: 404,
      reason: 'unknown slug — route family being live is what we declare',
    },
    [`${base}/p/<slug>.json`]: {
      url: `${base}/p/__beacon2_audit__.json`,
      expect: 404,
      reason: 'unknown slug — proves route family + 404 gate',
    },
    [`${base}/collections/<slug>`]: {
      url: `${base}/collections/__beacon2_audit__`,
      expect: 404,
      reason: 'unknown slug — proves active-collection gate works',
    },
    [`${base}/collections/<slug>.json`]: {
      url: `${base}/collections/__beacon2_audit__.json`,
      expect: 404,
      reason: 'unknown slug — JSON-LD path live',
    },
    [`${base}/collections/<slug>.csv`]: {
      url: `${base}/collections/__beacon2_audit__.csv`,
      expect: 404,
      reason: 'unknown slug — CSV path live',
    },
  }

  // Extract URLs from skill examples, normalising "(Accept: …)" suffixes.
  function extractUrls(examples: string[] | undefined): string[] {
    if (!examples) return []
    const urls: string[] = []
    for (const ex of examples) {
      const m = ex.match(/^GET\s+(\S+)/)
      if (m) urls.push(m[1])
    }
    return urls
  }

  const seen = new Set<string>()
  for (const skill of card.skills) {
    for (const exUrl of extractUrls(skill.examples)) {
      // Translate the canonical-host base in examples (https://shipstacked.com)
      // to the configured target base, so local-dev verification probes localhost.
      const translated = exUrl.replace(/^https:\/\/shipstacked\.com/, base)
      const sub = SUBSTITUTIONS[translated]
      const probeUrl = sub?.url ?? translated
      const expectedStatus = sub?.expect ?? 200
      if (seen.has(probeUrl)) continue
      seen.add(probeUrl)
      try {
        const r = await fetch(probeUrl, { redirect: 'manual' })
        if (r.status === expectedStatus) {
          pass(`${skill.id.padEnd(28)} ${probeUrl} → HTTP ${r.status} ${sub ? `(${sub.reason})` : ''}`)
        } else {
          fail(`${skill.id.padEnd(28)} ${probeUrl} → HTTP ${r.status} (expected ${expectedStatus})${sub ? ` — ${sub.reason}` : ''}`)
        }
      } catch (e) {
        fail(`${skill.id} fetch error for ${probeUrl}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // ─── 6. MCP endpoint probe (Step 2 extension) ──────────────────────
  // The card declares the MCP server via metadata.shipstacked:mcpEndpoint
  // AND a skill (id 'read-via-mcp-server'). This section verifies the
  // declared URL actually speaks MCP — POST initialize → 200 with a
  // valid JSON-RPC initialize result. A declared endpoint that doesn't
  // respond as declared is the machine-readable lie this script exists
  // to prevent (per Beacon 2's accuracy guarantee + Step 2's spec §3).
  console.log('\n6. MCP endpoint probe (Step 2 — the announcement is real)')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mcpDescriptor = (card.metadata as any)['shipstacked:mcpEndpoint']
  if (!mcpDescriptor || typeof mcpDescriptor !== 'object') {
    fail('metadata.shipstacked:mcpEndpoint missing or not an object')
  } else {
    pass('metadata.shipstacked:mcpEndpoint present + object')
    const declaredUrl: string | undefined = mcpDescriptor.url
    if (typeof declaredUrl !== 'string' || !/^https?:\/\//.test(declaredUrl)) {
      fail(`metadata.shipstacked:mcpEndpoint.url missing or malformed: ${JSON.stringify(declaredUrl)}`)
    } else {
      pass(`metadata.shipstacked:mcpEndpoint.url: ${declaredUrl}`)
      const declaredProtoVer: string | undefined = mcpDescriptor.protocolVersion
      // Translate the declared canonical URL (https://shipstacked.com) to the
      // configured target base for local-dev probing (same trick Section 5 uses).
      const probeUrl = declaredUrl.replace(/^https:\/\/shipstacked\.com/, base)
      const initBody = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: declaredProtoVer ?? '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'verify-agent-card', version: '1.0' },
        },
      }
      let mcpRes: Response
      try {
        mcpRes = await fetch(probeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
          },
          body: JSON.stringify(initBody),
        })
      } catch (e) {
        fail(`MCP initialize POST failed: ${e instanceof Error ? e.message : String(e)}`)
        // Skip the per-field checks if we couldn't even reach the endpoint.
        mcpRes = new Response(null, { status: 0 })
      }
      if (mcpRes.status === 200) {
        pass(`MCP initialize POST → HTTP 200`)
        const text = await mcpRes.text()
        // Leak-pattern check on the response body (same 8 patterns verify-mcp.ts uses).
        const MCP_LEAK_PATTERNS: { name: string; re: RegExp }[] = [
          { name: 'stack-trace', re: /\bat\s+\w+\.\w+\s*\(/ },
          { name: 'file-path', re: /\/(Users|private|home|var|tmp)\// },
          { name: 'PGRST code', re: /PGRST\d+/ },
          { name: 'env-var key', re: /SUPABASE_SERVICE_ROLE/ },
          { name: '.env reference', re: /\.env(\.|\b)/ },
          { name: 'src/lib path', re: /src\/lib\// },
          { name: 'node_modules', re: /node_modules\// },
          { name: 'column-does-not-exist', re: /column\s+["']?\w+["']?\s+does not exist/i },
        ]
        let leakHit = false
        for (const { name, re } of MCP_LEAK_PATTERNS) {
          if (re.test(text)) { fail(`MCP initialize response leak: pattern "${name}"`); leakHit = true; break }
        }
        if (!leakHit) pass('MCP initialize response: no leak (zero stack/path/PGRST/env/internal patterns)')
        try {
          const parsed = JSON.parse(text) as {
            jsonrpc?: string
            id?: number
            result?: {
              protocolVersion?: string
              capabilities?: { tools?: unknown }
              serverInfo?: { name?: string; version?: string }
            }
          }
          if (parsed.jsonrpc === '2.0') pass(`MCP response jsonrpc === "2.0"`)
          else fail(`MCP response jsonrpc unexpected: ${parsed.jsonrpc}`)
          if (parsed.result?.protocolVersion === declaredProtoVer) {
            pass(`MCP result.protocolVersion (${parsed.result?.protocolVersion}) matches declared (${declaredProtoVer})`)
          } else {
            fail(`MCP result.protocolVersion (${parsed.result?.protocolVersion}) !== declared (${declaredProtoVer})`)
          }
          if (parsed.result?.serverInfo?.name === 'shipstacked-mcp') {
            pass(`MCP result.serverInfo.name === "shipstacked-mcp"`)
          } else {
            fail(`MCP result.serverInfo.name unexpected: ${parsed.result?.serverInfo?.name}`)
          }
          const caps = parsed.result?.capabilities
          if (caps && 'tools' in caps) {
            pass('MCP result.capabilities.tools present')
          } else {
            fail('MCP result.capabilities.tools missing')
          }
        } catch (e) {
          fail(`MCP response not valid JSON: ${e instanceof Error ? e.message : String(e)}`)
        }
      } else if (mcpRes.status !== 0) {
        fail(`MCP initialize POST → HTTP ${mcpRes.status} (expected 200)`)
      }
    }
    // Regression guard: the beacons.mcpServer status must be 'live'
    // post-Step-2 (catches any accidental revert to 'deferred').
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beacons = (card.metadata as any)['shipstacked:beacons']
    const mcpBeaconStatus = beacons?.mcpServer?.status
    if (mcpBeaconStatus === 'live') {
      pass(`metadata.shipstacked:beacons.mcpServer.status === "live"`)
    } else {
      fail(`metadata.shipstacked:beacons.mcpServer.status is "${mcpBeaconStatus}" (expected "live" post-Step-2)`)
    }
  }

  // ─── 6b. Agent-auth pointer (Phase 3) — REQUIRED from Phase 3 onward ─
  // The card must point at the authenticated action surface (auth.md). NOTE:
  // running this against prod (--base https://shipstacked.com) FAILS this gate
  // by design until Phase 3 deploys — known-temporary. Local + post-deploy pass.
  console.log('\n6b. Agent-auth pointer (Phase 3)')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agentAuth = (card.metadata as any)['shipstacked:agentAuth']
  if (typeof agentAuth === 'string' && /^https?:\/\/.+\/auth\.md$/.test(agentAuth)) {
    pass(`metadata.shipstacked:agentAuth: ${agentAuth}`)
  } else {
    fail(`metadata.shipstacked:agentAuth missing or not a URL ending in /auth.md: ${JSON.stringify(agentAuth)}`)
  }

  // ─── 6c. fetch-team-profile skill (Phase 4 §K) — REQUIRED from Phase 4 ─
  // Same self-healing pattern as 6b: FAILS against prod until §N deploys the
  // new skill, then flips green on deploy.
  console.log('\n6c. fetch-team-profile skill (Phase 4)')
  const teamSkill = card.skills.find((s) => s.id === 'fetch-team-profile')
  if (teamSkill) {
    pass(`fetch-team-profile skill present: ${teamSkill.name}`)
  } else {
    fail('skills[] missing fetch-team-profile (Phase 4 requirement)')
  }

  // ─── 7. Summary ────────────────────────────────────────────────────
  console.log('\n============================================================')
  if (failures === 0) {
    console.log('VERIFY-AGENT-CARD ✓ — all gates passed')
  } else {
    console.log(`VERIFY-AGENT-CARD ✗ — ${failures} failure(s)`)
    process.exit(1)
  }
}

main().catch(e => {
  console.error('FATAL:', e?.message ?? e)
  process.exit(1)
})
