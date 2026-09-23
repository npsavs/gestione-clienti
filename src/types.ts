export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}

export interface Subscription {
  id: string
  client_id: string
  start_date: string
  end_date: string
  paid: boolean
  amount: number | null
  notes: string | null
  package_type?: string
  has_sim_wuarda?: boolean
  plant_type?: string
  plant_type_other?: string | null
  auto_renew?: boolean
}

export interface Intervention {
  id: string
  client_id: string
  intervention_date: string
  description: string
  created_at: string
}