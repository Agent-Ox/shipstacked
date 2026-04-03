import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const product = session.metadata?.product || 'unknown'
    const email = session.customer_email
      || session.customer_details?.email
      || 'unknown@shipstacked.com'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

    // Create auth account if doesn't exist
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const alreadyExists = existingUsers?.users?.some((u: any) => u.email === email)

    if (!alreadyExists) {
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
        user_metadata: { role: 'employer' }
      })
    }

    // Generate magic link for instant login on success page
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${siteUrl}/auth/callback` }
    })

    const magicLink = linkData?.properties?.action_link || null

    // Generate password reset link for welcome email
    const { data: resetLinkData } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${siteUrl}/update-password` }
    })

    const resetLink = resetLinkData?.properties?.action_link || `${siteUrl}/reset-password`

    // Write subscription row
    let expiresAt = null
    if (product === 'job_post') {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      expiresAt = d.toISOString()
    }

    const { error } = await supabase.from('subscriptions').insert([{
      email,
      stripe_customer_id: session.customer as string || 'unknown',
      stripe_session_id: session.id,
      product,
      status: 'active',
      expires_at: expiresAt,
      magic_link: magicLink
    }])

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send welcome email directly via Resend
    try {
      await resend.emails.send({
        from: 'ShipStacked <hello@shipstacked.com>',
        to: email,
        subject: 'Welcome to ShipStacked — set your password',
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
            <h1 style="font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em;">Welcome to ShipStacked.</h1>
            <p style="color: #6e6e73; font-size: 15px; line-height: 1.6;">Your Full Access subscription is active. You can now search and contact verified AI-native builders.</p>
            <a href="${siteUrl}/talent"
              style="display: inline-block; margin: 1.5rem 0; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 15px; font-weight: 500;">
              Access talent directory
            </a>
            <p style="color: #6e6e73; font-size: 14px; line-height: 1.6;">Set a password so you can sign in any time:</p>
            <a href="${resetLink}"
              style="display: inline-block; margin: 1rem 0; padding: 0.75rem 1.5rem; background: #f5f5f7; color: #1d1d1f; border-radius: 20px; text-decoration: none; font-size: 15px; font-weight: 500;">
              Set your password
            </a>
            <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
            <p style="color: #aeaeb2; font-size: 12px;">Questions? Reply to this email or contact hello@shipstacked.com</p>
            <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The hiring platform for AI-native talent.</p>
          </div>
        `
      })
    } catch (e) {
      console.error('Failed to send welcome email:', e)
    }
  }

  return NextResponse.json({ received: true })
}
