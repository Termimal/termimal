import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/seo/canonical'
import PageShell from '@/components/layout/PageShell'
import Link from "next/link"

export const metadata: Metadata = {
  title: 'The Termimal Platform — Built for Serious Traders',
  description:
    "One platform for charting, macro intelligence, COT positioning, on-chain analytics, sentiment, and risk research. Fast, accurate, opinionated.",
  alternates: { canonical: getCanonicalUrl('/platform') },
  openGraph: {
    title: 'The Termimal Platform — Built for Serious Traders',
    description:
      "One platform for charting, macro intelligence, COT positioning, on-chain analytics, sentiment, and risk research. Fast, accurate, opinionated.",
    url: '/platform',
    type: 'website',
  },
}

export default function PlatformPage() {
  const pillars = [
    {
      title: "Trade execution",
      body: "Run strategy workflows, execute ideas faster, and move from analysis to action inside a single workspace.",
    },
    {
      title: "Market intelligence",
      body: "Monitor signals, follow market structure, and keep your decision-making anchored to live context instead of scattered tools.",
    },
    {
      title: "Workspace control",
      body: "Manage downloads, alerts, account settings, and referrals from one consistent Termimal environment.",
    },
  ]

  return (
    <PageShell title="Platform">
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--t1)" }}>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-4 md:px-8 lg:py-24">
        <div className="max-w-3xl">
          <div
            className="inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ borderColor: "var(--border)", color: "var(--t4)", background: "var(--surface)" }}
          >
            Platform
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl" style={{ letterSpacing: "-0.04em" }}>
            The Termimal platform, explained in one place.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 sm:text-lg" style={{ color: "var(--t2)" }}>
            Termimal brings market access, analysis workflows, and account-level tools into a single product experience so traders spend less time jumping between disconnected screens.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {pillars.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border p-6"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--t3)" }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <div
          className="mt-12 rounded-3xl border p-6 sm:p-8"
          style={{ borderColor: "var(--border)", background: "linear-gradient(180deg, var(--surface), var(--bg2))" }}
        >
          <h2 className="text-2xl font-semibold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
            What to do next
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "var(--t3)" }}>
            Explore the product surfaces that already exist in the site today, or go straight into the account flow if you are ready to use Termimal.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/features" className="btn-primary px-5 py-2.5 text-sm">
              Explore features
            </Link>
            <Link
              href="/terminal"
              className="rounded-xl border px-5 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--t1)" }}
            >
              Open web terminal
            </Link>
            <Link
              href="/signup"
              className="rounded-xl border px-5 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--t1)" }}
            >
              Create account
            </Link>
          </div>
        </div>
      </section>
    </div>
    </PageShell>
  )
}
