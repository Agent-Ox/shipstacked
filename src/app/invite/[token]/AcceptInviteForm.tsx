'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import posthog from 'posthog-js'

type Props = {
  rawToken: string
  inviteeEmail: string
  teamName: string | null
  inviterName: string
  isExistingUser: boolean
  currentTeamName: string | null
}

export default function AcceptInviteForm({ rawToken, inviteeEmail, teamName, inviterName, isExistingUser, currentTeamName }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const heading = teamName
    ? `${inviterName} invited you to join ${teamName}`
    : `${inviterName} invited you to ShipStacked`

  const handleAccept = async () => {
    if (submitting) return
    setError(null)
    if (!isExistingUser && password.length < 6) {
      setError('Choose a password of at least 6 characters.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken, password: isExistingUser ? undefined : password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not accept this invite. Try again.')
        setSubmitting(false)
        return
      }

      posthog.capture('invite_accepted', { source: teamName ? 'team_invite' : 'generic_invite' })

      if (isExistingUser) {
        // They have their own credentials — send them to log in.
        window.location.href = '/login'
        return
      }
      // New user: establish a session with the password they just set, then
      // drop them into profile creation.
      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: inviteeEmail, password })
      window.location.href = signInErr ? '/login' : '/dashboard/edit'
    } catch {
      setError('Something went wrong. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '2rem', maxWidth: 420, width: '100%' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>{heading}</h1>
        <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          ShipStacked is the proof-of-work network for AI-native builders.
        </p>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: '0.3rem' }}>Email</label>
        <input value={inviteeEmail} readOnly style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e0e0e5', borderRadius: 10, fontSize: 14, color: '#6e6e73', background: '#f5f5f7', marginBottom: '1rem', fontFamily: 'inherit' }} />

        {!isExistingUser && (
          <>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: '0.3rem' }}>Create a password <span style={{ fontWeight: 400 }}>(min 6 characters)</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e0e0e5', borderRadius: 10, fontSize: 14, color: '#1d1d1f', marginBottom: '1rem', fontFamily: 'inherit' }}
            />
          </>
        )}

        {currentTeamName && (
          <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5, marginBottom: '1rem', padding: '0.6rem 0.75rem', background: '#f5f5f7', borderRadius: 10 }}>
            You're currently on <strong>{currentTeamName}</strong>. Accepting moves you to <strong>{teamName}</strong>.
          </p>
        )}

        {error && (
          <p style={{ fontSize: 13, color: '#c0392b', marginBottom: '1rem' }}>{error}</p>
        )}

        <button
          onClick={handleAccept}
          disabled={submitting}
          style={{
            width: '100%', fontSize: 14, padding: '0.75rem 1.5rem',
            background: submitting ? '#aeaeb2' : '#0071e3',
            color: 'white', border: 'none', borderRadius: 980,
            cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Accepting…' : isExistingUser ? 'Accept invite' : 'Accept & create account'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/' }} style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>Decline</a>
        </div>
      </div>
    </div>
  )
}
