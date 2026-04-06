import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import NativeShareDetailButton from './NativeShareButton'
import FeedPostCTA from './FeedPostCTA'
import { getResolvedUser } from '@/lib/user'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: post } = await supabase
    .from('posts')
    .select('title, problem_solved, outcome, tools_used, created_at, profiles(full_name, username, verified)')
    .eq('id', id)
    .maybeSingle()

  if (!post) return { title: 'Build not found' }
  const profile = post.profiles as any
  const builderName = profile?.full_name || 'Builder'
  const title = `${post.title} — built by ${builderName} | ShipStacked`
  const descParts = [
    post.problem_solved ? `Problem: ${post.problem_solved}` : null,
    post.outcome ? `Outcome: ${post.outcome}` : null,
    post.tools_used ? `Built with ${post.tools_used}.` : null,
  ].filter(Boolean)
  const description = descParts.length > 0
    ? descParts.join(' · ')
    : `${builderName} shipped "${post.title}" on ShipStacked — the proof-of-work platform for AI-native builders.`

  const url = `https://shipstacked.com/feed/${id}`
  const ogImage = `https://shipstacked.com/og?type=post&id=${id}&title=${encodeURIComponent(post.title)}&author=${encodeURIComponent(builderName)}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${post.title} — ${builderName}`,
      description,
      url,
      type: 'article',
      publishedTime: post.created_at,
      authors: [`https://shipstacked.com/u/${profile?.username}`],
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} — ${builderName}`,
      description,
      images: [ogImage],
    },
  }
}

export default async function FeedPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: post } = await supabase
    .from('posts')
    .select('*, profiles(id, username, full_name, avatar_url, verified, github_connected, role, location, accepts_project_inquiries)')
    .eq('id', id)
    .maybeSingle()

  if (!post) notFound()

  const { role, user: resolvedUser } = await getResolvedUser()
  const profile = post.profiles as any
  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const isOwnPost = resolvedUser?.email === profile?.email

  const xShareText = [
    `Just shipped: ${post.title}`,
    post.problem_solved ? `\nProblem: ${post.problem_solved}` : '',
    post.outcome ? `\nOutcome: ${post.outcome}` : '',
    post.tools_used ? `\nBuilt with: ${post.tools_used}` : '',
    `\n\nFull build → shipstacked.com/feed/${id}`,
    '\n#shipstacked #buildinpublic #vibecoding',
  ].join('')
  const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(xShareText)}`
  const liShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://shipstacked.com/feed/${id}`)}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.problem_solved || post.outcome || `${profile?.full_name} shipped this on ShipStacked`,
    datePublished: post.created_at,
    author: {
      '@type': 'Person',
      name: profile?.full_name,
      url: `https://shipstacked.com/u/${profile?.username}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ShipStacked',
      url: 'https://shipstacked.com',
      logo: { '@type': 'ImageObject', url: 'https://shipstacked.com/icon.svg' },
    },
    url: `https://shipstacked.com/feed/${id}`,
    mainEntityOfPage: `https://shipstacked.com/feed/${id}`,
    ...(post.url && { isBasedOn: post.url }),
    ...(post.tools_used && { keywords: post.tools_used }),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>
          <Link href="/feed" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '2rem' }}>
            ← Build Feed
          </Link>

          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <Link href={`/u/${profile?.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 15, fontWeight: 700, color: '#0071e3' }}>{initials}</span>
                  }
                </div>
              </Link>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <Link href={`/u/${profile?.username}`} style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', textDecoration: 'none' }}>
                    {profile?.full_name}
                  </Link>
                  {profile?.verified && <span style={{ fontSize: 10, fontWeight: 600, color: '#0071e3', background: '#e8f1fd', padding: '0.1rem 0.4rem', borderRadius: 980 }}>✓ Verified</span>}
                </div>
                <p style={{ fontSize: 12, color: '#aeaeb2' }}>
                  {profile?.role ? `${profile.role} · ` : ''}
                  {new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <a href={xShareUrl} target="_blank" rel="noopener noreferrer"
                  style={{ width: 34, height: 34, borderRadius: '50%', background: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href={liShareUrl} target="_blank" rel="noopener noreferrer"
                  style={{ width: 34, height: 34, borderRadius: '50%', background: '#0077b5', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <NativeShareDetailButton postId={id} title={post.title} builderName={profile?.full_name || ''} />
              </div>
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '1.5rem', lineHeight: 1.3 }}>
              {post.url
                ? <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1d1d1f', textDecoration: 'none' }}>{post.title} <span style={{ color: '#aeaeb2' }}>↗</span></a>
                : post.title
              }
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {post.problem_solved && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Problem solved</p>
                  <p style={{ fontSize: 15, color: '#3d3d3f', lineHeight: 1.65 }}>{post.problem_solved}</p>
                </div>
              )}
              {post.outcome && (
                <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 10, padding: '0.875rem 1rem' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#1a7f37', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Outcome</p>
                  <p style={{ fontSize: 15, color: '#1d1d1f', lineHeight: 1.65, fontWeight: 500 }}>{post.outcome}</p>
                </div>
              )}
              {post.what_built && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>What it does</p>
                  <p style={{ fontSize: 15, color: '#3d3d3f', lineHeight: 1.65 }}>{post.what_built}</p>
                </div>
              )}
              {(post.tools_used || post.time_taken) && (
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  {post.tools_used && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Built with</p>
                      <p style={{ fontSize: 14, color: '#3d3d3f' }}>{post.tools_used}</p>
                    </div>
                  )}
                  {post.time_taken && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Time taken</p>
                      <p style={{ fontSize: 14, color: '#3d3d3f' }}>{post.time_taken}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {Object.keys((post.reactions as Record<string, number>) || {}).length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', paddingTop: '1rem', borderTop: '0.5px solid #e0e0e5', flexWrap: 'wrap' }}>
                {(['🔥','🚀','🛠️','👍'] as string[]).map(emoji => {
                  const reactions = (post.reactions as Record<string, number>) || {}
                  if (!reactions[emoji]) return null
                  return (
                    <div key={emoji} style={{ background: '#f5f5f7', border: '1px solid #e0e0e5', borderRadius: 980, padding: '0.3rem 0.65rem', fontSize: 13, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {emoji}<span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500 }}>{reactions[emoji]}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <FeedPostCTA
            role={role}
            isOwnPost={isOwnPost}
            builderFirstName={profile?.full_name?.split(' ')[0] || ''}
            builderUsername={profile?.username || ''}
            builderProfileId={profile?.id || ''}
            postId={id}
            postTitle={post.title}
            acceptsInquiries={profile?.accepts_project_inquiries !== false}
          />

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link href="/feed" style={{ fontSize: 13, color: '#aeaeb2', textDecoration: 'none' }}>
              ← Back to the Build Feed
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
