'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function JobDetailClient({
  job, role, isActive, alreadyApplied, companySlug, siteUrl,
}: {
  job: any
  role: 'builder' | 'employer' | 'admin' | null
  isActive: boolean
  alreadyApplied: boolean
  companySlug: string | null
  siteUrl: string
}) {
  const [applyState, setApplyState] = useState<'idle' | 'loading' | 'done' | 'error'>(alreadyApplied ? 'done' : 'idle')
  const [copied, setCopied] = useState(false)

  const isBuilder = role === 'builder'
  const isEmployer = role === 'employer' || role === 'admin'
  const isLoggedOut = role === null
  const justApplied = applyState === 'done' && !alreadyApplied
  const shareUrl = `${siteUrl}/jobs/${job.id}`

  async function handleApply() {
    setApplyState('loading')
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) { setApplyState('done'); return }
        setApplyState('error')
        return
      }
      setApplyState('done')
    } catch {
      setApplyState('error')
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const postedDate = new Date(job.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const expiresDate = job.expires_at ? new Date(job.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null
  const daysLeft = job.expires_at ? Math.max(0, Math.ceil((new Date(job.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>

        {/* Back */}
        <Link href="/jobs" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '2rem' }}>
          ← All jobs
        </Link>

        {/* Expired banner */}
        {!isActive && (
          <div style={{ background: '#f5f5f7', border: '1px solid #e0e0e5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>
              This role is no longer accepting applications.
            </p>
            <Link href="/jobs" style={{ fontSize: 13, fontWeight: 600, color: '#0071e3', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Browse open roles →
            </Link>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: isActive ? '#1d1d1f' : '#6e6e73', marginBottom: '0.4rem' }}>
                {job.role_title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {!job.anonymous && companySlug ? (
                  <Link href={`/company/${companySlug}`} style={{ fontSize: 15, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>
                    {job.company_name}
                  </Link>
                ) : (
                  <span style={{ fontSize: 15, color: '#6e6e73' }}>{job.anonymous ? 'Confidential company' : job.company_name}</span>
                )}
                <span style={{ color: '#d2d2d7' }}>·</span>
                <span style={{ fontSize: 15, color: '#6e6e73' }}>{job.location}</span>
                <span style={{ color: '#d2d2d7' }}>·</span>
                <span style={{ fontSize: 15, color: '#6e6e73', textTransform: 'capitalize' }}>{job.employment_type}</span>
              </div>
            </div>
            {job.salary_range && (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a7f37', background: '#e3f3e3', padding: '0.4rem 0.875rem', borderRadius: 980, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {job.salary_range}
              </span>
            )}
          </div>

          {/* Meta chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
            {job.hiring_for && (
              <span style={{ fontSize: 12, padding: '0.2rem 0.6rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>{job.hiring_for}</span>
            )}
            {job.urgency && (
              <span style={{ fontSize: 12, padding: '0.2rem 0.6rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>{job.urgency}</span>
            )}
            {job.timezone && job.timezone !== 'Any' && (
              <span style={{ fontSize: 12, padding: '0.2rem 0.6rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>{job.timezone}</span>
            )}
            {job.day_rate && (
              <span style={{ fontSize: 12, padding: '0.2rem 0.6rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>{job.day_rate}/day</span>
            )}
            {isActive && daysLeft <= 7 && daysLeft > 0 && (
              <span style={{ fontSize: 12, padding: '0.2rem 0.6rem', background: '#fff3cd', borderRadius: 980, color: '#bf7e00', fontWeight: 600 }}>
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
          {job.description && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>About the role</p>
              <p style={{ fontSize: 15, color: '#3d3d3f', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{job.description}</p>
            </div>
          )}
          {job.requirements && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Requirements</p>
              <p style={{ fontSize: 15, color: '#3d3d3f', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{job.requirements}</p>
            </div>
          )}
          {job.skills && job.skills.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Skills</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {job.skills.map((skill: string) => (
                  <span key={skill} style={{ fontSize: 13, padding: '0.3rem 0.75rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action area */}
        {isActive && (
          <div style={{ borderTop: '1px solid #e0e0e5', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
            {isBuilder && applyState === 'idle' && (
              <button onClick={handleApply} style={{ padding: '0.75rem 2rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Apply for this role →
              </button>
            )}
            {isBuilder && applyState === 'loading' && (
              <button disabled style={{ padding: '0.75rem 2rem', background: '#6e6e73', color: 'white', borderRadius: 980, fontSize: 15, fontWeight: 600, border: 'none', cursor: 'not-allowed', fontFamily: 'inherit' }}>
                Applying...
              </button>
            )}
            {isBuilder && applyState === 'done' && !justApplied && (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a7f37', background: '#e3f3e3', padding: '0.75rem 2rem', borderRadius: 980 }}>
                Applied ✓
              </span>
            )}
            {isBuilder && applyState === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: 13, color: '#c0392b' }}>Something went wrong.</span>
                <button onClick={handleApply} style={{ fontSize: 13, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Try again</button>
              </div>
            )}
            {isLoggedOut && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/login" style={{ padding: '0.75rem 2rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
                  Sign in to apply →
                </Link>
                <Link href="/join" style={{ padding: '0.75rem 1.5rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                  Create free profile
                </Link>
              </div>
            )}
            {/* Employer — no apply action */}
          </div>
        )}

        {/* Success notification */}
        {justApplied && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, color: '#1a7f37', fontWeight: 500, margin: 0 }}>
              ✓ Application sent — {job.company_name} will see your message in their ShipStacked inbox.
            </p>
            <Link href="/messages" style={{ fontSize: 13, fontWeight: 600, color: '#1a7f37', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
              View messages →
            </Link>
          </div>
        )}

        {/* Share + meta */}
        <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: '#6e6e73' }}>
              Posted {postedDate}
              {isActive && expiresDate && <span> · Closes {expiresDate}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: 13, color: '#6e6e73', fontFamily: 'monospace', background: '#f5f5f7', padding: '0.3rem 0.75rem', borderRadius: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                shipstacked.com/jobs/{job.id.slice(0, 8)}...
              </span>
              <button
                onClick={handleCopy}
                style={{ padding: '0.4rem 0.875rem', background: copied ? '#e3f3e3' : '#f5f5f7', color: copied ? '#1a7f37' : '#3d3d3f', borderRadius: 8, border: '1px solid', borderColor: copied ? '#b3e0b3' : '#e0e0e5', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              >
                {copied ? '✓ Copied' : 'Copy link'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
