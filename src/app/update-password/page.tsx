'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Supabase puts the session in the URL fragment after invite
    // calling getSession() triggers the client to pick it up automatically
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        // Try to exchange the fragment tokens
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
            setReady(true)
          }
        })
      }
    })
  }, [])

  const handleUpdate = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/talent'
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '2rem 1.5rem' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '2rem' }}>
          ClaudHire<span style={{ color: '#0071e3' }}>.</span>
        </a>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Set your password</h1>
        <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '2rem' }}>Choose a password to access your ClaudHire employer account.</p>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}

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
          disabled={loading || password.length < 6}
          style={{ width: '100%', padding: '0.85rem', background: loading || password.length < 6 ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 500, cursor: loading || password.length < 6 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Setting password...' : 'Set password and continue →'}
        </button>
      </div>
    </div>
  )
}
