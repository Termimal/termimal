'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Phone / SMS sign-in & sign-up via Supabase OTP.
 *
 * Flow:
 *   1. User enters E.164 phone number (e.g. +33612345678)
 *   2. We call supabase.auth.signInWithOtp({ phone })
 *      → Supabase forwards to your configured SMS provider, which sends a 6-digit code
 *   3. User enters the code, we call supabase.auth.verifyOtp({ phone, token, type: 'sms' })
 *      → On success, the user is signed in (and auto-created if new)
 *
 * Requirements:
 *   - In the Supabase dashboard, enable Authentication → Providers → Phone
 *   - Configure an SMS provider (Twilio, MessageBird, Vonage, Textlocal). Supabase's
 *     built-in SMS is paid; bring your own free Twilio trial credit if you don't
 *     want to upgrade Supabase.
 *
 * If phone is not configured Supabase returns an error string we surface verbatim.
 */
export function PhoneAuth({
  mode,
  next = '/terminal',
}: {
  mode: 'login' | 'signup'
  next?: string
}) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const sendCode = async () => {
    setError('')
    const cleaned = phone.trim().replace(/\s+/g, '')
    if (!/^\+\d{8,15}$/.test(cleaned)) {
      setError('Enter your number in international format, e.g. +33612345678.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: cleaned,
      options: { shouldCreateUser: mode === 'signup' },
    })
    setLoading(false)
    if (error) {
      setError(error.message || 'Could not send the code. SMS provider may not be configured yet.')
      return
    }
    setStep('code')
  }

  const verifyCode = async () => {
    setError('')
    const cleaned = phone.trim().replace(/\s+/g, '')
    const t = code.trim()
    if (t.length < 6) {
      setError('Enter the 6-digit code from the SMS.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ phone: cleaned, token: t, type: 'sms' })
    setLoading(false)
    if (error) {
      setError(error.message || 'Invalid or expired code.')
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div role="alert" className="p-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>
          {error}
        </div>
      )}

      {step === 'phone' ? (
        <>
          <div>
            <label htmlFor="phone" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t2)' }}>
              Mobile number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+33612345678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }}
            />
            <p className="mt-1 text-[11px]" style={{ color: 'var(--t4)' }}>
              International format, starting with +. Standard SMS rates may apply.
            </p>
          </div>
          <button
            type="button"
            onClick={sendCode}
            disabled={loading || !phone}
            className="btn-primary w-full justify-center py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? 'Sending code…' : 'Send code by SMS'}
          </button>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="otp" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t2)' }}>
              6-digit code sent to {phone}
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono tracking-widest"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }}
            />
          </div>
          <button
            type="button"
            onClick={verifyCode}
            disabled={loading || code.length < 6}
            className="btn-primary w-full justify-center py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify and continue'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('phone'); setCode(''); setError('') }}
            className="text-xs"
            style={{ color: 'var(--t3)' }}
          >
            ← Use a different number
          </button>
        </>
      )}
    </div>
  )
}

export default PhoneAuth
