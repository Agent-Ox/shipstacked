import { NextResponse } from 'next/server'
import { postJobToX } from '@/lib/xPost'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    // Require authenticated session
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const job = await req.json()
    if (!job?.id) return NextResponse.json({ error: 'Missing job id' }, { status: 400 })

    // Verify job exists, belongs to this user, and was created within last 60 seconds
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: dbJob } = await admin
      .from('jobs')
      .select('id, employer_email, role_title, company_name, location, day_rate, salary_range, employment_type, created_at')
      .eq('id', job.id)
      .maybeSingle()

    if (!dbJob) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    if (dbJob.employer_email !== user.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const ageSec = (Date.now() - new Date(dbJob.created_at).getTime()) / 1000
    if (ageSec > 120) return NextResponse.json({ error: 'Job too old to auto-post' }, { status: 400 })

    // Use authoritative DB values, not client-supplied values
    const result = await postJobToX({
      id: dbJob.id,
      role_title: dbJob.role_title,
      company_name: job.company_name || dbJob.company_name,
      location: dbJob.location,
      day_rate: dbJob.day_rate,
      salary_range: dbJob.salary_range,
      job_type: dbJob.employment_type,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('X post error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
