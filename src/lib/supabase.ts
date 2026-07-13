import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co'
);

if (!isSupabaseConfigured) {
  console.warn('[Classic Cafe] لم يتم ضبط بيانات Supabase — يرجى إضافة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في الإعدادات.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
