'use client'

import { useState } from 'react'
import EnableHiringButton from '@/app/components/EnableHiringButton'
import ConnectAnAgent from '@/app/components/ConnectAnAgent'
import { TEAM_SIZE_RANGES } from '@/lib/team/validate'

type TeamProfile = {
  entity_id: number
  team_name: string
  tagline: string | null
  description: string | null
  services: string[] | null
  location: string | null
  website_url: string | null
  logo_url: string | null
  contact_email: string | null
  published: boolean
  founded_year: number | null
  team_size_range: string | null
  verified: boolean
}

type Member = {
  id: string
  username: string
  full_name: string | null
  role: string | null
  avatar_url: string | null
}

type Props = {
  entity: { id: number; slug: string }
  profile: TeamProfile
  members: Member[]
  ownerEmail: string
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

export default function TeamEditClient({ entity, profile, members: initialMembers, ownerEmail }: Props) {
  const [teamName, setTeamName] = useState(profile.team_name)
  const [tagline, setTagline] = useState(profile.tagline ?? '')
  const [description, setDescription] = useState(profile.description ?? '')
  const [services, setServices] = useState((profile.services ?? []).join('\n'))
  const [location, setLocation] = useState(profile.location ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url ?? '')
  const [logoUrl, setLogoUrl] = useState(profile.logo_url ?? '')
  const [contactEmail, setContactEmail] = useState(profile.contact_email ?? ownerEmail)
  const [foundedYear, setFoundedYear] = useState(profile.founded_year != null ? String(profile.founded_year) : '')
  const [teamSizeRange, setTeamSizeRange] = useState(profile.team_size_range ?? '')

  const [published, setPublished] = useState(profile.published)
  const [members, setMembers] = useState<Member[]>(initialMembers)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [togglingPublish, setTogglingPublish] = useState(false)

  const save = async () => {
    if (saving) return
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/v1/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: entity.id,
          team_name: teamName.trim(),
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          services: services.split('\n').map(s => s.trim()).filter(Boolean),
          location: location.trim() || null,
          website_url: websiteUrl.trim() || null,
          logo_url: logoUrl.trim() || null,
          contact_email: contactEmail.trim() || null,
          founded_year: foundedYear.trim() === '' ? null : Number(foundedYear),
          team_size_range: teamSizeRange || null,
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
      const res = await fetch('/api/v1/team', {
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

  const removeMember = async (username: string) => {
    if (!confirm(`Remove ${username} from this team? They can re-link from their own profile.`)) return
    // Optimistic.
    const prev = members
    setMembers(members.filter(m => m.username !== username))
    try {
      const res = await fetch(`/api/team/${entity.slug}/members/${encodeURIComponent(username)}`, { method: 'DELETE' })
      if (!res.ok) {
        setMembers(prev) // roll back
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Remove failed')
      }
    } catch {
      setMembers(prev)
      setError('Remove failed')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Edit team</h1>
            <p style={{ fontSize: 13, color: '#6e6e73', marginTop: '0.25rem' }}>shipstacked.com/team/{entity.slug}</p>
          </div>
          <a href={`/team/${entity.slug}`} style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>View public page →</a>
        </div>

        {/* Publish state — prominent */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', background: published ? '#f0faf0' : 'white', borderColor: published ? '#b3e0b3' : '#e0e0e5' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: published ? '#1a7f37' : '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              {published ? 'Published' : 'Not published'}
            </p>
            <p style={{ fontSize: 14, color: '#1d1d1f' }}>
              {published ? 'Your team page is live and discoverable.' : 'Only you can see this team. Publish to go live.'}
            </p>
          </div>
          <button onClick={togglePublish} disabled={togglingPublish} style={{
            fontSize: 14, padding: '0.6rem 1.25rem', borderRadius: 980, border: 'none', fontWeight: 600,
            cursor: togglingPublish ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            background: togglingPublish ? '#aeaeb2' : (published ? 'white' : '#0071e3'),
            color: published ? '#1d1d1f' : 'white',
            ...(published ? { border: '1px solid #d2d2d7' } : {}),
          }}>
            {togglingPublish ? 'Saving…' : (published ? 'Unpublish' : 'Publish team →')}
          </button>
        </div>

        {/* Profile fields */}
        <div style={cardStyle}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Profile</p>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Team name</label>
            <input type="text" maxLength={80} value={teamName} onChange={e => setTeamName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Tagline</label>
            <input type="text" maxLength={200} placeholder="One line on what your team does" value={tagline} onChange={e => setTagline(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Description</label>
            <textarea maxLength={2000} rows={4} value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Services <span style={{ fontWeight: 400, color: '#6e6e73' }}>(one per line, max 20)</span></label>
            <textarea rows={4} placeholder={'AI agent development\nCustom integrations\nRAG pipelines'} value={services} onChange={e => setServices(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Location</label>
              <input type="text" maxLength={200} placeholder="Remote" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Team size</label>
              <select value={teamSizeRange} onChange={e => setTeamSizeRange(e.target.value)} style={inputStyle}>
                <option value="">—</option>
                {TEAM_SIZE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={labelStyle}>Founded</label>
              <input type="number" min={1900} max={new Date().getFullYear()} placeholder="2024" value={foundedYear} onChange={e => setFoundedYear(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Website URL</label>
            <input type="url" placeholder="https://…" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Logo URL <span style={{ fontWeight: 400, color: '#6e6e73' }}>(paste an image URL)</span></label>
            <input type="url" placeholder="https://…/logo.png" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Contact email</label>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} style={inputStyle} />
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

        {/* People */}
        <div style={cardStyle}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>People</p>
          <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem' }}>Members add themselves from their own profile. You can remove fake associations.</p>
          {members.length === 0 ? (
            <p style={{ fontSize: 14, color: '#6e6e73' }}>
              No members linked yet. Anyone on ShipStacked can link to your team from their own profile's "Team / Agency / Studio you're with" field.
            </p>
          ) : (
            <div>
              {members.map(m => {
                const mInitials = (m.full_name || m.username).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '0.5px solid #f0f0f5', gap: '0.75rem' }}>
                    <a href={`/u/${m.username}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                        {m.avatar_url ? <img src={m.avatar_url} alt={m.full_name || m.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : mInitials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.full_name || m.username}</p>
                        <p style={{ fontSize: 12, color: '#aeaeb2' }}>@{m.username}</p>
                      </div>
                    </a>
                    <button onClick={() => removeMember(m.username)} style={{ fontSize: 12, padding: '0.3rem 0.7rem', background: '#fff0f0', color: '#c00', border: '1px solid #ffd0d0', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Phase 3 — composable Buyer Mode + agent management */}
        <EnableHiringButton source="team_dashboard" variant="card" />
        <ConnectAnAgent scope="team:rw" variant="team_dashboard" email={ownerEmail} username={entity.slug} />

      </div>
    </div>
  )
}
