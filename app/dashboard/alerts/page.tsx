'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Alert = {
  id: string
  instrument: string
  condition: string
  value: number
  status: 'active' | 'triggered' | 'expired' | 'disabled'
  created_at: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
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
          .from('alerts')
          .select('id,instrument,condition,value,status,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (cancelled) return
        if (qErr) {
          setError('We could not load your alerts. Please refresh.')
        } else {
          setAlerts((data as Alert[] | null) ?? [])
        }
      } catch {
        if (!cancelled) setError('Network error while loading alerts.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading alerts">
        <div className="h-8 w-40 rounded animate-pulse" style={{ background: 'var(--surface)' }} />
        <div className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
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
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Alerts</h1>
      <p className="text-sm mb-6 sm:mb-8" style={{ color: 'var(--t3)' }}>{alerts.length} alerts configured.</p>

      {alerts.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-xl text-center" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--t3)' }}>No alerts yet.</p>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>Create alerts from the web or desktop terminal.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface)' }}>
                  <th scope="col" className="text-left p-3 font-semibold text-xs" style={{ color: 'var(--t3)' }}>Instrument</th>
                  <th scope="col" className="text-left p-3 font-semibold text-xs" style={{ color: 'var(--t3)' }}>Condition</th>
                  <th scope="col" className="text-left p-3 font-semibold text-xs" style={{ color: 'var(--t3)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="p-3 font-semibold">{a.instrument}</td>
                    <td className="p-3" style={{ color: 'var(--t2)' }}>{a.condition} {a.value}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                        color: a.status === 'active' ? 'var(--green-val)' : 'var(--amber)',
                        background: a.status === 'active' ? 'rgba(63,185,80,.1)' : 'rgba(251,191,36,.1)',
                      }}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile card list */}
          <ul className="md:hidden space-y-2">
            {alerts.map(a => (
              <li key={a.id} className="p-3 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{a.instrument}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                    color: a.status === 'active' ? 'var(--green-val)' : 'var(--amber)',
                    background: a.status === 'active' ? 'rgba(63,185,80,.1)' : 'rgba(251,191,36,.1)',
                  }}>{a.status}</span>
                </div>
                <div className="mt-1 text-sm" style={{ color: 'var(--t3)' }}>{a.condition} {a.value}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
