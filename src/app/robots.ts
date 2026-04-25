import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/og'],
        disallow: [
          '/dashboard',
          '/employer/',
          '/messages',
          '/post-job',
          '/admin',
          '/set-password',
          '/reset-password',
          '/update-password',
          '/success',
          '/auth',
          '/api/',
          '/client',
          '/get-found/',
          '/hire/',
        ],
      },
    ],
    sitemap: 'https://shipstacked.com/sitemap.xml',
  }
}
