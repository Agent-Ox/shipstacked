/**
 * GET /llms.txt — dynamic LLM-discovery surface for ShipStacked.
 *
 * Replaces the static public/llms.txt with a route that enumerates Atlas
 * role URLs + recent public receipts (the V2 surfaces). LLM crawlers and
 * agent-training pipelines read this to discover what's here.
 *
 * Cached for 5 minutes at the edge.
 *
 * Spec: docs/v2/STEP_7_PUBLIC_PAGES_SPEC.md §7.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ATLAS_VERSION_DEFAULT } from '@/lib/atlas/roles'
import { getRecentPublicReceipts } from '@/lib/receipts/render'
import { loadVocab, getVocabByLayer, type CapabilityLayer } from '@/lib/capability/vocab'

export const revalidate = 300

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const HEADER = `# ShipStacked
> The proof-of-work hiring marketplace for AI builders, teams, and agents.

ShipStacked is where AI-native builders publish proof receipts — atomic, dereferenceable records of work shipped — and how companies find practitioners by their actual output rather than CV claims.

## Primary documents

- [The Atlas — AI implementation roles, mapped](https://shipstacked.com/atlas): A practitioner's map of the roles, operators, and teams doing real AI implementation work. By Thomas Oxlee.

## Callable interface — MCP server

- [/api/mcp](https://shipstacked.com/api/mcp): Streamable HTTP MCP endpoint (protocol 2025-06-18). POST JSON-RPC; read-only tools over the same public data the rest of this site exposes. The AgentCard at /.well-known/agent-card.json declares this endpoint in \`metadata.shipstacked:mcpEndpoint\`.

## Atlas roles (v0.4)

Every role dereferences to JSON-LD (DefinedTerm + shipstacked:AtlasRole) via Accept: application/ld+json or the .json convenience suffix.
`

const FOOTER = `
## Get involved

- [Paste what you built](https://shipstacked.com/paste): For builders. URL in, proof receipt out.
- [Hiring teams: find AI talent and teams](https://shipstacked.com/join): For companies hiring AI builders, teams, and agents.

## About

- Founder: Thomas Oxlee, embedded as an AI implementation lead at a regulated EU business.
- Contact: hello@shipstacked.com
- Standards play: every proof receipt resolves to schema.org JSON-LD. Every Atlas role dereferences as DefinedTerm.
`

export async function GET() {
  const admin = adminClient()

  const { data: roles } = await admin
    .from('atlas_roles')
    .select('role_id, name, cluster')
    .eq('atlas_version', ATLAS_VERSION_DEFAULT)
    .order('cluster')
    .order('role_id')

  const rolesByCluster = new Map<string, Array<{ role_id: string; name: string }>>()
  for (const r of (roles ?? []) as Array<{ role_id: string; name: string; cluster: string }>) {
    if (!rolesByCluster.has(r.cluster)) rolesByCluster.set(r.cluster, [])
    rolesByCluster.get(r.cluster)!.push({ role_id: r.role_id, name: r.name })
  }

  const rolesText: string[] = []
  for (const [cluster, list] of Array.from(rolesByCluster.entries()).sort()) {
    rolesText.push(`\n### Cluster ${cluster}\n`)
    for (const r of list) {
      rolesText.push(`- [${r.role_id} — ${r.name}](https://shipstacked.com/atlas/roles/${r.role_id})`)
    }
  }

  // Capabilities — the per-capability answer-page surface (Stage C/F). Every
  // canonical vocab slug resolves to a ranked, proof-backed /talent/<slug>
  // page; grouped by layer so LLM crawlers can walk Tools / Capabilities /
  // Domains and discover all of them.
  const vocab = await loadVocab(admin)
  const LAYER_HEADINGS: Array<{ layer: CapabilityLayer; heading: string }> = [
    { layer: 'tool', heading: 'Tools' },
    { layer: 'capability', heading: 'Capabilities' },
    { layer: 'domain', heading: 'Domains' },
  ]
  const capText: string[] = []
  for (const { layer, heading } of LAYER_HEADINGS) {
    const entries = getVocabByLayer(vocab, layer).sort((a, b) => a.label.localeCompare(b.label))
    if (entries.length === 0) continue
    capText.push(`\n### ${heading}\n`)
    for (const e of entries) {
      capText.push(`- [${e.label} builders](https://shipstacked.com/talent/${e.slug}): Ranked, proof-verified ${e.label} builders, teams, and agents.`)
    }
  }

  const recent = await getRecentPublicReceipts(admin, 20)
  const receiptsText: string[] = []
  if (recent.length === 0) {
    receiptsText.push('\nNo public receipts yet. Be among the first.')
  } else {
    receiptsText.push('\nMost recent — every receipt dereferences to JSON-LD (CreativeWork + shipstacked:ProofReceipt).\n')
    for (const r of recent) {
      const date = new Date(r.issued_at).toISOString().slice(0, 10)
      receiptsText.push(`- [${r.title}](https://shipstacked.com/p/${r.slug}) — ${date}`)
    }
  }

  const body = [
    HEADER,
    rolesText.join('\n'),
    '\n## Capabilities — per-capability answer pages',
    '\nEvery capability, tool, and domain in the vocabulary resolves to a ranked, proof-backed /talent/<slug> page (schema.org ItemList JSON-LD) listing the builders, teams, and agents with verified work in that area.',
    capText.join('\n'),
    '\n## Build feed',
    '\n- [/feed](https://shipstacked.com/feed): recent public proofs',
    '\n## Recent proof receipts',
    receiptsText.join('\n'),
    FOOTER,
  ].join('\n')

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
    },
  })
}
