import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'

export default function Interventi() {
  const [clients, setClients] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [clientId, setClientId] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [filtro, setFiltro] = useState('tutti')

  const [ultimi, setUltimi] = useState<any[]>([])

  useEffect(() => {
    async function caricaClienti() {
      const tutti: any[] = []
      let start = 0
      while (true) {
        const { data } = await supabase.from('clients').select('id, name').order('name').range(start, start + 999)
        if (!data || data.length === 0) break
        tutti.push(...data)
        if (data.length < 1000) break
        start += 1000
      }
      setClients(tutti)
    }
    caricaClienti()
    supabase.from('interventions').select('*, clients(name)').order('intervention_date', { ascending: false }).limit(10).then(({ data }) => setUltimi(data || []))
  }, [])

  function carica(id: string) {
    supabase.from('interventions').select('*').eq('client_id', id).order('intervention_date', { ascending: false }).then(({ data }) => setRows(data || []))
  }

  useEffect(() => {
    if (!clientId) { setRows([]); setSelected([]); return }
    carica(clientId)
  }, [clientId])

  const trovati = q.trim().length < 2 ? [] : clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
  const cliente = clients.find(c => c.id === clientId)

  function toggle(id: string) {
    const row = rows.find(r => r.id === id)
    if (row?.invoice_id || row?.payment_type === 'garanzia') return
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function creaFattura() {
    if (!cliente || selected.length === 0) return alert('Seleziona almeno un intervento')
    const scelti = rows.filter(i => selected.includes(i.id) && !i.invoice_id && i.payment_type !== 'garanzia')
    if (!scelti.length) return alert('Quelli selezionati sono gia fatturati o in garanzia')
    if (!confirm('Creare una fattura con ' + scelti.length + ' intervento/i?')) return
    setBusy(true)
    const year = new Date().getFullYear()
    const { data: esistenti } = await supabase.from('invoices').select('invoice_number, invoice_type')
    const usati = (esistenti || []).filter(x => (x.invoice_type || 'fattura') === 'fattura').map(x => {
      const m = String(x.invoice_number || '').match(/^(\d+)\/(\d{4})$/)
      return m && Number(m[2]) === year ? Number(m[1]) : 0
    })
    const numero = (Math.max(0, ...usati) + 1) + '/' + year
    const inv = await supabase.from('invoices').insert({
      invoice_number: numero,
      sdi_status: 'bozza',
      client_id: cliente.id,
      invoice_type: 'fattura',
      oggetto: 'Interventi (' + scelti.length + ')',
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
    }).select().single()
    if (inv.error || !inv.data) { setBusy(false); return alert(inv.error?.message || 'Fattura non creata') }
    await supabase.from('invoice_items').insert(scelti.map(item => ({
      invoice_id: inv.data.id,
      name: format(parseISO(item.intervention_date), 'dd/MM/yyyy') + ' - ' + item.description,
      description: item.description,
      quantity: 1,
      unit_price: Number(item.amount || 0),
      vat_rate: 22,
    })))
    for (const item of scelti) {
      await supabase.from('interventions').update({ invoice_id: inv.data.id, invoice_number: numero, payment_type: 'fatturato' }).eq('id', item.id)
    }
    setBusy(false)
    setSelected([])
    carica(cliente.id)
    window.open('https://fatture-self.vercel.app/fattura/' + inv.data.id, '_blank')
  }

  const visibili = rows.filter(r => {
    if (filtro === 'da_fatturare') return !r.invoice_id && r.payment_type !== 'garanzia' && r.payment_type !== 'fatturato'
    if (filtro === 'non_pagato') return r.payment_type === 'da_fatturare' || r.payment_type === 'bonifico'
    return true
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Interventi</h1>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Scrivi almeno 2 lettere del cliente..." className="w-full border rounded-lg px-3 py-2" />
      {q.trim().length >= 2 ? (
        <div className="bg-white rounded-xl shadow divide-y">
          {trovati.map(c => (
            <button key={c.id} type="button" onClick={() => { setClientId(c.id); setQ(c.name) }} className={'block w-full text-left px-3 py-2 text-sm ' + (clientId === c.id ? 'bg-blue-50 font-medium' : '')}>{c.name}</button>
          ))}
        </div>
      ) : <p className="text-sm text-slate-500">Nessun elenco finche non cerchi</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFiltro('tutti')} className={'px-3 py-1.5 rounded-full text-sm ' + (filtro === 'tutti' ? 'bg-slate-900 text-white' : 'border')}>Tutti</button>
        <button type="button" onClick={() => setFiltro('da_fatturare')} className={'px-3 py-1.5 rounded-full text-sm ' + (filtro === 'da_fatturare' ? 'bg-amber-600 text-white' : 'border')}>Da fatturare</button>
        <button type="button" onClick={() => setFiltro('non_pagato')} className={'px-3 py-1.5 rounded-full text-sm ' + (filtro === 'non_pagato' ? 'bg-red-600 text-white' : 'border')}>Non pagato</button>
      </div>
      {cliente ? (
        <div className="space-y-3">
          <p className="font-semibold">{cliente.name} · {visibili.length} interventi</p>
          <button type="button" onClick={creaFattura} disabled={selected.length === 0 || busy} className="bg-violet-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40">
            {busy ? 'Creazione...' : 'Crea fattura (' + selected.length + ')'}
          </button>
          {visibili.map(item => (
            <Link key={item.id} to={'/client/' + cliente.id} className="block bg-white rounded-xl shadow p-4 space-y-1 hover:bg-slate-50">
              {item.payment_type === 'garanzia' ? <p className="text-xs text-slate-500">In garanzia, non si fattura</p> : item.invoice_id || item.payment_type === 'fatturato' ? <p className="text-xs text-green-700">Fatturato · {item.invoice_number || ''}</p> : (
                <label className="text-sm flex gap-2 items-center" onClick={e => e.preventDefault()}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /> Da fatturare</label>
              )}
              <p className="font-medium">{format(parseISO(item.intervention_date), 'dd/MM/yyyy')}</p>
              <p className="text-sm text-slate-600 break-words">{item.description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Ultimi 10 interventi</p>
          {ultimi.map(item => (
            <Link key={item.id} to={'/client/' + item.client_id} className="block bg-white rounded-xl shadow p-4 space-y-1 hover:bg-slate-50">
              <p className="font-medium">{format(parseISO(item.intervention_date), 'dd/MM/yyyy')} · {item.clients?.name || 'Senza cliente'}</p>
              <p className="text-sm text-slate-600">{item.description}</p>
              <p className="text-xs text-slate-500">{item.payment_type === 'fatturato' || item.invoice_id ? 'Fatturato' : item.payment_type === 'garanzia' ? 'In garanzia' : item.payment_type === 'da_fatturare' ? 'Da fatturare' : item.payment_type === 'pagato' ? 'Pagato' : item.payment_type || '-'}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}