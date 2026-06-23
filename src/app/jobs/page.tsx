import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import JobsClient from './JobsClient'
import { buildItemListJsonLd } from '@/lib/jsonld/item-list'
import { CANONICAL_HOST, jobPostingId } from '@/lib/jsonld/context'
import { getEntityModes } from '@/lib/user'

export const metadata: Metadata = {
  title: 'AI-Native Jobs',
  description: 'Browse open roles at companies hiring AI-native builders, prompt engineers, and AI automation specialists. Verified talent. Direct applications.',
  alternates: { canonical: 'https://shipstacked.com/jobs' },
  openGraph: {
    title: 'AI-Native Jobs — ShipStacked',
    description: 'Browse open roles at companies hiring AI-native builders, prompt engineers, and AI automation specialists.',
    url: 'https://shipstacked.com/jobs',
  },
}

export default async function JobsPage() {
  const { user, modes } = await getEntityModes()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Active jobs
  const { data: jobs } = await admin
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  // Bulk fetch hirer logos
  const jobList = jobs || []
  const hirerEmails = [...new Set(jobList.map((j: any) => j.employer_email))]
  const { data: hirerProfileRows } = hirerEmails.length > 0
    ? await admin.from('employer_profiles').select('email, logo_url, slug').in('email', hirerEmails)
    : { data: [] }
  const hirerMap = Object.fromEntries((hirerProfileRows || []).map((e: any) => [e.email, e]))

  // Team/agent-posted jobs (subject_entity_id) — fetch the entity identity +
  // logo so the card can show the team/agent instead of the email-based hirer.
  // Jobs with null subject_entity_id are untouched (the existing path below).
  const subjectIds = [...new Set(jobList.map((j: any) => j.subject_entity_id).filter(Boolean))]
  let subjectMap: Record<number, { display_name: string; slug: string; kind: string; logo_url: string | null }> = {}
  if (subjectIds.length > 0) {
    const [{ data: subjEntities }, { data: subjTeamLogos }, { data: subjAgentLogos }] = await Promise.all([
      admin.from('entities').select('id, display_name, slug, kind').in('id', subjectIds),
      admin.from('team_profiles').select('entity_id, logo_url').in('entity_id', subjectIds),
      admin.from('agent_profiles').select('entity_id, logo_url').in('entity_id', subjectIds),
    ])
    const logoBy = new Map<number, string | null>()
    for (const r of [...(subjTeamLogos || []), ...(subjAgentLogos || [])]) logoBy.set(r.entity_id, r.logo_url ?? null)
    subjectMap = Object.fromEntries((subjEntities || []).map((e: any) => [e.id, {
      display_name: e.display_name, slug: e.slug, kind: e.kind, logo_url: logoBy.get(e.id) ?? null,
    }]))
  }

  const jobsWithLogos = jobList.map((j: any) => ({
    ...j,
    employer_profile: hirerMap[j.employer_email] || null,
    subject_profile: j.subject_entity_id ? (subjectMap[j.subject_entity_id] || null) : null,
  }))

  // Builder: which jobs have they already applied to?
  let appliedJobIds: string[] = []
  if (modes.builder && user) {
    const { data: applications } = await admin
      .from('applications')
      .select('job_id')
      .eq('builder_email', user.email)
    appliedJobIds = applications?.map((a: any) => a.job_id) || []
  }

  // Beacon 1 — ItemList of active JobPostings. Query above already filters
  // status='active' AND expires_at > now() so paused/expired jobs are
  // excluded. Empty-suppressed (null when 0 active jobs — currently always).
  const jobsItemListLd = buildItemListJsonLd({
    listUrl: `${CANONICAL_HOST}/jobs`,
    listName: 'Open AI-native roles on ShipStacked',
    items: jobList.map((j: any) => ({
      url: jobPostingId(j.id),
      id: jobPostingId(j.id),
      name: j.role_title,
    })),
  })

  return (
    <>
      {jobsItemListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobsItemListLd) }} />
      )}
      <JobsClient
        jobs={jobsWithLogos}
        modes={modes}
        appliedJobIds={appliedJobIds}
      />
    </>
  )
}
