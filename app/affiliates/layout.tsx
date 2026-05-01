import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/seo/canonical'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Affiliate Program — Earn With Termimal',
  description:
    "Earn recurring commissions promoting Termimal. Built for finance creators, analysts, and trading communities.",
  alternates: { canonical: getCanonicalUrl('/affiliates') },
  openGraph: {
    title: 'Affiliate Program — Earn With Termimal',
    description:
      "Earn recurring commissions promoting Termimal. Built for finance creators, analysts, and trading communities.",
    url: '/affiliates',
    type: 'website',
  },
}

export default function AffiliatesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
