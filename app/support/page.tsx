"use client"

import Link from "next/link"

declare global {
  interface Window {
    $crisp?: any[]
  }
}

function openSupportChat() {
  if (typeof window === "undefined") return
  window.$crisp = window.$crisp || []
  window.$crisp.push(["do", "chat:show"])
  window.$crisp.push(["do", "chat:open"])
  setTimeout(() => {
    window.$crisp?.push(["do", "chat:hide"])
  }, 250)
}

export default function SupportPage() {
  return (
    <main
      className="min-h-screen px-4 py-16 sm:px-6 lg:px-8"
      style={{ background: "var(--bg)", color: "var(--t1)" }}
    >
      <div className="mx-auto max-w-3xl">
        <div
          className="rounded-3xl border p-8"
          style={{
            borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 4%) 0%, color-mix(in srgb, var(--bg) 94%, black 6%) 100%)",
            boxShadow: "0 20px 60px rgba(0,0,0,.18)",
          }}
        >
          <div
            className="text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--t4)" }}
          >
            Support
          </div>

          <h1
            className="mt-3 text-3xl font-semibold sm:text-4xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            Need help with billing, access, or your account?
          </h1>

          <p className="mt-4 text-base leading-7" style={{ color: "var(--t2)" }}>
            Use support chat for billing, access, account, and product issues.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openSupportChat}
              className="rounded-2xl px-5 py-3 text-sm font-semibold"
              style={{
                background:
                  "linear-gradient(180deg, rgba(16,185,129,.18) 0%, rgba(5,150,105,.28) 100%)",
                color: "#d1fae5",
                border: "1px solid rgba(52,211,153,.16)",
              }}
            >
              Open support chat
            </button>

            <Link
              href="/contact"
              className="rounded-2xl border px-5 py-3 text-sm font-semibold"
              style={{
                borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                color: "var(--t1)",
              }}
            >
              Contact page
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
