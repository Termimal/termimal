import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/seo/canonical'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Refer a Trader — Termimal Referrals',
  description:
    "Invite traders to Termimal and earn rewards. Share your unique link and get credit when they subscribe.",
  alternates: { canonical: getCanonicalUrl('/refer') },
  openGraph: {
    title: 'Refer a Trader — Termimal Referrals',
    description:
      "Invite traders to Termimal and earn rewards. Share your unique link and get credit when they subscribe.",
    url: '/refer',
    type: 'website',
  },
}

export default function ReferLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
