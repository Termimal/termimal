"use client"

import { useEffect, useRef } from "react"
import { Headphones } from "lucide-react"

const CRISP_WEBSITE_ID = "d6ad7e7f-f6e7-4283-822b-1bad7920bfca"

let crispBootPromise: Promise<void> | null = null

function bootCrisp(): Promise<void> {
  if (crispBootPromise) return crispBootPromise
  if (typeof window === "undefined") return Promise.resolve()

  crispBootPromise = import("crisp-sdk-web").then(({ Crisp }) => {
    Crisp.configure(CRISP_WEBSITE_ID, { autoload: true })
  })
  return crispBootPromise
}

export function openSupportChat() {
  if (typeof window === "undefined") return
  void bootCrisp().then(() => {
    try {
      window.$crisp = window.$crisp || []
      window.$crisp.push(["do", "chat:open"])
    } catch {}
  })
}

export default function SupportChatLauncher() {
  const armed = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const

    const arm = () => {
      if (armed.current) return
      armed.current = true
      events.forEach((e) => window.removeEventListener(e, arm))
      const idle =
        (window as any).requestIdleCallback ||
        ((cb: () => void) => setTimeout(cb, 1))
      idle(() => bootCrisp())
    }

    events.forEach((e) =>
      window.addEventListener(e, arm, { passive: true })
    )
    return () => events.forEach((e) => window.removeEventListener(e, arm))
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
