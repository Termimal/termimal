import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export const revalidate = 60
export const runtime = 'edge'

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'Published')
    .single()

  if (!article) notFound()

  return (
    <main className="max-w-3xl mx-auto px-6 py-24 min-h-screen">
      <Link href="/reports" className="inline-flex items-center gap-2 text-sm font-medium mb-12 hover:underline" style={{ color: 'var(--t3)' }}>
        <ArrowLeft size={16} /> Back to Reports
      </Link>

      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider" style={{ background: 'var(--acc-d)', color: 'var(--acc)' }}>
            {article.category}
          </span>
          <span className="text-sm font-mono" style={{ color: 'var(--t4)' }}>
            {new Date(article.published_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 leading-tight">{article.title}</h1>
        
        <div className="flex items-center gap-3 pb-8 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }}>
            {article.author.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-base">{article.author}</div>
            <div className="text-sm" style={{ color: 'var(--t3)' }}>Termimal Research</div>
          </div>
        </div>
      </div>

      <div className="prose prose-invert max-w-none text-lg leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--t2)' }}>
        {article.content}
      </div>
    </main>
  )
}

