import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/seo/canonical'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Termimal',
  description:
    "How Termimal collects, uses, and protects your data. Read our full privacy policy.",
  alternates: { canonical: getCanonicalUrl('/privacy') },
  openGraph: {
    title: 'Privacy Policy — Termimal',
    description:
      "How Termimal collects, uses, and protects your data. Read our full privacy policy.",
    url: '/privacy',
    type: 'website',
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-32 pb-20" style={{ background: 'var(--bg)' }}>
      <div className="max-w-[800px] mx-auto px-4 md:px-8">
        <Link href="/" className="text-sm mb-8 inline-block hover:underline" style={{ color: 'var(--acc)' }}>← Back to Home</Link>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>Privacy Policy</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Last updated: April 2026</p>
        
        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--t2)' }}>
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>1. Information We Collect</h2>
            <p>Hiram OÜ respects your privacy. We collect minimal information required to provide our service, including your name, email address, IP address, and platform usage data. Payment processing is handled by secure third-party providers (e.g., Stripe); we never store your full credit card details.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>2. How We Use Your Data</h2>
            <p>We use your data to: authenticate your account, save your terminal layouts and watchlists, process subscriptions, monitor platform performance, and send essential service updates. We do not use your data for automated decision-making or profiling.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>3. Data Sharing</h2>
            <p>We do not sell, rent, or trade your personal data to third parties. We only share information with trusted infrastructure providers (cloud hosting, email delivery, payment processors) necessary to operate Termimal.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>4. Your Rights (GDPR)</h2>
            <p>Under the General Data Protection Regulation (GDPR) and other applicable laws, you have the right to access, correct, export, or request the deletion of your personal data. You may exercise these rights at any time by contacting our support team or deleting your account via the dashboard.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
