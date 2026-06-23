import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { extractHost, isSharedDocHost } from '@/lib/ranking/quality-score'
import { buildTeamOrgJsonLd } from '@/lib/jsonld/team-org'
import { getAtlasRolesForSubject } from '@/lib/atlas/matching'
import { getTeamMembers } from '@/lib/team/members'
import ContactTeamButton from './ContactTeamButton'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface TeamEntity {
  id: number
  slug: string
  display_name: string
  owner_user_id: string
}

interface TeamProfile {
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

async function resolveTeam(
  slug: string,
): Promise<{ entity: TeamEntity; profile: TeamProfile } | null> {
  const admin = adminClient()
  const { data: entity } = await admin
    .from('entities')
    .select('id, slug, display_name, owner_user_id')
    .eq('slug', slug)
    .eq('kind', 'team')
    .maybeSingle()
  if (!entity) return null
  const { data: profile } = await admin
    .from('team_profiles')
    .select('*')
    .eq('entity_id', (entity as TeamEntity).id)
    .maybeSingle()
  if (!profile) return null
  return { entity: entity as TeamEntity, profile: profile as TeamProfile }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolveTeam(slug)
  if (!resolved) return { title: 'Team not found' }
  const { profile } = resolved

  const title = `${profile.team_name} — AI implementation team on ShipStacked`
  const description =
    profile.tagline ||
    profile.description?.slice(0, 155) ||
    `${profile.team_name} ships AI implementation work, verified on ShipStacked.`
  const url = `https://shipstacked.com/team/${slug}`
  const services = (profile.services ?? []).slice(0, 3).join(',')
  const ogImage = `https://shipstacked.com/og?type=team&name=${encodeURIComponent(profile.team_name)}&tagline=${encodeURIComponent(profile.tagline || '')}&verified=${profile.verified ? 'true' : 'false'}&services=${encodeURIComponent(services)}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'profile', images: [{ url: ogImage, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  }
}

export default async function TeamProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const resolved = await resolveTeam(slug)
  if (!resolved) notFound()
  const { entity, profile } = resolved
  const admin = adminClient()

  // Resolve the viewer + whether they admin THIS team (used by the published
  // gate below AND the Contact CTA). A logged-out viewer → user null.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  let viewerIsAdmin = false
  if (user) {
    const { data: adminRow } = await admin
      .from('team_admins')
      .select('id')
      .eq('team_entity_id', entity.id)
      .eq('user_id', user.id)
      .maybeSingle()
    viewerIsAdmin = !!adminRow
  }

  // ── Published gate (Invariant #2). Unpublished teams 404 for everyone EXCEPT
  // an admin of that team, who sees a preview. (Outcome unchanged.) ──────────
  let preview = false
  if (!profile.published) {
    if (!user || !viewerIsAdmin) notFound()
    preview = true
  }

  // ── People (membership = team_admins owners/admins UNION published self-linkers) ──
  // Read-only; the owner/admins always show, self-linkers must be published.
  const members = await getTeamMembers(admin, entity.id, { publishedOnly: true })

  // ── Recent team-subject receipts — same L1 + non-shared-doc bar as /u ──────
  const { data: rawReceipts } = await admin
    .from('proof_receipts')
    .select('id, slug, title, description, event_type, atlas_confirmed, atlas_inferred, verification_level, issued_at, artifacts')
    .eq('subject_id', entity.id)
    .eq('visibility', 'public')
    .eq('verification_level', 'L1_artifact_confirmed')
    .order('issued_at', { ascending: false })
    .limit(50)
  const receipts = (rawReceipts ?? []).filter((r: any) => {
    const host = extractHost(r.artifacts?.[0]?.url)
    return !host || !isSharedDocHost(host)
  })

  // ── Proof-of-work aggregates ──────────────────────────────────────────────
  const l1Count = receipts.length
  const hostSet = new Set<string>()
  for (const r of receipts) {
    const h = extractHost((r as any).artifacts?.[0]?.url)
    if (h && !isSharedDocHost(h)) hostSet.add(h)
  }
  const distinctHosts = hostSet.size
  const lastShipped = receipts[0]?.issued_at ?? null

  const services = profile.services ?? []
  const memberList = members
  const initials = profile.team_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  // Phase 6 §I: Atlas roles for this team → knowsAbout URLs (deduped + sorted).
  const teamAtlasRows = await getAtlasRolesForSubject(admin, entity.id)
  const teamAtlasRoles = [...new Set(teamAtlasRows.map((r) => r.atlas_role))].sort()

  const jsonLd = buildTeamOrgJsonLd({
    slug: entity.slug,
    team_name: profile.team_name,
    tagline: profile.tagline,
    description: profile.description,
    website_url: profile.website_url,
    logo_url: profile.logo_url,
    location: profile.location,
    services,
    team_size_range: profile.team_size_range,
    founded_year: profile.founded_year,
    verified: profile.verified,
    l1_receipt_count: l1Count,
    members: memberList.filter((m) => m.username).map((m) => ({ username: m.username! })),
    atlasRoles: teamAtlasRoles,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`
        .t-card { background: #111118; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; transition: border-color 0.2s; }
        .t-card:hover { border-color: rgba(255,255,255,0.15); }
        .t-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #555568; margin-bottom: 1rem; font-family: monospace; }
        .t-tag { background: rgba(108,99,255,0.15); color: #a78bfa; border: 1px solid rgba(108,99,255,0.25); font-size: 12px; font-weight: 500; padding: 0.3rem 0.75rem; border-radius: 20px; }
        .t-link { color: #a78bfa; text-decoration: none; }
        @media (max-width: 640px) { .t-hero { flex-direction: column !important; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f5', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

          {preview && (
            <div style={{ background: 'rgba(254,188,46,0.1)', border: '1px solid rgba(254,188,46,0.3)', borderRadius: 12, padding: '0.9rem 1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600 }}>
                Preview — this team is not yet published. Visitors see a 404.{' '}
                <a href={`/team/${entity.slug}/edit`} className="t-link" style={{ color: '#fbbf24', textDecoration: 'underline' }}>Publish in your team settings →</a>
              </p>
            </div>
          )}

          {/* Hero */}
          <div className="t-hero" style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            <div style={{
              width: 88, height: 88, borderRadius: 20, flexShrink: 0, overflow: 'hidden',
              background: profile.logo_url ? 'transparent' : 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, color: 'white',
            }}>
              {profile.logo_url
                ? <img src={profile.logo_url} alt={profile.team_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{profile.team_name}</h1>
                {profile.verified && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', padding: '0.25rem 0.7rem', borderRadius: 20, letterSpacing: '0.06em', fontFamily: 'monospace' }}>🛡 VERIFIED</span>
                )}
              </div>
              {profile.tagline && <p style={{ fontSize: 16, color: '#8888a0', marginBottom: '0.4rem' }}>{profile.tagline}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {profile.location && <span style={{ fontSize: 14, color: '#555568' }}>📍 {profile.location}</span>}
                {profile.team_size_range && <span style={{ fontSize: 14, color: '#555568' }}>👥 {profile.team_size_range}</span>}
                {profile.founded_year && <span style={{ fontSize: 14, color: '#555568' }}>Est. {profile.founded_year}</span>}
              </div>
              {/* Contact CTA — only on a publicly-viewable team (not the admin preview). */}
              {!preview && (
                <div style={{ marginTop: '0.9rem' }}>
                  <ContactTeamButton
                    teamEntityId={entity.id}
                    teamName={profile.team_name}
                    slug={entity.slug}
                    loggedIn={!!user}
                    isAdmin={viewerIsAdmin}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Services */}
          {services.length > 0 && (
            <div className="t-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
              <p className="t-label">Services</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {services.map((s) => <span key={s} className="t-tag">{s}</span>)}
              </div>
            </div>
          )}

          {/* About */}
          {profile.description && (
            <div className="t-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
              <p className="t-label">About</p>
              <p style={{ fontSize: 15, color: '#8888a0', lineHeight: 1.8, fontWeight: 300 }}>{profile.description}</p>
              {profile.website_url && (
                <p style={{ marginTop: '1rem' }}>
                  <a href={profile.website_url} target="_blank" className="t-link" style={{ fontSize: 13, fontWeight: 500 }}>{profile.website_url} →</a>
                </p>
              )}
            </div>
          )}

          {/* Proof of work */}
          {l1Count > 0 && (
            <div className="t-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
              <p className="t-label">Proof of work</p>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{l1Count}</p>
                  <p style={{ fontSize: 11, color: '#555568', fontFamily: 'monospace', letterSpacing: '0.06em' }}>VERIFIED RECEIPTS</p>
                </div>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{distinctHosts}</p>
                  <p style={{ fontSize: 11, color: '#555568', fontFamily: 'monospace', letterSpacing: '0.06em' }}>DISTINCT HOSTS</p>
                </div>
                {lastShipped && (
                  <div>
                    <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{new Date(lastShipped).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                    <p style={{ fontSize: 11, color: '#555568', fontFamily: 'monospace', letterSpacing: '0.06em' }}>LAST SHIPPED</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent shipped */}
          {receipts.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="t-label">Recent shipped work <span style={{ color: '#555568', fontWeight: 400 }}>({receipts.length})</span></p>
              {receipts.map((r: any) => (
                <a key={r.id} href={`/p/${r.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div className="t-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: 15, fontWeight: 600, marginBottom: '0.4rem', letterSpacing: '-0.01em' }}>{r.title}</p>
                    {r.description && (
                      <p style={{ fontSize: 13, color: '#8888a0', lineHeight: 1.6, fontWeight: 300 }}>
                        {r.description.length > 140 ? r.description.slice(0, 139) + '…' : r.description}
                      </p>
                    )}
                    {((Array.isArray(r.atlas_confirmed) && r.atlas_confirmed.length > 0) ||
                      (Array.isArray(r.atlas_inferred) && r.atlas_inferred.length > 0)) && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {(r.atlas_confirmed ?? []).map((roleId: string) => (
                          <span key={`c-${roleId}`} className="t-tag">{roleId}</span>
                        ))}
                        {(r.atlas_inferred ?? [])
                          .filter((roleId: string) => !(r.atlas_confirmed ?? []).includes(roleId))
                          .map((roleId: string) => (
                            <span key={`i-${roleId}`} className="t-tag" style={{ opacity: 0.55 }}>{roleId} · inferred</span>
                          ))}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* People */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="t-label">People</p>
            {memberList.length === 0 ? (
              <div className="t-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#8888a0' }}>Team members can link themselves from their own profile.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {memberList.map((m) => {
                  const displayName = m.full_name || m.username || (m.team_role === 'owner' ? 'Owner' : 'Admin')
                  const mInitials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
                  const teamRoleLabel = m.team_role === 'owner' ? 'Owner' : m.team_role === 'admin' ? 'Admin' : null
                  const card = (
                    <div className="t-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>
                        {m.avatar_url ? <img src={m.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : mInitials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</p>
                        {(m.role || teamRoleLabel) && <p style={{ fontSize: 12, color: '#555568', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.role || teamRoleLabel}</p>}
                      </div>
                    </div>
                  )
                  // Only link to /u when the member has a builder profile (username).
                  return m.username
                    ? <a key={m.id} href={`/u/${m.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>{card}</a>
                    : <div key={m.id}>{card}</div>
                })}
              </div>
            )}
          </div>

          {/* Contact CTA */}
          {profile.contact_email && (
            <div style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(167,139,250,0.08) 100%)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', fontFamily: 'monospace' }}>READY TO HIRE?</p>
              <p style={{ fontSize: 17, fontWeight: 600, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>Hire {profile.team_name}</p>
              <a href={`mailto:${profile.contact_email}?subject=${encodeURIComponent('Hiring inquiry via ShipStacked')}`}
                style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: '#6c63ff', color: 'white', borderRadius: 20, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Contact this team →
              </a>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
