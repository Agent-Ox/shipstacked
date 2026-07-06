import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// Team/agent-attributed job posting (GAP 2, Option B).
//
// The personal-post path stays direct-to-supabase in PostJobForm (light
// validation, RLS-scoped to the poster's own email). Posting AS a team/agent
// needs a server-side ownership check that the browser path can't enforce, so
// the form routes ONLY the team case here. The insert shape mirrors the browser
// insert exactly, apart from the validated subject_entity_id.
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const {
    subject_entity_id,
    company_name, role_title, description, requirements,
    salary_range, day_rate, location, employment_type,
    skills, timezone, urgency, hiring_for, anonymous,
  } = body

  if (!subject_entity_id) {
    return NextResponse.json({ error: 'subject_entity_id required' }, { status: 400 })
  }
  if (!role_title?.trim() || !company_name?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Company name, role title and description are required.' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Subscription gate — the OWNER's active job_post/full_access sub. Mirrors
  // the post-job page gate (src/app/post-job/page.tsx).
  const now = new Date().toISOString()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('email', user.email)
    .eq('status', 'active')
    .in('product', ['job_post', 'full_access'])
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()
  if (!sub) {
    return NextResponse.json({ error: 'An active job-posting subscription is required.' }, { status: 402 })
  }

  // Ownership check — mirrors the paste publish route (publish.ts ~:145-156):
  // the entity must be owned by the current user. 403 otherwise.
  const { data: entity } = await admin
    .from('entities')
    .select('id, kind, slug')
    .eq('id', subject_entity_id)
    .eq('owner_user_id', user.id)
    .in('kind', ['team', 'agent'])
    .maybeSingle()
  if (!entity) {
    return NextResponse.json(
      { error: 'subject_entity_id must reference a team or agent you own.' },
      { status: 403 },
    )
  }

  const expires = new Date()
  expires.setDate(expires.getDate() + 30)

  // Same column shape as the browser insert (PostJobForm), plus subject_entity_id.
  const { data: job, error } = await admin
    .from('jobs')
    .insert([{
      employer_email: user.email,
      subject_entity_id: entity.id,
      company_name: company_name?.trim() || '',
      role_title: role_title.trim(),
      description: description?.trim() || '',
      requirements: requirements?.trim() || '',
      salary_range: salary_range?.trim() || '',
      day_rate: day_rate?.trim() || '',
      location: location || 'Remote',
      employment_type: employment_type || 'full-time',
      skills: skills || [],
      timezone: timezone || 'Any',
      urgency: urgency || 'Actively hiring',
      hiring_for: hiring_for || '',
      anonymous: anonymous || false,
      status: 'active',
      expires_at: expires.toISOString(),
    }])
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // cap-stage 3: posting AS the org is the hiring opt-in — flip the org's hiring
  // lens on. Ownership was validated above (entity owned by user, kind team/agent).
  // Best-effort: the job is already created; a no-match (agent has no team_profiles
  // row) or transient error must not fail the successful post.
  await admin.from('team_profiles').update({ hires: true }).eq('entity_id', entity.id)

  return NextResponse.json({ job })
}
