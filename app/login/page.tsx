'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import AuthLayout from '@/components/auth/AuthLayout'
import { createClient } from '@/lib/supabase/client'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { PhoneAuth } from '@/components/auth/PhoneAuth'

export default function LoginPage() {
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }

    window.location.href = '/terminal'
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue to your account."
    >
      {/* Social sign-in at the top */}
      <div className="mb-4">
        <OAuthButtons next="/terminal" />
      </div>

      {/* Email / Phone toggle */}
      <div
        role="tablist"
        aria-label="Sign-in method"
        className="flex gap-1 p-1 rounded-lg mb-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {(['email', 'phone'] as const).map(m => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={method === m}
            onClick={() => { setMethod(m); setError('') }}
            className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors"
            style={{
              background: method === m ? 'var(--bh)' : 'transparent',
              color: method === m ? 'var(--t1)' : 'var(--t3)',
            }}
          >
            {m === 'email' ? 'Email' : 'Phone (SMS)'}
          </button>
        ))}
      </div>

      {method === 'phone' && <PhoneAuth mode="login" next="/terminal" />}

      {method === 'email' && (
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

          <div className="mb-2">
            <label
              htmlFor="password"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--t2)' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--t1)',
              }}
            />
          </div>

          <div className="mb-6 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium"
              style={{ color: 'var(--acc)' }}
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      )}

      <p className="mt-4 text-xs text-center" style={{ color: 'var(--t3)' }}>
        New to Termimal?{' '}
        <Link href="/signup" style={{ color: 'var(--acc)' }}>
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
