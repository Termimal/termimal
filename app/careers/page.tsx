import type { Metadata } from 'next'
import Link from "next/link"

export const metadata: Metadata = {
  title: 'Careers — Join the Termimal Team',
  description:
    "Join Termimal: we're hiring engineers, designers, and analysts to build the next generation of trading analysis tools.",
  alternates: { canonical: '/careers' },
  openGraph: {
    title: 'Careers — Join the Termimal Team',
    description:
      "Join Termimal: we're hiring engineers, designers, and analysts to build the next generation of trading analysis tools.",
    url: '/careers',
    type: 'website',
  },
}

const BENEFITS = [
  { icon: "🌍", label: "Remote-first", body: "Work from anywhere. Our team spans Helsinki, Paris, Istanbul, and beyond." },
  { icon: "📈", label: "Equity", body: "Every full-time hire receives meaningful equity. We build together, we share together." },
  { icon: "🧠", label: "Learning budget", body: "€2,000 per year for courses, conferences, and books — no approval required." },
  { icon: "🏖️", label: "Flexible time off", body: "Unlimited PTO with a team minimum of 25 days. Rest is not optional." },
  { icon: "💻", label: "Top setup", body: "MacBook Pro, external monitor, mechanical keyboard — whatever you need to do your best work." },
  { icon: "🤝", label: "Small team, big impact", body: "No bureaucracy. Your work ships fast and your decisions matter from day one." },
]

export default function CareersPage() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
      <div className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="text-sm" style={{ color: "var(--t3)" }}>← Back to Termimal</Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Careers</div>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
          Work on something that matters.
        </h1>
        <p className="mt-4 text-base leading-7" style={{ color: "var(--t2)" }}>
          We are a small, focused team building tools that serious traders rely on every day. We move fast, ship often, and care deeply about craft.
        </p>

        <div className="mt-12 rounded-2xl border p-8"
          style={{
            borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
            background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 4%) 0%, color-mix(in srgb, var(--bg) 94%, black 6%) 100%)",
          }}>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(16,185,129,.12)", color: "#34d399" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <div>
              <div className="text-sm font-semibold">No open positions right now</div>
              <p className="mt-1 text-sm leading-7" style={{ color: "var(--t2)" }}>
                We don't have any active roles at the moment, but we are always interested in hearing from exceptional people. If you are a strong engineer, designer, or trader with a perspective on how financial tools should work — we'd love to have your CV on file.
              </p>
              <a
                href="mailto:careers@termimal.com?subject=Speculative Application — Termimal"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:brightness-110"
                style={{
                  background: "linear-gradient(180deg, rgba(16,185,129,.18) 0%, rgba(5,150,105,.28) 100%)",
                  color: "#d1fae5",
                  border: "1px solid rgba(52,211,153,.16)",
                }}>
                Send your CV to careers@termimal.com
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="mb-6 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Why Termimal</div>
          <div className="grid gap-4 sm:grid-cols-2">
            {BENEFITS.map(b => (
              <div key={b.label} className="rounded-2xl border p-5"
                style={{
                  borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                  background: "var(--surface)",
                }}>
                <div className="mb-2 text-xl">{b.icon}</div>
                <div className="text-sm font-semibold">{b.label}</div>
                <p className="mt-1 text-xs leading-6" style={{ color: "var(--t3)" }}>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
