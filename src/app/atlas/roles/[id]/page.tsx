import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ATLAS_VERSION_DEFAULT,
  getAtlasRole,
  getRecentReceiptsAtRole,
  isValidAtlasVersion,
  extractAdjacentRoleIds,
} from '@/lib/atlas/roles'
import { atlasRoleCanonicalUrl, atlasRoleJsonLd } from '@/lib/atlas/jsonld'

export const dynamic = 'force-dynamic'

const TRAJECTORY_COPY: Record<string, { dot: string; label: string }> = {
  resistant: { dot: '🟢', label: 'Resistant to automation' },
  partial: { dot: '🟡', label: 'Partial automation trajectory' },
  collapsible: { dot: '🔴', label: 'Collapsible — likely to consolidate' },
}

const CROSSWALK_LABELS: Record<string, string> = {
  confident: 'confident match',
  partial: 'partial match',
  gap: 'no existing taxonomy match',
  combined: 'spans multiple taxonomies',
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function resolveVersion(raw: string | undefined): string {
  if (!raw) return ATLAS_VERSION_DEFAULT
  if (isValidAtlasVersion(raw)) return raw
  return ATLAS_VERSION_DEFAULT
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ v?: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { v } = await searchParams
  const version = resolveVersion(v)
  const role = await getAtlasRole(adminClient(), id.toUpperCase(), version)
  if (!role) return { title: 'Atlas role not found · ShipStacked' }
  const canonical = atlasRoleCanonicalUrl(role.role_id, role.atlas_version)
  return {
    title: `${role.role_id}: ${role.name} — ShipStacked Atlas ${role.atlas_version}`,
    description: role.short_description,
    alternates: {
      canonical,
      types: {
        'application/ld+json': `https://shipstacked.com/atlas/roles/${role.role_id}.json?v=${role.atlas_version}`,
      },
    },
    openGraph: {
      title: `${role.role_id}: ${role.name}`,
      description: role.short_description,
      type: 'article',
      url: canonical,
    },
  }
}

export default async function AtlasRolePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ v?: string }>
}) {
  const { id } = await params
  const { v } = await searchParams
  const version = resolveVersion(v)
  const admin = adminClient()
  const roleId = id.toUpperCase()
  const role = await getAtlasRole(admin, roleId, version)
  if (!role) notFound()

  const recent = await getRecentReceiptsAtRole(admin, role.role_id, role.atlas_version)
  const jsonLd = atlasRoleJsonLd(role, recent)
  const canonical = atlasRoleCanonicalUrl(role.role_id, role.atlas_version)

  const trajectory = role.automation_trajectory ? TRAJECTORY_COPY[role.automation_trajectory] : null
  const adjacent = extractAdjacentRoleIds(role.long_description_md)

  const hasCrosswalks = !!(role.isco_08_code || role.soc_2018_code || role.onet_code)
  const hasEuAiAct = (role.eu_ai_act_articles && role.eu_ai_act_articles.length > 0)
    || (role.iso_42001_sections && role.iso_42001_sections.length > 0)

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: '2rem 1.5rem 4rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '2rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        <p style={{ fontSize: 12, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>
          Cluster {role.cluster} · Atlas {role.atlas_version}
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', color: '#1d1d1f', margin: '0.5rem 0 0.5rem', lineHeight: 1.1 }}>
          <span style={{ fontFamily: 'monospace', color: '#0071e3', marginRight: '0.5rem' }}>{role.role_id}</span>
          — {role.name}
        </h1>
        <p style={{ fontSize: 17, color: '#1d1d1f', lineHeight: 1.5, margin: '0.75rem 0 1.25rem' }}>
          {role.short_description}
        </p>

        {trajectory && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.8rem', borderRadius: 999, background: '#f4f4f6', border: '1px solid #e3e3e8', fontSize: 13, color: '#1d1d1f' }}>
            <span aria-hidden="true">{trajectory.dot}</span>
            <span>{trajectory.label}</span>
          </div>
        )}

        <hr style={{ border: 0, borderTop: '1px solid #ececf0', margin: '2rem 0' }} />

        {role.long_description_md ? (
          <div style={{ fontSize: 15, color: '#1d1d1f', lineHeight: 1.55 }}>
            <Markdown remarkPlugins={[remarkGfm]}>{role.long_description_md}</Markdown>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: '#6e6e73', fontStyle: 'italic' }}>
            Full role definition lives in the Atlas. Open{' '}
            <Link href={`/atlas#${role.role_id.toLowerCase()}`} style={{ color: '#0071e3' }}>
              the Atlas
            </Link>{' '}
            for the long-form description.
          </p>
        )}

        {hasCrosswalks && (
          <Section label="Crosswalks">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.35rem', fontSize: 14, color: '#1d1d1f' }}>
              {role.isco_08_code && (
                <li>
                  <strong>ISCO-08:</strong> {role.isco_08_code}
                </li>
              )}
              {role.soc_2018_code && (
                <li>
                  <strong>SOC 2018:</strong> {role.soc_2018_code}
                </li>
              )}
              {role.onet_code && (
                <li>
                  <strong>O*NET:</strong> {role.onet_code}
                </li>
              )}
              {role.crosswalk_status && (
                <li style={{ color: '#6e6e73', fontSize: 13, marginTop: '0.25rem' }}>
                  Status: {CROSSWALK_LABELS[role.crosswalk_status] ?? role.crosswalk_status}
                </li>
              )}
            </ul>
          </Section>
        )}

        {hasEuAiAct && (
          <Section label="EU AI Act">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.35rem', fontSize: 14, color: '#1d1d1f' }}>
              {role.eu_ai_act_articles && role.eu_ai_act_articles.length > 0 && (
                <li>
                  <strong>Articles:</strong> {role.eu_ai_act_articles.join(', ')}
                </li>
              )}
              {role.iso_42001_sections && role.iso_42001_sections.length > 0 && (
                <li>
                  <strong>ISO 42001:</strong> {role.iso_42001_sections.join(', ')}
                </li>
              )}
            </ul>
          </Section>
        )}

        <Section label="Recent receipts at this role">
          {recent.length === 0 ? (
            <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>
              No public receipts at this role yet. Be the first.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
              {recent.map((r) => (
                <li
                  key={r.slug}
                  style={{ padding: '0.6rem 0.85rem', background: 'white', border: '1px solid #ececf0', borderRadius: 10 }}
                >
                  <Link href={`/p/${r.slug}`} style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>
                    {r.title}
                  </Link>
                  <div style={{ fontSize: 13, color: '#6e6e73', marginTop: '0.15rem' }}>
                    by{' '}
                    <Link
                      href={
                        r.subject_kind === 'team' ? `/team/${r.subject_slug}` :
                        r.subject_kind === 'agent' ? `/agent/${r.subject_slug}` :
                        `/u/${r.subject_slug}`
                      }
                      style={{ color: '#0071e3', textDecoration: 'none' }}
                    >
                      {r.subject_name}
                    </Link>{' '}
                    ·{' '}
                    <time dateTime={r.issued_at}>
                      {new Date(r.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {adjacent.length > 0 && (
          <Section label="Adjacent roles">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {adjacent.map((aid) => (
                <li key={aid}>
                  <Link
                    href={`/atlas/roles/${aid}?v=${role.atlas_version}`}
                    style={{ display: 'inline-block', padding: '0.3rem 0.65rem', borderRadius: 999, background: '#f4f4f6', border: '1px solid #e3e3e8', fontSize: 13, color: '#1d1d1f', textDecoration: 'none' }}
                  >
                    <span style={{ fontFamily: 'monospace', color: '#0071e3', fontWeight: 600 }}>{aid}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section label="Reference">
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, lineHeight: 1.5 }}>
            atlas_version: <code style={{ background: '#f4f4f6', padding: '1px 5px', borderRadius: 4 }}>{role.atlas_version}</code>
            <br />
            atlas_url:{' '}
            <Link href={`/atlas#${role.role_id.toLowerCase()}`} style={{ color: '#0071e3' }}>
              {role.role_id} in the Atlas
            </Link>
            <br />
            jsonld:{' '}
            <a href={`${canonical.split('?')[0]}.json?v=${role.atlas_version}`} style={{ color: '#0071e3' }}>
              {role.role_id}.json
            </a>
          </p>
        </Section>
      </div>
    </div>
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
