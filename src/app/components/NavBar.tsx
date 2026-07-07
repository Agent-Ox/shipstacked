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

const EMPTY_MODES: EntityModes = { builder: false, hirer: false, member: false, admin: false, team_admin: false, agent_owner: false }

export default function NavBar() {
  const [navUser, setNavUser] = useState<NavUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  // org_offers_services — resolved server-side (via /api/messages/unread; the
  // browser client can't read team_profiles). Distinguishes a service-org owner
  // (gets the team "Dashboard" link) from a buyer-org owner (does not). Replaces
  // the retired `!modes.client` proxy.
  const [orgOffersServices, setOrgOffersServices] = useState(false)
  // org_published — the owned org's team_profiles.published, resolved server-side
  // (same channel as org_offers_services). Gates the "View company profile" link
  // to /team/<slug> so it never points at an unpublished (404) org page. Replaces
  // the removed employer_profiles slug/public read (Stage 5d).
  const [orgPublished, setOrgPublished] = useState(false)
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
  const isAdmin = modes.admin

  // Phase 9 Part 1.6: mode-driven, deterministic menu. Resolves purely from the
  // user's modes + identity refs — NEVER from pathname. The same user sees the
  // same menu on every page (fixes the "two navs" inconsistency where a
  // builder+hirer saw different links on /dashboard vs /hirer).
  const getMenuLinks = () => {
    // ---- Unauthenticated (any page) ---- (unchanged)
    if (!navUser) {
      return [
        { label: 'Atlas', href: '/atlas' },
        { label: 'How it works', href: '/how-it-works' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Build Feed', href: '/feed' },
        { label: 'Browse talent', href: '/talent' },
      ]
    }

    const links: { label: string; href: string }[] = []

    // Admin link is additive — admins may also be builders/hirers/etc.
    if (isAdmin) links.push({ label: 'Admin dashboard', href: '/admin' })

    // Common to all authenticated non-client users.
    links.push({ label: 'Atlas', href: '/atlas' })
    links.push({ label: 'Build Feed', href: '/feed' })
    links.push({ label: 'Jobs', href: '/jobs' })

    if (modes.hirer) {
      links.push({ label: 'Browse talent', href: '/talent' })
      links.push({ label: 'Post a job', href: '/post-job' })
      links.push({ label: 'Hirer dashboard', href: '/hirer' })
      links.push({ label: 'Edit company', href: '/hirer#company-form' })
      // Stage 5d: link the unified org page only when the org is published
      // (/team/[slug] 404s otherwise). teamSlug = the owned org; orgPublished
      // resolved server-side via /api/messages/unread (browser can't read
      // team_profiles). Replaces the removed employer_profiles slug/public read.
      if (teamSlug && orgPublished) {
        links.push({ label: 'View company profile', href: `/team/${teamSlug}` })
      }
    }

    if (modes.builder) {
      links.push({ label: 'Builder dashboard', href: '/dashboard' })
      links.push({ label: 'Edit builder profile', href: '/dashboard/edit' })
    }

    // Pure service-org owner → "Dashboard" (the team command center). A buyer
    // also owns an org (team_admin=true) but offers no services and must NOT get
    // this link — they keep "Hirer dashboard" from the modes.hirer branch above.
    // The canonical capability is team_profiles.offers_services, resolved
    // server-side (getUserState refs.org_offers_services) and delivered to this
    // client component via /api/messages/unread as `orgOffersServices` — the
    // browser client can't read team_profiles directly (no self-read RLS). This
    // replaces the retired `!modes.client` proxy. (A builder already has "Builder
    // dashboard", so !modes.builder avoids doubling up.)
    if (modes.team_admin && !modes.builder && orgOffersServices) {
      links.push({ label: 'Dashboard', href: '/dashboard' })
    }

    if (modes.agent_owner && agentSlug) {
      links.push({ label: 'Edit agent', href: `/agent/${agentSlug}/edit` })
    }

    return links
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
        member: !!sub,
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
      // Aggregated unread count + server-resolved org flags: org_offers_services
      // (buyer-org vs service-org "Dashboard" link) and org_published (gates the
      // "View company profile" → /team link). The browser can't read team_profiles.
      fetch('/api/messages/unread').then(r => r.json()).then(({ unread, org_offers_services, org_published }) => {
        setUnreadCount(unread || 0)
        setOrgOffersServices(org_offers_services === true)
        setOrgPublished(org_published === true)
      }).catch(() => {})
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
      links.push({ label: 'Your builder profile', href: `/u/${profileUsername}` })
    }
    if (teamSlug) {
      links.push({ label: 'Your team', href: `/team/${teamSlug}` })
    }
    if (agentSlug) {
      links.push({ label: 'Your agent', href: `/agent/${agentSlug}` })
    }
    // Phase 9 Part 1.6: Edit team / Edit agent moved into getMenuLinks()
    // (unconditional per mode, no longer page-dependent).
    return links
  }

  const menuLinks = [...getMenuLinks(), ...getIdentityLinks()]

  // Resolve messages href: hirer-mode users get ?as=hirer; builders get plain /messages.
  const messagesHref =
    modes.hirer && !modes.builder ? '/messages?as=hirer'
      : modes.team_admin && !modes.builder && !modes.hirer ? '/messages?as=team'
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
