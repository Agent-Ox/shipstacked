'use client'

import { useEffect, useState } from 'react'

export default function SuccessClient({ sessionId }: { sessionId: string | null }) {
  const [magicLink, setMagicLink] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) { setLoading(false); return }

    let attempts = 0
    const maxAttempts = 8

    const tryGetLink = async () => {
      attempts++
      try {
        const res = await fetch('/api/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        })
        const data = await res.json()
        if (data.magicLink) {
          setMagicLink(data.magicLink)
          setEmail(data.email)
          setLoading(false)
        } else if (attempts < maxAttempts) {
          setTimeout(tryGetLink, 1500)
        } else {
          setLoading(false)
        }
      } catch {
        if (attempts < maxAttempts) setTimeout(tryGetLink, 1500)
        else setLoading(false)
      }
    }

    tryGetLink()
  }, [sessionId])

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#fbfbfd',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const innerStyle: React.CSSProperties = {
    maxWidth: 480,
    padding: '2rem',
    textAlign: 'center',
  }

  const iconStyle: React.CSSProperties = {
    width: 72,
    height: 72,
    background: '#e3f3e3',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    fontSize: 32,
    color: '#1a7f37',
  }

  const btnStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '1rem 2.5rem',
    background: '#0071e3',
    color: 'white',
    borderRadius: 980,
    fontSize: 16,
    fontWeight: 600,
    textDecoration: 'none',
    letterSpacing: '-0.01em',
  }

  if (!sessionId) {
    return (
      <div style={containerStyle}>
        <div style={innerStyle}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f' }}>Something went wrong.</h1>
          <p style={{ color: '#6e6e73', marginTop: '1rem' }}>
            Please contact <a href="mailto:hello@shipstacked.com" style={{ color: '#0071e3' }}>hello@shipstacked.com</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        <div style={iconStyle}>✓</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.75rem', color: '#1d1d1f' }}>
          Welcome to ShipStacked.
        </h1>
        <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '0.5rem', lineHeight: 1.6 }}>
          Your Full Access subscription is confirmed.
        </p>
        {email && (
          <p style={{ color: '#aeaeb2', fontSize: 13, marginBottom: '2rem' }}>{email}</p>
        )}

        {loading ? (
          <div>
            <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '1.5rem' }}>
              Confirming your payment...
            </p>
            <div style={{ width: 32, height: 32, border: '3px solid #e0e0e5', borderTop: '3px solid #0071e3', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : magicLink ? (
          <div>
            <a href={magicLink} style={btnStyle}>Access your account →</a>
            <p style={{ color: '#aeaeb2', fontSize: 12, marginTop: '1rem' }}>
              One click to access your account and set your password.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '1.5rem' }}>
              Your account is ready. Sign in to get started.
            </p>
            <a href="/login" style={btnStyle}>Sign in to ShipStacked</a>
          </div>
        )}

        <p style={{ color: '#6e6e73', fontSize: 13, marginTop: '2rem' }}>
          Questions? <a href="mailto:hello@shipstacked.com" style={{ color: '#0071e3', textDecoration: 'none' }}>hello@shipstacked.com</a>
        </p>
      </div>
    </div>
  )
}
