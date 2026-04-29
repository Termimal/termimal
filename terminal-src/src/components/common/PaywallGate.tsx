// components/common/PaywallGate.tsx — wraps a page/section. Renders children
// only if the user's plan meets the required tier; otherwise shows a locked
// card with upgrade CTA. Pulls copy from a per-feature copy table so the
// reason matches whatever feature was hit.
//
// Usage:
//   <PaywallGate feature="eventProbabilities">
//     <Polymarket />
//   </PaywallGate>

import { useState, type ReactNode } from 'react'
import { usePlan, requiredPlanFor, type Feature, PLAN_PRICES } from '@/lib/plan'
import { UpgradeModal } from './UpgradeModal'

const mono = "'SF Mono', Menlo, Consolas, monospace"

const FEATURE_COPY: Partial<Record<Feature, { title: string; reason: string }>> = {
  // Pro features
  chartsAdvanced: {
    title: 'Advanced charts',
    reason: 'Multi-pane charts, custom indicator stacks, drawing tools, and saved templates are part of the Pro plan.',
  },
  screenerAdvanced: {
    title: 'Advanced screener filters',
    reason: 'Every filter — fundamentals, technicals, macro alignment — plus shareable presets requires a Pro plan.',
  },
  riskEngine: {
    title: 'Risk engine',
    reason: 'Value-at-Risk, scenario analysis, drawdown stress, and Monte Carlo are part of the Pro plan.',
  },
  cotReport: {
    title: 'COT report',
    reason: 'Weekly CFTC institutional positioning, percentile crowding flags, and historical net-position charts are Pro features.',
  },
  scenarioPlanner: {
    title: 'Scenario planner',
    reason: 'Forward scenario modeling — bull / base / bear paths with probability weighting — requires a Pro plan.',
  },
  macroIntelligence: {
    title: 'Macro intelligence',
    reason: 'Macro overview, calendar, event-risk monitor, and cross-asset positioning are Pro features.',
  },
  desktopApp: {
    title: 'Desktop app',
    reason: 'The native macOS / Windows desktop app with offline workspace sync is included with Pro.',
  },

  // Premium features (intelligence layer)
  eventProbabilities: {
    title: 'Event probabilities',
    reason: 'Polymarket-style prediction markets with live wallet ranking, anomaly detection, and cross-market signal validation are Premium-only.',
  },
  onChainAnalytics: {
    title: 'On-chain analytics',
    reason: 'BTC MVRV, Z-Score, realized cap, wallet flows, and smart-money tracking are part of Premium.',
  },
  sentimentDetector: {
    title: 'Sentiment / anomaly detector',
    reason: 'Flow anomalies, manipulation flags, and aggregated sentiment scoring are Premium intelligence features.',
  },
  aiBriefing: {
    title: 'AI weekly briefing',
    reason: 'Saturday AI brief — a curated weekly read of the macro / micro state — is Premium-only.',
  },
  sovereignIntelligence: {
    title: 'Sovereign intelligence',
    reason: 'Sovereign yield curves, currency-pressure scoring, gold / rates interaction, and bond-spread analytics are Premium.',
  },
  apiAccess: {
    title: 'API access',
    reason: 'Programmatic access to your watchlists, alerts, and signal stream is included with Premium.',
  },
  prioritySupport: {
    title: 'Priority support',
    reason: 'Premium customers get sub-24h response from the Termimal team.',
  },
}

export interface PaywallGateProps {
  feature: Feature
  children: ReactNode
  /** Optional preview the locked-out user still gets to see (faded). */
  preview?: ReactNode
}

export function PaywallGate({ feature, children, preview }: PaywallGateProps) {
  const { plan, loading, canUse } = usePlan()
  const [modalOpen, setModalOpen] = useState(false)

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#484f58', fontFamily: mono, fontSize: 11 }}>
        Loading…
      </div>
    )
  }

  if (canUse(feature)) return <>{children}</>

  const required = requiredPlanFor(feature)
  const copy = FEATURE_COPY[feature] ?? {
    title: feature,
    reason: `This feature requires ${PLAN_PRICES[required].label}.`,
  }
  const reqLabel = PLAN_PRICES[required].label

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100%' }}>
      {/* Faded preview underneath */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          opacity: preview ? 0.20 : 0.06,
          filter: 'blur(2px) saturate(0.5)',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {preview ?? children}
      </div>

      {/* Paywall card */}
      <div
        style={{
          position: 'relative',
          maxWidth: 520,
          margin: '40px auto',
          padding: '24px 28px',
          background: '#0e1117',
          border: '1px solid #21262d',
          fontFamily: mono,
          color: '#c9d1d9',
          textAlign: 'left',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #21262d',
            color: '#8b949e',
            fontSize: 12, fontWeight: 700,
            marginBottom: 14,
          }}
        >
          🔒
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: '#8b949e', marginBottom: 6 }}>
          Available in {reqLabel} and above
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f6fc', marginBottom: 8, letterSpacing: -0.2 }}>
          {copy.title}
        </div>
        <p style={{ fontSize: 11, lineHeight: 1.65, color: '#8b949e', margin: '0 0 18px', maxWidth: 460 }}>
          {copy.reason}
        </p>
        <div style={{ fontSize: 9, color: '#484f58', marginBottom: 14, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          You're on the <span style={{ color: '#c9d1d9', fontWeight: 600 }}>{PLAN_PRICES[plan].label}</span> plan
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              padding: '8px 18px', fontSize: 10, fontWeight: 700, fontFamily: mono,
              background: '#388bfd', color: '#fff',
              border: 'none', cursor: 'pointer',
              letterSpacing: 0.5, textTransform: 'uppercase',
            }}
          >
            See plans
          </button>
          <a
            href={`/pricing?plan=${required}&from=${feature}`}
            style={{
              padding: '8px 18px', fontSize: 10, fontWeight: 700, fontFamily: mono,
              background: 'transparent', color: '#c9d1d9',
              border: '1px solid #21262d', cursor: 'pointer', textDecoration: 'none',
              letterSpacing: 0.5, textTransform: 'uppercase',
            }}
          >
            Upgrade to {reqLabel}
          </a>
        </div>
      </div>

      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        requiredPlan={required}
        title={copy.title}
        reason={copy.reason}
      />
    </div>
  )
}

export default PaywallGate
