import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'

const FATTURE_URL = 'https://fatture-self.vercel.app'

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

export default function Interventi() {
  const [clients, setClients] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [clientId, setClientId] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => setClients(data || []))
  }, [])

  useEffect(() => {
    if (!clientId) {
      setRows([])
      setSelected([])
      return
    }
    supabase.from('interventions').select('*').eq('client_id', clientId).order('intervention_date', { ascending: false }).then(({ data }) => setRows(data || []))
  }, [clientId])

  const trovati = q.trim().length < 2 ? [] : clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
  const cliente = clients.find(c => c.id === clientId)

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function creaFattura() {
    if (!cliente || selected.length === 0) return alert('Seleziona almeno un intervento')
    const scelti = rows.filter(i => selected.includes(i.id))
    if (!confirm('Creare una fattura con ' + scelti.length + ' intervento/i?')) return
    setBusy(true)
    const numero = await prossimoNumeroFattura()
    const oggetto = scelti.length === 1
      ? 'Intervento del ' + format(parseISO(scelti[0].intervention_date), 'dd/MM/yyyy')
      : 'Interventi (' + scelti.length + ')'
    const { data: inv, error } = await supabase.from('invoices').insert({
      invoice_number: numero,
      sdi_status: 'bozza',
      client_id: cliente.id,
      invoice_type: 'fattura',
      oggetto,
    }).select().single()
    if (error || !inv) {
      setBusy(false)
      return alert(error?.message || 'Errore')
    }
    await supabase.from('invoice_items').insert(scelti.map(item => ({
      invoice_id: inv.id,
      name: format(parseISO(item.intervention_date), 'dd/MM/yyyy') + ' - ' + item.description,
      description: item.description,
      quantity: 1,
      unit_price: 0,
      vat_rate: 22,
    })))
    setBusy(false)
    window.open(FATTURE_URL + '/fattura/' + inv.id, '_blank')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Interventi</h1>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Scrivi almeno 2 lettere del cliente..." className="w-full border rounded-lg px-3 py-2" />
      {q.trim().length >= 2 ? (
        <div className="bg-white rounded-xl shadow divide-y">
          {trovati.length === 0 ? <p className="p-3 text-sm text-slate-500">Nessun cliente</p> : null}
          {trovati.map(c => (
            <button key={c.id} type="button" onClick={() => { setClientId(c.id); setQ(c.name) }} className={'block w-full text-left px-3 py-2 text-sm ' + (clientId === c.id ? 'bg-blue-50 font-medium' : '')}>{c.name}</button>
          ))}
        </div>
      ) : <p className="text-sm text-slate-500">Nessun elenco finche non cerchi</p>}

      {cliente ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{cliente.name} · {rows.length} interventi</p>
            <button type="button" onClick={creaFattura} disabled={selected.length === 0 || busy} className="bg-violet-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40">
              {busy ? 'Creazione...' : selected.length ? 'Crea fattura (' + selected.length + ')' : 'Crea fattura'}
            </button>
          </div>
          {rows.map(item => (
            <label key={item.id} className="bg-white rounded-xl shadow p-4 flex gap-3 items-start">
              <input type="checkbox" className="mt-1" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
              <div className="min-w-0">
                <p className="font-medium">{format(parseISO(item.intervention_date), 'dd/MM/yyyy')}</p>
                <p className="text-sm text-slate-600 break-words">{item.description}</p>
                <p className="text-xs mt-1 text-slate-500">{selected.includes(item.id) ? 'Selezionato per fattura' : 'Da fatturare'}</p>
              </div>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  )
}