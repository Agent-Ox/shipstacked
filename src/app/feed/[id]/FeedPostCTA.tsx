'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  role: 'visitor' | 'builder' | 'employer' | 'client' | null
  isOwnPost: boolean
  builderName: string
  builderFirstName: string
  builderUsername: string
  builderProfileId: string
  postId: string
  postTitle: string
  acceptsInquiries: boolean
}

export default function FeedPostCTA({
  role, isOwnPost, builderName, builderFirstName,
  builderUsername, builderProfileId, postId, postTitle, acceptsInquiries
}: Props) {

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const submit = async () => {
    if (!name || !email || !message) return
    setState('sending')
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, post_id: postId, builder_profile_id: builderProfileId })
      })
      if (res.ok) {
        setState('sent')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  // Builder's own post — no CTA
  if (isOwnPost) return null

  // Another builder — no contact CTA, just profile link
  if (role === 'builder') {
    return (
      <div style={{ marginTop: '1.5rem', background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.15rem' }}>More builds from {builderFirstName}</p>
          <p style={{ fontSize: 13, color: '#6e6e73' }}>See their full proof-of-work record on ShipStacked</p>
        </div>
        <Link href={`/u/${builderUsername}`}
          style={{ fontSize: 13, padding: '0.5rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
          View profile →
        </Link>
      </div>
    )
  }

  // Employer — their normal message flow, no mention of project inquiries
  if (role === 'employer') {
    return (
      <div style={{ marginTop: '1.5rem', background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.15rem' }}>Interested in {builderFirstName}?</p>
          <p style={{ fontSize: 13, color: '#6e6e73' }}>Send them a message directly on ShipStacked</p>
        </div>
        <Link href={`/employer/messages?new=${builderProfileId}`}
          style={{ fontSize: 13, padding: '0.5rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
          Message {builderFirstName} →
        </Link>
      </div>
    )
  }

  // Visitor or client — dual CTA
  const dividerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, margin: '1.5rem 0 1rem'
  }
  const lineStyle: React.CSSProperties = {
    flex: 1, height: 1, background: '#e0e0e5'
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Divider */}
      <div style={dividerStyle}>
        <div style={lineStyle} />
        <span style={{ fontSize: 12, color: '#aeaeb2', whiteSpace: 'nowrap' }}>work with {builderFirstName}</span>
        <div style={lineStyle} />
      </div>

      {/* Two cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Client — project enquiry */}
        <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.25rem' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Want this built?
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.35, marginBottom: '0.35rem' }}>
            Get something like this for your business
          </p>
          <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, marginBottom: '0.875rem' }}>
            Tell {builderFirstName} what you need. Free to enquire.
          </p>

          {!acceptsInquiries ? (
            <p style={{ fontSize: 12, color: '#aeaeb2', fontStyle: 'italic' }}>
              {builderFirstName} is not currently taking on new projects.
            </p>
          ) : state === 'sent' ? (
            <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 10, padding: '0.75rem' }}>
              <p style={{ fontSize: 13, color: '#1a7f37', fontWeight: 500, marginBottom: '0.25rem' }}>✓ Message sent</p>
              <p style={{ fontSize: 12, color: '#1a7f37' }}>Check your email — we'll notify you when {builderFirstName} replies.</p>
            </div>
          ) : !showForm ? (
            <button onClick={() => setShowForm(true)}
              style={{ width: '100%', padding: '0.55rem', background: '#1d1d1f', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Contact {builderFirstName} →
            </button>
          ) : (
            <div>
              <input
                type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.625rem', border: '1px solid #e0e0e5', borderRadius: 8, fontSize: 13, marginBottom: 8, fontFamily: 'inherit', background: '#fbfbfd', color: '#1d1d1f', outline: 'none' }}
              />
              <input
                type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.625rem', border: '1px solid #e0e0e5', borderRadius: 8, fontSize: 13, marginBottom: 8, fontFamily: 'inherit', background: '#fbfbfd', color: '#1d1d1f', outline: 'none' }}
              />
              <textarea
                placeholder={`Tell ${builderFirstName} what you need...`}
                value={message} onChange={e => setMessage(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.5rem 0.625rem', border: '1px solid #e0e0e5', borderRadius: 8, fontSize: 13, marginBottom: 8, fontFamily: 'inherit', resize: 'none', background: '#fbfbfd', color: '#1d1d1f', outline: 'none' }}
              />
              <button
                onClick={submit}
                disabled={state === 'sending' || !name || !email || !message}
                style={{ width: '100%', padding: '0.55rem', background: state === 'sending' ? '#d2d2d7' : '#1d1d1f', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: state === 'sending' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: 6 }}>
                {state === 'sending' ? 'Sending...' : state === 'error' ? 'Try again' : 'Send message'}
              </button>
              <p style={{ fontSize: 11, color: '#aeaeb2', textAlign: 'center' }}>
                {builderFirstName} will reply in your ShipStacked inbox
              </p>
            </div>
          )}
        </div>

        {/* Employer — hiring CTA */}
        <div style={{ background: '#f8f8ff', border: '1px solid #e0e0ee', borderRadius: 14, padding: '1.25rem' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6c63ff', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Hiring?
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.35, marginBottom: '0.35rem' }}>
            Find and hire builders like {builderFirstName}
          </p>
          <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, marginBottom: '0.875rem' }}>
            Browse verified AI-native builders and message them directly.
          </p>
          <Link href="/signup?role=employer"
            style={{ display: 'block', padding: '0.55rem', background: '#6c63ff', color: 'white', borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>
            Get full access — $199/mo
          </Link>
        </div>

      </div>

      {/* Mobile: stack vertically */}
      <style>{`
        @media (max-width: 540px) {
          .feed-dual-cta-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
