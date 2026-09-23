import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Client, Subscription } from '../types'
import { format, differenceInDays, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

type ClientWithSub = Client & { subscription?: Subscription }

export default function Kanban() {
  const [clients, setClients] = useState<ClientWithSub[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    setLoading(true)

    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .order('name')

    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('*')

    const clientsWithSub = (clientsData || []).map(client => {
      const sub = (subsData || []).find(s => s.client_id === client.id)
      return { ...client, subscription: sub }
    })

    setClients(clientsWithSub)
    setLoading(false)
  }

  function getColumn(sub?: Subscription) {
    if (!sub) return 'nessuno'
    const daysLeft = differenceInDays(parseISO(sub.end_date), new Date())
    if (daysLeft < 0) return 'scaduti'
    if (daysLeft <= 30) return 'scadenza'
    return 'attivi'
  }

  const attivi = clients.filter(c => getColumn(c.subscription) === 'attivi')
  const inScadenza = clients.filter(c => getColumn(c.subscription) === 'scadenza')
  const scaduti = clients.filter(c => getColumn(c.subscription) === 'scaduti')
  const senzaAbbonamento = clients.filter(c => getColumn(c.subscription) === 'nessuno')

  if (loading) {
    return <div className="text-center py-10">Caricamento...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kanban Abbonamenti</h1>
        <div className="flex gap-3">
          <Link to="/" className="text-blue-600 hover:underline text-sm">
            ← Vista Lista
          </Link>
          <Link
            to="/nuovo-cliente"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            + Nuovo Cliente
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colonna Attivi */}
        <div className="bg-green-50 rounded-xl p-4">
          <h2 className="font-semibold text-green-800 mb-4 flex items-center justify-between">
            <span>Attivi</span>
            <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full">
              {attivi.length}
            </span>
          </h2>
          <div className="space-y-3">
            {attivi.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
            {attivi.length === 0 && (
              <p className="text-sm text-green-600/70 text-center py-4">Nessun cliente</p>
            )}
          </div>
        </div>

        {/* Colonna In Scadenza */}
        <div className="bg-yellow-50 rounded-xl p-4">
          <h2 className="font-semibold text-yellow-800 mb-4 flex items-center justify-between">
            <span>In scadenza</span>
            <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full">
              {inScadenza.length}
            </span>
          </h2>
          <div className="space-y-3">
            {inScadenza.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
            {inScadenza.length === 0 && (
              <p className="text-sm text-yellow-600/70 text-center py-4">Nessun cliente</p>
            )}
          </div>
        </div>

        {/* Colonna Scaduti */}
        <div className="bg-red-50 rounded-xl p-4">
          <h2 className="font-semibold text-red-800 mb-4 flex items-center justify-between">
            <span>Scaduti</span>
            <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded-full">
              {scaduti.length}
            </span>
          </h2>
          <div className="space-y-3">
            {scaduti.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
            {scaduti.length === 0 && (
              <p className="text-sm text-red-600/70 text-center py-4">Nessun cliente</p>
            )}
          </div>
        </div>
      </div>

      {/* Eventuali senza abbonamento */}
      {senzaAbbonamento.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-4">
            Senza abbonamento ({senzaAbbonamento.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {senzaAbbonamento.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ClientCard({ client }: { client: ClientWithSub }) {
  const sub = client.subscription

  return (
    <Link
      to={`/client/${client.id}`}
      className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
    >
      <p className="font-medium text-gray-900">{client.name}</p>
      {sub && (
        <>
          <p className="text-xs text-gray-500 mt-1">
            {sub.package_type || '—'} · Scade {format(parseISO(sub.end_date), 'dd MMM yyyy', { locale: it })}
          </p>
          <div className="flex gap-2 mt-2 text-xs">
            {sub.paid && (
              <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Pagato</span>
            )}
            {sub.has_sim_wuarda && (
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">SIM</span>
            )}
          </div>
        </>
      )}
    </Link>
  )
}