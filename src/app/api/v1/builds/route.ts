import { authenticateApiKey, apiError, apiOk } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'
import { checkAutoVerify } from '@/lib/autoVerify'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
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

  // title is required
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    return apiError(400, 'title is required')
  }

  // outcome + url = required for auto-verification to trigger
  // We allow posting without them but flag it in the response
  const post = {
    profile_id: profile.id,
    title: body.title.trim(),
    what_built: body.what_built || null,
    problem_solved: body.problem_solved || null,
    outcome: body.outcome || null,
    tools_used: body.tools_used || null,
    time_taken: body.time_taken || null,
    url: body.url || null,
    reactions: {},
  }

  const { data: inserted, error } = await db
    .from('posts')
    .insert(post)
    .select()
    .single()

  if (error) return apiError(500, 'Failed to create build post', error.message)

  // Trigger velocity recalculation fire-and-forget
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  db.from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .gte('created_at', cutoff.toISOString())
    .then(() => {})

  // Fire auto-verify check
  const nowVerified = await checkAutoVerify(profile.id)

  const hasOutcomeAndUrl = !!(post.outcome && post.url)

  return apiOk({
    build_posted: true,
    post_id: inserted.id,
    post_url: `https://shipstacked.com/feed/${inserted.id}`,
    verified: nowVerified,
    verification_tip: hasOutcomeAndUrl
      ? null
      : 'Include both outcome and url in your build posts to count towards auto-verification',
  })
}

// GET - list this builder's builds
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)

  const { profile } = auth.auth
  const db = admin()

  const { data: posts } = await db
    .from('posts')
    .select('id, title, outcome, tools_used, time_taken, url, created_at')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return apiOk({ builds: posts || [] })
}
