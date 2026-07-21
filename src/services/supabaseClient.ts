import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Faltan credenciales VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Por favor, añádelas en Settings.")
}

export const supabase = createClient(
  supabaseUrl || 'https://tu-proyecto.supabase.co',
  supabaseAnonKey || 'tu-anon-key'
)