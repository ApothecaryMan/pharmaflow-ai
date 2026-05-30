# 🔥 ZINC Stress Test Suite

اختبارات شاملة لقوة تحمل نظام ZINC تحت الضغط.

## المتطلبات

### تثبيت k6
```bash
# Fedora/RHEL
sudo dnf install k6

# macOS
brew install k6

# أو تحميل مباشر
curl -sL https://github.com/grafana/k6/releases/latest/download/k6-linux-amd64.tar.gz | tar xz
```

## السيناريوهات

| # | السيناريو | الوصف | المدة | أقصى VUs |
|---|---|---|---|---|
| 01 | 🔐 Auth Storm | تسجيل دخول جماعي متزامن | ~2.5 دقيقة | 30 |
| 02 | 🛒 Checkout Blitz | ضغط عمليات البيع (ساعة الذروة) | ~3.5 دقيقة | 25 |
| 03 | 📱 Multi-Device | 10 أجهزة POS في نفس الوقت | 3 دقائق | 10 |
| 04 | 📦 Inventory Load | ضغط قراءة/كتابة المخزون | ~2 دقيقة | 40 |
| 05 | 🔄 Mixed Workload | يوم عمل واقعي (كل الأدوار) | ~4 دقائق | 20 |
| 06 | ⚡ Spike Test | ارتفاع مفاجئ (5→80 مستخدم) | ~1.5 دقيقة | 80 |

## التشغيل

### تشغيل سيناريو واحد
```bash
k6 run stress-tests/k6/scenarios/01-auth-storm.js
k6 run stress-tests/k6/scenarios/02-checkout-blitz.js
k6 run stress-tests/k6/scenarios/03-multi-device.js
k6 run stress-tests/k6/scenarios/04-inventory-load.js
k6 run stress-tests/k6/scenarios/05-mixed-workload.js
k6 run stress-tests/k6/scenarios/06-spike-test.js
```

### تشغيل كل السيناريوهات
```bash
./stress-tests/k6/run-all.sh
```

### تشغيل سيناريو محدد عبر الرقم
```bash
./stress-tests/k6/run-all.sh 02   # Checkout Blitz فقط
```

### استخدام بيئة مختلفة
```bash
k6 run \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_ANON_KEY=your-key \
  stress-tests/k6/scenarios/02-checkout-blitz.js
```

## معايير النجاح

| المقياس | الهدف | الفشل |
|---|---|---|
| Auth Login (p95) | < 2s | > 5s |
| Checkout RPC (p95) | < 3s | > 8s |
| Inventory Query (p95) | < 1s | > 3s |
| Error Rate | < 5% | > 10% |
| Spike Error Rate | < 20% | > 30% |

## التقارير

التقارير تتخزن تلقائياً في `stress-tests/reports/` بصيغة JSON.

## ⚠️ تحذيرات مهمة

1. **الاختبارات بتضرب الداتابيز الحقيقي** - استخدم test environment لو ممكن
2. **عمليات الـ Checkout هتنقص المخزون فعلاً** - تأكد إن المخزون كافي
3. **Rate Limits**: Supabase Free tier ~500 req/s، Pro ~1000 req/s
4. **البيانات اللي بتتكون** (sales, cash_transactions) **محتاجة تنظيف** بعد الاختبار

## تنظيف البيانات بعد الاختبار

```sql
-- Delete stress test sales (identified by the performer name)
DELETE FROM sale_items WHERE sale_id IN (
  SELECT id FROM sales WHERE items::text LIKE '%Stress Test%'
);
DELETE FROM cash_transactions WHERE reason LIKE '%SALE-%-STRESS%';
DELETE FROM sales WHERE items::text LIKE '%Stress Test%';
```
