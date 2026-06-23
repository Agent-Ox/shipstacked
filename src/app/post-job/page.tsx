import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import PostJobForm from './PostJobForm'

export default async function PostJobPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=/post-job')
  }

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
    redirect('/hirers#pricing')
  }

  // "Post as" options — teams/agents this user OWNS (display only; the insert
  // re-validates ownership server-side). Mirrors the paste flow's ownedEntities.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: ownedRows } = await admin
    .from('entities')
    .select('id, slug, display_name, kind')
    .eq('owner_user_id', user.id)
    .in('kind', ['team', 'agent'])
  const ownedIds = (ownedRows ?? []).map((e: any) => e.id)
  const [{ data: teamLogos }, { data: agentLogos }] = ownedIds.length
    ? await Promise.all([
        admin.from('team_profiles').select('entity_id, logo_url').in('entity_id', ownedIds),
        admin.from('agent_profiles').select('entity_id, logo_url').in('entity_id', ownedIds),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }]
  const logoByEntity = new Map<number, string | null>()
  for (const r of [...(teamLogos ?? []), ...(agentLogos ?? [])]) logoByEntity.set(r.entity_id, r.logo_url ?? null)
  const ownedEntities = (ownedRows ?? []).map((e: any) => ({
    id: e.id,
    slug: e.slug,
    display_name: e.display_name,
    kind: e.kind as 'team' | 'agent',
    logo_url: logoByEntity.get(e.id) ?? null,
  }))

  // Edit mode — read ?edit=jobId, fetch that job, pass as initialData
  const { edit: jobId } = await searchParams
  let initialData = undefined

  if (jobId) {
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('employer_email', user.email) // only own jobs
      .maybeSingle()

    if (job) {
      initialData = {
        company_name: job.company_name || '',
        role_title: job.role_title || '',
        description: job.description || '',
        requirements: job.requirements || '',
        salary_range: job.salary_range || '',
        location: job.location || '',
        employment_type: job.employment_type || 'full-time',
        skills: job.skills || [],
      }
    }
  }

  return (
    <PostJobForm
      hirerEmail={user.email!}
      jobId={jobId}
      initialData={initialData}
      ownedEntities={ownedEntities}
    />
  )
}
