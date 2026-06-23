import { redirect } from 'next/navigation'
import { getEntityModes } from '@/lib/user'
import { routeAfterAuth } from '@/lib/auth-routing'
import SuccessClient from './SuccessClient'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  // An already-authenticated visitor who just upgraded has a working session +
  // password — never show them the magic-link/set-password claim flow (it reads
  // as a security scare and forces a password they already have). Route them to
  // their normal home. No requiresPasswordSet: authed users skip every password
  // step. The SuccessClient claim flow below runs ONLY for genuine pay-first
  // (password-less) signups, who have no session here. Mirrors login/actions.ts.
  const { user, modes } = await getEntityModes()
  if (user) {
    redirect(routeAfterAuth(modes))
  }

  return <SuccessClient sessionId={session_id || null} />
}
