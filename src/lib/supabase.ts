/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

// هذه القيم تُقرأ من ملف .env.local (شوف .env.example للتفاصيل)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Classic Cafe] لم يتم ضبط بيانات Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) في .env.local — التطبيق سيعمل بدون تزامن حقيقي بين الأجهزة.'
  );
}

// عند عدم توفر بيانات الاتصال، ننشئ عميلاً بقيم وهمية حتى لا ينهار البناء (build)،
// لكن أي طلب فعلي سيفشل بوضوح ويُظهر تحذيراً في الواجهة.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
