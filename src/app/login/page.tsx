import Link from 'next/link'
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const inputStyle = 'width:100%;padding:0.875rem 1rem;border:1px solid #d2d2d7;border-radius:12px;font-size:16px;outline:none;font-family:inherit;background:white;box-sizing:border-box;'

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '3rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.4rem', color: '#1d1d1f' }}>Sign in</h1>
        <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '2rem' }}>
          New here?{' '}
          <Link href="/signup" style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>Create an account →</Link>
        </p>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: 14, color: '#c00' }}>
            {decodeURIComponent(error)}
          </div>
        )}

        <form>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: '0.4rem', color: '#1d1d1f' }}>Email</label>
            <input
              name="email"
              type="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
              style={{ width: '100%', padding: '0.875rem 1rem', border: '1px solid #d2d2d7', borderRadius: 12, fontSize: 16, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>Password</label>
              <Link href="/reset-password" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>Forgot password?</Link>
            </div>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{ width: '100%', padding: '0.875rem 1rem', border: '1px solid #d2d2d7', borderRadius: 12, fontSize: 16, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}
            />
          </div>
          <button
            formAction={login}
            style={{ width: '100%', padding: '0.95rem', background: '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em' }}>
            Sign in →
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: 13, color: '#6e6e73' }}>
          Want to showcase your AI work?{' '}
          <Link href="/signup" style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>Create a builder profile →</Link>
        </p>
      </div>
    </div>
  )
}
