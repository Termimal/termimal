// pages/polymarket/useOrderflowStream.ts
import { useEffect, useRef, useState } from 'react'
import type { OFTrade, OFBook } from './types'

type StreamFrame =
  | { type: 'trade'; ts: number; token: 'yes' | 'no'; aggressor: 'buy' | 'sell'; price: number; size: number; notional: number }
  | { type: 'book'; token: 'yes' | 'no'; bids: [number, number][]; asks: [number, number][]; ts: number }
  | { type: 'tick_size_change'; token: 'yes' | 'no'; new: number }
  | { type: 'status'; msg: string }
  | { type: 'error'; msg: string }

export type StreamStatus = 'connecting' | 'live' | 'reconnecting' | 'polling' | 'offline'

const RING_CAP = 5000

export function useOrderflowStream(conditionId: string | null) {
  const [status, setStatus] = useState<StreamStatus>('connecting')
  const [yesBook, setYesBook] = useState<Partial<OFBook> | null>(null)
  const [noBook, setNoBook]  = useState<Partial<OFBook> | null>(null)
  const [yesTrades, setYesTrades] = useState<OFTrade[]>([])
  const [noTrades, setNoTrades]   = useState<OFTrade[]>([])
  const [tickBump, setTickBump] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const failCountRef = useRef(0)
  const lastFailAt = useRef(0)
  const pollingRef = useRef<number | null>(null)
  const reconnTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!conditionId) return
    setYesTrades([]); setNoTrades([]); setYesBook(null); setNoBook(null)
    failCountRef.current = 0; lastFailAt.current = 0
    connect()
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditionId])

  function cleanup() {
    if (wsRef.current) { try { wsRef.current.close() } catch {} wsRef.current = null }
    if (reconnTimerRef.current) { clearTimeout(reconnTimerRef.current); reconnTimerRef.current = null }
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
  }

  function startPollingFallback() {
    setStatus('polling')
    cleanup()
    async function poll() {
      try {
        const r = await fetch(`/api/polymarket/orderflow/trades/${conditionId}?limit=200&side=both`)
        if (r.ok) {
          const j = await r.json()
          const ts: OFTrade[] = j.trades || []
          // Split by token using meta
          const metaR = await fetch(`/api/polymarket/orderflow/market/${conditionId}`)
          if (metaR.ok) {
            const meta = await metaR.json()
            const yId = meta?.tokens?.yes?.token_id
            const nId = meta?.tokens?.no?.token_id
            setYesTrades(ts.filter(t => t.token_id === yId).slice(-RING_CAP))
            setNoTrades(ts.filter(t => t.token_id === nId).slice(-RING_CAP))
          }
        }
      } catch {}
    }
    poll()
    pollingRef.current = window.setInterval(poll, 3000)
  }

  function connect() {
    if (!conditionId) return
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${window.location.host}/api/polymarket/orderflow/stream/${conditionId}`
    setStatus('connecting')
    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch {
      onFail()
      return
    }
    wsRef.current = ws

    ws.onopen = () => { setStatus('live'); failCountRef.current = 0 }

    ws.onmessage = (ev) => {
      try {
        const frame: StreamFrame = JSON.parse(ev.data)
        if (frame.type === 'trade') {
          const trade: OFTrade = {
            ts: frame.ts, price: frame.price, size: frame.size, notional: frame.notional,
            side: frame.aggressor === 'buy' ? 'BUY' : 'SELL',
            aggressor: frame.aggressor,
            outcome: frame.token === 'yes' ? 'Yes' : 'No',
            token_id: '', wallet: '', pseudonym: '', tx: '',
          }
          if (frame.token === 'yes') setYesTrades(s => [...s, trade].slice(-RING_CAP))
          else if (frame.token === 'no') setNoTrades(s => [...s, trade].slice(-RING_CAP))
        } else if (frame.type === 'book') {
          const b: Partial<OFBook> = { bids: frame.bids, asks: frame.asks, ts: frame.ts, stale: (frame.asks[0] && frame.bids[0]) ? (frame.asks[0][0] - frame.bids[0][0]) > 0.90 : false }
          if (frame.token === 'yes') setYesBook(b)
          else if (frame.token === 'no') setNoBook(b)
        } else if (frame.type === 'tick_size_change') {
          setTickBump(n => n + 1)
        } else if (frame.type === 'status' || frame.type === 'error') {
          // surface via status state is enough
        }
      } catch {}
    }

    ws.onerror = () => {}
    ws.onclose = () => onFail()
  }

  function onFail() {
    const now = Date.now()
    if (now - lastFailAt.current < 20_000) failCountRef.current += 1
    else failCountRef.current = 1
    lastFailAt.current = now

    if (failCountRef.current >= 2) {
      startPollingFallback()
      return
    }
    setStatus('reconnecting')
    const delay = Math.min(500 * Math.pow(2, failCountRef.current), 30_000)
    reconnTimerRef.current = window.setTimeout(connect, delay)
  }

  return { status, yesBook, noBook, yesTrades, noTrades, tickBump }
}
