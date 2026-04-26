"use client"

import { useEffect } from "react"
import { Crisp } from "crisp-sdk-web"
import { Headphones } from "lucide-react"

let crispConfigured = false

export function openSupportChat() {
  if (typeof window === "undefined") return

  try {
    window.$crisp = window.$crisp || []
    window.$crisp.push(["do", "chat:open"])
  } catch {}

  try {
    Crisp.chat.open()
  } catch {}
}

export default function SupportChatLauncher() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (crispConfigured) return

    crispConfigured = true
    Crisp.configure("d6ad7e7f-f6e7-4283-822b-1bad7920bfca", {
      autoload: true,
    })
  }, [])

  return (
    <div className="hidden md:block fixed bottom-5 right-5 z-[9999]">
      <button
        type="button"
        aria-label="Open support chat"
        onClick={openSupportChat}
        className="flex items-center justify-center rounded-full border transition-all duration-200 hover:scale-[1.04] active:scale-[0.98]"
        style={{
          width: 56,
          height: 56,
          borderColor: "rgba(52,211,153,.22)",
          background:
            "linear-gradient(180deg, rgba(16,185,129,.20) 0%, rgba(5,150,105,.30) 100%)",
          color: "#d1fae5",
          backdropFilter: "blur(12px)",
        }}
      >
        <Headphones size={22} strokeWidth={2} />
      </button>
    </div>
  )
}