import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PostJobForm from './PostJobForm'

export default async function PostJobPage() {
  const supabase = await createServerSupabaseClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=/post-job')
  }

  // Check subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('email', user.email)
    .in('product', ['job_post', 'full_access'])
    .eq('status', 'active')
    .maybeSingle()

  if (!sub) {
    redirect('/#pricing?message=subscription_required')
  }

  return <PostJobForm employerEmail={user.email!} />
}