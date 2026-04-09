import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: job } = await admin.from('jobs').select('role_title, day_rate, description').eq('id', id).maybeSingle()
  if (!job) return { title: 'Role not found — ShipStacked' }
  return {
    title: `${job.role_title} — Apply on ShipStacked`,
    description: `${job.role_title} · ${job.day_rate} · Remote. Create your free ShipStacked profile and apply. No CV. Just proof of work.`,
    openGraph: {
      title: `${job.role_title} — Apply on ShipStacked`,
      description: `${job.day_rate} · Remote. Proof of work is the new CV.`,
      url: `https://shipstacked.com/get-found/${id}`,
      images: [{ url: `https://shipstacked.com/og?type=job&v=2&name=${encodeURIComponent(job.role_title)}&location=ShipStacked`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${job.role_title} — Apply on ShipStacked`,
      images: [`https://shipstacked.com/og?type=job&v=2&name=${encodeURIComponent(job.role_title)}&location=ShipStacked`],
    },
  }
}

export default async function GetFoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: job } = await admin.from('jobs').select('*').eq('id', id).eq('status', 'active').maybeSingle()
  if (!job) notFound()

  const steps = [
    { n: '01', title: 'Create your free profile', desc: 'Name, role, one-line bio. Takes two minutes. No CV required.' },
    { n: '02', title: 'Post what you\'ve built', desc: 'Add a real project with an outcome. This is your proof of work — what gets you hired.' },
    { n: '03', title: 'Apply for this role', desc: 'Once your profile is live, apply directly from the job listing. The employer sees your work immediately.' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', color: '#f0f0f5' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .fade-1 { animation: fadeUp 0.6s ease forwards; }
        .fade-2 { animation: fadeUp 0.6s ease 0.15s forwards; opacity: 0; }
        .fade-3 { animation: fadeUp 0.6s ease 0.3s forwards; opacity: 0; }
        .fade-4 { animation: fadeUp 0.6s ease 0.45s forwards; opacity: 0; }
        .step-card:hover { background: #141420 !important; border-color: #0071e3 !important; }
        .cta-btn:hover { background: #0077ed !important; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(0,113,227,0.4) !important; }
        .job-link:hover { color: #0071e3 !important; }
      `}</style>

      {/* Nav */}
      <nav style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 32, height: 32, background: '#0f0f18', borderRadius: 8, border: '1px solid #1e1e2e', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ background: '#161622', height: 10, display: 'flex', alignItems: 'center', paddingLeft: 4, gap: 3 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#28c840' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '2px 4px', flex: 1 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#6c63ff' }}>~/</span>
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#0071e3' }}>ship</span>
            </div>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-0.02em' }}>
            ShipStacked<span style={{ color: '#0071e3' }}>.</span>
          </span>
        </a>
        <a href="/signup" style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5', background: '#0071e3', padding: '0.5rem 1.25rem', borderRadius: 980, textDecoration: 'none' }}>
          Create free profile →
        </a>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '4rem 2rem' }}>

        {/* Role badge */}
        <div className="fade-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,113,227,0.12)', border: '1px solid rgba(0,113,227,0.3)', borderRadius: 980, padding: '0.35rem 1rem', marginBottom: '2rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0071e3', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Now hiring</span>
        </div>

        {/* Hero */}
        <div className="fade-2">
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '1rem', color: '#f0f0f5' }}>
            {job.role_title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0071e3' }}>{job.day_rate}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#6e6e73', display: 'inline-block' }} />
            <span style={{ fontSize: 15, color: '#6e6e73' }}>{job.location || 'Remote — Global'}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#6e6e73', display: 'inline-block' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', background: '#1a1a2e', padding: '0.2rem 0.75rem', borderRadius: 980, border: '1px solid #2a2a3e', textTransform: 'capitalize' }}>{job.employment_type}</span>
          </div>
          <p style={{ fontSize: 17, color: 'rgba(240,240,245,0.6)', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 560 }}>
            {job.description?.slice(0, 200)}...
          </p>
        </div>

        {/* Main CTA */}
        <div className="fade-2" style={{ marginBottom: '4rem' }}>
          <a href="/signup" className="cta-btn" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            background: '#0071e3', color: 'white', padding: '1rem 2rem',
            borderRadius: 980, fontSize: 16, fontWeight: 700, textDecoration: 'none',
            transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(0,113,227,0.3)'
          }}>
            Create your free profile — apply in minutes
            <span style={{ fontSize: 18 }}>→</span>
          </a>
          <p style={{ fontSize: 13, color: '#6e6e73', marginTop: '0.75rem' }}>Free forever for builders. No CV required.</p>
        </div>

        {/* How it works */}
        <div className="fade-3">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>How to apply</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '4rem' }}>
            {steps.map((step) => (
              <div key={step.n} className="step-card" style={{
                background: '#0f0f18', border: '1px solid #1e1e2e', borderRadius: 16,
                padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start',
                transition: 'all 0.2s', cursor: 'default'
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#0071e3', opacity: 0.7, flexShrink: 0, marginTop: 2 }}>{step.n}</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f5', marginBottom: '0.35rem', letterSpacing: '-0.01em' }}>{step.title}</p>
                  <p style={{ fontSize: 14, color: 'rgba(240,240,245,0.5)', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What is ShipStacked */}
        <div className="fade-3" style={{ background: '#0f0f18', border: '1px solid #1e1e2e', borderRadius: 20, padding: '2rem', marginBottom: '3rem' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>What is ShipStacked?</p>
          <p style={{ fontSize: 16, color: 'rgba(240,240,245,0.75)', lineHeight: 1.8, marginBottom: '1rem' }}>
            ShipStacked is the proof-of-work hiring platform for AI-native builders. No CVs. No recruiters. No commission.
          </p>
          <p style={{ fontSize: 15, color: 'rgba(240,240,245,0.5)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Builders post what they've shipped — real projects, real outcomes. Employers see verified proof of work before they ever make contact. The best builders get found. The best employers get straight to the work.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {['Free for builders', 'No CV required', 'Verified profiles', 'Direct employer contact', 'Remote — Global'].map(tag => (
              <span key={tag} style={{ fontSize: 12, fontWeight: 600, color: '#6c63ff', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', padding: '0.3rem 0.875rem', borderRadius: 980 }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="fade-4" style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#f0f0f5' }}>
            Proof of work is the new CV.
          </p>
          <p style={{ fontSize: 16, color: 'rgba(240,240,245,0.5)', marginBottom: '2rem' }}>
            Ship. Get hired.
          </p>
          <a href="/signup" className="cta-btn" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            background: '#0071e3', color: 'white', padding: '1rem 2.5rem',
            borderRadius: 980, fontSize: 16, fontWeight: 700, textDecoration: 'none',
            transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(0,113,227,0.3)'
          }}>
            Create your free profile →
          </a>
          <p style={{ marginTop: '1rem', fontSize: 13, color: '#6e6e73' }}>
            Already have a profile?{' '}
            <a href={`/jobs/${id}`} className="job-link" style={{ color: '#6e6e73', textDecoration: 'underline', transition: 'color 0.2s' }}>
              Go straight to the job listing →
            </a>
          </p>
        </div>

      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#6e6e73' }}>
          <a href="/" style={{ color: '#6e6e73', textDecoration: 'none' }}>ShipStacked.</a>
          {' · '}
          <a href="/jobs" style={{ color: '#6e6e73', textDecoration: 'none' }}>Browse all 23 roles</a>
          {' · '}
          <a href="/employers" style={{ color: '#6e6e73', textDecoration: 'none' }}>Post a role</a>
        </p>
      </div>
    </div>
  )
}
