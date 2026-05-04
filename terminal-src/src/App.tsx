// App.tsx — TradingView layout: content + watchlist on right.
// The terminal has NO login screen of its own. It is always served inside
// the marketing site's /web-terminal iframe, where the marketing site
// handles sign-in, sign-up, billing, account, and referral flows.
// The terminal still reads the Supabase session to drive plan-tier gating —
// when no session is present (e.g. iframe is cross-origin and the JWT was
// not forwarded), users see the Free tier with upgrade prompts that link
// back to the marketing site.

import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, useParams } from 'react-router-dom'
import { useStore } from '@/store/useStore'

import { Navbar }       from '@/components/layout/Navbar'
import { Watchlist }    from '@/components/layout/Watchlist'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { UNIVERSE, POPULAR_TICKERS } from '@/constants/universe'

// Route-level code splitting. Each page becomes its own chunk so the initial
// payload is small and only the screens a user actually visits are fetched.
// Pages export named symbols, so we map each named export back to React.lazy's
// expected `{ default }` shape.
const Dashboard       = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const MacroPage       = lazy(() => import('@/pages/MacroPage').then(m => ({ default: m.MacroPage })))
const RiskPage        = lazy(() => import('@/pages/RiskPage').then(m => ({ default: m.RiskPage })))
const COTPage         = lazy(() => import('@/pages/COTPage').then(m => ({ default: m.COTPage })))
const Screener        = lazy(() => import('@/pages/Screener').then(m => ({ default: m.Screener })))
const Fundamentals    = lazy(() => import('@/pages/Fundamentals').then(m => ({ default: m.Fundamentals })))
const TickerWorkspace = lazy(() => import('@/pages/ticker/TickerWorkspace').then(m => ({ default: m.TickerWorkspace })))
const Settings        = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })))
const NewTab          = lazy(() => import('@/pages/NewTab').then(m => ({ default: m.NewTab })))
const Portfolio       = lazy(() => import('@/pages/Portfolio').then(m => ({ default: m.Portfolio })))
const Indicators      = lazy(() => import('@/pages/Indicators').then(m => ({ default: m.Indicators })))
const Charts          = lazy(() => import('@/pages/Charts').then(m => ({ default: m.Charts })))
const NewsFlow        = lazy(() => import('@/pages/NewsFlow').then(m => ({ default: m.NewsFlow })))
const Polymarket      = lazy(() => import('@/pages/Polymarket').then(m => ({ default: m.Polymarket })))

const TermsPage          = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.TermsPage })))
const PrivacyPage        = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.PrivacyPage })))
const CookiesPage        = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.CookiesPage })))
const RiskDisclaimerPage = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.RiskDisclaimerPage })))
const SecurityPage       = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.SecurityPage })))
import { CookieConsentBanner, openCookiePreferences } from '@/components/common/CookieConsent'
import { OnboardingTour } from '@/components/common/OnboardingTour'
import { PaywallGate } from '@/components/common/PaywallGate'
import { UpgradeModalHost } from '@/components/common/UpgradeModalHost'
import { TrialBanner } from '@/components/common/TrialBanner'
import { ConnectionBanner } from '@/components/common/ConnectionBanner'

// Lightweight skeleton shown while a route chunk is being fetched.
function RouteFallback() {
  return (
    <div style={{ padding: 24, color: '#8b949e', fontSize: 13, fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>
      Loading…
    </div>
  )
}


function TickerRoute() {
  const { symbol } = useParams<{ symbol: string }>()
  const { loadTickerFundamentals, setCurrentTicker } = useStore()
  useEffect(() => {
    if (!symbol) return
    const sym = symbol.toUpperCase()
    setCurrentTicker(sym)
    loadTickerFundamentals(sym)
    return () => setCurrentTicker(null)
  }, [symbol])
  return <TickerWorkspace symbol={symbol?.toUpperCase() ?? ''} />
}

// Routes where the persistent footer disclaimer is most legally important
// (regime scores, signals, wallet rankings).
const SIGNAL_ROUTES = ['/', '/macro', '/risk', '/cot', '/polymarket', '/news']

function useIsMobile(breakpoint = 900): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

function Layout({ children }: { children: React.ReactNode }) {
  const isSignalRoute = SIGNAL_ROUTES.includes(window.location.pathname)
  const isMobile = useIsMobile()

  // Below 900 px we use a dedicated mobile shell — bottom tab bar +
  // fullscreen search + drawer for secondary pages — instead of
  // squishing the institutional desktop chrome into a phone viewport.
  // Pages render unchanged inside both shells; the CSS in index.css
  // handles per-page collapse via @media (max-width: 899px).
  if (isMobile) {
    return (
      <MobileLayout universe={UNIVERSE} popular={POPULAR_TICKERS}>
        <OnboardingTour />
        <ConnectionBanner />
        <TrialBanner />
        {children}
        {/* Single-line legal disclaimer at the bottom of every mobile
            page; tucked above the bottom-tab bar's safe area. */}
        <div
          role="contentinfo"
          style={{
            padding: '14px 16px 18px',
            fontSize: 11,
            lineHeight: 1.5,
            color: '#484f58',
            textAlign: 'center',
            borderTop: '1px solid #161b22',
            marginTop: 24,
          }}
        >
          {isSignalRoute
            ? 'Research only · No execution · Not financial advice · Past performance does not guarantee future results.'
            : 'Termimal · Research only · No execution · No advice.'}
          <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'center' }}>
            <a href="/risk-disclaimer" style={{ color: '#484f58', textDecoration: 'none' }}>Risk</a>
            <a href="/terms" style={{ color: '#484f58', textDecoration: 'none' }}>Terms</a>
            <a href="/privacy" style={{ color: '#484f58', textDecoration: 'none' }}>Privacy</a>
            <button
              type="button"
              onClick={() => openCookiePreferences()}
              style={{ background: 'transparent', border: 'none', color: '#484f58', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, padding: 0 }}
            >
              Cookies
            </button>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0e1117' }}>
      <OnboardingTour />
      <Navbar />
      <ConnectionBanner />
      <TrialBanner />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0, background: '#0e1117' }}>
          {children}
        </main>
        <Watchlist />
      </div>
      {/* Persistent footer — Bloomberg-style: muted, one line.
          Heavier disclaimer text only on signal-generating routes. */}
      <div
        role="contentinfo"
        style={{
          padding: '8px 16px',
          background: '#0a0d12',
          borderTop: '1px solid #161b22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: 11,
          color: '#6e7681',
          flexShrink: 0,
          letterSpacing: 0.1,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isSignalRoute ? (
            <>Research only · No execution · Not financial advice · Past performance does not guarantee future results.</>
          ) : (
            <>Termimal · Research only · No execution · No advice.</>
          )}
        </span>
        <span style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
          {[
            { href: '/risk-disclaimer', label: 'Risk' },
            { href: '/terms',           label: 'Terms' },
            { href: '/privacy',         label: 'Privacy' },
            { href: '/security',        label: 'Security' },
          ].map(l => (
            <a
              key={l.href}
              href={l.href}
              style={{ color: '#6e7681', textDecoration: 'none', transition: 'color 120ms ease-out' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#c9d1d9' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#6e7681' }}
            >
              {l.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => openCookiePreferences()}
            style={{ background: 'transparent', border: 'none', color: '#6e7681', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, padding: 0, transition: 'color 120ms ease-out' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#c9d1d9' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6e7681' }}
          >
            Cookies
          </button>
        </span>
      </div>
    </div>
  )
}

export default function App() {
  const { refreshAll, darkMode } = useStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    refreshAll()
    const priceTimer = setInterval(() => useStore.getState().refreshPrices(), 60 * 1000)
    const macroTimer = setInterval(() => useStore.getState().refreshMacro(), 5 * 60 * 1000)
    const cotTimer = setInterval(() => useStore.getState().refreshCOT(), 60 * 60 * 1000)
    return () => { clearInterval(priceTimer); clearInterval(macroTimer); clearInterval(cotTimer) }
  }, [])

  return (
    <>
      <CookieConsentBanner />
      <UpgradeModalHost />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* ═══ Legal pages — bare, no Layout ═══ */}
          <Route path="/terms"            element={<TermsPage />} />
          <Route path="/privacy"          element={<PrivacyPage />} />
          <Route path="/cookies"          element={<CookiesPage />} />
          <Route path="/risk-disclaimer"  element={<RiskDisclaimerPage />} />
          <Route path="/security"         element={<SecurityPage />} />

          {/* ═══ Terminal — every other path ═══ */}
          <Route path="*" element={
            <Layout>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/"                element={<Dashboard />} />
                  {/* AI weekly briefing — Premium only (intelligence layer) */}
                  <Route path="/saturday"        element={<PaywallGate feature="aiBriefing"><Dashboard /></PaywallGate>} />
                  <Route path="/fundamentals"    element={<Fundamentals />} />
                  {/* ── Pro tier (professional baseline — TradingView equivalent) ── */}
                  <Route path="/macro"           element={<PaywallGate feature="macroIntelligence"><MacroPage /></PaywallGate>} />
                  <Route path="/screener"        element={<PaywallGate feature="screenerAdvanced"><Screener /></PaywallGate>} />
                  <Route path="/risk"            element={<PaywallGate feature="riskEngine"><RiskPage /></PaywallGate>} />
                  <Route path="/cot"             element={<PaywallGate feature="cotReport"><COTPage /></PaywallGate>} />
                  <Route path="/charts"          element={<PaywallGate feature="chartsAdvanced"><Charts /></PaywallGate>} />
                  {/* ── Premium tier (intelligence layer — Termimal moat) ── */}
                  <Route path="/polymarket"      element={<PaywallGate feature="eventProbabilities"><Polymarket /></PaywallGate>} />
                  {/* ── Free tier ── */}
                  <Route path="/ticker/:symbol"  element={<TickerRoute />} />
                  <Route path="/portfolio"       element={<Portfolio />} />
                  <Route path="/indicators"      element={<Indicators />} />
                  <Route path="/news"            element={<NewsFlow />} />
                  <Route path="/newtab"          element={<NewTab />} />
                  <Route path="/settings"        element={<Settings />} />
                  <Route path="*"                element={<Dashboard />} />
                </Routes>
              </Suspense>
            </Layout>
          } />
        </Routes>
      </Suspense>
    </>
  )
}
