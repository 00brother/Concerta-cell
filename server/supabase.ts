import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Product, Order, StoreSettings } from '../src/types/index.ts';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

if (isSupabaseConfigured) {
  console.log('[Database] Supabase conectado com sucesso na nuvem!');
} else {
  console.log('[Database] Supabase não configurado. Utilizando banco local com persistência atômica.');
}
