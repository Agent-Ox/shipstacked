import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VerifyToggle from './VerifyToggle'

const ADMIN_EMAIL = 'oxleethomas+admin@gmail.com'

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
    { data: applications },
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
    supabase.from('jobs').select('*').order('created_at', { ascending: false }),
    supabase.from('applications').select('*, jobs(role_title, company_name)').order('created_at', { ascending: false }).limit(20),
  ])

  const totalProfiles = profiles?.length || 0
  const verifiedProfiles = profiles?.filter(p => p.verified).length || 0
  const totalRevenue = (subscriptions?.length || 0)
  const activeJobs = jobs?.filter(j => j.status === 'active').length || 0

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>


      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Admin dashboard</h1>
        <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '2.5rem' }}>ClaudHire platform overview.</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
          {[
            { label: 'Total profiles', value: totalProfiles },
            { label: 'Verified builders', value: verifiedProfiles },
            { label: 'Payments received', value: totalRevenue },
            { label: 'Active job listings', value: activeJobs },
            { label: 'Total applications', value: applications?.length || 0 },
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
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e0e0e5', background: '#f5f5f7' }}>
                    {['Name', 'Email', 'Role', 'Verified', 'Created', 'Profile', 'Actions'].map(h => (
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
                        <VerifyToggle
                          profileId={p.id}
                          initialVerified={p.verified}
                          builderEmail={p.email}
                          builderName={p.full_name}
                        />
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
              </div>
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
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
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
              </div>
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
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
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
              </div>
            )}
          </div>
        </div>

        {/* Applications */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1rem', color: '#1d1d1f' }}>
            Recent applications ({applications?.length || 0})
          </h2>
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, overflow: 'hidden' }}>
            {!applications || applications.length === 0 ? (
              <p style={{ padding: '2rem', color: '#6e6e73', textAlign: 'center' }}>No applications yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e0e0e5', background: '#f5f5f7' }}>
                    {['Builder', 'Role', 'Company', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.03em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.map((a: any, i: number) => (
                    <tr key={a.id} style={{ borderBottom: i < applications.length - 1 ? '1px solid #f0f0f5' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{a.builder_name}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>{a.jobs?.role_title || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>{a.jobs?.company_name || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 6, background: '#e3f3e3', color: '#1a7f37' }}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#6e6e73' }}>
                        {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}