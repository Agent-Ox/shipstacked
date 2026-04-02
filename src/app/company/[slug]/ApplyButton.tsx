'use client'

import { useState } from 'react'

export default function ApplyButton({ jobId, jobTitle }: { jobId: string, jobTitle: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error' | 'duplicate'>>('idle')

  const apply = async () => {
    setState('loading')
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId })
      })
      const data = await res.json()
      if (res.status === 409) {
        setState('duplicate')
      } else if (res.ok) {
        setState('done')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', background: '#e3f3e3', borderRadius: 980, fontSize: 13, fontWeight: 600, color: '#1a7f37' }}>
        Applied
      </div>
    )
  }

  if (state === 'duplicate') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', background: '#f0f0f5', borderRadius: 980, fontSize: 13, fontWeight: 500, color: '#6e6e73' }}>
        Already applied
      </div>
    )
  }

  return (
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
  )
}
