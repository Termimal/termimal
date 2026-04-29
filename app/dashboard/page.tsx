'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  CreditCard,
  Download,
  Monitor,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react'

type Profile = {
  plan?: string
  email?: string | null
  full_name?: string | null
  billing_interval?: string | null
  subscription_status?: string | null
  current_period_end?: string | null
  created_at?: string | null
  referral_code?: string | null
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/login'
          return
        }
        const { data, error: profErr } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (cancelled) return
        if (profErr && profErr.code !== 'PGRST116') {
          setError('We could not load your account. Please refresh.')
        } else {
          setProfile(data || { plan: 'free', email: user.email, full_name: user.user_metadata?.full_name || '' })
        }
      } catch {
        if (!cancelled) setError('Network error while loading your account.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProfile()
    return () => { cancelled = true }
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
        <div className="h-32 rounded-3xl animate-pulse" style={{ background: 'var(--surface)' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
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

  const plan = profile?.plan || 'free'
  const planLimits: Record<string, { alerts: number; watchlists: number; layouts: number }> = {
    free: { alerts: 5, watchlists: 2, layouts: 1 },
    pro: { alerts: 50, watchlists: 10, layouts: 5 },
    premium: { alerts: 200, watchlists: 50, layouts: 20 },
  }
  const limits = planLimits[plan] || planLimits.free
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'there'
  const subscriptionStatus = profile?.subscription_status === 'active' ? 'Active' : profile?.subscription_status || 'Active'

  const statCards = [
    {
      label: 'Current plan',
      value: plan.charAt(0).toUpperCase() + plan.slice(1),
      sub: plan === 'free' ? 'Free forever' : `${profile?.billing_interval === 'year' ? 'Yearly' : 'Monthly'} billing`,
      icon: CreditCard,
    },
    {
      label: 'Status',
      value: subscriptionStatus,
      sub: profile?.current_period_end ? `Renews ${new Date(profile.current_period_end).toLocaleDateString()}` : 'No expiry',
      icon: BadgeCheck,
    },
    {
      label: 'Alerts limit',
      value: `${limits.alerts}`,
      sub: `${plan} plan limit`,
      icon: Bell,
    },
    {
      label: 'Saved layouts',
      value: `${limits.layouts}`,
      sub: `${plan} plan limit`,
      icon: Monitor,
    },
  ]

  const quickActions = [
    {
      label: 'Launch Web Termimal',
      href: '/terminal',
      icon: Sparkles,
      primary: true,
      note: 'Open the live market terminal in your browser',
    },
    {
      label: 'Download desktop app',
      href: '/dashboard/downloads',
      icon: Download,
      primary: false,
      note: 'Native app access and installer links',
    },
    {
      label: plan === 'free' ? 'Upgrade to Pro' : plan === 'pro' ? 'Upgrade to Premium' : 'Manage subscription',
      href: plan === 'premium' ? '/dashboard/billing' : '/pricing',
      icon: ShieldCheck,
      primary: false,
      note: 'Billing, plan access, and account upgrades',
    },
  ]

  const recent = [
    { label: 'Platform access', value: 'Dashboard + Web Termimal', meta: 'Ready now' },
    { label: 'Security', value: 'Password reset + 2FA', meta: 'Managed in Profile & Security' },
    { label: 'Alerts capacity', value: `${limits.alerts} included`, meta: 'Based on your current plan' },
    { label: 'Saved layouts', value: `${limits.layouts} available`, meta: 'Workspace storage limit' },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <section
        className="rounded-3xl border p-5 sm:p-6 lg:p-8"
        style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, var(--surface), var(--bg))' }}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div
              className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ borderColor: 'var(--border)', color: 'var(--t4)' }}
            >
              <Activity size={12} />
              Account overview
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              Welcome back, {displayName}.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6" style={{ color: 'var(--t3)' }}>
              Your Termimal workspace is ready. Launch the web terminal, review your subscription, and manage your account from one place.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[360px]">
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--t4)' }}>Member since</div>
              <div className="mt-2 text-sm font-semibold">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
              </div>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--t4)' }}>Referral code</div>
              <div className="mt-2 font-mono text-sm font-semibold break-all">{profile?.referral_code || '—'}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--t4)' }}>
                  {label}
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <Icon size={16} style={{ color: 'var(--acc)' }} />
              </div>
            </div>
            <div className="mt-3 text-sm" style={{ color: 'var(--t4)' }}>{sub}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group rounded-2xl border p-5 transition-all"
              style={{
                borderColor: action.primary ? 'var(--acc)' : 'var(--border)',
                background: action.primary ? 'var(--acc)' : 'var(--surface)',
                color: action.primary ? '#fff' : 'var(--t1)',
                boxShadow: action.primary ? '0 18px 30px rgba(16,185,129,.18)' : 'none',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ opacity: action.primary ? 0.9 : 1 }}>
                    <Icon size={12} />
                    Action
                  </div>
                  <div className="mt-3 text-lg font-semibold tracking-tight">{action.label}</div>
                  <div className="mt-2 text-sm" style={{ color: action.primary ? 'rgba(255,255,255,.82)' : 'var(--t4)' }}>
                    {action.note}
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: action.primary ? '#fff' : 'var(--t4)' }} />
              </div>
            </Link>
          )
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--t4)' }}>
              Account details
            </h3>
            <Link href="/dashboard/profile" className="text-xs font-medium" style={{ color: 'var(--acc)' }}>
              Edit profile
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Email', value: profile?.email || '—' },
              { label: 'Name', value: profile?.full_name || '—' },
              { label: 'Plan', value: plan.charAt(0).toUpperCase() + plan.slice(1) },
              { label: 'Joined', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--t4)' }}>{item.label}</div>
                <div className="mt-2 text-sm font-medium break-all">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, var(--bg), var(--surface))' }}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Zap size={14} style={{ color: 'var(--acc)' }} />
              Workspace status
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--t4)' }}>Terminal</div>
                <div className="mt-1 text-sm font-medium">Ready</div>
              </div>
              <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--t4)' }}>Alerts</div>
                <div className="mt-1 text-sm font-medium">{limits.alerts} available</div>
              </div>
              <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--t4)' }}>Security</div>
                <div className="mt-1 text-sm font-medium">2FA ready</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--t4)' }}>
              Recent activity
            </h3>
            <BookOpen size={16} style={{ color: 'var(--t4)' }} />
          </div>

          <div className="mt-5 space-y-3">
            {recent.map(item => (
              <div key={item.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--t4)' }}>{item.meta}</div>
                  </div>
                  <div className="text-sm font-semibold text-right" style={{ color: 'var(--t2)' }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-5 rounded-xl border p-4"
            style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, rgba(16,185,129,.08), transparent)' }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={14} style={{ color: 'var(--acc)' }} />
              Security snapshot
            </div>
            <p className="mt-2 text-sm" style={{ color: 'var(--t4)' }}>
              Email verification and two-factor authentication are supported from your profile page. We recommend enabling 2FA before using shared or public machines.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
