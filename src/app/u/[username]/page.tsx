import { supabase } from '@/lib/supabase'
import { getResolvedUser } from '@/lib/user'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ShareButtons from './ShareButtons'

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  const { username } = await params
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, bio, about, location, verified, username, velocity_score, primary_profession')
    .eq('username', username)
    .eq('published', true)
    .single()

  if (!profile) return { title: 'Profile not found' }

  const title = `${profile.full_name} — AI-native builder on ShipStacked`
  const description = profile.bio || profile.about?.slice(0, 155) || `${profile.full_name} is a verified AI-native builder. View their projects on ShipStacked.`
  const url = `https://shipstacked.com/u/${username}`

  return {
    title, description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'profile', images: [{ url: `https://shipstacked.com/og?v=2&type=builder&name=${encodeURIComponent(profile.full_name || '')}&role=${encodeURIComponent(profile.role || '')}&verified=${profile.verified ? 'true' : 'false'}&location=${encodeURIComponent(profile.location || '')}`, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [`https://shipstacked.com/og?v=2&type=builder&name=${encodeURIComponent(profile.full_name || '')}&role=${encodeURIComponent(profile.role || '')}&verified=${profile.verified ? 'true' : 'false'}&location=${encodeURIComponent(profile.location || '')}`] },
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .eq('published', true)
    .single()

  if (!profile) notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('profile_id', profile.id)
    .order('display_order')

  const { data: skills } = await supabase
    .from('skills')
    .select('*')
    .eq('profile_id', profile.id)


  const { data: githubData } = await supabase
    .from('github_data')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle()

  const { data: feedPosts } = await supabase
    .from('posts')
    .select('id, title, problem_solved, outcome, tools_used, time_taken, url, reactions, created_at')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5)


  const byCategory = (cat: string) => skills?.filter(s => s.category === cat).map(s => s.name) || []
  const initials = profile.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const profileUrl = 'https://shipstacked.com/u/' + profile.username
  const allSkillNames = skills?.map(s => s.name) || []

  const { hasSubscription, user: resolvedUser } = await getResolvedUser()
  const isAdmin = resolvedUser?.email === 'oxleethomas+admin@gmail.com'
  const hasAccess = !!resolvedUser && (resolvedUser.email === profile.email || hasSubscription || isAdmin)

  const claudeSkills = byCategory('claude_use_case')
  const languages = byCategory('language')
  const frameworks = byCategory('framework')
  const aiTools = byCategory('ai_tool')
  const otherLLMs = byCategory('llm')
  const domains = byCategory('domain')

  const hasLinks = profile.github_url || profile.x_url || profile.linkedin_url || profile.website_url

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.full_name,
    jobTitle: profile.role,
    description: profile.bio || profile.about,
    url: profileUrl,
    ...(profile.github_url && { sameAs: [profile.github_url, profile.x_url, profile.linkedin_url, profile.website_url].filter(Boolean) }),
    ...(allSkillNames.length > 0 && { knowsAbout: allSkillNames }),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0a0f;
          --bg2: #111118;
          --bg3: #1a1a24;
          --border: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.15);
          --text: #f0f0f5;
          --text2: #8888a0;
          --text3: #555568;
          --accent: #6c63ff;
          --accent2: #a78bfa;
          --accent-glow: rgba(108,99,255,0.15);
          --green: #34d399;
          --green-bg: rgba(52,211,153,0.1);
          --sans: 'DM Sans', -apple-system, sans-serif;
          --mono: 'DM Mono', monospace;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--sans); -webkit-font-smoothing: antialiased; }
        .fade-up { opacity: 0; transform: translateY(16px); animation: fadeUp 0.6s ease forwards; animation-fill-mode: forwards; } .fade-up a, .fade-up button { pointer-events: auto; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; transition: border-color 0.2s; }
        .card:hover { border-color: var(--border-hover); }
        .tag-claude { background: rgba(108,99,255,0.15); color: var(--accent2); border: 1px solid rgba(108,99,255,0.25); font-size: 12px; font-weight: 500; padding: 0.3rem 0.75rem; border-radius: 20px; }
        .tag-skill { background: var(--bg3); color: var(--text2); border: 1px solid var(--border); font-size: 12px; font-weight: 400; padding: 0.3rem 0.75rem; border-radius: 20px; }
        .social-link { display: inline-flex; align-items: center; gap: 6px; padding: 0.5rem 1rem; background: var(--bg3); border: 1px solid var(--border); border-radius: 20px; color: var(--text2); text-decoration: none; font-size: 13px; font-weight: 500; transition: all 0.2s; }
        .social-link:hover { border-color: var(--border-hover); color: var(--text); }
        .section-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3); margin-bottom: 1rem; font-family: var(--mono); }
        .project-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 1.75rem; margin-bottom: 1rem; transition: border-color 0.2s; }
        .project-card:hover { border-color: var(--border-hover); }
        .outcome-bar { background: var(--green-bg); border: 1px solid rgba(52,211,153,0.2); border-radius: 10px; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .how-claude-box { background: rgba(108,99,255,0.06); border: 1px solid rgba(108,99,255,0.15); border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 0.75rem; }
        .verified-badge { display: inline-flex; align-items: center; gap: 5px; background: linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.15)); border: 1px solid rgba(52,211,153,0.4); color: #34d399; font-size: 11px; font-weight: 700; padding: 0.25rem 0.7rem; border-radius: 20px; letter-spacing: 0.06em; font-family: var(--mono); box-shadow: 0 0 12px rgba(52,211,153,0.15); }
        .availability-badge { display: inline-flex; align-items: center; gap: 5px; background: var(--green-bg); border: 1px solid rgba(52,211,153,0.2); color: var(--green); font-size: 12px; font-weight: 500; padding: 0.3rem 0.75rem; border-radius: 20px; }
        .availability-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse-dot 2s ease infinite; }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
        .avatar-ring { width: 88px; height: 88px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: white; flex-shrink: 0; overflow: hidden; }
        .mesh-bg { position: fixed; top: 0; left: 0; right: 0; height: 500px; background: radial-gradient(ellipse at 20% 0%, rgba(108,99,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 0%, rgba(167,139,250,0.08) 0%, transparent 60%); pointer-events: none; z-index: 0; }
        .locked-overlay { position: relative; }
        .locked-blur { filter: blur(6px); user-select: none; pointer-events: none; opacity: 0.4; }
        .locked-cta { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; }
        @media (max-width: 640px) { .avatar-ring { width: 64px; height: 64px; font-size: 20px; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--sans)', position: 'relative' }}>
        <div className="mesh-bg" />

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 5rem', position: 'relative', zIndex: 1 }}>

          {/* Hero */}
          <div className="fade-up" style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div className="avatar-ring">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initials
                )}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                  <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.1 }}>
                    {profile.full_name}
                  </h1>
                  {profile.verified && <span className="verified-badge">🛡 VERIFIED</span>}
                </div>
                <p style={{ fontSize: 16, color: 'var(--text2)', marginBottom: '0.4rem' }}>{profile.role}</p>
                {profile.location && <p style={{ fontSize: 14, color: 'var(--text3)' }}>📍 {profile.location}</p>}
              </div>
              {profile.availability && (
                <span className="availability-badge">
                  <span className="availability-dot" />
                  {profile.availability}
                </span>
              )}
            </div>
            {profile.bio && (
              <p style={{ fontSize: 17, color: 'var(--text2)', lineHeight: 1.7, fontWeight: 300, fontStyle: 'italic', borderLeft: '2px solid var(--accent)', paddingLeft: '1rem' }}>
                {profile.bio}
              </p>
            )}
          </div>

          {/* Professional info */}
          {(profile.primary_profession || profile.seniority || profile.work_type || profile.day_rate || profile.timezone || (profile.languages && profile.languages.length > 0)) && (
            <div className="fade-up card" style={{ padding: '1.25rem 1.75rem', marginBottom: '1.5rem', animationDelay: '0.08s' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
                {profile.primary_profession && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem', fontFamily: 'var(--mono)' }}>Profession</p>
                    <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{profile.primary_profession}</p>
                  </div>
                )}
                {profile.seniority && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem', fontFamily: 'var(--mono)' }}>Seniority</p>
                    <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{profile.seniority}</p>
                  </div>
                )}
                {profile.work_type && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem', fontFamily: 'var(--mono)' }}>Work type</p>
                    <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{profile.work_type}</p>
                  </div>
                )}
                {profile.day_rate && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem', fontFamily: 'var(--mono)' }}>Day rate</p>
                    <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{profile.day_rate}</p>
                  </div>
                )}
                {profile.timezone && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem', fontFamily: 'var(--mono)' }}>Timezone</p>
                    <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{profile.timezone}</p>
                  </div>
                )}
                {profile.velocity_score > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem', fontFamily: 'var(--mono)' }}>Velocity Score</p>
                    <p style={{ fontSize: 14, color: 'var(--accent2)', fontWeight: 700 }}>⚡ {profile.velocity_score}<span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>/100</span></p>
                  </div>
                )}
                {profile.languages && profile.languages.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem', fontFamily: 'var(--mono)' }}>Languages</p>
                    <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{profile.languages.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact / Social links — gated */}
          {hasLinks && (
            <div className="fade-up" style={{ marginBottom: '2.5rem', animationDelay: '0.1s' }}>
              {hasAccess ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {profile.github_url && <a href={profile.github_url} target="_blank" className="social-link">GitHub</a>}
                  {profile.x_url && <a href={profile.x_url} target="_blank" className="social-link">X / Twitter</a>}
                  {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" className="social-link">LinkedIn</a>}
                  {profile.website_url && <a href={profile.website_url} target="_blank" className="social-link">Website</a>}
                </div>
              ) : (
                <div className="locked-overlay card" style={{ padding: '1.25rem' }}>
                  <div className="locked-blur" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {profile.github_url && <span className="social-link">github.com/••••••</span>}
                    {profile.x_url && <span className="social-link">@••••••</span>}
                    {profile.linkedin_url && <span className="social-link">LinkedIn</span>}
                    {profile.website_url && <span className="social-link">••••••.com</span>}
                  </div>
                  <div className="locked-cta">
                    <p style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>🔒 Contact details visible to Full Access subscribers</p>
                    <a href="/#pricing" style={{ padding: '0.5rem 1.25rem', background: 'var(--accent)', color: 'white', borderRadius: 20, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      Get full access
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* About */}
          {profile.about && (
            <div className="fade-up card" style={{ padding: '1.75rem', marginBottom: '1.5rem', animationDelay: '0.15s' }}>
              <p className="section-label">About</p>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, fontWeight: 300 }}>{profile.about}</p>
            </div>
          )}

          {/* AI use cases */}
          {claudeSkills.length > 0 && (
            <div className="fade-up card" style={{ padding: '1.75rem', marginBottom: '1.5rem', animationDelay: '0.2s' }}>
              <p className="section-label">AI use cases</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {claudeSkills.map((s: string) => <span key={s} className="tag-claude">{s}</span>)}
              </div>
            </div>
          )}

          {/* GitHub */}
          {profile.github_connected && githubData && (
            <div className="fade-up card" style={{ padding: '1.75rem', marginBottom: '1.5rem', animationDelay: '0.22s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text2)' }}>
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <p className="section-label" style={{ margin: 0 }}>GitHub</p>
                </div>
                <a href={`https://github.com/${githubData.github_username}`} target="_blank"
                  style={{ fontSize: 12, color: 'var(--accent2)', textDecoration: 'none', fontWeight: 500 }}>
                  @{githubData.github_username} &rarr;
                </a>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>{githubData.commits_90d}</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>COMMITS / 90D</p>
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>{githubData.repos_count}</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>PUBLIC REPOS</p>
                </div>
                {githubData.top_languages?.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                      {githubData.top_languages.slice(0, 4).map((lang: string) => (
                        <span key={lang} className="tag-skill" style={{ fontSize: 11 }}>{lang}</span>
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '0.06em', marginTop: 4 }}>TOP LANGUAGES</p>
                  </div>
                )}
              </div>
              {githubData.contribution_data && Object.keys(githubData.contribution_data).length > 0 && (
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>LAST 12 WEEKS</p>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 28 }}>
                    {(() => {
                      const data = githubData.contribution_data as Record<string, number>
                      const weeks: Record<string, number> = {}
                      Object.entries(data).forEach(([date, count]) => {
                        const d = new Date(date)
                        d.setDate(d.getDate() - d.getDay())
                        const weekKey = d.toISOString().slice(0, 10)
                        weeks[weekKey] = (weeks[weekKey] || 0) + (count as number)
                      })
                      const sorted = Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
                      const max = Math.max(...sorted.map(([, v]) => v), 1)
                      return sorted.map(([week, count]) => (
                        <div key={week} title={`${count} commits`} style={{
                          flex: 1, borderRadius: 3,
                          height: Math.max(3, (count / max) * 28),
                          background: count > 0 ? '#34d399' : 'var(--bg3)',
                          opacity: count > 0 ? 0.6 + (count / max) * 0.4 : 1,
                        }} />
                      ))
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Projects */}
          {projects && projects.length > 0 && (
            <div className="fade-up" style={{ marginBottom: '1.5rem', animationDelay: '0.25s' }}>
              <p className="section-label">Projects</p>
              {projects.map((p: any) => (
                <div key={p.id} className="project-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{p.title}</h3>
                    {p.project_url && (
                      <a href={p.project_url} target="_blank" style={{ fontSize: 12, color: 'var(--accent2)', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap', padding: '0.25rem 0.65rem', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 20 }}>View</a>
                    )}
                  </div>
                  {p.description && <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1rem', fontWeight: 300 }}>{p.description}</p>}
                  {p.prompt_approach && (
                    <div className="how-claude-box">
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent2)', letterSpacing: '0.08em', marginBottom: '0.4rem', fontFamily: 'var(--mono)' }}>HOW CLAUDE WAS USED</p>
                      <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, fontWeight: 300 }}>{p.prompt_approach}</p>
                    </div>
                  )}
                  {p.outcome && (
                    <div className="outcome-bar">
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.06em', fontFamily: 'var(--mono)' }}>OUTCOME</span>
                      <span style={{ fontSize: 14, color: 'var(--text)' }}>{p.outcome}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {(languages.length > 0 || frameworks.length > 0 || aiTools.length > 0 || otherLLMs.length > 0 || domains.length > 0) && (
            <div className="fade-up card" style={{ padding: '1.75rem', marginBottom: '1.5rem', animationDelay: '0.3s' }}>
              <p className="section-label">Skills and tools</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {[
                  { label: 'Languages', items: languages },
                  { label: 'Frameworks', items: frameworks },
                  { label: 'AI tools', items: aiTools },
                  { label: 'Other LLMs', items: otherLLMs },
                  { label: 'Domains', items: domains },
                ].filter(g => g.items.length > 0).map(({ label, items }) => (
                  <div key={label}>
                    <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'var(--mono)' }}>{label.toUpperCase()}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {items.map((s: string) => <span key={s} className="tag-skill">{s}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Build Feed */}
          {feedPosts && feedPosts.length > 0 && (
            <div className="fade-up" style={{ marginBottom: '1.5rem', animationDelay: '0.33s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <p className="section-label" style={{ margin: 0 }}>Build Feed <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({feedPosts.length})</span></p>
                <a href="/feed" style={{ fontSize: 12, color: 'var(--accent2)', textDecoration: 'none', fontWeight: 500 }}>View all →</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {feedPosts.map((post: any) => (
                  <a key={post.id} href={`/feed/${post.id}`} style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ padding: '1.25rem', transition: 'border-color 0.2s' }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                        {post.title}
                        {post.url && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 13 }}> ↗</span>}
                      </p>
                      {post.outcome && (
                        <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500, marginBottom: '0.3rem' }}>→ {post.outcome}</p>
                      )}
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {post.tools_used && <span style={{ fontSize: 12, color: 'var(--text3)' }}>🛠 {post.tools_used}</span>}
                        {post.time_taken && <span style={{ fontSize: 12, color: 'var(--text3)' }}>⏱ {post.time_taken}</span>}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="fade-up card" style={{ padding: '1.75rem', marginBottom: '1.5rem', animationDelay: '0.35s' }}>
            <p className="section-label">Share this profile</p>
            <ShareButtons name={profile.full_name} url={profileUrl} role={profile.role || profile.primary_profession} verified={profile.verified} velocityScore={profile.velocity_score} />
          </div>

          {/* Role-aware CTA */}
          {hasAccess ? (
            <div className="fade-up" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(167,139,250,0.08) 100%)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 16, padding: '2rem', textAlign: 'center', animationDelay: '0.4s' }}>
              <p style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', fontFamily: 'var(--mono)' }}>READY TO HIRE?</p>
              <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                Contact {profile.full_name.split(' ')[0]}
              </p>
              <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1.25rem', fontWeight: 300 }}>
                Send them a message directly via email.
              </p>
              
              <a
                href={`/employer/messages?new=${profile.id}`}
                style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: 'var(--accent)', color: 'white', borderRadius: 20, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Message {profile.full_name.split(' ')[0]}
              </a>
            </div>
          ) : !resolvedUser ? (
            <div className="fade-up" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(167,139,250,0.08) 100%)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 16, padding: '2rem', textAlign: 'center', animationDelay: '0.4s' }}>
              <p style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', fontFamily: 'var(--mono)' }}>FOR EMPLOYERS</p>
              <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Looking to hire AI-native talent?</p>
              <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1.25rem', fontWeight: 300 }}>Access our full verified builder directory and contact candidates directly.</p>
              <a href="/#pricing" style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: 'var(--accent)', color: 'white', borderRadius: 20, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Get full access
              </a>
            </div>
          ) : null}

        </div>
      </div>
    </>
  )
}
