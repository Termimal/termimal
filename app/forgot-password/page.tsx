'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthLayout from '@/components/auth/AuthLayout'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard/profile`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="We sent you a password reset link.">
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--acc-d)', border: '1px solid rgba(52,211,153,.15)' }}>
          <p className="text-sm" style={{ color: 'var(--acc)' }}>Reset link sent to {email}</p>
        </div>
        <Link href="/login" className="btn-secondary w-full justify-center py-3 text-sm mt-4">Back to sign in</Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset password" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleReset}>
        {error && <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>{error}</div>}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Email address</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-sm mb-4 disabled:opacity-50">
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      <p className="text-center text-xs" style={{ color: 'var(--t3)' }}>
        Remember your password? <Link href="/login" className="font-medium" style={{ color: 'var(--acc)' }}>Sign in</Link>
      </p>
    </AuthLayout>
  )
}
