import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', 'https://claudhire.com'))
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, stripe_session_id')
    .eq('email', user.email)
    .eq('product', 'full_access')
    .eq('status', 'active')
    .maybeSingle()

  if (sub?.stripe_customer_id && sub.stripe_customer_id !== 'unknown') {
    try {
      // Get subscriptions for this customer and cancel at period end
      const subscriptions = await stripe.subscriptions.list({
        customer: sub.stripe_customer_id,
        status: 'active',
        limit: 1
      })

      if (subscriptions.data.length > 0) {
        await stripe.subscriptions.update(subscriptions.data[0].id, {
          cancel_at_period_end: true
        })
      }
    } catch (e) {
      console.error('Stripe cancel error:', e)
    }
  }

  // Mark as cancelled in our DB
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('email', user.email)
    .eq('product', 'full_access')

  return NextResponse.redirect(new URL('/employer?cancelled=true', 'https://claudhire.com'))
}
