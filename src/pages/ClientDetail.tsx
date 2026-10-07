import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO, addYears } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Client, Subscription, Intervention } from '../types'

async function prossimoNumeroFattura() {
  const year = new Date().getFullYear()
  const { data } = await supabase.from('invoices').select('invoice_number, invoice_type')
  const usati = (data || [])
    .filter(q => (q.invoice_type || 'fattura') === 'fattura')
    .map(q => {
      const m = String(q.invoice_number || '').replace(/^NC/i, '').match(/^(\d+)\/(\d{4})$/)
      if (m && Number(m[2]) === year) return Number(m[1])
      return 0
    })
  return (Math.max(0, ...usati) + 1) + '/' + year
}

function etichettaPagamento(v?: string) {
  if (v === 'garanzia') return 'In garanzia'
  if (v === 'pos') return 'Pagato con POS'
  if (v === 'bonifico') return 'Paga con bonifico'
  return 'Pagato'
}

export default function ClientDetail() {
  const { id } = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [newIntervention, setNewIntervention] = useState({
    intervention_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    amount: '',
    payment_type: 'pagato',
  })
  const [savingIntervention, setSavingIntervention] = useState(false)

  
  const [newSub, setNewSub] = useState({
    package_type: 'Classic',
    end_date: format(addYears(new Date(), 1), 'yyyy-MM-dd'),
    plant_type: 'Ajax',
    has_sim_wuarda: false,
  })

  useEffect(() => { if (id) loadData() }, [id])

  async function loadData() {
    setLoading(true)
    const { data: clientData } = await supabase.from('clients').select('*').eq('id', id).single()
    const { data: subData } = await supabase.from('subscriptions').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const { data: intData } = await supabase.from('interventions').select('*').eq('client_id', id).order('intervention_date', { ascending: false })
    setClient(clientData)
    setSubscription(subData)
    setInterventions(intData || [])
    setLoading(false)
  }

  function fatturabile(item: any) {
    return item.payment_type !== 'garanzia' && !item.invoice_id
  }

  function toggleIntervention(interventionId: string) {
    const item = interventions.find(i => i.id === interventionId) as any
    if (!fatturabile(item)) return
    setSelectedIds(prev => prev.includes(interventionId) ? prev.filter(x => x !== interventionId) : [...prev, interventionId])
  }

  async function handleCreaFattura() {
    if (!client || selectedIds.length === 0) return alert('Seleziona almeno un intervento')
    const scelti = interventions.filter(i => selectedIds.includes(i.id) && fatturabile(i))
    if (!scelti.length) return alert('In garanzia non si fattura')
    if (!confirm('Aprire la fattura con ' + scelti.length + ' intervento/i?')) return
    setCreatingInvoice(true)
    const numero = await prossimoNumeroFattura()
    const { data: inv, error: invError } = await supabase.from('invoices').insert({
      invoice_number: numero,
      sdi_status: 'bozza',
      client_id: client.id,
      invoice_type: 'fattura',
      oggetto: 'Interventi (' + scelti.length + ')',
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
    }).select().single()
    if (invError || !inv) { setCreatingInvoice(false); return alert(invError?.message || 'errore') }
    const { error: itemsError } = await supabase.from('invoice_items').insert(scelti.map(item => ({
      invoice_id: inv.id,
      name: format(parseISO(item.intervention_date), 'dd/MM/yyyy') + ' - ' + item.description,
      description: item.description,
      quantity: 1,
      unit_price: Number((item as any).amount || 0),
      vat_rate: 22,
    })))
    setCreatingInvoice(false)
    if (itemsError) { await supabase.from('invoices').delete().eq('id', inv.id); return alert(itemsError.message) }
    for (const item of scelti) await supabase.from('interventions').update({ invoice_id: inv.id, invoice_number: numero }).eq('id', item.id)
    setSelectedIds([])
    loadData()
    window.open('https://fatture-self.vercel.app/fattura/' + inv.id + '?nuova=1', '_blank')
  }

  async function handleRenew() {
    if (!subscription) return
    if (!confirm('Vuoi rinnovare l abbonamento di 1 anno?')) return
    const newEndDate = format(addYears(parseISO(subscription.end_date), 1), 'yyyy-MM-dd')
    const { error } = await supabase.from('subscriptions').update({ end_date: newEndDate }).eq('id', subscription.id)
    if (error) alert(error.message)
    else loadData()
  }

  async function eliminaAbbonamento() {
    if (!subscription) return alert('Questo cliente non ha un abbonamento')
    if (!confirm('Eliminare solo l abbonamento? Il cliente resta.')) return
    const { error } = await supabase.from('subscriptions').delete().eq('id', subscription.id)
    if (error) alert(error.message)
    else loadData()
  }

  async function handleAddSub(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('subscriptions').insert({
      client_id: id,
      end_date: newSub.end_date,
      package_type: newSub.package_type,
      plant_type: newSub.plant_type,
      has_sim_wuarda: newSub.has_sim_wuarda,
      start_date: format(addYears(parseISO(newSub.end_date), -1), 'yyyy-MM-dd'),
    })
    if (error) return alert(error.message)
    loadData()
  }

  async function handleAddIntervention(e: React.FormEvent) {
    e.preventDefault()
    if (!newIntervention.description.trim()) return
    setSavingIntervention(true)
    const { error } = await supabase.from('interventions').insert({
      client_id: id,
      intervention_date: newIntervention.intervention_date,
      description: newIntervention.description,
      payment_type: newIntervention.payment_type,
      amount: newIntervention.payment_type === 'garanzia' ? 0 : Number(newIntervention.amount || 0),
    })
    setSavingIntervention(false)
    if (error) return alert(error.message)
    setNewIntervention({ intervention_date: format(new Date(), 'yyyy-MM-dd'), description: '', amount: '', payment_type: 'pagato' })
    loadData()
  }

  async function handleDeleteIntervention(interventionId: string) {
    if (!confirm('Vuoi eliminare questo intervento?')) return
    const { error } = await supabase.from('interventions').delete().eq('id', interventionId)
    if (error) alert(error.message)
    else { setSelectedIds(prev => prev.filter(x => x !== interventionId)); loadData() }
  }

  function getStatus(sub: Subscription | null) {
    if (!sub) return { label: 'Nessun abbonamento', color: 'bg-gray-200 text-gray-700' }
    const end = parseISO(sub.end_date)
    const now = new Date()
    const inizioMese = new Date(end.getFullYear(), end.getMonth(), 1)
    const fineMese = new Date(end.getFullYear(), end.getMonth() + 1, 1)
    if (now >= fineMese) return { label: 'Scaduto', color: 'bg-red-100 text-red-700' }
    if (now >= inizioMese) return { label: 'In scadenza', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Attivo', color: 'bg-green-100 text-green-700' }
  }

  if (loading) return <div className="text-center py-10">Caricamento...</div>
  if (!client) return <div className="text-center py-10">Cliente non trovato</div>
  const status = getStatus(subscription)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-3">
        <Link to="/clienti" className="text-blue-600 text-sm">Torna alla lista</Link>
        <h1 className="text-2xl font-bold break-words">{client.name}</h1>
        <p className="text-gray-600 break-words">{client.email || 'Nessuna email'} · {client.phone || 'Nessun telefono'}</p>
        <div className="flex flex-wrap gap-2">
          <Link to={'/client/' + client.id + '/modifica'} className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm">Modifica</Link>
          <button type="button" onClick={eliminaAbbonamento} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">Elimina abbonamento</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Abbonamento</h2>
          <span className={'text-sm px-3 py-1 rounded-full ' + status.color}>{status.label}</span>
        </div>
        {subscription ? (
          <div className="space-y-2 text-sm">
            <p><strong>Tipo:</strong> {subscription.package_type || '-'}</p>
            <p><strong>Scadenza:</strong> {format(parseISO(subscription.end_date), 'dd MMMM yyyy', { locale: it })}</p>
            <p><strong>SIM Wuarda:</strong> {subscription.has_sim_wuarda ? 'Si' : 'No'}</p>
            <p><strong>Impianto:</strong> {subscription.plant_type}{subscription.plant_type === 'Altro' && subscription.plant_type_other ? ' (' + subscription.plant_type_other + ')' : ''}</p>
            <button type="button" onClick={handleRenew} className="bg-green-600 text-white px-4 py-2 rounded-lg mt-2">Rinnova di 1 anno</button>
          </div>
        ) : (
          <form onSubmit={handleAddSub} className="space-y-3">
            <p className="text-gray-500 text-sm">Nessun abbonamento. Aggiungilo qui.</p>
            <select value={newSub.package_type} onChange={e => setNewSub(s => ({ ...s, package_type: e.target.value }))} className="w-full border rounded-lg px-3 py-2">
              <option>Classic</option><option>Premium</option><option>Medium</option><option>Basic</option><option>Nuovo Impianto</option>
            </select>
            <select value={newSub.plant_type} onChange={e => setNewSub(s => ({ ...s, plant_type: e.target.value }))} className="w-full border rounded-lg px-3 py-2">
              <option>Ajax</option><option>Ademco</option><option>Altro</option>
            </select>
            <input type="date" value={newSub.end_date} onChange={e => setNewSub(s => ({ ...s, end_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newSub.has_sim_wuarda} onChange={e => setNewSub(s => ({ ...s, has_sim_wuarda: e.target.checked }))} /> SIM Wuarda</label>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Aggiungi abbonamento</button>
          </form>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold">Storico interventi</h2>
          <button type="button" onClick={handleCreaFattura} disabled={selectedIds.length === 0 || creatingInvoice} className="bg-violet-700 text-white px-4 py-2 rounded-lg disabled:opacity-40 text-sm">
            {creatingInvoice ? 'Creazione...' : 'Crea fattura (' + selectedIds.length + ')'}
          </button>
        </div>
        <form onSubmit={handleAddIntervention} className="mb-6 space-y-3 border-b pb-6">
          <input type="date" value={newIntervention.intervention_date} onChange={e => setNewIntervention(prev => ({ ...prev, intervention_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2" />
          <input type="text" placeholder="Descrizione intervento..." value={newIntervention.description} onChange={e => setNewIntervention(prev => ({ ...prev, description: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
          <select value={newIntervention.payment_type} onChange={e => setNewIntervention(prev => ({ ...prev, payment_type: e.target.value }))} className="w-full border rounded-lg px-3 py-2">
            <option value="garanzia">In garanzia</option>
            <option value="pagato">Pagato</option>
            <option value="pos">Pagato con POS</option>
            <option value="bonifico">Paga con bonifico</option>
          </select>
          <input type="number" step="0.01" placeholder="Importo EUR" value={newIntervention.amount} onChange={e => setNewIntervention(prev => ({ ...prev, amount: e.target.value }))} className="w-full border rounded-lg px-3 py-2" />
          <button type="submit" disabled={savingIntervention} className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Aggiungi</button>
        </form>
        {interventions.length === 0 ? <p className="text-gray-500">Nessun intervento registrato</p> : (
          <div className="space-y-3">
            {interventions.map(item => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                {(item as any).payment_type === 'garanzia' ? <p className="text-xs text-slate-500">In garanzia, non si fattura</p> : (item as any).invoice_id ? <p className="text-xs text-green-700">Gia fatturato · {(item as any).invoice_number}</p> : (
                  <label className="text-sm flex gap-2"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleIntervention(item.id)} /> Da fatturare</label>
                )}
                <p className="text-sm text-gray-500">{format(parseISO(item.intervention_date), 'dd MMMM yyyy', { locale: it })}</p>
                <p className="text-gray-800 break-words">{item.description}</p>
                <p className="text-sm">{Number((item as any).amount || 0).toFixed(2)} EUR · {etichettaPagamento((item as any).payment_type)}</p>
                <button type="button" onClick={() => handleDeleteIntervention(item.id)} className="text-red-600 text-sm">Elimina intervento</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
