// components/common/Sparkline.tsx
// Inline mini chart for watchlist tables and KPI tiles

interface Props {
  data:   number[]
  width?: number
  height?: number
  color?: string
}

export function Sparkline({ data, width = 60, height = 20, color }: Props) {
  if (!data || data.length < 2) {
    return <span className="text-tv-faint text-2xs">—</span>
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  // Auto color: green if last > first, red otherwise
  const trend = data[data.length - 1] >= data[0]
  const stroke = color ?? (trend ? '#3fb950' : '#f85149')

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth={1.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
