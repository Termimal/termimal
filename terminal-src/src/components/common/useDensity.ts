// components/common/useDensity.ts
// Beginner / Pro density toggle.
// STATUS: dormant. The toggle was removed from the Navbar (per user request)
// but this file is intentionally kept on disk so the feature can be re-enabled
// later without a rewrite. Currently has zero imports.

import { useEffect, useState } from 'react'

export type Density = 'beginner' | 'pro'

const STORAGE_KEY = 'termimal:density'
const CHANGE_EVT  = 'termimal:density:changed'

function read(): Density {
  if (typeof window === 'undefined') return 'pro'
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === 'beginner' || v === 'pro' ? v : 'pro'
}

export function setDensity(next: Density) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
    window.dispatchEvent(new CustomEvent(CHANGE_EVT, { detail: next }))
  } catch {}
}

export function useDensity(): [Density, (next: Density) => void] {
  const [d, setD] = useState<Density>(() => read())
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Density>).detail
      if (detail) setD(detail)
    }
    window.addEventListener(CHANGE_EVT, handler as EventListener)
    return () => window.removeEventListener(CHANGE_EVT, handler as EventListener)
  }, [])
  return [d, setDensity]
}
