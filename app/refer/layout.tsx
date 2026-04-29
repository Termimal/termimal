import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Refer a Trader — Termimal Referrals',
  description:
    "Invite traders to Termimal and earn rewards. Share your unique link and get credit when they subscribe.",
  alternates: { canonical: '/refer' },
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
