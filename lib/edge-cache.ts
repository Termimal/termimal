/**
 * Two-layer Edge cache helper for our /api/* handlers.
 *
 *   Layer 1 — Cloudflare colo HTTP cache (`caches.default`)
 *     Same colo, same URL → 0 CPU. The cached Response is returned
 *     by streaming `body` directly — we NEVER call `text()` on it.
 *
 *   Layer 2 — module-level Map (LRU 256, body kept as string)
 *     Per-isolate fallback for hot URLs when caches.default isn't
 *     populated yet. Only used as a tiebreaker; once Cloudflare's
 *     cache warms up (typically within seconds of first hit) the
 *     Map's entries become redundant.
 *
 * CPU-aware design choices (Free plan, 10 ms ceiling):
 *   - On a cache HIT we never touch the body. No JSON.parse, no
 *     text(). Pure stream pass-through.
 *   - On a MISS we do NOT call `await res.text()` to read the body
 *     for the Layer-2 cache; we use `res.clone()` so the original
 *     response streams to the client and the clone is consumed
 *     fire-and-forget for cache writes.
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
 * Fetch-or-compute. Returns the cached Response by streaming
 * `body` directly — no parse, no rebuild. On a miss the original
 * Response streams to the client; a clone is consumed for cache
 * writes in the background (fire-and-forget — does not block the
 * client response).
 */
export async function cachedJson(
  request: Request,
  ttlSeconds: number,
  compute: () => Promise<Response>,
): Promise<Response> {
  // Layer 1: Cloudflare colo cache. Pass-through stream, zero CPU.
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default
  if (cache) {
    const hit = await cache.match(request).catch(() => null)
    if (hit) {
      const h = new Headers(hit.headers)
      h.set('x-termimal-cache', 'HIT')
      return new Response(hit.body, { status: hit.status, headers: h })
    }
  }

  // Layer 2: per-isolate Map fallback (string-cached body).
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

  // ── Miss ────────────────────────────────────────────────────────
  const res = await compute()

  // Make sure cache-control is set for the colo cache to honour TTL.
  const headers = new Headers(res.headers)
  if (!headers.get('cache-control')) {
    headers.set('cache-control', `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`)
  }
  headers.set('x-termimal-cache', 'MISS')

  // Two-pronged caching, both fire-and-forget so the client gets
  // bytes immediately:
  //
  //   (a) caches.default — store a clone of the response so the
  //       Cloudflare colo cache can serve subsequent requests.
  //   (b) Layer-2 Map — read the cloned body asynchronously and
  //       drop it in the per-isolate cache. This blocks NOTHING
  //       on the client response since it runs in a microtask.
  if (res.status < 500) {
    if (cache) {
      // Build the response we want cached (with cache-control).
      const cacheable = new Response(res.clone().body, {
        status: res.status,
        headers,
      })
      // Don't await — return to client immediately.
      cache.put(request, cacheable).catch(() => null)
    }
    // Populate Layer-2 in the background. Reading body via .text()
    // happens asynchronously so it doesn't add to client TTFB.
    res.clone().text().then((body) => {
      memSet(key, {
        at: Date.now(),
        body,
        status: res.status,
        type: res.headers.get('content-type') ?? 'application/json',
        ttl: ttlSeconds,
      })
    }).catch(() => null)
  }

  // Original response — body still unconsumed — streams to client.
  return new Response(res.body, { status: res.status, headers })
}

/** Plain wrapper that just sets cache-control on a JSON response. */
export function withCacheHeaders<T>(data: T, ttlSeconds: number): Response {
  return NextResponse.json(data, {
    headers: {
      'cache-control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
    },
  })
}
