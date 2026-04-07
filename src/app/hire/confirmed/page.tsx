export default async function HireConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams

  const messages: Record<string, { title: string; body: string; color: string }> = {
    complete: {
      title: 'Hire confirmed.',
      body: 'Both parties have confirmed. This hire has been recorded and will count toward ShipStacked\'s hire total. Thank you for closing the loop.',
      color: '#1a7f37',
    },
    waiting: {
      title: 'Got it — we\'re waiting on the other side.',
      body: 'Your confirmation has been recorded. We\'ll update the hire count once the other party confirms too. Thank you.',
      color: '#0071e3',
    },
    invalid: {
      title: 'This link is no longer valid.',
      body: 'It may have already been used or expired. If you think this is an error, email us at hello@shipstacked.com.',
      color: '#6e6e73',
    },
  }

  const msg = messages[status || 'invalid'] || messages.invalid

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '3rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: 28 }}>
          {status === 'complete' ? '🎉' : status === 'waiting' ? '⏳' : '❌'}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: msg.color, marginBottom: '1rem' }}>{msg.title}</h1>
        <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.7, marginBottom: '2rem' }}>{msg.body}</p>
        <a href="/" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
          Back to ShipStacked
        </a>
      </div>
    </div>
  )
}
