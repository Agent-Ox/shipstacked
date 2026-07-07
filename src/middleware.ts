import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── Content negotiation for V2 public surfaces ─────────────────────────
// /p/<slug>.json                       → /api/p/<slug>/jsonld
// /atlas/roles/<id>.json               → /api/atlas/roles/<id>/jsonld?v=...
// /p/<slug>           with Accept: application/ld+json → /api/p/<slug>/jsonld
// /atlas/roles/<id>   with Accept: application/ld+json → /api/atlas/roles/<id>/jsonld?v=...
// Bails before the auth gate when a rewrite fires — JSON-LD endpoints are
// public reads gated downstream by visibility (receipts) / RLS (atlas).
function tryContentNegotiation(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl
  const accept = request.headers.get('accept') || ''
  const wantsJsonLd =
    accept.includes('application/ld+json') ||
    accept.includes('application/vnd.shipstacked.receipt+json')

  const receiptJsonMatch = pathname.match(/^\/p\/([^/]+)\.json$/)
  if (receiptJsonMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/p/${receiptJsonMatch[1]}/jsonld`
    return NextResponse.rewrite(url)
  }
  const atlasJsonMatch = pathname.match(/^\/atlas\/roles\/([^/]+)\.json$/)
  if (atlasJsonMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/atlas/roles/${atlasJsonMatch[1]}/jsonld`
    url.search = search
    return NextResponse.rewrite(url)
  }

  // Consented Collections (slug-as-data — middleware rewrites by pattern;
  // unknown / inactive slugs are handled by the underlying API route's
  // requireActiveCollection gate).
  const collectionJsonMatch = pathname.match(/^\/collections\/([^/]+)\.json$/)
  if (collectionJsonMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/collections/${collectionJsonMatch[1]}/jsonld`
    return NextResponse.rewrite(url)
  }
  const collectionCsvMatch = pathname.match(/^\/collections\/([^/]+)\.csv$/)
  if (collectionCsvMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/collections/${collectionCsvMatch[1]}/csv`
    return NextResponse.rewrite(url)
  }

  if (wantsJsonLd) {
    const receiptMatch = pathname.match(/^\/p\/([^/]+)$/)
    if (receiptMatch) {
      const url = request.nextUrl.clone()
      url.pathname = `/api/p/${receiptMatch[1]}/jsonld`
      return NextResponse.rewrite(url)
    }
    const atlasMatch = pathname.match(/^\/atlas\/roles\/([^/]+)$/)
    if (atlasMatch) {
      const url = request.nextUrl.clone()
      url.pathname = `/api/atlas/roles/${atlasMatch[1]}/jsonld`
      url.search = search
      return NextResponse.rewrite(url)
    }
    // /collections/<slug> (no extension) with Accept: application/ld+json
    // → rewrite to the JSON-LD endpoint. The HTML page handles default Accept.
    const collectionMatch = pathname.match(/^\/collections\/([^/]+)$/)
    if (collectionMatch) {
      const url = request.nextUrl.clone()
      url.pathname = `/api/collections/${collectionMatch[1]}/jsonld`
      return NextResponse.rewrite(url)
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  const negotiated = tryContentNegotiation(request)
  if (negotiated) return negotiated

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  // Routes that require auth — /talent is PUBLIC (handles its own access tiers server-side)
  const authRequired = ['/dashboard', '/post-job', '/admin', '/hirer/', '/hirer/messages', '/employer/', '/employer/messages', '/messages']
  const isProtected = authRequired.some(route => pathname.startsWith(route))

  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|og-default.svg|api).*)',
  ],
}
