'use client'

import { useState } from 'react'

interface FeedPostCTAProps {
  role: string | null
  isOwnPost: boolean
  builderFirstName: string
  builderUsername: string
  builderProfileId: string
  postId: string
  acceptsInquiries: boolean
}

export default function FeedPostCTA({
  role,
  isOwnPost,
  builderFirstName,
  builderUsername,
  builderProfileId,
  postId,
  acceptsInquiries,
}: FeedPostCTAProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (isOwnPost) return null
  if (role === 'employer') return null

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          post_id: postId,
          builder_profile_id: builderProfileId,
        }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {acceptsInquiries && (
        <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '1.5rem' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0071e3', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Want this built?
          </p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '1rem' }}>
            Send {builderFirstName} a message
          </p>
          {sent ? (
            <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 10, padding: '1rem', fontSize: 14, color: '#1a7f37', fontWeight: 500 }}>
              Message sent — {builderFirstName} will be in touch.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: 10, border: '1px solid #e0e0e5', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: 10, border: '1px solid #e0e0e5', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
              <textarea
                placeholder="What do you need built?"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: 10, border: '1px solid #e0e0e5', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
              {error && <p style={{ fontSize: 13, color: '#ff3b30' }}>{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={sending}
                style={{ padding: '0.7rem 1.25rem', background: sending ? '#aeaeb2' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 14, fontWeight: 500, cursor: sending ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '1.5rem' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Hiring?
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>
          Get full access to the talent directory
        </p>
        <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6, marginBottom: '1rem' }}>
          Search verified AI builders, message them directly, and post roles. $199/month.
        </p>
        
          href="/#pricing"
          style={{ display: 'inline-block', padding: '0.7rem 1.25rem', background: '#1d1d1f', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
        >
          See employer plans →
        </a>
      </div>

    </div>
  )
}
