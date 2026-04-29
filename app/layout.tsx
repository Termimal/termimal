import type { Metadata } from "next"
import "./globals.css"
import SupportChatLauncher from "@/components/support/SupportChatLauncher"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://termimal.com"

export const metadata: Metadata = {
  // Title starts with brand name; template applies to all child pages
  title: {
    default: "Termimal — Trading Analysis Platform",
    template: "%s | Termimal",
  },
  description:
    "Termimal is a professional trading analysis platform for charting, macro intelligence, CFTC COT positioning, on-chain analytics, sentiment, and risk research.",
  metadataBase: new URL(siteUrl),
  // Canonical homepage URL
  alternates: {
    canonical: "/",
  },
  // Open Graph
  openGraph: {
    type: "website",
    siteName: "Termimal",
    title: "Termimal — Trading Analysis Platform",
    description:
      "Termimal is a professional trading analysis platform for charting, macro intelligence, CFTC COT positioning, on-chain analytics, sentiment, and risk research.",
    url: siteUrl,
    // TODO: add a 1200×630 OG image at /public/og-image.png and uncomment:
    // images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Termimal — Trading Analysis Platform" }],
  },
  // Twitter / X Card
  twitter: {
    card: "summary_large_image",
    title: "Termimal — Trading Analysis Platform",
    description:
      "Termimal is a professional trading analysis platform for charting, macro intelligence, CFTC COT positioning, on-chain analytics, sentiment, and risk research.",
    // TODO: add og-image and uncomment: images: ["/og-image.png"],
  },
  // Robots — index everything by default; per-page overrides take precedence
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: ["/icon.png"],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {/* Keyboard skip-link — appears on first Tab. CSS lives in globals.css */}
        <a href="#main" className="skip-link">Skip to main content</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              url: siteUrl,
              name: 'Termimal',
              alternateName: 'Termimal.com',
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Termimal',
              url: siteUrl,
              logo: `${siteUrl}/logo-dark.png`,
              legalName: 'Hiram OÜ',
            }),
          }}
        />
        {children}
        <SupportChatLauncher />
      </body>
    </html>
  )
}
