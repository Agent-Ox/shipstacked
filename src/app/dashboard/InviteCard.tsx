'use client'

import { useEffect, useState } from 'react'
import posthog from 'posthog-js'

type Invite = { id: string | number; invitee_email: string; status: string; pending?: boolean }

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function InviteCard({ teamEntityId }: { teamEntityId?: number }) {
  const [email, setEmail] = useState('')
  const [invites, setInvites] = useState<Invite[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listUrl = '/api/invites' + (teamEntityId ? '?team_entity_id=' + teamEntityId : '')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(listUrl)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setInvites((data.invites ?? []).map((i: any) => ({ id: i.id, invitee_email: i.invitee_email, status: i.status })))
      } catch {}
    })()
    return () => { cancelled = true }
  }, [listUrl])

  const handleSend = async () => {
    if (sending) return
    setError(null)
    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) {
      setError('Enter a valid email address.')
      return
    }
    setSending(true)
    const tempId = '__temp__' + value
    setInvites((prev) => [{ id: tempId, invitee_email: value, status: 'pending', pending: true }, ...prev])
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, team_entity_id: teamEntityId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        posthog.capture('invite_sent', { source: teamEntityId ? 'team_dashboard' : 'dashboard_generic' })
        setInvites((prev) => prev.map((i) => (i.id === tempId ? { id: data.invite.id, invitee_email: data.invite.invitee_email, status: data.invite.status } : i)))
        setEmail('')
      } else {
        setInvites((prev) => prev.filter((i) => i.id !== tempId))
        if (res.status === 409) setError(data?.error || 'That email already has a pending invite.')
        else if (res.status === 429) setError('Too many invites — try again later.')
        else setError(data?.error || 'Could not send invite. Try again.')
      }
    } catch {
      setInvites((prev) => prev.filter((i) => i.id !== tempId))
      setError('Something went wrong. Try again.')
    } finally {
      setSending(false)
    }
  }

  const handleRevoke = async (id: string | number) => {
    try {
      const res = await fetch('/api/invites/' + id, { method: 'DELETE' })
      if (res.ok) setInvites((prev) => prev.filter((i) => i.id !== id))
    } catch {}
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: '0.5rem' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
          placeholder="teammate@email.com"
          autoComplete="off"
          style={{ flex: 1, minWidth: 0, padding: '0.5rem 0.75rem', border: '1px solid #e0e0e5', borderRadius: 10, fontSize: 13, color: '#1d1d1f', fontFamily: 'inherit' }}
        />
        <button
          onClick={handleSend}
          disabled={sending}
          style={{ padding: '0.5rem 1.25rem', background: sending ? '#aeaeb2' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 13, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: '#c0392b', marginBottom: '0.5rem' }}>{error}</p>}

      {invites.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
          {invites.map((i) => (
            <div key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13, color: '#1d1d1f' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {i.invitee_email} <span style={{ color: '#aeaeb2', fontWeight: 400, textTransform: 'capitalize' }}>· {i.status}</span>
              </span>
              {i.status === 'pending' && typeof i.id !== 'string' && (
                <button
                  onClick={() => handleRevoke(i.id)}
                  title="Revoke invite"
                  style={{ background: 'none', border: 'none', color: '#aeaeb2', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 0.25rem', flexShrink: 0 }}
                >×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
