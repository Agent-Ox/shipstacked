import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'

// Stage 5d: /company/[slug] is a permanent redirect-stub to the unified org page.
// employer_profiles is deprecated — every hiring identity is now an org entity
// rendered at /team/[slug] (Stage 5a, which handles the published gate + hiring
// lens). This alias keeps any old /company/<slug> links resolving. A slug with no
// team/org entity 404s.
export default async function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: ent } = await admin
    .from('entities')
    .select('id')
    .eq('slug', slug)
    .in('kind', ['team', 'org'])
    .maybeSingle()
  if (!ent) notFound()
  redirect(`/team/${slug}`)
}
