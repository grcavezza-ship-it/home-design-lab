import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Attenzione: Variabili d'ambiente di Supabase mancanti. Controlla il file .env")
}

// Client standard da usare nel frontend per gli utenti loggati (Visitatore, Cliente, Operatore)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)