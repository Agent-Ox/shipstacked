import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ClientInboxClient from './ClientInboxClient'
import ClientInboxGate from './ClientInboxGate'
import { getEntityModes } from '@/lib/user'

export default async function ClientInboxPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <ClientInboxGate />

  // Mode-aware gate: redirect non-client users to their appropriate inbox.
  // Per discovery doc B.11 — full /client → Full Access merge is Batch 4.
  const { modes } = await getEntityModes()
  if (!modes.client) {
    if (modes.hirer) redirect('/messages?as=hirer')
    if (modes.builder) redirect('/messages?as=builder')
    redirect('/dashboard')
  }

  return <ClientInboxClient userEmail={user.email!} userName={user.user_metadata?.full_name || ''} />
}
