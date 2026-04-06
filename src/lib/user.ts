import { createServerSupabaseClient } from './supabase-server'

export type UserRole = 'employer' | 'builder' | 'client' | 'visitor'

export type ResolvedUser = {
  user: any | null
  role: UserRole
  hasProfile: boolean
  hasSubscription: boolean
  profile: any | null
  subscription: any | null
}

export async function getResolvedUser(): Promise<ResolvedUser> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { user: null, role: 'visitor', hasProfile: false, hasSubscription: false, profile: null, subscription: null }
    }

    const now = new Date().toISOString()

    // Check subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('email', user.email)
      .eq('status', 'active')
      .eq('product', 'full_access')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle()

    // Check builder profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    const hasSubscription = !!subscription
    const hasProfile = !!profile

    // Role resolution:
    // - Has active subscription = employer
    // - Has builder profile = builder
    // - Logged in but neither = default to builder (just signed up)
    // - User metadata role takes precedence if set
    const metaRole = user.user_metadata?.role
    let role: UserRole = 'visitor'

    if (metaRole === 'employer' || hasSubscription) {
      role = 'employer'
    } else if (metaRole === 'client') {
      role = 'client'
    } else if (metaRole === 'builder' || hasProfile) {
      role = 'builder'
    } else {
      role = 'builder'
    }

    return { user, role, hasProfile, hasSubscription, profile, subscription }
  } catch {
    return { user: null, role: 'visitor', hasProfile: false, hasSubscription: false, profile: null, subscription: null }
  }
}
