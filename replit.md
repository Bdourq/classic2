# Classic Cafe — نظام نقاط الولاء ☕

نظام ولاء رقمي لكشك قهوة — تسجيل العملاء برقم الهاتف، تجميع نقاط عبر مسح QR، واستبدالها بقهوة مجانية.

## كيفية التشغيل

```bash
npm run dev
```

يفتح على المنفذ **5000**.

## بنية التطبيق

| المسار | الوصف |
|--------|--------|
| `/` | صفحة تسجيل العملاء (رقم الهاتف فقط) |
| `/c?id=PHONE` | صفحة العميل — النقاط، QR، السجل، الاستبدال |
| `/admin` | لوحة الكاشير — PIN + مسح QR + إضافة نقطة |

## الجداول في Supabase

- `customers (phone TEXT PK, points INT, created_at)`
- `points_log (id UUID PK, phone, action, points, created_at)`
- دوال RPC: `add_point(p_phone)` و `redeem_coffee(p_phone)`

## المتغيرات البيئية المطلوبة

| المتغير | الوصف |
|---------|--------|
| `VITE_SUPABASE_URL` | رابط مشروع Supabase |
| `VITE_SUPABASE_ANON_KEY` | المفتاح العام (anon key) |
| `VITE_CASHIER_PIN` | رمز PIN للكاشير |

## إعداد Supabase (مرة واحدة)

1. اذهب إلى Supabase Dashboard → SQL Editor
2. الصق محتوى `supabase-schema.sql` كاملاً وشغّله
3. هذا ينشئ الجداول، الدوال، سياسات RLS، والبث اللحظي

## المكدس التقني

- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS 4** (RTL، ألوان بني وقهوة، موبايل-فيرست)
- **Supabase** — قاعدة بيانات + Realtime
- **html5-qrcode** — مسح QR من كاميرا الجوال

## User Preferences

- الواجهة عربية بالكامل RTL
- موبايل-فيرست
- لا دفع إلكتروني
