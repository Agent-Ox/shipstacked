import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { count } = await admin
    .from('hire_confirmations')
    .select('*', { count: 'exact', head: true })
    .not('confirmed_at', 'is', null)

  return NextResponse.json({ count: count || 0 })
}
