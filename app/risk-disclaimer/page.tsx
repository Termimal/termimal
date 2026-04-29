import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Risk Disclaimer — Termimal',
  description:
    "Important risk disclaimer covering Termimal's research, analytics, and any information presented on the platform.",
  alternates: { canonical: '/risk-disclaimer' },
  openGraph: {
    title: 'Risk Disclaimer — Termimal',
    description:
      "Important risk disclaimer covering Termimal's research, analytics, and any information presented on the platform.",
    url: '/risk-disclaimer',
    type: 'website',
  },
}

export default function RiskDisclaimerPage() {
  return (
    <div className="min-h-screen pt-32 pb-20" style={{ background: 'var(--bg)' }}>
      <div className="max-w-[800px] mx-auto px-4 md:px-8">
        <Link href="/" className="text-sm mb-8 inline-block hover:underline" style={{ color: 'var(--acc)' }}>← Back to Home</Link>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>Risk Disclaimer</h1>
        
        <div className="space-y-8 text-sm leading-relaxed mt-8" style={{ color: 'var(--t2)' }}>
          <div className="p-6 rounded-xl mb-8" style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)' }}>
            <p className="font-bold mb-2" style={{ color: 'var(--red-val)' }}>HIGH RISK WARNING</p>
            <p style={{ color: 'var(--t1)' }}>Trading foreign exchange, cryptocurrencies, equities, and commodities on margin carries a high level of risk and may not be suitable for all investors. The high degree of leverage can work against you as well as for you.</p>
          </div>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>Informational Purposes Only</h2>
            <p>Termimal is an analytical tool. All content, data, indicators, and market analysis provided by Termimal or Hiram OÜ are for informational and educational purposes only. Nothing on our platform should be construed as a recommendation to buy, sell, or hold any financial instrument.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>Past Performance</h2>
            <p>Past performance of any trading system, methodology, or asset is not necessarily indicative of future results. You should carefully consider your investment objectives, level of experience, and risk appetite before making any financial decisions.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>CFTC Rule 4.41</h2>
            <p>Hypothetical or simulated performance results have certain limitations. Unlike an actual performance record, simulated results do not represent actual trading. No representation is being made that any account will or is likely to achieve profit or losses similar to those shown on our charts or macro data overlays.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
