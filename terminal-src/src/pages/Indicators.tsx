// pages/Indicators.tsx — TradingEconomics multi-column layout
import { useState, useEffect } from 'react'
import { TvLineChart } from '@/components/charts/TvLineChart'
import { Flag } from '@/components/common/Flag'
import { DataSource } from '@/components/common/DataSource'
import { EmptyState } from '@/components/common/EmptyState'

interface Row { country: string; flag: string; fred: string }
interface IndDef { name: string; rows: Row[]; unit: string; desc: string }
interface CatDef { name: string; items: IndDef[] }

const CATEGORIES: CatDef[] = [
  { name: 'Main Indicators', items: [
    { name:'Interest Rate', unit:'%', desc:'Central bank policy rate.', rows:[{country:'United States',flag:'🇺🇸',fred:'FEDFUNDS'},{country:'Euro Area',flag:'🇪🇺',fred:'ECBMLFR'},{country:'United Kingdom',flag:'🇬🇧',fred:'INTDSRGBM193N'},{country:'Japan',flag:'🇯🇵',fred:'IRSTCB01JPM156N'}]},
    { name:'Inflation Rate', unit:'%', desc:'Consumer price change YoY.', rows:[{country:'United States',flag:'🇺🇸',fred:'CPALTT01USM657N'},{country:'Euro Area',flag:'🇪🇺',fred:'CP0000EZ19M086NEST'},{country:'Germany',flag:'🇩🇪',fred:'CPHPTT01DEM659N'},{country:'France',flag:'🇫🇷',fred:'CPHPTT01FRM659N'},{country:'United Kingdom',flag:'🇬🇧',fred:'CPHPTT01GBM659N'},{country:'Japan',flag:'🇯🇵',fred:'CPALTT01JPM657N'},{country:'China',flag:'🇨🇳',fred:'CPALTT01CNM657N'}]},
    { name:'Unemployment Rate', unit:'%', desc:'% of workforce without job.', rows:[{country:'United States',flag:'🇺🇸',fred:'UNRATE'},{country:'Euro Area',flag:'🇪🇺',fred:'LRHUTTTTEZM156S'},{country:'Germany',flag:'🇩🇪',fred:'LRUN64TTDEM156S'},{country:'France',flag:'🇫🇷',fred:'LRHUTTTTFRM156S'},{country:'United Kingdom',flag:'🇬🇧',fred:'LRHUTTTTGBM156S'},{country:'Japan',flag:'🇯🇵',fred:'LRUN64TTJPM156S'},{country:'China',flag:'🇨🇳',fred:'LRUN64TTCNM156S'}]},
    { name:'GDP Growth Rate', unit:'%', desc:'Quarterly economic growth.', rows:[{country:'United States',flag:'🇺🇸',fred:'A191RL1Q225SBEA'}]},
    { name:'Government Bond 10Y', unit:'%', desc:'Long-term benchmark rate.', rows:[{country:'United States',flag:'🇺🇸',fred:'DGS10'},{country:'Germany',flag:'🇩🇪',fred:'IRLTLT01DEM156N'},{country:'France',flag:'🇫🇷',fred:'IRLTLT01FRM156N'},{country:'United Kingdom',flag:'🇬🇧',fred:'IRLTLT01GBM156N'},{country:'Japan',flag:'🇯🇵',fred:'IRLTLT01JPM156N'}]},
  ]},
  { name: 'Prices', items: [
    { name:'Core Inflation Rate', unit:'%', desc:'Ex food & energy.', rows:[{country:'United States',flag:'🇺🇸',fred:'CORESTICKM159SFRBATL'}]},
    { name:'Producer Prices (PPI)', unit:'Index', desc:'Factory costs. Leads CPI.', rows:[{country:'United States',flag:'🇺🇸',fred:'PPIACO'}]},
    { name:'PCE Price Index', unit:'Index', desc:'Fed preferred inflation gauge.', rows:[{country:'United States',flag:'🇺🇸',fred:'PCEPI'}]},
    { name:'5Y Breakeven Inflation', unit:'%', desc:'Market-implied expectations.', rows:[{country:'United States',flag:'🇺🇸',fred:'T5YIE'}]},
  ]},
  { name: 'GDP', items: [
    { name:'GDP', unit:'B$', desc:'Total economic output.', rows:[{country:'United States',flag:'🇺🇸',fred:'GDPC1'},{country:'China',flag:'🇨🇳',fred:'MKTGDPCNA646NWDB'},{country:'Japan',flag:'🇯🇵',fred:'MKTGDPJPA646NWDB'}]},
    { name:'Industrial Production', unit:'Index', desc:'Factory output.', rows:[{country:'United States',flag:'🇺🇸',fred:'INDPRO'},{country:'Euro Area',flag:'🇪🇺',fred:'PRMNTO01EZM661S'},{country:'China',flag:'🇨🇳',fred:'PRMNTO01CNM661S'},{country:'Japan',flag:'🇯🇵',fred:'PRMNTO01JPM661S'}]},
    { name:'Retail Sales', unit:'M$', desc:'Consumer spending.', rows:[{country:'United States',flag:'🇺🇸',fred:'RSXFS'}]},
  ]},
  { name: 'Labour', items: [
    { name:'Non-Farm Payrolls', unit:'K', desc:'Monthly job creation.', rows:[{country:'United States',flag:'🇺🇸',fred:'PAYEMS'}]},
    { name:'Initial Jobless Claims', unit:'K', desc:'Weekly filings.', rows:[{country:'United States',flag:'🇺🇸',fred:'ICSA'}]},
    { name:'Job Openings (JOLTS)', unit:'K', desc:'Open positions.', rows:[{country:'United States',flag:'🇺🇸',fred:'JTSJOL'}]},
  ]},
  { name: 'Money', items: [
    { name:'Yield Curve 10Y-2Y', unit:'%', desc:'Negative = recession signal.', rows:[{country:'United States',flag:'🇺🇸',fred:'T10Y2Y'}]},
    { name:'HY Bond Spread', unit:'%', desc:'Credit risk premium.', rows:[{country:'United States',flag:'🇺🇸',fred:'BAMLH0A0HYM2'}]},
    { name:'M2 Money Supply', unit:'B$', desc:'Total money in system.', rows:[{country:'United States',flag:'🇺🇸',fred:'M2SL'}]},
    { name:'30Y Mortgage Rate', unit:'%', desc:'Home affordability.', rows:[{country:'United States',flag:'🇺🇸',fred:'MORTGAGE30US'}]},
  ]},
  { name: 'Consumer', items: [
    { name:'Consumer Confidence', unit:'Index', desc:'Household sentiment.', rows:[{country:'United States',flag:'🇺🇸',fred:'UMCSENT'},{country:'Euro Area',flag:'🇪🇺',fred:'CSCICP03EZM460S'}]},
    { name:'Personal Saving Rate', unit:'%', desc:'Income saved.', rows:[{country:'United States',flag:'🇺🇸',fred:'PSAVERT'}]},
    { name:'Building Permits', unit:'K', desc:'Future construction.', rows:[{country:'United States',flag:'🇺🇸',fred:'PERMIT'}]},
  ]},
]

const cache: Record<string, { last: number; prev: number; date: string }> = {}

export function Indicators() {
  const [sel, setSel] = useState<IndDef | null>(null)
  const [chartRow, setChartRow] = useState<Row | null>(null)
  const [chartData, setChartData] = useState<{ dates: string[]; values: number[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [vals, setVals] = useState<Record<string, { last: number; prev: number; date: string }>>({})

  // preload values
  useEffect(() => {
    CATEGORIES.forEach(cat => cat.items.forEach(ind => ind.rows.forEach(r => {
      if (cache[r.fred]) { setVals(p => ({ ...p, [r.fred]: cache[r.fred] })); return }
      fetch(`/api/indicator/${r.fred}`).then(res => res.json()).then(j => {
        if (j?.data?.values?.length > 1) {
          const v = j.data.values
          const e = { last: v[v.length - 1], prev: v[v.length - 2], date: j.data.latest_date }
          cache[r.fred] = e; setVals(p => ({ ...p, [r.fred]: e }))
        }
      }).catch(() => {})
    })))
  }, [])

  const openChart = (r: Row) => {
    setChartRow(r); setLoading(true); setChartData(null)
    fetch(`/api/indicator/${r.fred}`).then(res => res.json()).then(j => {
      if (j?.data?.dates) setChartData({ dates: j.data.dates, values: j.data.values })
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  // ── Chart view ──
  if (sel && chartRow) {
    const v = chartData?.values ?? []
    const cur = v[v.length - 1] ?? 0
    const prv = v.length > 2 ? v[v.length - 2] : cur
    const chg = cur - prv
    return (
      <div style={{ padding: '20px 24px' }}>
        <span onClick={() => { setChartRow(null) }} style={{ fontSize: 13, color: '#388bfd', cursor: 'pointer' }}>← {sel.name} by Country</span>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 28 }}>{chartRow.flag}</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#c9d1d9' }}>{sel.name}</div>
            <div style={{ fontSize: 12, color: '#8b949e' }}>{chartRow.country}</div>
          </div>
          {v.length > 0 && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 500, color: '#c9d1d9', fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace", fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>{cur.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span style={{ fontSize: 14, color: '#484f58', fontWeight: 400 }}>{sel.unit}</span></div>
              <div style={{ fontSize: 13, color: chg >= 0 ? '#3fb950' : '#f85149', fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>{chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}</div>
            </div>
          )}
        </div>

        {loading ? <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>Loading...</div>
         : chartData ? <TvLineChart title="" sub={sel.unit} dec={2} height={350} fill dates={chartData.dates} lines={[{ label: sel.name, color: '#388bfd', data: chartData.values }]} refs={[]} />
         : <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>No data</div>}
        <div style={{ marginTop: 16, fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>{sel.desc}</div>
      </div>
    )
  }

  // ── Country table for selected indicator ──
  if (sel) {
    return (
      <div style={{ padding: '20px 24px' }}>
        <span onClick={() => setSel(null)} style={{ fontSize: 13, color: '#388bfd', cursor: 'pointer' }}>← Global Indicators</span>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#c9d1d9', marginTop: 8, marginBottom: 12 }}>{sel.name} <span style={{ fontSize: 13, color: '#8b949e', fontWeight: 400 }}>by Country</span></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['Country','Last','Previous','Reference','Unit'].map((h, i) => (
              <th key={h} style={{ padding: '8px 10px', textAlign: i === 0 ? 'left' : 'right', fontSize: 11, color: '#484f58', fontWeight: 500, letterSpacing: '0.6px', textTransform: 'uppercase', borderBottom: '1px solid #21262d', background: '#161b22', position: 'sticky', top: 0 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {sel.rows.map((r, i) => {
              const v = vals[r.fred]
              const chg = v ? v.last - v.prev : 0
              return (
                <tr key={r.fred} onClick={() => openChart(r)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #161b22', background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent', transition: 'background 100ms ease-out' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,139,253,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent')}>
                  <td style={{ padding: '0 12px', height: 32, fontSize: 12 }}>
                    <span style={{ marginRight: 8, display: 'inline-flex', verticalAlign: 'middle' }}><Flag cc={({'United States':'US','Euro Area':'EA','Germany':'DE','France':'FR','United Kingdom':'GB','Japan':'JP','China':'CN'} as any)[r.country] ?? ''} /></span>
                    <span style={{ color: '#c9d1d9' }}>{r.country}</span>
                  </td>
                  <td style={{ padding: '0 12px', height: 32, textAlign: 'right', fontSize: 12, fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace", fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: chg >= 0 ? '#3fb950' : '#f85149' }}>
                    {v ? v.last.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '···'}
                  </td>
                  <td style={{ padding: '0 12px', height: 32, textAlign: 'right', fontSize: 12, fontFamily: "'SF Mono', Menlo, Consolas, monospace", color: '#8b949e' }}>
                    {v ? v.prev.toLocaleString(undefined, { maximumFractionDigits: 2 }) : ''}
                  </td>
                  <td style={{ padding: '0 12px', height: 32, textAlign: 'right', fontSize: 11, color: '#484f58', fontFamily: "'SF Mono', Menlo, Consolas, monospace", fontVariantNumeric: 'tabular-nums' }}>{v?.date ?? ''}</td>
                  <td style={{ padding: '0 12px', height: 32, textAlign: 'right', fontSize: 11, color: '#484f58' }}>{sel.unit}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 16, fontSize: 13, color: '#8b949e' }}>{sel.desc}</div>
      </div>
    )
  }

  // ── Overview — multi-column layout like TradingEconomics ──
  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#c9d1d9', letterSpacing: '0.02em' }}>GLOBAL INDICATORS</div>
        <DataSource source="FRED · BLS · BEA · ECB" updated={undefined} quality="HIGH" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 40px', alignItems: 'start' }}>
        {CATEGORIES.map(cat => (
          <div key={cat.name} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#c9d1d9', paddingBottom: 4, marginBottom: 2, borderBottom: '1px solid #21262d' }}>{cat.name}</div>
            {cat.items.map(ind => {
              const fv = vals[ind.rows[0]?.fred]
              const chg = fv ? fv.last - fv.prev : 0
              return (
              <div key={ind.name} onClick={() => setSel(ind)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', cursor: 'pointer', borderBottom: '1px solid #161b22' }}
                onMouseEnter={e => { (e.currentTarget.children[0] as HTMLElement).style.color = '#388bfd' }}
                onMouseLeave={e => { (e.currentTarget.children[0] as HTMLElement).style.color = '#8b949e' }}>
                <span style={{ fontSize: 12, color: '#8b949e', transition: 'color 0.06s' }}>{ind.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {fv && <span style={{ fontSize: 11, fontFamily: "'SF Mono', Menlo, Consolas, monospace", color: chg > 0 ? '#3fb950' : chg < 0 ? '#f85149' : '#c9d1d9', fontWeight: 600 }}>
                    {fv.last.toLocaleString(undefined, { maximumFractionDigits: 2 })}{ind.unit === '%' ? '%' : ''}
                  </span>}
                  {fv && <span style={{ fontSize: 8, color: chg > 0 ? '#3fb950' : chg < 0 ? '#f85149' : '#484f58' }}>{chg > 0 ? '▲' : chg < 0 ? '▼' : '—'}</span>}
                  {fv && ind.unit === '%' && <span style={{ fontSize: 10, fontFamily: "'SF Mono', Menlo, Consolas, monospace", color: '#484f58' }}>
                    {chg > 0 ? '+' : ''}{chg.toFixed(2)}
                  </span>}
                </span>
              </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
