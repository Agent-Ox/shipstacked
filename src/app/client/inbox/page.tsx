import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ClientInboxClient from './ClientInboxClient'

export default async function ClientInboxPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/client/inbox')

  const role = user.user_metadata?.role
  if (role && role !== 'client') {
    if (role === 'builder') redirect('/messages')
    if (role === 'employer') redirect('/employer/messages')
  }

  return <ClientInboxClient userEmail={user.email!} userName={user.user_metadata?.full_name || ''} />
}
