/**
 * URL normalizer (Stage B3).
 *
 * Builders who typed a bare hostname ("github.com/me", "stackeroo.app") without
 * a scheme stored a schemeless URL that validateUrl (paste/classifier.ts) rejects
 * as unparseable — silently stranding them from enrichment. This helper prepends
 * `https://` to schemeless-but-hostlike inputs so those URLs validate.
 *
 * Deliberately conservative:
 *   - null / empty / whitespace-only → null
 *   - already http:// or https:// → returned trimmed, as-is (validateUrl still
 *     enforces its own https-only rule downstream — we don't touch that)
 *   - schemeless BUT hostlike (a dotted domain, e.g. "github.com/x") → prepend https://
 *   - not URL-like at all (no dotted domain, e.g. a bare username "acme-bot") →
 *     returned UNCHANGED (we do NOT guess it's a github handle — guessing is unsafe;
 *     validateUrl rejects it, same as before)
 *
 * Used at capture (signup + edit forms) and at the enrichment call site. NOT used
 * inside validateUrl, and NOT on the public /paste flow — those stay strict.
 */

// A dotted domain at the start: one-or-more label groups, then a slash, end, or
// query. Matches "github.com/x", "stackeroo.app", "www.foo.co.uk/path", "a.io?q=1".
// Does NOT match a bare token with no dot ("acme-bot") or a non-http scheme
// ("mailto:x@y.com" — the ':' breaks the label run before a dot).
const HOSTLIKE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$|\?)/i

export function normalizeUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (HOSTLIKE.test(trimmed)) return `https://${trimmed}`
  return trimmed
}
