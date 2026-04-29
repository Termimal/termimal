import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Help Center — Termimal Support & FAQs',
  description:
    "Browse Termimal's help center: getting started, charting, COT, on-chain analytics, billing, and account questions answered.",
  alternates: { canonical: '/help' },
  openGraph: {
    title: 'Help Center — Termimal Support & FAQs',
    description:
      "Browse Termimal's help center: getting started, charting, COT, on-chain analytics, billing, and account questions answered.",
    url: '/help',
    type: 'website',
  },
}

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
