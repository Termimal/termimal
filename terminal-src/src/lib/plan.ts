// lib/plan.ts — CENTRAL FEATURE ACCESS CONFIGURATION
// =============================================================
// This file is the single source of truth for plan tiers, pricing,
// feature gating, and usage limits across the entire terminal.
//
// CORE PRINCIPLE (TradingView benchmark):
//   - Features available in TradingView          → Free or Pro
//   - Features unique to Termimal's intelligence → Premium only
//
// HARD RULE: differentiation features (event probabilities, on-chain,
// sentiment, AI briefing, sovereign intelligence, API access) MUST NEVER
// appear in Free or Pro. They are the product's moat.
//
// The marketing site /pricing mirrors this file; update both when copy or
// tiers change.

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Plan = 'free' | 'pro' | 'premium'

// ─── Pricing (EUR — match marketing site /pricing) ─────────────
export const PLAN_PRICES: Record<Plan, { monthly: number; yearly: number; label: string }> = {
  free:    { monthly: 0,     yearly: 0,     label: 'Free' },
  pro:     { monthly: 9.99,  yearly: 9.99,  label: 'Pro' },
  premium: { monthly: 19.99, yearly: 19.99, label: 'Premium' },
}

export const PLAN_CURRENCY = '€'

// ─── Feature keys ──────────────────────────────────────────────
// Every gate-able capability in the terminal has a key here. New modules
// MUST be added to this enum and to FEATURE_ACCESS below.
export type Feature =
  // ── Free tier (discovery) ────────────────────────────────
  | 'dashboard'
  | 'globalIndicatorsBasic'   // limited depth
  | 'newsFlowBasic'           // limited history
  | 'portfolioBasic'
  | 'tickerWorkspace'
  | 'chartsBasic'
  | 'screenerBasic'

  // ── Pro tier (professional baseline) ─────────────────────
  | 'chartsAdvanced'          // multi-pane, custom indicators, drawing tools
  | 'screenerAdvanced'        // every filter, presets, save & share
  | 'riskEngine'              // VaR, scenario analysis, drawdown
  | 'cotReport'               // CFTC institutional positioning
  | 'scenarioPlanner'         // forward scenario modeling
  | 'macroIntelligence'       // /macro overview + calendar + event-risk + positioning
  | 'globalIndicatorsFull'
  | 'newsFlowFull'
  | 'portfolioFull'
  | 'desktopApp'

  // ── Premium tier (intelligence layer — TERMIMAL MOAT) ────
  | 'eventProbabilities'      // Polymarket prediction markets + signals
  | 'onChainAnalytics'        // BTC MVRV, Z-Score, realized cap, wallet flows
  | 'sentimentDetector'       // anomaly detection, manipulation flags
  | 'aiBriefing'              // weekly Saturday brief
  | 'sovereignIntelligence'   // sovereign yields, currency pressure, gold/rates
  | 'apiAccess'
  | 'prioritySupport'


// ─── Central featureAccess matrix (REQUIREDTIER per feature) ───
// Read by canUse(), PaywallGate, and any module that needs to gate
// behavior. NO HARDCODED LOGIC outside this object.
export const FEATURE_ACCESS: Record<Feature, Plan> = {
  // Free
  dashboard:               'free',
  globalIndicatorsBasic:   'free',
  newsFlowBasic:           'free',
  portfolioBasic:          'free',
  tickerWorkspace:         'free',
  chartsBasic:             'free',
  screenerBasic:           'free',

  // Pro — professional baseline. TradingView-equivalent workflow.
  chartsAdvanced:          'pro',
  screenerAdvanced:        'pro',
  riskEngine:              'pro',
  cotReport:               'pro',
  scenarioPlanner:         'pro',
  macroIntelligence:       'pro',
  globalIndicatorsFull:    'pro',
  newsFlowFull:            'pro',
  portfolioFull:           'pro',
  desktopApp:              'pro',

  // Premium — intelligence layer. Termimal moat. Must NEVER drop to lower tiers.
  eventProbabilities:      'premium',
  onChainAnalytics:        'premium',
  sentimentDetector:       'premium',
  aiBriefing:              'premium',
  sovereignIntelligence:   'premium',
  apiAccess:               'premium',
  prioritySupport:         'premium',
}


// ─── Usage caps per plan ───────────────────────────────────────
export interface PlanLimits {
  watchlistSymbols: number
  alerts: number
  savedWorkspaces: number
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:    { watchlistSymbols: 10,                       alerts: 3,                         savedWorkspaces: 1 },
  pro:     { watchlistSymbols: 100,                      alerts: 100,                       savedWorkspaces: 10 },
  premium: { watchlistSymbols: Number.POSITIVE_INFINITY, alerts: Number.POSITIVE_INFINITY,  savedWorkspaces: Number.POSITIVE_INFINITY },
}

/** Render a numeric cap. ∞ for Infinity (design spec — never the word "Unlimited"). */
export function formatLimit(n: number): string {
  return Number.isFinite(n) ? String(n) : '∞'
}


// ─── Plan ranking + helpers ────────────────────────────────────
const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, premium: 2 }

export function planAtLeast(current: Plan, required: Plan): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[required]
}

export function canUse(current: Plan, feature: Feature): boolean {
  return planAtLeast(current, FEATURE_ACCESS[feature])
}

export function requiredPlanFor(feature: Feature): Plan {
  return FEATURE_ACCESS[feature]
}


// ─── Sync accessors for non-React code (zustand store, axios interceptor) ──
let _currentPlan: Plan = 'free'
export function getCurrentPlan(): Plan { return _currentPlan }
export function getCurrentLimits(): PlanLimits { return PLAN_LIMITS[_currentPlan] }


// ─── usePlan() hook ────────────────────────────────────────────
// Reads `profiles.plan` from Supabase, live-updates via Postgres
// subscription, exposes helpers. Conservative default: 'free' until
// the row resolves.

interface PlanState {
  plan: Plan
  loading: boolean
  limits: PlanLimits
  isFree: boolean
  isPro: boolean
  isPremium: boolean
  canUse: (f: Feature) => boolean
  requiredPlanFor: (f: Feature) => Plan
}

export function usePlan(): PlanState {
  const [plan, setPlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .maybeSingle()
      if (cancelled) return
      let resolved: Plan = 'free'
      if (!error && data?.plan && (data.plan === 'free' || data.plan === 'pro' || data.plan === 'premium')) {
        resolved = data.plan as Plan
      }
      _currentPlan = resolved
      setPlan(resolved)
      setLoading(false)
    }

    function subscribeToProfile(userId: string) {
      channel = supabase
        .channel(`profile:${userId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          (payload: any) => {
            const next = payload.new?.plan
            if (next === 'free' || next === 'pro' || next === 'premium') {
              _currentPlan = next
              setPlan(next)
            }
          },
        )
        .subscribe()
    }

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      const u = data.user
      if (!u) {
        _currentPlan = 'free'
        setPlan('free')
        setLoading(false)
        return
      }
      loadProfile(u.id)
      subscribeToProfile(u.id)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      if (channel) { supabase.removeChannel(channel); channel = null }
      if (u) {
        loadProfile(u.id)
        subscribeToProfile(u.id)
      } else {
        _currentPlan = 'free'
        setPlan('free')
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  return {
    plan,
    loading,
    limits: PLAN_LIMITS[plan],
    isFree: plan === 'free',
    isPro: plan === 'pro',
    isPremium: plan === 'premium',
    canUse: (f) => canUse(plan, f),
    requiredPlanFor,
  }
}
