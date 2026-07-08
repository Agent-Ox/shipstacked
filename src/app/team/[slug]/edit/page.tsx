import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import TeamEditClient from './TeamEditClient'
import { getTeamMembers } from '@/lib/team/members'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function TeamEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // 1. Auth — must be logged in.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/team/${slug}/edit`)

  const admin = adminClient()

  // 2. Resolve team.
  const { data: entity } = await admin
    .from('entities')
    .select('id, slug, display_name')
    .eq('slug', slug)
    // Serve service teams AND hiring orgs (buyer orgs). Mirrors the display page
    // (team/[slug]/page.tsx), which 5a widened to ['team','org']; the edit page
    // was missed, so a buyer-org owner's "Publish" CTA 404'd. Both kinds live in
    // team_profiles + team_admins, so the rest of this page is kind-agnostic.
    .in('kind', ['team', 'org'])
    .maybeSingle()
  if (!entity) notFound()

  // 3. Verify admin membership.
  const { data: adminRow } = await admin
    .from('team_admins')
    .select('id')
    .eq('team_entity_id', entity.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!adminRow) {
    return (
      <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 40, marginBottom: '0.5rem' }}>🔒</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>You're not an admin of this team</h1>
          <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            You found the right team, but only its admins can edit the profile.
          </p>
          <a href={`/team/${entity.slug}`} style={{ display: 'inline-block', padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            Back to team page →
          </a>
        </div>
      </div>
    )
  }

  // 4. Team profile.
  const { data: profile } = await admin
    .from('team_profiles')
    .select('*')
    .eq('entity_id', entity.id)
    .maybeSingle()
  if (!profile) notFound()

  // 5. People — owners/admins (team_admins) UNION all linked builders (admin sees
  // ALL, including unpublished). Read-only union; no published filter here.
  const members = await getTeamMembers(admin, entity.id, { publishedOnly: false })

  return (
    <TeamEditClient
      entity={{ id: entity.id, slug: entity.slug }}
      profile={profile}
      members={members ?? []}
      ownerEmail={user.email ?? ''}
    />
  )
}
