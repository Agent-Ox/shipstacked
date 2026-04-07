import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const role = searchParams.get('role')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

  if (!id || !role) {
    return NextResponse.redirect(siteUrl + '/hire/confirmed?status=invalid')
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: confirmation } = await admin
    .from('hire_confirmations')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!confirmation) {
    return NextResponse.redirect(siteUrl + '/hire/confirmed?status=invalid')
  }

  const update: any = {}
  if (role === 'builder') update.builder_confirmed = true
  if (role === 'employer') update.employer_confirmed = true

  const { data: updated } = await admin
    .from('hire_confirmations')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  // If both confirmed, mark as confirmed and update hire counts
  if (updated?.builder_confirmed && updated?.employer_confirmed && !confirmation.confirmed_at) {
    await admin
      .from('hire_confirmations')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', id)

    // Increment builder hire count
    const { data: profile } = await admin
      .from('profiles')
      .select('hire_count')
      .eq('email', confirmation.builder_email)
      .maybeSingle()

    if (profile) {
      await admin
        .from('profiles')
        .update({ hire_count: (profile.hire_count || 0) + 1 })
        .eq('email', confirmation.builder_email)
    }

    return NextResponse.redirect(siteUrl + '/hire/confirmed?status=complete')
  }

  return NextResponse.redirect(siteUrl + '/hire/confirmed?status=waiting')
}
