'use client'

import { useState } from 'react'
import Link from 'next/link'

const REACTIONS = ['🔥', '🚀', '🛠️', '👍']

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function buildXShareUrl(post: any, username: string) {
  const text = [
    `Just shipped: ${post.title}`,
    post.problem_solved ? `\nProblem: ${post.problem_solved}` : '',
    post.tools_used ? `\nBuilt with: ${post.tools_used}` : '',
    post.time_taken ? `\nTime: ${post.time_taken}` : '',
    `\n\nMy ShipStacked profile → shipstacked.com/u/${username}`,
    '\n#shipstacked #buildinpublic #vibecoding',
  ].join('')
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`
}

function PostCard({ post, onReact }: { post: any, onReact: (postId: string, emoji: string) => void }) {
  const profile = post.profiles
  const username = profile?.username || ''
  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const reactions = (post.reactions as Record<string, number>) || {}

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e0e0e5',
      borderRadius: 16,
      padding: '1.5rem',
      marginBottom: '1rem',
    }}>
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Link href={`/u/${username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 13, fontWeight: 700, color: '#0071e3' }}>{initials}</span>
            }
          </div>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <Link href={`/u/${username}`} style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', textDecoration: 'none' }}>
              {profile?.full_name || 'Builder'}
            </Link>
            {profile?.verified && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#0071e3', background: '#e8f1fd', padding: '0.1rem 0.4rem', borderRadius: 980 }}>✓ Verified</span>
            )}
            {profile?.github_connected && (
              <span style={{ fontSize: 10, color: '#6e6e73' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#6e6e73" style={{ verticalAlign: 'middle' }}>
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#aeaeb2' }}>{timeAgo(post.created_at)}</p>
        </div>
        {/* X share */}
        <a href={buildXShareUrl(post, username)} target="_blank"
          style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
          title="Share on X">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#1d1d1f">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
      </div>

      {/* Title */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.75rem', lineHeight: 1.3 }}>
        {post.url
          ? <a href={post.url} target="_blank" style={{ color: '#1d1d1f', textDecoration: 'none' }}>{post.title} ↗</a>
          : post.title
        }
      </h2>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {post.problem_solved && (
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: 13 }}>
            <span style={{ color: '#aeaeb2', fontWeight: 500, flexShrink: 0, minWidth: 80 }}>Problem</span>
            <span style={{ color: '#3d3d3f', lineHeight: 1.5 }}>{post.problem_solved}</span>
          </div>
        )}
        {post.tools_used && (
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: 13 }}>
            <span style={{ color: '#aeaeb2', fontWeight: 500, flexShrink: 0, minWidth: 80 }}>Built with</span>
            <span style={{ color: '#3d3d3f', lineHeight: 1.5 }}>{post.tools_used}</span>
          </div>
        )}
        {post.time_taken && (
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: 13 }}>
            <span style={{ color: '#aeaeb2', fontWeight: 500, flexShrink: 0, minWidth: 80 }}>Time</span>
            <span style={{ color: '#3d3d3f' }}>{post.time_taken}</span>
          </div>
        )}
        {post.what_built && (
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: 13 }}>
            <span style={{ color: '#aeaeb2', fontWeight: 500, flexShrink: 0, minWidth: 80 }}>What</span>
            <span style={{ color: '#3d3d3f', lineHeight: 1.5 }}>{post.what_built}</span>
          </div>
        )}
      </div>

      {/* Reactions */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {REACTIONS.map(emoji => (
          <button
            key={emoji}
            onClick={() => onReact(post.id, emoji)}
            style={{
              background: '#f5f5f7', border: '1px solid #e0e0e5',
              borderRadius: 980, padding: '0.3rem 0.65rem',
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e8e8ed')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f5f5f7')}
          >
            {emoji}
            {reactions[emoji] ? <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500 }}>{reactions[emoji]}</span> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FeedClient({ initialPosts }: { initialPosts: any[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialPosts.length === 20)

  const handleReact = async (postId: string, emoji: string) => {
    const res = await fetch('/api/feed', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, emoji }),
    })
    if (res.ok) {
      const { reactions } = await res.json()
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions } : p))
    }
  }

  const loadMore = async () => {
    setLoading(true)
    const res = await fetch(`/api/feed?limit=20&offset=${posts.length}`)
    if (res.ok) {
      const { posts: more } = await res.json()
      setPosts(prev => [...prev, ...more])
      setHasMore(more.length === 20)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Build Feed</p>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>What's being shipped</h1>
          <p style={{ fontSize: 15, color: '#6e6e73' }}>Real builds from AI-native builders. Proof of work, not promises.</p>
        </div>

        {/* CTA for builders */}
        <div style={{ background: 'linear-gradient(135deg, #0f0f18, #1a1a2e)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: 14, color: 'rgba(240,240,245,0.85)', fontWeight: 500 }}>Built something? Add it to the feed.</p>
          <a href="/dashboard" style={{ fontSize: 13, padding: '0.5rem 1.1rem', background: 'rgba(108,99,255,0.8)', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Post a build →
          </a>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: '1rem' }}>🚀</p>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>No builds yet.</h2>
            <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '1.5rem' }}>Be the first to post what you've shipped.</p>
            <a href="/dashboard" style={{ padding: '0.75rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Post your first build →
            </a>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <PostCard key={post.id} post={post} onReact={handleReact} />
            ))}
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button onClick={loadMore} disabled={loading}
                  style={{ padding: '0.75rem 2rem', background: loading ? '#d2d2d7' : '#f5f5f7', color: '#1d1d1f', border: 'none', borderRadius: 980, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
