import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasTrackingParams, stripTrackingParams } from '@/lib/seo/canonical'

/**
 * Top-level middleware. Two responsibilities:
 *
 *  1. Strip tracking parameters (utm_*, ref, fbclid, gclid, …) from
 *     every public GET request and 301 to the clean URL. This stops
 *     Google from indexing tracked variants of the same page (the
 *     "Alternative page with proper canonical tag" GSC issue).
 *
 *  2. Auth-gate /dashboard, /admin, and bounce signed-in users away
 *     from /login + /signup into /terminal.
 *
 * Order matters: UTM strip runs FIRST so signed-in users still land
 * on the canonical (clean) URL.
 */
export async function middleware(request: NextRequest) {
  // ── 1. UTM / tracking-parameter strip ─────────────────────────────
  // Only on GET (POST forms with utm_ are usually webhooks).
  if (request.method === 'GET' && hasTrackingParams(request.nextUrl.searchParams)) {
    const cleanUrl = request.nextUrl.clone()
    stripTrackingParams(cleanUrl.searchParams)
    return NextResponse.redirect(cleanUrl, 301)
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Skip auth check if Supabase isn't configured (preview without env).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project')) {
    return response
  }

  // Auth-gate only paths that need it. The matcher below already excludes
  // assets / api / _next, but we double-check here so the cheap UTM strip
  // doesn't pay for a Supabase call on every public page hit.
  const path = request.nextUrl.pathname
  const isProtectedRoute =
    path.startsWith('/dashboard') ||
    path.startsWith('/admin') ||
    path === '/login' ||
    path === '/signup'

  if (!isProtectedRoute) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // If Supabase is unreachable we don't want every request to /dashboard to
  // 500 — degrade gracefully and let the request through. Per-page auth
  // checks will redirect to /login if needed.
  let user: { id: string } | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user as { id: string } | null
  } catch {
    return response
  }

  if (path.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (path.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if ((path === '/login' || path === '/signup') && user) {
    return NextResponse.redirect(new URL('/terminal', request.url))
  }

  return response
}

/**
 * Match every public route. The negative-lookahead excludes:
 *   - /api/* (server endpoints — never canonicalise these)
 *   - /_next/* (Next assets)
 *   - /terminal/* (SPA shell + assets — already noindex'd at the file level)
 *   - any path containing a dot (static files: .png, .ico, .xml, .txt, etc.)
 *
 * Auth-gating is still scoped inside the function above to /dashboard,
 * /admin, /login, /signup only.
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|terminal|.*\\..*).*)',
  ],
}
