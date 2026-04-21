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
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-[#101214]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-blue-600 dark:bg-blue-500" />
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50 truncate min-w-0">
              Termimal
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex md:items-center md:gap-6">
          <Link href="/features" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">Features</Link>
          <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">Pricing</Link>
          <Link href="/download" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">Download</Link>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">Log in</Link>
          <Link href="/signup" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Sign up</Link>
        </nav>

        <div className="flex items-center md:hidden shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="inline-flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="sr-only">Open main menu</span>
            {isMobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#101214] absolute inset-x-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto px-4 py-6">
          <nav className="flex flex-col space-y-6">
            <Link href="/features" className="text-base font-medium text-gray-900 dark:text-gray-100" onClick={() => setIsMobileMenuOpen(false)}>Features</Link>
            <Link href="/pricing" className="text-base font-medium text-gray-900 dark:text-gray-100" onClick={() => setIsMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/download" className="text-base font-medium text-gray-900 dark:text-gray-100" onClick={() => setIsMobileMenuOpen(false)}>Download</Link>
            <div className="h-px w-full bg-gray-200 dark:bg-gray-800 my-4" />
            <Link href="/login" className="text-base font-medium text-gray-900 dark:text-gray-100" onClick={() => setIsMobileMenuOpen(false)}>Log in</Link>
            <Link href="/signup" className="mt-2 flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700" onClick={() => setIsMobileMenuOpen(false)}>Sign up</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
