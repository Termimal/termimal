'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function BillingPage() {
  const [profile, setProfile] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof || { plan: 'free', email: user.email })
        const { data: inv } = await supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
        setInvoices(inv || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/stripe/create-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Could not open billing portal. Stripe may not be configured yet.')
    } catch { alert('Billing portal not available yet.') }
  }

  const handleUpgrade = async (priceKey: string) => {
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceKey }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Checkout not available. Stripe may not be configured yet.')
    } catch { alert('Checkout not available yet.') }
  }

  if (loading) return <div className="text-sm" style={{ color: 'var(--t3)' }}>Loading...</div>

  const plan = profile?.plan || 'free'

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Subscription & Billing</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Manage your plan, payment methods, and invoices.</p>

      <div className="p-6 rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--t4)' }}>Current plan</div>
            <div className="text-xl font-bold">{plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
            <div className="text-xs" style={{ color: 'var(--t3)' }}>
              {plan === 'free' ? 'Free forever — no credit card required' :
               `${profile?.billing_interval === 'year' ? 'Yearly' : 'Monthly'} billing`}
            </div>
          </div>
          <div className="flex gap-2">
            {plan !== 'premium' && (
              <button onClick={() => handleUpgrade(plan === 'free' ? 'pro_yearly' : 'premium_yearly')} className="btn-primary text-xs py-2 px-4">
                {plan === 'free' ? 'Upgrade to Pro' : 'Upgrade to Premium'}
              </button>
            )}
            {plan !== 'free' && (
              <button onClick={handleManageBilling} className="btn-secondary text-xs py-2 px-4">Manage billing</button>
            )}
          </div>
        </div>

        {profile?.subscription_status && profile.subscription_status !== 'active' && (
          <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(251,191,36,.1)', color: 'var(--amber)' }}>
            Subscription status: {profile.subscription_status}. {profile.subscription_status === 'past_due' && 'Please update your payment method.'}
          </div>
        )}
      </div>

      {/* Plan comparison */}
      <div className="p-6 rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h3 className="text-sm font-bold mb-4">Compare plans</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: 'Free', price: '$0', features: ['5 alerts', '2 watchlists', '1 layout', 'Basic charting'] },
            { name: 'Pro', price: '$9.99/mo', features: ['50 alerts', '10 watchlists', '5 layouts', 'All indicators', 'COT reports'] },
            { name: 'Premium', price: '$19.99/mo', features: ['200 alerts', '50 watchlists', '20 layouts', 'Everything in Pro', 'Priority support', 'API access'] },
          ].map(p => (
            <div key={p.name} className="p-4 rounded-lg" style={{ background: 'var(--bg)', border: plan === p.name.toLowerCase() ? '2px solid var(--acc)' : '1px solid var(--border)' }}>
              <div className="text-sm font-bold mb-0.5">{p.name}</div>
              <div className="text-lg font-bold mb-3">{p.price}</div>
              <ul className="space-y-1">
                {p.features.map(f => (
                  <li key={f} className="text-sm flex items-center gap-1.5" style={{ color: 'var(--t3)' }}>
                    <span style={{ color: 'var(--green-val)' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              {plan === p.name.toLowerCase() ? (
                <div className="mt-3 text-sm font-semibold text-center py-1.5 rounded" style={{ color: 'var(--acc)', background: 'var(--acc-d)' }}>Current plan</div>
              ) : (
                <button onClick={() => handleUpgrade(`${p.name.toLowerCase()}_yearly`)}
                  className="mt-3 w-full text-sm font-semibold text-center py-1.5 rounded transition-colors"
                  style={{ color: 'var(--t2)', border: '1px solid var(--border)' }}>
                  {p.name === 'Free' ? 'Downgrade' : 'Upgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="p-6 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h3 className="text-sm font-bold mb-4">Invoice history</h3>
        {invoices.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--t4)' }}>No invoices yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left py-2 font-semibold" style={{ color: 'var(--t3)' }}>Date</th>
                <th className="text-right py-2 font-semibold" style={{ color: 'var(--t3)' }}>Amount</th>
                <th className="text-right py-2 font-semibold" style={{ color: 'var(--t3)' }}>Status</th>
                <th className="text-right py-2 font-semibold" style={{ color: 'var(--t3)' }}>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-3 font-mono" style={{ color: 'var(--t2)' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="py-3 text-right font-mono" style={{ color: 'var(--t2)' }}>${inv.amount}</td>
                  <td className="py-3 text-right">
                    <span className="px-2 py-0.5 rounded text-sm font-semibold" style={{ color: 'var(--green-val)', background: 'rgba(52,211,153,.1)' }}>{inv.status}</span>
                  </td>
                  <td className="py-3 text-right">
                    {inv.invoice_url && <a href={inv.invoice_url} target="_blank" className="text-sm font-medium" style={{ color: 'var(--acc)' }}>View</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

