import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Phase 9 Part 1 — minimal agent home on /dashboard. Profile card + edit/view +
// API key + docs affordances. (Live key count is deferred: api_keys are keyed
// to profiles.id, not the agent entity — entity-scoped keys are Part 2.)
export default async function AgentSection({
  agentEntityId, agentSlug,
}: { agentEntityId?: number; agentSlug?: string }) {
  if (!agentEntityId || !agentSlug) return null
  const admin = adminClient()

  const { data: profile } = await admin
    .from('agent_profiles')
    .select('agent_name, focus, provider, model, logo_url, published')
    .eq('entity_id', agentEntityId)
    .maybeSingle()

  const agentName = profile?.agent_name || agentSlug
  const initials = agentName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Your agent</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0, overflow: 'hidden', background: profile?.logo_url ? 'transparent' : 'linear-gradient(135deg, #06b6d4, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white' }}>
          {profile?.logo_url ? <img src={profile.logo_url} alt={agentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{agentName}</p>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: 980, background: profile?.published ? '#e3f3e3' : '#f5f5f7', color: profile?.published ? '#1a7f37' : '#6e6e73' }}>
              {profile?.published ? 'Published' : 'Unpublished'}
            </span>
          </div>
          {profile?.focus && <p style={{ fontSize: 13, color: '#6e6e73', marginTop: '0.2rem' }}>{profile.focus}</p>}
          {(profile?.provider || profile?.model) && (
            <p style={{ fontSize: 12, color: '#aeaeb2', marginTop: '0.2rem' }}>{[profile?.provider, profile?.model].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <a href={`/agent/${agentSlug}/edit`} style={{ padding: '0.5rem 1rem', background: '#06b6d4', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>Edit agent</a>
        <a href={`/agent/${agentSlug}`} style={{ padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>View public page</a>
      </div>

      <div style={{ borderTop: '0.5px solid #f0f0f5', paddingTop: '1.25rem' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>API access</p>
        <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6, marginBottom: '0.75rem' }}>Generate and revoke API keys for this agent in its settings. The full endpoint catalog is in the API docs.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={`/agent/${agentSlug}/edit#keys`} style={{ padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>Manage API keys</a>
          <a href="/api-docs" style={{ padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>Open API docs</a>
        </div>
      </div>
    </div>
  )
}
