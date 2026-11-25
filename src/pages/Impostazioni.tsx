import { useEffect, useState } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SEZIONI = [
  { id: 'abbonamenti', label: 'Abbonamenti' },
  { id: 'impianti', label: 'Impianti' },
  { id: 'colori', label: 'Colori' },
  { id: 'generale', label: 'Generale' },
]

function navClass({ isActive }: { isActive: boolean }) {
  return 'block w-full text-left px-3 py-2 rounded-lg text-sm ' + (isActive ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700')
}

export default function Impostazioni() {
  const { sezione } = useParams()
  const active = sezione || 'abbonamenti'
  if (sezione && !SEZIONI.some(s => s.id === sezione)) {
    return <Navigate to="/impostazioni/abbonamenti" replace />
  }
  if (!sezione) {
    return <Navigate to="/impostazioni/abbonamenti" replace />
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Impostazioni</h1>
      <div className="flex gap-4 items-start">
        <aside className="w-48 shrink-0 sticky top-4">
          <nav className="bg-white rounded-xl shadow p-2 space-y-1">
            {SEZIONI.map(s => (
              <NavLink key={s.id} to={'/impostazioni/' + s.id} className={navClass}>{s.label}</NavLink>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">
          {active === 'abbonamenti' ? <SezioneAbbonamenti /> : null}
          {active === 'impianti' ? <SezioneImpianti /> : null}
          {active === 'colori' ? <SezioneColori /> : null}
          {active === 'generale' ? <SezioneGenerale /> : null}
        </div>
      </div>
    </div>
  )
}

function useSettings() {
  const [data, setData] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const { data: row } = await supabase.from('app_settings').select('value').eq('key', 'gestione').maybeSingle()
      if (row?.value) setData(row.value)
      else setData({})
    } catch {
      setData({})
    }
  }

  useEffect(() => { load() }, [])

  async function save(value: any) {
    setBusy(true)
    setMsg('')
    try {
      localStorage.setItem('nps_gestione_settings', JSON.stringify(value))
      const { error } = await supabase.from('app_settings').upsert({ key: 'gestione', value }, { onConflict: 'key' })
      if (error) setMsg('Salvato in locale. Su Supabase: ' + error.message)
      else setMsg('Salvato')
      setData(value)
    } catch (e: any) {
      setMsg('Errore: ' + (e.message || e))
    }
    setBusy(false)
  }

  return { data, save, msg, busy, load }
}

function SezioneAbbonamenti() {
  const { data, save, msg, busy } = useSettings()
  const [nuovo, setNuovo] = useState('')
  const lista: string[] = Array.isArray(data?.pacchetti) ? data.pacchetti : ['Classic', 'Premium', 'Premium Plus', 'Medium', 'Basic', 'Nuovo Impianto']

  if (!data) return <p>Caricamento...</p>

  async function aggiungi() {
    const v = nuovo.trim()
    if (!v || lista.includes(v)) return
    await save({ ...data, pacchetti: [...lista, v] })
    setNuovo('')
  }

  async function rimuovi(i: number) {
    if (!confirm('Rimuovere questo tipo?')) return
    await save({ ...data, pacchetti: lista.filter((_, j) => j !== i) })
  }

  async function rinomina(i: number, v: string) {
    if (!v.trim() || v === lista[i]) return
    const next = [...lista]
    next[i] = v.trim()
    await save({ ...data, pacchetti: next })
  }

  return (
    <div className="space-y-4">
      {msg ? <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{msg}</p> : null}
      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold text-lg">Tipi di abbonamento</h2>
        <p className="text-sm text-slate-500">Aggiungi, rinomina o elimina i tipi. Compariranno nei menu e nei filtri.</p>
        <div className="flex flex-wrap gap-2">
          <input value={nuovo} onChange={e => setNuovo(e.target.value)} placeholder="Nuovo tipo" className="border rounded-lg px-3 py-2 flex-1 min-w-[160px]" />
          <button type="button" onClick={aggiungi} disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Aggiungi</button>
        </div>
        <div className="divide-y border rounded-lg">
          {lista.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3">
              <input defaultValue={p} onBlur={e => rinomina(i, e.target.value)} className="border rounded px-2 py-1 flex-1 min-w-[140px]" />
              <button type="button" onClick={() => rimuovi(i)} className="text-sm text-red-600">Elimina</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function SezioneImpianti() {
  const { data, save, msg, busy } = useSettings()
  const [nuovo, setNuovo] = useState('')
  const lista: string[] = Array.isArray(data?.impianti) ? data.impianti : ['Ajax', 'Ademco', 'Altro']

  if (!data) return <p>Caricamento...</p>

  async function aggiungi() {
    const v = nuovo.trim()
    if (!v || lista.includes(v)) return
    await save({ ...data, impianti: [...lista, v] })
    setNuovo('')
  }

  async function rimuovi(i: number) {
    if (!confirm('Rimuovere questo tipo?')) return
    await save({ ...data, impianti: lista.filter((_, j) => j !== i) })
  }

  async function rinomina(i: number, v: string) {
    if (!v.trim() || v === lista[i]) return
    const next = [...lista]
    next[i] = v.trim()
    await save({ ...data, impianti: next })
  }

  return (
    <div className="space-y-4">
      {msg ? <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{msg}</p> : null}
      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold text-lg">Tipi di impianto</h2>
        <p className="text-sm text-slate-500">Aggiungi o modifica i tipi di impianto usati negli abbonamenti.</p>
        <div className="flex flex-wrap gap-2">
          <input value={nuovo} onChange={e => setNuovo(e.target.value)} placeholder="Nuovo tipo impianto" className="border rounded-lg px-3 py-2 flex-1 min-w-[160px]" />
          <button type="button" onClick={aggiungi} disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Aggiungi</button>
        </div>
        <div className="divide-y border rounded-lg">
          {lista.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3">
              <input defaultValue={p} onBlur={e => rinomina(i, e.target.value)} className="border rounded px-2 py-1 flex-1 min-w-[140px]" />
              <button type="button" onClick={() => rimuovi(i)} className="text-sm text-red-600">Elimina</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function SezioneColori() {
  const { data, save, msg, busy } = useSettings()
  const colori = data?.colori_tipo || {
    'Classic': 'bg-blue-100 text-blue-800',
    'Premium': 'bg-purple-100 text-purple-800',
    'Premium Plus': 'bg-amber-100 text-amber-800',
    'Medium': 'bg-teal-100 text-teal-800',
    'Basic': 'bg-slate-200 text-slate-700',
    'Nuovo Impianto': 'bg-green-100 text-green-800',
  }
  const lista: string[] = Array.isArray(data?.pacchetti) ? data.pacchetti : Object.keys(colori)

  if (!data) return <p>Caricamento...</p>

  function setColore(tipo: string, classe: string) {
    save({ ...data, colori_tipo: { ...colori, [tipo]: classe } })
  }

  const OPZIONI = [
    { id: 'bg-blue-100 text-blue-800', label: 'Blu' },
    { id: 'bg-purple-100 text-purple-800', label: 'Viola' },
    { id: 'bg-amber-100 text-amber-800', label: 'Ambra' },
    { id: 'bg-teal-100 text-teal-800', label: 'Teal' },
    { id: 'bg-green-100 text-green-800', label: 'Verde' },
    { id: 'bg-red-100 text-red-800', label: 'Rosso' },
    { id: 'bg-slate-200 text-slate-700', label: 'Grigio' },
    { id: 'bg-orange-100 text-orange-800', label: 'Arancio' },
  ]

  return (
    <div className="space-y-4">
      {msg ? <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{msg}</p> : null}
      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold text-lg">Colori tipi di abbonamento</h2>
        <p className="text-sm text-slate-500">Scegli il colore di ogni tipo. Si aggiorna in tutte le pagine.</p>
        {lista.map(tipo => (
          <div key={tipo} className="flex flex-wrap items-center gap-3 py-2 border-b last:border-0">
            <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (colori[tipo] || 'bg-gray-100 text-gray-700')}>{tipo}</span>
            <select value={colori[tipo] || ''} onChange={e => setColore(tipo, e.target.value)} disabled={busy} className="border rounded px-2 py-1 text-sm">
              <option value="">Predefinito</option>
              {OPZIONI.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </section>
    </div>
  )
}

function SezioneGenerale() {
  const { data, save, msg, busy } = useSettings()
  const [note, setNote] = useState('')

  useEffect(() => {
    if (data) setNote(data.note_generali || '')
  }, [data])

  if (!data) return <p>Caricamento...</p>

  return (
    <div className="space-y-4">
      {msg ? <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{msg}</p> : null}
      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold text-lg">Note generali</h2>
        <p className="text-sm text-slate-500">Testo libero che puoi usare come promemoria interno.</p>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} className="w-full border rounded-lg px-3 py-2" />
        <button type="button" disabled={busy} onClick={() => save({ ...data, note_generali: note })} className="bg-slate-900 text-white px-4 py-2 rounded-lg">Salva</button>
      </section>
      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold text-lg">Altre impostazioni future</h2>
        <p className="text-sm text-slate-500">Qui potrai aggiungere in seguito: campi personalizzati, regole di rinnovo, messaggi automatici, ecc.</p>
      </section>
    </div>
  )
}
