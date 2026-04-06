'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

// App screens — no footer on these
const NO_FOOTER = [
  '/dashboard',
  '/employer',
  '/messages',
  '/join',
  '/login',
  '/signup',
  '/set-password',
  '/reset-password',
  '/update-password',
  '/auth',
  '/admin',
  '/client',
]

export default function FooterBar() {
  const pathname = usePathname()

  const hide = NO_FOOTER.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (hide) return null

  // Anchor links only make sense on the homepage
  const isHome = pathname === '/'
  const howHref = isHome ? '#how' : '/#how'
  const communityHref = isHome ? '#builders' : '/#builders'
  const hireHref = isHome ? '#pricing' : '/#pricing'

  return (
    <footer style={{
      background: '#f5f5f7',
      borderTop: '0.5px solid #e8e8ed',
      padding: '2.5rem 1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{
        maxWidth: 960,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
      }}>
        {/* Logo */}
        <Link href="/" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', flexShrink: 0 }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={howHref} style={linkStyle}>How it works</a>
          <a href={communityHref} style={linkStyle}>Community</a>
          <a href={hireHref} style={linkStyle}>Hire talent</a>
          <Link href="/feed" style={linkStyle}>Build Feed</Link>
          <Link href="/leaderboard" style={linkStyle}>Leaderboard</Link>
          <Link href="/jobs" style={linkStyle}>Jobs</Link>
          <Link href="/join" style={linkStyle}>Join</Link>
          <Link href="/api-docs" style={linkStyle}>Builder API</Link>
          <Link href="/terms" style={linkStyle}>Terms</Link>
          <Link href="/privacy" style={linkStyle}>Privacy</Link>
        </div>

        {/* Copyright */}
        <p style={{ fontSize: '0.75rem', color: '#aeaeb2', margin: 0, flexShrink: 0 }}>
          © 2026 ShipStacked. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

const linkStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: '#6e6e73',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}
