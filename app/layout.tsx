import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { createClient } from '@supabase/supabase-js'
import SiteBanner from '@/components/SiteBanner'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  const { data } = await supabase
    .from('site_settings')
    .select('site_description, site_keywords, og_image')
    .eq('id', 'global')
    .single()

  return {
    title: 'Termimal',
    description:
      data?.site_description ||
      'Institutional-grade charting, macro intelligence, COT positioning, and risk analytics.',
    keywords: data?.site_keywords || '',

    openGraph: data?.og_image
      ? {
          images: [data.og_image],
        }
      : undefined,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
        <head>
          <link rel="icon" type="image/png" href="https://www.termimal.com/icon.png?v=199407" />
          <link rel="shortcut icon" type="image/png" href="https://www.termimal.com/icon.png?v=199407" />
          <link rel="apple-touch-icon" href="https://www.termimal.com/icon.png?v=199407" />
        </head>
      <body className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <SiteBanner />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var saved = localStorage.getItem('termimal-theme');
                var sys = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                var theme = saved || sys || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  )
}