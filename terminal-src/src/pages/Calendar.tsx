// pages/Calendar.tsx — Exact TradingEconomics calendar layout
import { useState, useMemo } from 'react'
import { TvLineChart } from '@/components/charts/TvLineChart'
import { Flag } from '@/components/common/Flag'

interface Evt {
  date: string; time: string; cc: string; flag: string; name: string; ref: string
  impact: 'high'|'medium'|'low'
  actual?: string; previous: string; consensus: string
  fred?: string; unit?: string; desc: string
}

function gen(): Evt[] {
  const r: Evt[] = []
  const now = new Date(), y = now.getFullYear(), m = now.getMonth()
  for (let mo = m; mo <= m + 2; mo++) {
    const mm = ((mo % 12) + 12) % 12, yy = y + Math.floor(mo / 12)
    const MO = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][mm]
    const p = (d: number) => `${yy}-${String(mm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

    r.push(
      // US
      { date:p(1),  time:'10:00 AM', cc:'US', flag:'🇺🇸', name:'ISM Manufacturing PMI', ref:MO, impact:'high', previous:'50.3', consensus:'50.5', desc:'>50 expansion.'},
      { date:p(7),  time:'08:30 AM', cc:'US', flag:'🇺🇸', name:'Non-Farm Payrolls', ref:MO, impact:'high', previous:'256K', consensus:'170K', fred:'PAYEMS', unit:'K', desc:'THE jobs report.'},
      { date:p(7),  time:'08:30 AM', cc:'US', flag:'🇺🇸', name:'Unemployment Rate', ref:MO, impact:'high', previous:'4.1%', consensus:'4.1%', fred:'UNRATE', unit:'%', desc:'Rising = recession.'},
      { date:p(10), time:'08:30 AM', cc:'US', flag:'🇺🇸', name:'Initial Jobless Claims', ref:MO, impact:'medium', previous:'219K', consensus:'215K', fred:'ICSA', unit:'K', desc:'Weekly layoffs.'},
      { date:p(12), time:'08:30 AM', cc:'US', flag:'🇺🇸', name:'Inflation Rate YoY', ref:MO, impact:'high', previous:'2.8%', consensus:'2.7%', fred:'CPIAUCSL', unit:'Index', desc:'Fed target 2%.'},
      { date:p(12), time:'08:30 AM', cc:'US', flag:'🇺🇸', name:'Core Inflation Rate MoM', ref:MO, impact:'high', previous:'0.3%', consensus:'0.2%', fred:'CPILFESL', unit:'Index', desc:'Sticky inflation signal.'},
      { date:p(14), time:'08:30 AM', cc:'US', flag:'🇺🇸', name:'PPI MoM', ref:MO, impact:'medium', previous:'0.2%', consensus:'0.1%', fred:'PPIACO', unit:'Index', desc:'Leads CPI.'},
      { date:p(15), time:'08:30 AM', cc:'US', flag:'🇺🇸', name:'Retail Sales MoM', ref:MO, impact:'medium', previous:'0.4%', consensus:'0.3%', fred:'RSXFS', unit:'M$', desc:'Consumer spending.'},
      { date:p(18), time:'02:00 PM', cc:'US', flag:'🇺🇸', name:'Fed Interest Rate Decision', ref:MO, impact:'high', previous:'4.50%', consensus:'4.50%', fred:'FEDFUNDS', unit:'%', desc:'THE event.'},
      { date:p(22), time:'08:30 AM', cc:'US', flag:'🇺🇸', name:'PCE Price Index YoY', ref:MO, impact:'high', previous:'2.5%', consensus:'2.4%', fred:'PCEPI', unit:'Index', desc:'Fed preferred gauge.'},
      { date:p(25), time:'08:30 AM', cc:'US', flag:'🇺🇸', name:'GDP Growth Rate QoQ', ref:MO, impact:'high', previous:'3.1%', consensus:'2.3%', fred:'A191RL1Q225SBEA', unit:'%', desc:'2 neg = recession.'},
      { date:p(28), time:'10:00 AM', cc:'US', flag:'🇺🇸', name:'Consumer Confidence', ref:MO, impact:'medium', previous:'104.7', consensus:'105.0', fred:'UMCSENT', unit:'Index', desc:'Leads spending.'},
      // EU
      { date:p(2),  time:'10:00 AM', cc:'EA', flag:'🇪🇺', name:'Inflation Rate YoY Flash', ref:MO, impact:'high', previous:'2.4%', consensus:'2.3%', fred:'CP0000EZ19M086NEST', unit:'%', desc:'ECB target 2%.'},
      { date:p(5),  time:'01:45 PM', cc:'EA', flag:'🇪🇺', name:'ECB Interest Rate Decision', ref:MO, impact:'high', previous:'2.90%', consensus:'2.65%', fred:'ECBMLFR', unit:'%', desc:'Europe central bank.'},
      { date:p(20), time:'09:00 AM', cc:'EA', flag:'🇪🇺', name:'S&P Global Composite PMI Flash', ref:MO, impact:'medium', previous:'50.2', consensus:'50.4', desc:'EU economic health.'},
      // DE
      { date:p(9),  time:'02:00 PM', cc:'DE', flag:'🇩🇪', name:'Inflation Rate YoY Prel', ref:MO, impact:'high', previous:'2.3%', consensus:'2.3%', fred:'CPHPTT01DEM659N', unit:'%', desc:'Largest EU economy.'},
      { date:p(20), time:'09:30 AM', cc:'DE', flag:'🇩🇪', name:'HCOB Manufacturing PMI Flash', ref:MO, impact:'medium', previous:'46.5', consensus:'47.0', desc:'German factories.'},
      { date:p(24), time:'09:00 AM', cc:'DE', flag:'🇩🇪', name:'Ifo Business Climate', ref:MO, impact:'medium', previous:'86.3', consensus:'86.4', desc:'Key sentiment.'},
      { date:p(26), time:'07:00 AM', cc:'DE', flag:'🇩🇪', name:'GfK Consumer Confidence', ref:'APR', impact:'medium', previous:'-24.7', consensus:'-27', desc:'German consumer mood.'},
      // FR
      { date:p(11), time:'08:45 AM', cc:'FR', flag:'🇫🇷', name:'Inflation Rate YoY Prel', ref:MO, impact:'medium', previous:'0.9%', consensus:'1.3%', fred:'CPHPTT01FRM659N', unit:'%', desc:'France CPI.'},
      // GB
      { date:p(16), time:'07:00 AM', cc:'GB', flag:'🇬🇧', name:'Inflation Rate YoY', ref:'FEB', impact:'high', previous:'3%', consensus:'3.0%', fred:'CPHPTT01GBM659N', unit:'%', desc:'BOE watches closely.'},
      { date:p(21), time:'07:00 AM', cc:'GB', flag:'🇬🇧', name:'Retail Sales MoM', ref:'FEB', impact:'medium', previous:'-0.4%', consensus:'-0.3%', desc:'UK consumer.'},
      { date:p(20), time:'09:30 AM', cc:'GB', flag:'🇬🇧', name:'S&P Global Manufacturing PMI Flash', ref:MO, impact:'medium', previous:'51.7', consensus:'51.1', desc:'UK factories.'},
      // JP
      { date:p(19), time:'12:00 AM', cc:'JP', flag:'🇯🇵', name:'BoJ Interest Rate Decision', ref:MO, impact:'high', previous:'0.50%', consensus:'0.50%', fred:'IRSTCB01JPM156N', unit:'%', desc:'Carry trade risk.'},
      { date:p(21), time:'11:30 PM', cc:'JP', flag:'🇯🇵', name:'Inflation Rate YoY', ref:'FEB', impact:'medium', previous:'3.6%', consensus:'3.4%', fred:'JPNCPIALLMINMEI', unit:'Index', desc:'Rising after deflation.'},
      // CN
      { date:p(1),  time:'01:30 AM', cc:'CN', flag:'🇨🇳', name:'NBS Manufacturing PMI', ref:MO, impact:'high', previous:'50.2', consensus:'50.1', desc:'China factory activity.'},
      { date:p(9),  time:'01:30 AM', cc:'CN', flag:'🇨🇳', name:'Inflation Rate YoY', ref:'FEB', impact:'medium', previous:'0.7%', consensus:'0.8%', fred:'CHNCPIALLMINMEI', unit:'Index', desc:'Deflation = demand problem.'},
      { date:p(15), time:'02:00 AM', cc:'CN', flag:'🇨🇳', name:'GDP Growth Rate YoY', ref:'Q1', impact:'high', previous:'5.4%', consensus:'5.0%', desc:'World 2nd economy.'},
    )
  }
  return r.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

export function Calendar() {
  const events = useMemo(() => gen(), [])
  const [cF, setCF] = useState('all')
  const [iF, setIF] = useState('all')
  const [chart, setChart] = useState<Evt | null>(null)
  const [chartData, setChartData] = useState<{ dates: string[]; values: number[] } | null>(null)
  const [cLoad, setCLoad] = useState(false)

  const now = new Date().toISOString().slice(0, 10)
  const fil = events.filter(e => e.date >= now).filter(e => cF === 'all' || e.cc === cF).filter(e => iF === 'all' || e.impact === iF)
  const days: Record<string, Evt[]> = {}
  fil.forEach(e => { (days[e.date] ??= []).push(e) })

  const open = (e: Evt) => {
    if (!e.fred) return
    setChart(e); setCLoad(true); setChartData(null)
    fetch(`/api/indicator/${e.fred}`).then(r => r.json()).then(j => { if (j?.data?.dates) setChartData({ dates: j.data.dates, values: j.data.values }); setCLoad(false) }).catch(() => setCLoad(false))
  }

  // Chart view
  if (chart) {
    const v = chartData?.values ?? [], cur = v[v.length - 1] ?? 0, prv = v.length > 2 ? v[v.length - 2] : cur
    return (
      <div style={{ padding: '20px 24px' }}>
        <span onClick={() => setChart(null)} style={{ fontSize: 13, color: '#388bfd', cursor: 'pointer' }}>← Back to Calendar</span>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>{chart.flag}</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#c9d1d9' }}>{chart.name}</div>
            <div style={{ fontSize: 12, color: '#8b949e' }}>{chart.cc} · Previous: {chart.previous} · Consensus: {chart.consensus}</div>
          </div>
          {v.length > 0 && <div style={{ marginLeft: 'auto', fontSize: 28, fontWeight: 600, color: '#c9d1d9', fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>{cur.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>}
        </div>
        {cLoad ? <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>Loading...</div>
         : chartData ? <TvLineChart title="" sub={chart.unit ?? ''} dec={2} height={350} fill lines={[{ label: chart.name, color: '#388bfd', data: chartData.values }]} refs={[]} />
         : <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>No data</div>}
        <div style={{ marginTop: 16, fontSize: 13, color: '#8b949e' }}>{chart.desc}</div>
      </div>
    )
  }

  // Calendar
  const CB: [string, string][] = [['all','All'],['US','US'],['EA','EU'],['DE','DE'],['FR','FR'],['GB','GB'],['JP','JP'],['CN','CN']]
  const FLAG_IMG: Record<string, string> = { US:'🇺🇸', EA:'🇪🇺', DE:'🇩🇪', FR:'🇫🇷', GB:'🇬🇧', JP:'🇯🇵', CN:'🇨🇳' }
  const impDot: Record<string, string> = { high: '#f85149', medium: '#d29922', low: '#484f58' }
  const mono = "'SF Mono', 'Fira Code', Menlo, Consolas, monospace"

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#c9d1d9', letterSpacing: '0.02em', marginBottom: 16 }}>ECONOMIC CALENDAR</div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', border: '1px solid #21262d' }}>
          {CB.map(([c, label]) => (
            <span key={c} onClick={() => setCF(c)}
              style={{ padding: '5px 10px', fontSize: 11, cursor: 'pointer', borderRight: '1px solid #21262d',
                background: cF === c ? '#1c2128' : 'transparent', color: cF === c ? '#c9d1d9' : '#484f58', fontWeight: cF === c ? 500 : 400,
                display: 'flex', alignItems: 'center', gap: 4 }}>
              {c !== 'all' && <span style={{ fontSize: 12, opacity: 0.8 }}>{FLAG_IMG[c]}</span>}
              {label}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', border: '1px solid #21262d' }}>
          {(['all','high','medium'] as const).map(k => (
            <span key={k} onClick={() => setIF(k)}
              style={{ padding: '5px 10px', fontSize: 11, cursor: 'pointer', borderRight: '1px solid #21262d',
                background: iF === k ? '#1c2128' : 'transparent', color: iF === k ? '#c9d1d9' : '#484f58', fontWeight: iF === k ? 500 : 400,
                display: 'flex', alignItems: 'center', gap: 5 }}>
              {k !== 'all' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: k === 'high' ? '#f85149' : '#d29922', flexShrink: 0 }} />}
              {k === 'all' ? 'All' : k === 'high' ? 'High' : 'Medium'}
            </span>
          ))}
        </div>
      </div>

      {/* Column header */}
      <div style={{ display: 'grid', gridTemplateColumns: '68px 16px 26px 8px 1fr 80px 80px 80px', padding: '0 0 6px', borderBottom: '1px solid #30363d' }}>
        <span style={{ fontSize: 10, color: '#484f58', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>Time</span>
        <span /><span /><span />
        <span style={{ fontSize: 10, color: '#484f58', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>Event</span>
        <span style={{ fontSize: 10, color: '#484f58', fontWeight: 500, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.4 }}>Actual</span>
        <span style={{ fontSize: 10, color: '#484f58', fontWeight: 500, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.4 }}>Previous</span>
        <span style={{ fontSize: 10, color: '#484f58', fontWeight: 500, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.4 }}>Forecast</span>
      </div>

      {/* Day groups */}
      {Object.entries(days).slice(0, 30).map(([d, evts]) => {
        const dt = new Date(d + 'T12:00:00')
        const isToday = d === now
        return (
          <div key={d}>
            {/* Date header */}
            <div style={{ padding: '14px 0 6px', fontSize: 12, fontWeight: 500, color: isToday ? '#388bfd' : '#8b949e', borderBottom: '1px solid #21262d', letterSpacing: '0.01em' }}>
              {isToday && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#388bfd', display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />}
              {dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            {/* Event rows */}
            {evts.map((e, i) => (
              <div key={i} onClick={() => open(e)}
                style={{ display: 'grid', gridTemplateColumns: '68px 16px 26px 8px 1fr 80px 80px 80px', alignItems: 'center', height: 38, borderBottom: '1px solid #161b22', cursor: e.fred ? 'pointer' : 'default', transition: 'background 0.06s' }}
                onMouseEnter={ev => (ev.currentTarget.style.background = '#1c2128')}
                onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                {/* Time */}
                <span style={{ fontSize: 10, fontWeight: 500, color: '#8b949e', background: '#161b22', padding: '3px 6px', textAlign: 'center', fontFamily: mono, letterSpacing: '0.01em' }}>{e.time}</span>
                {/* Flag */}
                <span style={{ display: 'flex', alignItems: 'center' }}><Flag cc={e.cc} /></span>
                {/* CC */}
                <span style={{ fontSize: 10, color: '#484f58', fontWeight: 500, letterSpacing: '0.03em' }}>{e.cc}</span>
                {/* Impact dot */}
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: impDot[e.impact], flexShrink: 0 }} />
                </span>
                {/* Name + ref */}
                <span style={{ fontSize: 12, color: '#c9d1d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.name} <span style={{ color: '#484f58', fontSize: 10 }}>{e.ref}</span>
                </span>
                {/* Actual */}
                <span style={{ fontSize: 12, fontFamily: mono, fontWeight: 500, color: '#3fb950', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.actual ?? ''}</span>
                {/* Previous with directional arrow */}
                <span style={{ fontSize: 12, fontFamily: mono, color: '#8b949e', textAlign: 'right', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                  {e.previous}
                  {(() => {
                    const pv = parseFloat(e.previous), cv = parseFloat(e.consensus)
                    if (isNaN(pv) || isNaN(cv)) return null
                    if (cv > pv) return <span style={{ fontSize: 7, color: '#3fb950' }}>▲</span>
                    if (cv < pv) return <span style={{ fontSize: 7, color: '#f85149' }}>▼</span>
                    return null
                  })()}
                </span>
                {/* Consensus */}
                <span style={{ fontSize: 12, fontFamily: mono, color: '#c9d1d9', fontWeight: 500, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.consensus}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
