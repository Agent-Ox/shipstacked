/**
 * Team / Agency / Studio Organization markup for /team/[slug] (Phase 4 §F).
 *
 * Adjustment 4 asked us to reuse buildHirerOrgJsonLd (src/lib/jsonld/hirer-org.ts).
 * On inspection that builder is genuinely insufficient for a team profile, on
 * three counts — so per the §F.1 directive ("document the gap in a comment
 * before adding") this is a sibling writer, NOT a fork:
 *
 *   1. @id namespace — hirerOrgId() bakes in `/company/<slug>`. A team's
 *      canonical URL is `/team/<slug>` (teamOrgId), so the @id must differ.
 *   2. @type semantics — hirer-org emits ['Organization','shipstacked:Employer'].
 *      A team/agency is a service provider, not (necessarily) an employer;
 *      it emits ['Organization','shipstacked:Team'].
 *   3. member[] — a team profile lists linked people (LinkedIn-style). The
 *      hirer-org shape has no member concept.
 *
 * It reuses every shared primitive (SCHEMA_CONTEXT, CANONICAL_HOST, teamOrgId,
 * personId, the trim() hygiene) and mirrors buildHirerOrgJsonLd's structure, so
 * "one writer per shape" (Invariant #5) holds: hirer-org owns the employer
 * shape, this owns the team shape.
 *
 * Spec: docs/audit/PHASE4_TEAM_FLOW.md §F.1.
 */

import { CANONICAL_HOST, SCHEMA_CONTEXT, teamOrgId, personId } from './context.ts'

export interface TeamOrgInput {
  slug: string
  team_name: string
  tagline: string | null
  description: string | null
  website_url: string | null
  logo_url: string | null
  location: string | null
  services: string[]
  team_size_range: string | null
  verified: boolean
  l1_receipt_count: number
  /** Published linked members, by username (→ Person @id references). */
  members: Array<{ username: string }>
  /** Phase 6 §I — Atlas role IDs → knowsAbout URLs. Caller passes deduped+sorted. */
  atlasRoles?: string[]
}

export interface TeamOrgJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': ['Organization', 'shipstacked:Team']
  '@id': string
  name: string
  url: string
  description?: string
  slogan?: string
  logo?: string
  sameAs?: string[]
  address?: { '@type': 'PostalAddress'; addressLocality: string }
  member?: Array<{ '@type': 'Person'; '@id': string }>
  knowsAbout?: string[]
  'shipstacked:services'?: string[]
  'shipstacked:teamSize'?: string
  'shipstacked:verified': boolean
  'shipstacked:l1ReceiptCount': number
  'shipstacked:listedOn': string
}

function trim(s: string | null | undefined): string | undefined {
  if (!s) return undefined
  const t = s.trim()
  return t.length > 0 ? t : undefined
}

export function buildTeamOrgJsonLd(team: TeamOrgInput): TeamOrgJsonLd {
  const canonical = teamOrgId(team.slug)

  const out: TeamOrgJsonLd = {
    '@context': SCHEMA_CONTEXT,
    '@type': ['Organization', 'shipstacked:Team'],
    '@id': canonical,
    name: team.team_name,
    url: canonical,
    'shipstacked:verified': team.verified,
    'shipstacked:l1ReceiptCount': team.l1_receipt_count,
    'shipstacked:listedOn': CANONICAL_HOST,
  }

  const description = trim(team.description)
  if (description) out.description = description
  const slogan = trim(team.tagline)
  if (slogan) out.slogan = slogan
  const logo = trim(team.logo_url)
  if (logo) out.logo = logo

  const website = trim(team.website_url)
  if (website) out.sameAs = [website]

  const locality = trim(team.location)
  if (locality) out.address = { '@type': 'PostalAddress', addressLocality: locality }

  if (team.services.length > 0) out['shipstacked:services'] = team.services
  const size = trim(team.team_size_range)
  if (size) out['shipstacked:teamSize'] = size

  // Person references only (@id + @type) — the full Person node is owned by
  // src/lib/jsonld/person.ts at /u/<username> (Invariant #5).
  if (team.members.length > 0) {
    out.member = team.members.map((m) => ({ '@type': 'Person' as const, '@id': personId(m.username) }))
  }

  // Atlas roles → knowsAbout URLs (Phase 6 §I). Emitted only when non-empty.
  if (team.atlasRoles && team.atlasRoles.length > 0) {
    out.knowsAbout = team.atlasRoles.map((role) => `${CANONICAL_HOST}/atlas/roles/${role}`)
  }

  return out
}
