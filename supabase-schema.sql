-- ============================================================
-- Classic Cafe — قاعدة بيانات نظام الولاء
-- شغّل هذا الملف كاملاً من: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1) جدول الزبائن
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

-- 3) جدول إعدادات الكافيه (PIN الكاشير — لا يُقرأ مباشرة بسبب RLS)
create table if not exists cafe_config (
  key text primary key,
  value text not null
);

-- ⚠️ غيّر '1234' إلى PIN الكاشير الذي اخترته قبل تشغيل هذا الملف
insert into cafe_config (key, value) values ('cashier_pin', '1234')
  on conflict (key) do update set value = excluded.value;

-- 4) دالة إضافة نقاط — كل دينار = نقطة، تتحقق من PIN الكاشير على جانب الخادم
-- p_amount: عدد النقاط المراد إضافتها (= قيمة الفاتورة بالدينار مقرّبة للأسفل)
create or replace function add_point(p_phone text, p_pin text, p_amount integer default 1)
returns void language plpgsql security definer as
$$
declare
  stored_pin text;
begin
  select value into stored_pin from cafe_config where key = 'cashier_pin';
  if stored_pin is null or p_pin <> stored_pin then
    raise exception 'Unauthorized: invalid cashier PIN';
  end if;

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

-- 5) دالة استبدال قهوة مجانية (7 نقاط = قهوة) — لا تحتاج PIN لأنها تُستدعى من شاشة العميل
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

-- 6) أمان مستوى الصف (RLS)
alter table customers enable row level security;
alter table points_log enable row level security;
alter table cafe_config enable row level security;

-- الزبائن: قراءة وتسجيل للجميع
drop policy if exists "read_customers" on customers;
create policy "read_customers" on customers for select using (true);

drop policy if exists "insert_customers" on customers;
create policy "insert_customers" on customers for insert with check (true);

-- سجل النقاط: قراءة فقط للجميع (الكتابة تمر عبر الدوال SECURITY DEFINER فقط)
drop policy if exists "read_points_log" on points_log;
create policy "read_points_log" on points_log for select using (true);

-- الإعدادات: لا سياسات = لا يُقرأ/يُكتب مباشرة من العميل
-- القراءة تتم فقط من داخل دوال SECURITY DEFINER

-- 7) البث اللحظي
alter publication supabase_realtime add table customers;
alter publication supabase_realtime add table points_log;
