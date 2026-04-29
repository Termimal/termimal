import type { Metadata } from 'next'
import BackToHome from '@/components/BackToHome'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy — Termimal',
  description:
    "How and why Termimal uses cookies and similar technologies on termimal.com.",
  alternates: { canonical: '/cookies' },
  openGraph: {
    title: 'Cookie Policy — Termimal',
    description:
      "How and why Termimal uses cookies and similar technologies on termimal.com.",
    url: '/cookies',
    type: 'website',
  },
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen pt-32 pb-20" style={{ background: 'var(--bg)' }}>
      <div className="max-w-[800px] mx-auto px-4 md:px-8">
        <Link href="/" className="text-sm mb-8 inline-block hover:underline" style={{ color: 'var(--acc)' }}>← Back to Home</Link>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>Cookie Policy</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Last updated: April 2026</p>
        
        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--t2)' }}>
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>1. What Are Cookies?</h2>
            <p>Cookies are small text files stored on your device when you visit our website. They help Termimal remember your preferences, keep you logged in, and understand how you interact with our platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>2. Types of Cookies We Use</h2>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Essential Cookies:</strong> Required for the platform to function. They handle user authentication, security, and session management.</li>
              <li><strong>Functional Cookies:</strong> Remember your theme preference (dark/light mode), customized chart layouts, and watchlist selections.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the terminal so we can improve performance and speed.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--t1)' }}>3. Managing Cookies</h2>
            <p>You can control or delete cookies through your browser settings. However, disabling essential or functional cookies will break the core functionality of the Termimal platform, such as logging in or saving your chart layouts.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
