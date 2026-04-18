import TerminalLite from '@/components/hero/TerminalLite'
import ThemeToggle from '@/components/ui/ThemeToggle'
import Link from 'next/link'
import Image from 'next/image'

export default function WebTerminalPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--terminal-bg)' }}>
      {/* Terminal nav */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--terminal-border)' }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="Termimal Logo" 
              width={24} 
              height={24} 
              className="object-contain"
            />
            <span className="text-xs font-semibold text-white">Termimal</span>
          </Link>
          <span className="text-[0.5rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded" style={{ color: 'var(--acc)', background: 'var(--acc-d)' }}>Web Terminal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[0.6rem] font-mono" style={{ color: 'var(--t4)' }}>Analysis only · No execution</span>
          <ThemeToggle />
          <Link href="/login" className="text-[0.68rem] font-medium" style={{ color: 'var(--t2)' }}>Sign in</Link>
          <Link href="/signup" className="btn-primary text-[0.68rem] py-1.5 px-3">Start Free</Link>
        </div>
      </div>

      {/* Terminal body */}
      <div className="flex-1 p-4">
        <TerminalLite />
      </div>

      {/* Bottom */}
      <div className="px-4 py-2 border-t text-center" style={{ borderColor: 'var(--terminal-border)' }}>
        <p className="text-[0.55rem]" style={{ color: 'var(--t4)' }}>
          This is a preview of the Termimal web terminal. Sign up for full access to all features, indicators, and workspaces.
        </p>
      </div>
    </div>
  )
}