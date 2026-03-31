'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    border: '1px solid #d2d2d7', borderRadius: 10,
    fontSize: 15, outline: 'none', fontFamily: 'inherit',
    background: 'white', boxSizing: 'border-box', marginBottom: '1rem'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '2rem 1.5rem' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '2rem' }}>
          ClaudHire<span style={{ color: '#0071e3' }}>.</span>
        </a>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Sign in</h1>
        <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '2rem' }}>
          New here? <Link href="/signup" style={{ color: '#0071e3', textDecoration: 'none' }}>Create an account →</Link>
        </p>
        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.4rem', color: '#1d1d1f' }}>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f' }}>Password</label>
            <Link href="/reset-password" style={{ fontSize: 12, color: '#0071e3', textDecoration: 'none' }}>Forgot password?</Link>
          </div>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inputStyle} />
        </div>
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', padding: '0.85rem', background: loading ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: '0.5rem' }}>
          {loading ? 'Signing in...' : 'Sign in →'}
        </button>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: 13, color: '#6e6e73' }}>
          Want to showcase your Claude work? <Link href="/signup" style={{ color: '#0071e3', textDecoration: 'none' }}>Create a builder profile →</Link>
        </p>
      </div>
    </div>
  )
}