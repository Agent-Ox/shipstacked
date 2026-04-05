'use client'

import { useState } from 'react'

const SYSTEM_PROMPT = `You are my ShipStacked profile manager.

API key: [PASTE YOUR sk_ss_ KEY HERE]
Base URL: https://shipstacked.com/api/v1

Your job:
1. GET /me to see my current profile state
2. PATCH /profile with my details: full_name, bio, role, location, skills, projects
3. POST /builds for each thing I have shipped recently
4. Always include outcome + url in build posts — required for verification
5. PATCH /profile with published: true when profile is complete

Keep my profile current. Every time I ship something new, post it to /builds.`

export default function AgentOnboarding() {
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [fullName, setFullName] = useState('')
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [keysLoading, setKeysLoading] = useState(false)
  const [keysLoaded, setKeysLoaded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  const copyPrompt = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.3rem' }}>
            Your account is ready.
          </h1>
          <p style={{ color: '#6e6e73', fontSize: 15 }}>Generate your API key and brief your agent. They handle the rest.</p>
        </div>

        {/* Steps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px,100%), 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { n: '01', t: 'Done', d: 'Account created. You are in.', done: true },
            { n: '02', t: 'Generate your key', d: 'Name it after your agent and copy it once.', done: false },
            { n: '03', t: 'Brief your agent', d: 'Give it the key and the system prompt below.', done: false },
          ].map(s => (
            <div key={s.n} style={{ background: s.done ? '#f0faf0' : 'white', border: s.done ? '1px solid #b3e0b3' : '1px solid #e0e0e5', borderRadius: 14, padding: '1.25rem' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: s.done ? '#1a7f37' : '#6c63ff', fontFamily: 'monospace', marginBottom: '0.5rem' }}>{s.n}{s.done ? ' ✓' : ''}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.25rem' }}>{s.t}</p>
              <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>{s.d}</p>
            </div>
          ))}
        </div>

        {/* API Key section */}
        <div style={{ background: 'linear-gradient(135deg, #0f0f18, #1a1a2e)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 16, padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(167,139,250,0.8)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Step 2</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#f0f0f5' }}>Generate your API key</p>
            </div>
            <a href="/api-docs" style={{ fontSize: 12, color: 'rgba(167,139,250,0.7)', textDecoration: 'none', fontWeight: 500 }}>Full API docs →</a>
          </div>

          {!keysLoaded ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: 12, color: 'rgba(167,139,250,0.7)', fontWeight: 500 }}>Your name — used to create your profile URL</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && fullName.trim()) { (document.getElementById('get-started-btn') as HTMLButtonElement)?.click() } }}
                  placeholder="Maya Okonkwo"
                  style={{ flex: 1, minWidth: 200, padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 980, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#f0f0f5' }}
                />
                <button id="get-started-btn" disabled={!fullName.trim() || keysLoading} onClick={async () => {
                  if (!fullName.trim()) return
                  setKeysLoading(true)
                  const res = await fetch('/api/keys')
                  if (res.ok) { const { keys } = await res.json(); setApiKeys(keys) }
                  setKeysLoaded(true)
                  setKeysLoading(false)
                }} style={{ padding: '0.6rem 1.5rem', background: !fullName.trim() ? 'rgba(108,99,255,0.4)' : '#6c63ff', color: 'white', border: 'none', borderRadius: 980, fontSize: 14, fontWeight: 600, cursor: !fullName.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {keysLoading ? 'Loading...' : 'Get started'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(240,240,245,0.25)' }}>Your agent fills in everything else.</p>
            </div>
          ) : (
            <>
              {/* Show generated key once */}
              {generatedKey && (
                <div style={{ background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.35)', borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(167,139,250,0.9)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Copy now — shown once only
                  </p>
                  <code style={{ fontSize: 13, color: '#a78bfa', fontFamily: 'monospace', wordBreak: 'break-all', display: 'block', marginBottom: '0.875rem', lineHeight: 1.5 }}>
                    {generatedKey}
                  </code>
                  <button onClick={() => {
                    navigator.clipboard.writeText(generatedKey)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }} style={{ fontSize: 13, padding: '0.4rem 1rem', background: copied ? '#1a7f37' : 'rgba(108,99,255,0.2)', color: copied ? 'white' : '#a78bfa', border: copied ? 'none' : '1px solid rgba(108,99,255,0.3)', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.2s' }}>
                    {copied ? '✓ Copied' : 'Copy key'}
                  </button>
                </div>
              )}

              {/* Existing keys */}
              {apiKeys.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  {apiKeys.map((key: any) => (
                    <div key={key.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)', gap: '0.5rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5', marginBottom: '0.1rem' }}>{key.name}</p>
                        <p style={{ fontSize: 11, color: 'rgba(240,240,245,0.3)', fontFamily: 'monospace' }}>{key.key_prefix}••••••••</p>
                      </div>
                      <button onClick={async () => {
                        if (!confirm('Revoke this key? Your agent will stop working.')) return
                        await fetch('/api/keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: key.id }) })
                        setApiKeys(prev => prev.filter((k: any) => k.id !== key.id))
                      }} style={{ fontSize: 12, padding: '0.25rem 0.6rem', background: 'rgba(255,60,60,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.2)', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Create new key */}
              {apiKeys.length < 5 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('gen-key-btn')?.click() }}
                    placeholder="Name your key (e.g. OX)"
                    style={{ flex: 1, minWidth: 160, padding: '0.55rem 1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 980, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#f0f0f5' }}
                  />
                  <button id="gen-key-btn" onClick={async () => {
                    if (!newKeyName.trim()) return
                    const res = await fetch('/api/keys', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: newKeyName.trim(), full_name: fullName.trim() })
                    })
                    if (res.ok) {
                      const data = await res.json()
                      setGeneratedKey(data.key)
                      setApiKeys(prev => [...prev, { id: data.id, name: data.name, key_prefix: data.key_prefix, last_used_at: null }])
                      setNewKeyName('')
                    }
                  }} style={{ padding: '0.55rem 1.25rem', background: '#6c63ff', color: 'white', border: 'none', borderRadius: 980, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    Generate key
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* System prompt */}
        <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '1.75rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Step 3</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.4rem' }}>Brief your agent</p>
          <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Copy this system prompt. Paste it into your agent along with your API key. Your agent will handle everything — profile, builds, verification.
          </p>
          <pre style={{ background: '#f5f5f7', borderRadius: 10, padding: '1.25rem', fontFamily: 'monospace', fontSize: 12, color: '#3d3d3f', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: '1rem', overflow: 'auto', maxHeight: 280 }}>
            {SYSTEM_PROMPT}
          </pre>
          <button onClick={copyPrompt} style={{ fontSize: 13, padding: '0.5rem 1.25rem', background: promptCopied ? '#1a7f37' : '#1d1d1f', color: 'white', border: 'none', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'background 0.2s' }}>
            {promptCopied ? '✓ Copied' : 'Copy system prompt'}
          </button>
        </div>

        {/* Footer links */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <a href="/api-docs" style={{ fontSize: 13, padding: '0.5rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
            Full API docs →
          </a>
          <a href="/dashboard" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none', fontWeight: 500 }}>
            Go to regular dashboard
          </a>
        </div>

      </div>
    </div>
  )
}
