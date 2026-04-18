'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReferralsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('referral_code').eq('id', user.id).single()
        setProfile(data)
      }
    }
    load()
  }, [])

  const refCode = profile?.referral_code || '...'
  const refLink = `https://termimal-website.vercel.app/signup?ref=${refCode}`
  const handleCopy = () => { navigator.clipboard.writeText(refLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Referral Center</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Invite friends and earn rewards when they subscribe.</p>
      <div className="p-6 rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h3 className="text-sm font-bold mb-3">Your referral link</h3>
        <div className="flex gap-2">
          <input readOnly value={refLink} className="flex-1 px-3 py-2.5 rounded-lg text-sm font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t2)' }} />
          <button onClick={handleCopy} className="btn-primary text-xs py-2.5 px-4">{copied ? 'Copied!' : 'Copy link'}</button>
        </div>
      </div>
      <div className="p-6 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h3 className="text-sm font-bold mb-3">How it works</h3>
        <div className="grid grid-cols-3 gap-4">
          {[{ step: '1', title: 'Share your link', desc: 'Send your unique referral link to friends' },{ step: '2', title: 'They sign up', desc: 'Your friend creates a free account' },{ step: '3', title: 'Both earn rewards', desc: 'Get credit when they subscribe' }].map(s => (
            <div key={s.step}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-2" style={{ background: 'var(--acc-d)', color: 'var(--acc)' }}>{s.step}</div>
              <div className="text-xs font-semibold mb-0.5">{s.title}</div>
              <div className="text-[0.68rem]" style={{ color: 'var(--t4)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
