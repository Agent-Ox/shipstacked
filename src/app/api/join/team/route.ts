import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { findOrCreateTeamEntity, deleteEntity } from '@/lib/entities'

// POST — create a team (Card 2 of /join: Team / Agency / Studio).
//
// Phase 4 §E: rebuilds the interim "reserve your team name" handler into the
// real Card 2 deliverable. Creates three rows for the signing-up human:
//   1. entities (kind='team', owner_user_id=user.id)  — via findOrCreateTeamEntity
//   2. team_profiles (rich profile, published=false)
//   3. team_admins (single 'owner' row; multi-admin schema-ready)
//
// The team is owned by the signing-up human's existing auth account — no
// separate auth user for the team (locked decision §O). published defaults to
// false; the owner reviews and clicks Publish in /team/<slug>/edit.
//
// Supabase's JS client has no transaction primitive, so partial-insert cleanup
// is best-effort explicit deletion (see rollback blocks below). Safe because
// the entity is always freshly created on the success path (was_created=true).

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/ // 3–40 chars, kebab-case

interface TeamBody {
  team_name?: string
  slug?: string
  description?: string | null
  services?: unknown
  location?: string | null
  website_url?: string | null
  contact_email?: string | null
  tagline?: string | null
}

function bad(field: string, why: string) {
  return NextResponse.json({ error: `Invalid ${field}: ${why}`, field }, { status: 400 })
}

export async function POST(req: Request) {
  // ── 1. Auth (cookie session) ────────────────────────────────────────────
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: TeamBody = {}
  try { body = await req.json() } catch { /* empty body → validation below */ }

  // ── 2. Validate ───────────────────────────────────────────────────────────
  const teamName = (body.team_name ?? '').trim()
  if (!teamName) return bad('team_name', 'required')
  if (teamName.length > 80) return bad('team_name', 'max 80 characters')

  const slug = (body.slug ?? '').trim()
  if (!slug) return bad('slug', 'required')
  if (!SLUG_RE.test(slug)) {
    return bad('slug', 'must be 3–40 chars, lowercase letters/numbers/hyphens, no leading/trailing hyphen')
  }

  let tagline: string | null = null
  if (body.tagline != null) {
    tagline = String(body.tagline).trim()
    if (tagline.length > 200) return bad('tagline', 'max 200 characters')
    if (!tagline) tagline = null
  }

  let description: string | null = null
  if (body.description != null) {
    description = String(body.description).trim()
    if (description.length > 2000) return bad('description', 'max 2000 characters')
    if (!description) description = null
  }

  let services: string[] = []
  if (body.services != null) {
    if (!Array.isArray(body.services)) return bad('services', 'must be an array of strings')
    if (body.services.length > 20) return bad('services', 'max 20 items')
    for (const s of body.services) {
      if (typeof s !== 'string') return bad('services', 'each item must be a string')
      const v = s.trim()
      if (v.length > 100) return bad('services', 'each item max 100 characters')
      if (v) services.push(v)
    }
  }

  let location: string | null = null
  if (body.location != null) {
    location = String(body.location).trim()
    if (location.length > 200) return bad('location', 'max 200 characters')
    if (!location) location = null
  }

  let websiteUrl: string | null = null
  if (body.website_url != null && String(body.website_url).trim()) {
    const raw = String(body.website_url).trim()
    try {
      const u = new URL(raw)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return bad('website_url', 'must be an http(s) URL')
      }
      websiteUrl = u.toString()
    } catch {
      return bad('website_url', 'must be a valid URL')
    }
  }

  let contactEmail = user.email ?? null
  if (body.contact_email != null && String(body.contact_email).trim()) {
    contactEmail = String(body.contact_email).trim()
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
    return NextResponse.json({ error: 'Team slug already taken', slug }, { status: 409 })
  }

  // ── 4. Create the team entity ────────────────────────────────────────────
  let entity
  let wasCreated: boolean
  try {
    const result = await findOrCreateTeamEntity(admin, user, teamName, slug)
    entity = result.entity
    wasCreated = result.was_created
  } catch (err: any) {
    // Race: another request grabbed the slug between step 3 and step 4.
    if (err?.code === '23505') {
      return NextResponse.json({ error: 'Team slug already taken', slug }, { status: 409 })
    }
    return NextResponse.json({ error: `Team creation failed: ${err?.message ?? 'unknown'}` }, { status: 500 })
  }

  // If the entity already existed (same owner + slug), treat as a conflict —
  // consistent with the step-3 stance. Avoids duplicate profile/admin inserts.
  if (!wasCreated) {
    return NextResponse.json({ error: 'Team slug already taken', slug }, { status: 409 })
  }

  // ── 5. Insert team_profiles (published=false) ────────────────────────────
  const { error: profileErr } = await admin.from('team_profiles').insert({
    entity_id: entity.id,
    team_name: teamName,
    tagline,
    description,
    services,
    location,
    website_url: websiteUrl,
    contact_email: contactEmail,
    published: false,
  })
  if (profileErr) {
    // Rollback the freshly-created entity (safe: was_created=true).
    await deleteEntity(admin, entity.id)
    return NextResponse.json({ error: `Team profile insert failed: ${profileErr.message}` }, { status: 500 })
  }

  // ── 6. Insert team_admins (single 'owner' row) ───────────────────────────
  const { error: adminErr } = await admin.from('team_admins').insert({
    team_entity_id: entity.id,
    user_id: user.id,
    role: 'owner',
  })
  if (adminErr) {
    // Rollback both the profile and the entity.
    await admin.from('team_profiles').delete().eq('entity_id', entity.id)
    await deleteEntity(admin, entity.id)
    return NextResponse.json({ error: `Team admin insert failed: ${adminErr.message}` }, { status: 500 })
  }

  // ── 7. Success ───────────────────────────────────────────────────────────
  return NextResponse.json({
    slug: entity.slug,
    entity_id: entity.id,
    edit_url: `/team/${entity.slug}/edit`,
    was_created: wasCreated,
  })
}
