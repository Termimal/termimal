// store/useStore.ts
// Global state using Zustand — lightweight, no boilerplate
// Holds: prices, macro, COT, fundamentals cache, watchlist, UI state

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  PriceSnapshot, Fundamentals, MacroSnapshot,
  COTEntry, WatchlistEntry, Regime,
} from '@/types'
import { getCurrentPlan, getCurrentLimits, PLAN_PRICES } from '@/lib/plan'
import {
  fetchAllPrices, fetchMacro, fetchCOT,
  fetchFundamentals, fetchStatus, fetchCOTDates,
} from '@/api/client'

// ─── State shape ─────────────────────────────────────────────

interface AppState {
  // Connection
  apiOnline:   boolean
  fredKey:     boolean
  lastChecked: string | null

  // Market data
  prices:    Record<string, PriceSnapshot>
  macro:     MacroSnapshot | null
  cot:       COTEntry[]

  // Fundamentals cache (per ticker, loaded on demand)
  fundamentals: Record<string, Fundamentals>

  // Watchlist (persisted to localStorage)
  // — `watchlist` is the legacy flat list, kept for back-compat with components that
  //   only need a quick "is this ticker tracked?" check.
  // — `watchSections` is the new section-grouped model. Each section has its own
  //   ordered list of tickers. The flat watchlist is derived from the sections.
  watchlist: WatchlistEntry[]
  watchSections: WatchSection[]

  // UI state
  currentTicker: string | null
  regime:        Regime
  liteMode:      boolean
  darkMode:      boolean

  // Loading states
  loadingPrices:  boolean
  loadingMacro:   boolean
  loadingTicker:  string | null   // which ticker is loading

  // Actions
  checkApi:              () => Promise<void>
  refreshPrices:         () => Promise<void>
  refreshMacro:          () => Promise<void>
  refreshCOT:            () => Promise<void>
  loadTickerFundamentals:(sym: string) => Promise<void>
  refreshAll:            () => Promise<void>

  setCurrentTicker: (sym: string | null) => void
  setLiteMode:      (v: boolean) => void
  setDarkMode:      (v: boolean) => void

  addToWatchlist:    (sym: string, sectionId?: string) => void
  removeFromWatchlist:(sym: string) => void
  isInWatchlist:     (sym: string) => boolean

  // ── Section management (TradingView-style watchlist sections) ──
  addSection:        (name: string) => string                  // returns the new section id
  removeSection:     (id: string) => void                       // tickers move to first remaining section
  renameSection:     (id: string, name: string) => void
  moveTicker:        (sym: string, toSectionId: string, toIndex?: number) => void
  reorderInSection:  (sectionId: string, fromIdx: number, toIdx: number) => void
  toggleSectionCollapse: (id: string) => void
}

// ─── Section model ───────────────────────────────────────────
export interface WatchSection {
  id:        string                 // stable id (uuid-ish, kebab-case)
  name:      string                 // display label, user can rename
  tickers:   string[]               // ordered ticker symbols
  collapsed: boolean
}

// ─── Default watchlist preset (TradingView-style sections) ───
// First-time users see these 5 ordered sections with curated picks.
// User can rename, remove, reorder; the preset is just the seed.
const DEFAULT_SECTIONS: WatchSection[] = [
  { id:'sec-indices',  name:'INDICES',  tickers:['^GSPC','^IXIC','^DJI','^VIX','^GDAXI','^FTSE'], collapsed:false },
  { id:'sec-stocks',   name:'STOCKS',   tickers:['AAPL','MSFT','NVDA','GOOGL','META','TSLA','JPM','AMZN'], collapsed:false },
  { id:'sec-futures',  name:'FUTURES',  tickers:['ES=F','NQ=F','GC=F','SI=F','CL=F','NG=F'], collapsed:false },
  { id:'sec-forex',    name:'FOREX',    tickers:['EURUSD=X','GBPUSD=X','USDJPY=X','USDCHF=X','AUDUSD=X','USDCAD=X'], collapsed:false },
  { id:'sec-crypto',   name:'CRYPTO',   tickers:['BTC-USD','ETH-USD','SOL-USD','XRP-USD','BNB-USD','ADA-USD'], collapsed:false },
]

// Flat list derived from default sections (kept for back-compat init)
const DEFAULT_WATCHLIST: WatchlistEntry[] =
  DEFAULT_SECTIONS.flatMap(s => s.tickers).map(sym => ({ sym, addedAt: new Date().toISOString() }))

// ─── Regime detection from macro data ────────────────────────
function computeRegime(macro: MacroSnapshot | null): Regime {
  if (!macro) return 'NEUTRAL'
  let score = 0
  // VIX: <18 risk-on, >25 risk-off
  if (macro.vix != null) {
    if (macro.vix < 18) score += 1
    else if (macro.vix > 25) score -= 2
    else score -= 1
  }
  // Spread: positive = risk-on
  if (macro.spread != null) {
    if (macro.spread > 0.1) score += 1
    else if (macro.spread < -0.3) score -= 1
  }
  // HY OAS: <4% risk-on, >6% risk-off
  if (macro.oas != null) {
    if (macro.oas < 4) score += 1
    else if (macro.oas > 6) score -= 2
  }
  // DXY spike: high dollar = risk-off for equities
  if (macro.dxy != null) {
    if (macro.dxy > 106) score -= 1
  }

  if (score >= 2)  return 'RISK-ON'
  if (score <= -2) return 'RISK-OFF'
  return 'NEUTRAL'
}

// ─── Store ───────────────────────────────────────────────────
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      apiOnline:     false,
      fredKey:       false,
      lastChecked:   null,
      prices:        {},
      macro:         null,
      cot:           [],
      fundamentals:  {},
      watchlist:     DEFAULT_WATCHLIST,
      watchSections: DEFAULT_SECTIONS,
      currentTicker: null,
      regime:        'NEUTRAL',
      liteMode:      false,
      darkMode:      true,
      loadingPrices: false,
      loadingMacro:  false,
      loadingTicker: null,

      // ── API health check ──────────────────────────────────
      checkApi: async () => {
        const status = await fetchStatus()
        set({
          apiOnline:   status?.status === 'ok',
          fredKey:     status?.fred_key ?? false,
          lastChecked: new Date().toISOString(),
        })
      },

      // ── Prices ────────────────────────────────────────────
      refreshPrices: async () => {
        set({ loadingPrices: true })
        const prices = await fetchAllPrices()
        if (prices) set({ prices })
        set({ loadingPrices: false })
      },

      // ── Macro ─────────────────────────────────────────────
      refreshMacro: async () => {
        set({ loadingMacro: true })
        const macro = await fetchMacro()
        if (macro) {
          const regime = computeRegime(macro)
          set({ macro, regime })
        }
        set({ loadingMacro: false })
      },

      // ── COT ───────────────────────────────────────────────
      refreshCOT: async () => {
        const cot = await fetchCOT()
        if (cot) set({ cot })
      },

      // ── Ticker fundamentals (on demand) ───────────────────
      loadTickerFundamentals: async (sym: string) => {
        // Skip if already fresh (< 1 hour old)
        const existing = get().fundamentals[sym]
        if (existing?._fund_updated) {
          const age = Date.now() - new Date(existing._fund_updated).getTime()
          if (age < 3_600_000) return   // < 1 hour, skip
        }

        set({ loadingTicker: sym })
        const data = await fetchFundamentals(sym)
        if (data) {
          set(state => ({
            fundamentals: { ...state.fundamentals, [sym]: data }
          }))
        }
        set({ loadingTicker: null })
      },

      // ── Full refresh cycle ────────────────────────────────
      refreshAll: async () => {
        const { checkApi, refreshPrices, refreshMacro, refreshCOT, liteMode } = get()
        await checkApi()
        if (!get().apiOnline) {
          // Auto-retry: backend might still be starting
          console.log('[Termimal] Backend offline, retrying in 5s...')
          setTimeout(() => get().refreshAll(), 5000)
          return
        }
        await Promise.all([
          refreshPrices(),
          refreshMacro(),
          liteMode ? Promise.resolve() : refreshCOT(),
        ])
      },

      // ── UI actions ────────────────────────────────────────
      setCurrentTicker: (sym) => set({ currentTicker: sym }),
      setLiteMode:      (v)   => set({ liteMode: v }),
      setDarkMode:      (v)   => set({ darkMode: v }),

      // ── Watchlist (back-compat) + Sections ─────────────────
      addToWatchlist: (sym, sectionId) => {
        const { watchlist, watchSections } = get()
        if (watchlist.some(e => e.sym === sym)) return  // already tracked

        // Plan cap enforcement — done at the store level so every entry path
        // is protected (Watchlist sidebar, TickerWorkspace, NewTab, etc.).
        const limits = getCurrentLimits()
        if (watchlist.length >= limits.watchlistSymbols) {
          const cur = getCurrentPlan()
          const next: 'pro' | 'premium' = cur === 'free' ? 'pro' : 'premium'
          const reason =
            cur === 'free'
              ? `Free is capped at ${limits.watchlistSymbols} watchlist symbols. ${PLAN_PRICES.pro.label} unlocks 100, ${PLAN_PRICES.premium.label} unlocks ∞.`
              : `${PLAN_PRICES.premium.label} unlocks ∞ watchlist symbols.`
          window.dispatchEvent(new CustomEvent('termimal:upgrade-modal', {
            detail: { requiredPlan: next, title: 'Limit reached', reason },
          }))
          return
        }

        // Append to either the requested section or the first one (or create one if list empty)
        let sections = watchSections
        if (!sections.length) sections = [{ id:'sec-default', name:'WATCHLIST', tickers:[], collapsed:false }]
        const targetId = sectionId && sections.some(s => s.id === sectionId) ? sectionId : sections[0].id
        sections = sections.map(s => s.id === targetId ? { ...s, tickers: [...s.tickers, sym] } : s)

        set({
          watchlist: [...watchlist, { sym, addedAt: new Date().toISOString() }],
          watchSections: sections,
        })
      },
      removeFromWatchlist: (sym) => {
        set(state => ({
          watchlist: state.watchlist.filter(e => e.sym !== sym),
          watchSections: state.watchSections.map(s => ({ ...s, tickers: s.tickers.filter(t => t !== sym) })),
        }))
      },
      isInWatchlist: (sym) => get().watchlist.some(e => e.sym === sym),

      addSection: (name) => {
        const trimmed = (name || '').trim() || 'NEW SECTION'
        // Generate a stable id: kebab-case + short random suffix
        const id = 'sec-' + trimmed.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '-' + Math.random().toString(36).slice(2,6)
        set(state => ({ watchSections: [...state.watchSections, { id, name: trimmed.toUpperCase(), tickers: [], collapsed: false }] }))
        return id
      },
      removeSection: (id) => {
        set(state => {
          const target = state.watchSections.find(s => s.id === id)
          if (!target) return {}
          const remaining = state.watchSections.filter(s => s.id !== id)
          // Move orphaned tickers to first remaining section. If none left, drop them entirely.
          if (remaining.length && target.tickers.length) {
            remaining[0] = { ...remaining[0], tickers: [...remaining[0].tickers, ...target.tickers] }
            return { watchSections: remaining }
          }
          // No sections left → also drop the tickers from flat watchlist for consistency
          return {
            watchSections: remaining,
            watchlist: state.watchlist.filter(e => !target.tickers.includes(e.sym)),
          }
        })
      },
      renameSection: (id, name) => {
        const trimmed = (name || '').trim()
        if (!trimmed) return
        set(state => ({
          watchSections: state.watchSections.map(s => s.id === id ? { ...s, name: trimmed.toUpperCase() } : s),
        }))
      },
      moveTicker: (sym, toSectionId, toIndex) => {
        set(state => {
          const sections = state.watchSections.map(s => ({ ...s, tickers: s.tickers.filter(t => t !== sym) }))
          const target = sections.find(s => s.id === toSectionId)
          if (!target) return {}
          const insertAt = toIndex == null ? target.tickers.length : Math.max(0, Math.min(toIndex, target.tickers.length))
          target.tickers = [...target.tickers.slice(0, insertAt), sym, ...target.tickers.slice(insertAt)]
          return { watchSections: sections }
        })
      },
      reorderInSection: (sectionId, fromIdx, toIdx) => {
        set(state => ({
          watchSections: state.watchSections.map(s => {
            if (s.id !== sectionId) return s
            const next = s.tickers.slice()
            const [moved] = next.splice(fromIdx, 1)
            if (moved == null) return s
            next.splice(Math.max(0, Math.min(toIdx, next.length)), 0, moved)
            return { ...s, tickers: next }
          }),
        }))
      },
      toggleSectionCollapse: (id) => {
        set(state => ({
          watchSections: state.watchSections.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s),
        }))
      },
    }),

    // Persist watchlist + sections + UI prefs to localStorage
    {
      name: 'termimal-store',
      partialize: (state) => ({
        watchlist:     state.watchlist,
        watchSections: state.watchSections,
        liteMode:      state.liteMode,
        darkMode:      state.darkMode,
      }),
      // Migration: users who installed before sections existed have no `watchSections` in
      // their persisted state. On rehydrate, if missing, seed default sections and
      // migrate any flat-watchlist tickers into the most appropriate section.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (!state.watchSections || !Array.isArray(state.watchSections) || state.watchSections.length === 0) {
          // Build sections from default preset, then merge any extra tickers from the flat
          // watchlist into the matching section by symbol pattern.
          const sections: WatchSection[] = DEFAULT_SECTIONS.map(s => ({ ...s, tickers: [...s.tickers] }))
          const presetSyms = new Set(sections.flatMap(s => s.tickers))
          for (const e of state.watchlist || []) {
            if (presetSyms.has(e.sym)) continue
            const sym = e.sym
            const targetId =
              sym.startsWith('^') || sym.endsWith('.SS')        ? 'sec-indices' :
              sym.endsWith('=F')                                ? 'sec-futures' :
              sym.endsWith('=X')                                ? 'sec-forex'   :
              sym.endsWith('-USD')                              ? 'sec-crypto'  :
                                                                  'sec-stocks'
            const sec = sections.find(s => s.id === targetId)
            if (sec) sec.tickers.push(sym)
          }
          state.watchSections = sections
        }
      },
    }
  )
)

// ─── Selectors (memoized access helpers) ─────────────────────
export const selectPrice  = (sym: string) => (s: AppState) => s.prices[sym] ?? null
export const selectFunds  = (sym: string) => (s: AppState) => s.fundamentals[sym] ?? null
export const selectMacro  = (s: AppState) => s.macro
export const selectCOT    = (s: AppState) => s.cot
export const selectWL     = (s: AppState) => s.watchlist
export const selectRegime = (s: AppState) => s.regime
