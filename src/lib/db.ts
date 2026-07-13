import { supabase } from './supabase';
import { Customer, PointsLog } from '../types';

// ─── الزبائن ───────────────────────────────────────────────

export async function findCustomer(phone: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { phone: data.phone, points: data.points, createdAt: data.created_at, name: data.name };
}

export async function createCustomer(phone: string, name?: string): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ phone, points: 0, name: name?.trim() || null })
    .select('*')
    .single();
  if (error) throw error;
  return { phone: data.phone, points: data.points, createdAt: data.created_at, name: data.name };
}

export async function getAllCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers_with_activity')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    phone: r.phone,
    points: r.points,
    createdAt: r.created_at,
    lastAddAt: r.last_add_at,
    name: r.name,
  }));
}

/** يحذف عميلاً — الدالة في قاعدة البيانات ترفض الحذف إذا أُضيفت له نقاط أو انضم خلال آخر 30 يوماً */
export async function deleteCustomer(phone: string): Promise<void> {
  const { error } = await supabase.rpc('delete_customer', { p_phone: phone });
  if (error) throw error;
}

// ─── النقاط ────────────────────────────────────────────────

/** يضيف نقاطاً للزبون بناءً على قيمة المشتريات — كل دينار = نقطة */
export async function addPoint(phone: string, amount: number): Promise<void> {
  const { error } = await supabase.rpc('add_point', { p_phone: phone, p_amount: amount });
  if (error) throw error;
}

/** يخصم عدداً مخصصاً من النقاط مقابل الاستبدال */
export async function redeemCoffee(phone: string, amount: number): Promise<void> {
  const { error } = await supabase.rpc('redeem_coffee', { p_phone: phone, p_amount: amount });
  if (error) throw error;
}

// ─── السجل ─────────────────────────────────────────────────

export async function getPointsLog(phone: string): Promise<PointsLog[]> {
  const { data, error } = await supabase
    .from('points_log')
    .select('*')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    phone: r.phone,
    action: r.action,
    points: r.points,
    createdAt: r.created_at,
  }));
}

// ─── الاشتراك اللحظي ───────────────────────────────────────

export function subscribeToCustomer(phone: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`customer-${phone}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customers', filter: `phone=eq.${phone}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'points_log', filter: `phone=eq.${phone}` },
      onChange
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
