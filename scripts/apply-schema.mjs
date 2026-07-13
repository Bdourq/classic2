import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL   = process.env.VITE_SUPABASE_URL   || '';
const ACCESS_TOKEN   = process.env.SUPABASE_ACCESS_TOKEN || '';

// استخراج project ref من الـ URL
const match = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/);
if (!match) {
  console.error('❌ لا يمكن استخراج project ref من:', SUPABASE_URL);
  process.exit(1);
}
const PROJECT_REF = match[1];
console.log('📦 Project ref:', PROJECT_REF);

async function runSQL(label, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const data = await res.json().catch(() => ({}));
  const msg  = data?.message ?? '';

  // نعتبر "already exists" / "already member" نجاحاً
  if (res.ok || msg.includes('already exists') || msg.includes('already a member')) {
    console.log(`  ✅ ${label}`);
    return true;
  }
  console.log(`  ❌ ${label} [${res.status}]: ${msg}`);
  return false;
}

const statements = [
  // ─── الجداول ────────────────────────────────────────────────
  ['customers table', `
    create table if not exists customers (
      phone      text primary key,
      points     integer not null default 0,
      created_at timestamptz not null default now()
    )`],

  ['points_log table', `
    create table if not exists points_log (
      id         uuid primary key default gen_random_uuid(),
      phone      text not null references customers(phone) on delete cascade,
      action     text not null check (action in ('add','redeem')),
      points     integer not null,
      created_at timestamptz not null default now()
    )`],

  ['index on points_log', `
    create index if not exists idx_points_log_phone on points_log(phone)`],

  // ─── دالة الكاشير (بدون PIN) ───────────────────────────────
  ['add_point function', `
    create or replace function add_point(p_phone text, p_amount integer default 1)
    returns void language plpgsql security definer as $$
    begin
      if p_amount <= 0 then
        raise exception 'قيمة النقاط يجب أن تكون أكبر من صفر';
      end if;
      update customers set points = points + p_amount where phone = p_phone;
      if not found then
        raise exception 'العميل غير موجود: %', p_phone;
      end if;
      insert into points_log(phone, action, points) values(p_phone, 'add', p_amount);
    end;
    $$`],

  // ─── دالة العميل (إضافة بدون PIN) ─────────────────────────
  ['add_points_customer function', `
    create or replace function add_points_customer(p_phone text, p_amount integer)
    returns void language plpgsql security definer as $$
    begin
      if p_amount <= 0 then
        raise exception 'قيمة النقاط يجب أن تكون أكبر من صفر';
      end if;
      update customers set points = points + p_amount where phone = p_phone;
      if not found then
        raise exception 'العميل غير موجود: %', p_phone;
      end if;
      insert into points_log(phone, action, points) values(p_phone, 'add', p_amount);
    end;
    $$`],

  // ─── دالة الاستبدال (7 نقاط) ───────────────────────────────
  ['redeem_coffee function', `
    create or replace function redeem_coffee(p_phone text)
    returns void language plpgsql security definer as $$
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
      insert into points_log(phone, action, points) values(p_phone, 'redeem', -7);
    end;
    $$`],

  // ─── RLS ───────────────────────────────────────────────────
  ['rls customers',           `alter table customers  enable row level security`],
  ['rls points_log',          `alter table points_log enable row level security`],
  ['drop read_customers',     `drop policy if exists "read_customers"   on customers`],
  ['policy read_customers',   `create policy "read_customers"   on customers  for select using (true)`],
  ['drop insert_customers',   `drop policy if exists "insert_customers" on customers`],
  ['policy insert_customers', `create policy "insert_customers" on customers  for insert with check (true)`],
  ['drop read_points_log',    `drop policy if exists "read_points_log"  on points_log`],
  ['policy read_points_log',  `create policy "read_points_log"  on points_log for select using (true)`],

  // ─── Realtime ───────────────────────────────────────────────
  ['realtime customers',  `alter publication supabase_realtime add table customers`],
  ['realtime points_log', `alter publication supabase_realtime add table points_log`],
];

let failed = 0;
for (const [label, sql] of statements) {
  const ok = await runSQL(label, sql.trim());
  if (!ok) failed++;
}

console.log(`\n${'─'.repeat(40)}`);
console.log(failed === 0
  ? '🎉 تم تطبيق جميع التحديثات بنجاح!'
  : `⚠️  اكتمل مع ${failed} خطأ — راجع السطور أعلاه`);
process.exit(failed > 0 ? 1 : 0);
