import Navbar from '@/components/layout/Navbar'
import { PricingSection, FAQSection, CTASection, Footer } from '@/components/sections'

export default function PricingPage() {
  return (
    <main>
      <Navbar />
      <div className="pt-24">
        <PricingSection />
        <div className="divider" />
        <FAQSection />
        <div className="divider" />
        <CTASection />
        <Footer />
      </div>
    </main>
  )
}
