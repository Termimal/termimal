"use client"

import { useEffect, useMemo, useState } from "react"
import { Crisp } from "crisp-sdk-web"
import { MessageSquareMore } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

declare global {
  interface Window {
    $crisp?: any[]
  }
}

export function openSupportChat() {
  if (typeof window === "undefined") return
  window.$crisp = window.$crisp || []
  window.$crisp.push(["do", "chat:show"])
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

    const email = user?.email ?? null
    const name =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      null

    if (email) Crisp.user.setEmail(email)
    if (name) Crisp.user.setNickname(name)

    if (typeof window !== "undefined") {
      window.$crisp = window.$crisp || []
      window.$crisp.push(["do", "chat:hide"])
    }
  }, [user])

  if (!mounted) return null

  return (
    <button
      type="button"
      aria-label="Open support chat"
      onClick={openSupportChat}
      title="Support"
      className="hidden md:flex fixed bottom-5 right-5 z-[80] items-center justify-center rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(16,185,129,.28)] hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
      style={{
        width: 48,
        height: 48,
        borderColor: "rgba(52,211,153,.16)",
        background:
          "linear-gradient(180deg, rgba(16,185,129,.16) 0%, rgba(5,150,105,.26) 100%)",
        color: "#d1fae5",
        boxShadow:
          "0 10px 26px rgba(6,95,70,.22), inset 0 1px 0 rgba(255,255,255,.06)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <MessageSquareMore size={18} strokeWidth={2.1} />
    </button>
  )
}
