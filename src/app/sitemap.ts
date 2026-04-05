import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://shipstacked.com'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/join`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/jobs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/feed`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  // Dynamic profile pages
  const { data: profiles } = await supabase
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
  const { data: jobs } = await supabase
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

  return [...staticPages, ...profilePages, ...jobPages]
}