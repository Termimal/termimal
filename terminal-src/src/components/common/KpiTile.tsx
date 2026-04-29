// components/common/KpiTile.tsx
import { clsx } from 'clsx'

interface Props {
  label:    string
  value:    string | number | null | undefined
  delta?:   string
  deltaDir?: 'up' | 'dn' | 'flat'
  sub?:     string
  signal?:  'green' | 'yellow' | 'red' | 'gray'
  source?:  string
}

export function KpiTile({ label, value, delta, deltaDir, sub, signal, source }: Props) {
  const sigBorder: Record<string, string> = {
    green:  'border-l-2 border-tv-green',
    yellow: 'border-l-2 border-tv-orange',
    red:    'border-l-2 border-tv-red',
    gray:   '',
  }
  return (
    <div className={clsx('kpi-tile', signal && sigBorder[signal])}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value == null ? <span className="text-tv-faint">—</span> : value}
      </div>
      {delta && (
        <div className={clsx('kpi-delta',
          deltaDir === 'up'   ? 'text-up' :
          deltaDir === 'dn'   ? 'text-dn' :
          'text-flat'
        )}>
          {delta}
        </div>
      )}
      {sub && <div className="text-2xs text-tv-faint mt-0.5">{sub}</div>}
      {source && <div className="text-2xs text-tv-faint font-mono mt-0.5">SRC: {source}</div>}
    </div>
  )
}
