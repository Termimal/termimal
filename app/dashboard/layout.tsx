'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ui/ThemeToggle'
import Logo from '@/components/ui/Logo'
import { openSupportChat } from '@/components/support/SupportChatLauncher'
import {
  ArrowRight,
  Bell,
  CreditCard,
  Download,
  Headphones,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeft,
  Settings2,
  Sparkles,
  User2,
  Users,
  X,
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

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = mobileOpen ? 'hidden' : original
    return () => {
      document.body.style.overflow = original
    }
  }, [mobileOpen])

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
  const initials = displayName.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()

  const SidebarContent = () => (
    <div
      className="flex h-full flex-col"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 4%) 0%, color-mix(in srgb, var(--surface) 92%, black 8%) 100%)',
      }}
    >
      <div
        className="px-5 py-5 border-b"
        style={{
          borderColor: 'color-mix(in srgb, var(--border) 86%, white 14%)',
          background: 'color-mix(in srgb, var(--surface) 94%, black 6%)',
        }}
      >
        <Logo />
      </div>

      <div
        className="mx-4 mt-4 rounded-2xl border p-4"
        style={{
          borderColor: 'color-mix(in srgb, var(--border) 88%, white 12%)',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg) 76%, var(--surface) 24%) 0%, color-mix(in srgb, var(--bg) 88%, black 12%) 100%)',
          boxShadow: '0 10px 30px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.03)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl border"
            style={{
              borderColor: 'color-mix(in srgb, var(--border) 86%, white 14%)',
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg) 78%, white 22%) 0%, color-mix(in srgb, var(--bg) 92%, black 8%) 100%)',
            }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{initials}</span>
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold" style={{ color: 'var(--t1)' }}>{displayName}</div>
            <div className="truncate text-xs" style={{ color: 'var(--t4)' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: 'var(--t4)' }}>
          Account
        </div>

        <div className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200"
                style={{
                  color: active ? 'var(--t1)' : 'var(--t2)',
                  background: active
                    ? 'linear-gradient(180deg, color-mix(in srgb, var(--bg) 72%, var(--surface) 28%) 0%, color-mix(in srgb, var(--bg) 90%, black 10%) 100%)'
                    : 'transparent',
                  border: active
                    ? '1px solid color-mix(in srgb, var(--border) 80%, white 20%)'
                    : '1px solid transparent',
                  boxShadow: active ? '0 8px 24px rgba(0,0,0,.16)' : 'none',
                }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl border transition-all"
                  style={{
                    borderColor: active
                      ? 'color-mix(in srgb, var(--acc) 24%, var(--border) 76%)'
                      : 'color-mix(in srgb, var(--border) 75%, transparent 25%)',
                    background: active ? 'color-mix(in srgb, var(--acc) 10%, transparent)' : 'transparent',
                  }}
                >
                  <Icon size={16} style={{ color: active ? 'var(--acc)' : 'var(--t4)' }} />
                </div>

                <span className="flex-1">{item.label}</span>
                <ArrowRight size={14} style={{ color: active ? 'var(--acc)' : 'transparent' }} />
              </Link>
            )
          })}

          <button
            type="button"
            onClick={openSupportChat}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200 md:hidden"
            style={{
              color: 'var(--t2)',
              background: 'transparent',
              border: '1px solid transparent',
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border"
              style={{
                borderColor: 'color-mix(in srgb, var(--border) 75%, transparent 25%)',
              }}
            >
              <Headphones size={16} style={{ color: 'var(--t4)' }} />
            </div>

            <span className="flex-1 text-left">Support chat</span>
          </button>
        </div>
      </nav>

      <div
        className="border-t p-4"
        style={{
          borderColor: 'color-mix(in srgb, var(--border) 86%, white 14%)',
          background: 'color-mix(in srgb, var(--surface) 96%, black 4%)',
        }}
      >
        <div
          className="mb-3 rounded-2xl border p-3"
          style={{
            borderColor: 'color-mix(in srgb, var(--border) 84%, white 16%)',
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg) 82%, var(--surface) 18%) 0%, color-mix(in srgb, var(--bg) 92%, black 8%) 100%)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border) 84%, white 16%)',
                  background: 'color-mix(in srgb, var(--bg) 88%, black 12%)',
                }}
              >
                <Settings2 size={16} style={{ color: 'var(--t4)' }} />
              </div>

              <div className="min-w-0">
                <div className="truncate text-xs font-semibold" style={{ color: 'var(--t1)' }}>{displayName}</div>
                <div className="truncate text-[11px]" style={{ color: 'var(--t4)' }}>Settings & theme</div>
              </div>
            </div>

            <ThemeToggle />
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all"
          style={{
            color: 'var(--t1)',
            borderColor: 'color-mix(in srgb, var(--border) 86%, white 14%)',
            background: 'color-mix(in srgb, var(--bg) 92%, black 8%)',
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <LogOut size={15} />
            Sign out
          </span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <aside
        className="hidden lg:flex w-[320px] shrink-0 border-r"
        style={{
          borderColor: 'color-mix(in srgb, var(--border) 86%, white 14%)',
          background: 'color-mix(in srgb, var(--surface) 94%, black 6%)',
          boxShadow: '12px 0 40px rgba(0,0,0,.18)',
        }}
      >
        <SidebarContent />
      </aside>

      <main className="min-w-0 flex-1">
        <div
          className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 lg:hidden"
          style={{
            borderColor: 'color-mix(in srgb, var(--border) 86%, white 14%)',
            background: 'color-mix(in srgb, var(--surface) 94%, black 6%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <Logo />

          <div className="flex items-center gap-2">
            <button
              aria-label="Open support chat"
              onClick={openSupportChat}
              className="flex h-10 w-10 items-center justify-center rounded-xl border"
              style={{
                borderColor: 'color-mix(in srgb, var(--border) 84%, white 16%)',
                background: 'color-mix(in srgb, var(--bg) 88%, black 12%)',
                color: 'var(--t2)',
              }}
            >
              <Headphones size={18} />
            </button>

            <button
              aria-label="Open dashboard menu"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border"
              style={{
                borderColor: 'color-mix(in srgb, var(--border) 84%, white 16%)',
                background: 'color-mix(in srgb, var(--bg) 88%, black 12%)',
                color: 'var(--t2)',
              }}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label="Close menu overlay"
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,.62)', backdropFilter: 'blur(6px)' }}
              onClick={() => setMobileOpen(false)}
            />

            <div
              className="absolute right-0 top-0 h-full w-[90vw] max-w-[380px] border-l"
              style={{
                borderColor: 'color-mix(in srgb, var(--border) 86%, white 14%)',
                background: 'color-mix(in srgb, var(--surface) 96%, black 4%)',
                boxShadow: '-24px 0 60px rgba(0,0,0,.35)',
              }}
            >
              <div
                className="flex items-center justify-between border-b px-4 py-4"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border) 86%, white 14%)',
                  background: 'color-mix(in srgb, var(--surface) 94%, black 6%)',
                }}
              >
                <div
                  className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: 'var(--t4)' }}
                >
                  <Sparkles size={12} />
                  Navigation
                </div>

                <button
                  aria-label="Close dashboard menu"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--border) 84%, white 16%)',
                    background: 'color-mix(in srgb, var(--bg) 88%, black 12%)',
                    color: 'var(--t2)',
                  }}
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
