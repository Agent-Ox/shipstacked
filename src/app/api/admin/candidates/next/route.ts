import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'oxleethomas+admin@gmail.com'

// =====================================================================
// GET /api/admin/candidates/next?tier=GOLD&country=US&exclude=<id>,<id>
//
// Returns the next-best candidate to contact, by priority order:
//   1. Filter to status='new' (uncontacted)
//   2. Apply tier filter if set (PLATINUM, GOLD, SILVER, BRONZE)
//   3. Apply country filter if set
//   4. Exclude any IDs in the exclude param (skipped this session)
//   5. Order by tier rank (PLATINUM > GOLD > SILVER > BRONZE), then
//      outreach_priority ASC, then velocity_score DESC
//   6. Return single candidate plus session stats
//
// Used by the queue UI to fetch one builder at a time.
// =====================================================================

const TIER_RANK: Record<string, number> = {
  PLATINUM: 1, GOLD: 2, SILVER: 3, BRONZE: 4
}

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const tier    = searchParams.get('tier') || ''
  const country = searchParams.get('country') || ''
  const exclude = (searchParams.get('exclude') || '').split(',').filter(Boolean)

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = admin
    .from('candidates')
    .select('id, github_username, full_name, x_handle, x_url, bio, location, country, primary_profession, top_repos, shipping_evidence, tier, velocity_score, outreach_priority, signal_strength, avatar_url, github_url, website_url')
    .eq('status', 'new')

  if (tier && Object.prototype.hasOwnProperty.call(TIER_RANK, tier)) {
    query = query.eq('tier', tier)
  } else {
    // Default: only PLATINUM/GOLD/SILVER/BRONZE (skip null)
    query = query.in('tier', ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'])
  }

  if (country) {
    query = query.ilike('country', `%${country}%`)
  }

  if (exclude.length > 0) {
    query = query.not('id', 'in', `(${exclude.join(',')})`)
  }

  // Sort: tier ASC (PLATINUM first via custom rank), priority ASC, velocity DESC
  // Supabase doesn't support custom rank ORDER BY easily — pull a chunk and sort in memory
  query = query.limit(50)  // pull top 50, then in-memory sort for tier rank

  const { data: candidates, error } = await query

  if (error) {
    console.error('[next] query failed:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!candidates || candidates.length === 0) {
    // Get total stats so UI knows we're done
    const { count: totalNew } = await admin
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')

    return NextResponse.json({
      candidate: null,
      stats: {
        remaining_with_filters: 0,
        total_new: totalNew || 0,
      }
    })
  }

  // Sort: tier rank, priority, velocity
  const sorted = [...candidates].sort((a, b) => {
    const ar = TIER_RANK[a.tier || 'BRONZE'] || 99
    const br = TIER_RANK[b.tier || 'BRONZE'] || 99
    if (ar !== br) return ar - br

    const ap = a.outreach_priority ?? Number.MAX_SAFE_INTEGER
    const bp = b.outreach_priority ?? Number.MAX_SAFE_INTEGER
    if (ap !== bp) return ap - bp

    return (b.velocity_score || 0) - (a.velocity_score || 0)
  })

  const next = sorted[0]

  // Session stats: how many remain with these filters?
  let countQuery = admin
    .from('candidates')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new')

  if (tier && Object.prototype.hasOwnProperty.call(TIER_RANK, tier)) {
    countQuery = countQuery.eq('tier', tier)
  } else {
    countQuery = countQuery.in('tier', ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'])
  }
  if (country) countQuery = countQuery.ilike('country', `%${country}%`)

  const { count: remainingWithFilters } = await countQuery

  // Today's send count
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: sentToday } = await admin
    .from('outreach_log')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', oneDayAgo)

  return NextResponse.json({
    candidate: next,
    stats: {
      remaining_with_filters: (remainingWithFilters || 0) - exclude.length,
      sent_today: sentToday || 0,
    }
  })
}
