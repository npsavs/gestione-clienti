import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Client, Subscription } from '../types'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

type ClientWithSub = Client & { subscription?: Subscription }

export default function Kanban() {
  const [clients, setClients] = useState<ClientWithSub[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    const tutti: any[] = []
    let start = 0
    while (true) {
      const { data: cl } = await supabase.from('clients').select('*').order('name').range(start, start + 999)
      if (!cl || cl.length === 0) break
      tutti.push(...cl)
      if (cl.length < 1000) break
      start += 1000
    }
    const { data: subsData } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
    const subMap: Record<string, any> = {}
    for (const s of subsData || []) {
      if (!subMap[s.client_id]) subMap[s.client_id] = s
    }
    setClients(tutti.map(client => ({ ...client, subscription: subMap[client.id] })).filter(c => c.subscription))
    setLoading(false)
  }

  function getColumn(sub?: Subscription) {
    if (!sub || !sub.end_date) return 'nessuno'
    const end = parseISO(sub.end_date)
    const now = new Date()
    const inizioMese = new Date(end.getFullYear(), end.getMonth(), 1)
    const fineMese = new Date(end.getFullYear(), end.getMonth() + 1, 1)
    if (now >= fineMese) return 'scaduti'
    if (now >= inizioMese) return 'scadenza'
    return 'attivi'
  }

  const attivi = clients.filter(c => getColumn(c.subscription) === 'attivi')
  const inScadenza = clients.filter(c => getColumn(c.subscription) === 'scadenza')
  const scaduti = clients.filter(c => getColumn(c.subscription) === 'scaduti')

  if (loading) return <div className="text-center py-10">Caricamento...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Kanban</h1>
        <div className="flex gap-2">
          <button type="button" onClick={loadClients} className="text-sm border px-3 py-1.5 rounded-lg bg-white">Aggiorna</button>
          <Link to="/" className="text-sm border px-3 py-1.5 rounded-lg bg-white">Lista</Link>
          <Link to="/nuovo-cliente" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm">+ Nuovo</Link>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Colonna titolo="Attivi" colore="green" n={attivi.length} clienti={attivi} />
        <Colonna titolo="In scadenza" colore="yellow" n={inScadenza.length} clienti={inScadenza} />
        <Colonna titolo="Scaduti" colore="red" n={scaduti.length} clienti={scaduti} />
      </div>
    </div>
  )
}

function Colonna({ titolo, colore, n, clienti }: { titolo: string; colore: string; n: number; clienti: ClientWithSub[] }) {
  const bg = colore === 'green' ? 'bg-green-50' : colore === 'yellow' ? 'bg-yellow-50' : 'bg-red-50'
  const text = colore === 'green' ? 'text-green-800' : colore === 'yellow' ? 'text-yellow-800' : 'text-red-800'
  const badge = colore === 'green' ? 'bg-green-200' : colore === 'yellow' ? 'bg-yellow-200' : 'bg-red-200'
  return (
    <div className={bg + ' rounded-xl p-4'}>
      <h2 className={'font-semibold mb-3 flex justify-between ' + text}><span>{titolo}</span><span className={badge + ' text-xs px-2 py-0.5 rounded-full'}>{n}</span></h2>
      <div className="space-y-2">
        {clienti.map(client => <ClientCard key={client.id} client={client} />)}
        {clienti.length === 0 ? <p className="text-sm text-center py-4 text-slate-400">Nessuno</p> : null}
      </div>
    </div>
  )
}

function ClientCard({ client }: { client: ClientWithSub }) {
  const sub = client.subscription
  return (
    <Link to={'/client/' + client.id} className="block bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      <p className="font-medium text-gray-900">{client.name}</p>
      {sub ? <p className="text-xs text-gray-500 mt-1">{sub.package_type || '—'} · Scade {format(parseISO(sub.end_date), 'dd MMM yyyy', { locale: it })}</p> : <p className="text-xs text-gray-500 mt-1">Solo intervento</p>}
    </Link>
  )
}