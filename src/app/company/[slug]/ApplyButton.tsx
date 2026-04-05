'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ApplyButton({ jobId, jobTitle, companyName, alreadyApplied }: {
  jobId: string
  jobTitle: string
  companyName: string
  alreadyApplied?: boolean
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error' | 'duplicate'>(alreadyApplied ? 'duplicate' : 'idle')
  const justApplied = state === 'done'

  const apply = async () => {
    setState('loading')
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId })
      })
      if (res.status === 409) { setState('duplicate'); return }
      if (res.ok) { setState('done'); return }
      setState('error')
    } catch {
      setState('error')
    }
  }

  if (state === 'duplicate') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 1.25rem', background: '#f0f0f5', borderRadius: 980, fontSize: 13, fontWeight: 500, color: '#6e6e73' }}>
        Already applied
      </div>
    )
  }

  return (
    <div>
      {/* Button */}
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

      {/* Success notification — same pattern as /jobs page */}
      {justApplied && (
        <div style={{ marginTop: '0.75rem', padding: '0.875rem 1rem', background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
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
