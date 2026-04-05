'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

async function goToCheckout() {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: 'full_access' })
  })
  const data = await res.json()
  if (data.url) window.location.href = data.url
}

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'builder' | 'employer'>('builder')
  const [loading, setLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'employer') setRole('employer')
    const errorParam = searchParams.get('error')
    if (errorParam) setError(decodeURIComponent(errorParam))
  }, [searchParams])

  const handleSignup = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'builder' } }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    await goToCheckout()
    setCheckoutLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    border: '1px solid #d2d2d7', borderRadius: 10,
    fontSize: 15, outline: 'none', fontFamily: 'inherit',
    background: 'white', boxSizing: 'border-box', marginBottom: '1rem'
  }

  // PATH FORK — shown after successful signup
  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '2.5rem' }}>
            ShipStacked<span style={{ color: '#0071e3' }}>.</span>
          </a>

          <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 12, padding: '0.875rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <p style={{ fontSize: 14, color: '#1a7f37', fontWeight: 500 }}>Account created. How do you want to set up your profile?</p>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>How do you build?</h1>
          <p style={{ fontSize: 15, color: '#6e6e73', marginBottom: '2rem', lineHeight: 1.6 }}>
            Set up your profile yourself, or hand it to your agent.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Path A — Agent */}
            <a href="/dashboard?agent=1" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'linear-gradient(135deg, #0f0f18, #1a1a2e)', border: '1px solid rgba(108,99,255,0.4)', borderRadius: 16, padding: '1.5rem', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                    🤖
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-0.01em' }}>Use my agent</p>
                    <p style={{ fontSize: 12, color: 'rgba(167,139,250,0.8)' }}>Get your API key, brief your agent, done.</p>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 16, color: 'rgba(108,99,255,0.8)' }}>→</span>
                </div>
                {['Get your API key in 30 seconds', 'Agent fills profile, posts builds, keeps score current', 'Works with Claude, n8n, any HTTP client'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13, color: 'rgba(240,240,245,0.5)', marginBottom: '0.3rem' }}>
                    <span style={{ color: '#6c63ff', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </a>

            {/* Path B — Manual */}
            <a href="/join" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '1.5rem', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                    ✍️
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>Set up myself</p>
                    <p style={{ fontSize: 12, color: '#6e6e73' }}>5-step guided profile builder. Takes about 5 minutes.</p>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 16, color: '#6e6e73' }}>→</span>
                </div>
                {['Step-by-step guided setup', 'Add projects, skills, links', 'Profile live in minutes'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13, color: '#6e6e73', marginBottom: '0.3rem' }}>
                    <span style={{ color: '#0071e3', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </a>

          </div>

          <p style={{ fontSize: 12, color: '#aeaeb2', textAlign: 'center', marginTop: '1.5rem' }}>
            You can always switch approaches from your dashboard.
          </p>
        </div>
      </div>
    )
  }

  // SIGNUP FORM
  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '2rem 1.5rem' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '2rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Create account</h1>
        <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '2rem' }}>
          Already have an account? <Link href="/login" style={{ color: '#0071e3', textDecoration: 'none' }}>Sign in</Link>
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.6rem', color: '#1d1d1f' }}>I am a...</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['builder', 'employer'] as const).map(r => (
              <button key={r} type="button" onClick={() => setRole(r)} style={{
                flex: 1, padding: '0.6rem', borderRadius: 10, border: '1px solid',
                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                background: role === r ? '#0071e3' : 'white',
                borderColor: role === r ? '#0071e3' : '#d2d2d7',
                color: role === r ? 'white' : '#1d1d1f'
              }}>
                {r === 'builder' ? 'Builder' : 'Employer'}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#6e6e73', marginTop: '0.5rem' }}>
            {role === 'builder'
              ? 'Create a free profile and showcase your AI work.'
              : 'Access the full talent directory and message verified builders directly.'}
          </p>
        </div>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}

        {role === 'builder' ? (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.4rem', color: '#1d1d1f' }}>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.4rem', color: '#1d1d1f' }}>Password</label>
              <input type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSignup()} style={inputStyle} />
            </div>
            <button
              onClick={handleSignup}
              disabled={loading}
              style={{ width: '100%', padding: '0.85rem', background: loading ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: '0.5rem' }}>
              {loading ? 'Creating account...' : 'Create free profile'}
            </button>
          </>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Full Access</div>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.04em', color: '#1d1d1f', lineHeight: 1, marginBottom: '0.25rem' }}>
              <sup style={{ fontSize: 20, verticalAlign: 'top', marginTop: 8, display: 'inline-block', fontWeight: 500 }}>$</sup>199
            </div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1.5rem' }}>per month</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              {['Full talent directory', 'Direct builder contact', 'Unlimited job posts', 'Public or anonymous profile', 'No commission ever'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13, color: '#3d3d3f' }}>
                  <span style={{ color: '#0071e3', fontWeight: 700, fontSize: 12 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              style={{ width: '100%', padding: '0.85rem', background: checkoutLoading ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 600, cursor: checkoutLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {checkoutLoading ? 'Redirecting...' : 'Get full access — $199/mo'}
            </button>
            <p style={{ fontSize: 11, color: '#aeaeb2', marginTop: '0.75rem' }}>
              Instant access after payment. Cancel anytime.
            </p>
          </div>
        )}

        <p style={{ fontSize: 11, color: '#aeaeb2', textAlign: 'center', marginTop: '1rem', lineHeight: 1.5 }}>
          By continuing you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
