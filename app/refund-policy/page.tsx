import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Refund Policy — Termimal',
  description:
    "Termimal's refund and cancellation policy for subscriptions and one-time purchases.",
  alternates: { canonical: '/refund-policy' },
  openGraph: {
    title: 'Refund Policy — Termimal',
    description:
      "Termimal's refund and cancellation policy for subscriptions and one-time purchases.",
    url: '/refund-policy',
    type: 'website',
  },
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen pt-32 pb-20" style={{ background: 'var(--bg)' }}>
      <div className="max-w-[800px] mx-auto px-8">
        <Link href="/" className="text-sm mb-8 inline-block hover:underline" style={{ color: 'var(--acc)' }}>← Back to Home</Link>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>Refund Policy</h1>
        
        <div className="space-y-8 text-sm leading-relaxed mt-8" style={{ color: 'var(--t2)' }}>
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>1. 14-Day Free Trial</h2>
            <p>Termimal provides a 14-day free trial so you can fully evaluate our charts, data feeds, and macro indicators before committing to a paid subscription. We highly encourage all users to utilize this trial period to ensure the platform meets their needs.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>2. No Refunds</h2>
            <p>Because we offer a comprehensive 14-day free trial, <strong>all subscription charges are final and non-refundable</strong> once processed. We do not provide refunds or credits for partially used billing periods (whether monthly or annual).</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>3. Cancellations</h2>
            <p>You can cancel your subscription at any time directly from your account dashboard. Once cancelled, you will retain full access to Termimal until the end of your current paid billing cycle. You will not be charged again moving forward.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>4. Billing Errors</h2>
            <p>If you believe you were charged due to a technical error on our part (e.g., duplicate billing), please contact our support team immediately. Verified billing errors will be fully refunded.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
