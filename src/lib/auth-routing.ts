import { type EntityModes } from './user'

/**
 * Post-auth routing — single source of truth for "where should this user go?"
 *
 * Priority (locked per DISCOVERY_batch2_modes_refactor.md §G, 2026-05-22;
 * `client` retired in D2b-1):
 *   admin > hirer > builder
 *
 * Optional `redirectTo` honours magic-link explicit destinations (must be
 * same-origin path starting with /).
 * Optional `requiresPasswordSet` covers the post-Stripe-checkout onboarding
 * case — a hirer who hasn't set a password yet goes to /update-password
 * instead of /hirer.
 */
export function routeAfterAuth(
  modes: EntityModes,
  opts: { redirectTo?: string | null; requiresPasswordSet?: boolean } = {}
): string {
  if (opts.redirectTo && opts.redirectTo.startsWith('/')) return opts.redirectTo

  if (modes.admin) return '/admin'
  if (modes.hirer) {
    return opts.requiresPasswordSet ? '/update-password' : '/hirer'
  }
  if (modes.builder) return '/dashboard'
  // Phase 9: team admins and agent owners are first-class — they land on the
  // pillar-aware /dashboard (which renders their section) instead of falling
  // through and being ejected by the old no-profile gate. Behaviourally these
  // already resolved to /dashboard via the default below; the explicit branches
  // document the intent. Hirer landing (/hirer) is intentionally unchanged.
  if (modes.team_admin) return '/dashboard'
  if (modes.agent_owner) return '/dashboard'
  return '/dashboard'
}

/**
 * Default `?as=` mode for parameterless /api/messages requests.
 *
 * Priority: hirer > builder (mirrors routeAfterAuth() excluding admin —
 * admins don't have message inboxes).
 *
 * Returns null for users with neither builder nor hirer mode (callers
 * should treat as 401-ish empty state).
 */
export function defaultMessagingMode(modes: EntityModes): 'builder' | 'hirer' | null {
  if (modes.hirer) return 'hirer'
  if (modes.builder) return 'builder'
  return null
}
