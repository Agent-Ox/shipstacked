'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SaveButton } from './SaveButton'

const PROFESSIONS = ['Developer', 'Designer', 'Product Manager', 'Consultant', 'Marketer', 'Operator', 'Founder', 'Other']
const AVAILABILITIES = ['freelance', 'full-time', 'contract', 'part-time', 'open']

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

function ProfileCard({ profile, isPaidEmployer, hasEmployerProfile, isSaved, onToggleSave }: {
  profile: any
  isPaidEmployer: boolean
  hasEmployerProfile: boolean
  isSaved: boolean
  onToggleSave: (profileId: string, saved: boolean) => void
}) {
  const initials = profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const claudeSkills = profile.skills?.filter((s: any) => s.category === 'claude_use_case').slice(0, 3) || []
  const otherSkills = profile.skills?.filter((s: any) => s.category !== 'claude_use_case').slice(0, 2) || []

  return (
    <a href={`/u/${profile.username}`} className={profile.verified ? 'talent-card talent-card-verified' : 'talent-card'}>
      {isPaidEmployer && (
        <SaveButton
          profileId={profile.id}
          initialSaved={isSaved}
          onToggle={onToggleSave}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', width: '100%', minWidth: 0, boxSizing: 'border-box', paddingRight: isPaidEmployer ? '2rem' : 0 }}>
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
        {(profile.velocity_score || 0) > 0 && (
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: vColor(profile.velocity_score), lineHeight: 1 }}>{profile.velocity_score}</div>
            <div style={{ fontSize: 9, color: '#aeaeb2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>velocity</div>
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.25rem', width: '100%' }}>
        <span style={{ fontSize: 11, color: '#6e6e73', textTransform: 'capitalize', background: '#f5f5f7', padding: '0.2rem 0.6rem', borderRadius: 980, fontWeight: 500 }}>
          {profile.availability || 'open'}
        </span>
        {isPaidEmployer && (
          hasEmployerProfile ? (
            <a href={'/employer/messages?new=' + profile.id}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 12, padding: '0.4rem 0.875rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}>
              Message →
            </a>
          ) : (
            <a href="/employer#company-form"
              onClick={e => e.stopPropagation()}
              title="Set up your company profile to message builders"
              style={{ fontSize: 12, padding: '0.4rem 0.875rem', background: '#f5f5f7', color: '#6e6e73', borderRadius: 980, textDecoration: 'none', fontWeight: 500, flexShrink: 0, border: '1px solid #e0e0e5' }}>
              Set up profile first
            </a>
          )
        )}
      </div>
    </a>
  )
}

export default function TalentClient({
  profiles,
  savedIds: initialSavedIds,
  isPaidEmployer,
  isTeaser,
  verifiedCount,
  totalCount,
  totalUnfilteredCount,
  user,
  hasEmployerProfile = false,
  filters,
}: {
  profiles: any[]
  savedIds: string[]
  isPaidEmployer: boolean
  isTeaser: boolean
  verifiedCount: number
  totalCount: number
  totalUnfilteredCount: number
  user: any
  hasEmployerProfile?: boolean
  filters: { profession: string; availability: string; verified: boolean; sort: string }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'all' | 'shortlist'>('all')
  const [savedIds, setSavedIds] = useState<string[]>(initialSavedIds)

  const handleToggleSave = (profileId: string, saved: boolean) => {
    setSavedIds(prev => saved ? [...prev, profileId] : prev.filter(id => id !== profileId))
  }

  function pushFilters(next: { profession?: string; availability?: string; verified?: boolean; sort?: string }) {
    const merged = { ...filters, ...next }
    const p = new URLSearchParams()
    if (merged.profession) p.set('profession', merged.profession)
    if (merged.availability) p.set('availability', merged.availability)
    if (merged.verified) p.set('verified', 'true')
    if (merged.sort && merged.sort !== 'velocity') p.set('sort', merged.sort)
    const qs = p.toString()
    startTransition(() => { router.push('/talent' + (qs ? '?' + qs : '')) })
  }

  function clearAll() {
    startTransition(() => { router.push('/talent') })
  }

  const hasActiveFilters = !!(filters.profession || filters.availability || filters.verified)

  const shortlisted = profiles.filter(p => savedIds.includes(p.id))
  const displayProfiles = tab === 'shortlist' ? shortlisted : profiles

  const tabBtn = (t: 'all' | 'shortlist', label: string, count?: number) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: '0.5rem 1.1rem', borderRadius: 980, border: 'none',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
        fontWeight: tab === t ? 600 : 400,
        background: tab === t ? '#1d1d1f' : '#f0f0f5',
        color: tab === t ? 'white' : '#6e6e73',
        transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '0.4rem',
      }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: 11, background: tab === t ? 'rgba(255,255,255,0.2)' : '#d2d2d7', borderRadius: 980, padding: '0.05rem 0.45rem', fontWeight: 600 }}>
          {count}
        </span>
      )}
    </button>
  )

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
        @media (max-width: 640px) {
          .talent-hdr { flex-direction: column; align-items: flex-start !important; }
          .filter-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .filter-scroll::-webkit-scrollbar { display: none; }
        }
      `}</style>

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
          {isPaidEmployer && (
            <div style={{ fontSize: 13, color: '#6e6e73', background: '#f5f5f7', padding: '0.4rem 0.875rem', borderRadius: 980 }}>Full access</div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '1.5rem', opacity: isPending ? 0.5 : 1, transition: 'opacity 0.15s' }}>
        {/* Profession */}
        <div className="filter-scroll" style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'nowrap' }}>
          <FilterChip label="All roles" active={!filters.profession} onClick={() => pushFilters({ profession: '' })} />
          {PROFESSIONS.map(p => (
            <FilterChip key={p} label={p} active={filters.profession === p} onClick={() => pushFilters({ profession: filters.profession === p ? '' : p })} />
          ))}
        </div>

        {/* Availability + Verified + Sort */}
        <div className="filter-scroll" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'nowrap', alignItems: 'center' }}>
          <FilterChip label="Any availability" active={!filters.availability} onClick={() => pushFilters({ availability: '' })} />
          {AVAILABILITIES.map(a => (
            <FilterChip key={a} label={a} active={filters.availability === a} onClick={() => pushFilters({ availability: filters.availability === a ? '' : a })} />
          ))}
          <div style={{ width: 1, height: 20, background: '#e0e0e5', flexShrink: 0, margin: '0 0.2rem' }} />
          <FilterChip label="✓ Verified only" active={filters.verified} onClick={() => pushFilters({ verified: !filters.verified })} />
          <div style={{ width: 1, height: 20, background: '#e0e0e5', flexShrink: 0, margin: '0 0.2rem' }} />
          <FilterChip label="↑ Velocity" active={filters.sort === 'velocity' || !filters.sort} onClick={() => pushFilters({ sort: 'velocity' })} />
          <FilterChip label="Newest" active={filters.sort === 'newest'} onClick={() => pushFilters({ sort: 'newest' })} />
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <button onClick={clearAll} style={{ marginTop: '0.6rem', fontSize: 12, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            Clear all filters
          </button>
        )}
      </div>

      {/* Tabs */}
      {isPaidEmployer && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {tabBtn('all', 'All builders', profiles.length)}
          {tabBtn('shortlist', '❤️ Shortlist', shortlisted.length)}
        </div>
      )}

      {/* Shortlist empty state */}
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

      {/* Empty state for filters */}
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

      {/* Grid */}
      {(tab === 'all' || shortlisted.length > 0) && displayProfiles.length > 0 && (
        <>
          {tab === 'all' && verifiedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase' }}>✓ Verified builders</span>
              <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '1rem' }}>
            {displayProfiles.map((profile: any, index: number) => {
              const prev = displayProfiles[index - 1]
              const showDivider = tab === 'all' && index > 0 && !profile.verified && prev?.verified
              return (
                <React.Fragment key={profile.id}>
                  {showDivider && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.05em', textTransform: 'uppercase' }}>All builders</span>
                      <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
                    </div>
                  )}
                  <ProfileCard
                    profile={profile}
                    isPaidEmployer={isPaidEmployer}
                    hasEmployerProfile={hasEmployerProfile}
                    isSaved={savedIds.includes(profile.id)}
                    onToggleSave={handleToggleSave}
                  />
                </React.Fragment>
              )
            })}
          </div>
        </>
      )}

      {/* Paywall */}
      {isTeaser && (
        <div style={{ marginTop: '2.5rem', textAlign: 'center', padding: '3rem 2rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -80, left: 0, right: 0, height: 120, background: 'linear-gradient(180deg, transparent 0%, #fbfbfd 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>🔒</p>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>
              {totalCount > 6 ? `+${totalCount - 6} more builders` : 'Full directory access'}
            </h2>
            <p style={{ fontSize: 15, color: '#6e6e73', maxWidth: 400, margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
              Get full access to every verified ShipStacked builder. Read their Build Feed, see their Velocity Score, and message them directly — $199/month flat.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/#pricing" style={{ padding: '0.875rem 2rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
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
  )
}

function ProfileCard({ profile, isPaidEmployer, hasEmployerProfile, isSaved, onToggleSave }: {
  profile: any
  isPaidEmployer: boolean
  hasEmployerProfile: boolean
  isSaved: boolean
  onToggleSave: (profileId: string, saved: boolean) => void
}) {
  const initials = profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const claudeSkills = profile.skills?.filter((s: any) => s.category === 'claude_use_case').slice(0, 3) || []
  const otherSkills = profile.skills?.filter((s: any) => s.category !== 'claude_use_case').slice(0, 2) || []

  return (
    <a href={`/u/${profile.username}`} className={profile.verified ? 'talent-card talent-card-verified' : 'talent-card'}>
      {isPaidEmployer && (
        <SaveButton
          profileId={profile.id}
          initialSaved={isSaved}
          onToggle={onToggleSave}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', width: '100%', minWidth: 0, boxSizing: 'border-box', paddingRight: isPaidEmployer ? '2rem' : 0 }}>
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
        {(profile.velocity_score || 0) > 0 && (
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: vColor(profile.velocity_score), lineHeight: 1 }}>{profile.velocity_score}</div>
            <div style={{ fontSize: 9, color: '#aeaeb2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>velocity</div>
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.25rem', width: '100%' }}>
        <span style={{ fontSize: 11, color: '#6e6e73', textTransform: 'capitalize', background: '#f5f5f7', padding: '0.2rem 0.6rem', borderRadius: 980, fontWeight: 500 }}>
          {profile.availability || 'open'}
        </span>
        {isPaidEmployer && (
          hasEmployerProfile ? (
            <a href={'/employer/messages?new=' + profile.id}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 12, padding: '0.4rem 0.875rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}>
              Message →
            </a>
          ) : (
            <a href="/employer#company-form"
              onClick={e => e.stopPropagation()}
              title="Set up your company profile to message builders"
              style={{ fontSize: 12, padding: '0.4rem 0.875rem', background: '#f5f5f7', color: '#6e6e73', borderRadius: 980, textDecoration: 'none', fontWeight: 500, flexShrink: 0, border: '1px solid #e0e0e5' }}>
              Set up profile first
            </a>
          )
        )}
      </div>
    </a>
  )
}

export default function TalentClient({
  profiles,
  savedIds: initialSavedIds,
  isPaidEmployer,
  isTeaser,
  verifiedCount,
  totalCount,
  user,
  hasEmployerProfile = false,
}: {
  profiles: any[]
  savedIds: string[]
  isPaidEmployer: boolean
  isTeaser: boolean
  verifiedCount: number
  totalCount: number
  user: any
  hasEmployerProfile?: boolean
}) {
  const [tab, setTab] = useState<'all' | 'shortlist'>('all')
  // savedIds lives in state so toggling a heart updates the shortlist tab instantly
  const [savedIds, setSavedIds] = useState<string[]>(initialSavedIds)

  const handleToggleSave = (profileId: string, saved: boolean) => {
    setSavedIds(prev =>
      saved ? [...prev, profileId] : prev.filter(id => id !== profileId)
    )
  }

  const shortlisted = profiles.filter(p => savedIds.includes(p.id))
  const displayProfiles = tab === 'shortlist' ? shortlisted : profiles

  const tabBtn = (t: 'all' | 'shortlist', label: string, count?: number) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: '0.5rem 1.1rem', borderRadius: 980, border: 'none',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
        fontWeight: tab === t ? 600 : 400,
        background: tab === t ? '#1d1d1f' : '#f0f0f5',
        color: tab === t ? 'white' : '#6e6e73',
        transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '0.4rem',
      }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: 11, background: tab === t ? 'rgba(255,255,255,0.2)' : '#d2d2d7', borderRadius: 980, padding: '0.05rem 0.45rem', fontWeight: 600 }}>
          {count}
        </span>
      )}
    </button>
  )

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
        @media (max-width: 640px) {
          .talent-hdr { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Talent</p>
        <div className="talent-hdr" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.4rem' }}>AI-native builders</h1>
            <p style={{ fontSize: 15, color: '#6e6e73' }}>{totalCount} builders · {verifiedCount} verified</p>
          </div>
          {isPaidEmployer && (
            <div style={{ fontSize: 13, color: '#6e6e73', background: '#f5f5f7', padding: '0.4rem 0.875rem', borderRadius: 980 }}>Full access</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {isPaidEmployer && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {tabBtn('all', 'All builders', profiles.length)}
          {tabBtn('shortlist', '❤️ Shortlist', shortlisted.length)}
        </div>
      )}

      {/* Shortlist empty state */}
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

      {/* Grid */}
      {(tab === 'all' || shortlisted.length > 0) && displayProfiles.length > 0 && (
        <>
          {tab === 'all' && verifiedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase' }}>✓ Verified builders</span>
              <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '1rem' }}>
            {displayProfiles.map((profile: any, index: number) => {
              const prev = displayProfiles[index - 1]
              const showDivider = tab === 'all' && index > 0 && !profile.verified && prev?.verified
              return (
                <React.Fragment key={profile.id}>
                  {showDivider && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.05em', textTransform: 'uppercase' }}>All builders</span>
                      <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
                    </div>
                  )}
                  <ProfileCard
                    profile={profile}
                    isPaidEmployer={isPaidEmployer}
                    hasEmployerProfile={hasEmployerProfile}
                    isSaved={savedIds.includes(profile.id)}
                    onToggleSave={handleToggleSave}
                  />
                </React.Fragment>
              )
            })}
          </div>
        </>
      )}

      {/* Paywall */}
      {isTeaser && (
        <div style={{ marginTop: '2.5rem', textAlign: 'center', padding: '3rem 2rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -80, left: 0, right: 0, height: 120, background: 'linear-gradient(180deg, transparent 0%, #fbfbfd 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>🔒</p>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>
              {totalCount > 6 ? `+${totalCount - 6} more builders` : 'Full directory access'}
            </h2>
            <p style={{ fontSize: 15, color: '#6e6e73', maxWidth: 400, margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
              Get full access to every verified ShipStacked builder. Read their Build Feed, see their Velocity Score, and message them directly — $199/month flat.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/#pricing" style={{ padding: '0.875rem 2rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
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
  )
}
