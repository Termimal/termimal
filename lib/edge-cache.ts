/**
 * Two-layer Edge cache helper for our /api/* handlers.
 *
 *   Layer 1 — `caches.default`
 *     Cloudflare's per-colo HTTP cache. Same colo, same URL → no
 *     CPU spent at all. Survives between requests on the same edge
 *     server. Keyed by the full request URL (including query).
 *
 *   Layer 2 — module-level `Map`
 *     Per-isolate in-memory fallback for hot data. Useful when
 *     `caches.default.match` misses (cold colo) but a previous
 *     request on the same isolate already fetched the upstream.
 *     LRU-bounded so memory stays predictable.
 *
 * Use it like:
 *
 *     export async function GET(request: Request) {
 *       return cachedJson(request, 60, async () => {
 *         const data = await heavyComputation()
 *         return NextResponse.json(data)
 *       })
 *     }
 *
 * `ttlSeconds` is forwarded to a `cache-control` header AND to the
 * in-memory fallback's TTL. The Cloudflare HTTP cache respects
 * cache-control automatically.
 */
import { NextResponse } from 'next/server'

type Entry = { at: number; body: string; status: number; type: string; ttl: number }
const MAP = new Map<string, Entry>()
const MAP_MAX = 256

function memGet(key: string): Entry | null {
  const e = MAP.get(key)
  if (!e) return null
  if (Date.now() - e.at > e.ttl * 1000) {
    MAP.delete(key)
    return null
  }
  return e
}
function memSet(key: string, e: Entry) {
  if (MAP.size >= MAP_MAX) {
    const k = MAP.keys().next().value
    if (k) MAP.delete(k)
  }
  MAP.set(key, e)
}

/**
 * Fetch-or-compute pattern. Tries Cloudflare colo cache, then the
 * isolate Map, then runs `compute()`. The result is written back
 * to both layers.
 */
export async function cachedJson(
  request: Request,
  ttlSeconds: number,
  compute: () => Promise<Response>,
): Promise<Response> {
  // Layer 1: Cloudflare HTTP cache.
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default
  if (cache) {
    const hit = await cache.match(request).catch(() => null)
    if (hit) {
      const h = new Headers(hit.headers)
      h.set('x-termimal-cache', 'HIT')
      return new Response(hit.body, { status: hit.status, headers: h })
    }
  }

  // Layer 2: isolate Map.
  const key = request.url
  const m = memGet(key)
  if (m) {
    return new Response(m.body, {
      status: m.status,
      headers: {
        'content-type': m.type,
        'cache-control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
        'x-termimal-cache': 'MEM',
      },
    })
  }

  // Miss — compute.
  const res = await compute()
  // Read body once so we can both store + return.
  const body = await res.text()
  const status = res.status
  const type = res.headers.get('content-type') ?? 'application/json'
  if (status < 500) {
    memSet(key, { at: Date.now(), body, status, type, ttl: ttlSeconds })
  }
  const headers = new Headers(res.headers)
  if (!headers.get('cache-control')) {
    headers.set('cache-control', `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`)
  }
  headers.set('x-termimal-cache', 'MISS')
  const out = new Response(body, { status, headers })
  if (cache && status < 500) {
    // ctx.waitUntil isn't available here (no per-request ctx in Next.js
    // route handlers); just fire-and-forget the put. Errors swallowed.
    cache.put(request, out.clone()).catch(() => null)
  }
  return out
}

/**
 * Plain helper to wrap a NextResponse.json with cache headers.
 */
export function withCacheHeaders<T>(data: T, ttlSeconds: number): Response {
  return NextResponse.json(data, {
    headers: {
      'cache-control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
    },
  })
}
