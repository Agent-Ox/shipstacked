import type { ReactNode } from 'react'
import type { EntityModes, EntityRefs } from '@/lib/user'
import TeamSection from './TeamSection'
import AgentSection from './AgentSection'
import BuyerSection from './BuyerSection'
import HirerSection from './HirerSection'

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

          {modes.team_admin && <TeamSection teamEntityId={refs.team_entity_id} teamSlug={refs.team_slug} />}
          {modes.agent_owner && <AgentSection agentEntityId={refs.agent_entity_id} agentSlug={refs.agent_slug} />}
          {modes.client && <BuyerSection email={email} hasSubscription={modes.hirer} />}
          {modes.hirer && <HirerSection />}
        </div>
      </div>
    </>
  )
}
