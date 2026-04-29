'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function BackToHome({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  return (
    <div className="w-full mb-6 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={handleBack}
        className="text-sm font-medium"
        style={{ color: 'var(--t2)' }}
      >
        ← Back
      </button>
      <Link href="/" className="text-sm font-medium" style={{ color: 'var(--acc)' }}>
        Home
      </Link>
    </div>
  )
}
