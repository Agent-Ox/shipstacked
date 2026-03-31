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

  // Check subscription — must be active and not expired
  const now = new Date().toISOString()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, product, expires_at')
    .eq('email', user.email)
    .eq('status', 'active')
    .in('product', ['job_post', 'full_access'])
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()

  if (!sub) {
    redirect('/#pricing')
  }

  return <PostJobForm employerEmail={user.email!} />
}