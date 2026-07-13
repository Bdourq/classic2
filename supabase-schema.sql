-- ============================================================
-- Classic Cafe — قاعدة بيانات نظام الولاء (النسخة المحدّثة)
-- شغّل هذا الملف كاملاً من: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1) جدول الزبائن (phone فقط — بدون اسم)
create table if not exists customers (
  phone text primary key,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2) سجل النقاط
create table if not exists points_log (
  id uuid primary key default gen_random_uuid(),
  phone text not null references customers(phone) on delete cascade,
  action text not null check (action in ('add', 'redeem')),
  points integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_points_log_phone on points_log(phone);

-- 3) دالة إضافة نقطة واحدة (يستدعيها الكاشير عند مسح QR)
create or replace function add_point(p_phone text)
returns void language plpgsql security definer as $$
begin
  update customers set points = points + 1 where phone = p_phone;
  if not found then
    raise exception 'العميل غير موجود: %', p_phone;
  end if;
  insert into points_log (phone, action, points) values (p_phone, 'add', 1);
end;
$$;

-- 4) دالة استبدال 10 نقاط بقهوة مجانية
create or replace function redeem_coffee(p_phone text)
returns void language plpgsql security definer as $$
declare
  cur_points integer;
begin
  select points into cur_points from customers where phone = p_phone for update;
  if cur_points is null then
    raise exception 'العميل غير موجود: %', p_phone;
  end if;
  if cur_points < 10 then
    raise exception 'نقاط غير كافية (الرصيد: %)', cur_points;
  end if;
  update customers set points = points - 10 where phone = p_phone;
  insert into points_log (phone, action, points) values (p_phone, 'redeem', -10);
end;
$$;

-- 5) أمان مستوى الصف (RLS)
alter table customers enable row level security;
alter table points_log enable row level security;

drop policy if exists "read_customers" on customers;
create policy "read_customers" on customers for select using (true);

drop policy if exists "insert_customers" on customers;
create policy "insert_customers" on customers for insert with check (true);

drop policy if exists "read_points_log" on points_log;
create policy "read_points_log" on points_log for select using (true);

-- 6) البث اللحظي (Realtime)
alter publication supabase_realtime add table customers;
alter publication supabase_realtime add table points_log;
