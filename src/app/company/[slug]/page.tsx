import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { getEntityModes } from '@/lib/user'
import Link from 'next/link'
import type { Metadata } from 'next'
import ApplyButton from './ApplyButton'
import { buildHirerOrgJsonLd } from '@/lib/jsonld/hirer-org'
import { informative } from '@/lib/badge'

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

  const title = `${data.company_name} — Hiring on ShipStacked`
  const description = data.about?.slice(0, 160) || `${data.company_name} is hiring AI-native builders on ShipStacked.`
  const url = `https://shipstacked.com/company/${slug}`
  const ogImage = `https://shipstacked.com/og?type=company&name=${encodeURIComponent(data.company_name)}&location=${encodeURIComponent(data.location || '')}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', images: [{ url: ogImage, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  }
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  // Stage 4: if an ORG entity owns this slug, the unified org page (/team/[slug])
  // is the canonical public identity — redirect there (it renders the hiring
  // lens). Its published gate handles visibility. Only pre-Stage-2 hirers
  // (employer_profiles row, no org entity) fall through to the legacy page below.
  const orgLookup = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: orgEnt } = await orgLookup
    .from('entities')
    .select('id')
    .eq('slug', slug)
    .in('kind', ['team', 'org'])
    .maybeSingle()
  if (orgEnt) redirect(`/team/${slug}`)

  const { data: company } = await supabase
    .from('employer_profiles')
    .select('*')
    .eq('slug', slug)
    .eq('public', true)
    .maybeSingle()

  if (!company) notFound()

  const { modes, user: resolvedUser } = await getEntityModes()
  const isVisitor = !resolvedUser
  const showBuilderCTA = isVisitor
  const isBuilder = modes.builder

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('employer_email', company.email)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  let appliedJobIds: string[] = []
  if (isBuilder && resolvedUser) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: applications } = await admin
      .from('applications')
      .select('job_id')
      .eq('builder_email', resolvedUser.email)
    appliedJobIds = applications?.map((a: any) => a.job_id) || []
  }

  const initials = company.company_name
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  // Beacon 1 — Organization markup with shipstacked: namespace + canonical
  // @id matching the page URL. The page above already filters public=true
  // so unpublished hirer profiles 404 and this code never runs for them.
  const jsonLd = buildHirerOrgJsonLd({
    slug,
    company_name: company.company_name,
    about: company.about,
    website_url: company.website_url,
    logo_url: company.logo_url,
    location: company.location,
    linkedin_url: company.linkedin_url,
    x_url: company.x_url,
    industry: company.industry,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`
        .company-job-card { transition: border-color 0.2s, box-shadow 0.2s; }
        .company-job-card:hover { border-color: rgba(0,113,227,0.3) !important; box-shadow: 0 4px 16px rgba(0,113,227,0.06); }
        .company-link-btn { transition: all 0.15s; }
        .company-link-btn:hover { background: #f0f0f5 !important; color: #1d1d1f !important; }
        @media (max-width: 640px) {
          .company-hero { flex-direction: column !important; }
          .company-hero-logo { width: 72px !important; height: 72px !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

        {/* Top accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #0071e3, #6c63ff)' }} />

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

          {/* Hero */}
          <div className="company-hero" style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', marginBottom: '2.5rem' }}>
            {/* Logo */}
            <div className="company-hero-logo" style={{
              width: 96, height: 96, borderRadius: 22, flexShrink: 0,
              background: company.logo_url ? 'transparent' : 'linear-gradient(135deg, #e8f1fd, #d0e4fb)',
              border: '1.5px solid rgba(0,113,227,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,113,227,0.08)',
            }}>
              {company.logo_url
                ? <img src={company.logo_url} alt={company.company_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 28, fontWeight: 700, color: '#0071e3', letterSpacing: '-0.02em' }}>{initials}</span>
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', lineHeight: 1.1 }}>
                  {company.company_name}
                </h1>
                {jobs && jobs.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1a7f37', background: '#e3f3e3', padding: '0.25rem 0.65rem', borderRadius: 980, letterSpacing: '0.03em' }}>
                    {jobs.length} open role{jobs.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
                {company.location && <span style={{ fontSize: 13, color: '#6e6e73' }}>📍 {company.location}</span>}
                {company.team_size && <span style={{ fontSize: 13, color: '#6e6e73' }}>👥 {company.team_size}</span>}
                {informative(company.industry) && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', background: '#e8f0fe', padding: '0.2rem 0.6rem', borderRadius: 980 }}>
                    {company.industry}
                  </span>
                )}
                {informative(company.hiring_type) && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#6e6e73', background: '#f5f5f7', padding: '0.2rem 0.6rem', borderRadius: 980 }}>
                    {company.hiring_type}
                  </span>
                )}
              </div>

              {/* Links as pill buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {company.website_url && (
                  <a href={company.website_url} target="_blank" className="company-link-btn"
                    style={{ fontSize: 12, fontWeight: 500, color: '#3d3d3f', background: 'white', border: '1px solid #e0e0e5', borderRadius: 980, padding: '0.35rem 0.875rem', textDecoration: 'none' }}>
                    Website →
                  </a>
                )}
                {company.linkedin_url && (
                  <a href={company.linkedin_url} target="_blank" className="company-link-btn"
                    style={{ fontSize: 12, fontWeight: 500, color: '#3d3d3f', background: 'white', border: '1px solid #e0e0e5', borderRadius: 980, padding: '0.35rem 0.875rem', textDecoration: 'none' }}>
                    LinkedIn →
                  </a>
                )}
                {company.x_url && (
                  <a href={company.x_url.startsWith('http') ? company.x_url : `https://x.com/${company.x_url.replace('@', '')}`} target="_blank" className="company-link-btn"
                    style={{ fontSize: 12, fontWeight: 500, color: '#3d3d3f', background: 'white', border: '1px solid #e0e0e5', borderRadius: 980, padding: '0.35rem 0.875rem', textDecoration: 'none' }}>
                    X →
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* What they're building — HERO STATEMENT, shown first */}
          {company.what_they_build && (
            <div style={{ background: 'linear-gradient(135deg, #f0f5ff, #e8f1fd)', border: '1px solid #dce8fb', borderRadius: 16, padding: '2rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#0071e3', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                What they're building with AI
              </p>
              <p style={{ fontSize: 17, color: '#1d1d1f', lineHeight: 1.7, fontWeight: 400 }}>{company.what_they_build}</p>
            </div>
          )}

          {/* About */}
          {company.about && (
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '1.75rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>About</p>
              <p style={{ fontSize: 15, color: '#3d3d3f', lineHeight: 1.75 }}>{company.about}</p>
            </div>
          )}

          {/* Open roles */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#1d1d1f' }}>
                Open roles {jobs && jobs.length > 0 ? `(${jobs.length})` : ''}
              </h2>
              {jobs && jobs.length > 0 && (
                <Link href="/jobs" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>
                  All jobs →
                </Link>
              )}
            </div>
            {!jobs || jobs.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#6e6e73', fontSize: 14 }}>No open roles right now. Check back soon.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {jobs.map((job: any) => (
                  <div key={job.id} className="company-job-card" style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                      <div>
                        <Link href={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em', marginBottom: '0.2rem' }}>{job.role_title}</h3>
                        </Link>
                        <p style={{ fontSize: 13, color: '#6e6e73' }}>{job.location} · {job.employment_type}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        {job.salary_range && (
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#1a7f37', background: '#e3f3e3', padding: '0.3rem 0.75rem', borderRadius: 980, whiteSpace: 'nowrap' }}>
                            {job.salary_range}
                          </span>
                        )}
                        <Link href={`/jobs/${job.id}`}
                          style={{ fontSize: 12, color: '#6e6e73', textDecoration: 'none', background: '#f5f5f7', padding: '0.3rem 0.75rem', borderRadius: 980, whiteSpace: 'nowrap' }}>
                          View →
                        </Link>
                      </div>
                    </div>
                    {job.description && (
                      <p style={{ fontSize: 14, color: '#3d3d3f', lineHeight: 1.6, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {job.description}
                      </p>
                    )}
                    {job.skills && job.skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
                        {job.skills.slice(0, 6).map((skill: string) => (
                          <span key={skill} style={{ fontSize: 12, padding: '0.2rem 0.6rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>{skill}</span>
                        ))}
                      </div>
                    )}
                    {isBuilder && <ApplyButton jobId={job.id} jobTitle={job.role_title} companyName={company.company_name} alreadyApplied={appliedJobIds.includes(job.id)} />}
                    {isVisitor && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <a href={'/login?next=/company/' + slug}
                          style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                          Sign in to apply →
                        </a>
                        <a href="/join"
                          style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                          Create free profile
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Builder CTA — logged out only */}
          {showBuilderCTA && (
            <div style={{ background: 'linear-gradient(135deg, #0f0f18, #1a1a2e)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(167,139,250,0.9)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Are you an AI-native builder?</p>
              <p style={{ fontSize: 17, fontWeight: 600, color: 'rgba(240,240,245,0.95)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
                Get discovered by {company.company_name} and others.
              </p>
              <p style={{ fontSize: 14, color: 'rgba(240,240,245,0.5)', marginBottom: '1.25rem', fontWeight: 300 }}>
                Create a free verified profile and let companies find you.
              </p>
              <Link href="/join" style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: '#6c63ff', color: 'white', borderRadius: 20, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Create free profile →
              </Link>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
