import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/seo/canonical'
import Link from "next/link"
import PageShell from "@/components/layout/PageShell"

export const metadata: Metadata = {
  title: 'Careers — Join the Termimal Team',
  description:
    "Join Termimal: a small remote-first team building professional trading-analysis tools. We hire engineers, designers, and analysts who care about craft.",
  alternates: { canonical: getCanonicalUrl('/careers') },
  openGraph: {
    title: 'Careers — Join the Termimal Team',
    description:
      "Join Termimal: a small remote-first team building professional trading-analysis tools. We hire engineers, designers, and analysts who care about craft.",
    url: '/careers',
    type: 'website',
  },
}

interface OpenRole {
  title: string
  team: string
  type: string  // "Full-time" | "Contract"
  location: string
  href?: string
}

// Set this to a non-empty array when roles open. Until then we render
// the speculative-application card.
const OPEN_ROLES: OpenRole[] = []

const VALUES = [
  {
    label: "Trader-first",
    body: "Every feature starts with a simple question: does this make a trader's day better? If not, it doesn't ship.",
  },
  {
    label: "Radical transparency",
    body: "Public status page, honest pricing, no dark patterns. We tell users what's broken before they ask.",
  },
  {
    label: "Precision over noise",
    body: "Markets are noisy enough. We filter relentlessly so users see only what matters when it matters.",
  },
  {
    label: "Ship weekly",
    body: "We deploy every week. Iteration over perfection — but no crap goes to prod.",
  },
]

const BENEFITS = [
  { icon: "🌍", label: "Remote-first",       body: "Work from anywhere in compatible time zones (UTC-2 to UTC+3 sweet spot). Helsinki, Paris, Istanbul, Lisbon, Berlin — pick your spot." },
  { icon: "📈", label: "Meaningful equity",  body: "Every full-time hire gets equity. We build together, we share together. Vesting standard 4-year / 1-year cliff." },
  { icon: "🧠", label: "Learning budget",    body: "€2,000 per year for courses, conferences, books, software. No approval required, no expense theatre." },
  { icon: "🏖️", label: "Real time off",      body: "Unlimited PTO with a team minimum of 25 days. Rest is not optional and we measure it." },
  { icon: "💻", label: "Top-spec setup",     body: "MacBook Pro (or PC if you prefer), external monitor, keyboard of choice. Whatever you need to do your best work." },
  { icon: "🤝", label: "Tiny team, big impact", body: "Single-digit headcount. No bureaucracy. Your work ships fast and your decisions matter from day one." },
]

const HIRING_PROCESS = [
  { n: "01", t: "Apply",            b: "Send a CV and a few sentences on what excites you about Termimal. Skip the cover letter — we want signal, not boilerplate." },
  { n: "02", t: "30-min intro",     b: "Quick video call with a founder. We learn about you, you learn about us. No trick questions." },
  { n: "03", t: "Take-home or pairing",  b: "For engineering: a small take-home (4–6 hours, paid). For design: a portfolio walkthrough. For analysts: a research deliverable." },
  { n: "04", t: "Team round",       b: "You meet the rest of the team — 90 minutes split into focused conversations on craft, communication, and how you'd integrate." },
  { n: "05", t: "Offer",            b: "Decision within 5 business days of the team round. Salary + equity, both transparent." },
]

export default function CareersPage() {
  const isHiring = OPEN_ROLES.length > 0

  return (
    <PageShell title="Careers">
    <div style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-[860px] px-4 py-16">

        {/* ── Hero ── */}
        <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Careers</div>
        <h1 className="mt-2 text-3xl font-semibold sm:text-5xl" style={{ letterSpacing: "-0.03em" }}>
          Work on something<br />
          <span style={{ color: "var(--acc)" }}>that matters.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "var(--t2)" }}>
          We&rsquo;re a small, focused team building tools that serious traders rely on every day.
          Remote-first, opinionated about craft, and unfussed about politics. If you&rsquo;d rather
          ship one thing well than ten things half-done, you&rsquo;ll fit right in.
        </p>

        {/* ── Open roles / no roles state ── */}
        <section className="mt-14">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>
            {isHiring ? "Open roles" : "Hiring status"}
          </div>

          {isHiring ? (
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)" }}>
              {OPEN_ROLES.map((r, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b last:border-b-0 p-5 sm:p-6"
                  style={{
                    borderColor: "color-mix(in srgb, var(--border) 50%, transparent 50%)",
                    background: i % 2 === 0 ? "var(--surface)" : "var(--bg)",
                  }}
                >
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--t1)" }}>{r.title}</div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs" style={{ color: "var(--t3)" }}>
                      <span>{r.team}</span>
                      <span>·</span>
                      <span>{r.type}</span>
                      <span>·</span>
                      <span>{r.location}</span>
                    </div>
                  </div>
                  {r.href ? (
                    <a
                      href={r.href}
                      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold"
                      style={{
                        background: "linear-gradient(180deg, rgba(16,185,129,.18) 0%, rgba(31,111,235,.28) 100%)",
                        color: "#d1fae5",
                        border: "1px solid rgba(56,139,253,.16)",
                      }}
                    >
                      View role <span aria-hidden>→</span>
                    </a>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--t4)" }}>Posting soon</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-2xl border p-6 sm:p-8"
              style={{
                borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 4%) 0%, color-mix(in srgb, var(--bg) 94%, black 6%) 100%)",
              }}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "rgba(16,185,129,.12)", color: "#388bfd" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">No active roles right now.</div>
                  <p className="mt-2 text-sm leading-7" style={{ color: "var(--t2)" }}>
                    We don&rsquo;t have open positions at the moment, but we always read speculative
                    applications from exceptional people. If you&rsquo;re a strong engineer, designer,
                    or analyst with a perspective on how trading tools should work — drop us a line.
                  </p>
                  <a
                    href="mailto:careers@termimal.com?subject=Speculative Application — Termimal"
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all"
                    style={{
                      background: "linear-gradient(180deg, rgba(16,185,129,.18) 0%, rgba(31,111,235,.28) 100%)",
                      color: "#d1fae5",
                      border: "1px solid rgba(56,139,253,.16)",
                    }}
                  >
                    Send your CV → careers@termimal.com
                  </a>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── How we hire ── */}
        <section className="mt-16">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>How we hire</div>
          <h2 className="text-xl font-semibold mb-6" style={{ letterSpacing: "-0.02em" }}>Five steps. ~2 weeks.</h2>
          <div className="grid gap-3 sm:grid-cols-5">
            {HIRING_PROCESS.map(s => (
              <div key={s.n} className="rounded-2xl border p-5"
                style={{
                  borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                  background: "var(--surface)",
                }}>
                <div className="mb-3 text-xl font-bold" style={{ color: "rgba(56,139,253,.40)" }}>{s.n}</div>
                <div className="mb-1 text-sm font-semibold">{s.t}</div>
                <p className="text-xs leading-6" style={{ color: "var(--t3)" }}>{s.b}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs" style={{ color: "var(--t4)" }}>
            We pay for take-home work. We don&rsquo;t do whiteboard algorithm hazing.
          </p>
        </section>

        {/* ── Values ── */}
        <section className="mt-16">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>How we work</div>
          <h2 className="text-xl font-semibold mb-6" style={{ letterSpacing: "-0.02em" }}>Four principles</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {VALUES.map(v => (
              <div key={v.label} className="rounded-2xl border p-5"
                style={{
                  borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                  background: "var(--surface)",
                }}>
                <div className="text-sm font-semibold">{v.label}</div>
                <p className="mt-2 text-xs leading-6" style={{ color: "var(--t3)" }}>{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Benefits ── */}
        <section className="mt-16">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>What you get</div>
          <h2 className="text-xl font-semibold mb-6" style={{ letterSpacing: "-0.02em" }}>Compensation &amp; benefits</h2>
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
        </section>

        {/* ── CTA ── */}
        <section className="mt-16">
          <div
            className="rounded-2xl border p-6 sm:p-8 text-center"
            style={{
              borderColor: "rgba(56,139,253,.16)",
              background: "linear-gradient(180deg, rgba(16,185,129,.08) 0%, rgba(31,111,235,.14) 100%)",
            }}
          >
            <h3 className="text-xl font-semibold" style={{ letterSpacing: "-0.02em" }}>
              Don&rsquo;t see your role?
            </h3>
            <p className="mt-2 max-w-md mx-auto text-sm leading-6" style={{ color: "var(--t2)" }}>
              Tell us what you&rsquo;d build and why Termimal is the place to do it. We hire on signal, not job-board slots.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a
                href="mailto:careers@termimal.com?subject=Speculative Application — Termimal"
                className="rounded-2xl px-5 py-3 text-sm font-semibold"
                style={{ background: "var(--acc)", color: "#fff" }}
              >
                Email careers@termimal.com
              </a>
              <Link
                href="/about"
                className="rounded-2xl border px-5 py-3 text-sm font-semibold"
                style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", color: "var(--t1)" }}
              >
                Read our story
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
    </PageShell>
  )
}
