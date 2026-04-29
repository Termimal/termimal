"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--t1)" }}>
      <div className="sticky top-0 z-40 border-b" style={{ borderColor: "var(--border)", background: "var(--nav-bg)", backdropFilter: "blur(18px)" }}>
        <div className="mx-auto flex max-w-[1360px] items-center justify-between px-4 py-3 md:px-8">
          <Link href="/" className="text-sm font-semibold transition-opacity hover:opacity-70" style={{ color: "var(--t1)" }}>← Home</Link>
          <div className="text-sm font-semibold" style={{ color: "var(--t2)" }}>{title}</div>
          <Link href="/support" className="text-sm font-semibold hover:opacity-70" style={{ color: pathname === "/support" ? "var(--acc)" : "var(--t1)" }}>Support</Link>
        </div>
      </div>
      <main>{children}</main>
    </div>
  )
}
