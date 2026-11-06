import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { parseISO, format } from 'date-fns'
import { it } from 'date-fns/locale'

function nSim(s: any) {
  return Number((s?.notes || '').match(/SIM Wuarda: (\d+)/)?.[1] || 0)
}

function colorePacchetto(tipo?: string) {
  switch (tipo) {
    case 'Classic':        return 'bg-yellow-300 text-yellow-900'
    case 'Basic':          return 'bg-green-300 text-green-900'
    case 'Premium':        return 'bg-purple-400 text-white'
    case 'Medium':         return 'bg-sky-300 text-sky-900'
    case 'Premium Plus':   return 'bg-purple-700 text-white'
    case 'Nuovo Impianto': return 'bg-green-700 text-white'
    default:               return 'bg-gray-300 text-gray-800'
  }
}

export default function Home() {
  const [clients, setClients] = useState<any[]>([])
  const [subs, setSubs] = useState<any[]>([])
  const [interventi, setInterventi] = useState<any[]>([])
  const [filtro, setFiltro] = useState('scadenza')
  const [soloSim, setSoloSim] = useState(false)
  const [mostraInterventi, setMostraInterventi] = useState(false)

  useEffect(() => {
    async function carica() {
      const tutti: any[] = []
      let start = 0
      while (true) {
        const { data } = await supabase.from('clients').select('id, name, phone, email').order('name').range(start, start + 999)
        if (!data || data.length === 0) break
        tutti.push(...data)
        if (data.length < 1000) break
        start += 1000
      }
      setClients(tutti)
      const { data: s } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
      const ultimi: any[] = []
      const visti = new Set()
      for (const sub of s || []) {
        if (!visti.has(sub.client_id)) {
          visti.add(sub.client_id)
          ultimi.push(sub)
        }
      }
      setSubs(ultimi)
      const { data: i } = await supabase.from('interventions').select('*, clients(name)').order('created_at', { ascending: false })
      setInterventi(i || [])
    }
    carica()
  }, [])

  const byClient = Object.fromEntries(clients.map(c => [c.id, c]))

  function gruppo(s: any) {
    const end = parseISO(s.end_date)
    const now = new Date()
    const inizioMese = new Date(end.getFullYear(), end.getMonth(), 1)
    const fineMese = new Date(end.getFullYear(), end.getMonth() + 1, 1)
    if (now >= fineMese) return 'scaduti'
    if (now >= inizioMese) return 'scadenza'
    return 'attivi'
  }

  const conAbb = subs.filter(s => s.end_date && byClient[s.client_id])
  const attivi = conAbb.filter(s => gruppo(s) === 'attivi')
  const scadenza = conAbb.filter(s => gruppo(s) === 'scadenza')
  const scaduti = conAbb.filter(s => gruppo(s) === 'scaduti')
  const perStato = filtro === 'attivi' ? attivi : filtro === 'scaduti' ? scaduti : scadenza
  const lista = soloSim ? perStato.filter(s => nSim(s) > 0) : perStato

  const totSimAttivi = attivi.reduce((s, x) => s + nSim(x), 0)
  const totSimScadenza = scadenza.reduce((s, x) => s + nSim(x), 0)
  const totSimScaduti = scaduti.reduce((s, x) => s + nSim(x), 0)
  const totSimCorrente = perStato.reduce((s, x) => s + nSim(x), 0)

  const daFatturare = interventi.filter(i => !i.invoice_id && i.payment_type !== 'garanzia' && i.payment_type !== 'fatturato')

  async function cambiaStato(id: string, stato: string) {
    await supabase.from('interventions').update({ payment_type: stato }).eq('id', id)
    setInterventi(prev => prev.map(i => i.id === id ? { ...i, payment_type: stato } : i))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Panoramica abbonamenti</h1>
        <button type="button" onClick={() => window.location.reload()} className="text-sm border px-3 py-1 rounded-lg">Aggiorna</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-slate-500">In scadenza questo mese</p>
          <p className="text-2xl font-bold">{scadenza.length}</p>
        </div>
        <button type="button" onClick={() => setMostraInterventi(!mostraInterventi)} className="bg-white rounded-xl shadow p-4 text-left">
          <p className="text-xs text-slate-500">Interventi da fatturare</p>
          <p className="text-2xl font-bold">{daFatturare.length}</p>
        </button>
      </div>
      {mostraInterventi ? (
        <div className="bg-white rounded-xl shadow divide-y">
          <p className="p-3 font-semibold text-sm">Interventi da fatturare</p>
          {daFatturare.length === 0 ? <p className="p-4 text-sm text-slate-500">Nessuno</p> : null}
          {daFatturare.map(i => (
            <div key={i.id} className="px-4 py-3 space-y-1">
              <p className="font-medium">{format(parseISO(i.intervention_date), 'dd/MM/yyyy')} · {i.clients?.name || 'Cliente'}</p>
              <p className="text-sm text-slate-600">{i.description}</p>
              <select value={i.payment_type || 'da_fatturare'} onChange={e => cambiaStato(i.id, e.target.value)} className="text-sm border rounded px-2 py-1">
                <option value="da_fatturare">Da fatturare</option>
                <option value="pagato">Pagato</option>
                <option value="pos">Pagato con POS</option>
                <option value="bonifico">Paga con bonifico</option>
                <option value="garanzia">In garanzia</option>
                <option value="fatturato">Fatturato</option>
              </select>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFiltro('attivi')} className={'px-4 py-2 rounded-full text-sm ' + (filtro === 'attivi' ? 'bg-green-600 text-white' : 'bg-white border')}>Attivi ({attivi.length}) · SIM {totSimAttivi}</button>
        <button type="button" onClick={() => setFiltro('scadenza')} className={'px-4 py-2 rounded-full text-sm ' + (filtro === 'scadenza' ? 'bg-yellow-500 text-white' : 'bg-white border')}>In scadenza ({scadenza.length}) · SIM {totSimScadenza}</button>
        <button type="button" onClick={() => setFiltro('scaduti')} className={'px-4 py-2 rounded-full text-sm ' + (filtro === 'scaduti' ? 'bg-red-600 text-white' : 'bg-white border')}>Scaduti ({scaduti.length}) · SIM {totSimScaduti}</button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" onClick={() => setSoloSim(!soloSim)} className={'px-4 py-2 rounded-full text-sm ' + (soloSim ? 'bg-slate-800 text-white' : 'bg-white border')}>
          {soloSim ? 'Solo con SIM' : 'Tutti'} · SIM totali: {totSimCorrente}
        </button>
      </div>
      <div className="space-y-2">
        {lista.length === 0 ? <p className="p-4 text-sm text-slate-500 bg-white rounded-xl">Nessun cliente in questo filtro</p> : null}
        {lista.map(s => {
          const n = nSim(s)
          const stato = gruppo(s)
          const cardBg =
            stato === 'attivi'   ? 'bg-green-600 text-white' :
            stato === 'scadenza' ? 'bg-yellow-400 text-yellow-950' :
            'bg-red-600 text-white'
          const client = byClient[s.client_id]

          return (
            <Link key={s.id} to={'/client/' + s.client_id} className={`block rounded-xl shadow p-4 space-y-2 ${cardBg}`}>
              <div className="flex justify-between items-start gap-2">
                <p className="font-semibold text-lg">{client?.name || 'Cliente'}</p>
                {s.package_type && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${colorePacchetto(s.package_type)}`}>
                    {s.package_type.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-sm opacity-90">
                <span>{format(parseISO(s.end_date), 'dd/MM/yyyy')}</span>
                <span className="font-medium">{stato === 'attivi' ? 'CONTRATTI ATTIVI' : stato === 'scadenza' ? 'IN SCADENZA' : 'SCADUTI'}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {s.plant_type && (
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white font-medium">
                    {s.plant_type.toUpperCase()}
                  </span>
                )}
                {n > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500 text-white font-medium">
                    SIM WUARDA {n}
                  </span>
                )}
                {client?.phone && <span className="text-xs opacity-90">{client.phone}</span>}
              </div>
              {client?.email && <p className="text-xs opacity-80 break-words">{client.email}</p>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}