/**
 * Polymarket CLOB WebSocket hook.
 *
 * Connects to wss://ws-subscriptions-clob.polymarket.com/ws/market and
 * subscribes to a list of token IDs (or condition IDs, depending on
 * the channel). Implements:
 *
 *   - Auto-reconnect with exponential backoff (3 s, 6 s, 12 s, 24 s,
 *     capped at 30 s, max 5 attempts before giving up)
 *   - 30-second ping/pong keepalive so Cloudflare doesn't drop the
 *     idle connection (CF terminates idle WS at 100 s)
 *   - Latency tracking (round-trip from ping send to pong receive)
 *   - Clean teardown on unmount — no leaked connections, no leaked
 *     intervals, no setState after unmount
 *
 * Returned status mirrors what the platform header expects:
 *   'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'
 *
 * The socket emits one update per message via `lastMessage`, which the
 * caller is expected to fold into its own state. Keep the hook
 * lightweight — opinionated state goes in the consumer.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market'
const PING_INTERVAL_MS = 30_000
const MAX_RECONNECTS = 5
const BACKOFF_SCHEDULE_MS = [3_000, 6_000, 12_000, 24_000, 30_000]

export type SocketStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error'

export interface UsePolymarketSocketOptions {
  /** Channel + asset IDs the subscription should filter on. */
  assetsIds?: string[]
  /** Pause / disable the connection. Useful when no market is selected. */
  enabled?: boolean
}

export interface UsePolymarketSocketResult<TMessage = unknown> {
  status: SocketStatus
  /** Round-trip latency in ms, or null if no pong received yet. */
  latency: number | null
  /** Most recent decoded message. The consumer reduces it into state. */
  lastMessage: TMessage | null
  /** Force a fresh connection — clears backoff. */
  reconnect: () => void
}

export function usePolymarketSocket<TMessage = unknown>(
  options: UsePolymarketSocketOptions,
): UsePolymarketSocketResult<TMessage> {
  const { assetsIds, enabled = true } = options

  const [status, setStatus] = useState<SocketStatus>('disconnected')
  const [latency, setLatency] = useState<number | null>(null)
  const [lastMessage, setLastMessage] = useState<TMessage | null>(null)

  // Refs we don't want to trigger re-renders on:
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pingSentAtRef = useRef<number | null>(null)
  const attemptRef = useRef(0)
  const unmountedRef = useRef(false)
  // Stable JSON of the asset list — change drives re-subscription.
  const assetsKey = (assetsIds ?? []).slice().sort().join(',')

  const cleanup = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current)
      pingTimerRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      try {
        // Detach handlers BEFORE close so close events don't trigger
        // reconnect on intentional teardown.
        wsRef.current.onopen = null
        wsRef.current.onmessage = null
        wsRef.current.onerror = null
        wsRef.current.onclose = null
        wsRef.current.close()
      } catch { /* ignore */ }
      wsRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (unmountedRef.current || !enabled) return

    cleanup()
    setStatus(attemptRef.current === 0 ? 'connecting' : 'reconnecting')

    let ws: WebSocket
    try {
      ws = new WebSocket(WS_URL)
    } catch (err) {
      // Some browsers throw synchronously on a malformed URL. Treat
      // as a failed attempt and schedule a backoff.
      console.warn('[poly-ws] construct failed', err)
      setStatus('error')
      scheduleReconnect()
      return
    }
    wsRef.current = ws

    ws.onopen = () => {
      if (unmountedRef.current) return
      attemptRef.current = 0
      setStatus('connected')
      // Send subscription frame.
      const assets = assetsKey ? assetsKey.split(',').filter(Boolean) : []
      try {
        ws.send(
          JSON.stringify({
            type: 'market',
            // Polymarket's market channel accepts an `assets_ids` array.
            // Empty array means "subscribe to nothing" — caller can
            // toggle by enabling/disabling the hook.
            assets_ids: assets,
          }),
        )
      } catch (err) {
        console.warn('[poly-ws] subscribe send failed', err)
      }

      // Ping every 30 s.
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return
        try {
          pingSentAtRef.current = performance.now()
          ws.send('PING')
        } catch { /* ignore */ }
      }, PING_INTERVAL_MS)
    }

    ws.onmessage = (event) => {
      if (unmountedRef.current) return
      const raw = typeof event.data === 'string' ? event.data : ''

      // PONG handling — Polymarket replies with the literal string
      // 'PONG' or echoes 'pong' depending on server version.
      if (raw === 'PONG' || raw === 'pong') {
        if (pingSentAtRef.current != null) {
          setLatency(Math.round(performance.now() - pingSentAtRef.current))
          pingSentAtRef.current = null
        }
        return
      }
      try {
        const decoded = JSON.parse(raw) as TMessage
        setLastMessage(decoded)
      } catch {
        // Non-JSON, non-PONG frame — ignore.
      }
    }

    ws.onerror = () => {
      if (unmountedRef.current) return
      // onclose will fire next; reconnect logic lives there to avoid
      // double-scheduling.
      setStatus('error')
    }

    ws.onclose = () => {
      if (unmountedRef.current) return
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current)
        pingTimerRef.current = null
      }
      scheduleReconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetsKey, enabled, cleanup])

  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current || !enabled) {
      setStatus('disconnected')
      return
    }
    if (attemptRef.current >= MAX_RECONNECTS) {
      setStatus('disconnected')
      return
    }
    const delay =
      BACKOFF_SCHEDULE_MS[Math.min(attemptRef.current, BACKOFF_SCHEDULE_MS.length - 1)]
    attemptRef.current += 1
    setStatus('reconnecting')
    reconnectTimerRef.current = setTimeout(connect, delay)
  }, [enabled, connect])

  const reconnect = useCallback(() => {
    attemptRef.current = 0
    connect()
  }, [connect])

  // (Re)connect when enabled or asset list changes.
  useEffect(() => {
    unmountedRef.current = false
    if (enabled) connect()
    else {
      cleanup()
      setStatus('disconnected')
    }
    return () => {
      unmountedRef.current = true
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, assetsKey])

  return { status, latency, lastMessage, reconnect }
}
