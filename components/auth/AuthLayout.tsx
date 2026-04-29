'use client'
import Link from 'next/link'
import Image from 'next/image'

interface AuthLayoutProps { children: React.ReactNode; title: string; subtitle: string; footer?: React.ReactNode }

export default function AuthLayout({ children, title, subtitle, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* LEFT SIDE - ALWAYS DARK */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center" style={{ background: 'var(--terminal-bg)' }}>
        <div
          className="absolute inset-0 opacity-[.02]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        <div
          className="absolute top-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[.04]"
          style={{ background: 'radial-gradient(circle, var(--acc), transparent 65%)' }}
        />

        <div className="relative z-10 max-w-md px-12">
          <Link href="/" className="flex items-center gap-3 mb-12">
            <Image
              src="/logo-light.png"
              alt="Termimal Logo"
              width={44}
              height={44}
              className="object-contain"
            />
            <span className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>
              Termimal
            </span>
          </Link>

          <h2 className="text-2xl font-bold text-white mb-3" style={{ letterSpacing: '-0.02em' }}>
            Professional market analysis, built for speed.
          </h2>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--t2)' }}>
            One terminal for charting, macro intelligence, COT positioning, and risk analytics.
          </p>

          <div className="flex flex-wrap gap-4 mt-8">
            {['Charting', 'Macro', 'COT', 'Risk', 'News'].map(m => (
              <span
                key={m}
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: 'var(--acc)' }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - CHANGES WITH THEME */}
      {/*
        Fix: changed px-4 sm:px-8 → px-4 sm:px-4 sm:px-8 to prevent overflow on small screens (375px).
        max-w-[380px] + 2*32px padding = 444px which overflows 375px viewport.
        With px-4 (16px each side): 380px + 32px = 412px → still clips on 375px,
        so we also add w-full to ensure the inner div never exceeds the container.
      */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-4 sm:px-8 py-12 min-w-0">
        <div className="w-full max-w-[380px] min-w-0">
        <BackToHome />
          <Link href="/" className="flex items-center gap-2.5 mb-10 lg:hidden">
            {/* Light Mode Logo (Black) */}
            <Image
              src="/logo-dark.png"
              alt="Termimal Logo"
              width={36}
              height={36}
              className="object-contain"
              style={{ display: 'var(--logo-light-theme-display)' }}
            />
            {/* Dark Mode Logo (White) */}
            <Image
              src="/logo-light.png"
              alt="Termimal Logo"
              width={36}
              height={36}
              className="object-contain"
              style={{ display: 'var(--logo-dark-theme-display)' }}
            />
            <span className="text-xl font-bold" style={{ letterSpacing: '-0.03em', color: 'var(--t1)' }}>
              Termimal
            </span>
          </Link>

          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.025em', color: 'var(--t1)' }}>
            {title}
          </h1>

          <p className="text-sm mb-8" style={{ color: 'var(--t2)' }}>
            {subtitle}
          </p>

          {children}

          {footer && (
            <div className="mt-8 text-center text-sm" style={{ color: 'var(--t3)' }}>
              {footer}
            </div>
          )}

          <p className="mt-10 text-sm text-center leading-relaxed" style={{ color: 'var(--t3)' }}>
            Termimal is a market analysis platform. No trade execution. No financial advice.
          </p>
        </div>
      </div>
    </div>
  )
}
import BackToHome from '@/components/BackToHome'
