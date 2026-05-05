"use client"
import { useState } from "react"
import Link from "next/link"
import PageShell from "@/components/layout/PageShell"

const STEPS = [
  { num: "01", title: "Apply", body: "Fill out the form below. Tell us about your audience — trading communities, newsletters, YouTube channels, social accounts." },
  { num: "02", title: "Get approved", body: "We review applications within 3 business days. Once approved you receive a unique affiliate link and access to your dashboard." },
  { num: "03", title: "Share & earn", body: "Share your link. For every user who subscribes through it, you earn 30% of their subscription revenue — recurring, every month they stay." },
]

const TIERS = [
  { label: "Starter", threshold: "0–10 referrals/mo", commission: "30%", payout: "Monthly", badge: "" },
  { label: "Pro",     threshold: "11–50 referrals/mo", commission: "35%", payout: "Monthly", badge: "Popular" },
  { label: "Elite",  threshold: "50+ referrals/mo",   commission: "40%", payout: "Bi-weekly", badge: "Best" },
]

export default function AffiliatesPage() {
  const [form, setForm] = useState({ name: "", email: "", website: "", audience: "", country: "", about: "" })
  const [sent, setSent] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const body = `Name: ${form.name}%0AEmail: ${form.email}%0AWebsite/Social: ${form.website}%0AAudience Size: ${form.audience}%0ACountry: ${form.country}%0APromotion Plan: ${form.about}`
    window.location.href = `mailto:affiliates@termimal.com?subject=Affiliate Application — ${form.name}&body=${body}`
    setSent(true)
  }

  const inputStyle = {
    background: "var(--surface)",
    borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
    color: "var(--t1)",
    borderRadius: "0.75rem",
    border: "1px solid",
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
    width: "100%",
    outline: "none",
  } as React.CSSProperties

  return (
    <PageShell title="Affiliates">
    <div style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Partner Program</div>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>Earn with Termimal.</h1>
        <p className="mt-4 max-w-xl text-base leading-7" style={{ color: "var(--t2)" }}>
          Recommend Termimal to your audience and earn up to 40% recurring commission on every subscription — for as long as they stay.
        </p>

        <div className="mt-14 mb-14 grid gap-5 sm:grid-cols-3">
          {STEPS.map(s => (
            <div key={s.num} className="rounded-2xl border p-6"
              style={{
                borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                background: "var(--surface)",
              }}>
              <div className="mb-3 text-2xl font-bold" style={{ color: "rgba(56,139,253,.45)" }}>{s.num}</div>
              <div className="mb-2 text-sm font-semibold">{s.title}</div>
              <p className="text-xs leading-6" style={{ color: "var(--t3)" }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mb-14">
          <div className="mb-6 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Commission Tiers</div>
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)" }}>
            {/* Desktop: 4-col grid header. Hidden on mobile, where each row is a card. */}
            <div className="hidden md:grid grid-cols-4 border-b px-6 py-3 text-xs font-semibold uppercase tracking-wide"
              style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)", color: "var(--t3)" }}>
              <span>Tier</span><span>Volume</span><span>Commission</span><span>Payout</span>
            </div>
            {TIERS.map((t, i) => (
              <div key={t.label} className="grid grid-cols-2 md:grid-cols-4 items-start gap-2 md:gap-0 md:items-center border-b px-4 md:px-6 py-4 last:border-b-0"
                style={{
                  borderColor: "color-mix(in srgb, var(--border) 50%, transparent 50%)",
                  background: i % 2 === 0 ? "var(--bg)" : "color-mix(in srgb, var(--surface) 60%, var(--bg) 40%)",
                }}>
                <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                  <span className="text-sm font-medium">{t.label}</span>
                  {t.badge && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: "rgba(16,185,129,.12)", color: "#388bfd" }}>{t.badge}</span>
                  )}
                </div>
                <span className="text-xs" style={{ color: "var(--t3)" }}>
                  <span className="md:hidden text-[10px] uppercase tracking-wider mr-1" style={{ color: "var(--t3)" }}>Volume:</span>
                  {t.threshold}
                </span>
                <span className="text-sm font-semibold" style={{ color: "#388bfd" }}>
                  <span className="md:hidden text-[10px] uppercase tracking-wider mr-1" style={{ color: "var(--t3)" }}>Commission:</span>
                  {t.commission}
                </span>
                <span className="text-xs" style={{ color: "var(--t3)" }}>
                  <span className="md:hidden text-[10px] uppercase tracking-wider mr-1" style={{ color: "var(--t3)" }}>Payout:</span>
                  {t.payout}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border p-8"
          style={{
            borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
            background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 4%) 0%, color-mix(in srgb, var(--bg) 94%, black 6%) 100%)",
            boxShadow: "0 20px 60px rgba(0,0,0,.14)",
          }}>
          <div className="mb-6 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Apply Now</div>
          {sent ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "rgba(16,185,129,.12)", border: "2px solid rgba(56,139,253,.22)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#388bfd" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h2 className="text-lg font-semibold">Application submitted!</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--t2)" }}>Your email client has opened with a pre-filled message. Hit send and we'll be in touch within 3 business days.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="aff-name" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--t2)" }}>Full name *</label>
                  <input id="aff-name" required type="text" autoComplete="name" value={form.name} onChange={set("name")} style={inputStyle} placeholder="Alex Reeves" />
                </div>
                <div>
                  <label htmlFor="aff-email" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--t2)" }}>Email address *</label>
                  <input id="aff-email" required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} style={inputStyle} placeholder="you@example.com" />
                </div>
                <div>
                  <label htmlFor="aff-website" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--t2)" }}>Website or social profile *</label>
                  <input id="aff-website" required type="url" autoComplete="url" inputMode="url" value={form.website} onChange={set("website")} style={inputStyle} placeholder="https://youtube.com/..." />
                </div>
                <div>
                  <label htmlFor="aff-audience" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--t2)" }}>Audience size</label>
                  <select id="aff-audience" value={form.audience} onChange={set("audience")} style={inputStyle}>
                    <option value="">Select range</option>
                    <option>Under 1,000</option>
                    <option>1,000 – 10,000</option>
                    <option>10,000 – 50,000</option>
                    <option>50,000 – 200,000</option>
                    <option>200,000+</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="aff-country" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--t2)" }}>Country</label>
                <input id="aff-country" type="text" autoComplete="country-name" value={form.country} onChange={set("country")} style={inputStyle} placeholder="Finland" />
              </div>
              <div>
                <label htmlFor="aff-about" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--t2)" }}>How do you plan to promote Termimal? *</label>
                <textarea id="aff-about" required rows={4} value={form.about} onChange={set("about")}
                  style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties}
                  placeholder="Tell us about your audience, content style, and how you'd introduce Termimal…" />
              </div>
              <button type="submit" className="w-full rounded-2xl py-3 text-sm font-semibold transition-all hover:brightness-110"
                style={{
                  background: "linear-gradient(180deg, rgba(16,185,129,.20) 0%, rgba(31,111,235,.30) 100%)",
                  color: "#d1fae5",
                  border: "1px solid rgba(56,139,253,.18)",
                }}>
                Submit application
              </button>
              <p className="text-center text-xs" style={{ color: "var(--t4)" }}>
                By submitting you agree to our affiliate program terms. We typically respond within 3 business days.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
    </PageShell>
  )
}
