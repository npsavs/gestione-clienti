import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, subYears } from 'date-fns'

export default function ModificaCliente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [cercaCliente, setCercaCliente] = useState('')
  const [nuovoClientId, setNuovoClientId] = useState('')
  const [pacchetti, setPacchetti] = useState(['Classic', 'Premium', 'Premium Plus', 'Medium', 'Basic', 'Nuovo Impianto'])
  const [impianti, setImpianti] = useState(['Ajax', 'Ademco', 'Altro'])

  const [form, setForm] = useState({
    name: '',
    alias: '',
    email: '',
    phone: '',
    notes: '',
    end_date: '',
    package_type: 'Classic',
    has_sim_wuarda: false,
    sim_count: 0,
    plant_type: 'Ajax',
    plant_type_other: '',
    subscription_id: '',
  })

  useEffect(() => {
    if (id) loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
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
    try {
      const { data: row } = await supabase.from('app_settings').select('value').eq('key', 'gestione').maybeSingle()
      if (Array.isArray(row?.value?.pacchetti)) setPacchetti(row.value.pacchetti)
      if (Array.isArray(row?.value?.impianti)) setImpianti(row.value.impianti)
    } catch {}
    const { data: client } = await supabase.from('clients').select('*').eq('id', id).single()
    const { data: sub } = await supabase.from('subscriptions').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (client) {
      setForm({
        name: client.name || '',
        alias: (client as any).alias || '',
        email: client.email || '',
        phone: client.phone || '',
        notes: client.notes || '',
        end_date: sub?.end_date || format(new Date(), 'yyyy-MM-dd'),
        package_type: (sub as any)?.package_type || 'Classic',
        has_sim_wuarda: (sub as any)?.has_sim_wuarda || false,
        sim_count: Number(((sub as any)?.notes || '').match(/SIM Wuarda: (\d+)/)?.[1] || 0),
        plant_type: (sub as any)?.plant_type || 'Ajax',
        plant_type_other: (sub as any)?.plant_type_other || '',
        subscription_id: sub?.id || '',
      })
    }
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error: clientError } = await supabase.from('clients').update({
      name: form.name,
      alias: form.alias || null,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
    }).eq('id', id)
    if (clientError) {
      alert('Errore aggiornamento cliente: ' + clientError.message)
      setSaving(false)
      return
    }
    const startDate = format(subYears(new Date(form.end_date), 1), 'yyyy-MM-dd')
    const dati = {
      end_date: form.end_date,
      start_date: startDate,
      package_type: form.package_type,
      has_sim_wuarda: form.sim_count > 0,
      notes: form.sim_count > 0 ? ('SIM Wuarda: ' + form.sim_count) : null,
      plant_type: form.plant_type,
      plant_type_other: form.plant_type === 'Altro' ? form.plant_type_other : null,
    }
    const clientIdFinale = nuovoClientId || id
    if (form.subscription_id) {
      await supabase.from('subscriptions').update({ ...dati, client_id: clientIdFinale }).eq('id', form.subscription_id)
    } else {
      await supabase.from('subscriptions').insert({ client_id: clientIdFinale, ...dati })
    }
    setSaving(false)
    navigate('/client/' + clientIdFinale)
  }

  if (loading) return <div className="text-center py-10">Caricamento...</div>

  return (
    <div className="max-w-xl mx-auto">
      <Link to={'/client/' + id} className="text-blue-600 text-sm">Torna al dettaglio</Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Modifica Cliente</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Cambia anagrafica (cerca tra i clienti salvati)</label>
          <input value={cercaCliente} onChange={e => setCercaCliente(e.target.value)} placeholder="Cerca cliente..." className="w-full border rounded-lg px-3 py-2 mb-2" />
          {cercaCliente.trim().length >= 2 ? (
            <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
              {clients.filter(c => c.name.toLowerCase().includes(cercaCliente.toLowerCase())).slice(0, 20).map(c => (
                <button key={c.id} type="button" onClick={() => { setNuovoClientId(c.id); setForm(f => ({ ...f, name: c.name })); setCercaCliente('') }} className={'block w-full text-left px-3 py-2 text-sm ' + (nuovoClientId === c.id ? 'bg-blue-50' : '')}>{c.name}</button>
              ))}
              {clients.filter(c => c.name.toLowerCase().includes(cercaCliente.toLowerCase())).length === 0 ? <p className="p-2 text-sm text-slate-500">Nessun cliente trovato</p> : null}
            </div>
          ) : null}
          {nuovoClientId && nuovoClientId !== id ? <p className="text-xs text-amber-700 mt-1">L abbonamento verrà spostato su questo cliente.</p> : null}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nome *</label>
          <input name="name" value={form.name} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Alias</label>
          <input name="alias" value={form.alias} onChange={handleChange} placeholder="Nome alternativo o soprannome" className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Telefono</label>
          <input name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Note generali</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border rounded-lg px-3 py-2" />
        </div>
        <h2 className="font-semibold text-lg">Abbonamento</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Data Scadenza *</label>
          <input name="end_date" type="date" value={form.end_date} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo Abbonamento</label>
          <select name="package_type" value={form.package_type} onChange={handleChange} className="w-full border rounded-lg px-3 py-2">
            {pacchetti.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Numero SIM Wuarda</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setForm(f => ({ ...f, sim_count: Math.max(0, f.sim_count - 1) }))} className="w-8 h-8 border rounded text-lg">−</button>
            <span className="w-10 text-center border rounded py-1">{form.sim_count}</span>
            <button type="button" onClick={() => setForm(f => ({ ...f, sim_count: f.sim_count + 1 }))} className="w-8 h-8 border rounded text-lg">+</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo Impianto</label>
          <select name="plant_type" value={form.plant_type} onChange={handleChange} className="w-full border rounded-lg px-3 py-2">
            {impianti.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {form.plant_type === 'Altro' ? (
          <div>
            <label className="block text-sm font-medium mb-1">Specifica tipo impianto</label>
            <input name="plant_type_other" value={form.plant_type_other} onChange={handleChange} className="w-full border rounded-lg px-3 py-2" />
          </div>
        ) : null}
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50">{saving ? 'Salvataggio...' : 'Salva modifiche'}</button>
          <button type="button" onClick={() => navigate('/client/' + id)} className="border px-6 py-2 rounded-lg">Annulla</button>
        </div>
      </form>
    </div>
  )
}