'use client'

import { useState } from 'react'

export default function AdminActions() {
  const [nudging, setNudging] = useState(false)
  const [nudgeResult, setNudgeResult] = useState<string | null>(null)

  const triggerNudge = async () => {
    setNudging(true)
    setNudgeResult(null)
    try {
      const res = await fetch('/api/hire/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': 'shipstacked_cron_2026' },
        body: JSON.stringify({})
      })
      const data = await res.json()
      setNudgeResult('Nudge sent to ' + (data.nudged || 0) + ' conversations')
    } catch {
      setNudgeResult('Error triggering nudge')
    } finally {
      setNudging(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <button
        onClick={triggerNudge}
        disabled={nudging}
        style={{ padding: '0.5rem 1rem', background: nudging ? 'rgba(255,255,255,0.05)' : 'rgba(108,99,255,0.15)', color: nudging ? 'rgba(240,240,245,0.3)' : '#a78bfa', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 980, fontSize: 13, fontWeight: 500, cursor: nudging ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
        {nudging ? 'Sending...' : 'Trigger hire nudge emails'}
      </button>
      {nudgeResult && (
        <span style={{ fontSize: 13, color: '#1a7f37' }}>{nudgeResult}</span>
      )}
    </div>
  )
}
