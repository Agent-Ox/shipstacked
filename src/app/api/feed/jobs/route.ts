import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const since = searchParams.get('since') // ISO timestamp — only return jobs after this

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = admin
    .from('jobs')
    .select('id, role_title, company_name, location, employment_type, day_rate, salary_range, anonymous, created_at, status')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  if (since) {
    query = query.gt('created_at', since)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const jobs = (data || []).map((j: any) => ({
    id: j.id,
    title: j.role_title,
    company: j.anonymous ? null : j.company_name,
    location: j.location || 'Remote',
    jobType: j.employment_type || 'contract',
    dayRate: j.day_rate || j.salary_range || null,
    postedAt: j.created_at,
    url: `https://shipstacked.com/jobs/${j.id}`,
  }))

  return NextResponse.json(jobs)
}
