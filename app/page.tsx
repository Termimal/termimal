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

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Termimal',
      url: 'https://termimal.com',
      logo: 'https://termimal.com/icon.png'
    },
    {
      '@type': 'WebSite',
      name: 'Termimal',
      url: 'https://termimal.com',
      alternateName: 'termimal.com'
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Termimal',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      url: 'https://termimal.com',
      description: 'A market analysis terminal for charting, macro intelligence, CFTC COT positioning, on-chain analytics, sentiment, and risk research.'
    }
  ]
}
export default function Home() {
  return (
    <main>
      <Script id="termimal-structured-data" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
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
