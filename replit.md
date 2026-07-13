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

## النشر على Cloudflare Pages (يدوياً عبر ربط GitHub)

المشروع مرفوع على GitHub: `https://github.com/Bdourq/classic2` (فرع `main`).
بيانات Supabase و PIN الحقيقية محفوظة الآن كأسرار (Secrets) في هذا الـ Repl — إذا
احتجت نفس القيم لملء متغيرات Cloudflare، ارجع لنفس المصدر الذي استخدمته عند
إنشاء مشروع Supabase (Project Settings → API) ورمز PIN الذي اخترته.

خطوات النشر:

1. سجّل الدخول إلى https://dash.cloudflare.com
2. من القائمة الجانبية: **Workers & Pages** → **Create** → تبويب **Pages** → **Connect to Git**.
3. اختر حساب GitHub وربط المستودع **Bdourq/classic2** (فرع `main`).
4. في إعدادات البناء (Build settings):
   - **Framework preset**: Vite (أو None)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. في **Environment variables** (قسم Build) أضف:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CASHIER_PIN`
   - `NODE_VERSION` = `20` (المشروع يحدد Node 20 في `.nvmrc`؛ أضفها إذا لم تُكتشف تلقائياً)
6. اضغط **Save and Deploy**. بعد دقيقة يصير عندك رابط `*.pages.dev` جاهز، وتقدر تربط دومين خاص من تبويب **Custom domains**.
7. أي تحديث لاحق على كود GitHub (فرع main) سيُعاد نشره تلقائياً على Cloudflare.

## User Preferences

- الواجهة عربية بالكامل RTL
- موبايل-فيرست
- لا دفع إلكتروني
