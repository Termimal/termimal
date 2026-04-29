'use client'

import { useState, type FormEvent } from 'react'
import AuthLayout from '@/components/auth/AuthLayout'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Route reset confirmations through the auth callback so the recovery
      // session is established BEFORE landing inside the protected
      // /dashboard tree (middleware would otherwise bounce to /login).
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard/reset-password`,
      })

      // Always present the same success state regardless of whether the
      // email exists — prevents account enumeration via the reset flow.
      if (error) {
        // Log for ops but don't leak to the user.
        // eslint-disable-next-line no-console
        console.error('reset password error', error)
      }
      setSuccess(true)
      setLoading(false)
    } catch {
      // Even on network error, present success to avoid timing-based
      // enumeration. The user can retry if no email arrives.
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="We’ll send a reset link to your email."
    >
      {success ? (
        <div
          className="p-4 rounded-xl text-center"
          style={{ background: 'var(--acc-d)' }}
        >
          <p className="text-sm mb-1" style={{ color: 'var(--acc)' }}>
            Check your inbox
          </p>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>
            If an account exists for that email, a reset link has been sent.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg text-xs font-medium"
              style={{
                background: 'rgba(248,113,113,.1)',
                color: 'var(--red-val)',
              }}
            >
              {error}
            </div>
          )}

          <div className="mb-6">
            <label
              htmlFor="email"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--t2)' }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--t1)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50"
          >
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}