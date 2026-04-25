import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

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
    { url: `${base}/employers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/talent`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
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

  // Public company profiles
  const { data: companies } = await admin
    .from('employer_profiles')
    .select('slug, updated_at')
    .eq('public', true)
    .not('slug', 'is', null)

  const companyPages: MetadataRoute.Sitemap = (companies || []).map(company => ({
    url: `${base}/company/${company.slug}`,
    lastModified: new Date(company.updated_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

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

  return [...staticPages, ...profilePages, ...jobPages, ...companyPages, ...feedPages]
}
