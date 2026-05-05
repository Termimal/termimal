"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"
import Logo from "@/components/ui/Logo"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [acctOpen, setAcctOpen] = useState(false)
  const acctRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navLinks = [
    { key: "nav.platform", name: "Platform", href: "/platform" },
    { key: "nav.features", name: "Features", href: "/features" },
    { key: "nav.markets", name: "Markets", href: "/#markets" },
    { key: "nav.pricing", name: "Pricing", href: "/pricing" },
    { key: "nav.webTerminal", name: "Web Terminal", href: "/terminal" },
    { key: "nav.download", name: "Download", href: "/download" },
    { key: "nav.support", name: "Support", href: "/support" },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : original
    return () => {
      document.body.style.overflow = original
    }
  }, [isMobileMenuOpen])

  // Keep navbar in sync with the live Supabase session.
  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUser(data.user)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [supabase])

  // Close the account dropdown on click outside / Escape.
  useEffect(() => {
    if (!acctOpen) return
    const onClick = (e: MouseEvent) => {
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setAcctOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAcctOpen(false) }
    document.addEventListener("mousedown", onClick)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      window.removeEventListener("keydown", onKey)
    }
  }, [acctOpen])

  const closeMenu = () => setIsMobileMenuOpen(false)

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault()
    setAcctOpen(false)
    setIsMobileMenuOpen(false)
    try { await supabase.auth.signOut() } catch {}
    // Hard navigate so server components rerender with the cleared cookie.
    router.push("/")
    router.refresh()
  }

  // Determine if a nav link should be considered active.
  const isLinkActive = (href: string) => {
    if (href.startsWith("/#")) return pathname === "/"
    return pathname === href
  }

  // Display helpers for the signed-in state.
  const email = user?.email ?? ""
  const displayName: string =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    email.split("@")[0] ||
    "Account"
  const initials = displayName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? "")
    .join("") || "U"

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b anim-nav-entrance" style={{ borderColor: scrolled ? "var(--border)" : "transparent", backgroundColor: "var(--nav-bg)", backdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "blur(12px)", WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "blur(12px)", boxShadow: scrolled ? "0 1px 0 var(--border), 0 4px 24px rgba(0,0,0,.18)" : "none", transition: "box-shadow 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease" }}>
        <div className="mx-auto flex max-w-[1360px] items-center justify-between px-4 py-3 md:px-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link, i) => {
              const isActive = isLinkActive(link.href)
              return (
                <Link key={link.key} href={link.href} className="relative py-1 transition-colors" style={{ color: isActive ? "var(--t1)" : "var(--t2)", animationDelay: `${i * 40 + 80}ms` }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--t1)" }} onMouseLeave={(e) => { e.currentTarget.style.color = isActive ? "var(--t1)" : "var(--t2)" }}>
                  {link.name}
                  {isActive && <span className="absolute -bottom-1 left-0 right-0 h-px rounded-full" style={{ background: "var(--acc)" }} />}
                </Link>
              )
            })}
          </nav>

          {/* ── Right cluster: signed-out shows Sign in + Start Free; signed-in shows account avatar + dropdown ── */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div ref={acctRef} className="relative">
                <button
                  type="button"
                  aria-label="Open account menu"
                  aria-expanded={acctOpen}
                  onClick={() => setAcctOpen(v => !v)}
                  className="flex items-center gap-2 rounded-full border px-2 py-1 text-sm font-semibold transition-all"
                  style={{
                    borderColor: acctOpen ? "var(--acc)" : "var(--border)",
                    color: acctOpen ? "var(--t1)" : "var(--t2)",
                    backgroundColor: acctOpen ? "var(--acc-d)" : "transparent",
                  }}
                  onMouseEnter={e => { if (!acctOpen) { e.currentTarget.style.borderColor = "var(--bh)"; e.currentTarget.style.color = "var(--t1)" } }}
                  onMouseLeave={e => { if (!acctOpen) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--t2)" } }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 28, height: 28, borderRadius: 999,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: "var(--acc)", color: "#fff",
                      fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
                    }}
                  >
                    {initials}
                  </span>
                  <span className="hidden lg:inline" style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {displayName}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {acctOpen && (
                  <div
                    role="menu"
                    style={{
                      position: "absolute", top: "calc(100% + 8px)", right: 0,
                      width: 256,
                      background: "var(--bg2)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
                      overflow: "hidden",
                      zIndex: 100,
                    }}
                  >
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", lineHeight: 1.3 }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
                    </div>
                    <ul style={{ listStyle: "none", margin: 0, padding: "6px 0" }}>
                      {[
                        { href: "/terminal",            label: "Web Terminal" },
                        { href: "/dashboard/profile",   label: "Profile" },
                        { href: "/dashboard/billing",   label: "Billing & subscription" },
                        { href: "/dashboard/referrals", label: "Referrals" },
                        { href: "/pricing",             label: "Upgrade plan", accent: true },
                        { href: "/support",             label: "Help & support" },
                      ].map(item => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setAcctOpen(false)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "10px 16px",
                              fontSize: 13,
                              color: item.accent ? "var(--acc)" : "var(--t1)",
                              textDecoration: "none",
                              transition: "background-color 120ms ease-out",
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface)" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent" }}
                          >
                            <span>{item.label}</span>
                            <span style={{ color: "var(--t4)", fontSize: 16 }}>›</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <div style={{ borderTop: "1px solid var(--border)" }}>
                      <a
                        href="#"
                        onClick={handleSignOut}
                        style={{
                          display: "block",
                          padding: "12px 16px",
                          fontSize: 13, fontWeight: 500,
                          color: "var(--red)",
                          textDecoration: "none",
                          transition: "background-color 120ms ease-out",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(248,81,73,0.08)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent" }}
                      >
                        Sign out
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium transition-colors" style={{ color: "var(--t2)" }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--t1)" }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--t2)" }}>Sign in</Link>
                <Link href="/signup" className="btn-primary px-4 py-1.5 text-xs">Start Free</Link>
              </>
            )}
          </div>

          <button type="button" aria-label="Open navigation menu" aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(true)} className="inline-flex items-center justify-center rounded-lg p-2 md:hidden transition-opacity hover:opacity-70" style={{ color: "var(--t1)" }}><Menu size={24} /></button>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      <div className={`fixed inset-0 z-[60] md:hidden ${isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!isMobileMenuOpen}>
        <button type="button" aria-label="Close menu overlay" onClick={closeMenu} className={`absolute inset-0 h-full w-full bg-black/50 transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100" : "opacity-0"}`} />
        <aside className={`absolute right-0 top-0 flex h-full w-[88vw] max-w-[360px] flex-col border-l shadow-2xl transition-transform duration-300 ease-out ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`} style={{ borderColor: "var(--border)", backgroundColor: "var(--bg2)", backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,0.45)", color: "var(--t1)" }}>
          <div className="flex items-center justify-between border-b px-4 py-4" style={{ borderColor: "var(--border)" }}>
            <Logo size={28} showWordmark={false} />
            <button type="button" aria-label="Close navigation menu" onClick={closeMenu} className="inline-flex items-center justify-center rounded-lg p-2 transition-opacity hover:opacity-70" style={{ color: "var(--t1)" }}><X size={22} /></button>
          </div>

          {user && (
            <div className="flex items-center gap-3 border-b px-4 py-4" style={{ borderColor: "var(--border)" }}>
              <span
                aria-hidden
                style={{
                  width: 40, height: 40, borderRadius: 999,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: "var(--acc)", color: "#fff",
                  fontSize: 14, fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>{displayName}</div>
                <div style={{ fontSize: 12, color: "var(--t3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
              </div>
            </div>
          )}

          <nav className="flex flex-1 flex-col px-2 py-3 overflow-y-auto">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.href)
              return (
                <Link key={link.key} href={link.href} onClick={closeMenu} className="rounded-xl px-3 py-3 text-[15px] font-semibold transition-all" style={{ color: isActive ? "var(--acc)" : "var(--t1)", backgroundColor: isActive ? "var(--acc-d)" : "transparent", border: `1px solid ${isActive ? "rgba(56,139,253,.12)" : "transparent"}` }}>
                  {link.name}
                </Link>
              )
            })}

            {user && (
              <>
                <div className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t4)" }}>Account</div>
                {[
                  { href: "/dashboard/profile",   label: "Profile" },
                  { href: "/dashboard/billing",   label: "Billing & subscription" },
                  { href: "/dashboard/referrals", label: "Referrals" },
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={closeMenu} className="rounded-xl px-3 py-2.5 text-sm transition-all" style={{ color: "var(--t1)" }}>
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          <div className="border-t px-4 py-4 mt-auto" style={{ borderColor: "var(--border)" }}>
            {user ? (
              <a
                href="#"
                onClick={handleSignOut}
                className="block rounded-lg border px-4 py-2 text-center text-sm font-medium transition-all"
                style={{ color: "var(--red)", borderColor: "rgba(248,81,73,0.3)", backgroundColor: "rgba(248,81,73,0.06)" }}
              >
                Sign out
              </a>
            ) : (
              <div className="flex flex-col gap-3">
                <Link href="/login" onClick={closeMenu} className="rounded-lg border px-4 py-2 text-center text-sm font-medium transition-all" style={{ color: "var(--t1)", borderColor: "var(--border)", backgroundColor: "var(--bg3)" }}>Sign in</Link>
                <Link href="/signup" onClick={closeMenu} className="btn-primary flex items-center justify-center px-4 py-2 text-sm font-medium">Start Free</Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  )
}
