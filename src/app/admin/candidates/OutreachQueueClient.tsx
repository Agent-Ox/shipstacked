'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Candidate = {
  id: string
  github_username: string
  full_name: string | null
  x_handle: string
  x_url: string | null
  bio: string | null
  location: string | null
  country: string | null
  primary_profession: string | null
  top_repos: unknown
  shipping_evidence: string | null
  tier: string | null
  velocity_score: number | null
  outreach_priority: number | null
  signal_strength: number | null
  avatar_url: string | null
  github_url: string | null
  website_url: string | null
}

type SessionStats = {
  remaining_with_filters: number
  sent_today: number
  total_new?: number
}

const TIER_COLORS: Record<string, { bg: string, fg: string }> = {
  PLATINUM: { bg: '#1a1a24', fg: '#e5e4e2' },
  GOLD:     { bg: '#fef3cd', fg: '#a16207' },
  SILVER:   { bg: '#f1f5f9', fg: '#475569' },
  BRONZE:   { bg: '#fef2e9', fg: '#9a3412' },
}

export default function OutreachQueueClient() {
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [draft, setDraft] = useState<{ id: string, text: string, charCount: number } | null>(null)
  const [editedText, setEditedText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [filterTier, setFilterTier] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [skipped, setSkipped] = useState<string[]>([])
  const [error, setError] = useState('')
  const [sessionSent, setSessionSent] = useState(0)

  // Fetch next candidate from API
  const fetchNext = useCallback(async (excludeIds: string[]) => {
    setLoading(true)
    setError('')
    setDraft(null)
    setIsEditing(false)
    try {
      const params = new URLSearchParams()
      if (filterTier)    params.set('tier', filterTier)
      if (filterCountry) params.set('country', filterCountry)
      if (excludeIds.length > 0) params.set('exclude', excludeIds.join(','))

      const res = await fetch(`/api/admin/candidates/next?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')

      setCandidate(data.candidate || null)
      setStats(data.stats || null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [filterTier, filterCountry])

  // Auto-generate draft when candidate loads
  useEffect(() => {
    if (!candidate) return
    generateDraft(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id])

  // Initial load
  useEffect(() => {
    fetchNext([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTier, filterCountry])

  const generateDraft = async (forceNew: boolean) => {
    if (!candidate) return
    setDrafting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/candidates/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidate.id, force_new: forceNew }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Draft generation failed')

      setDraft({
        id: data.draft_id,
        text: data.draft_text,
        charCount: data.char_count || data.draft_text.length,
      })
      setEditedText(data.draft_text)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setDrafting(false)
    }
  }

  const logAction = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!candidate) return
    try {
      await fetch('/api/admin/candidates/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidate.id, action, ...payload }),
      })
    } catch (e) {
      console.error('[log] action failed:', e)
    }
  }

  const handleCopyAndOpenX = async () => {
    if (!candidate || !draft) return
    const finalText = isEditing ? editedText : draft.text

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(finalText)
    } catch {
      // Fallback — user can copy manually from the textarea
    }

    // Open X compose in new tab with text pre-loaded
    const intentUrl = `https://x.com/intent/post?text=${encodeURIComponent(finalText)}`
    window.open(intentUrl, '_blank', 'noopener,noreferrer')
  }

  const handleMarkSent = async () => {
    if (!candidate || !draft) return
    const finalText = isEditing ? editedText : draft.text

    await logAction('sent', {
      draft_id: draft.id,
      sent_text: finalText,
    })

    setSessionSent(s => s + 1)
    fetchNext([...skipped, candidate.id])
  }

  const handleSkip = async () => {
    if (!candidate) return
    await logAction('skip')
    setSkipped(s => [...s, candidate.id])
    fetchNext([...skipped, candidate.id])
  }

  const handleDontContact = async () => {
    if (!candidate) return
    if (!confirm('Permanently never contact this builder?')) return
    await logAction('block')
    fetchNext([...skipped, candidate.id])
  }

  // ===== render =====

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: '2rem 1.5rem 5rem' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/admin" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>← Admin</Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginTop: '0.5rem', marginBottom: '0.4rem' }}>
            Outreach engine
          </h1>
          <p style={{ fontSize: 13, color: '#6e6e73' }}>
            One builder at a time. Switch X account before clicking — your active account is the one that posts.
          </p>
        </div>

        {/* Session bar */}
        <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <Stat label="This session" value={sessionSent} />
            <Stat label="Today" value={stats?.sent_today ?? 0} />
            <Stat label="Remaining" value={stats?.remaining_with_filters ?? 0} />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <FilterSelect value={filterTier} onChange={setFilterTier} options={[
              { value: '', label: 'All tiers' },
              { value: 'PLATINUM', label: 'PLATINUM' },
              { value: 'GOLD',     label: 'GOLD' },
              { value: 'SILVER',   label: 'SILVER' },
              { value: 'BRONZE',   label: 'BRONZE' },
            ]} />
            <FilterSelect value={filterCountry} onChange={setFilterCountry} options={[
              { value: '', label: 'Any country' },
              { value: 'United States', label: 'US' },
              { value: 'United Kingdom', label: 'UK' },
              { value: 'Canada', label: 'Canada' },
              { value: 'Germany', label: 'Germany' },
              { value: 'India', label: 'India' },
              { value: 'Australia', label: 'Australia' },
              { value: 'Japan', label: 'Japan' },
            ]} />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', color: '#c00', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1rem', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !candidate && (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem 2rem', textAlign: 'center' }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>
              No candidates left for these filters
            </p>
            <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: '1rem' }}>
              {skipped.length > 0
                ? `Skipped ${skipped.length} this session. They will reappear on next page load.`
                : `Try a different filter, or import more candidates.`}
            </p>
            {skipped.length > 0 && (
              <button
                type="button"
                onClick={() => { setSkipped([]); fetchNext([]) }}
                style={btnSecondary}
              >
                Reset session and start over
              </button>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem 2rem', textAlign: 'center', color: '#6e6e73', fontSize: 14 }}>
            Loading next candidate…
          </div>
        )}

        {/* Candidate card */}
        {!loading && candidate && (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>

            {/* Identity row */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#f5f5f7' }}>
                {candidate.avatar_url
                  ? <img src={candidate.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : null
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
                    {candidate.full_name || candidate.github_username}
                  </h2>
                  {candidate.tier && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.08em',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 980,
                      background: TIER_COLORS[candidate.tier]?.bg || '#f5f5f7',
                      color: TIER_COLORS[candidate.tier]?.fg || '#1d1d1f',
                      fontFamily: 'SF Mono, monospace',
                    }}>{candidate.tier}</span>
                  )}
                  {candidate.velocity_score && candidate.velocity_score > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6c63ff', background: '#f0eeff', padding: '0.15rem 0.5rem', borderRadius: 980 }}>
                      ⚡ {candidate.velocity_score}
                    </span>
                  )}
                  {candidate.signal_strength && candidate.signal_strength > 1 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', background: '#ccfbf1', padding: '0.15rem 0.5rem', borderRadius: 980 }}>
                      ×{candidate.signal_strength} sources
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.2rem' }}>
                  @{candidate.x_handle} · {candidate.location || candidate.country || 'Location unknown'}
                </p>
                {candidate.primary_profession && (
                  <p style={{ fontSize: 13, color: '#8a8a92' }}>{candidate.primary_profession}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            {candidate.bio && (
              <div style={{ background: '#f5f5f7', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1rem' }}>
                <p style={{ fontSize: 13, color: '#1d1d1f', lineHeight: 1.5 }}>{candidate.bio}</p>
              </div>
            )}

            {/* Top repos */}
            {candidate.top_repos != null && (() => {
              type Repo = { name?: string; description?: string; url?: string; stars?: number }
              let repos: Repo[] = []
              try {
                if (typeof candidate.top_repos === 'string') repos = JSON.parse(candidate.top_repos)
                else if (Array.isArray(candidate.top_repos)) repos = candidate.top_repos as Repo[]
              } catch { /* ignore */ }
              if (repos.length === 0) return null

              return (
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Top public repos
                  </p>
                  {repos.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ marginBottom: '0.4rem', fontSize: 13 }}>
                      <strong style={{ color: '#1d1d1f' }}>{r.name}</strong>
                      {r.stars && r.stars > 0 ? <span style={{ color: '#6e6e73' }}> ★ {r.stars}</span> : null}
                      {r.description && <p style={{ color: '#6e6e73', fontSize: 12, marginTop: '0.15rem' }}>{r.description}</p>}
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Shipping evidence */}
            {candidate.shipping_evidence && (
              <p style={{ fontSize: 12, color: '#6e6e73', fontStyle: 'italic', marginBottom: '1rem' }}>
                Shipping: {candidate.shipping_evidence}
              </p>
            )}

            {/* External links */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {candidate.github_url && (
                <a href={candidate.github_url} target="_blank" rel="noopener noreferrer" style={miniLink}>github →</a>
              )}
              {candidate.x_url && (
                <a href={candidate.x_url} target="_blank" rel="noopener noreferrer" style={miniLink}>X →</a>
              )}
              {candidate.website_url && (
                <a href={candidate.website_url} target="_blank" rel="noopener noreferrer" style={miniLink}>website →</a>
              )}
            </div>

            {/* Draft area */}
            <div style={{ background: '#0a0a0f', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'SF Mono, monospace' }}>
                  Draft (Claude Haiku)
                </p>
                {draft && (
                  <span style={{ fontSize: 11, color: draft.charCount > 270 ? '#fca5a5' : '#6e6e8a', fontFamily: 'SF Mono, monospace' }}>
                    {draft.charCount} / 270
                  </span>
                )}
              </div>

              {drafting && (
                <p style={{ color: '#c0c0d0', fontSize: 13, padding: '1rem 0' }}>
                  Generating personalised tweet…
                </p>
              )}

              {!drafting && draft && !isEditing && (
                <pre style={{ color: '#f0f0f5', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                  {draft.text}
                </pre>
              )}

              {!drafting && draft && isEditing && (
                <textarea
                  value={editedText}
                  onChange={e => setEditedText(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%',
                    background: '#1a1a24',
                    color: '#f0f0f5',
                    border: '1px solid #2a2a34',
                    borderRadius: 8,
                    padding: '0.7rem',
                    fontSize: 14,
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCopyAndOpenX}
                disabled={!draft || drafting}
                style={btnPrimary}
              >
                Copy & open X →
              </button>

              <button
                type="button"
                onClick={handleMarkSent}
                disabled={!draft || drafting}
                style={btnSuccess}
              >
                ✓ Mark as sent
              </button>

              <button
                type="button"
                onClick={() => generateDraft(true)}
                disabled={drafting}
                style={btnSecondary}
              >
                ↻ Regenerate
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(e => !e)}
                disabled={!draft}
                style={btnSecondary}
              >
                {isEditing ? '✕ Stop editing' : '✏ Edit'}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                style={btnSecondary}
              >
                ⏭ Skip
              </button>

              <button
                type="button"
                onClick={handleDontContact}
                style={{ ...btnSecondary, color: '#dc2626', borderColor: '#fca5a5' }}
              >
                🚫 Never contact
              </button>
            </div>

            <p style={{ fontSize: 11, color: '#8a8a92', marginTop: '1rem', lineHeight: 1.5 }}>
              Tip: switch your active X account in the X app/site BEFORE clicking &ldquo;Copy & open X&rdquo;. Whichever account is active is the one that posts.
            </p>

          </div>
        )}

      </div>
    </div>
  )
}

// =============== styles ===============

const btnPrimary: React.CSSProperties = {
  padding: '0.65rem 1.3rem',
  background: '#0071e3',
  color: 'white',
  border: 'none',
  borderRadius: 980,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnSuccess: React.CSSProperties = {
  padding: '0.65rem 1.3rem',
  background: '#16a34a',
  color: 'white',
  border: 'none',
  borderRadius: 980,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnSecondary: React.CSSProperties = {
  padding: '0.65rem 1.1rem',
  background: 'white',
  color: '#1d1d1f',
  border: '1px solid #d2d2d7',
  borderRadius: 980,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const miniLink: React.CSSProperties = {
  fontSize: 12,
  color: '#0071e3',
  textDecoration: 'none',
  padding: '0.25rem 0.6rem',
  background: '#f5f5f7',
  borderRadius: 6,
}

function Stat({ label, value }: { label: string, value: number | string }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.1rem' }}>
        {label}
      </p>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  )
}

function FilterSelect({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string, label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '0.45rem 0.75rem',
        border: '1px solid #d2d2d7',
        borderRadius: 8,
        fontSize: 13,
        background: 'white',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
