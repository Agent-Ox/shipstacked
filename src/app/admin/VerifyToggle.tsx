'use client'

import { useState } from 'react'

export default function VerifyToggle({ profileId, initialVerified, builderEmail, builderName }: {
  profileId: string
  initialVerified: boolean
  builderEmail: string
  builderName: string
}) {
  const [verified, setVerified] = useState(initialVerified)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          verified: !verified,
          builder_email: builderEmail,
          builder_name: builderName,
        })
      })
      const data = await res.json()
      if (data.success) setVerified(data.verified)
    } catch {}
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        fontSize: 12, fontWeight: 600,
        padding: '0.2rem 0.6rem',
        borderRadius: 6,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        background: verified ? '#e3f3e3' : '#f5f5f7',
        color: verified ? '#1a7f37' : '#aeaeb2',
        opacity: loading ? 0.6 : 1,
        fontFamily: 'inherit',
        transition: 'all 0.2s',
      }}
    >
      {loading ? '...' : verified ? '✓ Verified' : 'Unverified'}
    </button>
  )
}
