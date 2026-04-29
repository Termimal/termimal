// pages/Portfolio.tsx — Multi-portfolio, TradingView style
import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { fetchPriceHistory } from '@/api/client'
import { TvCandleChart } from '@/components/charts/TvCandleChart'
import { PortfolioNews } from '@/components/portfolio/PortfolioNews'
import { Logo } from '@/components/common/Logo'

interface Position { id: string; symbol: string; shares: number; entry: number; date: string }
interface PortfolioMeta { id: string; name: string; createdAt: string }

const META_KEY = 'ft-portfolios-meta'
function loadMeta(): PortfolioMeta[] { try { return JSON.parse(localStorage.getItem(META_KEY) || '[]') } catch { return [] } }
function saveMeta(m: PortfolioMeta[]) { localStorage.setItem(META_KEY, JSON.stringify(m)) }
function posKey(id: string) { return `ft-portfolio-${id}` }
function loadPositions(id: string): Position[] {
  try {
    const raw = JSON.parse(localStorage.getItem(posKey(id)) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.map((p: any, i: number) => ({ id: p.id || `m-${Date.now()}-${i}`, symbol: p.symbol || p.sym || '', shares: +p.shares||0, entry: +p.entry||0, date: p.date||'' })).filter(p => p.symbol && p.shares > 0 && p.entry > 0)
  } catch { return [] }
}
function savePositions(id: string, p: Position[]) { localStorage.setItem(posKey(id), JSON.stringify(p)) }

// Migrate old single portfolio
;(function migrate() {
  const old = localStorage.getItem('ft-portfolio')
  if (!old) return
  try {
    const pos = JSON.parse(old)
    if (!Array.isArray(pos) || pos.length === 0) { localStorage.removeItem('ft-portfolio'); return }
    if (loadMeta().length > 0) { localStorage.removeItem('ft-portfolio'); return }
    const id = `pf-${Date.now()}`
    saveMeta([{ id, name: 'My Portfolio', createdAt: new Date().toISOString() }])
    savePositions(id, pos)
    localStorage.removeItem('ft-portfolio')
  } catch { localStorage.removeItem('ft-portfolio') }
})()

const SECTORS: Record<string,string> = { AAPL:'Tech',MSFT:'Tech',NVDA:'Tech',GOOGL:'Tech',META:'Tech',AMZN:'Tech',AMD:'Tech',PLTR:'Tech',TSLA:'Auto',JPM:'Finance',BAC:'Finance',GS:'Finance',XOM:'Energy',CVX:'Energy',JNJ:'Health',PFE:'Health',UNH:'Health',WMT:'Consumer',KO:'Consumer',PG:'Consumer',CAT:'Industrial' }
const SCOL: Record<string,string> = { Tech:'#34d399',Finance:'#d29922',Energy:'#f85149',Auto:'#3fb950',Health:'#7c4dff',Consumer:'#00bcd4',Industrial:'#8bc34a',Other:'#8b949e' }
const mono = "'SF Mono', Menlo, Consolas, monospace"
const fmtUsd = (n: number) => (n>=0?'':'-')+'$'+Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtShort = (n: number) => { const a=Math.abs(n),s=n<0?'-':''; return a>=1e6?`${s}$${(a/1e6).toFixed(2)}M`:a>=1000?`${s}$${(a/1000).toFixed(1)}K`:`${s}$${a.toFixed(2)}` }

function PositionSizer({ portfolioValue }: { portfolioValue: number }) {
  const [riskPct,setRiskPct]=useState('1'),[entryPrice,setEntryPrice]=useState(''),[stopPrice,setStopPrice]=useState('')
  const rp=+riskPct,ep=+entryPrice,sp=+stopPrice,pf=portfolioValue
  const valid=pf>0&&rp>0&&ep>0&&sp>0&&ep!==sp
  const rps=valid?Math.abs(ep-sp):0,maxRisk=pf*(rp/100),shares=valid?Math.floor(maxRisk/rps):0,posSize=shares*ep
  const inp={background:'#0e1117',border:'1px solid #21262d',color:'#c9d1d9',fontSize:12,padding:'6px 10px',borderRadius:2,outline:'none'} as const
  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <div><div style={{fontSize:10,color:'#8b949e',marginBottom:3}}>Risk %</div><input value={riskPct} onChange={e=>setRiskPct(e.target.value)} type="number" step="0.1" style={{...inp,width:70}}/></div>
        <div><div style={{fontSize:10,color:'#8b949e',marginBottom:3}}>Entry</div><input value={entryPrice} onChange={e=>setEntryPrice(e.target.value)} type="number" step="0.01" placeholder="150.00" style={{...inp,width:90}}/></div>
        <div><div style={{fontSize:10,color:'#8b949e',marginBottom:3}}>Stop Loss</div><input value={stopPrice} onChange={e=>setStopPrice(e.target.value)} type="number" step="0.01" placeholder="145.00" style={{...inp,width:90}}/></div>
      </div>
      {valid&&<div style={{display:'flex',gap:12,fontSize:11,flexWrap:'wrap'}}>
        <span style={{color:'#34d399'}}>Shares: <b>{shares}</b></span>
        <span style={{color:'#c9d1d9'}}>Size: <b>${posSize.toLocaleString(undefined,{maximumFractionDigits:0})}</b> ({(posSize/pf*100).toFixed(1)}%)</span>
        <span style={{color:'#f85149'}}>Max Risk: <b>${maxRisk.toFixed(0)}</b></span>
        <span style={{color:'#3fb950'}}>1R: ${(ep+rps).toFixed(2)} · 2R: ${(ep+rps*2).toFixed(2)} · 3R: ${(ep+rps*3).toFixed(2)}</span>
      </div>}
    </div>
  )
}

function PortfolioHub({ metas, onSelect, onCreate, onDelete, prices }: { metas: PortfolioMeta[]; onSelect:(id:string)=>void; onCreate:(name:string)=>void; onDelete:(id:string)=>void; prices:Record<string,any> }) {
  const [creating,setCreating]=useState(false),[newName,setNewName]=useState('')
  const cards=metas.map(m=>{
    const pos=loadPositions(m.id)
    const tv=pos.reduce((s,p)=>s+(prices[p.symbol]?.price??p.entry)*p.shares,0)
    const tc=pos.reduce((s,p)=>s+p.entry*p.shares,0)
    const pnl=tv-tc,pct=tc>0?(pnl/tc)*100:0
    return {...m,pos,tv,pnl,pct}
  })
  const submit=()=>{ if(!newName.trim())return; onCreate(newName.trim()); setNewName(''); setCreating(false) }
  return (
    <div style={{padding:'20px 24px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <span style={{fontSize:15,fontWeight:600,color:'#c9d1d9',letterSpacing:'0.03em'}}>PORTFOLIOS</span>
        <button onClick={()=>setCreating(true)} style={{fontSize:11,padding:'6px 14px',background:'#34d399',color:'#fff',border:'none',cursor:'pointer',borderRadius:2,fontWeight:500}}>+ New Portfolio</button>
      </div>
      {creating&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setCreating(false)}>
          <div style={{background:'#161b22',border:'1px solid #30363d',padding:'24px 28px',minWidth:340}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:600,color:'#c9d1d9',marginBottom:16}}>New Portfolio</div>
            <div style={{fontSize:11,color:'#8b949e',marginBottom:6}}>Portfolio name</div>
            <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit();if(e.key==='Escape')setCreating(false)}} placeholder="e.g. Tech Growth, Dividends, Swing Trades…" style={{width:'100%',background:'#0e1117',border:'1px solid #21262d',color:'#c9d1d9',fontSize:13,padding:'8px 10px',outline:'none',borderRadius:2,boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8,marginTop:16,justifyContent:'flex-end'}}>
              <button onClick={()=>setCreating(false)} style={{fontSize:11,padding:'6px 14px',background:'transparent',color:'#8b949e',border:'1px solid #30363d',cursor:'pointer',borderRadius:2}}>Cancel</button>
              <button onClick={submit} style={{fontSize:11,padding:'6px 14px',background:'#34d399',color:'#fff',border:'none',cursor:'pointer',borderRadius:2}}>Create</button>
            </div>
          </div>
        </div>
      )}
      {cards.length===0
        ? <div style={{textAlign:'center',padding:'60px 20px',background:'#0e1117',border:'1px solid #21262d'}}>
            <div style={{fontSize:14,color:'#c9d1d9',marginBottom:6}}>No portfolios yet</div>
            <div style={{fontSize:11,color:'#484f58',marginBottom:20}}>Create your first portfolio to start tracking performance</div>
            <button onClick={()=>setCreating(true)} style={{fontSize:12,padding:'8px 20px',background:'#34d399',color:'#fff',border:'none',cursor:'pointer',borderRadius:2}}>+ Create Portfolio</button>
          </div>
        : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
            {cards.map(c=>(
              <div key={c.id} onClick={()=>onSelect(c.id)} style={{background:'#0e1117',border:'1px solid #21262d',padding:'16px 18px',cursor:'pointer',position:'relative',transition:'border-color .1s'}}
                onMouseEnter={e=>(e.currentTarget.style.borderColor='#30363d')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#21262d')}>
                <span onClick={e=>{e.stopPropagation();if(window.confirm(`Delete "${c.name}"?`))onDelete(c.id)}} style={{position:'absolute',top:10,right:10,color:'#30363d',cursor:'pointer',fontSize:16,lineHeight:1,padding:'2px 4px'}}
                  onMouseEnter={e=>(e.currentTarget.style.color='#f85149')} onMouseLeave={e=>(e.currentTarget.style.color='#30363d')}>×</span>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#c9d1d9'}}>{c.name}</span>
                  {c.pos.length>0&&<span style={{fontSize:9,color:'#484f58',background:'#161b22',border:'1px solid #21262d',padding:'1px 6px',borderRadius:2}}>{c.pos.length} holdings</span>}
                </div>
                {c.pos.length===0
                  ? <div style={{fontSize:11,color:'#484f58'}}>Empty — click to add positions</div>
                  : <>
                      <div style={{fontSize:22,fontWeight:500,color:'#c9d1d9',fontFamily:mono,fontVariantNumeric:'tabular-nums',letterSpacing:-0.3,marginBottom:3}}>{fmtShort(c.tv)}</div>
                      <div style={{fontSize:12,color:c.pnl>=0?'#3fb950':'#f85149',fontFamily:mono}}>{c.pnl>=0?'+':''}{fmtShort(c.pnl)} ({c.pct>=0?'+':''}{c.pct.toFixed(2)}%)</div>
                      <div style={{display:'flex',gap:14,marginTop:10}}>
                        <div><div style={{fontSize:9,color:'#484f58',marginBottom:2}}>YIELD</div><div style={{fontSize:11,color:c.pct>=0?'#3fb950':'#f85149',fontFamily:mono}}>{c.pct>=0?'+':''}{c.pct.toFixed(2)}%</div></div>
                        <div><div style={{fontSize:9,color:'#484f58',marginBottom:2}}>HOLDINGS</div><div style={{fontSize:11,color:'#c9d1d9',fontFamily:mono}}>{c.pos.length}</div></div>
                      </div>
                      <div style={{marginTop:10,fontSize:9,color:'#484f58'}}>Updated {new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                    </>}
              </div>
            ))}
          </div>}
    </div>
  )
}

function PortfolioDetail({ meta, onBack, prices }: { meta: PortfolioMeta; onBack:()=>void; prices:Record<string,any> }) {
  const navigate=useNavigate()
  const [positions,setPositions]=useState<Position[]>(()=>loadPositions(meta.id))
  const [showAdd,setShowAdd]=useState(false),[addMode,setAddMode]=useState<''|'manual'|'watchlist'|'csv'>('')
  const [sym,setSym]=useState(''),[shares,setShares]=useState(''),[entry,setEntry]=useState('')
  const [date,setDate]=useState(new Date().toISOString().slice(0,10))
  const [distTab,setDistTab]=useState<'sectors'|'assets'>('sectors')
  const [chartPeriod,setChartPeriod]=useState('3mo'),[chartData,setChartData]=useState<any>(null),[chartLoading,setChartLoading]=useState(false)
  const watchlist=useStore(s=>s.watchlist)
  const csvRef=useRef<HTMLInputElement>(null)
  const sv=(p:Position[])=>{setPositions(p);savePositions(meta.id,p)}

  useEffect(()=>{
    if(positions.length===0){setChartData(null);return}
    let cancelled=false;setChartLoading(true)
    const syms=[...new Set(positions.map(p=>p.symbol))]
    const sm:Record<string,number>={}
    positions.forEach(p=>{sm[p.symbol]=(sm[p.symbol]??0)+p.shares})
    Promise.all(syms.map(s=>fetchPriceHistory(s,chartPeriod as any))).then(results=>{
      if(cancelled)return
      const dm:Record<string,number>={}
      results.forEach((hist,idx)=>{
        if(!hist?.dates?.length)return
        const s=syms[idx];const sh=sm[s]??0
        hist.dates.forEach((d:string,i:number)=>{const dk=d.slice(0,10);dm[dk]=(dm[dk]??0)+hist.close[i]*sh})
      })
      const sd=Object.keys(dm).sort()
      if(sd.length<2){setChartData(null);setChartLoading(false);return}
      const closes=sd.map(d=>dm[d])
      const cost=positions.reduce((s,p)=>s+p.entry*p.shares,0)
      const line=closes.map(v=>+(v-cost).toFixed(2))
      setChartData({dates:sd,open:line,high:line,low:line,close:line,volume:closes.map(()=>0)})
      setChartLoading(false)
    }).catch(()=>setChartLoading(false))
    return()=>{cancelled=true}
  },[positions,chartPeriod])

  const add=()=>{
    if(!sym||!shares||!entry)return
    sv([...positions,{id:Date.now().toString(),symbol:sym.toUpperCase(),shares:+shares,entry:+entry,date}])
    setSym('');setShares('');setEntry('');setShowAdd(false)
  }

  const handleCSV=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];if(!file)return
    const reader=new FileReader()
    reader.onload=(ev)=>{
      const text=ev.target?.result as string
      const lines=text.split('\n').map(l=>l.trim()).filter(Boolean)
      if(lines.length<2)return
      const hdr=lines[0].toLowerCase().split(/[,;\t]/)
      const si=hdr.findIndex(h=>h.includes('symbol')||h.includes('ticker'))
      const qi=hdr.findIndex(h=>h.includes('share')||h.includes('qty'))
      const pi=hdr.findIndex(h=>h.includes('price')||h.includes('entry'))
      const di=hdr.findIndex(h=>h.includes('date'))
      const newPos:Position[]=[]
      for(let i=1;i<lines.length;i++){
        const cols=lines[i].split(/[,;\t]/)
        const s=(cols[si>=0?si:0]??'').toUpperCase().trim()
        const sh=parseFloat(cols[qi>=0?qi:1]??'0')
        const pr=parseFloat(cols[pi>=0?pi:2]??'0')
        const dt=cols[di>=0?di:3]?.trim()||new Date().toISOString().slice(0,10)
        if(s&&sh>0&&pr>0)newPos.push({id:Date.now().toString()+i,symbol:s,shares:sh,entry:pr,date:dt})
      }
      if(newPos.length>0)sv([...positions,...newPos])
      setAddMode('');setShowAdd(false)
    }
    reader.readAsText(file)
    if(csvRef.current)csvRef.current.value=''
  }

  const rows=useMemo(()=>positions.map(p=>{
    const live=prices[p.symbol]?.price??p.entry
    const pnl=(live-p.entry)*p.shares,pnlPct=((live-p.entry)/p.entry)*100
    const value=live*p.shares,cost=p.entry*p.shares,dayChg=prices[p.symbol]?.pct??0
    return{...p,live,pnl,pnlPct,value,cost,dayChg,sector:SECTORS[p.symbol]??'Other'}
  }),[positions,prices])

  const tv=rows.reduce((s,r)=>s+r.value,0),tc=rows.reduce((s,r)=>s+r.cost,0)
  const tPnl=tv-tc,tPct=tc>0?(tPnl/tc)*100:0
  const dayPnl=rows.reduce((s,r)=>s+r.live*r.shares*r.dayChg/100,0)
  const sorted=[...rows].sort((a,b)=>b.dayChg-a.dayChg)
  const gainers=sorted.filter(r=>r.dayChg>0).slice(0,5)
  const losers=[...rows].sort((a,b)=>a.dayChg-b.dayChg).filter(r=>r.dayChg<0).slice(0,5)
  const maxAbs=Math.max(...sorted.map(r=>Math.abs(r.dayChg)),1)
  const sectors=useMemo(()=>{
    const m:Record<string,number>={};rows.forEach(r=>{m[r.sector]=(m[r.sector]??0)+r.value})
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([name,val])=>({name,val,pct:tv>0?(val/tv)*100:0}))
  },[rows,tv])

  const DonutChart=()=>{
    if(!sectors.length)return null
    const r=70,cx=90,cy=90,sw=18,circ=2*Math.PI*r;let cum=0
    return <svg width={180} height={180} viewBox="0 0 180 180">
      {sectors.map(s=>{const pct=s.pct/100,off=circ*cum,len=circ*pct;cum+=pct;return <circle key={s.name} cx={cx} cy={cy} r={r} fill="none" stroke={SCOL[s.name]??'#8b949e'} strokeWidth={sw} strokeDasharray={`${len} ${circ-len}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`}/>})}
      <text x={cx} y={cy-6} textAnchor="middle" fill="#c9d1d9" fontSize="20" fontWeight="600">{rows.length}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fill="#8b949e" fontSize="10">Holdings</text>
    </svg>
  }

  const inp={background:'#0e1117',border:'1px solid #21262d',color:'#c9d1d9',fontSize:12,padding:'6px 10px',borderRadius:2,outline:'none'} as const

  return (
    <div style={{padding:'16px 20px',minHeight:'100%'}}>
      {/* Back */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
        <button onClick={onBack} style={{fontSize:12,color:'#34d399',background:'none',border:'none',cursor:'pointer',padding:0}}>← Portfolios</button>
        <span style={{color:'#30363d'}}>/</span>
        <span style={{fontSize:13,fontWeight:600,color:'#c9d1d9'}}>{meta.name}</span>
      </div>

      {/* Empty state */}
      {rows.length===0&&!showAdd&&(
        <div style={{textAlign:'center',padding:'40px 20px',background:'#0e1117',border:'1px solid #21262d'}}>
          <div style={{fontSize:14,color:'#c9d1d9',marginBottom:6}}>No holdings yet</div>
          <div style={{fontSize:11,color:'#8b949e',marginBottom:24}}>Add positions to start tracking</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,maxWidth:560,margin:'0 auto'}}>
            {([['csv','Upload CSV','From a file'],['manual','Add manually','Enter by hand'],['watchlist','From watchlist','Import from watchlist']] as const).map(([m,label,desc])=>(
              <div key={m} onClick={()=>{setShowAdd(true);setAddMode(m)}} style={{background:'#0e1117',border:'1px solid #21262d',padding:'18px 14px',textAlign:'center',cursor:'pointer'}}
                onMouseEnter={e=>(e.currentTarget.style.borderColor='#30363d')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#21262d')}>
                <div style={{fontSize:12,fontWeight:500,color:'#c9d1d9',marginBottom:4}}>{label}</div>
                <div style={{fontSize:10,color:'#484f58'}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add panel */}
      {showAdd&&(
        <div style={{marginBottom:16,background:'#0e1117',border:'1px solid #21262d',padding:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:500,color:'#c9d1d9'}}>Add position</span>
            <div style={{display:'flex',gap:6}}>
              {(['manual','watchlist','csv'] as const).map(m=>(
                <button key={m} onClick={()=>setAddMode(m)} style={{fontSize:10,padding:'3px 10px',borderRadius:2,border:'1px solid #21262d',cursor:'pointer',background:addMode===m?'#c9d1d9':'transparent',color:addMode===m?'#0e1117':'#8b949e'}}>
                  {m==='csv'?'CSV':m==='manual'?'Manual':'Watchlist'}
                </button>
              ))}
              <button onClick={()=>setShowAdd(false)} style={{fontSize:16,color:'#484f58',background:'none',border:'none',cursor:'pointer',lineHeight:1}}>×</button>
            </div>
          </div>
          {addMode==='manual'&&(
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
              {([['Symbol',sym,setSym,'80px','AAPL'],['Shares',shares,setShares,'80px','10'],['Entry Price',entry,setEntry,'100px','150.00']] as const).map(([label,val,setter,width,ph])=>(
                <div key={label}><div style={{fontSize:10,color:'#8b949e',marginBottom:3}}>{label}</div><input value={val} onChange={e=>(setter as any)(e.target.value)} placeholder={ph} style={{...inp,width}}/></div>
              ))}
              <div><div style={{fontSize:10,color:'#8b949e',marginBottom:3}}>Date</div><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,width:120}}/></div>
              <button onClick={add} style={{padding:'6px 16px',background:'#34d399',color:'#fff',border:'none',cursor:'pointer',fontSize:12,borderRadius:2}}>Add</button>
            </div>
          )}
          {addMode==='watchlist'&&(
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {(() => {
                const wlSyms: string[] = ((watchlist as any[]) || []).map((w: any) => typeof w === 'string' ? w : w?.sym).filter(Boolean)
                if (wlSyms.length === 0) return <span style={{fontSize:11,color:'#484f58'}}>Watchlist is empty — add symbols from the Dashboard or Charts page first</span>
                return wlSyms.map((s: string) => (
                  <button key={s} onClick={()=>{ sv([...positions,{id:Date.now().toString(),symbol:s,shares:1,entry:prices[s]?.price??100,date:new Date().toISOString().slice(0,10)}]); setShowAdd(false); setAddMode('') }}
                    style={{fontSize:11,padding:'6px 12px',background:'#161b22',border:'1px solid #21262d',color:'#c9d1d9',cursor:'pointer',borderRadius:2}}
                    onMouseEnter={e=>(e.currentTarget.style.borderColor='#30363d')}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor='#21262d')}>+ {s}</button>
                ))
              })()}
            </div>
          )}
          {addMode==='csv'&&(
            <div>
              <div style={{fontSize:11,color:'#8b949e',marginBottom:10}}>Columns: <span style={{color:'#c9d1d9'}}>Symbol, Shares, Price, Date</span>. Auto-detects headers.</div>
              <input ref={csvRef} type="file" accept=".csv,.tsv,.txt" onChange={handleCSV} style={{fontSize:12,color:'#8b949e'}}/>
              <div style={{marginTop:10,padding:'8px 12px',background:'#0e1117',fontSize:10,color:'#484f58',fontFamily:mono}}>Symbol,Shares,Price,Date<br/>AAPL,10,150.00,2024-01-15</div>
            </div>
          )}
        </div>
      )}

      {/* Detail */}
      {rows.length>0&&(
        <>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{fontSize:16,fontWeight:600,color:'#c9d1d9'}}>{meta.name}<span style={{fontSize:11,color:'#484f58',fontWeight:400,marginLeft:10}}>{positions.length} positions</span></div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>{setShowAdd(true);setAddMode('manual')}} style={{padding:'7px 16px',fontSize:11,background:'#161b22',color:'#c9d1d9',border:'1px solid #21262d',cursor:'pointer'}}
                onMouseEnter={e=>(e.currentTarget.style.borderColor='#30363d')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#21262d')}>Add position</button>
              <button onClick={()=>{const csv='Symbol,Shares,Price,Date\n'+positions.map(p=>`${p.symbol},${p.shares},${p.entry},${p.date}`).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`${meta.name}.csv`;a.click()}}
                style={{padding:'7px 12px',fontSize:11,background:'transparent',color:'#484f58',border:'1px solid #21262d',cursor:'pointer'}}
                onMouseEnter={e=>(e.currentTarget.style.color='#8b949e')} onMouseLeave={e=>(e.currentTarget.style.color='#484f58')}>Export</button>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
            {[{l:'Portfolio value',v:fmtUsd(tv),sub:`${positions.length} positions`,c:'#c9d1d9'},{l:'Unrealized gain',v:fmtUsd(tPnl),sub:`Day ${fmtUsd(dayPnl)}`,c:tPnl>=0?'#3fb950':'#f85149'},{l:'Total return',v:(tPct>=0?'+':'')+tPct.toFixed(2)+'%',sub:`Cost ${fmtUsd(tc)}`,c:tPct>=0?'#3fb950':'#f85149'},{l:'Day change',v:fmtUsd(dayPnl),sub:`${(dayPnl/Math.max(tv-dayPnl,1)*100).toFixed(2)}% today`,c:dayPnl>=0?'#3fb950':'#f85149'}].map(s=>(
              <div key={s.l} style={{border:'1px solid #21262d',padding:'12px 14px',background:'#161b22',borderRadius:4}}>
                <div style={{fontSize:10,color:'#484f58',marginBottom:6,textTransform:'uppercase',letterSpacing:0.6,fontWeight:500}}>{s.l}</div>
                <div style={{fontSize:20,fontWeight:500,color:s.c,fontFamily:mono,fontVariantNumeric:'tabular-nums',letterSpacing:-0.3}}>{s.v}</div>
                {s.sub&&<div style={{fontSize:10,color:'#484f58',marginTop:4}}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {rows.length>0&&<div style={{display:'flex',gap:0,border:'1px solid #21262d',marginBottom:12}}>
            {[{l:'BEST',v:rows.reduce((a,b)=>a.pnlPct>b.pnlPct?a:b).symbol,n:'+'+rows.reduce((a,b)=>a.pnlPct>b.pnlPct?a:b).pnlPct.toFixed(1)+'%',c:'#3fb950'},{l:'WORST',v:rows.reduce((a,b)=>a.pnlPct<b.pnlPct?a:b).symbol,n:rows.reduce((a,b)=>a.pnlPct<b.pnlPct?a:b).pnlPct.toFixed(1)+'%',c:'#f85149'},{l:'LARGEST',v:rows.reduce((a,b)=>a.value>b.value?a:b).symbol,n:((rows.reduce((a,b)=>a.value>b.value?a:b).value/tv)*100).toFixed(0)+'% wt',c:'#c9d1d9'},{l:'SECTORS',v:String(sectors.length),n:`${positions.length} pos.`,c:'#c9d1d9'}].map(r=>(
              <div key={r.l} style={{flex:1,padding:'6px 10px',borderRight:'1px solid #21262d'}}>
                <div style={{fontSize:8,color:'#484f58',letterSpacing:0.5}}>{r.l}</div>
                <div style={{fontSize:12,fontWeight:500,color:r.c,fontFamily:mono}}>{r.v} <span style={{fontSize:10,fontWeight:400,color:'#484f58'}}>{r.n}</span></div>
              </div>
            ))}
          </div>}

          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:500,color:'#c9d1d9',marginBottom:8}}>Portfolio change</div>
            <div style={{display:'flex',gap:2,marginBottom:8}}>
              {[['1mo','1M'],['3mo','3M'],['6mo','6M'],['1y','1Y'],['max','MAX']].map(([k,l])=>(
                <button key={k} onClick={()=>setChartPeriod(k)} style={{padding:'4px 12px',fontSize:10,cursor:'pointer',borderRadius:2,background:chartPeriod===k?'#c9d1d9':'transparent',color:chartPeriod===k?'#0e1117':'#8b949e',border:`1px solid ${chartPeriod===k?'#c9d1d9':'#21262d'}`,fontWeight:chartPeriod===k?600:400}}>{l}</button>
              ))}
            </div>
            {chartLoading?<div style={{height:200,background:'#161b22',display:'flex',alignItems:'center',justifyContent:'center',color:'#8b949e',fontSize:12}}>Loading...</div>
              :chartData?<TvCandleChart data={chartData} height={200} showVolume={false} chartType="area"/>
              :<div style={{height:200,background:'#161b22',display:'flex',alignItems:'center',justifyContent:'center',color:'#8b949e',fontSize:12}}>No history</div>}
          </div>

          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:500,color:'#c9d1d9',marginBottom:8}}>Holdings</div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid #21262d'}}>
                {['Symbol','Shares','Entry','Current','Value','P/L',''].map(h=><th key={h} style={{padding:'0 8px',height:28,textAlign:h==='Symbol'?'left':'right',color:'#484f58',fontSize:11,fontWeight:500,textTransform:'uppercase',letterSpacing:0.6,borderBottom:'1px solid #21262d',background:'#161b22',position:'sticky',top:0}}>{h}</th>)}
              </tr></thead>
              <tbody>{rows.map(r=>{
                const c=r.pnl>=0?'#3fb950':'#f85149'
                return <tr key={r.id} style={{borderBottom:'1px solid #161b22',height:32}}>
                  <td style={{padding:'4px 8px',fontSize:12,fontWeight:500,color:'#c9d1d9',cursor:'pointer'}} onClick={()=>navigate(`/ticker/${r.symbol}`)}>
                    <span style={{display:'inline-flex',alignItems:'center',gap:7}}><Logo sym={r.symbol}/>{r.symbol}</span>
                  </td>
                  <td style={{padding:'4px 8px',textAlign:'right',fontSize:11,fontFamily:mono,color:'#c9d1d9'}}>{r.shares}</td>
                  <td style={{padding:'4px 8px',textAlign:'right',fontSize:11,fontFamily:mono,color:'#484f58'}}>{r.entry.toFixed(2)}</td>
                  <td style={{padding:'4px 8px',textAlign:'right',fontSize:11,fontFamily:mono,color:'#c9d1d9'}}>{r.live.toFixed(2)}</td>
                  <td style={{padding:'4px 8px',textAlign:'right',fontSize:11,fontFamily:mono,color:'#c9d1d9'}}>{fmtUsd(r.value)}</td>
                  <td style={{padding:'4px 8px',textAlign:'right',fontSize:11,fontFamily:mono,color:c}}>{fmtUsd(r.pnl)} <span style={{fontSize:10}}>{r.pnlPct>=0?'+':''}{r.pnlPct.toFixed(1)}%</span></td>
                  <td style={{padding:'4px 8px',textAlign:'right'}}><button onClick={()=>sv(positions.filter(p=>p.id!==r.id))} style={{fontSize:10,color:'#f85149',background:'none',border:'1px solid #30363d',padding:'1px 6px',cursor:'pointer',opacity:.6}} onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0.6')}>Remove</button></td>
                </tr>
              })}</tbody>
            </table>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            {[['Daily gainers',gainers,'#3fb950'],['Daily losers',losers,'#f85149']].map(([title,list,col])=>(
              <div key={title as string}>
                <div style={{fontSize:12,fontWeight:500,color:'#c9d1d9',marginBottom:10}}>{title as string}</div>
                {(list as typeof rows).length===0?<div style={{fontSize:11,color:'#8b949e'}}>None today</div>
                  :(list as typeof rows).map(r=>(
                    <div key={r.id} onClick={()=>navigate(`/ticker/${r.symbol}`)} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,cursor:'pointer'}}>
                      <Logo sym={r.symbol}/>
                      <span style={{fontSize:11,color:'#c9d1d9',width:50,fontWeight:500,background:'#161b22',padding:'3px 8px',textAlign:'center'}}>{r.symbol}</span>
                      <div style={{flex:1,height:6,background:'#161b22',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',width:`${(Math.abs(r.dayChg)/maxAbs)*100}%`,background:col as string,borderRadius:2}}/></div>
                      <span style={{fontSize:11,color:col as string,fontFamily:mono,width:55,textAlign:'right'}}>{r.dayChg>=0?'+':''}{r.dayChg.toFixed(2)}%</span>
                    </div>
                  ))}
              </div>
            ))}
          </div>

          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:500,color:'#c9d1d9',marginBottom:10}}>Distribution</div>
            <div style={{display:'flex',gap:4,marginBottom:14}}>
              {(['sectors','assets'] as const).map(t=><button key={t} onClick={()=>setDistTab(t)} style={{padding:'5px 14px',fontSize:12,borderRadius:2,border:'1px solid #21262d',cursor:'pointer',background:distTab===t?'#c9d1d9':'transparent',color:distTab===t?'#0e1117':'#8b949e'}}>{t==='sectors'?'Sectors':'Assets'}</button>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'180px 1fr',gap:20,alignItems:'start'}}>
              <DonutChart/>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:'1px solid #21262d'}}>
                  {(distTab==='sectors'?['Sector','Value','Allocation','P/L']:['Symbol','Shares','Entry','Current','Value','Weight','P/L','']).map(h=><th key={h} style={{padding:'0 8px',height:28,textAlign:h==='Sector'||h==='Symbol'?'left':'right',color:'#484f58',fontSize:11,fontWeight:500,textTransform:'uppercase',letterSpacing:0.6,borderBottom:'1px solid #21262d'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {distTab==='sectors'?sectors.map(s=>{
                    const sp=rows.filter(r=>r.sector===s.name).reduce((sum,r)=>sum+r.pnl,0)
                    return <tr key={s.name} style={{borderBottom:'1px solid #21262d'}}>
                      <td style={{padding:'8px',fontSize:12,color:'#c9d1d9'}}><span style={{width:8,height:8,borderRadius:'50%',background:SCOL[s.name]??'#8b949e',display:'inline-block',marginRight:6}}/>{s.name}</td>
                      <td style={{padding:'8px',textAlign:'right',color:'#c9d1d9',fontFamily:mono,fontSize:12}}>{fmtUsd(s.val)}</td>
                      <td style={{padding:'8px',textAlign:'right',color:'#c9d1d9',fontFamily:mono,fontSize:12}}>{s.pct.toFixed(1)}%</td>
                      <td style={{padding:'8px',textAlign:'right',color:sp>=0?'#3fb950':'#f85149',fontFamily:mono,fontSize:12}}>{fmtUsd(sp)}</td>
                    </tr>
                  }):rows.map(r=>{
                    const col=r.pnl>=0?'#3fb950':'#f85149'
                    return <tr key={r.id} style={{borderBottom:'1px solid #21262d',cursor:'pointer'}} onClick={()=>navigate(`/ticker/${r.symbol}`)} onMouseEnter={e=>(e.currentTarget.style.background='#1c2128')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <td style={{padding:'5px 8px',color:'#c9d1d9',fontWeight:500,fontSize:12}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:7}}><Logo sym={r.symbol}/>{r.symbol}</span>
                      </td>
                      <td style={{padding:'5px 8px',textAlign:'right',color:'#c9d1d9',fontFamily:mono,fontSize:11}}>{r.shares}</td>
                      <td style={{padding:'5px 8px',textAlign:'right',color:'#484f58',fontFamily:mono,fontSize:11}}>{r.entry.toFixed(2)}</td>
                      <td style={{padding:'5px 8px',textAlign:'right',color:'#c9d1d9',fontFamily:mono,fontSize:11}}>{r.live.toFixed(2)}</td>
                      <td style={{padding:'5px 8px',textAlign:'right',color:'#c9d1d9',fontFamily:mono,fontSize:11}}>{fmtUsd(r.value)}</td>
                      <td style={{padding:'5px 8px',textAlign:'right',color:'#484f58',fontFamily:mono,fontSize:10}}>{tv>0?((r.value/tv)*100).toFixed(1):0}%</td>
                      <td style={{padding:'5px 8px',textAlign:'right',fontFamily:mono,fontSize:11}}><span style={{color:col}}>{fmtUsd(r.pnl)}</span><span style={{color:col,fontSize:10,marginLeft:4}}>{r.pnlPct>=0?'+':''}{r.pnlPct.toFixed(1)}%</span></td>
                      <td style={{padding:'5px 8px',textAlign:'right'}}><span onClick={e=>{e.stopPropagation();sv(positions.filter(p=>p.id!==r.id))}} style={{color:'#30363d',cursor:'pointer',fontSize:14}} onMouseEnter={e=>(e.currentTarget.style.color='#f85149')} onMouseLeave={e=>(e.currentTarget.style.color='#30363d')}>×</span></td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{background:'#0e1117',border:'1px solid #21262d',padding:16,marginTop:12}}>
            <div style={{fontSize:12,fontWeight:500,color:'#c9d1d9',marginBottom:12}}>Position Sizing Calculator</div>
            <PositionSizer portfolioValue={tv||100000}/>
          </div>

          {/* IBKR-style news feed filtered to current holdings */}
          <PortfolioNews symbols={positions.map(p => p.symbol)} />
        </>
      )}
    </div>
  )
}

export function Portfolio() {
  const prices=useStore(s=>s.prices)
  const [metas,setMetas]=useState<PortfolioMeta[]>(loadMeta)
  const [activeId,setActiveId]=useState<string|null>(null)
  const activeMeta=metas.find(m=>m.id===activeId)??null
  const handleCreate=(name:string)=>{
    const id=`pf-${Date.now()}`
    const nm=[...metas,{id,name,createdAt:new Date().toISOString()}]
    setMetas(nm);saveMeta(nm);setActiveId(id)
  }
  const handleDelete=(id:string)=>{
    const nm=metas.filter(m=>m.id!==id);setMetas(nm);saveMeta(nm)
    localStorage.removeItem(posKey(id))
    if(activeId===id)setActiveId(null)
  }
  if(activeMeta)return <PortfolioDetail meta={activeMeta} onBack={()=>setActiveId(null)} prices={prices}/>
  return <PortfolioHub metas={metas} onSelect={setActiveId} onCreate={handleCreate} onDelete={handleDelete} prices={prices}/>
}
