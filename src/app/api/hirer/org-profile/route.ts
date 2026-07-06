import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// POST — update the hirer's first-class ORG company profile (team_profiles) —
// unification Stage 3.
//
// The hirer company form now edits the user's org profile (the team_profiles row
// created at Stage-2 signup), not the legacy email-keyed employer_profiles.
// team_profiles is NOT writable by the browser client under RLS, so this server
// route performs the write with the service-role client after verifying the
// caller is a team_admin of the org (resolved from their own membership — never
// a client-supplied entity id).
//
// Field mapping (form → team_profiles): company_name→team_name, about→description,
// team_size→team_size_range, public→published; what_they_build / industry /
// hiring_type / linkedin_url / x_url / location / website_url / logo_url map
// directly. Slug is NOT editable here (entities.slug is set at signup; changing
// it breaks the org URL — a separate concern). hires / offers_services are left
// untouched, so a hirer org stays hires=true.

interface Body {
  company_name?: string
  about?: string
  what_they_build?: string
  location?: string
  team_size?: string
  website_url?: string
  linkedin_url?: string
  x_url?: string
  logo_url?: string
  industry?: string
  hiring_type?: string
  public?: boolean
  hires?: boolean   // cap-stage 3: explicit "we're actively hiring" opt-in
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: Body = {}
  try { body = await req.json() } catch { /* validated below */ }

  const companyName = (body.company_name ?? '').trim()
  if (!companyName) return NextResponse.json({ error: 'Company name is required' }, { status: 400 })

  // Resolve the caller's org from their OWN team_admins membership (self-read RLS
  // permits this). This IS the ownership check — no membership, no org to write —
  // and it means we never trust a client-supplied entity id.
  const { data: adminRow } = await supabase
    .from('team_admins')
    .select('team_entity_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  const orgEntityId = (adminRow as any)?.team_entity_id
  if (orgEntityId == null) {
    return NextResponse.json({ error: 'No org to edit for this account' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const trim = (v: unknown) => { const s = v == null ? '' : String(v).trim(); return s || null }
  const updates = {
    team_name: companyName,
    description: trim(body.about),
    what_they_build: trim(body.what_they_build),
    location: trim(body.location),
    team_size_range: trim(body.team_size),
    website_url: trim(body.website_url),
    linkedin_url: trim(body.linkedin_url),
    x_url: trim(body.x_url),
    logo_url: trim(body.logo_url),
    industry: trim(body.industry),
    hiring_type: trim(body.hiring_type),
    published: body.public ?? false,
    // Only write hires when the client explicitly sends it — a save without the
    // toggle must not silently flip an org's hiring state. offers_services is
    // left untouched (owned by the service/team lens).
    ...(typeof body.hires === 'boolean' ? { hires: body.hires } : {}),
    updated_at: new Date().toISOString(),
  }

  const { error: upErr } = await admin
    .from('team_profiles')
    .update(updates)
    .eq('entity_id', orgEntityId)
  if (upErr) return NextResponse.json({ error: `Save failed: ${upErr.message}` }, { status: 500 })

  // Keep entities.display_name in sync with the company name (one identity —
  // mirrors the team editor). Also read back the slug for the response.
  const { data: ent } = await admin
    .from('entities')
    .update({ display_name: companyName })
    .eq('id', orgEntityId)
    .select('slug')
    .single()

  return NextResponse.json({ ok: true, slug: ent?.slug ?? null })
}
