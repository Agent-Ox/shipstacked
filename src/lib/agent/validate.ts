/**
 * Agent profile field validation (Phase 5 §G.1).
 *
 * `validateAgentPatch` validates a PARTIAL agent_profiles update (only the
 * fields present in the body). Rules mirror the signup-time validators in
 * /api/join/agent (§E.1). Shared by /api/v1/agent PATCH; AGENT_PROVIDERS is also
 * the single source for the edit form's provider dropdown.
 *
 * `verified` is admin-only — deliberately NOT accepted here (a user PATCHing
 * their own profile cannot self-verify). `principal_entity_id` shape is checked
 * here (positive int or null); the deeper owns/admins ownership check is the
 * route's job (§G.4) since it needs DB access.
 *
 * (As with team/validate.ts, the §E.1 signup route inlines its own create-time
 * validators; unifying the two is a deferred Tier 4 dedup.)
 */

export const AGENT_PROVIDERS = ['claude', 'openai', 'cursor', 'gemini', 'custom', 'other'] as const
export type AgentProvider = (typeof AGENT_PROVIDERS)[number]

export type AgentPatchResult =
  | { ok: true; updates: Record<string, any>; agentNameChanged: boolean }
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

export function validateAgentPatch(body: Record<string, any>): AgentPatchResult {
  const updates: Record<string, any> = {}
  let agentNameChanged = false
  const fail = (field: string, error: string): AgentPatchResult => ({ ok: false, field, error })

  if (body.agent_name !== undefined) {
    const v = String(body.agent_name).trim()
    if (!v) return fail('agent_name', 'required')
    if (v.length > 80) return fail('agent_name', 'max 80 characters')
    updates.agent_name = v
    agentNameChanged = true
  }
  if (body.provider !== undefined) {
    const v = String(body.provider).trim()
    if (!AGENT_PROVIDERS.includes(v as AgentProvider)) {
      return fail('provider', `must be one of ${AGENT_PROVIDERS.join(', ')}`)
    }
    updates.provider = v
  }
  if (body.model !== undefined) {
    const v = body.model == null ? '' : String(body.model).trim()
    if (v.length > 200) return fail('model', 'max 200 characters')
    updates.model = v || null
  }
  if (body.description !== undefined) {
    const v = body.description == null ? '' : String(body.description).trim()
    if (v.length > 2000) return fail('description', 'max 2000 characters')
    updates.description = v || null
  }
  if (body.capabilities !== undefined) {
    if (!Array.isArray(body.capabilities)) return fail('capabilities', 'must be an array of strings')
    if (body.capabilities.length > 20) return fail('capabilities', 'max 20 items')
    const out: string[] = []
    for (const c of body.capabilities) {
      if (typeof c !== 'string') return fail('capabilities', 'each item must be a string')
      const v = c.trim()
      if (v.length > 100) return fail('capabilities', 'each item max 100 characters')
      if (v) out.push(v)
    }
    updates.capabilities = out
  }
  if (body.focus !== undefined) {
    const v = body.focus == null ? '' : String(body.focus).trim()
    if (v.length > 300) return fail('focus', 'max 300 characters')
    updates.focus = v || null
  }
  if (body.logo_url !== undefined) {
    const r = validateOptionalUrl(body.logo_url)
    if (r.error) return fail('logo_url', r.error)
    updates.logo_url = r.value
  }
  if (body.contact_email !== undefined) {
    const v = body.contact_email == null ? '' : String(body.contact_email).trim()
    if (v.length > 320) return fail('contact_email', 'max 320 characters')
    if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return fail('contact_email', 'must be a valid email address')
    updates.contact_email = v || null
  }
  if (body.contact_url !== undefined) {
    const r = validateOptionalUrl(body.contact_url)
    if (r.error) return fail('contact_url', r.error)
    updates.contact_url = r.value
  }
  if (body.principal_entity_id !== undefined) {
    if (body.principal_entity_id == null) {
      updates.principal_entity_id = null
    } else {
      const n = Number(body.principal_entity_id)
      if (!Number.isInteger(n) || n <= 0) return fail('principal_entity_id', 'must be a positive integer or null')
      updates.principal_entity_id = n
    }
  }
  if (body.published !== undefined) {
    if (typeof body.published !== 'boolean') return fail('published', 'must be a boolean')
    updates.published = body.published
  }

  return { ok: true, updates, agentNameChanged }
}
