import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
  const authRequired = ['/dashboard', '/post-job', '/admin', '/employer', '/messages', '/client']
  const isProtected = authRequired.some(route => pathname.startsWith(route))

  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Employer-only routes — if builder tries to access, redirect to dashboard
  const employerOnly = ['/employer', '/post-job']
  if (session && employerOnly.some(route => pathname.startsWith(route))) {
    const metaRole = session.user.user_metadata?.role
    // Only redirect if explicitly a builder (not employer)
    if (metaRole === 'builder') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Builder-only routes — if employer tries to access dashboard, redirect to employer
  if (session && pathname.startsWith('/dashboard')) {
    const metaRole = session.user.user_metadata?.role
    if (metaRole === 'employer') {
      const url = request.nextUrl.clone()
      url.pathname = '/employer'
      return NextResponse.redirect(url)
    }
  }

  // Client-only routes — redirect clients away from builder/employer routes
  if (session && session.user.user_metadata?.role === 'client') {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/messages')) {
      const url = request.nextUrl.clone()
      url.pathname = '/client/inbox'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|og-default.svg|api).*)',
  ],
}
