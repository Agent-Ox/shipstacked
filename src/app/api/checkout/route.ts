import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICES = {
  job_post: 'price_1TGQJEAxtRelGvaRZifhWrIF',
  full_access: 'price_1TGQJFAxtRelGvaRXjR4Dwtb',
  concierge: 'price_1TGQJGAxtRelGvaRUmvJyM1O',
}

export async function POST(req: Request) {
  const { product, email } = await req.json()

  const priceId = PRICES[product as keyof typeof PRICES]
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
  }

  const isSubscription = product === 'full_access'

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: isSubscription ? 'subscription' : 'payment',
    customer_email: email || undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { product },
    subscription_data: isSubscription ? { metadata: { product } } : undefined,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://claudhire.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://claudhire.com'}/#pricing`,
  })

  return NextResponse.json({ url: session.url })
}
