import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { ATLAS_VERSION_DEFAULT } from '@/lib/atlas/roles'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://shipstacked.com'

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/feed`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/jobs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/hirers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/talent`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/join`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/api-docs`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Builder profile pages
  const { data: profiles } = await admin
    .from('profiles')
    .select('username, created_at')
    .eq('published', true)

  const profilePages: MetadataRoute.Sitemap = (profiles || []).map(profile => ({
    url: `${base}/u/${profile.username}`,
    lastModified: new Date(profile.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Active job pages
  const { data: jobs } = await admin
    .from('jobs')
    .select('id, created_at')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())

  const jobPages: MetadataRoute.Sitemap = (jobs || []).map(job => ({
    url: `${base}/jobs/${job.id}`,
    lastModified: new Date(job.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Stage 5d: the /company/<slug> employer_profiles sitemap block is removed —
  // hiring orgs are now published team/org entities, already sitemapped as
  // /team/<slug> by the published-team block (Stage F). /company/[slug] is a
  // redirect-stub, not a canonical URL.

  // Feed posts (individual build pages)
  const { data: posts } = await admin
    .from('posts')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  const feedPages: MetadataRoute.Sitemap = (posts || []).map(post => ({
    url: `${base}/feed/${post.id}`,
    lastModified: new Date(post.created_at),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  // Per-capability answer pages (Stage C) — one crawlable /talent/<slug> per
  // canonical capability/tool/domain in the vocabulary.
  const { data: caps } = await admin
    .from('capability_vocab')
    .select('slug')

  const capabilityPages: MetadataRoute.Sitemap = (caps || []).map(cap => ({
    url: `${base}/talent/${cap.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Published team pages (Stage F). The slug lives on `entities`; the
  // published flag lives on `team_profiles` — inner-join gates on it,
  // mirroring src/app/api/teams/search/route.ts. Unpublished teams 404
  // (Invariant #2), so they never enter the sitemap.
  const { data: teams } = await admin
    .from('entities')
    .select('slug, updated_at, team_profiles!inner(published)')
    .eq('kind', 'team')
    .eq('team_profiles.published', true)

  const teamPages: MetadataRoute.Sitemap = (teams || []).map(team => ({
    url: `${base}/team/${team.slug}`,
    lastModified: new Date(team.updated_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Published agent pages (Stage F). Same shape as teams — slug on
  // `entities`, published on `agent_profiles`.
  const { data: agents } = await admin
    .from('entities')
    .select('slug, updated_at, agent_profiles!inner(published)')
    .eq('kind', 'agent')
    .eq('agent_profiles.published', true)

  const agentPages: MetadataRoute.Sitemap = (agents || []).map(agent => ({
    url: `${base}/agent/${agent.slug}`,
    lastModified: new Date(agent.updated_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Atlas role definition pages (Stage F) — one per role in the default
  // Atlas version. Each dereferences to DefinedTerm JSON-LD via .json/Accept.
  const { data: atlasRoles } = await admin
    .from('atlas_roles')
    .select('role_id, created_at')
    .eq('atlas_version', ATLAS_VERSION_DEFAULT)

  const atlasRolePages: MetadataRoute.Sitemap = (atlasRoles || []).map(role => ({
    url: `${base}/atlas/roles/${role.role_id}`,
    lastModified: new Date(role.created_at || new Date()),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Public proof-receipt pages (Stage F). Only visibility='public' receipts
  // are crawlable; unlisted/private are excluded by the filter. Capped at a
  // sane ceiling (well above current volume).
  const { data: receipts } = await admin
    .from('proof_receipts')
    .select('slug, issued_at')
    .eq('visibility', 'public')
    .order('issued_at', { ascending: false })
    .limit(1000)

  const receiptPages: MetadataRoute.Sitemap = (receipts || []).map(receipt => ({
    url: `${base}/p/${receipt.slug}`,
    lastModified: new Date(receipt.issued_at || new Date()),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  return [
    ...staticPages,
    ...profilePages,
    ...jobPages,
    ...feedPages,
    ...capabilityPages,
    ...teamPages,
    ...agentPages,
    ...atlasRolePages,
    ...receiptPages,
  ]
}
