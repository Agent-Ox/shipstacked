'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { routeAfterAuth } from '@/lib/auth-routing'
import type { EntityModes } from '@/lib/user'

async function deriveModesClientSide(supabase: ReturnType<typeof createClient>, user: any): Promise<EntityModes> {
  const metaRole = user.user_metadata?.role
  const now = new Date().toISOString()

  const [{ data: sub }, { data: profile }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id')
      .eq('email', user.email)
      .eq('status', 'active')
      .eq('product', 'full_access')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .maybeSingle(),
  ])

  return {
    builder: !!profile,
    hirer: !!sub,
    client: metaRole === 'client',
    admin: metaRole === 'admin',
    // Client-side derivation does not query team/agent; routeAfterAuth sends
    // these users to /dashboard via the fallthrough regardless. (Phase 9)
    team_admin: false,
    agent_owner: false,
  }
}

export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient()

    const searchParams = new URLSearchParams(window.location.search)
    const redirectTo = searchParams.get('redirect_to')

    const route = async (user: any) => {
      const modes = await deriveModesClientSide(supabase, user)
      const requiresPasswordSet = modes.hirer && user.user_metadata?.password_set !== true
      window.location.href = routeAfterAuth(modes, { redirectTo, requiresPasswordSet })
    }

    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data, error }) => {
          if (!error && data.session) {
            await route(data.session.user)
          } else {
            window.location.href = '/login?error=auth'
          }
        })
      } else {
        window.location.href = '/login?error=auth'
      }
    } else {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          await route(session.user)
        } else {
          window.location.href = '/login?error=auth'
        }
      })
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 16, color: '#6e6e73' }}>Signing you in...</p>
    </div>
  )
}
