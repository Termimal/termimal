"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu, X } from "lucide-react"

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navLinks = [
    { name: "Platform", href: "/platform" },
    { name: "Features", href: "/features" },
    { name: "Markets", href: "/markets" },
    { name: "Pricing", href: "/pricing" },
    { name: "Web Terminal", href: "/web-terminal" },
    { name: "Download", href: "/download" },
  ]

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
        className="sticky top-0 z-50 w-full border-b"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--nav-bg)" }}
      >
        <div className="mx-auto flex max-w-[1360px] items-center justify-between px-4 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/logo-dark.png"
              alt="Termimal Logo"
              width={32}
              height={32}
              className="object-contain"
              style={{ display: "var(--logo-light-theme-display)" as React.CSSProperties["display"] }}
            />
            <Image
              src="/logo-light.png"
              alt="Termimal Logo"
              width={32}
              height={32}
              className="object-contain"
              style={{ display: "var(--logo-dark-theme-display)" as React.CSSProperties["display"] }}
            />
            <span
              className="text-sm font-bold"
              style={{ letterSpacing: "-0.02em", color: "var(--t1)" }}
            >
              Termimal
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="transition-colors hover:text-white"
                style={{ color: "var(--t2)" }}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium transition-colors hover:text-white"
              style={{ color: "var(--t2)" }}
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
            className="inline-flex items-center justify-center rounded-lg p-2 md:hidden"
            style={{ color: "var(--t1)" }}
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[60] md:hidden ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
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
            backgroundColor: "var(--surface)",
            color: "var(--t1)",
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-4"
            style={{ borderColor: "var(--border)" }}
          >
            <Link href="/" className="flex items-center gap-2.5" onClick={closeMenu}>
              <Image
                src="/logo-dark.png"
                alt="Termimal Logo"
                width={28}
                height={28}
                className="object-contain"
                style={{ display: "var(--logo-light-theme-display)" as React.CSSProperties["display"] }}
              />
              <Image
                src="/logo-light.png"
                alt="Termimal Logo"
                width={28}
                height={28}
                className="object-contain"
                style={{ display: "var(--logo-dark-theme-display)" as React.CSSProperties["display"] }}
              />
              <span className="text-base font-bold" style={{ letterSpacing: "-0.02em" }}>
                Termimal
              </span>
            </Link>

            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={closeMenu}
              className="inline-flex items-center justify-center rounded-lg p-2"
              style={{ color: "var(--t1)" }}
            >
              <X size={22} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col px-2 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={closeMenu}
                className="rounded-xl px-3 py-3 text-[15px] font-medium transition-colors hover:bg-white/5"
                style={{ color: "var(--t2)" }}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div
            className="border-t px-4 py-4"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                onClick={closeMenu}
                className="rounded-lg border px-4 py-2 text-center text-sm font-medium transition-colors"
                style={{
                  color: "var(--t1)",
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg)",
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
