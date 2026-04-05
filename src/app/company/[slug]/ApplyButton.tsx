'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ApplyButton({ jobId, jobTitle, companyName, alreadyApplied }: {
  jobId: string
  jobTitle: string
  companyName: string
  alreadyApplied?: boolean
}) {
  // 'prior' = applied before this session (show green badge, no message)
  // 'done'  = just applied now (show green badge + full message)
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'prior' | 'error'>(
    alreadyApplied ? 'prior' : 'idle'
  )

  const apply = async () => {
    setState('loading')
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId })
      })
      // 409 = already applied (race condition or double-click) — treat same as prior
      if (res.status === 409) { setState('prior'); return }
      if (res.ok) { setState('done'); return }
      setState('error')
    } catch {
      setState('error')
    }
  }

  // Both 'prior' and 'done' show the green Applied badge
  if (state === 'prior') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 1.25rem', background: '#e3f3e3', borderRadius: 980, fontSize: 13, fontWeight: 600, color: '#1a7f37' }}>
        Applied ✓
      </span>
    )
  }

  return (
    <div>
      {/* Show button until successfully applied */}
      {state !== 'done' && (
        <button
          onClick={apply}
          disabled={state === 'loading'}
          style={{
            display: 'inline-block', padding: '0.5rem 1.25rem',
            background: state === 'loading' ? '#d2d2d7' : '#0071e3',
            color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500,
            border: 'none', cursor: state === 'loading' ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {state === 'loading' ? 'Applying...' : state === 'error' ? 'Try again' : 'Apply'}
        </button>
      )}

      {/* Full success notification — only shown immediately after applying */}
      {state === 'done' && (
        <div style={{ padding: '0.875rem 1rem', background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, color: '#1a7f37', fontWeight: 500, margin: 0 }}>
            ✓ Application sent — {companyName} will see your message in their ShipStacked inbox.
          </p>
          <Link href="/messages" style={{ fontSize: 13, fontWeight: 600, color: '#1a7f37', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
            View messages →
          </Link>
        </div>
      )}
    </div>
  )
}
