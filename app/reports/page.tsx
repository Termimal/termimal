import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Reports — Macro, COT & On-Chain Research',
  description:
    "Read Termimal's research reports: weekly CFTC COT positioning, macro intelligence briefs, on-chain flow analysis, and sentiment overviews.",
  alternates: { canonical: '/reports' },
  openGraph: {
    title: 'Reports — Macro, COT & On-Chain Research | Termimal',
    description:
      "Read Termimal's research reports: weekly CFTC COT positioning, macro intelligence briefs, on-chain flow analysis, and sentiment overviews.",
    url: '/reports',
    type: 'website',
  },
}

export const revalidate = 60
export const runtime = 'edge'

type Article = {
  id: string
  title: string
  category: string | null
  excerpt: string | null
  published_at: string | null
  author_id: string | null
  // joined row from the `profiles` table for display
  author?: { full_name: string | null } | null
}

export default async function ReportsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // NOTE: schema check constraint allows status in lowercase
  // ('draft','published','scheduled','archived'). Previous code used
  // 'Published' (capital P) which silently matched zero rows.
  // Column is `published_at` not `published_date`.
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, category, excerpt, published_at, author_id, author:profiles!articles_author_id_fkey(full_name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-24 min-h-screen">
      <div className="mb-12 md:mb-16">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Market Reports</h1>
        <p className="text-base md:text-lg" style={{ color: 'var(--t3)' }}>
          Read the latest macro analysis, crypto updates, and on-chain valuations from the Termimal research team.
        </p>
      </div>

      <div className="grid gap-6">
        {error ? (
          <div role="alert" className="p-12 text-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)', color: 'var(--t3)' }}>
            We couldn&apos;t load the reports. Please try again later.
          </div>
        ) : !articles || articles.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)', color: 'var(--t3)' }}>
            No reports published yet. Check back soon!
          </div>
        ) : (
          (articles as unknown as Article[]).map((article) => {
            const authorName = article.author?.full_name?.trim() || 'Termimal Research'
            const dateStr = article.published_at
              ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : ''
            return (
              <Link
                key={article.id}
                href={`/reports/${article.id}`}
                className="p-6 rounded-2xl border transition-all hover:-translate-y-1 block group"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  {article.category && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ background: 'var(--acc-d)', color: 'var(--acc)' }}>
                      {article.category}
                    </span>
                  )}
                  {dateStr && (
                    <span className="text-sm font-mono" style={{ color: 'var(--t3)' }}>{dateStr}</span>
                  )}
                </div>

                <h2 className="text-xl md:text-2xl font-bold mb-2 group-hover:underline decoration-2 underline-offset-4">{article.title}</h2>

                <div className="flex items-center gap-2 mt-4 text-sm" style={{ color: 'var(--t3)' }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'var(--border)', color: 'var(--t1)' }}>
                    {authorName.charAt(0)}
                  </span>
                  <span>By {authorName}</span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </main>
  )
}
