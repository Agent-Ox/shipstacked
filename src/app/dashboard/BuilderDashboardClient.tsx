'use client'

import { useState } from 'react'
import ShareButtons from '@/app/u/[username]/ShareButtons'

function calcScore(profile: any): { score: number, tips: string[] } {
  const tips: string[] = []
  let score = 0

  if (profile.avatar_url) score += 10; else tips.push('Add a profile photo — profiles with photos get more employer attention')
  if (profile.full_name) score += 5; else tips.push('Add your full name')
  if (profile.role) score += 5; else tips.push('Add your role or title')
  if (profile.location) score += 5; else tips.push('Add your location')
  if (profile.bio) score += 10; else tips.push('Add a one-line bio — this is what employers see first')
  if (profile.about) score += 10; else tips.push('Add an about section describing what you build')
  if (profile.projects && profile.projects.length >= 1) score += 15; else tips.push('Add at least one project with real outcomes')
  if (profile.projects && profile.projects.length >= 3) score += 10; else if (profile.projects?.length >= 1) tips.push('Add 2 more projects to strengthen your profile')
  if (profile.skills && profile.skills.length >= 3) score += 10; else tips.push('Select your Claude use cases and skills')
  if (profile.github_url || profile.x_url || profile.linkedin_url || profile.website_url) score += 5; else tips.push('Add at least one social link')
  if (profile.primary_profession) score += 5; else tips.push('Add your primary profession')
  if (profile.seniority) score += 5; else tips.push('Add your seniority level')
  if (profile.work_type) score += 5; else tips.push('Add your work type preference')
  if (profile.day_rate) score += 5; else tips.push('Add your day rate — employers filter by budget')
  if (profile.timezone) score += 5; else tips.push('Add your timezone')

  return { score: Math.min(score, 100), tips: tips.slice(0, 3) }
}

function ScoreRing({ score }: { score: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 80 ? '#1a7f37' : score >= 50 ? '#0071e3' : '#bf7e00'

  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e0e0e5" strokeWidth="6"/>
      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={circ - dash}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>{score}</text>
    </svg>
  )
}

export default function BuilderDashboardClient({
  profile,
  applications,
  employers,
  email,
}: {
  profile: any
  applications: any[]
  employers: any[]
  email: string
}) {
  const [requestSent, setRequestSent] = useState(false)
  const [requesting, setRequesting] = useState(false)

  const profileUrl = profile ? 'https://claudhire.com/u/' + profile.username : ''
  const { score, tips } = profile ? calcScore(profile) : { score: 0, tips: [] }
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const requestVerification = async () => {
    setRequesting(true)
    try {
      await fetch('/api/verify-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: profile?.full_name, username: profile?.username })
      })
      setRequestSent(true)
    } catch {}
    setRequesting(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.3rem' }}>
            Welcome back, {firstName}.
          </h1>
          <p style={{ color: '#6e6e73', fontSize: 15 }}>Your ClaudHire builder dashboard.</p>
        </div>

        {!profile ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#6e6e73', marginBottom: '1rem', fontSize: 15 }}>You do not have a profile yet.</p>
            <a href="/join" style={{ padding: '0.75rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 20, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Create your profile
            </a>
          </div>
        ) : (
          <>
            {/* Top grid — score + verification + profile */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

              {/* Profile strength */}
              <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Profile strength</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: tips.length ? '1rem' : 0 }}>
                  <ScoreRing score={score} />
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.2rem' }}>
                      {score >= 80 ? 'Strong profile' : score >= 50 ? 'Good start' : 'Needs work'}
                    </p>
                    <p style={{ fontSize: 13, color: '#6e6e73' }}>{score}/100</p>
                  </div>
                </div>
                {tips.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {tips.map((tip, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: 12, color: '#6e6e73', lineHeight: 1.4 }}>
                        <span style={{ color: '#bf7e00', flexShrink: 0, marginTop: 1 }}>→</span>
                        <a href="/dashboard/edit" style={{ color: '#0071e3', textDecoration: 'none' }}>{tip}</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verification */}
              <div style={{ background: profile.verified ? '#f0faf0' : 'white', border: profile.verified ? '1px solid #b3e0b3' : '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Verified status</p>
                {profile.verified ? (
                  <>
                    <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>✓</div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#1a7f37', marginBottom: '0.3rem' }}>Verified builder</p>
                    <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5 }}>Your profile carries the ClaudHire verified badge. Employers trust verified builders.</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>○</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>Not yet verified</p>
                    <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, marginBottom: '1rem' }}>We manually review your projects. A strong profile with real outcomes gets verified faster.</p>
                    {requestSent ? (
                      <span style={{ fontSize: 13, color: '#1a7f37', fontWeight: 500 }}>✓ Request sent</span>
                    ) : (
                      <button
                        onClick={requestVerification}
                        disabled={requesting || score < 50}
                        style={{ fontSize: 13, padding: '0.5rem 1rem', background: score >= 50 ? '#0071e3' : '#f0f0f5', color: score >= 50 ? 'white' : '#aeaeb2', border: 'none', borderRadius: 980, cursor: score >= 50 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 500 }}>
                        {requesting ? 'Sending...' : score < 50 ? 'Complete profile first' : 'Request verification'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Profile link */}
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Your profile</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>claudhire.com/u/{profile.username}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href="/dashboard/edit" style={{ padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                  Edit profile
                </a>
                <a href={"/u/" + profile.username} style={{ padding: '0.5rem 1rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                  View live
                </a>
              </div>
            </div>

            {/* Scout for builders */}
            <div style={{ background: 'linear-gradient(135deg, #0f0f18, #1a1a2e)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
                    <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(240,240,245,0.95)', marginBottom: '0.2rem' }}>Ask Scout who is hiring</p>
                  <p style={{ fontSize: 12, color: 'rgba(167,139,250,0.8)' }}>Scout knows every employer on ClaudHire. Ask it who is looking for your skillset right now.</p>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(240,240,245,0.7)', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.25)', padding: '0.4rem 0.875rem', borderRadius: 980, whiteSpace: 'nowrap' }}>
                Scout is active
              </div>
            </div>

            {/* Applications */}
            {applications.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Your applications</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {applications.map((app: any) => (
                    <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '0.5px solid #f0f0f5' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', marginBottom: '0.15rem' }}>{app.jobs?.role_title || 'Role'}</p>
                        <p style={{ fontSize: 12, color: '#6e6e73' }}>{app.jobs?.company_name || 'Company'} · {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '0.2rem 0.6rem', background: '#e3f3e3', color: '#1a7f37', borderRadius: 980 }}>Applied</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Employer directory */}
            {employers.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Companies hiring</p>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem' }}>These employers are actively looking for Claude builders.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {employers.map((emp: any) => {
                    const initials = emp.company_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <a key={emp.id} href={"/company/" + emp.slug} style={{ display: 'block', background: '#f5f5f7', borderRadius: 12, padding: '1rem', textDecoration: 'none', transition: 'background 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#e8e8ed')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#f5f5f7')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0071e3', flexShrink: 0 }}>
                            {initials}
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{emp.company_name}</p>
                        </div>
                        {emp.location && <p style={{ fontSize: 11, color: '#6e6e73' }}>{emp.location}</p>}
                        {emp.what_they_build && <p style={{ fontSize: 11, color: '#6e6e73', marginTop: '0.25rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{emp.what_they_build}</p>}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Share */}
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Share your profile</p>
              <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem' }}>Let the world know you build with Claude.</p>
              <ShareButtons name={profile.full_name} url={profileUrl} />
            </div>

          </>
        )}
      </div>
    </div>
  )
}
