// components/common/MethodologyExpander.tsx
// Tiny collapsible "How this is computed" block for any derived metric.
// Style matches institutional terminal density (mono, 10–11px, dark surfaces).

import { useState } from 'react'

const mono = "'SF Mono', Menlo, Consolas, monospace"

export interface MethodologyStep {
  label: string
  detail: string
}

export function MethodologyExpander({
  title = 'How this is computed',
  summary,
  steps,
  inputs,
  caveats,
  style,
}: {
  title?: string
  summary: string
  steps?: MethodologyStep[]
  inputs?: string[]
  caveats?: string[]
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        background: '#0e1117',
        border: '1px solid #21262d',
        fontFamily: mono,
        ...style,
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '5px 9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          cursor: 'pointer',
          color: '#8b949e',
          fontFamily: mono,
          fontSize: 9,
          textAlign: 'left',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden style={{ color: '#388bfd' }}>i</span>
          {title}
        </span>
        <span aria-hidden style={{ color: '#484f58', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid #21262d', color: '#8b949e', fontSize: 10, lineHeight: 1.55 }}>
          <p style={{ margin: 0, marginBottom: 8, color: '#c9d1d9' }}>{summary}</p>

          {inputs && inputs.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 8, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Inputs</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {inputs.map(i => (
                  <span
                    key={i}
                    style={{
                      padding: '2px 6px',
                      background: '#161b22',
                      border: '1px solid #21262d',
                      fontSize: 9,
                      color: '#8b949e',
                    }}
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}

          {steps && steps.length > 0 && (
            <ol style={{ margin: 0, marginBottom: 8, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {steps.map((s, i) => (
                <li key={i} style={{ display: 'flex', gap: 8 }}>
                  <span
                    style={{
                      flex: '0 0 16px',
                      height: 16,
                      background: '#388bfd22',
                      color: '#388bfd',
                      fontSize: 9,
                      fontWeight: 600,
                      textAlign: 'center',
                      lineHeight: '16px',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ color: '#c9d1d9', fontWeight: 600 }}>{s.label}.</span> {s.detail}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {caveats && caveats.length > 0 && (
            <div style={{ padding: '6px 8px', background: '#d2992208', border: '1px solid #d2992222' }}>
              <div style={{ fontSize: 8, color: '#d29922', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Caveats</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {caveats.map(c => (
                  <li key={c} style={{ display: 'flex', gap: 6 }}>
                    <span aria-hidden style={{ color: '#d29922' }}>·</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MethodologyExpander
