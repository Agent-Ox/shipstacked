'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { usePathname } from 'next/navigation'

type NavUser = {
  email: string
  role: 'employer' | 'builder' | null
}

export default function NavBar() {
  const [navUser, setNavUser] = useState<NavUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  // Dark bg pages
  const isDark = pathname.startsWith('/u/')
  const textColor = isDark ? 'rgba(240,240,245,0.9)' : '#1d1d1f'
  const subTextColor = isDark ? 'rgba(240,240,245,0.5)' : '#6e6e73'
  const bgColor = isDark ? 'rgba(10,10,15,0.85)' : 'rgba(255,255,255,0.92)'
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const pillBg = isDark ? 'rgba(255,255,255,0.1)' : '#f5f5f7'
  const pillColor = isDark ? 'rgba(240,240,245,0.9)' : '#1d1d1f'
  const accentColor = isDark ? '#a78bfa' : '#0071e3'
  const mobileBg = isDark ? '#0a0a0f' : 'white'
  const mobileBorder = isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'

  const dashboardLink = navUser?.role === 'employer' ? '/employer' : '/dashboard'

  // Context links based on path
  const getContextLinks = () => {
    if (pathname.startsWith('/dashboard/edit')) {
      return [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'View profile', href: null, action: 'view-profile' },
      ]
    }
    if (pathname.startsWith('/dashboard')) {
      return [{ label: 'Edit profile', href: '/dashboard/edit' }]
    }
    if (pathname.startsWith('/employer')) {
      return [
        { label: 'Browse talent', href: '/talent' },
        { label: 'Post a job', href: '/post-job' },
      ]
    }
    if (pathname.startsWith('/talent')) {
      return [{ label: 'Dashboard', href: '/employer' }]
    }
    if (pathname.startsWith('/post-job')) {
      return [{ label: 'Dashboard', href: '/employer' }]
    }
    if (pathname.startsWith('/u/')) {
      return navUser ? [{ label: dashboardLink === '/employer' ? 'Dashboard' : 'My profile', href: dashboardLink }] : []
    }
    if (pathname.startsWith('/jobs')) {
      return navUser ? [{ label: dashboardLink === '/employer' ? 'Dashboard' : 'My profile', href: dashboardLink }] : []
    }
    return []
  }

  const isHomepage = pathname === '/'

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const user = session.user
      const metaRole = user.user_metadata?.role as 'employer' | 'builder' | null
      setNavUser({ email: user.email || '', role: metaRole })
      setLoading(false)
    })
  }, [])

  const contextLinks = getContextLinks()

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.25rem',
        background: bgColor,
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: `0.5px solid ${borderColor}`,
      }}>
        {/* Logo */}
        <a href="/" style={{ fontSize: '1.1rem', fontWeight: 700, color: textColor, textDecoration: 'none', letterSpacing: '-0.02em', flexShrink: 0 }}>
          ClaudHire<span style={{ color: accentColor }}>.</span>
        </a>

        {/* Desktop center links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} className="ch-desktop-links">
          {isHomepage ? (
            <>
              <a href="#how" style={{ fontSize: '0.8rem', color: textColor, textDecoration: 'none', opacity: 0.7 }}>How it works</a>
              <a href="#talent" style={{ fontSize: '0.8rem', color: textColor, textDecoration: 'none', opacity: 0.7 }}>Talent</a>
              <a href="#pricing" style={{ fontSize: '0.8rem', color: textColor, textDecoration: 'none', opacity: 0.7 }}>Pricing</a>
            </>
          ) : contextLinks.map(link => (
            <a key={link.label} href={link.href || '#'} style={{ fontSize: '0.8rem', color: textColor, textDecoration: 'none', opacity: 0.7 }}>
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {!loading && (
            <>
              {navUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="ch-desktop-links">
                  <span style={{ fontSize: '0.75rem', color: subTextColor, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {navUser.email}
                  </span>
                  <a href="/api/logout" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', background: pillBg, color: pillColor, borderRadius: 980, textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Sign out
                  </a>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="ch-desktop-links">
                  <a href="/login" style={{ fontSize: '0.8rem', color: textColor, textDecoration: 'none', opacity: 0.7 }}>Sign in</a>
                  <Link href="/signup" style={{ background: accentColor, color: 'white', padding: '0.4rem 0.9rem', borderRadius: 980, fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Create profile
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="ch-mobile-burger"
            aria-label="Menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
            <span style={{ display: 'block', width: 22, height: 2, background: textColor, borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: textColor, borderRadius: 2, transition: 'all 0.2s', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: textColor, borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Mobile/hamburger dropdown */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 52, left: 0, right: 0, zIndex: 99,
          background: mobileBg,
          borderBottom: `0.5px solid ${borderColor}`,
          padding: '0.5rem 1.25rem 1rem',
          display: 'flex', flexDirection: 'column',
        }}>
          {isHomepage ? (
            <>
              <a href="#how" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>How it works</a>
              <a href="#talent" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>Talent</a>
              <a href="#pricing" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>Pricing</a>
            </>
          ) : contextLinks.filter(link => link.href !== dashboardLink).map(link => (
            <a key={link.label} href={link.href || '#'} onClick={() => setMenuOpen(false)} style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>
              {link.label}
            </a>
          ))}

          {navUser ? (
            <>
              <a href={dashboardLink} onClick={() => setMenuOpen(false)} style={{ fontSize: 15, color: accentColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}`, fontWeight: 500 }}>
                {navUser.role === 'employer' ? 'Employer dashboard' : 'My profile'}
              </a>
              <a href="/api/logout" style={{ fontSize: 15, color: '#ef4444', textDecoration: 'none', padding: '0.7rem 0', fontWeight: 500 }}>Sign out</a>
            </>
          ) : (
            <>
              <a href="/login" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>Sign in</a>
              <a href="/signup" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, color: accentColor, textDecoration: 'none', padding: '0.7rem 0', fontWeight: 500 }}>Create free profile</a>
            </>
          )}
        </div>
      )}

      <style>{`
        .ch-desktop-links { display: flex !important; }
        .ch-mobile-burger { display: none !important; }
        @media (max-width: 768px) {
          .ch-desktop-links { display: none !important; }
          .ch-mobile-burger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
