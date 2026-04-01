import Link from 'next/link'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async function getProduct(sessionId: string): Promise<string> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return (session.metadata?.product as string) || 'unknown'
  } catch {
    return 'unknown'
  }
}

const MESSAGES: Record<string, { title: string; body: string; cta: string; href: string }> = {
  full_access: {
    title: "Welcome to ClaudHire.",
    body: "Your Full Access subscription is active. Check your email — we've sent you a link to set your password and access the talent directory.",
    cta: "Go to sign in →",
    href: "/login"
  },
  job_post: {
    title: "Job post confirmed.",
    body: "Your job listing is live for 30 days. Check your email — we've sent you a link to set your password and manage your listing.",
    cta: "Go to sign in →",
    href: "/login"
  },
  concierge: {
    title: "Concierge request confirmed.",
    body: "We will personally find and vet 3 Claude builders and deliver them to your inbox within 48 hours. Check your email for your account setup link.",
    cta: "Back to ClaudHire →",
    href: "/"
  },
  unknown: {
    title: "Payment confirmed.",
    body: "Thanks for your purchase. Check your email for next steps.",
    cta: "Back to ClaudHire →",
    href: "/"
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  const product = session_id ? await getProduct(session_id) : 'unknown'
  const msg = MESSAGES[product] || MESSAGES.unknown

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 480, padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: '#e3f3e3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: 28, color: '#1a7f37', fontWeight: 700 }}>
          ✓
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.75rem', color: '#1d1d1f' }}>{msg.title}</h1>
        <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '2rem', lineHeight: 1.6 }}>{msg.body}</p>
        <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '2rem' }}>
          Questions? Email us at <a href="mailto:hello@claudhire.com" style={{ color: '#0071e3', textDecoration: 'none' }}>hello@claudhire.com</a>
        </p>
        <Link href={msg.href} style={{ display: 'inline-block', padding: '0.85rem 1.75rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
          {msg.cta}
        </Link>
      </div>
    </div>
  )
}
