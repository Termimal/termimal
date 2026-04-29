// components/common/Flag.tsx — Tiny SVG country flags
// 14px, muted, perfectly aligned

const flags: Record<string, () => JSX.Element> = {
  US: () => (
    <svg width="14" height="10" viewBox="0 0 14 10" style={{ display: 'inline-block', verticalAlign: 'middle', opacity: 0.85 }}>
      <rect width="14" height="10" fill="#B22234" rx="1" />
      <rect y="0.77" width="14" height="0.77" fill="#fff" /><rect y="2.31" width="14" height="0.77" fill="#fff" />
      <rect y="3.85" width="14" height="0.77" fill="#fff" /><rect y="5.38" width="14" height="0.77" fill="#fff" />
      <rect y="6.92" width="14" height="0.77" fill="#fff" /><rect y="8.46" width="14" height="0.77" fill="#fff" />
      <rect width="5.6" height="4.62" fill="#3C3B6E" />
    </svg>
  ),
  EA: () => (
    <svg width="14" height="10" viewBox="0 0 14 10" style={{ display: 'inline-block', verticalAlign: 'middle', opacity: 0.85 }}>
      <rect width="14" height="10" fill="#003399" rx="1" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180
        return <circle key={i} cx={7 + 3 * Math.cos(a)} cy={5 + 3 * Math.sin(a)} r="0.5" fill="#FFCC00" />
      })}
    </svg>
  ),
  DE: () => (
    <svg width="14" height="10" viewBox="0 0 14 10" style={{ display: 'inline-block', verticalAlign: 'middle', opacity: 0.85 }}>
      <rect width="14" height="3.33" fill="#000" rx="1" /><rect y="3.33" width="14" height="3.33" fill="#DD0000" />
      <rect y="6.66" width="14" height="3.34" fill="#FFCC00" />
    </svg>
  ),
  FR: () => (
    <svg width="14" height="10" viewBox="0 0 14 10" style={{ display: 'inline-block', verticalAlign: 'middle', opacity: 0.85 }}>
      <rect width="4.67" height="10" fill="#002395" rx="1" /><rect x="4.67" width="4.67" height="10" fill="#fff" />
      <rect x="9.33" width="4.67" height="10" fill="#ED2939" />
    </svg>
  ),
  GB: () => (
    <svg width="14" height="10" viewBox="0 0 14 10" style={{ display: 'inline-block', verticalAlign: 'middle', opacity: 0.85 }}>
      <rect width="14" height="10" fill="#012169" rx="1" />
      <path d="M0,0 L14,10 M14,0 L0,10" stroke="#fff" strokeWidth="1.6" />
      <path d="M0,0 L14,10 M14,0 L0,10" stroke="#C8102E" strokeWidth="0.8" />
      <path d="M7,0 V10 M0,5 H14" stroke="#fff" strokeWidth="2.4" />
      <path d="M7,0 V10 M0,5 H14" stroke="#C8102E" strokeWidth="1.4" />
    </svg>
  ),
  JP: () => (
    <svg width="14" height="10" viewBox="0 0 14 10" style={{ display: 'inline-block', verticalAlign: 'middle', opacity: 0.85 }}>
      <rect width="14" height="10" fill="#fff" rx="1" /><circle cx="7" cy="5" r="2.8" fill="#BC002D" />
    </svg>
  ),
  CN: () => (
    <svg width="14" height="10" viewBox="0 0 14 10" style={{ display: 'inline-block', verticalAlign: 'middle', opacity: 0.85 }}>
      <rect width="14" height="10" fill="#DE2910" rx="1" />
      <polygon points="2.5,1.5 3,3 4.5,3 3.2,4 3.7,5.5 2.5,4.3 1.3,5.5 1.8,4 0.5,3 2,3" fill="#FFDE00" />
    </svg>
  ),
}

export function Flag({ cc }: { cc: string }) {
  const F = flags[cc]
  return F ? <F /> : <span style={{ width: 14, display: 'inline-block' }} />
}
