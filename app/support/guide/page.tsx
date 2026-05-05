import type { Metadata } from "next"
import Link from "next/link"
import Navbar from "@/components/layout/Navbar"
import { Footer } from "@/components/sections/Footer"
import { getCanonicalUrl } from "@/lib/seo/canonical"

export const metadata: Metadata = {
  title: "Termimal Guide & Knowledge Base — How to use the platform",
  description:
    "A complete walkthrough of Termimal: signup, the web terminal, every page (Dashboard, Macro, Charts, Markets, Risk, COT, Portfolio, Indicators, Fundamentals), keyboard shortcuts, billing, and troubleshooting.",
  alternates: { canonical: getCanonicalUrl("/support/guide") },
  openGraph: {
    title: "Termimal Guide & Knowledge Base",
    description:
      "Complete walkthrough of Termimal — signup, web terminal, every page, billing, and troubleshooting.",
    url: "/support/guide",
    type: "article",
  },
}

interface Section {
  id: string
  title: string
  body: React.ReactNode
}

interface Group {
  label: string
  sections: Section[]
}

const GROUPS: Group[] = [
  {
    label: "Welcome",
    sections: [
      {
        id: "what-is-termimal",
        title: "What is Termimal?",
        body: (
          <>
            <p>
              Termimal is a professional trading <strong>analysis</strong> platform. We do not execute
              orders. We help you research markets, monitor macro conditions, study positioning data,
              and pressure-test scenarios before you trade elsewhere.
            </p>
            <p>
              The product has two surfaces:
            </p>
            <ul>
              <li>
                <strong>The marketing site</strong> at <code>termimal.com</code> — pricing, features,
                signup, billing, and the support area you&rsquo;re reading now.
              </li>
              <li>
                <strong>The web terminal</strong> at <code>termimal.com/terminal</code> — the actual
                analysis app. Charts, COT positioning, Polymarket signals, fundamentals, watchlist,
                risk engine, etc.
              </li>
            </ul>
            <p>
              Everything is browser-first. No download required. There&rsquo;s an optional desktop
              app on the <Link href="/download" className="link-acc">download page</Link> for users
              who prefer a windowed experience, but it wraps the same web terminal.
            </p>
          </>
        ),
      },
      {
        id: "who-its-for",
        title: "Who is it for?",
        body: (
          <>
            <p>
              Active traders, prop-firm and prop-style discretionary traders, retail systematic
              traders, and analysts who want institutional-grade data without paying institutional
              prices. If you&rsquo;ve looked at TradingView for charts and felt the macro / COT /
              positioning side was missing, that&rsquo;s where Termimal sits.
            </p>
          </>
        ),
      },
    ],
  },

  {
    label: "Getting started",
    sections: [
      {
        id: "signup",
        title: "Creating an account",
        body: (
          <>
            <p>
              Head to <Link href="/signup" className="link-acc">termimal.com/signup</Link>. You can
              sign up with email + password, or with Google / GitHub via OAuth. New accounts start on
              the <strong>Free plan</strong> with a 14-day trial of <strong>Pro</strong> features —
              no credit card required upfront.
            </p>
            <p>Validation rules on signup:</p>
            <ul>
              <li>Email must be a real, non-disposable address (we reject mailinator, guerrilla, etc.).</li>
              <li>Password 8&ndash;72 characters.</li>
              <li>Cloudflare Turnstile captcha on submit (no friction unless you&rsquo;re flagged as suspicious).</li>
            </ul>
            <p>
              After submitting you&rsquo;ll get a confirmation email. Click the link to activate. The
              link expires after 24 hours — request a new one from the login page if it lapses.
            </p>
          </>
        ),
      },
      {
        id: "logging-in",
        title: "Logging in",
        body: (
          <>
            <p>
              <Link href="/login" className="link-acc">termimal.com/login</Link>. Email + password,
              SSO (Google / GitHub), or phone-OTP. Two-factor authentication via TOTP authenticator
              app is supported and strongly recommended — set it up under{" "}
              <Link href="/dashboard/profile" className="link-acc">Profile &rarr; Two-factor authentication</Link>.
            </p>
            <p>
              Forgot your password? Use the{" "}
              <Link href="/forgot-password" className="link-acc">password reset</Link> flow. Sessions
              persist across the marketing site and the web terminal — sign in once, both surfaces
              recognise you.
            </p>
          </>
        ),
      },
      {
        id: "free-trial",
        title: "Free trial & plans",
        body: (
          <>
            <p>
              Plans are listed at <Link href="/pricing" className="link-acc">termimal.com/pricing</Link>. In short:
            </p>
            <ul>
              <li>
                <strong>Free</strong> — Dashboard, basic Charts, Indicators, watchlist (limited
                symbols). Good for casual viewing.
              </li>
              <li>
                <strong>Pro</strong> — All TradingView-equivalent tools: full Charts with
                drawing/indicators, Screener, Risk engine, COT positioning, Macro intelligence,
                expanded watchlist.
              </li>
              <li>
                <strong>Premium</strong> — Adds Polymarket signals, AI weekly briefing, deeper
                fundamentals (FMP-backed), event-risk calendar.
              </li>
            </ul>
            <p>
              Trial converts on day 14 to whichever plan you selected. You can cancel any time
              before that under <Link href="/dashboard/billing" className="link-acc">Billing</Link>{" "}
              — no charge if you cancel during the trial.
            </p>
          </>
        ),
      },
    ],
  },

  {
    label: "The web terminal",
    sections: [
      {
        id: "terminal-layout",
        title: "Terminal layout — desktop vs mobile",
        body: (
          <>
            <p>
              Open the terminal at <Link href="/terminal" className="link-acc">termimal.com/terminal</Link>.
              The layout adapts to your viewport.
            </p>
            <p><strong>Desktop (&ge; 900 px wide):</strong></p>
            <ul>
              <li>
                <strong>Top bar</strong> — logo, full-text search box (&#8984;K to focus), regime
                chip (RISK-ON / RISK-OFF / NEUTRAL), connection status, clock, account avatar.
              </li>
              <li>
                <strong>Left rail</strong> — vertical icon nav with every primary destination one
                click away. Click the chevron at the bottom to expand it with labels.
              </li>
              <li>
                <strong>Tab bar</strong> — TradingView-style workspace tabs across the top. Drag to
                reorder, click &times; to close. The <code>+</code> button opens the &ldquo;new
                tab&rdquo; landing page.
              </li>
              <li>
                <strong>Main content area</strong> — the active page renders here.
              </li>
              <li>
                <strong>Right sidebar</strong> — your watchlist with sparklines and live prices.
              </li>
            </ul>
            <p><strong>Mobile (&lt; 900 px wide):</strong></p>
            <ul>
              <li>
                <strong>Top bar</strong> — logo + live indicator + regime chip + a search icon. The
                search icon opens a fullscreen search overlay.
              </li>
              <li>
                <strong>Bottom tab bar</strong> — Home / Macro / Charts / Markets / More. The
                &ldquo;More&rdquo; tab opens a bottom sheet with the rest of the pages plus
                profile / billing / sign out.
              </li>
              <li>
                <strong>No sidebar</strong> — the watchlist is reachable via the search overlay.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "search",
        title: "Search & open a ticker",
        body: (
          <>
            <p>
              Press <code>&#8984;K</code> (Mac) or <code>Ctrl-K</code> (Windows) to focus the search
              from anywhere. Type a symbol or company name. Filter by category — Stocks, ETFs,
              Indices, Crypto, Forex, Futures.
            </p>
            <p>
              Tap a result to open the <strong>Ticker Workspace</strong> for that symbol — chart
              hero, KPI strip, regression, news, analysis, analyst consensus, fundamentals all
              under one roof.
            </p>
            <p>
              The search universe contains the ~200 most-liquid US-listed instruments. If your
              ticker isn&rsquo;t in the list, type it anyway and press Enter — Termimal will try to
              load data from Yahoo Finance.
            </p>
          </>
        ),
      },
      {
        id: "dashboard",
        title: "Dashboard",
        body: (
          <>
            <p>
              The home page of the terminal. Shows the macro driver strip (8 tiles: 10Y, 10Y-2Y
              spread, VIX, HY OAS, HYG/LQD, RSP/SPY, DXY, WTI), active warnings (curve inversion,
              credit stress, breadth fragility, VIX spikes), live regime call, and a markets
              ribbon.
            </p>
            <p>
              Each tile is clickable — clicking VIX takes you straight to the Macro page filtered
              on volatility; clicking US 10Y opens the rates view. Sparklines under each metric
              show the last ~40 weekly observations.
            </p>
          </>
        ),
      },
      {
        id: "macro",
        title: "Macro intelligence",
        body: (
          <>
            <p>
              Pulls FRED time-series, ICE / CBOE / CFTC data, and Yahoo composites. You see:
            </p>
            <ul>
              <li>Yields (US / EU / JP) with weekly resolution.</li>
              <li>Curve shape (10Y-2Y, 5Y-2Y) with inversion flagging.</li>
              <li>Credit spreads (HY OAS, HYG/LQD ratio).</li>
              <li>Volatility surface (VIX, MOVE, OVX).</li>
              <li>Liquidity proxies (M2, WALCL).</li>
              <li>Inflation expectations (5Y5Y break-evens, T10YIE).</li>
            </ul>
            <p>
              Pro tier. Each card has an interpretation line that tells you what the value means in
              plain English (e.g. &ldquo;HY OAS at 2.4% &mdash; well below 3.5% panic threshold,
              credit calm&rdquo;).
            </p>
          </>
        ),
      },
      {
        id: "charts",
        title: "Charts",
        body: (
          <>
            <p>
              TradingView-style chart with candlesticks, volume, and full drawing tools. Indicators
              available: SMA / EMA, Bollinger, RSI, MACD, Stochastic, ATR, VWAP, OBV. Scroll the
              wheel to zoom; left-drag to pan.
            </p>
            <p>
              Multi-timeframe. Hit the timeframe selector for 1m / 5m / 15m / 1h / 4h / 1d / 1w /
              1M. The chart canvas is always full-width; on mobile it scales to your viewport.
            </p>
            <p>
              Pro tier. Free users see a basic chart with one indicator and 3-month range cap.
            </p>
          </>
        ),
      },
      {
        id: "markets-polymarket",
        title: "Markets (Polymarket signals)",
        body: (
          <>
            <p>
              Live cross-market intelligence built on top of Polymarket&rsquo;s public CLOB. The
              page shows:
            </p>
            <ul>
              <li>The top liquid markets ordered by volume.</li>
              <li>Order book depth and recent trades for any market you click.</li>
              <li>
                <strong>Deep scan</strong> &mdash; runs a multi-factor analysis on the top 8
                markets: volume spike multiplier vs the 7-day baseline, BUY/SELL direction shift,
                wallet-cluster confirmation, cross-market alignment with BTC / ETH / VIX / /ES /
                gold. Markets that pass 3 of 4 conditions get a <strong>STRONG</strong> signal.
              </li>
              <li>
                <strong>Whale tape</strong> &mdash; identifies the top wallets in each market by
                notional, with a per-wallet accuracy proxy and pump-dump heuristic.
              </li>
            </ul>
            <p>Premium tier.</p>
          </>
        ),
      },
      {
        id: "news",
        title: "News flow",
        body: (
          <>
            <p>
              Aggregated headlines, categorised by asset class (equities / FX / crypto / commodities
              / macro). Filter by ticker, source, and time window. Each item links to the original.
            </p>
            <p>
              Free tier sees the last 24 hours; Pro and Premium see 30+ day history with full search.
            </p>
          </>
        ),
      },
      {
        id: "screener",
        title: "Screener",
        body: (
          <>
            <p>
              Filter the universe (~200 US-listed names by default) by market cap, sector, P/E,
              fundamental quality, technical setup, and more. Save scans as presets to revisit them
              later.
            </p>
            <p>Pro tier.</p>
          </>
        ),
      },
      {
        id: "risk",
        title: "Risk engine",
        body: (
          <>
            <p>
              The risk page combines:
            </p>
            <ul>
              <li>Crash-risk score (0&ndash;100) derived from VIX, OAS, breadth, curve.</li>
              <li>Sector breadth heat map.</li>
              <li>Volatility surface (skew, term structure).</li>
              <li>Real-time flag system &mdash; e.g. &ldquo;Credit stress&rdquo;, &ldquo;Curve
              inverted&rdquo;, &ldquo;Breadth fragile&rdquo; raise themselves automatically when
              thresholds trigger.</li>
            </ul>
            <p>Pro tier.</p>
          </>
        ),
      },
      {
        id: "cot",
        title: "COT positioning",
        body: (
          <>
            <p>
              Weekly Commitment of Traders data from the CFTC across futures contracts. We classify
              traders into <strong>Commercial</strong> (hedgers), <strong>Non-commercial</strong>{" "}
              (speculators), and <strong>Non-reportable</strong> (small specs).
            </p>
            <p>
              Per contract you get net positions over time, percentile vs 1y / 3y / 5y, extreme
              positioning flags, and a sparkline. Click a contract for a deeper view with weekly
              changes, open interest, and reporter counts.
            </p>
            <p>Pro tier.</p>
          </>
        ),
      },
      {
        id: "portfolio",
        title: "Portfolio",
        body: (
          <>
            <p>
              Track positions you hold elsewhere (we don&rsquo;t execute, so positions are paper).
              Manual entry or CSV upload. Dashboards: total exposure, gross/net, sector breakdown,
              currency split, top winners/losers.
            </p>
            <p>Free tier sees up to 10 positions; Pro is unlimited.</p>
          </>
        ),
      },
      {
        id: "indicators",
        title: "Global indicators",
        body: (
          <>
            <p>
              Country-level macro snapshots: GDP growth, inflation, unemployment, central bank rate,
              budget deficit, debt-to-GDP. Sourced from FRED + IMF + central bank releases. Useful
              for cross-country comparisons or sanity-checking macro narratives.
            </p>
            <p>Free tier.</p>
          </>
        ),
      },
      {
        id: "fundamentals",
        title: "Fundamentals",
        body: (
          <>
            <p>
              Per-ticker financials: revenue, EBITDA, FCF, gross / operating / net margins, ROE /
              ROIC, net debt, leverage, dividend yield, P/E (trailing &amp; forward), PEG, EV/EBITDA,
              52w high/low. Plus quarterly trends — last 8 quarters of revenue / EBITDA / FCF as a
              sparkline.
            </p>
            <p>Pro tier.</p>
          </>
        ),
      },
    ],
  },

  {
    label: "Account & billing",
    sections: [
      {
        id: "profile",
        title: "Profile & 2FA",
        body: (
          <>
            <p>
              Manage at <Link href="/dashboard/profile" className="link-acc">/dashboard/profile</Link>.
              Edit name, country, timezone, language. Change email by contacting support (we
              re-verify the new address). Enable two-factor with any TOTP authenticator
              (Authy / 1Password / Google Authenticator / Bitwarden — they all work).
            </p>
          </>
        ),
      },
      {
        id: "billing",
        title: "Billing & subscription",
        body: (
          <>
            <p>
              At <Link href="/dashboard/billing" className="link-acc">/dashboard/billing</Link>{" "}
              you can:
            </p>
            <ul>
              <li>Upgrade / downgrade plan.</li>
              <li>Switch between monthly and annual (annual = ~2 months free).</li>
              <li>Update payment method.</li>
              <li>Cancel — access continues to the end of the current billing period.</li>
              <li>Download invoices.</li>
            </ul>
            <p>
              Payments are processed by Stripe. We never store your card details on our servers.
            </p>
          </>
        ),
      },
      {
        id: "referrals",
        title: "Referrals",
        body: (
          <>
            <p>
              Each Pro+ user has a referral link at{" "}
              <Link href="/dashboard/referrals" className="link-acc">/dashboard/referrals</Link>.
              Share it. When someone signs up via your link and converts to paid, you get one month
              of credit on your next bill (capped at 12 months / year).
            </p>
          </>
        ),
      },
    ],
  },

  {
    label: "Power user tips",
    sections: [
      {
        id: "shortcuts",
        title: "Keyboard shortcuts",
        body: (
          <>
            <ul>
              <li><code>&#8984;K</code> / <code>Ctrl-K</code> &mdash; focus the search box (anywhere in the terminal).</li>
              <li><code>/</code> &mdash; same as &#8984;K when no input is currently focused.</li>
              <li><code>Esc</code> &mdash; close any open dropdown / overlay.</li>
              <li><code>Tab</code> / <code>Shift-Tab</code> &mdash; move focus between interactive elements (full keyboard accessible).</li>
              <li><code>Enter</code> &mdash; activate the focused button / link / first search result.</li>
            </ul>
          </>
        ),
      },
      {
        id: "tabs-workspaces",
        title: "Workspaces (tabs)",
        body: (
          <>
            <p>
              The horizontal tab bar above the content area works like a browser. Drag to reorder.
              Click &times; to close. The <code>+</code> button opens the &ldquo;new tab&rdquo;
              landing page where you pick what to add. Your tab layout persists in
              <code>localStorage</code> &mdash; refresh and you&rsquo;re back where you left.
            </p>
          </>
        ),
      },
      {
        id: "watchlist",
        title: "Watchlist",
        body: (
          <>
            <p>
              The right sidebar on desktop. Sections are user-defined (e.g. &ldquo;Megacaps&rdquo;,
              &ldquo;FX majors&rdquo;, &ldquo;Crypto&rdquo;). Drag tickers between sections.
              Sparklines update on a 60-second cadence; price/change values update every 60s in
              free tier and every 15s in Pro+.
            </p>
            <p>Free tier sees up to 25 symbols; Pro &amp; Premium are unlimited.</p>
          </>
        ),
      },
    ],
  },

  {
    label: "Troubleshooting",
    sections: [
      {
        id: "no-data",
        title: "I see &lsquo;Backend offline&rsquo; or no data anywhere",
        body: (
          <>
            <p>
              99% of the time this is Yahoo Finance rate-limiting the source. Wait 30 seconds and
              hard-refresh (Cmd-Shift-R / Ctrl-Shift-R). If it persists for more than a few
              minutes:
            </p>
            <ol>
              <li>Check our <Link href="/status" className="link-acc">status page</Link> &mdash; it
              shows the last health-check result for every backend endpoint.</li>
              <li>If status is green but the terminal disagrees, sign out and sign back in to
              refresh your session token.</li>
              <li>Still broken? Open a chat from the <Link href="/support" className="link-acc">support
              page</Link> with the symbol you were viewing and we&rsquo;ll investigate.</li>
            </ol>
          </>
        ),
      },
      {
        id: "ios-zoom",
        title: "iOS Safari zooms in when I focus an input",
        body: (
          <>
            <p>
              That should not happen anywhere in the app — every input is sized 16 px+ which is
              Safari&rsquo;s threshold for not auto-zooming. If you do see it, screenshot the page
              and contact support; it&rsquo;s a bug.
            </p>
          </>
        ),
      },
      {
        id: "mobile-misalign",
        title: "Pages look shifted / not centered on mobile",
        body: (
          <>
            <p>
              We applied a global mobile centering rule that constrains every section to the
              viewport with proper gutters. If a specific page still looks off, screenshot the page
              + your device + browser and chat us &mdash; we&rsquo;ll patch it.
            </p>
          </>
        ),
      },
      {
        id: "cant-sign-in",
        title: "I can&rsquo;t sign in",
        body: (
          <>
            <ol>
              <li>Confirm you&rsquo;re using the email you signed up with (case-insensitive).</li>
              <li>If you signed up via Google/GitHub, use the same OAuth button — password
              auth won&rsquo;t work for OAuth-only accounts.</li>
              <li>Try the <Link href="/forgot-password" className="link-acc">password reset</Link>{" "}
              flow if you suspect the password.</li>
              <li>If you see &ldquo;Invalid login credentials&rdquo; repeatedly, your account may
              have been temporarily locked after too many failed attempts. Wait 15 minutes and try
              again.</li>
              <li>Two-factor enabled? Make sure your authenticator&rsquo;s clock is in sync with
              real time — drift &gt; 30 seconds breaks TOTP.</li>
            </ol>
          </>
        ),
      },
    ],
  },

  {
    label: "Privacy & data",
    sections: [
      {
        id: "what-we-store",
        title: "What we store about you",
        body: (
          <>
            <p>Minimum necessary:</p>
            <ul>
              <li>Email + password hash (passwords are never stored in plaintext).</li>
              <li>Profile fields you fill in (name, country, timezone, language).</li>
              <li>Subscription state and Stripe customer ID.</li>
              <li>Watchlist contents and tab layout (so they sync across devices).</li>
              <li>Aggregated usage logs for product analytics — no individual queries are tied to
              your identity beyond 30 days.</li>
            </ul>
            <p>
              See the full <Link href="/privacy" className="link-acc">privacy policy</Link> for
              data-retention specifics, third-party processors, and your GDPR / CCPA rights.
            </p>
          </>
        ),
      },
      {
        id: "data-export-deletion",
        title: "Export or delete my data",
        body: (
          <>
            <p>
              Email{" "}
              <a href="mailto:hello@termimal.com" className="link-acc">
                hello@termimal.com
              </a>{" "}
              from the address on file with the subject &ldquo;Data export&rdquo; or &ldquo;Account
              deletion&rdquo;. We respond within 5 business days. Deletion is permanent and
              irreversible.
            </p>
          </>
        ),
      },
    ],
  },

  {
    label: "Get help",
    sections: [
      {
        id: "contact",
        title: "Contact support",
        body: (
          <>
            <p>
              Three channels:
            </p>
            <ul>
              <li>
                <strong>Live chat</strong> &mdash; the chat bubble in the bottom-right of every
                page. Office hours Mon&ndash;Fri 9&ndash;18 CET; out-of-hours messages get
                answered next business day.
              </li>
              <li>
                <strong>Email</strong> &mdash;{" "}
                <a href="mailto:hello@termimal.com" className="link-acc">hello@termimal.com</a>.
                Best for billing or account-recovery requests where chat isn&rsquo;t practical.
              </li>
              <li>
                <strong>FAQ</strong> &mdash; the <Link href="/help" className="link-acc">help
                page</Link> covers the most common questions in a compact format.
              </li>
            </ul>
          </>
        ),
      },
    ],
  },
]

export default function GuidePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16" style={{ background: "var(--bg)", color: "var(--t1)" }}>
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <header className="mb-10 lg:mb-14">
            <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>
              Knowledge base
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold" style={{ letterSpacing: "-0.03em" }}>
              The Termimal guide
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: "var(--t2)" }}>
              Everything you need to know — signup, the web terminal, every page, billing, keyboard
              shortcuts, troubleshooting, and privacy. Use the table of contents on the left to jump
              around, or scroll top-to-bottom for the long read.
            </p>
          </header>

          <div className="grid lg:grid-cols-[260px_1fr] gap-10 items-start">
            {/* Table of contents — sticky on desktop, inline on mobile */}
            <nav
              aria-label="Table of contents"
              className="lg:sticky lg:top-24 self-start rounded-2xl border p-4 lg:p-5"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: "var(--t4)" }}>
                Contents
              </div>
              <ul className="flex flex-col gap-1 text-[14px]" style={{ color: "var(--t2)" }}>
                {GROUPS.map(g => (
                  <li key={g.label} className="mt-2 first:mt-0">
                    <div
                      className="text-[11px] font-semibold uppercase tracking-[0.16em] py-1"
                      style={{ color: "var(--t4)" }}
                    >
                      {g.label}
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {g.sections.map(s => (
                        <li key={s.id}>
                          <a
                            href={`#${s.id}`}
                            className="block rounded-md px-2 py-1.5 transition-colors"
                            style={{ color: "var(--t2)" }}
                          >
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Body */}
            <article
              className="prose prose-invert max-w-none"
              style={{ color: "var(--t1)" }}
            >
              {GROUPS.map(group => (
                <section key={group.label} className="mb-12">
                  <h2
                    className="text-2xl sm:text-3xl font-semibold mb-6 pb-2 border-b"
                    style={{ borderColor: "var(--border)", letterSpacing: "-0.025em" }}
                  >
                    {group.label}
                  </h2>
                  {group.sections.map(section => (
                    <div
                      key={section.id}
                      id={section.id}
                      className="mb-8 scroll-mt-28"
                    >
                      <h3
                        className="text-lg sm:text-xl font-semibold mb-3"
                        style={{ color: "var(--t1)", letterSpacing: "-0.015em" }}
                      >
                        {section.title}
                      </h3>
                      <div className="text-[15px] leading-7" style={{ color: "var(--t2)" }}>
                        {section.body}
                      </div>
                    </div>
                  ))}
                </section>
              ))}

              {/* Footer CTA */}
              <div
                className="mt-12 rounded-2xl border p-6 sm:p-8"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--acc)" }}>
                  Still stuck?
                </div>
                <h3 className="mt-2 text-xl font-semibold" style={{ letterSpacing: "-0.02em" }}>
                  Reach out — we read every message.
                </h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--t3)" }}>
                  Live chat is the fastest. Email{" "}
                  <a href="mailto:hello@termimal.com" className="link-acc">hello@termimal.com</a>{" "}
                  for anything that needs an attachment.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/support"
                    className="rounded-xl px-4 py-2 text-sm font-semibold"
                    style={{ background: "var(--acc)", color: "#fff" }}
                  >
                    Contact support
                  </Link>
                  <Link
                    href="/help"
                    className="rounded-xl border px-4 py-2 text-sm font-semibold"
                    style={{ borderColor: "var(--border)", color: "var(--t1)" }}
                  >
                    Browse FAQ
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
