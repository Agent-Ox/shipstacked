import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ShareButtons from './ShareButtons'

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  const { username } = await params
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, bio, about, location, verified, username')
    .eq('username', username)
    .eq('published', true)
    .single()

  if (!profile) return { title: 'Profile not found' }

  const title = `${profile.full_name} — Claude Builder on ClaudHire`
  const description = profile.bio || profile.about?.slice(0, 155) || `${profile.full_name} is a verified Claude-native builder. View their projects on ClaudHire.`
  const url = `https://claudhire.com/u/${username}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'profile', images: [{ url: `/og-default.svg`, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-default.svg'] },
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

  const byCategory = (cat: string) => skills?.filter(s => s.category === cat).map(s => s.name) || []
  const initials = profile.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const profileUrl = 'https://claudhire.com/u/' + profile.username
  const allSkillNames = skills?.map(s => s.name) || []

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

  const claudeSkills = byCategory('claude_use_case')
  const languages = byCategory('language')
  const frameworks = byCategory('framework')
  const aiTools = byCategory('ai_tool')
  const otherLLMs = byCategory('llm')
  const domains = byCategory('domain')

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

        .fade-up {
          opacity: 0;
          transform: translateY(16px);
          animation: fadeUp 0.6s ease forwards;
        }
        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .card:hover { border-color: var(--border-hover); }

        .tag-claude {
          background: rgba(108,99,255,0.15);
          color: var(--accent2);
          border: 1px solid rgba(108,99,255,0.25);
          font-size: 12px;
          font-weight: 500;
          padding: 0.3rem 0.75rem;
          border-radius: 20px;
          font-family: var(--sans);
        }

        .tag-skill {
          background: var(--bg3);
          color: var(--text2);
          border: 1px solid var(--border);
          font-size: 12px;
          font-weight: 400;
          padding: 0.3rem 0.75rem;
          border-radius: 20px;
        }

        .social-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.5rem 1rem;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 20px;
          color: var(--text2);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .social-link:hover { border-color: var(--border-hover); color: var(--text); }

        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text3);
          margin-bottom: 1rem;
          font-family: var(--mono);
        }

        .project-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.75rem;
          margin-bottom: 1rem;
          transition: border-color 0.2s;
        }
        .project-card:hover { border-color: var(--border-hover); }

        .outcome-bar {
          background: var(--green-bg);
          border: 1px solid rgba(52,211,153,0.2);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .how-claude-box {
          background: rgba(108,99,255,0.06);
          border: 1px solid rgba(108,99,255,0.15);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          margin-bottom: 0.75rem;
        }

        .hire-cta {
          background: linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(167,139,250,0.08) 100%);
          border: 1px solid rgba(108,99,255,0.25);
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
        }

        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: linear-gradient(135deg, rgba(108,99,255,0.2), rgba(167,139,250,0.15));
          border: 1px solid rgba(108,99,255,0.3);
          color: var(--accent2);
          font-size: 11px;
          font-weight: 700;
          padding: 0.25rem 0.7rem;
          border-radius: 20px;
          letter-spacing: 0.06em;
          font-family: var(--mono);
        }

        .availability-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--green-bg);
          border: 1px solid rgba(52,211,153,0.2);
          color: var(--green);
          font-size: 12px;
          font-weight: 500;
          padding: 0.3rem 0.75rem;
          border-radius: 20px;
        }

        .availability-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          animation: pulse-dot 2s ease infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .avatar-ring {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          position: relative;
        }

        .avatar-ring::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          z-index: -1;
          opacity: 0.3;
          filter: blur(8px);
        }

        .mesh-bg {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 500px;
          background: radial-gradient(ellipse at 20% 0%, rgba(108,99,255,0.12) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 0%, rgba(167,139,250,0.08) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        @media (max-width: 640px) {
          .avatar-ring { width: 64px; height: 64px; font-size: 20px; }
          .profile-name { font-size: 22px !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--sans)', position: 'relative' }}>
        <div className="mesh-bg" />

        {/* Nav */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', padding: '0 2rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,15,0.85)', backdropFilter: 'saturate(180%) blur(20px)' }}>
          <a href="/" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', textDecoration: 'none', letterSpacing: '-0.02em' }}>
            ClaudHire<span style={{ color: 'var(--accent2)' }}>.</span>
          </a>
          <a href="/signup" style={{ padding: '0.4rem 1rem', background: 'var(--accent)', color: 'white', borderRadius: 20, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Create profile
          </a>
        </nav>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 5rem', position: 'relative', zIndex: 1 }}>

          {/* Hero section */}
          <div className="fade-up" style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div className="avatar-ring">{initials}</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                  <h1 className="profile-name" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.1 }}>
                    {profile.full_name}
                  </h1>
                  {profile.verified && (
                    <span className="verified-badge">
                      ✦ VERIFIED
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 16, color: 'var(--text2)', marginBottom: '0.4rem', fontWeight: 400 }}>{profile.role}</p>
                {profile.location && (
                  <p style={{ fontSize: 14, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>📍</span> {profile.location}
                  </p>
                )}
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

          {/* Social links */}
          {(profile.github_url || profile.x_url || profile.linkedin_url || profile.website_url) && (
            <div className="fade-up" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '2.5rem', animationDelay: '0.1s' }}>
              {profile.github_url && <a href={profile.github_url} target="_blank" className="social-link">GitHub</a>}
              {profile.x_url && <a href={profile.x_url} target="_blank" className="social-link">X / Twitter</a>}
              {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" className="social-link">LinkedIn</a>}
              {profile.website_url && <a href={profile.website_url} target="_blank" className="social-link">Website</a>}
            </div>
          )}

          {/* About */}
          {profile.about && (
            <div className="fade-up card" style={{ padding: '1.75rem', marginBottom: '1.5rem', animationDelay: '0.15s' }}>
              <p className="section-label">About</p>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, fontWeight: 300 }}>{profile.about}</p>
            </div>
          )}

          {/* Claude use cases */}
          {claudeSkills.length > 0 && (
            <div className="fade-up card" style={{ padding: '1.75rem', marginBottom: '1.5rem', animationDelay: '0.2s' }}>
              <p className="section-label">Claude use cases</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {claudeSkills.map((s: string) => (
                  <span key={s} className="tag-claude">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects && projects.length > 0 && (
            <div className="fade-up" style={{ marginBottom: '1.5rem', animationDelay: '0.25s' }}>
              <p className="section-label" style={{ marginBottom: '1rem' }}>Projects</p>
              {projects.map((p: any, i: number) => (
                <div key={p.id} className="project-card" style={{ animationDelay: `${0.25 + i * 0.05}s` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{p.title}</h3>
                    {p.project_url && (
                      <a href={p.project_url} target="_blank" style={{ fontSize: 12, color: 'var(--accent2)', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap', padding: '0.25rem 0.65rem', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 20 }}>
                        View
                      </a>
                    )}
                  </div>

                  {p.description && (
                    <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1rem', fontWeight: 300 }}>{p.description}</p>
                  )}

                  {p.prompt_approach && (
                    <div className="how-claude-box">
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent2)', letterSpacing: '0.08em', marginBottom: '0.4rem', fontFamily: 'var(--mono)' }}>HOW CLAUDE WAS USED</p>
                      <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, fontWeight: 300 }}>{p.prompt_approach}</p>
                    </div>
                  )}

                  {p.outcome && (
                    <div className="outcome-bar">
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.06em', fontFamily: 'var(--mono)' }}>OUTCOME</span>
                      <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 400 }}>{p.outcome}</span>
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

          {/* Share */}
          <div className="fade-up card" style={{ padding: '1.75rem', marginBottom: '1.5rem', animationDelay: '0.35s' }}>
            <p className="section-label">Share this profile</p>
            <ShareButtons name={profile.full_name} url={profileUrl} />
          </div>

          {/* Hire CTA */}
          <div className="fade-up hire-cta" style={{ animationDelay: '0.4s' }}>
            <p style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', fontFamily: 'var(--mono)' }}>FOR EMPLOYERS</p>
            <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              Looking to hire Claude-native talent?
            </p>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1.25rem', fontWeight: 300 }}>
              Access our full verified builder directory and contact candidates directly.
            </p>
            <a href="/#pricing" style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: 'var(--accent)', color: 'white', borderRadius: 20, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Get full access
            </a>
          </div>

        </div>
      </div>
    </>
  )
}
