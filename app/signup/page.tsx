'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/auth/AuthLayout'
import { createClient } from '@/lib/supabase/client'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { PhoneAuth } from '@/components/auth/PhoneAuth'
import { Eye, EyeOff, Check } from 'lucide-react'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background: i < score ? 'var(--acc)' : 'var(--border)',
            }}
          />
        ))}
      </div>
      <ul className="mt-2 text-xs space-y-1" style={{ color: 'var(--t3)' }}>
        <li className={checks[0] ? 'text-[var(--acc)]' : ''}>At least 8 characters</li>
        <li className={checks[1] ? 'text-[var(--acc)]' : ''}>One uppercase letter</li>
        <li className={checks[2] ? 'text-[var(--acc)]' : ''}>One number</li>
        <li className={checks[3] ? 'text-[var(--acc)]' : ''}>One special character</li>
      </ul>
    </div>
  )
}

export default function SignupPage() {
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const passwordsMatch = confirmPassword === '' || password === confirmPassword
  const canSubmit = email && password && confirmPassword && passwordsMatch

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/terminal`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess('Check your email to confirm your account.')
    setLoading(false)

    setTimeout(() => {
      router.push('/login')
    }, 1200)
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Sign up to start using Termimal."
    >
      {/* Social sign-up at the top */}
      <div className="mb-4">
        <OAuthButtons next="/terminal" />
      </div>

      {/* Email / Phone toggle */}
      <div
        role="tablist"
        aria-label="Sign-up method"
        className="flex gap-1 p-1 rounded-lg mb-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {(['email', 'phone'] as const).map(m => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={method === m}
            onClick={() => { setMethod(m); setError(''); setSuccess('') }}
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

      {method === 'phone' && <PhoneAuth mode="signup" next="/terminal" />}

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

        {success && (
          <div
            role="status"
            className="mb-4 p-3 rounded-lg text-xs font-medium"
            style={{
              background: 'rgba(34,197,94,.1)',
              color: 'var(--acc)',
            }}
          >
            {success}
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

        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--t2)' }}
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--t1)',
              }}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--t3)' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        <div className="mb-6">
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--t2)' }}
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${!passwordsMatch ? 'var(--red-val)' : 'var(--border)'}`,
                color: 'var(--t1)',
              }}
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--t3)' }}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {!passwordsMatch && confirmPassword ? (
            <p className="mt-1 text-xs" style={{ color: 'var(--red-val)' }}>
              Passwords do not match
            </p>
          ) : passwordsMatch && confirmPassword ? (
            <p className="mt-1 text-xs flex items-center gap-1" style={{ color: 'var(--acc)' }}>
              <Check size={12} /> Passwords match
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>

      </form>
      )}

      <p className="mt-4 text-xs text-center" style={{ color: 'var(--t3)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--acc)' }}>
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}