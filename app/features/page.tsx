import Navbar from '@/components/layout/Navbar'
import { ExploreSection, ProductStories, CTASection, Footer } from '@/components/sections'

export default function FeaturesPage() {
  return (
    <main>
      <Navbar />
      <div className="pt-24">
        <div className="max-w-site mx-auto px-8 py-16 text-center">
          <div className="section-label">Features</div>
          <h1 className="text-4xl font-bold tracking-tight mb-3" style={{ letterSpacing: '-0.03em' }}>
            Every tool you need to analyze markets
          </h1>
          <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--t3)' }}>
            Advanced charting, macro intelligence, COT positioning, risk analytics, and more —
            all in one professional workspace.
          </p>
        </div>
        <div className="divider" />
        <ExploreSection />
        <div className="divider" />
        <ProductStories />
        <div className="divider" />
        <CTASection />
        <Footer />
      </div>
    </main>
  )
}
