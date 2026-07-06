import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { loadVocab, getVocabByLayer, type CapabilityVocabEntry } from '@/lib/capability/vocab'
import { getSubjectsForCapability, type CapabilityBuilder, type CapabilityOrg } from '@/lib/capability/practitioners'
import { buildItemListJsonLd } from '@/lib/jsonld/item-list'
import { CANONICAL_HOST, personId, teamOrgId, agentOrgId } from '@/lib/jsonld/context'
import { ATLAS_VERSION_DEFAULT } from '@/lib/atlas/roles'

// Stage C: per-capability answer pages. Statically generated for every vocab
// slug (generateStaticParams) + revalidated hourly (ISR) — mirrors the atlas
// role page's role as a crawlable, machine-citable SEO surface (the atlas page
// is force-dynamic; here we pre-render because the whole point is a static page
// per capability the sitemap can point crawlers/LLMs at).
export const revalidate = 3600

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const LAYER_LABEL: Record<string, string> = { tool: 'Tool', capability: 'Capability', domain: 'Domain' }

async function resolveEntry(slug: string): Promise<{ entry: CapabilityVocabEntry; vocab: CapabilityVocabEntry[] } | null> {
  const vocab = await loadVocab(adminClient())
  const target = slug.trim().toLowerCase()
  const entry = vocab.find((v) => v.slug.toLowerCase() === target) ?? null
  return entry ? { entry, vocab } : null
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const vocab = await loadVocab(adminClient())
  return vocab.map((v) => ({ slug: v.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolveEntry(slug)
  if (!resolved) return { title: 'Capability not found · ShipStacked' }
  const { entry } = resolved
  const canonical = `${CANONICAL_HOST}/talent/${entry.slug}`
  const description =
    `Proof-verified ${entry.label} builders on ShipStacked — ranked by real shipped work, ` +
    `verified from public artifacts. ${entry.description ?? 'Browse the proof-backed directory.'}`.slice(0, 200)
  return {
    title: `${entry.label} builders — ranked by proof of work | ShipStacked`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${entry.label} builders on ShipStacked`,
      description,
      type: 'website',
      url: canonical,
    },
  }
}

export default async function CapabilityTalentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const resolved = await resolveEntry(slug)
  if (!resolved) notFound()
  const { entry, vocab } = resolved
  const admin = adminClient()

  const { builders, teams, agents } = await getSubjectsForCapability(admin, entry.slug, vocab)
  const totalSubjects = builders.length + teams.length + agents.length

  // Related Atlas roles (from the crosswalk) + sibling capabilities (same layer).
  const { data: xw } = await admin
    .from('capability_atlas_crosswalk')
    .select('atlas_role_id')
    .eq('capability_slug', entry.slug)
  const roleIds = [...new Set((xw ?? []).map((r: any) => r.atlas_role_id))]
  let relatedRoles: { role_id: string; name: string }[] = []
  if (roleIds.length > 0) {
    const { data: roles } = await admin
      .from('atlas_roles')
      .select('role_id, name')
      .in('role_id', roleIds)
      .eq('atlas_version', ATLAS_VERSION_DEFAULT)
    relatedRoles = (roles ?? []) as any
  }
  const siblings = getVocabByLayer(vocab, entry.layer).filter((v) => v.slug !== entry.slug).slice(0, 10)

  // ItemList JSON-LD over the FULL ranked list (machine-citable).
  const itemListLd = buildItemListJsonLd({
    listUrl: `${CANONICAL_HOST}/talent/${entry.slug}`,
    listName: `${entry.label} builders on ShipStacked, ranked by verified proof of work`,
    items: [
      ...builders.map((b) => ({ url: personId(b.username), id: personId(b.username), name: b.full_name?.trim() || b.username })),
      ...teams.map((t) => ({ url: teamOrgId(t.slug), id: teamOrgId(t.slug), name: t.name })),
      ...agents.map((a) => ({ url: agentOrgId(a.slug), id: agentOrgId(a.slug), name: a.name })),
    ],
  })

  const count = totalSubjects
  const lead = count > 0
    ? `These are the ${count} proof-verified ${entry.label} builders, teams, and agents on ShipStacked, ranked by verified proof of work. Each has shipped real, reachable ${entry.label} work — verified from public artifacts like GitHub repos and live deployments, not demos or claims. The order reflects the breadth, consistency, and recency of their proven work.`
    : `No builders, teams, or agents have proven ${entry.label} work on ShipStacked yet. They rank here by shipping real, verifiable ${entry.label} projects — confirmed from public artifacts, not claims. Check back as the directory grows.`

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: '2rem 1.5rem 4rem' }}>
      {itemListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      )}

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '2rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        <p style={{ fontSize: 12, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>
          {LAYER_LABEL[entry.layer] ?? 'Capability'} · <Link href="/talent" style={{ color: '#0071e3', textDecoration: 'none' }}>Talent directory</Link>
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.025em', color: '#1d1d1f', margin: '0.5rem 0 0.75rem', lineHeight: 1.1 }}>
          {entry.label} builders
        </h1>

        {/* Answer-first lead — the GEO-critical block */}
        <p style={{ fontSize: 17, color: '#1d1d1f', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
          {lead}
        </p>

        {builders.length > 0 && (
          <Section label="Builders">
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {builders.map((b) => <BuilderRow key={b.username} b={b} />)}
            </div>
          </Section>
        )}

        {teams.length > 0 && (
          <Section label="Teams & agencies">
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {teams.map((t) => <OrgRow key={`team-${t.slug}`} o={t} />)}
            </div>
          </Section>
        )}

        {agents.length > 0 && (
          <Section label="Agents">
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {agents.map((a) => <OrgRow key={`agent-${a.slug}`} o={a} />)}
            </div>
          </Section>
        )}

        {relatedRoles.length > 0 && (
          <Section label="Atlas roles this maps to">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {relatedRoles.map((r) => (
                <li key={r.role_id}>
                  <Link href={`/atlas/roles/${r.role_id}`} style={{ display: 'inline-block', padding: '0.35rem 0.7rem', borderRadius: 999, background: '#f4f4f6', border: '1px solid #e3e3e8', fontSize: 13, color: '#1d1d1f', textDecoration: 'none' }}>
                    <span style={{ fontFamily: 'monospace', color: '#0071e3', fontWeight: 600 }}>{r.role_id}</span> {r.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {siblings.length > 0 && (
          <Section label={`Other ${LAYER_LABEL[entry.layer]?.toLowerCase() ?? 'capabilitie'}s`}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link href={`/talent/${s.slug}`} style={{ display: 'inline-block', padding: '0.35rem 0.7rem', borderRadius: 999, background: 'white', border: '1px solid #ececf0', fontSize: 13, color: '#1d1d1f', textDecoration: 'none' }}>
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section label="Browse">
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, lineHeight: 1.5 }}>
            <Link href={`/talent?capability=${entry.slug}`} style={{ color: '#0071e3', textDecoration: 'none' }}>Filter the full directory by {entry.label} →</Link>{'   '}
            <Link href="/talent" style={{ color: '#0071e3', textDecoration: 'none' }}>All builders →</Link>{'   '}
            <Link href="/atlas" style={{ color: '#0071e3', textDecoration: 'none' }}>The AI Atlas →</Link>
          </p>
        </Section>
      </div>
    </div>
  )
}

function BuilderRow({ b }: { b: CapabilityBuilder }) {
  const initials = (b.full_name || b.username).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link href={`/u/${b.username}`} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', background: 'white', border: '1px solid #ececf0', borderRadius: 12, textDecoration: 'none' }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#0071e3' }}>
        {b.avatar_url ? <img src={b.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{b.full_name || b.username}</span>
          {b.ranked
            ? <span style={{ fontSize: 11, fontWeight: 600, color: '#1a7f37', background: '#e3f3e3', borderRadius: 999, padding: '0.1rem 0.5rem' }}>Ranked</span>
            : <span style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', background: '#f4f4f6', borderRadius: 999, padding: '0.1rem 0.5rem' }}>Not yet ranked</span>}
        </div>
        {b.role && <p style={{ fontSize: 13, color: '#6e6e73', margin: '0.1rem 0 0' }}>{b.role}</p>}
      </div>
      <span style={{ flexShrink: 0, fontSize: 12, color: '#6e6e73', background: '#f4f4f6', borderRadius: 999, padding: '0.2rem 0.6rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {b.receipt_count} proof receipt{b.receipt_count === 1 ? '' : 's'}
      </span>
    </Link>
  )
}

function OrgRow({ o }: { o: CapabilityOrg }) {
  const href = o.kind === 'team' ? `/team/${o.slug}` : `/agent/${o.slug}`
  const icon = o.kind === 'team' ? '👥' : '🤖'
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', background: 'white', border: '1px solid #ececf0', borderRadius: 12, textDecoration: 'none' }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: '#f4f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {o.logo_url ? <img src={o.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span aria-hidden="true">{icon}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{o.name}</span>
          {o.ranked
            ? <span style={{ fontSize: 11, fontWeight: 600, color: '#1a7f37', background: '#e3f3e3', borderRadius: 999, padding: '0.1rem 0.5rem' }}>Ranked</span>
            : <span style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', background: '#f4f4f6', borderRadius: 999, padding: '0.1rem 0.5rem' }}>Not yet ranked</span>}
        </div>
        <p style={{ fontSize: 13, color: '#6e6e73', margin: '0.1rem 0 0' }}>{o.kind === 'team' ? 'Team / agency' : 'Agent'}</p>
      </div>
      <span style={{ flexShrink: 0, fontSize: 12, color: '#6e6e73', background: '#f4f4f6', borderRadius: 999, padding: '0.2rem 0.6rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {o.receipt_count} proof receipt{o.receipt_count === 1 ? '' : 's'}
      </span>
    </Link>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.75rem' }}>
        {label}
      </h2>
      {children}
    </section>
  )
}
