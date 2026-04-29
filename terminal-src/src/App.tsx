// App.tsx — TradingView layout: content + watchlist on right.
// The terminal has NO login screen of its own. It is always served inside
// the marketing site's /web-terminal iframe, where the marketing site
// handles sign-in, sign-up, billing, account, and referral flows.
// The terminal still reads the Supabase session to drive plan-tier gating —
// when no session is present (e.g. iframe is cross-origin and the JWT was
// not forwarded), users see the Free tier with upgrade prompts that link
// back to the marketing site.

import { useEffect, useState } from 'react'
import { Routes, Route, useParams } from 'react-router-dom'
import { useStore } from '@/store/useStore'

import { Navbar }     from '@/components/layout/Navbar'
import { Watchlist }  from '@/components/layout/Watchlist'

import { Dashboard }        from '@/pages/Dashboard'
import { MacroPage }        from '@/pages/MacroPage'
import { RiskPage }         from '@/pages/RiskPage'
import { COTPage }          from '@/pages/COTPage'
import { Screener }         from '@/pages/Screener'
import { Fundamentals }     from '@/pages/Fundamentals'
import { TickerWorkspace }  from '@/pages/ticker/TickerWorkspace'
import { Settings }         from '@/pages/Settings'
import { NewTab }           from '@/pages/NewTab'
import { Portfolio }        from '@/pages/Portfolio'
import { Indicators }       from '@/pages/Indicators'
import { Charts }           from '@/pages/Charts'
import { NewsFlow }         from '@/pages/NewsFlow'
import { Polymarket }       from '@/pages/Polymarket'

import { TermsPage, PrivacyPage, CookiesPage, RiskDisclaimerPage, SecurityPage } from '@/pages/legal/LegalPages'
import { CookieConsentBanner, openCookiePreferences } from '@/components/common/CookieConsent'
import { OnboardingTour } from '@/components/common/OnboardingTour'
import { PaywallGate } from '@/components/common/PaywallGate'
import { UpgradeModalHost } from '@/components/common/UpgradeModalHost'
import { TrialBanner } from '@/components/common/TrialBanner'
import { ConnectionBanner } from '@/components/common/ConnectionBanner'


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
        {/* Watchlist sidebar hidden below ~900px wide — phones + small tablets
            still get a usable terminal; the watchlist is one tap away inside
            the New Tab page. */}
        {!isMobile && <Watchlist />}
      </div>
      {/* Persistent footer — Bloomberg-style: tiny, muted, one line.
          Heavier disclaimer text only on signal-generating routes. */}
      <div
        role="contentinfo"
        style={{
          padding: '3px 12px',
          background: '#0a0d12',
          borderTop: '1px solid #161b22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontFamily: "'SF Mono', Menlo, Consolas, monospace",
          fontSize: 8,
          color: '#3a4048',
          flexShrink: 0,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isSignalRoute ? (
            <>Research only · No execution · Not financial advice · Past performance does not guarantee future results.</>
          ) : (
            <>Termimal · Research only · No execution · No advice.</>
          )}
        </span>
        <span style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <a href="/risk-disclaimer" style={{ color: '#3a4048', textDecoration: 'none' }}>Risk</a>
          <a href="/terms" style={{ color: '#3a4048', textDecoration: 'none' }}>Terms</a>
          <a href="/privacy" style={{ color: '#3a4048', textDecoration: 'none' }}>Privacy</a>
          <a href="/security" style={{ color: '#3a4048', textDecoration: 'none' }}>Security</a>
          <button
            type="button"
            onClick={() => openCookiePreferences()}
            style={{ background: 'transparent', border: 'none', color: '#3a4048', cursor: 'pointer', fontFamily: 'inherit', fontSize: 8, padding: 0 }}
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
          </Layout>
        } />
      </Routes>
    </>
  )
}
