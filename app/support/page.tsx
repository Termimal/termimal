"use client"

import Link from "next/link"
import { openSupportChat } from "@/components/support/SupportChatLauncher"

export default function SupportPage() {
  return (
    <main className="min-h-screen px-4 py-16 sm:px-6 lg:px-8" style={{ background: "var(--bg)", color: "var(--t1)" }}>
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border p-8 sm:p-10" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 4%) 0%, color-mix(in srgb, var(--bg) 94%, black 6%) 100%)", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
          <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Support</div>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>Need help with billing, access, or your account?</h1>
          <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: "var(--t2)" }}>Use live chat for product support, billing questions, login problems, account access, and partnership routing.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={openSupportChat} className="rounded-2xl px-5 py-3 text-sm font-semibold" style={{ background: "linear-gradient(180deg, rgba(16,185,129,.18) 0%, rgba(5,150,105,.28) 100%)", color: "#d1fae5", border: "1px solid rgba(52,211,153,.16)" }}>Open support chat</button>
            <a href="mailto:hello@termimal.com" className="rounded-2xl border px-5 py-3 text-sm font-semibold" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", color: "var(--t1)" }}>Email support</a>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border p-6" style={{ borderColor: "rgba(52,211,153,.16)", background: "linear-gradient(180deg, rgba(16,185,129,.08) 0%, rgba(5,150,105,.14) 100%)" }}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#34d399" }}>Fast support</div>
              <p className="text-sm leading-6" style={{ color: "var(--t2)" }}>Billing, access, account, product questions, and general help go here first.</p>
            </section>
            <section className="rounded-2xl border p-6" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)" }}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t4)" }}>Status</div>
              <p className="text-sm leading-6" style={{ color: "var(--t2)" }}>Everything is running normally. No reported issues.</p>
              <div className="mt-4"><Link href="/status" className="text-sm font-semibold" style={{ color: "var(--t1)" }}>View status page →</Link></div>
            </section>
            <section className="rounded-2xl border p-6" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)" }}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t4)" }}>Careers</div>
              <p className="text-sm leading-6" style={{ color: "var(--t2)" }}>We do not have open roles at the moment. Send your CV to careers@termimal.com.</p>
              <div className="mt-4"><a href="mailto:careers@termimal.com" className="text-sm font-semibold" style={{ color: "var(--t1)" }}>careers@termimal.com</a></div>
            </section>
            <section className="rounded-2xl border p-6" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)" }}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t4)" }}>Affiliates</div>
              <p className="text-sm leading-6" style={{ color: "var(--t2)" }}>Apply to the affiliate program and earn recurring commission.</p>
              <div className="mt-4"><Link href="/affiliates" className="text-sm font-semibold" style={{ color: "var(--t1)" }}>View affiliate program →</Link></div>
            </section>
          </div>
          <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)" }}>
            <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full" style={{ background: "#34d399" }} /><span className="text-xs" style={{ color: "var(--t3)" }}>All systems operational — <Link href="/status" style={{ color: "var(--t2)" }}>View status page</Link></span></div>
          </div>
        </div>
      </div>
    </main>
  )
}
