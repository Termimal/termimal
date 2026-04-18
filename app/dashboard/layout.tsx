'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ui/ThemeToggle'

const navItems = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Subscription', href: '/dashboard/billing' },
  { label: 'Downloads', href: '/dashboard/downloads' },
  { label: 'Workspaces', href: '/dashboard/workspaces' },
  { label: 'Alerts', href: '/dashboard/alerts' },
  { label: 'Referrals', href: '/dashboard/referrals' },
  { label: 'Profile & Security', href: '/dashboard/profile' },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

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
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-sm" style={{ color: 'var(--t3)' }}>Loading...</div>
      </div>
    )
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <aside className="w-56 shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 rounded-[3px] rotate-45 border" style={{ borderColor: 'var(--acc)', opacity: 0.5 }} />
              <div className="absolute inset-[2.5px] rounded-[2px] rotate-45" style={{ background: 'var(--acc)' }} />
            </div>
            <span className="text-sm font-semibold">Termimal</span>
          </Link>
        </div>

        <nav className="flex-1 p-3">
          <div className="text-[0.55rem] font-bold uppercase tracking-widest px-3 mb-2" style={{ color: 'var(--t4)' }}>Account</div>
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.78rem] font-medium transition-colors mb-0.5"
              style={{
                color: pathname === item.href ? 'var(--t1)' : 'var(--t3)',
                background: pathname === item.href ? 'var(--bg)' : 'transparent',
              }}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-semibold">{displayName}</div>
              <div className="text-[0.62rem]" style={{ color: 'var(--t4)' }}>{user?.email}</div>
            </div>
            <ThemeToggle />
          </div>
          <button onClick={handleSignOut}
            className="w-full text-xs py-2 rounded-lg font-medium transition-colors"
            style={{ color: 'var(--t3)', border: '1px solid var(--border)' }}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
