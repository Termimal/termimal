import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Termimal',
  description:
    "The terms governing your use of Termimal's website, web terminal, desktop app, and research products.",
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service — Termimal',
    description:
      "The terms governing your use of Termimal's website, web terminal, desktop app, and research products.",
    url: '/terms',
    type: 'website',
  },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-32 pb-20" style={{ background: 'var(--bg)' }}>
      <div className="max-w-[800px] mx-auto px-8">
        <Link href="/" className="text-sm mb-8 inline-block hover:underline" style={{ color: 'var(--acc)' }}>← Back to Home</Link>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>Terms of Service</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Last updated: April 2026</p>
        
        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--t2)' }}>
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>1. Introduction</h2>
            <p>Welcome to Termimal. These Terms of Service ("Terms") govern your access to and use of the Termimal website, platform, and services (collectively, the "Service"), operated by Hiram OÜ ("we", "us", or "our"). By accessing or using the Service, you agree to be bound by these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>2. Not Financial Advice</h2>
            <p>Termimal is an informational and educational platform. <strong>We are not a registered broker-dealer, investment advisor, or financial institution.</strong> The data, charts, indicators, and content provided on the Service do not constitute financial advice, investment recommendations, or an offer to buy or sell any asset. All trading and investment decisions are made entirely at your own risk.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>3. Data Accuracy</h2>
            <p>While we strive to provide highly accurate and real-time data, financial markets are subject to latency and errors. Termimal provides all data "as is" without any guarantees of accuracy, timeliness, or completeness. We are not liable for any losses incurred due to delayed or inaccurate data.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>4. Acceptable Use & Intellectual Property</h2>
            <p>All platform design, code, proprietary indicators, and layouts are the intellectual property of Hiram OÜ. You agree not to: (a) scrape, datamine, or reverse-engineer our platform; (b) redistribute our proprietary data or charts without attribution; (c) use the Service for any illegal activity.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>5. Subscriptions and Billing</h2>
            <p>Access to premium features requires a paid subscription. Subscriptions are billed in advance on a monthly or annual basis. You may cancel your subscription at any time, but we do not offer refunds for partially used billing periods.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
