import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { differenceInDays, parseISO } from 'date-fns'

export default function Home() {
  const [clients, setClients] = useState<any[]>([])
  const [subs, setSubs] = useState<any[]>([])

  useEffect(() => {
    supabase.from('clients').select('id, name').then(({ data }) => setClients(data || []))
    supabase.from('subscriptions').select('*').then(({ data }) => setSubs(data || []))
  }, [])

  function stato(sub: any) {
    if (!sub) return 'nessuno'
    const d = differenceInDays(parseISO(sub.end_date), new Date())
    if (d < 0) return 'scaduto'
    if (d <= 30) return 'scadenza'
    return 'attivo'
  }

  const byClient = Object.fromEntries(subs.map(s => [s.client_id, s]))
  const attivi = clients.filter(c => stato(byClient[c.id]) === 'attivo').length
  const scadenza = clients.filter(c => stato(byClient[c.id]) === 'scadenza').length
  const scaduti = clients.filter(c => stato(byClient[c.id]) === 'scaduto').length
  const nessuno = clients.filter(c => !byClient[c.id]).length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panoramica abbonamenti</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link to="/clienti" className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-slate-500">Clienti</p>
          <p className="text-xl font-bold">{clients.length}</p>
        </Link>
        <Link to="/kanban" className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-green-700">Attivi</p>
          <p className="text-xl font-bold">{attivi}</p>
        </Link>
        <Link to="/clienti" className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-amber-700">In scadenza 30 gg</p>
          <p className="text-xl font-bold">{scadenza}</p>
        </Link>
        <Link to="/clienti" className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-red-600">Scaduti</p>
          <p className="text-xl font-bold">{scaduti}</p>
        </Link>
      </div>
      <p className="text-sm text-slate-600">Senza abbonamento: {nessuno}</p>
      <Link to="/kanban" className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">Apri Kanban</Link>
    </div>
  )
}