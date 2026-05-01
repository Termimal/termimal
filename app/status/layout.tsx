import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/seo/canonical'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Status — Termimal System Health',
  description:
    "Live status of Termimal's web terminal, charting, data feeds, and API. Incidents, uptime, and degraded performance reports.",
  alternates: { canonical: getCanonicalUrl('/status') },
  openGraph: {
    title: 'Status — Termimal System Health',
    description:
      "Live status of Termimal's web terminal, charting, data feeds, and API. Incidents, uptime, and degraded performance reports.",
    url: '/status',
    type: 'website',
  },
}

export default function StatusLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
