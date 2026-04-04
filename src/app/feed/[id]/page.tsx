import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: post } = await supabase
    .from('posts')
    .select('title, problem_solved, profiles(full_name)')
    .eq('id', id)
    .maybeSingle()

  if (!post) return { title: 'Build not found' }
  const profile = post.profiles as any
  return {
    title: `${post.title} — ${profile?.full_name || 'Builder'} on ShipStacked`,
    description: post.problem_solved || `${profile?.full_name} shipped: ${post.title}`,
    openGraph: {
      title: post.title,
      description: post.problem_solved || `Shipped by ${profile?.full_name} on ShipStacked`,
      url: `https://shipstacked.com/feed/${id}`,
    },
  }
}

export default async function FeedPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: post } = await supabase
    .from('posts')
    .select('*, profiles(username, full_name, avatar_url, verified, github_connected)')
    .eq('id', id)
    .maybeSingle()

  if (!post) notFound()

  const profile = post.profiles as any
  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  const xShareText = [
    `Just shipped: ${post.title}`,
    post.problem_solved ? `\nProblem: ${post.problem_solved}` : '',
    post.tools_used ? `\nBuilt with: ${post.tools_used}` : '',
    post.time_taken ? `\nTime: ${post.time_taken}` : '',
    `\n\nFull build → shipstacked.com/feed/${id}`,
    '\n#shipstacked #buildinpublic #vibecoding',
  ].join('')

  const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(xShareText)}`
  const liShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://shipstacked.com/feed/${id}`)}`

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>
        <Link href="/feed" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '2rem' }}>
          ← Build Feed
        </Link>

        <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '2rem' }}>
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Link href={`/u/${profile?.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 15, fontWeight: 700, color: '#0071e3' }}>{initials}</span>
                }
              </div>
            </Link>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Link href={`/u/${profile?.username}`} style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', textDecoration: 'none' }}>
                  {profile?.full_name}
                </Link>
                {profile?.verified && <span style={{ fontSize: 10, fontWeight: 600, color: '#0071e3', background: '#e8f1fd', padding: '0.1rem 0.4rem', borderRadius: 980 }}>✓ Verified</span>}
              </div>
              <p style={{ fontSize: 12, color: '#aeaeb2' }}>{new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <a href={xShareUrl} target="_blank" style={{ width: 34, height: 34, borderRadius: '50%', background: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href={liShareUrl} target="_blank" style={{ width: 34, height: 34, borderRadius: '50%', background: '#0077b5', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '1.5rem', lineHeight: 1.3 }}>
            {post.url
              ? <a href={post.url} target="_blank" style={{ color: '#1d1d1f', textDecoration: 'none' }}>{post.title} ↗</a>
              : post.title
            }
          </h1>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {post.problem_solved && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Problem</p>
                <p style={{ fontSize: 15, color: '#3d3d3f', lineHeight: 1.6 }}>{post.problem_solved}</p>
              </div>
            )}
            {post.outcome && (
              <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 10, padding: '0.875rem 1rem' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#1a7f37', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Outcome</p>
                <p style={{ fontSize: 15, color: '#1d1d1f', lineHeight: 1.6 }}>{post.outcome}</p>
              </div>
            )}
            {post.what_built && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>What it does</p>
                <p style={{ fontSize: 15, color: '#3d3d3f', lineHeight: 1.6 }}>{post.what_built}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {post.tools_used && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Built with</p>
                  <p style={{ fontSize: 14, color: '#3d3d3f' }}>{post.tools_used}</p>
                </div>
              )}
              {post.time_taken && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Time</p>
                  <p style={{ fontSize: 14, color: '#3d3d3f' }}>{post.time_taken}</p>
                </div>
              )}
            </div>
          </div>

          {/* Reactions */}
          <div style={{ display: 'flex', gap: '0.4rem', paddingTop: '1rem', borderTop: '0.5px solid #e0e0e5' }}>
            {(['🔥','🚀','🛠️','👍'] as string[]).map(emoji => {
              const reactions = (post.reactions as Record<string, number>) || {}
              return (
                <div key={emoji} style={{ background: '#f5f5f7', border: '1px solid #e0e0e5', borderRadius: 980, padding: '0.3rem 0.65rem', fontSize: 13, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {emoji}
                  {reactions[emoji] ? <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500 }}>{reactions[emoji]}</span> : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* Back to profile */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link href={`/u/${profile?.username}`} style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>
            View {profile?.full_name?.split(' ')[0]}'s full profile →
          </Link>
        </div>
      </div>
    </div>
  )
}
