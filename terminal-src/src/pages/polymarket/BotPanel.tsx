// pages/polymarket/BotPanel.tsx — Automation panel with active evaluation engine
import { useEffect, useRef, useState } from 'react'
import { PM } from './_ui/tokens'
import { SecondaryButton } from './_ui/primitives'
import { runBotTick, emptyState, type EntryRule, type BotState, type BotEvalConfig } from './_ui/botEngine'
import type { OFMarketMeta, OFMetrics, OFTrade } from './types'

type BotStatus = 'disarmed' | 'armed' | 'running' | 'killed'

interface BotConfig {
  name: string
  mode: 'paper' | 'live_ready'
  entryRule: EntryRule
  stopPct: string
  targetPct: string
  maxNotional: string
  maxSlippage: string
  cooldownSec: string
  cancelTimeoutSec: string
}

const ENTRY_RULES: Record<EntryRule, string> = {
  whale_align: 'Probability up + CVD positive + whale buy (long YES)',
  absorption_cvd_div: 'Absorption + CVD divergence (contrarian fade)',
  spike_fade: 'Fade large volume spike',
  manual: 'Manual trigger only (no auto-entry)',
}

export function BotPanel({ conditionId, meta }: { conditionId: string; meta: OFMarketMeta | null }) {
  const [config, setConfig] = useState<BotConfig>({
    name: 'untitled-strategy',
    mode: 'paper',
    entryRule: 'whale_align',
    stopPct: '5',
    targetPct: '15',
    maxNotional: '500',
    maxSlippage: '2',
    cooldownSec: '300',
    cancelTimeoutSec: '60',
  })
  const [status, setStatus] = useState<BotStatus>('disarmed')
  const [log, setLog] = useState<string[]>([])
  const [confirmArm, setConfirmArm] = useState(false)
  const [sessionStats, setSessionStats] = useState({ fills: 0, notional: 0 })

  const confirmArmTimerRef = useRef<number | null>(null)
  const engineIntervalRef = useRef<number | null>(null)
  const stateRef = useRef<BotState>(emptyState())

  // ── Helpers ──────────────────────────────────────────────────────
  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
    setLog(prev => [`${ts} ${msg}`, ...prev].slice(0, 30))
  }

  const evalConfig = (): BotEvalConfig => ({
    entryRule: config.entryRule,
    stopPct: (parseFloat(config.stopPct) || 5) / 100,
    targetPct: (parseFloat(config.targetPct) || 15) / 100,
    maxNotional: parseFloat(config.maxNotional) || 500,
    cooldownSec: parseFloat(config.cooldownSec) || 300,
  })

  // ── Engine loop — only runs when ARMED or RUNNING ────────────────
  useEffect(() => {
    if (status !== 'armed' && status !== 'running') return
    if (config.mode !== 'paper') return // live mode never auto-fires

    const tick = async () => {
      try {
        // Fetch fresh data for each tick
        const [rMetrics, rWhales] = await Promise.all([
          fetch(`/api/polymarket/orderflow/metrics/${conditionId}?window=3600&side=yes`),
          fetch(`/api/polymarket/orderflow/whales/${conditionId}?min_notional=1000&limit=40`),
        ])
        let metrics: OFMetrics | null = null
        let whales: OFTrade[] = []
        if (rMetrics.ok) { const j = await rMetrics.json(); if (!j.error) metrics = j }
        if (rWhales.ok) { const j = await rWhales.json(); if (j.trades) whales = j.trades }

        const result = await runBotTick({
          config: evalConfig(),
          state: stateRef.current,
          meta, metrics, whales,
        })

        stateRef.current.lastEvalTs = Date.now()

        if (result.event === 'fire_ok') {
          stateRef.current.lastFireTs = Date.now()
          stateRef.current.fills += 1
          const perFire = Math.max(10, Math.min(evalConfig().maxNotional / 5, 100))
          stateRef.current.sessionNotional += perFire
          setSessionStats({ fills: stateRef.current.fills, notional: stateRef.current.sessionNotional })
          setStatus('running')
          addLog(`✓ FIRED ${result.message}`)
        } else if (result.event === 'fire_err') {
          addLog(`✗ ${result.message}`)
        } else if (result.event === 'cap') {
          addLog(`⚠ ${result.message} — halting`)
          setStatus('disarmed')
        } else if (result.event === 'cooldown') {
          // Don't log every cooldown skip, too noisy — but do log first time a signal fires during cooldown
        }
        // 'skip' and 'no_meta' are silent
      } catch (e) {
        addLog(`✗ engine error: ${String(e).slice(0, 50)}`)
      }
    }

    // First tick immediately, then every 10 seconds
    tick()
    engineIntervalRef.current = window.setInterval(tick, 10_000)

    return () => {
      if (engineIntervalRef.current) { clearInterval(engineIntervalRef.current); engineIntervalRef.current = null }
    }
  }, [status, config.mode, config.entryRule, config.cooldownSec, config.maxNotional, conditionId, meta])

  // ── Actions ──────────────────────────────────────────────────────
  const startConfirmArm = () => {
    if (status === 'killed') { addLog('⚠ KILLED — reset bot to arm again'); return }
    if (config.mode === 'live_ready') { addLog('⚠ LIVE MODE — automation cannot execute'); return }
    setConfirmArm(true)
    if (confirmArmTimerRef.current) clearTimeout(confirmArmTimerRef.current)
    confirmArmTimerRef.current = window.setTimeout(() => setConfirmArm(false), 5000)
  }
  const cancelArm = () => {
    setConfirmArm(false)
    if (confirmArmTimerRef.current) { clearTimeout(confirmArmTimerRef.current); confirmArmTimerRef.current = null }
  }
  const arm = () => {
    stateRef.current = emptyState()
    setSessionStats({ fills: 0, notional: 0 })
    setStatus('armed')
    setConfirmArm(false)
    if (confirmArmTimerRef.current) { clearTimeout(confirmArmTimerRef.current); confirmArmTimerRef.current = null }
    addLog(`✓ ARMED — ${ENTRY_RULES[config.entryRule]} — evaluating every 10s`)
  }
  const disarm = () => {
    setStatus('disarmed')
    addLog('○ DISARMED')
  }
  const kill = () => {
    setStatus('killed')
    addLog('🛑 KILL SWITCH — evaluation halted')
  }
  const reset = () => {
    stateRef.current = emptyState()
    setSessionStats({ fills: 0, notional: 0 })
    setStatus('disarmed')
    setLog([])
    addLog('↻ RESET — session state cleared')
  }

  const statusColor = {
    disarmed: PM.text.muted,
    armed: PM.warning,
    running: PM.up,
    killed: PM.down,
  }[status]

  const updateField = <K extends keyof BotConfig>(k: K, v: BotConfig[K]) => setConfig({ ...config, [k]: v })
  const perFireEstimate = Math.max(10, Math.min((parseFloat(config.maxNotional) || 500) / 5, 100))

  return (
    <div style={{
      background: PM.bg.panel,
      border: `1px solid ${PM.border.subtle}`,
      display: 'flex', flexDirection: 'column',
      fontFamily: PM.font.ui,
    }}>
      {/* Header */}
      <div style={{
        height: 32, padding: '0 12px',
        borderBottom: `1px solid ${PM.border.subtle}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: PM.text.muted,
        }}>BOT · AUTOMATION</span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.5px',
          textTransform: 'uppercase', fontFamily: PM.font.mono,
          padding: '2px 6px', borderRadius: 2,
          background: 'rgba(210,153,34,0.18)', color: PM.warning,
          border: `1px solid ${PM.warning}`,
        }}>SIMULATED · PAPER</span>
        <span style={{
          marginLeft: 'auto',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: statusColor,
          fontFamily: PM.font.mono,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }}/>
          {/* User-facing labels: idle / watching / entered / closed / killed
              (mapped from internal disarmed/armed/running/killed + fill count) */}
          {status === 'disarmed' ? 'IDLE'
            : status === 'killed' ? 'KILLED'
            : sessionStats.fills > 0 ? 'ENTERED'
            : 'WATCHING'}
        </span>
      </div>

      {/* Session stats (only when active) */}
      {(status === 'armed' || status === 'running') && (
        <div style={{
          padding: '8px 12px',
          background: PM.bg.elevated,
          borderBottom: `1px solid ${PM.border.subtle}`,
          display: 'flex', gap: 16,
          fontSize: 11, fontFamily: PM.font.mono,
        }}>
          <span style={{ color: PM.text.muted }}>
            fills <span style={{ color: sessionStats.fills > 0 ? PM.up : PM.text.secondary, fontWeight: 600 }}>{sessionStats.fills}</span>
          </span>
          <span style={{ color: PM.text.muted }}>
            notional <span style={{ color: PM.text.secondary, fontWeight: 600 }}>${sessionStats.notional.toFixed(0)}</span>
            <span style={{ color: PM.text.tertiary }}> / ${config.maxNotional}</span>
          </span>
          <span style={{ marginLeft: 'auto', color: PM.text.tertiary }}>
            ~${perFireEstimate.toFixed(0)}/fire
          </span>
        </div>
      )}

      {/* Config grid — disabled when armed */}
      <fieldset disabled={status === 'armed' || status === 'running'}
        style={{ border: 'none', padding: 12, margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, opacity: (status === 'armed' || status === 'running') ? 0.55 : 1 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>STRATEGY NAME</Label>
          <Input value={config.name} onChange={v => updateField('name', v)} />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <Label>MODE</Label>
          <div style={{ display: 'flex', gap: 0 }}>
            <button onClick={() => updateField('mode', 'paper')}
              style={modeBtnStyle(config.mode === 'paper', PM.warning, 'left')}>PAPER</button>
            <button onClick={() => updateField('mode', 'live_ready')}
              style={modeBtnStyle(config.mode === 'live_ready', PM.down, 'right')}>LIVE-READY</button>
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <Label>ENTRY RULE</Label>
          <select value={config.entryRule} onChange={e => updateField('entryRule', e.target.value as EntryRule)}
            style={{
              width: '100%', height: 26, padding: '0 8px',
              background: PM.bg.elevated, border: `1px solid ${PM.border.prominent}`,
              color: PM.text.primary, fontSize: 11, fontFamily: PM.font.mono,
              borderRadius: 2, outline: 'none', cursor: 'pointer',
            }}>
            {(Object.keys(ENTRY_RULES) as EntryRule[]).map(k => (
              <option key={k} value={k}>{ENTRY_RULES[k]}</option>
            ))}
          </select>
        </div>

        <div><Label>STOP %</Label><Input value={config.stopPct} onChange={v => updateField('stopPct', v)} unit="%" /></div>
        <div><Label>TARGET %</Label><Input value={config.targetPct} onChange={v => updateField('targetPct', v)} unit="%" /></div>
        <div><Label>MAX NOTIONAL</Label><Input value={config.maxNotional} onChange={v => updateField('maxNotional', v)} unit="$" /></div>
        <div><Label>MAX SLIPPAGE</Label><Input value={config.maxSlippage} onChange={v => updateField('maxSlippage', v)} unit="%" /></div>
        <div><Label>COOLDOWN</Label><Input value={config.cooldownSec} onChange={v => updateField('cooldownSec', v)} unit="s" /></div>
        <div><Label>CANCEL TIMEOUT</Label><Input value={config.cancelTimeoutSec} onChange={v => updateField('cancelTimeoutSec', v)} unit="s" /></div>
      </fieldset>

      {/* Controls */}
      <div style={{
        padding: 12, borderTop: `1px solid ${PM.border.subtle}`,
        display: 'flex', gap: 6,
      }}>
        {status === 'disarmed' && !confirmArm && (
          <button onClick={startConfirmArm}
            style={{
              flex: 1, height: 28, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
              background: PM.warning, color: '#0a0a0a', border: 'none', borderRadius: 2,
              cursor: 'pointer', fontFamily: PM.font.ui, textTransform: 'uppercase',
            }}>ARM STRATEGY</button>
        )}
        {status === 'disarmed' && confirmArm && (
          <>
            <button onClick={arm}
              style={{
                flex: 1, height: 28, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
                background: PM.warning, color: '#0a0a0a', border: 'none', borderRadius: 2,
                cursor: 'pointer', fontFamily: PM.font.ui, textTransform: 'uppercase',
              }}>CONFIRM ARM</button>
            <button onClick={cancelArm}
              style={{
                flex: 1, height: 28, fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
                background: 'transparent', color: PM.text.muted,
                border: `1px solid ${PM.border.prominent}`, borderRadius: 2,
                cursor: 'pointer', fontFamily: PM.font.ui, textTransform: 'uppercase',
              }}>CANCEL</button>
          </>
        )}
        {status === 'armed' && (
          <>
            <SecondaryButton onClick={disarm} fullWidth>DISARM</SecondaryButton>
            <SecondaryButton onClick={kill} destructive fullWidth>🛑 KILL</SecondaryButton>
          </>
        )}
        {status === 'running' && (
          <>
            <SecondaryButton onClick={disarm} fullWidth>DISARM</SecondaryButton>
            <SecondaryButton onClick={kill} destructive fullWidth>🛑 KILL SWITCH</SecondaryButton>
          </>
        )}
        {status === 'killed' && <SecondaryButton onClick={reset} fullWidth>RESET BOT</SecondaryButton>}
      </div>

      {/* Live integration warning */}
      {config.mode === 'live_ready' && (
        <div style={{
          padding: 10, background: 'rgba(218,54,51,0.08)',
          borderTop: `1px solid ${PM.border.subtle}`,
          fontSize: 10, color: PM.down, fontFamily: PM.font.mono, lineHeight: 1.5, letterSpacing: '0.3px',
        }}>
          ⚠ Live-ready: config saved but execution requires authenticated connection. Arming is blocked in this mode.
        </div>
      )}

      {/* Log */}
      <div style={{ borderTop: `1px solid ${PM.border.subtle}`, maxHeight: 180, overflowY: 'auto' }}>
        <div style={{
          height: 22, padding: '0 12px',
          background: PM.bg.elevated,
          borderBottom: `1px solid ${PM.border.subtle}`,
          display: 'flex', alignItems: 'center',
          fontSize: 10, fontWeight: 500, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: PM.text.muted,
        }}>LOG</div>
        {log.length === 0 ? (
          <div style={{ padding: 12, fontSize: 10, color: PM.text.tertiary, textAlign: 'center', fontFamily: PM.font.mono, letterSpacing: '0.4px' }}>
            NO EVENTS YET
          </div>
        ) : (
          log.map((l, i) => {
            const color = l.includes('FIRED') ? PM.up
              : l.includes('✗') || l.includes('KILL') || l.includes('FAILED') ? PM.down
              : l.includes('⚠') ? PM.warning
              : l.includes('ARMED') ? PM.up
              : PM.text.muted
            return (
              <div key={i} style={{
                padding: '3px 12px', fontSize: 10, fontFamily: PM.font.mono,
                color, borderBottom: `1px solid ${PM.border.subtle}`,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{l}</div>
            )
          })
        )}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 500, letterSpacing: '0.5px',
      textTransform: 'uppercase', color: PM.text.tertiary,
      fontFamily: PM.font.ui, marginBottom: 3,
    }}>{children}</div>
  )
}

function Input({ value, onChange, unit }: { value: string; onChange: (v: string) => void; unit?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      height: 26, background: PM.bg.elevated,
      border: `1px solid ${PM.border.prominent}`, borderRadius: 2,
    }}>
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, height: 24, padding: '0 8px',
          background: 'transparent', border: 'none',
          color: PM.text.primary, fontSize: 11, fontFamily: PM.font.mono,
          outline: 'none',
        }}
      />
      {unit && (
        <span style={{ padding: '0 8px', fontSize: 10, color: PM.text.tertiary, fontFamily: PM.font.mono, letterSpacing: '0.3px' }}>{unit}</span>
      )}
    </div>
  )
}

function modeBtnStyle(active: boolean, color: string, pos: 'left' | 'right'): React.CSSProperties {
  return {
    flex: 1, height: 26,
    fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
    fontFamily: PM.font.mono, textTransform: 'uppercase',
    background: active ? `${color}20` : 'transparent',
    color: active ? color : PM.text.muted,
    border: `1px solid ${active ? color : PM.border.prominent}`,
    borderRadius: pos === 'left' ? '2px 0 0 2px' : '0 2px 2px 0',
    borderRight: pos === 'left' ? 'none' : undefined,
    cursor: 'pointer',
  }
}
