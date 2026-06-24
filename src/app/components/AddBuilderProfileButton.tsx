'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Props = {
  /** The team this CTA appears on — pre-links the new builder profile to it via ?team=. */
  teamEntityId: number
}

type State =
  | { kind: 'loading' }
  | { kind: 'anonymous' }
  | { kind: 'has_profile' }
  | { kind: 'no_profile' }

/**
 * Growth loop for team owners (Card-2 signups with no builder profile).
 * Self-resolving, mirroring EnableHiringButton:
 *  - loading / anonymous → render nothing (no layout commitment for non-owners).
 *  - already has a builder profile → a small ✓ state linking to the dashboard.
 *  - logged-in, no builder profile → an OPTIONAL card → /join?card=builder&team={id},
 *    which reuses the existing authenticated builder flow (no new signup/password)
 *    and auto-joins this team (ownership re-validated server-side in /join).
 */
export default function AddBuilderProfileButton({ teamEntityId }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) { setState({ kind: 'anonymous' }); return }
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .maybeSingle()
        if (cancelled) return
        setState(profile?.username ? { kind: 'has_profile' } : { kind: 'no_profile' })
      } catch {
        if (!cancelled) setState({ kind: 'anonymous' })
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (state.kind === 'loading') return <div style={{ height: 80 }} aria-hidden="true" />
  if (state.kind === 'anonymous') return null

  if (state.kind === 'has_profile') {
    return (
      <div style={{
        background: '#f0faf0', border: '1px solid #b3e0b3', borderRadius: 14,
        padding: '1.25rem 1.5rem', marginBottom: '1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#1a7f37', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Builder profile</p>
          <p style={{ fontSize: 14, color: '#1d1d1f' }}>✓ You have a builder profile</p>
        </div>
        <a href="/dashboard/edit" style={{ fontSize: 13, padding: '0.5rem 1.25rem', background: 'white', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Edit profile →</a>
      </div>
    )
  }

  // no_profile — the optional growth CTA.
  return (
    <div style={{
      background: 'white', border: '1px solid #e0e0e5', borderRadius: 14,
      padding: '1.5rem', marginBottom: '1rem',
    }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Your builder profile</p>
      <p style={{ fontSize: 14, color: '#1d1d1f', marginBottom: '1rem', lineHeight: 1.5 }}>Get your own proof-of-work profile, appear on your team, and get discovered as an AI builder. Same account — no new sign-up.</p>
      <a href={`/join?card=builder&team=${teamEntityId}`} style={{
        display: 'inline-block', fontSize: 14, padding: '0.75rem 1.5rem',
        background: '#0071e3', color: 'white', borderRadius: 980,
        textDecoration: 'none', fontWeight: 600,
      }}>Create my builder profile →</a>
    </div>
  )
}
