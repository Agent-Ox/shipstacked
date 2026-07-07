import type { ReactNode } from 'react'
import type { EntityModes, EntityRefs } from '@/lib/user'
import TeamSection from './TeamSection'
import AgentSection from './AgentSection'
import BuyerSection from './BuyerSection'
import HirerSection from './HirerSection'
import InviteCard from './InviteCard'

// Phase 9 Part 1 — pillar-aware container for multi-pillar OR non-builder users.
// Builder-only users never reach here (page.tsx renders BuilderDashboardClient
// directly for zero regression). When a multi-pillar user IS a builder, the full
// builder dashboard is passed in as `builderNode` (its own self-contained block),
// then the remaining pillar sections stack below.
export default function DashboardShell({
  modes, refs, email, builderNode = null,
}: {
  modes: EntityModes
  refs: EntityRefs
  email: string
  builderNode?: ReactNode
}) {
  return (
    <>
      {builderNode}
      <div style={{ minHeight: builderNode ? undefined : '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: builderNode ? '1.5rem 1.5rem 5rem' : '3rem 1.5rem 5rem' }}>

          {/* When builder content already led with its own header, skip a second one. */}
          {!modes.builder && (
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.3rem' }}>Your dashboard</h1>
              <p style={{ color: '#6e6e73', fontSize: 15 }}>{email}</p>
            </div>
          )}

          {/* D2b-1: `client` retired. A service-org owner (offers_services) gets
              the team command center; a buyer-org owner (offers_services=false)
              gets the buyer home. org_offers_services is resolved server-side in
              getUserState. Fail-open (!== false) keeps TeamSection for a service
              org if the flag read ever comes back undefined. */}
          {modes.team_admin && refs.org_offers_services !== false && <TeamSection teamEntityId={refs.team_entity_id} teamSlug={refs.team_slug} email={email} />}
          {modes.agent_owner && <AgentSection agentEntityId={refs.agent_entity_id} agentSlug={refs.agent_slug} />}
          {modes.team_admin && refs.org_offers_services === false && <BuyerSection email={email} hasSubscription={modes.hirer} />}
          {modes.hirer && <HirerSection />}

          {/* Invite a colleague — generic platform-growth prompt. Suppressed for
              team owners, who get the team-scoped "Invite teammates" in TeamSection
              (inviting members who JOIN the team, not just the platform). */}
          {!modes.team_admin && (
            <div style={{ background:'white', border:'1px solid #e0e0e5', borderRadius:14, padding:'1.25rem 1.5rem', marginBottom:'1rem' }}>
              <p style={{ fontSize:12, fontWeight:600, color:'#6e6e73', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:'0.3rem' }}>Invite a colleague</p>
              <p style={{ fontSize:13, color:'#6e6e73', lineHeight:1.5, marginBottom:'0.75rem' }}>Know someone shipping AI-native work? Invite them to ShipStacked.</p>
              <InviteCard />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
