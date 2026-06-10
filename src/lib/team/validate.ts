/**
 * Team profile field validation (Phase 4 §G).
 *
 * `validateTeamPatch` validates a PARTIAL team_profiles update (only the fields
 * present in the body). Rules mirror the signup-time validators in
 * /api/join/team (§E.1). Shared by /api/v1/team PATCH; TEAM_SIZE_RANGES is also
 * the single source for the edit form's size dropdown.
 *
 * (The §E.1 signup route still inlines its own create-time validators; unifying
 * the two is a deferred Tier 4 dedup, noted so the duplication is intentional.)
 */

export const TEAM_SIZE_RANGES = ['1-5', '6-20', '21-50', '51-100', '100+'] as const
export type TeamSizeRange = (typeof TEAM_SIZE_RANGES)[number]

export type TeamPatchResult =
  | { ok: true; updates: Record<string, any>; teamNameChanged: boolean }
  | { ok: false; field: string; error: string }

function validateOptionalUrl(raw: unknown): { value: string | null; error?: string } {
  if (raw == null || String(raw).trim() === '') return { value: null }
  const s = String(raw).trim()
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { value: null, error: 'must be an http(s) URL' }
    return { value: u.toString() }
  } catch {
    return { value: null, error: 'must be a valid URL' }
  }
}

export function validateTeamPatch(body: Record<string, any>): TeamPatchResult {
  const updates: Record<string, any> = {}
  let teamNameChanged = false
  const fail = (field: string, error: string): TeamPatchResult => ({ ok: false, field, error })

  if (body.team_name !== undefined) {
    const v = String(body.team_name).trim()
    if (!v) return fail('team_name', 'required')
    if (v.length > 80) return fail('team_name', 'max 80 characters')
    updates.team_name = v
    teamNameChanged = true
  }
  if (body.tagline !== undefined) {
    const v = body.tagline == null ? '' : String(body.tagline).trim()
    if (v.length > 200) return fail('tagline', 'max 200 characters')
    updates.tagline = v || null
  }
  if (body.description !== undefined) {
    const v = body.description == null ? '' : String(body.description).trim()
    if (v.length > 2000) return fail('description', 'max 2000 characters')
    updates.description = v || null
  }
  if (body.services !== undefined) {
    if (!Array.isArray(body.services)) return fail('services', 'must be an array of strings')
    if (body.services.length > 20) return fail('services', 'max 20 items')
    const out: string[] = []
    for (const s of body.services) {
      if (typeof s !== 'string') return fail('services', 'each item must be a string')
      const v = s.trim()
      if (v.length > 100) return fail('services', 'each item max 100 characters')
      if (v) out.push(v)
    }
    updates.services = out
  }
  if (body.location !== undefined) {
    const v = body.location == null ? '' : String(body.location).trim()
    if (v.length > 200) return fail('location', 'max 200 characters')
    updates.location = v || null
  }
  if (body.website_url !== undefined) {
    const r = validateOptionalUrl(body.website_url)
    if (r.error) return fail('website_url', r.error)
    updates.website_url = r.value
  }
  if (body.logo_url !== undefined) {
    const r = validateOptionalUrl(body.logo_url)
    if (r.error) return fail('logo_url', r.error)
    updates.logo_url = r.value
  }
  if (body.contact_email !== undefined) {
    const v = body.contact_email == null ? '' : String(body.contact_email).trim()
    if (v.length > 320) return fail('contact_email', 'max 320 characters')
    updates.contact_email = v || null
  }
  if (body.founded_year !== undefined) {
    if (body.founded_year == null || body.founded_year === '') {
      updates.founded_year = null
    } else {
      const n = Number(body.founded_year)
      const year = new Date().getFullYear()
      if (!Number.isInteger(n) || n < 1900 || n > year) return fail('founded_year', `must be a year between 1900 and ${year}`)
      updates.founded_year = n
    }
  }
  if (body.team_size_range !== undefined) {
    if (body.team_size_range == null || body.team_size_range === '') {
      updates.team_size_range = null
    } else if (!TEAM_SIZE_RANGES.includes(body.team_size_range)) {
      return fail('team_size_range', `must be one of ${TEAM_SIZE_RANGES.join(', ')}`)
    } else {
      updates.team_size_range = body.team_size_range
    }
  }
  if (body.published !== undefined) {
    if (typeof body.published !== 'boolean') return fail('published', 'must be a boolean')
    updates.published = body.published
  }

  return { ok: true, updates, teamNameChanged }
}
