"use client"
import { useState } from "react"
import Link from "next/link"
import { openSupportChat } from "@/components/support/SupportChatLauncher"

const FAQS = [
  { q: "How do I reset my password?", a: "Go to the login page and click 'Forgot password'. You will receive a reset link to your email within a few minutes." },
  { q: "How do I upgrade or change my plan?", a: "Visit the Billing section in your account dashboard. From there you can upgrade, downgrade, or cancel your subscription at any time." },
  { q: "Is my trading data secure?", a: "Yes. All data is encrypted at rest and in transit. We use industry-standard AES-256 encryption and TLS 1.3 for all communications." },
  { q: "Can I use Termimal on multiple devices?", a: "Yes. Your account can be accessed from the web terminal and our desktop app simultaneously. Sessions are synced in real time." },
  { q: "How do I set up price alerts?", a: "Navigate to any chart, click the Alert icon in the toolbar, and configure your trigger conditions. Alerts are delivered via email and in-app notifications." },
  { q: "What markets are supported?", a: "We support stocks, ETFs, forex, crypto, indices, commodities, and futures across all major global exchanges." },
  { q: "How do I cancel my subscription?", a: "You can cancel anytime from the Billing section in your dashboard. Your access continues until the end of the current billing period." },
  { q: "Do you offer a free trial?", a: "Yes. New accounts start with a 14-day free trial of our Pro plan. No credit card required." },
]

const CATEGORIES = [
  { icon: "🚀", label: "Getting Started", count: 12 },
  { icon: "💳", label: "Billing & Plans", count: 8 },
  { icon: "🔧", label: "Technical Issues", count: 15 },
  { icon: "🔐", label: "Account & Security", count: 10 },
  { icon: "📊", label: "Charts & Alerts", count: 18 },
  { icon: "📱", label: "Desktop App", count: 7 },
]

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null)
  const [query, setQuery] = useState("")

  const filtered = FAQS.filter(f =>
    f.q.toLowerCase().includes(query.toLowerCase()) ||
    f.a.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <main style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
      <div className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="text-sm" style={{ color: "var(--t3)" }}>← Back to Termimal</Link>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-12 text-center">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Help Center</div>
          <h1 className="text-3xl font-semibold sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>How can we help?</h1>
          <p className="mt-3 text-sm" style={{ color: "var(--t3)" }}>Search our docs, browse topics, or chat with support.</p>
          <div className="mx-auto mt-6 max-w-lg">
            <input
              type="text"
              placeholder="Search help articles…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full rounded-2xl border px-5 py-3 text-sm outline-none transition-all"
              style={{
                background: "var(--surface)",
                borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                color: "var(--t1)",
              }}
            />
          </div>
        </div>

        {!query && (
          <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORIES.map(c => (
              <div key={c.label} className="cursor-pointer rounded-2xl border p-5 transition-all hover:scale-[1.01]"
                style={{
                  borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                  background: "var(--surface)",
                }}>
                <div className="mb-2 text-2xl">{c.icon}</div>
                <div className="text-sm font-semibold">{c.label}</div>
                <div className="mt-1 text-xs" style={{ color: "var(--t3)" }}>{c.count} articles</div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-10 overflow-hidden rounded-2xl border"
          style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)" }}>
          <div className="border-b px-6 py-4"
            style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)" }}>
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t3)" }}>
              {query ? `${filtered.length} results for "${query}"` : "Frequently Asked Questions"}
            </span>
          </div>
          {filtered.map((f, i) => (
            <div key={i} className="border-b last:border-b-0"
              style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent 50%)" }}>
              <button
                className="flex w-full items-center justify-between px-6 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-sm font-medium">{f.q}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ flexShrink: 0, marginLeft: 12, transform: open === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--t3)" }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {open === i && (
                <div className="px-6 pb-4 text-sm leading-7" style={{ color: "var(--t2)" }}>{f.a}</div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-sm" style={{ color: "var(--t3)" }}>No results found.</div>
          )}
        </div>

        <div className="rounded-2xl border p-8 text-center"
          style={{
            borderColor: "rgba(56,139,253,.16)",
            background: "linear-gradient(180deg, rgba(16,185,129,.08) 0%, rgba(31,111,235,.14) 100%)",
          }}>
          <h2 className="text-lg font-semibold">Still need help?</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--t2)" }}>Our support team is available via live chat and typically responds in under 2 minutes.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={openSupportChat}
              className="rounded-2xl px-5 py-3 text-sm font-semibold"
              style={{
                background: "linear-gradient(180deg, rgba(16,185,129,.20) 0%, rgba(31,111,235,.30) 100%)",
                color: "#d1fae5",
                border: "1px solid rgba(56,139,253,.18)",
              }}>
              Open live chat
            </button>
            <Link href="/contact" className="rounded-2xl border px-5 py-3 text-sm font-semibold"
              style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", color: "var(--t1)" }}>
              Contact page
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
