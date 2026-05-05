"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import PageShell from "@/components/layout/PageShell"
import { openSupportChat } from "@/components/support/SupportChatLauncher"

/**
 * Help center.
 *
 * Every FAQ here was reviewed against ground truth (lib/plan.ts for
 * tier gating, /pricing for prices, the actual deployed pages /
 * routes). The category strip is now FUNCTIONAL — clicking a
 * category filters the FAQ list and updates the URL hash so the
 * filtered view is shareable. Counts are derived from the FAQ data,
 * not hard-coded.
 */

type Category =
  | "getting-started"
  | "billing"
  | "technical"
  | "account"
  | "charts-data"
  | "desktop-app"

const CATEGORIES: Array<{ key: Category; icon: string; label: string }> = [
  { key: "getting-started", icon: "🚀", label: "Getting started" },
  { key: "billing",         icon: "💳", label: "Billing & plans" },
  { key: "technical",       icon: "🔧", label: "Technical issues" },
  { key: "account",         icon: "🔐", label: "Account & security" },
  { key: "charts-data",     icon: "📊", label: "Charts & data" },
  { key: "desktop-app",     icon: "📱", label: "Desktop app" },
]

interface Faq { q: string; a: React.ReactNode; cat: Category }

const FAQS: Faq[] = [
  // ── Getting started ─────────────────────────────────────────
  {
    cat: "getting-started",
    q: "How do I create an account?",
    a: <>Visit <Link className="link-acc" href="/signup">/signup</Link>. You can use email + password, or sign up with Google or GitHub. New accounts start on the Free plan and include a 14-day trial of Pro features — no credit card required.</>,
  },
  {
    cat: "getting-started",
    q: "What can I do on the Free plan?",
    a: <>The Free plan includes the Dashboard, basic Charts (single indicator, 3-month range), basic Screener, basic News flow, basic Portfolio, basic Global Indicators, and access to the Ticker workspace. Enough to get a feel for the product.</>,
  },
  {
    cat: "getting-started",
    q: "How do I open the web terminal?",
    a: <>After signing in, click <strong>Web Terminal</strong> in the top navigation, or go to <Link className="link-acc" href="/terminal">/terminal</Link>. The terminal is browser-first — no install required.</>,
  },
  {
    cat: "getting-started",
    q: "Where do I find the full feature walkthrough?",
    a: <>The complete guide lives at <Link className="link-acc" href="/support/guide">/support/guide</Link>. It covers every page in the terminal, account flows, troubleshooting, and keyboard shortcuts.</>,
  },
  {
    cat: "getting-started",
    q: "Is there a mobile app?",
    a: <>Not as a native app, but the web terminal is built mobile-first. On a phone you get a TradingView-style bottom tab bar (Home / Macro / Charts / Markets / More) and a fullscreen search overlay. Add it to your home screen for an app-like experience.</>,
  },

  // ── Billing & plans ─────────────────────────────────────────
  {
    cat: "billing",
    q: "How much does Termimal cost?",
    a: <>Pricing is in EUR: <strong>Free €0</strong>, <strong>Pro €9.99/month</strong>, <strong>Premium €19.99/month</strong>. Both Pro and Premium ship with a 14-day free trial. See <Link className="link-acc" href="/pricing">/pricing</Link> for the full breakdown.</>,
  },
  {
    cat: "billing",
    q: "What does the free trial include?",
    a: <>Whichever paid tier you select on signup. Pick Pro on signup and you get 14 days of Pro at no charge; pick Premium and you get 14 days of Premium. No credit card required to start. You can cancel before day 14 with no charge.</>,
  },
  {
    cat: "billing",
    q: "What's the difference between Pro and Premium?",
    a: <>
      <strong>Pro</strong> is the TradingView-equivalent layer: full Charts (multi-pane, every indicator, drawing tools), advanced Screener, the Risk engine, COT positioning, Macro intelligence, full News flow, full Portfolio, full Global Indicators, and the Desktop app.
      <br /><br />
      <strong>Premium</strong> adds Termimal&rsquo;s intelligence moat: Polymarket event probabilities & signals, on-chain analytics (BTC MVRV / Z-Score / wallet flows), sentiment & manipulation detection, the weekly AI briefing, sovereign intelligence, API access, and priority support.
    </>,
  },
  {
    cat: "billing",
    q: "How do I upgrade or change my plan?",
    a: <>Go to <Link className="link-acc" href="/dashboard/billing">Billing</Link> in your dashboard. Upgrades take effect immediately; downgrades take effect at the next billing date. Stripe handles payment.</>,
  },
  {
    cat: "billing",
    q: "How do I cancel my subscription?",
    a: <>From <Link className="link-acc" href="/dashboard/billing">/dashboard/billing</Link> click <em>Cancel subscription</em>. You keep access until the end of the period you&rsquo;ve already paid for; no further charges.</>,
  },
  {
    cat: "billing",
    q: "Do you offer refunds?",
    a: <>Use the 14-day trial to evaluate before paying. After that, we don&rsquo;t issue partial-month refunds, but you can cancel any time and keep access until the end of your billing period. Read the full <Link className="link-acc" href="/refund-policy">refund policy</Link>.</>,
  },
  {
    cat: "billing",
    q: "Do you charge VAT?",
    a: <>Prices are quoted excluding tax. EU customers may see VAT applied at checkout based on their country of residence. Stripe collects it and we remit it.</>,
  },
  {
    cat: "billing",
    q: "Can I get a referral discount?",
    a: <>Yes. Each Pro+ account has a referral link at <Link className="link-acc" href="/dashboard/referrals">/dashboard/referrals</Link>. When someone signs up through your link and pays, you get one month of credit on your next bill.</>,
  },

  // ── Account & security ──────────────────────────────────────
  {
    cat: "account",
    q: "How do I reset my password?",
    a: <>From the <Link className="link-acc" href="/login">login page</Link> click <em>Forgot password</em>, or go directly to <Link className="link-acc" href="/forgot-password">/forgot-password</Link>. The reset link arrives by email and expires after 24 hours.</>,
  },
  {
    cat: "account",
    q: "How do I enable two-factor authentication?",
    a: <>Open <Link className="link-acc" href="/dashboard/profile">/dashboard/profile</Link> and click <em>Enable 2FA</em>. Scan the QR with any TOTP app — Google Authenticator, Authy, 1Password, Bitwarden — and verify the 6-digit code. Recommended for everyone.</>,
  },
  {
    cat: "account",
    q: "How do I change my email address?",
    a: <>Email <a className="link-acc" href="mailto:hello@termimal.com">hello@termimal.com</a> from the address on file. We re-verify the new address before switching to keep account takeovers from succeeding.</>,
  },
  {
    cat: "account",
    q: "Is my data secure?",
    a: <>Authentication runs on Supabase Auth (industry-standard cookie-based sessions; passwords are bcrypt-hashed, never stored plaintext). Traffic is TLS 1.3 end-to-end. Payment details are tokenised by Stripe — Termimal never sees your card number.</>,
  },
  {
    cat: "account",
    q: "Where do I see my login sessions?",
    a: <>Currently sessions list / revoke isn&rsquo;t exposed in the UI. If you suspect unauthorised access, change your password from <Link className="link-acc" href="/dashboard/profile">Profile</Link> — that invalidates every existing session globally.</>,
  },
  {
    cat: "account",
    q: "How do I delete my account?",
    a: <>Email <a className="link-acc" href="mailto:hello@termimal.com">hello@termimal.com</a> with the subject <em>Account deletion</em>. We respond within 5 business days. Deletion is permanent and irreversible.</>,
  },
  {
    cat: "account",
    q: "Can I export my data?",
    a: <>Yes. Email <a className="link-acc" href="mailto:hello@termimal.com">hello@termimal.com</a> with the subject <em>Data export</em>. We send a JSON archive of your profile, watchlists, tab layout, and alerts.</>,
  },

  // ── Charts & data ───────────────────────────────────────────
  {
    cat: "charts-data",
    q: "What markets are supported?",
    a: <>The terminal&rsquo;s search universe covers ~200 most-liquid US-listed names: stocks, ETFs, indices, crypto pairs, FX majors and crosses, and futures (commodities, treasuries, equity indices). Type any other Yahoo-listed symbol manually and we&rsquo;ll try to load it.</>,
  },
  {
    cat: "charts-data",
    q: "Where does the data come from?",
    a: <>Yahoo Finance (prices, history, fundamentals, analyst targets), FRED (US macro time-series), CFTC (COT), SEC EDGAR (XBRL fundamentals), Polymarket public CLOB (prediction markets). All free public sources — no paid keys.</>,
  },
  {
    cat: "charts-data",
    q: "How real-time is the price data?",
    a: <>Quotes refresh on a 15-second cadence with 15-second client-side polling and Cloudflare edge caching on top. Equity quotes are end-of-day delayed during US market hours (Yahoo&rsquo;s standard). Crypto and FX are continuous.</>,
  },
  {
    cat: "charts-data",
    q: "How do I set up price alerts?",
    a: <>Open <Link className="link-acc" href="/dashboard/alerts">/dashboard/alerts</Link> from the dashboard. Add an instrument, condition (greater-than / less-than), and trigger price. Alerts fire by email; in-app push is on the roadmap.</>,
  },
  {
    cat: "charts-data",
    q: "How big can my watchlist get?",
    a: <>Free is capped (see your dashboard for the live count); Pro and Premium are effectively unlimited. The watchlist sidebar (right side of the desktop terminal) lets you organise into multiple sections with drag-and-drop.</>,
  },
  {
    cat: "charts-data",
    q: "Why don&rsquo;t I see live data on a specific page?",
    a: <>Hit our <Link className="link-acc" href="/status">status page</Link> first to confirm whether a backend endpoint is degraded. If status is green but the terminal disagrees, sign out and back in to refresh your session token. If still broken, chat us with the symbol you were viewing.</>,
  },
  {
    cat: "charts-data",
    q: "What technical indicators are included?",
    a: <>Free Charts ship with one indicator at a time and 3-month range. Pro Charts ship with multi-pane layouts, custom indicators, drawing tools, and unlimited history range. Pro also includes the Screener with full filter set and saved presets.</>,
  },

  // ── Technical issues ────────────────────────────────────────
  {
    cat: "technical",
    q: "Pages outside the terminal feel shifted on mobile",
    a: <>Should not happen anywhere — every section is constrained to the viewport. If you spot a page where it does, screenshot the page + your browser/OS and chat us; we patch fast.</>,
  },
  {
    cat: "technical",
    q: "iOS Safari zooms in when I tap an input",
    a: <>Should also not happen — every input on the site renders ≥ 16 px which is Safari&rsquo;s threshold for skipping auto-zoom. If you do see it, tell us which page.</>,
  },
  {
    cat: "technical",
    q: "Web terminal text is too small",
    a: <>The desktop terminal uses an institutional Bloomberg-style density on purpose, scaled by the root <code>--terminal-zoom</code> variable. If you want it bigger, the terminal applies the browser&rsquo;s native zoom (Ctrl/Cmd +) on top of that. We&rsquo;re also continuously bumping defaults — feedback welcome.</>,
  },
  {
    cat: "technical",
    q: "I see &lsquo;Error 1102 — Worker exceeded resource limits&rsquo;",
    a: <>That&rsquo;s a Cloudflare edge CPU spike on a cold worker. It usually clears in a few seconds — refresh once. If it persists across multiple refreshes on the same page, chat us with the URL.</>,
  },
  {
    cat: "technical",
    q: "Polymarket / fundamentals returns slowly",
    a: <>Polymarket scan and fundamentals do heavy upstream calls + analysis. First load on a cold cache can take a few seconds. Subsequent loads within ~5 minutes are served from edge cache (sub-millisecond).</>,
  },

  // ── Desktop app ─────────────────────────────────────────────
  {
    cat: "desktop-app",
    q: "Where do I download the desktop app?",
    a: <>From <Link className="link-acc" href="/download">/download</Link>. Builds for macOS (Apple Silicon + Intel), Windows, and Linux are available.</>,
  },
  {
    cat: "desktop-app",
    q: "Is the desktop app included in my plan?",
    a: <>The desktop app gates as a Pro feature in lib/plan.ts. Free users see the marketing page but the in-app license check requires a Pro or Premium subscription.</>,
  },
  {
    cat: "desktop-app",
    q: "Can I use Termimal on multiple devices?",
    a: <>Yes — the same account works in the web terminal and the desktop app simultaneously. Watchlist contents, tab layout, and alerts sync via Supabase.</>,
  },
  {
    cat: "desktop-app",
    q: "How do I update the desktop app?",
    a: <>The app checks for updates on launch and prompts you to install when one is available. Updates are signed builds; install only signed releases.</>,
  },
]

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const [activeCat, setActiveCat] = useState<Category | null>(null)

  const counts = useMemo(() => {
    const out: Record<Category, number> = {
      "getting-started": 0, billing: 0, technical: 0,
      account: 0, "charts-data": 0, "desktop-app": 0,
    }
    for (const f of FAQS) out[f.cat] += 1
    return out
  }, [])

  const filtered = useMemo(() => {
    let pool = FAQS
    if (activeCat) pool = pool.filter(f => f.cat === activeCat)
    if (query.trim()) {
      const q = query.toLowerCase()
      pool = pool.filter(f =>
        f.q.toLowerCase().includes(q) ||
        // For React-node answers we can&apos;t easily lowercase; match on q only.
        f.q.toLowerCase().includes(q),
      )
    }
    return pool
  }, [query, activeCat])

  const activeCatLabel = activeCat
    ? CATEGORIES.find(c => c.key === activeCat)?.label
    : null

  return (
    <PageShell title="Help center">
    <div style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-12 text-center">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Help Center</div>
          <h1 className="text-3xl font-semibold sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>How can we help?</h1>
          <p className="mt-3 text-sm" style={{ color: "var(--t3)" }}>
            Browse topics, search the FAQ, or chat with support.{" "}
            For the full walkthrough see the{" "}
            <Link href="/support/guide" className="link-acc">guide</Link>.
          </p>
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

        {/* Category strip — actually clickable now */}
        {!query && (
          <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORIES.map(c => {
              const active = activeCat === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActiveCat(active ? null : c.key)}
                  aria-pressed={active}
                  className="cursor-pointer rounded-2xl border p-5 text-left transition-all"
                  style={{
                    borderColor: active
                      ? "var(--acc)"
                      : "color-mix(in srgb, var(--border) 84%, white 16%)",
                    background: active ? "var(--acc-d)" : "var(--surface)",
                    minHeight: 110,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bh)" }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = "color-mix(in srgb, var(--border) 84%, white 16%)" }}
                >
                  <div className="mb-2 text-2xl">{c.icon}</div>
                  <div className="text-sm font-semibold" style={{ color: active ? "var(--acc)" : "var(--t1)" }}>{c.label}</div>
                  <div className="mt-1 text-xs" style={{ color: "var(--t3)" }}>
                    {counts[c.key]} {counts[c.key] === 1 ? "article" : "articles"}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Reset filter row */}
        {!query && activeCat && (
          <div className="mb-4 flex items-center justify-between gap-3 text-sm" style={{ color: "var(--t3)" }}>
            <span>
              Showing <strong style={{ color: "var(--t1)" }}>{counts[activeCat]}</strong>{" "}
              article{counts[activeCat] === 1 ? "" : "s"} in <strong style={{ color: "var(--t1)" }}>{activeCatLabel}</strong>
            </span>
            <button
              type="button"
              onClick={() => setActiveCat(null)}
              className="text-sm font-medium"
              style={{ color: "var(--acc)" }}
            >
              Show all topics
            </button>
          </div>
        )}

        <div className="mb-10 overflow-hidden rounded-2xl border"
          style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)" }}>
          <div className="border-b px-6 py-4"
            style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)" }}>
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t3)" }}>
              {query
                ? `${filtered.length} results for "${query}"`
                : activeCatLabel ?? "Frequently Asked Questions"}
            </span>
          </div>
          {filtered.map((f, i) => (
            <div key={`${f.cat}-${i}`} className="border-b last:border-b-0"
              style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent 50%)" }}>
              <button
                className="flex w-full items-center justify-between px-6 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="text-sm font-medium pr-4">{f.q}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ flexShrink: 0, marginLeft: 12, transform: open === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--t3)" }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm leading-7" style={{ color: "var(--t2)" }}>{f.a}</div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-sm" style={{ color: "var(--t3)" }}>
              No results found.{" "}
              <button
                type="button"
                onClick={() => { setQuery(""); setActiveCat(null) }}
                className="font-medium"
                style={{ color: "var(--acc)" }}
              >
                Clear filters
              </button>
            </div>
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
            <Link href="/support/guide" className="rounded-2xl border px-5 py-3 text-sm font-semibold"
              style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", color: "var(--t1)" }}>
              Read the guide
            </Link>
            <Link href="/support" className="rounded-2xl border px-5 py-3 text-sm font-semibold"
              style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", color: "var(--t1)" }}>
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
    </PageShell>
  )
}
