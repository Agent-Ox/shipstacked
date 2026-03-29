import Link from 'next/link'

export default function SuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 480, padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: '#e3f3e3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: 28, color: '#1a7f37', fontWeight: 700 }}>
          ✓
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Payment confirmed.</h1>
        <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '2rem', lineHeight: 1.6 }}>
          Thank you for your purchase. We will be in touch within 24 hours to get you set up.
        </p>
        <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '2rem' }}>
          Questions? Email us at <a href="mailto:hello@claudhire.com" style={{ color: '#0071e3', textDecoration: 'none' }}>hello@claudhire.com</a>
        </p>
        <Link href="/" style={{ display: 'inline-block', padding: '0.85rem 1.75rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
          Back to ClaudHire →
        </Link>
      </div>
    </div>
  )
}