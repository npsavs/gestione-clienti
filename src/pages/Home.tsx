import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { differenceInDays, parseISO, format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function Home() {
  const [clients, setClients] = useState<any[]>([])
  const [subs, setSubs] = useState<any[]>([])
  const [filtro, setFiltro] = useState('scadenza')

  useEffect(() => {
    supabase.from('clients').select('id, name, phone').then(({ data }) => setClients(data || []))
    supabase.from('subscriptions').select('*').then(({ data }) => setSubs(data || []))
  }, [])

  const byClient = Object.fromEntries(clients.map(c => [c.id, c]))

  function giorni(s: any) {
    return differenceInDays(parseISO(s.end_date), new Date())
  }

  function gruppo(s: any) {
    const g = giorni(s)
    if (g < 0) return 'scaduti'
    if (g <= 30) return 'scadenza'
    return 'attivi'
  }

  const conAbb = subs.filter(s => byClient[s.client_id])
  const attivi = conAbb.filter(s => gruppo(s) === 'attivi')
  const scadenza = conAbb.filter(s => gruppo(s) === 'scadenza')
  const scaduti = conAbb.filter(s => gruppo(s) === 'scaduti')
  const lista = filtro === 'attivi' ? attivi : filtro === 'scaduti' ? scaduti : scadenza

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Panoramica abbonamenti</h1>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFiltro('attivi')} className={'px-4 py-2 rounded-full text-sm ' + (filtro === 'attivi' ? 'bg-green-600 text-white' : 'bg-white border')}>Attivi ({attivi.length})</button>
        <button type="button" onClick={() => setFiltro('scadenza')} className={'px-4 py-2 rounded-full text-sm ' + (filtro === 'scadenza' ? 'bg-yellow-500 text-white' : 'bg-white border')}>In scadenza ({scadenza.length})</button>
        <button type="button" onClick={() => setFiltro('scaduti')} className={'px-4 py-2 rounded-full text-sm ' + (filtro === 'scaduti' ? 'bg-red-600 text-white' : 'bg-white border')}>Scaduti ({scaduti.length})</button>
      </div>
      <div className="bg-white rounded-xl shadow divide-y">
        {lista.length === 0 ? <p className="p-4 text-sm text-slate-500">Nessun cliente in questo filtro</p> : null}
        {lista
          .sort((a, b) => giorni(a) - giorni(b))
          .map(s => (
            <Link key={s.id} to={'/client/' + s.client_id} className="block px-4 py-3 hover:bg-slate-50">
              <p className="font-medium">{byClient[s.client_id]?.name || 'Cliente'}</p>
              <p className="text-sm text-slate-500">{s.package_type || '-'} · {format(parseISO(s.end_date), 'dd MMM yyyy', { locale: it })} · {giorni(s)} gg</p>
            </Link>
          ))}
      </div>
    </div>
  )
}