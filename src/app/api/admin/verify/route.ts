import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = 'oxleethomas+admin@gmail.com'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { profile_id, verified, builder_email, builder_name } = await req.json()

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await adminSupabase
      .from('profiles')
      .update({ verified })
      .eq('id', profile_id)

    // Send email to builder if verifying
    if (verified) {
      await resend.emails.send({
        from: 'ClaudHire <hello@claudhire.com>',
        to: builder_email,
        subject: 'You are now a verified ClaudHire builder',
        html: '<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">' +
          '<h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; margin-bottom: 0.5rem;">You are verified.</h2>' +
          '<p style="color: #6e6e73; font-size: 14px; line-height: 1.6; margin-bottom: 1.5rem;">Hi ' + builder_name + ' — your ClaudHire profile has been reviewed and verified. Your profile now carries the verified badge, making you more visible to employers.</p>' +
          '<a href="https://claudhire.com/dashboard" style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500;">View your dashboard</a>' +
          '<hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />' +
          '<p style="color: #aeaeb2; font-size: 12px;">ClaudHire — The hiring platform for Claude-native talent.</p>' +
          '</div>'
      })
    }

    return NextResponse.json({ success: true, verified })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
