'use client'

import { useState } from 'react'
import ConnectAnAgent from '@/app/components/ConnectAnAgent'
import { AGENT_PROVIDERS } from '@/lib/agent/validate'
import type { PrincipalOption } from './page'

type AgentProfile = {
  entity_id: number
  agent_name: string
  provider: string
  model: string | null
  description: string | null
  capabilities: string[] | null
  focus: string | null
  principal_entity_id: number | null
  logo_url: string | null
  contact_email: string | null
  contact_url: string | null
  published: boolean
  verified: boolean
}

type Props = {
  entity: { id: number; slug: string }
  profile: AgentProfile
  ownerEmail: string
  principalOptions: PrincipalOption[]
}

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude (Anthropic)', openai: 'OpenAI', cursor: 'Cursor', gemini: 'Gemini (Google)', custom: 'Custom', other: 'Other',
}

const cardStyle: React.CSSProperties = {
  background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.875rem', border: '1px solid #d2d2d7', borderRadius: 10,
  fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.35rem', color: '#1d1d1f',
}

// Sentinel for principal_entity_id = NULL (acts on behalf of owner's profile).
const PRINCIPAL_DEFAULT = 'default'

export default function AgentEditClient({ entity, profile, ownerEmail, principalOptions }: Props) {
  const [agentName, setAgentName] = useState(profile.agent_name)
  const [provider, setProvider] = useState(profile.provider)
  const [model, setModel] = useState(profile.model ?? '')
  const [description, setDescription] = useState(profile.description ?? '')
  const [capabilities, setCapabilities] = useState((profile.capabilities ?? []).join('\n'))
  const [focus, setFocus] = useState(profile.focus ?? '')
  const [logoUrl, setLogoUrl] = useState(profile.logo_url ?? '')
  const [contactEmail, setContactEmail] = useState(profile.contact_email ?? '')
  const [contactUrl, setContactUrl] = useState(profile.contact_url ?? '')
  const [principal, setPrincipal] = useState(
    profile.principal_entity_id == null ? PRINCIPAL_DEFAULT : String(profile.principal_entity_id),
  )

  const [published, setPublished] = useState(profile.published)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [togglingPublish, setTogglingPublish] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUploaded, setLogoUploaded] = useState(false)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) { setError('Please use a JPG, PNG or WebP image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Please use an image under 5MB.'); return }
    setLogoUploading(true); setError('')
    try {
      // Resize to 400px longest edge client-side before upload (mirrors avatar).
      const resized = await new Promise<Blob>((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)
        img.onload = () => {
          const MAX = 400
          let w = img.width
          let h = img.height
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else { w = Math.round(w * MAX / h); h = MAX }
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
          URL.revokeObjectURL(objectUrl)
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Resize failed')), 'image/jpeg', 0.85)
        }
        img.onerror = reject
        img.src = objectUrl
      })
      const fd = new FormData()
      fd.append('file', new File([resized], 'logo.jpg', { type: 'image/jpeg' }))
      fd.append('entity_id', String(entity.id))
      fd.append('kind', 'agent')
      const res = await fetch('/api/entity-logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setLogoUrl(data.url)
        setLogoUploaded(true)
        setTimeout(() => setLogoUploaded(false), 3000)
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch {
      setError('Upload failed. Please try again.')
    }
    setLogoUploading(false)
  }

  const save = async () => {
    if (saving) return
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/v1/agent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: entity.id,
          agent_name: agentName.trim(),
          provider,
          model: model.trim() || null,
          description: description.trim() || null,
          capabilities: capabilities.split('\n').map(s => s.trim()).filter(Boolean),
          focus: focus.trim() || null,
          logo_url: logoUrl.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_url: contactUrl.trim() || null,
          principal_entity_id: principal === PRINCIPAL_DEFAULT ? null : Number(principal),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaved(true)
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async () => {
    if (togglingPublish) return
    setTogglingPublish(true); setError('')
    const next = !published
    try {
      const res = await fetch('/api/v1/agent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id: entity.id, published: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish toggle failed')
      setPublished(next)
    } catch (e: any) {
      setError(e.message || 'Publish toggle failed')
    } finally {
      setTogglingPublish(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Edit agent</h1>
            <p style={{ fontSize: 13, color: '#6e6e73', marginTop: '0.25rem' }}>shipstacked.com/agent/{entity.slug}</p>
          </div>
          <a href={`/agent/${entity.slug}`} style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>View public page →</a>
        </div>

        {/* Publish state — prominent */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', background: published ? '#f0faf0' : 'white', borderColor: published ? '#b3e0b3' : '#e0e0e5' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: published ? '#1a7f37' : '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              {published ? 'Published' : 'Not published'}
            </p>
            <p style={{ fontSize: 14, color: '#1d1d1f' }}>
              {published ? 'Your agent page is live and discoverable.' : 'Only you can see this agent. Publish to go live.'}
            </p>
          </div>
          <button onClick={togglePublish} disabled={togglingPublish} style={{
            fontSize: 14, padding: '0.6rem 1.25rem', borderRadius: 980, border: 'none', fontWeight: 600,
            cursor: togglingPublish ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            background: togglingPublish ? '#aeaeb2' : (published ? 'white' : '#0071e3'),
            color: published ? '#1d1d1f' : 'white',
            ...(published ? { border: '1px solid #d2d2d7' } : {}),
          }}>
            {togglingPublish ? 'Saving…' : (published ? 'Unpublish' : 'Publish agent →')}
          </button>
        </div>

        {/* Profile fields */}
        <div style={cardStyle}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Profile</p>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Agent name</label>
            <input type="text" maxLength={80} value={agentName} onChange={e => setAgentName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>URL slug <span style={{ fontWeight: 400, color: '#6e6e73' }}>(fixed)</span></label>
            <input type="text" value={entity.slug} disabled style={{ ...inputStyle, background: '#f5f5f7', color: '#6e6e73' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Provider</label>
              <select value={provider} onChange={e => setProvider(e.target.value)} style={inputStyle}>
                {AGENT_PROVIDERS.map(p => <option key={p} value={p}>{PROVIDER_LABELS[p] ?? p}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Model <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <input type="text" maxLength={200} placeholder="claude-opus-4-8" value={model} onChange={e => setModel(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Focus</label>
            <input type="text" maxLength={300} placeholder="One line on what this agent does" value={focus} onChange={e => setFocus(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Description</label>
            <textarea maxLength={2000} rows={4} value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Capabilities <span style={{ fontWeight: 400, color: '#6e6e73' }}>(one per line, max 20)</span></label>
            <textarea rows={4} placeholder={'research\nwriting\ncode-review'} value={capabilities} onChange={e => setCapabilities(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Acts on behalf of <span style={{ fontWeight: 400, color: '#6e6e73' }}>(principal)</span></label>
            <select value={principal} onChange={e => setPrincipal(e.target.value)} style={inputStyle}>
              <option value={PRINCIPAL_DEFAULT}>Default (acts on behalf of your profile)</option>
              {principalOptions.filter(o => o.kind === 'team').map(o => (
                <option key={o.entity_id} value={String(o.entity_id)}>{o.display_name} (team)</option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: '#6e6e73', marginTop: '0.3rem' }}>
              Default resolves to your own builder profile. Re-point to a team you admin to act on its behalf.
            </p>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', background: '#f5f5f7', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, color: '#aeaeb2' }}>No logo</span>}
              </div>
              <div>
                <label style={{ display: 'inline-block', padding: '0.5rem 1rem', background: logoUploading ? '#d2d2d7' : '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, cursor: logoUploading ? 'not-allowed' : 'pointer' }}>
                  {logoUploading ? 'Uploading...' : logoUrl ? 'Change logo' : 'Upload logo'}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} disabled={logoUploading} />
                </label>
                <p style={{ fontSize: 12, color: '#6e6e73', marginTop: '0.4rem' }}>JPG, PNG or WebP. Max 5MB.</p>
                {logoUploaded && <p style={{ fontSize: 13, color: '#1a7f37', fontWeight: 600, marginTop: '0.35rem' }}>✓ Logo uploaded</p>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Contact email <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <input type="email" placeholder="you@example.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Contact URL <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <input type="url" placeholder="https://…" value={contactUrl} onChange={e => setContactUrl(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: '#c00', marginBottom: '0.75rem' }}>{error}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={save} disabled={saving} style={{
              fontSize: 14, padding: '0.6rem 1.5rem', background: saving ? '#aeaeb2' : '#0071e3',
              color: 'white', border: 'none', borderRadius: 980, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit',
            }}>{saving ? 'Saving…' : 'Save changes'}</button>
            {saved && <span style={{ fontSize: 13, color: '#1a7f37', fontWeight: 500 }}>✓ Saved</span>}
          </div>
        </div>

        {/* Phase 3 — agent self-management key (agent-managing-itself flow) */}
        <ConnectAnAgent scope="agent:rw" variant="agent_dashboard" email={ownerEmail} username={entity.slug} />

      </div>
    </div>
  )
}
