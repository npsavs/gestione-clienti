import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, subYears } from 'date-fns'

export default function NuovoCliente() {
  const navigate = useNavigate()
  const [modo, setModo] = useState<'abbonamento' | 'intervento' | ''>('')
  const [clients, setClients] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [clientId, setClientId] = useState('')
  const [nuovo, setNuovo] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [packageType, setPackageType] = useState('Classic')
  const [plantType, setPlantType] = useState('Ajax')
  const [plantOther, setPlantOther] = useState('')
  const [sim, setSim] = useState(false)
  const [dataIntervento, setDataIntervento] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [voci, setVoci] = useState([''])
  const [pagamento, setPagamento] = useState('pagato')
  const [importo, setImporto] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('clients').select('id, name, phone').order('name').then(({ data }) => setClients(data || []))
  }, [])

  const trovati = q.trim().length < 2 ? [] : clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
  const scelto = clients.find(c => c.id === clientId)

  async function assicuratiCliente() {
    if (clientId) return clientId
    if (!name.trim()) { alert('Scrivi il nome del nuovo cliente'); return '' }
    const ins = await supabase.from('clients').insert({ name: name.trim(), phone: phone || null, email: email || null, kind: 'cliente' }).select().single()
    if (ins.error || !ins.data) { alert(ins.error?.message || 'Cliente non creato'); return '' }
    return ins.data.id
  }

  async function salvaAbbonamento() {
    setBusy(true)
    const id = await assicuratiCliente()
    if (!id) { setBusy(false); return }
    const start = format(subYears(new Date(endDate), 1), 'yyyy-MM-dd')
    const { error } = await supabase.from('subscriptions').insert({
      client_id: id,
      start_date: start,
      end_date: endDate,
      package_type: packageType,
      has_sim_wuarda: sim,
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
            <button key={c.id} type="button" onClick={() => { setClientId(c.id); setNuovo(false) }} className={'block w-full text-left px-3 py-2 rounded ' + (clientId === c.id ? 'bg-blue-50 font-medium' : '')}>{c.name}</button>
          ))}
          {scelto ? <p className="text-sm text-green-700">Cliente: {scelto.name}</p> : null}
          <button type="button" onClick={() => { setNuovo(!nuovo); setClientId('') }} className="text-sm text-blue-600">Aggiungi cliente nuovo</button>
          {nuovo ? (
            <div className="space-y-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome *" className="w-full border rounded-lg px-3 py-2" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefono" className="w-full border rounded-lg px-3 py-2" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-lg px-3 py-2" />
            </div>
          ) : null}
          {modo === 'abbonamento' ? (
            <>
              <label className="text-sm">Data scadenza</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              <label className="text-sm">Tipo abbonamento</label>
              <select value={packageType} onChange={e => setPackageType(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option>Classic</option><option>Premium</option><option>Medium</option><option>Basic</option><option>Nuovo Impianto</option>
              </select>
              <label className="text-sm">Impianto</label>
              <select value={plantType} onChange={e => setPlantType(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option>Ajax</option><option>Ademco</option><option>Altro</option>
              </select>
              {plantType === 'Altro' ? <input value={plantOther} onChange={e => setPlantOther(e.target.value)} placeholder="Tipo impianto" className="w-full border rounded-lg px-3 py-2" /> : null}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sim} onChange={e => setSim(e.target.checked)} /> SIM Wuarda</label>
              <button type="button" disabled={busy} onClick={salvaAbbonamento} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Salva abbonamento</button>
            </>
          ) : (
            <>
              <label className="text-sm">Data</label>
              <input type="date" value={dataIntervento} onChange={e => setDataIntervento(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              <label className="text-sm">Pagamento</label>
              <select value={pagamento} onChange={e => setPagamento(e.target.value)} className="w-full border rounded-lg px-3 py-2">
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