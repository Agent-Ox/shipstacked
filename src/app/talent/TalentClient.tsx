'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { CLUSTER_LABELS, SHIPPED_LABEL, bucketsForEvents } from '@/lib/ranking/facets'
import type { RankedTeam } from '@/lib/ranking/get-ranked-teams'
import { SaveButton } from './SaveButton'

const PROFESSIONS = ['Developer', 'Designer', 'Product Manager', 'Consultant', 'Marketer', 'Operator', 'Founder', 'Other']
const AVAILABILITIES = ['freelance', 'full-time', 'contract', 'part-time', 'open']

type FacetOpt = { value: string; label: string; count: number }
type TalentFilters = { profession: string; availability: string; verified: boolean; sort: string; cluster: string; shipped: string }

function vColor(score: number) {
  return score >= 75 ? '#1a7f37' : score >= 50 ? '#0071e3' : score >= 25 ? '#bf7e00' : '#6e6e73'
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.35rem 0.85rem', borderRadius: 980, border: '1px solid',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 600 : 400,
        background: active ? '#1d1d1f' : 'white',
        borderColor: active ? '#1d1d1f' : '#d2d2d7',
        color: active ? 'white' : '#3d3d3f',
        transition: 'all 0.12s', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function FilterDrawer({
  open, onClose, filters, onApply, clusterFacets, shippedFacets,
}: {
  open: boolean
  onClose: () => void
  filters: TalentFilters
  onApply: (f: TalentFilters) => void
  clusterFacets: FacetOpt[]
  shippedFacets: FacetOpt[]
}) {
  const [draft, setDraft] = useState(filters)

  React.useEffect(() => {
    setDraft(filters)
  }, [filters.profession, filters.availability, filters.verified, filters.sort, filters.cluster, filters.shipped])

  const activeCount = [draft.profession, draft.availability, draft.verified, draft.cluster, draft.shipped].filter(Boolean).length

  function SheetChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button onClick={onClick} style={{
        padding: '0.5rem 1rem', borderRadius: 980, border: '1.5px solid',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: active ? 600 : 400,
        background: active ? '#1d1d1f' : 'white',
        borderColor: active ? '#1d1d1f' : '#d2d2d7',
        color: active ? 'white' : '#3d3d3f',
        transition: 'all 0.12s',
      }}>{label}</button>
    )
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 100, opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.25s',
      }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: 'white', borderRadius: '20px 20px 0 0',
        zIndex: 101, padding: '0 1.25rem 2rem',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0 0.25rem' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d2d2d7' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0 1.25rem' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>Filters</span>
          <button onClick={onClose} style={{ background: '#f0f0f5', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: '#6e6e73', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Role</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <SheetChip label="Any role" active={!draft.profession} onClick={() => setDraft(d => ({ ...d, profession: '' }))} />
            {PROFESSIONS.map(p => (
              <SheetChip key={p} label={p} active={draft.profession === p} onClick={() => setDraft(d => ({ ...d, profession: d.profession === p ? '' : p }))} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Availability</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <SheetChip label="Any" active={!draft.availability} onClick={() => setDraft(d => ({ ...d, availability: '' }))} />
            {AVAILABILITIES.map(a => (
              <SheetChip key={a} label={a} active={draft.availability === a} onClick={() => setDraft(d => ({ ...d, availability: d.availability === a ? '' : a }))} />
            ))}
          </div>
        </div>

        {clusterFacets.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Atlas role</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <SheetChip label="Any" active={!draft.cluster} onClick={() => setDraft(d => ({ ...d, cluster: '' }))} />
              {clusterFacets.map(f => (
                <SheetChip key={f.value} label={`${f.label} (${f.count})`} active={draft.cluster === f.value} onClick={() => setDraft(d => ({ ...d, cluster: d.cluster === f.value ? '' : f.value }))} />
              ))}
            </div>
          </div>
        )}

        {shippedFacets.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Shipped</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <SheetChip label="Any" active={!draft.shipped} onClick={() => setDraft(d => ({ ...d, shipped: '' }))} />
              {shippedFacets.map(f => (
                <SheetChip key={f.value} label={`${f.label} (${f.count})`} active={draft.shipped === f.value} onClick={() => setDraft(d => ({ ...d, shipped: d.shipped === f.value ? '' : f.value }))} />
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Sort by</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <SheetChip label="Top ranked" active={!draft.sort || draft.sort === 'quality'} onClick={() => setDraft(d => ({ ...d, sort: 'quality' }))} />
            <SheetChip label="Newest" active={draft.sort === 'newest'} onClick={() => setDraft(d => ({ ...d, sort: 'newest' }))} />
          </div>
        </div>

        <div onClick={() => setDraft(d => ({ ...d, verified: !d.verified }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f5f5f7', borderRadius: 12, marginBottom: '1.5rem', cursor: 'pointer' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', margin: 0 }}>Verified only</p>
            <p style={{ fontSize: 12, color: '#6e6e73', margin: '0.2rem 0 0' }}>Builders with confirmed proof of work</p>
          </div>
          <div style={{ width: 44, height: 26, borderRadius: 13, padding: 3, boxSizing: 'border-box', background: draft.verified ? '#0071e3' : '#d2d2d7', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', transform: draft.verified ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activeCount > 0 && (
            <button
              onClick={() => { const reset = { profession: '', availability: '', verified: false, sort: 'quality', cluster: '', shipped: '' }; setDraft(reset); onApply(reset) }}
              style={{ flex: 1, padding: '0.875rem', borderRadius: 12, border: '1.5px solid #d2d2d7', background: 'white', fontSize: 15, fontWeight: 500, color: '#3d3d3f', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Clear all
            </button>
          )}
          <button onClick={() => onApply(draft)} style={{ flex: 2, padding: '0.875rem', borderRadius: 12, border: 'none', background: '#1d1d1f', fontSize: 15, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
            {activeCount > 0 ? `Show results · ${activeCount} filter${activeCount > 1 ? 's' : ''}` : 'Show results'}
          </button>
        </div>
      </div>
    </>
  )
}

function ProfileCard({ profile, isPaidHirer, hasHirerProfile, isSaved, onToggleSave }: {
  profile: any
  isPaidHirer: boolean
  hasHirerProfile: boolean
  isSaved: boolean
  onToggleSave: (profileId: string, saved: boolean) => void
}) {
  const initials = profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const claudeSkills = profile.skills?.filter((s: any) => s.category === 'claude_use_case').slice(0, 3) || []
  const otherSkills = profile.skills?.filter((s: any) => s.category !== 'claude_use_case').slice(0, 2) || []

  return (
    <a href={`/u/${profile.username}`} className={profile.verified ? 'talent-card talent-card-verified' : 'talent-card'}>
      {isPaidHirer && (
        <SaveButton profileId={profile.id} initialSaved={isSaved} onToggle={onToggleSave} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', width: '100%', minWidth: 0, boxSizing: 'border-box', paddingRight: isPaidHirer ? '2rem' : 0 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, background: profile.verified ? 'linear-gradient(135deg, #e8f1fd, #d0e4fb)' : '#f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: profile.verified ? '#0071e3' : '#6e6e73', border: profile.verified ? '2px solid rgba(0,113,227,0.2)' : 'none', overflow: 'hidden' }}>
          {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{profile.full_name}</span>
            {profile.verified && <span style={{ fontSize: 10, fontWeight: 700, color: '#0071e3', background: '#e8f1fd', padding: '0.15rem 0.45rem', borderRadius: 980, flexShrink: 0 }}>✓ Verified</span>}
          </div>
          <div style={{ fontSize: 13, color: '#6e6e73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.role}{profile.location ? ` · ${profile.location}` : ''}
          </div>
        </div>
        {profile.ranked && typeof profile.quality_score === 'number' ? (
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: vColor(profile.quality_score), lineHeight: 1 }}>{profile.quality_score}</div>
            <div style={{ fontSize: 9, color: '#aeaeb2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>quality</div>
          </div>
        ) : (
          <div style={{ flexShrink: 0, textAlign: 'center', maxWidth: 60 }}>
            <div style={{ fontSize: 9.5, color: '#aeaeb2', fontWeight: 600, lineHeight: 1.25, letterSpacing: '0.02em' }}>Not yet<br />ranked</div>
          </div>
        )}
      </div>
      {profile.bio && (
        <p style={{ fontSize: 13, color: '#3d3d3f', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0, width: '100%' }}>
          {profile.bio}
        </p>
      )}
      {(claudeSkills.length > 0 || otherSkills.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, width: '100%' }}>
          {claudeSkills.map((s: any) => <span key={s.id} style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#e8f1fd', borderRadius: 980, color: '#0071e3', fontWeight: 500 }}>{s.name}</span>)}
          {otherSkills.map((s: any) => <span key={s.id} style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>{s.name}</span>)}
        </div>
      )}
      {((profile.atlasClusters?.length || 0) > 0 || (profile.eventTypes?.length || 0) > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, width: '100%' }}>
          {(profile.atlasClusters || []).slice(0, 2).map((c: string) => (
            <span key={'c-' + c} style={{ fontSize: 10, padding: '0.15rem 0.5rem', background: '#f0ecff', borderRadius: 980, color: '#6c4cff', fontWeight: 600 }}>{CLUSTER_LABELS[c] || c}</span>
          ))}
          {bucketsForEvents(profile.eventTypes || []).slice(0, 2).map((b: string) => (
            <span key={'s-' + b} style={{ fontSize: 10, padding: '0.15rem 0.5rem', background: '#e8f5ec', borderRadius: 980, color: '#1a7f37', fontWeight: 600 }}>{SHIPPED_LABEL[b] || b}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.25rem', width: '100%' }}>
        <span style={{ fontSize: 11, color: '#6e6e73', textTransform: 'capitalize', background: '#f5f5f7', padding: '0.2rem 0.6rem', borderRadius: 980, fontWeight: 500 }}>
          {profile.availability || 'open'}
        </span>
        {isPaidHirer && (
          hasHirerProfile ? (
            <a href={'/messages?as=hirer&new=' + profile.id} onClick={e => { e.stopPropagation(); posthog.capture('message_button_clicked', { username: profile.username, source: 'talent' }) }} style={{ fontSize: 12, padding: '0.4rem 0.875rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}>
              Message →
            </a>
          ) : (
            <a href="/hirer#company-form" onClick={e => e.stopPropagation()} style={{ fontSize: 12, padding: '0.4rem 0.875rem', background: '#f5f5f7', color: '#6e6e73', borderRadius: 980, textDecoration: 'none', fontWeight: 500, flexShrink: 0, border: '1px solid #e0e0e5' }}>
              Set up profile first
            </a>
          )
        )}
      </div>
    </a>
  )
}

function TeamCard({ team }: { team: RankedTeam }) {
  const initials = team.team_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const services = team.services || []
  return (
    <a href={`/team/${team.slug}`} className={team.verified ? 'talent-card talent-card-verified' : 'talent-card'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, overflow: 'hidden', background: team.logo_url ? 'transparent' : 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white' }}>
          {team.logo_url ? <img src={team.logo_url} alt={team.team_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{team.team_name}</span>
            {team.verified && <span style={{ fontSize: 10, fontWeight: 700, color: '#0071e3', background: '#e8f1fd', padding: '0.15rem 0.45rem', borderRadius: 980, flexShrink: 0 }}>✓ Verified</span>}
          </div>
          {(team.tagline || team.location) && (
            <div style={{ fontSize: 13, color: '#6e6e73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {team.tagline || ''}{team.tagline && team.location ? ' · ' : ''}{team.location || ''}
            </div>
          )}
        </div>
        {team.l1_receipt_count > 0 && (
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a7f37', lineHeight: 1 }}>{team.l1_receipt_count}</div>
            <div style={{ fontSize: 9, color: '#aeaeb2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>shipped</div>
          </div>
        )}
      </div>
      {team.description && (
        <p style={{ fontSize: 13, color: '#3d3d3f', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0, width: '100%' }}>
          {team.description}
        </p>
      )}
      {services.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, width: '100%' }}>
          {services.slice(0, 3).map((s) => <span key={s} style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#f0ecff', borderRadius: 980, color: '#6c4cff', fontWeight: 500 }}>{s}</span>)}
          {services.length > 3 && <span style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#f0f0f5', borderRadius: 980, color: '#6e6e73', fontWeight: 500 }}>+{services.length - 3} more</span>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.25rem', width: '100%' }}>
        {team.team_size_range
          ? <span style={{ fontSize: 11, color: '#6e6e73', background: '#f5f5f7', padding: '0.2rem 0.6rem', borderRadius: 980, fontWeight: 500 }}>👥 {team.team_size_range}</span>
          : <span />}
        <span style={{ fontSize: 12, color: '#0071e3', fontWeight: 500 }}>View team →</span>
      </div>
    </a>
  )
}

export default function TalentClient({
  type = 'builder',
  profiles = [], savedIds: initialSavedIds = [], isPaidHirer = false, isTeaser = false,
  verifiedCount = 0, totalCount = 0, totalUnfilteredCount = 0, user = null, hasHirerProfile = false,
  filters = { profession: '', availability: '', verified: false, sort: 'quality', cluster: '', shipped: '' },
  clusterFacets = [], shippedFacets = [],
  teams = [],
}: {
  type?: 'builder' | 'team' | 'agent'
  profiles?: any[]
  savedIds?: string[]
  isPaidHirer?: boolean
  isTeaser?: boolean
  verifiedCount?: number
  totalCount?: number
  totalUnfilteredCount?: number
  user?: any
  hasHirerProfile?: boolean
  filters?: TalentFilters
  clusterFacets?: FacetOpt[]
  shippedFacets?: FacetOpt[]
  teams?: RankedTeam[]
}) {
  const router = useRouter()
  useEffect(() => {
    posthog.capture('talent_page_viewed', { is_paid_hirer: isPaidHirer })
  }, [isPaidHirer])
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'all' | 'shortlist'>('all')
  const [savedIds, setSavedIds] = useState<string[]>(initialSavedIds)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleToggleSave = (profileId: string, saved: boolean) => {
    setSavedIds(prev => saved ? [...prev, profileId] : prev.filter(id => id !== profileId))
  }

  function pushFilters(next: Partial<TalentFilters>) {
    const merged = { ...filters, ...next }
    const p = new URLSearchParams()
    if (merged.profession) p.set('profession', merged.profession)
    if (merged.availability) p.set('availability', merged.availability)
    if (merged.verified) p.set('verified', 'true')
    if (merged.cluster) p.set('cluster', merged.cluster)
    if (merged.shipped) p.set('shipped', merged.shipped)
    if (merged.sort && merged.sort !== 'quality') p.set('sort', merged.sort)
    const qs = p.toString()
    startTransition(() => { router.push('/talent' + (qs ? '?' + qs : '')) })
  }

  function clearAll() {
    startTransition(() => { router.push('/talent') })
  }

  function handleDrawerApply(f: TalentFilters) {
    setDrawerOpen(false)
    const p = new URLSearchParams()
    if (f.profession) p.set('profession', f.profession)
    if (f.availability) p.set('availability', f.availability)
    if (f.verified) p.set('verified', 'true')
    if (f.cluster) p.set('cluster', f.cluster)
    if (f.shipped) p.set('shipped', f.shipped)
    if (f.sort && f.sort !== 'quality') p.set('sort', f.sort)
    const qs = p.toString()
    startTransition(() => { router.push('/talent' + (qs ? '?' + qs : '')) })
  }

  const hasActiveFilters = !!(filters.profession || filters.availability || filters.verified || filters.cluster || filters.shipped)
  const activeFilterCount = [filters.profession, filters.availability, filters.verified, filters.cluster, filters.shipped].filter(Boolean).length
  const shortlisted = profiles.filter(p => savedIds.includes(p.id))
  const displayProfiles = tab === 'shortlist' ? shortlisted : profiles

  const tabBtn = (t: 'all' | 'shortlist', label: string, count?: number) => (
    <button onClick={() => setTab(t)} style={{
      padding: '0.5rem 1.1rem', borderRadius: 980, border: 'none',
      cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
      fontWeight: tab === t ? 600 : 400,
      background: tab === t ? '#1d1d1f' : '#f0f0f5',
      color: tab === t ? 'white' : '#6e6e73',
      transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '0.4rem',
    }}>
      {label}
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: 11, background: tab === t ? 'rgba(255,255,255,0.2)' : '#d2d2d7', borderRadius: 980, padding: '0.05rem 0.45rem', fontWeight: 600 }}>{count}</span>
      )}
    </button>
  )

  // ── Type facet (Phase 4 §I.4) — swaps the server data source via URL. ──
  function goToType(t: 'builder' | 'team') {
    startTransition(() => { router.push(t === 'builder' ? '/talent' : `/talent?type=${t}`) })
  }
  const typeTab = (t: 'builder' | 'team', label: string) => (
    <button onClick={() => goToType(t)} style={{
      padding: '0.6rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 15, fontWeight: type === t ? 700 : 500, color: type === t ? '#1d1d1f' : '#6e6e73',
      borderBottom: type === t ? '2px solid #0071e3' : '2px solid transparent', marginBottom: -1,
    }}>{label}</button>
  )

  // ── Team filters (Phase 4 §I.5) — client-side, the team set is small. ──
  const [teamServices, setTeamServices] = useState<string[]>([])
  const [teamLocation, setTeamLocation] = useState('')
  const [teamVerified, setTeamVerified] = useState(false)
  const serviceOptions = Array.from(new Set(teams.flatMap(t => t.services || []))).sort()
  const filteredTeams = teams.filter(t => {
    if (teamVerified && !t.verified) return false
    if (teamLocation && !(t.location || '').toLowerCase().includes(teamLocation.toLowerCase())) return false
    if (teamServices.length > 0 && !teamServices.some(s => (t.services || []).includes(s))) return false
    return true
  })
  const teamFiltersActive = teamServices.length > 0 || !!teamLocation || teamVerified
  const clearTeamFilters = () => { setTeamServices([]); setTeamLocation(''); setTeamVerified(false) }

  return (
    <>
      <style>{`
        .talent-card {
          display: flex; flex-direction: column; gap: 0.75rem;
          background: white; border: 1px solid #e0e0e5; border-radius: 16px;
          padding: 1.25rem; text-decoration: none; color: inherit;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative; overflow: hidden; box-sizing: border-box;
        }
        .talent-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .talent-card-verified { border-color: rgba(0,113,227,0.2); }
        .talent-card-verified:hover { border-color: rgba(0,113,227,0.4); box-shadow: 0 8px 24px rgba(0,113,227,0.1); }
        .desktop-filters { display: block; }
        .mobile-filter-bar { display: none; }
        @media (max-width: 640px) {
          .talent-hdr { flex-direction: column; align-items: flex-start !important; }
          .desktop-filters { display: none; }
          .mobile-filter-bar { display: flex; }
        }
      `}</style>

      {/* Type facet — Builder / Team / Agent (Phase 4 §I.4). Sits above the
          per-source All/Shortlist tab; it swaps the data source, not a filter. */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.75rem', borderBottom: '1px solid #e0e0e5' }}>
        {typeTab('builder', 'Builders')}
        {typeTab('team', 'Teams')}
        <button disabled title="Coming in Phase 5" style={{
          padding: '0.6rem 1rem', border: 'none', background: 'none', cursor: 'not-allowed', fontFamily: 'inherit',
          fontSize: 15, fontWeight: 500, color: '#c7c7cc', borderBottom: '2px solid transparent', marginBottom: -1,
        }}>Agents (soon)</button>
      </div>

      {type === 'builder' && (
      <>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Talent</p>
        <div className="talent-hdr" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.4rem' }}>AI-native builders</h1>
            <p style={{ fontSize: 15, color: '#6e6e73' }}>
              {hasActiveFilters
                ? <>{totalCount} matching · {verifiedCount} verified <span style={{ color: '#aeaeb2' }}>of {totalUnfilteredCount} total</span></>
                : <>{totalCount} builders · {verifiedCount} verified</>
              }
            </p>
          </div>
          {isPaidHirer && (
            <div style={{ fontSize: 13, color: '#6e6e73', background: '#f5f5f7', padding: '0.4rem 0.875rem', borderRadius: 980 }}>Full access</div>
          )}
        </div>
      </div>

      {/* Desktop filters */}
      <div className="desktop-filters" style={{ marginBottom: '1.5rem', opacity: isPending ? 0.5 : 1, transition: 'opacity 0.15s' }}>
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          <FilterChip label="All roles" active={!filters.profession} onClick={() => pushFilters({ profession: '' })} />
          {PROFESSIONS.map(p => (
            <FilterChip key={p} label={p} active={filters.profession === p} onClick={() => pushFilters({ profession: filters.profession === p ? '' : p })} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterChip label="Any availability" active={!filters.availability} onClick={() => pushFilters({ availability: '' })} />
          {AVAILABILITIES.map(a => (
            <FilterChip key={a} label={a} active={filters.availability === a} onClick={() => pushFilters({ availability: filters.availability === a ? '' : a })} />
          ))}
          <div style={{ width: 1, height: 20, background: '#e0e0e5', flexShrink: 0, margin: '0 0.2rem' }} />
          <FilterChip label="✓ Verified only" active={filters.verified} onClick={() => pushFilters({ verified: !filters.verified })} />
          <div style={{ width: 1, height: 20, background: '#e0e0e5', flexShrink: 0, margin: '0 0.2rem' }} />
          <FilterChip label="↑ Top ranked" active={filters.sort === 'quality' || !filters.sort} onClick={() => pushFilters({ sort: 'quality' })} />
          <FilterChip label="Newest" active={filters.sort === 'newest'} onClick={() => pushFilters({ sort: 'newest' })} />
        </div>
        {clusterFacets.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#aeaeb2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.2rem' }}>Role</span>
            <FilterChip label="Any" active={!filters.cluster} onClick={() => pushFilters({ cluster: '' })} />
            {clusterFacets.map(f => (
              <FilterChip key={f.value} label={`${f.label} (${f.count})`} active={filters.cluster === f.value} onClick={() => pushFilters({ cluster: filters.cluster === f.value ? '' : f.value })} />
            ))}
          </div>
        )}
        {shippedFacets.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#aeaeb2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.2rem' }}>Shipped</span>
            <FilterChip label="Any" active={!filters.shipped} onClick={() => pushFilters({ shipped: '' })} />
            {shippedFacets.map(f => (
              <FilterChip key={f.value} label={`${f.label} (${f.count})`} active={filters.shipped === f.value} onClick={() => pushFilters({ shipped: filters.shipped === f.value ? '' : f.value })} />
            ))}
          </div>
        )}
        {hasActiveFilters && (
          <button onClick={clearAll} style={{ marginTop: '0.6rem', fontSize: 12, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            Clear all filters
          </button>
        )}
      </div>

      {/* Mobile filter bar */}
      <div className="mobile-filter-bar" style={{ gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center', opacity: isPending ? 0.5 : 1, transition: 'opacity 0.15s' }}>
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.55rem 1rem', borderRadius: 980, border: '1.5px solid',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
            background: hasActiveFilters ? '#1d1d1f' : 'white',
            borderColor: hasActiveFilters ? '#1d1d1f' : '#d2d2d7',
            color: hasActiveFilters ? 'white' : '#3d3d3f',
          }}
        >
          <span>⚙︎</span>
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.25)', borderRadius: 980, padding: '0.05rem 0.4rem', fontWeight: 700 }}>
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          onClick={() => pushFilters({ sort: filters.sort === 'newest' ? 'quality' : 'newest' })}
          style={{ padding: '0.55rem 1rem', borderRadius: 980, border: '1.5px solid #d2d2d7', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, background: 'white', color: '#3d3d3f' }}
        >
          {filters.sort === 'newest' ? '↑ Newest' : '↑ Top ranked'}
        </button>
        {hasActiveFilters && (
          <button onClick={clearAll} style={{ fontSize: 13, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '0.55rem 0', fontWeight: 500 }}>
            Clear
          </button>
        )}
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} filters={filters} onApply={handleDrawerApply} clusterFacets={clusterFacets} shippedFacets={shippedFacets} />

      {/* Tabs */}
      {isPaidHirer && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {tabBtn('all', 'All builders', profiles.length)}
          {tabBtn('shortlist', 'Shortlist', shortlisted.length)}
        </div>
      )}

      {tab === 'shortlist' && shortlisted.length === 0 && (
        <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>❤️</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>No saved builders yet</p>
          <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: '1.25rem' }}>Tap the heart on any builder card to add them to your shortlist.</p>
          <button onClick={() => setTab('all')} style={{ padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Browse builders
          </button>
        </div>
      )}

      {tab === 'all' && profiles.length === 0 && (
        <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>🔍</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>No builders match these filters</p>
          <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: '1.25rem' }}>Try removing a filter or two.</p>
          <button onClick={clearAll} style={{ padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Clear filters
          </button>
        </div>
      )}

      {(tab === 'all' || shortlisted.length > 0) && displayProfiles.length > 0 && (
        <>
          {tab === 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Ranked by proof of work</span>
              <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '1rem' }}>
            {displayProfiles.map((profile: any) => (
              <ProfileCard key={profile.id} profile={profile} isPaidHirer={isPaidHirer} hasHirerProfile={hasHirerProfile} isSaved={savedIds.includes(profile.id)} onToggleSave={handleToggleSave} />
            ))}
          </div>
        </>
      )}

      {isTeaser && (
        <div style={{ marginTop: '2.5rem', textAlign: 'center', padding: '3rem 2rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -80, left: 0, right: 0, height: 120, background: 'linear-gradient(180deg, transparent 0%, #fbfbfd 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>🔒</p>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>
              {totalCount > 6 ? `+${totalCount - 6} more builders` : 'Full directory access'}
            </h2>
            <p style={{ fontSize: 15, color: '#6e6e73', maxWidth: 400, margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
              Get full access to every verified ShipStacked builder. Read their Build Feed, see their proof of work, and message them directly — $199/month flat.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/hirers#pricing" onClick={() => posthog.capture('subscribe_clicked', { source: 'talent_teaser' })} style={{ padding: '0.875rem 2rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
                Get full access — $199/mo
              </a>
              {!user && (
                <a href="/login" style={{ padding: '0.875rem 1.5rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
                  Sign in
                </a>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#aeaeb2', marginTop: '1rem' }}>No commissions. Cancel anytime.</p>
          </div>
        </div>
      )}
      </>
      )}

      {type === 'team' && (
        <>
          {/* Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Talent</p>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.4rem' }}>AI implementation teams</h1>
            <p style={{ fontSize: 15, color: '#6e6e73' }}>
              {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''}{teamFiltersActive ? ` matching · ${teams.length} total` : ''}
            </p>
          </div>

          {/* Team filters (client-side) */}
          <div style={{ marginBottom: '1.5rem' }}>
            {serviceOptions.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#aeaeb2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.2rem' }}>Services</span>
                {serviceOptions.map(s => (
                  <FilterChip key={s} label={s} active={teamServices.includes(s)} onClick={() => setTeamServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} />
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={teamLocation} onChange={e => setTeamLocation(e.target.value)} placeholder="Filter by location…" style={{ padding: '0.35rem 0.85rem', borderRadius: 980, border: '1px solid #d2d2d7', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
              <FilterChip label="✓ Verified only" active={teamVerified} onClick={() => setTeamVerified(v => !v)} />
              {teamFiltersActive && (
                <button onClick={clearTeamFilters} style={{ fontSize: 12, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Clear all filters</button>
              )}
            </div>
          </div>

          {filteredTeams.length === 0 ? (
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>🔍</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>{teams.length === 0 ? 'No teams yet' : 'No teams match these filters'}</p>
              <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: '1.25rem' }}>{teams.length === 0 ? 'Be the first — create a team profile.' : 'Try removing a filter.'}</p>
              {teamFiltersActive
                ? <button onClick={clearTeamFilters} style={{ padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Clear filters</button>
                : <a href="/join" style={{ display: 'inline-block', padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Create team profile →</a>}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Ranked by proof of work</span>
                <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '1rem' }}>
                {filteredTeams.map(t => <TeamCard key={t.id} team={t} />)}
              </div>
            </>
          )}
        </>
      )}

      {type === 'agent' && (
        <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>🤖</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>Agent directory ships in Phase 5</p>
          <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: '1.25rem' }}>Until then, agents act via the API.</p>
          <a href="/api-docs" style={{ display: 'inline-block', padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>API docs →</a>
        </div>
      )}
    </>
  )
}
