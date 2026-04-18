'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/auth/AuthLayout'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Termimal account.">
      <form onSubmit={handleLogin}>
        {error && (
          <div className="mb-4 p-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)', border: '1px solid rgba(248,113,113,.2)' }}>{error}</div>
        )}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Password</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
        </div>
        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--t3)' }}><input type="checkbox" /> Remember me</label>
          <Link href="/forgot-password" className="text-xs font-medium" style={{ color: 'var(--acc)' }}>Forgot password?</Link>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-sm mb-4 disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: '1px solid var(--border)' }} /></div>
        <div className="relative flex justify-center"><span className="px-3 text-xs" style={{ background: 'var(--bg)', color: 'var(--t4)' }}>or continue with</span></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => handleOAuth('google')} className="btn-secondary justify-center py-2.5 text-xs">Google</button>
        <button onClick={() => handleOAuth('github')} className="btn-secondary justify-center py-2.5 text-xs">GitHub</button>
      </div>
      <p className="text-center text-xs" style={{ color: 'var(--t3)' }}>
        Don&apos;t have an account? <Link href="/signup" className="font-medium" style={{ color: 'var(--acc)' }}>Create one</Link>
      </p>
    </AuthLayout>
  )
}
