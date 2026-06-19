import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICES = {
  full_access: process.env.STRIPE_PRICE_FULL_ACCESS || 'price_1TJhIzE3cjWtx7BrDkZxLavC',
}

export async function POST(req: Request) {
  const { product, email: bodyEmail } = await req.json()

  const priceId = PRICES[product as keyof typeof PRICES]
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
  }

  // Session-keying: if the user is authenticated, override the body email with the
  // auth-session email. Prevents the email-mismatch footgun where a logged-in user
  // creates a subscription on a different email than the one getEntityModes reads.
  // Phase 2 rollover from Phase 1 Item 7 (was drafted but not shipped in 11e9a31).
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const customerEmail: string | undefined = user?.email || bodyEmail || undefined

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { product, ...(user ? { authed_user_id: user.id } : {}) },
    subscription_data: { metadata: { product, ...(user ? { authed_user_id: user.id } : {}) } },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'}/hirers#pricing`,
  })

  return NextResponse.json({ url: session.url })
}
