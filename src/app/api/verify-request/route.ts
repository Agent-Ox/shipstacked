import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    // Require authenticated session
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, name, username } = await req.json()
    if (user.email !== email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: 'oxleethomas+admin@gmail.com',
      subject: 'Verification request — ' + name,
      html: '<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">' +
        '<h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; margin-bottom: 0.5rem;">Verification request</h2>' +
        '<p style="color: #6e6e73; font-size: 14px; margin-bottom: 1rem;">' + name + ' (' + email + ') has requested verification.</p>' +
        '<a href="https://shipstacked.com/u/' + username + '" style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500; margin-bottom: 1rem;">View profile</a>' +
        '<p style="color: #6e6e73; font-size: 13px;">Approve in the admin panel: <a href="https://shipstacked.com/admin">shipstacked.com/admin</a></p>' +
        '</div>'
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
