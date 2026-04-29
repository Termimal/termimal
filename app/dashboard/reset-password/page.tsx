'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import AuthLayout from '@/components/auth/AuthLayout'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const passwordsMatch = confirmPassword === '' || password === confirmPassword

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    setTimeout(() => {
      router.push('/dashboard')
    }, 1200)
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a secure new password for your account."
    >
      {success ? (
        <div
          className="p-4 rounded-xl text-center"
          style={{ background: 'var(--acc-d)' }}
        >
          <p className="text-sm mb-1" style={{ color: 'var(--acc)' }}>
            Password updated successfully
          </p>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>
            Redirecting you to your dashboard...
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

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--t2)' }}
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--t1)',
              }}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--t2)' }}
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${!passwordsMatch ? 'var(--red-val)' : 'var(--border)'}`,
                color: 'var(--t1)',
              }}
            />

            {!passwordsMatch && confirmPassword ? (
              <p className="mt-1 text-xs" style={{ color: 'var(--red-val)' }}>
                Passwords do not match
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={loading || !passwordsMatch}
            className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50"
          >
            {loading ? 'Updating password...' : 'Update password'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}