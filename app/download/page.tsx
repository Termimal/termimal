import Navbar from '@/components/layout/Navbar'
import { Footer } from '@/components/sections'
import { Monitor, Globe, ArrowDown } from 'lucide-react'

function AppleLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--t2)' }}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

function WindowsLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--t2)' }}>
      <path d="M3 5.548l7.195-0.99v6.947H3V5.548zm0 12.904l7.195 0.99v-6.947H3v5.957zm8.01 1.105L21 21v-8.505h-9.99v8.062zm0-14.114v8.062H21V3l-9.99 1.443z"/>
    </svg>
  )
}

function LinuxLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor" style={{ color: 'var(--t2)' }}>
      <path d="M128 0C93.87 0 72.86 30.47 72.86 72.55c0 24.08 8.68 44.46 19.26 60.86-9.41 8.5-35.12 33.75-35.12 56.14 0 16.58 7.16 24.07 13.52 28.13-3.34 5.83-4.89 12.31-2.79 18.57 4.49 13.33 21.14 20.54 49.43 20.54 17.65 0 32.03-4.89 41.69-11.55 9.67 6.66 24.04 11.55 41.69 11.55 28.3 0 44.94-7.21 49.44-20.54 2.09-6.26.54-12.74-2.8-18.57 6.37-4.06 13.52-11.55 13.52-28.13 0-22.39-25.71-47.64-35.12-56.14 10.58-16.4 19.26-36.78 19.26-60.86C244.84 30.47 223.83 0 189.7 0h-61.7z"/>
    </svg>
  )
}

export default function DownloadPage() {
  return (
    <main>
      <Navbar />
      <section className="pt-32 pb-20">
        <div className="max-w-site mx-auto px-8">
          <div className="text-center mb-16">
            <div className="section-label">Download</div>
            <h1 className="text-4xl font-bold tracking-tight mb-3" style={{ letterSpacing: '-0.03em' }}>
              Get the desktop terminal
            </h1>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--t3)' }}>
              Native performance, multi-monitor support, and system-level notifications.
              Same workspace, synced everywhere.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-20">
            <div className="p-8 rounded-xl text-center"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', opacity: 0.5 }}>
              <div className="flex justify-center mb-4"><AppleLogo /></div>
              <h3 className="text-lg font-bold mb-1">macOS</h3>
              <p className="text-xs mb-1" style={{ color: 'var(--t3)' }}>Apple Silicon &amp; Intel</p>
              <p className="text-xs mb-6 font-mono" style={{ color: 'var(--t4)' }}>Coming soon</p>
              <button className="btn-secondary w-full justify-center py-3 cursor-not-allowed opacity-50" disabled>
                Coming soon
              </button>
            </div>

            <div className="p-8 rounded-xl text-center"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', opacity: 0.5 }}>
              <div className="flex justify-center mb-4"><WindowsLogo /></div>
              <h3 className="text-lg font-bold mb-1">Windows</h3>
              <p className="text-xs mb-1" style={{ color: 'var(--t3)' }}>Windows 10+</p>
              <p className="text-xs mb-6 font-mono" style={{ color: 'var(--t4)' }}>Coming soon</p>
              <button className="btn-secondary w-full justify-center py-3 cursor-not-allowed opacity-50" disabled>
                Coming soon
              </button>
            </div>

            <div className="p-8 rounded-xl text-center"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', opacity: 0.5 }}>
              <div className="flex justify-center mb-4"><LinuxLogo /></div>
              <h3 className="text-lg font-bold mb-1">Linux</h3>
              <p className="text-xs mb-1" style={{ color: 'var(--t3)' }}>Ubuntu, Fedora, Arch</p>
              <p className="text-xs mb-6 font-mono" style={{ color: 'var(--t4)' }}>Coming soon</p>
              <button className="btn-secondary w-full justify-center py-3 cursor-not-allowed opacity-50" disabled>
                Coming soon
              </button>
            </div>
          </div>

          <div className="max-w-3xl mx-auto mb-20">
            <h2 className="text-xl font-bold text-center mb-8">Desktop vs Web</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Monitor size={18} style={{ color: 'var(--t2)' }} />
                  <h3 className="text-base font-bold">Desktop</h3>
                </div>
                <ul className="space-y-2">
                  {['Native performance and speed', 'Multi-monitor workspace layouts', 'System-level push notifications', 'Keyboard shortcuts and hotkeys', 'Offline indicator cache'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--t3)' }}>
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--acc)', opacity: 0.5 }} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={18} style={{ color: 'var(--t2)' }} />
                  <h3 className="text-base font-bold">Web</h3>
                </div>
                <ul className="space-y-2">
                  {['Zero installation required', 'Works on any operating system', 'Always up to date', 'Full feature parity with desktop', 'Access from any browser'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--t3)' }}>
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--blue)', opacity: 0.5 }} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto mb-20">
            <h2 className="text-xl font-bold mb-6">System requirements</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <h3 className="text-sm font-bold mb-3">macOS</h3>
                <div className="space-y-1.5 text-xs" style={{ color: 'var(--t3)' }}>
                  <p>macOS 12 Monterey or later</p>
                  <p>Apple Silicon (M1/M2/M3) or Intel</p>
                  <p>4 GB RAM minimum, 8 GB recommended</p>
                  <p>200 MB disk space</p>
                </div>
              </div>
              <div className="p-5 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <h3 className="text-sm font-bold mb-3">Windows</h3>
                <div className="space-y-1.5 text-xs" style={{ color: 'var(--t3)' }}>
                  <p>Windows 10 (version 1809) or later</p>
                  <p>64-bit processor</p>
                  <p>4 GB RAM minimum, 8 GB recommended</p>
                  <p>250 MB disk space</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-6">Release notes</h2>
            {[
              { ver: 'v2.4.1', date: 'Mar 28, 2026', notes: ['Fixed COT data refresh timing', 'Improved chart rendering performance', 'Added VaR 95% indicator to chart header'] },
              { ver: 'v2.4.0', date: 'Mar 15, 2026', notes: ['New macro intelligence module with Polymarket integration', 'Event risk monitor with probability tracking', 'Redesigned global indicators layout'] },
              { ver: 'v2.3.8', date: 'Feb 28, 2026', notes: ['Added on-chain analytics (MVRV, Z-Score, Realized Cap)', 'New risk engine dashboard', 'Performance improvements for multi-tab workflows'] },
            ].map(release => (
              <div key={release.ver} className="mb-6 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-bold font-mono">{release.ver}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--t4)' }}>{release.date}</span>
                </div>
                <ul className="space-y-1">
                  {release.notes.map((note, i) => (
                    <li key={i} className="text-xs flex items-center gap-2" style={{ color: 'var(--t3)' }}>
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--acc)', opacity: 0.5 }} /> {note}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}