import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/seo/canonical'
import Navbar from '@/components/layout/Navbar'
import { PricingSection, FAQSection, CTASection } from '@/components/sections'
import { Footer } from '@/components/sections/Footer'

export const metadata: Metadata = {
  title: 'Pricing — Plans for Every Trader',
  description:
    "Compare Termimal pricing plans. Start with a 14-day free trial, cancel anytime. Charting, COT, on-chain, macro, and risk research included.",
  alternates: { canonical: getCanonicalUrl('/pricing') },
  openGraph: {
    title: 'Pricing — Plans for Every Trader | Termimal',
    description:
      "Compare Termimal pricing plans. Start with a 14-day free trial, cancel anytime. Charting, COT, on-chain, macro, and risk research included.",
    url: '/pricing',
    type: 'website',
  },
}

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
