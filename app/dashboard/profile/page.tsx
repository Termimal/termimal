'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data || { email: user.email, full_name: user.user_metadata?.full_name || '' })
      }
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

  if (loading) return <div className="text-sm" style={{ color: 'var(--t3)' }}>Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Profile & Security</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Manage your account details and security settings.</p>

      {message && (
        <div className="mb-6 p-3 rounded-lg text-xs font-medium" style={{ background: message.includes('Error') ? 'rgba(248,113,113,.1)' : 'rgba(52,211,153,.1)', color: message.includes('Error') ? 'var(--red-val)' : 'var(--green-val)' }}>
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
              <label className="block text-[0.62rem] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--t4)' }}>{f.label}</label>
              <input
                defaultValue={f.value}
                disabled={f.disabled}
                onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm disabled:opacity-50"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
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
        </div>
      </div>

      <div className="p-6 rounded-xl" style={{ border: '1px solid rgba(220,38,38,.2)', background: 'rgba(220,38,38,.02)' }}>
        <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--red-val)' }}>Danger zone</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--t3)' }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
        <button className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ color: 'var(--red-val)', border: '1px solid rgba(220,38,38,.3)' }}>Delete account</button>
      </div>
    </div>
  )
}
