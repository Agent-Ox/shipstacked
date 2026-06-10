import { rateLimit } from '@/lib/rateLimit'
import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/v1/team/<slug> — public agent deep-fetch of a team profile + members
// + recent receipts (Phase 4 §K.1). Mirrors /api/v1/builders/<username>: any
// authenticated scope may read a PUBLISHED team; 404 otherwise. Distinct from
// /api/v1/team (the team:rw key-owner's own-profile route, §G.3).
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)

  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')

  const scopeErr = requireScope(auth.auth, ['buyer:rw', 'builder:rw', 'agent:rw', 'team:rw'])
  if (scopeErr) return scopeErr

  const { slug } = await ctx.params
  const db = admin()

  const { data: entity } = await db
    .from('entities')
    .select('id, slug, display_name')
    .eq('slug', slug)
    .eq('kind', 'team')
    .maybeSingle()
  if (!entity) return apiError(404, 'Team not found')

  const { data: profile } = await db
    .from('team_profiles')
    .select('*')
    .eq('entity_id', entity.id)
    .maybeSingle()
  if (!profile || !profile.published) return apiError(404, 'Team not found or not published')

  const [{ data: members }, { data: receipts }] = await Promise.all([
    db.from('profiles')
      .select('username, full_name, role, avatar_url')
      .eq('team_entity_id', entity.id)
      .eq('published', true)
      .order('full_name'),
    db.from('proof_receipts')
      .select('slug, title, description, event_type, atlas_confirmed, atlas_inferred, verification_level, issued_at')
      .eq('subject_id', entity.id)
      .eq('visibility', 'public')
      .order('issued_at', { ascending: false })
      .limit(50),
  ])

  return apiOk({
    team: {
      slug: entity.slug,
      team_name: profile.team_name,
      tagline: profile.tagline,
      description: profile.description,
      services: profile.services ?? [],
      location: profile.location,
      website_url: profile.website_url,
      logo_url: profile.logo_url,
      contact_email: profile.contact_email,
      founded_year: profile.founded_year,
      team_size_range: profile.team_size_range,
      verified: profile.verified,
      profile_url: `https://shipstacked.com/team/${entity.slug}`,
      members: (members ?? []).map((m: any) => ({
        username: m.username,
        full_name: m.full_name,
        role: m.role,
        avatar_url: m.avatar_url,
        profile_url: `https://shipstacked.com/u/${m.username}`,
      })),
      recent_receipts: receipts ?? [],
    },
  })
}
