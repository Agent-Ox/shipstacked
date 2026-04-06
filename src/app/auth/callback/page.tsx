'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient()

    // Check for redirect_to in query params (set by magic link)
    const searchParams = new URLSearchParams(window.location.search)
    const redirectTo = searchParams.get('redirect_to')

    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data, error }) => {
          if (!error && data.session) {
            const user = data.session.user
            const metaRole = user.user_metadata?.role

            // If magic link specified a redirect, honour it
            if (redirectTo && redirectTo.startsWith('/')) {
              window.location.href = redirectTo
              return
            }

            if (metaRole === 'employer') {
              const hasPassword = user.user_metadata?.password_set === true
              window.location.href = hasPassword ? '/employer' : '/update-password'
              return
            }

            if (metaRole === 'client') {
              window.location.href = '/client/inbox'
              return
            }

            // Check subscription for employers who paid before role was set
            const now = new Date().toISOString()
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('email', user.email)
              .eq('status', 'active')
              .eq('product', 'full_access')
              .or(`expires_at.is.null,expires_at.gt.${now}`)
              .maybeSingle()

            window.location.href = sub ? '/employer' : '/dashboard'
          } else {
            window.location.href = '/login?error=auth'
          }
        })
      } else {
        window.location.href = '/login?error=auth'
      }
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          const metaRole = session.user.user_metadata?.role
          if (redirectTo && redirectTo.startsWith('/')) {
            window.location.href = redirectTo
            return
          }
          if (metaRole === 'employer') {
            window.location.href = '/employer'
          } else if (metaRole === 'client') {
            window.location.href = '/client/inbox'
          } else {
            window.location.href = '/dashboard'
          }
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
