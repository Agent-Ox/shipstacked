'use client'

import type { EntityModes } from '@/lib/user'

interface FeedPostCTAProps {
  modes: EntityModes
  isLoggedIn: boolean
  isOwnPost: boolean
}

// Contacting a builder is member-gated (Full Access). The old free passwordless
// inquiry form was removed in D2b-1 — a visitor who wants to reach a builder now
// goes through the Full Access paywall like every other contact path.
export default function FeedPostCTA({
  modes,
  isLoggedIn,
  isOwnPost,
}: FeedPostCTAProps) {
  if (isOwnPost) return null
  // B.10e — hide CTA only for hirer-only entities. Builder+hirer entities
  // still see the CTA (their builder side is the relevant identity here).
  if (isLoggedIn && modes.hirer && !modes.builder) return null

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '1.5rem' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Hiring?
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>
          Get full access to the talent directory
        </p>
        <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6, marginBottom: '1rem' }}>
          Search verified AI builders, message them directly, and post roles. $199/month.
        </p>
        <a href="/hirers" style={{ display: 'inline-block', padding: '0.7rem 1.25rem', background: '#1d1d1f', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Get Full Access</a>
      </div>
    </div>
  )
}
