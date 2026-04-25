import type { Metadata, Viewport } from 'next'
import './globals.css'
import NavBar from '@/app/components/NavBar'
import FooterBar from '@/app/components/FooterBar'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'overlays-content',
}

export const metadata: Metadata = {
  verification: {
    google: 'gHqKduL9mCKWg27jtuLbCvjy-nn-utiIIEn1hlUFZzQ',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  title: {
    default: 'ShipStacked — The proof-of-work platform for AI-native builders',
    template: '%s | ShipStacked',
  },
  description: 'The hiring platform for AI-native builders. Find verified developers, prompt engineers, and AI automation specialists who prove their skills with real projects.',
  metadataBase: new URL('https://shipstacked.com'),
  openGraph: {
    siteName: 'ShipStacked',
    type: 'website',
    locale: 'en_US',
    url: 'https://shipstacked.com',
    title: 'ShipStacked — The proof-of-work platform for AI-native builders',
    description: 'The hiring platform for AI-native builders. Find verified developers, prompt engineers, and AI automation specialists who prove their skills with real projects.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'ShipStacked' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@ShipStacked',
    title: 'ShipStacked — The proof-of-work platform for AI-native builders',
    description: 'The hiring platform for AI-native builders. Verified skills. Real projects. Free to prove you can build.',
    images: ['/og-default.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: 'https://shipstacked.com',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <div style={{ paddingTop: 52 }}>{children}</div>
        <FooterBar />
      </body>
    </html>
  )
}
