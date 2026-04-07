import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const post_id = searchParams.get('post_id')
  if (!post_id) return NextResponse.json({ error: 'post_id required' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await admin.from('post_comments').select('*').eq('post_id', post_id).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data })
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { post_id, content } = await req.json()
  if (!post_id || !content?.trim()) return NextResponse.json({ error: 'post_id and content required' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const metaRole = user.user_metadata?.role || 'builder'
  let authorName = user.user_metadata?.full_name || user.email || 'Anonymous'
  const { data: profile } = await admin.from('profiles').select('full_name, role, username').eq('email', user.email).maybeSingle()
  if (profile?.full_name) authorName = profile.full_name
  const { data: comment, error } = await admin.from('post_comments').insert({ post_id, author_email: user.email, author_name: authorName, author_username: profile?.username || null, author_role: profile?.role || metaRole, content: content.trim() }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try {
    const { data: post } = await admin.from('posts').select('title, profiles(email, full_name)').eq('id', post_id).maybeSingle()
    const postProfile = post?.profiles as any
    if (postProfile?.email && postProfile.email !== user.email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'
      await resend.emails.send({
        from: 'ShipStacked <hello@shipstacked.com>',
        to: postProfile.email,
        subject: authorName + ' commented on your build',
        html: `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:2rem"><h2 style="font-size:20px;font-weight:700;color:#1d1d1f;margin-bottom:0.5rem">New comment on your build</h2><p style="color:#6e6e73;font-size:14px;margin-bottom:0.75rem"><strong>${authorName}</strong> commented on <em>"${post?.title || 'your build'}"</em></p><div style="background:#f5f5f7;border-radius:10px;padding:1rem;margin-bottom:1.5rem;font-size:14px;color:#3d3d3f;line-height:1.6;border-left:3px solid #0071e3">${content.trim()}</div><a href="${siteUrl}/feed/${post_id}" style="display:inline-block;padding:0.75rem 1.5rem;background:#0071e3;color:white;border-radius:20px;text-decoration:none;font-size:14px;font-weight:500">View and reply</a><hr style="border:none;border-top:1px solid #e0e0e5;margin:1.5rem 0"><p style="color:#aeaeb2;font-size:12px">ShipStacked</p></div>`
      })
    }
  } catch (e) { console.error('Notification failed:', e) }
  return NextResponse.json({ comment })
}
