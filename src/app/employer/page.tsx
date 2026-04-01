import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function EmployerDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('email', user.email)
    .eq('status', 'active')
    .eq('product', 'full_access')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()

  if (!sub) redirect('/#pricing')

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('employer_email', user.email)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const createdAt = new Date(sub.created_at)
  const renewsAt = new Date(createdAt)
  renewsAt.setMonth(renewsAt.getMonth() + 1)
  const renewsString = renewsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <nav style={{ borderBottom: '0.5px solid #e0e0e5', padding: '0 2rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          ClaudHire<span style={{ color: '#0071e3' }}>.</span>
        </a>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#6e6e73' }}>{user.email}</span>
          <a href="/api/logout" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>Sign out</a>
        </div>
      </nav>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.4rem' }}>
            Hire Claude builders.
          </h1>
          <p style={{ fontSize: 15, color: '#6e6e73' }}>
            Full Access — active
            <span style={{ margin: '0 0.5rem', color: '#d2d2d7' }}>·</span>
            Renews {renewsString}
          </p>
        </div>

        {/* Primary CTA — Talent Search */}
        <a href="/talent" style={{ display: 'block', background: '#0071e3', borderRadius: 18, padding: '2rem 2.5rem', textDecoration: 'none', marginBottom: '1rem', transition: 'background 0.2s' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Core product</p>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>Search talent</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>Browse and contact verified Claude-native builders directly.</p>
          <span style={{ display: 'inline-block', background: 'white', color: '#0071e3', padding: '0.6rem 1.25rem', borderRadius: 980, fontSize: 14, fontWeight: 600 }}>
            Browse talent
          </span>
        </a>

        {/* Secondary actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
          <a href="/post-job" style={{ display: 'block', background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', textDecoration: 'none' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginBottom: '0.5rem' }}>Hiring</p>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.3rem' }}>Post a job</h3>
            <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>List a role and let builders apply directly to you.</p>
          </a>

          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginBottom: '0.5rem' }}>Active listings</p>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.3rem' }}>
              {jobs?.length || 0} job{jobs?.length !== 1 ? 's' : ''}
            </h3>
            <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>
              {jobs && jobs.length > 0 ? jobs[0].role_title : 'No active listings yet.'}
            </p>
          </div>
        </div>

        {/* Active jobs list */}
        {jobs && jobs.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1rem', letterSpacing: '-0.01em' }}>Your job listings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {jobs.map((job: any) => {
                const expires = new Date(job.expires_at)
                const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                return (
                  <div key={job.id} style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.2rem' }}>{job.role_title}</p>
                      <p style={{ fontSize: 13, color: '#6e6e73' }}>{job.company_name} · {job.location} · {daysLeft} days left</p>
                    </div>
                    <span style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#e3f3e3', color: '#1a7f37', borderRadius: 980, fontWeight: 500 }}>Active</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Account section */}
        <div style={{ borderTop: '0.5px solid #e0e0e5', paddingTop: '2rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1rem', letterSpacing: '-0.01em' }}>Account</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.2rem' }}>Subscription</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Full Access · $199/month</p>
              </div>
              <span style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#e3f3e3', color: '#1a7f37', borderRadius: 980, fontWeight: 500 }}>Active</span>
            </div>

            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.2rem' }}>Password</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Update your password</p>
              </div>
              <a href="/reset-password" style={{ fontSize: 13, padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
                Reset
              </a>
            </div>

            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.2rem' }}>Cancel subscription</p>
                <p style={{ fontSize: 14, color: '#1d1d1f' }}>You will keep access until {renewsString}.</p>
              </div>
              <form action="/api/employer/cancel" method="POST">
                <button type="submit" style={{ fontSize: 13, padding: '0.5rem 1rem', background: 'white', color: '#c00', border: '1px solid #ffd0d0', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                  Cancel
                </button>
              </form>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
