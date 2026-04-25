import Link from 'next/link'
import {
  ArrowRight,
  Download,
  Globe,
  Monitor,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  TerminalSquare
} from 'lucide-react'

export default function DownloadsPage() {
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
            <Download size={12} />
            Access methods
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Downloads
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6" style={{ color: 'var(--t3)' }}>
            Launch Web Termimal instantly in your browser or use the desktop app for a more focused native workspace.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--t4)' }}>
                <Sparkles size={12} />
                Recommended
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">Web Termimal</h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--t4)' }}>
                Instant browser access with your saved layouts, alerts, and account-linked workspace.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <TerminalSquare size={20} style={{ color: 'var(--acc)' }} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'No install', value: 'Ready in seconds' },
              { label: 'Saved state', value: 'Layouts + alerts sync' },
              { label: 'Best for', value: 'Fast daily analysis' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--t4)' }}>{item.label}</div>
                <div className="mt-2 text-sm font-medium">{item.value}</div>
              </div>
            ))}
          </div>

          <Link
            href="/web-terminal"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
            style={{ background: 'var(--acc)', color: '#fff' }}
          >
            Launch Web Termimal
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--t4)' }}>
                <MonitorSmartphone size={12} />
                Desktop app
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">Native terminal</h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--t4)' }}>
                Built for multi-monitor workflows, dedicated windows, and a more focused setup.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <Monitor size={20} style={{ color: 'var(--acc)' }} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {[
              { label: 'Desktop installer', value: 'Download page' },
              { label: 'OS support', value: 'Windows / macOS / Linux' },
              { label: 'Update model', value: 'Stable releases' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--t4)' }}>{item.label}</div>
                    <div className="mt-2 text-sm font-medium">{item.value}</div>
                  </div>
                  <ShieldCheck size={16} style={{ color: 'var(--t4)' }} />
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/download"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--t1)' }}
          >
            Go to download page
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'Access', desc: 'Launch from browser anywhere with no installation required.', icon: Globe },
          { title: 'Performance', desc: 'Use the desktop app when you want native windows and multi-monitor focus.', icon: Monitor },
          { title: 'Security', desc: 'Pair your account with 2FA from profile settings for safer access.', icon: ShieldCheck },
        ].map(item => {
          const Icon = item.icon
          return (
            <div key={item.title} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <Icon size={16} style={{ color: 'var(--acc)' }} />
              </div>
              <h4 className="mt-4 text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--t4)' }}>{item.title}</h4>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--t3)' }}>{item.desc}</p>
            </div>
          )
        })}
      </section>
    </div>
  )
}
