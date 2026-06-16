/**
 * Autonomous Agent markup for /agent/[slug] (Phase 5 §F.2).
 *
 * Locked decision Q1 — JUSTIFIED NOVELTY: agents emit a custom
 * `shipstacked:Agent` type with NO schema.org parent. An autonomous agent is a
 * fourth pillar alongside Person (/u), Organization+shipstacked:Team (/team),
 * and Organization+shipstacked:Employer (/company) — it is none of Person,
 * SoftwareApplication, or Organization. Search engines treat the unknown type
 * as an opaque block (no Knowledge-Graph enrichment, no SEO penalty), which is
 * the correct posture: agents aren't a Google-recognized entity type yet.
 *
 * The @context still carries the dual SCHEMA_CONTEXT array (schema.org + the
 * shipstacked: namespace) so this node lives in the same graph as every other
 * ShipStacked builder, keyed by URL @id. Mirrors team-org.ts's structure and
 * reuses every shared primitive (SCHEMA_CONTEXT, CANONICAL_HOST, agentOrgId,
 * personId, teamOrgId, trim() hygiene), so "one writer per shape" (Invariant
 * #5) holds: this owns the agent shape.
 *
 * Spec: docs/audit/PHASE5_AGENT_FLOW.md §F.2 / §B.3.
 */

import { CANONICAL_HOST, SCHEMA_CONTEXT, agentOrgId, personId, teamOrgId } from './context.ts'

/** Resolved principal the agent acts on behalf of (from resolveAgentPrincipal). */
export interface AgentPrincipal {
  kind: 'human' | 'team'
  slug: string
}

export interface AgentOrgInput {
  slug: string
  agent_name: string
  description: string | null
  provider: string
  model: string | null
  capabilities: string[]
  focus: string | null
  logo_url: string | null
  /** Resolved principal, or null (no explicit principal + owner has no human entity). */
  principal: AgentPrincipal | null
  verified: boolean
  l1_receipt_count: number
}

export interface AgentOrgJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': 'shipstacked:Agent'
  '@id': string
  name: string
  url: string
  description?: string
  image?: string
  'shipstacked:provider': string
  'shipstacked:model'?: string
  'shipstacked:capabilities'?: string[]
  'shipstacked:focus'?: string
  'shipstacked:principalOf'?: { '@id': string }
  'shipstacked:verified': boolean
  'shipstacked:l1ReceiptCount': number
  'shipstacked:listedOn': string
}

function trim(s: string | null | undefined): string | undefined {
  if (!s) return undefined
  const t = s.trim()
  return t.length > 0 ? t : undefined
}

export function buildAgentOrgJsonLd(agent: AgentOrgInput): AgentOrgJsonLd {
  const canonical = agentOrgId(agent.slug)

  const out: AgentOrgJsonLd = {
    '@context': SCHEMA_CONTEXT,
    '@type': 'shipstacked:Agent',
    '@id': canonical,
    name: agent.agent_name,
    url: canonical,
    'shipstacked:provider': agent.provider,
    'shipstacked:verified': agent.verified,
    'shipstacked:l1ReceiptCount': agent.l1_receipt_count,
    'shipstacked:listedOn': CANONICAL_HOST,
  }

  const description = trim(agent.description)
  if (description) out.description = description
  const logo = trim(agent.logo_url)
  if (logo) out.image = logo
  const model = trim(agent.model)
  if (model) out['shipstacked:model'] = model
  const focus = trim(agent.focus)
  if (focus) out['shipstacked:focus'] = focus
  if (agent.capabilities.length > 0) out['shipstacked:capabilities'] = agent.capabilities

  // principalOf reference (@id only) — the full node lives at the principal's
  // own URL (Invariant #5). Omitted entirely when there is no principal.
  if (agent.principal) {
    const principalUrl =
      agent.principal.kind === 'team' ? teamOrgId(agent.principal.slug) : personId(agent.principal.slug)
    out['shipstacked:principalOf'] = { '@id': principalUrl }
  }

  return out
}
