import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

// GET — fetch conversations for current user, or create/get one for ?new=profileId
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const newProfileId = searchParams.get('new')
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Handle ?new=profileId — upsert conversation and return it
  if (newProfileId) {
    const { data: conv } = await admin
      .from('conversations')
      .upsert({
        employer_email: user.email!,
        builder_profile_id: newProfileId,
        job_id: null,
        last_message_at: new Date().toISOString(),
      }, { onConflict: 'employer_email,builder_profile_id,job_id' })
      .select('*, profiles!builder_profile_id(username, full_name, avatar_url, verified, velocity_score), jobs(role_title, company_name)')
      .single()
    return NextResponse.json({ conversation: conv })
  }

  const role = user.user_metadata?.role

  let conversations: any[] = []

  if (role === 'employer') {
    const { data } = await admin
      .from('conversations')
      .select('*, profiles!builder_profile_id(username, full_name, avatar_url, verified, velocity_score), jobs(role_title)')
      .eq('employer_email', user.email)
      .order('last_message_at', { ascending: false })
    conversations = data || []
  } else {
    // Builder — get their profile first
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    if (profile) {
      const { data } = await admin
        .from('conversations')
        .select('*, jobs(role_title, company_name)')
        .eq('builder_profile_id', profile.id)
        .order('last_message_at', { ascending: false })

      // Enrich with company name from employer_profiles
      const convs = data || []
      const enrichedWithCompany = await Promise.all(convs.map(async (conv: any) => {
        const { data: emp } = await admin
          .from('employer_profiles')
          .select('company_name, logo_url')
          .eq('email', conv.employer_email)
          .maybeSingle()
        return { ...conv, employer_profile: emp }
      }))
      conversations = enrichedWithCompany
    }
  }

  // For each conversation, get the last message and unread count
  const enriched = await Promise.all(conversations.map(async (conv) => {
    const { data: lastMsg } = await admin
      .from('messages')
      .select('content, sender_email, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { count: unreadCount } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('read', false)
      .neq('sender_email', user.email!)

    return { ...conv, last_message: lastMsg, unread_count: unreadCount || 0 }
  }))

  return NextResponse.json({ conversations: enriched })
}

// POST — send a message (creates conversation if needed)
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const { conversation_id, content, employer_email, builder_profile_id, job_id } = body

  if (!content?.trim()) return NextResponse.json({ error: 'Message content required' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let convId = conversation_id

  // Create conversation if it doesn't exist
  if (!convId) {
    if (!employer_email || !builder_profile_id) {
      return NextResponse.json({ error: 'employer_email and builder_profile_id required for new conversation' }, { status: 400 })
    }

    // Upsert conversation
    const { data: conv, error: convError } = await admin
      .from('conversations')
      .upsert({
        employer_email,
        builder_profile_id,
        job_id: job_id || null,
        last_message_at: new Date().toISOString(),
      }, { onConflict: 'employer_email,builder_profile_id,job_id' })
      .select()
      .single()

    if (convError || !conv) {
      return NextResponse.json({ error: convError?.message || 'Failed to create conversation' }, { status: 500 })
    }
    convId = conv.id
  }

  // Insert message
  const { data: message, error: msgError } = await admin
    .from('messages')
    .insert([{
      conversation_id: convId,
      sender_email: user.email!,
      content: content.trim(),
      read: false,
    }])
    .select()
    .single()

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })

  // Update conversation last_message_at
  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', convId)

  // Get conversation to find recipient
  const { data: conv } = await admin
    .from('conversations')
    .select('*, profiles!builder_profile_id(email, full_name, username)')
    .eq('id', convId)
    .maybeSingle()

  if (conv) {
    const builderEmail = (conv.profiles as any)?.email
    const builderName = (conv.profiles as any)?.full_name
    const builderUsername = (conv.profiles as any)?.username
    const recipientEmail = user.email === conv.employer_email ? builderEmail : conv.employer_email

    // Check if this is the first message in the conversation (notify recipient)
    const { count: msgCount } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', convId)

    if ((msgCount || 0) <= 1 && recipientEmail) {
      const isEmployerSending = user.email === conv.employer_email
      const inboxUrl = isEmployerSending
        ? `${siteUrl}/messages`
        : `${siteUrl}/employer/messages`

      try {
        await resend.emails.send({
          from: 'ShipStacked <hello@shipstacked.com>',
          to: recipientEmail,
          subject: isEmployerSending
            ? `New message from ${conv.employer_email} about your ShipStacked profile`
            : `New message from ${builderName} on ShipStacked`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
              <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 0.5rem;">
                New message on ShipStacked
              </h2>
              <p style="color: #6e6e73; font-size: 14px; line-height: 1.6; margin-bottom: 1rem;">
                ${isEmployerSending ? conv.employer_email : builderName} sent you a message:
              </p>
              <div style="background: #f5f5f7; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem; font-size: 14px; color: #3d3d3f; line-height: 1.6;">
                ${content.trim()}
              </div>
              <a href="${inboxUrl}"
                style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500;">
                Reply on ShipStacked →
              </a>
              <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
              <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work platform for AI-native builders.</p>
            </div>
          `
        })
      } catch (e) {
        console.error('Message notification email failed:', e)
      }
    }
  }

  return NextResponse.json({ message, conversation_id: convId })
}
