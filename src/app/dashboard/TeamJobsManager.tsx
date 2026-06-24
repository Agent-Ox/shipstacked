'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type Job = { id: string; role_title: string; status: string; created_at: string }

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Team-dashboard job management. Mirrors the hirer dashboard's handlers
// (HirerDashboardClient handleToggleJob/handleDeleteJob), scoped to the owner's
// email — which matches team jobs because post-as-team sets employer_email=owner.
export default function TeamJobsManager({ jobs: initial, ownerEmail }: { jobs: Job[]; ownerEmail: string }) {
  const [jobs, setJobs] = useState<Job[]>(initial)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleToggle = async (jobId: string, currentStatus: string) => {
    setTogglingId(jobId)
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    try {
      const supabase = createClient()
      await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId).eq('employer_email', ownerEmail)
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (jobId: string) => {
    if (!confirm('Delete this job listing? This cannot be undone.')) return
    setDeletingId(jobId)
    try {
      const supabase = createClient()
      await supabase.from('jobs').delete().eq('id', jobId).eq('employer_email', ownerEmail)
      setJobs(prev => prev.filter(j => j.id !== jobId))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (jobs.length === 0) {
    return <p style={{ fontSize: 13, color: '#6e6e73' }}>No jobs yet — <a href="/post-job" style={{ color: '#0071e3', textDecoration: 'none' }}>Post a job →</a></p>
  }

  const btn: React.CSSProperties = {
    fontSize: 12, padding: '0.25rem 0.6rem', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #d2d2d7', background: 'white', color: '#1d1d1f',
  }

  return (
    <div>
      {error && <p style={{ fontSize: 13, color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}
      {jobs.map(j => {
        const paused = j.status !== 'active'
        return (
          <div key={j.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.6rem 0', borderTop: '0.5px solid #f0f0f5', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <a href="/jobs" style={{ fontSize: 14, color: '#1d1d1f', fontWeight: 500, textDecoration: 'none' }}>{j.role_title}</a>
              <span style={{ marginLeft: '0.5rem', fontSize: 11, fontWeight: 600, padding: '0.1rem 0.5rem', borderRadius: 980, background: paused ? '#f5f5f7' : '#e3f3e3', color: paused ? '#6e6e73' : '#1a7f37' }}>
                {paused ? 'Paused' : 'Active'}
              </span>
              {j.created_at && <span style={{ marginLeft: '0.5rem', fontSize: 12, color: '#aeaeb2' }}>{timeAgo(j.created_at)}</span>}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              <a href={`/post-job?edit=${j.id}`} style={{ ...btn, textDecoration: 'none' }}>Edit</a>
              <button type="button" onClick={() => handleToggle(j.id, j.status)} disabled={togglingId === j.id} style={btn}>
                {togglingId === j.id ? '…' : paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" onClick={() => handleDelete(j.id)} disabled={deletingId === j.id} style={{ ...btn, background: '#fff0f0', color: '#c00', border: '1px solid #ffd0d0' }}>
                {deletingId === j.id ? '…' : 'Delete'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
