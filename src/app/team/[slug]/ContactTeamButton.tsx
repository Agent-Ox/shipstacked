'use client'

import { useState } from 'react'

// Contact CTA on a published team page. Anyone logged-in (and not an admin of
// the team) can open a composer and send a first message; admins get a link to
// their team inbox instead.
export default function ContactTeamButton({
  teamEntityId, teamName, slug, loggedIn, isAdmin,
}: {
  teamEntityId: number
  teamName: string
  slug: string
  loggedIn: boolean
  isAdmin: boolean
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  // Admins manage replies from their team inbox — no contact button.
  if (isAdmin) {
    return (
      <a href={`/messages?as=team&entity=${teamEntityId}`} className="t-link" style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>
        Manage in your team inbox →
      </a>
    )
  }

  const btnStyle: React.CSSProperties = {
    padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', border: 'none',
    borderRadius: 980, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  }

  if (!loggedIn) {
    return (
      <a href={`/login?next=/team/${slug}`} style={{ ...btnStyle, display: 'inline-block', textDecoration: 'none' }}>
        Contact {teamName}
      </a>
    )
  }

  if (state === 'sent') {
    return <p style={{ fontSize: 14, color: '#1a7f37', fontWeight: 500 }}>✓ Message sent to {teamName} — they'll reply to your inbox.</p>
  }

  async function send() {
    if (!message.trim()) return
    setState('sending')
    setError('')
    try {
      const res = await fetch('/api/messages/contact-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_entity_id: teamEntityId, message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); setState('error'); return }
      setState('sent')
    } catch {
      setError('Something went wrong'); setState('error')
    }
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} style={btnStyle}>Contact {teamName}</button>
  }

  return (
    <div style={{ width: '100%', maxWidth: 460 }}>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={`Message ${teamName}…`}
        rows={3}
        style={{ width: '100%', padding: '0.75rem', border: '1px solid #d2d2d7', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
      />
      {error && <p style={{ fontSize: 13, color: '#c00', margin: '0.4rem 0 0' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button type="button" onClick={send} disabled={state === 'sending' || !message.trim()} style={{ ...btnStyle, opacity: state === 'sending' || !message.trim() ? 0.6 : 1 }}>
          {state === 'sending' ? 'Sending…' : 'Send'}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ padding: '0.6rem 1.25rem', background: '#f5f5f7', color: '#1d1d1f', border: 'none', borderRadius: 980, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
