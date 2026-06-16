import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { findOrCreateAgentEntity, deleteEntity } from '@/lib/entities'

// POST — create an agent (Card 3 of /join: Autonomous Agent).
//
// Phase 5 §E: replaces the interim /dashboard?agent=1 shim with the real Card 3
// deliverable. Creates two rows for the signing-up human:
//   1. entities (kind='agent', owner_user_id=user.id) — via findOrCreateAgentEntity
//   2. agent_profiles (rich profile, published=false, principal_entity_id=NULL)
//
// The agent is owned by the signing-up human's existing auth account — no
// separate auth user (locked decision §N). principal defaults to NULL (the
// owner's human entity, resolved at runtime by resolveAgentPrincipal); the
// owner can re-point it to a team they admin in /agent/<slug>/edit. published
// defaults to false; the owner reviews and clicks Publish in the edit page.
//
// Unlike teams, there is NO admin join table — agents are single-owner at v1
// (locked decision §N). Mirrors /api/join/team otherwise, including the
// best-effort rollback on partial insert (Supabase JS has no transaction).

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/ // 3–40 chars, kebab-case
const PROVIDERS = ['claude', 'openai', 'cursor', 'gemini', 'custom', 'other'] as const

interface AgentBody {
  agent_name?: string
  slug?: string
  provider?: string
  model?: string | null
  description?: string | null
  capabilities?: unknown
  focus?: string | null
}

function bad(field: string, why: string) {
  return NextResponse.json({ error: `Invalid ${field}: ${why}`, field }, { status: 400 })
}

export async function POST(req: Request) {
  // ── 1. Auth (cookie session) ────────────────────────────────────────────
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: AgentBody = {}
  try { body = await req.json() } catch { /* empty body → validation below */ }

  // ── 2. Validate ───────────────────────────────────────────────────────────
  const agentName = (body.agent_name ?? '').trim()
  if (!agentName) return bad('agent_name', 'required')
  if (agentName.length > 80) return bad('agent_name', 'max 80 characters')

  const slug = (body.slug ?? '').trim()
  if (!slug) return bad('slug', 'required')
  if (!SLUG_RE.test(slug)) {
    return bad('slug', 'must be 3–40 chars, lowercase letters/numbers/hyphens, no leading/trailing hyphen')
  }

  const provider = (body.provider ?? '').trim()
  if (!provider) return bad('provider', 'required')
  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    return bad('provider', `must be one of: ${PROVIDERS.join(', ')}`)
  }

  let model: string | null = null
  if (body.model != null) {
    model = String(body.model).trim()
    if (model.length > 200) return bad('model', 'max 200 characters')
    if (!model) model = null
  }

  let description: string | null = null
  if (body.description != null) {
    description = String(body.description).trim()
    if (description.length > 2000) return bad('description', 'max 2000 characters')
    if (!description) description = null
  }

  const capabilities: string[] = []
  if (body.capabilities != null) {
    if (!Array.isArray(body.capabilities)) return bad('capabilities', 'must be an array of strings')
    if (body.capabilities.length > 20) return bad('capabilities', 'max 20 items')
    for (const c of body.capabilities) {
      if (typeof c !== 'string') return bad('capabilities', 'each item must be a string')
      const v = c.trim()
      if (v.length > 100) return bad('capabilities', 'each item max 100 characters')
      if (v) capabilities.push(v)
    }
  }

  let focus: string | null = null
  if (body.focus != null) {
    focus = String(body.focus).trim()
    if (focus.length > 300) return bad('focus', 'max 300 characters')
    if (!focus) focus = null
  }

  // ── 3. Slug availability (global — entities.slug is unique) ──────────────
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: slugTaken } = await admin
    .from('entities')
    .select('id')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle()
  if (slugTaken) {
    return NextResponse.json({ error: 'Agent slug already taken', slug }, { status: 409 })
  }

  // ── 4. Create the agent entity ───────────────────────────────────────────
  let entity
  let wasCreated: boolean
  try {
    const result = await findOrCreateAgentEntity(admin, user, agentName, slug)
    entity = result.entity
    wasCreated = result.was_created
  } catch (err: any) {
    // Race: another request grabbed the slug between step 3 and step 4.
    if (err?.code === '23505') {
      return NextResponse.json({ error: 'Agent slug already taken', slug }, { status: 409 })
    }
    return NextResponse.json({ error: `Agent creation failed: ${err?.message ?? 'unknown'}` }, { status: 500 })
  }

  // If the entity already existed (same owner + slug), treat as a conflict —
  // consistent with the step-3 stance. Avoids a duplicate profile insert.
  if (!wasCreated) {
    return NextResponse.json({ error: 'Agent slug already taken', slug }, { status: 409 })
  }

  // ── 5. Insert agent_profiles (published=false, principal=NULL) ───────────
  const { error: profileErr } = await admin.from('agent_profiles').insert({
    entity_id: entity.id,
    agent_name: agentName,
    provider,
    model,
    description,
    capabilities,
    focus,
    principal_entity_id: null,
    published: false,
  })
  if (profileErr) {
    // Rollback the freshly-created entity (safe: was_created=true).
    await deleteEntity(admin, entity.id)
    return NextResponse.json({ error: `Agent profile insert failed: ${profileErr.message}` }, { status: 500 })
  }

  // ── 6. Success ───────────────────────────────────────────────────────────
  return NextResponse.json({
    slug: entity.slug,
    entity_id: entity.id,
    edit_url: `/agent/${entity.slug}/edit`,
    was_created: wasCreated,
  })
}
