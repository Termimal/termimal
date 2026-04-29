import Image from 'next/image'
import Link from 'next/link'
import { footerLinks } from '@/data'

const footerUrlMap: Record<string, string> = {
  'Web Terminal': '/web-terminal', 'Desktop App': '/download', 'Features': '/features',
  'Markets': '/#markets', 'Pricing': '/pricing', 'Status': '/status', 'Help Center': '/support',
  'About': '/about', 'Careers': '/careers', 'Affiliates': '/affiliates', 'Refer a Friend': '/refer',
  'Terms': '/terms', 'Privacy': '/privacy', 'Cookies': '/cookies', 'Risk Disclaimer': '/risk-disclaimer', 'Refund Policy': '/refund-policy', 'Sitemap': '/sitemap.xml',
}
const footerLinkUrl = (label: string) => footerUrlMap[label] || '#'

export function Footer() {
  const cols = [
    { title: 'Product', links: footerLinks.product },
    { title: 'Resources', links: footerLinks.resources },
    { title: 'Company', links: footerLinks.company },
    { title: 'Legal', links: footerLinks.legal },
  ]
  return (
    <footer className="pt-16 pb-8" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="max-w-site mx-auto px-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 transition-opacity hover:opacity-80">
              <Image src="/logo-dark.png" alt="Termimal Logo" width={32} height={32} className="object-contain" style={{ display: 'var(--logo-light-theme-display)' }} />
              <Image src="/logo-light.png" alt="Termimal Logo" width={32} height={32} className="object-contain" style={{ display: 'var(--logo-dark-theme-display)' }} />
              <span className="text-[1.05rem] font-bold" style={{ letterSpacing: '-0.02em', color: 'var(--t1)' }}>Termimal</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-[260px]" style={{ color: 'var(--t2)' }}>Professional market analysis terminal. Research only — no trade execution, no financial advice.</p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h4 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--acc)' }}>{col.title}</h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(link => (
                  <li key={link}>
                    <Link href={footerLinkUrl(link)} className="text-sm transition-all hover:text-white" style={{ color: 'var(--t3)' }}>
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>© 2026 Hiram OÜ</p>
          <p className="text-sm max-w-xl md:text-right leading-relaxed" style={{ color: 'var(--t3)' }}>Termimal is a market analysis platform. It does not execute trades, hold client funds, provide financial advice, or operate as a broker, dealer, or exchange. Data is for informational purposes only.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
