'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient()

    // Parse tokens from URL fragment manually and set session
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
          if (!error) {
            window.location.href = '/talent'
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
          window.location.href = '/talent'
        } else {
          window.location.href = '/login?error=auth'
        }
      })
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, color: '#6e6e73' }}>Signing you in...</p>
      </div>
    </div>
  )
}
