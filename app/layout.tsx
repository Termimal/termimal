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

// Revalidate every hour so SEO caches update automatically
export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
  
  const { data } = await supabase
    .from('site_settings')
    .select('site_title, site_description, site_keywords, og_image')
    .eq('id', 'global')
    .single()

  return {
    title: data?.site_title || 'Termimal â€” Professional Market Analysis Terminal',
    description: data?.site_description || 'Institutional-grade charting, macro intelligence, COT positioning, and risk analytics. Analysis only â€” no trade execution.',
    keywords: data?.site_keywords || '',
    icons: { icon: '/favicon.ico' },
    openGraph: data?.og_image ? {
      images: [data.og_image],
    } : undefined,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans`}>
        
        {/* GLOBAL PROMO BANNER FROM ADMIN PANEL */}
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
