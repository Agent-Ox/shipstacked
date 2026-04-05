'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY')) {
        setSessionReady(true)
        setEmail(session.user.email || '')
        setChecking(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
        setEmail(session.user.email || '')
        setChecking(false)
      } else {
        setTimeout(() => setChecking(false), 3000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSetPassword = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (!sessionReady) { setError('Session not ready. Please try again.'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password, data: { password_set: true } })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      window.location.href = '/employer'
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.875rem 1rem',
    border: '1px solid #d2d2d7', borderRadius: 12,
    fontSize: 16, outline: 'none', fontFamily: 'inherit',
    background: 'white', boxSizing: 'border-box',
    letterSpacing: '0.05em',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '3rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        {/* Payment confirmed badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 980, padding: '0.3rem 0.875rem', marginBottom: '1.5rem' }}>
          <span style={{ color: '#1a7f37', fontWeight: 700, fontSize: 13 }}>✓</span>
          <span style={{ color: '#1a7f37', fontSize: 13, fontWeight: 600 }}>Payment confirmed</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem', lineHeight: 1.1 }}>
          Set your password.
        </h1>
        <p style={{ fontSize: 15, color: '#6e6e73', marginBottom: '2rem', lineHeight: 1.6 }}>
          {email ? `For ${email}. ` : ''}You only need to do this once.
        </p>

        {checking && (
          <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: 14, color: '#6e6e73', textAlign: 'center' }}>
            Setting up your session...
          </div>
        )}

        {!checking && !sessionReady && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: 14, color: '#c00', lineHeight: 1.6 }}>
            Your session has expired. Please check your email for the login link and try again, or <a href="/login" style={{ color: '#c00', fontWeight: 600 }}>sign in here</a>.
          </div>
        )}

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}

        {!checking && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: '0.4rem', color: '#1d1d1f' }}>
                Password
              </label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirm && handleSetPassword()}
                style={inputStyle}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: '0.4rem', color: '#1d1d1f' }}>
                Confirm password
              </label>
              <input
                type="password"
                placeholder="Same password again"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                style={{
                  ...inputStyle,
                  borderColor: confirm && confirm !== password ? '#ffd0d0' : confirm && confirm === password ? '#b3e0b3' : '#d2d2d7'
                }}
              />
              {confirm && confirm === password && (
                <p style={{ fontSize: 12, color: '#1a7f37', marginTop: '0.3rem', fontWeight: 500 }}>✓ Passwords match</p>
              )}
            </div>

            <button
              onClick={handleSetPassword}
              disabled={loading || !sessionReady || password.length < 8 || password !== confirm}
              style={{
                width: '100%', padding: '0.95rem',
                background: loading || !sessionReady || password.length < 8 || password !== confirm ? '#d2d2d7' : '#0071e3',
                color: 'white', border: 'none', borderRadius: 980,
                fontSize: 16, fontWeight: 600,
                cursor: loading || !sessionReady || password.length < 8 || password !== confirm ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '-0.01em',
              }}>
              {loading ? 'Setting password...' : 'Set password and go to dashboard →'}
            </button>

            <p style={{ fontSize: 12, color: '#aeaeb2', textAlign: 'center', marginTop: '1rem', lineHeight: 1.5 }}>
              Next time, just sign in at shipstacked.com/login with your email and this password.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
