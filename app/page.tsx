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
      
      {/* Replaced static FAQSection with our dynamic HomeFaq! */}
      <HomeFaq />
      
      <div className="divider" />
      <CTASection />
      <Footer />
    </main>
  )
}