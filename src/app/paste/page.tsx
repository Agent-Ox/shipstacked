import type { Metadata } from 'next'
import PasteForm from '@/components/paste/PasteForm'

export const metadata: Metadata = {
  title: 'Paste what you built | ShipStacked',
  description: 'Paste a URL and we turn it into a proof receipt.',
  robots: { index: false, follow: false },
}

// /paste renders publicly so unauthed visitors can see the form (and so
// automated verification can fetch it without a session). Auth is enforced
// at submit time inside the createPasteDraft server action — an unauthed
// submit redirects to /login with return_to + pasted_url so the flow
// resumes after sign-in.
export default async function PastePage({
  searchParams,
}: {
  searchParams: Promise<{ pasted_url?: string; subject?: string }>
}) {
  const params = await searchParams
  const pastedUrl = typeof params.pasted_url === 'string' ? params.pasted_url : ''
  // Optional subject pin (Phase: team/agent on-ramp). A team/agent owner lands
  // here via /paste?subject=<entityId> so the receipt is attributed to that
  // entity. Threaded through to /paste/review (the publish route still
  // ownership-validates the entity server-side).
  const subjectId = typeof params.subject === 'string' && /^\d+$/.test(params.subject) ? Number(params.subject) : undefined
  return <PasteForm initialUrl={pastedUrl} autoSubmit={pastedUrl.length > 0} subjectId={subjectId} />
}
