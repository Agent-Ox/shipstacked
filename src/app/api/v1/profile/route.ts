import { rateLimit } from '@/lib/rateLimit'
import { authenticateApiKey, apiError, apiOk } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'
import { checkAutoVerify } from '@/lib/autoVerify'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_FIELDS = [
  'full_name', 'role', 'bio', 'about', 'location', 'availability',
  'primary_profession', 'seniority', 'work_type', 'day_rate', 'timezone',
  'languages', 'github_url', 'x_url', 'linkedin_url', 'website_url', 'published',
]

const SKILL_CATEGORIES = ['claude_use_case', 'language', 'framework', 'ai_tool', 'llm', 'domain']

export async function PATCH(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)

  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')

  const { profile } = auth.auth
  const db = admin()

  let body: any
  try {
    body = await req.json()
  } catch {
    return apiError(400, 'Invalid JSON body')
  }

  // Track everything that was updated for the response
  const fieldsUpdated: string[] = []

  // Scalar profile fields
  const updates: Record<string, any> = {}
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  // team_entity_id (Phase 4 §H.4) — dedicated validated branch, NOT a blind
  // passthrough. Agents are programmatic, so the link target is checked: null
  // un-links; a positive int must resolve to a kind='team' entity that has a
  // published=true team_profiles row. (The browser EditProfileForm writes this
  // field direct-to-Supabase and relies on the autocomplete + FK + render-side
  // published gate instead — a deliberately lighter posture for that path.)
  if (body.team_entity_id !== undefined) {
    if (body.team_entity_id === null) {
      updates.team_entity_id = null
    } else {
      const teamId = Number(body.team_entity_id)
      if (!Number.isInteger(teamId) || teamId <= 0) {
        return apiError(400, 'team_entity_id must be a positive integer or null')
      }
      const { data: teamEnt } = await db.from('entities').select('id').eq('id', teamId).eq('kind', 'team').maybeSingle()
      if (!teamEnt) return apiError(400, 'team_entity_id does not reference a team')
      const { data: tp } = await db.from('team_profiles').select('published').eq('entity_id', teamId).maybeSingle()
      if (!tp || !tp.published) return apiError(400, 'team is not published')
      updates.team_entity_id = teamId
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await db
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
    if (error) return apiError(500, 'Failed to update profile', error.message)
    fieldsUpdated.push(...Object.keys(updates))
  }

  // Skills
  if (Array.isArray(body.skills)) {
    const validSkills = body.skills.filter((s: any) =>
      s.name && typeof s.name === 'string' &&
      s.category && SKILL_CATEGORIES.includes(s.category)
    )
    if (validSkills.length > 0) {
      await db.from('skills').delete().eq('profile_id', profile.id)
      const { error } = await db.from('skills').insert(
        validSkills.map((s: any) => ({
          profile_id: profile.id,
          category: s.category,
          name: s.name,
        }))
      )
      if (!error) fieldsUpdated.push(`skills (${validSkills.length})`)
    }
  }

  // Projects
  if (Array.isArray(body.projects)) {
    const validProjects = body.projects.filter((p: any) => p.title && typeof p.title === 'string')
    if (validProjects.length > 0) {
      await db.from('projects').delete().eq('profile_id', profile.id)
      const { error } = await db.from('projects').insert(
        validProjects.map((p: any, i: number) => ({
          profile_id: profile.id,
          title: p.title,
          description: p.description || null,
          prompt_approach: p.prompt_approach || null,
          outcome: p.outcome || null,
          project_url: p.project_url || null,
          display_order: i,
        }))
      )
      if (!error) fieldsUpdated.push(`projects (${validProjects.length})`)
    }
  }

  // Auto-verify check
  const nowVerified = await checkAutoVerify(profile.id)

  const { data: updated } = await db
    .from('profiles')
    .select('username, full_name, role, bio, verified, published')
    .eq('id', profile.id)
    .maybeSingle()

  return apiOk({
    updated: true,
    fields_updated: fieldsUpdated,
    profile: updated,
    verified: nowVerified,
    profile_url: `https://shipstacked.com/u/${updated?.username}`,
  })
}
