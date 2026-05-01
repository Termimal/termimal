/**
 * SEO canonical URL helper.
 *
 * Single source of truth for every page's canonical link. Per the project
 * SEO policy:
 *   - Always absolute (https://…), never relative.
 *   - Always HTTPS, never http.
 *   - Always non-www (we publish on the apex `termimal.com`).
 *   - No trailing slash (clean URLs). Root `/` is the only exception.
 *   - All tracking parameters (utm_*, ref, fbclid, gclid, ...) stripped.
 *
 * The base origin is read from NEXT_PUBLIC_SITE_URL — never hardcoded —
 * so preview deploys and production stay consistent without code edits.
 *
 * Typical use inside a route's generateMetadata():
 *
 *   import { getCanonicalUrl } from '@/lib/seo/canonical'
 *   export const metadata: Metadata = {
 *     alternates: { canonical: getCanonicalUrl('/about') },
 *   }
 */

const FALLBACK_ORIGIN = 'https://termimal.com'

const TRACKING_PARAM_RE =
  /^(utm_[a-z]+|ref|referrer|fbclid|gclid|msclkid|mc_cid|mc_eid|yclid|dclid|igshid|wbraid|gbraid|campaign|source|medium)$/i

/**
 * Returns the canonical origin (scheme + host) for the current
 * deployment. Coerces NEXT_PUBLIC_SITE_URL to:
 *   - https://
 *   - non-www
 *   - no trailing slash
 *
 * If the env var is missing or unparseable we fall back to the
 * production domain so the build never crashes — but the build-time
 * canonical checker (scripts/check-canonicals.ts) will fail fast in CI.
 */
export function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_ORIGIN
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return FALLBACK_ORIGIN
  }
  url.protocol = 'https:'
  if (url.hostname.startsWith('www.')) {
    url.hostname = url.hostname.slice(4)
  }
  return `${url.protocol}//${url.host}`.replace(/\/$/, '')
}

/**
 * Strip every known tracking parameter from a URLSearchParams.
 * Mutates and returns the same instance for fluent use.
 */
export function stripTrackingParams(params: URLSearchParams): URLSearchParams {
  const toDelete: string[] = []
  params.forEach((_value, key) => {
    if (TRACKING_PARAM_RE.test(key)) toDelete.push(key)
  })
  toDelete.forEach((k) => params.delete(k))
  return params
}

/**
 * Return true if the URL has any tracking parameter — used by middleware
 * to decide whether to issue a 301 to the clean URL.
 */
export function hasTrackingParams(params: URLSearchParams): boolean {
  let found = false
  params.forEach((_v, k) => {
    if (TRACKING_PARAM_RE.test(k)) found = true
  })
  return found
}

/**
 * Build the canonical URL for a given path. The path may be absolute
 * (we'll keep its query string but strip tracking) or relative (in which
 * case we resolve it against the site origin).
 *
 * Trailing-slash policy: removed for every path except the root.
 */
export function getCanonicalUrl(path: string): string {
  const origin = getSiteOrigin()
  // Absolute URL passed in — only honour it if it matches our origin.
  // Cross-origin "canonicals" are almost always a mistake.
  let url: URL
  if (/^https?:\/\//i.test(path)) {
    try {
      url = new URL(path)
    } catch {
      url = new URL('/', origin)
    }
    if (url.origin !== origin) {
      // Reject the cross-origin path; build a same-origin canonical
      // from its pathname only.
      url = new URL(url.pathname + url.search, origin)
    }
  } else {
    const safe = path.startsWith('/') ? path : `/${path}`
    url = new URL(safe, origin)
  }

  // Always HTTPS + non-www.
  url.protocol = 'https:'
  if (url.hostname.startsWith('www.')) url.hostname = url.hostname.slice(4)

  // Strip tracking params.
  stripTrackingParams(url.searchParams)

  // No trailing slash, except for root.
  let pathname = url.pathname
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1)
  }

  // Drop empty query string entirely.
  const qs = url.searchParams.toString()
  return `${url.protocol}//${url.host}${pathname}${qs ? `?${qs}` : ''}`
}
