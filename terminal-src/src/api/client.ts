// api/client.ts
// All HTTP calls to the Python FastAPI backend (http://127.0.0.1:8000)
// Uses Vite proxy in dev — no CORS issues
// Typed with TypeScript interfaces from types/index.ts

import type {
  PriceSnapshot, PriceHistory, Fundamentals,
  MacroSnapshot, COTEntry, ApiResponse,
} from '@/types'
import { getAccessToken } from '@/lib/supabase'

// In dev: '' + '/api/...' is rewritten by the Vite proxy to the backend.
// In prod: VITE_BACKEND_URL points at the deployed FastAPI service, e.g.
// 'https://termimal-api.onrender.com'. Calls become absolute URLs.
const _backend = (import.meta as any).env?.VITE_BACKEND_URL ?? ''
const BASE = `${_backend.replace(/\/$/, '')}/api`
const TIMEOUT_MS = 10_000

// ─── Auth header helper ──────────────────────────────────────
// Injects the user's Supabase JWT on every request so the backend can
// identify the caller. Falls back to the legacy shared token for dev /
// public health-check endpoints.
async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken().catch(() => null)
  if (token) return { Authorization: `Bearer ${token}` }
  // Dev fallback only — backend AccessGate accepts the legacy token when
  // ACCESS_TOKEN env is set to the same value.
  const legacy = (import.meta as any).env?.VITE_ACCESS_TOKEN
  return legacy ? { 'x-access-token': String(legacy) } : {}
}

// ─── Generic fetch with timeout ──────────────────────────────
async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const headers = await authHeaders()
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal, headers })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json() as T
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[API] ${path} failed:`, msg)
    return null
  }
}

// ─── Status / health ─────────────────────────────────────────
export interface ApiStatus {
  status: 'ok' | 'error'
  time: string
  fred_key: boolean
  cache: Record<string, { age_seconds: number; ttl_seconds: number; fresh: boolean }>
  connectors: Record<string, string>
}

export async function fetchStatus(): Promise<ApiStatus | null> {
  return apiFetch<ApiStatus>('/status')
}

// ─── Prices ──────────────────────────────────────────────────
export async function fetchAllPrices(): Promise<Record<string, PriceSnapshot> | null> {
  const resp = await apiFetch<ApiResponse<Record<string, PriceSnapshot>>>('/prices')
  return resp?.data ?? null
}

export async function fetchTickerPrice(sym: string): Promise<PriceSnapshot | null> {
  const resp = await apiFetch<ApiResponse<PriceSnapshot>>(`/price/${sym}`)
  return resp?.data ?? null
}

export async function fetchPriceHistory(
  sym: string,
  period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max' = '1y'
): Promise<PriceHistory | null> {
  const resp = await apiFetch<ApiResponse<PriceHistory>>(`/history/${sym}?period=${period}`)
  return resp?.data ?? null
}

// ─── Fundamentals ────────────────────────────────────────────
export async function fetchFundamentals(sym: string): Promise<Fundamentals | null> {
  const resp = await apiFetch<ApiResponse<Fundamentals>>(`/fundamentals/${sym}`)
  return resp?.data ?? null
}

// ─── Macro ───────────────────────────────────────────────────
export async function fetchMacro(): Promise<MacroSnapshot | null> {
  const resp = await apiFetch<ApiResponse<MacroSnapshot>>('/macro')
  return resp?.data ?? null
}

// ─── COT ─────────────────────────────────────────────────────
export async function fetchCOT(date?: string): Promise<COTEntry[] | null> {
  const path = date ? `/cot?date=${date}` : '/cot'
  const resp = await apiFetch<ApiResponse<COTEntry[]>>(path)
  return resp?.data ?? null
}

export async function fetchCOTDates(): Promise<string[]> {
  const resp = await apiFetch<{ data: string[] }>('/cot/dates')
  return resp?.data ?? []
}

export async function fetchCOTHistory(contract: string, weeks: number = 52): Promise<any[]> {
  const resp = await apiFetch<ApiResponse<any[]>>(`/cot/history/${encodeURIComponent(contract)}?weeks=${weeks}`)
  return resp?.data ?? []
}

// ─── Search ──────────────────────────────────────────────────
export async function searchTickers(q: string): Promise<string[]> {
  if (!q.trim()) return []
  const resp = await apiFetch<{ query: string; results: string[] }>(`/search?q=${encodeURIComponent(q)}`)
  return resp?.results ?? []
}

// ─── Quarterly financials ─────────────────────────────────────
export interface QuarterlyData {
  source:    string        // "Financial Modeling Prep" | "Yahoo Finance (yfinance)"
  ticker:    string
  quarters:  string[]      // ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024", ...]
  updated:   string

  // Income ($B)
  revenue:      (number | null)[]
  gross_profit: (number | null)[]
  ebit:         (number | null)[]
  ebitda:       (number | null)[]
  net_income:   (number | null)[]
  pretax:       (number | null)[]

  // Cash flow ($B)
  cfo:          (number | null)[]
  capex:        (number | null)[]
  fcf:          (number | null)[]

  // Balance sheet ($B)
  total_debt:   (number | null)[]
  cash:         (number | null)[]
  net_debt:     (number | null)[]
  equity:       (number | null)[]

  // Margins (%)
  gross_mgn:    (number | null)[]
  op_mgn:       (number | null)[]
  net_mgn:      (number | null)[]
  pretax_mgn:   (number | null)[]

  // Ratios
  roic:         (number | null)[]
  roe:          (number | null)[]
  de:           (number | null)[]
  int_cov:      (number | null)[]
  dEbitda:      (number | null)[]

  // Earnings history (FMP only)
  earnings_history?: {
    quarter:    string
    actual_eps: number | null
    est_eps:    number | null
    surprise:   number | null   // % — positive = beat, negative = miss
  }[]
}

export interface EarningsData {
  next_earnings: string | null   // "2025-04-24"
  source:        string
}

export async function fetchQuarterly(sym: string): Promise<QuarterlyData | null> {
  const resp = await apiFetch<{ data: QuarterlyData }>(`/quarterly/${sym.toUpperCase()}`)
  return resp?.data ?? null
}

export async function fetchNextEarnings(sym: string): Promise<EarningsData | null> {
  const resp = await apiFetch<{ data: EarningsData }>(`/earnings/${sym.toUpperCase()}`)
  return resp?.data ?? null
}

// ─── Positioning Pressure ─────────────────────────────────
export async function fetchPositioning(): Promise<any> {
  return apiFetch<any>('/positioning')
}

export async function fetchPositioningDetail(id: string): Promise<any | null> {
  const resp = await apiFetch<{ data: any }>(`/positioning/${encodeURIComponent(id)}`)
  return resp?.data ?? null
}

// ─── Polymarket ──────────────────────────────────────────
export interface PolymarketEvent {
  id: string; name: string; category: string; probability: number
  volume: number; liquidity: number; end_date: string | null
  source: string; url: string; active: boolean
}

export async function fetchPolymarket(): Promise<PolymarketEvent[]> {
  const resp = await apiFetch<{ data: PolymarketEvent[] }>('/polymarket')
  return resp?.data ?? []
}

// ─── BTC On-Chain Metrics ─────────────────────────────────────
export interface BtcOnchainMetric {
  name: string
  value: number
  formula: string
  state: string
  interpretation: string
  median_90d?: number
}

export interface BtcOnchainData {
  ticker: string
  btc_price: number
  market_cap: number
  realized_cap: number | null
  source: string
  updated: string
  metrics: Record<string, BtcOnchainMetric>
  multi_metric: { alignment: string; context: string } | null
  error?: string
}

export async function fetchBtcOnchain(): Promise<BtcOnchainData | null> {
  const resp = await apiFetch<{ data: BtcOnchainData }>('/btc/onchain')
  return resp?.data ?? null
}
