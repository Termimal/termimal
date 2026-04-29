import { Check, Radio } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import TerminalLite from './TerminalLite'

export default function HeroSection() {
  return (
    <section className="min-h-screen pt-24 pb-12 relative overflow-hidden flex items-center">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[5%] w-[700px] h-[700px] rounded-full anim-float-slow"
          style={{
            background: 'radial-gradient(circle, var(--acc), transparent 65%)',
            opacity: 0.035,
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-5%] w-[500px] h-[500px] rounded-full anim-float"
          style={{
            background: 'radial-gradient(circle, var(--blue), transparent 65%)',
            opacity: 0.025,
            animationDelay: '2s',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            opacity: 0.018,
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, var(--bg), transparent)' }}
        />
      </div>

      <div className="max-w-site mx-auto px-8 w-full relative z-10">
        <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-center">
          <div>
            <div
              className="anim-fade-up hero-d1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold tracking-widest uppercase mb-6 anim-badge-pulse"
              style={{
                color: 'var(--acc)',
                background: 'var(--acc-d)',
                border: '1px solid rgba(56,139,253,.1)',
              }}
            >
              <Radio size={10} /> Live market analysis
            </div>

            <div className="anim-fade-up hero-d2 flex gap-1.5 flex-wrap mb-6">
              {['Charting', 'Macro', 'News', 'COT', 'Risk', 'Screener'].map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded text-sm font-semibold uppercase tracking-wide"
                  style={{
                    color: 'var(--t3)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {m}
                </span>
              ))}
            </div>

            <h1
              className="anim-fade-up hero-d3 text-sm font-bold tracking-[0.25em] uppercase mb-3"
              style={{ color: 'var(--acc)' }}
            >
              Termimal
            </h1>

            <h2
              className="anim-fade-up hero-d3 text-[2.4rem] leading-[1.08] font-bold tracking-tight mb-4"
              style={{ letterSpacing: '-0.03em' }}
            >
              See the market<br />faster, clearer,<br />
              <span style={{ color: 'var(--acc)' }}>deeper.</span>
            </h2>

            <p
              className="anim-fade-up hero-d4 text-sm leading-relaxed mb-6 max-w-[320px]"
              style={{ color: 'var(--t3)' }}
            >
              Termimal is a professional-grade market analysis terminal—one platform for price, macro, positioning, and sentiment—without the complexity of a traditional brokerage.
            </p>

            <div className="anim-fade-up hero-d5 flex gap-2 flex-wrap mb-6">
              <Link href="/signup" className="btn-primary py-2.5 px-6 text-sm anim-glow-pulse">Start Free →</Link>
              <Link href="/terminal" className="btn-secondary py-2.5 px-5">Launch Web Terminal</Link>
            </div>

            <div
              className="anim-fade-up hero-d6 flex gap-4 text-sm"
              style={{ color: 'var(--t4)' }}
            >
              <span className="flex items-center gap-1"><Check size={13} /> 14-day free trial</span>
              <span className="flex items-center gap-1"><Check size={13} /> Cancel anytime</span>
            </div>
          </div>

          <div className="anim-fade-up hero-d3 anim-float-slow" style={{ animationDelay: '0.8s' }}>
            <TerminalLite />
          </div>
        </div>

        <div className="anim-fade-up hero-d6 mt-16 relative">
          <div
            className="rounded-xl overflow-hidden relative anim-border-glow"
            style={{
              border: '1px solid var(--terminal-border)',
              boxShadow: '0 30px 80px -20px rgba(0,0,0,.5)',
            }}
          >
            <Image
              src="/screenshots/dashboard.png"
              alt="Termimal Dashboard — live market overview with charting, COT, and macro panels"
              width={1920}
              height={1080}
              className="w-full block"
              priority
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-[35%] pointer-events-none"
              style={{ background: 'linear-gradient(to top, var(--bg), transparent)' }}
            />
            <div
              className="absolute bottom-6 left-6 text-sm font-bold uppercase tracking-widest z-10"
              style={{ color: 'var(--t4)' }}
            >
              Termimal Dashboard — Live market overview
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
