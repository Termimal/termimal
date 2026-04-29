// components/portfolio/PortfolioNews.tsx — IBKR-style news feed filtered to holdings
import { useEffect, useState, useMemo } from 'react'

const mono = "'SF Mono', Menlo, Consolas, monospace"

interface NewsItem {
  title: string
  publisher: string
  link: string
  providerPublishTime?: number
  published?: string
  related?: string // ticker this news was fetched for
}

export function PortfolioNews({ symbols }: { symbols: string[] }) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('ALL')

  useEffect(() => {
    if (!symbols.length) { setItems([]); return }
    let cancelled = false
    setLoading(true)
    const uniq = Array.from(new Set(symbols.map(s => s.toUpperCase())))
    Promise.allSettled(uniq.map(async sym => {
      try {
        const r = await fetch(`/api/news/${sym}`)
        if (!r.ok) return [] as NewsItem[]
        const j = await r.json()
        const arr: NewsItem[] = (j.news || j || []).slice(0, 8).map((n: any) => ({
          title: n.title || n.headline || '',
          publisher: n.publisher || n.source || '—',
          link: n.link || n.url || '#',
          providerPublishTime: n.providerPublishTime || n.time || 0,
          published: n.published || n.date,
          related: sym,
        }))
        return arr
      } catch { return [] }
    })).then(results => {
      if (cancelled) return
      const all: NewsItem[] = []
      for (const r of results) if (r.status === 'fulfilled') all.push(...r.value)
      // Sort by timestamp desc
      all.sort((a, b) => (b.providerPublishTime || 0) - (a.providerPublishTime || 0))
      setItems(all.slice(0, 60))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [symbols.join(',')])

  const visible = useMemo(() => filter === 'ALL' ? items : items.filter(i => i.related === filter), [items, filter])
  const uniqSyms = useMemo(() => Array.from(new Set(items.map(i => i.related).filter(Boolean))) as string[], [items])

  if (!symbols.length) return null

  return (
    <div style={{ background: '#0e1117', border: '1px solid #21262d', marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #21262d' }}>
        <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>
          PORTFOLIO NEWS
          {loading && <span style={{ marginLeft: 8, color: '#484f58', fontSize: 9, textTransform: 'none' }}>loading…</span>}
          {!loading && items.length > 0 && <span style={{ marginLeft: 8, color: '#484f58', fontSize: 9, textTransform: 'none' }}>{items.length} items</span>}
        </div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('ALL')}
            style={{ fontSize: 10, padding: '3px 8px',
              background: filter === 'ALL' ? 'rgba(56,139,253,0.15)' : 'transparent',
              color: filter === 'ALL' ? '#388bfd' : '#8b949e',
              border: `1px solid ${filter === 'ALL' ? '#388bfd' : '#21262d'}`,
              cursor: 'pointer', fontFamily: mono, letterSpacing: 0.3 }}>ALL</button>
          {uniqSyms.slice(0, 10).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ fontSize: 10, padding: '3px 8px',
                background: filter === s ? 'rgba(56,139,253,0.15)' : 'transparent',
                color: filter === s ? '#388bfd' : '#8b949e',
                border: `1px solid ${filter === s ? '#388bfd' : '#21262d'}`,
                cursor: 'pointer', fontFamily: mono, letterSpacing: 0.3 }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {!loading && visible.length === 0 && (
          <div style={{ padding: 20, fontSize: 11, color: '#484f58', textAlign: 'center' }}>No news for current filter.</div>
        )}
        {visible.map((n, i) => {
          const ts = n.providerPublishTime ? new Date(n.providerPublishTime * 1000) : (n.published ? new Date(n.published) : null)
          const timeStr = ts ? timeAgo(ts) : ''
          return (
            <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 70px', gap: 10, padding: '8px 14px',
                       borderBottom: '1px solid #161b22', textDecoration: 'none', color: 'inherit',
                       alignItems: 'center', transition: 'background 80ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ fontSize: 10, color: '#388bfd', fontFamily: mono, fontWeight: 600 }}>{n.related || '—'}</span>
              <span style={{ fontSize: 11, color: '#c9d1d9', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>{n.title}</span>
              <span style={{ fontSize: 9, color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.publisher}</span>
              <span style={{ fontSize: 9, color: '#484f58', fontFamily: mono, textAlign: 'right' }}>{timeStr}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-GB')
}
