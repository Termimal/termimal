"use client"

import { useEffect, useMemo, useState } from "react"
import { Crisp } from "crisp-sdk-web"
import { createClient } from "@/lib/supabase/client"

declare global {
  interface Window {
    $crisp?: any[]
  }
}

export function openSupportChat() {
  if (typeof window === "undefined") return
  window.$crisp = window.$crisp || []
  window.$crisp.push(["do", "chat:open"])
}

export default function SupportChatLauncher() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setUser(user ?? null)
    }

    loadUser()
  }, [supabase])

  useEffect(() => {
    Crisp.configure("d6ad7e7f-f6e7-4283-822b-1bad7920bfca")

    Crisp.setHideOnMobile(true)
    Crisp.chat.show()

    const email = user?.email ?? null
    const name =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      null

    if (email) {
      Crisp.user.setEmail(email)
    }

    if (name) {
      Crisp.user.setNickname(name)
    }
  }, [user])

  if (!mounted) return null

  return (
    <button
      type="button"
      aria-label="Open support chat"
      onClick={openSupportChat}
      className="hidden md:flex fixed bottom-5 right-5 z-[80] items-center justify-center rounded-full border shadow-2xl transition-all hover:scale-[1.03] hover:opacity-95"
      style={{
        width: 56,
        height: 56,
        borderColor: "color-mix(in srgb, var(--border) 84%, white 16%)",
        background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 4%) 0%, color-mix(in srgb, var(--bg) 92%, black 8%) 100%)",
        color: "var(--t1)",
        boxShadow: "0 18px 40px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.05)",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
      </svg>
    </button>
  )
}
