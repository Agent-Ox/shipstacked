import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Velocity Leaderboard | ShipStacked',
  description: 'The top AI-native builders on ShipStacked ranked by Velocity Score — a measure of how much they ship.',
  openGraph: {
    title: 'Velocity Leaderboard | ShipStacked',
    description: 'The builders who ship the most. Ranked by Velocity Score.',
    url: 'https://shipstacked.com/leaderboard',
  },
  alternates: { canonical: 'https://shipstacked.com/leaderboard' },
}

function vColor(score: number) {
  if (score >= 75) return { color: '#1a7f37', bg: '#e6f4ea' }
  if (score >= 50) return { color: '#0071e3', bg: '#e8f1fd' }
  if (score >= 25) return { color: '#bf7e00', bg: '#fef3cd' }
  return { color: '#6e6e73', bg: '#f0f0f5' }
}

const MEDALS = ['🥇', '🥈', '🥉']

export default async function LeaderboardPage() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Session — used for role-based CTA
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role as 'builder' | 'employer' | 'admin' | null ?? null

  // Top 10
  const { data: builders } = await admin
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, location, verified, velocity_score, skills(*)')
    .eq('published', true)
    .gt('velocity_score', 0)
    .order('velocity_score', { ascending: false })
    .limit(10)

  const top = builders || []

  // Builder-specific data: their rank in top 10 + their own score
  let builderProfileId: string | null = null
  let builderScore: number | null = null
  let builderRank: number | null = null // 1-indexed, null if not in top 10

  if (role === 'builder' && user) {
    const { data: bp } = await admin
      .from('profiles')
      .select('id, velocity_score')
      .eq('email', user.email)
      .maybeSingle()

    if (bp) {
      builderProfileId = bp.id
      builderScore = bp.velocity_score ?? 0
      const idx = top.findIndex((b: any) => b.id === bp.id)
      builderRank = idx >= 0 ? idx + 1 : null
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>ShipStacked</p>
          <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', color: '#1d1d1f', marginBottom: '0.5rem', lineHeight: 1.1 }}>
            Velocity<br />Leaderboard
          </h1>
          <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6, maxWidth: 420 }}>
            The builders who ship the most. Ranked by Velocity Score — a live measure of GitHub commits, Build Feed posts, and profile completeness.
          </p>
        </div>

        <style>{`
          .lb-row {
            display: flex; align-items: center; gap: 1rem;
            background: white; border: 1px solid #e0e0e5; border-radius: 16px;
            padding: 1rem 1.25rem; text-decoration: none; color: inherit;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          .lb-row:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
          .lb-gold   { border-color: rgba(255,199,0,0.4); box-shadow: 0 2px 12px rgba(255,199,0,0.12); }
          .lb-silver { border-color: rgba(180,180,190,0.4); }
          .lb-bronze { border-color: rgba(180,120,60,0.3); }
          .lb-gold:hover   { box-shadow: 0 6px 20px rgba(255,199,0,0.2); }
          .lb-me { border-color: rgba(0,113,227,0.35) !important; box-shadow: 0 0 0 3px rgba(0,113,227,0.08) !important; }
          .lb-me:hover { box-shadow: 0 6px 20px rgba(0,113,227,0.15) !important; }
        `}</style>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {top.map((builder: any, i: number) => {
            const vc = vColor(builder.velocity_score)
            const initials = builder.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
            const topSkill = builder.skills?.find((s: any) => s.category === 'claude_use_case') || builder.skills?.[0]
            const isMedal = i < 3
            const isMe = builder.id === builderProfileId

            let rowClass = i === 0 ? 'lb-row lb-gold' : i === 1 ? 'lb-row lb-silver' : i === 2 ? 'lb-row lb-bronze' : 'lb-row'
            if (isMe) rowClass += ' lb-me'

            return (
              <a key={builder.id} href={`/u/${builder.username}`} className={rowClass}>
                {/* Rank */}
                <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                  {isMedal
                    ? <span style={{ fontSize: 22 }}>{MEDALS[i]}</span>
                    : <span style={{ fontSize: 15, fontWeight: 700, color: '#aeaeb2' }}>{i + 1}</span>
                  }
                </div>

                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: builder.verified ? 'linear-gradient(135deg, #e8f1fd, #d0e4fb)' : '#f0f0f5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700,
                  color: builder.verified ? '#0071e3' : '#6e6e73',
                  border: builder.verified ? '2px solid rgba(0,113,227,0.2)' : 'none',
                  overflow: 'hidden',
                }}>
                  {builder.avatar_url
                    ? <img src={builder.avatar_url} alt={builder.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials}
                </div>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{builder.full_name}</span>
                    {builder.verified && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#0071e3', background: '#e8f1fd', padding: '0.1rem 0.4rem', borderRadius: 980, flexShrink: 0 }}>✓</span>
                    )}
                    {isMe && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#0071e3', background: '#e8f1fd', padding: '0.1rem 0.4rem', borderRadius: 980, flexShrink: 0 }}>You</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#6e6e73', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {builder.role}{builder.location ? ` · ${builder.location}` : ''}
                  </div>
                  {topSkill && (
                    <span style={{ display: 'inline-block', marginTop: '0.3rem', fontSize: 11, padding: '0.15rem 0.5rem', background: '#e8f1fd', borderRadius: 980, color: '#0071e3', fontWeight: 500 }}>
                      {topSkill.name}
                    </span>
                  )}
                </div>

                {/* Score */}
                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: vc.color, background: vc.bg, borderRadius: 10, padding: '0.3rem 0.75rem', lineHeight: 1.2 }}>
                    {builder.velocity_score}
                  </div>
                  <div style={{ fontSize: 9, color: '#aeaeb2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '0.2rem' }}>velocity</div>
                </div>
              </a>
            )
          })}
        </div>

        {top.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#6e6e73' }}>
            <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>🚀</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>No builders yet</p>
            <p style={{ fontSize: 14 }}>Be the first to claim the top spot.</p>
          </div>
        )}

        {/* Role-based CTA */}
        {role === null && (
          // Logged out — acquisition
          <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>Want to climb the leaderboard?</p>
            <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Post builds to the Build Feed, connect GitHub, and complete your profile to increase your Velocity Score.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/join" style={{ padding: '0.65rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Join ShipStacked
              </a>
              <a href="/feed" style={{ padding: '0.65rem 1.5rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                Build Feed →
              </a>
            </div>
          </div>
        )}

        {role === 'builder' && builderScore !== null && (
          // Builder — personalised rank
          <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'white', border: '1px solid #e0e0e5', borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                {builderRank !== null ? (
                  <>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.25rem' }}>
                      You are ranked #{builderRank} 🎉
                    </p>
                    <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>
                      Your velocity score is {builderScore}. Keep posting builds to hold your spot.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.25rem' }}>
                      You are not in the top 10 yet
                    </p>
                    <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>
                      Your velocity score is {builderScore}. Post builds, connect GitHub, and complete your profile to climb.
                    </p>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0, flexWrap: 'wrap' }}>
                <a href="/feed" style={{ padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Post a build →
                </a>
                <a href="/dashboard" style={{ padding: '0.6rem 1.25rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                  Dashboard
                </a>
              </div>
            </div>
          </div>
        )}

        {role === 'employer' && (
          // Employer — conversion to talent
          <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>Ready to hire?</p>
            <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Browse the full directory and message any builder directly — $199/month flat, no placement fees.
            </p>
            <a href="/talent" style={{ display: 'inline-block', padding: '0.65rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Browse all builders →
            </a>
          </div>
        )}

        {/* role === 'admin' — no CTA */}

      </div>
    </div>
  )
}
