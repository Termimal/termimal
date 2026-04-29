import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Support — Contact Termimal',
  description:
    "Get support from the Termimal team. Reach out about billing, technical issues, or product questions — we typically respond within one business day.",
  alternates: { canonical: '/support' },
  openGraph: {
    title: 'Support — Contact Termimal',
    description:
      "Get support from the Termimal team. Reach out about billing, technical issues, or product questions — we typically respond within one business day.",
    url: '/support',
    type: 'website',
  },
}

export default function SupportLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
