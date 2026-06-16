import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import AgentEditClient from './AgentEditClient'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export type PrincipalOption = { entity_id: number; kind: 'human' | 'team'; slug: string; display_name: string }

export default async function AgentEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // 1. Auth — must be logged in.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/agent/${slug}/edit`)

  const admin = adminClient()

  // 2. Resolve agent.
  const { data: entity } = await admin
    .from('entities')
    .select('id, slug, display_name, owner_user_id')
    .eq('slug', slug)
    .eq('kind', 'agent')
    .maybeSingle()
  if (!entity) notFound()

  // 3. Owner check (single-owner — no team_admins analogue, §N).
  if (entity.owner_user_id !== user.id) {
    return (
      <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 40, marginBottom: '0.5rem' }}>🔒</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>You don't own this agent</h1>
          <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            You found the right agent, but only its owner can edit the profile.
          </p>
          <a href={`/agent/${entity.slug}`} style={{ display: 'inline-block', padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            Back to agent page →
          </a>
        </div>
      </div>
    )
  }

  // 4. Agent profile.
  const { data: profile } = await admin
    .from('agent_profiles')
    .select('*')
    .eq('entity_id', entity.id)
    .maybeSingle()
  if (!profile) notFound()

  // 5. Principal options — the owner's own human entity + every team they admin.
  const principalOptions: PrincipalOption[] = []

  const { data: humanEntity } = await admin
    .from('entities')
    .select('id, slug, display_name')
    .eq('owner_user_id', user.id)
    .eq('kind', 'human')
    .limit(1)
    .maybeSingle()
  if (humanEntity) {
    principalOptions.push({ entity_id: humanEntity.id, kind: 'human', slug: humanEntity.slug, display_name: humanEntity.display_name })
  }

  const { data: adminTeams } = await admin
    .from('team_admins')
    .select('team_entity_id, entities!team_admins_team_entity_id_fkey(id, slug, display_name, kind)')
    .eq('user_id', user.id)
  for (const row of adminTeams ?? []) {
    const ent = (row as any).entities
    const e = Array.isArray(ent) ? ent[0] : ent
    if (e && e.kind === 'team') {
      principalOptions.push({ entity_id: e.id, kind: 'team', slug: e.slug, display_name: e.display_name })
    }
  }

  return (
    <AgentEditClient
      entity={{ id: entity.id, slug: entity.slug }}
      profile={profile}
      ownerEmail={user.email ?? ''}
      principalOptions={principalOptions}
    />
  )
}
