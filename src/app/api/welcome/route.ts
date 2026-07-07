import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const resend = new Resend(process.env.RESEND_API_KEY)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

type WelcomeType = 'builder' | 'team' | 'agent' | 'buyer'

interface EmailContent {
  subject: string
  html: string
}

function builderEmail(name: string, username?: string): EmailContent {
  return {
    subject: 'Your ShipStacked profile is live 🎉',
    html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h1 style="font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em;">You're live on ShipStacked.</h1>
          <p style="color: #6e6e73; font-size: 15px; line-height: 1.6;">Hi ${name}, your profile is published and discoverable by hirers looking for AI-native talent.</p>
          ${username ? `<a href="${siteUrl}/u/${username}"
            style="display: inline-block; margin: 1.5rem 0; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 15px; font-weight: 500;">
            View your profile →
          </a>` : ''}
          <p style="color: #6e6e73; font-size: 13px;">Share it on X and WhatsApp to get noticed. The more you share, the more hirers find you.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The hiring platform for AI-native talent.</p>
        </div>
      `,
  }
}

function teamEmail(teamName: string): EmailContent {
  return {
    subject: `${teamName} is set up on ShipStacked 🎉`,
    html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h1 style="font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em;">${teamName} is on ShipStacked.</h1>
          <p style="color: #6e6e73; font-size: 15px; line-height: 1.6;">Your team entity is created. Next: invite team members and build out the team profile — those features are landing in the next batch.</p>
          <a href="${siteUrl}/dashboard"
            style="display: inline-block; margin: 1.5rem 0; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 15px; font-weight: 500;">
            Go to dashboard →
          </a>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work platform for AI implementation.</p>
        </div>
      `,
  }
}

function agentEmail(name: string): EmailContent {
  return {
    subject: 'Your ShipStacked agent account is ready',
    html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h1 style="font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em;">Welcome${name ? ', ' + name : ''}.</h1>
          <p style="color: #6e6e73; font-size: 15px; line-height: 1.6;">Your agent account is set up. Generate your API key, brief your agent, and let it post builds + maintain your profile automatically.</p>
          <a href="${siteUrl}/dashboard"
            style="display: inline-block; margin: 1.5rem 0; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 15px; font-weight: 500;">
            Go to your dashboard →
          </a>
          <p style="color: #6e6e73; font-size: 13px;">Full API docs: <a href="${siteUrl}/api-docs" style="color: #0071e3; text-decoration: none;">${siteUrl}/api-docs</a></p>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The hiring platform for AI-native talent.</p>
        </div>
      `,
  }
}

function buyerEmail(name: string): EmailContent {
  return {
    subject: 'Welcome to ShipStacked',
    html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h1 style="font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em;">You're set up to hire.</h1>
          <p style="color: #6e6e73; font-size: 15px; line-height: 1.6;">Hi ${name}, your account is ready. Browse the talent directory free — when you're ready to message a builder or post a job, that's where Full Access activates ($199/mo, cancel anytime).</p>
          <a href="${siteUrl}/talent"
            style="display: inline-block; margin: 1.5rem 0; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 15px; font-weight: 500;">
            Browse talent →
          </a>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work platform for AI implementation.</p>
        </div>
      `,
  }
}

function buildEmail(type: WelcomeType, name: string, username?: string): EmailContent {
  switch (type) {
    case 'team':    return teamEmail(name)
    case 'agent':   return agentEmail(name)
    case 'buyer':   return buyerEmail(name)
    case 'builder':
    default:        return builderEmail(name, username)
  }
}

export async function POST(req: Request) {
  // Require authenticated session matching the email being welcomed
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: { email?: string; name?: string; username?: string; type?: string } = await req.json()
  const { email, name, username } = body
  if (!email || !name) return NextResponse.json({ error: 'email and name required' }, { status: 400 })
  if (user.email !== email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Default to 'builder' if type is missing or unknown (matches pre-Batch-4
  // behaviour for the existing builder welcome flow).
  const validTypes: WelcomeType[] = ['builder', 'team', 'agent', 'buyer']
  const type: WelcomeType = (body.type && validTypes.includes(body.type as WelcomeType))
    ? (body.type as WelcomeType)
    : 'builder'

  const { subject, html } = buildEmail(type, name, username)

  try {
    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: email,
      subject,
      html,
    })

    // Audience segment routing — only builders go to RESEND_SEGMENT_BUILDERS today.
    // Other types skip segment add until segments are created.
    if (type === 'builder') {
      try {
        const contact = await resend.contacts.create({ email, firstName: name?.split(' ')[0] || '', lastName: name?.split(' ').slice(1).join(' ') || '' })
        if (contact.data?.id && process.env.RESEND_SEGMENT_BUILDERS) {
          await resend.contacts.segments.add({ contactId: contact.data.id, segmentId: process.env.RESEND_SEGMENT_BUILDERS })
        }
      } catch (e) {
        console.error('Resend audience error:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
