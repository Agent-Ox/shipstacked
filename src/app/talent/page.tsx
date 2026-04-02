import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TalentPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/talent')

  const now = new Date().toISOString()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('email', user.email)
    .eq('status', 'active')
    .eq('product', 'full_access')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()

  if (!sub) redirect('/#pricing')

  // Verified first, then by recency
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, skills(*)')
    .eq('published', true)
    .order('verified', { ascending: false })
    .order('created_at', { ascending: false })

  const verifiedCount = profiles?.filter(p => p.verified).length || 0

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Talent</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.4rem' }}>Claude-native builders</h1>
              <p style={{ fontSize: 15, color: '#6e6e73' }}>
                {profiles?.length || 0} builders · {verifiedCount} verified
              </p>
            </div>
          </div>
        </div>

        {/* Scout prompt bar */}
        <div style={{
          background: 'linear-gradient(135deg, #0f0f18 0%, #1a1a2e 100%)',
          border: '1px solid rgba(108,99,255,0.25)',
          borderRadius: 16,
          padding: '1.5rem 1.75rem',
          marginBottom: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
                <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(240,240,245,0.95)', marginBottom: '0.2rem', letterSpacing: '-0.01em' }}>
                Know exactly what you need?
              </p>
              <p style={{ fontSize: 13, color: 'rgba(167,139,250,0.8)' }}>
                Ask Scout — describe your ideal hire in plain language and get matched instantly.
              </p>
            </div>
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'rgba(240,240,245,0.9)',
            background: 'rgba(108,99,255,0.2)',
            border: '1px solid rgba(108,99,255,0.3)',
            padding: '0.5rem 1.1rem',
            borderRadius: 980,
            whiteSpace: 'nowrap',
            cursor: 'default',
            letterSpacing: '-0.01em',
          }}>
            Scout is active ↘
          </div>
        </div>

        {/* Verified section header */}
        {verifiedCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              ✓ Verified builders
            </span>
            <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
          </div>
        )}

        {!profiles || profiles.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: '1rem' }}>👀</p>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>Profiles coming soon.</h2>
            <p style={{ color: '#6e6e73', fontSize: 14 }}>We are onboarding our first verified builders. Check back shortly.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {profiles.map((profile: any, index: number) => {
              const initials = profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              const claudeSkills = profile.skills?.filter((s: any) => s.category === 'claude_use_case').slice(0, 3) || []
              const otherSkills = profile.skills?.filter((s: any) => s.category !== 'claude_use_case').slice(0, 2) || []

              // Section divider between verified and unverified
              const prevProfile = profiles[index - 1]
              const showUnverifiedDivider = index > 0 && !profile.verified && prevProfile?.verified

              return (
                <>
                  {showUnverifiedDivider && (
                    <div key={`divider-${index}`} style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        All builders
                      </span>
                      <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
                    </div>
                  )}
                  <div key={profile.id} style={{
                    background: 'white',
                    border: `1px solid ${profile.verified ? '#dce8fb' : '#e0e0e5'}`,
                    borderRadius: 14,
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    boxShadow: profile.verified ? '0 2px 12px rgba(0,113,227,0.06)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: profile.verified ? 'linear-gradient(135deg, #e8f1fd, #d0e4fb)' : '#f0f0f5',
                        color: profile.verified ? '#0071e3' : '#6e6e73',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, fontWeight: 700, flexShrink: 0,
                        border: profile.verified ? '1.5px solid rgba(0,113,227,0.2)' : 'none',
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{profile.full_name}</div>
                        <div style={{ fontSize: 13, color: '#6e6e73', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {profile.role}{profile.location ? ` · ${profile.location}` : ''}
                        </div>
                      </div>
                      {profile.verified && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#0071e3', background: '#e8f1fd', padding: '0.2rem 0.5rem', borderRadius: 980, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>

                    {profile.bio && (
                      <p style={{ fontSize: 13, color: '#3d3d3f', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {profile.bio}
                      </p>
                    )}

                    {(claudeSkills.length > 0 || otherSkills.length > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {claudeSkills.map((s: any) => (
                          <span key={s.id} style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#e8f1fd', borderRadius: 980, color: '#0071e3', fontWeight: 500 }}>
                            {s.name}
                          </span>
                        ))}
                        {otherSkills.map((s: any) => (
                          <span key={s.id} style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.5rem' }}>
                      <span style={{
                        fontSize: 11, color: '#6e6e73', textTransform: 'capitalize',
                        background: '#f5f5f7', padding: '0.2rem 0.6rem', borderRadius: 980, fontWeight: 500,
                      }}>
                        {profile.availability || 'open'}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link href={`/u/${profile.username}`} style={{ fontSize: 12, padding: '0.4rem 0.85rem', background: '#f0f0f5', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
                          Profile
                        </Link>
                        {profile.email && (
                          <a href={`mailto:${profile.email}?subject=Opportunity via ClaudHire`} style={{ fontSize: 12, padding: '0.4rem 0.85rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
                            Contact
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
