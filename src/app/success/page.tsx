import SuccessClient from './SuccessClient'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  return <SuccessClient sessionId={session_id || null} />
}
