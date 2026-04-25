"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { MessageCircle, HelpCircle, CreditCard, ShieldCheck, TerminalSquare, ArrowRight, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import CrispChat from "@/components/support/CrispChat"

const faqs = [
  {
    question: "How fast do you usually reply?",
    answer: "We usually reply to support requests as quickly as possible during active hours. For billing and account access issues, we prioritize those first.",
  },
  {
    question: "Can you help with billing issues?",
    answer: "Yes. If you have a billing, subscription, refund, or checkout issue, contact us through chat and include the email on your account.",
  },
  {
    question: "Can I get help with the web terminal?",
    answer: "Yes. We can help with access issues, platform bugs, and questions related to the web terminal experience.",
  },
  {
    question: "Do you offer account security support?",
    answer: "Yes. If you think your account was accessed unexpectedly or you need help securing it, contact support immediately.",
  },
]

function FAQItem({
  question,
  answer,
}: {
  question: string
  answer: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-2xl border"
      style={{
        borderColor: "var(--border)",
        background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, black 6%) 0%, color-mix(in srgb, var(--bg) 94%, black 6%) 100%)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold" style={{ color: "var(--t1)" }}>
          {question}
        </span>
        <ChevronDown
          size={18}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--t3)" }}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 text-sm leading-6" style={{ color: "var(--t2)" }}>
          {answer}
        </div>
      )}
    </div>
  )
}

export default function SupportPage() {
  const [user, setUser] = useState<any>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setUser(user ?? null)
    }

    loadUser()
  }, [supabase])

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    null

  return (
    <>
      <CrispChat email={user?.email ?? null} name={displayName} />

      <main
        className="min-h-screen"
        style={{
          background:
            "radial-gradient(circle at top, color-mix(in srgb, var(--acc) 10%, transparent) 0%, transparent 34%), var(--bg)",
        }}
      >
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div
              className="rounded-3xl border p-6 sm:p-8"
              style={{
                borderColor: "var(--border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 4%) 0%, color-mix(in srgb, var(--bg) 95%, black 5%) 100%)",
                boxShadow: "0 20px 60px rgba(0,0,0,.18)",
              }}
            >
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--t3)",
                  background: "color-mix(in srgb, var(--surface) 80%, transparent)",
                }}
              >
                <HelpCircle size={12} />
                Support
              </div>

              <h1
                className="max-w-2xl text-3xl font-semibold sm:text-4xl"
                style={{ color: "var(--t1)", letterSpacing: "-0.03em" }}
              >
                We’re here to help with billing, access, and platform issues.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: "var(--t2)" }}>
                Use live chat for the fastest help, or browse common answers below. If you are signed in, support can identify your account faster through the chat widget.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.$crisp = window.$crisp || []
                      window.$crisp.push(["do", "chat:open"])
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-95"
                  style={{
                    background: "linear-gradient(90deg, #1f8f63 0%, #2ab07f 100%)",
                    color: "white",
                    boxShadow: "0 12px 30px rgba(25, 135, 84, .28)",
                  }}
                >
                  <MessageCircle size={18} />
                  Open live chat
                </button>

                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--t1)",
                    background: "color-mix(in srgb, var(--surface) 82%, transparent)",
                  }}
                >
                  Billing support
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: "var(--border)",
                    background: "color-mix(in srgb, var(--bg) 90%, black 10%)",
                  }}
                >
                  <CreditCard size={18} style={{ color: "var(--acc)" }} />
                  <div className="mt-3 text-sm font-semibold" style={{ color: "var(--t1)" }}>
                    Billing help
                  </div>
                  <div className="mt-1 text-sm" style={{ color: "var(--t3)" }}>
                    Subscriptions, checkout, invoices, and refunds.
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: "var(--border)",
                    background: "color-mix(in srgb, var(--bg) 90%, black 10%)",
                  }}
                >
                  <TerminalSquare size={18} style={{ color: "var(--acc)" }} />
                  <div className="mt-3 text-sm font-semibold" style={{ color: "var(--t1)" }}>
                    Product support
                  </div>
                  <div className="mt-1 text-sm" style={{ color: "var(--t3)" }}>
                    Web terminal access, bugs, and platform questions.
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: "var(--border)",
                    background: "color-mix(in srgb, var(--bg) 90%, black 10%)",
                  }}
                >
                  <ShieldCheck size={18} style={{ color: "var(--acc)" }} />
                  <div className="mt-3 text-sm font-semibold" style={{ color: "var(--t1)" }}>
                    Account security
                  </div>
                  <div className="mt-1 text-sm" style={{ color: "var(--t3)" }}>
                    Login issues, suspicious access, and account recovery.
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-3xl border p-6"
              style={{
                borderColor: "var(--border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 4%) 0%, color-mix(in srgb, var(--bg) 96%, black 4%) 100%)",
                boxShadow: "0 18px 50px rgba(0,0,0,.14)",
              }}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>
                Support details
              </div>

              <div className="mt-5 space-y-4">
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 90%, black 10%)" }}
                >
                  <div className="text-sm font-semibold" style={{ color: "var(--t1)" }}>
                    Best channel
                  </div>
                  <div className="mt-1 text-sm" style={{ color: "var(--t3)" }}>
                    Live chat via Crisp
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 90%, black 10%)" }}
                >
                  <div className="text-sm font-semibold" style={{ color: "var(--t1)" }}>
                    Good for
                  </div>
                  <div className="mt-1 text-sm" style={{ color: "var(--t3)" }}>
                    Billing issues, login help, account questions, bug reports
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 90%, black 10%)" }}
                >
                  <div className="text-sm font-semibold" style={{ color: "var(--t1)" }}>
                    Tip
                  </div>
                  <div className="mt-1 text-sm" style={{ color: "var(--t3)" }}>
                    If you are signed in, support can identify your account much faster.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="mt-8">
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>
              Frequently asked questions
            </div>

            <div className="grid gap-3">
              {faqs.map((faq) => (
                <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </section>
        </section>
      </main>
    </>
  )
}
