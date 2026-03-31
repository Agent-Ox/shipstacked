import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', user.email)
    .single()

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <nav style={{ borderBottom: '0.5px solid #e0e0e5', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          ClaudHire<span style={{ color: '#0071e3' }}>.</span>
        </a>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#6e6e73' }}>{user.email}</span>
          <Link href="/api/logout" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' }}>Sign out</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>
          {profile ? `Welcome back, ${profile.full_name.split(' ')[0]}.` : 'Welcome.'}
        </h1>
        <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '3rem' }}>Your ClaudHire dashboard.</p>

        {profile ? (
          <div style={{ display: 'grid', gap: '1rem' }}>

            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.25rem' }}>Your profile</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>claudhire.com/u/{profile.username}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href="/dashboard/edit" style={{ padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 20, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                  Edit
                </Link>
                <Link href={`/u/${profile.username}`} style={{ padding: '0.5rem 1rem', background: '#0071e3', color: 'white', borderRadius: 20, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                  View →
                </Link>
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.25rem' }}>Verified status</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: profile.verified ? '#1a7f37' : '#6e6e73' }}>
                  {profile.verified ? '✓ Verified builder' : 'Not yet verified'}
                </p>
              </div>
              {!profile.verified && (
                <span style={{ fontSize: 12, color: '#6e6e73', maxWidth: 200, textAlign: 'right', lineHeight: 1.4 }}>
                  Verification is manual — we review your projects and confirm.
                </span>
              )}
            </div>

            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.25rem' }}>Share your profile</p>
                <p style={{ fontSize: 14, color: '#1d1d1f' }}>Let the world know you build with Claude.</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`https://x.com/intent/tweet?text=Check out my ClaudHire profile — here is what I build with Claude&url=https://claudhire.com/u/${profile.username}`}
                  target="_blank" style={{ padding: '0.5rem 1rem', background: '#000', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>
                  X
                </a>
                <a href={`https://wa.me/?text=Check out my ClaudHire profile: https://claudhire.com/u/${profile.username}`}
                  target="_blank" style={{ padding: '0.5rem 1rem', background: '#25D366', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>
                  WhatsApp
                </a>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#6e6e73', marginBottom: '1rem' }}>You do not have a profile yet.</p>
            <Link href="/join" style={{ padding: '0.75rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 20, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Create your profile →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}