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
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are public client-side values.

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.error(
    'Supabase env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in env.',
  )
}

// Cookie-based browser client — shares session with the marketing-site
// `createBrowserClient(...)` exactly because they use the default Supabase
// cookie name on the same origin.
export const supabase: SupabaseClient = createBrowserClient(
  url ?? 'https://invalid.supabase.co',
  anon ?? 'invalid',
)

/** Returns the current Supabase access token, or null if signed out. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
