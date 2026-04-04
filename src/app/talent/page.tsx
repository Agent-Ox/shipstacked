import React from 'react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Metadata } from 'next'
import { SaveButton } from './SaveButton'

export const metadata: Metadata = {
  title: 'AI-Native Builder Directory | ShipStacked',
  description: 'Browse verified AI-native builders. Vibe coders, prompt engineers, AI automation specialists — all with proven build histories and real outcomes.',
  openGraph: {
    title: 'AI-Native Builder Directory | ShipStacked',
    description: 'Find and hire verified AI-native builders with real proof of work.',
    url: 'https://shipstacked.com/talent',
  },
  alternates: { canonical: 'https://shipstacked.com/talent' },
}

export default async function TalentPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isPaidEmployer = false
  if (user) {
    const now = new Date().toISOString()
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('email', user.email)
      .eq('status', 'active')
      .eq('product', 'full_access')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle()
    isPaidEmployer = !!sub
  }

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, location, bio, avatar_url, verified, availability, velocity_score, skills(*)')
    .eq('published', true)
    .order('verified', { ascending: false })
    .order('velocity_score', { ascending: false })
    .order('created_at', { ascending: false })

  const profiles = allProfiles || []
  const verifiedCount = profiles.filter(p => p.verified).length
  const displayProfiles = isPaidEmployer ? profiles : profiles.slice(0, 6)
  const isTeaser = !isPaidEmployer

  const vColor = (score: number) =>
    score >= 75 ? '#1a7f37' : score >= 50 ? '#0071e3' : score >= 25 ? '#bf7e00' : '#6e6e73'

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>
      <style>{`
        .talent-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: white;
          border: 1px solid #e0e0e5;
          border-radius: 16px;
          padding: 1.25rem;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
        }
        .talent-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .talent-card-verified { border-color: rgba(0,113,227,0.2); }
        .talent-card-verified:hover { border-color: rgba(0,113,227,0.4); box-shadow: 0 8px 24px rgba(0,113,227,0.1); }
        @media (max-width: 640px) {
          .talent-grid { grid-template-columns: 1fr !important; }
          .talent-hdr { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '4rem 1.5rem 5rem', overflowX: 'hidden' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Talent</p>
          <div className="talent-hdr" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.4rem' }}>AI-native builders</h1>
              <p style={{ fontSize: 15, color: '#6e6e73' }}>{profiles.length} builders · {verifiedCount} verified</p>
            </div>
            {isPaidEmployer && (
              <div style={{ fontSize: 13, color: '#6e6e73', background: '#f5f5f7', padding: '0.4rem 0.875rem', borderRadius: 980 }}>Full access</div>
            )}
          </div>
        </div>

        {/* Scout bar — paid employers only */}
        {isPaidEmployer && (
          <div style={{ background: 'linear-gradient(135deg, #0f0f18 0%, #1a1a2e 100%)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 16, padding: '1.5rem 1.75rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/><path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(240,240,245,0.95)', marginBottom: '0.2rem' }}>Know exactly what you need?</p>
                <p style={{ fontSize: 13, color: 'rgba(167,139,250,0.8)' }}>Ask Scout — describe your ideal hire and get matched instantly.</p>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,240,245,0.9)', background: 'rgba(108,99,255,0.2)', border: '1px solid rgba(108,99,255,0.3)', padding: '0.5rem 1.1rem', borderRadius: 980, whiteSpace: 'nowrap' }}>
              Scout is active ↘
            </div>
          </div>
        )}

        {/* Verified divider */}
        {verifiedCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase' }}>✓ Verified builders</span>
            <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
          </div>
        )}

        {profiles.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: '1rem' }}>👀</p>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>Profiles coming soon.</h2>
            <p style={{ color: '#6e6e73', fontSize: 14 }}>We are onboarding our first verified builders. Check back shortly.</p>
          </div>
        ) : (
          <>
            <div className="talent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: '1rem' }}>
              {displayProfiles.map((profile: any, index: number) => {
                const initials = profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                const claudeSkills = profile.skills?.filter((s: any) => s.category === 'claude_use_case').slice(0, 3) || []
                const otherSkills = profile.skills?.filter((s: any) => s.category !== 'claude_use_case').slice(0, 2) || []
                const prev = displayProfiles[index - 1]
                const showDivider = index > 0 && !profile.verified && prev?.verified

                return (
                  <React.Fragment key={profile.id}>
                    {showDivider && (
                      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.05em', textTransform: 'uppercase' }}>All builders</span>
                        <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
                      </div>
                    )}

                    <a href={`/u/${profile.username}`} className={profile.verified ? 'talent-card talent-card-verified' : 'talent-card'}>

                      {isPaidEmployer && (
                        <SaveButton profileId={profile.id} profileName={profile.full_name} />
                      )}

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', paddingRight: isPaidEmployer ? '2.25rem' : 0 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, background: profile.verified ? 'linear-gradient(135deg, #e8f1fd, #d0e4fb)' : '#f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: profile.verified ? '#0071e3' : '#6e6e73', border: profile.verified ? '2px solid rgba(0,113,227,0.2)' : 'none', overflow: 'hidden' }}>
                          {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{profile.full_name}</span>
                            {profile.verified && <span style={{ fontSize: 10, fontWeight: 700, color: '#0071e3', background: '#e8f1fd', padding: '0.15rem 0.45rem', borderRadius: 980 }}>✓ Verified</span>}
                          </div>
                          <div style={{ fontSize: 13, color: '#6e6e73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profile.role}{profile.location ? ` · ${profile.location}` : ''}
                          </div>
                        </div>
                        {(profile.velocity_score || 0) > 0 && (
                          <div style={{ flexShrink: 0, textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: vColor(profile.velocity_score), lineHeight: 1 }}>{profile.velocity_score}</div>
                            <div style={{ fontSize: 9, color: '#aeaeb2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>velocity</div>
                          </div>
                        )}
                      </div>

                      {profile.bio && (
                        <p style={{ fontSize: 13, color: '#3d3d3f', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                          {profile.bio}
                        </p>
                      )}

                      {(claudeSkills.length > 0 || otherSkills.length > 0) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {claudeSkills.map((s: any) => <span key={s.id} style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#e8f1fd', borderRadius: 980, color: '#0071e3', fontWeight: 500 }}>{s.name}</span>)}
                          {otherSkills.map((s: any) => <span key={s.id} style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>{s.name}</span>)}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.25rem' }}>
                        <span style={{ fontSize: 11, color: '#6e6e73', textTransform: 'capitalize', background: '#f5f5f7', padding: '0.2rem 0.6rem', borderRadius: 980, fontWeight: 500 }}>
                          {profile.availability || 'open'}
                        </span>
                        {isPaidEmployer && (
                          <a href={`/employer/messages?new=${profile.id}`} style={{ fontSize: 12, padding: '0.4rem 0.875rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
                            Message →
                          </a>
                        )}
                      </div>
                    </a>
                  </React.Fragment>
                )
              })}
            </div>

            {/* Paywall gate */}
            {isTeaser && (
              <div style={{ marginTop: '2.5rem', textAlign: 'center', padding: '3rem 2rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -80, left: 0, right: 0, height: 120, background: 'linear-gradient(180deg, transparent 0%, #fbfbfd 100%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>🔒</p>
                  <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>
                    {profiles.length > 6 ? `+${profiles.length - 6} more builders` : 'Full directory access'}
                  </h2>
                  <p style={{ fontSize: 15, color: '#6e6e73', maxWidth: 400, margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
                    Get full access to every verified ShipStacked builder. Read their Build Feed, see their Velocity Score, and message them directly — $199/month flat.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="/#pricing" style={{ padding: '0.875rem 2rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
                      Get full access — $199/mo
                    </a>
                    {!user && (
                      <a href="/login" style={{ padding: '0.875rem 1.5rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
                        Sign in
                      </a>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: '#aeaeb2', marginTop: '1rem' }}>No commissions. Cancel anytime.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
