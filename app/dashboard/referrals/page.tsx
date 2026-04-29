'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = { referral_code: string | null }

export default function ReferralsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/login'
          return
        }
        const { data, error: qErr } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('id', user.id)
          .single()
        if (cancelled) return
        if (qErr) {
          setError('Could not load your referral code.')
        } else {
          setProfile(data as Profile)
        }
      } catch {
        if (!cancelled) setError('Network error while loading your referral code.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [supabase])

  // Use current origin so the same page works on localhost, preview deploys,
  // and production without hardcoding a Vercel-era URL.
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://termimal.com'
  const refCode = profile?.referral_code ?? null
  const refLink = refCode ? `${origin}/signup?ref=${refCode}` : ''

  const handleCopy = async () => {
    if (!refLink) return
    try {
      await navigator.clipboard.writeText(refLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can fail (Safari iframe, permissions). Fall back to
      // selecting the input so the user can copy manually.
      const input = document.getElementById('referral-link') as HTMLInputElement | null
      input?.select()
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Referral Center</h1>
      <p className="text-sm mb-6 sm:mb-8" style={{ color: 'var(--t3)' }}>Invite friends and earn rewards when they subscribe.</p>

      {error && (
        <div role="alert" className="mb-6 p-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>
          {error}
        </div>
      )}

      <div className="p-5 sm:p-6 rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-bold mb-3">Your referral link</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="referral-link" className="sr-only">Your referral link</label>
          <input
            id="referral-link"
            readOnly
            value={loading ? 'Loading…' : (refLink || 'Referral code unavailable')}
            aria-label="Referral link"
            className="flex-1 min-w-0 px-3 py-2.5 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t2)' }}
          />
          <button
            onClick={handleCopy}
            disabled={loading || !refLink}
            className="btn-primary text-sm py-2.5 px-4 disabled:opacity-50 sm:py-2"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-bold mb-3">How it works</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Share your link', desc: 'Send your unique referral link to friends' },
            { step: '2', title: 'They sign up',    desc: 'Your friend creates a free account' },
            { step: '3', title: 'Both earn rewards', desc: 'Get credit when they subscribe' },
          ].map(s => (
            <li key={s.step}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-2" style={{ background: 'var(--acc-d)', color: 'var(--acc)' }}>{s.step}</div>
              <div className="text-sm font-semibold mb-0.5">{s.title}</div>
              <div className="text-sm" style={{ color: 'var(--t3)' }}>{s.desc}</div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
