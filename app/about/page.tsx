import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/seo/canonical'
import BackToHome from '@/components/BackToHome'
import Link from "next/link"

export const metadata: Metadata = {
  title: 'About Termimal — Trading Analysis Platform',
  description:
    "Learn about Termimal, the team building professional charting, COT positioning, on-chain, and macro intelligence tools for serious traders.",
  alternates: { canonical: getCanonicalUrl('/about') },
  openGraph: {
    title: 'About Termimal — Trading Analysis Platform',
    description:
      "Learn about Termimal, the team building professional charting, COT positioning, on-chain, and macro intelligence tools for serious traders.",
    url: '/about',
    type: 'website',
  },
}

const FOUNDERS = [
  {
    initials: "AR",
    name: "Alex Reeves",
    role: "CEO & Co-Founder",
    bio: "Former institutional equity trader with over a decade on the buy side. Alex saw first-hand how professional-grade tooling was locked behind expensive terminals — and believed individual traders deserved the same edge.",
  },
  {
    initials: "MD",
    name: "Marcus Dubois",
    role: "CTO & Co-Founder",
    bio: "Holds an MSc in Quantitative Finance from Paris Sorbonne University. Marcus is responsible for the mathematical models, screening algorithms, and the real-time signal engine that powers Termimal's alert system.",
  },
  {
    initials: "YK",
    name: "Yusuf Kaya",
    role: "CPO & Co-Founder",
    bio: "Product designer and former lead at a fintech unicorn. Yusuf obsesses over the gap between raw data and actionable clarity — every interface decision at Termimal runs through him.",
  },
]

const VALUES = [
  { label: "Trader First", body: "Every feature starts with a simple question: does this make a trader's day better? If not, it doesn't ship." },
  { label: "Radical Transparency", body: "We publish our system status publicly, communicate pricing clearly, and never hide fees or dark patterns." },
  { label: "Precision Over Noise", body: "Markets are noisy enough. We filter relentlessly so you see only what matters when it matters." },
  { label: "Relentless Iteration", body: "We ship every week. We listen to every piece of feedback and treat the product as permanently unfinished." },
]

export default function AboutPage() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
      <div className="mx-auto w-full max-w-4xl px-4 md:px-8 pt-6">
        <BackToHome />
      </div>
      <div className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="text-sm" style={{ color: "var(--t3)" }}>← Back to Termimal</Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Our Story</div>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
          Built by traders, for traders.
        </h1>

        <div className="mt-8 space-y-5 text-base leading-8" style={{ color: "var(--t2)" }}>
          <p>
            Termimal started the way most good things do — with frustration. In early 2022, Alex, Marcus, and Yusuf were active in the same online trading community, complaining about the same things: charts that seized during market open, alerts that fired five minutes too late, platforms that looked untouched since 2008, and no single place to see the global picture without toggling between six tabs.
          </p>
          <p>
            Marcus ran the numbers and the conclusion was clear: the tools that hedge funds used daily — fast data, clean charts, real-time screening — were technically achievable for any platform. The barrier was not capability, it was that no one had bothered to build it with the individual trader in mind.
          </p>
          <p>
            So they built it themselves. Marcus handled the algorithmic architecture — drawing on his quantitative finance research at Sorbonne to design the screening engine and alert models. Alex shaped the product around actual trading workflows. Yusuf made sure none of it looked or felt like enterprise software from another era.
          </p>
          <p>
            They launched from Helsinki in 2022 with a waiting list of traders who had been following their progress. The response confirmed what they had suspected: people were hungry for a platform that respected their intelligence and their time.
          </p>
          <p>
            Today, Termimal is used by thousands of traders across 60 countries. The team has grown, but the founding principle has not: the best trading tools should be available to everyone.
          </p>
        </div>

        <div className="my-16 grid gap-5 sm:grid-cols-3">
          {FOUNDERS.map(f => (
            <div key={f.name} className="rounded-2xl border p-6"
              style={{
                borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                background: "var(--surface)",
              }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: "rgba(16,185,129,.14)", color: "#388bfd" }}>
                {f.initials}
              </div>
              <div className="text-sm font-semibold">{f.name}</div>
              <div className="mt-0.5 text-xs" style={{ color: "var(--t4)" }}>{f.role}</div>
              <p className="mt-3 text-xs leading-6" style={{ color: "var(--t3)" }}>{f.bio}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Our Values</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {VALUES.map(v => (
            <div key={v.label} className="rounded-2xl border p-5"
              style={{
                borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                background: "var(--surface)",
              }}>
              <div className="mb-2 text-sm font-semibold">{v.label}</div>
              <p className="text-xs leading-6" style={{ color: "var(--t3)" }}>{v.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-4">
          <Link href="/careers" className="rounded-2xl border px-5 py-3 text-sm font-semibold"
            style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", color: "var(--t1)" }}>
            Join the team
          </Link>
          <Link href="/contact" className="text-sm" style={{ color: "var(--t3)" }}>Contact us →</Link>
        </div>
      </div>
    </main>
  )
}
