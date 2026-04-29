"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { cn, fmtPrice, fmtK } from '@/lib/utils'
import {
  instruments, indicators, newsItems, cotData,
  exploreTabs, stories, marketCards, plans, faqs
} from '@/data'

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll<HTMLElement>('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach((child, i) => {
            const hasExplicit = Array.from(child.classList).some(c => c.startsWith('stagger-'))
            if (!hasExplicit) child.style.transitionDelay = `${i * 70}ms`
            child.classList.add('visible')
          })
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

export function MarketRibbon() {
  const items = instruments.map(i => (
    <div key={i.sym} className="flex items-center gap-2 whitespace-nowrap text-sm">
      <span className="font-semibold" style={{ color: 'var(--t2)' }}>{i.sym}</span>
      <span className="font-mono" style={{ color: 'var(--t2)' }}>{fmtPrice(i.price)}</span>
      <span className="font-mono font-semibold text-sm" style={{ color: i.chg >= 0 ? 'var(--green-val)' : 'var(--red-val)' }}>
        {i.chg >= 0 ? '+' : ''}{i.chg.toFixed(2)}%
      </span>
    </div>
  ))
  return (
    <div className="overflow-hidden py-2" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="flex gap-8 animate-scroll w-max">{items}{items}</div>
    </div>
  )
}

export function NumbersStrip() {
  const sectionRef = useReveal(0.15)
  const nums = [
    { n: '6', label: 'Asset classes covered' },
    { n: 'Real-time', label: 'Live market data feeds' },
    { n: 'COT + On-chain', label: 'Institutional-grade data' },
    { n: '100%', label: 'Analysis only — no execution' },
  ]
  return (
    <section ref={sectionRef as React.Ref<HTMLElement>} className="py-20">
      <div className="max-w-site mx-auto px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {nums.map((m, i) => (
            <div key={i} className="reveal" style={{ '--stagger': i } as React.CSSProperties}>
              <div className="text-[2.5rem] font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.03em', color: i === 0 || i === 3 ? 'var(--acc)' : 'var(--t1)' }}>{m.n}</div>
              <div className="text-sm font-medium" style={{ color: 'var(--t3)' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ExploreSection() {
  const [activeIdx, setActiveIdx] = useState(0)
  const sectionRef = useReveal(0.08)
  const active = exploreTabs[activeIdx]
  const panelContent: Record<string, JSX.Element> = {
    chart: (<div><h4 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>Charting workspace</h4><div className="grid grid-cols-3 gap-2">{[{ l: 'BTC-USD', v: '66,816', c: '+1.31%', up: true }, { l: 'MVRV', v: '0.74', c: 'Depressed', up: false }, { l: 'Z-Score', v: '-0.81', c: 'Below avg', up: false }].map(d => (<div key={d.l} className="p-3 rounded transition-all hover:-translate-y-0.5" style={{ background: 'var(--terminal-surface)', border: '1px solid var(--terminal-border)' }}><div className="text-sm mb-0.5" style={{ color: 'var(--t4)' }}>{d.l}</div><div className="text-sm font-bold font-mono text-white">{d.v}</div><div className="text-sm font-semibold font-mono" style={{ color: d.up ? 'var(--green-val)' : 'var(--red-val)' }}>{d.c}</div></div>))}</div><p className="mt-4 text-sm" style={{ color: 'var(--t4)' }}>Multi-timeframe candlestick charts with on-chain overlays. MVRV, realized cap, price/200d — understand cycle position, not just price.</p></div>),
    indicators: (<div><h4 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>Global indicators</h4><div className="grid grid-cols-3 gap-2">{indicators.slice(0, 6).map(ind => (<div key={ind.label} className="p-3 rounded transition-all hover:-translate-y-0.5" style={{ background: 'var(--terminal-surface)', border: '1px solid var(--terminal-border)' }}><div className="text-sm mb-0.5" style={{ color: 'var(--t4)' }}>{ind.label}</div><div className="text-sm font-bold font-mono text-white">{ind.val}</div><div className="text-sm font-semibold" style={{ color: ind.dir === 'up' ? 'var(--green-val)' : 'var(--red-val)' }}>{ind.dir === 'up' ? '▲' : '▼'}</div></div>))}</div><p className="mt-4 text-sm" style={{ color: 'var(--t4)' }}>Interest rates, inflation, GDP, employment, yield curve — all structured and live with directional context.</p></div>),
    watchlist: (<div><h4 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>Watchlist intelligence</h4>{instruments.slice(0, 5).map(inst => (<div key={inst.sym} className="flex justify-between py-2 border-b last:border-0 text-sm transition-colors hover:bg-white/[.02]" style={{ borderColor: 'var(--terminal-border)' }}><span style={{ color: 'var(--t3)' }}>{inst.sym}</span><span className="font-mono" style={{ color: 'rgba(255,255,255,.7)' }}>{fmtPrice(inst.price)}</span><span className="font-mono font-semibold" style={{ color: inst.chg >= 0 ? 'var(--green-val)' : 'var(--red-val)' }}>{inst.chg >= 0 ? '+' : ''}{inst.chg.toFixed(2)}%</span></div>))}<p className="mt-4 text-sm" style={{ color: 'var(--t4)' }}>Your watchlist connected to filtered news, signals, and contextual analysis. Not a static price list.</p></div>),
    news: (<div><h4 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>News flow</h4>{newsItems.slice(0, 4).map((n, i) => (<div key={i} className="flex justify-between py-2 border-b last:border-0 text-sm transition-colors hover:bg-white/[.02]" style={{ borderColor: 'var(--terminal-border)' }}><span style={{ color: 'var(--t3)' }}><span className="text-sm font-bold mr-2 px-1 py-0.5 rounded" style={{ color: 'var(--acc)', background: 'var(--acc-d)' }}>{n.tag}</span>{n.title}</span><span className="text-sm font-mono shrink-0 ml-3" style={{ color: 'var(--t4)' }}>{n.time}</span></div>))}<p className="mt-4 text-sm" style={{ color: 'var(--t4)' }}>Curated news filtered by watchlist with importance badges and asset tagging.</p></div>),
    cot: (<div><h4 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>COT positioning — S&P 500</h4>{cotData.map(c => (<div key={c.cat} className="flex justify-between py-2 border-b last:border-0 text-sm transition-colors hover:bg-white/[.02]" style={{ borderColor: 'var(--terminal-border)' }}><span className="flex-1" style={{ color: 'var(--t3)' }}>{c.cat}</span><span className="font-mono font-semibold" style={{ color: c.net >= 0 ? 'var(--green-val)' : 'var(--red-val)' }}>{fmtK(c.net)}</span></div>))}<p className="mt-4 text-sm" style={{ color: 'var(--t4)' }}>CFTC institutional positioning. Smart money vs spec. Crowded positioning alerts.</p></div>),
    risk: (<div><h4 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t4)' }}>Risk & sentiment</h4><div className="grid grid-cols-3 gap-2">{[{ l: 'VIX', v: '30.6', c: 'Extreme', col: 'var(--red-val)' }, { l: 'Credit', v: '3.42%', c: 'Healthy', col: 'var(--green-val)' }, { l: 'Breadth', v: '0.298', c: 'Concentrated', col: 'var(--red-val)' }, { l: 'Liquidity', v: '0.728', c: 'Stress', col: 'var(--amber)' }, { l: 'Dollar', v: '100.5', c: 'Firm', col: 'var(--green-val)' }, { l: 'Pulse', v: 'NEUTRAL', c: 'Fragile', col: 'var(--amber)' }].map(d => (<div key={d.l} className="p-3 rounded transition-all hover:-translate-y-0.5" style={{ background: 'var(--terminal-surface)', border: '1px solid var(--terminal-border)' }}><div className="text-sm mb-0.5" style={{ color: 'var(--t4)' }}>{d.l}</div><div className="text-sm font-bold font-mono text-white">{d.v}</div><div className="text-sm font-semibold" style={{ color: d.col }}>{d.c}</div></div>))}</div><p className="mt-4 text-sm" style={{ color: 'var(--t4)' }}>VIX regime, credit spreads, breadth, liquidity, dollar strength — the complete risk dashboard.</p></div>)
  }
  return (<section ref={sectionRef as React.Ref<HTMLElement>} className="py-24" id="explore"><div className="max-w-site mx-auto px-8"><div className="mb-10 reveal"><div className="section-label">Explore the terminal</div><div className="section-title">Every module, purpose-built for speed</div><div className="section-desc">Switch between modules to see how Termimal helps you analyze faster across price, macro, positioning, and sentiment.</div></div><div className="grid lg:grid-cols-[260px_1fr] gap-4 items-start"><div className="flex flex-col gap-1 reveal-left">{exploreTabs.map((tab, i) => (<button key={tab.key} onClick={() => setActiveIdx(i)} className={cn('p-3 rounded-lg text-left transition-all hover:-translate-y-px', activeIdx === i && 'ring-1')} style={{ background: activeIdx === i ? 'var(--surface)' : 'transparent', borderColor: activeIdx === i ? 'var(--border)' : 'transparent', boxShadow: activeIdx === i ? '0 2px 12px rgba(56,139,253,.06)' : 'none' }}><div className="text-sm font-semibold mb-0.5" style={{ color: activeIdx === i ? 'var(--acc)' : 'var(--t1)' }}>{tab.title}</div><div className="text-sm leading-relaxed" style={{ color: 'var(--t3)' }}>{tab.desc}</div></button>))}</div><div className="rounded-xl p-6 min-h-[380px] reveal-right transition-all" style={{ border: '1px solid var(--terminal-border)', background: 'var(--terminal-bg)' }}>{panelContent[active.key]}</div></div></div></section>)
}

export function ProductStories() {
  return (<section className="py-20"><div className="max-w-site mx-auto px-8">{stories.map((s, i) => { const storyRef = useRef<HTMLDivElement>(null); useEffect(() => { const el = storyRef.current; if (!el) return; const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { el.querySelectorAll<HTMLElement>('.reveal, .reveal-left, .reveal-right').forEach((child, idx) => { child.style.transitionDelay = `${idx * 100}ms`; child.classList.add('visible') }); observer.disconnect() } }, { threshold: 0.1 }); observer.observe(el); return () => observer.disconnect() }, []); return (<div ref={storyRef} key={s.tag} className={cn('grid lg:grid-cols-2 gap-12 items-center mb-24 last:mb-0', i % 2 === 1 && 'lg:[direction:rtl]')}><div className={cn('reveal-left', i % 2 === 1 && 'lg:[direction:ltr]')}><div className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--acc)' }}>{s.tag}</div><h3 className="text-[1.6rem] font-bold tracking-tight leading-tight mb-3" style={{ letterSpacing: '-0.02em' }}>{s.title}</h3><p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--t3)' }}>{s.desc}</p><ul className="flex flex-col gap-1.5">{s.points.map((p, pi) => (<li key={p} className="flex items-center gap-2 text-sm reveal" style={{ color: 'var(--t3)', transitionDelay: `${pi * 60 + 200}ms` }}><span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--acc)', opacity: 0.6 }} />{p}</li>))}</ul></div><div className={cn('rounded-xl overflow-hidden relative group reveal-right', i % 2 === 1 && 'lg:[direction:ltr]')} style={{ border: '1px solid var(--terminal-border)', background: 'var(--terminal-bg)', transitionDelay: '80ms' }}><Image src={s.img} alt={s.tag} width={1920} height={1080} className="w-full block transition-transform duration-700 group-hover:scale-[1.03]" /><div className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 group-hover:opacity-0" style={{ background: 'linear-gradient(135deg, transparent 60%, rgba(7,7,14,.25))' }} /></div></div>) })}</div></section>)
}

export function MarketsSection() {
  const sectionRef = useReveal(0.1)
  return (<section ref={sectionRef as React.Ref<HTMLElement>} className="py-20" id="markets"><div className="max-w-site mx-auto px-8"><div className="mb-8 reveal"><div className="section-label">Market coverage</div><div className="section-title">Every market. One workspace.</div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{marketCards.map((m, i) => (<div key={m.name} className="p-5 rounded-xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg reveal" style={{ border: '1px solid var(--border)', background: 'var(--surface)', transitionDelay: `${i * 70}ms` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(56,139,253,.25)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(56,139,253,.06)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}><div className="text-2xl font-bold mb-0.5" style={{ color: 'var(--acc)' }}>{m.count}</div><div className="text-sm font-semibold mb-0.5">{m.name}</div><div className="text-sm" style={{ color: 'var(--t3)' }}>{m.desc}</div></div>))}</div></div></section>)
}

// ─── Pricing — institutional comparison table ─────────────────────
// Style spec: dark terminal UI, sharp typography, aligned columns, no
// gradients, no glow, no consumer-fintech bright colors. Lock + check
// icons only. Numbers as ∞ (never the word "Unlimited").
const FEATURE_ROWS: { label: string; free: boolean | string; pro: boolean | string; premium: boolean | string }[] = [
  // Free baseline
  { label: 'Dashboard',                    free: true,       pro: true,       premium: true       },
  { label: 'Ticker workspace',             free: true,       pro: true,       premium: true       },
  { label: 'Charts (basic)',               free: true,       pro: true,       premium: true       },
  { label: 'Screener (basic)',             free: true,       pro: true,       premium: true       },
  { label: 'Global indicators',            free: 'Limited',  pro: 'Full',     premium: 'Full'     },
  { label: 'News flow',                    free: 'Limited',  pro: 'Full',     premium: 'Full'     },
  { label: 'Portfolio',                    free: 'Basic',    pro: 'Full',     premium: 'Full'     },
  // Limits
  { label: 'Watchlist symbols',            free: '10',       pro: '100',      premium: '∞'        },
  { label: 'Saved workspaces',             free: '1',        pro: '10',       premium: '∞'        },
  { label: 'Alerts',                       free: '3',        pro: '100',      premium: '∞'        },
  // Pro
  { label: 'Charts (advanced)',            free: false,      pro: true,       premium: true       },
  { label: 'Screener (advanced filters)',  free: false,      pro: true,       premium: true       },
  { label: 'Risk engine',                  free: false,      pro: true,       premium: true       },
  { label: 'COT report',                   free: false,      pro: true,       premium: true       },
  { label: 'Scenario planner',             free: false,      pro: true,       premium: true       },
  { label: 'Macro intelligence',           free: false,      pro: true,       premium: true       },
  { label: 'Desktop app',                  free: false,      pro: true,       premium: true       },
  // Premium (intelligence layer — moat)
  { label: 'Event probabilities',          free: false,      pro: false,      premium: true       },
  { label: 'On-chain analytics',           free: false,      pro: false,      premium: true       },
  { label: 'Sentiment / anomaly detector', free: false,      pro: false,      premium: true       },
  { label: 'AI weekly briefing',           free: false,      pro: false,      premium: true       },
  { label: 'Sovereign intelligence',       free: false,      pro: false,      premium: true       },
  { label: 'API access',                   free: false,      pro: false,      premium: true       },
  { label: 'Priority support',             free: false,      pro: false,      premium: true       },
]

function PricingCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="font-mono text-sm" style={{ color: 'var(--t1)' }}>{value}</span>
  }
  if (value) {
    return <span aria-label="Included" title="Included" className="font-mono text-sm font-semibold" style={{ color: 'var(--acc)' }}>✓</span>
  }
  return <span aria-label="Locked" title="Locked" className="font-mono text-sm" style={{ color: 'var(--t4)' }}>🔒</span>
}

export function PricingSection() {
  const sectionRef = useReveal(0.08)
  return (
    <section ref={sectionRef as React.Ref<HTMLElement>} className="py-20" id="pricing">
      <div className="max-w-[1080px] mx-auto px-6">
        <div className="mb-10 reveal">
          <div className="section-label">Pricing</div>
          <div className="section-title">Pick the tier that matches your workflow.</div>
          <p className="text-sm mt-2" style={{ color: 'var(--t3)' }}>
            Free to discover. Pro for the professional baseline. Premium for the intelligence layer.
          </p>
        </div>

        {/* Tier headers */}
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-0 reveal" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div />
          {plans.map(plan => (
            <div key={plan.name} className="px-4 py-5" style={{ borderLeft: '1px solid var(--border)', background: plan.popular ? 'var(--surface)' : 'transparent' }}>
              <div className="flex items-baseline gap-2 mb-1">
                <div className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: plan.popular ? 'var(--acc)' : 'var(--t2)' }}>
                  {plan.name}
                </div>
                {plan.popular && (
                  <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: 'var(--acc)' }}>· Recommended</span>
                )}
              </div>
              <div className="text-2xl font-mono font-semibold mb-1" style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>
                {plan.priceM === 0 ? '€0' : `€${plan.priceM.toFixed(2)}`}
                {plan.priceM > 0 && <span className="text-xs font-normal ml-1" style={{ color: 'var(--t3)' }}>/mo</span>}
              </div>
              <div className="text-[11px] mb-4" style={{ color: 'var(--t3)' }}>{plan.desc}</div>
              <Link
                href="/signup"
                className="block text-center py-2 text-xs font-mono font-semibold uppercase tracking-widest transition-colors"
                style={{
                  background: plan.popular ? 'var(--acc2)' : 'transparent',
                  color: plan.popular ? '#fff' : 'var(--t1)',
                  border: plan.popular ? 'none' : '1px solid var(--border)',
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Feature comparison rows */}
        <div className="reveal">
          {FEATURE_ROWS.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center"
              style={{
                borderBottom: '1px solid var(--border)',
                background: i % 2 === 0 ? 'transparent' : 'var(--surface)',
              }}
            >
              <div className="px-4 py-2.5 text-xs" style={{ color: 'var(--t2)' }}>{row.label}</div>
              <div className="px-4 py-2.5 text-center" style={{ borderLeft: '1px solid var(--border)' }}><PricingCell value={row.free}    /></div>
              <div className="px-4 py-2.5 text-center" style={{ borderLeft: '1px solid var(--border)' }}><PricingCell value={row.pro}     /></div>
              <div className="px-4 py-2.5 text-center" style={{ borderLeft: '1px solid var(--border)' }}><PricingCell value={row.premium} /></div>
            </div>
          ))}
        </div>

        <p className="text-[11px] font-mono mt-6 reveal" style={{ color: 'var(--t4)' }}>
          14-day trial on Pro and Premium · Cancel anytime · Prices exclude applicable taxes · Currency EUR
        </p>
      </div>
    </section>
  )
}

export function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const sectionRef = useReveal(0.08)
  return (<section ref={sectionRef as React.Ref<HTMLElement>} className="py-20"><div className="max-w-site mx-auto px-8"><div className="max-w-[680px] mx-auto"><div className="section-title mb-8 reveal">Questions & answers</div>{faqs.map((faq, i) => (<div key={i} className="reveal" style={{ borderBottom: '1px solid var(--border)', transitionDelay: `${i * 50}ms` }}><button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full flex items-center justify-between py-4 text-left transition-colors" style={{ color: 'var(--t2)' }}><span className="text-sm font-medium pr-8">{faq.q}</span><ChevronDown size={14} className={cn('shrink-0 transition-transform duration-300', openIdx === i && 'rotate-180')} style={{ color: 'var(--t4)' }} /></button><div className={cn('overflow-hidden transition-all duration-300', openIdx === i ? 'max-h-[200px] pb-4' : 'max-h-0')}><p className="text-sm leading-relaxed" style={{ color: 'var(--t3)' }}>{faq.a}</p></div></div>))}</div></div></section>)
}

export function CTASection() {
  const sectionRef = useReveal(0.1)
  return (<section ref={sectionRef as React.Ref<HTMLElement>} className="py-20"><div className="max-w-site mx-auto px-8"><div className="relative rounded-2xl p-16 overflow-hidden text-center reveal-scale anim-border-glow" style={{ border: '1px solid rgba(56,139,253,.2)', background: 'var(--surface)' }}><div className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none anim-float-slow" style={{ background: 'radial-gradient(circle, var(--acc), transparent 65%)', opacity: 0.045 }} /><h2 className="text-[2rem] font-bold tracking-tight mb-3 relative" style={{ letterSpacing: '-0.025em' }}>Your edge starts with better analysis.</h2><p className="text-sm max-w-md mx-auto mb-6 relative" style={{ color: 'var(--t3)' }}>Professional-grade market intelligence. 14-day free trial. Cancel anytime.</p><div className="flex gap-2 justify-center relative"><Link href="/signup" className="btn-primary py-3 px-7 text-sm anim-glow-pulse">Create free account →</Link><Link href="/web-terminal" className="btn-secondary py-3 px-5">Launch Web Terminal</Link><Link href="/download" className="btn-secondary py-3 px-5">Download Desktop</Link></div></div></div></section>)
}

export { Footer } from './Footer'

