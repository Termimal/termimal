'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu,
  X,
  ArrowRight,
  Monitor,
  Download,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { createClient } from '@/lib/supabase/client'

type NavLink = {
  name: string
  href: string
  badge?: string
}

const navLinks: NavLink[] = [
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Download', href: '/download' },
  { name: 'Web Terminal', href: '/web-terminal', badge: 'Live' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [mounted, setMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let active = true

    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (active) {
          setUser(user ?? null)
          setAuthLoading(false)
        }
      } catch {
        if (active) {
          setUser(null)
          setAuthLoading(false)
        }
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobileMenuOpen])

  const closeMenu = () => setIsMobileMenuOpen(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname?.startsWith(`${href}/`)
  }

  const isDashboardUser = useMemo(() => !!user, [user])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await supabase.auth.signOut()
      closeMenu()
      router.push('/')
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <>
      <style jsx>{`
        @keyframes tm-fade-up {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes tm-panel-in {
          from {
            opacity: 0;
            transform: translateX(26px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes tm-overlay-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .tm-mobile-overlay-enter {
          animation: tm-overlay-in 240ms ease-out;
        }

        .tm-mobile-panel-enter {
          animation: tm-panel-in 320ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .tm-stagger-item {
          opacity: 0;
          animation: tm-fade-up 420ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <header
        className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--nav-bg)',
        }}
      >
        <div className="mx-auto flex h-16 max-w-site items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-3"
            aria-label="Go to homepage"
          >
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
              <Image
                src="/logo-light.png"
                alt="Termimal logo"
                fill
                className="object-contain"
                style={{ display: 'var(--logo-light-theme-display)' }}
                priority
              />
              <Image
                src="/logo-dark.png"
                alt="Termimal logo"
                fill
                className="object-contain"
                style={{ display: 'var(--logo-dark-theme-display)' }}
                priority
              />
            </div>

            <div className="min-w-0">
              <div
                className="truncate text-base font-semibold tracking-tight sm:text-[1.02rem]"
                style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}
              >
                Termimal
              </div>
              <div
                className="hidden text-[0.78rem] sm:block"
                style={{ color: 'var(--t4)' }}
              >
                Analysis-only terminal
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const active = isActive(link.href)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'group relative inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200',
                    active && 'font-semibold'
                  )}
                  style={{
                    color: active ? 'var(--t1)' : 'var(--t2)',
                    background: active ? 'var(--surface)' : 'transparent',
                    border: active ? '1px solid var(--bh)' : '1px solid transparent',
                  }}
                >
                  <span>{link.name}</span>
                  {link.badge ? (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider"
                      style={{
                        color: 'var(--acc)',
                        background: 'var(--acc-d)',
                      }}
                    >
                      {link.badge}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />

            {!authLoading && !isDashboardUser ? (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ color: 'var(--t2)' }}
                >
                  Sign in
                </Link>
                <Link href="/signup" className="btn-primary px-4 py-2 text-[0.8125rem]">
                  Start Free
                </Link>
              </>
            ) : null}

            {!authLoading && isDashboardUser ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ color: 'var(--t2)' }}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="btn-secondary px-4 py-2 text-[0.8125rem] disabled:opacity-60"
                >
                  {signingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />

            <button
              type="button"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-panel"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-all"
              style={{
                color: 'var(--t1)',
                borderColor: isMobileMenuOpen ? 'var(--bh)' : 'var(--border)',
                background: isMobileMenuOpen ? 'var(--surface)' : 'transparent',
                boxShadow: isMobileMenuOpen ? '0 10px 30px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          'fixed inset-0 z-[60] md:hidden',
          isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={closeMenu}
          className={cn(
            'absolute inset-0 h-full w-full transition-opacity duration-300',
            isMobileMenuOpen ? 'opacity-100 tm-mobile-overlay-enter' : 'opacity-0'
          )}
          style={{
            background: 'rgba(0,0,0,0.58)',
            backdropFilter: 'blur(12px)',
          }}
        />

        <aside
          id="mobile-nav-panel"
          className={cn(
            'absolute right-0 top-0 flex h-full w-full max-w-[24rem] flex-col border-l shadow-2xl transition-transform duration-300 ease-out',
            isMobileMenuOpen
              ? 'translate-x-0 tm-mobile-panel-enter'
              : 'translate-x-full'
          )}
          style={{
            borderColor: 'var(--border)',
            background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-4"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-xl">
                <Image
                  src="/logo-light.png"
                  alt="Termimal logo"
                  fill
                  className="object-contain"
                  style={{ display: 'var(--logo-light-theme-display)' }}
                />
                <Image
                  src="/logo-dark.png"
                  alt="Termimal logo"
                  fill
                  className="object-contain"
                  style={{ display: 'var(--logo-dark-theme-display)' }}
                />
              </div>

              <div>
                <div
                  className="text-base font-semibold tracking-tight"
                  style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}
                >
                  Termimal
                </div>
                <div className="text-[0.78rem]" style={{ color: 'var(--t4)' }}>
                  Premium market analysis workspace
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border"
              style={{
                color: 'var(--t1)',
                borderColor: 'var(--border)',
                background: 'var(--surface)',
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
            <div
              className="tm-stagger-item mb-4 rounded-3xl border p-4"
              style={{
                animationDelay: '40ms',
                borderColor: 'var(--border)',
                background:
                  'linear-gradient(180deg, var(--surface) 0%, rgba(255,255,255,0.02) 100%)',
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={15} style={{ color: 'var(--acc)' }} />
                <div
                  className="text-[0.72rem] font-bold uppercase tracking-[0.16em]"
                  style={{ color: 'var(--acc)' }}
                >
                  Quick access
                </div>
              </div>

              <p className="text-sm leading-6" style={{ color: 'var(--t3)' }}>
                Open key pages, launch the web terminal, or jump straight into your workspace.
              </p>
            </div>

            <nav className="space-y-2">
              {navLinks.map((link, index) => {
                const active = isActive(link.href)

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className="tm-stagger-item group relative flex min-h-[58px] items-center justify-between overflow-hidden rounded-2xl border px-4 py-3 transition-all duration-300"
                    style={{
                      animationDelay: `${100 + index * 55}ms`,
                      color: active ? 'var(--t1)' : 'var(--t2)',
                      borderColor: active ? 'var(--bh)' : 'var(--border)',
                      background: active ? 'var(--surface)' : 'transparent',
                      boxShadow: active ? '0 10px 30px rgba(0,0,0,0.10)' : 'none',
                    }}
                  >
                    <div
                      className="absolute left-3 top-1/2 h-8 -translate-y-1/2 rounded-full transition-all duration-300"
                      style={{
                        width: active ? '6px' : '0px',
                        opacity: active ? 1 : 0,
                        background: 'var(--acc)',
                        boxShadow: active ? '0 0 18px rgba(52, 211, 153, 0.45)' : 'none',
                      }}
                    />

                    <div className="flex min-w-0 items-center gap-3 pl-1">
                      <span
                        className="inline-flex h-8 items-center rounded-full px-3 text-[0.74rem] font-bold uppercase tracking-[0.14em]"
                        style={{
                          color: active ? 'var(--acc)' : 'var(--t4)',
                          background: active ? 'var(--acc-d)' : 'var(--surface)',
                          border: `1px solid ${active ? 'rgba(52,211,153,0.18)' : 'var(--border)'}`,
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div className="min-w-0">
                        <div className="truncate text-[0.98rem] font-medium">{link.name}</div>
                        <div className="text-[0.74rem]" style={{ color: 'var(--t4)' }}>
                          {active ? 'Current page' : 'Open section'}
                        </div>
                      </div>

                      {link.badge ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider"
                          style={{
                            color: 'var(--acc)',
                            background: 'var(--acc-d)',
                          }}
                        >
                          {link.badge}
                        </span>
                      ) : null}
                    </div>

                    <div
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300"
                      style={{
                        borderColor: active ? 'rgba(52,211,153,0.2)' : 'var(--border)',
                        background: active ? 'rgba(52,211,153,0.08)' : 'transparent',
                      }}
                    >
                      <ArrowRight
                        size={16}
                        style={{ color: active ? 'var(--acc)' : 'var(--t4)' }}
                      />
                    </div>
                  </Link>
                )
              })}
            </nav>

            <div
              className="tm-stagger-item mt-5 rounded-3xl border p-4"
              style={{
                animationDelay: '360ms',
                borderColor: 'var(--border)',
                background:
                  'linear-gradient(180deg, var(--surface) 0%, rgba(255,255,255,0.015) 100%)',
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Monitor size={16} style={{ color: 'var(--acc)' }} />
                <div className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>
                  Fastest path in
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Link
                  href="/web-terminal"
                  onClick={closeMenu}
                  className="btn-primary w-full justify-center py-3 text-sm"
                >
                  Launch Web Terminal
                </Link>

                <Link
                  href="/download"
                  onClick={closeMenu}
                  className="btn-secondary w-full justify-center py-3 text-sm"
                >
                  <Download size={16} />
                  Download Desktop App
                </Link>
              </div>
            </div>
          </div>

          <div
            className="border-t px-4 pb-5 pt-4"
            style={{
              borderColor: 'var(--border)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            {!authLoading && !isDashboardUser ? (
              <div className="grid grid-cols-1 gap-3">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="tm-stagger-item btn-secondary w-full justify-center py-3 text-sm"
                  style={{ animationDelay: '420ms' }}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="tm-stagger-item btn-primary w-full justify-center py-3 text-sm"
                  style={{ animationDelay: '470ms' }}
                >
                  Start Free
                </Link>
              </div>
            ) : null}

            {!authLoading && isDashboardUser ? (
              <div className="grid grid-cols-1 gap-3">
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="tm-stagger-item btn-secondary w-full justify-center py-3 text-sm"
                  style={{ animationDelay: '420ms' }}
                >
                  Go to Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="tm-stagger-item inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-all disabled:opacity-60"
                  style={{
                    animationDelay: '470ms',
                    color: 'var(--t2)',
                    borderColor: 'var(--border)',
                    background: 'transparent',
                  }}
                >
                  <LogOut size={16} />
                  {signingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            ) : null}

            <div
              className="tm-stagger-item mt-4 text-center text-[0.78rem]"
              style={{ animationDelay: '520ms', color: 'var(--t4)' }}
            >
              {mounted ? 'Analysis only. No trade execution.' : ' '}
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
