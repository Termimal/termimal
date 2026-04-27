import type { Metadata } from 'next'
import Script from 'next/script'
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
  Footer,
} from '@/components/sections'
import HomeFaq from '@/components/HomeFaq'

// Homepage-specific metadata (overrides root layout defaults for this route only)
export const metadata: Metadata = {
  title: 'Termimal — Trading Analysis Platform',
  description:
    'Termimal is a professional trading analysis platform for charting, macro intelligence, CFTC COT positioning, on-chain analytics, sentiment, and risk research.',
  alternates: {
    canonical: 'https://termimal.com/',
  },
  openGraph: {
    title: 'Termimal — Trading Analysis Platform',
    description:
      'Termimal is a professional trading analysis platform for charting, macro intelligence, CFTC COT positioning, on-chain analytics, sentiment, and risk research.',
    url: 'https://termimal.com/',
    type: 'website',
    siteName: 'Termimal',
  },
}

// --- Structured Data ---
// WebSite: standalone block; tells Google the site name is "Termimal"
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  url: 'https://termimal.com/',
  name: 'Termimal',
  alternateName: 'Termimal.com',
}

// Organization: standalone block; reinforces brand identity
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Termimal',
  url: 'https://termimal.com/',
  // TODO: replace /logo.png with actual logo path once available
  logo: 'https://termimal.com/logo.png',
  // TODO: add sameAs URLs if Termimal has social/company profiles, e.g.:
  // sameAs: ['https://twitter.com/termimal', 'https://linkedin.com/company/termimal'],
}

export default function Home() {
  return (
    <main>
      {/* WebSite schema — primary Google site-name signal */}
      <Script
        id="termimal-website-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      {/* Organization schema — brand entity signal */}
      <Script
        id="termimal-org-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
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
      {/* Replaced static FAQSection with our dynamic HomeFaq! */}
      <HomeFaq />
      <div className="divider" />
      <CTASection />
      <Footer />
    </main>
  )
}
