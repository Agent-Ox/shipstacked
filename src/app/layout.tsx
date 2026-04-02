import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/app/components/NavBar'
import Scout from '@/app/components/Scout'

export const metadata: Metadata = {
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  title: {
    default: 'ClaudHire — Hire Claude-Native Talent',
    template: '%s | ClaudHire',
  },
  description: 'The hiring platform for Claude-native builders. Find verified developers, prompt engineers, and AI automation specialists who prove their skills with real projects.',
  metadataBase: new URL('https://claudhire.com'),
  openGraph: {
    siteName: 'ClaudHire',
    type: 'website',
    locale: 'en_US',
    url: 'https://claudhire.com',
    title: 'ClaudHire — Hire Claude-Native Talent',
    description: 'The hiring platform for Claude-native builders. Find verified developers, prompt engineers, and AI automation specialists who prove their skills with real projects.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'ClaudHire' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@ClaudHire',
    title: 'ClaudHire — Hire Claude-Native Talent',
    description: 'The hiring platform for Claude-native builders. Verified skills. Real projects. Free to prove you can build.',
    images: ['/og-default.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: 'https://claudhire.com',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <Scout />
        <div style={{ paddingTop: 52 }}>{children}</div>
      </body>
    </html>
  )
}
