// lib/supabase.ts — single shared Supabase client.
// Reads from Vite env. Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are
// public values — safe to ship in the browser bundle.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.error(
    'Supabase env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local',
  )
}

export const supabase: SupabaseClient = createClient(url ?? 'https://invalid.supabase.co', anon ?? 'invalid', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'termimal-auth',
    flowType: 'pkce',
  },
})

/** Returns the current Supabase access token, or null if signed out. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
