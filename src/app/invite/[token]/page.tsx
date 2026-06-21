import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import AcceptInviteForm from './AcceptInviteForm'

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Centered card shell for the non-actionable states (not found / used / expired).
function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '2rem', maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>{title}</h1>
        <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, marginBottom: '1.5rem' }}>{body}</p>
        <a href="/" style={{ fontSize: 13, padding: '0.6rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 600 }}>Go to ShipStacked →</a>
      </div>
    </div>
  )
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = adminClient()
  const tokenHash = sha256(token)

  const { data: invite } = await admin
    .from('invites')
    .select('id, invitee_email, inviter_user_id, team_entity_id, status, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!invite) {
    return <StateCard title="Invite not found" body="This invite link isn't valid. Ask whoever invited you to send a fresh one." />
  }
  if (invite.status !== 'pending') {
    return <StateCard title="This invite is no longer valid" body="It may have already been accepted or revoked. Ask for a new invite if you still need one." />
  }
  if (new Date(invite.expires_at) < new Date()) {
    return <StateCard title="This invite has expired" body="Invites are time-limited. Ask whoever invited you to send a new one." />
  }

  // Display context (best-effort).
  const { data: inviterProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('user_id', invite.inviter_user_id)
    .maybeSingle()
  const inviterName = inviterProfile?.full_name?.trim() || 'A ShipStacked member'

  let teamName: string | null = null
  if (invite.team_entity_id) {
    const { data: teamEnt } = await admin
      .from('entities')
      .select('display_name')
      .eq('id', invite.team_entity_id)
      .maybeSingle()
    teamName = teamEnt?.display_name ?? null
  }

  // Existing-user detection + current-team switch notice.
  const { data: userList } = await admin.auth.admin.listUsers()
  const existingUser = userList?.users.find(u => u.email === invite.invitee_email) ?? null
  const isExistingUser = !!existingUser

  let currentTeamName: string | null = null
  if (isExistingUser && invite.team_entity_id) {
    const { data: theirProfile } = await admin
      .from('profiles')
      .select('team_entity_id')
      .eq('user_id', existingUser!.id)
      .maybeSingle()
    const theirTeam = theirProfile?.team_entity_id
    if (theirTeam && theirTeam !== invite.team_entity_id) {
      const { data: curTeam } = await admin
        .from('entities')
        .select('display_name')
        .eq('id', theirTeam)
        .maybeSingle()
      currentTeamName = curTeam?.display_name ?? null
    }
  }

  return (
    <AcceptInviteForm
      rawToken={token}
      inviteeEmail={invite.invitee_email}
      teamName={teamName}
      inviterName={inviterName}
      isExistingUser={isExistingUser}
      currentTeamName={currentTeamName}
    />
  )
}
