'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ui/ThemeToggle'
import {
  ArrowRight,
  Bell,
  CreditCard,
  Download,
  LayoutGrid,
  LogOut,
  Menu,
  Monitor,
  PanelLeft,
  ShieldCheck,
  User2,
  Users,
  X,
  Sparkles,
  Settings2
} from 'lucide-react'

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutGrid },
  { label: 'Subscription', href: '/dashboard/billing', icon: CreditCard },
  { label: 'Downloads', href: '/dashboard/downloads', icon: Download },
  { label: 'Workspaces', href: '/dashboard/workspaces', icon: PanelLeft },
  { label: 'Alerts', href: '/dashboard/alerts', icon: Bell },
  { label: 'Referrals', href: '/dashboard/referrals', icon: Users },
  { label: 'Profile & Security', href: '/dashboard/profile', icon: User2 },
]

function BrandLockup() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <span
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border"
        style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, var(--bg), var(--surface))' }}
      >
        <span className="absolute inset-[9px] rotate-45 rounded-[4px]" style={{ background: 'var(--acc)' }} />
      </span>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight">Termimal</span>
        <span className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--t4)' }}>
          User dashboard
        </span>
      </div>
    </Link>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [router, supabase])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-sm" style={{ color: 'var(--t3)' }}>Loading dashboard...</div>
      </div>
    )
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map((s: string) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <BrandLockup />
      </div>

      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl border"
            style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, var(--bg), var(--surface))' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{initials}</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{displayName}</div>
            <div className="text-xs truncate" style={{ color: 'var(--t4)' }}>{user?.email}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--t4)' }}>Status</div>
            <div className="mt-1 text-sm font-semibold">Active</div>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--t4)' }}>Access</div>
            <div className="mt-1 text-sm font-semibold">Web + Desktop</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] px-3 mb-2" style={{ color: 'var(--t4)' }}>
          Account
        </div>
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all"
              style={{
                color: active ? 'var(--t1)' : 'var(--t3)',
                background: active ? 'var(--bg)' : 'transparent',
                border: active ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: active ? '0 8px 24px rgba(0,0,0,.08)' : 'none',
              }}
            >
              <Icon size={16} style={{ color: active ? 'var(--acc)' : 'var(--t4)' }} />
              <span className="flex-1">{item.label}</span>
              <ArrowRight size={14} style={{ color: active ? 'var(--acc)' : 'transparent' }} />
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            >
              <Settings2 size={16} style={{ color: 'var(--t4)' }} />
            </div>
            <div>
              <div className="text-xs font-semibold">{displayName}</div>
              <div className="text-[11px]" style={{ color: 'var(--t4)' }}>Settings & theme</div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors"
          style={{ color: 'var(--t2)', borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <LogOut size={14} />
            Sign out
          </span>
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <aside
        className="hidden lg:flex w-[286px] shrink-0 border-r flex-col"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <SidebarContent />
      </aside>

      <main className="flex-1 min-w-0">
        <div
          className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 lg:hidden"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 88%, transparent)' }}
        >
          <BrandLockup />
          <button
            aria-label="Open dashboard menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--t2)' }}
          >
            <Menu size={18} />
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <button
              aria-label="Close menu overlay"
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,.48)' }}
              onClick={() => setMobileOpen(false)}
            />
            <div
              className="absolute right-0 top-0 h-full w-[88vw] max-w-[360px] border-l flex flex-col"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                boxShadow: '-24px 0 48px rgba(0,0,0,.22)',
              }}
            >
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--t4)' }}>
                  <Sparkles size={12} />
                  Navigation
                </div>
                <button
                  aria-label="Close dashboard menu"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--t2)' }}
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarContent />
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
