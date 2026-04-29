"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function ReferPage() {
  const [user, setUser] = useState<any>(null)
  const [referralCode, setReferralCode] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase
          .from("profiles")
          .select("referral_code")
          .eq("id", user.id)
          .single()
        setReferralCode(data?.referral_code ?? "")
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const referralLink = referralCode
    ? `https://www.termimal.com/signup?ref=${referralCode}`
    : ""

  const copyLink = async () => {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return (
      <main style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
        <div className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <Link href="/" className="text-sm" style={{ color: "var(--t3)" }}>← Back to Termimal</Link>
        </div>
        <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgba(16,185,129,.10)", border: "2px solid rgba(56,139,253,.20)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#388bfd" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h1 className="text-2xl font-semibold" style={{ letterSpacing: "-0.03em" }}>Sign in to refer friends</h1>
          <p className="mt-3 max-w-sm text-sm leading-7" style={{ color: "var(--t2)" }}>
            Your referral link is tied to your account. Sign in to access your unique code and start earning free months.
          </p>
          <Link href="/login" className="mt-8 rounded-2xl px-6 py-3 text-sm font-semibold"
            style={{
              background: "linear-gradient(180deg, rgba(16,185,129,.20) 0%, rgba(31,111,235,.30) 100%)",
              color: "#d1fae5",
              border: "1px solid rgba(56,139,253,.18)",
            }}>
            Sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
      <div className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
        <Link href="/dashboard" className="text-sm" style={{ color: "var(--t3)" }}>← Back to dashboard</Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Refer a Friend</div>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
          Share Termimal.<br />Get a free month.
        </h1>
        <p className="mt-4 text-base leading-7" style={{ color: "var(--t2)" }}>
          For every friend who subscribes to a paid plan through your referral link, you receive one month of your current plan free. No cap on referrals.
        </p>

        <div className="mt-10 rounded-2xl border p-6"
          style={{
            borderColor: "rgba(56,139,253,.18)",
            background: "linear-gradient(180deg, rgba(16,185,129,.07) 0%, rgba(31,111,235,.12) 100%)",
          }}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t4)" }}>Your referral code</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="rounded-xl border px-4 py-2 font-mono text-xl font-bold tracking-widest"
              style={{
                background: "var(--surface)",
                borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                letterSpacing: "0.15em",
              }}>
              {referralCode || "—"}
            </div>
          </div>

          <div className="mt-5 mb-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t4)" }}>Your referral link</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 overflow-hidden rounded-xl border px-4 py-2.5 text-xs"
              style={{
                background: "var(--surface)",
                borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                color: "var(--t2)",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
              {referralLink || "Loading…"}
            </div>
            <button onClick={copyLink}
              disabled={!referralLink}
              className="shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all"
              style={{
                background: copied ? "rgba(16,185,129,.20)" : "var(--surface)",
                color: copied ? "#388bfd" : "var(--t1)",
                border: `1px solid ${copied ? "rgba(56,139,253,.25)" : "color-mix(in srgb, var(--border) 84%, white 16%)"}`,
                opacity: referralLink ? 1 : 0.4,
              }}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { n: "01", t: "Share your link", b: "Send your unique link to friends, share it on social, or add it to your bio." },
            { n: "02", t: "Friend subscribes", b: "Your friend signs up and activates any paid plan through your link." },
            { n: "03", t: "You get a free month", b: "Your next billing cycle is extended by one full month. Automatically. No claiming needed." },
          ].map(s => (
            <div key={s.n} className="rounded-2xl border p-5"
              style={{
                borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
                background: "var(--surface)",
              }}>
              <div className="mb-2 text-xl font-bold" style={{ color: "rgba(56,139,253,.40)" }}>{s.n}</div>
              <div className="mb-1 text-sm font-semibold">{s.t}</div>
              <p className="text-xs leading-6" style={{ color: "var(--t3)" }}>{s.b}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border p-6"
          style={{
            borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
            background: "var(--surface)",
          }}>
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t4)" }}>Campaign Terms</div>
          <ul className="space-y-2 text-xs leading-6" style={{ color: "var(--t3)" }}>
            <li>· Your referral link is unique to your account and cannot be transferred.</li>
            <li>· Reward is issued once the referred friend completes their first paid month.</li>
            <li>· Self-referrals and duplicate accounts are not eligible.</li>
            <li>· Free month credit is applied to your next renewal automatically.</li>
            <li>· There is no cap — you can refer as many friends as you like.</li>
            <li>· Termimal reserves the right to void rewards for suspected abuse or fraud.</li>
            <li>· Campaign terms may be updated with 30 days notice to active participants.</li>
            <li>· Credit has no cash value and cannot be combined with other promotional discounts.</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
