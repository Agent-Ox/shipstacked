'use client'

import Link from 'next/link'

import { useState, useEffect } from 'react'

export default function EmployersPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [realProfiles, setRealProfiles] = useState<any[]>([])
  const [feedPosts, setFeedPosts] = useState<any[]>([])

  useEffect(() => {
    // Build Feed — try featured first, fall back to recent
    fetch('/api/feed?limit=4&featured=1')
      .then(r => r.json())
      .then(({ posts }) => {
        if (posts?.length >= 4) {
          setFeedPosts(posts.slice(0, 3))
        } else {
          fetch('/api/feed?limit=3')
            .then(r => r.json())
            .then(({ posts }) => { if (posts?.length) setFeedPosts(posts) })
            .catch(() => {})
        }
      })
      .catch(() => {})

    // Profiles — featured first via direct Supabase, fill with high velocity
    import('@/lib/supabase').then(({ createClient }) => {
      const supabase = createClient()
      supabase.from('profiles').select('*, skills(*)')
        .eq('published', true)
        .eq('featured', true)
        .order('featured_order', { ascending: true, nullsFirst: false })
        .limit(6)
        .then(async ({ data: featured }: any) => {
          const featuredCount = featured?.length ?? 0
          if (featuredCount >= 6) {
            setRealProfiles(featured ?? [])
            return
          }
          const featuredIds = (featured ?? []).map((p: any) => p.id)
          const remaining = 6 - featuredCount
          const { data: fill } = await supabase.from('profiles').select('*, skills(*)')
            .eq('published', true)
            .order('velocity_score', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(remaining + featuredIds.length)
          const fillFiltered = (fill ?? [])
            .filter((p: any) => !featuredIds.includes(p.id))
            .slice(0, remaining)
          const combined = [...(featured ?? []), ...fillFiltered]
          if (combined.length >= 6) setRealProfiles(combined)
        })
    })
  }, [])

  const displayProfiles = realProfiles
  const displayPosts = feedPosts

  const goToCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'full_access', email }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {}
    setLoading(false)
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #ffffff; --bg2: #f5f5f7; --bg3: #e8e8ed;
          --text: #1d1d1f; --text2: #6e6e73; --text3: #aeaeb2;
          --accent: #0071e3; --accent-hover: #0077ed; --accent-light: #e8f1fd;
          --border: #d2d2d7; --border-light: #e8e8ed;
          --green: #1a7f37; --green-light: #e3f3e3;
          --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          --radius: 18px; --radius-pill: 980px;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--sans); -webkit-font-smoothing: antialiased; overflow-x: hidden; }

        .emp-hero { min-height: 92vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 8rem 1.5rem 6rem; background: linear-gradient(180deg, #fbfbfd 0%, #ffffff 100%); }
        .emp-eyebrow { display: inline-flex; align-items: center; gap: 0.4rem; background: var(--accent-light); color: var(--accent); font-size: 0.75rem; font-weight: 600; padding: 0.3rem 0.875rem; border-radius: var(--radius-pill); margin-bottom: 2rem; letter-spacing: 0.02em; }
        .emp-dot { width: 5px; height: 5px; background: var(--accent); border-radius: 50%; animation: pulse 2s ease infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        .emp-h1 { font-size: clamp(2.8rem, 7vw, 5.5rem); font-weight: 700; line-height: 1.04; letter-spacing: -0.035em; color: var(--text); max-width: 820px; margin-bottom: 1.5rem; }
        .emp-h1 .muted { color: var(--text3); font-weight: 400; }
        .emp-sub { font-size: clamp(1rem, 2vw, 1.2rem); color: var(--text2); max-width: 540px; line-height: 1.7; margin: 0 auto 3rem; font-weight: 300; }
        .emp-cta-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; width: 100%; max-width: 440px; margin: 0 auto; }
        .emp-input { width: 100%; padding: 0.95rem 1.25rem; border: 1px solid var(--border); border-radius: 14px; font-size: 16px; outline: none; font-family: var(--sans); background: white; }
        .emp-input:focus { border-color: var(--accent); }
        .btn-primary { display: inline-block; background: var(--accent); color: white; padding: 1rem 2rem; border-radius: var(--radius-pill); font-size: 1rem; font-weight: 600; text-decoration: none; transition: background 0.2s, transform 0.15s; letter-spacing: -0.01em; border: none; cursor: pointer; font-family: var(--sans); width: 100%; }
        .btn-primary:hover { background: var(--accent-hover); transform: translateY(-1px); }
        .btn-primary:disabled { background: var(--text3); cursor: not-allowed; transform: none; }
        .emp-note { font-size: 0.8rem; color: var(--text3); }
        .emp-proof { display: flex; align-items: center; justify-content: center; gap: 2rem; margin-top: 4rem; flex-wrap: wrap; }
        .proof-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text2); }
        .proof-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }

        .section { padding: 5rem 1.5rem; }
        .section-inner { max-width: 960px; margin: 0 auto; }
        .eyebrow { font-size: 0.72rem; font-weight: 600; color: var(--accent); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.75rem; }
        .section-title { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; color: var(--text); margin-bottom: 1rem; }

        .manifesto { background: #0a0a0f; padding: 6rem 1.5rem; }
        .manifesto-inner { max-width: 720px; margin: 0 auto; }
        .manifesto h2 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.08; color: #f0f0f5; margin-bottom: 2rem; }
        .manifesto h2 .accent { color: #6c63ff; }
        .manifesto p { font-size: clamp(1rem, 2vw, 1.1rem); color: rgba(240,240,245,0.65); line-height: 1.85; font-weight: 300; margin-bottom: 1.25rem; }
        .manifesto p:last-child { margin-bottom: 0; }
        .manifesto strong { color: rgba(240,240,245,0.9); font-weight: 500; }

        .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 2.5rem; }
        .step { background: var(--bg2); border-radius: var(--radius); padding: 2rem 1.75rem; }
        .step-num { font-size: 0.7rem; font-weight: 700; color: var(--accent); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 1rem; font-family: monospace; }
        .step h3 { font-size: 1.15rem; font-weight: 700; letter-spacing: -0.02em; color: var(--text); margin-bottom: 0.5rem; }
        .step p { font-size: 0.875rem; color: var(--text2); line-height: 1.6; }

        .feed-card { background: white; border: 1px solid var(--border-light); border-radius: 16px; padding: 1.375rem 1.5rem; margin-bottom: 0.875rem; }
        .feed-author { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.875rem; }
        .feed-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #e8f1fd, #d0e4fb); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--accent); overflow: hidden; flex-shrink: 0; }
        .feed-title { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.01em; margin-bottom: 0.625rem; line-height: 1.35; }
        .feed-outcome { background: var(--green-light); border: 1px solid #b3e0b3; border-radius: 8px; padding: 0.6rem 0.875rem; margin-bottom: 0.625rem; }
        .feed-outcome-label { font-size: 10px; font-weight: 700; color: var(--green); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.2rem; }
        .feed-outcome-text { font-size: 13px; color: var(--text); font-weight: 500; line-height: 1.5; }
        .feed-meta { display: flex; gap: 1rem; flex-wrap: wrap; }
        .feed-meta-item { font-size: 12px; color: var(--text3); }

        .profiles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 2.5rem; }
        .profile-card { background: white; border: 1px solid var(--border-light); border-radius: var(--radius); padding: 1.5rem; transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .profile-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
        .profile-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.875rem; }
        .avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; font-weight: 700; flex-shrink: 0; overflow: hidden; }
        .av1{background:#e8f1fd;color:#0071e3} .av2{background:#fde8e8;color:#c00}
        .av3{background:#e8fdf0;color:#1a7f37} .av4{background:#fdf5e8;color:#bf7e00}
        .av5{background:#f0e8fd;color:#6e36c9} .av6{background:#e8f9fd;color:#0076a3}
        .profile-name { font-size: 0.95rem; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 0.1rem; }
        .profile-role { font-size: 0.78rem; color: var(--text2); }
        .verified-badge { display: inline-flex; align-items: center; gap: 0.25rem; background: var(--accent-light); color: var(--accent); font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: var(--radius-pill); margin-left: auto; }
        .profile-bio { font-size: 0.82rem; color: var(--text2); line-height: 1.55; margin-bottom: 0.875rem; }
        .profile-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .ptag { font-size: 0.7rem; padding: 0.25rem 0.6rem; background: var(--bg2); border-radius: var(--radius-pill); color: var(--text2); font-weight: 500; }

        .pricing-section { background: var(--bg2); padding: 6rem 1.5rem; }
        .pricing-card { background: white; border: 1px solid var(--border-light); border-radius: var(--radius); padding: 2.5rem; max-width: 520px; margin: 2.5rem auto 0; }
        .pricing-feature { display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 0; border-bottom: 0.5px solid #f0f0f5; font-size: 14px; color: var(--text); }
        .pricing-check { color: var(--green); font-weight: 700; flex-shrink: 0; }

        @media (max-width: 768px) {
          .section { padding: 4rem 1.25rem; }
          .manifesto { padding: 4rem 1.25rem; }
          .steps-grid { grid-template-columns: 1fr; gap: 1rem; }
          .profiles-grid { grid-template-columns: 1fr; }
          .emp-hero { padding: 6rem 1.25rem 4rem; }
          .emp-proof { gap: 1rem; }
          .pricing-section { padding: 4rem 1.25rem; }
        }
      `}</style>

      {/* HERO */}
      <section className="emp-hero">
        <div className="emp-eyebrow">
          <span className="emp-dot" />
          For founders and hiring teams
        </div>
        <h1 className="emp-h1">
          The builders you need<br />
          <span className="muted">are already here.</span>
        </h1>
        <p className="emp-sub">
          ShipStacked is where AI-native builders post real work, earn verified status, and get found. Browse proof-of-work profiles, watch the Build Feed, post roles, and message anyone directly. No CVs. No agencies. No guessing.
        </p>
        <div className="emp-cta-wrap">
          <input
            className="emp-input"
            type="email"
            placeholder="your@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && goToCheckout()}
          />
          <button className="btn-primary" onClick={goToCheckout} disabled={loading}>
            {loading ? 'Redirecting...' : 'Get full access — $199/mo'}
          </button>
          <p className="emp-note">No commission. No placement fee. Cancel anytime.</p>
        </div>
        <div className="emp-proof">
          <div className="proof-item"><span className="proof-dot" /> Verified builders only</div>
          <div className="proof-item"><span className="proof-dot" /> Direct messaging</div>
          <div className="proof-item"><span className="proof-dot" /> Unlimited job posts</div>
          <div className="proof-item"><span className="proof-dot" /> No placement fees</div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="manifesto">
        <div className="manifesto-inner">
          <h2>The best AI builders<br />aren't on <span className="accent">LinkedIn.</span></h2>
          <p>
            They're shipping production-grade tools over a weekend. Automating entire workflows solo. Building things that didn't exist six months ago — with Bolt, Lovable, Cursor, Claude Code, and whatever drops next week.
          </p>
          <p>
            <strong>Traditional hiring platforms can't see them.</strong> The filters were built for a different era. CVs don't capture what someone shipped at midnight. GitHub doesn't show what was built with AI. Recruiters don't know what questions to ask.
          </p>
          <p>
            ShipStacked was built for this gap. Every profile is proof of work. Every Build Feed post is a verified outcome. <strong>You're not reading a CV — you're watching someone build in real time.</strong>
          </p>
        </div>
      </section>

      {/* HOW IT WORKS FOR EMPLOYERS */}
      <section className="section">
        <div className="section-inner">
          <p className="eyebrow" style={{ textAlign: 'center' }}>How it works</p>
          <h2 className="section-title" style={{ textAlign: 'center' }}>Hire differently.</h2>
          <div className="steps-grid">
            <div className="step">
              <p className="step-num">01 — Browse</p>
              <h3>Explore verified talent</h3>
              <p>Filter by skills, tools, availability, and Velocity Score. Every profile shows real work, real outcomes, and real GitHub activity — not claims.</p>
            </div>
            <div className="step">
              <p className="step-num">02 — Post</p>
              <h3>List your roles</h3>
              <p>Post unlimited jobs to the ShipStacked board. Builders who match your needs apply directly to your dashboard inbox. No middlemen, no fees per hire.</p>
            </div>
            <div className="step">
              <p className="step-num">03 — Hire</p>
              <h3>Message anyone directly</h3>
              <p>See someone you like on the Build Feed or talent directory? Message them directly. No waiting, no recruiters, no commission on what you close.</p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE BUILD FEED */}
      <section className="section" style={{ background: '#fbfbfd', paddingTop: '3rem' }}>
        <div className="section-inner">
          <p className="eyebrow">Build Feed</p>
          <h2 className="section-title">Watch them build in real time.</h2>
          <p style={{ fontSize: '1rem', color: 'var(--text2)', marginBottom: '2rem', fontWeight: 300, lineHeight: 1.6, maxWidth: 560 }}>
            Every builder posts what they ship — the problem, the approach, the outcome. This is your signal feed.
          </p>
          <div style={{ maxWidth: 680 }}>
            {displayPosts.map((post: any) => {
              const profile = post.profiles
              const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
              return (
                <Link key={post.id} href={`/feed/${post.id}`} className="feed-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                  <div className="feed-author">
                    <div className="feed-avatar">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initials}
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{profile?.full_name || 'Builder'}</span>
                      {profile?.verified && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.4rem', borderRadius: 980 }}>✓ Verified</span>}
                    </div>
                  </div>
                  <p className="feed-title">{post.title}</p>
                  {post.outcome && (
                    <div className="feed-outcome">
                      <p className="feed-outcome-label">Outcome</p>
                      <p className="feed-outcome-text">{post.outcome}</p>
                    </div>
                  )}
                  <div className="feed-meta">
                    {post.tools_used && <span className="feed-meta-item">Built with {post.tools_used}</span>}
                    {post.time_taken && <span className="feed-meta-item">{post.time_taken}</span>}
                  </div>
                </Link>
              )
            })}
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <a href="/feed" style={{ fontSize: 14, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              View the full Build Feed →
            </a>
          </div>
        </div>
      </section>

      {/* TALENT GRID */}
      <section className="section" style={{ background: 'var(--bg2)' }}>
        <div className="section-inner">
          <p className="eyebrow" style={{ textAlign: 'center' }}>The talent</p>
          <h2 className="section-title" style={{ textAlign: 'center' }}>Builders already on the platform.</h2>
          <p style={{ textAlign: 'center', fontSize: '1rem', color: 'var(--text2)', maxWidth: 480, margin: '0 auto', fontWeight: 300, lineHeight: 1.6 }}>
            Verified. Active. Building things that matter.
          </p>
          <div className="profiles-grid">
            {displayProfiles.map((profile: any, i: number) => {
              const initials = profile.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              const name = profile.full_name
              const role = (profile.role || '') + (profile.location ? ' · ' + profile.location : '')
              const bio = profile.bio
              const tags = (profile.skills || []).filter((s: any) => s.category === 'claude_use_case').slice(0, 3).map((s: any) => s.name)
              const avClass = ['av1','av2','av3','av4','av5','av6'][i % 6]
              const verified = isReal ? profile.verified : true
              return (
                <Link key={i} href={`/u/${profile.username}`} className="profile-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                  <div className="profile-top">
                    <div className={`avatar ${isReal ? '' : avClass}`}>
                      {isReal && profile.avatar_url
                        ? <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="profile-name">{name}</div>
                      <div className="profile-role">{role}</div>
                    </div>
                    {verified && <span className="verified-badge">✓ Verified</span>}
                  </div>
                  {bio && <p className="profile-bio">{bio}</p>}
                  <div className="profile-tags">
                    {(tags || []).map((tag: string) => <span key={tag} className="ptag">{tag}</span>)}
                  </div>
                </Link>
              )
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <a href="/talent" style={{ fontSize: 14, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Browse all builders →</a>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="pricing">
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <p className="eyebrow">Simple pricing</p>
          <h2 className="section-title">Everything included.<br />No surprises.</h2>
          <p style={{ fontSize: '1rem', color: 'var(--text2)', lineHeight: 1.7, fontWeight: 300, maxWidth: 480, margin: '0 auto' }}>
            One flat monthly fee. Browse, message, post, hire — as much as you need. No commission ever.
          </p>
          <div className="pricing-card">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.4rem', justifyContent: 'center' }}>
              <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text)' }}>$199</span>
              <span style={{ fontSize: 18, color: 'var(--text2)', fontWeight: 400 }}>/month</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '2rem' }}>Cancel anytime. No placement fees. No commissions.</p>
            {[
              'Full access to the verified talent directory',
              'Direct messaging with any builder on the platform',
              'Unlimited job postings',
              'Company profile page',
              'Application inbox',
              'Velocity Score rankings and filters',
              'Build Feed — watch builders ship in real time',
            ].map(item => (
              <div key={item} className="pricing-feature">
                <span className="pricing-check">✓</span>
                <span>{item}</span>
              </div>
            ))}
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                className="emp-input"
                type="email"
                placeholder="your@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && goToCheckout()}
              />
              <button className="btn-primary" onClick={goToCheckout} disabled={loading}>
                {loading ? 'Redirecting...' : 'Get full access — $199/mo'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER NAV */}
      <div style={{ borderTop: '0.5px solid var(--border-light)', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <a href="/" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', textDecoration: 'none', letterSpacing: '-0.02em' }}>ShipStacked<span style={{ color: 'var(--accent)' }}>.</span></a>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <a href="/talent" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>Browse talent</a>
            <a href="/feed" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>Build Feed</a>
            <a href="/jobs" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>Jobs</a>
            <a href="/join" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>For builders</a>
            <a href="/login" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>Sign in</a>
          </div>
        </div>
      </div>

    </>
  )
}
