'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('workspaces').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
        setWorkspaces(data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-sm" style={{ color: 'var(--t3)' }}>Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Saved Workspaces</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>Your saved layouts and workspace configurations.</p>
      {workspaces.length === 0 ? (
        <div className="p-12 rounded-xl text-center" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--t3)' }}>No saved workspaces yet.</p>
          <p className="text-xs" style={{ color: 'var(--t4)' }}>Create and save workspaces from the terminal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {workspaces.map(ws => (
            <div key={ws.id} className="p-5 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h3 className="text-sm font-bold mb-1">{ws.name}</h3>
              <p className="text-xs" style={{ color: 'var(--t4)' }}>Updated {new Date(ws.updated_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
