/**
 * Lightweight per-request CPU/duration instrumentation.
 *
 * Edge handlers wrap their body in `withTiming("/api/foo", () => ...)`.
 * If wall time exceeds the warn threshold we emit a structured log
 * line that Workers Logs can filter on (`{level:'warn',
 * kind:'slow-edge', route, ms}`).
 *
 * Two thresholds:
 *   - slow:   500 ms wall time → warn
 *   - hot:  3 000 ms wall time → error (something is very wrong)
 *
 * Wall time is NOT the same as CPU time on Workers — fetch awaits
 * don't count against the CPU budget. But high wall time still
 * indicates user-visible slowness, so we surface it.
 */

const SLOW_MS = 500
const HOT_MS  = 3_000

export async function withTiming<T>(
  route: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const start = Date.now()
  try {
    return await fn()
  } finally {
    const ms = Date.now() - start
    if (ms >= HOT_MS) {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify({ level: 'error', kind: 'hot-edge', route, ms }))
    } else if (ms >= SLOW_MS) {
      // eslint-disable-next-line no-console
      console.warn(JSON.stringify({ level: 'warn', kind: 'slow-edge', route, ms }))
    }
  }
}
