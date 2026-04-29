// components/common/UpgradeModalHost.tsx — single mounted modal listening to
// a window event so any component (including non-React code in the store)
// can trigger the upgrade prompt with one helper call.

import { useEffect, useState } from 'react'
import { UpgradeModal } from './UpgradeModal'
import type { Plan } from '@/lib/plan'

const EVENT_NAME = 'termimal:upgrade-modal'

export interface ShowUpgradeOptions {
  requiredPlan?: Plan
  title?: string
  reason?: string
}

/**
 * Anywhere in the app — including Zustand store actions — call:
 *   showUpgrade({ requiredPlan: 'pro', reason: '...' })
 * The mounted UpgradeModalHost catches the event and renders the modal.
 */
export function showUpgrade(opts: ShowUpgradeOptions = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ShowUpgradeOptions>(EVENT_NAME, { detail: opts }))
}

export function UpgradeModalHost() {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ShowUpgradeOptions>({})

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ShowUpgradeOptions>).detail || {}
      setOpts(detail)
      setOpen(true)
    }
    window.addEventListener(EVENT_NAME, handler as EventListener)
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener)
  }, [])

  return (
    <UpgradeModal
      open={open}
      onClose={() => setOpen(false)}
      requiredPlan={opts.requiredPlan ?? 'pro'}
      title={opts.title}
      reason={opts.reason}
    />
  )
}

export default UpgradeModalHost
