// components/common/DataSource.tsx
// Shows data source + last updated + stale warning
// Appears in every panel per TERMINAL_2.txt requirements

interface Props {
  source?:  string
  updated?: string
  quality?: string
}

export function DataSource({ source, updated, quality }: Props) {
  const age = updated ? Math.floor((Date.now() - new Date(updated).getTime()) / 60000) : null
  const stale = age != null && age > 60

  return (
    <div className="flex items-center gap-2 mt-1 text-2xs font-mono text-tv-faint">
      {source && <span>SRC: {source}</span>}
      {age != null && (
        <span className={stale ? 'text-tv-orange' : ''}>
          {stale ? `▲ STALE ${age}min ago` : `↻ ${age}min ago`}
        </span>
      )}
      {quality && (
        <span className={
          quality === 'HIGH'   ? 'text-tv-green' :
          quality === 'MEDIUM' ? 'text-tv-orange' : 'text-tv-red'
        }>
          {quality === 'HIGH' ? '▲' : quality === 'MEDIUM' ? '▲' : '▼'} {quality}
        </span>
      )}
    </div>
  )
}
