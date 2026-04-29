// pages/legal/LegalPages.tsx — Terms, Privacy, Cookies, Risk Disclaimer
// All four are static React components rendered inside a shared LegalShell.
// Wired into App.tsx routing as /terms /privacy /cookies /risk-disclaimer.

import { Link } from 'react-router-dom'

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

function LegalShell({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0e1117', fontFamily: font, color: '#c9d1d9' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: '1px solid #161b22' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#c9d1d9', letterSpacing: 0.4 }}>TERMIMAL</span>
        </Link>
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <Link to="/terms" style={{ color: '#8b949e', textDecoration: 'none' }}>Terms</Link>
          <Link to="/privacy" style={{ color: '#8b949e', textDecoration: 'none' }}>Privacy</Link>
          <Link to="/cookies" style={{ color: '#8b949e', textDecoration: 'none' }}>Cookies</Link>
          <Link to="/risk-disclaimer" style={{ color: '#8b949e', textDecoration: 'none' }}>Risk</Link>
        </div>
      </nav>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 28px 80px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: '#c9d1d9', letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
        <p style={{ fontSize: 13, color: '#8b949e', marginTop: 8, marginBottom: 32 }}>Last updated: {lastUpdated}</p>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: '#c9d1d9' }}>{children}</div>
      </div>
    </div>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#c9d1d9', marginBottom: 10 }}>{title}</h2>
    <div style={{ color: '#b2b5be' }}>{children}</div>
  </section>
)

const Ul = ({ children }: { children: React.ReactNode }) => (
  <ul style={{ paddingLeft: 20, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</ul>
)

// ═══════════════════════════════════════════════════════════
// TERMS OF SERVICE
// ═══════════════════════════════════════════════════════════
export function TermsPage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated="28 April 2026">
      <Section title="1. Introduction & Parties">
        <p>These Terms of Service (&quot;Terms&quot;) form a binding agreement between you and the operator of Termimal (&quot;Termimal&quot;, &quot;we&quot;, &quot;us&quot;). The Terms govern your access to and use of the Termimal web terminal, desktop app, APIs, and any related services (collectively, the &quot;Service&quot;). By creating an account or otherwise using the Service you confirm that you have read, understood, and accepted these Terms and our <Link to="/privacy" style={{ color: '#34d399' }}>Privacy Policy</Link>.</p>
      </Section>

      <Section title="2. Eligibility">
        <p>You must be at least 18 years old and legally capable of entering into a binding contract in your jurisdiction. The Service is not directed at residents of jurisdictions where its provision would be unlawful or require licensing we do not hold.</p>
      </Section>

      <Section title="3. Nature of the Service · Not Financial Advice">
        <p>Termimal is a research and analytics platform. <strong>We are not a broker, dealer, exchange, custodian, investment advisor, or financial institution.</strong> We do not execute trades, hold client funds, or offer personalised investment recommendations. All data, charts, indicators, signals, regime scores, wallet rankings, and commentary are provided for informational and educational purposes only and must not be relied upon as investment, legal, tax, or accounting advice. You are solely responsible for your trading decisions and any resulting losses.</p>
      </Section>

      <Section title="4. Accounts & Security">
        <p>You must provide accurate information, keep your credentials confidential, enable two-factor authentication where offered, and notify us immediately at <a href="mailto:security@termimal.com" style={{ color: '#34d399' }}>security@termimal.com</a> of any unauthorised access. We may suspend accounts we reasonably believe are compromised or in breach of these Terms.</p>
      </Section>

      <Section title="5. Subscriptions, Billing & Cancellation">
        <p>Paid plans are billed in advance on a recurring monthly or annual basis through our payment processor (Stripe). Prices exclude applicable taxes. Subscriptions auto-renew unless cancelled before the renewal date; cancellation takes effect at the end of the current period. Except where required by mandatory consumer law, fees already paid are non-refundable. EU consumers have a 14-day right of withdrawal; by starting to use paid features you expressly request immediate performance and acknowledge the right is forfeited once the digital service has been fully supplied.</p>
      </Section>

      <Section title="6. Acceptable Use">
        <p>You agree not to: (a) scrape, mirror, or use automated means to access the Service except via APIs we explicitly provide; (b) reverse-engineer the Service, indicators, or models; (c) resell or redistribute Service content without permission; (d) interfere with the Service&apos;s integrity or availability; (e) misrepresent your identity or use the Service unlawfully; (f) circumvent rate limits, paywalls, or geographic restrictions.</p>
      </Section>

      <Section title="7. Intellectual Property">
        <p>All software, design, indicators, methodology, and brand assets are owned by Termimal or its licensors. We grant you a limited, revocable, non-exclusive, non-transferable licence to use the Service for personal or internal business research while your subscription is active. You retain ownership of content you upload (e.g., custom watchlists) and grant us a worldwide, royalty-free licence to host and process it solely to provide the Service.</p>
      </Section>

      <Section title="8. Third-Party Data">
        <p>The Service incorporates data from third parties (FRED, FMP, CFTC, Polymarket, exchange APIs, etc.). Their availability and accuracy are outside our control. We do not warrant uninterrupted or error-free operation.</p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>To the fullest extent permitted by law, Termimal will not be liable for indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, revenues, data, or goodwill. Our aggregate liability for direct damages will not exceed the greater of (a) fees you paid us in the twelve months preceding the claim or (b) one hundred euros (€100). Nothing in these Terms limits liability for fraud, gross negligence, wilful misconduct, or any liability that cannot be excluded under applicable law.</p>
      </Section>

      <Section title="10. Termination">
        <p>You may terminate at any time. We may suspend or terminate the Service for material breach, suspected fraud, or where required by law. Sections that by their nature should survive termination (IP, disclaimers, liability limits, governing law) survive.</p>
      </Section>

      <Section title="11. Governing Law">
        <p>These Terms are governed by the laws applicable to the operating entity&apos;s registered seat. Mandatory consumer-protection laws of your country of residence in the EU/EEA still apply. EU/EEA consumers may use the Commission&apos;s online dispute resolution platform at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: '#34d399' }}>ec.europa.eu/consumers/odr</a>.</p>
      </Section>

      <Section title="12. Contact">
        <p>Questions about these Terms? Email <a href="mailto:legal@termimal.com" style={{ color: '#34d399' }}>legal@termimal.com</a>.</p>
      </Section>
    </LegalShell>
  )
}

// ═══════════════════════════════════════════════════════════
// PRIVACY POLICY (GDPR-compliant)
// ═══════════════════════════════════════════════════════════
export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="28 April 2026">
      <Section title="1. Data Controller">
        <p>The data controller responsible for personal data processed by Termimal is the entity operating the Service. You can reach our privacy team at <a href="mailto:privacy@termimal.com" style={{ color: '#34d399' }}>privacy@termimal.com</a>.</p>
      </Section>

      <Section title="2. What we collect">
        <Ul>
          <li><strong>Account data:</strong> name, email, password hash, country, timezone, language.</li>
          <li><strong>Subscription data:</strong> plan, billing status, invoices. Card details are processed by Stripe — never stored on our servers.</li>
          <li><strong>Product data:</strong> watchlists, saved workspaces, alerts, paper-trading positions, theme preference.</li>
          <li><strong>Technical data:</strong> IP address, browser, device, operating system, log files, request timestamps.</li>
          <li><strong>Communications:</strong> support tickets, feedback, email correspondence.</li>
          <li><strong>Cookies:</strong> see our <Link to="/cookies" style={{ color: '#34d399' }}>Cookie Policy</Link>.</li>
        </Ul>
      </Section>

      <Section title="3. Why we process your data (lawful bases)">
        <Ul>
          <li><strong>Performance of contract</strong> (Art. 6(1)(b) GDPR) — to provide the Service, maintain your account, process payments.</li>
          <li><strong>Legitimate interests</strong> (Art. 6(1)(f)) — to secure the Service, prevent fraud and abuse, debug, improve quality.</li>
          <li><strong>Consent</strong> (Art. 6(1)(a)) — for non-essential cookies, marketing emails, voluntary feedback. Withdraw any time.</li>
          <li><strong>Legal obligation</strong> (Art. 6(1)(c)) — to retain billing records for tax / accounting law.</li>
        </Ul>
      </Section>

      <Section title="4. Who we share data with">
        <p>We do not sell or rent personal data. We share it only with vetted processors necessary to operate the Service, under written data-processing agreements:</p>
        <Ul>
          <li>Hosting & database (Vercel, Supabase, or equivalent EU-resident provider).</li>
          <li>Payments — Stripe Payments Europe Ltd.</li>
          <li>Transactional email provider.</li>
          <li>Customer support chat.</li>
          <li>Privacy-respecting analytics and error monitoring (pseudonymised where possible).</li>
          <li>Authorities — when required by law.</li>
        </Ul>
      </Section>

      <Section title="5. International transfers">
        <p>Where processors operate or store data outside the EEA, transfers are protected by adequacy decisions or by Standard Contractual Clauses (Decision 2021/914) supplemented as required.</p>
      </Section>

      <Section title="6. Retention">
        <p>Account, product, and technical data is kept for as long as your account is active. After deletion we retain a minimal set of records (e.g., invoices) for the period required by law (typically 7 years for accounting). Backups are rotated and overwritten on a schedule of up to 30 days.</p>
      </Section>

      <Section title="7. Your rights (EU/EEA)">
        <Ul>
          <li><strong>Access</strong> — receive a copy of your personal data.</li>
          <li><strong>Rectification</strong> — correct inaccurate data.</li>
          <li><strong>Erasure</strong> — request deletion subject to legal retention exceptions.</li>
          <li><strong>Restriction</strong> — limit processing during a dispute.</li>
          <li><strong>Portability</strong> — receive your data in a machine-readable format.</li>
          <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
          <li><strong>Withdraw consent</strong> — at any time, without affecting prior lawful processing.</li>
          <li><strong>Lodge a complaint</strong> with your supervisory authority. In France this is the <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: '#34d399' }}>CNIL</a>.</li>
        </Ul>
        <p style={{ marginTop: 12 }}>Exercise these rights by emailing <a href="mailto:privacy@termimal.com" style={{ color: '#34d399' }}>privacy@termimal.com</a>. We respond within 30 days.</p>
      </Section>

      <Section title="8. Security">
        <p>We use TLS in transit, encryption at rest, hashed passwords, principle-of-least-privilege access controls, audit logging, and regular dependency scanning. If a breach affects you we will notify you and the competent supervisory authority within 72 hours where required by Art. 33 GDPR.</p>
      </Section>

      <Section title="9. Children">
        <p>The Service is not directed to children under 16 and we do not knowingly collect their data.</p>
      </Section>

      <Section title="10. Changes">
        <p>Material changes will be announced by email or in-product notice at least 14 days before they take effect.</p>
      </Section>
    </LegalShell>
  )
}

// ═══════════════════════════════════════════════════════════
// COOKIE POLICY
// ═══════════════════════════════════════════════════════════
export function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy" lastUpdated="28 April 2026">
      <Section title="1. What are cookies?">
        <p>Cookies are small text files placed on your device by the websites you visit. We also use related technologies such as localStorage and sessionStorage; in this policy we refer to all of them as &quot;cookies&quot;.</p>
      </Section>

      <Section title="2. Categories of cookies we use">
        <Ul>
          <li><strong>Strictly necessary</strong> — authentication, session security, CSRF protection. Cannot be refused.</li>
          <li><strong>Functional</strong> — theme, language, saved layouts, watchlist selections, cookie banner state. Consent-based.</li>
          <li><strong>Analytics</strong> — aggregate usage and performance. Disabled until you accept.</li>
          <li><strong>Marketing</strong> — conversion attribution and audience measurement. Disabled by default.</li>
        </Ul>
      </Section>

      <Section title="3. Managing your preferences">
        <p>Change your consent at any time using the &quot;Cookie preferences&quot; link in the footer. You can also manage cookies in your browser settings. Disabling strictly necessary cookies prevents login.</p>
      </Section>

      <Section title="4. Third-party cookies">
        <p>Some cookies are set by third parties acting as our processors — auth provider, payment processor (Stripe checkout pages), support chat, analytics. They are bound by data-processing agreements and only act on our instructions. Stripe sets its own cookies during checkout — review the <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer" style={{ color: '#34d399' }}>Stripe Cookie Policy</a>.</p>
      </Section>

      <Section title="5. Global Privacy Control">
        <p>We honour the GPC signal where transmitted by your browser by treating it as a withdrawal of consent for analytics and marketing cookies.</p>
      </Section>
    </LegalShell>
  )
}

// ═══════════════════════════════════════════════════════════
// RISK DISCLAIMER
// ═══════════════════════════════════════════════════════════
export function RiskDisclaimerPage() {
  return (
    <LegalShell title="Risk Disclaimer" lastUpdated="28 April 2026">
      <div style={{ padding: 16, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.22)', marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#f85149', marginBottom: 6 }}>HIGH RISK WARNING</div>
        <p style={{ margin: 0, fontSize: 13, color: '#c9d1d9', lineHeight: 1.7 }}>Trading foreign exchange, cryptoassets, equities, derivatives, and commodities — particularly on margin or with leverage — carries a high level of risk and may not be suitable for all investors. Leverage can work against you as well as for you. You may lose all of your invested capital, and in some products more than your initial deposit. Only trade with money you can afford to lose.</p>
      </div>

      <Section title="Informational purposes only">
        <p>Termimal is an analytical and research tool. All content, data, indicators, regime scores, signals, wallet rankings, and commentary are provided for informational and educational purposes only. Nothing on the platform is a recommendation, solicitation, or offer to buy, sell, or hold any financial instrument, nor is it personalised investment advice.</p>
      </Section>

      <Section title="No regulatory status">
        <p>Termimal is not authorised or regulated as a credit institution, investment firm, payment institution, or fund manager by ESMA, the AMF, the BaFin, the SEC, the CFTC, or any equivalent body. We do not provide MiFID II investment services and do not benefit from investor compensation schemes.</p>
      </Section>

      <Section title="Past & hypothetical performance">
        <p>Past performance of any indicator, methodology, or asset is not necessarily indicative of future results. Backtests and simulated regime histories displayed on the platform describe how an indicator would have behaved on historical data. Hypothetical performance has limitations: it benefits from hindsight, may not reflect liquidity, slippage, fees, or taxes, and is not subject to the financial or emotional pressures of real trading.</p>
      </Section>

      <Section title="Cryptoassets & on-chain data">
        <p>Cryptoassets are highly volatile. The European MiCA regulation applies progressively from 2024 but does not eliminate the risks of total loss, exchange failure, smart-contract bugs, or fraud. On-chain metrics (MVRV, Z-Score, realised cap, wallet flows) are derived from public block-chain data which may contain mislabelled, lost, or anomalous entities.</p>
      </Section>

      <Section title="Polymarket signals">
        <p>Polymarket wallet rankings, anomaly flags, and cross-market signals are research outputs derived from public on-chain data. They are not predictions, not trade recommendations, and not audited track records. Past wallet accuracy on resolved markets does not guarantee future hit rate.</p>
      </Section>

      <Section title="Data quality & latency">
        <p>Market data is sourced from third parties and provided &quot;as is&quot;. We do not guarantee accuracy, completeness, or real-time delivery. COT data is structurally lagged by 3 trading days. Always verify time-sensitive decisions against an authoritative venue or your broker before acting.</p>
      </Section>

      <Section title="Jurisdictional restrictions">
        <p>The Service is not directed at, and is not intended for use by, residents of jurisdictions where its provision would be unlawful or require a licence we do not hold. Where you reside, certain instruments (e.g., contracts for difference, leveraged crypto products) may be restricted or prohibited for retail investors; you must comply with applicable local rules.</p>
      </Section>
    </LegalShell>
  )
}

// ═══════════════════════════════════════════════════════════
// SECURITY (public vulnerability disclosure)
// ═══════════════════════════════════════════════════════════
export function SecurityPage() {
  return (
    <LegalShell title="Security" lastUpdated="28 April 2026">
      <Section title="How we protect your account">
        <Ul>
          <li>TLS encryption in transit on every endpoint, with HSTS preload.</li>
          <li>Encryption at rest via our hosting provider.</li>
          <li>Authentication tokens are validated server-side at the edge of every <code>/api/*</code> request.</li>
          <li>Rate limiting on every endpoint, with stricter caps on heavy scans and auth events.</li>
          <li>Strict <code>Content-Security-Policy</code>, <code>X-Frame-Options: DENY</code>, <code>Referrer-Policy</code>, and <code>Permissions-Policy</code> headers.</li>
          <li>CORS locked to an explicit allowlist — no wildcard origins in production.</li>
          <li>All sensitive operations (login, logout, password reset, MFA changes) are written to an append-only audit log with secret-scrubbing.</li>
          <li>Card data never touches our servers — billing is processed by Stripe.</li>
          <li>Optional time-based two-factor authentication (TOTP) where supported.</li>
        </Ul>
      </Section>

      <Section title="Reporting a vulnerability">
        <p>If you discover a security issue affecting Termimal, please email <a href="mailto:security@termimal.com" style={{ color: '#34d399' }}>security@termimal.com</a> with:</p>
        <Ul>
          <li>A clear description of the issue.</li>
          <li>Reproduction steps and any required prerequisites.</li>
          <li>The impact you observed (data exposure, account takeover, etc.).</li>
          <li>Your name or handle if you want to be acknowledged.</li>
        </Ul>
        <p style={{ marginTop: 12 }}>Our machine-readable disclosure record is at <a href="/.well-known/security.txt" style={{ color: '#34d399' }}>/.well-known/security.txt</a>.</p>
      </Section>

      <Section title="Response timeline">
        <Ul>
          <li>Acknowledgement of receipt within 72 hours.</li>
          <li>Triage and severity assessment within 5 business days.</li>
          <li>Patch for critical / high-severity issues within 7 days.</li>
          <li>Patch for medium / low-severity issues within 30 days.</li>
          <li>Public disclosure coordinated with the reporter after the fix is deployed.</li>
        </Ul>
      </Section>

      <Section title="Scope">
        <p><strong>In scope:</strong></p>
        <Ul>
          <li><code>*.termimal.com</code> web properties.</li>
          <li>Authenticated API endpoints under <code>/api/*</code>.</li>
          <li>Any desktop / Electron build of the terminal.</li>
        </Ul>
        <p style={{ marginTop: 12 }}><strong>Out of scope:</strong></p>
        <Ul>
          <li>Third-party services we depend on (please report directly to them).</li>
          <li>Reports requiring outdated browsers or non-default configurations.</li>
          <li>Issues requiring physical access, social engineering, or shared devices.</li>
          <li>Self-inflicted issues (e.g., a user revealing their own password).</li>
          <li>Findings produced solely by automated scanners without an exploit chain.</li>
        </Ul>
      </Section>

      <Section title="Safe-harbour">
        <p>We will not pursue legal action against researchers who:</p>
        <Ul>
          <li>Make a good-faith effort to follow this policy.</li>
          <li>Avoid privacy violations, service disruption, and data destruction.</li>
          <li>Use test accounts or accounts they own — never access another user&apos;s data.</li>
          <li>Give us reasonable time to remediate before any disclosure.</li>
        </Ul>
      </Section>

      <Section title="Acknowledgements">
        <p id="hall-of-fame">With reporters&apos; permission we list confirmed contributors here. Bug-bounty rewards are discretionary and considered case by case.</p>
      </Section>
    </LegalShell>
  )
}
