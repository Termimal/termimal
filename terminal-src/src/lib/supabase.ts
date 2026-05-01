// lib/supabase.ts — single shared Supabase client.
//
// CRITICAL: this client must read and write the same session storage as the
// marketing site (`lib/supabase/client.ts` at the project root). Both apps
// run on the same origin in production (`/` and `/terminal/...`), so we use
// @supabase/ssr's createBrowserClient which stores the session in cookies.
// This is the ONLY way auth state stays in sync between the two surfaces:
// log in on the marketing site → cookie set → terminal reads the same cookie
// → instant signed-in state.
//
// `@supabase/ssr` derives the cookie name from the project ref in the URL
// (e.g. https://kqmgxnxvmahnvrmizfzr.supabase.co → sb-kqmgxnxvmahnvrmizfzr-
// auth-token). The marketing site and the SPA MUST use the same URL or
// they'll write to two different cookies and never see each other.
//
// In dev, this comes from terminal-src/.env.local via Vite's
// import.meta.env. In production, the SPA is built locally (not on
// Cloudflare) and the Vite env vars are NOT inlined unless terminal-src
// has its own .env.local — historically this was forgotten, baking the
// `'https://invalid.supabase.co'` fallback into the bundle and breaking
// auth. The PRODUCTION_* constants below are the safety net: same
// Supabase project as NEXT_PUBLIC_SUPABASE_URL on the marketing side,
// hardcoded so a build without env vars still produces a working SPA.
//
// Both values are PUBLIC — the anon key is by design embedded in every
// browser SPA that uses Supabase. Database access is gated by Row Level
// Security policies, not by hiding this key.

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Production fallback — must match `.env.local` NEXT_PUBLIC_SUPABASE_URL
// on the marketing site so cookie names match.
const PRODUCTION_URL  = 'https://kqmgxnxvmahnvrmizfzr.supabase.co'
const PRODUCTION_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbWd4bnh2bWFobnZybWl6ZnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTM0NTcsImV4cCI6MjA5MTc2OTQ1N30.B5g1rrpBTR9J1iLzd5Xzatqa3iGSFPxISDIou3DxwHA'

const envUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const url  = envUrl  && envUrl.startsWith('https://')   ? envUrl  : PRODUCTION_URL
const anon = envAnon && envAnon.length > 32             ? envAnon : PRODUCTION_ANON

if (!envUrl || !envAnon) {
  // Not fatal — we just baked in the production fallback. Log so it's
  // visible in dev when someone forgets terminal-src/.env.local.
  // eslint-disable-next-line no-console
  console.info(
    '[supabase] VITE_SUPABASE_URL/ANON_KEY not set; using production fallback. ' +
    'Set them in terminal-src/.env.local to point at a different project.',
  )
}

// Cookie-based browser client — shares session with the marketing-site
// `createBrowserClient(...)` exactly because they use the default Supabase
// cookie name on the same origin.
export const supabase: SupabaseClient = createBrowserClient(url, anon)

/** Returns the current Supabase access token, or null if signed out. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
