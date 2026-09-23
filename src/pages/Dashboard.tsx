import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Client, Subscription } from '../types'
import { format, differenceInDays, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export default function Dashboard() {
  const [clients, setClients] = useState<(Client & { subscription?: Subscription })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tutti')

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    setLoading(true)

    const { data: clientsData, error } = await supabase
      .from('clients')
      .select('*')
      .order('name')

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

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

  function getStatus(sub?: Subscription) {
    if (!sub) return { label: 'Nessun abbonamento', color: 'bg-gray-200 text-gray-700' }

    const end = parseISO(sub.end_date)
    const daysLeft = differenceInDays(end, new Date())

    if (daysLeft < 0) return { label: 'Scaduto', color: 'bg-red-100 text-red-700' }
    if (daysLeft <= 30) return { label: `In scadenza (${daysLeft} gg)`, color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Attivo', color: 'bg-green-100 text-green-700' }
  }

  function exportScadenzeMese() {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const daEsportare = clients.filter(c => {
      if (!c.subscription) return false
      const end = parseISO(c.subscription.end_date)
      return end.getMonth() === currentMonth && end.getFullYear() === currentYear
    })

    if (daEsportare.length === 0) {
      alert('Nessun cliente in scadenza questo mese')
      return
    }

    const header = ['Nome', 'Email', 'Telefono', 'Tipo Abbonamento', 'Data Scadenza', 'Pagato', 'SIM Wuarda']
    const rows = daEsportare.map(c => {
      const sub = c.subscription!
      return [
        c.name,
        c.email || '',
        c.phone || '',
        sub.package_type || '',
        format(parseISO(sub.end_date), 'dd/MM/yyyy'),
        sub.paid ? 'Sì' : 'No',
        sub.has_sim_wuarda ? 'Sì' : 'No'
      ]
    })

    const csvContent = [header, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `scadenze_${format(now, 'MMMM_yyyy', { locale: it })}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filtered = clients.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase())

    if (!matchSearch) return false

    if (filter === 'tutti') return true

    const status = getStatus(c.subscription)

    if (filter === 'attivi') return status.label === 'Attivo'
    if (filter === 'scadenza') return status.label.startsWith('In scadenza')
    if (filter === 'scaduti') return status.label === 'Scaduto'

    return true
  })

  if (loading) return <div className="text-center py-10">Caricamento clienti...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
  <div className="flex items-center gap-4">
    <h1 className="text-2xl font-bold">Clienti</h1>
    <Link to="/kanban" className="text-sm text-blue-600 hover:underline">
      Vista Kanban →
    </Link>
  </div>
        <Link
          to="/nuovo-cliente"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nuovo Cliente
        </Link>
      </div>

      <input
        type="text"
        placeholder="Cerca cliente..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border rounded-lg px-4 py-2 mb-4"
      />

      {/* Filtri + Esporta */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <button
          onClick={() => setFilter('tutti')}
          className={`px-4 py-1.5 rounded-full text-sm ${filter === 'tutti' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Tutti
        </button>
        <button
          onClick={() => setFilter('attivi')}
          className={`px-4 py-1.5 rounded-full text-sm ${filter === 'attivi' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
        >
          Attivi
        </button>
        <button
          onClick={() => setFilter('scadenza')}
          className={`px-4 py-1.5 rounded-full text-sm ${filter === 'scadenza' ? 'bg-yellow-500 text-white' : 'bg-gray-100'}`}
        >
          In scadenza
        </button>
        <button
          onClick={() => setFilter('scaduti')}
          className={`px-4 py-1.5 rounded-full text-sm ${filter === 'scaduti' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
        >
          Scaduti
        </button>

        <button
          onClick={exportScadenzeMese}
          className="ml-auto bg-emerald-600 text-white px-4 py-1.5 rounded-full text-sm hover:bg-emerald-700"
        >
          Esporta scadenze del mese
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-10">Nessun cliente trovato</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Stato Abbonamento</th>
                <th className="text-left px-4 py-3">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => {
                const status = getStatus(client.subscription)
                return (
                  <tr key={client.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/client/${client.id}`} className="text-blue-600 hover:underline font-medium">
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{client.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {client.subscription
                        ? format(parseISO(client.subscription.end_date), 'dd MMM yyyy', { locale: it })
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}