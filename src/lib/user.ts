import { createServerSupabaseClient } from './supabase-server'

export type EntityModes = {
  builder: boolean        // has a profiles row
  hirer: boolean          // has an active full_access subscription
  client: boolean         // user_metadata.role === 'client'
  admin: boolean          // user_metadata.role === 'admin'
  team_admin: boolean     // has a row in team_admins (Phase 9)
  agent_owner: boolean    // owns at least one entity where kind='agent' (Phase 9)
}

// Phase 9: concrete entity references for the pillar a user holds. v1 surfaces
// the FIRST team admined / agent owned (mirrors the NavBar identity affordances).
export type EntityRefs = {
  profile_id?: string
  profile_username?: string
  team_entity_id?: number
  team_slug?: string
  agent_entity_id?: number
  agent_slug?: string
}

export type ResolvedUser = {
  user: any | null
  modes: EntityModes
  hasProfile: boolean
  hasSubscription: boolean
  profile: any | null
  subscription: any | null
}

// Phase 9: the combined state used by /dashboard and any pillar-aware surface —
// modes + refs resolved in ONE round of parallel queries.
export type UserState = {
  user: any | null
  modes: EntityModes
  refs: EntityRefs
  profile: any | null
  subscription: any | null
}

const EMPTY_MODES: EntityModes = {
  builder: false, hirer: false, client: false, admin: false, team_admin: false, agent_owner: false,
}

/**
 * Phase 9: single source of truth for "who is this user, across all pillars?".
 * Resolves modes + refs in one round of parallel queries (sub, profile,
 * team_admins, agent entities). getEntityModes()/getEntityRefs() delegate here
 * so existing callers keep their signatures while gaining the two new modes.
 */
export async function getUserState(): Promise<UserState> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { user: null, modes: EMPTY_MODES, refs: {}, profile: null, subscription: null }
    }

    const now = new Date().toISOString()

    const [subRes, profileRes, teamRes, agentRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('email', user.email)
        .eq('status', 'active')
        .eq('product', 'full_access')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        // Belt-and-suspenders: even if a lifecycle event was missed and status
        // is still 'active', access expires at the paid-through period end.
        .or(`current_period_end.is.null,current_period_end.gt.${now}`)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle(),
      // team_admins self-read RLS (§F.B2.7) permits the user's own rows; the FK
      // hint is required for the entities embed (matches NavBar).
      supabase
        .from('team_admins')
        .select('team_entity_id, team:entities!team_admins_team_entity_id_fkey(slug)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('entities')
        .select('id, slug')
        .eq('kind', 'agent')
        .eq('owner_user_id', user.id)
        .limit(1)
        .maybeSingle(),
    ])

    const subscription = subRes.data
    const profile = profileRes.data
    const teamRow = teamRes.data as any
    const agentRow = agentRes.data as any
    const metaRole = user.user_metadata?.role

    const teamRel = teamRow?.team
    const team_slug = (Array.isArray(teamRel) ? teamRel[0]?.slug : teamRel?.slug) ?? undefined

    const modes: EntityModes = {
      builder: !!profile,
      hirer: !!subscription,
      client: metaRole === 'client',
      admin: metaRole === 'admin',
      team_admin: !!teamRow,
      agent_owner: !!agentRow,
    }

    const refs: EntityRefs = {
      profile_id: profile?.id ?? undefined,
      profile_username: profile?.username ?? undefined,
      team_entity_id: teamRow?.team_entity_id ?? undefined,
      team_slug,
      agent_entity_id: agentRow?.id ?? undefined,
      agent_slug: agentRow?.slug ?? undefined,
    }

    return { user, modes, refs, profile, subscription }
  } catch {
    return { user: null, modes: EMPTY_MODES, refs: {}, profile: null, subscription: null }
  }
}

/**
 * Existing no-arg resolver — signature preserved for all 13 callers. Now also
 * returns team_admin/agent_owner in `modes` (via getUserState). The Phase-2
 * profile-without-subscription drift warning is preserved.
 */
export async function getEntityModes(): Promise<ResolvedUser> {
  const s = await getUserState()

  if (!s.subscription && s.profile && s.profile?.user_id) {
    console.warn(`[getEntityModes] user ${s.user?.id} (email=${s.user?.email}) has profile but no active subscription — verify email match if expected as paying customer`)
  }

  return {
    user: s.user,
    modes: s.modes,
    hasProfile: !!s.profile,
    hasSubscription: !!s.subscription,
    profile: s.profile,
    subscription: s.subscription,
  }
}

/** Phase 9: concrete entity refs (profile/team/agent ids + slugs). */
export async function getEntityRefs(): Promise<EntityRefs> {
  const s = await getUserState()
  return s.refs
}
