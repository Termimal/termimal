"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu on resize to desktop breakpoint
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex shrink-0 items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded" style={{ background: 'var(--acc)' }} />
            <span className="text-lg font-bold tracking-tight truncate min-w-0" style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>
              Termimal
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex md:items-center md:gap-6" aria-label="Main navigation">
          <Link href="/features" className="text-sm font-medium transition-colors" style={{ color: 'var(--t2)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--t2)')}>Features</Link>
          <Link href="/pricing" className="text-sm font-medium transition-colors" style={{ color: 'var(--t2)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--t2)')}>Pricing</Link>
          <Link href="/download" className="text-sm font-medium transition-colors" style={{ color: 'var(--t2)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--t2)')}>Download</Link>
          <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
          <Link href="/login" className="text-sm font-medium transition-colors" style={{ color: 'var(--t2)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--t2)')}>Log in</Link>
          <Link href="/signup" className="btn-primary text-sm py-2 px-4">Sign up</Link>
        </nav>

        {/* Mobile hamburger */}
        <div className="flex items-center md:hidden shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex items-center justify-center p-2 rounded-md transition-colors"
            style={{ color: 'var(--t2)' }}
          >
            {isMobileMenuOpen
              ? <X className="h-6 w-6" aria-hidden="true" />
              : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden absolute inset-x-0 top-16 z-50 overflow-y-auto"
          style={{
            background: 'var(--bg2)',
            borderBottom: '1px solid var(--border)',
            maxHeight: 'calc(100dvh - 4rem)',
          }}
        >
          <nav className="flex flex-col px-4 py-6 space-y-1" aria-label="Mobile navigation">
            <Link
              href="/features"
              className="block rounded-lg px-3 py-3 text-base font-medium transition-colors"
              style={{ color: 'var(--t1)' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="block rounded-lg px-3 py-3 text-base font-medium transition-colors"
              style={{ color: 'var(--t1)' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/download"
              className="block rounded-lg px-3 py-3 text-base font-medium transition-colors"
              style={{ color: 'var(--t1)' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Download
            </Link>

            <div className="h-px w-full my-2" style={{ background: 'var(--border)' }} />

            <Link
              href="/login"
              className="block rounded-lg px-3 py-3 text-base font-medium transition-colors"
              style={{ color: 'var(--t1)' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-primary mt-2 w-full justify-center py-3 text-base"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sign up
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
