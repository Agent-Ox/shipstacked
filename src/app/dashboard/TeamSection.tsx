import { createClient } from '@supabase/supabase-js'
import EnableHiringButton from '@/app/components/EnableHiringButton'
import InviteCard from './InviteCard'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Phase 9 Part 1 — minimal team home on /dashboard. Profile card + edit/view +
// member preview + (per-user) Hiring Access. Team-scoped messaging/jobs/billing
// are Part 2.
export default async function TeamSection({
  teamEntityId, teamSlug,
}: { teamEntityId?: number; teamSlug?: string }) {
  if (!teamEntityId || !teamSlug) return null
  const admin = adminClient()

  const { data: profile } = await admin
    .from('team_profiles')
    .select('team_name, tagline, logo_url, published')
    .eq('entity_id', teamEntityId)
    .maybeSingle()

  const { data: members } = await admin
    .from('profiles')
    .select('username, full_name, avatar_url')
    .eq('team_entity_id', teamEntityId)
    .eq('published', true)
    .order('full_name')
    .limit(5)

  const { count: memberCount } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('team_entity_id', teamEntityId)
    .eq('published', true)

  const teamName = profile?.team_name || teamSlug
  const initials = teamName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const memberList = members || []

  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Your team</p>

      {/* Profile card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0, overflow: 'hidden', background: profile?.logo_url ? 'transparent' : 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white' }}>
          {profile?.logo_url ? <img src={profile.logo_url} alt={teamName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{teamName}</p>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: 980, background: profile?.published ? '#e3f3e3' : '#f5f5f7', color: profile?.published ? '#1a7f37' : '#6e6e73' }}>
              {profile?.published ? 'Published' : 'Unpublished'}
            </span>
          </div>
          {profile?.tagline && <p style={{ fontSize: 13, color: '#6e6e73', marginTop: '0.2rem' }}>{profile.tagline}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <a href={`/team/${teamSlug}/edit`} style={{ padding: '0.5rem 1rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>Edit team</a>
        <a href={`/team/${teamSlug}`} style={{ padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>View public page</a>
        <a href={`/paste?subject=${teamEntityId}`} style={{ padding: '0.5rem 1rem', background: '#1a7f37', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>Post work as {teamName} →</a>
      </div>

      {/* Members */}
      <div style={{ borderTop: '0.5px solid #f0f0f5', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>Members <span style={{ color: '#6e6e73', fontWeight: 400 }}>({memberCount || 0})</span></p>
          <a href={`/team/${teamSlug}/edit#members`} style={{ fontSize: 12, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>Manage members →</a>
        </div>
        {memberList.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6e6e73' }}>No members yet. Invite teammates below — they'll join your team when they accept.</p>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {memberList.map((m: any) => {
              const mi = (m.full_name || m.username).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <a key={m.username} href={`/u/${m.username}`} title={m.full_name || m.username} style={{ textDecoration: 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                    {m.avatar_url ? <img src={m.avatar_url} alt={m.full_name || m.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : mi}
                  </div>
                </a>
              )
            })}
          </div>
        )}

        {/* Invite teammates */}
        <div style={{ marginTop: '1.25rem' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>Invite teammates</p>
          <InviteCard teamEntityId={teamEntityId} />
        </div>
      </div>

      {/* Hiring Access — per-user billing for Part 1 */}
      <div style={{ borderTop: '0.5px solid #f0f0f5', paddingTop: '1.25rem' }}>
        <EnableHiringButton source="team_dashboard" variant="card" />
        <p style={{ fontSize: 11, color: '#aeaeb2', lineHeight: 1.5 }}>Hiring Access is currently billed per-user (your account email). Team-scoped billing arrives in Part 2.</p>
      </div>
    </div>
  )
}
