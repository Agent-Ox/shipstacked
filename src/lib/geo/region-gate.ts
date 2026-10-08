/**
 * Region gate for the Claude-backed paste-and-classify feature.
 *
 * Reads Vercel's IP geolocation headers. Only the Claude call path is gated
 * (/paste + createPasteDraft); every other surface stays open to everyone.
 * Missing headers (local dev, non-Vercel hosts) → allowed.
 *
 * Update the list here — it is the single source of truth.
 */

// ISO 3166-1 alpha-2 country codes; subdivisions are ISO 3166-2 region
// portions keyed by country (Vercel sends the region portion only, e.g. "43").
export const CLAUDE_FEATURE_BLOCKED_REGIONS = {
  countries: ['CN', 'BY', 'CU', 'IR', 'MM', 'KP', 'RU', 'SD', 'SY'],
  subdivisions: {
    UA: ['43', '40', '14', '09'], // Crimea, Sevastopol, Donetsk, Luhansk
  } as Record<string, string[]>,
}

export const REGION_BLOCKED_MESSAGE = "This feature isn't available in your region."

export function isRegionBlocked(headers: Headers): boolean {
  const country = headers.get('x-vercel-ip-country')?.trim().toUpperCase()
  if (!country) return false
  if (CLAUDE_FEATURE_BLOCKED_REGIONS.countries.includes(country)) return true

  const blockedSubs = CLAUDE_FEATURE_BLOCKED_REGIONS.subdivisions[country]
  if (!blockedSubs) return false
  // Accept both "43" and "UA-43" forms.
  const region = headers.get('x-vercel-ip-country-region')?.trim().toUpperCase().replace(`${country}-`, '')
  return !!region && blockedSubs.includes(region)
}
