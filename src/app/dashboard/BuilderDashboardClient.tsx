'use client'

import { useState, useEffect } from 'react'
import ShareButtons from '@/app/u/[username]/ShareButtons'
import FeedPostForm from '@/app/feed/FeedPostForm'
import CollectionToggleCard from './CollectionToggleCard'
import InviteCard from './InviteCard'
import EnableHiringButton from '@/app/components/EnableHiringButton'
import ConnectAnAgent from '@/app/components/ConnectAnAgent'

function ProofOfWorkCard({ l1Count, l0Count, distinctHosts, lastShippedAt, username }: { l1Count: number; l0Count: number; distinctHosts: number; lastShippedAt: string | null; username: string }) {
  const hasProof = l1Count > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {hasProof ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>{l1Count}</p>
              <p style={{ fontSize: 11, color: '#6e6e73', marginTop: '0.25rem' }}>Verified receipts</p>
            </div>
            <div>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>{distinctHosts}</p>
              <p style={{ fontSize: 11, color: '#6e6e73', marginTop: '0.25rem' }}>Distinct hosts</p>
            </div>
            <div>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>{lastShippedAt ? new Date(lastShippedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</p>
              <p style={{ fontSize: 11, color: '#6e6e73', marginTop: '0.25rem' }}>Last shipped</p>
            </div>
          </div>
          {l0Count > 0 && (
            <p style={{ fontSize: 12, color: '#bf7e00', lineHeight: 1.5 }}>{l0Count} receipt{l0Count === 1 ? '' : 's'} with unreachable artifacts. Re-post with live URLs to upgrade to verified.</p>
          )}
          <a href={`/u/${username}`} style={{ fontSize: 13, fontWeight: 600, color: '#0071e3', textDecoration: 'none' }}>View your public profile →</a>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6 }}>Post your first build below. Your proof-of-work record starts the moment your work is verified.</p>
        </>
      )}
    </div>
  )
}

function MessagesCard() {
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    fetch('/api/messages/unread').then(r => r.json()).then(({ unread }) => setUnread(unread || 0)).catch(() => {})
  }, [])
  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Messages</p>
        <p style={{ fontSize: 14, color: '#1d1d1f' }}>
          Your conversations with clients and hirers.
          {unread > 0 && <span style={{ marginLeft: '0.5rem', fontSize: 12, fontWeight: 700, background: '#0071e3', color: 'white', borderRadius: 980, padding: '0.1rem 0.5rem' }}>{unread} unread</span>}
        </p>
      </div>
      <a href="/messages" style={{ padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        Open messages →
      </a>
    </div>
  )
}

export default function BuilderDashboardClient({
  profile,
  applications,
  hirers,
  email,
  githubData,
  l1Count,
  l0Count,
  distinctHosts,
  lastShippedAt,
  provenPostCount,
  activeCollections = [],
  memberships = [],
}: {
  profile: any
  applications: any[]
  hirers: any[]
  email: string
  githubData: any | null
  l1Count: number
  l0Count: number
  distinctHosts: number
  lastShippedAt: string | null
  provenPostCount: number
  activeCollections?: Array<{ slug: string; title: string; description: string | null }>
  memberships?: Array<{ collection_slug: string; opted_in_at: string; source: 'dashboard' | 'link' }>
}) {
  const [requestSent, setRequestSent] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [githubStatus, setGithubStatus] = useState<'idle' | 'just_connected' | 'error'>('idle')
  const [acceptsInquiries, setAcceptsInquiries] = useState<boolean>(profile?.accepts_project_inquiries !== false)
  const [savingInquiryPref, setSavingInquiryPref] = useState(false)

  const toggleInquiries = async () => {
    setSavingInquiryPref(true)
    const newVal = !acceptsInquiries
    const supabase = (await import('@/lib/supabase')).createClient()
    await supabase.from('profiles').update({ accepts_project_inquiries: newVal }).eq('email', email)
    setAcceptsInquiries(newVal)
    setSavingInquiryPref(false)
  }

  const profileUrl = profile ? 'https://shipstacked.com/u/' + profile.username : ''
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const isGitHubConnected = profile?.github_connected || false

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('github') === 'connected') {
      setGithubStatus('just_connected')
      window.history.replaceState({}, '', '/dashboard')
    } else if (params.get('github') === 'error') {
      setGithubStatus('error')
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

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

            {/* Proof of Work card */}
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Proof of Work</p>
              </div>
              <ProofOfWorkCard l1Count={l1Count} l0Count={l0Count} distinctHosts={distinctHosts} lastShippedAt={lastShippedAt} username={profile.username} />
            </div>

            {/* Buyer Mode toggle — composable, per Phase 2 spec */}
            <EnableHiringButton source="dashboard_enable_hiring" variant="card" />

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
                    <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, marginBottom: '0.75rem' }}>Connect to prove your builds are real. Your GitHub activity strengthens your proof-of-work record.</p>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {[
                        { label: 'Name, bio, role, location', done: !!(profile.full_name && profile.bio && profile.role && profile.location), href: '/dashboard/edit' },
                        { label: '1 project or 3+ skills', done: !!(profile.projects?.length >= 1 || profile.skills?.length >= 3), href: '/dashboard/edit' },
                        { label: '1 Build Feed post with outcome + link', done: provenPostCount >= 1, href: '#build-feed' },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 12 }}>
                          <span style={{ color: item.done ? '#1a7f37' : '#aeaeb2', flexShrink: 0, fontWeight: 600 }}>{item.done ? '✓' : '○'}</span>
                          {item.done ? (
                            <span style={{ color: '#1d1d1f' }}>{item.label}</span>
                          ) : (
                            <a href={item.href} style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>{item.label} →</a>
                          )}
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

            {/* Messages card */}
            <MessagesCard />

            {/* Invite a colleague */}
            <div style={{ background:'white', border:'1px solid #e0e0e5', borderRadius:14, padding:'1.25rem 1.5rem', marginBottom:'1rem' }}>
              <p style={{ fontSize:12, fontWeight:600, color:'#6e6e73', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:'0.3rem' }}>Invite a colleague</p>
              <p style={{ fontSize:13, color:'#6e6e73', lineHeight:1.5, marginBottom:'0.75rem' }}>Know someone shipping AI-native work? Invite them to ShipStacked.</p>
              <InviteCard />
            </div>

            {/* Photo nudge — show if profile has no avatar */}
            {!profile.avatar_url && (
              <div style={{ background: '#fffbea', border: '1px solid #fde68a', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>📸</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: '0.1rem' }}>Add a profile photo</p>
                    <p style={{ fontSize: 12, color: '#a16207', lineHeight: 1.5 }}>Profiles with photos get more hirer attention. Takes 10 seconds.</p>
                  </div>
                </div>
                <a href="/dashboard/edit" style={{ fontSize: 13, padding: '0.4rem 0.875rem', background: '#f59e0b', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Add photo →
                </a>
              </div>
            )}

            {/* Day rate nudge */}
            {!profile.day_rate && (
              <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>💰</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1e40af', marginBottom: '0.1rem' }}>Set your day rate</p>
                    <p style={{ fontSize: 12, color: '#3b82f6', lineHeight: 1.5 }}>Hirers filter by budget. Let them know what you charge.</p>
                  </div>
                </div>
                <a href="/dashboard/edit" style={{ fontSize: 13, padding: '0.4rem 0.875rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Set rate →
                </a>
              </div>
            )}

            {/* About nudge */}
            {!profile.about && (
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>✍️</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#5b21b6', marginBottom: '0.1rem' }}>Tell your story</p>
                    <p style={{ fontSize: 12, color: '#7c3aed', lineHeight: 1.5 }}>Your bio is one line. The About section is your full sell to hirers.</p>
                  </div>
                </div>
                <a href="/dashboard/edit" style={{ fontSize: 13, padding: '0.4rem 0.875rem', background: '#6c63ff', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Add story →
                </a>
              </div>
            )}

            {/* Build Feed post nudge — only if no proven post yet */}
            {provenPostCount === 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>🚀</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#14532d', marginBottom: '0.1rem' }}>Post your first build</p>
                    <p style={{ fontSize: 12, color: '#16a34a', lineHeight: 1.5 }}>One real project with an outcome unlocks your verified badge and boosts your score.</p>
                  </div>
                </div>
                <a href="#build-feed" style={{ fontSize: 13, padding: '0.4rem 0.875rem', background: '#1a7f37', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Post a build →
                </a>
              </div>
            )}

            {/* Build Feed */}
            <div id="build-feed" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Build Feed</p>
                <a href="/feed" style={{ fontSize: 12, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>View feed →</a>
              </div>
              <FeedPostForm />
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

            {/* Hirer directory */}
            {hirers.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Companies hiring</p>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem' }}>These hirers are actively looking for AI-native builders.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {hirers.map((emp: any) => {
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


            {/* Project enquiries toggle */}
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Project enquiries</p>
                  <p style={{ fontSize: 13, color: '#6e6e73' }}>Allow people to contact you about project work via your Build Feed posts.</p>
                </div>
                <button
                  onClick={toggleInquiries}
                  disabled={savingInquiryPref}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.875rem',
                    background: acceptsInquiries ? '#e3f3e3' : '#f5f5f7',
                    color: acceptsInquiries ? '#1a7f37' : '#6e6e73',
                    border: `1px solid ${acceptsInquiries ? '#b3e0b3' : '#e0e0e5'}`,
                    borderRadius: 980, fontSize: 13, fontWeight: 500,
                    cursor: savingInquiryPref ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.2s',
                  }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: acceptsInquiries ? '#1a7f37' : '#aeaeb2' }} />
                  {savingInquiryPref ? 'Saving...' : acceptsInquiries ? 'Accepting enquiries' : 'Not accepting enquiries'}
                </button>
              </div>
            </div>

            {/* Consented Collections — one card per active collection, gated on
                profile.published. Zero collections → zero cards (byte-identical
                to pre-feature dashboard). Collections are DATA — the card has
                no knowledge of what any collection is for; all human-readable
                specifics come from collection.title / collection.description. */}
            {profile?.published && activeCollections.map((c) => {
              const m = memberships.find(x => x.collection_slug === c.slug)
              return (
                <CollectionToggleCard
                  key={c.slug}
                  collection={c}
                  isOptedIn={!!m}
                  optedInAt={m?.opted_in_at ?? null}
                  source={m?.source ?? null}
                />
              )
            })}

            {/* Agent API Keys — Phase 3 ConnectAnAgent (builder:rw); supersedes the
                inline key UI (list/revoke/create) + adds auth.md path + system prompt. */}
            <ConnectAnAgent scope="builder:rw" variant="solo_dashboard" email={email} username={profile.username} />

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
