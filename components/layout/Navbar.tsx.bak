'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navLinks = [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Wall of Love', href: '/wall-of-love' },
  ]

  return (
    <header
      className="sticky top-0 z-50 w-full border-b"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
    >
      <div className="flex justify-between items-center px-4 py-3 max-w-7xl mx-auto">
        <Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-2">
          <div className="relative w-5 h-5">
            <div
              className="absolute inset-0 rounded-[2px] rotate-45 border"
              style={{ borderColor: 'var(--acc)', opacity: 0.5 }}
            />
            <div
              className="absolute inset-[2px] rounded-[1px] rotate-45"
              style={{ background: 'var(--acc)' }}
            />
          </div>
          Termimal
        </Link>

        <nav className="hidden md:flex gap-6 items-center text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="hover:text-white transition-colors"
              style={{ color: 'var(--t2)' }}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium hover:text-white transition-colors"
            style={{ color: 'var(--t2)' }}
          >
            Log in
          </Link>
          <Link href="/signup" className="btn-primary py-1.5 px-4 text-xs">
            Start Free
          </Link>
        </div>

        <button
          className="md:hidden p-1"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Menu"
          type="button"
        >
          {isMobileMenuOpen ? (
            <X size={24} style={{ color: 'var(--t1)' }} />
          ) : (
            <Menu size={24} style={{ color: 'var(--t1)' }} />
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div
          className="md:hidden border-t px-4 py-4 space-y-4"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <nav className="flex flex-col gap-4 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block hover:text-white transition-colors"
                style={{ color: 'var(--t2)' }}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div
            className="flex flex-col gap-3 pt-4 border-t mt-4"
            style={{ borderColor: 'var(--border)' }}
          >
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-center py-2 text-sm font-medium rounded-lg border transition-colors"
              style={{
                color: 'var(--t1)',
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg)',
              }}
            >
              Log in
            </Link>

            <Link
              href="/signup"
              onClick={() => setIsMobileMenuOpen(false)}
              className="btn-primary py-2 text-center text-sm font-medium flex items-center justify-center"
            >
              Start Free
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
