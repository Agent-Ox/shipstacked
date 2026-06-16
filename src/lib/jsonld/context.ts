/**
 * Shared JSON-LD @context and namespace constants for Beacon 1.
 *
 * Matches the V2 dual-context pattern established by:
 *   - src/lib/receipts/jsonld.ts (proof receipts)
 *   - src/lib/atlas/jsonld.ts (atlas roles)
 *
 * Every Beacon 1 builder emits the same dual-context array so all of
 * ShipStacked's structured data lives in one graph keyed by URL @id.
 *
 * Spec: docs/v2/TIER_3_BEACON_1_SCHEMA_ORG_SPEC.md
 * Discovery: docs/audit/BEACON_1_DISCOVERY.md §B (namespace pattern)
 */

export const CANONICAL_HOST = 'https://shipstacked.com'
export const SHIPSTACKED_NS = 'https://shipstacked.com/schema/v0.1#'

/**
 * The dual-context every Beacon 1 + V2 builder uses. Spread into the
 * top of each emitted JSON-LD object as `'@context'`.
 */
export const SCHEMA_CONTEXT = [
  'https://schema.org',
  { shipstacked: SHIPSTACKED_NS },
] as const

export type SchemaContext = typeof SCHEMA_CONTEXT

/** Canonical @id helpers — shared so cross-references stay byte-identical. */
export const orgId = (): string => `${CANONICAL_HOST}/#org`
export const websiteId = (): string => `${CANONICAL_HOST}/#website`
export const personId = (username: string): string => `${CANONICAL_HOST}/u/${username}`
export const hirerOrgId = (slug: string): string => `${CANONICAL_HOST}/company/${slug}`
export const teamOrgId = (slug: string): string => `${CANONICAL_HOST}/team/${slug}`
export const agentOrgId = (slug: string): string => `${CANONICAL_HOST}/agent/${slug}`
export const jobPostingId = (id: string): string => `${CANONICAL_HOST}/jobs/${id}`
export const articleId = (postId: string): string => `${CANONICAL_HOST}/feed/${postId}`
