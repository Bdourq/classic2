-- ============================================================
-- Classic Cafe — قاعدة بيانات نظام الولاء
-- شغّل هذا الملف كاملاً من: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1) جدول الزبائن
create table if not exists customers (
  phone text primary key,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  name text
);

alter table customers add column if not exists name text;

-- 2) سجل النقاط
create table if not exists points_log (
  id uuid primary key default gen_random_uuid(),
  phone text not null references customers(phone) on delete cascade,
  action text not null check (action in ('add', 'redeem')),
  points integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_points_log_phone on points_log(phone);

-- 3) دالة إضافة نقاط من الكاشير — كل دينار = نقطة
-- التحقق من PIN يتم في المتصفح فقط (لوحة الكاشير لا تُفتح بدونه)
create or replace function add_point(p_phone text, p_amount integer default 1)
returns void language plpgsql security definer as
$$
begin
  if p_amount <= 0 then
    raise exception 'قيمة النقاط يجب أن تكون أكبر من صفر';
  end if;

  update customers set points = points + p_amount where phone = p_phone;
  if not found then
    raise exception 'العميل غير موجود: %', p_phone;
  end if;
  insert into points_log (phone, action, points) values (p_phone, 'add', p_amount);
end;
$$;

-- 4) دالة استبدال قهوة مجانية (7 نقاط = قهوة)
create or replace function redeem_coffee(p_phone text)
returns void language plpgsql security definer as
$$
declare
  cur_points integer;
begin
  select points into cur_points from customers where phone = p_phone for update;
  if cur_points is null then
    raise exception 'العميل غير موجود: %', p_phone;
  end if;
  if cur_points < 7 then
    raise exception 'نقاط غير كافية (الرصيد: %)', cur_points;
  end if;
  update customers set points = points - 7 where phone = p_phone;
  insert into points_log (phone, action, points) values (p_phone, 'redeem', -7);
end;
$$;

-- 5) عرض العملاء مع تاريخ آخر إضافة نقاط (أو تاريخ الانضمام إن لم تُضف له نقاط)
create or replace view customers_with_activity as
select
  c.phone, c.points, c.created_at, c.name,
  coalesce(
    (select max(pl.created_at) from points_log pl where pl.phone = c.phone and pl.action = 'add'),
    c.created_at
  ) as last_add_at
from customers c;

grant select on customers_with_activity to anon, authenticated;

-- 6) دالة حذف عميل — تسمح فقط إذا لم تُضف له نقاط (أو لم ينضم) خلال آخر 30 يوماً
create or replace function delete_customer(p_phone text)
returns void language plpgsql security definer as
$
declare
  last_ref timestamptz;
begin
  select coalesce(
    (select max(created_at) from points_log where phone = p_phone and action = 'add'),
    (select created_at from customers where phone = p_phone)
  ) into last_ref;

  if last_ref is null then
    raise exception 'العميل غير موجود: %', p_phone;
  end if;

  if last_ref > now() - interval '30 days' then
    raise exception 'لا يمكن حذف عميل أُضيفت له نقاط أو انضم خلال آخر 30 يوماً';
  end if;

  delete from customers where phone = p_phone;
end;
$;

-- 7) أمان مستوى الصف (RLS)
alter table customers enable row level security;
alter table points_log enable row level security;

-- الزبائن: قراءة وتسجيل للجميع
drop policy if exists "read_customers" on customers;
create policy "read_customers" on customers for select using (true);

drop policy if exists "insert_customers" on customers;
create policy "insert_customers" on customers for insert with check (true);

-- سجل النقاط: قراءة فقط للجميع (الكتابة تمر عبر الدوال SECURITY DEFINER فقط)
drop policy if exists "read_points_log" on points_log;
create policy "read_points_log" on points_log for select using (true);

-- 8) البث اللحظي
alter publication supabase_realtime add table customers;
alter publication supabase_realtime add table points_log;
