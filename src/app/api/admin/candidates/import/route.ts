import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'oxleethomas+admin@gmail.com'

// =====================================================================
// POST /api/admin/candidates/import
//
// Bulk imports candidates from OX's CSV. Dry-run supported.
//
// Body:
// {
//   dryRun: boolean,
//   source: string,        // e.g. "shipstacked-launch", "wave-7-expanded"
//   rows: ImportRow[]
// }
//
// Required per row: github_username + x_handle (or x_url to parse).
// Everything else optional. Dedupe on github_username.
// =====================================================================

type ImportRow = {
  github_username?: string | null
  github_url?: string | null
  full_name?: string | null
  x_url?: string | null
  x_handle?: string | null
  email?: string | null
  bio?: string | null
  location?: string | null
  city?: string | null
  country?: string | null
  avatar_url?: string | null
  website_url?: string | null
  linkedin_url?: string | null
  primary_profession?: string | null
  day_rate?: string | null
  velocity_score?: number | string | null
  tier_quality?: string | null
  signal_strength?: number | string | null
  outreach_priority?: number | string | null
  source?: string | null
  shipping_evidence?: string | null
  top_repos?: unknown
}

type Summary = {
  dryRun: boolean
  totalRows: number
  validRows: number
  invalidRows: number
  duplicates: number
  noXHandle: number
  inserted: number
  errors: { row: number, reason: string }[]
  sample?: Record<string, unknown>[]
}

// Extract X handle from various URL forms or @-prefixed strings
function normalizeXHandle(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  // URL form
  const m = trimmed.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]+)/i)
  if (m) return m[1].toLowerCase()
  // @-prefixed
  const at = trimmed.match(/^@?([A-Za-z0-9_]{1,15})$/)
  if (at) return at[1].toLowerCase()
  return null
}

function parseInteger(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { dryRun?: boolean, source?: string, rows?: ImportRow[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const dryRun = !!body.dryRun
  const source = body.source?.trim() || 'unknown'
  const rows = Array.isArray(body.rows) ? body.rows : []

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }
  if (rows.length > 5000) {
    return NextResponse.json({ error: 'Max 5,000 rows per request. Split into batches.' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Pre-fetch existing github_usernames for dedup
  const { data: existing } = await admin
    .from('candidates')
    .select('github_username')

  const existingGH = new Set(
    (existing || []).map(r => r.github_username?.toLowerCase()).filter(Boolean) as string[]
  )

  const summary: Summary = {
    dryRun,
    totalRows: rows.length,
    validRows: 0,
    invalidRows: 0,
    duplicates: 0,
    noXHandle: 0,
    inserted: 0,
    errors: []
  }

  const toInsert: Record<string, unknown>[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]

    // Parse github_username
    const ghUsernameRaw = r.github_username
                       || (r.github_url ? r.github_url.match(/github\.com\/([A-Za-z0-9-]+)/i)?.[1] || null : null)
    const githubUsername = ghUsernameRaw ? ghUsernameRaw.toLowerCase() : null

    if (!githubUsername) {
      summary.invalidRows++
      summary.errors.push({ row: i, reason: 'No github_username or parseable github_url' })
      continue
    }

    // Parse X handle — required
    const xHandle = normalizeXHandle(r.x_handle) || normalizeXHandle(r.x_url)
    if (!xHandle) {
      summary.noXHandle++
      summary.errors.push({ row: i, reason: 'No X handle (required)' })
      continue
    }

    // Dedupe
    if (existingGH.has(githubUsername)) {
      summary.duplicates++
      continue
    }

    // Build location if not given but city/country present
    let location = r.location?.trim() || null
    if (!location && (r.city || r.country)) {
      location = [r.city, r.country].filter(Boolean).join(', ')
    }

    // Tier validation
    const tier = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'].includes((r.tier_quality || '').toUpperCase())
      ? (r.tier_quality as string).toUpperCase()
      : null

    // Top repos — accept JSON or array
    let topRepos: unknown = null
    if (r.top_repos) {
      if (typeof r.top_repos === 'string') {
        try { topRepos = JSON.parse(r.top_repos) } catch { topRepos = null }
      } else {
        topRepos = r.top_repos
      }
    }

    const candidate: Record<string, unknown> = {
      github_username: githubUsername,
      full_name: r.full_name?.trim() || ghUsernameRaw,
      x_handle: xHandle,
      x_url: r.x_url?.trim() || `https://x.com/${xHandle}`,
      email: r.email?.trim() || null,
      bio: r.bio?.trim() || null,
      location,
      city: r.city?.trim() || null,
      country: r.country?.trim() || null,
      avatar_url: r.avatar_url?.trim() || `https://github.com/${ghUsernameRaw}.png`,
      github_url: r.github_url?.trim() || `https://github.com/${ghUsernameRaw}`,
      website_url: r.website_url?.trim() || null,
      linkedin_url: r.linkedin_url?.trim() || null,
      primary_profession: r.primary_profession?.trim() || null,
      day_rate: r.day_rate?.trim() || null,
      velocity_score: parseInteger(r.velocity_score) ?? 0,
      top_repos: topRepos,
      shipping_evidence: r.shipping_evidence?.trim() || null,
      tier,
      signal_strength: parseInteger(r.signal_strength) ?? 1,
      outreach_priority: parseInteger(r.outreach_priority),
      source: r.source?.trim() || source,
      status: 'new',
    }

    toInsert.push(candidate)
    existingGH.add(githubUsername) // catch within-batch duplicates
    summary.validRows++
  }

  if (dryRun) {
    return NextResponse.json({
      ...summary,
      sample: toInsert.slice(0, 3)
    })
  }

  // Real insert in chunks
  const CHUNK_SIZE = 200
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE)
    const { data: inserted, error } = await admin
      .from('candidates')
      .insert(chunk)
      .select('id')

    if (error) {
      console.error('[candidates/import] chunk failed:', error)
      summary.errors.push({ row: i, reason: `Chunk insert failed: ${error.message}` })
      continue
    }
    summary.inserted += inserted?.length || 0
  }

  return NextResponse.json(summary)
}
