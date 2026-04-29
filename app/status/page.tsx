"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

const SERVICES = [
  { name: "Web Terminal",       latency: "42ms",  uptime: "99.98%" },
  { name: "Market Data Feed",   latency: "18ms",  uptime: "99.97%" },
  { name: "Authentication",     latency: "23ms",  uptime: "100%" },
  { name: "Charting Engine",    latency: "31ms",  uptime: "99.99%" },
  { name: "Alert System",       latency: "67ms",  uptime: "99.95%" },
  { name: "API Gateway",        latency: "29ms",  uptime: "99.98%" },
  { name: "Desktop App Sync",   latency: "54ms",  uptime: "99.96%" },
  { name: "Watchlist Service",  latency: "15ms",  uptime: "99.99%" },
]

export default function StatusPage() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const fmt = () => setTime(new Date().toUTCString().slice(17, 25) + " UTC")
    fmt()
    const t = setInterval(fmt, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <main style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
      <div className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="text-sm" style={{ color: "var(--t3)" }}>← Back to Termimal</Link>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-14 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "rgba(16,185,129,.10)", border: "2px solid rgba(56,139,253,.22)" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#388bfd" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h1 className="text-3xl font-semibold" style={{ letterSpacing: "-0.03em" }}>All Systems Operational</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--t3)" }}>
            Last checked: {time || "—"} · No incidents reported
          </p>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border"
          style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)" }}>
          <div className="border-b px-6 py-4"
            style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)" }}>
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t3)" }}>Service Status</span>
          </div>
          {SERVICES.map((s, i) => (
            <div key={s.name} className="flex items-center justify-between border-b px-6 py-4 last:border-b-0"
              style={{
                borderColor: "color-mix(in srgb, var(--border) 50%, transparent 50%)",
                background: i % 2 === 0 ? "var(--bg)" : "color-mix(in srgb, var(--surface) 60%, var(--bg) 40%)"
              }}>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full" style={{ background: "#388bfd", boxShadow: "0 0 6px rgba(56,139,253,.6)" }} />
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              <div className="flex items-center gap-5">
                <span className="hidden text-xs sm:block" style={{ color: "var(--t3)" }}>{s.latency}</span>
                <span className="hidden text-xs sm:block" style={{ color: "var(--t3)" }}>{s.uptime} uptime</span>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: "rgba(16,185,129,.12)", color: "#388bfd" }}>Operational</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8 rounded-2xl border p-6"
          style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)" }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">90-Day Uptime</span>
            <span className="text-xs" style={{ color: "var(--t3)" }}>99.97% avg</span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 90 }, (_, i) => (
              <div key={i} className="flex-1 rounded-[2px]"
                style={{ height: 28, background: "rgba(56,139,253,.40)" }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs" style={{ color: "var(--t4)" }}>
            <span>90 days ago</span><span>Today</span>
          </div>
        </div>

        <div className="rounded-2xl border p-6"
          style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)" }}>
          <span className="text-sm font-semibold">Incident History</span>
          <div className="mt-6 flex flex-col items-center py-6 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "rgba(16,185,129,.10)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#388bfd" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <p className="text-sm font-medium">No incidents in the last 90 days</p>
            <p className="mt-1 text-xs" style={{ color: "var(--t3)" }}>All systems have been running smoothly.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
