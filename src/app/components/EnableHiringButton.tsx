'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import posthog from 'posthog-js'

type Source = 'hirers_authed' | 'hirers' | 'dashboard_enable_hiring' | 'buyer_empty_state' | 'homepage' | 'talent_teaser' | 'team_dashboard' | 'agent_dashboard'

type Props = {
  /**
   * Where the button is rendered. Drives the posthog event source and influences copy slightly.
   * Anonymous-state callers (e.g. /hirers logged-out) typically render their own email-input
   * flow and don't use this component; if they do, pass source explicitly.
   */
  source: Source
  /**
   * Visual variant. 'primary' = filled solid button (homepage hero, hirers pricing card).
   * 'card' = full-width card-style block (dashboard slot, buyer empty state).
   * Defaults to 'primary'.
   */
  variant?: 'primary' | 'card'
}

type State =
  | { kind: 'loading' }
  | { kind: 'anonymous' }
  | { kind: 'authed_no_hiring'; email: string }
  | { kind: 'authed_hiring'; email: string }

/**
 * Phase 2: composable Full Access toggle. Renders one of four UI states based on session +
 * subscription. Self-resolves via supabase.auth.getUser() + a subscriptions check
 * (decision D1 in docs/audit/DISCOVERY_phase2_buyer_mode.md).
 *
 * - Loading: brief spinner during initial auth resolve.
 * - Anonymous: returns null. Host page renders its existing email-input flow.
 * - Authed, no hiring: "Get Full Access — $199/mo" + "Billed to <email>" → session-keyed checkout.
 * - Authed, hiring active: "✓ Full Access active — Manage at hirer dashboard" → links to /hirer.
 */
export default function EnableHiringButton({ source, variant = 'primary' }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user || !user.email) {
          setState({ kind: 'anonymous' })
          return
        }
        // Check subscription server-side via lightweight query.
        // Mirrors getEntityModes' hirer-mode logic (status='active', product='full_access',
        // not expired by expires_at OR current_period_end).
        const now = new Date().toISOString()
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('email', user.email)
          .eq('status', 'active')
          .eq('product', 'full_access')
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .or(`current_period_end.is.null,current_period_end.gt.${now}`)
          .maybeSingle()
        if (cancelled) return
        if (sub) {
          setState({ kind: 'authed_hiring', email: user.email })
        } else {
          setState({ kind: 'authed_no_hiring', email: user.email })
        }
      } catch {
        if (!cancelled) setState({ kind: 'anonymous' })
      }
    })()

    return () => { cancelled = true }
  }, [])

  const handleEnable = async () => {
    if (state.kind !== 'authed_no_hiring' || submitting) return
    setSubmitting(true)
    try {
      posthog.capture('subscribe_clicked', { source })
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Empty body — /api/checkout reads the session email server-side (Phase 2 Item 2a).
        body: JSON.stringify({ product: 'full_access' }),
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        setSubmitting(false)
      }
    } catch {
      setSubmitting(false)
    }
  }

  if (state.kind === 'loading') {
    // Render a placeholder of the same approximate height to avoid layout shift.
    return <div style={{ height: variant === 'card' ? 80 : 44 }} aria-hidden="true" />
  }

  if (state.kind === 'anonymous') {
    // Host page renders its own email-input checkout. This component is a no-op for anon.
    return null
  }

  if (state.kind === 'authed_hiring') {
    // Active state. Link to /hirer (the hirer dashboard) for management.
    if (variant === 'card') {
      return (
        <div style={{
          background: '#f0faf0', border: '1px solid #b3e0b3', borderRadius: 14,
          padding: '1.25rem 1.5rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#1a7f37', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Full Access</p>
            <p style={{ fontSize: 14, color: '#1d1d1f' }}>✓ Active — Billed to {state.email}</p>
          </div>
          <a href="/hirer" style={{ fontSize: 13, padding: '0.5rem 1.25rem', background: 'white', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Manage at hirer dashboard →</a>
        </div>
      )
    }
    return (
      <a href="/hirer" style={{
        display: 'inline-block', fontSize: 14, padding: '0.75rem 1.5rem',
        background: '#1a7f37', color: 'white', borderRadius: 980,
        textDecoration: 'none', fontWeight: 600,
      }}>✓ Full Access active — Manage at hirer dashboard</a>
    )
  }

  // authed_no_hiring
  if (variant === 'card') {
    return (
      <div style={{
        background: 'white', border: '1px solid #e0e0e5', borderRadius: 14,
        padding: '1.5rem', marginBottom: '1rem',
      }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Full Access</p>
        <p style={{ fontSize: 14, color: '#1d1d1f', marginBottom: '0.5rem', lineHeight: 1.5 }}>Hire AI builders, teams, and agents from this network. Browse the full talent directory, message builders, post jobs.</p>
        <p style={{ fontSize: 12, color: '#6e6e73', marginBottom: '1rem' }}>Billed to {state.email}</p>
        <button onClick={handleEnable} disabled={submitting} style={{
          fontSize: 14, padding: '0.75rem 1.5rem',
          background: submitting ? '#aeaeb2' : '#0071e3',
          color: 'white', border: 'none', borderRadius: 980,
          cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit',
        }}>{submitting ? 'Loading…' : 'Get Full Access — $199/mo'}</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
      <button onClick={handleEnable} disabled={submitting} style={{
        fontSize: 14, padding: '0.75rem 1.5rem',
        background: submitting ? '#aeaeb2' : '#0071e3',
        color: 'white', border: 'none', borderRadius: 980,
        cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit',
      }}>{submitting ? 'Loading…' : 'Get Full Access — $199/mo'}</button>
      <p style={{ fontSize: 11, color: '#6e6e73' }}>Billed to {state.email}</p>
    </div>
  )
}
