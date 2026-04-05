'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { usePathname } from 'next/navigation'

type NavUser = {
  email: string
  role: 'employer' | 'builder' | 'admin' | null
}

export default function NavBar() {
  const [navUser, setNavUser] = useState<NavUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()

  const isDark = pathname.startsWith('/u/')
  const textColor = isDark ? 'rgba(240,240,245,0.9)' : '#1d1d1f'
  const bgColor = isDark ? 'rgba(10,10,15,0.85)' : 'rgba(255,255,255,0.92)'
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const accentColor = isDark ? '#a78bfa' : '#0071e3'
  const mobileBg = isDark ? '#0a0a0f' : 'white'
  const mobileBorder = isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'

  const dashboardLink = navUser?.role === 'employer' ? '/employer' : '/dashboard'
  const isAdmin = navUser?.role === 'admin'
  const isHomepage = pathname === '/'

  const getMenuLinks = () => {
    // ---- Unauthenticated homepage ----
    // Builder-first nav — no $199 pricing link visible to a browsing builder
    if (isHomepage && !navUser) {
      return [
        { label: 'How it works', href: '#how' },
        { label: 'Build Feed', href: '/feed' },
        { label: 'Hire talent', href: '#hire' },
      ]
    }

    // ---- Admin ----
    if (isAdmin) {
      return [{ label: 'Admin dashboard', href: '/admin' }]
    }

    // ---- Employer routes ----
    if (navUser?.role === 'employer') {
      if (pathname.startsWith('/employer')) {
        return [
          { label: 'Browse talent', href: '/talent' },
          { label: 'Post a job', href: '/post-job' },
        ]
      }
      if (pathname.startsWith('/talent') || pathname.startsWith('/post-job')) {
        return [{ label: 'Dashboard', href: '/employer' }]
      }
      // All other employer pages
      return [
        { label: 'Browse talent', href: '/talent' },
        { label: 'Dashboard', href: '/employer' },
      ]
    }

    // ---- Builder routes ----
    if (pathname.startsWith('/dashboard/edit')) {
      return [{ label: '← Dashboard', href: '/dashboard' }]
    }
    if (pathname.startsWith('/dashboard')) {
      return [
        { label: 'Build Feed', href: '/feed' },
        { label: 'Leaderboard', href: '/leaderboard' },
        { label: 'Edit profile', href: '/dashboard/edit' },
      ]
    }
    if (pathname.startsWith('/messages')) {
      return [{ label: 'Dashboard', href: '/dashboard' }]
    }
    if (pathname.startsWith('/feed')) {
      return [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Build Feed', href: '/feed' },
      ]
    }
    if (pathname.startsWith('/jobs')) {
      return [{ label: 'Dashboard', href: '/dashboard' }]
    }
    if (pathname.startsWith('/u/') || pathname.startsWith('/company/')) {
      return [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Build Feed', href: '/feed' },
      ]
    }
    // Homepage logged in as builder
    if (isHomepage && navUser?.role === 'builder') {
      return [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Build Feed', href: '/feed' },
      ]
    }
    // Fallback for any other page
    return [{ label: 'Dashboard', href: dashboardLink }]
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const user = session.user
      const metaRole = user.user_metadata?.role as 'employer' | 'builder' | 'admin' | null
      setNavUser({ email: user.email || '', role: metaRole })
      setLoading(false)
      // Fetch unread count
      fetch('/api/messages/unread').then(r => r.json()).then(({ unread }) => setUnreadCount(unread || 0)).catch(() => {})
    })
  }, [])

  const menuLinks = getMenuLinks()

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
          ShipStacked<span style={{ color: accentColor }}>.</span>
        </a>

        {/* Burger — always visible */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          <span style={{ display: 'block', width: 22, height: 2, background: textColor, borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: textColor, borderRadius: 2, transition: 'all 0.2s', opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: 'block', width: 22, height: 2, background: textColor, borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      </nav>

      {/* Dropdown menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 52, right: 0, zIndex: 99,
          background: mobileBg,
          border: `0.5px solid ${borderColor}`,
          borderTop: 'none',
          borderRadius: '0 0 0 12px',
          padding: '0.5rem 1.5rem 1rem',
          display: 'flex', flexDirection: 'column',
          minWidth: 220,
          boxShadow: '-4px 4px 24px rgba(0,0,0,0.08)',
        }}>
          {/* Context links */}
          {menuLinks.map(link => (
            <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
              style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>
              {link.label}
            </a>
          ))}

          {/* Auth links */}
          {!loading && (
            navUser ? (
              <>
                {isAdmin ? (
                  <a href="/admin" onClick={() => setMenuOpen(false)}
                    style={{ fontSize: 15, color: accentColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}`, fontWeight: 500 }}>
                    Admin dashboard
                  </a>
                ) : null}
                <a href={navUser.role === 'employer' ? '/employer/messages' : '/messages'}
                  onClick={() => setMenuOpen(false)}
                  style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Messages
                  {unreadCount > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#0071e3', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {unreadCount}
                    </span>
                  )}
                </a>
                <span style={{ fontSize: 13, color: '#aeaeb2', padding: '0.5rem 0 0.25rem' }}>{navUser.email}</span>
                <a href="/api/logout"
                  style={{ fontSize: 15, color: '#ef4444', textDecoration: 'none', padding: '0.5rem 0', fontWeight: 500 }}>
                  Sign out
                </a>
              </>
            ) : (
              <>
                <a href="/login" onClick={() => setMenuOpen(false)}
                  style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>
                  Sign in
                </a>
                <a href="/signup" onClick={() => setMenuOpen(false)}
                  style={{ fontSize: 15, color: accentColor, textDecoration: 'none', padding: '0.7rem 0', fontWeight: 500 }}>
                  Create free profile
                </a>
              </>
            )
          )}
        </div>
      )}
    </>
  )
}
