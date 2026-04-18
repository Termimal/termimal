'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/auth/AuthLayout'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [modal, setModal] = useState<'terms' | 'privacy' | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) { setError('Please accept the terms and conditions.'); return }
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
  }

  if (success) {
    return (
      <AuthLayout title="Check your email" subtitle="We sent you a confirmation link.">
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--acc-d)', border: '1px solid rgba(52,211,153,.15)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--acc)' }}>Confirmation email sent!</p>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>Click the link in your email to verify your account, then sign in.</p>
        </div>
        <Link href="/login" className="btn-secondary w-full justify-center py-3 text-sm mt-4">Back to sign in</Link>
      </AuthLayout>
    )
  }

  return (
    <>
      <AuthLayout title="Create your account" subtitle="Start analyzing markets for free.">
        <form onSubmit={handleSignup}>
          {error && (
            <div className="mb-4 p-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)', border: '1px solid rgba(248,113,113,.2)' }}>{error}</div>
          )}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Full name</label>
            <input type="text" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Password</label>
            <input type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Referral code (optional)</label>
            <input type="text" placeholder="Enter referral code" value={referralCode} onChange={e => setReferralCode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
          </div>
          
          <div className="mb-6">
            <label className="flex items-start gap-2 text-[0.68rem] cursor-pointer" style={{ color: 'var(--t3)' }}>
              <input type="checkbox" className="mt-0.5" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
              <span>
                I agree to the{' '}
                <button type="button" onClick={() => setModal('terms')} className="hover:underline" style={{ color: 'var(--acc)' }}>Terms</button>
                {' '}and{' '}
                <button type="button" onClick={() => setModal('privacy')} className="hover:underline" style={{ color: 'var(--acc)' }}>Privacy Policy</button>. 
                I understand this platform provides analysis tools only, not financial advice or trade execution.
              </span>
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-sm mb-4 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: '1px solid var(--border)' }} /></div>
          <div className="relative flex justify-center"><span className="px-3 text-xs" style={{ background: 'var(--bg)', color: 'var(--t4)' }}>or sign up with</span></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => handleOAuth('google')} className="btn-secondary justify-center py-2.5 text-xs">Google</button>
          <button onClick={() => handleOAuth('github')} className="btn-secondary justify-center py-2.5 text-xs">GitHub</button>
        </div>
        <p className="text-center text-xs" style={{ color: 'var(--t3)' }}>
          Already have an account? <Link href="/login" className="font-medium" style={{ color: 'var(--acc)' }}>Sign in</Link>
        </p>
      </AuthLayout>

      {/* MODAL OVERLAY */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setModal(null)}>
          <div 
            className="w-full max-w-lg p-6 rounded-2xl shadow-xl transform transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {modal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1 rounded-md transition-colors hover:bg-white/10">
                <X size={20} style={{ color: 'var(--t3)' }} />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar text-[0.8rem] space-y-4" style={{ color: 'var(--t2)' }}>
              {modal === 'terms' ? (
                <>
                  <p>Welcome to Termimal. These Terms of Service ("Terms") govern your access to and use of the Termimal website, platform, and services (collectively, the "Service"), operated by Hiram OÜ ("we", "us", or "our"). By accessing or using the Service, you agree to be bound by these Terms.</p>
                  
                  <h3 className="font-bold text-white mt-4">1. Not Financial Advice</h3>
                  <p>Termimal is an informational and educational platform. <strong>We are not a registered broker-dealer, investment advisor, or financial institution.</strong> The data, charts, indicators, and content provided on the Service do not constitute financial advice, investment recommendations, or an offer to buy or sell any asset. All trading and investment decisions are made entirely at your own risk.</p>
                  
                  <h3 className="font-bold text-white mt-4">2. Data Accuracy</h3>
                  <p>While we strive to provide highly accurate and real-time data, financial markets are subject to latency and errors. Termimal provides all data "as is" without any guarantees of accuracy, timeliness, or completeness. We are not liable for any losses incurred due to delayed or inaccurate data.</p>
                  
                  <h3 className="font-bold text-white mt-4">3. Acceptable Use & Intellectual Property</h3>
                  <p>All platform design, code, proprietary indicators, and layouts are the intellectual property of Hiram OÜ. You agree not to: (a) scrape, datamine, or reverse-engineer our platform; (b) redistribute our proprietary data or charts without attribution; (c) use the Service for any illegal activity.</p>
                  
                  <h3 className="font-bold text-white mt-4">4. Subscriptions and Billing</h3>
                  <p>Access to premium features requires a paid subscription. Subscriptions are billed in advance on a monthly or annual basis. You may cancel your subscription at any time, but we do not offer refunds for partially used billing periods.</p>
                </>
              ) : (
                <>
                  <p>Hiram OÜ respects your privacy. We collect minimal information required to provide our service.</p>
                  
                  <h3 className="font-bold text-white mt-4">1. Information We Collect</h3>
                  <p>We collect your name, email address, IP address, and platform usage data. Payment processing is handled by secure third-party providers (e.g., Stripe); we never store your full credit card details.</p>
                  
                  <h3 className="font-bold text-white mt-4">2. How We Use Your Data</h3>
                  <p>We use your data to: authenticate your account, save your terminal layouts and watchlists, process subscriptions, monitor platform performance, and send essential service updates. We do not use your data for automated decision-making or profiling.</p>
                  
                  <h3 className="font-bold text-white mt-4">3. Data Sharing</h3>
                  <p>We do not sell, rent, or trade your personal data to third parties. We only share information with trusted infrastructure providers (cloud hosting, email delivery, payment processors) necessary to operate Termimal.</p>
                  
                  <h3 className="font-bold text-white mt-4">4. Your Rights (GDPR)</h3>
                  <p>Under the General Data Protection Regulation (GDPR) and other applicable laws, you have the right to access, correct, export, or request the deletion of your personal data. You may exercise these rights at any time by contacting our support team or deleting your account via the dashboard.</p>
                </>
              )}
            </div>
            
            <div className="mt-6 pt-4 flex justify-end" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setModal(null)} className="btn-primary py-2 px-6 text-sm">
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}