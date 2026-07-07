import { createClient } from '@supabase/supabase-js'
import EnableHiringButton from '@/app/components/EnableHiringButton'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Phase 9 Part 1 — buyer-only home on /dashboard. Talent shortcut + saved
// shortlists + Full Access + subscription status.
export default async function BuyerSection({
  email, hasSubscription,
}: { email: string; hasSubscription: boolean }) {
  const admin = adminClient()

  const { count: shortlistCount } = await admin
    .from('saved_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('employer_email', email)

  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Hiring</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em', marginBottom: '0.2rem' }}>Find AI-native talent</p>
          <p style={{ fontSize: 13, color: '#6e6e73' }}>Browse the verified builder directory and save shortlists.</p>
        </div>
        <a href="/talent" style={{ padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>Browse talent →</a>
      </div>

      <div style={{ borderTop: '0.5px solid #f0f0f5', paddingTop: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>Saved shortlists</p>
          <p style={{ fontSize: 13, color: '#6e6e73' }}>{shortlistCount || 0} builder{(shortlistCount || 0) === 1 ? '' : 's'} saved</p>
        </div>
        <a href="/talent" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>Add more →</a>
      </div>

      {/* Subscription status + Full Access toggle */}
      <div style={{ borderTop: '0.5px solid #f0f0f5', paddingTop: '1.25rem' }}>
        {hasSubscription ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1a7f37', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Full Access</p>
              <p style={{ fontSize: 14, color: '#1d1d1f' }}>✓ Active — billed to {email}</p>
            </div>
            <a href="/hirer" style={{ fontSize: 13, padding: '0.5rem 1.25rem', background: 'white', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Manage at hirer dashboard →</a>
          </div>
        ) : (
          <EnableHiringButton source="buyer_empty_state" variant="card" />
        )}
      </div>
    </div>
  )
}
