import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Client, Subscription } from '../types'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

type ClientWithSub = Client & { subscription?: Subscription }

export default function Kanban() {
  const [clients, setClients] = useState<ClientWithSub[]>([])
  const [conIntervento, setConIntervento] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    const { data: clientsData } = await supabase.from('clients').select('*').order('name')
    const { data: subsData } = await supabase.from('subscriptions').select('*')
    const { data: inter } = await supabase.from('interventions').select('client_id')
    setConIntervento(Array.from(new Set((inter || []).map(i => i.client_id))))
    setClients((clientsData || []).map(client => ({ ...client, subscription: (subsData || []).find(s => s.client_id === client.id) })))
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
  const senza = clients.filter(c => !c.subscription && conIntervento.includes(c.id))

  if (loading) return <div className="text-center py-10">Caricamento...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Kanban Abbonamenti</h1>
        <div className="flex gap-3">
          <Link to="/" className="text-blue-600 hover:underline text-sm">Vista Lista</Link>
          <Link to="/nuovo-cliente" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Nuovo</Link>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 rounded-xl p-4">
          <h2 className="font-semibold text-green-800 mb-4 flex items-center justify-between"><span>Attivi</span><span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full">{attivi.length}</span></h2>
          <div className="space-y-3">
            {attivi.map(client => <ClientCard key={client.id} client={client} />)}
            {attivi.length === 0 ? <p className="text-sm text-center py-4">Nessun cliente</p> : null}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4">
          <h2 className="font-semibold text-yellow-800 mb-4 flex items-center justify-between"><span>In scadenza</span><span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full">{inScadenza.length}</span></h2>
          <div className="space-y-3">
            {inScadenza.map(client => <ClientCard key={client.id} client={client} />)}
            {inScadenza.length === 0 ? <p className="text-sm text-center py-4">Nessun cliente</p> : null}
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <h2 className="font-semibold text-red-800 mb-4 flex items-center justify-between"><span>Scaduti</span><span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded-full">{scaduti.length}</span></h2>
          <div className="space-y-3">
            {scaduti.map(client => <ClientCard key={client.id} client={client} />)}
            {scaduti.length === 0 ? <p className="text-sm text-center py-4">Nessun cliente</p> : null}
          </div>
        </div>
      </div>
      {senza.length > 0 ? (
        <div className="mt-8 bg-gray-50 rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-4">Senza abbonamento, con intervento ({senza.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {senza.map(client => <ClientCard key={client.id} client={client} />)}
          </div>
        </div>
      ) : null}
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