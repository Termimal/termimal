/**
 * Lightweight in-memory per-IP rate limiter for Edge route handlers.
 *
 * Sliding-window: counts requests per IP in the trailing N seconds.
 * State is per-isolate Map — Cloudflare may run many isolates, so
 * the effective limit is per-isolate × number of isolates. For our
 * traffic (~3 k req/day) one isolate handles most colos so the
 * approximation is adequate. When traffic grows, swap the Map
 * backend for a KV namespace using the same key shape.
 *
 *   const ok = await checkRateLimit(request, '/api/polymarket/scan',
 *                                    { max: 6, windowSec: 60 })
 *   if (!ok.allowed) return new Response('rate limited', {
 *     status: 429,
 *     headers: { 'retry-after': String(ok.retryAfter) },
 *   })
 */

const BUCKETS = new Map<string, number[]>()  // key -> array of request timestamps (ms)
const BUCKETS_MAX_KEYS = 2048

interface RateLimitConfig {
  max: number
  windowSec: number
}
interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number   // seconds
}

function clientIpFrom(request: Request): string {
  // Cloudflare always sets cf-connecting-ip (real client IP).
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return 'unknown'
}

export function checkRateLimit(
  request: Request,
  scope: string,
  config: RateLimitConfig,
): RateLimitResult {
  const ip = clientIpFrom(request)
  const key = `${scope}:${ip}`
  const now = Date.now()
  const windowMs = config.windowSec * 1000
  const cutoff = now - windowMs
  const arr = BUCKETS.get(key) ?? []
  // Prune older entries in-place.
  while (arr.length && arr[0] < cutoff) arr.shift()
  if (arr.length >= config.max) {
    const retryAfter = Math.max(1, Math.ceil((arr[0] + windowMs - now) / 1000))
    return { allowed: false, remaining: 0, retryAfter }
  }
  arr.push(now)
  // Bound the BUCKETS map size.
  if (BUCKETS.size >= BUCKETS_MAX_KEYS) {
    const k = BUCKETS.keys().next().value
    if (k && k !== key) BUCKETS.delete(k)
  }
  BUCKETS.set(key, arr)
  return { allowed: true, remaining: config.max - arr.length, retryAfter: 0 }
}

/** Convenience — returns a 429 Response if rate-limited, else null. */
export function rateLimitResponse(check: RateLimitResult): Response | null {
  if (check.allowed) return null
  return new Response(
    JSON.stringify({ error: 'rate_limited', retry_after: check.retryAfter }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': String(check.retryAfter),
      },
    },
  )
}
