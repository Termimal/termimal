"use client"
import Link from "next/link"
import { openSupportChat } from "@/components/support/SupportChatLauncher"

export default function ContactPage() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
      <div className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="text-sm" style={{ color: "var(--t3)" }}>← Back to Termimal</Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Contact</div>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>Get in touch.</h1>
        <p className="mt-4 text-base leading-7" style={{ color: "var(--t2)" }}>
          For product help, billing, and account issues — our support team is the fastest route. For everything else, use the relevant contact below.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border p-6"
            style={{
              borderColor: "rgba(52,211,153,.16)",
              background: "linear-gradient(180deg, rgba(16,185,129,.08) 0%, rgba(5,150,105,.14) 100%)",
            }}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#34d399" }}>Support</div>
            <p className="mb-4 text-sm leading-6" style={{ color: "var(--t2)" }}>Billing, access, account, product questions. Live chat — typically under 2 minutes.</p>
            <button onClick={openSupportChat} className="rounded-2xl px-4 py-2.5 text-sm font-semibold"
              style={{
                background: "linear-gradient(180deg, rgba(16,185,129,.20) 0%, rgba(5,150,105,.30) 100%)",
                color: "#d1fae5",
                border: "1px solid rgba(52,211,153,.18)",
              }}>
              Open support chat
            </button>
          </div>

          <div className="rounded-2xl border p-6"
            style={{
              borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
              background: "var(--surface)",
            }}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t4)" }}>Business & Partnerships</div>
            <p className="mb-4 text-sm leading-6" style={{ color: "var(--t2)" }}>Press, partnership inquiries, and enterprise deals.</p>
            <a href="mailto:hello@termimal.com" className="text-sm font-semibold" style={{ color: "var(--t1)" }}>
              hello@termimal.com
            </a>
          </div>

          <div className="rounded-2xl border p-6"
            style={{
              borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
              background: "var(--surface)",
            }}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t4)" }}>Affiliates</div>
            <p className="mb-4 text-sm leading-6" style={{ color: "var(--t2)" }}>Apply to the affiliate program and earn recurring commission.</p>
            <Link href="/affiliates" className="text-sm font-semibold" style={{ color: "var(--t1)" }}>
              View affiliate program →
            </Link>
          </div>

          <div className="rounded-2xl border p-6"
            style={{
              borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
              background: "var(--surface)",
            }}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t4)" }}>Careers</div>
            <p className="mb-4 text-sm leading-6" style={{ color: "var(--t2)" }}>Interested in joining the team? We'd love to hear from you.</p>
            <Link href="/careers" className="text-sm font-semibold" style={{ color: "var(--t1)" }}>
              View careers page →
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "var(--surface)" }}>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full" style={{ background: "#34d399" }} />
            <span className="text-xs" style={{ color: "var(--t3)" }}>All systems operational — <Link href="/status" style={{ color: "var(--t2)" }}>View status page</Link></span>
          </div>
        </div>
      </div>
    </main>
  )
}
