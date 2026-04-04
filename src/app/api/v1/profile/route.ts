import { authenticateApiKey, apiError, apiOk } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'
import { checkAutoVerify } from '@/lib/autoVerify'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Allowed profile fields an agent can update
const ALLOWED_FIELDS = [
  'full_name', 'role', 'bio', 'about', 'location', 'availability',
  'primary_profession', 'seniority', 'work_type', 'day_rate', 'timezone',
  'languages', 'github_url', 'x_url', 'linkedin_url', 'website_url', 'published',
]

const SKILL_CATEGORIES = ['claude_use_case', 'language', 'framework', 'ai_tool', 'llm', 'domain']

export async function PATCH(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)

  const { profile } = auth.auth
  const db = admin()

  let body: any
  try {
    body = await req.json()
  } catch {
    return apiError(400, 'Invalid JSON body')
  }

  const updates: Record<string, any> = {}
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  // Update profile fields
  if (Object.keys(updates).length > 0) {
    const { error } = await db
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
    if (error) return apiError(500, 'Failed to update profile', error.message)
  }

  // Handle skills array if provided
  // Format: [{ category: 'claude_use_case', name: 'Automation and workflows' }, ...]
  if (Array.isArray(body.skills)) {
    const validSkills = body.skills.filter((s: any) =>
      s.name && typeof s.name === 'string' &&
      s.category && SKILL_CATEGORIES.includes(s.category)
    )

    if (validSkills.length > 0) {
      // Delete existing skills and re-insert
      await db.from('skills').delete().eq('profile_id', profile.id)
      await db.from('skills').insert(
        validSkills.map((s: any) => ({
          profile_id: profile.id,
          category: s.category,
          name: s.name,
        }))
      )
    }
  }

  // Handle projects array if provided
  // Format: [{ title, description, prompt_approach, outcome, project_url }]
  if (Array.isArray(body.projects)) {
    const validProjects = body.projects.filter((p: any) => p.title && typeof p.title === 'string')
    if (validProjects.length > 0) {
      await db.from('projects').delete().eq('profile_id', profile.id)
      await db.from('projects').insert(
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
    }
  }

  // Fire auto-verify check
  const nowVerified = await checkAutoVerify(profile.id)

  // Fetch updated profile to return
  const { data: updated } = await db
    .from('profiles')
    .select('username, full_name, role, bio, verified, published, velocity_score')
    .eq('id', profile.id)
    .maybeSingle()

  return apiOk({
    updated: true,
    fields_updated: Object.keys(updates),
    profile: updated,
    verified: nowVerified,
    profile_url: `https://shipstacked.com/u/${updated?.username}`,
  })
}
