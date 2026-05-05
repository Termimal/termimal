import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/seo/canonical'
import PageShell from '@/components/layout/PageShell'

export const metadata: Metadata = {
  title: 'Terms of Service — Termimal',
  description:
    "The terms governing your use of Termimal's website, web terminal, desktop app, affiliate program, and research products.",
  alternates: { canonical: getCanonicalUrl('/terms') },
  openGraph: {
    title: 'Terms of Service — Termimal',
    description:
      "The terms governing your use of Termimal's website, web terminal, desktop app, affiliate program, and research products.",
    url: '/terms',
    type: 'website',
  },
}

interface Section { id: string; title: string; body: React.ReactNode }

const SECTIONS: Section[] = [
  {
    id: 'agreement',
    title: '1. Agreement',
    body: (
      <>
        <p>
          These Terms of Service (&ldquo;<strong>Terms</strong>&rdquo;) form a binding agreement
          between you (&ldquo;you&rdquo;, &ldquo;User&rdquo;) and <strong>Hiram OÜ</strong>, an
          Estonian company (registry code 16734251, registered address Tallinn, Estonia)
          trading as <strong>Termimal</strong> (&ldquo;Termimal&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;, &ldquo;our&rdquo;).
        </p>
        <p>
          By creating an account, accessing the Service, or using any feature offered at
          termimal.com (the &ldquo;<strong>Site</strong>&rdquo;), the web terminal, the desktop
          app, the API, the affiliate program, or any related product (collectively, the
          &ldquo;<strong>Service</strong>&rdquo;), you agree to be bound by these Terms, our{' '}
          <a className="link-acc" href="/privacy">Privacy Policy</a>, our{' '}
          <a className="link-acc" href="/risk-disclaimer">Risk Disclaimer</a>, and our{' '}
          <a className="link-acc" href="/refund-policy">Refund Policy</a>. If you do not agree,
          do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: '2. Eligibility & accounts',
    body: (
      <>
        <p>
          You must be at least 18 years old (or the age of majority in your jurisdiction) and
          legally capable of entering into a binding contract to use the Service. By
          registering you represent that you are not subject to any sanctions, embargoes, or
          export-control restrictions imposed by the United Nations, European Union, United
          Kingdom, United States, or other applicable authority.
        </p>
        <p>
          You are responsible for keeping your credentials confidential and for all activity on
          your account. Do not share your account, password, or session tokens with anyone.
          Notify us immediately at{' '}
          <a className="link-acc" href="mailto:hello@termimal.com">hello@termimal.com</a>
          {' '}if you suspect unauthorised access.
        </p>
      </>
    ),
  },
  {
    id: 'not-advice',
    title: '3. Not financial advice',
    body: (
      <>
        <p>
          Termimal is an <strong>information and analysis platform</strong>. We are{' '}
          <strong>not</strong> a registered broker-dealer, investment adviser, financial
          institution, money transmitter, or fiduciary in any jurisdiction. We do not execute
          orders, custody assets, or manage portfolios.
        </p>
        <p>
          Any data, charts, indicators, scores, signals, regression models, prediction-market
          probabilities, or commentary provided through the Service are educational and
          research-grade only. They do <strong>not</strong> constitute investment, legal,
          accounting, or tax advice, and they are not an offer or solicitation to buy or sell
          any security, derivative, digital asset, or other financial instrument. All trading
          and investment decisions are made by you, at your sole risk. See the{' '}
          <a className="link-acc" href="/risk-disclaimer">Risk Disclaimer</a> for the full
          warning.
        </p>
      </>
    ),
  },
  {
    id: 'data',
    title: '4. Data & service availability',
    body: (
      <>
        <p>
          We aggregate market and macro data from public sources including Yahoo Finance, the
          U.S. Federal Reserve Economic Database (FRED), the U.S. Commodity Futures Trading
          Commission (CFTC), the SEC EDGAR XBRL service, and Polymarket&rsquo;s public CLOB.
          Data is provided <strong>&ldquo;as is&rdquo;</strong> with no warranty of accuracy,
          timeliness, completeness, or fitness for any particular purpose. Quotes may be
          delayed, missing, or revised by upstream providers without notice.
        </p>
        <p>
          The Service may be unavailable from time to time for maintenance, upgrades, or
          reasons outside our control (network outages, cloud-provider issues, regulatory
          actions, force-majeure events). We target high uptime but do not guarantee
          uninterrupted access.
        </p>
      </>
    ),
  },
  {
    id: 'subscriptions',
    title: '5. Subscriptions, billing & refunds',
    body: (
      <>
        <p>
          Paid features require a subscription. Tiers (Free / Pro / Premium) and pricing are
          listed at <a className="link-acc" href="/pricing">/pricing</a> and may be updated
          with prospective effect. Subscriptions auto-renew at the start of each billing
          period (monthly or annual) until cancelled.
        </p>
        <p>
          Prices are in EUR and exclude applicable VAT. We use Stripe as our payment processor;
          your card details are tokenised by Stripe and never stored on our servers.
        </p>
        <p>
          You may cancel any time from{' '}
          <a className="link-acc" href="/dashboard/billing">/dashboard/billing</a>. Cancellation
          takes effect at the end of the current billing period. We do not pro-rate refunds for
          partially used periods. Eligible refund cases are listed in our{' '}
          <a className="link-acc" href="/refund-policy">Refund Policy</a>.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: '6. Acceptable use',
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>
            scrape, crawl, mirror, frame, datamine, reverse-engineer, decompile, or
            programmatically extract the Site, the Service, the API, or any content not
            expressly licensed for such use;
          </li>
          <li>
            redistribute, republish, resell, or commercially exploit Termimal data, charts,
            indicators, or research without a written licence from us;
          </li>
          <li>
            interfere with, overload, or attempt to compromise the security of the Service,
            our infrastructure, or any other user;
          </li>
          <li>
            use the Service to infringe intellectual-property rights, defame any person,
            or violate applicable law (including securities, sanctions, anti-money-laundering,
            export-control, and tax laws);
          </li>
          <li>
            create multiple free-tier accounts to circumvent paid-tier gating or rate limits;
          </li>
          <li>
            use the Service to develop a competing product, train a machine-learning model on
            our outputs, or otherwise build a competing dataset.
          </li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate this section, with or without
          notice, and we may report illegal activity to the relevant authorities.
        </p>
      </>
    ),
  },
  {
    id: 'ip',
    title: '7. Intellectual property',
    body: (
      <>
        <p>
          The Site, the Service, the platform code, the user-interface design, our proprietary
          indicators, scoring models, regression methodology, prediction-market signal
          framework, and the Termimal name and logo are our exclusive property and protected by
          copyright, trademark, and trade-secret law. You receive a personal, limited,
          non-transferable, revocable licence to access the Service for your own internal use
          while your account is in good standing — no other rights are granted.
        </p>
        <p>
          Content you upload (watchlists, notes, portfolio entries) remains yours. You grant us
          a worldwide, royalty-free licence to host, store, and process that content solely to
          operate the Service for you.
        </p>
      </>
    ),
  },
  {
    id: 'affiliates',
    title: '8. Affiliate & referral programs',
    body: (
      <>
        <p>
          Use of our affiliate program (<a className="link-acc" href="/affiliates">/affiliates</a>)
          and our refer-a-friend program (<a className="link-acc" href="/refer">/refer</a>) is
          governed by additional rules set out on each respective page. In summary:
        </p>
        <ul>
          <li>
            <strong>Commissions only on paid conversions.</strong> Affiliates earn only when a
            referred user becomes a <em>paying</em> customer (i.e. converts from free trial to
            a paid plan and the first invoice is successfully captured by Stripe). Free-tier
            sign-ups, trial sign-ups, and unpaid invoices do not earn commission.
          </li>
          <li>
            <strong>Claw-back on refunds and chargebacks.</strong> If a referred customer
            refunds, charges back, or otherwise reverses payment within 60 days, the
            corresponding commission or referral credit is rescinded.
          </li>
          <li>
            <strong>No public coupon-site or aggregator distribution.</strong> Affiliate
            links must be shared with your own audience (newsletter, community, social
            followers). Posting on coupon, discount, deal-aggregator, or generic incentive
            websites is prohibited and voids commissions.
          </li>
          <li>
            <strong>No trademark bidding.</strong> Bidding on &ldquo;Termimal&rdquo; or any
            confusingly similar variant in paid search (Google Ads, Bing, Microsoft, Meta) is
            prohibited.
          </li>
          <li>
            <strong>No self-referrals or duplicate accounts.</strong> Referring yourself, a
            household member sharing payment methods, or any account intended primarily to
            generate commissions for the referrer is grounds for forfeiture and account
            termination.
          </li>
          <li>
            <strong>No misrepresentation.</strong> You may not impersonate Termimal staff,
            promise features that do not exist, or guarantee trading returns.
          </li>
          <li>
            <strong>Tax responsibility.</strong> Affiliate payouts and referral credits are
            gross of any tax. You are responsible for declaring and paying any applicable
            income, VAT, or withholding tax in your jurisdiction.
          </li>
          <li>
            <strong>Termination.</strong> We may pause, claw back, or terminate any participant
            at any time for breach of these rules, suspected fraud, low-quality traffic,
            inactivity, or for any reason at our discretion. Outstanding earned commissions
            below the minimum payout threshold are forfeited at termination.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'beta',
    title: '9. Beta features',
    body: (
      <>
        <p>
          Some features are released as beta or experimental. They may be changed, removed,
          rate-limited, or moved between tiers without prior notice and are provided{' '}
          <strong>&ldquo;as is&rdquo;</strong> with no service-level commitment.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    title: '10. Disclaimers & limitation of liability',
    body: (
      <>
        <p>
          To the maximum extent permitted by applicable law, the Service is provided{' '}
          <strong>&ldquo;as is&rdquo;</strong> and <strong>&ldquo;as available&rdquo;</strong>{' '}
          without warranties of any kind, express or implied, including warranties of
          merchantability, fitness for a particular purpose, non-infringement, or accuracy.
        </p>
        <p>
          Termimal, its officers, directors, employees, contractors, and affiliates shall not
          be liable for any indirect, incidental, special, consequential, exemplary, or
          punitive damages, or for any loss of profits, revenue, data, goodwill, or trading
          losses, arising out of or related to your use of the Service — even if advised of
          the possibility of such damages.
        </p>
        <p>
          Our aggregate liability to you for all claims relating to the Service in any
          twelve-month period shall not exceed the greater of (i) <strong>EUR 100</strong>{' '}
          or (ii) the total fees you paid us during the twelve months preceding the claim.
          Some jurisdictions do not allow these limitations; in that case the limitations
          apply to the maximum extent legally permitted.
        </p>
      </>
    ),
  },
  {
    id: 'indemnify',
    title: '11. Indemnification',
    body: (
      <>
        <p>
          You agree to defend, indemnify, and hold harmless Termimal and its officers,
          directors, employees, contractors, and affiliates from and against any claim, loss,
          damage, liability, cost, or expense (including reasonable legal fees) arising from
          (a) your use of the Service, (b) your breach of these Terms, (c) your violation of
          any third-party right (including intellectual-property and privacy rights), or (d)
          any content you submit or transmit through the Service.
        </p>
      </>
    ),
  },
  {
    id: 'termination',
    title: '12. Suspension & termination',
    body: (
      <>
        <p>
          We may suspend or terminate your access to the Service at any time, with or without
          notice, for any reason — including (without limitation) suspected breach of these
          Terms, suspected fraud, regulatory direction, prolonged inactivity, or non-payment.
          You may terminate your account at any time by contacting{' '}
          <a className="link-acc" href="mailto:hello@termimal.com">hello@termimal.com</a>{' '}
          or following the deletion flow at{' '}
          <a className="link-acc" href="/dashboard/profile">/dashboard/profile</a>.
        </p>
        <p>
          On termination, your licence to access the Service ends. Sections that by their
          nature should survive (intellectual property, disclaimers, liability limitations,
          indemnification, governing law, dispute resolution) survive termination.
        </p>
      </>
    ),
  },
  {
    id: 'law',
    title: '13. Governing law & disputes',
    body: (
      <>
        <p>
          These Terms are governed by the laws of the Republic of Estonia, without regard to
          its conflict-of-law principles. The courts of Harju County, Estonia, have
          exclusive jurisdiction over any dispute arising out of or related to these Terms or
          the Service, except where mandatory consumer-protection law in your country grants
          you the right to bring proceedings in your home jurisdiction.
        </p>
        <p>
          Before filing any formal claim you agree to first contact us at{' '}
          <a className="link-acc" href="mailto:legal@termimal.com">legal@termimal.com</a>{' '}
          and attempt to resolve the dispute informally for at least 30 days.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: '14. Changes to these Terms',
    body: (
      <>
        <p>
          We may update these Terms from time to time. Material changes are posted on this
          page with an updated &ldquo;Last updated&rdquo; date. For changes that materially
          reduce your rights we will notify registered account holders by email at least 30
          days before they take effect. Continued use of the Service after the effective date
          constitutes acceptance.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: '15. Contact',
    body: (
      <>
        <p>
          Hiram OÜ · Tallinn, Estonia · registry code 16734251.{' '}
          General contact:{' '}
          <a className="link-acc" href="mailto:hello@termimal.com">hello@termimal.com</a>.{' '}
          Legal &amp; abuse reports:{' '}
          <a className="link-acc" href="mailto:legal@termimal.com">legal@termimal.com</a>.
        </p>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <PageShell title="Terms of Service">
      <main className="min-h-screen pt-24 pb-20" style={{ background: 'var(--bg)', color: 'var(--t1)' }}>
        <div className="mx-auto max-w-[860px] px-4 md:px-8">
          <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--t4)' }}>
            Legal
          </div>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl" style={{ letterSpacing: '-0.03em' }}>
            Terms of Service
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--t3)' }}>Last updated: 5 May 2026</p>

          <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr] lg:items-start">
            {/* Sticky table of contents — left rail on desktop */}
            <nav
              aria-label="Sections"
              className="lg:sticky lg:top-24 self-start rounded-2xl border p-4"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--t4)' }}>
                Sections
              </div>
              <ul className="flex flex-col gap-1 text-[13px]">
                {SECTIONS.map(s => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block rounded-md px-2 py-1.5 transition-colors"
                      style={{ color: 'var(--t2)' }}
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <article className="prose prose-invert max-w-none" style={{ color: 'var(--t1)' }}>
              {SECTIONS.map(s => (
                <section key={s.id} id={s.id} className="mb-10 scroll-mt-28">
                  <h2 className="text-xl font-semibold mb-3" style={{ letterSpacing: '-0.015em' }}>
                    {s.title}
                  </h2>
                  <div className="text-[15px] leading-7" style={{ color: 'var(--t2)' }}>
                    {s.body}
                  </div>
                </section>
              ))}

              <div
                className="mt-12 rounded-2xl border p-5 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <strong style={{ color: 'var(--t1)' }}>Plain-language summary.</strong>{' '}
                Termimal is research, not advice. We do our best with public data but can&rsquo;t
                guarantee accuracy. Pay if you want premium features, cancel any time, no partial
                refunds. Don&rsquo;t scrape us, don&rsquo;t resell our data, don&rsquo;t game the
                affiliate program. We&rsquo;re an Estonian company; Estonian law governs disputes.
                Read the full sections above for the binding terms.
              </div>
            </article>
          </div>
        </div>
      </main>
    </PageShell>
  )
}
