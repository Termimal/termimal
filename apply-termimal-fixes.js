const fs = require('fs');
const path = require('path');

const files = [
  'app/login/page.tsx',
  'app/forgot-password/page.tsx',
  'app/api/auth/callback/route.ts',
  'components/auth/AuthLayout.tsx',
  'components/Header.tsx',
  'app/about/page.tsx',
  'app/cookies/page.tsx',
  'app/platform/page.tsx',
  'components/FAQ.tsx',
  'components/Faq.tsx',
  'components/home/FAQ.tsx',
  'components/home/Faq.tsx',
];

function exists(p) {
  return fs.existsSync(path.join(process.cwd(), p));
}

function read(p) {
  return fs.readFileSync(path.join(process.cwd(), p), 'utf8');
}

function write(p, content) {
  const full = path.join(process.cwd(), p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Updated:', p);
}

function patch(file, fn) {
  if (!exists(file)) return;
  const oldText = read(file);
  const newText = fn(oldText);
  if (newText !== oldText) write(file, newText);
}

function ensureBackToHome() {
  const file = 'components/BackToHome.tsx';
  if (exists(file)) return;

  write(file, `'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function BackToHome({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  return (
    <div className="w-full mb-6 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={handleBack}
        className="text-sm font-medium"
        style={{ color: 'var(--t2)' }}
      >
        ← Back
      </button>
      <Link href="/" className="text-sm font-medium" style={{ color: 'var(--acc)' }}>
        Home
      </Link>
    </div>
  )
}
`);
}

function patchLogin() {
  patch('app/login/page.tsx', (text) => {
    text = text.replace(/setError\(error\.message\)/g, `setError('Incorrect email or password.')`);
    text = text.replace(/<input type="email"/, `<input id="email" type="email" autoComplete="email"`);
    text = text.replace(/<input type="password"/, `<input id="password" type="password" autoComplete="current-password"`);
    text = text.replace(
      /<div className="flex items-center justify-between mb-6">[\s\S]*?<\/div>/,
      `<div className="flex items-center justify-end mb-6">
          <Link href="/forgot-password" className="text-xs font-medium" style={{ color: 'var(--acc)' }}>Forgot password?</Link>
        </div>`
    );
    return text;
  });
}

function patchForgotPassword() {
  patch('app/forgot-password/page.tsx', (text) => {
    text = text.replace(
      /redirectTo: `\$\{window\.location\.origin\}\/api\/auth\/callback\?next=.*?`/,
      `redirectTo: \`\${window.location.origin}/api/auth/callback?next=/dashboard/reset-password\``
    );
    text = text.replace(/Reset link sent to \{email\}/g, 'If an account exists for that email, a reset link has been sent.');
    text = text.replace(/setError\(error\.message\)/g, `setError('Unable to send reset link right now.')`);
    return text;
  });
}

function ensureResetPasswordPage() {
  const file = 'app/dashboard/reset-password/page.tsx';
  if (exists(file)) return;

  write(file, `'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthLayout from '@/components/auth/AuthLayout'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const passwordsMatch = confirmPassword === '' || password === confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 1200)
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a secure new password for your account.">
      {success ? (
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--acc-d)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--acc)' }}>Password updated successfully</p>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>Redirecting you to your dashboard...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && <div role="alert" className="mb-4 p-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(248,113,113,.1)', color: 'var(--red-val)' }}>{error}</div>}
          <div className="mb-4">
            <label htmlFor="password" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t2)' }}>New password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }} />
          </div>
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Confirm new password</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: 'var(--surface)', border: \`1px solid \${!passwordsMatch ? 'var(--red-val)' : 'var(--border)'}\`, color: 'var(--t1)' }} />
            {!passwordsMatch && confirmPassword ? (
              <p className="mt-1 text-xs" style={{ color: 'var(--red-val)' }}>Passwords do not match</p>
            ) : null}
          </div>
          <button type="submit" disabled={loading || !passwordsMatch} className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50">
            {loading ? 'Updating password...' : 'Update password'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
`);
}

function patchCallback() {
  patch('app/api/auth/callback/route.ts', () => `export const runtime = 'edge'
import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function getSafeNextPath(next) {
  if (!next) return '/dashboard'
  if (!next.startsWith('/')) return '/dashboard'
  if (next.startsWith('//')) return '/dashboard'
  return next
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const safeNext = getSafeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(\`\${origin}\${safeNext}\`)
    }
  }

  return NextResponse.redirect(\`\${origin}/login\`)
}
`);
}

function patchAuthLayout() {
  patch('components/auth/AuthLayout.tsx', (text) => {
    if (!text.includes("import BackToHome")) {
      text = text.replace(/import .*?\n/g, (m) => m) + `import BackToHome from '@/components/BackToHome'\n`;
    }
    text = text.replace(/px-8/g, 'px-4 sm:px-8');
    if (!text.includes('<BackToHome />')) {
      text = text.replace(/(<div className="[^"]*max-w-\[380px\][^"]*">)/, `$1\n        <BackToHome />`);
    }
    return text;
  });
}

function patchPublicPage(file) {
  patch(file, (text) => {
    if (!text.includes("import BackToHome")) {
      text = `import BackToHome from '@/components/BackToHome'\n` + text;
    }
    text = text.replace(/px-8/g, 'px-4 md:px-8');
    if (!text.includes('<BackToHome />')) {
      text = text.replace(/<main([^>]*)>/, `<main$1>\n      <div className="mx-auto w-full max-w-4xl px-4 md:px-8 pt-6">\n        <BackToHome />\n      </div>`);
    }
    return text;
  });
}

function patchFaq() {
  const faqFiles = [
    'components/FAQ.tsx',
    'components/Faq.tsx',
    'components/home/FAQ.tsx',
    'components/home/Faq.tsx',
  ];

  for (const file of faqFiles) {
    if (!exists(file)) continue;
    patch(file, (text) => {
      if (!text.includes('fallbackFaqs')) {
        text = text.replace(
          /const\s+\[loading,\s*setLoading\]\s*=\s*useState\((true|false)\)/,
          `const [loading, setLoading] = useState(true)
  const fallbackFaqs = [
    { question: 'What is Termimal?', answer: 'Termimal is a market analysis platform for trading research.' },
    { question: 'Do you offer a free trial?', answer: 'Yes, Termimal offers a trial period on supported plans.' },
    { question: 'How do I get started?', answer: 'Create an account, confirm your email, and continue into the dashboard.' },
  ]`
        );
      }
      text = text.replace(
        /catch\s*\((.*?)\)\s*\{([\s\S]*?)\}/,
        `catch ($1) {
        console.error('FAQ load failed:', $1)
        setFaqs(fallbackFaqs)
        setLoading(false)
      }`
      );
      text = text.replace(/Loading FAQs\.\.\./g, 'Loading frequently asked questions...');
      return text;
    });
    break;
  }
}

function patchHeader() {
  patch('components/Header.tsx', (text) => {
    return text.replace(/max-w-\[480px\]/g, 'max-w-full');
  });
}

function cleanup() {
  for (const name of ['a', 'crisp_fix_patch.bat']) {
    const full = path.join(process.cwd(), name);
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
      console.log('Removed:', name);
    }
  }
}

ensureBackToHome();
patchLogin();
patchForgotPassword();
ensureResetPasswordPage();
patchCallback();
patchAuthLayout();
patchPublicPage('app/about/page.tsx');
patchPublicPage('app/cookies/page.tsx');
patchPublicPage('app/platform/page.tsx');
patchFaq();
patchHeader();
cleanup();

console.log('\\nDone. Next run:');
console.log('git status');
console.log('git diff');
console.log('git add .');
console.log('git commit -m "fix(auth, nav, faq, mobile): improve public navigation and auth UX"');
console.log('git push origin main');