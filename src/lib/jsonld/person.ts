/**
 * Builder Person markup for /u/[username].
 *
 * The Noah-gateway-critical emitter. The Person @id equals the canonical
 * profile URL — which is identical to the @id the V2 receipt's author
 * field already uses (src/lib/receipts/jsonld.ts:111-112). One URL keys
 * both the Person markup AND the V2 entity graph → one graph, two
 * surfaces, identical identifiers.
 *
 * For the 17 Tier-1-backfilled builders (profile.entity_id is set),
 * `identifier` carries the V2 entity external_id so consumers can
 * traverse to the entity's V2 records (receipts, attestations, etc.).
 *
 * The 3 fakes (jennypeterson224, johnchambers73, oxleethomasagentox598)
 * have published=false post-Tier-1; their /u/<username> URLs 404 — this
 * builder is never invoked for them.
 *
 * Honest-field hygiene: every shipstacked: extension and every optional
 * field is emitted ONLY when the underlying value is present + non-empty.
 * No false-suppressed boolean assertions (verified emitted only when true).
 *
 * Spec: BEACON_1_DISCOVERY.md §H4, §C
 */

import { CANONICAL_HOST, SCHEMA_CONTEXT, personId, teamOrgId } from './context.ts'

export interface PersonProfileInput {
  username: string
  full_name: string | null
  role: string | null
  bio: string | null
  about: string | null
  location: string | null
  github_url: string | null
  x_url: string | null
  linkedin_url: string | null
  website_url: string | null
  verified: boolean
  primary_profession: string | null
  seniority: string | null
  work_type: string | null
  day_rate: string | null
  timezone: string | null
  languages: string[] | null
  entity_id: number | null
}

export interface PersonEntityInput {
  external_id: string
}

export interface PersonSkillInput {
  name: string
}

export interface PersonProjectInput {
  title: string | null
  description: string | null
  outcome: string | null
  project_url: string | null
}

export interface PersonGithubInput {
  github_username: string | null
  repos_count: number | null
  commits_90d: number | null
  top_languages: string[] | null
}

export interface PersonJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': ['Person', 'shipstacked:Builder']
  '@id': string
  identifier?: string
  name: string
  jobTitle?: string
  description?: string
  url: string
  sameAs?: string[]
  knowsAbout?: string[]
  worksFor?: {
    '@type': 'Organization'
    '@id': string
  }
  address?: {
    '@type': 'PostalAddress'
    addressLocality: string
  }
  subjectOf?: Array<{
    '@type': 'CreativeWork'
    name: string
    url: string
    description?: string
  }>
  'shipstacked:verified'?: true
  'shipstacked:primaryProfession'?: string
  'shipstacked:seniority'?: string
  'shipstacked:workType'?: string
  'shipstacked:dayRate'?: string
  'shipstacked:timezone'?: string
  'shipstacked:languages'?: string[]
  'shipstacked:github'?: {
    '@type': 'shipstacked:GithubProfile'
    username: string
    url: string
    'shipstacked:repoCount'?: number
    'shipstacked:commits90d'?: number
    'shipstacked:topLanguages'?: string[]
  }
}

function nonEmpty(s: string | null | undefined): string | undefined {
  if (s === null || s === undefined) return undefined
  const trimmed = s.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function buildPersonJsonLd(opts: {
  profile: PersonProfileInput
  entity: PersonEntityInput | null
  skills: PersonSkillInput[]
  projects: PersonProjectInput[]
  github: PersonGithubInput | null
  worksForTeamSlug?: string | null
  /** Phase 6 §I — Atlas role IDs (e.g. ['A4','B3']) merged into knowsAbout as
   *  machine-resolvable URLs. Caller passes a deduped, sorted array. */
  atlasRoles?: string[]
}): PersonJsonLd {
  const { profile, entity, skills, projects, github, worksForTeamSlug, atlasRoles } = opts
  const url = personId(profile.username)

  const sameAs = [
    profile.github_url,
    profile.x_url,
    profile.linkedin_url,
    profile.website_url,
  ].map(nonEmpty).filter((u): u is string => !!u)

  // Skills (deduped names) + Atlas role URLs (Phase 6 §I). No cross-overlap
  // (names vs URLs), so a plain concat preserves both.
  const knowsAbout = [
    ...Array.from(new Set(skills.map(s => nonEmpty(s.name)).filter((n): n is string => !!n))),
    ...(atlasRoles ?? []).map(role => `${CANONICAL_HOST}/atlas/roles/${role}`),
  ]

  const subjectOf = projects
    .filter(p => nonEmpty(p.title) && nonEmpty(p.project_url) && nonEmpty(p.outcome))
    .map(p => {
      const title = nonEmpty(p.title)!
      const projectUrl = nonEmpty(p.project_url)!
      const outcomeText = nonEmpty(p.outcome)
      const work: PersonJsonLd['subjectOf'] extends Array<infer T> | undefined ? T : never = {
        '@type': 'CreativeWork',
        name: title,
        url: projectUrl,
      }
      if (outcomeText) work.description = outcomeText
      return work
    })

  const locality = nonEmpty(profile.location)

  const out: PersonJsonLd = {
    '@context': SCHEMA_CONTEXT,
    '@type': ['Person', 'shipstacked:Builder'],
    '@id': url,
    name: profile.full_name?.trim() || profile.username,
    url,
  }

  // Step 3 B-1: identifier is always present. Entity-linked builders (Tier 1
  // backfilled) keep the entity external_id (already prefixed shipstacked:entity:…
  // in the DB column value); builders without an entity_id get a stable fallback
  // shipstacked:profile:<username> so downstream consumers always have a
  // canonical machine-identifier. No fabrication — username is genuine data.
  out.identifier = entity?.external_id ?? `shipstacked:profile:${profile.username}`

  const jobTitle = nonEmpty(profile.role)
  if (jobTitle) out.jobTitle = jobTitle

  const description = nonEmpty(profile.bio) || nonEmpty(profile.about)
  if (description) out.description = description

  if (sameAs.length > 0) out.sameAs = sameAs
  if (knowsAbout.length > 0) out.knowsAbout = knowsAbout
  if (subjectOf.length > 0) out.subjectOf = subjectOf

  // worksFor — Person → Organization reference (Phase 4 §H.5). Emitted only
  // when the caller resolved a PUBLISHED linked team. The Organization node
  // itself lives at /team/<slug> (team-org.ts owns it); here we emit only the
  // @id reference (one-graph-per-URL, Invariant #5).
  if (worksForTeamSlug) {
    out.worksFor = { '@type': 'Organization', '@id': teamOrgId(worksForTeamSlug) }
  }

  if (locality) {
    out.address = { '@type': 'PostalAddress', addressLocality: locality }
  }

  if (profile.verified) out['shipstacked:verified'] = true

  const primaryProf = nonEmpty(profile.primary_profession)
  if (primaryProf) out['shipstacked:primaryProfession'] = primaryProf
  const seniority = nonEmpty(profile.seniority)
  if (seniority) out['shipstacked:seniority'] = seniority
  const workType = nonEmpty(profile.work_type)
  if (workType) out['shipstacked:workType'] = workType
  const dayRate = nonEmpty(profile.day_rate)
  if (dayRate) out['shipstacked:dayRate'] = dayRate
  const timezone = nonEmpty(profile.timezone)
  if (timezone) out['shipstacked:timezone'] = timezone
  if (Array.isArray(profile.languages) && profile.languages.length > 0) {
    out['shipstacked:languages'] = profile.languages.filter(l => nonEmpty(l)) as string[]
  }

  if (github && nonEmpty(github.github_username)) {
    const ghUsername = github.github_username!.trim()
    const ghBlock: NonNullable<PersonJsonLd['shipstacked:github']> = {
      '@type': 'shipstacked:GithubProfile',
      username: ghUsername,
      url: `https://github.com/${ghUsername}`,
    }
    if (typeof github.repos_count === 'number') ghBlock['shipstacked:repoCount'] = github.repos_count
    if (typeof github.commits_90d === 'number') ghBlock['shipstacked:commits90d'] = github.commits_90d
    if (Array.isArray(github.top_languages) && github.top_languages.length > 0) {
      ghBlock['shipstacked:topLanguages'] = github.top_languages
    }
    out['shipstacked:github'] = ghBlock
  }

  return out
}

// Re-export for verification/test scripts.
export { CANONICAL_HOST }
