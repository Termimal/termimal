"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Headphones, X, Send, Loader2, RotateCcw, Mail } from "lucide-react"

type Msg = { role: "user" | "assistant"; content: string }

const STORAGE_KEY = "termimal-chat-history"
const OPEN_EVENT = "termimal:open-support-chat"
const MAX_HISTORY = 30

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi, I'm Termi 👋 — Termimal's support assistant. Ask me about plans, features, supported markets, your account, or anything else. How can I help?",
}

const SUGGESTIONS = [
  "What plans do you offer?",
  "Is Termimal a broker?",
  "Which markets are covered?",
  "How do I cancel?",
  "Talk to a human",
]

export function openSupportChat() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(OPEN_EVENT))
}

function loadHistory(): Msg[] {
  if (typeof window === "undefined") return [GREETING]
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return [GREETING]
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(-MAX_HISTORY)
  } catch {}
  return [GREETING]
}

function saveHistory(messages: Msg[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)))
  } catch {}
}

export default function SupportChatLauncher() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    setMessages(loadHistory())
  }, [])

  useEffect(() => {
    if (mounted) saveHistory(messages)
  }, [messages, mounted])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, open])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false)
    }
    function onOpen() {
      setOpen(true)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [open])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return
      setError(null)
      const next: Msg[] = [...messages, { role: "user", content: trimmed }]
      setMessages(next)
      setInput("")
      setLoading(true)
      try {
        const payload = next.filter((m) => m !== GREETING).slice(-12)
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payload }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const reply: string =
          data?.reply || "Sorry, I couldn't reach the assistant. Please email support@termimal.com."
        setMessages((prev) => [...prev, { role: "assistant", content: reply }])
      } catch {
        setError("Connection issue. You can also email support@termimal.com.")
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I'm having trouble connecting right now. You can email us at support@termimal.com and we'll get back to you quickly.",
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [messages, loading]
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send(input)
  }

  function clearChat() {
    setMessages([GREETING])
    setError(null)
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY)
  }

  const showSuggestions = messages.length <= 1 && !loading

  return (
    <>
      <div className="hidden md:block fixed bottom-5 right-5 z-[9999]">
        <button
          type="button"
          aria-label={open ? "Close support chat" : "Open support chat"}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-center rounded-full border transition-all duration-200 hover:scale-[1.04] active:scale-[0.98]"
          style={{
            width: 56,
            height: 56,
            borderColor: "rgba(56,139,253,.22)",
            background:
              "linear-gradient(180deg, rgba(16,185,129,.20) 0%, rgba(31,111,235,.30) 100%)",
            color: "#d1fae5",
            backdropFilter: "blur(12px)",
          }}
        >
          {open ? <X size={22} strokeWidth={2} /> : <Headphones size={22} strokeWidth={2} />}
        </button>
      </div>

      <div
        className={`fixed bottom-24 right-5 z-[9999] w-[min(380px,calc(100vw-2.5rem))] origin-bottom-right transition-all duration-200 ${
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div
          className="flex h-[min(580px,calc(100vh-8rem))] flex-col overflow-hidden rounded-2xl shadow-2xl"
          style={{
            background: "rgba(13, 17, 23, 0.96)",
            border: "1px solid rgba(56,139,253,.18)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: "rgba(16,185,129,.16)", color: "#34d399" }}
                >
                  <Headphones size={17} />
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                  style={{ background: "#34d399", boxShadow: "0 0 0 2px rgba(13,17,23,0.96)" }}
                />
              </div>
              <div>
                <div className="text-[0.88rem] font-semibold text-white">Termi</div>
                <div className="text-[0.7rem]" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Termimal Support · Online
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Clear conversation"
                onClick={clearChat}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.55)" }}
                title="Clear conversation"
              >
                <RotateCcw size={14} />
              </button>
              <a
                href="mailto:support@termimal.com"
                aria-label="Email support"
                className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.55)" }}
                title="Email support"
              >
                <Mail size={14} />
              </a>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[0.82rem] leading-relaxed"
                  style={
                    m.role === "user"
                      ? { background: "rgba(31,111,235,0.55)", color: "#fff" }
                      : {
                          background: "rgba(255,255,255,0.04)",
                          color: "rgba(255,255,255,0.92)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[0.82rem]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  Termi is typing…
                </div>
              </div>
            )}

            {showSuggestions && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full px-3 py-1.5 text-[0.72rem] transition-colors hover:bg-white/5"
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.78)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div
              className="px-4 py-2 text-[0.72rem]"
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "#fca5a5",
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Termimal…"
              maxLength={2000}
              disabled={loading}
              className="flex-1 rounded-xl px-3 py-2 text-[0.82rem] outline-none disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.92)",
              }}
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all disabled:opacity-40"
              style={{
                background:
                  "linear-gradient(180deg, rgba(16,185,129,.30) 0%, rgba(31,111,235,.50) 100%)",
                color: "#fff",
              }}
            >
              <Send size={15} />
            </button>
          </form>

          <div
            className="px-4 py-2 text-center text-[0.65rem]"
            style={{
              color: "rgba(255,255,255,0.4)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            AI-assisted support · For account issues, email support@termimal.com
          </div>
        </div>
      </div>
    </>
  )
}
