import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VerifyToggle from './VerifyToggle'
import AdminActions from './AdminActions'

const ADMIN_EMAIL = 'oxleethomas+admin@gmail.com'

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/')

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: profiles },
    { data: subscriptions },
    { data: jobs },
    { data: posts },
    { data: conversations },
    { data: comments },
    { data: hireConfirmations },
    { data: applications },
    { data: employerProfiles },
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
    supabase.from('jobs').select('*').order('created_at', { ascending: false }),
    supabase.from('posts').select('id, created_at, profile_id, reactions').order('created_at', { ascending: false }),
    supabase.from('conversations').select('id, created_at, last_message_at, employer_email, builder_profile_id').order('created_at', { ascending: false }),
    supabase.from('post_comments').select('id, created_at').order('created_at', { ascending: false }),
    supabase.from('hire_confirmations').select('*').order('created_at', { ascending: false }),
    supabase.from('applications').select('*, jobs(role_title, company_name)').order('created_at', { ascending: false }).limit(20),
    supabase.from('employer_profiles').select('*').order('created_at', { ascending: false }),
  ])

  const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || []
  const cancelledThisMonth = subscriptions?.filter(s => s.status === 'cancelled' && s.updated_at >= thisMonth) || []
  const activeLastMonth = subscriptions?.filter(s => s.created_at < thisMonth && (s.status === 'active' || (s.status === 'cancelled' && s.updated_at >= thisMonth))) || []
  const mrr = activeSubscriptions.length * 199
  const mrrLastMonth = activeLastMonth.length * 199
  const mrrGrowth = mrrLastMonth > 0 ? Math.round(((mrr - mrrLastMonth) / mrrLastMonth) * 100) : 0
  const churnRate = activeLastMonth.length > 0 ? Math.round((cancelledThisMonth.length / activeLastMonth.length) * 100) : 0
  const ltv = churnRate > 0 ? Math.round(199 / (churnRate / 100)) : 0
  const arr = mrr * 12

  const totalProfiles = profiles?.length || 0
  const verifiedProfiles = profiles?.filter(p => p.verified).length || 0
  const verifiedPct = totalProfiles > 0 ? Math.round((verifiedProfiles / totalProfiles) * 100) : 0
  const githubConnected = profiles?.filter(p => p.github_connected).length || 0
  const githubPct = totalProfiles > 0 ? Math.round((githubConnected / totalProfiles) * 100) : 0
  const newBuildersThisWeek = profiles?.filter(p => p.created_at >= sevenDaysAgo).length || 0
  const newBuildersThisMonth = profiles?.filter(p => p.created_at >= thisMonth).length || 0
  const activeBuilders30d = profiles?.filter(p => p.last_seen_at && p.last_seen_at >= thirtyDaysAgo).length || 0
  const activeBuilders7d = profiles?.filter(p => p.last_seen_at && p.last_seen_at >= sevenDaysAgo).length || 0
  const highVelocity = profiles?.filter(p => (p.velocity_score || 0) >= 75).length || 0

  const totalEmployers = activeSubscriptions.length
  const activeEmployerConvs = new Set(conversations?.filter(c => c.last_message_at >= thirtyDaysAgo).map(c => c.employer_email)).size
  const activeJobListings = jobs?.filter(j => j.status === 'active').length || 0
  const totalApplications = applications?.length || 0
  const employerContactRate = totalEmployers > 0 ? Math.round((activeEmployerConvs / totalEmployers) * 100) : 0

  const totalPosts = posts?.length || 0
  const postsThisWeek = posts?.filter(p => p.created_at >= sevenDaysAgo).length || 0
  const postsThisMonth = posts?.filter(p => p.created_at >= thisMonth).length || 0
  const totalComments = comments?.length || 0
  const commentsThisWeek = comments?.filter(c => c.created_at >= sevenDaysAgo).length || 0
  const avgCommentsPerPost = totalPosts > 0 ? (totalComments / totalPosts).toFixed(1) : '0'
  const totalReactions = posts?.reduce((sum, p) => {
    const r = (p.reactions as Record<string, number>) || {}
    return sum + Object.values(r).reduce((a: number, b: unknown) => a + (b as number), 0)
  }, 0) || 0

  const totalConversations = conversations?.length || 0
  const conversationsThisMonth = conversations?.filter(c => c.created_at >= thisMonth).length || 0
  const confirmedHires = hireConfirmations?.filter(h => h.confirmed_at).length || 0
  const pendingHires = hireConfirmations?.filter(h => !h.confirmed_at).length || 0
  const hireRate = totalConversations > 0 ? ((confirmedHires / totalConversations) * 100).toFixed(1) : '0'

  const weeks: { label: string; builders: number; posts: number; convs: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString()
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000).toISOString()
    const label = new Date(weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    weeks.push({
      label,
      builders: profiles?.filter(p => p.created_at >= weekStart && p.created_at < weekEnd).length || 0,
      posts: posts?.filter(p => p.created_at >= weekStart && p.created_at < weekEnd).length || 0,
      convs: conversations?.filter(c => c.created_at >= weekStart && c.created_at < weekEnd).length || 0,
    })
  }
  const maxBuilders = Math.max(...weeks.map(w => w.builders), 1)
  const maxPosts = Math.max(...weeks.map(w => w.posts), 1)
  const maxConvs = Math.max(...weeks.map(w => w.convs), 1)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', color: '#f0f0f5' }}>
      <div style={{ background: '#0f0f18', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6c63ff', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>ShipStacked</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f5' }}>Intelligence Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <Link href="/" style={{ fontSize: 13, color: 'rgba(240,240,245,0.5)', textDecoration: 'none', padding: '0.4rem 0.875rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 980 }}>Back to site</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

        <div style={{ marginBottom: '0.5rem' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#6c63ff', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Revenue</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.04)', borderRadius: 16, overflow: 'hidden', marginBottom: '1.5rem' }}>
          {[
            { label: 'MRR', value: '$' + mrr.toLocaleString(), sub: mrrGrowth !== 0 ? (mrrGrowth > 0 ? '+' : '') + mrrGrowth + '% vs last month' : 'No prior data', subColor: mrrGrowth > 0 ? '#1a7f37' : mrrGrowth < 0 ? '#c00' : '#6e6e73' },
            { label: 'ARR', value: '$' + arr.toLocaleString(), sub: 'Annualised run rate', subColor: '#6e6e73' },
            { label: 'Active subscribers', value: String(activeSubscriptions.length), sub: totalEmployers + ' employer accounts', subColor: '#6e6e73' },
            { label: 'Churn rate', value: churnRate + '%', sub: cancelledThisMonth.length + ' cancelled this month', subColor: churnRate > 10 ? '#c00' : '#6e6e73' },
            { label: 'LTV estimate', value: ltv > 0 ? '$' + ltv.toLocaleString() : 'N/A', sub: 'Based on churn rate', subColor: '#6e6e73' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#0f0f18', padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>{stat.label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: '#f0f0f5', marginBottom: '0.25rem' }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: stat.subColor }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#1a7f37', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Supply — Builders</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Total profiles', value: String(totalProfiles) },
                { label: 'Verified', value: verifiedProfiles + ' (' + verifiedPct + '%)' },
                { label: 'New this week', value: String(newBuildersThisWeek) },
                { label: 'New this month', value: String(newBuildersThisMonth) },
                { label: 'Active (30d)', value: String(activeBuilders30d) },
                { label: 'Active (7d)', value: String(activeBuilders7d) },
                { label: 'GitHub connected', value: githubConnected + ' (' + githubPct + '%)' },
                { label: 'High velocity (75+)', value: String(highVelocity) },
              ].map(s => (
                <div key={s.label} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <p style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', marginBottom: '0.3rem' }}>{s.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f5' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#0071e3', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Demand — Employers</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Paying employers', value: String(totalEmployers) },
                { label: 'Active (30d)', value: String(activeEmployerConvs) },
                { label: 'Contact rate', value: employerContactRate + '%' },
                { label: 'Active job listings', value: String(activeJobListings) },
                { label: 'Total job listings', value: String(jobs?.length || 0) },
                { label: 'Total applications', value: String(totalApplications) },
                { label: 'Company profiles', value: String(employerProfiles?.length || 0) },
                { label: 'Public profiles', value: String(employerProfiles?.filter((e: any) => e.public).length || 0) },
              ].map(s => (
                <div key={s.label} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <p style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', marginBottom: '0.3rem' }}>{s.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f5' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#bf7e00', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Content — Build Feed</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Total posts', value: String(totalPosts) },
                { label: 'Posts this week', value: String(postsThisWeek) },
                { label: 'Posts this month', value: String(postsThisMonth) },
                { label: 'Total comments', value: String(totalComments) },
                { label: 'Comments this week', value: String(commentsThisWeek) },
                { label: 'Avg comments/post', value: String(avgCommentsPerPost) },
                { label: 'Total reactions', value: String(totalReactions) },
                { label: 'Avg reactions/post', value: totalPosts > 0 ? (totalReactions / totalPosts).toFixed(1) : '0' },
              ].map(s => (
                <div key={s.label} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <p style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', marginBottom: '0.3rem' }}>{s.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f5' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Marketplace Health</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Total conversations', value: String(totalConversations) },
                { label: 'Convs this month', value: String(conversationsThisMonth) },
                { label: 'Confirmed hires', value: String(confirmedHires) },
                { label: 'Pending confirmations', value: String(pendingHires) },
                { label: 'Hire rate', value: hireRate + '%' },
                { label: 'Builder:Employer ratio', value: totalEmployers > 0 ? (totalProfiles / totalEmployers).toFixed(1) + ':1' : 'N/A' },
                { label: 'Supply/demand', value: totalProfiles >= totalEmployers * 5 ? 'Healthy' : 'Needs builders' },
                { label: 'Avg hires/builder', value: totalProfiles > 0 ? (confirmedHires / totalProfiles).toFixed(2) : '0' },
              ].map(s => (
                <div key={s.label} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <p style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', marginBottom: '0.3rem' }}>{s.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: s.label === 'Supply/demand' ? (totalProfiles >= totalEmployers * 5 ? '#1a7f37' : '#c00') : '#f0f0f5' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,240,245,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Platform Activity — Last 8 Weeks</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
            {[
              { label: 'New builders', data: weeks.map(w => w.builders), max: maxBuilders, color: '#1a7f37' },
              { label: 'Build feed posts', data: weeks.map(w => w.posts), max: maxPosts, color: '#bf7e00' },
              { label: 'New conversations', data: weeks.map(w => w.convs), max: maxConvs, color: '#6c63ff' },
            ].map(chart => (
              <div key={chart.label}>
                <p style={{ fontSize: 12, fontWeight: 600, color: chart.color, marginBottom: '1rem' }}>{chart.label}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 80 }}>
                  {chart.data.map((val, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '100%', height: chart.max > 0 ? Math.max(4, (val / chart.max) * 72) : 4, background: val > 0 ? chart.color : 'rgba(255,255,255,0.05)', borderRadius: '3px 3px 0 0', opacity: 0.5 + (i / weeks.length) * 0.5 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: 10, color: 'rgba(240,240,245,0.25)' }}>{weeks[0]?.label}</span>
                  <span style={{ fontSize: 10, color: 'rgba(240,240,245,0.25)' }}>{weeks[weeks.length - 1]?.label}</span>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', marginTop: '0.5rem' }}>Total: {chart.data.reduce((a, b) => a + b, 0)} · Peak: {Math.max(...chart.data)}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,240,245,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Platform Controls</p>
          <AdminActions />
        </div>

        <div style={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f5' }}>Builder Profiles ({totalProfiles})</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Name', 'Email', 'Velocity', 'Verified', 'Last seen', 'Joined', 'Profile'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(240,240,245,0.4)', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(profiles || []).map((p: any, i: number) => (
                  <tr key={p.id} style={{ borderBottom: i < (profiles?.length || 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 13, fontWeight: 500, color: '#f0f0f5' }}>{p.full_name}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 12, color: 'rgba(240,240,245,0.5)' }}>{p.email}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: (p.velocity_score || 0) >= 75 ? '#1a7f37' : (p.velocity_score || 0) >= 50 ? '#0071e3' : '#aeaeb2' }}>{p.velocity_score || 0}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <VerifyToggle profileId={p.id} initialVerified={p.verified} builderEmail={p.email} builderName={p.full_name} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 12, color: 'rgba(240,240,245,0.4)' }}>
                      {p.last_seen_at ? new Date(p.last_seen_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Never'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 12, color: 'rgba(240,240,245,0.4)' }}>
                      {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Link href={'/u/' + p.username} style={{ fontSize: 12, color: '#6c63ff', textDecoration: 'none' }}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f5' }}>Subscriptions ({subscriptions?.length || 0})</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Email', 'Status', 'MRR', 'Started'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(240,240,245,0.4)', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(subscriptions || []).map((s: any, i: number) => (
                  <tr key={s.id} style={{ borderBottom: i < (subscriptions?.length || 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: '#f0f0f5' }}>{s.email}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 6, background: s.status === 'active' ? 'rgba(26,127,55,0.2)' : 'rgba(255,255,255,0.05)', color: s.status === 'active' ? '#1a7f37' : '#aeaeb2' }}>{s.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 13, fontWeight: 700, color: s.status === 'active' ? '#1a7f37' : '#aeaeb2' }}>{s.status === 'active' ? '$199' : '$0'}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 12, color: 'rgba(240,240,245,0.4)' }}>{new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {hireConfirmations && hireConfirmations.length > 0 && (
          <div style={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f5' }}>Hire Confirmations ({hireConfirmations.length})</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Builder', 'Employer', 'Builder', 'Employer', 'Confirmed'].map((h, i) => (
                      <th key={i} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(240,240,245,0.4)', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hireConfirmations.map((h: any, i: number) => (
                    <tr key={h.id} style={{ borderBottom: i < hireConfirmations.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 12, color: '#f0f0f5' }}>{h.builder_email}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 12, color: '#f0f0f5' }}>{h.employer_email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><span style={{ fontSize: 11, fontWeight: 600, color: h.builder_confirmed ? '#1a7f37' : '#aeaeb2' }}>{h.builder_confirmed ? 'Yes' : 'No'}</span></td>
                      <td style={{ padding: '0.75rem 1rem' }}><span style={{ fontSize: 11, fontWeight: 600, color: h.employer_confirmed ? '#1a7f37' : '#aeaeb2' }}>{h.employer_confirmed ? 'Yes' : 'No'}</span></td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 12, color: 'rgba(240,240,245,0.4)' }}>{h.confirmed_at ? new Date(h.confirmed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
