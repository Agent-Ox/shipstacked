import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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
      || 'unknown@claudhire.com'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://claudhire.com'

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
      options: {
        redirectTo: `${siteUrl}/auth/callback`
      }
    })

    const magicLink = linkData?.properties?.action_link || null

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

    // Send employer welcome email with password setup link
    try {
      await fetch(`${siteUrl}/api/employer-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
    } catch (e) {
      console.error('Failed to send employer welcome email:', e)
    }
  }

  return NextResponse.json({ received: true })
}
