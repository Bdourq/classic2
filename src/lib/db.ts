/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * طبقة الوصول للبيانات (Data Access Layer)
 * كل التعامل مع Supabase يمر من هنا فقط — بهذا الشكل تقدر لاحقاً تستبدل
 * مزوّد قاعدة البيانات دون ما تلمس أي مكوّن واجهة (component).
 */

import { supabase } from './supabase';
import { Customer, LoyaltyTransaction } from '../types';

// ---------- الأشكال الخام كما تُخزَّن في Supabase ----------
interface CustomerRow {
  phone: string;
  name: string;
  points: number;
  created_at: string;
}

interface TransactionRow {
  id: string;
  customer_phone: string;
  amount: number;
  type: 'add' | 'redeem';
  notes: string | null;
  created_at: string;
}

function mapTransaction(row: TransactionRow): LoyaltyTransaction {
  return {
    id: row.id,
    amount: row.amount,
    timestamp: row.created_at,
    type: row.type,
    notes: row.notes ?? undefined,
  };
}

function mapCustomer(row: CustomerRow, transactions: TransactionRow[]): Customer {
  return {
    phone: row.phone,
    name: row.name,
    points: row.points,
    createdAt: row.created_at,
    history: transactions
      .filter((t) => t.customer_phone === row.phone)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(mapTransaction),
  };
}

/** يجلب كل الزبائن مع سجل نقاطهم بالكامل */
export async function fetchCustomers(): Promise<Customer[]> {
  const [{ data: customerRows, error: custError }, { data: txRows, error: txError }] =
    await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('loyalty_transactions').select('*').order('created_at', { ascending: false }),
    ]);

  if (custError) throw custError;
  if (txError) throw txError;

  const customers = (customerRows ?? []) as CustomerRow[];
  const transactions = (txRows ?? []) as TransactionRow[];

  return customers.map((c) => mapCustomer(c, transactions));
}

/** يبحث عن زبون برقم جواله، أو null إن لم يكن مسجّلاً */
export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const { data: customerRow, error: custError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (custError) throw custError;
  if (!customerRow) return null;

  const { data: txRows, error: txError } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false });

  if (txError) throw txError;

  return mapCustomer(customerRow as CustomerRow, (txRows ?? []) as TransactionRow[]);
}

/** يسجّل زبوناً جديداً برقم جواله واسمه */
export async function createCustomer(phone: string, name: string): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ phone, name, points: 0 })
    .select('*')
    .single();

  if (error) throw error;

  return mapCustomer(data as CustomerRow, []);
}

/**
 * يضيف أو يخصم نقاطاً لزبون بشكل ذرّي (atomic) عبر دالة قاعدة بيانات (RPC)
 * تضمن عدم فقدان أي تحديث حتى لو أضاف عدة كاشيرات نقاطاً بنفس اللحظة.
 * راجع ملف supabase-schema.sql لتعريف الدالة add_loyalty_points.
 */
export async function addLoyaltyPoints(
  phone: string,
  amount: number,
  notes: string
): Promise<void> {
  const { error } = await supabase.rpc('add_loyalty_points', {
    p_phone: phone,
    p_amount: amount,
    p_notes: notes,
  });

  if (error) throw error;
}

/**
 * يشترك بالتغييرات اللحظية (Realtime) على جدولي الزبائن والحركات،
 * وينادي onChange في كل مرة يتغيّر فيها شيء — لتبقى شاشة الزبون والكاشير متزامنتين.
 */
export function subscribeToLoyaltyChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel('classic-cafe-loyalty-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, onChange)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'loyalty_transactions' },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
