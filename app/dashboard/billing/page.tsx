'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  plan?: 'free' | 'pro' | 'premium' | string
  email?: string | null
  subscription_status?: string | null
  billing_interval?: 'month' | 'year' | null
  current_period_end?: string | null
}

type Invoice = {
  id: string
  amount: number
  currency: string
  status: string
  invoice_url: string | null
  created_at: string
}

type BillingCycle = 'monthly' | 'yearly'

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          // Not authenticated — middleware should have caught this, but be
          // defensive: bounce to login.
          window.location.href = '/login'
          return
        }
        const [{ data: prof, error: profErr }, { data: inv, error: invErr }] = await Promise.all([
          supabase.from('profiles').select('plan,email,subscription_status,billing_interval,current_period_end').eq('id', user.id).single(),
          supabase.from('invoices').select('id,amount,currency,status,invoice_url,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        ])
        if (cancelled) return
        if (profErr) {
          setError('We could not load your subscription. Please refresh the page.')
        } else {
          setProfile(prof || { plan: 'free', email: user.email })
        }
        setInvoices(invErr ? [] : (inv as Invoice[] | null) ?? [])
      } catch {
        if (!cancelled) setError('Network error while loading your billing data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [supabase])

  const handleManageBilling = async () => {
    setActionError('')
    setPendingAction('portal')
    try {
      const res = await fetch('/api/stripe/create-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setActionError(data.error === 'No billing account found'
        ? 'You don\'t have a paid subscription yet.'
        : 'Could not open billing portal. Please try again.')
    } catch {
      setActionError('Network error. Please try again.')
    } finally {
      setPendingAction(null)
    }
  }

  const handleUpgrade = async (priceKey: string) => {
    setActionError('')
    setPendingAction(priceKey)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceKey }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setActionError('Checkout is unavailable right now. Please try again.')
    } catch {
      setActionError('Network error. Please try again.')
    } finally {
      setPendingAction(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading billing">
        <div className="h-8 w-1/3 rounded animate-pulse" style={{ background: 'var(--surface)' }} />
        <div className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
        <div className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="p-6 rounded-xl text-sm" style={{ border: '1px solid rgba(248,113,113,.3)', background: 'rgba(248,113,113,.05)', color: 'var(--red-val)' }}>
        {error}
      </div>
    )
  }

  const plan = (profile?.plan || 'free').toLowerCase()

  const PLANS_DATA: Array<{ name: string; key: 'free' | 'pro' | 'premium'; priceMonthly: string; priceYearly: string; features: string[] }> = [
    { name: 'Free',    key: 'free',    priceMonthly: '€0',     priceYearly: '€0',      features: ['Basic dashboard', '3 watchlists (10 symbols)', '1 layout', 'Basic charting'] },
    { name: 'Pro',     key: 'pro',     priceMonthly: '€9.99',  priceYearly: '€99.99',  features: ['Macro & COT intelligence', '100 watchlists', '10 layouts', 'All indicators', 'Advanced screener'] },
    { name: 'Premium', key: 'premium', priceMonthly: '€19.99', priceYearly: '€199.99', features: ['Everything in Pro', 'Polymarket event probabilities', 'AI weekly briefing', 'Sovereign intelligence', 'API access'] },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Subscription &amp; Billing</h1>
      <p className="text-sm mb-6 sm:mb-8" style={{ color: 'var(--t3)' }}>Manage your plan, payment methods, and invoices.</p>

      {actionError && (
        <div role="alert" className="mb-6 p-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>
          {actionError}
        </div>
      )}

      <div className="p-5 sm:p-6 rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--t3)' }}>Current plan</div>
            <div className="text-xl font-bold">{plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--t3)' }}>
              {plan === 'free'
                ? 'Free forever — no credit card required'
                : `${profile?.billing_interval === 'year' ? 'Yearly' : 'Monthly'} billing`}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            {plan !== 'premium' && (
              <button
                onClick={() => handleUpgrade(plan === 'free' ? 'pro_monthly' : 'premium_monthly')}
                disabled={pendingAction !== null}
                className="btn-primary text-sm py-2.5 px-4 disabled:opacity-50 sm:py-2"
              >
                {pendingAction === (plan === 'free' ? 'pro_monthly' : 'premium_monthly') ? 'Loading…' : (plan === 'free' ? 'Upgrade to Pro' : 'Upgrade to Premium')}
              </button>
            )}
            {plan !== 'free' && (
              <button
                onClick={handleManageBilling}
                disabled={pendingAction !== null}
                className="btn-secondary text-sm py-2.5 px-4 disabled:opacity-50 sm:py-2"
              >
                {pendingAction === 'portal' ? 'Loading…' : 'Manage billing'}
              </button>
            )}
          </div>
        </div>

        {profile?.subscription_status && profile.subscription_status !== 'active' && profile.subscription_status !== 'trialing' && (
          <div role="status" className="p-3 rounded-lg text-xs" style={{ background: 'rgba(251,191,36,.1)', color: 'var(--amber)' }}>
            Subscription status: {profile.subscription_status}. {profile.subscription_status === 'past_due' && 'Please update your payment method.'}
          </div>
        )}
      </div>

      {/* Plan comparison */}
      <div className="p-5 sm:p-6 rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold">Compare plans</h2>
          <div role="tablist" aria-label="Billing cycle" className="inline-flex rounded-lg p-0.5" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            {(['monthly', 'yearly'] as const).map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={cycle === c}
                onClick={() => setCycle(c)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                style={{ background: cycle === c ? 'var(--acc-d)' : 'transparent', color: cycle === c ? 'var(--acc)' : 'var(--t3)' }}
              >
                {c === 'monthly' ? 'Monthly' : 'Yearly · save 16%'}
              </button>
            ))}
          </div>
        </div>

        {/* Stack on mobile (no overflow), 3 columns on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLANS_DATA.map((p) => {
            const isCurrent = plan === p.key
            const priceKey = `${p.key}_${cycle === 'monthly' ? 'monthly' : 'yearly'}`
            const showAction = !isCurrent && p.key !== 'free'
            return (
              <div key={p.key} className="p-4 rounded-lg flex flex-col" style={{ background: 'var(--bg)', border: isCurrent ? '2px solid var(--acc)' : '1px solid var(--border)' }}>
                <div className="text-sm font-bold mb-0.5">{p.name}</div>
                <div className="text-lg font-bold mb-3">
                  {cycle === 'monthly' ? p.priceMonthly : p.priceYearly}
                  {p.key !== 'free' && (
                    <span className="text-xs font-normal ml-1" style={{ color: 'var(--t3)' }}>
                      / {cycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </div>
                <ul className="space-y-1 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="text-sm flex items-start gap-1.5" style={{ color: 'var(--t3)' }}>
                      <span style={{ color: 'var(--green-val)' }} aria-hidden>✓</span> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="mt-3 text-sm font-semibold text-center py-2 rounded" style={{ color: 'var(--acc)', background: 'var(--acc-d)' }}>Current plan</div>
                ) : showAction ? (
                  <button
                    onClick={() => handleUpgrade(priceKey)}
                    disabled={pendingAction !== null}
                    className="mt-3 w-full text-sm font-semibold text-center py-2 rounded transition-colors disabled:opacity-50"
                    style={{ color: 'var(--t1)', border: '1px solid var(--border)' }}
                  >
                    {pendingAction === priceKey ? 'Loading…' : (plan === 'free' ? 'Upgrade' : `Switch to ${p.name}`)}
                  </button>
                ) : (
                  <button
                    onClick={handleManageBilling}
                    disabled={pendingAction !== null}
                    className="mt-3 w-full text-sm font-semibold text-center py-2 rounded transition-colors disabled:opacity-50"
                    style={{ color: 'var(--t3)', border: '1px solid var(--border)' }}
                  >
                    Cancel via billing portal
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Invoices — table on md+, cards on mobile */}
      <div className="p-5 sm:p-6 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-bold mb-4">Invoice history</h2>
        {invoices.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--t3)' }}>No invoices yet.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th scope="col" className="text-left py-2 font-semibold" style={{ color: 'var(--t3)' }}>Date</th>
                    <th scope="col" className="text-right py-2 font-semibold" style={{ color: 'var(--t3)' }}>Amount</th>
                    <th scope="col" className="text-right py-2 font-semibold" style={{ color: 'var(--t3)' }}>Status</th>
                    <th scope="col" className="text-right py-2 font-semibold" style={{ color: 'var(--t3)' }}>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-3 font-mono" style={{ color: 'var(--t2)' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="py-3 text-right font-mono" style={{ color: 'var(--t2)' }}>{inv.currency?.toUpperCase() || 'EUR'} {inv.amount}</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ color: 'var(--green-val)', background: 'rgba(63,185,80,.1)' }}>{inv.status}</span>
                      </td>
                      <td className="py-3 text-right">
                        {inv.invoice_url && (
                          <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: 'var(--acc)' }}>
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile card list */}
            <ul className="md:hidden space-y-2">
              {invoices.map(inv => (
                <li key={inv.id} className="p-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs" style={{ color: 'var(--t3)' }}>
                      {new Date(inv.created_at).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ color: 'var(--green-val)', background: 'rgba(63,185,80,.1)' }}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold">{inv.currency?.toUpperCase() || 'EUR'} {inv.amount}</span>
                    {inv.invoice_url && (
                      <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: 'var(--acc)' }}>
                        View invoice
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
