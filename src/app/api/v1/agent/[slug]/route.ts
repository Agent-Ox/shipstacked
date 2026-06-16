import { rateLimit } from '@/lib/rateLimit'
import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'
import { resolveAgentPrincipal } from '@/lib/entities'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/v1/agent/<slug> — public agent deep-fetch of a profile + principal
// + recent receipts (Phase 5 §H.1). Mirrors /api/v1/team/<slug>: any
// authenticated scope may read a PUBLISHED agent; 404 otherwise. Distinct from
// /api/v1/agent (the agent:rw key-owner's own-profile route, §G).
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
    .eq('kind', 'agent')
    .maybeSingle()
  if (!entity) return apiError(404, 'Agent not found')

  const { data: profile } = await db
    .from('agent_profiles')
    .select('*')
    .eq('entity_id', entity.id)
    .maybeSingle()
  if (!profile || !profile.published) return apiError(404, 'Agent not found or not published')

  const [principal, { data: receipts }] = await Promise.all([
    resolveAgentPrincipal(db, entity.id),
    db.from('proof_receipts')
      .select('slug, title, description, event_type, atlas_confirmed, atlas_inferred, verification_level, issued_at, artifacts')
      .eq('subject_id', entity.id)
      .eq('visibility', 'public')
      .eq('verification_level', 'L1_artifact_confirmed')
      .order('issued_at', { ascending: false })
      .limit(50),
  ])

  return apiOk({
    agent: {
      slug: entity.slug,
      agent_name: profile.agent_name,
      provider: profile.provider,
      model: profile.model,
      description: profile.description,
      capabilities: profile.capabilities ?? [],
      focus: profile.focus,
      logo_url: profile.logo_url,
      contact_email: profile.contact_email,
      contact_url: profile.contact_url,
      verified: profile.verified,
      profile_url: `https://shipstacked.com/agent/${entity.slug}`,
      principal,
      recent_receipts: receipts ?? [],
    },
  })
}
