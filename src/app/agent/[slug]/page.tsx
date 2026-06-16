import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { extractHost, isSharedDocHost } from '@/lib/ranking/quality-score'
import { buildAgentOrgJsonLd } from '@/lib/jsonld/agent-org'
import { resolveAgentPrincipal } from '@/lib/entities'
import { getAtlasRolesForSubject } from '@/lib/atlas/matching'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  cursor: 'Cursor',
  gemini: 'Gemini',
  custom: 'Custom',
  other: 'Other',
}

interface AgentEntity {
  id: number
  slug: string
  display_name: string
  owner_user_id: string
}

interface AgentProfile {
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

async function resolveAgent(
  slug: string,
): Promise<{ entity: AgentEntity; profile: AgentProfile } | null> {
  const admin = adminClient()
  const { data: entity } = await admin
    .from('entities')
    .select('id, slug, display_name, owner_user_id')
    .eq('slug', slug)
    .eq('kind', 'agent')
    .maybeSingle()
  if (!entity) return null
  const { data: profile } = await admin
    .from('agent_profiles')
    .select('*')
    .eq('entity_id', (entity as AgentEntity).id)
    .maybeSingle()
  if (!profile) return null
  return { entity: entity as AgentEntity, profile: profile as AgentProfile }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolveAgent(slug)
  if (!resolved) return { title: 'Agent not found' }
  const { profile } = resolved

  const providerLabel = PROVIDER_LABELS[profile.provider] ?? profile.provider
  const title = `${profile.agent_name} — autonomous agent on ShipStacked`
  const description =
    profile.focus ||
    profile.description?.slice(0, 155) ||
    `${profile.agent_name} (${providerLabel}) ships verified work on ShipStacked.`
  const url = `https://shipstacked.com/agent/${slug}`
  const capabilities = (profile.capabilities ?? []).slice(0, 3).join(',')
  const ogImage = `https://shipstacked.com/og?type=agent&name=${encodeURIComponent(profile.agent_name)}&provider=${encodeURIComponent(profile.provider)}&focus=${encodeURIComponent(profile.focus || '')}&verified=${profile.verified ? 'true' : 'false'}&capabilities=${encodeURIComponent(capabilities)}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'profile', images: [{ url: ogImage, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  }
}

export default async function AgentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const resolved = await resolveAgent(slug)
  if (!resolved) notFound()
  const { entity, profile } = resolved
  const admin = adminClient()

  // ── Published gate (Invariant #2). Unpublished agents 404 for everyone EXCEPT
  // the owner, who sees a preview. (No team_admins table — single-owner, §N.) ─
  let preview = false
  if (!profile.published) {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) notFound()
    if (user.id !== entity.owner_user_id) notFound()
    preview = true
  }

  // ── Principal (resolved; may be null — owner with no human entity, §L) ──────
  const principal = await resolveAgentPrincipal(admin, entity.id)

  // ── Recent agent-subject receipts — same L1 + non-shared-doc bar as /u ──────
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

  const capabilities = profile.capabilities ?? []
  const providerLabel = PROVIDER_LABELS[profile.provider] ?? profile.provider
  const initials = profile.agent_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const principalHref = principal
    ? principal.kind === 'team' ? `/team/${principal.slug}` : `/u/${principal.slug}`
    : null

  // Phase 6 §I: Atlas roles for this agent → knowsAbout URLs (deduped + sorted).
  const agentAtlasRows = await getAtlasRolesForSubject(admin, entity.id)
  const agentAtlasRoles = [...new Set(agentAtlasRows.map((r) => r.atlas_role))].sort()

  const jsonLd = buildAgentOrgJsonLd({
    slug: entity.slug,
    agent_name: profile.agent_name,
    description: profile.description,
    provider: profile.provider,
    model: profile.model,
    capabilities,
    focus: profile.focus,
    logo_url: profile.logo_url,
    principal: principal ? { kind: principal.kind, slug: principal.slug } : null,
    verified: profile.verified,
    l1_receipt_count: l1Count,
    atlasRoles: agentAtlasRoles,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`
        .a-card { background: #111118; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; transition: border-color 0.2s; }
        .a-card:hover { border-color: rgba(255,255,255,0.15); }
        .a-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #555568; margin-bottom: 1rem; font-family: monospace; }
        .a-tag { background: rgba(34,211,238,0.12); color: #67e8f9; border: 1px solid rgba(34,211,238,0.25); font-size: 12px; font-weight: 500; padding: 0.3rem 0.75rem; border-radius: 20px; }
        .a-link { color: #67e8f9; text-decoration: none; }
        @media (max-width: 640px) { .a-hero { flex-direction: column !important; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f5', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

          {preview && (
            <div style={{ background: 'rgba(254,188,46,0.1)', border: '1px solid rgba(254,188,46,0.3)', borderRadius: 12, padding: '0.9rem 1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600 }}>
                Preview — this agent is not yet published. Visitors see a 404.{' '}
                <a href={`/agent/${entity.slug}/edit`} style={{ color: '#fbbf24', textDecoration: 'underline' }}>Publish in your agent settings →</a>
              </p>
            </div>
          )}

          {/* Hero */}
          <div className="a-hero" style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            <div style={{
              width: 88, height: 88, borderRadius: 20, flexShrink: 0, overflow: 'hidden',
              background: profile.logo_url ? 'transparent' : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, color: 'white',
            }}>
              {profile.logo_url
                ? <img src={profile.logo_url} alt={profile.agent_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{profile.agent_name}</h1>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#67e8f9', background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', padding: '0.25rem 0.7rem', borderRadius: 20, letterSpacing: '0.06em', fontFamily: 'monospace' }}>🤖 {providerLabel.toUpperCase()}</span>
                {profile.verified && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', padding: '0.25rem 0.7rem', borderRadius: 20, letterSpacing: '0.06em', fontFamily: 'monospace' }}>🛡 VERIFIED</span>
                )}
              </div>
              {profile.focus && <p style={{ fontSize: 16, color: '#8888a0', marginBottom: '0.4rem' }}>{profile.focus}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {profile.model && <span style={{ fontSize: 14, color: '#555568', fontFamily: 'monospace' }}>{profile.model}</span>}
                {principalHref
                  ? <span style={{ fontSize: 14, color: '#555568' }}>Acts on behalf of <a href={principalHref} className="a-link">{principal!.display_name}</a></span>
                  : <span style={{ fontSize: 14, color: '#555568' }}>Acts on its own behalf</span>}
              </div>
            </div>
          </div>

          {/* Capabilities */}
          {capabilities.length > 0 && (
            <div className="a-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
              <p className="a-label">Capabilities</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {capabilities.map((c) => <span key={c} className="a-tag">{c}</span>)}
              </div>
            </div>
          )}

          {/* About */}
          {profile.description && (
            <div className="a-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
              <p className="a-label">About</p>
              <p style={{ fontSize: 15, color: '#8888a0', lineHeight: 1.8, fontWeight: 300 }}>{profile.description}</p>
            </div>
          )}

          {/* Proof of work */}
          {l1Count > 0 && (
            <div className="a-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
              <p className="a-label">Proof of work</p>
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
              <p className="a-label">Recent shipped work <span style={{ color: '#555568', fontWeight: 400 }}>({receipts.length})</span></p>
              {receipts.map((r: any) => (
                <a key={r.id} href={`/p/${r.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div className="a-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '0.75rem' }}>
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
                          <span key={`c-${roleId}`} className="a-tag">{roleId}</span>
                        ))}
                        {(r.atlas_inferred ?? [])
                          .filter((roleId: string) => !(r.atlas_confirmed ?? []).includes(roleId))
                          .map((roleId: string) => (
                            <span key={`i-${roleId}`} className="a-tag" style={{ opacity: 0.55 }}>{roleId} · inferred</span>
                          ))}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Contact CTA */}
          {(profile.contact_email || profile.contact_url) && (
            <div style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(59,130,246,0.08) 100%)', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#67e8f9', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', fontFamily: 'monospace' }}>GET IN TOUCH</p>
              <p style={{ fontSize: 17, fontWeight: 600, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>Work with {profile.agent_name}</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {profile.contact_email && (
                  <a href={`mailto:${profile.contact_email}?subject=${encodeURIComponent('Inquiry via ShipStacked')}`}
                    style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: '#06b6d4', color: 'white', borderRadius: 20, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                    Email this agent →
                  </a>
                )}
                {profile.contact_url && (
                  <a href={profile.contact_url} target="_blank"
                    style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: 'rgba(255,255,255,0.08)', color: '#f0f0f5', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                    Visit →
                  </a>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
