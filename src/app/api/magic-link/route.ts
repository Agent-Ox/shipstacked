import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'No session_id' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('email')
    .eq('stripe_session_id', session_id)
    .maybeSingle()

  if (!sub?.email) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'
  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: sub.email,
    options: { redirectTo: `${siteUrl}/auth/callback` }
  })

  const magicLink = linkData?.properties?.action_link
  if (!magicLink) return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })

  return NextResponse.json({ magicLink, email: sub.email })
}
