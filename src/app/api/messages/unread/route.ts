import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserState } from '@/lib/user'

// GET — unread message count for current user.
// Optional ?as=builder|hirer scopes to one side. With no param, returns the
// aggregate across all modes the user has active (so NavBar can show one
// combined badge for multi-mode entities).
//
// Also returns org_offers_services (resolved server-side via getUserState —
// team_profiles has no authenticated self-read RLS, so the browser NavBar
// can't read it itself). NavBar uses it to distinguish a service-org owner
// (gets the team "Dashboard" link) from a buyer-org owner (does not).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const asParam = searchParams.get('as')

  const { user, modes, refs, profile } = await getUserState()
  const orgOffersServices = refs?.org_offers_services === true
  if (!user) return NextResponse.json({ unread: 0, org_offers_services: false })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const fetchHirerConvIds = async (): Promise<string[]> => {
    const { data } = await admin
      .from('conversations')
      .select('id')
      .eq('employer_email', user.email)
    return (data || []).map((c: any) => c.id)
  }

  const fetchBuilderConvIds = async (): Promise<string[]> => {
    if (!profile) return []
    const { data } = await admin
      .from('conversations')
      .select('id')
      .eq('builder_profile_id', profile.id)
    return (data || []).map((c: any) => c.id)
  }

  let conversationIds: string[] = []

  if (asParam === 'hirer') {
    if (modes.hirer) conversationIds = await fetchHirerConvIds()
  } else if (asParam === 'builder') {
    if (modes.builder) conversationIds = await fetchBuilderConvIds()
  } else {
    // No ?as= — aggregate across all active messaging modes
    const sets: string[][] = []
    if (modes.hirer) sets.push(await fetchHirerConvIds())
    if (modes.builder) sets.push(await fetchBuilderConvIds())
    conversationIds = [...new Set(sets.flat())]
  }

  let unread = 0
  if (conversationIds.length > 0) {
    const { count } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('read', false)
      .neq('sender_email', user.email!)
    unread = count || 0
  }

  return NextResponse.json({ unread, org_offers_services: orgOffersServices })
}
