/**
 * PageShell — the single source of truth for "marketing-page chrome".
 *
 * Wraps a page in the full Navbar + Footer used by the home page. Use
 * it on every public marketing / legal / utility page so users keep
 * the same top navigation no matter which route they're on. The old
 * version of this component swapped Navbar for a minimal "← Home"
 * bar — which removed the entire top nav and left users with no way
 * to jump between pages without going home first. That is the UX
 * issue this rewrite fixes.
 *
 * Optional `title` prop is kept for back-compat (current call sites
 * pass it). It is no longer rendered in the chrome — page titles are
 * the page's own H1 — but consumers can pass it without a refactor.
 */

import Navbar from "@/components/layout/Navbar"
import { Footer } from "@/components/sections/Footer"

interface Props {
  /** Back-compat only — no longer rendered. Page H1 is the source of truth. */
  title?: string
  children: React.ReactNode
  /** Optionally hide the footer (e.g. on a clean utility page). */
  hideFooter?: boolean
}

export default function PageShell({ children, hideFooter }: Props) {
  return (
    <>
      <Navbar />
      <main id="main">{children}</main>
      {!hideFooter && <Footer />}
    </>
  )
}
