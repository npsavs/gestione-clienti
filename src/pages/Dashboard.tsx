import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Client, Subscription } from '../types'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

const PACCHETTI = ['Classic', 'Premium', 'Medium', 'Basic', 'Nuovo Impianto']

export default function Dashboard() {
  const [clients, setClients] = useState<(Client & { subscription?: Subscription })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tutti')
  const [pacchetto, setPacchetto] = useState('')
  const [pagato, setPagato] = useState('')

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    const { data: clientsData, error } = await supabase.from('clients').select('*').order('name')
    if (error) { setLoading(false); return }
    const { data: subsData } = await supabase.from('subscriptions').select('*')
    const { data: inter } = await supabase.from('interventions').select('client_id')
    const ids = new Set((inter || []).map(i => i.client_id))
    setClients((clientsData || [])
      .map(client => ({ ...client, subscription: (subsData || []).find(s => s.client_id === client.id) }))
      .filter(c => c.subscription || ids.has(c.id)))
    setLoading(false)
  }

  function getStatus(sub?: Subscription) {
    if (!sub || !sub.end_date) return { label: 'Solo intervento', color: 'bg-gray-200 text-gray-700', key: 'nessuno' }
    const end = parseISO(sub.end_date)
    const now = new Date()
    const inizioMese = new Date(end.getFullYear(), end.getMonth(), 1)
    const fineMese = new Date(end.getFullYear(), end.getMonth() + 1, 1)
    if (now >= fineMese) return { label: 'Scaduto', color: 'bg-red-100 text-red-700', key: 'scaduti' }
    if (now >= inizioMese) return { label: 'In scadenza', color: 'bg-yellow-100 text-yellow-800', key: 'scadenza' }
    return { label: 'Attivo', color: 'bg-green-100 text-green-700', key: 'attivo' }
  }

  function exportScadenzeMese() {
    const now = new Date()
    const daEsportare = clients.filter(c => {
      if (!c.subscription?.end_date) return false
      const end = parseISO(c.subscription.end_date)
      return end.getMonth() === now.getMonth() && end.getFullYear() === now.getFullYear()
    })
    if (daEsportare.length === 0) return alert('Nessun cliente in scadenza questo mese')
    const header = ['Nome', 'Email', 'Telefono', 'Tipo Abbonamento', 'Data Scadenza', 'Pagato', 'SIM Wuarda']
    const rows = daEsportare.map(c => {
      const sub = c.subscription!
      return [c.name, c.email || '', c.phone || '', sub.package_type || '', format(parseISO(sub.end_date), 'dd/MM/yyyy'), sub.paid ? 'Si' : 'No', sub.has_sim_wuarda ? 'Si' : 'No']
    })
    const csvContent = [header, ...rows].map(row => row.map(cell => '"' + cell + '"').join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'scadenze_' + format(now, 'MMMM_yyyy', { locale: it }) + '.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const searched = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  )

  function passaStato(c: (typeof searched)[number]) {
    const key = getStatus(c.subscription).key
    if (filter === 'attivi' && key !== 'attivo') return false
    if (filter === 'scadenza' && key !== 'scadenza') return false
    if (filter === 'scaduti' && key !== 'scaduti') return false
    if (filter === 'nessuno' && key !== 'nessuno') return false
    return true
  }

  const perStato = searched.filter(passaStato)
  const filtered = perStato.filter(c => {
    if (pacchetto && (c.subscription?.package_type || '') !== pacchetto) return false
    if (pagato === 'si' && !c.subscription?.paid) return false
    if (pagato === 'no' && (!c.subscription || c.subscription.paid)) return false
    return true
  })

  const nStato = (key: string) => searched.filter(c => getStatus(c.subscription).key === key).length
  const nPack = (name: string) => perStato.filter(c => (c.subscription?.package_type || '') === name).length
  const nPagati = perStato.filter(c => !!c.subscription?.paid).length
  const nNonPagati = perStato.filter(c => c.subscription && !c.subscription.paid).length

  if (loading) return <div className="text-center py-10">Caricamento clienti...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Clienti</h1>
          <Link to="/kanban" className="text-sm text-blue-600">Vista Kanban</Link>
        </div>
        <Link to="/nuovo-cliente" className="bg-blue-600 text-white px-4 py-2 rounded-lg">+ Nuovo</Link>
      </div>
      <input type="text" placeholder="Scrivi almeno 2 lettere..." value={search} onChange={e => setSearch(e.target.value)} className="w-full border rounded-lg px-4 py-2 mb-4" />
      <div className="flex gap-2 mb-3 flex-wrap">
        <button type="button" onClick={() => setFilter('tutti')} className={'px-4 py-1.5 rounded-full text-sm ' + (filter === 'tutti' ? 'bg-blue-600 text-white' : 'bg-gray-100')}>Tutti ({searched.length})</button>
        <button type="button" onClick={() => setFilter('attivi')} className={'px-4 py-1.5 rounded-full text-sm ' + (filter === 'attivi' ? 'bg-green-600 text-white' : 'bg-gray-100')}>Attivi ({nStato('attivo')})</button>
        <button type="button" onClick={() => setFilter('scadenza')} className={'px-4 py-1.5 rounded-full text-sm ' + (filter === 'scadenza' ? 'bg-yellow-500 text-white' : 'bg-gray-100')}>In scadenza ({nStato('scadenza')})</button>
        <button type="button" onClick={() => setFilter('scaduti')} className={'px-4 py-1.5 rounded-full text-sm ' + (filter === 'scaduti' ? 'bg-red-600 text-white' : 'bg-gray-100')}>Scaduti ({nStato('scaduti')})</button>
        <button type="button" onClick={() => setFilter('nessuno')} className={'px-4 py-1.5 rounded-full text-sm ' + (filter === 'nessuno' ? 'bg-slate-700 text-white' : 'bg-gray-100')}>Solo intervento ({nStato('nessuno')})</button>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button type="button" onClick={() => setPacchetto('')} className={'px-4 py-1.5 rounded-full text-sm ' + (!pacchetto ? 'bg-slate-900 text-white' : 'bg-gray-100')}>Tutti i tipi ({perStato.length})</button>
        {PACCHETTI.map(p => (
          <button key={p} type="button" onClick={() => setPacchetto(p)} className={'px-4 py-1.5 rounded-full text-sm ' + (pacchetto === p ? 'bg-slate-900 text-white' : 'bg-gray-100')}>{p} ({nPack(p)})</button>
        ))}
        <button type="button" onClick={() => setPagato('')} className={'px-4 py-1.5 rounded-full text-sm ' + (!pagato ? 'bg-emerald-700 text-white' : 'bg-gray-100')}>Pagamento tutti</button>
        <button type="button" onClick={() => setPagato('si')} className={'px-4 py-1.5 rounded-full text-sm ' + (pagato === 'si' ? 'bg-emerald-700 text-white' : 'bg-gray-100')}>Pagati ({nPagati})</button>
        <button type="button" onClick={() => setPagato('no')} className={'px-4 py-1.5 rounded-full text-sm ' + (pagato === 'no' ? 'bg-emerald-700 text-white' : 'bg-gray-100')}>Non pagati ({nNonPagati})</button>
        <button type="button" onClick={exportScadenzeMese} className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-sm">Esporta scadenze del mese</button>
      </div>
      {search.trim().length < 2 ? (
        <p className="text-sm text-slate-500">I clienti compaiono solo dopo la ricerca.</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-10">Nessun cliente trovato</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(client => {
            const status = getStatus(client.subscription)
            return (
              <div key={client.id} className="bg-white rounded-xl shadow p-4 space-y-2">
                <Link to={'/client/' + client.id} className="font-medium text-blue-600">{client.name}</Link>
                <p className="text-sm text-gray-600 break-words">{client.email || '-'} · {client.phone || '-'}</p>
                <p className="text-sm">{client.subscription?.package_type || 'Nessun pacchetto'}</p>
                <span className={'text-xs px-2 py-1 rounded-full ' + status.color}>{status.label}</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link to={'/client/' + client.id} className="text-sm border px-3 py-1 rounded-lg">Scheda</Link>
                  <Link to={'/client/' + client.id + '/modifica'} className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg">Aggiungi abbonamento</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}