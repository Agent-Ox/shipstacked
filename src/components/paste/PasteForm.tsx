'use client'

/**
 * /paste — single-URL input, drives classify → analyze → atlas-classify,
 * then navigates to /paste/review with a draft_id. See
 * docs/v2/STEP_5_PASTE_UI_SPEC.md §2.1.
 *
 * Classify + analyze are public HTTP endpoints (rate-limited server-side).
 * The Atlas classifier is invoked through a server action (no public surface)
 * which also stashes the combined draft in Upstash Redis.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPasteDraft } from '@/app/paste/actions'

type Phase = 'idle' | 'reading' | 'reviewing' | 'mapping' | 'error'

interface ClassifyResponse {
  source: string
  reachable: boolean
  http_status: number
  metadata: { title?: string; description?: string; og_image?: string; favicon?: string }
  event_type_candidate: string
  cache_hit?: boolean
  ok?: false
  error?: string
}

interface AnalyzeResponse {
  title_draft: string
  description_draft: string
  artifacts: unknown[]
  stack: unknown[]
  outcomes_suggestions: unknown[]
  capabilities: string[]
  classification_note?: unknown
  ok?: false
  error?: string
}

const SHIPSTACKED_HOSTS = new Set(['shipstacked.com', 'www.shipstacked.com', 'shipstacked.app'])

function clientValidate(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  if (!raw) return { ok: false, reason: 'URL is required.' }
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, reason: 'That doesn’t look like a valid URL.' }
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'URL must start with https://.' }
  }
  if (SHIPSTACKED_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { ok: false, reason: 'Pick a URL outside shipstacked.com.' }
  }
  return { ok: true, url: parsed }
}

const PHASE_COPY: Record<Phase, string> = {
  idle: '',
  reading: 'Reading your work…',
  reviewing: 'Reviewing your work…',
  mapping: 'Mapping to the Atlas…',
  error: '',
}

export default function PasteForm({
  initialUrl,
  autoSubmit,
  subjectId,
}: {
  initialUrl: string
  autoSubmit: boolean
  subjectId?: number
}) {
  const router = useRouter()
  const [url, setUrl] = useState(initialUrl)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const autoSubmittedRef = useRef(false)

  async function run(currentUrl: string) {
    setError(null)
    const validation = clientValidate(currentUrl.trim())
    if (!validation.ok) {
      setError(validation.reason)
      setPhase('idle')
      return
    }

    try {
      setPhase('reading')
      const classifyRes = await fetch('/api/paste/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: validation.url.toString() }),
      })
      const classify = (await classifyRes.json()) as ClassifyResponse
      if (!classifyRes.ok || classify.ok === false) {
        setError(classify.error || 'Couldn’t read that URL right now. Try again?')
        setPhase('error')
        return
      }

      setPhase('reviewing')
      const analyzeRes = await fetch('/api/paste/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: validation.url.toString(),
          source: classify.source,
          metadata: classify.metadata,
        }),
      })
      const analyze = (await analyzeRes.json()) as AnalyzeResponse
      if (!analyzeRes.ok || analyze.ok === false) {
        setError(analyze.error || 'Couldn’t analyze that URL. Try again?')
        setPhase('error')
        return
      }

      setPhase('mapping')
      const { draft_id } = await createPasteDraft({
        url: validation.url.toString(),
        classify: {
          source: classify.source as never,
          reachable: classify.reachable,
          http_status: classify.http_status,
          metadata: classify.metadata,
          event_type_candidate: classify.event_type_candidate as never,
        },
        analyze: analyze as never,
      })

      // Carry the optional subject pin through to review so the receipt is
      // attributed to the team/agent entity (ownership re-validated at publish).
      const subjectQs = subjectId ? `&subject=${subjectId}` : ''
      router.push(`/paste/review?draft=${encodeURIComponent(draft_id)}${subjectQs}`)
    } catch (e) {
      console.error('[paste] flow failed', e)
      setError('Something went wrong. Try again?')
      setPhase('error')
    }
  }

  useEffect(() => {
    if (autoSubmit && initialUrl && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true
      void run(initialUrl)
    }
  }, [autoSubmit, initialUrl])

  const busy = phase === 'reading' || phase === 'reviewing' || phase === 'mapping'

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '3rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>
          Paste what you built.
        </h1>
        <p style={{ color: '#6e6e73', fontSize: 16, marginBottom: '2rem' }}>
          We turn it into a proof receipt you can edit and publish.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!busy) void run(url)
          }}
        >
          <input
            type="url"
            name="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            style={{ width: '100%', padding: '1rem 1.125rem', border: '1px solid #d2d2d7', borderRadius: 12, fontSize: 16, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box', marginBottom: '1rem' }}
          />

          {error && (
            <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ fontSize: 14, color: '#6e6e73', minHeight: 20 }} aria-live="polite">
              {busy && (
                <span>
                  <span
                    aria-hidden="true"
                    style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#0071e3', marginRight: 8, animation: 'paste-pulse 1.2s ease-in-out infinite' }}
                  />
                  {PHASE_COPY[phase]}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={busy || url.trim().length === 0}
              style={{ padding: '0.85rem 1.5rem', background: busy ? '#9ec6f5' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}
            >
              Continue →
            </button>
          </div>
        </form>

        <p style={{ color: '#86868b', fontSize: 13, marginTop: '2rem', lineHeight: 1.5 }}>
          Works with GitHub, Lovable, Bolt, v0, Replit, Vercel, Netlify, MCP servers, or any deployed URL.
        </p>

        <style>{`
          @keyframes paste-pulse {
            0%, 100% { opacity: 0.35; transform: scale(0.85); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  )
}
