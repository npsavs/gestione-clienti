import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, addYears, subYears } from 'date-fns'

export default function NuovoCliente() {
  const navigate = useNavigate()
  const [modo, setModo] = useState<'abbonamento' | 'intervento' | ''>('')
  const [clients, setClients] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [clientId, setClientId] = useState('')
  const [nuovo, setNuovo] = useState(false)
  const [fittizio, setFittizio] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [packageType, setPackageType] = useState('Classic')
  const [plantType, setPlantType] = useState('Ajax')
  const [plantOther, setPlantOther] = useState('')
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [sim, setSim] = useState(0)
  const [dataIntervento, setDataIntervento] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [pagamento, setPagamento] = useState('da_fatturare')
  const [importo, setImporto] = useState('')
  const [voci, setVoci] = useState([''])
  const [busy, setBusy] = useState(false)
  const [haAbbonamento, setHaAbbonamento] = useState(false)

  async function scegliCliente(id: string) {
    setClientId(id)
    setNuovo(false)
    const { data } = await supabase.from('subscriptions').select('id').eq('client_id', id).limit(1)
    setHaAbbonamento(!!(data && data.length))
  }

  useEffect(() => {
    async function carica() {
      const tutti: any[] = []
      let start = 0
      while (true) {
        const { data } = await supabase.from('clients').select('id, name, phone').order('name').range(start, start + 999)
        if (!data || data.length === 0) break
        tutti.push(...data)
        if (data.length < 1000) break
        start += 1000
      }
      setClients(tutti)
    }
    carica()
  }, [])

  const trovati = q.trim().length < 2 ? [] : clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
  const scelto = clients.find(c => c.id === clientId)

  async function assicuratiCliente() {
    if (clientId) return clientId
    if (!name.trim()) { alert('Scrivi il nome'); return '' }
    const esistente = clients.find(c => c.name.toLowerCase() === name.trim().toLowerCase())
    if (esistente && !fittizio) {
      alert('Questo cliente esiste già in anagrafica: ' + esistente.name + '. Selezionalo dalla ricerca.')
      return ''
    }
    const ins = await supabase.from('clients').insert({
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      kind: fittizio ? 'fittizio' : 'cliente',
      notes: fittizio ? 'FITTIZIO' : null,
    }).select().single()
    if (ins.error || !ins.data) { alert(ins.error?.message || 'Cliente non creato'); return '' }
    return ins.data.id
  }

  async function salvaAbbonamento() {
    if (haAbbonamento) return alert('Abbonamento già presente')
    setBusy(true)
    const id = await assicuratiCliente()
    if (!id) { setBusy(false); return }
    const start = format(subYears(new Date(endDate), 1), 'yyyy-MM-dd')
    const { error } = await supabase.from('subscriptions').insert({
      client_id: id,
      start_date: start,
      end_date: endDate,
      package_type: packageType,
      has_sim_wuarda: sim > 0,
      notes: sim > 0 ? ('SIM Wuarda: ' + sim) : null,
      plant_type: plantType,
      plant_type_other: plantType === 'Altro' ? plantOther : null,
    })
    setBusy(false)
    if (error) return alert(error.message)
    navigate('/client/' + id)
  }

  async function salvaIntervento() {
    const descrizioni = voci.map(v => v.trim()).filter(Boolean)
    if (!descrizioni.length) return alert('Scrivi almeno una descrizione')
    setBusy(true)
    const id = await assicuratiCliente()
    if (!id) { setBusy(false); return }
    const { error } = await supabase.from('interventions').insert(descrizioni.map(description => ({
      client_id: id,
      intervention_date: dataIntervento,
      description,
      payment_type: pagamento,
      amount: pagamento === 'garanzia' ? 0 : Number(importo || 0),
    })))
    setBusy(false)
    if (error) return alert(error.message)
    navigate('/interventi')
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Nuovo</h1>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setModo('abbonamento')} className={'px-4 py-2 rounded-lg ' + (modo === 'abbonamento' ? 'bg-blue-600 text-white' : 'border bg-white')}>Crea abbonamento</button>
        <button type="button" onClick={() => setModo('intervento')} className={'px-4 py-2 rounded-lg ' + (modo === 'intervento' ? 'bg-blue-600 text-white' : 'border bg-white')}>Crea intervento</button>
      </div>
      {modo ? (
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca cliente, almeno 2 lettere..." className="w-full border rounded-lg px-3 py-2" />
          {trovati.map(c => (
            <button key={c.id} type="button" onClick={() => scegliCliente(c.id)} className={'block w-full text-left px-3 py-2 rounded ' + (clientId === c.id ? 'bg-blue-50 font-medium' : '')}>{c.name}</button>
          ))}
          {scelto ? <p className="text-sm text-green-700">Cliente: {scelto.name}</p> : null}
          {haAbbonamento && modo === 'abbonamento' ? <p className="text-sm text-red-600 font-medium">Abbonamento già presente</p> : null}
          <button type="button" onClick={() => { setNuovo(!nuovo); setClientId(''); setFittizio(false) }} className="text-sm text-blue-600">Aggiungi cliente nuovo</button>
          <button type="button" onClick={() => { setFittizio(!fittizio); setNuovo(true); setClientId('') }} className={'text-sm ' + (fittizio ? 'text-amber-600 font-medium' : 'text-slate-500')}>Nome fittizio (non in anagrafica)</button>
          {nuovo || fittizio ? (
            <div className="space-y-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder={fittizio ? 'Nome fittizio *' : 'Nome *'} className="w-full border rounded-lg px-3 py-2" />
              {!fittizio ? (
                <>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefono" className="w-full border rounded-lg px-3 py-2" />
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-lg px-3 py-2" />
                </>
              ) : null}
            </div>
          ) : null}
          {modo === 'abbonamento' ? (
            <>
              <label className="text-sm">Data scadenza</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              <label className="text-sm">Tipo abbonamento</label>
              <select value={packageType} onChange={e => setPackageType(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option>Classic</option><option>Premium</option><option>Premium Plus</option><option>Medium</option><option>Basic</option><option>Nuovo Impianto</option>
              </select>
              <label className="text-sm">Impianto</label>
              <select value={plantType} onChange={e => setPlantType(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option>Ajax</option><option>Ademco</option><option>Altro</option>
              </select>
              {plantType === 'Altro' ? <input value={plantOther} onChange={e => setPlantOther(e.target.value)} placeholder="Tipo impianto" className="w-full border rounded-lg px-3 py-2" /> : null}
              <label className="text-sm">Numero SIM Wuarda</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSim(s => Math.max(0, s - 1))} className="w-8 h-8 border rounded text-lg">−</button>
                <span className="w-10 text-center border rounded py-1">{sim}</span>
                <button type="button" onClick={() => setSim(s => s + 1)} className="w-8 h-8 border rounded text-lg">+</button>
              </div>
              <button type="button" disabled={busy} onClick={salvaAbbonamento} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Salva abbonamento</button>
            </>
          ) : (
            <>
              <label className="text-sm">Data intervento</label>
              <input type="date" value={dataIntervento} onChange={e => setDataIntervento(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              <label className="text-sm">Metodo di pagamento</label>
              <select value={pagamento} onChange={e => setPagamento(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option value="da_fatturare">Da fatturare</option>
                <option value="garanzia">In garanzia</option>
                <option value="pagato">Pagato</option>
                <option value="pos">Pagato con POS</option>
                <option value="bonifico">Paga con bonifico</option>
              </select>
              <label className="text-sm">Importo EUR</label>
              <input type="number" step="0.01" value={importo} onChange={e => setImporto(e.target.value)} placeholder="0.00" className="w-full border rounded-lg px-3 py-2" />
              {voci.map((v, i) => (
                <input key={i} value={v} onChange={e => setVoci(prev => prev.map((x, n) => n === i ? e.target.value : x))} placeholder={'Descrizione ' + (i + 1)} className="w-full border rounded-lg px-3 py-2" />
              ))}
              <button type="button" onClick={() => setVoci(prev => [...prev, ''])} className="text-sm text-blue-600">Aggiungi un altro intervento dello stesso giorno</button>
              <button type="button" disabled={busy} onClick={salvaIntervento} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Salva intervento</button>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
