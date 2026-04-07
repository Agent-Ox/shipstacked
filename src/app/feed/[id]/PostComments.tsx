'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

function timeAgo(date: string) {
  const now = new Date()
  const d = new Date(date)
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago'
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export default function PostComments({ postId, isLoggedIn }: { postId: string, isLoggedIn: boolean }) {
  const [comments, setComments] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const PREVIEW_COUNT = 5

  useEffect(() => {
    fetch('/api/comments?post_id=' + postId)
      .then(r => r.json())
      .then(({ comments }) => setComments(comments || []))
      .catch(() => {})
      .finally(() => setLoading(false))

    const supabase = createClient()
    const channel = supabase
      .channel('post-comments-' + postId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'post_comments',
        filter: `post_id=eq.${postId}`,
      }, (payload) => {
        const c = payload.new as any
        setComments(prev => prev.some(x => x.id === c.id) ? prev : [...prev, c])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [postId])

  const submit = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, content: input.trim() }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed') }
      else { setInput(''); setReplyTo(null) }
    } catch { setError('Something went wrong.') }
    finally { setSending(false) }
  }

  const displayComments = showAll ? comments : comments.slice(-PREVIEW_COUNT)
  const hiddenCount = comments.length - PREVIEW_COUNT

  const getRoleLabel = (role: string) => {
    if (role === 'employer') return { label: 'Employer', color: '#0071e3', bg: '#e8f1fd' }
    if (role === 'builder') return { label: 'Builder', color: '#1a7f37', bg: '#e3f3e3' }
    return null
  }

  return (
    <div style={{ marginTop: '1.5rem', borderTop: '0.5px solid #e0e0e5', paddingTop: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Comments {comments.length > 0 && <span style={{ color: '#0071e3' }}>{comments.length}</span>}
        </p>
      </div>

      <div>
        {loading ? (
          <p style={{ fontSize: 13, color: '#aeaeb2' }}>Loading...</p>
        ) : comments.length === 0 ? (
          <p style={{ fontSize: 13, color: '#aeaeb2' }}>
            No comments yet. {isLoggedIn ? 'Be the first.' : 'Sign in to comment.'}
          </p>
        ) : (
          <>
            {!showAll && hiddenCount > 0 && (
              <button onClick={() => setShowAll(true)}
                style={{ fontSize: 13, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, padding: '0.25rem 0', marginBottom: '0.5rem', display: 'block' }}>
                Show {hiddenCount} earlier comment{hiddenCount !== 1 ? 's' : ''}
              </button>
            )}
            {displayComments.map((c: any) => {
              const rl = getRoleLabel(c.author_role)
              const initials = c.author_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
              return (
                <div key={c.id} style={{ padding: '0.75rem 0', borderBottom: '0.5px solid #f5f5f7', display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0071e3', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      {c.author_username
                        ? <a href={'/u/' + c.author_username} style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', textDecoration: 'none' }}>{c.author_name}</a>
                        : <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{c.author_name}</span>
                      }
                      {rl && <span style={{ fontSize: 10, fontWeight: 600, color: rl.color, background: rl.bg, padding: '0.1rem 0.4rem', borderRadius: 980 }}>{rl.label}</span>}
                      <span style={{ fontSize: 12, color: '#aeaeb2' }}>{timeAgo(c.created_at)}</span>
                      {isLoggedIn && <button onClick={() => { setReplyTo(c.author_name); setInput('@' + c.author_name + ' ') }} style={{ fontSize: 11, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, fontWeight: 500 }}>Reply</button>}
                    </div>
                    <p style={{ fontSize: 14, color: '#3d3d3f', lineHeight: 1.6 }}>{c.content}</p>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {isLoggedIn ? (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            placeholder={replyTo ? 'Replying to @' + replyTo + '...' : 'Add a comment...'}
            rows={2}
            style={{ flex: 1, border: '1px solid #e0e0e5', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', color: '#1d1d1f' }}
          />
          <button onClick={submit} disabled={sending || !input.trim()}
            style={{ padding: '0.5rem 1rem', background: sending || !input.trim() ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {sending ? 'Posting...' : 'Post'}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, color: '#6e6e73' }}>Sign in to join the conversation.</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a href="/login" style={{ fontSize: 13, padding: '0.4rem 0.875rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Sign in</a>
            <a href="/signup" style={{ fontSize: 13, padding: '0.4rem 0.875rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Create account</a>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: 13, color: '#c00', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}
