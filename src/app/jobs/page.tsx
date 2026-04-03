import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI-Native Jobs',
  description: 'Browse open roles at companies hiring Claude builders, prompt engineers, and AI automation specialists. Verified talent. Direct applications.',
  alternates: { canonical: 'https://shipstacked.com/jobs' },
  openGraph: {
    title: 'AI-Native Jobs — ShipStacked',
    description: 'Browse open roles at companies hiring Claude builders, prompt engineers, and AI automation specialists.',
    url: 'https://shipstacked.com/jobs',
  },
}

export default async function JobsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '5rem 1.5rem 3rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Jobs</p>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>AI-native roles</h1>
          <p style={{ fontSize: 15, color: '#6e6e73' }}>Companies hiring people who actually build with Claude.</p>
        </div>

        {!jobs || jobs.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: '1rem' }}>🔍</p>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>No jobs posted yet.</h2>
            <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '1.5rem' }}>Be the first company to hire AI-native talent.</p>
            <Link href="/signup?role=employer" style={{ padding: '0.75rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Post a job →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {jobs.map((job: any) => (
              <div key={job.id} style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>{job.role_title}</h2>
                    <p style={{ fontSize: 14, color: '#6e6e73' }}>{job.company_name} · {job.location} · {job.employment_type}</p>
                  </div>
                  {job.salary_range && (
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a7f37', background: '#e3f3e3', padding: '0.3rem 0.75rem', borderRadius: 980, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {job.salary_range}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: 14, color: '#3d3d3f', lineHeight: 1.6, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {job.description}
                </p>

                {job.skills && job.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1.25rem' }}>
                    {job.skills.slice(0, 6).map((skill: string) => (
                      <span key={skill} style={{ fontSize: 12, padding: '0.25rem 0.6rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#aeaeb2' }}>
                    Posted {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <a href={`mailto:${job.employer_email}?subject=Application for ${job.role_title} at ${job.company_name} via ShipStacked`}
                    style={{ padding: '0.5rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                    Apply →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '3rem', padding: '2rem', background: '#f0f5ff', borderRadius: 14, textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>Are you a Claude builder?</p>
          <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem' }}>Create a free profile and get discovered by companies hiring right now.</p>
          <Link href="/join" style={{ padding: '0.65rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            Create free profile →
          </Link>
        </div>
      </div>
    </div>
  )
}