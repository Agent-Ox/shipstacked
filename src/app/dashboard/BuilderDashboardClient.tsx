'use client'

import { useState, useEffect } from 'react'
import ShareButtons from '@/app/u/[username]/ShareButtons'
import FeedPostForm from '@/app/feed/FeedPostForm'

const MILESTONE_SCORES = [25, 50, 75, 100]

function VelocityRing({ score }: { score: number }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 75 ? '#1a7f37' : score >= 50 ? '#0071e3' : score >= 25 ? '#bf7e00' : '#aeaeb2'
  const label = score >= 75 ? 'High velocity' : score >= 50 ? 'Building' : score >= 25 ? 'Getting started' : 'Just started'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width="92" height="92" viewBox="0 0 92 92">
          <circle cx="46" cy="46" r={r} fill="none" stroke="#e0e0e5" strokeWidth="7"/>
          <circle cx="46" cy="46" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={circ} strokeDashoffset={circ - dash}
            strokeLinecap="round" transform="rotate(-90 46 46)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
          <text x="46" y="42" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{score}</text>
          <text x="46" y="56" textAnchor="middle" fontSize="9" fontWeight="600" fill="#aeaeb2" letterSpacing="0.5">/100</text>
        </svg>
      </div>
      <div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.2rem', letterSpacing: '-0.02em' }}>{label}</p>
        <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5 }}>Velocity Score — based on GitHub activity, builds shipped, and profile completeness.</p>
      </div>
    </div>
  )
}

export default function BuilderDashboardClient({
  profile,
  applications,
  employers,
  email,
  githubData,
  velocityScore: initialScore,
  provenPostCount,
  agentMode = false,
}: {
  profile: any
  applications: any[]
  employers: any[]
  email: string
  githubData: any | null
  velocityScore: number
  provenPostCount: number
  agentMode?: boolean
}) {
  const [requestSent, setRequestSent] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [githubStatus, setGithubStatus] = useState<'idle' | 'just_connected' | 'error'>('idle')
  const [velocityScore, setVelocityScore] = useState(initialScore)
  const [scoreBreakdown, setScoreBreakdown] = useState<{ github: number, feed: number, completeness: number } | null>(null)
  const [milestoneHit, setMilestoneHit] = useState<number | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [keysLoading, setKeysLoading] = useState(false)
  const [keysLoaded, setKeysLoaded] = useState(false)

  const profileUrl = profile ? 'https://shipstacked.com/u/' + profile.username : ''
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const isGitHubConnected = profile?.github_connected || false

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('github') === 'connected') {
      setGithubStatus('just_connected')
      window.history.replaceState({}, '', '/dashboard')
      // Recalculate score after GitHub connect
      recalculateScore()
    } else if (params.get('github') === 'error') {
      setGithubStatus('error')
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  const recalculateScore = async () => {
    setCalculating(true)
    try {
      const res = await fetch('/api/velocity/calculate', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        const newScore = data.velocity_score
        setScoreBreakdown(data.breakdown)
        // Check for milestone
        const prevScore = velocityScore
        const milestone = MILESTONE_SCORES.find(m => prevScore < m && newScore >= m)
        if (milestone) setMilestoneHit(milestone)
        setVelocityScore(newScore)
      }
    } catch {}
    setCalculating(false)
  }

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

  const milestoneXShare = milestoneHit
    ? `https://x.com/intent/tweet?text=${encodeURIComponent(`My ShipStacked velocity score just hit ${milestoneHit} 🚀\nshipstacked.com/u/${profile?.username}\n#shipstacked #buildinpublic`)}`
    : ''

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.3rem' }}>
            Welcome back, {firstName}.
          </h1>
          <p style={{ color: '#6e6e73', fontSize: 15 }}>Your ShipStacked builder dashboard.</p>
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
            {/* Status banners */}
            {githubStatus === 'just_connected' && (
              <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 12, padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: 16 }}>✓</span>
                <p style={{ fontSize: 14, color: '#1a7f37', fontWeight: 500 }}>GitHub connected — your activity is now feeding your proof-of-work record.</p>
              </div>
            )}
            {githubStatus === 'error' && (
              <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 12, padding: '0.875rem 1.25rem', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: 14, color: '#c00' }}>GitHub connection failed — please try again.</p>
              </div>
            )}

            {/* Milestone share prompt */}
            {milestoneHit && (
              <div style={{ background: 'linear-gradient(135deg, #0f0f18, #1a1a2e)', border: '1px solid rgba(108,99,255,0.4)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(240,240,245,0.95)', marginBottom: '0.2rem' }}>
                    🚀 Velocity Score hit {milestoneHit}!
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(167,139,250,0.8)' }}>Share it — builders who share get discovered faster.</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={milestoneXShare} target="_blank"
                    style={{ fontSize: 13, padding: '0.5rem 1rem', background: 'white', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 600 }}>
                    Share on X
                  </a>
                  <button onClick={() => setMilestoneHit(null)}
                    style={{ fontSize: 13, padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Velocity Score card */}
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Velocity Score</p>
                <button onClick={recalculateScore} disabled={calculating}
                  style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#f5f5f7', color: '#1d1d1f', border: 'none', borderRadius: 980, cursor: calculating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 500, opacity: calculating ? 0.6 : 1 }}>
                  {calculating ? 'Calculating...' : 'Recalculate'}
                </button>
              </div>
              <VelocityRing score={velocityScore} />
              {scoreBreakdown && (
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '0.5px solid #e8e8ed', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>{scoreBreakdown.github}<span style={{ fontSize: 12, color: '#aeaeb2', fontWeight: 400 }}>/40</span></p>
                    <p style={{ fontSize: 11, color: '#aeaeb2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>GitHub</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>{scoreBreakdown.feed}<span style={{ fontSize: 12, color: '#aeaeb2', fontWeight: 400 }}>/30</span></p>
                    <p style={{ fontSize: 11, color: '#aeaeb2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Build Feed</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>{scoreBreakdown.completeness}<span style={{ fontSize: 12, color: '#aeaeb2', fontWeight: 400 }}>/30</span></p>
                    <p style={{ fontSize: 11, color: '#aeaeb2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Profile</p>
                  </div>
                </div>
              )}
              {!scoreBreakdown && (
                <p style={{ fontSize: 12, color: '#aeaeb2', marginTop: '0.75rem' }}>
                  Click recalculate to see your breakdown — GitHub (40pts) + Build Feed (30pts) + Profile (30pts)
                </p>
              )}
            </div>

            {/* Top grid — verification */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* GitHub */}
              <div style={{
                background: isGitHubConnected ? '#f0faf0' : 'white',
                border: isGitHubConnected ? '1px solid #b3e0b3' : '1px solid #e0e0e5',
                borderRadius: 14, padding: '1.25rem',
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>GitHub</p>
                {isGitHubConnected ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#1a7f37', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>@{profile.github_username}</p>
                    </div>
                    <p style={{ fontSize: 12, color: '#6e6e73', marginBottom: '0.75rem' }}>{githubData?.commits_90d ?? 0} commits · {githubData?.repos_count ?? 0} repos</p>
                    <a href="/api/github/connect" style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: 'white', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Re-sync</a>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, marginBottom: '0.75rem' }}>Connect to prove your builds are real. Feeds 40 points into your Velocity Score.</p>
                    <a href="/api/github/connect" style={{ fontSize: 12, padding: '0.4rem 0.875rem', background: '#1d1d1f', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Connect GitHub</a>
                  </div>
                )}
                {isGitHubConnected && githubData && githubData.commits_90d === 0 && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#fffbea', border: '1px solid #fde68a', borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>⚠️ 0 commits detected. Run: <code style={{ fontFamily: 'monospace' }}>git config --global user.email "your@email.com"</code> then Re-sync.</p>
                  </div>
                )}
              </div>

              {/* Verification */}
              <div style={{ background: profile.verified ? '#f0faf0' : 'white', border: profile.verified ? '1px solid #b3e0b3' : '1px solid #e0e0e5', borderRadius: 14, padding: '1.25rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Verified status</p>
                {profile.verified ? (
                  <>
                    <div style={{ fontSize: 24, marginBottom: '0.4rem' }}>✓</div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1a7f37', marginBottom: '0.2rem' }}>Verified builder</p>
                    <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5 }}>Your profile carries the ShipStacked verified badge.</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 24, marginBottom: '0.4rem' }}>○</div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.25rem' }}>Not yet verified</p>
                    <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, marginBottom: '0.875rem' }}>Verification is automatic. Complete these steps:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {[
                        { label: 'Name, bio, role, location', done: !!(profile.full_name && profile.bio && profile.role && profile.location) },
                        { label: '1 project or 3+ skills', done: !!(profile.projects?.length >= 1 || profile.skills?.length >= 3) },
                        { label: '1 Build Feed post with outcome + link', done: provenPostCount >= 1 },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 12 }}>
                          <span style={{ color: item.done ? '#1a7f37' : '#aeaeb2', flexShrink: 0, fontWeight: 600 }}>{item.done ? '✓' : '○'}</span>
                          <span style={{ color: item.done ? '#1d1d1f' : '#6e6e73', textDecoration: item.done ? 'none' : 'none' }}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Profile link */}
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Your profile</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>shipstacked.com/u/{profile.username}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href="/dashboard/edit" style={{ padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>Edit profile</a>
                <a href={"/u/" + profile.username} style={{ padding: '0.5rem 1rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>View live</a>
              </div>
            </div>

            {/* Photo nudge — show if profile has no avatar */}
            {!profile.avatar_url && (
              <div style={{ background: '#fffbea', border: '1px solid #fde68a', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>📸</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: '0.1rem' }}>Add a profile photo</p>
                    <p style={{ fontSize: 12, color: '#a16207', lineHeight: 1.5 }}>Profiles with photos get more employer attention. Takes 10 seconds.</p>
                  </div>
                </div>
                <a href="/dashboard/edit" style={{ fontSize: 13, padding: '0.4rem 0.875rem', background: '#f59e0b', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Add photo →
                </a>
              </div>
            )}

            {/* Build Feed */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Build Feed</p>
                <a href="/feed" style={{ fontSize: 12, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>View feed →</a>
              </div>
              <FeedPostForm onSuccess={recalculateScore} />
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
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem' }}>These employers are actively looking for AI-native builders.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {employers.map((emp: any) => {
                    const initials = emp.company_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <a key={emp.id} href={"/company/" + emp.slug} style={{ display: 'block', background: '#f5f5f7', borderRadius: 12, padding: '1rem', textDecoration: 'none', transition: 'background 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#e8e8ed')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#f5f5f7')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0071e3', flexShrink: 0 }}>{initials}</div>
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


            {/* API Keys */}
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Agent API Keys</p>
                  <p style={{ fontSize: 13, color: '#6e6e73' }}>Let your agent update your profile and post builds automatically.</p>
                </div>
                <a href="/api-docs" style={{ fontSize: 12, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>API docs →</a>
              </div>

              {!keysLoaded ? (
                <button onClick={async () => {
                  setKeysLoading(true)
                  const res = await fetch('/api/keys')
                  if (res.ok) { const { keys } = await res.json(); setApiKeys(keys) }
                  setKeysLoaded(true)
                  setKeysLoading(false)
                }} style={{ fontSize: 13, padding: '0.4rem 0.875rem', background: '#f5f5f7', color: '#1d1d1f', border: 'none', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                  {keysLoading ? 'Loading...' : 'Show API keys'}
                </button>
              ) : (
                <>
                  {/* Generated key — show once */}
                  {generatedKey && (
                    <div style={{ background: '#0f0f18', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(167,139,250,0.8)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>⚠ Copy now — shown once only</p>
                      <code style={{ fontSize: 12, color: '#a78bfa', fontFamily: 'monospace', wordBreak: 'break-all', display: 'block', marginBottom: '0.75rem' }}>{generatedKey}</code>
                      <button onClick={() => { navigator.clipboard.writeText(generatedKey); }} style={{ fontSize: 12, padding: '0.35rem 0.75rem', background: 'rgba(108,99,255,0.2)', color: '#a78bfa', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                        Copy to clipboard
                      </button>
                    </div>
                  )}

                  {/* Existing keys */}
                  {apiKeys.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      {apiKeys.map((key: any) => (
                        <div key={key.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '0.5px solid #f0f0f5', gap: '0.5rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{key.name}</p>
                            <p style={{ fontSize: 11, color: '#aeaeb2', fontFamily: 'monospace' }}>{key.key_prefix}••••••••</p>
                            {key.last_used_at && <p style={{ fontSize: 11, color: '#aeaeb2' }}>Last used: {new Date(key.last_used_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>}
                          </div>
                          <button onClick={async () => {
                            if (!confirm('Revoke this key? Any agent using it will stop working.')) return
                            await fetch('/api/keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: key.id }) })
                            setApiKeys(prev => prev.filter(k => k.id !== key.id))
                          }} style={{ fontSize: 12, padding: '0.3rem 0.6rem', background: '#fff0f0', color: '#c00', border: '1px solid #ffd0d0', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Create new key */}
                  {apiKeys.length < 5 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        value={newKeyName}
                        onChange={e => setNewKeyName(e.target.value)}
                        placeholder="Name this key (e.g. OX agent)"
                        style={{ flex: 1, minWidth: 160, padding: '0.5rem 0.875rem', border: '1px solid #d2d2d7', borderRadius: 980, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                      />
                      <button onClick={async () => {
                        if (!newKeyName.trim()) return
                        const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newKeyName.trim() }) })
                        if (res.ok) {
                          const data = await res.json()
                          setGeneratedKey(data.key)
                          setApiKeys(prev => [...prev, { id: data.id, name: data.name, key_prefix: data.key_prefix, last_used_at: null }])
                          setNewKeyName('')
                        }
                      }} style={{ padding: '0.5rem 1rem', background: '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                        Generate key
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Share */}
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Share your profile</p>
              <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem' }}>Let the world know you build with AI.</p>
              <ShareButtons name={profile.full_name} url={profileUrl} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
