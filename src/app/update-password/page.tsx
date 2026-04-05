'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Listen for auth state change — fires when fragment tokens are processed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY')) {
        setSessionReady(true)
        setChecking(false)
      }
    })

    // Also check if session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
        setChecking(false)
      } else {
        // Give the fragment a moment to be processed
        setTimeout(() => setChecking(false), 3000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleUpdate = async () => {
    if (!sessionReady) {
      setError('Session not ready. Please wait a moment and try again.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ 
      password,
      data: { password_set: true }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/employer'
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '2rem 1.5rem' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '2rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Set your password</h1>
        <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '2rem' }}>Choose a password to access your ShipStacked employer account.</p>

        {checking && (
          <div style={{ background: '#f0f0f5', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#6e6e73', textAlign: 'center' }}>
            Setting up your session...
          </div>
        )}

        {!checking && !sessionReady && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
            Session expired or invalid. Please check your email for the invite link and try again, or <a href="/login" style={{ color: '#c00' }}>sign in here</a> if you already set a password.
          </div>
        )}

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}

        {!checking && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.4rem', color: '#1d1d1f' }}>New password</label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && password.length >= 6 && handleUpdate()}
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #d2d2d7', borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={handleUpdate}
              disabled={loading || password.length < 6 || !sessionReady}
              style={{ width: '100%', padding: '0.85rem', background: loading || password.length < 6 || !sessionReady ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 500, cursor: loading || password.length < 6 || !sessionReady ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Setting password...' : 'Set password and continue →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
