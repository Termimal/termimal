'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        setAlerts(data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-sm" style={{ color: 'var(--t3)' }}>Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>Alerts</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>{alerts.length} alerts configured.</p>
      {alerts.length === 0 ? (
        <div className="p-12 rounded-xl text-center" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--t3)' }}>No alerts yet.</p>
          <p className="text-xs" style={{ color: 'var(--t4)' }}>Create alerts from the web or desktop terminal.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: 'var(--surface)' }}>
              <th className="text-left p-4 font-semibold" style={{ color: 'var(--t3)' }}>Instrument</th>
              <th className="text-left p-4 font-semibold" style={{ color: 'var(--t3)' }}>Condition</th>
              <th className="text-left p-4 font-semibold" style={{ color: 'var(--t3)' }}>Status</th>
            </tr></thead>
            <tbody>{alerts.map(a => (
              <tr key={a.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="p-4 font-semibold">{a.instrument}</td>
                <td className="p-4" style={{ color: 'var(--t2)' }}>{a.condition} {a.value}</td>
                <td className="p-4"><span className="px-2 py-0.5 rounded text-sm font-semibold" style={{ color: a.status === 'active' ? 'var(--green-val)' : 'var(--amber)', background: a.status === 'active' ? 'rgba(52,211,153,.1)' : 'rgba(251,191,36,.1)' }}>{a.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

