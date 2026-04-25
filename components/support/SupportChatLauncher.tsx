"use client"

import { useEffect, useMemo, useState } from "react"
import { Crisp } from "crisp-sdk-web"
import { Headphones } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

declare global {
  interface Window {
    $crisp?: any[]
    CRISP_READY_TRIGGER?: () => void
  }
}

let crispConfigured = false

function callCrisp(action: string) {
  window.$crisp = window.$crisp || []
  window.$crisp.push(["do", action])
}

export function openSupportChat() {
  if (typeof window === "undefined") return
  try {
    Crisp.chat.show()
  } catch {
    callCrisp("chat:show")
  }
  try {
    Crisp.chat.open()
  } catch {
    callCrisp("chat:open")
  }
}

export default function SupportChatLauncher() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [crispReady, setCrispReady] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user ?? null)
    }
    loadUser()
  }, [supabase])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (crispConfigured) return
    crispConfigured = true
    window.$crisp = window.$crisp || []
    window.CRISP_READY_TRIGGER = () => {
      setCrispReady(true)
      try {
        Crisp.chat.hide()
      } catch {
        callCrisp("chat:hide")
      }
    }
    Crisp.configure("d6ad7e7f-f6e7-4283-822b-1bad7920bfca", { autoload: true })
  }, [])

  useEffect(() => {
    if (!crispReady || !user) return
    const email = user?.email ?? null
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || null
    if (email) Crisp.user.setEmail(email)
    if (name) Crisp.user.setNickname(name)
  }, [crispReady, user])

  useEffect(() => {
    if (!crispReady) return
    try {
      Crisp.chat.onChatOpened(() => {
        try { Crisp.chat.show() } catch { callCrisp("chat:show") }
      })
      Crisp.chat.onChatClosed(() => {
        try { Crisp.chat.hide() } catch { callCrisp("chat:hide") }
      })
    } catch {}
  }, [crispReady])

  if (!mounted) return null

  return (
    <div className="hidden md:block fixed bottom-5 right-5 z-[80] group">
      <style jsx global>{`
        .crisp-client .cc-tlyw,
        .crisp-client [class*="launcher"],
        .crisp-client [class*="Crisp"],
        iframe[src*="crisp"],
        .crisp-client iframe {
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      `}</style>
      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-[-72px] whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold opacity-0 transition-all duration-200 group-hover:opacity-100" style={{ borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)", background: "color-mix(in srgb, var(--surface) 96%, black 4%)", color: "var(--t1)", boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>Support</div>
      <button
        type="button"
        aria-label="Open support chat"
        data-i18n-key="nav.support"
        onClick={openSupportChat}
        className="flex items-center justify-center rounded-full border transition-all duration-200 hover:scale-[1.04] active:scale-[0.98]"
        style={{
          width: 56,
          height: 56,
          borderColor: "rgba(52,211,153,.22)",
          background: "linear-gradient(180deg, rgba(16,185,129,.20) 0%, rgba(5,150,105,.30) 100%)",
          color: "#d1fae5",
          boxShadow: "0 16px 38px rgba(6, 95, 70, .34), inset 0 1px 0 rgba(255,255,255,.06), 0 0 0 1px rgba(16,185,129,.08)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <Headphones size={22} strokeWidth={2} />
      </button>
    </div>
  )
}
