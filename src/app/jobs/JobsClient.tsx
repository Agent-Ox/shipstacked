'use client'

import { useState } from 'react'
import Link from 'next/link'

// SVG icons matching feed
const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)
const LiIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)
const ShareIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
)

function buildXShareUrl(job: any) {
  const company = job.anonymous ? 'a company' : job.company_name
  const text = [
    `${job.role_title} at ${company} — now hiring on ShipStacked`,
    job.salary_range ? `\n${job.salary_range}` : '',
    job.location ? `\n${job.location}` : '',
    `\n\nApply → shipstacked.com/jobs/${job.id}`,
    '\n#shipstacked #hiring #ainative',
  ].join('')
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`
}

function buildLiShareUrl(job: any) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://shipstacked.com/jobs/${job.id}`)}`
}

function NativeShareButton({ url, title, text }: { url: string; title: string; text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {}
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleShare}
      title="Share"
      style={{ width: 30, height: 30, borderRadius: '50%', background: '#f0f0f5', border: '1px solid #e0e0e5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: copied ? '#1a7f37' : '#6e6e73', flexShrink: 0 }}
    >
      {copied ? <span style={{ fontSize: 11, fontWeight: 700 }}>✓</span> : <ShareIcon />}
    </button>
  )
}

function JobCard({ job, isBuilder, isLoggedOut, alreadyApplied }: {
  job: any
  isBuilder: boolean
  isLoggedOut: boolean
  alreadyApplied: boolean
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(alreadyApplied ? 'done' : 'idle')
  const justApplied = state === 'done' && !alreadyApplied

  // Team/agent-posted job → show the team/agent identity + link to its page.
  // No subject_profile (every existing job) → unchanged email-based hirer path.
  const subject = job.subject_profile
  const logo = subject ? subject.logo_url : job.employer_profile?.logo_url
  const companyName = job.anonymous ? 'Confidential' : (subject ? subject.display_name : job.company_name)
  const companyHref = subject
    ? `/${subject.kind === 'agent' ? 'agent' : 'team'}/${subject.slug}`
    : (job.employer_profile?.slug ? `/company/${job.employer_profile.slug}` : null)
  const initials = companyName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const postedAgo = (() => {
    const seconds = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 1000)
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  })()

  async function handleApply() {
    setState('loading')
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
      const data = await res.json()
      if (!res.ok) { if (res.status === 409) { setState('done'); return }; setState('error'); return }
      setState('done')
    } catch { setState('error') }
  }

  const shareUrl = `https://shipstacked.com/jobs/${job.id}`
  const shareTitle = `${job.role_title} at ${companyName}`
  const shareText = `${job.role_title} at ${companyName} — apply on ShipStacked`

  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }}>
      {/* Header row — mirrors feed card author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        {/* Company logo / initials */}
        <Link href={companyHref ?? '/jobs'} style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {logo
              ? <img src={logo} alt={companyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 13, fontWeight: 700, color: '#0071e3' }}>{initials}</span>
            }
          </div>
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {companyHref ? (
              <Link href={companyHref} style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', textDecoration: 'none' }}>
                {companyName}
              </Link>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{companyName}</span>
            )}
            <span style={{ fontSize: 12, color: '#d2d2d7' }}>·</span>
            <span style={{ fontSize: 12, color: '#6e6e73', textTransform: 'capitalize' }}>{job.employment_type}</span>
            {job.urgency && <span style={{ fontSize: 10, fontWeight: 600, color: '#bf7e00', background: '#fef3cd', padding: '0.1rem 0.4rem', borderRadius: 980 }}>{job.urgency}</span>}
          </div>
          <p style={{ fontSize: 12, color: '#aeaeb2' }}>{postedAgo}</p>
        </div>

        {/* Share buttons — same position as feed */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <a href={buildXShareUrl(job)} target="_blank" rel="noopener noreferrer"
            style={{ width: 30, height: 30, borderRadius: '50%', background: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            title="Share on X">
            <XIcon />
          </a>
          <a href={buildLiShareUrl(job)} target="_blank" rel="noopener noreferrer"
            style={{ width: 30, height: 30, borderRadius: '50%', background: '#0077b5', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            title="Share on LinkedIn">
            <LiIcon />
          </a>
          <NativeShareButton url={shareUrl} title={shareTitle} text={shareText} />
        </div>
      </div>

      {/* Title — links to detail page */}
      <Link href={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.75rem', lineHeight: 1.3, cursor: 'pointer' }}>
          {job.role_title}
        </h2>
      </Link>

      {/* Fields — mirrors feed card layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: 13 }}>
          <span style={{ color: '#aeaeb2', fontWeight: 500, flexShrink: 0, minWidth: 80 }}>Location</span>
          <span style={{ color: '#3d3d3f', lineHeight: 1.5 }}>{job.location}</span>
        </div>
        {job.description && (
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: 13 }}>
            <span style={{ color: '#aeaeb2', fontWeight: 500, flexShrink: 0, minWidth: 80 }}>Role</span>
            <span style={{ color: '#3d3d3f', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{job.description}</span>
          </div>
        )}
        {job.salary_range && (
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: 13 }}>
            <span style={{ color: '#1a7f37', fontWeight: 600, flexShrink: 0, minWidth: 80 }}>Salary</span>
            <span style={{ color: '#1d1d1f', fontWeight: 500 }}>{job.salary_range}</span>
          </div>
        )}
      </div>

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
          {job.skills.slice(0, 6).map((skill: string) => (
            <span key={skill} style={{ fontSize: 12, padding: '0.25rem 0.6rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '0.5px solid #f0f0f5' }}>
        <Link href={`/jobs/${job.id}`} style={{ fontSize: 12, color: '#6e6e73', textDecoration: 'none' }}>
          View full listing →
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isBuilder && state === 'done' && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a7f37', background: '#e3f3e3', padding: '0.4rem 1.1rem', borderRadius: 980 }}>Applied ✓</span>
          )}
          {isBuilder && state === 'loading' && (
            <button disabled style={{ padding: '0.4rem 1.1rem', background: '#6e6e73', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, border: 'none', fontFamily: 'inherit', cursor: 'not-allowed' }}>Applying...</button>
          )}
          {isBuilder && state === 'idle' && (
            <button onClick={handleApply} style={{ padding: '0.4rem 1.1rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Apply →</button>
          )}
          {isBuilder && state === 'error' && (
            <button onClick={handleApply} style={{ padding: '0.4rem 1.1rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button>
          )}
          {isLoggedOut && (
            <Link href="/login" style={{ padding: '0.4rem 1.1rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>Sign in to apply →</Link>
          )}
        </div>
      </div>

      {/* Inline success */}
      {justApplied && (
        <div style={{ marginTop: '0.75rem', padding: '0.875rem 1rem', background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, color: '#1a7f37', fontWeight: 500, margin: 0 }}>
            ✓ Application sent — {companyName} will see your message in their ShipStacked inbox.
          </p>
          <Link href="/messages" style={{ fontSize: 13, fontWeight: 600, color: '#1a7f37', textDecoration: 'underline', whiteSpace: 'nowrap' }}>View messages →</Link>
        </div>
      )}
    </div>
  )
}

import type { EntityModes } from '@/lib/user'

export default function JobsClient({
  jobs, modes, appliedJobIds,
}: {
  jobs: any[]
  modes: EntityModes
  appliedJobIds: string[]
}) {
  const isBuilder = modes.builder
  const isHirer = modes.hirer || modes.admin
  const isLoggedOut = !modes.builder && !modes.hirer && !modes.client && !modes.admin

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Jobs</p>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>AI-native roles</h1>
          <p style={{ fontSize: 15, color: '#6e6e73' }}>Companies hiring AI-native builders.</p>
        </div>

        {jobs.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: '1rem' }}>🔍</p>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>No jobs posted yet.</h2>
            <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '1.5rem' }}>Be the first company to hire AI-native talent.</p>
            {isHirer && (
              <Link href="/post-job" style={{ padding: '0.75rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                Post a job →
              </Link>
            )}
          </div>
        ) : (
          <>
            {jobs.map((job: any) => (
              <JobCard
                key={job.id}
                job={job}
                isBuilder={isBuilder}
                isLoggedOut={isLoggedOut}
                alreadyApplied={appliedJobIds.includes(job.id)}
              />
            ))}
          </>
        )}

        {/* Logged-out CTAs */}
        {isLoggedOut && jobs.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1.5rem', background: '#f0f5ff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.2rem' }}>Are you an AI-native builder?</p>
                <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>Create a free profile and get discovered by companies hiring right now.</p>
              </div>
              <Link href="/join" style={{ padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none', flexShrink: 0 }}>Create free profile →</Link>
            </div>
            <div style={{ padding: '1.5rem', background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.2rem' }}>Are you hiring?</p>
                <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>Browse the talent directory and post roles to reach AI-native builders.</p>
              </div>
              <Link href="/talent" style={{ padding: '0.6rem 1.25rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none', flexShrink: 0, border: '1px solid #e0e0e5' }}>Get started →</Link>
            </div>
          </div>
        )}

        {/* Hirer CTA */}
        {isHirer && (
          <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.2rem' }}>Hiring AI-native talent?</p>
              <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>Post a role and receive applications directly in your ShipStacked inbox.</p>
            </div>
            <Link href="/post-job" style={{ padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>Post a job →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
