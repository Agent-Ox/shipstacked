'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { usePathname } from 'next/navigation'
import type { EntityModes } from '@/lib/user'

type NavUser = {
  email: string
  modes: EntityModes
}

const EMPTY_MODES: EntityModes = { builder: false, hirer: false, client: false, admin: false }

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

  const modes = navUser?.modes ?? EMPTY_MODES
  // Dashboard link priority: client > hirer > builder (mirrors routeAfterAuth)
  const dashboardLink = modes.client ? '/client/inbox' : modes.hirer ? '/hirer' : '/dashboard'
  const isAdmin = modes.admin
  const isHomepage = pathname === '/'

  const getMenuLinks = () => {
    // ---- Unauthenticated (any page) ----
    // Phase 8 §F Block 1: one marketing menu for anonymous visitors on EVERY
    // route (was: homepage-only; off-homepage fell through to an empty menu —
    // the catastrophic finding). #how anchor repointed to the real
    // /how-it-works page (the §B homepage rewrite removed the #how section).
    if (!navUser) {
      return [
        { label: 'Atlas', href: '/atlas' },
        { label: 'How it works', href: '/how-it-works' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Build Feed', href: '/feed' },
        { label: 'Browse talent', href: '/talent' },
      ]
    }

    // ---- Client-only ----
    if (modes.client && !modes.builder && !modes.hirer) {
      return []
    }

    // ---- Admin ----
    if (isAdmin) {
      return [{ label: 'Admin dashboard', href: '/admin' }]
    }

    // ---- Hirer present ----
    if (modes.hirer) {
      // On hirer-context pages
      if (pathname.startsWith('/hirer')) {
        const links = [
          { label: 'Atlas', href: '/atlas' },
          { label: 'Browse talent', href: '/talent' },
          { label: 'Jobs', href: '/jobs' },
          { label: 'Post a job', href: '/post-job' },
        ]
        if (modes.builder) links.push({ label: 'Builder dashboard', href: '/dashboard' })
        return links
      }
      if (pathname.startsWith('/talent') || pathname.startsWith('/post-job')) {
        const links = [
          { label: 'Atlas', href: '/atlas' },
          { label: 'Jobs', href: '/jobs' },
          { label: 'Hirer dashboard', href: '/hirer' },
        ]
        if (modes.builder) links.push({ label: 'Builder dashboard', href: '/dashboard' })
        return links
      }
      // Builder-side pages while hirer-mode active: expose both
      if (modes.builder && pathname.startsWith('/dashboard')) {
        return [
          { label: 'Atlas', href: '/atlas' },
          { label: 'Build Feed', href: '/feed' },
          { label: 'Jobs', href: '/jobs' },
          { label: 'Edit profile', href: '/dashboard/edit' },
          { label: 'Hirer dashboard', href: '/hirer' },
        ]
      }
      // Default hirer nav (all other pages)
      const links = [
        { label: 'Atlas', href: '/atlas' },
        { label: 'Browse talent', href: '/talent' },
        { label: 'Jobs', href: '/jobs' },
        { label: 'Hirer dashboard', href: '/hirer' },
      ]
      if (modes.builder) links.push({ label: 'Builder dashboard', href: '/dashboard' })
      return links
    }

    // ---- Builder-only ----
    if (modes.builder) {
      if (pathname.startsWith('/dashboard/edit')) {
        return [{ label: '← Dashboard', href: '/dashboard' }]
      }
      if (pathname.startsWith('/dashboard')) {
        return [
          { label: 'Atlas', href: '/atlas' },
          { label: 'Build Feed', href: '/feed' },
          { label: 'Jobs', href: '/jobs' },
          { label: 'Edit profile', href: '/dashboard/edit' },
        ]
      }
      if (pathname.startsWith('/messages')) {
        return [{ label: 'Dashboard', href: '/dashboard' }]
      }
      if (pathname.startsWith('/feed')) {
        return [
          { label: 'Atlas', href: '/atlas' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Build Feed', href: '/feed' },
        ]
      }
      if (pathname.startsWith('/jobs')) {
        return [
          { label: 'Atlas', href: '/atlas' },
          { label: 'Dashboard', href: '/dashboard' },
        ]
      }
      if (pathname.startsWith('/u/') || pathname.startsWith('/company/')) {
        return [
          { label: 'Atlas', href: '/atlas' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Build Feed', href: '/feed' },
        ]
      }
      if (isHomepage) {
        return [
          { label: 'Atlas', href: '/atlas' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Build Feed', href: '/feed' },
          { label: 'Jobs', href: '/jobs' },
        ]
      }
    }

    // Fallback for any logged-in user with no other match
    return navUser ? [{ label: 'Dashboard', href: dashboardLink }] : []
  }

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const user = session.user
      const email = user.email || ''
      const metaRole = user.user_metadata?.role

      const now = new Date().toISOString()
      const [{ data: sub }, { data: profile }] = await Promise.all([
        supabase.from('subscriptions').select('id').eq('email', email).eq('status', 'active').eq('product', 'full_access').or(`expires_at.is.null,expires_at.gt.${now}`).maybeSingle(),
        supabase.from('profiles').select('id').eq('email', email).maybeSingle(),
      ])

      if (cancelled) return
      const modes: EntityModes = {
        builder: !!profile,
        hirer: !!sub,
        client: metaRole === 'client',
        admin: metaRole === 'admin',
      }
      setNavUser({ email, modes })
      setLoading(false)
      // Aggregated unread count across all active messaging modes
      fetch('/api/messages/unread').then(r => r.json()).then(({ unread }) => setUnreadCount(unread || 0)).catch(() => {})
    })
    return () => { cancelled = true }
  }, [])

  const menuLinks = getMenuLinks()

  // Resolve messages href: hirer-mode users get ?as=hirer; builders get plain /messages.
  // Client-only users get /client/inbox (handled in the early return below).
  const messagesHref =
    modes.client && !modes.builder && !modes.hirer ? null
      : modes.hirer && !modes.builder ? '/messages?as=hirer'
      : '/messages'

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
        <a href="/" style={{ fontSize: '1.1rem', fontWeight: 700, color: textColor, textDecoration: 'none', letterSpacing: '-0.02em', flexShrink: 0 }}>
          ShipStacked<span style={{ color: accentColor }}>.</span>
        </a>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          <span style={{ display: 'block', width: 22, height: 2, background: textColor, borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: textColor, borderRadius: 2, transition: 'all 0.2s', opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: 'block', width: 22, height: 2, background: textColor, borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      </nav>

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
          {menuLinks.map(link => (
            <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
              style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>
              {link.label}
            </a>
          ))}

          {/* Client-only nav links */}
          {modes.client && !modes.builder && !modes.hirer && (
            <>
              <a href="/client/inbox" onClick={() => setMenuOpen(false)}
                style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>
                My inbox
              </a>
              <a href="/join" onClick={() => setMenuOpen(false)}
                style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>
                Showcase your work
              </a>
              <a href="/for-hirers" onClick={() => setMenuOpen(false)}
                style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>
                Hire talent
              </a>
            </>
          )}

          {!loading && (
            navUser ? (
              <>
                {isAdmin ? (
                  <a href="/admin" onClick={() => setMenuOpen(false)}
                    style={{ fontSize: 15, color: accentColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}`, fontWeight: 500 }}>
                    Admin dashboard
                  </a>
                ) : null}
                {messagesHref && <a href={messagesHref}
                  onClick={() => setMenuOpen(false)}
                  style={{ fontSize: 15, color: textColor, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Messages
                  {unreadCount > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#0071e3', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {unreadCount}
                    </span>
                  )}
                </a>}
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
                <a href="/join" onClick={() => setMenuOpen(false)}
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
