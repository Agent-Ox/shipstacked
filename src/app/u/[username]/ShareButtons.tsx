'use client'

import { useState } from 'react'

const btnStyle = {
  padding: '0.5rem 1.25rem',
  borderRadius: 20,
  fontSize: 13,
  textDecoration: 'none',
  fontWeight: 500,
  color: 'white',
  display: 'inline-block',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
} as const

export default function ShareButtons({ name, url, role, verified, velocityScore }: { name: string, url: string, role?: string, verified?: boolean, velocityScore?: number }) {
  const [copied, setCopied] = useState(false)

  const tweetText = [
    `~/ship → ${name}${verified ? ' ✓' : ''}`,
    role ? role : 'AI-native builder',
    velocityScore ? `⚡ ${velocityScore}/100 velocity` : '',
    '',
    'Proof-of-work hiring for the vibe coding generation.',
    '',
    `#shipstacked #vibecoding #AIjobs #hiring`,
  ].filter(Boolean).join('\n')

  const xShareUrl = 'https://x.com/intent/tweet?text=' + encodeURIComponent(tweetText) + '&url=' + encodeURIComponent(url)
  const waShareUrl = 'https://wa.me/?text=' + encodeURIComponent(name + ' is an AI-native builder on ShipStacked: ' + url)

  const handleShareAll = () => {
    if (navigator.share) {
      navigator.share({ title: name + ' on ShipStacked', url })
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ padding: '1.5rem', background: '#f5f5f7', borderRadius: 14, marginBottom: '1rem' }}>
      <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem', textAlign: 'center' }}>Share this profile</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href={xShareUrl} target="_blank" style={{ ...btnStyle, background: '#000' }}>Share on X</a>
        <a href={waShareUrl} target="_blank" style={{ ...btnStyle, background: '#25D366' }}>WhatsApp</a>
        <button onClick={handleShareAll} style={{ ...btnStyle, background: '#6e6e73' }}>Share on all apps</button>
        <button onClick={handleCopy} style={{ ...btnStyle, background: copied ? '#1a7f37' : '#0071e3' }}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}