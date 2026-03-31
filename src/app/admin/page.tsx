import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const ADMIN_EMAIL = 'oxleythomas@gmail.com'

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/')
  }

  // Fetch all data in parallel
  const [
    { data: profiles },
    { data: subscriptions },
    { data: jobs },
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
    supabase.from('jobs').select('*').order('created_at', { ascending: false }),
  ])

  const totalProfiles = profiles?.length || 0
  const verifiedProfiles = profiles?.filter(p => p.verified).length || 0
  const totalRevenue = (subscriptions?.length || 0)
  const activeJobs = jobs?.filter(j => j.status === 'active').length || 0

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <nav style={{ borderBottom: '0.5px solid #e0e0e5', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          ClaudHire<span style={{ color: '#0071e3' }}>.</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#0071e3', background: '#e8f1fd', padding: '0.15rem 0.5rem', borderRadius: 6, marginLeft: 8 }}>Admin</span>
        </a>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#6e6e73' }}>{user.email}</span>
          <a href="/api/logout" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>Sign out</a>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Admin dashboard</h1>
        <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '2.5rem' }}>ClaudHire platform overview.</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
          {[
            { label: 'Total profiles', value: totalProfiles },
            { label: 'Verified builders', value: verifiedProfiles },
            { label: 'Payments received', value: totalRevenue },
            { label: 'Active job listings', value: activeJobs },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.25rem' }}>
              <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.4rem' }}>{stat.label}</p>
              <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Profiles */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1rem', color: '#1d1d1f' }}>
            Builder profiles ({totalProfiles})
          </h2>
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, overflow: 'hidden' }}>
            {!profiles || profiles.length === 0 ? (
              <p style={{ padding: '2rem', color: '#6e6e73', textAlign: 'center' }}>No profiles yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e0e0e5', background: '#f5f5f7' }}>
                    {['Name', 'Email', 'Role', 'Verified', 'Created', 'Profile'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.03em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p: any, i: number) => (
                    <tr key={p.id} style={{ borderBottom: i < profiles.length - 1 ? '1px solid #f0f0f5' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{p.full_name}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>{p.email}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>{p.role || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 6, background: p.verified ? '#e3f3e3' : '#f5f5f7', color: p.verified ? '#1a7f37' : '#aeaeb2' }}>
                          {p.verified ? '✓ Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Link href={`/u/${p.username}`} style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' }}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Payments */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1rem', color: '#1d1d1f' }}>
            Payments ({subscriptions?.length || 0})
          </h2>
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, overflow: 'hidden' }}>
            {!subscriptions || subscriptions.length === 0 ? (
              <p style={{ padding: '2rem', color: '#6e6e73', textAlign: 'center' }}>No payments yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e0e0e5', background: '#f5f5f7' }}>
                    {['Email', 'Product', 'Status', 'Expires', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.03em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s: any, i: number) => (
                    <tr key={s.id} style={{ borderBottom: i < subscriptions.length - 1 ? '1px solid #f0f0f5' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#1d1d1f' }}>{s.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 6, background: '#e8f1fd', color: '#0071e3' }}>
                          {s.product}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 6, background: s.status === 'active' ? '#e3f3e3' : '#f5f5f7', color: s.status === 'active' ? '#1a7f37' : '#aeaeb2' }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>
                        {s.expires_at ? new Date(s.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>
                        {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Jobs */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1rem', color: '#1d1d1f' }}>
            Job listings ({jobs?.length || 0})
          </h2>
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, overflow: 'hidden' }}>
            {!jobs || jobs.length === 0 ? (
              <p style={{ padding: '2rem', color: '#6e6e73', textAlign: 'center' }}>No jobs posted yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e0e0e5', background: '#f5f5f7' }}>
                    {['Role', 'Company', 'Employer email', 'Status', 'Expires', 'Posted'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.03em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j: any, i: number) => (
                    <tr key={j.id} style={{ borderBottom: i < jobs.length - 1 ? '1px solid #f0f0f5' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{j.role_title}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>{j.company_name}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>{j.employer_email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 6, background: j.status === 'active' ? '#e3f3e3' : '#f5f5f7', color: j.status === 'active' ? '#1a7f37' : '#aeaeb2' }}>
                          {j.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>
                        {j.expires_at ? new Date(j.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>
                        {new Date(j.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}