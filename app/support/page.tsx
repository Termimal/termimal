"use client"

import Link from "next/link"
import PageShell from "@/components/layout/PageShell"
import { openSupportChat } from "@/components/support/SupportChatLauncher"

export default function SupportPage() {
  return (
    <PageShell title="Support">
      <div
        className="min-h-screen px-4 py-16 sm:px-6 lg:px-8"
        style={{ background: "var(--bg)", color: "var(--t1)" }}
      >
        <div className="mx-auto max-w-4xl">
          {/* Hero — primary support paths */}
          <div
            className="rounded-3xl border p-8 sm:p-10"
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
            <p
              className="mt-4 max-w-2xl text-base leading-7"
              style={{ color: "var(--t2)" }}
            >
              Use live chat for product support, billing questions, login
              problems, account access, and partnership routing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openSupportChat}
                className="rounded-2xl px-5 py-3 text-sm font-semibold"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(16,185,129,.18) 0%, rgba(31,111,235,.28) 100%)",
                  color: "#d1fae5",
                  border: "1px solid rgba(56,139,253,.16)",
                }}
              >
                Open support chat
              </button>
              <a
                href="mailto:hello@termimal.com"
                className="rounded-2xl border px-5 py-3 text-sm font-semibold"
                style={{
                  borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                  color: "var(--t1)",
                }}
              >
                Email support
              </a>
            </div>
          </div>

          {/* ── Self-serve resources ── */}
          <section className="mt-10">
            <div
              className="text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--t4)" }}
            >
              Self-serve resources
            </div>
            <h2
              className="mt-3 text-2xl font-semibold sm:text-3xl"
              style={{ letterSpacing: "-0.025em" }}
            >
              Read the docs first — most questions are answered here.
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                href="/support/guide"
                className="group rounded-2xl border p-6 transition-all"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--acc)" }}
                >
                  Knowledge base
                </div>
                <div
                  className="mt-2 text-lg font-semibold"
                  style={{ color: "var(--t1)" }}
                >
                  The Termimal guide
                </div>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: "var(--t3)" }}
                >
                  A complete walkthrough of the platform — getting started, every
                  page in the web terminal, billing, keyboard shortcuts, and
                  troubleshooting.
                </p>
                <div
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: "var(--acc)" }}
                >
                  Read the guide <span aria-hidden>→</span>
                </div>
              </Link>

              <Link
                href="/help"
                className="group rounded-2xl border p-6 transition-all"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--acc)" }}
                >
                  FAQ
                </div>
                <div
                  className="mt-2 text-lg font-semibold"
                  style={{ color: "var(--t1)" }}
                >
                  Frequently asked questions
                </div>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: "var(--t3)" }}
                >
                  Quick answers to the most common billing, security, and
                  product questions. If you&apos;re in a hurry, start here.
                </p>
                <div
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: "var(--acc)" }}
                >
                  Browse FAQ <span aria-hidden>→</span>
                </div>
              </Link>

              <Link
                href="/status"
                className="group rounded-2xl border p-6 transition-all"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--acc)" }}
                >
                  System status
                </div>
                <div
                  className="mt-2 text-lg font-semibold"
                  style={{ color: "var(--t1)" }}
                >
                  Service health
                </div>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: "var(--t3)" }}
                >
                  Live health checks for every backend endpoint — prices,
                  fundamentals, macro, polymarket, COT. If data is missing,
                  start here.
                </p>
                <div
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: "var(--acc)" }}
                >
                  View status <span aria-hidden>→</span>
                </div>
              </Link>

              <Link
                href="/security"
                className="group rounded-2xl border p-6 transition-all"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--acc)" }}
                >
                  Security
                </div>
                <div
                  className="mt-2 text-lg font-semibold"
                  style={{ color: "var(--t1)" }}
                >
                  Security &amp; compliance
                </div>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: "var(--t3)" }}
                >
                  How we store data, our 2FA setup, supported authenticators,
                  and the responsible-disclosure programme.
                </p>
                <div
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: "var(--acc)" }}
                >
                  Read policy <span aria-hidden>→</span>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  )
}
