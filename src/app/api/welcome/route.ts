import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  // Require authenticated session matching the email being welcomed
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, name, username } = await req.json()
  if (user.email !== email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: email,
      subject: 'Your ShipStacked profile is live 🎉',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h1 style="font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em;">You're live on ShipStacked.</h1>
          <p style="color: #6e6e73; font-size: 15px; line-height: 1.6;">Hi ${name}, your profile is published and discoverable by employers looking 
for AI-native talent.</p>
          <a href="https://shipstacked.com/u/${username}" 
            style="display: inline-block; margin: 1.5rem 0; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; 
text-decoration: none; font-size: 15px; font-weight: 500;">
            View your profile →
          </a>
          <p style="color: #6e6e73; font-size: 13px;">Share it on X and WhatsApp to get noticed. The more you share, the more employers find 
you.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The hiring platform for AI-native talent.</p>
        </div>
      `
    })

    // Add to Builders segment
    try {
      const contact = await resend.contacts.create({ email, firstName: name?.split(' ')[0] || '', lastName: name?.split(' ').slice(1).join(' ') || '' })
      if (contact.data?.id && process.env.RESEND_SEGMENT_BUILDERS) {
        await resend.contacts.segments.add({ contactId: contact.data.id, segmentId: process.env.RESEND_SEGMENT_BUILDERS })
      }
    } catch (e) {
      console.error('Resend audience error:', e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
