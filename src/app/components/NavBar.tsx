'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { usePathname } from 'next/navigation'
import type { EntityModes } from '@/lib/user'

type NavUser = {
  email: string
  modes: EntityModes
  // Phase 8 §F Block 2 — identity affordances (additive; modes stays the 4
  // canonical booleans). v1 surfaces the FIRST team admined / agent owned.
  profileUsername: string | null
  teamSlug: string | null
  agentSlug: string | null
}

const EMPTY_MODES: EntityModes = { builder: false, hirer: false, client: false, admin: false, team_admin: false, agent_owner: false }

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
  const profileUsername = navUser?.profileUsername ?? null
  const teamSlug = navUser?.teamSlug ?? null
  const agentSlug = navUser?.agentSlug ?? null
  // Phase 9: the Dashboard link always points at the pillar-aware /dashboard for
  // authenticated users; the dashboard handles all pillar branching internally.
  // (Only used by the fallback menu branch for users with no role-specific menu.)
  const dashboardLink = '/dashboard'
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

    // Phase 8 §F Block 3: auth detection extracted so it runs on mount AND on
    // realtime auth changes (sign-in / sign-out / token refresh) — nav updates
    // without a page navigation.
    const loadAuthState = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!session) { if (!cancelled) { setNavUser(null); setLoading(false) } return }
      const user = session.user
      const email = user.email || ''
      const metaRole = user.user_metadata?.role

      const now = new Date().toISOString()
      // Phase 8 §F Block 2: 4 parallel queries (added team_admins + agent
      // entities). Browser client + user session; RLS-gated. entities has a
      // public-read policy; team_admins self-read added in §F.B2.7 — both render.
      const [{ data: sub }, { data: profile }, { data: teamAdmin }, { data: agentEntity }] = await Promise.all([
        supabase.from('subscriptions').select('id').eq('email', email).eq('status', 'active').eq('product', 'full_access').or(`expires_at.is.null,expires_at.gt.${now}`).maybeSingle(),
        supabase.from('profiles').select('id, username').eq('email', email).maybeSingle(),
        supabase.from('team_admins').select('team:entities!team_admins_team_entity_id_fkey(slug)').eq('user_id', user.id).limit(1).maybeSingle(),
        supabase.from('entities').select('slug').eq('kind', 'agent').eq('owner_user_id', user.id).limit(1).maybeSingle(),
      ])

      if (cancelled) return
      const modes: EntityModes = {
        builder: !!profile,
        hirer: !!sub,
        client: metaRole === 'client',
        admin: metaRole === 'admin',
        team_admin: !!teamAdmin,
        agent_owner: !!agentEntity,
      }
      const teamRel = (teamAdmin as any)?.team
      const teamSlug = (Array.isArray(teamRel) ? teamRel[0]?.slug : teamRel?.slug) ?? null
      setNavUser({
        email,
        modes,
        profileUsername: (profile as any)?.username ?? null,
        teamSlug,
        agentSlug: (agentEntity as any)?.slug ?? null,
      })
      setLoading(false)
      // Aggregated unread count across all active messaging modes
      fetch('/api/messages/unread').then(r => r.json()).then(({ unread }) => setUnreadCount(unread || 0)).catch(() => {})
    }

    supabase.auth.getSession().then(({ data: { session } }) => loadAuthState(session))

    // Realtime: keep nav in sync with auth without requiring a navigation.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { if (!cancelled) { setNavUser(null); setLoading(false) } return }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') loadAuthState(session)
    })

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  // Phase 8 §F Block 3: close the hamburger menu on Escape (scoped to open).
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [menuOpen])

  // Phase 8 §F Block 2 — identity affordances, appended to the role-based menu
  // for any authenticated user. Additive: a builder + team admin + agent owner
  // sees their dashboard links AND their team AND their agent. Edit links surface
  // only when viewing the team/agent page they own.
  const getIdentityLinks = (): { label: string; href: string }[] => {
    if (!navUser) return []
    const links: { label: string; href: string }[] = []
    if (profileUsername && pathname !== `/u/${profileUsername}`) {
      links.push({ label: 'Your profile', href: `/u/${profileUsername}` })
    }
    if (teamSlug) {
      links.push({ label: 'Your team', href: `/team/${teamSlug}` })
      if (pathname === `/team/${teamSlug}`) links.push({ label: 'Edit team', href: `/team/${teamSlug}/edit` })
    }
    if (agentSlug) {
      links.push({ label: 'Your agent', href: `/agent/${agentSlug}` })
      if (pathname === `/agent/${agentSlug}`) links.push({ label: 'Edit agent', href: `/agent/${agentSlug}/edit` })
    }
    return links
  }

  const menuLinks = [...getMenuLinks(), ...getIdentityLinks()]

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

      {/* Phase 8 §F Block 3: click-outside-to-close backdrop. Transparent (not a
          dimming scrim — keeps the minimal aesthetic); z-index 98 sits below the
          menu (99) so menu items still receive clicks, and below the nav (100)
          so the hamburger stays clickable to toggle closed. */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 98 }}
        />
      )}

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
          {menuLinks.map(link => {
            // Phase 8 §F Block 3: active-page indicator (exact pathname match).
            const isActive = link.href === pathname
            return (
              <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                style={{ fontSize: 15, color: isActive ? accentColor : textColor, fontWeight: isActive ? 600 : 400, textDecoration: 'none', padding: '0.7rem 0', borderBottom: `0.5px solid ${mobileBorder}` }}>
                {link.label}
              </a>
            )
          })}

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
