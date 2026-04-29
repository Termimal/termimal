/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tv: {
          bg:       '#0e1117',
          surface:  '#161b22',
          card:     '#161b22',
          border:   '#21262d',
          hover:    '#1c2128',
          muted:    '#30363d',
          text:     '#c9d1d9',
          secondary:'#8b949e',
          dim:      '#8b949e',
          faint:    '#484f58',
          blue:     '#388bfd',
          green:    '#3fb950',
          red:      '#f85149',
          orange:   '#d29922',
          cyan:     '#388bfd',
          purple:   '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs:    ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [],
}
