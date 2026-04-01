import { getResolvedUser } from '@/lib/user'

export async function canViewContact(profileEmail: string): Promise<boolean> {
  const { user, role, hasSubscription, profile } = await getResolvedUser()
  if (!user) return false
  if (user.email === profileEmail) return true // own profile
  if (role === 'employer' && hasSubscription) return true
  return false
}
