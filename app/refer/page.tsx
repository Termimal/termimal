"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import PageShell from "@/components/layout/PageShell"
import { createClient } from "@/lib/supabase/client"

/**
 * Refer a friend.
 *
 * Distinct from the public Affiliate Program (/affiliates) — this is
 * for existing paying customers to share Termimal with personal
 * contacts and get a free month per paid referral.
 *
 * Reward economics:
 *   - 1 free month of YOUR current plan per referred user who
 *     successfully converts to a paid subscription (i.e. completes
 *     their first paid invoice after the trial).
 *   - Cap: 12 free months per rolling 12-month period (we cap to
 *     avoid pure-referral arbitrage and keep churn predictable).
 *   - Free-tier users cannot earn referral credit (you must have
 *     an active paid subscription for credit to apply).
 *
 * Anti-abuse:
 *   - Self-referrals and referrals to household members on the same
 *     payment method are rejected.
 *   - Public posting on coupon/discount aggregator sites voids the
 *     reward.
 *   - 60-day claw-back on refund/chargeback.
 */

const STEPS = [
  {
    n: "01",
    t: "Share your link",
    b: "Send your unique link to friends, post in groups you're already in, share with a community you participate in. Personal recommendations only — no public coupon sites.",
  },
  {
    n: "02",
    t: "Friend subscribes & pays",
    b: "They sign up through your link, complete the 14-day trial, and convert to a paid plan. The first invoice clearing through Stripe is the trigger.",
  },
  {
    n: "03",
    t: "You get a free month",
    b: "Your next billing cycle is extended by one full month at your current plan's price. Automatically credited — no claiming, no waiting.",
  },
]

export default function ReferPage() {
  const [user, setUser] = useState<{ id?: string; email?: string | null } | null>(null)
  const [referralCode, setReferralCode] = useState<string>("")
  const [activePlan, setActivePlan] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({ id: user.id, email: user.email })
        const { data } = await supabase
          .from("profiles")
          .select("referral_code, plan")
          .eq("id", user.id)
          .single()
        setReferralCode(data?.referral_code ?? "")
        setActivePlan(data?.plan ?? "free")
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const referralLink = referralCode
    ? `https://www.termimal.com/signup?ref=${referralCode}`
    : ""

  const isPaid = activePlan === "pro" || activePlan === "premium"

  const copyLink = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* clipboard blocked — silently no-op */
    }
  }

  const shareLink = async () => {
    if (!referralLink) return
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: "Termimal — Trading Analysis Platform",
          text: "Trying out Termimal — figured you might like it too. Sign up here for a free month if you stay paid:",
          url: referralLink,
        })
        setShared(true)
        setTimeout(() => setShared(false), 2500)
      } catch {
        copyLink()
      }
    } else {
      copyLink()
    }
  }

  if (loading) {
    return (
      <PageShell title="Refer a friend">
        <div style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        </div>
      </PageShell>
    )
  }

  if (!user) {
    return (
      <PageShell title="Refer a friend">
        <div style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
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
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Refer a friend">
    <div style={{ background: "var(--bg)", color: "var(--t1)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-3xl px-4 py-16">

        {/* ── Hero ── */}
        <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--t4)" }}>Refer a Friend</div>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
          Share Termimal.<br />Get a free month.
        </h1>
        <p className="mt-4 text-base leading-7" style={{ color: "var(--t2)" }}>
          Personal-recommendations program for paying users. Each friend who signs up through your link <strong>and</strong> converts to a paid plan earns you one free month at your current price. Cap: 12 free months per rolling year.
        </p>

        {/* ── Free-tier CTA (if user isn't paid yet) ── */}
        {!isPaid && (
          <div className="mt-8 rounded-2xl border p-5"
            style={{
              borderColor: "rgba(240,173,78,.30)",
              background: "rgba(240,173,78,.08)",
            }}>
            <div className="text-sm font-semibold" style={{ color: "var(--amber, #d29922)" }}>You&rsquo;re on the Free plan</div>
            <p className="mt-1 text-sm leading-6" style={{ color: "var(--t2)" }}>
              You can still share your referral link, but referral credit only applies to active paying subscribers.{" "}
              <Link href="/pricing" className="link-acc">Upgrade to Pro</Link> to start earning free months.
            </p>
          </div>
        )}

        {/* ── Referral code & link ── */}
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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-0 overflow-hidden rounded-xl border px-4 py-2.5 text-xs"
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
                minHeight: 40,
              }}>
              {copied ? "Copied!" : "Copy"}
            </button>
            <button onClick={shareLink}
              disabled={!referralLink}
              className="shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all"
              style={{
                background: shared ? "rgba(16,185,129,.20)" : "linear-gradient(180deg, rgba(16,185,129,.20) 0%, rgba(31,111,235,.30) 100%)",
                color: shared ? "#388bfd" : "#d1fae5",
                border: "1px solid rgba(56,139,253,.25)",
                opacity: referralLink ? 1 : 0.4,
                minHeight: 40,
              }}>
              {shared ? "Shared!" : "Share…"}
            </button>
          </div>
        </div>

        {/* ── Steps ── */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map(s => (
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

        {/* ── Program rules ── */}
        <div className="mt-10 rounded-2xl border p-6"
          style={{
            borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
            background: "var(--surface)",
          }}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t4)" }}>Program rules</div>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--t1)" }}>How rewards work</h2>
          <ul className="space-y-3 text-xs leading-6" style={{ color: "var(--t2)" }}>
            <li>
              <strong style={{ color: "var(--t1)" }}>Paid conversions only.</strong> Reward triggers when the
              referred user&rsquo;s first paid invoice clears Stripe. Free signups, abandoned trials,
              and unpaid invoices do not earn.
            </li>
            <li>
              <strong style={{ color: "var(--t1)" }}>One free month per paid referral.</strong> Credited
              automatically to your next billing cycle at your current plan&rsquo;s price.
            </li>
            <li>
              <strong style={{ color: "var(--t1)" }}>Annual cap.</strong> Up to 12 free months per rolling
              12-month period. Excess referrals build your karma — they don&rsquo;t carry over as cash.
            </li>
            <li>
              <strong style={{ color: "var(--t1)" }}>Personal sharing only.</strong> Share with people you
              know, communities you&rsquo;re part of, or your own audience. Posting on public coupon /
              discount / deal-aggregator sites voids the reward and may pause your account from the program.
            </li>
            <li>
              <strong style={{ color: "var(--t1)" }}>No self-referrals.</strong> Referring yourself, a
              household member sharing the same payment method, or any account intended primarily to
              generate credit for yourself is grounds for forfeiture.
            </li>
            <li>
              <strong style={{ color: "var(--t1)" }}>60-day claw-back.</strong> If a referred customer refunds
              or charges back within 60 days of payment, the matching free-month credit is rescinded.
              After 60 days credits are locked.
            </li>
            <li>
              <strong style={{ color: "var(--t1)" }}>Free-tier users.</strong> You can still share your link,
              but credit only accrues while you have an active paid subscription. Upgrade to start earning.
            </li>
            <li>
              <strong style={{ color: "var(--t1)" }}>No cash value.</strong> Free-month credits cannot be
              exchanged for cash, transferred to another account, or stacked with other promotional discounts.
            </li>
            <li>
              <strong style={{ color: "var(--t1)" }}>Termimal&rsquo;s discretion.</strong> We may pause or
              void rewards for suspected abuse, fraud, or breach of these rules. Material program changes
              are announced 30 days in advance to active participants.
            </li>
            <li>
              See{" "}
              <Link className="link-acc" href="/terms#affiliates">Terms of Service §8</Link>{" "}
              for the binding legal version.
            </li>
          </ul>
        </div>
      </div>
    </div>
    </PageShell>
  )
}
