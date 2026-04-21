'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navLinks = [
    { name: 'Platform', href: '/platform' },
    { name: 'Features', href: '/features' },
    { name: 'Markets', href: '/markets' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Web Terminal', href: '/web-terminal' },
    { name: 'Download', href: '/download' },
  ]

  useEffect(() => {
    const original = document.body.style.overflow
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = original
    }
    return () => {
      document.body.style.overflow = original
    }
  }, [isMobileMenuOpen])

  const closeMenu = () => setIsMobileMenuOpen(false)

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <div className="relative h-5 w-5">
              <div
                className="absolute inset-0 rotate-45 rounded-[2px] border"
                style={{ borderColor: 'var(--acc)', opacity: 0.5 }}
              />
              <div
                className="absolute inset-[2px] rotate-45 rounded-[1px]"
                style={{ background: 'var(--acc)' }}
              />
            </div>
            Termimal
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="transition-colors hover:text-white"
                style={{ color: 'var(--t2)' }}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="text-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--t2)' }}
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
            style={{ color: 'var(--t1)' }}
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[60] md:hidden ${isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={closeMenu}
          className={`absolute inset-0 h-full w-full bg-black/50 transition-opacity duration-300 ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <aside
          className={`absolute right-0 top-0 flex h-full w-[88vw] max-w-[360px] flex-col border-l shadow-2xl transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--t1)',
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-4"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 text-base font-bold tracking-tight">
              <div className="relative h-5 w-5">
                <div
                  className="absolute inset-0 rotate-45 rounded-[2px] border"
                  style={{ borderColor: 'var(--acc)', opacity: 0.5 }}
                />
                <div
                  className="absolute inset-[2px] rotate-45 rounded-[1px]"
                  style={{ background: 'var(--acc)' }}
                />
              </div>
              Termimal
            </div>

            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={closeMenu}
              className="inline-flex items-center justify-center rounded-lg p-2"
              style={{ color: 'var(--t1)' }}
            >
              <X size={22} />
            </button>
          </div>

          <div
            className="border-b px-4 py-4"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                onClick={closeMenu}
                className="rounded-lg border px-4 py-2 text-center text-sm font-medium transition-colors"
                style={{
                  color: 'var(--t1)',
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--bg)',
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

          <nav className="flex flex-1 flex-col px-2 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={closeMenu}
                className="rounded-xl px-3 py-3 text-[15px] font-medium transition-colors hover:bg-white/5"
                style={{ color: 'var(--t2)' }}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </>
  )
}
