'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, KeyRound, ShieldCheck, ShieldOff, UserCircle2, X } from 'lucide-react'

type Factor = {
  id: string
  factor_type: string
  status: string
  friendly_name?: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaFactors, setMfaFactors] = useState<Factor[]>([])
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [enrolledFactorId, setEnrolledFactorId] = useState('')
  const supabase = useMemo(() => createClient(), [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data || { email: user.email, full_name: user.user_metadata?.full_name || '' })
    }
  }

  const loadMfa = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (!error && data) {
      const allFactors = [
        ...(data.totp || []),
        ...(data.phone || []),
      ] as Factor[]
      setMfaFactors(allFactors)
    }
  }

  useEffect(() => {
    const load = async () => {
      await Promise.all([loadProfile(), loadMfa()])
      setLoading(false)
    }
    load()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase.from('profiles').update({
        full_name: profile.full_name,
        country: profile.country,
        timezone: profile.timezone,
        language: profile.language,
      }).eq('id', user.id)
      setMessage(error ? 'Error saving.' : 'Saved successfully.')
    }
    setSaving(false)
  }

  const handlePasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard/profile`,
    })
    setMessage(error ? 'Error sending reset email.' : 'Password reset email sent. Check your inbox.')
  }

  /** Clears all local 2FA setup state without unenrolling the factor. */
  const resetSetupState = () => {
    setQrCode('')
    setSecret('')
    setVerifyCode('')
    setChallengeId('')
    setEnrolledFactorId('')
  }

  /**
   * Cancel an in-progress 2FA setup: unenroll the pending factor so the
   * friendly name is freed up for the next attempt, then reset local state.
   */
  const handleCancel2FA = async () => {
    if (enrolledFactorId) {
      await supabase.auth.mfa.unenroll({ factorId: enrolledFactorId })
    }
    resetSetupState()
    setMessage('')
    await loadMfa()
  }

  const handleEnable2FA = async () => {
    setMfaLoading(true)
    setMessage('')
    resetSetupState()

    // Remove any existing unverified TOTP factor to avoid mfa_factor_name_conflict.
    const { data: listData } = await supabase.auth.mfa.listFactors()
    if (listData) {
      const pendingFactors = [
        ...(listData.totp || []),
      ].filter((f) => f.status !== 'verified') as Factor[]

      for (const pf of pendingFactors) {
        await supabase.auth.mfa.unenroll({ factorId: pf.id })
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Termimal',
      friendlyName: 'Termimal Authenticator',
    })

    if (error || !data) {
      setMessage('Error starting 2FA setup.')
      setMfaLoading(false)
      return
    }

    setEnrolledFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: data.id,
    })

    if (challengeError || !challengeData) {
      setMessage('2FA factor created, but challenge failed. Please try again.')
      setMfaLoading(false)
      return
    }

    setChallengeId(challengeData.id)
    setMessage('Scan the QR code in your authenticator app, then enter the 6-digit code.')
    setMfaLoading(false)
  }

  const handleVerify2FA = async () => {
    if (!challengeId || !verifyCode || !enrolledFactorId) {
      setMessage('Enter the 6-digit code from your authenticator app.')
      return
    }

    setMfaLoading(true)
    setMessage('')

    const { error } = await supabase.auth.mfa.verify({
      factorId: enrolledFactorId,
      challengeId,
      code: verifyCode,
    })

    if (error) {
      setMessage('Invalid 2FA code. Please try again.')
      setMfaLoading(false)
      return
    }

    setMessage('Two-factor authentication enabled successfully.')
    resetSetupState()
    await loadMfa()
    setMfaLoading(false)
  }

  const handleDisable2FA = async () => {
    const factor = mfaFactors.find((f) => f.factor_type === 'totp')
    if (!factor) return

    setMfaLoading(true)
    setMessage('')

    const { error } = await supabase.auth.mfa.unenroll({
      factorId: factor.id,
    })

    if (error) {
      setMessage('Error disabling 2FA.')
      setMfaLoading(false)
      return
    }

    setMessage('Two-factor authentication disabled.')
    await loadMfa()
    setMfaLoading(false)
  }

  const totpEnabled = mfaFactors.some((f) => f.factor_type === 'totp' && f.status === 'verified')

  if (loading) return <div className="text-sm" style={{ color: 'var(--t3)' }}>Loading...</div>

  return (
    <div className="space-y-5 sm:space-y-6">
      <section
        className="rounded-3xl border p-5 sm:p-6 lg:p-8"
        style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, var(--surface), var(--bg))' }}
      >
        <div className="max-w-2xl">
          <div
            className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ borderColor: 'var(--border)', color: 'var(--t4)' }}
          >
            <UserCircle2 size={12} />
            Profile & security
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Manage your account
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6" style={{ color: 'var(--t3)' }}>
            Update your personal information, manage password access, and secure your Termimal account with two-factor authentication.
          </p>
        </div>
      </section>

      {message && (
        <div
          className="rounded-2xl p-4 text-sm font-medium"
          style={{
            background: message.toLowerCase().includes('error') || message.toLowerCase().includes('invalid')
              ? 'rgba(248,113,113,.1)'
              : 'rgba(56,139,253,.1)',
            color: message.toLowerCase().includes('error') || message.toLowerCase().includes('invalid')
              ? 'var(--red-val)'
              : 'var(--green-val)',
            border: message.toLowerCase().includes('error') || message.toLowerCase().includes('invalid')
              ? '1px solid rgba(248,113,113,.18)'
              : '1px solid rgba(56,139,253,.18)',
          }}
        >
          {message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--t4)' }}>
              Personal information
            </h3>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-2 px-4">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Full name', key: 'full_name', value: profile?.full_name || '' },
              { label: 'Email', key: 'email', value: profile?.email || '', disabled: true },
              { label: 'Country', key: 'country', value: profile?.country || '' },
              { label: 'Timezone', key: 'timezone', value: profile?.timezone || '' },
              { label: 'Language', key: 'language', value: profile?.language || 'en' },
            ].map(f => (
              <div key={f.key} className={f.key === 'language' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--t4)' }}>
                  {f.label}
                </label>
                <input
                  defaultValue={f.value}
                  disabled={f.disabled}
                  onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl text-sm disabled:opacity-50"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--t4)' }}>
                  Password access
                </h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--t3)' }}>
                  Send a password reset email to the address on your account.
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <KeyRound size={16} style={{ color: 'var(--acc)' }} />
              </div>
            </div>

            <button onClick={handlePasswordReset} className="btn-secondary text-xs py-2 px-4 mt-5">
              Reset password
            </button>
          </div>

          <div className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck size={15} style={{ color: 'var(--acc)' }} />
                  Two-factor authentication
                </div>
                <p className="mt-2 text-sm" style={{ color: 'var(--t3)' }}>
                  {totpEnabled ? '2FA is enabled on your account.' : 'Add an authenticator app for extra security.'}
                </p>
              </div>

              {!totpEnabled ? (
                <div className="flex items-center gap-2">
                  <button onClick={handleEnable2FA} disabled={mfaLoading} className="btn-primary text-xs py-2 px-4">
                    {mfaLoading ? 'Starting...' : 'Enable 2FA'}
                  </button>
                  {qrCode && (
                    <button
                      onClick={handleCancel2FA}
                      disabled={mfaLoading}
                      className="btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                      title="Cancel 2FA setup"
                    >
                      <X size={13} />
                      Cancel
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={handleDisable2FA} disabled={mfaLoading} className="btn-secondary text-xs py-2 px-4">
                  {mfaLoading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              )}
            </div>

            {!totpEnabled && qrCode && (
              <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <div className="text-sm font-medium mb-4">Set up your authenticator app</div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  <div className="rounded-xl p-3 bg-white max-w-[220px]" dangerouslySetInnerHTML={{ __html: qrCode }} />

                  <div className="flex-1 w-full">
                    <p className="text-sm mb-3" style={{ color: 'var(--t3)' }}>
                      Scan the QR code with Google Authenticator, 1Password, Authy, or another TOTP app.
                    </p>

                    <p className="text-xs mb-2" style={{ color: 'var(--t4)' }}>Manual setup code</p>
                    <div
                      className="text-xs font-mono break-all p-3 rounded-xl mb-4"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t2)' }}
                    >
                      {secret}
                    </div>

                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--t4)' }}>
                      Verification code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Enter 6-digit code"
                      value={verifyCode}
                      onChange={e => setVerifyCode(e.target.value)}
                      className="w-full sm:max-w-[240px] px-3 py-3 rounded-xl text-sm mb-3"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }}
                    />

                    <button onClick={handleVerify2FA} disabled={mfaLoading} className="btn-primary text-xs py-2 px-4">
                      <span className="inline-flex items-center gap-2">
                        {mfaLoading ? 'Verifying...' : 'Verify and enable'}
                        {!mfaLoading && <ArrowRight size={14} />}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            className="rounded-2xl border p-5 sm:p-6"
            style={{ border: '1px solid rgba(220,38,38,.2)', background: 'rgba(220,38,38,.02)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--red-val)' }}>
                  <ShieldOff size={15} />
                  Danger zone
                </div>
                <p className="mt-2 text-sm" style={{ color: 'var(--t3)' }}>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
            </div>

            <button
              className="mt-5 text-xs font-semibold px-4 py-2.5 rounded-xl"
              style={{ color: 'var(--red-val)', border: '1px solid rgba(220,38,38,.3)' }}
            >
              Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
