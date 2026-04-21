import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import SiteBanner from '@/components/SiteBanner'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://termimal.com'
const defaultTitle = 'Termimal | Market Analysis Terminal for Macro, COT & Risk Intelligence'
const defaultDescription =
  'Termimal is a market analysis terminal for charting, macro intelligence, CFTC COT positioning, on-chain analytics, sentiment, and risk research. Analysis only — no trade execution.'

export const revalidate = 3600

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: '%s | Termimal',
  },
  description: defaultDescription,
  keywords: [
    'Termimal',
    'termimal.com',
    'market analysis terminal',
    'trading terminal',
    'macro intelligence platform',
    'COT positioning',
    'CFTC COT analysis',
    'risk analytics platform',
    'on-chain analytics',
    'sentiment analysis platform',
    'institutional-grade charting',
    'Bloomberg terminal alternative',
    'market research terminal',
    'web terminal for traders',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Termimal',
    title: defaultTitle,
    description:
      'Institutional-grade charting, macro intelligence, COT positioning, on-chain analytics, sentiment, and risk research in one terminal.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Termimal market analysis terminal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Termimal | Market Analysis Terminal',
    description:
      'Charting, macro intelligence, COT positioning, on-chain analytics, sentiment, and risk research in one platform.',
    images: ['/og-image.png'],
  },
  category: 'finance',
  applicationName: 'Termimal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="shortcut icon" type="image/png" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <SiteBanner />
        {children}
      </body>
    </html>
  )
}
