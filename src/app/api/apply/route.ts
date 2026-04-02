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

    // Get builder profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, username, bio, role')
      .eq('email', user.email)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'No builder profile found' }, { status: 400 })
    }

    // Get job details
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

    // Use service role to bypass RLS
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await adminSupabase.from('applications').insert([{
      job_id,
      builder_email: user.email,
      builder_name: profile.full_name,
      profile_id: profile.id,
      employer_email: job.employer_email,
      status: 'applied',
    }])

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://claudhire.com'
    const profileUrl = siteUrl + '/u/' + profile.username

    // Email employer
    await resend.emails.send({
      from: 'ClaudHire <hello@claudhire.com>',
      to: job.employer_email,
      subject: 'New application for ' + job.role_title + ' — ' + profile.full_name,
      html: '<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">' +
        '<h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 0.5rem;">New application</h2>' +
        '<p style="color: #6e6e73; font-size: 14px; margin-bottom: 1.5rem;">' + profile.full_name + ' applied for <strong>' + job.role_title + '</strong></p>' +
        (profile.bio ? '<p style="color: #3d3d3f; font-size: 14px; line-height: 1.6; margin-bottom: 1.5rem;">' + profile.bio + '</p>' : '') +
        '<a href="' + profileUrl + '" style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500; margin-bottom: 1.5rem;">View full profile</a>' +
        '<hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />' +
        '<p style="color: #aeaeb2; font-size: 12px;">Reply directly to ' + user.email + ' to get in touch.</p>' +
        '<p style="color: #aeaeb2; font-size: 12px;">ClaudHire — The hiring platform for Claude-native talent.</p>' +
        '</div>'
    })

    // Email builder confirmation
    await resend.emails.send({
      from: 'ClaudHire <hello@claudhire.com>',
      to: user.email!,
      subject: 'Application sent — ' + job.role_title + ' at ' + job.company_name,
      html: '<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">' +
        '<h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 0.5rem;">Application sent.</h2>' +
        '<p style="color: #6e6e73; font-size: 14px; line-height: 1.6; margin-bottom: 1.5rem;">Your application for <strong>' + job.role_title + '</strong> at ' + job.company_name + ' has been sent. They can see your full ClaudHire profile.</p>' +
        '<a href="' + profileUrl + '" style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500;">View your profile</a>' +
        '<hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />' +
        '<p style="color: #aeaeb2; font-size: 12px;">ClaudHire — The hiring platform for Claude-native talent.</p>' +
        '</div>'
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Apply error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
