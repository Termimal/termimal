"use client"
import { useState } from "react"
import Link from "next/link"
import PageShell from "@/components/layout/PageShell"

/**
 * Affiliate program page.
 *
 * Commercial design notes:
 *   - The previous version offered 30–40% recurring commission FOREVER.
 *     For a SaaS with €9.99–€19.99/month ARPU, that's not sustainable;
 *     a single power-affiliate could earn more than half of a customer's
 *     LTV indefinitely.
 *   - This rewrite uses an industry-standard 25% recurring for the
 *     first 12 months, with tier bonuses on top of (not instead of)
 *     the base rate.
 *   - 60-day claw-back protects against churn-and-resub abuse.
 *   - Commissions only on PAID conversions, not free trials.
 *
 * Anti-abuse rules below are enforceable; the legal boilerplate that
 * binds them lives in /terms section 8.
 */

const STEPS = [
  { num: "01", title: "Apply",        body: "Tell us about your audience — newsletter, community, YouTube, X/Twitter, podcast. We review every application manually." },
  { num: "02", title: "Get approved", body: "Decision within 3 business days. On approval you receive your unique tracking link and dashboard access." },
  { num: "03", title: "Earn on paid conversions", body: "When someone signs up through your link AND converts to a paid plan, you earn commission for the next 12 months they remain subscribed." },
]

const TIERS = [
  {
    label: "Starter",
    threshold: "1–10 paid referrals",
    base: "20%",
    bonus: "—",
    payout: "Monthly",
    badge: "",
  },
  {
    label: "Pro",
    threshold: "11–50 paid referrals",
    base: "25%",
    bonus: "+€10 per referral",
    payout: "Monthly",
    badge: "Most common",
  },
  {
    label: "Elite",
    threshold: "50+ paid referrals",
    base: "30%",
    bonus: "+€20 per referral · custom co-marketing",
    payout: "Bi-weekly",
    badge: "Top tier",
  },
]

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "When do I actually earn?",
    a: <>Commission accrues only when a referred user becomes a <strong>paying</strong> customer — i.e. their first invoice clears Stripe after the 14-day free trial. Free-tier sign-ups, trial sign-ups, abandoned signups, and unpaid invoices do not earn commission.</>,
  },
  {
    q: "How long do I keep earning per referral?",
    a: <>You receive your tier&rsquo;s commission rate for the first <strong>12 months</strong> of each referred customer&rsquo;s subscription. After that the customer is yours-for-the-product but no longer pays out commission. This caps our risk so we can pay every affiliate honestly without going broke.</>,
  },
  {
    q: "What's the cookie window?",
    a: <>Termimal sets a 30-day attribution cookie when someone clicks your link. If they sign up within 30 days you&rsquo;re credited; if they then convert to paid, you earn.</>,
  },
  {
    q: "Where can I share my link?",
    a: <>Your own audience: newsletters, communities you moderate, your YouTube channel, your X/Twitter, your blog, your Discord. <strong>Not</strong> generic coupon/discount/deal-aggregator sites, paid trademark searches, or unsolicited DM/email blasts. See the rules below.</>,
  },
  {
    q: "What happens if a referred customer refunds?",
    a: <>If they refund, charge back, or cancel + claim a full refund within 60 days of payment, the matching commission is reversed. After 60 days commissions are locked in.</>,
  },
  {
    q: "How are payouts handled?",
    a: <>Stripe Connect or wire transfer (your choice during onboarding). Minimum payout threshold is <strong>€50</strong>; balances below that roll forward. You&rsquo;re responsible for declaring your own income and any applicable VAT in your jurisdiction.</>,
  },
]

const RULES = [
  { title: "Paid conversions only",       body: "Commission triggers when Stripe captures the first paid invoice for a referred user. No commission for free signups, free trials, or unpaid invoices." },
  { title: "12-month commission window",  body: "You earn your tier rate for the first 12 months of each referred subscription, then commission ends — but the customer is still yours for the product." },
  { title: "30-day cookie attribution",   body: "First-click attribution within a 30-day window. If someone clicks your link, then a competitor's, your cookie is overwritten." },
  { title: "60-day claw-back on refunds", body: "Commissions are reversed if the referred customer refunds, charges back, or cancels with a refund within 60 days of payment." },
  { title: "No public coupon/aggregator sites", body: "Affiliate links must be shared with your own audience. Posting on coupon sites, deal aggregators, RetailMeNot-style platforms, or generic incentive networks voids the commission and ends the partnership." },
  { title: "No trademark or PPC bidding", body: "You may not bid on 'Termimal' or any confusingly similar variant in Google, Microsoft, Meta, or any other paid-search platform. Organic content is welcome." },
  { title: "No self-referral or related accounts", body: "Referring yourself, household members on the same payment method, or accounts intended primarily to generate commissions for you is prohibited and forfeits earnings." },
  { title: "No misrepresentation",        body: "Don't impersonate Termimal staff, promise features that don't exist, fabricate testimonials, or guarantee trading returns. Honest representation only." },
  { title: "Disclosure required",         body: "Where the law requires it (US FTC, EU consumer law, etc.) you must disclose the affiliate relationship clearly. '#ad' or 'affiliate link' is enough; consult your local rules." },
  { title: "Termimal can pause or terminate", body: "We may pause, claw back, or terminate any affiliate at our discretion for breach of these rules, suspected fraud, low-quality traffic, prolonged inactivity, or any other reason. Outstanding earned commissions below the minimum payout threshold are forfeited at termination." },
]

export default function AffiliatesPage() {
  const [form, setForm] = useState({ name: "", email: "", website: "", audience: "", country: "", about: "", agree: false })
  const [sent, setSent] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const body = `Name: ${form.name}%0AEmail: ${form.email}%0AWebsite/Social: ${form.website}%0AAudience Size: ${form.audience}%0ACountry: ${form.country}%0APromotion Plan: ${form.about}%0AAgreed to program rules: ${form.agree ? "yes" : "no"}`
    window.location.href = `mailto:affiliates@termimal.com?subject=Affiliate Application — ${form.name}&body=${body}`
    setSent(true)
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface)",
    borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
    color: "var(--t1)",
    borderRadius: "0.75rem",
    border: "1px solid",
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
    width: "100%",
    outline: "none",
  }

  return (
    <PageShell title="Affiliates">
    <div style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-4xl px-4 py-16">

        {/* ── Hero ── */}
        <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>
          Partner Program
        </div>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
          Build with Termimal.<br />Earn on every paid conversion.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: "var(--t2)" }}>
          Recommend Termimal to your audience and earn{" "}
          <strong>up to 30% recurring</strong> for the first <strong>12 months</strong> of every paid subscription you bring in. Honest economics, predictable payouts, no shenanigans on either side.
        </p>

        {/* ── How it works ── */}
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

        {/* ── Tiers ── */}
        <div className="mb-14">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Commission Tiers</div>
          <p className="mb-6 text-xs" style={{ color: "var(--t3)" }}>
            All tiers earn for the first 12 months of each referred paid subscription. Tier reviewed monthly based on rolling 90-day paid-conversion volume.
          </p>
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)" }}>
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-[1.2fr_1.4fr_0.8fr_1.6fr_1fr] border-b px-6 py-3 text-xs font-semibold uppercase tracking-wide"
              style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)", color: "var(--t3)" }}>
              <span>Tier</span><span>Volume</span><span>Base rate</span><span>Bonus</span><span>Payout</span>
            </div>
            {TIERS.map((t, i) => (
              <div key={t.label} className="grid grid-cols-1 md:grid-cols-[1.2fr_1.4fr_0.8fr_1.6fr_1fr] gap-2 md:gap-0 items-start md:items-center border-b px-4 md:px-6 py-4 last:border-b-0"
                style={{
                  borderColor: "color-mix(in srgb, var(--border) 50%, transparent 50%)",
                  background: i % 2 === 0 ? "var(--bg)" : "color-mix(in srgb, var(--surface) 60%, var(--bg) 40%)",
                }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{t.label}</span>
                  {t.badge && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ background: "rgba(56,139,253,.12)", color: "#388bfd" }}>{t.badge}</span>
                  )}
                </div>
                <span className="text-xs" style={{ color: "var(--t3)" }}>
                  <span className="md:hidden text-[10px] uppercase tracking-wider mr-1" style={{ color: "var(--t4)" }}>Volume:</span>
                  {t.threshold}
                </span>
                <span className="text-sm font-semibold" style={{ color: "#388bfd" }}>
                  <span className="md:hidden text-[10px] uppercase tracking-wider mr-1" style={{ color: "var(--t4)" }}>Base:</span>
                  {t.base}
                </span>
                <span className="text-xs" style={{ color: "var(--t2)" }}>
                  <span className="md:hidden text-[10px] uppercase tracking-wider mr-1" style={{ color: "var(--t4)" }}>Bonus:</span>
                  {t.bonus}
                </span>
                <span className="text-xs" style={{ color: "var(--t3)" }}>
                  <span className="md:hidden text-[10px] uppercase tracking-wider mr-1" style={{ color: "var(--t4)" }}>Payout:</span>
                  {t.payout}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Program rules (anti-abuse) ── */}
        <div className="mb-14 rounded-2xl border p-6 sm:p-8"
          style={{
            borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
            background: "var(--surface)",
          }}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Program rules</div>
          <h2 className="text-xl font-semibold" style={{ letterSpacing: "-0.02em" }}>
            How we protect both sides
          </h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--t3)" }}>
            These rules keep the program sustainable. Read them carefully — applying means you accept them. Full legal terms are in{" "}
            <Link className="link-acc" href="/terms#affiliates">Terms of Service §8</Link>.
          </p>
          <ul className="mt-6 space-y-4">
            {RULES.map(r => (
              <li key={r.title} className="flex gap-3 text-sm">
                <span aria-hidden style={{ flexShrink: 0, color: "#388bfd", fontWeight: 700 }}>·</span>
                <div>
                  <div className="font-semibold" style={{ color: "var(--t1)" }}>{r.title}</div>
                  <div className="mt-1 text-xs leading-6" style={{ color: "var(--t3)" }}>{r.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* ── FAQ ── */}
        <div className="mb-14">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>FAQ</div>
          <h2 className="text-xl font-semibold mb-6" style={{ letterSpacing: "-0.02em" }}>Common questions</h2>
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)" }}>
            {FAQS.map((f, i) => (
              <details
                key={i}
                className="border-b last:border-b-0 px-5 py-4"
                style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent 50%)" }}
              >
                <summary className="cursor-pointer text-sm font-semibold list-none flex justify-between items-center">
                  <span>{f.q}</span>
                  <span aria-hidden style={{ color: "var(--t3)", fontSize: 18 }}>+</span>
                </summary>
                <div className="mt-3 text-sm leading-7" style={{ color: "var(--t2)" }}>{f.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* ── Apply form ── */}
        <div id="apply" className="rounded-2xl border p-8"
          style={{
            borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
            background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 4%) 0%, color-mix(in srgb, var(--bg) 94%, black 6%) 100%)",
            boxShadow: "0 20px 60px rgba(0,0,0,.14)",
          }}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Apply Now</div>
          <h2 className="text-xl font-semibold mb-6" style={{ letterSpacing: "-0.02em" }}>Tell us about your audience</h2>
          {sent ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "rgba(16,185,129,.12)", border: "2px solid rgba(56,139,253,.22)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#388bfd" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h3 className="text-lg font-semibold">Application submitted</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--t2)" }}>Your email client opened with a pre-filled message — hit send. We respond within 3 business days.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="aff-name" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--t2)" }}>Full name *</label>
                  <input id="aff-name" required type="text" autoComplete="name" maxLength={100} value={form.name} onChange={set("name")} style={inputStyle} placeholder="Alex Reeves" />
                </div>
                <div>
                  <label htmlFor="aff-email" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--t2)" }}>Email address *</label>
                  <input id="aff-email" required type="email" autoComplete="email" inputMode="email" maxLength={254} value={form.email} onChange={set("email")} style={inputStyle} placeholder="you@example.com" />
                </div>
                <div>
                  <label htmlFor="aff-website" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--t2)" }}>Website or social profile *</label>
                  <input id="aff-website" required type="url" autoComplete="url" inputMode="url" value={form.website} onChange={set("website")} style={inputStyle} placeholder="https://youtube.com/@yourchannel" />
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
                <input id="aff-country" type="text" autoComplete="country-name" maxLength={56} value={form.country} onChange={set("country")} style={inputStyle} placeholder="Finland" />
              </div>
              <div>
                <label htmlFor="aff-about" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--t2)" }}>How do you plan to promote Termimal? *</label>
                <textarea id="aff-about" required rows={4} maxLength={1000} value={form.about} onChange={set("about")}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Tell us about your audience, content style, and how you'd introduce Termimal — e.g. weekly market wrap newsletter, dedicated review video, a community thread, etc." />
              </div>

              {/* Compliance checkbox */}
              <label className="flex items-start gap-3 text-xs leading-6 cursor-pointer" style={{ color: "var(--t2)" }}>
                <input
                  type="checkbox"
                  checked={form.agree}
                  onChange={e => setForm(f => ({ ...f, agree: e.target.checked }))}
                  required
                  style={{ marginTop: 3, width: 16, height: 16 }}
                />
                <span>
                  I have read the program rules above and agree to the{" "}
                  <Link href="/terms#affiliates" className="link-acc">Affiliate Program Terms</Link>.
                  I understand that commissions are paid only on confirmed paid conversions, that public
                  coupon-site distribution is prohibited, and that Termimal may claw back commissions
                  on refunds within 60 days.
                </span>
              </label>

              <button
                type="submit"
                disabled={!form.agree}
                className="w-full rounded-2xl py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(180deg, rgba(16,185,129,.20) 0%, rgba(31,111,235,.30) 100%)",
                  color: "#d1fae5",
                  border: "1px solid rgba(56,139,253,.18)",
                }}
              >
                Submit application
              </button>
              <p className="text-center text-xs" style={{ color: "var(--t4)" }}>
                We typically respond within 3 business days.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
    </PageShell>
  )
}
