"use client"

/**
 * AuthProvider — single source of truth for the current Supabase user
 * across the marketing site. Mount once at the root layout; consumers
 * read via `useAuthUser()`. Eliminates the 3-call burst of
 * `auth.getUser()` that fired when the Navbar, the dashboard layout,
 * and a dashboard page each fetched the user independently.
 *
 * Behaviour:
 *   - On mount: one `getUser()` snapshot.
 *   - One `onAuthStateChange` listener for the lifetime of the app.
 *   - Children re-render when the user changes (sign-in / sign-out).
 *   - `loading` is true only until the first snapshot resolves.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

interface AuthState {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setState({ user: data.user, loading: false })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false })
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

/** Returns the current user (null if signed out) and the loading flag. */
export function useAuthUser(): AuthState {
  return useContext(AuthContext)
}
