import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { postJobToX } from '@/lib/xPost'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const {
    role_title, company_name, description, requirements,
    salary_range, day_rate, location, employment_type,
    job_type, skills, timezone, urgency, hiring_for, anonymous
  } = body

  if (!role_title?.trim()) return NextResponse.json({ error: 'Role title required' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Stage 5b: attribute the job to the poster's org identity (subject_entity_id).
  // Mirrors /api/jobs/post-as-team's ownership resolution (entities owned by the
  // poster), but resolves the entity here — the personal-post path carries no
  // explicit subject_entity_id. Post-D2b-1 a hirer IS an org owner (buyers mint
  // kind='org'; teams have kind='team'), so this normally resolves. Dual-write
  // subject_entity_id alongside employer_email during the transition (5d removes
  // the employer_profiles dependency). If (rarely) no entity resolves, fall back
  // to an employer_email-only write — don't block posting — and log it.
  const { data: ownedOrg } = await admin
    .from('entities')
    .select('id')
    .eq('owner_user_id', user.id)
    .in('kind', ['org', 'team'])
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!ownedOrg) {
    console.warn(`[api/jobs] poster ${user.id} (${user.email}) has no org/team entity — job written employer_email-only (subject_entity_id null). Post-D2b-1 every hirer should own an org.`)
  }

  const { data: job, error } = await admin
    .from('jobs')
    .insert({
      employer_email: user.email,
      subject_entity_id: ownedOrg?.id ?? null,
      role_title: role_title.trim(),
      company_name: company_name?.trim() || '',
      description: description?.trim() || '',
      requirements: requirements?.trim() || '',
      salary_range: salary_range?.trim() || '',
      day_rate: day_rate?.trim() || '',
      location: location || 'Remote',
      employment_type: employment_type || 'contract',
      job_type: job_type || 'contract',
      skills: skills || [],
      timezone: timezone || 'Any',
      urgency: urgency || 'Actively hiring',
      hiring_for: hiring_for || '',
      anonymous: anonymous || false,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Post to X automatically — fire and forget
  postJobToX({
    id: job.id,
    role_title: job.role_title,
    company_name: anonymous ? 'A ShipStacked hirer' : job.company_name,
    location: job.location,
    day_rate: job.day_rate,
    salary_range: job.salary_range,
    job_type: job.job_type,
  }).then(result => {
    if (result.success) console.log('X post successful:', result.id)
    else console.error('X post failed:', result.error)
  })

  return NextResponse.json({ job })
}
