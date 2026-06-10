'use client'

import { useEffect, useState } from 'react'
import posthog from 'posthog-js'

type Scope = 'builder:rw' | 'buyer:rw' | 'team:rw'
type Variant = 'solo_dashboard' | 'buyer_dashboard' | 'team_dashboard'

type KeyRow = {
  id: string | number
  name: string
  key_prefix: string
  scope: string
  last_used_at: string | null
  created_at?: string
}

const SITE = 'https://shipstacked.com'

// Per-scope system-prompt template the operator hands to their agent.
const SYSTEM_PROMPT_BY_SCOPE: Record<Scope, (ctx: { email: string; username?: string }) => string> = {
  'builder:rw': ({ username }) => `You are an AI agent managing the ShipStacked profile ${username ?? '<username>'}.

Authoritative endpoints (Authorization: Bearer <api_key>):
- GET ${SITE}/api/v1/me — fetch current profile state
- PATCH ${SITE}/api/v1/profile — update profile fields
- POST ${SITE}/api/v1/builds — post a shipped build
- GET ${SITE}/api/v1/builds — list recent posts

Your job:
1. Keep the profile current (bio, skills, projects, location).
2. Post builds as they ship. Always include "outcome" and "url" so the build can be verified.
3. Monitor messages and draft replies for review.

Do not modify the operator's email or password. Do not post elsewhere unless instructed.

Machine-readable capability map: ${SITE}/.well-known/agent-card.json
Auth surface: ${SITE}/auth.md`,

  'buyer:rw': ({ email }) => `You are an AI agent helping ${email} hire AI-native builders on ShipStacked.

Authoritative endpoints (Authorization: Bearer <api_key>):
- GET ${SITE}/api/v1/talent/search?cluster=X&role=Y&shipped=Z — query ranked builders
- GET ${SITE}/api/v1/builders/<username> — deep-fetch a candidate
- POST ${SITE}/api/v1/messages — message a builder
- POST ${SITE}/api/v1/jobs — post a job
- POST ${SITE}/api/v1/saved-profiles — shortlist a candidate
- GET ${SITE}/api/v1/saved-profiles — review shortlist

Your job:
1. Given hiring criteria, search for matching builders.
2. For each promising candidate, deep-fetch the profile + receipts. Evaluate fit.
3. Build a shortlist via /saved-profiles.
4. Draft outreach messages for review before sending.

Machine-readable capability map: ${SITE}/.well-known/agent-card.json
Auth surface: ${SITE}/auth.md`,

  'team:rw': ({ username }) => `You are an AI agent managing the ShipStacked team profile ${username ?? '<team-slug>'}.

Authoritative endpoints (Authorization: Bearer <api_key>):
- GET ${SITE}/api/v1/team — fetch the team profile state
- PATCH ${SITE}/api/v1/team — update team profile fields
- POST ${SITE}/api/v1/builds — post a shipped build as the team (team-subject receipt)
- GET ${SITE}/api/v1/builds — list recent team posts

Your job:
1. Keep the team profile current (tagline, description, services, location).
2. Post the team's shipped client work as builds. Always include "outcome" and "url" so the build can be verified.
3. Surface the team to buyers searching for AI implementation capability.

Do not modify billing or remove members. Do not post elsewhere unless instructed.

Machine-readable capability map: ${SITE}/.well-known/agent-card.json
Auth surface: ${SITE}/auth.md`,
}

type Props = { scope: Scope; variant: Variant; email: string; username?: string }

// Reuse the dashboard's existing card chrome — no new visual pattern.
const cardStyle = {
  background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem',
}

export default function ConnectAnAgent({ scope, variant, email, username }: Props) {
  const [keys, setKeys] = useState<KeyRow[]>([])
  const [totalCount, setTotalCount] = useState(0) // across ALL scopes — drives the per-profile max-5 gate
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  // Keys are loaded via the server route (service-role), filtered to this scope.
  // We do NOT query api_keys directly from the browser (RLS).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/keys')
        if (!res.ok) return
        const { keys: all } = await res.json()
        if (cancelled) return
        const allKeys: KeyRow[] = all || []
        setTotalCount(allKeys.length)
        setKeys(allKeys.filter(k => (k.scope || 'builder:rw') === scope))
      } catch { /* leave empty */ }
    })()
    return () => { cancelled = true }
  }, [scope])

  const generateKey = async () => {
    if (generating || !newKeyName.trim()) return
    setGenerating(true)
    setError('')
    try {
      posthog.capture('api_key_generated', { source: variant, scope })
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), scope }),
      })
      const data = await res.json()
      if (res.ok && data.key) {
        setGeneratedKey(data.key)
        setKeys(prev => [{ id: data.id, name: data.name, key_prefix: data.key_prefix, scope, last_used_at: null }, ...prev])
        setTotalCount(c => c + 1)
        setNewKeyName('')
      } else {
        setError(data.error || 'Failed to generate key')
      }
    } catch {
      setError('Failed to generate key')
    } finally {
      setGenerating(false)
    }
  }

  const revokeKey = async (id: string | number) => {
    if (!confirm('Revoke this key? Any agent using it will stop working.')) return
    await fetch('/api/keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setKeys(prev => prev.filter(k => k.id !== id))
    setTotalCount(c => Math.max(0, c - 1))
  }

  const systemPrompt = SYSTEM_PROMPT_BY_SCOPE[scope]({ email, username })
  const blurb = scope === 'builder:rw'
    ? 'manage your profile and post builds'
    : scope === 'team:rw'
    ? "manage your team profile and post the team's shipped work"
    : 'search talent, message builders, and post jobs'

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Connect an Agent</p>
          <p style={{ fontSize: 13, color: '#6e6e73' }}>Let an AI agent {blurb} on your behalf.</p>
        </div>
        <a href="/api-docs" style={{ fontSize: 12, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>API docs →</a>
      </div>

      {/* Option 1 — auth.md open protocol */}
      <details style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
        <summary style={{ fontSize: 13, fontWeight: 600, color: '#0071e3', cursor: 'pointer' }}>Connect via auth.md (recommended)</summary>
        <div style={{ marginTop: '0.6rem', padding: '0.75rem', background: '#f5f5f7', borderRadius: 8, fontSize: 12, lineHeight: 1.7 }}>
          <div>Point your agent at: <code style={{ fontFamily: 'monospace' }}>{SITE}/auth.md</code></div>
          <div>OAuth metadata: <code style={{ fontFamily: 'monospace' }}>{SITE}/.well-known/oauth-authorization-server</code></div>
          <div>Requested scope: <code style={{ fontFamily: 'monospace' }}>{scope}</code></div>
        </div>
        <p style={{ fontSize: 11, color: '#6e6e73', marginTop: '0.4rem' }}>The agent triggers a one-time code sent to {email}. You confirm; it receives a scoped key automatically.</p>
      </details>

      {/* Option 2 — manual key generation */}
      <div style={{ borderTop: '0.5px solid #e0e0e5', paddingTop: '0.875rem', marginTop: '0.5rem' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: '0.5rem' }}>Or generate a key manually</p>

        {generatedKey && (
          <div style={{ background: '#0f0f18', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(167,139,250,0.8)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>⚠ Copy now — shown once only</p>
            <code style={{ fontSize: 12, color: '#a78bfa', fontFamily: 'monospace', wordBreak: 'break-all', display: 'block', marginBottom: '0.75rem' }}>{generatedKey}</code>
            <button onClick={() => navigator.clipboard.writeText(generatedKey)} style={{ fontSize: 12, padding: '0.35rem 0.75rem', background: 'rgba(108,99,255,0.2)', color: '#a78bfa', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
              Copy to clipboard
            </button>
          </div>
        )}

        {keys.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {keys.map(key => (
              <div key={key.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '0.5px solid #f0f0f5', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{key.name}</p>
                  <p style={{ fontSize: 11, color: '#aeaeb2', fontFamily: 'monospace' }}>{key.key_prefix}•••••••• · {key.scope}</p>
                  {key.last_used_at && <p style={{ fontSize: 11, color: '#aeaeb2' }}>Last used: {new Date(key.last_used_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>}
                </div>
                <button onClick={() => revokeKey(key.id)} style={{ fontSize: 12, padding: '0.3rem 0.6rem', background: '#fff0f0', color: '#c00', border: '1px solid #ffd0d0', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}

        {totalCount < 5 ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="Name this key (e.g. Claude assistant)"
              style={{ flex: 1, minWidth: 160, padding: '0.5rem 0.875rem', border: '1px solid #d2d2d7', borderRadius: 980, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
            />
            <button onClick={generateKey} disabled={generating || !newKeyName.trim()} style={{ padding: '0.5rem 1rem', background: (generating || !newKeyName.trim()) ? '#aeaeb2' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 13, fontWeight: 500, cursor: (generating || !newKeyName.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {generating ? 'Generating…' : 'Generate key'}
            </button>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#6e6e73' }}>Maximum 5 keys reached. Revoke one to create a new key.</p>
        )}
      </div>

      {/* System prompt template */}
      <details style={{ marginTop: '1rem' }}>
        <summary style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', cursor: 'pointer' }}>System prompt template for your agent</summary>
        <pre style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#1d1d1f', color: '#f0f0f5', borderRadius: 8, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>{systemPrompt}</pre>
      </details>
    </div>
  )
}
