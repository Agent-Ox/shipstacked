import { ImageResponse } from '@vercel/og'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'edge'

const VERIFICATION_LABELS: Record<string, string> = {
  L0_claimed: 'L0 Claimed',
  L1_artifact_confirmed: 'L1 Artifact Confirmed',
  L2_technically_checked: 'L2 Technically Checked',
  L3_externally_attested: 'L3 Externally Attested',
  L4_cryptographically_signed: 'L4 Cryptographically Signed',
}

function verificationBadgeColor(level: string): { fg: string; bg: string; border: string } {
  if (level.startsWith('L0')) return { fg: '#aeaeb2', bg: 'rgba(174,174,178,0.12)', border: 'rgba(174,174,178,0.3)' }
  if (level.startsWith('L1')) return { fg: '#34d399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)' }
  if (level.startsWith('L2')) return { fg: '#34d399', bg: 'rgba(52,211,153,0.2)', border: 'rgba(52,211,153,0.4)' }
  return { fg: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)' }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')       // 'company' | 'job' | 'builder' | 'receipt' | null
  const username = searchParams.get('username') // builder profile (legacy)
  const name = searchParams.get('name') || ''   // company name OR job title OR builder name
  const location = searchParams.get('location') || '' // company location OR company name for jobs
  const verifiedParam = searchParams.get('verified') // builder verified flag
  const roleParam = searchParams.get('role') || '' // builder role

  // Receipt OG card — on-demand, reads from DB by slug. Service role so the
  // card renders for unlisted receipts too (the card reveals only the
  // already-shared title + subject + Atlas role IDs).
  if (type === 'receipt') {
    const slug = searchParams.get('slug')
    if (slug) {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      const { data: receipt } = await admin
        .from('proof_receipts')
        .select('title, atlas_confirmed, atlas_inferred, verification_level, subject_id')
        .eq('slug', slug)
        .maybeSingle()
      let subjectName = 'ShipStacked builder'
      if (receipt?.subject_id) {
        const { data: entity } = await admin
          .from('entities')
          .select('display_name')
          .eq('id', receipt.subject_id)
          .maybeSingle()
        if (entity?.display_name) subjectName = entity.display_name as string
      }
      const title = truncate((receipt?.title as string) ?? 'Proof receipt', 70)
      const verificationLevel = (receipt?.verification_level as string) ?? 'L0_claimed'
      const verificationLabel = VERIFICATION_LABELS[verificationLevel] ?? verificationLevel
      const badge = verificationBadgeColor(verificationLevel)
      const confirmed: string[] = Array.isArray(receipt?.atlas_confirmed) ? (receipt!.atlas_confirmed as string[]) : []
      const inferred: string[] = Array.isArray(receipt?.atlas_inferred) ? (receipt!.atlas_inferred as string[]) : []
      const roles: string[] = [...confirmed, ...inferred.filter(id => !confirmed.includes(id))].slice(0, 4)

      return new ImageResponse(
        (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0f', padding: '60px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ width: 64, height: 64, background: '#0f0f18', borderRadius: 12, border: '1.5px solid #1e1e2e', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ background: '#161622', height: 16, display: 'flex', alignItems: 'center', paddingLeft: 8, gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#28c840' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '8px', flex: 1 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#6c63ff' }}>~/</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#0071e3' }}>ship</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.02em' }}>ShipStacked</span>
                <span style={{ fontSize: 30, fontWeight: 700, color: '#0071e3' }}>.</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', background: badge.bg, border: `1px solid ${badge.border}`, padding: '8px 16px', borderRadius: 999 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: badge.fg, letterSpacing: '0.05em' }}>{verificationLabel}</span>
              </div>
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 36 }}>
              <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14, fontWeight: 700 }}>Proof receipt</span>
              <span style={{ fontSize: 56, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 22 }}>{title}</span>
              <span style={{ fontSize: 22, color: 'rgba(240,240,245,0.55)', letterSpacing: '-0.005em' }}>{subjectName}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {roles.length > 0 ? (
                  <>
                    <span style={{ fontSize: 13, color: 'rgba(240,240,245,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Atlas</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 18, color: 'rgba(108,99,255,0.9)', fontWeight: 700, letterSpacing: '0.04em' }}>{roles.join(' · ')}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 14, color: 'rgba(240,240,245,0.3)' }}>Unclassified</span>
                )}
              </div>
              <span style={{ fontSize: 16, color: 'rgba(240,240,245,0.25)' }}>shipstacked.com/p/{slug}</span>
            </div>
          </div>
        ),
        { width: 1200, height: 630 },
      )
    }
  }

  // Fast path — builder OG with data passed as params (no DB lookup needed)
  if (type === 'builder') {
    const builderName = name || 'ShipStacked Builder'
    const builderRole = roleParam || 'AI-native builder'
    const builderLocation = location || ''
    const verified = verifiedParam === 'true'
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
            <span style={{ fontSize: 18, color: 'rgba(108,99,255,0.8)', fontFamily: 'monospace' }}>~/ship → shipstacked.com</span>
            <span style={{ fontSize: 16, color: 'rgba(240,240,245,0.25)' }}>proof-of-work hiring</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

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

  // ── Team / Agency / Studio profile (Phase 4 §F.2) ──
  if (type === 'team') {
    const teamName = name || 'Team'
    const tagline = searchParams.get('tagline') || ''
    const teamVerified = verifiedParam === 'true'
    const services = (searchParams.get('services') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
    const initials = teamName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'TM'
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0f', padding: '60px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'radial-gradient(ellipse at 30% 0%, rgba(108,99,255,0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 0%, rgba(0,113,227,0.15) 0%, transparent 60%)', display: 'flex' }} />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.02em' }}>ShipStacked<span style={{ color: '#6c63ff' }}>.</span></span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: 18, background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'white' }}>
                {initials}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 52, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.03em' }}>{teamName}</span>
                {teamVerified && (
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', padding: '4px 14px', borderRadius: 20, letterSpacing: '0.06em' }}>VERIFIED</span>
                )}
              </div>
            </div>
            {tagline && <span style={{ fontSize: 24, color: 'rgba(240,240,245,0.55)', marginBottom: 18 }}>{tagline}</span>}
            {services.length > 0 && (
              <div style={{ display: 'flex', gap: 10 }}>
                {services.map((s) => (
                  <span key={s} style={{ fontSize: 16, color: 'rgba(167,139,250,0.9)', background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)', padding: '6px 16px', borderRadius: 999 }}>{s}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
            <span style={{ fontSize: 18, color: 'rgba(108,99,255,0.8)', fontFamily: 'monospace' }}>~/ship → shipstacked.com</span>
            <span style={{ fontSize: 16, color: 'rgba(240,240,245,0.25)' }}>proof-of-work hiring</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // ── Autonomous Agent profile (Phase 5 §F.4) ──
  if (type === 'agent') {
    const agentName = name || 'Agent'
    const provider = (searchParams.get('provider') || '').trim()
    const focus = searchParams.get('focus') || ''
    const agentVerified = verifiedParam === 'true'
    const capabilities = (searchParams.get('capabilities') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
    const initials = agentName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'AG'
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0f', padding: '60px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'radial-gradient(ellipse at 30% 0%, rgba(6,182,212,0.28) 0%, transparent 60%), radial-gradient(ellipse at 80% 0%, rgba(59,130,246,0.18) 0%, transparent 60%)', display: 'flex' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.02em' }}>ShipStacked<span style={{ color: '#06b6d4' }}>.</span></span>
            {provider && (
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', padding: '8px 18px', borderRadius: 999 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#67e8f9', letterSpacing: '0.04em' }}>🤖 {provider.toUpperCase()}</span>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: 18, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'white' }}>
                {initials}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 52, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.03em' }}>{agentName}</span>
                {agentVerified && (
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', padding: '4px 14px', borderRadius: 20, letterSpacing: '0.06em' }}>VERIFIED</span>
                )}
              </div>
            </div>
            {focus && <span style={{ fontSize: 24, color: 'rgba(240,240,245,0.55)', marginBottom: 18 }}>{focus}</span>}
            {capabilities.length > 0 && (
              <div style={{ display: 'flex', gap: 10 }}>
                {capabilities.map((c) => (
                  <span key={c} style={{ fontSize: 16, color: 'rgba(103,232,249,0.9)', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', padding: '6px 16px', borderRadius: 999 }}>{c}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
            <span style={{ fontSize: 18, color: 'rgba(6,182,212,0.8)', fontFamily: 'monospace' }}>~/ship → shipstacked.com</span>
            <span style={{ fontSize: 16, color: 'rgba(240,240,245,0.25)' }}>proof-of-work hiring</span>
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
