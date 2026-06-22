/**
 * Hirer Organization markup for /company/[slug].
 *
 * Reconciles the inline Organization at src/app/company/[slug]/page.tsx.
 * The page itself already filters public=true (so unpublished hirer
 * profiles 404 and this builder is never invoked for them — Tier 0
 * unpublished /company/shipstacked is currently the only hirer
 * profile that was public, so today this builder runs for 0 hirers).
 *
 * Spec: BEACON_1_DISCOVERY.md §H7
 */

import { CANONICAL_HOST, SCHEMA_CONTEXT, hirerOrgId } from './context.ts'
import { informative } from '../badge.ts'

export interface HirerOrgInput {
  slug: string
  company_name: string
  about: string | null
  website_url: string | null
  logo_url: string | null
  location: string | null
  linkedin_url: string | null
  x_url: string | null
  industry: string | null
}

export interface HirerOrgJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': ['Organization', 'shipstacked:Employer']
  '@id': string
  name: string
  url: string
  description?: string
  logo?: string
  sameAs?: string[]
  address?: { '@type': 'PostalAddress'; addressLocality: string }
  'shipstacked:industry'?: string
  'shipstacked:listedOn': string
}

function trim(s: string | null | undefined): string | undefined {
  if (!s) return undefined
  const t = s.trim()
  return t.length > 0 ? t : undefined
}

export function buildHirerOrgJsonLd(company: HirerOrgInput): HirerOrgJsonLd {
  const canonical = hirerOrgId(company.slug)
  const sameAs = [trim(company.website_url), trim(company.linkedin_url), trim(company.x_url)].filter(
    (u): u is string => !!u,
  )

  const out: HirerOrgJsonLd = {
    '@context': SCHEMA_CONTEXT,
    // Kept as 'shipstacked:Employer' for backwards compatibility with any
    // external JSON-LD consumers that may key off this @type literal. The
    // canonical spec name is Hirer; revisit when external adoption is
    // verifiably non-zero or when migrating the shipstacked: namespace.
    '@type': ['Organization', 'shipstacked:Employer'],
    '@id': canonical,
    name: company.company_name,
    url: canonical,
    'shipstacked:listedOn': CANONICAL_HOST,
  }

  const description = trim(company.about)
  if (description) out.description = description
  const logo = trim(company.logo_url)
  if (logo) out.logo = logo
  if (sameAs.length > 0) out.sameAs = sameAs

  const locality = trim(company.location)
  if (locality) out.address = { '@type': 'PostalAddress', addressLocality: locality }

  const industry = informative(trim(company.industry))
  if (industry) out['shipstacked:industry'] = industry

  return out
}
