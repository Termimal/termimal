import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  
  // ADD THIS BLOCK RIGHT HERE:
  variants: {
    extend: {
      fontSize: { 'xs': ['14px', '20px'], 'sm': ['16px', '24px'], 'base': ['18px', '28px'], 'lg': ['20px', '28px'] },
      display: ['dark'],
    },
  },
  
  theme: {
    extend: {
      fontSize: { 'xs': ['14px', '20px'], 'sm': ['16px', '24px'], 'base': ['18px', '28px'], 'lg': ['20px', '28px'] },
      colors: {
        brand: {
          bg: 'var(--bg)',
          bg2: 'var(--bg2)',
          bg3: 'var(--bg3)',
          surface: 'var(--surface)',
          border: 'var(--border)',
          'border-hover': 'var(--bh)',
          accent: 'var(--acc)',
          accent2: 'var(--acc2)',
        },
        t: {
          1: 'var(--t1)',
          2: 'var(--t2)',
          3: 'var(--t3)',
          4: 'var(--t4)',
        },
        val: {
          green: 'var(--green-val)',
          red: 'var(--red-val)',
        },
        terminal: {
          bg: 'var(--terminal-bg)',
          border: 'var(--terminal-border)',
          surface: 'var(--terminal-surface)',
          hover: 'var(--terminal-hover)',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      maxWidth: {
        site: '1360px',
      },
      animation: {
        'scroll': 'scroll 40s linear infinite',
        'pulse-dot': 'pulse-dot 2s infinite',
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}

export default config
