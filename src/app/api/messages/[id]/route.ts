import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// GET — fetch messages in a conversation
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify user is part of this conversation
  const { data: conv } = await admin
    .from('conversations')
    .select('*, profiles!builder_profile_id(email, full_name, avatar_url, username, verified, velocity_score), jobs(role_title, company_name)')
    .eq('id', id)
    .maybeSingle()

  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  const builderEmail = (conv.profiles as any)?.email
  const isParticipant = user.email === conv.employer_email || user.email === builderEmail
  if (!isParticipant) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data: messages } = await admin
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  // Mark messages from the other person as read
  await admin
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', id)
    .eq('read', false)
    .neq('sender_email', user.email!)

  return NextResponse.json({ conversation: conv, messages: messages || [] })
}
