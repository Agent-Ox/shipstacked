'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const DUMMY_PROFILES = [
  { initials: 'SR', av: 'av1', name: 'Sara R.', role: 'AI Automation · Barcelona', bio: 'Builds end-to-end automation pipelines using Claude API and n8n. Cut client reporting time by 80% across 3 healthcare orgs.', tags: ['n8n workflows', 'Claude API', 'healthcare'] },
  { initials: 'JM', av: 'av2', name: 'James M.', role: 'Prompt Engineer · London', bio: 'Specialises in RAG systems for legal and financial document processing. Built internal research tools for 2 top-10 law firms.', tags: ['RAG systems', 'legal tech', 'document AI'] },
  { initials: 'AL', av: 'av3', name: 'Ana L.', role: 'Claude Developer · Remote', bio: 'Ships full SaaS MVPs using Claude Code and Supabase. Launched 4 products in 2025, two with paying customers within 30 days.', tags: ['Claude Code', 'SaaS MVPs', 'Supabase'] },
  { initials: 'DK', av: 'av4', name: 'David K.', role: 'AI Consultant · Berlin', bio: 'Trains enterprise teams to integrate Claude into existing workflows. 12 companies onboarded, avg 40% productivity gain reported.', tags: ['enterprise AI', 'training', 'workflow design'] },
  { initials: 'MP', av: 'av5', name: 'Maya P.', role: 'Content Strategist · NYC', bio: 'Builds Claude-powered content pipelines for B2B SaaS. Scaled one client from 4 to 40 articles/month with zero extra headcount.', tags: ['content pipelines', 'B2B SaaS', 'SEO'] },
  { initials: 'RT', av: 'av6', name: 'Ravi T.', role: 'Full-Stack Dev · Singapore', bio: 'Integrates Claude into production apps via API. Built a customer support system handling 10k+ queries/day with 94% resolution rate.', tags: ['Claude API', 'customer support', 'Node.js'] },
]

async function goToCheckout(product: string) {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product })
  })
  const data = await res.json()
  if (data.url) window.location.href = data.url
}

export default function Home() {
  const [realProfiles, setRealProfiles] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('*, skills(*)')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setRealProfiles(data)
      })
  }, [])

  const showReal = realProfiles.length >= 6
  const displayProfiles = showReal ? realProfiles : DUMMY_PROFILES

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #ffffff;
          --bg2: #f5f5f7;
          --bg3: #e8e8ed;
          --text: #1d1d1f;
          --text2: #6e6e73;
          --text3: #aeaeb2;
          --accent: #0071e3;
          --accent-hover: #0077ed;
          --accent-light: #e8f1fd;
          --border: #d2d2d7;
          --border-light: #e8e8ed;
          --purple: #6c63ff;
          --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          --radius: 18px;
          --radius-pill: 980px;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--sans); font-weight: 400; line-height: 1.5; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
        .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 8rem 2rem 6rem; background: linear-gradient(180deg, #fbfbfd 0%, #ffffff 100%); }
        .hero-tag { display: inline-flex; align-items: center; gap: 0.4rem; background: var(--accent-light); color: var(--accent); font-size: 0.75rem; font-weight: 500; padding: 0.3rem 0.85rem; border-radius: var(--radius-pill); margin-bottom: 2rem; }
        .hero-tag-dot { width: 5px; height: 5px; background: var(--accent); border-radius: 50%; animation: pulse 2s ease infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.85); } }
        .hero h1 { font-size: clamp(2.8rem, 7vw, 6rem); font-weight: 600; line-height: 1.05; letter-spacing: -0.03em; color: var(--text); max-width: 820px; margin-bottom: 1rem; }
        .hero h1 .blue { color: var(--accent); }
        .hero-sub { font-size: clamp(1rem, 2vw, 1.2rem); color: var(--text2); max-width: 560px; font-weight: 300; line-height: 1.7; margin-bottom: 2.5rem; }
        .hero-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
        .btn-blue { background: var(--accent); color: white; padding: 0.85rem 1.75rem; border-radius: var(--radius-pill); font-size: 0.95rem; font-weight: 500; text-decoration: none; transition: background 0.2s; display: inline-block; letter-spacing: -0.01em; border: none; cursor: pointer; font-family: var(--sans); }
        .btn-blue:hover { background: var(--accent-hover); }
        .btn-ghost { background: var(--bg2); color: var(--text); padding: 0.85rem 1.75rem; border-radius: var(--radius-pill); font-size: 0.95rem; font-weight: 500; text-decoration: none; transition: background 0.2s; display: inline-block; letter-spacing: -0.01em; }
        .btn-ghost:hover { background: var(--bg3); }
        .hero-stats { display: flex; margin-top: 5rem; background: var(--bg2); border-radius: var(--radius); overflow: hidden; width: 100%; max-width: 640px; }
        .hero-stat { flex: 1; padding: 1.5rem 1rem; text-align: center; border-right: 0.5px solid var(--border); }
        .hero-stat:last-child { border-right: none; }
        .hero-stat-num { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.02em; color: var(--text); margin-bottom: 0.3rem; }
        .hero-stat-label { font-size: 0.72rem; color: var(--text2); line-height: 1.4; }
        section { padding: 6rem 2rem; }
        .section-inner { max-width: 1000px; margin: 0 auto; }
        .section-eyebrow { font-size: 0.75rem; font-weight: 500; color: var(--accent); letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 0.75rem; text-align: center; }
        .section-title { font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 600; letter-spacing: -0.03em; line-height: 1.1; color: var(--text); text-align: center; margin-bottom: 1rem; max-width: 640px; margin-left: auto; margin-right: auto; }
        .section-sub { font-size: 1rem; color: var(--text2); text-align: center; max-width: 480px; margin: 0 auto 3.5rem; line-height: 1.6; font-weight: 300; }
        .how-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .how-card { background: var(--bg2); border-radius: var(--radius); padding: 2.5rem; }
        .how-card.blue-card { background: var(--accent); color: white; }
        .how-pill { display: inline-block; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.3rem 0.75rem; border-radius: var(--radius-pill); margin-bottom: 1.5rem; }
        .pill-free { background: #e3f3e3; color: #1a7f37; }
        .pill-paid { background: rgba(255,255,255,0.2); color: white; }
        .how-card h3 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
        .card-sub { font-size: 0.9rem; opacity: 0.7; margin-bottom: 2rem; line-height: 1.5; }
        .how-list { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
        .how-list li { font-size: 0.9rem; display: flex; align-items: flex-start; gap: 0.6rem; line-height: 1.5; }
        .check { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; font-size: 10px; background: rgba(255,255,255,0.25); }
        .how-card:not(.blue-card) .check { background: var(--accent-light); color: var(--accent); }
        .profiles-section { background: var(--bg2); }
        .profiles-scroll { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 3rem; }
        .profile-card { background: var(--bg); border-radius: var(--radius); padding: 1.75rem; transition: transform 0.3s ease; cursor: default; }
        .profile-card:hover { transform: translateY(-4px); }
        .profile-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
        .avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 600; flex-shrink: 0; }
        .av1 { background: #e8f1fd; color: #0071e3; }
        .av2 { background: #fde8e8; color: #c00; }
        .av3 { background: #e8fdf0; color: #1a7f37; }
        .av4 { background: #fdf5e8; color: #bf7e00; }
        .av5 { background: #f0e8fd; color: #6e36c9; }
        .av6 { background: #e8f9fd; color: #0076a3; }
        .profile-name { font-size: 0.95rem; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 0.1rem; }
        .profile-role { font-size: 0.78rem; color: var(--text2); }
        .verified-badge { display: inline-flex; align-items: center; gap: 0.3rem; background: var(--accent-light); color: var(--accent); font-size: 0.65rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: var(--radius-pill); margin-left: auto; letter-spacing: 0.03em; flex-shrink: 0; }
        .profile-bio { font-size: 0.82rem; color: var(--text2); line-height: 1.55; margin-bottom: 1rem; }
        .profile-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .ptag { font-size: 0.7rem; padding: 0.25rem 0.6rem; background: var(--bg2); border-radius: var(--radius-pill); color: var(--text2); font-weight: 500; }
        .scout-bar { background: linear-gradient(135deg, #0f0f18, #1a1a2e); border-radius: var(--radius); padding: 2rem 2.5rem; display: flex; align-items: center; justify-content: space-between; gap: 2rem; margin-top: 3rem; flex-wrap: wrap; }
        .scout-bar-text h4 { font-size: 1rem; font-weight: 600; color: rgba(240,240,245,0.95); margin-bottom: 0.3rem; letter-spacing: -0.01em; }
        .scout-bar-text p { font-size: 0.85rem; color: rgba(167,139,250,0.8); line-height: 1.5; }
        .scout-badge { font-size: 0.8rem; font-weight: 600; color: rgba(240,240,245,0.9); background: rgba(108,99,255,0.2); border: 1px solid rgba(108,99,255,0.3); padding: 0.5rem 1.1rem; border-radius: var(--radius-pill); white-space: nowrap; }
        .pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 3rem; align-items: start; max-width: 680px; margin-left: auto; margin-right: auto; }
        .price-card { background: var(--bg2); border-radius: var(--radius); padding: 2rem; }
        .price-card.featured { background: var(--accent); color: white; }
        .price-tier { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text2); margin-bottom: 1rem; }
        .price-card.featured .price-tier { color: rgba(255,255,255,0.7); }
        .price-num { font-size: 3rem; font-weight: 600; letter-spacing: -0.04em; line-height: 1; margin-bottom: 0.25rem; }
        .price-num sup { font-size: 1.2rem; font-weight: 500; vertical-align: top; margin-top: 0.5rem; display: inline-block; }
        .price-period { font-size: 0.8rem; color: var(--text2); margin-bottom: 1.5rem; }
        .price-card.featured .price-period { color: rgba(255,255,255,0.7); }
        .price-desc { font-size: 0.875rem; color: var(--text2); line-height: 1.6; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 0.5px solid var(--border-light); }
        .price-card.featured .price-desc { color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.2); }
        .price-features { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 2rem; }
        .price-features li { font-size: 0.85rem; color: var(--text2); display: flex; align-items: center; gap: 0.5rem; }
        .price-card.featured .price-features li { color: rgba(255,255,255,0.85); }
        .price-features li::before { content: ''; width: 14px; height: 14px; border-radius: 50%; background: var(--bg3); flex-shrink: 0; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 6l3 3 5-5' stroke='%230071e3' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: center; background-size: 10px; }
        .price-card.featured .price-features li::before { background-color: rgba(255,255,255,0.2); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 6l3 3 5-5' stroke='white' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); }
        .price-btn { display: block; text-align: center; padding: 0.8rem; border-radius: var(--radius-pill); font-size: 0.9rem; font-weight: 500; text-decoration: none; transition: all 0.2s; letter-spacing: -0.01em; border: none; cursor: pointer; font-family: var(--sans); width: 100%; }
        .price-btn-blue { background: var(--accent); color: white; }
        .price-btn-blue:hover { background: var(--accent-hover); }
        .price-btn-white { background: white; color: var(--accent); }
        .price-btn-white:hover { background: #f0f0f5; }
        .cta-section { background: linear-gradient(180deg, #ffffff 0%, #f5f5f7 100%); text-align: center; padding: 8rem 2rem; }
        .cta-section h2 { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 600; letter-spacing: -0.03em; line-height: 1.05; margin-bottom: 1.25rem; max-width: 600px; margin-left: auto; margin-right: auto; }
        .cta-section p { font-size: 1rem; color: var(--text2); margin-bottom: 2.5rem; font-weight: 300; }
        .cta-note { font-size: 0.75rem; color: var(--text3); margin-top: 0.75rem; }
        footer { background: var(--bg2); border-top: 0.5px solid var(--border-light); padding: 2.5rem 2rem; }
        .footer-inner { max-width: 1000px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
        .footer-logo { font-size: 0.95rem; font-weight: 700; color: var(--text); text-decoration: none; letter-spacing: -0.02em; }
        .footer-links { display: flex; gap: 1.5rem; }
        .footer-links a { font-size: 0.78rem; color: var(--text2); text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: var(--text); }
        .footer-copy { font-size: 0.75rem; color: var(--text3); }
        @media (max-width: 768px) {
          .how-grid { grid-template-columns: 1fr; }
          .profiles-scroll { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr; }
          .hero-stats { flex-direction: column; }
          .hero-stat { border-right: none; border-bottom: 0.5px solid var(--border); }
          .hero-stat:last-child { border-bottom: none; }
          .scout-bar { flex-direction: column; align-items: flex-start; }
          section { padding: 4rem 1.25rem; }
          .cta-section { padding: 5rem 1.25rem; }
        }
      `}</style>

      {/* Hero */}
      <section className="hero">
        <div className="hero-tag">
          <span className="hero-tag-dot"></span>
          Hiring is changing. ClaudHire is the change.
        </div>
        <h1>The home for<br /><span className="blue">Claude-native</span> talent.</h1>
        <p className="hero-sub">
          AI is reshaping how work gets done. The builders leading that shift deserve a platform built for this moment — not retrofitted from the last one. ClaudHire is proof-first hiring for the Claude economy.
        </p>
        <div className="hero-actions">
          <Link href="/signup" className="btn-blue">Create free profile</Link>
          <a href="#pricing" className="btn-ghost">Hire talent</a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-num">Proof-first</div>
            <div className="hero-stat-label">Real projects, not claims</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">AI-matched</div>
            <div className="hero-stat-label">Scout finds the right fit</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">Free to build</div>
            <div className="hero-stat-label">Builders always free</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how">
        <div className="section-inner">
          <p className="section-eyebrow">How it works</p>
          <h2 className="section-title">Two sides. One engine.</h2>
          <p className="section-sub">Builders prove their skills for free. Companies pay to find and hire them. That is the whole model.</p>
          <div className="how-grid">
            <div className="how-card">
              <span className="how-pill pill-free">Builders — Free</span>
              <h3>Prove what you can build.</h3>
              <p className="card-sub">Create a profile, showcase real Claude projects with actual prompts and outcomes, earn your verified badge.</p>
              <ul className="how-list">
                <li><span className="check">✓</span> Profile live in 5 minutes</li>
                <li><span className="check">✓</span> Showcase real projects with prompts and outcomes</li>
                <li><span className="check">✓</span> Earn a verified Claude builder badge</li>
                <li><span className="check">✓</span> Get discovered by companies who need you</li>
                <li><span className="check">✓</span> Browse and apply to open roles</li>
                <li><span className="check">✓</span> Free forever. No catch.</li>
              </ul>
            </div>
            <div className="how-card blue-card">
              <span className="how-pill pill-paid">Employers — Paid</span>
              <h3>Hire with certainty.</h3>
              <p className="card-sub" style={{color:'rgba(255,255,255,0.75)'}}>Stop guessing who actually builds with Claude. Find verified talent, post roles, and let Scout match you instantly.</p>
              <ul className="how-list" style={{color:'rgba(255,255,255,0.9)'}}>
                <li><span className="check">✓</span> Full talent directory access</li>
                <li><span className="check">✓</span> AI-powered matching via Scout</li>
                <li><span className="check">✓</span> Contact verified builders directly</li>
                <li><span className="check">✓</span> Post unlimited jobs</li>
                <li><span className="check">✓</span> Public or anonymous — your choice</li>
                <li><span className="check">✓</span> No commission — one flat monthly fee</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Talent showcase */}
      <section className="profiles-section" id="talent">
        <div className="section-inner">
          <p className="section-eyebrow">The talent</p>
          <h2 className="section-title">Real builders. Real proof.</h2>
          <p className="section-sub">Every profile on ClaudHire shows actual work — not just a claim that someone uses AI.</p>
          <div className="profiles-scroll">
            {displayProfiles.map((profile: any, i: number) => {
              const isReal = showReal
              const initials = isReal
                ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                : profile.initials
              const name = isReal ? profile.full_name : profile.name
              const role = isReal ? (profile.role || '') + (profile.location ? ' · ' + profile.location : '') : profile.role
              const bio = isReal ? profile.bio : profile.bio
              const tags = isReal
                ? (profile.skills || []).filter((s: any) => s.category === 'claude_use_case').slice(0, 3).map((s: any) => s.name)
                : profile.tags
              const avClass = ['av1','av2','av3','av4','av5','av6'][i % 6]
              const verified = isReal ? profile.verified : true

              return (
                <div key={i} className="profile-card">
                  <div className="profile-top">
                    <div className={"avatar " + avClass}>{initials}</div>
                    <div>
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

          {/* Scout bar */}
          <div className="scout-bar">
            <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
              <div style={{width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg, #6c63ff, #a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
                  <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="scout-bar-text">
                <h4>Meet Scout — your AI talent concierge</h4>
                <p>Describe who you need in plain language. Scout searches every builder profile and surfaces your best matches instantly.</p>
              </div>
            </div>
            <a href="#pricing" className="scout-badge">Get access to Scout</a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing">
        <div className="section-inner">
          <p className="section-eyebrow">Pricing</p>
          <h2 className="section-title">Free to build. Paid to hire.</h2>
          <p className="section-sub">Builders are always free. Companies pay one flat fee for full access — no commissions, no surprises.</p>
          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-tier">Builder</div>
              <div className="price-num">$0</div>
              <div className="price-period">Free forever</div>
              <p className="price-desc">Create your profile, show your work, get discovered and apply to roles directly.</p>
              <ul className="price-features">
                <li>Public verified profile</li>
                <li>Unlimited project showcases</li>
                <li>Verified builder badge</li>
                <li>Browse and apply to open roles</li>
                <li>Discoverable by all employers</li>
              </ul>
              <Link href="/signup" className="price-btn price-btn-blue">Create free profile</Link>
            </div>
            <div className="price-card featured">
              <div className="price-tier">Employer — Full access</div>
              <div className="price-num"><sup>$</sup>199</div>
              <div className="price-period">per month</div>
              <p className="price-desc">Full talent directory, Scout AI matching, direct contact, and unlimited job posts — everything in one.</p>
              <ul className="price-features">
                <li>Full talent directory access</li>
                <li>Scout AI concierge matching</li>
                <li>Direct builder contact</li>
                <li>Unlimited job posts</li>
                <li>Public or anonymous profile</li>
                <li>No commission ever</li>
              </ul>
              <button className="price-btn price-btn-white" onClick={() => goToCheckout('full_access')}>Get full access</button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="signup">
        <h2>Free to prove<br />you can build.</h2>
        <p>Create your profile in 5 minutes. No credit card. No catch.</p>
        <Link href="/signup" className="btn-blue" style={{fontSize:'1rem', padding:'1rem 2rem'}}>Create your free profile</Link>
        <p className="cta-note">Builders are free forever.</p>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-inner">
          <a href="/" className="footer-logo">ClaudHire.</a>
          <div className="footer-links">
            <a href="#how">How it works</a>
            <a href="#talent">Talent</a>
            <a href="#pricing">Pricing</a>
            <Link href="/signup">Join</Link>
          </div>
          <p className="footer-copy">© 2026 ClaudHire. All rights reserved.</p>
        </div>
      </footer>
    </>
  )
}
