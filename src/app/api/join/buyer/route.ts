import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { findOrCreateOrgEntity } from '@/lib/entities'
import { generateUniqueSlug, normalizeSlug } from '@/lib/paste/slug'

// POST — set up a first-class ORG for the authenticated buyer (Card 4 of /join).
//
// Unification Stage 2: a buyer/hirer is now a first-class org (like a team),
// not a bare kind='human' entity. Signup mints THREE rows for the signing-up
// human, mirroring /api/join/team:
//   1. entities (kind='org', owner_user_id=user.id)  — via findOrCreateOrgEntity
//   2. team_profiles (org profile, hires=false, offers_services=false, published=false)
//   3. team_admins (single 'owner' row)
// plus user_metadata.role='client' for routing/badge (a buyer is still a client;
// now they also OWN an org). The rich company profile is completed on /hirer
// (Stage 3 points that form at THIS org profile instead of employer_profiles).
//
// Company name is OPTIONAL — kept frictionless. When absent, display_name
// defaults to the email local-part and the slug is auto-derived + uniquified.
// When present, the client-supplied slug is validated + 409'd on conflict,
// exactly like team signup.
//
// Idempotent: a returning buyer who already owns an org reuses it (no duplicate).
// The old kind='human' buyer path (findOrCreateBuyerEntity) is retained in
// lib/entities.ts but no longer called here.

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/ // 3–40 chars, kebab-case (mirrors /api/join/team)

interface BuyerBody {
  company_name?: string
  slug?: string
}

interface OrgEntityLite {
  id: number
  display_name: string
  slug: string
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let body: BuyerBody = {}
  try { body = await req.json() } catch { /* empty body → defaults below */ }

  try {
    // Stamp user_metadata.role='client' (idempotent — preserves other metadata
    // like full_name/password_set).
    const currentMeta = (user.user_metadata as Record<string, unknown>) || {}
    if (currentMeta.role !== 'client') {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...currentMeta, role: 'client' },
      })
    }

    const emailLocal = (user.email?.split('@')[0] || '').trim()
    const displayName = (body.company_name?.trim()) || emailLocal || 'Company'

    // Ensure the org profile + owner membership exist for a given org entity.
    // Used on the reuse path (idempotency) and the race path — insert only when
    // missing so re-runs never duplicate.
    const ensureOrgRows = async (org: OrgEntityLite) => {
      const { data: prof } = await admin
        .from('team_profiles').select('entity_id').eq('entity_id', org.id).maybeSingle()
      if (!prof) {
        await admin.from('team_profiles').insert({
          entity_id: org.id, team_name: org.display_name, services: [],
          // cap-stage 3: hires is a CHOSEN state (posting a job / opt-in toggle),
          // never forced by the signup door. A buyer is a member with an org;
          // hires stays false until they act.
          hires: false, offers_services: false, published: false,
        })
      }
      const { data: adm } = await admin
        .from('team_admins').select('id').eq('team_entity_id', org.id).eq('user_id', user.id).maybeSingle()
      if (!adm) {
        await admin.from('team_admins').insert({ team_entity_id: org.id, user_id: user.id, role: 'owner' })
      }
    }

    // ── Idempotency: reuse the buyer's existing org (one org per buyer). ──────
    // Note: old-era buyers hold a kind='human' entity, which this kind='org'
    // lookup intentionally ignores — a re-signup mints their org fresh.
    const { data: existingOrg } = await admin
      .from('entities')
      .select('id, display_name, slug')
      .eq('owner_user_id', user.id)
      .eq('kind', 'org')
      .limit(1)
      .maybeSingle()
    if (existingOrg) {
      await ensureOrgRows(existingOrg as OrgEntityLite)
      return NextResponse.json({
        entity_id: (existingOrg as OrgEntityLite).id,
        slug: (existingOrg as OrgEntityLite).slug,
        display_name: (existingOrg as OrgEntityLite).display_name,
        was_created: false,
      })
    }

    // ── Derive / validate the slug. ──────────────────────────────────────────
    let slug: string
    const providedSlug = body.slug?.trim()
    if (providedSlug) {
      if (!SLUG_RE.test(providedSlug)) {
        return NextResponse.json({ error: 'Invalid slug: must be 3–40 chars, lowercase letters/numbers/hyphens, no leading/trailing hyphen', field: 'slug' }, { status: 400 })
      }
      const { data: taken } = await admin
        .from('entities').select('id').eq('slug', providedSlug).limit(1).maybeSingle()
      if (taken) {
        return NextResponse.json({ error: 'Company slug already taken', slug: providedSlug }, { status: 409 })
      }
      slug = providedSlug
    } else {
      const base = normalizeSlug(displayName) || normalizeSlug(emailLocal) || 'company'
      slug = await generateUniqueSlug(admin, 'entities', base)
    }

    // ── Mint the org entity. ─────────────────────────────────────────────────
    let result
    try {
      result = await findOrCreateOrgEntity(admin, user, displayName, slug)
    } catch (err: any) {
      if (err?.code === '23505') {
        return NextResponse.json({ error: 'Company slug already taken', slug }, { status: 409 })
      }
      throw err
    }
    const entity = result.entity

    if (result.was_created) {
      // ── Org profile (published=false — completed/published on the dashboard). ─
      const { error: profileErr } = await admin.from('team_profiles').insert({
        entity_id: entity.id,
        team_name: displayName,
        services: [],
        hires: false, // cap-stage 3: chosen state (post a job / opt-in), not door-forced
        offers_services: false,
        published: false,
      })
      if (profileErr) {
        await admin.from('entities').delete().eq('id', entity.id)
        return NextResponse.json({ error: `Org profile insert failed: ${profileErr.message}` }, { status: 500 })
      }
      // ── Owner membership. ──────────────────────────────────────────────────
      const { error: adminErr } = await admin.from('team_admins').insert({
        team_entity_id: entity.id, user_id: user.id, role: 'owner',
      })
      if (adminErr) {
        await admin.from('team_profiles').delete().eq('entity_id', entity.id)
        await admin.from('entities').delete().eq('id', entity.id)
        return NextResponse.json({ error: `Org admin insert failed: ${adminErr.message}` }, { status: 500 })
      }
    } else {
      // Race/idempotent hit — entity already existed; ensure rows without dupes.
      await ensureOrgRows(entity as OrgEntityLite)
    }

    return NextResponse.json({
      entity_id: entity.id,
      slug: entity.slug,
      display_name: entity.display_name,
      was_created: result.was_created,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Buyer signup failed' }, { status: 500 })
  }
}
