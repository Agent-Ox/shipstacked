import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { name, email, message, post_id, builder_profile_id } = await req.json()

    if (!name || !email || !message || !post_id || !builder_profile_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch builder profile
    const { data: builder } = await admin
      .from('profiles')
      .select('id, full_name, email, username, accepts_project_inquiries')
      .eq('id', builder_profile_id)
      .maybeSingle()

    if (!builder) return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
    if (builder.accepts_project_inquiries === false) {
      return NextResponse.json({ error: 'Builder not accepting inquiries' }, { status: 403 })
    }

    // Fetch post for context
    const { data: post } = await admin
      .from('posts')
      .select('title')
      .eq('id', post_id)
      .maybeSingle()

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

    // Check if client account already exists
    const { data: existingUser } = await admin.auth.admin.listUsers()
    const existingClient = existingUser?.users?.find(u => u.email === email)

    let clientUserId: string

    if (existingClient) {
      clientUserId = existingClient.id
    } else {
      // Create lightweight client account
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: 'client',
        }
      })
      if (createError || !newUser.user) {
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
      }
      clientUserId = newUser.user.id
    }

    // Create conversation with type = project_inquiry
    const { data: conv, error: convError } = await admin
      .from('conversations')
      .insert({
        employer_email: email,
        builder_profile_id: builder.id,
        last_message_at: new Date().toISOString(),
        conversation_type: 'project_inquiry',
        client_email: email,
        client_name: name,
      })
      .select()
      .single()

    if (convError || !conv) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    // Insert the inquiry message
    await admin.from('messages').insert({
      conversation_id: conv.id,
      sender_email: email,
      content: message,
      read: false,
    })

    // Record in project_inquiries table
    await admin.from('project_inquiries').insert({
      conversation_id: conv.id,
      client_email: email,
      client_name: name,
      builder_profile_id: builder.id,
      post_id,
      message,
      status: 'pending',
    })

    // Generate magic link for client to access their inbox
    const { data: magicLinkData } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${siteUrl}/client/inbox` }
    })
    const magicLink = magicLinkData?.properties?.action_link || `${siteUrl}/client/inbox`

    // Notify builder — lands in their ShipStacked messages
    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: builder.email,
      subject: `New project enquiry — "${post?.title || 'your build'}"`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 0.5rem;">New project enquiry</h2>
          <p style="color: #6e6e73; font-size: 14px; line-height: 1.6; margin-bottom: 0.75rem;">
            <strong>${name}</strong> saw your build <em>"${post?.title || 'your build'}"</em> and wants to work with you.
          </p>
          <div style="background: #f5f5f7; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem; font-size: 14px; color: #3d3d3f; line-height: 1.6; border-left: 3px solid #0071e3;">
            ${message}
          </div>
          <a href="${siteUrl}/messages"
            style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500; margin-bottom: 1.5rem;">
            Reply on ShipStacked →
          </a>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work platform for AI-native builders.</p>
        </div>
      `
    })

    // Confirm to client with magic link to check replies
    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: email,
      subject: `Your message to ${builder.full_name} has been sent`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 0.5rem;">Message sent.</h2>
          <p style="color: #6e6e73; font-size: 14px; line-height: 1.6; margin-bottom: 0.75rem;">
            Your enquiry about <em>"${post?.title || 'this build'}"</em> has been sent to ${builder.full_name}. They'll reply directly on ShipStacked.
          </p>
          <p style="color: #6e6e73; font-size: 14px; line-height: 1.6; margin-bottom: 1.5rem;">
            We'll email you when they reply. You can also check the conversation anytime using the link below — no password needed.
          </p>
          <a href="${magicLink}"
            style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500; margin-bottom: 1.5rem;">
            Check for a reply →
          </a>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work platform for AI-native builders.</p>
        </div>
      `
    })

    return NextResponse.json({ success: true, conversation_id: conv.id })

  } catch (err: any) {
    console.error('Inquiry error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
