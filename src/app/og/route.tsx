import { ImageResponse } from '@vercel/og'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')       // 'company' | 'job' | null
  const username = searchParams.get('username') // builder profile
  const name = searchParams.get('name') || ''   // company name OR job title
  const location = searchParams.get('location') || '' // company location OR company name for jobs

  // ── Company profile ──
  if (type === 'company') {
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'CO'
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0f', padding: '60px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'radial-gradient(ellipse at 30% 0%, rgba(0,113,227,0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 0%, rgba(108,99,255,0.15) 0%, transparent 60%)', display: 'flex' }} />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.02em' }}>ShipStacked<span style={{ color: '#6c63ff' }}>.</span></span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 48 }}>
            <div style={{ width: 80, height: 80, borderRadius: 18, background: 'linear-gradient(135deg, #0071e3, #0055b3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 24 }}>
              {initials}
            </div>
            <span style={{ fontSize: 52, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.03em', marginBottom: 12 }}>{name || 'Company'}</span>
            {location && <span style={{ fontSize: 24, color: 'rgba(240,240,245,0.5)' }}>📍 {location}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24 }}>
            <span style={{ fontSize: 18, color: 'rgba(167,139,250,0.8)' }}>shipstacked.com</span>
            <span style={{ fontSize: 16, color: '#34d399' }}>Hiring on ShipStacked</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // ── Job listing ──
  if (type === 'job') {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0f', padding: '60px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ width: 72, height: 72, background: '#0f0f18', borderRadius: 14, border: '1.5px solid #1e1e2e', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ background: '#161622', height: 18, display: 'flex', alignItems: 'center', paddingLeft: 8, gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#28c840' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 8px', flex: 1 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#6c63ff' }}>~/</span>
                <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#0071e3' }}>ship</span>
                <div style={{ width: 6, height: 18, background: '#0071e3', borderRadius: 2, marginLeft: 2, opacity: 0.9 }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.02em' }}>ShipStacked</span>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#0071e3' }}>.</span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 48 }}>
            <div style={{ display: 'flex', marginBottom: 28 }}>
              <div style={{ display: 'flex', background: 'rgba(26,127,55,0.2)', border: '1px solid rgba(26,127,55,0.4)', borderRadius: 12, padding: '8px 20px' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#34d399', letterSpacing: '0.05em' }}>NOW HIRING</span>
              </div>
            </div>
            <span style={{ fontSize: 56, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.03em', marginBottom: 16, lineHeight: '1.1' }}>{name || 'Open Role'}</span>
            {location && <span style={{ fontSize: 28, color: 'rgba(240,240,245,0.4)', fontWeight: 400 }}>{location}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
            <span style={{ fontSize: 18, color: 'rgba(108,99,255,0.8)', fontFamily: 'monospace' }}>~/ship → shipstacked.com/jobs</span>
            <span style={{ fontSize: 16, color: 'rgba(240,240,245,0.25)' }}>proof-of-work hiring</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // ── Builder profile (username param) ──
  let builderName = 'ShipStacked Builder'
  let builderRole = 'AI-native builder'
  let verified = false
  let builderLocation = ''

  if (username) {
    try {
      const supabase = await createServerSupabaseClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, verified, location')
        .eq('username', username)
        .eq('published', true)
        .maybeSingle()
      if (profile) {
        builderName = profile.full_name || builderName
        builderRole = profile.role || builderRole
        verified = profile.verified || false
        builderLocation = profile.location || ''
      }
    } catch {}
  }

  // Builder card (with username) or default ShipStacked card (no params)
  if (username) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0f', padding: '60px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

          {/* Top bar — terminal logomark + wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ width: 72, height: 72, background: '#0f0f18', borderRadius: 14, border: '1.5px solid #1e1e2e', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ background: '#161622', height: 18, display: 'flex', alignItems: 'center', paddingLeft: 8, gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#28c840' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 8px', flex: 1 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#6c63ff' }}>~/</span>
                <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#0071e3' }}>ship</span>
                <div style={{ width: 6, height: 18, background: '#0071e3', borderRadius: 2, marginLeft: 2, opacity: 0.9 }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.02em' }}>ShipStacked</span>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#0071e3' }}>.</span>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Builder info */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: 40, background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'white' }}>
                {builderName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                  <span style={{ fontSize: 52, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.03em' }}>{builderName}</span>
                  {verified && (
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', padding: '4px 14px', borderRadius: 20, letterSpacing: '0.06em' }}>VERIFIED</span>
                  )}
                </div>
                <span style={{ fontSize: 24, color: 'rgba(240,240,245,0.5)' }}>{builderRole}{builderLocation ? ` · ${builderLocation}` : ''}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
            <span style={{ fontSize: 18, color: 'rgba(108,99,255,0.8)', fontFamily: 'monospace' }}>~/ship → shipstacked.com</span>
            <span style={{ fontSize: 16, color: 'rgba(240,240,245,0.25)' }}>proof-of-work hiring</span>
          </div>

        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // ── Default ShipStacked OG (no params) ──
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at 50% 30%, rgba(108,99,255,0.25) 0%, transparent 60%)', display: 'flex' }} />
        <span style={{ fontSize: 72, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.04em', marginBottom: 24 }}>ShipStacked<span style={{ color: '#6c63ff' }}>.</span></span>
        <span style={{ fontSize: 28, color: 'rgba(240,240,245,0.5)', fontWeight: 300 }}>The proof-of-work platform for AI-native builders</span>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
