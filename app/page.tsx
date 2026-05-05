// Pin this page as static. Without `force-static` the middleware
// (which runs on /) marks the route dynamic, which on Cloudflare
// Pages means a Worker invocation per request and counts against
// the Free plan's 10 ms CPU ceiling — the source of the
// `Error 1102 — Worker exceeded resource limits` page that fires
// on cold isolates. With `force-static` Next pre-renders the HTML
// at build time and Pages serves it straight from the CDN cache
// (~1 ms TTFB, no Worker invocation, no CPU spend). The Navbar's
// auth state still hydrates correctly client-side via useEffect.
export const dynamic = 'force-static'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import HeroSection from '@/components/hero/HeroSection'
import {
  MarketRibbon,
  NumbersStrip,
  ExploreSection,
  ProductStories,
  MarketsSection,
  PricingSection,
  CTASection,
} from '@/components/sections'
import { Footer } from '@/components/sections/Footer'
import HomeFaq from '@/components/HomeFaq'
import { getCanonicalUrl } from '@/lib/seo/canonical'

export const metadata: Metadata = {
  title: 'Termimal — Trading Analysis Platform',
  description:
    'Termimal is a professional trading analysis platform for charting, macro intelligence, CFTC COT positioning, on-chain analytics, sentiment, and risk research.',
  alternates: {
    canonical: getCanonicalUrl('/'),
  },
  openGraph: {
    title: 'Termimal — Trading Analysis Platform',
    description:
      'Termimal is a professional trading analysis platform for charting, macro intelligence, CFTC COT positioning, on-chain analytics, sentiment, and risk research.',
    url: '/',
    type: 'website',
    siteName: 'Termimal',
  },
}

export default function Home() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <MarketRibbon />
      <div className="divider" />
      <NumbersStrip />
      <div className="divider" />
      <ExploreSection />
      <div className="divider" />
      <ProductStories />
      <div className="divider" />
      <MarketsSection />
      <div className="divider" />
      <PricingSection />
      <div className="divider" />
      <HomeFaq />
      <div className="divider" />
      <CTASection />
      <Footer />
    </main>
  )
}
