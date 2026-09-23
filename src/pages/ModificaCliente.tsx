import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, subYears } from 'date-fns'

export default function ModificaCliente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    end_date: '',
    package_type: 'Classic',
    has_sim_wuarda: false,
    plant_type: 'Ajax',
    plant_type_other: '',
    paid: false,
    auto_renew: false,
    subscription_id: '',
  })

  useEffect(() => {
    if (id) loadData()
  }, [id])

  async function loadData() {
    setLoading(true)

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (client) {
      setForm({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        notes: client.notes || '',
        end_date: sub?.end_date || format(new Date(), 'yyyy-MM-dd'),
        package_type: (sub as any)?.package_type || 'Classic',
        has_sim_wuarda: (sub as any)?.has_sim_wuarda || false,
        plant_type: (sub as any)?.plant_type || 'Ajax',
        plant_type_other: (sub as any)?.plant_type_other || '',
        paid: sub?.paid || false,
        auto_renew: (sub as any)?.auto_renew || false,
        subscription_id: sub?.id || '',
      })
    }

    setLoading(false)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { error: clientError } = await supabase
      .from('clients')
      .update({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
      })
      .eq('id', id)

    if (clientError) {
      alert('Errore aggiornamento cliente: ' + clientError.message)
      setSaving(false)
      return
    }

    const startDate = format(subYears(new Date(form.end_date), 1), 'yyyy-MM-dd')

    if (form.subscription_id) {
      await supabase
        .from('subscriptions')
        .update({
          end_date: form.end_date,
          start_date: startDate,
          paid: form.paid,
          package_type: form.package_type,
          has_sim_wuarda: form.has_sim_wuarda,
          plant_type: form.plant_type,
          plant_type_other: form.plant_type === 'Altro' ? form.plant_type_other : null,
          auto_renew: form.auto_renew,
        })
        .eq('id', form.subscription_id)
    } else {
      await supabase.from('subscriptions').insert({
        client_id: id,
        start_date: startDate,
        end_date: form.end_date,
        paid: form.paid,
        package_type: form.package_type,
        has_sim_wuarda: form.has_sim_wuarda,
        plant_type: form.plant_type,
        plant_type_other: form.plant_type === 'Altro' ? form.plant_type_other : null,
        auto_renew: form.auto_renew,
      })
    }

    setSaving(false)
    navigate(`/client/${id}`)
  }

  if (loading) {
    return <div className="text-center py-10">Caricamento...</div>
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link to={`/client/${id}`} className="text-blue-600 text-sm hover:underline">
        ← Torna al dettaglio
      </Link>

      <h1 className="text-2xl font-bold mt-2 mb-6">Modifica Cliente</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Telefono</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Note generali</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={2}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <hr className="my-4" />

        <h2 className="font-semibold text-lg">Abbonamento</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Data Scadenza *</label>
          <input
            name="end_date"
            type="date"
            value={form.end_date}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tipo Abbonamento</label>
          <select
            name="package_type"
            value={form.package_type}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="Classic">Classic</option>
            <option value="Premium">Premium</option>
            <option value="Medium">Medium</option>
            <option value="Basic">Basic</option>
            <option value="Nuovo Impianto">Nuovo Impianto</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            name="has_sim_wuarda"
            type="checkbox"
            checked={form.has_sim_wuarda}
            onChange={handleChange}
            id="sim"
          />
          <label htmlFor="sim">SIM Wuarda</label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tipo Impianto</label>
          <select
            name="plant_type"
            value={form.plant_type}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="Ajax">Ajax</option>
            <option value="Ademco">Ademco</option>
            <option value="Altro">Altro tipo</option>
          </select>
        </div>

        {form.plant_type === 'Altro' && (
          <div>
            <label className="block text-sm font-medium mb-1">Specifica tipo impianto</label>
            <input
              name="plant_type_other"
              value={form.plant_type_other}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            name="paid"
            type="checkbox"
            checked={form.paid}
            onChange={handleChange}
            id="paid"
          />
          <label htmlFor="paid">Pagamento ricevuto</label>
        </div>

        <div className="flex items-center gap-2">
          <input
            name="auto_renew"
            type="checkbox"
            checked={form.auto_renew}
            onChange={handleChange}
            id="auto_renew"
          />
          <label htmlFor="auto_renew">Rinnovo automatico (ogni anno)</label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/client/${id}`)}
            className="border px-6 py-2 rounded-lg hover:bg-gray-50"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  )
}