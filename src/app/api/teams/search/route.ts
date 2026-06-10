import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'

// GET /api/teams/search?q=<1-50 chars> — public team-name autocomplete
// (Phase 4 §H.2). Used by the builder EditProfileForm to link a team.
// Returns up to 10 published teams matching slug OR name.
//
// Base table is `entities` (slug + display_name are both base columns, so a
// single .or() matches either; display_name is kept in sync with team_name by
// §E/§G). Inner-join team_profiles to gate on published + pull display fields.

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  if (q.length < 1 || q.length > 50) {
    return NextResponse.json({ results: [] })
  }

  // Light public rate-limit, keyed on caller IP.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  const rl = await rateLimit(`teams-search:${ip}`, 60, 30)
  if (!rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Escape PostgREST ILIKE wildcards in user input.
  const safe = q.replace(/[%_,()]/g, ' ').trim()
  if (!safe) return NextResponse.json({ results: [] })

  const db = admin()
  const { data } = await db
    .from('entities')
    .select('id, slug, created_at, team_profiles!inner(team_name, tagline, logo_url, published)')
    .eq('kind', 'team')
    .eq('team_profiles.published', true)
    .or(`slug.ilike.%${safe}%,display_name.ilike.%${safe}%`)
    .order('created_at', { ascending: false })
    .limit(10)

  const results = (data ?? []).map((e: any) => {
    const tp = Array.isArray(e.team_profiles) ? e.team_profiles[0] : e.team_profiles
    return {
      entity_id: e.id,
      slug: e.slug,
      name: tp?.team_name ?? e.slug,
      logo_url: tp?.logo_url ?? null,
      tagline: tp?.tagline ?? null,
    }
  })

  return NextResponse.json({ results })
}
