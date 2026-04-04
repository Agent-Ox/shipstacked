import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { job_id } = await req.json()

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, username, bio, role, location, velocity_score')
      .eq('email', user.email)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'No builder profile found' }, { status: 400 })
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .maybeSingle()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check for duplicate application
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', job_id)
      .eq('builder_email', user.email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Already applied' }, { status: 409 })
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Record application
    await adminSupabase.from('applications').insert([{
      job_id,
      builder_email: user.email,
      builder_name: profile.full_name,
      profile_id: profile.id,
      employer_email: job.employer_email,
      status: 'applied',
    }])

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'
    const profileUrl = `${siteUrl}/u/${profile.username}`

    // Auto-generate first message from builder's profile
    const firstMessage = [
      `Hi — I'm ${profile.full_name}${profile.role ? `, ${profile.role}` : ''}${profile.location ? ` based in ${profile.location}` : ''}.`,
      profile.bio ? `\n\n${profile.bio}` : '',
      `\n\nI'm interested in the ${job.role_title} position. My full profile and build history is at ${profileUrl}`,
      profile.velocity_score ? ` — Velocity Score: ${profile.velocity_score}/100.` : '.',
      '\n\nHappy to discuss further.',
    ].join('')

    // Create conversation + first message on-platform
    const { data: conv } = await adminSupabase
      .from('conversations')
      .upsert({
        employer_email: job.employer_email,
        builder_profile_id: profile.id,
        job_id: job_id,
        last_message_at: new Date().toISOString(),
      }, { onConflict: 'employer_email,builder_profile_id,job_id' })
      .select()
      .single()

    if (conv) {
      await adminSupabase.from('messages').insert([{
        conversation_id: conv.id,
        sender_email: user.email,
        content: firstMessage,
        read: false,
      }])
    }

    // Notify employer — pulls them to the platform, not to email
    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: job.employer_email,
      subject: `${profile.full_name} applied for ${job.role_title} — reply on ShipStacked`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 0.5rem;">New application</h2>
          <p style="color: #6e6e73; font-size: 14px; line-height: 1.6; margin-bottom: 1rem;">
            <strong>${profile.full_name}</strong> applied for <strong>${job.role_title}</strong> and sent you a message on ShipStacked.
          </p>
          ${profile.bio ? `<div style="background: #f5f5f7; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem; font-size: 14px; color: #3d3d3f; line-height: 1.6;">${profile.bio}</div>` : ''}
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
            <a href="${siteUrl}/employer/messages"
              style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500;">
              Reply on ShipStacked →
            </a>
            <a href="${profileUrl}"
              style="display: inline-block; padding: 0.75rem 1.5rem; background: #f5f5f7; color: #1d1d1f; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500;">
              View profile
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work platform for AI-native builders.</p>
        </div>
      `
    })

    // Confirm to builder
    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: user.email!,
      subject: `Application sent — ${job.role_title} at ${job.company_name}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 0.5rem;">Application sent.</h2>
          <p style="color: #6e6e73; font-size: 14px; line-height: 1.6; margin-bottom: 1.5rem;">
            Your application for <strong>${job.role_title}</strong> at ${job.company_name} has been sent. A message thread has been opened — you'll be notified here when they reply.
          </p>
          <a href="${siteUrl}/messages"
            style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500; margin-bottom: 1.5rem;">
            View your messages →
          </a>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work platform for AI-native builders.</p>
        </div>
      `
    })

    return NextResponse.json({ success: true, conversation_id: conv?.id })

  } catch (err: any) {
    console.error('Apply error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
