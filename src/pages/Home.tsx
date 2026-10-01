import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { differenceInDays, parseISO, format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function Home() {
  const [clients, setClients] = useState<any[]>([])
  const [subs, setSubs] = useState<any[]>([])

  useEffect(() => {
    supabase.from('clients').select('id, name').then(({ data }) => setClients(data || []))
    supabase.from('subscriptions').select('*').then(({ data }) => setSubs(data || []))
  }, [])

  const byClient = Object.fromEntries(clients.map(c => [c.id, c]))
  const conAbb = subs.filter(s => byClient[s.client_id])

  function giorni(s: any) {
    return differenceInDays(parseISO(s.end_date), new Date())
  }

  const attivi = conAbb.filter(s => giorni(s) > 30)
  const scadenza = conAbb.filter(s => giorni(s) >= 0 && giorni(s) <= 30).sort((a, b) => giorni(a) - giorni(b))
  const scaduti = conAbb.filter(s => giorni(s) < 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panoramica abbonamenti</h1>
      <p className="text-sm text-slate-500">Solo clienti con abbonamento. Chi non ne ha uno non entra nei totali.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/clienti" className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-green-700">Attivi</p>
          <p className="text-xl font-bold">{attivi.length}</p>
        </Link>
        <Link to="/clienti" className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-amber-700">In scadenza 30 gg</p>
          <p className="text-xl font-bold">{scadenza.length}</p>
        </Link>
        <Link to="/clienti" className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-red-600">Scaduti</p>
          <p className="text-xl font-bold">{scaduti.length}</p>
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow divide-y">
        <p className="p-3 font-semibold text-sm">In scadenza</p>
        {scadenza.length === 0 ? <p className="p-4 text-sm text-slate-500">Nessuno in scadenza</p> : null}
        {scadenza.map(s => (
          <Link key={s.id} to={'/client/' + s.client_id} className="block px-4 py-3 text-sm hover:bg-slate-50">
            <p className="font-medium">{byClient[s.client_id]?.name || 'Cliente'}</p>
            <p className="text-slate-500">{s.package_type || '-'} · {format(parseISO(s.end_date), 'dd MMM yyyy', { locale: it })} · {giorni(s)} gg</p>
          </Link>
        ))}
      </div>
      <Link to="/kanban" className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">Apri Kanban</Link>
    </div>
  )
}