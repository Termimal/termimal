import Link from 'next/link'
import { Globe, Monitor } from 'lucide-react'

export default function DownloadsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Downloads</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Access the web terminal or download the desktop app.</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Globe className="mb-3" size={20} style={{ color: 'var(--t4)' }} />
          <h3 className="text-base font-bold mb-1">Web Terminal</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--t3)' }}>Instant access from your browser.</p>
          <Link href="/web-terminal" className="btn-primary w-full justify-center py-2.5 text-sm text-center">Launch Web Terminal</Link>
        </div>
        <div className="p-6 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Monitor className="mb-3" size={20} style={{ color: 'var(--t4)' }} />
          <h3 className="text-base font-bold mb-1">Desktop Terminal</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--t3)' }}>Native performance with multi-monitor support.</p>
          <Link href="/download" className="btn-secondary w-full justify-center py-2.5 text-sm text-center">Download page</Link>
        </div>
      </div>
    </div>
  )
}
