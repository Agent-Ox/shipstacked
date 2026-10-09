'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'oxleethomas+admin@gmail.com'

// Admin-only trigger for the hire-confirm nudge. The admin check runs
// server-side (same guard as /admin), and CRON_SECRET is read from env here so
// it never reaches the client bundle.
export async function triggerHireNudge(): Promise<{ ok: true; nudged: number } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return { ok: false, error: 'Unauthorized' }

  const secret = process.env.CRON_SECRET
  if (!secret) return { ok: false, error: 'CRON_SECRET not configured' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'
  const res = await fetch(`${siteUrl}/api/hire-confirm/nudge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cron-secret': secret },
    body: JSON.stringify({}),
    cache: 'no-store',
  })
  if (!res.ok) return { ok: false, error: `Nudge failed (${res.status})` }
  const data = await res.json()
  return { ok: true, nudged: data.nudged || 0 }
}
