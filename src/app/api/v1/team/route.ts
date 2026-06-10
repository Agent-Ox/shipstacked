import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'
import { validateTeamPatch } from '@/lib/team/validate'

// V1 team profile API (Phase 4 §G.3).
//   GET   — bearer key with team:rw scope → the team this key's user owns.
//   PATCH — bearer team:rw OR cookie session + team_admins membership.
//
// v1 resolves the bearer path's team by owner_user_id LIMIT 1 (one team per
// user). Multi-team-per-user UX is deferred to Phase 5+. The cookie path
// targets a specific team via body.entity_id (the dashboard knows the slug),
// so it stays correct even if the user owns several teams.

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const ENTITY_SELECT = 'id, slug, display_name, owner_user_id'

async function resolveTeamByOwner(db: ReturnType<typeof admin>, userId: string) {
  const { data } = await db
    .from('entities')
    .select(ENTITY_SELECT)
    .eq('owner_user_id', userId)
    .eq('kind', 'team')
    .limit(1)
    .maybeSingle()
  return data as { id: number; slug: string; display_name: string; owner_user_id: string } | null
}

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)
  const scopeErr = requireScope(auth.auth, ['team:rw'])
  if (scopeErr) return scopeErr
  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')

  const db = admin()
  const userId = auth.auth.profile.user_id
  if (!userId) return apiError(500, 'API-key profile has no user_id')
  const entity = await resolveTeamByOwner(db, userId)
  if (!entity) return apiError(404, 'No team owned by this key')

  const { data: profile } = await db
    .from('team_profiles')
    .select('*')
    .eq('entity_id', entity.id)
    .maybeSingle()

  return apiOk({ team: { entity_id: entity.id, slug: entity.slug, ...profile } })
}

export async function PATCH(req: Request) {
  const db = admin()

  let body: any = {}
  try { body = await req.json() } catch { return apiError(400, 'Invalid JSON body') }

  // ── Resolve auth + the target team (bearer team:rw OR cookie + admin) ──────
  let entity: { id: number; slug: string; display_name: string; owner_user_id: string } | null = null
  let rateKeyId: string | null = null

  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer sk_ss_')) {
    const auth = await authenticateApiKey(req)
    if (!auth.ok) return apiError(auth.status, auth.error)
    const scopeErr = requireScope(auth.auth, ['team:rw'])
    if (scopeErr) return scopeErr
    rateKeyId = auth.auth.keyId
    const userId = auth.auth.profile.user_id
    if (!userId) return apiError(500, 'API-key profile has no user_id')
    entity = await resolveTeamByOwner(db, userId)
    if (!entity) return apiError(404, 'No team owned by this key')
  } else {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError(401, 'Not authenticated')
    const entityId = Number(body.entity_id)
    if (!entityId) return apiError(400, 'entity_id is required (cookie-session path)')
    const { data: adminRow } = await db
      .from('team_admins')
      .select('id')
      .eq('team_entity_id', entityId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!adminRow) return apiError(403, 'Not an admin of this team')
    const { data: ent } = await db
      .from('entities')
      .select(ENTITY_SELECT)
      .eq('id', entityId)
      .eq('kind', 'team')
      .maybeSingle()
    if (!ent) return apiError(404, 'Team not found')
    entity = ent as { id: number; slug: string; display_name: string; owner_user_id: string }
  }

  if (rateKeyId) {
    const rl = await rateLimit(rateKeyId)
    if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')
  }

  // ── Validate + write ──────────────────────────────────────────────────────
  const v = validateTeamPatch(body)
  if (!v.ok) return apiError(400, `Invalid ${v.field}: ${v.error}`)
  if (Object.keys(v.updates).length === 0) return apiError(400, 'No valid fields to update')

  v.updates.updated_at = new Date().toISOString()

  const { error: upErr } = await db
    .from('team_profiles')
    .update(v.updates)
    .eq('entity_id', entity!.id)
  if (upErr) return apiError(500, 'Failed to update team profile', upErr.message)

  // Keep entities.display_name in sync when the team name changes (one-source).
  if (v.teamNameChanged && v.updates.team_name) {
    await db.from('entities').update({ display_name: v.updates.team_name }).eq('id', entity!.id)
  }

  const { data: updated } = await db
    .from('team_profiles')
    .select('*')
    .eq('entity_id', entity!.id)
    .maybeSingle()

  return apiOk({
    updated: true,
    fields_updated: Object.keys(v.updates).filter((f) => f !== 'updated_at'),
    team: { entity_id: entity!.id, slug: entity!.slug, ...updated },
  })
}
