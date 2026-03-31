import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TalentPage() {
  const supabase = await createServerSupabaseClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=/talent')
  }

  // Check subscription — must have full_access and not expired
  const now = new Date().toISOString()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('email', user.email)
    .eq('status', 'active')
    .eq('product', 'full_access')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()

  if (!sub) {
    redirect('/#pricing')
  }

  // Fetch all published profiles with their skills
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, skills(*)')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: 'rgba(255,255,255,0.85)', backdropFilter: 'saturate(180%) blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          ClaudHire<span style={{ color: '#0071e3' }}>.</span>
        </a>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#6e6e73' }}>{user.email}</span>
          <Link href="/post-job" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>Post a job</Link>
          <a href="/api/logout" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>Sign out</a>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '5rem 1.5rem 3rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Talent</p>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>Claude-native builders</h1>
          <p style={{ fontSize: 15, color: '#6e6e73' }}>
            {profiles?.length || 0} verified builder{profiles?.length !== 1 ? 's' : ''} available to hire.
          </p>
        </div>

        {!profiles || profiles.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: '1rem' }}>👀</p>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>Profiles coming soon.</h2>
            <p style={{ color: '#6e6e73', fontSize: 14 }}>We are onboarding our first verified builders. Check back shortly.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {profiles.map((profile: any) => {
              const initials = profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              const claudeSkills = profile.skills?.filter((s: any) => s.category === 'claude_use_case').slice(0, 3) || []
              const otherSkills = profile.skills?.filter((s: any) => s.category !== 'claude_use_case').slice(0, 3) || []

              return (
                <div key={profile.id} style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e8f1fd', color: '#0071e3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{profile.full_name}</div>
                      <div style={{ fontSize: 13, color: '#6e6e73', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {profile.role}{profile.location ? ` · ${profile.location}` : ''}
                      </div>
                    </div>
                    {profile.verified && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#0071e3', background: '#e8f1fd', padding: '0.2rem 0.5rem', borderRadius: 980, whiteSpace: 'nowrap' }}>
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  {profile.bio && (
                    <p style={{ fontSize: 13, color: '#3d3d3f', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {profile.bio}
                    </p>
                  )}

                  {(claudeSkills.length > 0 || otherSkills.length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {claudeSkills.map((s: any) => (
                        <span key={s.id} style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#e8f1fd', borderRadius: 980, color: '#0071e3', fontWeight: 500 }}>
                          {s.name}
                        </span>
                      ))}
                      {otherSkills.map((s: any) => (
                        <span key={s.id} style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: 12, color: '#aeaeb2', textTransform: 'capitalize' }}>{profile.availability || 'open'}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link href={`/u/${profile.username}`} style={{ fontSize: 12, padding: '0.4rem 0.85rem', background: '#f0f0f5', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
                        Profile
                      </Link>
                      {profile.email && (
                        <a href={`mailto:${profile.email}?subject=Opportunity via ClaudHire`} style={{ fontSize: 12, padding: '0.4rem 0.85rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
                          Contact
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}