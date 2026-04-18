'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data || { plan: 'free', email: user.email, full_name: user.user_metadata?.full_name || '' })
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  if (loading) return <div className="text-sm" style={{ color: 'var(--t3)' }}>Loading...</div>

  const plan = profile?.plan || 'free'
  const planLimits: Record<string, { alerts: number; watchlists: number; layouts: number }> = {
    free: { alerts: 5, watchlists: 2, layouts: 1 },
    pro: { alerts: 50, watchlists: 10, layouts: 5 },
    premium: { alerts: 200, watchlists: 50, layouts: 20 },
  }
  const limits = planLimits[plan] || planLimits.free

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Dashboard</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Welcome back, {profile?.full_name || profile?.email?.split('@')[0] || 'there'}.</p>

      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Current plan', value: plan.charAt(0).toUpperCase() + plan.slice(1), sub: plan === 'free' ? 'Free forever' : `${profile?.billing_interval === 'year' ? 'Yearly' : 'Monthly'} billing` },
          { label: 'Status', value: profile?.subscription_status === 'active' ? 'Active' : profile?.subscription_status || 'Active', sub: profile?.current_period_end ? `Renews ${new Date(profile.current_period_end).toLocaleDateString()}` : 'No expiry' },
          { label: 'Alerts limit', value: `${limits.alerts}`, sub: `${plan} plan limit` },
          { label: 'Saved layouts', value: `${limits.layouts}`, sub: `${plan} plan limit` },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div className="text-[0.62rem] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--t4)' }}>{stat.label}</div>
            <div className="text-lg font-bold mb-0.5">{stat.value}</div>
            <div className="text-[0.68rem]" style={{ color: 'var(--t4)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <Link href="/web-terminal" className="btn-primary justify-center py-3 text-sm text-center">Launch Web Terminal</Link>
        <Link href="/download" className="btn-secondary justify-center py-3 text-sm text-center">Download Desktop App</Link>
        {plan === 'free' ? (
          <Link href="/pricing" className="btn-secondary justify-center py-3 text-sm text-center">Upgrade to Pro</Link>
        ) : plan === 'pro' ? (
          <Link href="/pricing" className="btn-secondary justify-center py-3 text-sm text-center">Upgrade to Premium</Link>
        ) : (
          <Link href="/dashboard/billing" className="btn-secondary justify-center py-3 text-sm text-center">Manage Subscription</Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-sm font-bold mb-4">Account details</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--t4)' }}>Email</span>
              <span style={{ color: 'var(--t2)' }}>{profile?.email}</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--t4)' }}>Name</span>
              <span style={{ color: 'var(--t2)' }}>{profile?.full_name || '—'}</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--t4)' }}>Referral code</span>
              <span className="font-mono" style={{ color: 'var(--t2)' }}>{profile?.referral_code || '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span style={{ color: 'var(--t4)' }}>Joined</span>
              <span style={{ color: 'var(--t2)' }}>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-sm font-bold mb-4">Quick links</h3>
          <div className="space-y-2">
            {[
              { label: 'Edit profile', href: '/dashboard/profile' },
              { label: 'Manage subscription', href: '/dashboard/billing' },
              { label: 'Download terminal', href: '/download' },
              { label: 'View pricing', href: '/pricing' },
              { label: 'Invite friends', href: '/dashboard/referrals' },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className="flex items-center justify-between py-2 text-xs transition-colors" style={{ borderBottom: '1px solid var(--border)', color: 'var(--t2)' }}>
                {link.label}
                <span style={{ color: 'var(--t4)' }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
