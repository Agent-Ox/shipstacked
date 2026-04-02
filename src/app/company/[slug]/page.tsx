import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('employer_profiles')
    .select('company_name, about, location')
    .eq('slug', slug)
    .eq('public', true)
    .maybeSingle()

  if (!data) return { title: 'Company not found' }

  return {
    title: `${data.company_name} — Hiring on ClaudHire`,
    description: data.about || `${data.company_name} is hiring Claude-native builders on ClaudHire.`,
  }
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: company } = await supabase
    .from('employer_profiles')
    .select('*')
    .eq('slug', slug)
    .eq('public', true)
    .maybeSingle()

  if (!company) notFound()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('employer_email', company.email)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const initials = company.company_name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)',
            border: '1.5px solid rgba(0,113,227,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#0071e3', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>
                {company.company_name}
              </h1>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1a7f37', background: '#e3f3e3', padding: '0.2rem 0.6rem', borderRadius: 980 }}>
                Hiring on ClaudHire
              </span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {company.location && (
                <span style={{ fontSize: 14, color: '#6e6e73' }}>📍 {company.location}</span>
              )}
              {company.team_size && (
                <span style={{ fontSize: 14, color: '#6e6e73' }}>👥 {company.team_size} people</span>
              )}
              {company.website_url && (
                <a href={company.website_url} target="_blank" style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>
                  🔗 Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* About */}
        {company.about && (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.75rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>About</p>
            <p style={{ fontSize: 15, color: '#3d3d3f', lineHeight: 1.7 }}>{company.about}</p>
          </div>
        )}

        {/* What they build */}
        {company.what_they_build && (
          <div style={{ background: '#f0f5ff', border: '1px solid #dce8fb', borderRadius: 14, padding: '1.75rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>What they're building with Claude</p>
            <p style={{ fontSize: 15, color: '#1d1d1f', lineHeight: 1.7 }}>{company.what_they_build}</p>
          </div>
        )}

        {/* Open roles */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', marginBottom: '1rem' }}>
            Open roles {jobs && jobs.length > 0 ? `(${jobs.length})` : ''}
          </h2>

          {!jobs || jobs.length === 0 ? (
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: '#6e6e73', fontSize: 14 }}>No open roles right now. Check back soon.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {jobs.map((job: any) => (
                <div key={job.id} style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em', marginBottom: '0.2rem' }}>{job.role_title}</h3>
                      <p style={{ fontSize: 13, color: '#6e6e73' }}>{job.location} · {job.employment_type}</p>
                    </div>
                    {job.salary_range && (
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#1a7f37', background: '#e3f3e3', padding: '0.3rem 0.75rem', borderRadius: 980, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {job.salary_range}
                      </span>
                    )}
                  </div>
                  {job.description && (
                    <p style={{ fontSize: 14, color: '#3d3d3f', lineHeight: 1.6, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {job.description}
                    </p>
                  )}
                  
                    href={'mailto:' + job.employer_email + '?subject=Application via ClaudHire'}
                    style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
                  >
                    Apply
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Builder CTA */}
        <div style={{ background: 'linear-gradient(135deg, #0f0f18, #1a1a2e)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(167,139,250,0.9)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Are you a Claude builder?</p>
          <p style={{ fontSize: 17, fontWeight: 600, color: 'rgba(240,240,245,0.95)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
            Get discovered by {company.company_name} and others.
          </p>
          <p style={{ fontSize: 14, color: 'rgba(240,240,245,0.5)', marginBottom: '1.25rem', fontWeight: 300 }}>
            Create a free verified profile and let companies find you.
          </p>
          <Link href="/signup" style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: '#6c63ff', color: 'white', borderRadius: 20, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Create free profile →
          </Link>
        </div>

      </div>
    </div>
  )
}
