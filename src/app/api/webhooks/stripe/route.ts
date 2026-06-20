import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY)

// Stripe subscription status -> our subscriptions.status vocabulary.
// The gate (src/lib/user.ts) only grants access on status='active'.
function mapStatus(s: Stripe.Subscription.Status): string {
  if (s === 'active' || s === 'trialing') return 'active'
  if (s === 'past_due' || s === 'unpaid') return 'past_due'
  if (s === 'canceled' || s === 'incomplete_expired') return 'canceled'
  return s // incomplete / paused — stored raw; not 'active', so no access
}

// Stripe SDK v21: current_period_end moved off the Subscription onto its items.
function periodEndISO(sub: Stripe.Subscription): string | null {
  const ts = sub.items?.data?.[0]?.current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Idempotency — record the event id first; a duplicate delivery short-circuits.
  // (Stripe re-delivers on timeout/retry.) On a unique-violation the event was
  // already processed, so return 200 without re-running side effects.
  const { error: evErr } = await supabase.from('stripe_events').insert({ id: event.id, type: event.type })
  if (evErr) {
    if ((evErr as any).code === '23505') return NextResponse.json({ received: true, duplicate: true })
    console.error('stripe_events insert error:', evErr) // non-fatal — continue processing
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const product = session.metadata?.product || 'unknown'
    const email = session.customer_email
      || session.customer_details?.email
      || 'unknown@shipstacked.com'

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

    // Create auth account if doesn't exist
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const alreadyExists = existingUsers?.users?.some((u: any) => u.email === email)

    if (!alreadyExists) {
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
        user_metadata: { password_set: false }
      })
    }

    // Generate magic link for instant login on success page
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${siteUrl}/set-password` }
    })

    const magicLink = linkData?.properties?.action_link || null

    // Capture the Stripe subscription id + current period end so the lifecycle
    // branches below (updated/deleted/payment_failed) can find this row by id.
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null
    let currentPeriodEnd: string | null = null
    if (subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        currentPeriodEnd = periodEndISO(sub)
      } catch (e) {
        console.error('subscription retrieve failed:', e)
      }
    }

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
      stripe_subscription_id: subscriptionId,
      product,
      status: 'active',
      expires_at: expiresAt,
      current_period_end: currentPeriodEnd,
    }])

    if (error) {
      // Roll back the idempotency record so Stripe's retry re-processes this
      // event (otherwise the failed insert would never grant access).
      await supabase.from('stripe_events').delete().eq('id', event.id)
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send welcome email directly via Resend
    try {
      await resend.emails.send({
        from: 'ShipStacked <hello@shipstacked.com>',
        to: email,
        subject: 'Welcome to ShipStacked Full Access',
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
            <h1 style="font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em;">Welcome to ShipStacked.</h1>
            <p style="color: #6e6e73; font-size: 15px; line-height: 1.6;">
              Your Full Access subscription is active. You can now message builders, post jobs, and use the full hiring features.
            </p>
            <a href="${siteUrl}/hirer"
              style="display: inline-block; margin: 1.5rem 0 1rem; padding: 0.875rem 2rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 15px; font-weight: 600;">
              Access your dashboard →
            </a>
            <p style="color: #aeaeb2; font-size: 13px; line-height: 1.6;">
              Already set your password during signup? This link takes you straight in. If you ever need to reset your password, you can do it from the dashboard.
            </p>
            <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
            <p style="color: #aeaeb2; font-size: 12px;">Questions? Reply to this email or contact hello@shipstacked.com</p>
            <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The hiring platform for AI-native talent.</p>
          </div>
        `
      })
    } catch (e) {
      console.error('Failed to send welcome email:', e)
    }

    // Add to Hirers segment.
    // Env var name kept as RESEND_SEGMENT_EMPLOYERS (legacy from pre-Batch-3
    // terminology). Renaming requires coordinated Vercel env update;
    // deferred to a future deploy-coordinated change.
    try {
      const resendForAudience = new Resend(process.env.RESEND_API_KEY)
      const contact = await resendForAudience.contacts.create({ email })
      if (contact.data?.id && process.env.RESEND_SEGMENT_EMPLOYERS) {
        await resendForAudience.contacts.segments.add({ contactId: contact.data.id, segmentId: process.env.RESEND_SEGMENT_EMPLOYERS })
      }
    } catch (e) {
      console.error('Resend audience error:', e)
    }
  }

  // Subscription renewed / changed / cancel-at-period-end toggled.
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const { error } = await supabase.from('subscriptions').update({
      status: mapStatus(sub.status),
      current_period_end: periodEndISO(sub),
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    }).eq('stripe_subscription_id', sub.id)
    if (error) console.error('subscription.updated update error:', error)
  }

  // Subscription fully canceled (period ended or canceled immediately).
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const { error } = await supabase.from('subscriptions').update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    }).eq('stripe_subscription_id', sub.id)
    if (error) console.error('subscription.deleted update error:', error)
  }

  // Renewal payment failed — mark past_due so the gate stops granting access.
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const subRef = invoice.parent?.subscription_details?.subscription // SDK v21 path
    const subId = typeof subRef === 'string' ? subRef : subRef?.id ?? null
    if (subId) {
      const { error } = await supabase.from('subscriptions').update({
        status: 'past_due',
      }).eq('stripe_subscription_id', subId)
      if (error) console.error('invoice.payment_failed update error:', error)
    }
  }

  return NextResponse.json({ received: true })
}
