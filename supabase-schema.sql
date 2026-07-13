-- ============================================================
-- Classic Cafe — قاعدة بيانات نظام الولاء
-- شغّل هذا الملف كاملاً مرة واحدة من: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1) جدول الزبائن
create table if not exists customers (
  phone text primary key,
  name text not null,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2) جدول حركات النقاط (سجل كل إضافة/استبدال)
create table if not exists loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_phone text not null references customers(phone) on delete cascade,
  amount integer not null,
  type text not null check (type in ('add', 'redeem')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_phone on loyalty_transactions(customer_phone);

-- 3) دالة إضافة/خصم نقاط بشكل ذرّي (atomic) — تمنع تعارض التحديثات
-- عند تسجيل عدة عمليات كاشير بنفس اللحظة على نفس الزبون
create or replace function add_loyalty_points(
  p_phone text,
  p_amount integer,
  p_notes text
) returns void
language plpgsql
security definer
as $$
begin
  update customers
  set points = greatest(0, points + p_amount)
  where phone = p_phone;

  if not found then
    raise exception 'الزبون برقم % غير موجود', p_phone;
  end if;

  insert into loyalty_transactions (customer_phone, amount, type, notes)
  values (
    p_phone,
    abs(p_amount),
    case when p_amount > 0 then 'add' else 'redeem' end,
    p_notes
  );
end;
$$;

-- 4) تفعيل أمان مستوى الصف (Row Level Security)
alter table customers enable row level security;
alter table loyalty_transactions enable row level security;

-- سياسات مبدئية تسمح بالقراءة والتسجيل للجميع (مطلوبة ليعمل تسجيل الزبون
-- الذاتي ولوحة الكاشير بمفتاح anon العام). هذا مناسب لمرحلة الإطلاق الأولى؛
-- عندما يكبر المشروع يُفضّل نقل عمليات الكاشير خلف تسجيل دخول Supabase Auth
-- حقيقي بدل رمز PIN الثابت في الواجهة.
drop policy if exists "Public can read customers" on customers;
create policy "Public can read customers"
  on customers for select
  using (true);

drop policy if exists "Public can register as customer" on customers;
create policy "Public can register as customer"
  on customers for insert
  with check (true);

drop policy if exists "Public can read transactions" on loyalty_transactions;
create policy "Public can read transactions"
  on loyalty_transactions for select
  using (true);

-- ملاحظة: الإضافة الفعلية للنقاط تمر فقط عبر الدالة add_loyalty_points
-- (security definer) لذلك لا حاجة لسياسة insert مباشرة على loyalty_transactions.

-- 5) تفعيل البث اللحظي (Realtime) على الجدولين
alter publication supabase_realtime add table customers;
alter publication supabase_realtime add table loyalty_transactions;
