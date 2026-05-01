// pages/Polymarket.tsx — Termimal Polymarket Intelligence (Bloomberg-style rewrite)
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import axios from 'axios'
import { OrderflowDrilldown } from './polymarket/OrderflowDrilldown'
import { OrderBook } from './polymarket/OrderBook'
import { TradeFeed } from './polymarket/TradeFeed'
import { PM, fmtUsd, fmtExpires, fmtTime } from './polymarket/_ui/tokens'
import {
  MetricCell, ProbabilityBar, SegmentedControl, Chip, Badge, SignalBadge, StatusDot,
  PrimaryButton, SecondaryButton, Icon,
} from './polymarket/_ui/primitives'
import { RiskWarning } from '@/components/common/RiskWarning'
import { MethodologyExpander } from '@/components/common/MethodologyExpander'
import { methodologies } from '@/components/common/methodologies'
import { EmptyState } from '@/components/common/EmptyState'
import { onActivate } from '@/lib/a11y'

// ─── Types (preserved from original) ───────────────────────────────────────────
interface Outcome { name: string; price: number }
interface VolStats { volume_1h: number; avg_7d_hourly: number; multiplier: number; spike: boolean }
interface DirShift { shift: number; direction: string; ratio_recent: number; ratio_prior: number; significant: boolean }
interface Wallet { address: string; short_address: string; volume: number; pct_of_market: number; score: number; accuracy: number; early_rate: number; trade_count: number; direction: string; pump_dump_flag: boolean }
interface WalletData { wallets: Wallet[]; high_score_wallets: Wallet[]; cluster_confirmed: boolean; cluster_direction: string | null; manipulation_flags: string[]; total_volume: number }
interface Anomaly { level: 'STRONG'|'WEAK'|'NONE'; passed: number; conditions: Record<string,boolean> }
interface Signal { signal_id: string; timestamp: string; market: string; tag: string; direction: string; confidence: number; wallets_short: string[]; avg_wallet_score: number; volume_multiplier: number; volume_1h: number; polymarket_url: string; recommended_instrument: string; recommended_direction: string; reasoning: string; cross_market_confirmation: boolean; cross_market_checks: string[]; signal_level: string; conditions_met: number; yes_price: number; liquidity: number; outcome: string | null; resolved_at?: string }
interface Market { id: string; question: string; tag: string; yes_price: number; outcomes: Outcome[]; volume_24h: number; volume_total: number; liquidity: number; end_date: string; url: string; trades_analyzed?: number; vol_stats?: VolStats; dir_shift?: DirShift; wallet_data?: WalletData; anomaly?: Anomaly; signal?: Signal | null }
interface ScanResult { markets: Market[]; strong_signals: Signal[]; weak_signals: Signal[]; scanned: number; timestamp: string }

const TABS = ['MARKETS', 'BOOK', 'TRADES', 'WALLETS', 'SIGNALS', 'HISTORY'] as const
type Tab = typeof TABS[number]

/**
 * useIsMobile — flips on at < 768 px wide, off at ≥ 768 px. Drives
 * the layout swap between the dense desktop grid and the stacked
 * single-column mobile view + bottom tab bar.
 */
function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

// ─── Sub-tab Strip (§3.2) ─────────────────────────────────────────────────────
function SubTabStrip({ tab, setTab, counts }: { tab: Tab; setTab: (t: Tab) => void; counts: Record<string, number> }) {
  return (
    <div style={{
      display: 'flex', height: 32, background: PM.bg.panel,
      borderBottom: `1px solid ${PM.border.subtle}`, flexShrink: 0,
    }}>
      {TABS.map(t => {
        const active = tab === t
        return (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '0 14px', height: 32,
              fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
              textTransform: 'uppercase', fontFamily: PM.font.ui,
              color: active ? PM.accentText : PM.text.muted,
              background: 'transparent',
              border: 'none',
              boxShadow: active ? `inset 0 -2px 0 ${PM.accent}` : 'none',
              cursor: 'pointer',
              transition: `color ${PM.motion}, background ${PM.motion}`,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = PM.text.secondary; (e.currentTarget as HTMLElement).style.background = PM.bg.elevated } }}
            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = PM.text.muted; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
          >
            {t}
            {counts[t] > 0 && (
              <span style={{
                fontSize: 9, color: active ? PM.accentText : PM.text.tertiary,
                fontFamily: PM.font.mono,
              }}>{counts[t]}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Metric Strip (§3.4, Feature 1) ───────────────────────────────────────────
function MetricStrip({ history, scanning }: { history: Signal[]; scanning: boolean }) {
  const resolved = history.filter(s => s.outcome)
  const correct = resolved.filter(s => s.outcome === 'correct').length
  const strong = history.filter(s => s.signal_level === 'STRONG').length
  const avgConf = history.length > 0 ? (history.reduce((a, b) => a + b.confidence, 0) / history.length) : 0

  return (
    <div style={{
      display: 'flex', borderBottom: `1px solid ${PM.border.subtle}`,
      background: PM.bg.panel, flexShrink: 0,
    }}>
      <MetricCell label="SIGNALS FIRED" value={String(history.length)} />
      <MetricCell label="STRONG" value={String(strong)} valueColor={strong > 0 ? PM.up : PM.text.primary} />
      <MetricCell
        label="WIN RATE"
        value={resolved.length > 0 ? `${(correct / resolved.length * 100).toFixed(1)}%` : '—'}
        valueColor={resolved.length > 0 && (correct / resolved.length) >= 0.6 ? PM.up : PM.text.primary}
      />
      <MetricCell label="AVG CONFIDENCE" value={avgConf > 0 ? (avgConf / 100).toFixed(2) : '—'} />
      <MetricCell label="RESOLVED" value={String(resolved.length)} />
      <MetricCell
        label="LIVE SCAN"
        value={scanning ? 'ACTIVE' : 'IDLE'}
        valueColor={scanning ? PM.up : PM.text.muted}
        sublabel={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <StatusDot state={scanning ? 'live' : 'idle'} />
            {scanning ? 'scanning' : 'standby'}
          </span>
        }
      />
    </div>
  )
}

// ─── Market Row (§Feature1) — 7-col dense table row ───────────────────────────
function MarketRow({
  m, onOpen, selected, isMobile,
}: {
  m: Market
  onOpen: () => void
  selected: boolean
  isMobile: boolean
}) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const prevPriceRef = useRef(m.yes_price)

  // Tick flash on odds change
  useEffect(() => {
    if (prevPriceRef.current !== m.yes_price && rowRef.current) {
      const el = rowRef.current.querySelector('.pm-odds-cell') as HTMLElement | null
      if (el) {
        const cls = m.yes_price > prevPriceRef.current ? 'pm-flash-up' : 'pm-flash-down'
        el.classList.remove('pm-flash-up', 'pm-flash-down')
        void el.offsetHeight // reflow
        el.classList.add(cls)
      }
      prevPriceRef.current = m.yes_price
    }
  }, [m.yes_price])

  const level = m.anomaly?.level || 'NONE'
  const expires = fmtExpires(m.end_date)
  const sig = m.signal
  const sigDir = sig ? `${sig.recommended_instrument} ${sig.recommended_direction}` : '—'
  const sigColor = sig
    ? (sig.recommended_direction === 'LONG' ? PM.up : sig.recommended_direction === 'SHORT' ? PM.down : PM.text.muted)
    : PM.text.disabled
  const strengthTxt = sig ? `${level.toLowerCase()} ${sig.confidence}pc` : ''

  // Mobile: drop LIQUID, EXPIRES, SIGNAL, chevron — just MARKET / YES ODDS / 24H VOL.
  // Bumped row height to 52 px on mobile to clear the WCAG tap-target floor.
  const template = isMobile
    ? 'minmax(0, 1fr) 96px 70px'
    : 'minmax(360px, 1fr) 160px 100px 100px 110px 130px 40px'

  return (
    <div ref={rowRef} role="button" tabIndex={0} onClick={onOpen} onKeyDown={onActivate(onOpen)}
      className={selected ? '' : 'pm-hoverable'}
      style={{
        display: 'grid',
        gridTemplateColumns: template,
        alignItems: 'center', gap: isMobile ? 6 : 10,
        padding: isMobile ? '8px 10px' : '6px 14px',
        minHeight: isMobile ? 52 : 36,
        background: selected ? PM.row.selected : 'transparent',
        borderBottom: `1px solid ${PM.bg.app}`,
        cursor: 'pointer',
        borderLeft: selected ? `2px solid ${PM.accent}` : '2px solid transparent',
      }}>

      {/* MARKET: 2-line cell (question + tag badges) */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: PM.text.primary,
          lineHeight: 1.35, fontFamily: PM.font.ui,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        } as any}>{m.question}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          {level !== 'NONE' && <SignalBadge level={level} />}
          <Badge label={m.tag || 'OTHER'} variant={m.tag} />
          {m.anomaly?.conditions.volume_spike && <Badge label="VOL SPIKE" variant="VOL SPIKE" />}
          {m.anomaly?.conditions.directional_shift && <Badge label="DIR SHIFT" variant="DIR SHIFT" />}
        </div>
      </div>

      {/* YES ODDS: probability bar + pct */}
      <div className="pm-odds-cell" style={{ padding: '2px 4px', borderRadius: 2 }}>
        <ProbabilityBar odds={m.yes_price} />
      </div>

      {/* 24H VOL */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 12, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
          color: m.vol_stats?.spike ? PM.down : m.volume_24h < 10000 ? PM.text.tertiary : PM.text.secondary,
        }}>
          {m.vol_stats?.multiplier ? `${m.vol_stats.multiplier.toFixed(1)}×` : fmtUsd(m.volume_24h)}
        </div>
        {m.vol_stats?.spike && (
          <div style={{ fontSize: 9, color: PM.down, marginTop: 1, fontFamily: PM.font.mono, letterSpacing: '0.3px' }}>SPIKE</div>
        )}
      </div>

      {/* Desktop-only columns — LIQUID, EXPIRES, SIGNAL, chevron.
          On mobile we collapse to MARKET / YES ODDS / 24H VOL only. */}
      {!isMobile && (
        <>
          {/* LIQUID */}
          <div style={{
            textAlign: 'right', fontSize: 12, fontFamily: PM.font.mono,
            fontVariantNumeric: 'tabular-nums', color: PM.text.secondary,
          }}>{fmtUsd(m.liquidity)}</div>

          {/* EXPIRES */}
          <div style={{
            textAlign: 'right', fontSize: 12, fontFamily: PM.font.mono,
            fontVariantNumeric: 'tabular-nums', color: expires.color,
          }}>{expires.text}</div>

          {/* SIGNAL: 2-line (direction + strength) */}
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 500, fontFamily: PM.font.mono,
              color: sigColor, letterSpacing: '0.3px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{sigDir}</div>
            {strengthTxt && (
              <div style={{
                fontSize: 10, fontFamily: PM.font.mono, color: PM.text.muted,
                textTransform: 'lowercase', letterSpacing: '0.2px',
              }}>{strengthTxt}</div>
            )}
          </div>

          {/* FLOW chevron */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Icon.ArrowRight size={14} color={PM.text.muted} />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Header Row (sticky column labels) ────────────────────────────────────────
function HeaderRow({ isMobile }: { isMobile: boolean }) {
  // On mobile we collapse to a 3-column row: market title, YES odds,
  // 24h volume. The other columns are hidden via display:none-equivalent
  // empty slots so we don't recompute the grid template here.
  const cols = isMobile
    ? [
        ['MARKET',    'left'],
        ['YES ODDS',  'left'],
        ['24H VOL',   'right'],
      ]
    : [
        ['MARKET',    'left'],
        ['YES ODDS',  'left'],
        ['24H VOL',   'right'],
        ['LIQUID',    'right'],
        ['EXPIRES',   'right'],
        ['SIGNAL',    'left'],
        ['',          'center'],
      ]
  const template = isMobile
    ? 'minmax(0, 1fr) 96px 70px'
    : 'minmax(360px, 1fr) 160px 100px 100px 110px 130px 40px'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: template,
      alignItems: 'center', gap: isMobile ? 6 : 10,
      padding: isMobile ? '0 10px' : '0 14px',
      height: 26,
      background: PM.bg.panel,
      borderBottom: `1px solid ${PM.border.prominent}`,
      flexShrink: 0, position: 'sticky', top: 0, zIndex: 2,
    }}>
      {cols.map(([l, a], i) => (
        <span key={i} style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: PM.text.muted,
          fontFamily: PM.font.ui, textAlign: a as any,
        }}>{l}</span>
      ))}
    </div>
  )
}

// ─── WALLETS view ─────────────────────────────────────────────────────────────
function WalletsView({ markets }: { markets: Market[] }) {
  const all: (Wallet & { market: string })[] = []
  for (const m of markets) {
    for (const w of m.wallet_data?.wallets || []) {
      all.push({ ...w, market: m.question.slice(0, 55) })
    }
  }
  all.sort((a, b) => b.score - a.score)

  const [filter, setFilter] = useState<'ALL' | 'WHALES' | 'BOTS' | 'SMART'>('ALL')
  const filtered = all.filter(w => {
    if (filter === 'WHALES') return w.volume >= 25000
    if (filter === 'BOTS') return w.pump_dump_flag || w.trade_count > 100
    if (filter === 'SMART') return w.score >= 70
    return true
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Trust banner + methodology */}
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${PM.border.subtle}`, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <RiskWarning variant="signal" compact />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <MethodologyExpander title="How wallet score is computed" {...methodologies.wallet_score} />
          <MethodologyExpander title="How anomalies are detected" {...methodologies.anomaly} />
        </div>
      </div>
      {/* Filter chips header */}
      <div style={{
        padding: '8px 14px', borderBottom: `1px solid ${PM.border.subtle}`,
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: PM.text.muted, marginRight: 8,
        }}>Wallet Intelligence · {all.length}</span>
        {(['ALL', 'WHALES', 'BOTS', 'SMART'] as const).map(f =>
          <Chip key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
        )}
      </div>

      {!filtered.length ? (
        all.length === 0 ? (
          <EmptyState
            icon="◉"
            title="No wallet data yet"
            body="Wallet rankings come from analysing Polymarket trade history per market. Run a deep scan to surface high-accuracy wallets, whales, suspected bots, and clusters acting in coordination."
            hint="Wallet score = accuracy × 0.4 + early-entry rate × 0.3 + log(trade_count) × 0.2. Methodology above."
          />
        ) : (
          <EmptyState
            icon="?"
            title="No wallets match this filter"
            body="Try ALL to see every analysed wallet, WHALES for size > $25k, BOTS for high-frequency or pump-dump flagged addresses, or SMART for score ≥ 70."
          />
        )
      ) : (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr 90px 160px 120px 140px 90px',
            gap: 10,
            padding: '0 14px', height: 26,
            background: PM.bg.panel,
            borderBottom: `1px solid ${PM.border.prominent}`,
            flexShrink: 0,
          }}>
            {[['WALLET', 'left'], ['MARKET', 'left'], ['SIZE', 'right'], ['SCORE', 'left'], ['ACC/EARLY', 'right'], ['TRADES/DIR', 'left'], ['VOLUME', 'right']].map(([l, a], i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
                textTransform: 'uppercase', color: PM.text.muted,
                fontFamily: PM.font.ui, textAlign: a as any,
                alignSelf: 'center',
              }}>{l}</span>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.slice(0, 300).map((w, i) => {
              const sc = w.score >= 70 ? PM.up : w.score >= 40 ? PM.accent : PM.down
              return (
                <div key={i} className="pm-hoverable"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '200px 1fr 90px 160px 120px 140px 90px',
                    gap: 10,
                    padding: '0 14px', height: 28, alignItems: 'center',
                  }}>
                  <span style={{
                    fontSize: 12, fontFamily: PM.font.mono, color: PM.text.primary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{w.short_address}</span>
                  <span style={{
                    fontSize: 11, color: PM.text.muted,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{w.market}</span>
                  <span style={{
                    fontSize: 12, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
                    color: PM.text.secondary, textAlign: 'right',
                  }}>{fmtUsd(w.volume)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 80, height: 6, background: PM.border.subtle, borderRadius: 1, position: 'relative' }}>
                      <div style={{ width: `${w.score}%`, height: 6, background: sc, borderRadius: 1 }}/>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 600, fontFamily: PM.font.mono,
                      fontVariantNumeric: 'tabular-nums', color: sc, minWidth: 24,
                    }}>{w.score.toFixed(0)}</span>
                  </div>
                  <span style={{
                    fontSize: 11, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
                    color: PM.text.muted, textAlign: 'right',
                  }}>
                    <span style={{ color: PM.up }}>{w.accuracy.toFixed(0)}</span>
                    <span style={{ color: PM.text.tertiary, margin: '0 4px' }}>/</span>
                    <span style={{ color: PM.accent }}>{w.early_rate.toFixed(0)}</span>
                  </span>
                  <span style={{
                    fontSize: 11, fontFamily: PM.font.mono, color: PM.text.muted,
                  }}>
                    {w.trade_count}
                    <span style={{ color: PM.text.tertiary, margin: '0 4px' }}>·</span>
                    <span style={{
                      color: w.direction === 'YES' ? PM.up : PM.down, fontWeight: 600,
                    }}>{w.direction}</span>
                    {w.pump_dump_flag && (
                      <span style={{ marginLeft: 6 }}><Icon.Flag size={10} color={PM.warning} /></span>
                    )}
                  </span>
                  <span style={{
                    fontSize: 11, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
                    color: PM.text.muted, textAlign: 'right',
                  }}>{w.pct_of_market.toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── SIGNALS view — dense rows, not cards ─────────────────────────────────────
function SignalRow({ sig, onOpenDrilldown, onOutcome, compact }: { sig: Signal; onOpenDrilldown?: (id: string) => void; onOutcome?: (id: string, o: string) => void; compact?: boolean }) {
  const ic = sig.recommended_direction === 'LONG' ? PM.up : sig.recommended_direction === 'SHORT' ? PM.down : PM.text.muted
  const conf = sig.confidence / 100
  const confColor = conf >= 0.7 ? PM.up : conf >= 0.4 ? PM.accent : PM.text.tertiary

  return (
    <div className="pm-hoverable"
      role="button" tabIndex={0}
      onClick={() => onOpenDrilldown && onOpenDrilldown(sig.signal_id)}
      onKeyDown={onActivate(() => onOpenDrilldown && onOpenDrilldown(sig.signal_id))}
      style={{
        padding: '8px 14px', minHeight: 44,
        borderBottom: `1px solid ${PM.border.subtle}`,
        cursor: onOpenDrilldown ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
      {/* Line 1 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 80, height: 6, background: PM.border.subtle, borderRadius: 1, flexShrink: 0,
        }}>
          <div style={{ width: `${conf * 100}%`, height: 6, background: confColor, borderRadius: 1 }}/>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, fontFamily: PM.font.mono,
          fontVariantNumeric: 'tabular-nums', color: confColor,
          minWidth: 32,
        }}>{conf.toFixed(2)}</span>
        <span style={{
          fontSize: 12, fontWeight: 600, fontFamily: PM.font.mono,
          color: ic, letterSpacing: '0.3px',
        }}>{sig.recommended_instrument} {sig.recommended_direction}</span>
        <span style={{
          flex: 1, fontSize: 13, fontWeight: 500, color: PM.text.primary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{sig.market}</span>
        <Badge label={sig.tag} variant={sig.tag} />
        <span style={{
          fontSize: 10, color: PM.text.tertiary, fontFamily: PM.font.mono, minWidth: 60, textAlign: 'right',
        }}>{fmtTime(sig.timestamp)}</span>
      </div>
      {/* Line 2 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        fontSize: 11, fontFamily: PM.font.mono, color: PM.text.muted,
        paddingLeft: 128,
      }}>
        <span>
          YES <span style={{ color: PM.text.secondary, fontWeight: 600 }}>{(sig.yes_price * 100).toFixed(0)}%</span>
          <span style={{ margin: '0 6px', color: PM.text.tertiary }}>·</span>
          vol <span style={{ color: PM.down, fontWeight: 600 }}>{sig.volume_multiplier.toFixed(1)}×</span>
          <span style={{ margin: '0 6px', color: PM.text.tertiary }}>·</span>
          wallets <span style={{ color: PM.text.secondary }}>{sig.wallets_short.length} avg {sig.avg_wallet_score.toFixed(0)}</span>
          <span style={{ margin: '0 6px', color: PM.text.tertiary }}>·</span>
          liq {fmtUsd(sig.liquidity)}
        </span>
        {sig.cross_market_confirmation && (
          <span style={{ color: PM.up, marginLeft: 'auto' }}>
            ✓ {sig.cross_market_checks.slice(0, 2).join(' · ')}
          </span>
        )}
        {!compact && onOutcome && !sig.outcome && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => onOutcome(sig.signal_id, 'correct')}
              style={{ fontSize: 10, padding: '2px 8px', background: 'transparent', color: PM.up, border: `1px solid ${PM.up}55`, cursor: 'pointer', borderRadius: 2, fontFamily: PM.font.mono }}>CORRECT</button>
            <button onClick={() => onOutcome(sig.signal_id, 'incorrect')}
              style={{ fontSize: 10, padding: '2px 8px', background: 'transparent', color: PM.down, border: `1px solid ${PM.down}55`, cursor: 'pointer', borderRadius: 2, fontFamily: PM.font.mono }}>INCORRECT</button>
          </span>
        )}
        {sig.outcome && (
          <span style={{
            marginLeft: 'auto', fontWeight: 600,
            color: sig.outcome === 'correct' ? PM.up : PM.down,
          }}>{sig.outcome === 'correct' ? '✓ CORRECT' : '✗ INCORRECT'}</span>
        )}
      </div>
    </div>
  )
}

function SignalsView({ strong, weak, onOpenDrilldown, onOutcome, onRunScan, scanning, lastScan }: {
  strong: Signal[]; weak: Signal[];
  onOpenDrilldown: (marketId: string) => void
  onOutcome: (id: string, o: string) => void
  onRunScan: () => void
  scanning: boolean
  lastScan: string
}) {
  const [showWeak, setShowWeak] = useState(true)
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Trust banner + methodology */}
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${PM.border.subtle}`, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <RiskWarning variant="signal" compact />
        <MethodologyExpander title="How Polymarket signals are generated" {...methodologies.polymarket_signal} />
      </div>
      {/* Header */}
      <div style={{
        padding: '8px 14px', borderBottom: `1px solid ${PM.border.subtle}`,
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: PM.text.muted,
        }}>Signals</span>
        <span style={{ fontSize: 11, color: PM.text.tertiary, fontFamily: PM.font.mono }}>
          {strong.length + weak.length} fired
          <span style={{ margin: '0 6px' }}>·</span>
          <span style={{ color: PM.up }}>{strong.length} strong</span>
          <span style={{ margin: '0 6px' }}>·</span>
          <span style={{ color: PM.warning }}>{weak.length} weak</span>
          {lastScan && (
            <>
              <span style={{ margin: '0 6px' }}>·</span>
              last scan {lastScan}
            </>
          )}
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <PrimaryButton onClick={onRunScan} loading={scanning}>
            {scanning ? 'SCANNING…' : 'RUN DEEP SCAN'}
          </PrimaryButton>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!strong.length && !weak.length ? (
          <EmptyState
            icon="◎"
            title="No signals yet — run a deep scan"
            body="Termimal scans active Polymarket markets for wallet consensus, volume anomalies, and cross-market alignment with /ES, /MES, BTC, and ETH. Strong signals require all three to fire; weak signals fire on wallet consensus alone."
            actions={[
              { label: scanning ? 'Scanning…' : 'Run deep scan', onClick: onRunScan },
            ]}
            hint="A deep scan typically takes 30–90 seconds. The methodology is one click above."
          />
        ) : (
          <>
            {strong.length > 0 && (
              <>
                <div style={{
                  height: 32, padding: '0 14px', display: 'flex', alignItems: 'center',
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase',
                  color: PM.up, fontFamily: PM.font.ui,
                  background: PM.bg.panel,
                  borderTop: `1px solid ${PM.border.subtle}`,
                  borderBottom: `1px solid ${PM.border.subtle}`,
                }}>STRONG ({strong.length})</div>
                {strong.map(s => <SignalRow key={s.signal_id} sig={s} onOpenDrilldown={onOpenDrilldown} onOutcome={onOutcome} />)}
              </>
            )}
            {weak.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowWeak(s => !s)}
                  style={{
                    width: '100%', height: 32, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase',
                    color: PM.warning, fontFamily: PM.font.ui,
                    background: PM.bg.panel,
                    borderTop: `1px solid ${PM.border.subtle}`,
                    borderBottom: `1px solid ${PM.border.subtle}`,
                    cursor: 'pointer',
                  }}
                  aria-expanded={showWeak}
                >
                  <span>WEAK ({weak.length})</span>
                  <span aria-hidden style={{ transform: showWeak ? 'rotate(180deg)' : 'none' }}>▾</span>
                </button>
                {showWeak && weak.map(s => <SignalRow key={s.signal_id} sig={s} onOpenDrilldown={onOpenDrilldown} onOutcome={onOutcome} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── HISTORY view ─────────────────────────────────────────────────────────────
function HistoryView({ history, onOutcome }: { history: Signal[]; onOutcome: (id: string, o: string) => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {!history.length ? (
        <EmptyState
          icon="◷"
          title="No signal history yet"
          body="Resolved signals — those you marked CORRECT or INCORRECT after the underlying market closed — appear here with their win rate. Run a deep scan, mark outcomes as markets resolve, and a track record will accumulate."
          hint="History is your only honest read on the system. Don't skip the outcome buttons."
        />
      ) : (
        history.map(s => <SignalRow key={s.signal_id} sig={s} onOutcome={onOutcome} />)
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function Polymarket() {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState<Tab>('MARKETS')
  const [scanData, setScanData] = useState<ScanResult | null>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [history, setHistory] = useState<Signal[]>([])
  const [drilldownId, setDrilldownId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState('')
  const [scanLimit, setScanLimit] = useState<number>(10)
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set(['$1M+ ONLY']))
  const [focusedIdx, setFocusedIdx] = useState(0)
  // The BOOK and TRADES tabs operate on the most-recently-tapped market
  // from the MARKETS list. Independent of the drilldown view (which is a
  // full-screen replacement panel).
  const [activeMarketId, setActiveMarketId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const loadMarkets = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await axios.get('/api/polymarket/markets')
      setMarkets(r.data || [])
      setLastUpdate(new Date().toLocaleTimeString('en-GB', { hour12: false }))
    } catch (e: any) { setError(e?.response?.data?.detail || 'Failed to load markets') }
    finally { setLoading(false) }
  }, [])

  const loadHistory = useCallback(async () => {
    try { const r = await axios.get('/api/polymarket/signals'); setHistory(r.data || []) } catch {}
  }, [])

  const runScan = useCallback(async () => {
    setScanning(true); setError(null)
    try {
      const r = await axios.get(`/api/polymarket/scan?limit=${scanLimit}`)
      setScanData(r.data); setMarkets(r.data.markets || [])
      setLastUpdate(new Date().toLocaleTimeString('en-GB', { hour12: false }))
      await loadHistory()
    } catch (e: any) { setError(e?.response?.data?.detail || 'Scan failed') }
    finally { setScanning(false) }
  }, [scanLimit, loadHistory])

  const markOutcome = useCallback(async (signal_id: string, outcome: string) => {
    try { await axios.post(`/api/polymarket/signal/${signal_id}/outcome?outcome=${outcome}`); await loadHistory() } catch {}
  }, [loadHistory])

  useEffect(() => { loadMarkets(); loadHistory() }, [loadMarkets, loadHistory])
  useEffect(() => { const id = setInterval(loadMarkets, 5 * 60 * 1000); return () => clearInterval(id) }, [loadMarkets])

  // Filter markets by active chips
  const filteredMarkets = markets.filter(m => {
    if (activeChips.has('$1M+ ONLY') && m.liquidity < 1_000_000) return false
    if (activeChips.has('LIVE') && !m.vol_stats?.spike) return false
    if (activeChips.has('ENDING 7D')) {
      try {
        const d = (new Date(m.end_date).getTime() - Date.now()) / 86400000
        if (d > 7 || d < 0) return false
      } catch { return false }
    }
    return true
  })

  const toggleChip = (label: string) => {
    const s = new Set(activeChips)
    if (s.has(label)) s.delete(label); else s.add(label)
    setActiveChips(s)
  }

  const walletMarkets = markets.filter(m => m.wallet_data)
  const walletCount = walletMarkets.reduce((a, m) => a + (m.wallet_data?.wallets.length || 0), 0)
  const strongSigs = scanData?.strong_signals || []
  const weakSigs = scanData?.weak_signals || []

  // Resolve the market chosen for the BOOK / TRADES tabs. Default to the
  // first market once the list arrives, so the panels never sit blank.
  const activeMarket: Market | null = useMemo(() => {
    if (!filteredMarkets.length) return null
    const found = activeMarketId
      ? filteredMarkets.find(m => m.id === activeMarketId)
      : null
    return found ?? filteredMarkets[0]
  }, [filteredMarkets, activeMarketId])
  const activeYesTokenId = useMemo(() => {
    const out = activeMarket?.outcomes?.find(o => /yes/i.test(o.name))
      ?? activeMarket?.outcomes?.[0]
    // Some payloads carry token_id on the outcome; older shapes may not.
    return (out as unknown as { token_id?: string })?.token_id ?? null
  }, [activeMarket])
  const handleMarketSelected = useCallback((m: Market) => {
    setActiveMarketId(m.id)
    if (isMobile) {
      // On mobile the user expects "tap → detail". Drop them on the
      // BOOK tab; they can flip to TRADES via the bottom bar.
      setTab('BOOK')
    } else {
      setDrilldownId(m.id)
    }
  }, [isMobile])

  // Keyboard bindings (§3.12)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (drilldownId) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      if (e.key === '1') setTab('MARKETS')
      else if (e.key === '2') setTab('WALLETS')
      else if (e.key === '3') setTab('SIGNALS')
      else if (e.key === '4') setTab('HISTORY')
      else if (e.key === 'd') runScan()
      else if (e.key === 'f') toggleChip('$1M+ ONLY')
      else if (e.key === 'r') loadMarkets()
      else if (tab === 'MARKETS') {
        if (e.key === 'j' || e.key === 'ArrowDown') {
          setFocusedIdx(i => Math.min(filteredMarkets.length - 1, i + 1)); e.preventDefault()
        } else if (e.key === 'k' || e.key === 'ArrowUp') {
          setFocusedIdx(i => Math.max(0, i - 1)); e.preventDefault()
        } else if (e.key === 'Enter') {
          const m = filteredMarkets[focusedIdx]; if (m) setDrilldownId(m.id)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drilldownId, tab, filteredMarkets, focusedIdx, runScan, loadMarkets])

  // Orderflow drilldown (full-panel replacement)
  if (drilldownId) {
    return (
      <div className="pm-scope" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: PM.bg.app, color: PM.text.secondary, overflow: 'auto' }}>
        <OrderflowDrilldown conditionId={drilldownId} onBack={() => setDrilldownId(null)} />
      </div>
    )
  }

  return (
    <div className="pm-scope" style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: PM.bg.app, color: PM.text.secondary, overflow: 'hidden',
      fontFamily: PM.font.ui,
    }}>
      {/* Sub-tab strip — desktop only. Mobile uses the bottom tab bar. */}
      {!isMobile && (
        <SubTabStrip tab={tab} setTab={setTab} counts={{ SIGNALS: strongSigs.length, WALLETS: walletCount, HISTORY: history.length, BOOK: 0, TRADES: 0, MARKETS: 0 }} />
      )}

      {/* Metric strip */}
      <MetricStrip history={history} scanning={scanning} />

      {/* Page header: title + chips */}
      <div style={{
        padding: '0 14px', height: 36,
        display: 'flex', alignItems: 'center',
        background: PM.bg.panel, borderBottom: `1px solid ${PM.border.subtle}`,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 600, color: PM.text.primary, letterSpacing: '0.2px',
        }}>Polymarket Intelligence</span>
        {error && (
          <span style={{
            marginLeft: 12, fontSize: 11, fontFamily: PM.font.mono,
            color: PM.down, letterSpacing: '0.3px',
          }}>{error.toUpperCase()}</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {(['$1M+ ONLY', 'LIVE', 'ENDING 7D'] as const).map(c =>
            <Chip key={c} label={c} active={activeChips.has(c)} onClick={() => toggleChip(c)} />
          )}
        </div>
      </div>

      {/* Status row */}
      <div style={{
        padding: '0 14px', height: 22,
        display: 'flex', alignItems: 'center', gap: 8,
        background: PM.bg.panel, borderBottom: `1px solid ${PM.border.subtle}`,
        flexShrink: 0,
        fontSize: 11, color: PM.text.muted, fontFamily: PM.font.mono,
      }}>
        <span>Updated {lastUpdate || '—'}</span>
        <span style={{ color: PM.text.tertiary }}>·</span>
        <span>{filteredMarkets.length} markets</span>
        <span style={{ color: PM.text.tertiary }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <StatusDot state={loading ? 'polling' : 'live'} />
          <span style={{ color: loading ? PM.warning : PM.up, fontWeight: 500 }}>{loading ? 'LOADING' : 'LIVE'}</span>
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <SegmentedControl
            value={scanLimit}
            onChange={setScanLimit}
            options={[
              { label: 'Top 5', value: 5 },
              { label: 'Top 10', value: 10 },
              { label: 'Top 20', value: 20 },
              { label: 'Top 50', value: 50 },
            ]}
            size="sm"
          />
          <PrimaryButton onClick={runScan} loading={scanning} disabled={scanning}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon.Bolt size={10} color="currentColor" />
              {scanning ? 'SCANNING…' : 'DEEP SCAN'}
            </span>
          </PrimaryButton>
          <SecondaryButton onClick={loadMarkets} disabled={loading} height={22}>
            <Icon.Refresh size={12} color={PM.text.muted} />
          </SecondaryButton>
        </div>
      </div>

      {/* Body */}
      <div className={isMobile ? 'pm-mobile-padded' : ''} style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {tab === 'MARKETS' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <HeaderRow isMobile={isMobile} />
            <div ref={listRef} style={{ flex: 1, overflowY: 'auto' }}>
              {loading && !markets.length ? (
                <div style={{
                  padding: 60, textAlign: 'center',
                  fontSize: 11, color: PM.text.muted, fontFamily: PM.font.mono, letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}>LOADING MARKETS…</div>
              ) : !filteredMarkets.length ? (
                <div style={{
                  padding: 60, textAlign: 'center',
                  fontSize: 11, color: PM.text.muted, fontFamily: PM.font.mono, letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}>NO MARKETS MATCH FILTER</div>
              ) : (
                filteredMarkets.map((m, i) => (
                  <MarketRow
                    key={m.id}
                    m={m}
                    selected={focusedIdx === i}
                    isMobile={isMobile}
                    onOpen={() => handleMarketSelected(m)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'BOOK' && (
          <OrderBook
            tokenId={activeYesTokenId}
            marketLabel={activeMarket?.question}
          />
        )}

        {tab === 'TRADES' && (
          <TradeFeed
            marketId={activeMarket?.id ?? null}
            yesTokenId={activeYesTokenId}
            marketLabel={activeMarket?.question}
          />
        )}

        {tab === 'WALLETS' && <WalletsView markets={walletMarkets} />}

        {tab === 'SIGNALS' && (
          <SignalsView
            strong={strongSigs} weak={weakSigs}
            onOpenDrilldown={(sigId) => {
              const m = markets.find(mm => mm.signal?.signal_id === sigId)
              if (m) setDrilldownId(m.id)
            }}
            onOutcome={markOutcome}
            onRunScan={runScan}
            scanning={scanning}
            lastScan={lastUpdate}
          />
        )}

        {tab === 'HISTORY' && <HistoryView history={history} onOutcome={markOutcome} />}
      </div>

      {/* Mobile bottom tab bar — fixed; respects iOS home bar inset. */}
      {isMobile && (
        <nav className="pm-bottom-tabs" aria-label="Polymarket sections">
          {(['MARKETS', 'BOOK', 'TRADES', 'SIGNALS', 'WALLETS'] as const).map(t => {
            const labelMap: Record<string, string> = {
              MARKETS: 'Markets',
              BOOK: 'Book',
              TRADES: 'Trades',
              SIGNALS: 'Signals',
              WALLETS: 'Wallets',
            }
            return (
              <button
                key={t}
                type="button"
                aria-selected={tab === t}
                aria-label={labelMap[t]}
                onClick={() => setTab(t)}
              >
                {labelMap[t]}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
