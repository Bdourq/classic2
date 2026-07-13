import { createClient } from '@supabase/supabase-js';

const rawUrl     = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// تأكد أن الـ URL يبدأ بـ https:// (يُصحّح الإدخال بدون البروتوكول)
function normaliseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return 'https://' + trimmed;
}

const supabaseUrl = normaliseUrl(rawUrl);

function isValidHttpsUrl(url: string | undefined): boolean {
  if (!url) return false;
  try { return new URL(url).protocol === 'https:'; } catch { return false; }
}

export const isSupabaseConfigured = Boolean(
  isValidHttpsUrl(supabaseUrl) &&
  anonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co'
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Classic Cafe] بيانات Supabase غير مضبوطة أو غير صالحة — تأكد من صحة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.',
    { supabaseUrl, hasKey: Boolean(anonKey) }
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? anonKey!     : 'placeholder-anon-key',
);
