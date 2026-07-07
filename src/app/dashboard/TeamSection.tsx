import { createClient } from '@supabase/supabase-js'
import EnableHiringButton from '@/app/components/EnableHiringButton'
import ConnectAnAgent from '@/app/components/ConnectAnAgent'
import InviteCard from './InviteCard'
import TeamJobsManager from './TeamJobsManager'
import { getTeamMembers } from '@/lib/team/members'
import { resolveOrgByEmail } from '@/lib/org/resolve-by-email'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const cardStyle: React.CSSProperties = {
  background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem',
}
const cardLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem',
}
const linkPrimary: React.CSSProperties = {
  padding: '0.5rem 1rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none',
}
const linkNeutral: React.CSSProperties = {
  padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none',
}
const sectionAction: React.CSSProperties = { fontSize: 12, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }
const rowLink: React.CSSProperties = { display: 'block', textDecoration: 'none', color: 'inherit', padding: '0.5rem 0', borderTop: '0.5px solid #f0f0f5' }
const emptyText: React.CSSProperties = { fontSize: 13, color: '#6e6e73' }

// Phase 9 Part 2 — the team command center. /dashboard's team home: at-a-glance
// stats, messages, jobs, proof-of-work, members+invite, with edit-profile linked
// from the Manage section. All queries are reads via the service-role client.
export default async function TeamSection({
  teamEntityId, teamSlug, email,
}: { teamEntityId?: number; teamSlug?: string; email: string }) {
  if (!teamEntityId || !teamSlug) return null
  const admin = adminClient()

  const { data: profile } = await admin
    .from('team_profiles')
    .select('team_name, tagline, logo_url, published')
    .eq('entity_id', teamEntityId)
    .maybeSingle()

  const now = new Date().toISOString()

  // Parallel reads — members (source-of-truth getTeamMembers), counts, and lists.
  const [
    teamMembers,
    { count: proofCount },
    { count: activeJobsCount },
    { count: convCount },
    { data: recentConvs },
    { data: recentProof },
    { data: managerJobs },
  ] = await Promise.all([
    // FIX 1 — member count/list via getTeamMembers (includes the owner from
    // team_admins), matching the public team page + editor. Profiles-only counting
    // omitted the owner and disagreed with those surfaces.
    getTeamMembers(admin, teamEntityId, { publishedOnly: true }),
    // Proof count = published L1 proof. May EXCEED the public team page's
    // "verified receipts" display, which additionally drops shared-doc-host
    // receipts (a /u-parity display filter not applied to this dashboard count).
    admin.from('proof_receipts').select('id', { count: 'exact', head: true }).eq('subject_id', teamEntityId).eq('visibility', 'public').eq('verification_level', 'L1_artifact_confirmed'),
    // FIX 2 — active-jobs count matches /jobs: status='active' AND expires_at>now.
    admin.from('jobs').select('id', { count: 'exact', head: true }).eq('subject_entity_id', teamEntityId).eq('status', 'active').gt('expires_at', now),
    admin.from('conversations').select('id', { count: 'exact', head: true }).eq('subject_entity_id', teamEntityId),
    admin.from('conversations').select('id, employer_email, last_message_at').eq('subject_entity_id', teamEntityId).order('last_message_at', { ascending: false }).limit(3),
    admin.from('proof_receipts').select('id, slug, title, issued_at').eq('subject_id', teamEntityId).eq('visibility', 'public').eq('verification_level', 'L1_artifact_confirmed').order('issued_at', { ascending: false }).limit(5),
    // FIX 3 — ALL the team's jobs (active + paused) for the manager, scoped to the
    // owner's email (post-as-team sets employer_email = owner). Every mutation is
    // re-scoped .eq('employer_email', ownerEmail) so only the owner's jobs change.
    admin.from('jobs').select('id, role_title, status, created_at').eq('subject_entity_id', teamEntityId).eq('employer_email', email).order('created_at', { ascending: false }),
  ])
  const memberCount = teamMembers.length

  // Resolve contacter display name for recent conversations (mirrors the
  // ?as=team listing in api/messages/route.ts).
  // Stage 5d: contacter name via the org (team_profiles.team_name), then builder
  // name, then email — replacing the employer_profiles lookup.
  const convEmails = [...new Set((recentConvs || []).map((c: any) => c.employer_email))]
  const orgByEmail = await resolveOrgByEmail(admin, convEmails)
  const { data: profs } = convEmails.length > 0
    ? await admin.from('profiles').select('email, full_name').in('email', convEmails)
    : { data: [] as any[] }
  const prMap = Object.fromEntries((profs || []).map((p: any) => [p.email, p]))
  const contacterName = (em: string) => orgByEmail.get(em)?.team_name || prMap[em]?.full_name || em

  const teamName = profile?.team_name || teamSlug
  const initials = teamName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const memberList = teamMembers.slice(0, 5)

  return (
    <div>
      {/* Identity + at-a-glance */}
      <div style={cardStyle}>
        <p style={cardLabel}>Your team</p>
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
        {/* Stat row */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', borderTop: '0.5px solid #f0f0f5', paddingTop: '1rem' }}>
          {[
            { label: 'Members', value: memberCount || 0 },
            { label: 'Proof of work', value: proofCount || 0 },
            { label: 'Active jobs', value: activeJobsCount || 0 },
            { label: 'Messages', value: convCount || 0 },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f' }}>{s.value}</p>
              <p style={{ fontSize: 12, color: '#6e6e73' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <p style={cardLabel}>Messages</p>
          <a href="/messages?as=team" style={sectionAction}>View inbox →</a>
        </div>
        {(recentConvs || []).length === 0 ? (
          <p style={emptyText}>No messages yet.</p>
        ) : (
          <div>
            {(recentConvs || []).map((c: any) => (
              <a key={c.id} href="/messages?as=team" style={rowLink}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <span style={{ fontSize: 14, color: '#1d1d1f', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contacterName(c.employer_email)}</span>
                  {c.last_message_at && <span style={{ fontSize: 12, color: '#aeaeb2', flexShrink: 0 }}>{timeAgo(c.last_message_at)}</span>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Jobs */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <p style={cardLabel}>Jobs</p>
          <a href="/post-job" style={sectionAction}>Post a job →</a>
        </div>
        <TeamJobsManager jobs={managerJobs || []} ownerEmail={email} />
      </div>

      {/* Proof of work */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <p style={cardLabel}>Proof of work</p>
          <a href={`/paste?subject=${teamEntityId}`} style={sectionAction}>Post work →</a>
        </div>
        {(recentProof || []).length === 0 ? (
          <p style={emptyText}>No work published yet — <a href={`/paste?subject=${teamEntityId}`} style={{ color: '#0071e3', textDecoration: 'none' }}>Post work →</a></p>
        ) : (
          <div>
            {(recentProof || []).map((r: any) => (
              <a key={r.id} href={`/p/${r.slug}`} style={rowLink}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <span style={{ fontSize: 14, color: '#1d1d1f', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || r.slug}</span>
                  {r.issued_at && <span style={{ fontSize: 12, color: '#aeaeb2', flexShrink: 0 }}>{timeAgo(r.issued_at)}</span>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Members + Invite */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <p style={cardLabel}>Members <span style={{ color: '#6e6e73', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({memberCount || 0})</span></p>
          <a href={`/team/${teamSlug}/edit#members`} style={sectionAction}>Manage members →</a>
        </div>
        {memberList.length === 0 ? (
          <p style={emptyText}>No members yet. Invite teammates below — they&apos;ll join your team when they accept.</p>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {memberList.map((m: any) => {
              // Null-safe: the profile-less owner (username null) renders a plain
              // avatar chip, no /u/null link (mirrors the editor People guard).
              const displayName = m.full_name || m.username || (m.team_role === 'owner' ? 'Owner' : m.team_role === 'admin' ? 'Admin' : 'Member')
              const mi = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              const avatar = (
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                  {m.avatar_url ? <img src={m.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : mi}
                </div>
              )
              return m.username
                ? <a key={m.id} href={`/u/${m.username}`} title={displayName} style={{ textDecoration: 'none' }}>{avatar}</a>
                : <div key={m.id} title={displayName}>{avatar}</div>
            })}
          </div>
        )}
        <div style={{ marginTop: '1.25rem' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>Invite teammates</p>
          <InviteCard teamEntityId={teamEntityId} />
        </div>
      </div>

      {/* Manage */}
      <div style={cardStyle}>
        <p style={cardLabel}>Manage</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <a href={`/team/${teamSlug}/edit`} style={linkPrimary}>Edit team profile</a>
          <a href={`/team/${teamSlug}`} style={linkNeutral}>View public page</a>
        </div>
        <EnableHiringButton source="team_dashboard" variant="card" />
        <ConnectAnAgent scope="team:rw" variant="team_dashboard" email={email} username={teamSlug} />
      </div>
    </div>
  )
}
