'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

type FAQ = {
  id: string
  question: string
  answer: string
  is_active: boolean
}

export default function HomeFaq() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFaqs() {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (data) setFaqs(data)
      setLoading(false)
    }

    loadFaqs()
  }, [supabase])

  if (loading) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm" style={{ color: 'var(--t3)' }}>
            Loading FAQs...
          </p>
        </div>
      </section>
    )
  }

  if (faqs.length === 0) return null

  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          <p className="mt-3 text-base" style={{ color: 'var(--t3)' }}>
            Clear answers about the platform, research, pricing, and how Termimal works.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id

            return (
              <div
                key={faq.id}
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left"
                >
                  <span className="text-base font-semibold" style={{ color: 'var(--t1)' }}>
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={	ransition-transform }
                    style={{ color: 'var(--t3)' }}
                  />
                </button>

                {isOpen && (
                  <div
                    className="px-6 pb-6 text-base leading-7"
                    style={{ color: 'var(--t3)', borderTop: '1px solid var(--border)' }}
                  >
                    <div className="pt-4 whitespace-pre-wrap">{faq.answer}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
