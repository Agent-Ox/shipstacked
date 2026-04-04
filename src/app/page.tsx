'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

// Dummy feed posts — fall away automatically when real posts exist
const DUMMY_POSTS = [
  {
    id: 'd1', title: 'AI contract review tool for a 3-person law firm',
    problem_solved: 'Contract reviews were taking 4 hours each. Partner time was being wasted on routine checks.',
    outcome: 'Review time cut from 4 hours to 20 minutes. Client is now productising it for other firms.',
    tools_used: 'Claude API, n8n, Supabase', time_taken: '2 weekends',
    profiles: { full_name: 'Sara R.', verified: true, avatar_url: null }
  },
  {
    id: 'd2', title: 'Full social content pipeline — brief in, 30 posts out',
    problem_solved: 'Client was paying a content agency £4k/month for inconsistent output.',
    outcome: 'Brief goes in Monday morning, 30 posts scheduled by Monday afternoon. They cancelled the agency.',
    tools_used: 'Claude Code, Make, Airtable', time_taken: '4 days',
    profiles: { full_name: 'James M.', verified: true, avatar_url: null }
  },
  {
    id: 'd3', title: 'Full SaaS MVP — auth, payments, AI insights layer',
    problem_solved: 'Fintech client had a validated idea but no technical co-founder and no budget for an agency.',
    outcome: 'Live with paying customers in 3 weeks. Client raised a pre-seed round off the back of it.',
    tools_used: 'Lovable, Supabase, Stripe', time_taken: '3 weeks',
    profiles: { full_name: 'Ana L.', verified: true, avatar_url: null }
  },
  {
    id: 'd4', title: 'Outreach agent running 24/7 — books calls while I sleep',
    problem_solved: 'Client was spending 3 hours a day on manual outreach with inconsistent results.',
    outcome: '$40k in new business closed last month. Agent qualifies, personalises, books. Zero human input.',
    tools_used: 'Claude Code, n8n, Apollo', time_taken: '5 days',
    profiles: { full_name: 'Maya P.', verified: false, avatar_url: null }
  },
]

// Dummy profiles — fall away when 6+ real profiles exist
const DUMMY_PROFILES = [
  { initials: 'SR', av: 'av1', name: 'Sara R.', role: 'AI Automation · Barcelona', bio: 'Builds end-to-end automation pipelines. Cut client reporting time by 80% across 3 healthcare orgs.', tags: ['n8n workflows', 'Claude API', 'healthcare'] },
  { initials: 'JM', av: 'av2', name: 'James M.', role: 'Prompt Engineer · London', bio: 'RAG systems for legal and financial document processing. Built internal research tools for 2 top-10 law firms.', tags: ['RAG systems', 'legal tech', 'document AI'] },
  { initials: 'AL', av: 'av3', name: 'Ana L.', role: 'Vibe Coder · Remote', bio: 'Ships full SaaS MVPs using Claude Code and Supabase. Launched 4 products in 2025, two with paying customers in 30 days.', tags: ['Claude Code', 'SaaS MVPs', 'Supabase'] },
  { initials: 'DK', av: 'av4', name: 'David K.', role: 'AI Consultant · Berlin', bio: 'Trains enterprise teams to integrate AI. 12 companies onboarded, avg 40% productivity gain.', tags: ['enterprise AI', 'agent systems', 'workflow design'] },
  { initials: 'MP', av: 'av5', name: 'Maya P.', role: 'Agent Builder · NYC', bio: 'Deploys AI agents for B2B outreach and content. One agent closed $40k last month with zero human input.', tags: ['agent systems', 'outreach automation', 'B2B'] },
  { initials: 'RT', av: 'av6', name: 'Ravi T.', role: 'Full-Stack AI Dev · Singapore', bio: 'Integrates AI into production apps. Built a support system handling 10k+ queries/day, 94% auto-resolution.', tags: ['Claude API', 'customer support', 'Node.js'] },
]

async function goToCheckout() {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: 'full_access' })
  })
  const data = await res.json()
  if (data.url) window.location.href = data.url
}

export default function Home() {
  const [realProfiles, setRealProfiles] = useState<any[]>([])
  const [feedPosts, setFeedPosts] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/feed?limit=4')
      .then(r => r.json())
      .then(({ posts }) => { if (posts?.length) setFeedPosts(posts) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*, skills(*)').eq('published', true)
      .order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => { if (data?.length >= 6) setRealProfiles(data) })
  }, [])

  const showRealProfiles = realProfiles.length >= 6
  const displayProfiles = showRealProfiles ? realProfiles : DUMMY_PROFILES
  const displayPosts = feedPosts.length > 0 ? feedPosts : DUMMY_POSTS

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

        /* Hero */
        .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 6rem 1.5rem 5rem; background: linear-gradient(180deg, #fbfbfd 0%, #ffffff 100%); }
        .hero-eyebrow { display: inline-flex; align-items: center; gap: 0.4rem; background: var(--accent-light); color: var(--accent); font-size: 0.75rem; font-weight: 600; padding: 0.3rem 0.875rem; border-radius: var(--radius-pill); margin-bottom: 2rem; letter-spacing: 0.02em; }
        .hero-dot { width: 5px; height: 5px; background: var(--accent); border-radius: 50%; animation: pulse 2s ease infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        .hero h1 { font-size: clamp(2.6rem, 7vw, 5.5rem); font-weight: 700; line-height: 1.05; letter-spacing: -0.03em; color: var(--text); max-width: 800px; margin-bottom: 0.5rem; }
        .hero h1 .muted { color: var(--text3); font-weight: 400; }
        .hero-sub { font-size: clamp(1rem, 2vw, 1.15rem); color: var(--text2); max-width: 520px; line-height: 1.7; margin: 1.25rem auto 2.5rem; font-weight: 300; }
        .btn-primary { display: inline-block; background: var(--accent); color: white; padding: 1rem 2rem; border-radius: var(--radius-pill); font-size: 1rem; font-weight: 600; text-decoration: none; transition: background 0.2s, transform 0.15s; letter-spacing: -0.01em; border: none; cursor: pointer; font-family: var(--sans); }
        .btn-primary:hover { background: var(--accent-hover); transform: translateY(-1px); }
        .hero-note { font-size: 0.8rem; color: var(--text3); margin-top: 0.875rem; }
        .hero-proof { display: flex; align-items: center; justify-content: center; gap: 1.5rem; margin-top: 3.5rem; flex-wrap: wrap; }
        .proof-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text2); }
        .proof-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }

        /* Sections */
        .section { padding: 5rem 1.5rem; }
        .section-inner { max-width: 960px; margin: 0 auto; }
        .section-inner-narrow { max-width: 680px; margin: 0 auto; }
        .eyebrow { font-size: 0.72rem; font-weight: 600; color: var(--accent); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.75rem; }
        .section-title { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; color: var(--text); margin-bottom: 1rem; }

        /* Manifesto */
        .manifesto { background: #0a0a0f; padding: 5rem 1.5rem; }
        .manifesto-inner { max-width: 720px; margin: 0 auto; }
        .manifesto h2 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.08; color: #f0f0f5; margin-bottom: 2rem; }
        .manifesto h2 .accent { color: #6c63ff; }
        .manifesto p { font-size: clamp(1rem, 2vw, 1.1rem); color: rgba(240,240,245,0.65); line-height: 1.85; font-weight: 300; margin-bottom: 1.25rem; }
        .manifesto p:last-child { margin-bottom: 0; }
        .manifesto strong { color: rgba(240,240,245,0.9); font-weight: 500; }

        /* Feed preview */
        .feed-card { background: white; border: 1px solid var(--border-light); border-radius: 16px; padding: 1.375rem 1.5rem; margin-bottom: 0.875rem; transition: border-color 0.2s; }
        .feed-card:hover { border-color: #c0c0c8; }
        .feed-author { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.875rem; }
        .feed-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #e8f1fd, #d0e4fb); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--accent); overflow: hidden; flex-shrink: 0; }
        .feed-title { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.01em; margin-bottom: 0.625rem; line-height: 1.35; }
        .feed-outcome { background: var(--green-light); border: 1px solid #b3e0b3; border-radius: 8px; padding: 0.6rem 0.875rem; margin-bottom: 0.625rem; }
        .feed-outcome-label { font-size: 10px; font-weight: 700; color: var(--green); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.2rem; }
        .feed-outcome-text { font-size: 13px; color: var(--text); font-weight: 500; line-height: 1.5; }
        .feed-meta { display: flex; gap: 1rem; flex-wrap: wrap; }
        .feed-meta-item { font-size: 12px; color: var(--text3); }

        /* How it works */
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 2.5rem; }
        .step { background: var(--bg2); border-radius: var(--radius); padding: 2rem 1.75rem; }
        .step-num { font-size: 0.7rem; font-weight: 700; color: var(--accent); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 1rem; font-family: monospace; }
        .step h3 { font-size: 1.15rem; font-weight: 700; letter-spacing: -0.02em; color: var(--text); margin-bottom: 0.5rem; }
        .step p { font-size: 0.875rem; color: var(--text2); line-height: 1.6; }

        /* Profile cards */
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

        /* Employer section */
        .employer-section { background: var(--bg2); padding: 5rem 1.5rem; }
        .employer-inner { max-width: 580px; margin: 0 auto; text-align: center; }

        /* Founder story */
        .founder-section { padding: 5rem 1.5rem; border-top: 0.5px solid var(--border-light); }
        .founder-inner { max-width: 680px; margin: 0 auto; display: flex; gap: 2rem; align-items: flex-start; }
        .founder-avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #0071e3, #6c63ff); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .founder-text p { font-size: 15px; color: var(--text2); line-height: 1.8; margin-bottom: 1rem; }
        .founder-text p:last-child { margin-bottom: 0; }
        .founder-text strong { color: var(--text); font-weight: 600; }

        /* Final CTA */
        .cta-section { padding: 7rem 1.5rem; text-align: center; background: linear-gradient(180deg, white 0%, #f5f5f7 100%); }
        .cta-section h2 { font-size: clamp(2.2rem, 5vw, 3.5rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.08; margin-bottom: 1rem; }
        .cta-section p { font-size: 1rem; color: var(--text2); margin-bottom: 2.5rem; font-weight: 300; }

        /* Footer */
        footer { background: var(--bg2); border-top: 0.5px solid var(--border-light); padding: 2.5rem 1.5rem; }
        .footer-inner { max-width: 960px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
        .footer-logo { font-size: 0.95rem; font-weight: 700; color: var(--text); text-decoration: none; letter-spacing: -0.02em; }
        .footer-links { display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .footer-links a { font-size: 0.78rem; color: var(--text2); text-decoration: none; }
        .footer-links a:hover { color: var(--text); }
        .footer-copy { font-size: 0.75rem; color: var(--text3); }

        /* Responsive */
        @media (max-width: 768px) {
          .section { padding: 4rem 1.25rem; }
          .manifesto { padding: 4rem 1.25rem; }
          .steps { grid-template-columns: 1fr; gap: 1rem; }
          .profiles-grid { grid-template-columns: 1fr; }
          .founder-inner { flex-direction: column; gap: 1.25rem; }
          .hero-proof { gap: 1rem; }
          .employer-section { padding: 4rem 1.25rem; }
          .founder-section { padding: 4rem 1.25rem; }
          .cta-section { padding: 5rem 1.25rem; }
        }
        @media (max-width: 480px) {
          .hero { padding: 5rem 1.25rem 4rem; }
          .btn-primary { width: 100%; text-align: center; padding: 1rem 1.5rem; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="hero-dot" />
          The proof-of-work platform for AI-native builders
        </div>
        <h1>
          You shipped something incredible last week.<br />
          <span className="muted">Nobody important saw it.</span>
        </h1>
        <p className="hero-sub">
          ShipStacked is where AI-native builders post their work, prove what they can do, and get found by the people worth working with. No CVs. No guessing. Just proof.
        </p>
        <Link href="/join" className="btn-primary">
          Show what you&apos;ve built — it&apos;s free
        </Link>
        <p className="hero-note">Join the founding cohort of builders shipping in public</p>
        <div className="hero-proof">
          <div className="proof-item"><span className="proof-dot" /> Free forever for builders</div>
          <div className="proof-item"><span className="proof-dot" /> Auto-verified when your proof is real</div>
          <div className="proof-item"><span className="proof-dot" /> Live in 5 minutes</div>
        </div>
      </section>

      {/* ── MANIFESTO ── */}
      <section className="manifesto">
        <div className="manifesto-inner">
          <h2>The hiring world<br />just <span className="accent">broke.</span></h2>
          <p>
            The builders who matter right now aren&apos;t on LinkedIn. They&apos;re shipping production-grade AI tools over a weekend, automating entire workflows without a team, building things that didn&apos;t exist six months ago — with Bolt, Lovable, Cursor, Claude Code, and whatever drops next week.
          </p>
          <p>
            <strong>Traditional platforms can&apos;t see them.</strong> The filters were built for a different era. CVs don&apos;t capture what you shipped at midnight. GitHub doesn&apos;t show what you built with AI. Recruiters don&apos;t know what questions to ask.
          </p>
          <p>
            Some of these builders don&apos;t even show up themselves anymore — they send their agents. Outreach agents. Build agents. Research agents. The agentic economy is here, and the hiring infrastructure hasn&apos;t caught up.
          </p>
          <p>
            ShipStacked was built for this moment. <strong>Post your builds. Show your outcomes. Get verified automatically. Get found — on your terms.</strong>
          </p>
        </div>
      </section>

      {/* ── BUILD FEED PREVIEW ── */}
      <section className="section" style={{ background: '#fbfbfd' }}>
        <div className="section-inner">
          <p className="eyebrow">Build Feed</p>
          <h2 className="section-title">What&apos;s being shipped right now</h2>
          <p style={{ fontSize: '1rem', color: 'var(--text2)', marginBottom: '2rem', fontWeight: 300, lineHeight: 1.6 }}>
            Real builds. Real outcomes. This is what proof of work looks like.
          </p>

          <div style={{ maxWidth: 680 }}>
            {displayPosts.map((post: any) => {
              const profile = post.profiles
              const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() || '?'
              return (
                <div key={post.id} className="feed-card">
                  <div className="feed-author">
                    <div className="feed-avatar">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initials
                      }
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
                    {post.tools_used && <span className="feed-meta-item">🛠 {post.tools_used}</span>}
                    {post.time_taken && <span className="feed-meta-item">⏱ {post.time_taken}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/feed" style={{ fontSize: 14, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              View the full Build Feed →
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section" id="how">
        <div className="section-inner">
          <p className="eyebrow" style={{ textAlign: 'center' }}>How it works</p>
          <h2 className="section-title" style={{ textAlign: 'center' }}>Three steps. No gatekeepers.</h2>
          <div className="steps">
            <div className="step">
              <p className="step-num">01 — Create</p>
              <h3>Build your profile</h3>
              <p>Tell us what you build and how. Add your projects, your tools, your stack. Takes 5 minutes. No CV required.</p>
            </div>
            <div className="step">
              <p className="step-num">02 — Prove</p>
              <h3>Post your builds</h3>
              <p>Every project, every outcome. The Build Feed is your proof of work. Post what you shipped, what problem it solved, what the result was.</p>
            </div>
            <div className="step">
              <p className="step-num">03 — Get found</p>
              <h3>Let the work speak</h3>
              <p>Get auto-verified when your proof is real. Your Velocity Score shows you&apos;re active. Employers with real budgets find you — no applications, no guessing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROFILE CARDS — social proof ── */}
      <section className="section" style={{ background: 'var(--bg2)' }} id="builders">
        <div className="section-inner">
          <p className="eyebrow" style={{ textAlign: 'center' }}>The community</p>
          <h2 className="section-title" style={{ textAlign: 'center' }}>Builders already here</h2>
          <p style={{ textAlign: 'center', fontSize: '1rem', color: 'var(--text2)', maxWidth: 480, margin: '0 auto', fontWeight: 300, lineHeight: 1.6 }}>
            These are the people who don&apos;t wait for permission. They ship, they prove it, and they get found.
          </p>
          <div className="profiles-grid">
            {displayProfiles.map((profile: any, i: number) => {
              const isReal = showRealProfiles
              const initials = isReal
                ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()
                : profile.initials
              const name = isReal ? profile.full_name : profile.name
              const role = isReal ? (profile.role || '') + (profile.location ? ' · ' + profile.location : '') : profile.role
              const bio = profile.bio
              const tags = isReal
                ? (profile.skills || []).filter((s: any) => s.category === 'claude_use_case').slice(0, 3).map((s: any) => s.name)
                : profile.tags
              const avClass = ['av1','av2','av3','av4','av5','av6'][i % 6]
              const verified = isReal ? profile.verified : true

              return (
                <div key={i} className="profile-card">
                  <div className="profile-top">
                    <div className={`avatar ${isReal ? '' : avClass}`} style={isReal && profile.avatar_url ? {} : {}}>
                      {isReal && profile.avatar_url
                        ? <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initials
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="profile-name">{name}</div>
                      <div className="profile-role">{role}</div>
                    </div>
                    {verified && <span className="verified-badge">✓ Verified</span>}
                  </div>
                  {bio && <p className="profile-bio">{bio}</p>}
                  <div className="profile-tags">
                    {tags.map((tag: string) => <span key={tag} className="ptag">{tag}</span>)}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/join" className="btn-primary" style={{ display: 'inline-block' }}>
              Join them — create your free profile
            </Link>
          </div>
        </div>
      </section>

      {/* ── EMPLOYER PAYOFF ── */}
      <section className="employer-section" id="pricing">
        <div className="employer-inner">
          <p className="eyebrow">For founders and hiring teams</p>
          <h2 className="section-title">The right people are already watching.</h2>
          <p style={{ fontSize: '1rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem', fontWeight: 300 }}>
            Employers on ShipStacked pay $199/month to browse verified builders and message them directly. No commissions. No middlemen. No placement fees. When you&apos;re ready to hire — they&apos;re here, and their proof of work is already waiting.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={goToCheckout}
              className="btn-primary"
            >
              Get full access — $199/mo
            </button>
            <Link href="/talent" style={{ display: 'inline-block', padding: '1rem 1.75rem', background: 'var(--bg3)', color: 'var(--text)', borderRadius: 'var(--radius-pill)', fontSize: '1rem', fontWeight: 500, textDecoration: 'none', transition: 'background 0.2s' }}>
              Browse talent first
            </Link>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: '1rem' }}>No commission. Cancel anytime.</p>
        </div>
      </section>

      {/* ── FOUNDER STORY ── */}
      <section className="founder-section">
        <div className="founder-inner">
          <div className="founder-avatar">👋</div>
          <div className="founder-text">
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Built by a builder, for builders</p>
            <p>
              ShipStacked was built with Claude Code by a solo founder who tried to hire an AI-native developer the normal way — and couldn&apos;t. The best builders weren&apos;t on any platform. They were in Discord servers and Twitter threads, shipping things that blew my mind, completely invisible to anyone hiring.
            </p>
            <p>
              So I built the platform they deserved. <strong>With a lot of help from my agent, OX.</strong> If you&apos;re running agents, shipping with AI, or building things that didn&apos;t exist six months ago — you&apos;re exactly who this is for.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>
              Built with Claude Code · Supabase · Vercel · Stripe · Resend
            </p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="cta-section">
        <h2>This is your home.</h2>
        <p>Free forever for builders. Your profile, your builds, your proof of work — all in one place.</p>
        <Link href="/join" className="btn-primary" style={{ display: 'inline-block', fontSize: '1.05rem', padding: '1.1rem 2.5rem' }}>
          Create your free profile
        </Link>
        <p className="hero-note" style={{ marginTop: '1rem' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-inner">
          <a href="/" className="footer-logo">ShipStacked<span style={{ color: 'var(--accent)' }}>.</span></a>
          <div className="footer-links">
            <a href="#how">How it works</a>
            <a href="#builders">Community</a>
            <a href="#pricing">Hire talent</a>
            <Link href="/feed">Build Feed</Link>
            <Link href="/join">Join</Link>
          </div>
          <p className="footer-copy">© 2026 ShipStacked. All rights reserved.</p>
        </div>
      </footer>
    </>
  )
}
