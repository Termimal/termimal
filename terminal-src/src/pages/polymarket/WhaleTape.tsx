// pages/polymarket/WhaleTape.tsx — tiered whale flow feed
import { useEffect, useMemo, useRef, useState } from 'react'
import type { OFTrade } from './types'
import { PM, fmtUsd, fmtTime } from './_ui/tokens'
import { SegmentedControl, Icon } from './_ui/primitives'
import { onActivate } from '@/lib/a11y'

// Size tiers — visual weight scales with notional
type Tier = 1 | 2 | 3 | 4 | 5
function tierOf(n: number): Tier {
  if (n >= 25000) return 5
  if (n >= 5000)  return 4
  if (n >= 1000)  return 3
  if (n >= 250)   return 2
  return 1
}

export function WhaleTape({ conditionId, liveTrades }: { conditionId: string; liveTrades: OFTrade[] }) {
  const [initial, setInitial] = useState<OFTrade[]>([])
  const [threshold, setThreshold] = useState(1000)
  const [thresholdInput, setThresholdInput] = useState('1000')
  const [outcomeFilter, setOutcomeFilter] = useState<'both' | 'yes' | 'no'>('both')
  const listRef = useRef<HTMLDivElement | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const seenIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/polymarket/orderflow/whales/${conditionId}?min_notional=${threshold}&limit=200`)
        if (!r.ok) return
        const j = await r.json()
        if (!cancelled && j.trades) setInitial(j.trades)
      } catch {}
    }
    load()
    const id = setInterval(load, 8000)
    return () => { cancelled = true; clearInterval(id) }
  }, [conditionId, threshold])

  const merged: OFTrade[] = useMemo(() => {
    const all: OFTrade[] = [...initial]
    const seen = new Set(all.map(t => `${t.ts}-${t.price}-${t.size}`))
    for (const t of liveTrades) {
      if (t.notional >= threshold && !seen.has(`${t.ts}-${t.price}-${t.size}`)) {
        all.push(t); seen.add(`${t.ts}-${t.price}-${t.size}`)
      }
    }
    all.sort((a, b) => b.ts - a.ts)
    return all.slice(0, 200)
  }, [initial, liveTrades, threshold])

  const filtered = outcomeFilter === 'both'
    ? merged
    : merged.filter(t => t.outcome?.toLowerCase() === outcomeFilter)

  // Mark new rows for flash
  useEffect(() => {
    for (const t of filtered) {
      const id = `${t.ts}-${t.price}-${t.size}`
      if (!seenIds.current.has(id)) seenIds.current.add(id)
    }
  }, [filtered])

  useEffect(() => {
    if (autoScroll && listRef.current) listRef.current.scrollTop = 0
  }, [filtered, autoScroll])

  const applyThreshold = () => {
    const raw = thresholdInput.trim().toLowerCase().replace(/[$,]/g, '')
    const mult = raw.endsWith('k') ? 1000 : raw.endsWith('m') ? 1_000_000 : 1
    const num = parseFloat(raw.replace(/[km]$/, ''))
    if (isFinite(num) && num > 0) setThreshold(num * mult)
  }

  const resumeLive = () => {
    if (listRef.current) { listRef.current.scrollTop = 0; setAutoScroll(true) }
  }

  return (
    <div style={{
      background: PM.bg.panel,
      display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%',
    }}>
      {/* ── Header (32px) ─────────────────────────────────────────── */}
      <div style={{
        height: 32, padding: '0 10px',
        borderBottom: `1px solid ${PM.border.subtle}`,
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: PM.text.muted, fontFamily: PM.font.ui,
        }}>WHALE TAPE</span>
        <span style={{
          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, color: PM.text.tertiary, fontFamily: PM.font.mono,
        }}>≥</span>
        <input
          value={thresholdInput}
          onChange={e => setThresholdInput(e.target.value)}
          onBlur={applyThreshold}
          onKeyDown={e => { if (e.key === 'Enter') applyThreshold() }}
          style={{
            width: 48, height: 22, padding: '0 6px',
            background: PM.bg.elevated, border: `1px solid ${PM.border.prominent}`,
            color: PM.text.primary, fontSize: 11, fontFamily: PM.font.mono,
            fontVariantNumeric: 'tabular-nums', borderRadius: 2,
            outline: 'none', textAlign: 'right',
          }}
        />
      </div>

      {/* ── Filter row (26px) ─────────────────────────────────────── */}
      <div style={{
        height: 26, padding: '0 10px',
        borderBottom: `1px solid ${PM.border.subtle}`,
        display: 'flex', alignItems: 'center', flexShrink: 0,
      }}>
        <SegmentedControl
          value={outcomeFilter}
          onChange={v => setOutcomeFilter(v as any)}
          options={[
            { label: 'BOTH', value: 'both' },
            { label: 'YES', value: 'yes' },
            { label: 'NO', value: 'no' },
          ]}
          size="sm"
        />
        <span style={{
          marginLeft: 'auto', fontSize: 10, color: PM.text.tertiary,
          fontFamily: PM.font.mono,
        }}>{filtered.length} trades</span>
      </div>

      {/* ── Trades list ────────────────────────────────────────────── */}
      <div ref={listRef}
        onScroll={e => setAutoScroll((e.target as HTMLDivElement).scrollTop < 20)}
        style={{
          flex: 1, overflow: 'auto', minHeight: 0, position: 'relative',
        }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: 20, fontSize: 10, color: PM.text.muted,
            textAlign: 'center', fontFamily: PM.font.mono,
            letterSpacing: '0.4px', textTransform: 'uppercase',
          }}>WAITING FOR WHALE TRADES…</div>
        ) : (
          filtered.map((t, i) => {
            const col = t.aggressor === 'buy' ? PM.up : PM.down
            const tier = tierOf(t.notional)
            const bold = tier >= 4
            const bgTint = tier === 5 ? (t.aggressor === 'buy' ? 'rgba(46,160,67,0.08)' : 'rgba(218,54,51,0.08)') :
                           tier === 3 ? 'rgba(255,255,255,0.02)' : 'transparent'
            const borderLeft = tier === 5 ? `4px solid ${col}` : tier === 4 ? `3px solid ${col}` : '0'

            return (
              <div key={`${t.ts}-${t.price}-${t.size}-${i}`}
                role="button" tabIndex={0}
                onClick={() => t.tx && window.open(`https://polygonscan.com/tx/${t.tx}`, '_blank')}
                onKeyDown={onActivate(() => { if (t.tx) window.open(`https://polygonscan.com/tx/${t.tx}`, '_blank') })}
                className="pm-hoverable"
                style={{
                  padding: '4px 10px', paddingLeft: tier >= 4 ? 10 - Math.max(0, (tier === 5 ? 4 : 3) - 10) + 6 : 10,
                  background: bgTint, borderLeft,
                  borderBottom: `1px solid ${PM.bg.app}`,
                  cursor: t.tx ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', gap: 1,
                }}>
                {/* Line 1: time · side · $ · @price · YES/NO */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '58px 38px 1fr 52px 32px',
                  gap: 6, alignItems: 'center',
                }}>
                  <span style={{
                    fontSize: 10, color: PM.text.tertiary,
                    fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
                  }}>{fmtTime(t.ts)}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: col, letterSpacing: '0.4px',
                    fontFamily: PM.font.mono, textTransform: 'uppercase',
                  }}>{t.aggressor}</span>
                  <span style={{
                    fontSize: bold ? 12 : 11, fontWeight: bold ? 700 : 600,
                    color: PM.text.primary, fontFamily: PM.font.mono,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{fmtUsd(t.notional)}</span>
                  <span style={{
                    fontSize: 10, color: PM.text.secondary,
                    fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
                  }}>@{t.price.toFixed(3)}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 600, letterSpacing: '0.4px',
                    color: t.outcome?.toLowerCase() === 'yes' ? PM.up : PM.down,
                    fontFamily: PM.font.mono,
                    background: t.outcome?.toLowerCase() === 'yes' ? 'rgba(46,160,67,0.12)' : 'rgba(218,54,51,0.12)',
                    padding: '1px 4px', borderRadius: 2, textAlign: 'center',
                  }}>{(t.outcome || '?').slice(0, 3).toUpperCase()}</span>
                </div>
                {/* Line 2: wallet pseudonym */}
                <div style={{
                  fontSize: 10, color: PM.text.tertiary,
                  fontFamily: PM.font.mono, paddingLeft: 64,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.pseudonym || (t.wallet ? `${t.wallet.slice(0, 6)}…${t.wallet.slice(-4)}` : '—')}
                  </span>
                  {t.tx && <Icon.External size={9} color={PM.text.tertiary} />}
                </div>
              </div>
            )
          })
        )}

        {/* Resume live pill */}
        {!autoScroll && filtered.length > 0 && (
          <div role="button" tabIndex={0} onClick={resumeLive} onKeyDown={onActivate(resumeLive)}
            style={{
              position: 'sticky', bottom: 8, marginLeft: 'auto', marginRight: 8,
              width: 'fit-content',
              padding: '4px 10px',
              background: PM.bg.elevated, border: `1px solid ${PM.accent}`,
              color: PM.accentText, fontSize: 10, fontFamily: PM.font.mono,
              letterSpacing: '0.3px', textTransform: 'uppercase',
              cursor: 'pointer', borderRadius: 2,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            ↓ RESUME LIVE
          </div>
        )}
      </div>
    </div>
  )
}
