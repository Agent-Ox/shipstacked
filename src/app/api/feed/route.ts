import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { checkAutoVerify } from '@/lib/autoVerify'

// GET — fetch feed posts (public)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const profile_id = searchParams.get('profile_id')
  const featured = searchParams.get('featured') === '1'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let query = supabase
    .from('posts')
    .select('*, profiles(username, full_name, avatar_url, verified, github_connected)')
    .range(offset, offset + limit - 1)

  if (featured) {
    query = query.eq('featured', true).order('featured_order', { ascending: true, nullsFirst: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  if (profile_id) {
    query = query.eq('profile_id', profile_id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data })
}

// Sanitize text — remove Unicode replacement characters from broken emoji
function sanitize(text: string | null | undefined): string | null {
  if (!text) return null
  return text.replace(/�/g, '').replace(/\s+/g, ' ').trim() || null
}

// POST — create a new post
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const { title, what_built, problem_solved, outcome, tools_used, time_taken, url } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'No builder profile found' }, { status: 400 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: post, error } = await adminSupabase
    .from('posts')
    .insert([{
      profile_id: profile.id,
      title: sanitize(title) || title.trim(),
      what_built: sanitize(what_built),
      problem_solved: sanitize(problem_solved),
      outcome: sanitize(outcome),
      tools_used: sanitize(tools_used),
      time_taken: sanitize(time_taken),
      url: url?.trim() || null,
      reactions: {},
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Check auto-verification criteria after every new post
  try {
    await checkAutoVerify(profile.id)
  } catch (e) {
    console.error('Auto-verify check failed:', e)
  }

  return NextResponse.json({ post })
}

// PATCH — add/toggle a reaction
export async function PATCH(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { post_id, emoji } = await req.json()
  if (!post_id || !emoji) {
    return NextResponse.json({ error: 'post_id and emoji required' }, { status: 400 })
  }

  const ALLOWED_REACTIONS = ['🔥', '🚀', '🛠️', '👍']
  if (!ALLOWED_REACTIONS.includes(emoji)) {
    return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: post } = await adminSupabase
    .from('posts')
    .select('reactions')
    .eq('id', post_id)
    .maybeSingle()

  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const reactions = (post.reactions as Record<string, number>) || {}
  reactions[emoji] = (reactions[emoji] || 0) + 1

  const { error } = await adminSupabase
    .from('posts')
    .update({ reactions })
    .eq('id', post_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reactions })
}

// DELETE — remove own post
export async function DELETE(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { post_id } = await req.json()
  if (!post_id) return NextResponse.json({ error: 'post_id required' }, { status: 400 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify ownership via profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 400 })

  const { error } = await adminSupabase
    .from('posts')
    .delete()
    .eq('id', post_id)
    .eq('profile_id', profile.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
