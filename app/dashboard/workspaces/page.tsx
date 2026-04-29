'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Workspace = {
  id: string
  name: string
  updated_at: string
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/login'
          return
        }
        const { data, error: qErr } = await supabase
          .from('workspaces')
          .select('id,name,updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
        if (cancelled) return
        if (qErr) {
          setError('We could not load your workspaces. Please refresh.')
        } else {
          setWorkspaces((data as Workspace[] | null) ?? [])
        }
      } catch {
        if (!cancelled) setError('Network error while loading workspaces.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading workspaces">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: 'var(--surface)' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="p-6 rounded-xl text-sm" style={{ border: '1px solid rgba(248,113,113,.3)', background: 'rgba(248,113,113,.05)', color: 'var(--red-val)' }}>
        {error}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Saved Workspaces</h1>
      <p className="text-sm mb-6 sm:mb-8" style={{ color: 'var(--t3)' }}>Your saved layouts and workspace configurations.</p>
      {workspaces.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-xl text-center" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--t3)' }}>No saved workspaces yet.</p>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>Create and save workspaces from the terminal.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {workspaces.map(ws => (
            <li key={ws.id} className="p-5 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h2 className="text-sm font-bold mb-1">{ws.name}</h2>
              <p className="text-xs" style={{ color: 'var(--t3)' }}>Updated {new Date(ws.updated_at).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
