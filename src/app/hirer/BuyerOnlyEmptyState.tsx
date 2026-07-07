// Empty-state for Card 4 buyer-only users (D2b-1: identified by org-ownership,
// not the retired role='client').
//
// Users who signed up via the /join Card 4 path arrive here with:
//   - a kind='org' entity they own (+ team_admins owner row)
//   - NO subscription (Full Access not yet activated)
//
// Full Access activates on first paid action (post-job, message builder)
// via the existing /api/checkout flow — same as any other path into the
// paid product. No Stripe touch happens here.

import EnableHiringButton from '@/app/components/EnableHiringButton'

export default function BuyerOnlyEmptyState({ email }: { email: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0071e3', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Hirer dashboard</p>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.4rem' }}>Welcome to ShipStacked.</h1>
          <p style={{ fontSize: 15, color: '#6e6e73' }}>Signed in as {email}. Browse the talent directory free — Full Access activates when you message a builder or post a job.</p>
        </div>

        {/* Primary CTA — browse talent */}
        <a href="/talent" style={{ display: 'block', background: '#0071e3', borderRadius: 18, padding: '2rem 2.5rem', textDecoration: 'none', marginBottom: '1rem' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Core product</p>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>Browse talent</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: '1.5rem' }}>Verified AI-native builders, with real proof of work attached.</p>
          <span style={{ display: 'inline-block', background: 'white', color: '#0071e3', padding: '0.6rem 1.25rem', borderRadius: 980, fontSize: 14, fontWeight: 600 }}>Browse talent →</span>
        </a>

        {/* Secondary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '1rem', marginTop: '1rem', marginBottom: '2.5rem' }}>
          {/* Full Access — live toggle (Phase 2). Replaces the static "See pricing"
              card so a buyer-only user activates directly via session-keyed checkout
              instead of bouncing to /hirers#pricing. */}
          <EnableHiringButton source="buyer_empty_state" variant="card" />
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginBottom: '0.5rem' }}>Build Feed</p>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.3rem' }}>See what builders ship</h3>
            <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5, marginBottom: '1rem' }}>Real builds, real outcomes. The signal you want before you hire.</p>
            <a href="/feed" style={{ fontSize: 13, padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500, display: 'inline-block' }}>Open feed</a>
          </div>
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginBottom: '0.5rem' }}>Atlas</p>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.3rem' }}>The implementation map</h3>
            <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5, marginBottom: '1rem' }}>The role taxonomy that classifies AI implementation work.</p>
            <a href="/atlas" style={{ fontSize: 13, padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500, display: 'inline-block' }}>Read Atlas</a>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#aeaeb2', textAlign: 'center', marginTop: '2rem' }}>
          You can switch to a builder profile any time from <a href="/join" style={{ color: '#0071e3', textDecoration: 'none' }}>/join</a>.
        </p>
      </div>
    </div>
  )
}
