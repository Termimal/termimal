import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import Link from 'next/link'

export const runtime = 'edge'
export const revalidate = 60

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabase()
  // The schema uses `articles`, not `reports`. The previous version queried
  // a non-existent table and always returned notFound().
  const { data: article, error } = await supabase
    .from('articles')
    .select('id, title, content, category, excerpt, published_at, author_id, author:profiles!articles_author_id_fkey(full_name)')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !article) notFound()

  const a = article as unknown as {
    id: string
    title: string
    content: string | null
    category: string | null
    excerpt: string | null
    published_at: string | null
    author?: { full_name: string | null } | null
  }
  const authorName = a.author?.full_name?.trim() || 'Termimal Research'
  const dateStr = a.published_at
    ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-16 md:py-24 min-h-screen">
      <Link href="/reports" className="text-sm" style={{ color: 'var(--t3)' }}>
        ← All reports
      </Link>

      <header className="mt-8 mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {a.category && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ background: 'var(--acc-d)', color: 'var(--acc)' }}>
              {a.category}
            </span>
          )}
          {dateStr && (
            <span className="text-sm font-mono" style={{ color: 'var(--t3)' }}>{dateStr}</span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{a.title}</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--t3)' }}>By {authorName}</p>
      </header>

      {a.excerpt && (
        <p className="text-base md:text-lg mb-8" style={{ color: 'var(--t2)' }}>
          {a.excerpt}
        </p>
      )}

      {/* Content is plain text. If markdown rendering is added later, swap in
          a sanitized markdown renderer (NOT dangerouslySetInnerHTML on raw
          DB text). */}
      <article className="prose prose-invert max-w-none whitespace-pre-wrap leading-7" style={{ color: 'var(--t1)' }}>
        {a.content ?? ''}
      </article>
    </main>
  )
}
