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

export default async function ReportsPage() {
  const supabase = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'Published')
    .order('published_date', { ascending: false })

  return (
    <main className="max-w-4xl mx-auto px-6 py-24 min-h-screen">
      <div className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Market Reports</h1>
        <p className="text-lg" style={{ color: 'var(--t3)' }}>
          Read the latest macro analysis, crypto updates, and on-chain valuations from the Termimal research team.
        </p>
      </div>

      <div className="grid gap-6">
        {!articles || articles.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)', color: 'var(--t3)' }}>
            No reports published yet. Check back soon!
          </div>
        ) : (
          articles.map((article) => (
            <Link 
              key={article.id} 
              href={/reports/ + article.id}
              className="p-6 rounded-2xl border transition-all hover:-translate-y-1 block group"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ background: 'var(--acc-d)', color: 'var(--acc)' }}>
                  {article.category}
                </span>
                <span className="text-sm font-mono" style={{ color: 'var(--t4)' }}>
                  {new Date(article.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              
              <h2 className="text-2xl font-bold mb-2 group-hover:underline decoration-2 underline-offset-4">{article.title}</h2>
              
              <div className="flex items-center gap-2 mt-4 text-sm" style={{ color: 'var(--t3)' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'var(--border)', color: 'var(--t1)' }}>
                  {article.author.charAt(0)}
                </span>
                <span>By {article.author}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}

