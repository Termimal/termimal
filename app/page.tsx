export const runtime = 'edge'
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
