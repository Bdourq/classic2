#!/usr/bin/env bash
# ============================================================
# Classic Cafe — سكريبت النشر
# الاستخدام: bash deploy.sh "رسالة التغيير"
# ============================================================
set -e

MSG=${1:-"تحديث"}

echo "🔨 بناء التطبيق..."
npm run build

echo "📤 رفع الكود على GitHub..."
GITHUB_TOKEN=$(printenv GITHUB_TOKEN)
git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/Bdourq/classic2.git"
git add -A
git diff --cached --quiet || git commit -m "$MSG"
git push origin main

echo "🌐 نشر على Cloudflare Pages..."
CLOUDFLARE_API_TOKEN=$(printenv CLOUDFLARE_API_TOKEN) \
CLOUDFLARE_ACCOUNT_ID=$(printenv CLOUDFLARE_ACCOUNT_ID) \
wrangler pages deploy dist/ \
  --project-name="classic-cafe" \
  --branch="main" \
  --commit-dirty=true

echo "✅ تم النشر بنجاح!"
