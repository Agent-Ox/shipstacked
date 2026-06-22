import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { getDraft } from '@/lib/paste/draft'
import { getAtlasRoles } from '@/services/atlas-classifier/roles'
import ReviewForm from '@/components/paste/ReviewForm'
import type { IdentityOption } from '@/app/components/IdentityPicker'

export const metadata: Metadata = {
  title: 'Review your receipt | ShipStacked',
  description: 'Review and edit before publishing.',
  robots: { index: false, follow: false },
}

// The draft_id (random UUID, 15-min TTL in Redis) is the capability token
// for viewing a draft. Anyone with a valid id can render the page. The
// stored draft retains user_id for Step 6's publish action, which will
// enforce ownership at write time.
export default async function PasteReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; subject?: string }>
}) {
  const params = await searchParams
  const draftId = params.draft
  const pinnedSubjectId = typeof params.subject === 'string' && /^\d+$/.test(params.subject) ? Number(params.subject) : undefined

  if (!draftId) {
    redirect('/paste')
  }

  const draft = await getDraft(draftId)
  if (!draft) {
    redirect('/paste')
  }

  const roles = getAtlasRoles()

  // Owned entities for the identity picker (Phase 4 §J.2). Only entities that
  // can author a receipt (human / team / agent). Service-role read to dodge
  // anon-grant ambiguity; empty when logged out (picker hides itself).
  let ownedEntities: IdentityOption[] = []
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data } = await admin
      .from('entities')
      .select('id, kind, slug, display_name')
      .eq('owner_user_id', user.id)
    ownedEntities = (data ?? []).filter(
      (e: any) => e.kind === 'human' || e.kind === 'team' || e.kind === 'agent',
    ) as IdentityOption[]
  }

  return <ReviewForm draftId={draftId} draft={draft} atlasRoles={roles} ownedEntities={ownedEntities} pinnedSubjectId={pinnedSubjectId} />
}
