import { ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

type FAQ = {
  id: string
  question: string
  answer: string
  is_active: boolean
}

export const revalidate = 300

export default async function HomeFaq() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('faqs')
    .select('id, question, answer, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const faqs: FAQ[] = data ?? []
  if (faqs.length === 0) return null

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }

  return (
    <section className="py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          <p className="mt-3 text-base" style={{ color: 'var(--t3)' }}>
            Clear answers about the platform, research, pricing, and how Termimal works.
          </p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-2xl border overflow-hidden"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <summary className="cursor-pointer list-none w-full px-6 py-5 flex items-center justify-between gap-4 text-left">
                <span className="text-base font-semibold" style={{ color: 'var(--t1)' }}>
                  {faq.question}
                </span>
                <ChevronDown
                  size={18}
                  className="transition-transform group-open:rotate-180 shrink-0"
                  style={{ color: 'var(--t3)' }}
                />
              </summary>
              <div
                className="px-6 pb-6 text-base leading-7"
                style={{ color: 'var(--t3)', borderTop: '1px solid var(--border)' }}
              >
                <div className="pt-4 whitespace-pre-wrap">{faq.answer}</div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
