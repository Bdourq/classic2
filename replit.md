# Classic Cafe — نظام الولاء ☕️

تطبيق ولاء رقمي لمقهى "Classic Cafe" مبني بـ React + Vite + Supabase.

## كيفية التشغيل

```bash
npm install
npm run dev
```

يعمل التطبيق على المنفذ 5000.

## المتغيرات المطلوبة

| المتغير | الوصف |
|--------|-------|
| `VITE_SUPABASE_URL` | رابط مشروع Supabase |
| `VITE_SUPABASE_ANON_KEY` | المفتاح العام anon |
| `VITE_CASHIER_PIN` | رمز PIN للكاشير (4 أرقام) |

جميع المتغيرات محفوظة في Replit Secrets.

## التقنيات المستخدمة

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4
- **Build**: Vite 6
- **Database**: Supabase (PostgreSQL + Realtime)
- **Animation**: Motion (Framer Motion)
- **Icons**: Lucide React

## هيكل المشروع

```
src/
├── components/   # مكونات واجهة المستخدم
├── lib/          # إعداد Supabase والمساعدات
├── pages/        # صفحات التطبيق
├── App.tsx       # جذر التطبيق
└── main.tsx      # نقطة الدخول
```

## النشر على Cloudflare Pages

ملف `classic-cafe-cloudflare.zip` يحتوي على نسخة مبنية جاهزة للرفع على Cloudflare Pages.
لبناء نسخة جديدة: `npm run build` ثم ارفع مجلد `dist/`.

## User preferences
