import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { subYears, format } from 'date-fns'

export default function NuovoCliente() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    end_date: format(new Date(), 'yyyy-MM-dd'),
    package_type: 'Classic',
    has_sim_wuarda: false,
    plant_type: 'Ajax',
    plant_type_other: '',
    paid: false,
    auto_renew: false,
  })

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
    setLoading(true)

    // 1. Crea il cliente
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
      })
      .select()
      .single()

    if (clientError || !client) {
      alert('Errore nella creazione del cliente: ' + clientError?.message)
      setLoading(false)
      return
    }

    // 2. Calcola data inizio (1 anno prima della scadenza)
    const startDate = format(subYears(new Date(form.end_date), 1), 'yyyy-MM-dd')

    // 3. Crea l’abbonamento
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        client_id: client.id,
        start_date: startDate,
        end_date: form.end_date,
        paid: form.paid,
        package_type: form.package_type,
        has_sim_wuarda: form.has_sim_wuarda,
        plant_type: form.plant_type,
        plant_type_other: form.plant_type === 'Altro' ? form.plant_type_other : null,
auto_renew: form.auto_renew,
      })

    if (subError) {
      alert('Cliente creato ma errore sull’abbonamento: ' + subError.message)
    }

    setLoading(false)
    navigate(`/client/${client.id}`)
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nuovo Cliente</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
        {/* Dati Cliente */}
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

        {/* Data Scadenza */}
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

        {/* Tipo Abbonamento */}
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

        {/* SIM Wuarda */}
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

        {/* Tipo Impianto */}
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
              placeholder="Scrivi il tipo di impianto..."
            />
          </div>
        )}

        {/* Pagamento */}
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

        {/* Rinnovo automatico */}
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
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvataggio...' : 'Salva Cliente'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="border px-6 py-2 rounded-lg hover:bg-gray-50"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  )
}