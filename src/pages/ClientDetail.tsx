import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO, addYears, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Client, Subscription, Intervention } from '../types'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [client, setClient] = useState<Client | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)

  const [newIntervention, setNewIntervention] = useState({
    intervention_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  })
  const [savingIntervention, setSavingIntervention] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    intervention_date: '',
    description: '',
  })

  useEffect(() => {
    if (id) loadData()
  }, [id])

  async function loadData() {
    setLoading(true)

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: intData } = await supabase
      .from('interventions')
      .select('*')
      .eq('client_id', id)
      .order('intervention_date', { ascending: false })

    setClient(clientData)
    setSubscription(subData)
    setInterventions(intData || [])
    setLoading(false)
  }

  async function handleRenew() {
    if (!subscription) return
    if (!confirm('Vuoi rinnovare l\'abbonamento di 1 anno?')) return

    const newEndDate = format(addYears(parseISO(subscription.end_date), 1), 'yyyy-MM-dd')

    const { error } = await supabase
      .from('subscriptions')
      .update({ end_date: newEndDate })
      .eq('id', subscription.id)

    if (error) {
      alert('Errore durante il rinnovo: ' + error.message)
    } else {
      alert('Abbonamento rinnovato fino al ' + format(parseISO(newEndDate), 'dd/MM/yyyy'))
      loadData()
    }
  }

  async function handleAddIntervention(e: React.FormEvent) {
    e.preventDefault()
    if (!newIntervention.description.trim()) return

    setSavingIntervention(true)

    const { error } = await supabase.from('interventions').insert({
      client_id: id,
      intervention_date: newIntervention.intervention_date,
      description: newIntervention.description,
    })

    if (error) {
      alert('Errore: ' + error.message)
    } else {
      setNewIntervention({
        intervention_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
      })
      loadData()
    }

    setSavingIntervention(false)
  }

  async function handleDeleteIntervention(interventionId: string) {
    if (!confirm('Vuoi eliminare questo intervento?')) return

    const { error } = await supabase
      .from('interventions')
      .delete()
      .eq('id', interventionId)

    if (error) {
      alert('Errore durante l\'eliminazione: ' + error.message)
    } else {
      loadData()
    }
  }

  function startEdit(item: Intervention) {
    setEditingId(item.id)
    setEditForm({
      intervention_date: item.intervention_date,
      description: item.description,
    })
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return

    const { error } = await supabase
      .from('interventions')
      .update({
        intervention_date: editForm.intervention_date,
        description: editForm.description,
      })
      .eq('id', editingId)

    if (error) {
      alert('Errore durante la modifica: ' + error.message)
    } else {
      setEditingId(null)
      loadData()
    }
  }

  function getStatus(sub: Subscription | null) {
    if (!sub) return { label: 'Nessun abbonamento', color: 'bg-gray-200 text-gray-700' }

    const daysLeft = differenceInDays(parseISO(sub.end_date), new Date())

    if (daysLeft < 0) return { label: 'Scaduto', color: 'bg-red-100 text-red-700' }
    if (daysLeft <= 30) return { label: `In scadenza (${daysLeft} gg)`, color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Attivo', color: 'bg-green-100 text-green-700' }
  }

  function getWhatsAppLink() {
    if (!client?.phone || !subscription) return null

    const cleanPhone = client.phone.replace(/\D/g, '').replace(/^39/, '')
    const message = `Ciao ${client.name}, ti ricordiamo che il tuo abbonamento scade il ${format(parseISO(subscription.end_date), 'dd/MM/yyyy')}. Contattaci per il rinnovo. Grazie!`

    return `https://wa.me/39${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  if (loading) return <div className="text-center py-10">Caricamento...</div>
  if (!client) return <div className="text-center py-10">Cliente non trovato</div>

  const status = getStatus(subscription)
  const whatsappLink = getWhatsAppLink()

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Intestazione */}
      <div className="flex justify-between items-start">
        <div>
          <Link to="/" className="text-blue-600 text-sm hover:underline">
            ← Torna alla lista
          </Link>
          <h1 className="text-2xl font-bold mt-1">{client.name}</h1>
          <p className="text-gray-600">
            {client.email || 'Nessuna email'} · {client.phone || 'Nessun telefono'}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/client/${client.id}/modifica`}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm"
          >
            Modifica
          </Link>

          <button
            onClick={async () => {
              if (!confirm('Sei sicuro di voler eliminare questo cliente? Questa azione non si può annullare.')) return

              const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', client.id)

              if (error) {
                alert('Errore durante l\'eliminazione: ' + error.message)
              } else {
                navigate('/')
              }
            }}
            className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm"
          >
            Elimina
          </button>
        </div>
      </div>

      {/* Abbonamento */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Abbonamento</h2>
          <span className={`text-sm px-3 py-1 rounded-full ${status.color}`}>
            {status.label}
          </span>
        </div>

        {subscription ? (
          <div className="space-y-2 text-sm">
            <p><strong>Tipo:</strong> {subscription.package_type || '—'}</p>
            <p><strong>Scadenza:</strong> {format(parseISO(subscription.end_date), 'dd MMMM yyyy', { locale: it })}</p>
            <p><strong>SIM Wuarda:</strong> {subscription.has_sim_wuarda ? 'Sì' : 'No'}</p>
            <p>
              <strong>Impianto:</strong>{' '}
              {subscription.plant_type}
              {subscription.plant_type === 'Altro' && subscription.plant_type_other
                ? ` (${subscription.plant_type_other})`
                : ''}
            </p>

            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleRenew}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Rinnova di 1 anno
              </button>

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600"
                >
                  Invia WhatsApp
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Nessun abbonamento attivo</p>
        )}
      </div>

      {/* Note generali */}
      {client.notes && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Note generali</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Storico Interventi */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Storico Interventi</h2>

        <form onSubmit={handleAddIntervention} className="mb-6 space-y-3 border-b pb-6">
          <div className="flex gap-3">
            <input
              type="date"
              value={newIntervention.intervention_date}
              onChange={e => setNewIntervention(prev => ({ ...prev, intervention_date: e.target.value }))}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="text"
              placeholder="Descrizione intervento..."
              value={newIntervention.description}
              onChange={e => setNewIntervention(prev => ({ ...prev, description: e.target.value }))}
              className="flex-1 border rounded-lg px-3 py-2"
              required
            />
            <button
              type="submit"
              disabled={savingIntervention}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Aggiungi
            </button>
          </div>
        </form>

        {interventions.length === 0 ? (
          <p className="text-gray-500">Nessun intervento registrato</p>
        ) : (
          <div className="space-y-4">
            {interventions.map(item => (
              <div key={item.id} className="border-l-4 border-blue-500 pl-4 py-2">
                {editingId === item.id ? (
                  <form onSubmit={handleSaveEdit} className="space-y-2">
                    <input
                      type="date"
                      value={editForm.intervention_date}
                      onChange={e => setEditForm(prev => ({ ...prev, intervention_date: e.target.value }))}
                      className="border rounded-lg px-3 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-1.5 text-sm"
                      required
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                        Salva
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="border px-3 py-1 rounded text-sm"
                      >
                        Annulla
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">
                        {format(parseISO(item.intervention_date), 'dd MMMM yyyy', { locale: it })}
                      </p>
                      <p className="text-gray-800">{item.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => handleDeleteIntervention(item.id)}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
