import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vjacpddtyvwdtacklptq.supabase.co'
const supabaseKey = 'sb_publishable_-Kbxs5flvyZEhdrzVh3ScQ_M4ijoIWr'

export const supabase = createClient(supabaseUrl, supabaseKey)