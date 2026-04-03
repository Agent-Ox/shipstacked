import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import EmployerDashboardClient from './EmployerDashboardClient'

export default async function EmployerDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('email', user.email)
    .eq('status', 'active')
    .eq('product', 'full_access')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()

  if (!sub) redirect('/#pricing')

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('employer_email', user.email)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: employerProfile } = await supabase
    .from('employer_profiles')
    .select('*')
    .eq('email', user.email)
    .maybeSingle()

  const jobIds = (jobs || []).map(j => j.id)
  const { data: applications } = jobIds.length > 0
    ? await supabase
        .from('applications')
        .select('*')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const createdAt = new Date(sub.created_at)
  const renewsAt = new Date(createdAt)
  renewsAt.setMonth(renewsAt.getMonth() + 1)
  const renewsString = renewsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <EmployerDashboardClient
      email={user.email!}
      renewsString={renewsString}
      jobs={jobs || []}
      employerProfile={employerProfile}
      applications={applications || []}
    />
  )
}
