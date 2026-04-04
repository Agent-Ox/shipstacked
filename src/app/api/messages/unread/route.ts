import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ unread: 0 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const role = user.user_metadata?.role

  let conversationIds: string[] = []

  if (role === 'employer') {
    const { data } = await admin
      .from('conversations')
      .select('id')
      .eq('employer_email', user.email)
    conversationIds = (data || []).map((c: any) => c.id)
  } else {
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    if (profile) {
      const { data } = await admin
        .from('conversations')
        .select('id')
        .eq('builder_profile_id', profile.id)
      conversationIds = (data || []).map((c: any) => c.id)
    }
  }

  if (conversationIds.length === 0) return NextResponse.json({ unread: 0 })

  const { count } = await admin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', conversationIds)
    .eq('read', false)
    .neq('sender_email', user.email!)

  return NextResponse.json({ unread: count || 0 })
}
