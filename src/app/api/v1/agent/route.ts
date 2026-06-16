import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'
import { validateAgentPatch } from '@/lib/agent/validate'
import { resolveAgentPrincipal } from '@/lib/entities'

// V1 agent profile API (Phase 5 §G.3 / §G.4).
//   GET   — bearer key with agent:rw scope → the agent this key's user owns.
//   PATCH — bearer agent:rw OR cookie session + owner check.
//
// v1 resolves the bearer path's agent by owner_user_id LIMIT 1 (one agent per
// owner on the lazy/key path). Card-3 signups can mint multiple agents per
// owner (slug-keyed); the cookie path targets a specific one via body.entity_id
// (the edit page knows the slug), so it stays correct even with several agents.

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const ENTITY_SELECT = 'id, slug, display_name, owner_user_id'

type AgentEntity = { id: number; slug: string; display_name: string; owner_user_id: string }

async function resolveAgentByOwner(db: ReturnType<typeof admin>, userId: string) {
  const { data } = await db
    .from('entities')
    .select(ENTITY_SELECT)
    .eq('owner_user_id', userId)
    .eq('kind', 'agent')
    .limit(1)
    .maybeSingle()
  return data as AgentEntity | null
}

// A principal must be an entity the agent OWNER owns (human) or admins (team).
async function principalTargetAllowed(db: ReturnType<typeof admin>, principalId: number, ownerUserId: string): Promise<boolean> {
  const { data: ent } = await db
    .from('entities')
    .select('id, kind, owner_user_id')
    .eq('id', principalId)
    .maybeSingle()
  if (!ent) return false
  if (ent.kind === 'human') return ent.owner_user_id === ownerUserId
  if (ent.kind === 'team') {
    const { data: adminRow } = await db
      .from('team_admins')
      .select('id')
      .eq('team_entity_id', principalId)
      .eq('user_id', ownerUserId)
      .maybeSingle()
    return !!adminRow
  }
  return false
}

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)
  const scopeErr = requireScope(auth.auth, ['agent:rw'])
  if (scopeErr) return scopeErr
  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')

  const db = admin()
  const userId = auth.auth.profile.user_id
  if (!userId) return apiError(500, 'API-key profile has no user_id')
  const entity = await resolveAgentByOwner(db, userId)
  if (!entity) return apiError(404, 'No agent owned by this key')

  const { data: profile } = await db
    .from('agent_profiles')
    .select('*')
    .eq('entity_id', entity.id)
    .maybeSingle()

  const principal = await resolveAgentPrincipal(db, entity.id)

  return apiOk({ agent: { entity_id: entity.id, slug: entity.slug, ...profile, principal } })
}

export async function PATCH(req: Request) {
  const db = admin()

  let body: any = {}
  try { body = await req.json() } catch { return apiError(400, 'Invalid JSON body') }

  // ── Resolve auth + the target agent (bearer agent:rw OR cookie + owner) ─────
  let entity: AgentEntity | null = null
  let rateKeyId: string | null = null

  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer sk_ss_')) {
    const auth = await authenticateApiKey(req)
    if (!auth.ok) return apiError(auth.status, auth.error)
    const scopeErr = requireScope(auth.auth, ['agent:rw'])
    if (scopeErr) return scopeErr
    rateKeyId = auth.auth.keyId
    const userId = auth.auth.profile.user_id
    if (!userId) return apiError(500, 'API-key profile has no user_id')
    entity = await resolveAgentByOwner(db, userId)
    if (!entity) return apiError(404, 'No agent owned by this key')
  } else {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError(401, 'Not authenticated')
    const entityId = Number(body.entity_id)
    if (!entityId) return apiError(400, 'entity_id is required (cookie-session path)')
    const { data: ent } = await db
      .from('entities')
      .select(ENTITY_SELECT)
      .eq('id', entityId)
      .eq('kind', 'agent')
      .maybeSingle()
    if (!ent) return apiError(404, 'Agent not found')
    if ((ent as AgentEntity).owner_user_id !== user.id) return apiError(403, 'Not the owner of this agent')
    entity = ent as AgentEntity
  }

  if (rateKeyId) {
    const rl = await rateLimit(rateKeyId)
    if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')
  }

  // ── Validate + write ──────────────────────────────────────────────────────
  const v = validateAgentPatch(body)
  if (!v.ok) return apiError(400, `Invalid ${v.field}: ${v.error}`)
  if (Object.keys(v.updates).length === 0) return apiError(400, 'No valid fields to update')

  // Principal repoint: when a non-null principal is set, verify the agent owner
  // owns (human) or admins (team) the target entity.
  if (v.updates.principal_entity_id != null) {
    const allowed = await principalTargetAllowed(db, v.updates.principal_entity_id, entity!.owner_user_id)
    if (!allowed) return apiError(400, 'Invalid principal_entity_id: must be a profile you own or a team you admin')
  }

  v.updates.updated_at = new Date().toISOString()

  const { error: upErr } = await db
    .from('agent_profiles')
    .update(v.updates)
    .eq('entity_id', entity!.id)
  if (upErr) return apiError(500, 'Failed to update agent profile', upErr.message)

  // Keep entities.display_name in sync when the agent name changes (one-source).
  if (v.agentNameChanged && v.updates.agent_name) {
    await db.from('entities').update({ display_name: v.updates.agent_name }).eq('id', entity!.id)
  }

  const { data: updated } = await db
    .from('agent_profiles')
    .select('*')
    .eq('entity_id', entity!.id)
    .maybeSingle()

  const principal = await resolveAgentPrincipal(db, entity!.id)

  return apiOk({
    updated: true,
    fields_updated: Object.keys(v.updates).filter((f) => f !== 'updated_at'),
    agent: { entity_id: entity!.id, slug: entity!.slug, ...updated, principal },
  })
}
