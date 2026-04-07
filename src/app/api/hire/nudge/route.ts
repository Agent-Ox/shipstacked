import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const CRON_SECRET = 'shipstacked_cron_2026'

export async function POST(req: Request) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret')
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // Find conversations older than 14 days with no nudge sent
  const { data: conversations } = await admin
    .from('conversations')
    .select('id, employer_email, builder_profile_id, profiles!builder_profile_id(email, full_name)')
    .lt('last_message_at', fourteenDaysAgo)
    .not('employer_email', 'is', null)

  if (!conversations?.length) {
    return NextResponse.json({ nudged: 0 })
  }

  let nudged = 0

  for (const conv of conversations) {
    // Check if nudge already sent
    const { data: existing } = await admin
      .from('hire_confirmations')
      .select('id')
      .eq('conversation_id', conv.id)
      .maybeSingle()

    if (existing) continue

    const profile = conv.profiles as any
    const builderEmail = profile?.email
    const builderName = profile?.full_name || 'the builder'

    if (!builderEmail || !conv.employer_email) continue

    // Create hire confirmation record
    const { data: confirmation } = await admin
      .from('hire_confirmations')
      .insert({
        conversation_id: conv.id,
        builder_email: builderEmail,
        employer_email: conv.employer_email,
        nudge_sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (!confirmation) continue

    const builderLink = `${siteUrl}/api/hire/confirm?id=${confirmation.id}&role=builder`
    const employerLink = `${siteUrl}/api/hire/confirm?id=${confirmation.id}&role=employer`

    // Email to builder
    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: builderEmail,
      subject: 'Did you get hired? Let us know',
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
          <h2 style="font-size:20px;font-weight:700;color:#1d1d1f;margin-bottom:0.5rem">Did you get hired?</h2>
          <p style="color:#6e6e73;font-size:14px;line-height:1.6;margin-bottom:1.5rem">
            You connected with an employer on ShipStacked about 2 weeks ago. Did anything come of it? If you got hired, let us know — it helps other builders see that ShipStacked works.
          </p>
          <a href="${builderLink}" style="display:inline-block;padding:0.75rem 1.5rem;background:#0071e3;color:white;border-radius:20px;text-decoration:none;font-size:14px;font-weight:500;margin-bottom:1.5rem">
            Yes, I got hired
          </a>
          <p style="color:#aeaeb2;font-size:12px;margin-top:1.5rem">If nothing came of it, no worries — just ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e0e0e5;margin:1.5rem 0">
          <p style="color:#aeaeb2;font-size:12px">ShipStacked — The proof-of-work platform for AI-native builders.</p>
        </div>
      `
    })

    // Email to employer
    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: conv.employer_email,
      subject: 'Did you make a hire? Let us know',
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
          <h2 style="font-size:20px;font-weight:700;color:#1d1d1f;margin-bottom:0.5rem">Did you make a hire?</h2>
          <p style="color:#6e6e73;font-size:14px;line-height:1.6;margin-bottom:1.5rem">
            You connected with ${builderName} on ShipStacked about 2 weeks ago. Did you end up hiring them? Confirming helps us prove the platform works and keeps the community strong.
          </p>
          <a href="${employerLink}" style="display:inline-block;padding:0.75rem 1.5rem;background:#0071e3;color:white;border-radius:20px;text-decoration:none;font-size:14px;font-weight:500;margin-bottom:1.5rem">
            Yes, we made a hire
          </a>
          <p style="color:#aeaeb2;font-size:12px;margin-top:1.5rem">If nothing came of it, no worries — just ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e0e0e5;margin:1.5rem 0">
          <p style="color:#aeaeb2;font-size:12px">ShipStacked — The proof-of-work platform for AI-native builders.</p>
        </div>
      `
    })

    nudged++
  }

  return NextResponse.json({ nudged })
}
