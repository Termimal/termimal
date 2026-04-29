// lib/authEvents.ts — Fire-and-forget auth event logger.
// Posts to backend /api/auth/log-event which scrubs and persists to audit.log.
// Best-effort: never blocks UX, never throws.

const ALLOWED = [
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'auth.signup',
  'auth.password_reset_requested',
  'auth.mfa_enrolled',
  'auth.mfa_unenrolled',
] as const

export type AuthEvent = (typeof ALLOWED)[number]

export async function logAuthEvent(
  event: AuthEvent,
  options: { email?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await fetch('/api/auth/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, email: options.email, metadata: options.metadata }),
      keepalive: true,
    })
  } catch {
    // best-effort
  }
}
