import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Metadata } from 'next'
import FeedClient from './FeedClient'

export const metadata: Metadata = {
  title: 'Build Feed',
  description: 'What AI-native builders are shipping right now. Real projects, real outcomes, real proof of work.',
  alternates: { canonical: 'https://shipstacked.com/feed' },
  openGraph: {
    title: 'Build Feed — ShipStacked',
    description: 'What AI-native builders are shipping right now.',
    url: 'https://shipstacked.com/feed',
  },
}

export default async function FeedPage() {
  const supabase = await createServerSupabaseClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles(username, full_name, avatar_url, verified, github_connected)')
    .order('created_at', { ascending: false })
    .limit(20)

  // Get current user's profile_id for delete ownership check
  const { data: { user } } = await supabase.auth.getUser()
  let currentUserProfileId: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
    currentUserProfileId = profile?.id
  }

  return <FeedClient initialPosts={posts || []} currentUserProfileId={currentUserProfileId} />
}
