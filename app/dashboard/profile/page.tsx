'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  }, [])

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

  const handleEnable2FA = async () => {
    setMfaLoading(true)
    setMessage('')
    setQrCode('')
    setSecret('')
    setVerifyCode('')
    setChallengeId('')
    setEnrolledFactorId('')

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
    setQrCode('')
    setSecret('')
    setVerifyCode('')
    setChallengeId('')
    setEnrolledFactorId('')
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
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Profile & Security</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Manage your account details and security settings.</p>

      {message && (
        <div
          className="mb-6 p-3 rounded-lg text-xs font-medium"
          style={{
            background: message.toLowerCase().includes('error') || message.toLowerCase().includes('invalid')
              ? 'rgba(248,113,113,.1)'
              : 'rgba(52,211,153,.1)',
            color: message.toLowerCase().includes('error') || message.toLowerCase().includes('invalid')
              ? 'var(--red-val)'
              : 'var(--green-val)'
          }}
        >
          {message}
        </div>
      )}

      <div className="p-6 rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h3 className="text-sm font-bold mb-4">Personal information</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Full name', key: 'full_name', value: profile?.full_name || '' },
            { label: 'Email', key: 'email', value: profile?.email || '', disabled: true },
            { label: 'Country', key: 'country', value: profile?.country || '' },
            { label: 'Timezone', key: 'timezone', value: profile?.timezone || '' },
            { label: 'Language', key: 'language', value: profile?.language || 'en' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--t4)' }}>{f.label}</label>
              <input
                defaultValue={f.value}
                disabled={f.disabled}
                onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm disabled:opacity-50"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
              />
            </div>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-2 px-4 mt-4">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <div className="p-6 rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h3 className="text-sm font-bold mb-4">Security</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Password</div>
              <div className="text-xs" style={{ color: 'var(--t4)' }}>Send a password reset email</div>
            </div>
            <button onClick={handlePasswordReset} className="btn-secondary text-xs py-2 px-4">Reset password</button>
          </div>

          <div className="h-px" style={{ background: 'var(--border)' }} />

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Two-factor authentication</div>
              <div className="text-xs mt-1" style={{ color: 'var(--t4)' }}>
                {totpEnabled ? '2FA is enabled on your account.' : 'Add an authenticator app for extra security.'}
              </div>
            </div>

            {!totpEnabled ? (
              <button onClick={handleEnable2FA} disabled={mfaLoading} className="btn-primary text-xs py-2 px-4">
                {mfaLoading ? 'Starting...' : 'Enable 2FA'}
              </button>
            ) : (
              <button onClick={handleDisable2FA} disabled={mfaLoading} className="btn-secondary text-xs py-2 px-4">
                {mfaLoading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            )}
          </div>

          {!totpEnabled && qrCode && (
            <div className="mt-4 p-4 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div className="text-sm font-medium mb-3">Set up your authenticator app</div>

              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div
                  className="rounded-lg p-3 bg-white"
                  dangerouslySetInnerHTML={{ __html: qrCode }}
                />

                <div className="flex-1">
                  <p className="text-xs mb-3" style={{ color: 'var(--t3)' }}>
                    Scan the QR code with Google Authenticator, 1Password, Authy, or another TOTP app.
                  </p>

                  <p className="text-xs mb-2" style={{ color: 'var(--t4)' }}>Manual setup code</p>
                  <div className="text-xs font-mono break-all p-3 rounded-lg mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t2)' }}>
                    {secret}
                  </div>

                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--t4)' }}>
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Enter 6-digit code"
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value)}
                    className="w-full max-w-[220px] px-3 py-2.5 rounded-lg text-sm mb-3"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }}
                  />

                  <button onClick={handleVerify2FA} disabled={mfaLoading} className="btn-primary text-xs py-2 px-4">
                    {mfaLoading ? 'Verifying...' : 'Verify and enable'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 rounded-xl" style={{ border: '1px solid rgba(220,38,38,.2)', background: 'rgba(220,38,38,.02)' }}>
        <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--red-val)' }}>Danger zone</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--t3)' }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
        <button className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ color: 'var(--red-val)', border: '1px solid rgba(220,38,38,.3)' }}>
          Delete account
        </button>
      </div>
    </div>
  )
}
