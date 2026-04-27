import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ImportClient from './ImportClient'

const ADMIN_EMAIL = 'oxleethomas+admin@gmail.com'

export default async function CandidatesImportPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/')

  return <ImportClient />
}
