"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import Logo from "@/components/ui/Logo"

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  const navLinks = [
    { name: "Platform", href: "/platform" },
    { name: "Features", href: "/features" },
    { name: "Markets", href: "/#markets" },
    { name: "Pricing", href: "/pricing" },
    { name: "Web Terminal", href: "/web-terminal" },
    { name: "Download", href: "/download" },
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

  const closeMenu = () => setIsMobileMenuOpen(false)

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full border-b anim-nav-entrance"
        style={{
          borderColor: scrolled ? "var(--border)" : "transparent",
          backgroundColor: "var(--nav-bg)",
          backdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "blur(12px)",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "blur(12px)",
          boxShadow: scrolled ? "0 1px 0 var(--border), 0 4px 24px rgba(0,0,0,.18)" : "none",
          transition: "box-shadow 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease",
        }}
      >
        <div className="mx-auto flex max-w-[1360px] items-center justify-between px-4 py-3 md:px-8">
          <Logo />

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link, i) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className="relative py-1 transition-colors"
                  style={{
                    color: isActive ? "var(--t1)" : "var(--t2)",
                    animationDelay: `${i * 40 + 80}ms`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--t1)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isActive ? "var(--t1)" : "var(--t2)"
                  }}
                >
                  {link.name}
                  {isActive && (
                    <span
                      className="absolute -bottom-1 left-0 right-0 h-px rounded-full"
                      style={{ background: "var(--acc)" }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium transition-colors"
              style={{ color: "var(--t2)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--t1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--t2)"
              }}
            >
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary px-4 py-1.5 text-xs">
              Start Free
            </Link>
          </div>

          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(true)}
            className="inline-flex items-center justify-center rounded-lg p-2 md:hidden transition-opacity hover:opacity-70"
            style={{ color: "var(--t1)" }}
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[60] md:hidden ${isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={closeMenu}
          className={`absolute inset-0 h-full w-full bg-black/50 transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute right-0 top-0 flex h-full w-[88vw] max-w-[360px] flex-col border-l shadow-2xl transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg2)",
            backdropFilter: "blur(18px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            color: "var(--t1)",
          }}
        >
          <div className="flex items-center justify-between border-b px-4 py-4" style={{ borderColor: "var(--border)" }}>
            <Logo size={28} showWordmark={false} />
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={closeMenu}
              className="inline-flex items-center justify-center rounded-lg p-2 transition-opacity hover:opacity-70"
              style={{ color: "var(--t1)" }}
            >
              <X size={22} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col px-2 py-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={closeMenu}
                  className="rounded-xl px-3 py-3 text-[15px] font-semibold transition-all"
                  style={{
                    color: isActive ? "var(--acc)" : "var(--t1)",
                    backgroundColor: isActive ? "var(--acc-d)" : "transparent",
                    border: `1px solid ${isActive ? "rgba(52,211,153,.12)" : "transparent"}`,
                  }}
                >
                  {link.name}
                </Link>
              )
            })}
          </nav>

          <div className="border-t px-4 py-4 mt-auto" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                onClick={closeMenu}
                className="rounded-lg border px-4 py-2 text-center text-sm font-medium transition-all"
                style={{
                  color: "var(--t1)",
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg3)",
                }}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={closeMenu}
                className="btn-primary flex items-center justify-center px-4 py-2 text-sm font-medium"
              >
                Start Free
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}

{/* Added Support link */}
<Link href="/support" className="text-sm font-medium">
  Support
</Link>
