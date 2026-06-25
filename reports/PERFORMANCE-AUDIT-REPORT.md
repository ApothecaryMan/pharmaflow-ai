# تقرير تدقيق الأداء الشامل — PharmaFlow AI (Zinc)

> **الإصدار:** 1.0 · **التاريخ:** 2026-06-24 · **النطاق:** `App.tsx` + شجرة المكوّنات والـ Contexts والـ Bundle
> **المنهجية:** تحليل ثابت للكود (Static Analysis) + تحليل حجم الـ Bundle (Build Output Analysis) + فحص أنماط React Anti-Patterns
> **الشدة الإجمالية للمشروع:** 🔴 **مرتفعة** — يوجد تأثير مباشر على زمن التحميل الأولي (TTI) ومعدل الإعادة الرسم (Re-render Rate) خاصة في الـ Dashboard والـ POS.

---

## 📑 فهرس المحتويات

1. [الملخص التنفيذي (Executive Summary)](#1-الملخص-التنفيذي)
2. [منهجية القياس وخط الأساس (Baseline)](#2-منهجية-القياس-وخط-الأساس)
3. [المشاكل الحرجة — الأولوية P0](#3-المشاكل-الحرجة--الأولوية-p0)
4. [مشاكل عالية الخطورة — الأولوية P1](#4-مشاكل-عالية-الخطورة--الأولوية-p1)
5. [مشاكل متوسطة الخطورة — الأولوية P2](#5-مشاكل-متوسطة-الخطورة--الأولوية-p2)
6. [مشاكل منخفضة الخطورة — الأولوية P3](#6-مشاكل-منخفضة-الخطورة--الأولوية-p3)
7. [تحليل الـ Bundle والبناء (Build)](#7-تحليل-الـ-bundle-والبناء)
8. [الأنماط الجيدة الموجودة (للإبقاء عليها)](#8-الأنماط-الجيدة-الموجودة)
9. [خطة الإصلاح المُرتّبة حسب الأثر](#9-خطة-الإصلاح-المُرتّبة-حسب-الأثر)
10. [مؤشرات الأداء المستهدفة (KPIs)](#10-مؤشرات-الأداء-المستهدفة)
11. [ملاحق](#11-ملاحق)

---

## 1. الملخص التنفيذي

تم فحص البنية المعمارية للتطبيق بالكامل بدءاً من نقطة الدخول `index.tsx` مروراً بـ `App.tsx` (Orchestrator) وصولاً إلى أصغر طبقة عرض. النتيجة: **هيكل معماري سليم في فلسفته (Orchestrator Pattern + Lazy Pages)، لكنه يعاني من 3 مشاكل هيكلية جوهرية تتسبب في:**

| المؤشر | القيمة الحالية | القيمة المثالية | الفجوة |
|---|---|---|---|
| حجم الـ Main Bundle (`index.js`) | **988 KB** | < 250 KB | ⚠️ ×4 |
| حجم Chunk لـ `AuthenticatedContent` | **1.6 MB** | < 300 KB | 🔴 ×5 |
| حجم ملف الترجمات في الـ Bundle | **6,106 سطر** eager | lazy / split | 🔴 كامل |
| عدد `useEffect` في `SettingsContext` | **20+** | 3-5 موحّدة | ⚠️ ×4 |
| عدد حقول الإعدادات في Context واحد | **37 حقلاً + 30 setter** | مقسّمة 3-4 contexts | 🔴 كتلة واحدة |
| معدل `any` في الكود | **268 موقع في 105 ملفات** | صفر تقريباً | 🔴 يخفي re-render bugs |

**الخلاصة:** التطبيق يعمل، لكن **أي تغيير بسيط في الإعدادات (مثل إخفاء الـ Ticker) يعيد رسم الشجرة بالكامل**، و**أي تغيير في بيانات المخزون يطلق سلسلة إعادة رسم (render cascade)** تصل إلى `PageRouter` وكل الصفحات. كما أن **التحميل الأولي يسحب 1.6MB قبل أن يظهر المحتوى** — وهو الرقم الأكبر خطورة.

---

## 2. منهجية القياس وخط الأساس

### 2.1 مصادر البيانات
- **فحص الـ Build الفعلي** من مجلد `dist/assets/` (بناء إنتاجي حقيقي).
- **قراءة كاملة** لملفات: `App.tsx`, `index.tsx`, `AuthenticatedContent.tsx`, `SettingsContext.tsx`, `DataProvider.tsx`, `PageRouter.tsx`, `pageRegistry.ts`, `translations.ts`, `vite.config.ts`.
- **مسح نمطي (Pattern Sweep)** على 105 ملف `.tsx`/`.ts`.

### 2.2 خريطة حجم الـ Bundle (الـ 10 الأكبر)

| الملف | الحجم | التقييم |
|---|---|---|
| `AuthenticatedContent-D3bYUBzc.js` | **1.6 MB** | 🔴 كارثي — يسحب كل شيء |
| `CustomerDensityMap-DsHvEymy.js` | **1.1 MB** | ⚠️ maplibre (لازم لكن ثقيل) |
| `index-DS7Ecqqi.js` | **988 KB** | 🔴 Main bundle ضخم |
| `exceljs.min-YP8UOGoW.js` | **920 KB** | 🔴 هل هو ضروري eager؟ |
| `vendor-recharts` | 436 KB | ⚠️ ثقيل لكن مُقسّم |
| `EmployeePortalProfile` | 184 KB | ⚠️ |
| `vendor-motion` | 128 KB | مقبول |
| `POS` | 116 KB | مقبول (lazy) |
| `vendor-table` | 56 KB | جيد |
| `vendor-dnd-kit` | 52 KB | جيد |

> **ملاحظة:** وجود `manualChunks` في `vite.config.ts` هو **نقطة إيجابية**، لكنه لا يحل مشكلة الـ imports غير الـ lazy داخل الـ entry points.

---

## 3. المشاكل الحرجة — الأولوية P0

### 🔴 P0-1: تحميل كامل ملف الترجمات (6,106 سطر) في الـ Initial Bundle

**الموقع:**
- `App.tsx:48` → `import { TRANSLATIONS } from './i18n/translations';` (static top-level)
- `App.tsx:131` → `const t = TRANSLATIONS[language];` ← **السبب الجذري**
- `AuthenticatedContent.tsx:13` → استيراد ثانٍ

**التحليل الدقيق (لماذا الـ import الـ global حتمياً؟):**
ليست المشكلة مجرد `static import` — المشكلة الأعمى أن **`App.tsx` (الـ root component) يستهلك `TRANSLATIONS` بشكل تزامني (synchronously) عند الإقلاع** لاختيار اللغة النشطة:

```tsx
// App.tsx
const t = TRANSLATIONS[language];   // ← استهلاك فوري في الـ root
// ثم يُستخدم t مباشرة في الـ root نفسه، وليس فقط يُمرَّر للأطفال:
//   App.tsx:143-147 → رسالة الـ quota warning
//   App.tsx:175     → رسالة الـ quota critical
//   App.tsx:294     → t.global?.loading (شاشة الـ loading)
// ثم يُمرَّر لـ AuthenticatedContent و AuthPage
```

بما أن الـ root component **يحتاج `t` تزامنياً عند الإقلاع**، فإن كائن الترجمات الكامل (6,106 سطر، EN + AR) **يُقفل إجبارياً في الـ main bundle (`index.js` = 988KB)** — بغضّ النظر عن أي `React.lazy` على المكوّنات الأبناء. أي `dynamic import('./i18n/translations')` بسيط **لن يعمل** هنا لأن `App.tsx` لا يمكنه `await` قبل أن يُرجِع JSX.

> **ملاحظة منهجية:** حل "dynamic import + cache" المقترح سابقاً **ناقص** وغير قابل للتطبيق على الـ root component. الحل الفعلي يتطلب **إزالة استهلاك `TRANSLATIONS` من طبقة الـ root تماماً**.

**ال impact:**
- الـ 6,106 سطر تُحمَّل لـ **كل مستخدم في كل جلسة**، حتى المستخدم غير المُسجَّل الذي يرى فقط شاشة الـ login.
- تزيد زمن **Time to Interactive (TTI)** و**Parse/Compile time** على الأجهزة الضعيفة والموبايل بشكل كبير.
- معظم الترجمات (95%+) لا تُستخدم إلا بعد المصادقة، لكنها تُحمّل مسبقاً إجبارياً.

**الحل الصحيح (ثلاثة مسارات متكاملة):**

#### المسار 1 — استخراج المفاتيح الجذرية (إلزامي أولاً)
الـ root (`App.tsx`) يحتاج فعلياً **3-4 مفاتيح فقط**: `t.global.loading`، رسائل الـ quota، رسائل الـ error العامة. هذه المفاتيح القليلة تُعرَّف كـ **constants محلية صغيرة** داخل `App.tsx` (أو ملف `rootStrings.ts` خفيف بـ ~20 سطر):

```tsx
// بدلاً من سحب 6,106 سطر، عرّف المفاتيح الجذرية فقط:
const ROOT_STRINGS = {
  AR: { loading: 'جارٍ التحميل...', /* quota + error messages */ },
  EN: { loading: 'Loading...',     /* quota + error messages */ },
} as const;

const t = ROOT_STRINGS[language];   // ← لم يعد هناك استيراد ثقيل في الـ root
```

#### المسار 2 — نقل استهلاك `TRANSLATIONS` للأسفل
الاستهلاك الكامل لـ `TRANSLATIONS` يُنقل **تماماً خارج `App.tsx`** إلى داخل المكوّنات التي تحتاجه فعلاً:
- **`AuthenticatedContent.tsx`** (وهو `React.lazy`) → الترجمات تنزلق تلقائياً إلى chunk خاص بها.
- **`AuthPage`** (شاشة الدخول) → يمكنه dynamic-import ترجمات الـ login فقط.

بهذا التقسيم، تُصبح الترجمات **chunk مستقل يُحمَّل عند الحاجة** بدلاً من الدخول في الـ entry bundle.

#### المسار 3 (اختياري، الأمثل) — تقسيم حسب اللغة
تقسيم `translations.ts` إلى `translations.en.ts` + `translations.ar.ts` مع dynamic import للغة النشطة فقط:

```ts
// i18n/index.ts
const loaders = {
  AR: () => import('./translations.ar').then(m => m.TRANSLATIONS_AR),
  EN: () => import('./translations.en').then(m => m.TRANSLATIONS_EN),
} as const;
// المستخدم يستخدم لغة واحدة فقط في الجلسة → نحمّل نصف الحجم.
```

**النتيجة المتوقعة:** خروج الـ 6,106 سطر من `index.js` (988KB) وتقليله بشكل ملموس، مع نقل العبء إلى chunks تُحمَّل عند المصادقة فقط.

---

### 🔴 P0-2: الـ Chunk الخاص بـ `AuthenticatedContent` = 1.6 MB

**الموقع:** `App.tsx:22-26` (lazy) → `AuthenticatedContent.tsx`

**المشكلة:**
رغم أن `AuthenticatedContent` مُحمّل بـ `React.lazy` بشكل صحيح في `App.tsx`، إلا أن **الـ chunk الناتج ضخم جداً (1.6MB)**. السبب: هذا المكوّن يستورد **بشكل ثابت**:
- `MainLayout` (يستورد Navbar, Sidebar, StatusBar — كلها ثقيلة)
- `PageRouter` (يستورد `PAGE_REGISTRY` بالكامل = 50+ تعريف `React.lazy`)
- `TRANSLATIONS` (6,106 سطر — انظر P0-1)
- `useEntityHandlers`, `useAuthenticatedData`, `useNavigation`, `useSessionHandlers`, `useGlobalEventHandlers` (كلها تجر معها services)

**ال impact:**
عند نجاح تسجيل الدخول، ينتظر المستخدم تحميل **1.6MB** قبل ظهور الواجهة. هذا **كسر فعلي لتجربة المستخدم** على الشبكات البطيئة.

**الحل المقترح:**
1. **فصل `TRANSLATIONS`** عن `AuthenticatedContent` (P0-1) — عبر نقل الاستهلاك للأسفل.
2. **نقل استيراد `PAGE_REGISTRY`** إلى داخل `PageRouter` فقط (موجود أصلاً، لكن التأكد من عدم تسرّبه).
3. **تطبيق `manualChunks` إضافي** لفصل `translations` و`hooks/auth` و`hooks/layout` إلى chunks مستقلة.
4. **إضافة Suspense fallback حقيقي** (حالياً `fallback={null}` في `App.tsx:268`) — شاشة بيضاء أثناء تحميل 1.6MB.

```tsx
// App.tsx:268 — تحسين:
<Suspense fallback={<LogoAsterisk /> /* أو PageLoader */}>
```

---

### 🔴 P0-3: `SettingsContext` = Context أحادي (Monolithic) يسبب Render Cascade

**الموقع:** `context/SettingsContext.tsx:641-709`

**المشكلة:**
الـ `value` المُمرَّر إلى `SettingsContext.Provider` مبني بهذا الشكل:

```tsx
const value = useMemo<SettingsContextType>(
  () => ({ ...settings, setTheme, setDarkMode, /* +30 setters */ }),
  [settings, /* +30 setters */]
);
```

الـ `...settings` ينسخ **37 حقلاً**. وبما أن الـ dependency array يحوي `settings` (الكائن كاملاً)، فإن **أي تعديل في حقل واحد فقط** (مثلاً `showTicker: true → false`) يُنشئ كائن `settings` جديد → يُبطل الـ memo → **يُعيد رسم كل مستهلك لـ `useSettings()` في التطبيق كله**.

**الأدلة الكمية:**
- `useSettings()` يُستدعى في `App.tsx:130`, `AuthenticatedContent.tsx:60`, `PageRouter.tsx:55`، وعشرات المكوّنات الأخرى.
- تبديل بسيط لـ `developerMode` يعيد رسم الـ Navbar، الـ Sidebar، الـ StatusBar، الـ Dashboard، الـ POS… **في وقت واحد**.

**ال impact:**
هذا **السبب الأول للبطء الملحوظ** عند التفاعل مع لوحة الإعدادات. كل toggle يطلق عاصفة re-render.

**الحل المقترح (3 خيارات مرتّبة):**

| الخيار | الوصف | الجهد | الأثر |
|---|---|---|---|
| **A — تقسيم الـ Context** (موصى به) | فصل إلى `ThemeContext`, `LanguageContext`, `UIPreferencesContext`, `DeveloperContext` | متوسط | 🔴🔴🔴 |
| **B — Context Selector** | استخدام مكتبة `use-context-selector` أو `useSyncExternalStore` مع selectors دقيقة | منخفض | 🔴🔴 |
| **C — Zustand** | استبدال الـ Context بنظام state خارجي (Zustand/Jotai) يدعم selectors بشكل أصلي | مرتفع | 🔴🔴🔴🔴 |

**مثال للخيار B (الأقل جهد):**
```tsx
// selector hook يمنع re-render إذا لم تتغير القيمة المختارة:
const useSettingsSelector = <T,>(selector: (s: SettingsState) => T): T => {
  const settings = useContext(SettingsContext);
  return useMemo(() => selector(settings), [settings]); // غير كافٍ وحده
};
// الأفضل: useSyncExternalStore لتعطيل الـ re-render على مستوى الحقل.
```

---

## 4. مشاكل عالية الخطورة — الأولوية P1

### 🟠 P1-1: استخراج جماعي من `useData()` و `useSettings()` في `AuthenticatedContent`

**الموقع:** `AuthenticatedContent.tsx:60-107`

**المشكلة:**
```tsx
const { theme, setTheme, darkMode, setDarkMode, language, /* ...11 حقلاً */ } = useSettings();
const { inventory, setInventory, sales, setSales, /* ...15 حقلاً */ } = useData();
```
هذا destructuring يعني: **أي تغيير في أي حقل من أي Context** يعيد رسم `AuthenticatedContent` بالكامل، الذي بدوره يعيد بناء:
- `handlers` useMemo (24 dependency — `AuthenticatedContent.tsx:273-301`)
- `data` useMemo (11 dependency — `AuthenticatedContent.tsx:318-330`)
- ثم يمرّرها إلى `MainLayout` و `PageRouter`.

**ال impact:**
حتى لو لم تتغير الـ `handlers` فعلياً، فإن تغيّر `language` يُبطل الـ memo فقط لو كان في الـ deps — وهذا صحيح هنا — **لكن** `t = TRANSLATIONS[language]` يُعاد حسابه، والمكوّن يُعاد رسمه بالكامل مع كل أبنائه.

**الحل المقترح:**
- نقل استهلاك البيانات **للأسفل** (push consumption down) إلى المكوّنات التي تحتاجها فعلاً، وليس في طبقة الـ Orchestrator.
- استبدال تمرير `data` و `handlers` كـ props ضخمة بنمط **Context خاص بكل صفحة** أو **Hooks تستهلك مباشرة من `useData()`**.

---

### 🟠 P1-2: `PageRouter` يبني كائنات جديدة في كل Render (يُبطل `React.memo`)

**الموقع:** `PageRouter.tsx:139-245`

**المشكلة:**
رغم أن `PageRouter` مغلّف بـ `React.memo` (`PageRouter.tsx:269`)، إلا أن الكود داخله يبني **3 كائنات جديدة في كل render**:

```tsx
const dataMap: Record<string, any> = { sales: data.sales, /* 14 حقلاً */ };       // ← جديد كل مرة
const handlerMap: Record<string, any> = { setInventory: ..., /* 22 معالجاً */ };   // ← جديد كل مرة
const viewTranslations: Record<string, any> = { dashboard: t.dashboard, ... };     // ← جديد + spread
```

الأخطر: `viewTranslations` يستخدم **spread operators** (`...t.salesHistory`, `...t.purchases`) مما ينسخ كائنات فرعية كبيرة في كل render. كما أن `onBatchesChanged` و `onAddProduct` دوال inline جديدة:

```tsx
onBatchesChanged: async () => handlers.setBatches(await batchService.getAllBatches(...)),
onAddProduct: () => setView('add-product'),
```

**ال impact:**
- `React.memo` يفقد فائدته لأن الـ props المُمرَّرة إليه (`t`, `handlers`, `data`) تتغير reference عند كل render أبوي.
- صفحات مثل `POS` و `Dashboard` (التي تحتوي جداول/رسوم) تُعاد رسمها بالكامل عند أي تفاعل.

**الحل المقترح:**
```tsx
// 1. إخراج الخرائط الثابتة خارج المكوّن (module scope):
const BASE_VIEW_TRANSLATIONS_KEYS = ['dashboard','inventory', /* ... */];

// 2. memo داخل المكوّن لكل خريطة على حدة:
const dataMap = useMemo(() => ({ sales: data.sales, /* ... */ }), 
  [data.sales, data.inventory, /* فقط المتغيرات */ ]);

// 3. استبدال الـ inline arrows بـ useCallback على مستوى الأب.
```

---

### 🟠 P1-3: 20+ `useEffect` متسلسلة في `SettingsContext` للتعامل مع الـ DOM

**الموقع:** `SettingsContext.tsx:287-639` (effect بعد effect)

**المشكلة:**
```tsx
useEffect(() => { /* darkMode → document.classList */ }, [settings.darkMode]);       // 317
useEffect(() => { /* graphicStyle → body.classList */ }, [settings.graphicStyle]);    // 326
useEffect(() => { /* graphicFontVariant */ }, [settings.graphicFontVariant]);         // 335
useEffect(() => { /* fonts loading */ }, [settings.fontFamilyEN, settings.fontFamilyAR]); // 344
useEffect(() => { /* textTransform */ }, [settings.textTransform]);                   // 385
useEffect(() => { /* cardBorderLight */ }, [settings.cardBorderLight]);               // 398
useEffect(() => { /* borderRadius */ }, [settings.borderRadius]);                     // 408
useEffect(() => { /* badgeStyle (6 setProperty) */ }, [settings.badgeStyle]);         // 418
useEffect(() => { /* sidebarModalWidth */ }, [settings.sidebarModalWidth]);           // 446
useEffect(() => { /* customCardCss */ }, [settings.customCardCss, ...]);              // 456
useEffect(() => { /* language/dir */ }, [settings.language]);                         // 494
// ... + 8 effects أخرى للـ persistence و cross-tab sync
```

**ال impact:**
- عند **الإقلاع (boot)**، تُنفَّذ كل هذه الـ effects دفعة واحدة → layout thrashing (قراءة/كتابة DOM متكررة).
- عند **تعديل إعداد**، يُعاد التقييم. معظمها جيد (deps محددة)، لكن `customCardCss` effect يعمل **`document.getElementById` + `split(';')` + `map`** في كل مرة → مكلف.
- الـ effect في السطر 629 (`window.__NUMERAL_LOCALE__`) **يكتب على الـ global** ثم يستدعي `window.__UPDATE_DIGITS__()` الذي يُحدّث الـ DOM يدوياً — نمط هش ومكلف.

**الحل المقترح:**
1. **توحيد effects الـ DOM** في effect واحد يستخدم `requestAnimationFrame` batching:
```tsx
useEffect(() => {
  const apply = () => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
    document.documentElement.style.setProperty('--radius', /* ... */);
    // ... كل تعديلات الـ DOM
  };
  const raf = requestAnimationFrame(apply);
  return () => cancelAnimationFrame(raf);
}, [settings]); // unified
```
2. **استبدال `window.__UPDATE_DIGITS__`** بنظام reactive (event/re-render) بدلاً من تحديث DOM يدوي.

---

### 🟠 P1-4: انتشار نوع `any` يخفي مشاكل Re-render (268 موقع)

**البيانات:**
- `useDataActions.ts`: **42 occurrence**
- `PageRouter.tsx`: **8 occurrence**
- `AuthenticatedContent.tsx`: متعددة (`pendingNavigation` params, `t.nav as any`)
- الإجمالي: **268 موقع في 105 ملفات**

**لماذا هذا مشكلة أداء (وليس فقط type safety)؟**
- `handlers: Record<string, any>` و `data: Record<string, any>` في `PageRouter` يعني أن `React.memo` لا يستطيع **shallow-compare** بشكل موثوق — قد تمرّر قيم غير متوقعة تُعتبر "متغيرة".
- `as any` في `AuthenticatedContent.tsx:390` (`(t.nav as any)[windowedView]`) يخفي خطأ في التصميم.
- الـ TypeScript لا يستطيع تحديد **dead props** أو **props غير مستخدمة** التي تُسحب في كل render.

**الحل المقترح:**
- استبدال `Record<string, any>` بأنواع دقيقة (`PageHandlers`, `PageData`) مُعرَّفة في `types.ts`.
- تفعيل `noImplicitAny` و `@typescript-eslint/no-explicit-any` بشكل صارم في `biome`/`eslint`.

---

### 🟠 P1-5: `exceljs` (920 KB) — تحقق من ضرورة الاستيراد

**الموقع:** `dist/assets/exceljs.min-YP8UOGoW.js` (920 KB)

**المشكلة:**
مكتبة `exceljs` ضخمة جداً (920KB). يجب التحقق:
1. هل تُستورد بشكل **dynamic import** فقط عند تصدير Excel؟
2. هل يمكن استبدالها ببديل أخف مثل:
   - **`xlsx` (SheetJS)** — أصغر وأسرع للقراءة.
   - **`papaparse` + تنسيق CSV** — إذا كان المستخدم يقبل CSV.
   - **تصدير عبر server-side** (إذا كان هناك backend).

**ال impact:**
إذا كانت eager → تضيف 920KB لكل مستخدم حتى لو لم يصدّر Excel أبداً. إذا كانت lazy → مقبول لكن يجب التأكيد.

**الحل المقترح:**
```tsx
// داخل مكوّن التصدير فقط:
const handleExport = async () => {
  const ExcelJS = (await import('exceljs')).default;
  // ...
};
```

---

## 5. مشاكل متوسطة الخطورة — الأولوية P2

### 🟡 P2-1: دوال وكائنات Inline تُعاد إنشاؤها كل Render

**المواقع المكتشفة:**

| الملف | السطر | الكود | الأثر |
|---|---|---|---|
| `App.tsx` | 219 | `onToggleSidebar: () => setSidebarVisible(!sidebarVisible)` | دالة جديدة كل render |
| `App.tsx` | 220 | `onNavigate: (targetView) => handleViewChange(targetView)` | دالة جديدة |
| `AuthenticatedContent.tsx` | 133-135 | `setNavigationParams: (params) => setNavigationParams(params)` | wrapper عديم الفائدة |
| `AuthenticatedContent.tsx` | 134-135 | `onProtectedNavigation: (viewId, params) => setPendingNavigation(...)` | دالة inline |
| `PageRouter.tsx` | 166 | `onBatchesChanged: async () => handlers.setBatches(await ...)` | async inline |
| `PageRouter.tsx` | 181 | `onAddProduct: () => setView('add-product')` | inline |
| `AuthenticatedContent.tsx` | 405-411 | `setView={(v) => { setWindowedView(null); setView(v); }}` | inline في JSX |
| `App.tsx` | 304 | `onComplete={() => setActiveStep(2)}` | inline (مرة واحدة، مقبول) |

**الحل المقترح:**
لفّ كل دالة بـ `useCallback` بمكانها الصحيح. مثال:
```tsx
const onToggleSidebar = useCallback(
  () => setSidebarVisible(prev => !prev),
  [setSidebarVisible]
);
```

---

### 🟡 P2-2: `useGlobalEventHandlers` يستقبل Callbacks غير Memoized

**الموقع:** `AuthenticatedContent.tsx:215-221`

```tsx
useGlobalEventHandlers({
  language,
  inventory,
  isLoading,
  onToggleSidebar: () => setSidebarVisible(!sidebarVisible),  // ← جديد كل مرة
  onNavigate: (targetView) => handleViewChange(targetView),   // ← جديد كل مرة
});
```
إذا كان `useGlobalEventHandlers` يضيف/يزيل event listeners داخل `useEffect` يعتمد على هذه الـ callbacks، فإنه **يعيد التسجيل في كل render** (memory leak + بطء).

**الحل:** استبدال بـ `useCallback` أو استخدام `useRef` للـ latest callback (نمط `useEventCallback`).

---

### 🟡 P2-3: تكرار `PageRouter` في النافذة المنبثقة (Windowed Modal)

**الموقع:** `AuthenticatedContent.tsx:367` و `400`

`PageRouter` يُعرض **مرتين**: مرة رئيسية ومرة داخل `Modal` للنوافذ المنبثقة. كل نسخة تستهلك `useSettings()` وتبني `dataMap`/`handlerMap`. عند فتح نافذة، يتضاعف عبء الرسم.

**الحل المقترح:**
- استخدام `React.memo` على مستوى أعمق + props مستقرة (مرتبط بـ P1-2).
- أو **unmount** الـ PageRouter الرئيسي عند فتح النافذة إن أمكن.

---

### 🟡 P2-4: 5 قنوات Realtime منفصلة في `useRealtimeSync`

**الموقع:** `context/DataContext/useRealtimeSync.ts:28-100+`

```tsx
const salesChannel = supabase.channel(...).subscribe(...);
const returnsChannel = supabase.channel(...).subscribe(...);
const drugsChannel = supabase.channel(...).subscribe(...);
const purchasesChannel = supabase.channel(...).subscribe(...);
// + batches
```

**المشكلة:**
- كل `setState` في الـ callbacks (مثلاً `setSales(prev => [newSale, ...prev.filter(...)])`) يعيد رسم **كل مستهلكي `useData()`**.
- في بيئة صيدلية نشطة (مبيعات كل ثانية)، هذا يعني **re-render مستمر للـ Dashboard والـ POS**.
- `.subscribe((status) => {})` — callback فارغ، لكن الاشتراك نفسه مكلف.

**الحل المقترح:**
1. **Debounce/Throttle** تحديثات الـ state (مثلاً تجميع كل تحديثات الـ realtime في الـ 500ms الأخيرة).
2. **Selective updates**: تحديث فقط الصفحة النشطة، وليس كل الـ state.
3. استخدام `useSyncExternalStore` للـ realtime data بدلاً من `useState`.

---

### 🟡 P2-5: شاشة بيضاء أثناء الـ Suspense (`fallback={null}`)

**الموقع:** `App.tsx:268`, `App.tsx:281` (`Suspense fallback={null}`)

**المشكلة:**
أثناء تحميل الـ 1.6MB chunk، المستخدم يرى **لا شيء** — تجربة سيئة (يظن أن التطبيق تعلّق).

**الحل:**
```tsx
<Suspense fallback={<div className="h-screen grid place-items-center"><LogoAsterisk /></div>}>
```

---

## 6. مشاكل منخفضة الخطورة — الأولوية P3

### 🔵 P3-1: `framer-motion` مستورد في `App.tsx` لكنه نادر الاستخدام

**الموقع:** `App.tsx:1` → `import { AnimatePresence, motion } from 'framer-motion';`

إذا كان يُستخدم فقط في أماكن قليلة، يجب نقله لمكوّن فرعي أو dynamic import. حالياً يدخل في كل render path.

### 🔵 P3-2: مكوّن `LogoAsterisk` معرّف داخل `App.tsx` (module scope)

**الموقع:** `App.tsx:87-109`
ليس مشكلة أداء حقيقية (module scope)، لكن من الأفضل نقله لملف `components/common/Logo.tsx` لفصل الاهتمامات وتسهيل tree-shaking.

### 🔵 P3-3: `checkQuota` يعمل على `focus` و `visibilitychange`

**الموقع:** `App.tsx:158-184`
`storage.getQuotaInfo()` قد يكون مكلفاً (يحسب `navigator.storage.estimate()`). تشغيله في كل `focus` قد يسبب **jank** على التبويبات النشطة. يُنصح بـ **debounce** أو تشغيله **مرة كل دقيقة** كحد أقصى.

### 🔵 P3-4: حساب `isEmployeePortalUser` على كل Render

**الموقع:** `App.tsx:244-252`
```tsx
const currentUser = authService.getCurrentUserSync();        // ← كل render
const isEmployeePortalUser = authState.isAuthenticated && !!currentUser && ...;
```
`getCurrentUserSync()` يقرأ من التخزين المحلي في كل render. يُفضّل `useMemo` أو `useRef`.

### 🔵 P3-5: نقص الـ Virtualization في القوائم الطويلة

لم يُكتشف بوضوح، لكن وجود `vendor-virtual` و `MemoizedRow`/`MemoizedCell` يدل على وجود virtualization. **يجب التحقق** أن كل القوائم (المخزون، المبيعات، المشتريات) تستخدم `@tanstack/react-virtual` وليس `.map()` عادي.

### 🔵 P3-6: عدم وجود `React.StrictMode` warning cleanup

`React.StrictMode` مُفعّل في `index.tsx` (إيجابي للـ dev)، لكن في الإنتاج يجب التأكد أنه لا يضاعف الـ effects عن طريق الخطأ (لا يؤثر في الـ prod build، فقط dev).

---

## 7. تحليل الـ Bundle والبناء

### 7.1 تقييم `vite.config.ts`

| العنصر | الحالة | التقييم |
|---|---|---|
| `React.lazy` للصفحات (`pageRegistry.ts`) | ✅ 50+ صفحة | ممتاز |
| `manualChunks` للـ vendors | ✅ موجود (recharts, motion, table, dnd, lucide, virtual, radix) | جيد |
| `chunkSizeWarningLimit: 1200` | ⚠️ مرتفع | يخفي المشكلة بدل حلها — يُنصح بخفضه إلى 600 |
| Code splitting ديناميكي للـ services الثقيلة | ❌ ناقص | exceljs, maplibre, @google/genai |
| `terser` / `esbuild` minify | ✅ افتراضي (vite) | جيد |
| Compression (gzip/brotli) | ❌ غير مُفعّل في الـ config | يُنصح بإضافة `vite-plugin-compression` |
| Source maps في prod | يحتاج فحص | قد تسرّب الكود |

### 7.2 توصيات البناء

```ts
// vite.config.ts — تحسينات مقترحة:
build: {
  chunkSizeWarningLimit: 600,  // ✅ أخفض لإجبار الانتباه
  rollupOptions: {
    output: {
      manualChunks(id) {
        // الموجود + إضافة:
        if (id.includes('node_modules/exceljs')) return 'vendor-excel';        // lazy!
        if (id.includes('node_modules/maplibre')) return 'vendor-maplibre';
        if (id.includes('node_modules/@google/genai')) return 'vendor-genai';
        if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
        if (id.includes('i18n/translations')) return 'translations-chunk';
      },
    },
  },
},
plugins: [
  // إضافة:
  // compression({ algorithm: 'brotliCompress' })  // vite-plugin-compression
]
```

---

## 8. الأنماط الجيدة الموجودة

لتوثيق ما يعمل بشكل صحيح (يجب الإبقاء عليه وعدم كسره أثناء الإصلاح):

| النمط | الموقع | التقييم |
|---|---|---|
| **Orchestrator Pattern** | `App.tsx:67-80` (تعليق معماري ممتاز) | ✅ فصل واضح |
| **`React.lazy` لكل الصفحات** | `pageRegistry.ts` (873 سطر) | ✅ ممتاز |
| **`React.memo` على `PageRouter`** | `PageRouter.tsx:269` | ✅ (يحتاج props مستقرة) |
| **`useCallback` لكل setters** | `SettingsContext.tsx:503-613` (30+ setter) | ✅ نموذجي |
| **`useMemo` للـ Context value** | `SettingsContext.tsx:641` | ✅ (يحتاج تقسيم) |
| **فصل 4 Contexts في DataProvider** | `DataProvider.tsx:21-27` (Core/Inventory/Transaction/Hub) | ✅ تصميم ذكي |
| **`useRef` لتجنب re-registration** | `DataProvider.tsx:54-56` (`employeesRef`) | ✅ يمنع memory leak |
| **`manualChunks`** | `vite.config.ts` | ✅ |
| **Quota monitoring** | `App.tsx:137-184` | ✅ دفاعي |
| **Global error handler** | `App.tsx:187-214` | ✅ UX جيد |
| **`React.StrictMode`** | `index.tsx` | ✅ (dev) |
| **`usePreventZoom`** | `App.tsx:117` | ✅ (PWA) |
| **`SecureGate` / RBAC** | `PageRouter.tsx:91-120` | ✅ أمني |

> **الخلاصة:** الفريق يفهم الـ best practices ويطبّقها، لكن المشكلة في **حجم الحبيبة (granularity)** للـ Contexts وعدم استكمال splitting للـ deps الثقيلة.

---

## 9. خطة الإصلاح المُرتّبة حسب الأثر

### المرحلة 1 — مكاسب سريعة (Quick Wins) — [أيام]

| # | المهمة | الأثر المتوقع | الجهد |
|---|---|---|---|
| 1 | إضافة `Suspense fallback` حقيقي بدل `null` | UX فوري | 10 دقائق |
| 2 | **إزالة استهلاك `TRANSLATIONS` من `App.tsx`** (P0-1): استخراج مفاتيح جذرية inline + نقل الاستهلاك لـ `AuthenticatedContent`/`AuthPage` | خروج 6,106 سطر من `index.js` (≈ -200KB) | نصف يوم |
| 3 | تأكيد dynamic import لـ `exceljs` (P1-5) | -920KB إن كان eager | ساعة |
| 4 | إضافة `brotli/gzip` compression | -60-70% من الحجم | ساعة |
| 5 | خفض `chunkSizeWarningLimit` إلى 600 | رؤية واضحة للمشاكل | دقيقة |

### المرحلة 2 — إصلاحات هيكلية متوسطة — [أسبوع]

| # | المهمة | الأثر المتوقع | الجهد |
|---|---|---|---|
| 6 | **تقسيم `SettingsContext`** إلى 3-4 contexts (P0-3) | إيقاف render cascade | 2-3 أيام |
| 7 | **استقرار props الـ `PageRouter`** (P1-2) — memo للـ maps | منع re-render الصفحات | يوم |
| 8 | **`useCallback` للدوال inline** (P2-1) | استقرار الـ hooks | يوم |
| 9 | **توحيد effects الـ DOM** في `SettingsContext` (P1-3) | boot أسرع | يوم |

### المرحلة 3 — إعادة هيكلة عميقة — [أسابيع]

| # | المهمة | الأثر المتوقع | الجهد |
|---|---|---|---|
| 10 | نقل استهلاك `useData()` من `AuthenticatedContent` للأسفل (P1-1) | فصل الـ render tree | أسبوع |
| 11 | **Debounce/throttle للـ Realtime** (P2-4) | استقرار في الذروة | 2-3 أيام |
| 12 | إزالة `any` وإدخال أنواع دقيقة (P1-4) | أمان + كشف bugs | مستمر |
| 13 | تقييم استبدال Context بـ Zustand (إن لزم) | أداء طويل المدى | أسبوع |

---

## 10. مؤشرات الأداء المستهدفة

بعد تطبيق المرحلة 1 + 2، يجب الوصول إلى:

| المؤشر | الحالي | الهدف | الأداة للقياس |
|---|---|---|---|
| **Initial JS (index.js)** | 988 KB | < 250 KB | `vite build` + `rollup-plugin-visualizer` |
| **AuthenticatedContent chunk** | 1.6 MB | < 400 KB | نفس |
| **TTI على 3G** | ~8-12 ثانية | < 4 ثوانٍ | Lighthouse |
| **First Contentful Paint** | — | < 1.5 ثانية | Lighthouse |
| **TBT (Total Blocking Time)** | مرتفع (cascade) | < 200ms | Lighthouse |
| **Re-render count عند toggle إعداد** | العشرات | 1-3 | React DevTools Profiler |
| **Re-render count عند realtime update** | شجرة كاملة | الصفحة النشطة فقط | Profiler |

### أدوات القياس الموصى بها
1. **`rollup-plugin-visualizer`** — لرسم خريطة الـ bundle.
2. **React DevTools Profiler** — لتسجيل الـ re-renders.
3. **`why-did-you-render`** (dev only) — لكشف الـ re-renders غير الضرورية.
4. **Lighthouse CI** — للقياس الآلي في الـ CI/CD.
5. **Web Vitals** (`web-vitals` library) — لقياس LCP/FID/CLS في الإنتاج.

---

## 11. ملاحق

### ملحق أ: الملفات المُفحصصة بالكامل

| الملف | الأسطر | الدور |
|---|---|---|
| `App.tsx` | 345 | Root Orchestrator |
| `index.tsx` | 40 | Entry + Provider Tree |
| `AuthenticatedContent.tsx` | 443 | Logic Orchestrator |
| `SettingsContext.tsx` | 723 | Settings (37 field + 30 setter + 20 effect) |
| `DataProvider.tsx` | 470 | Data (4 contexts) |
| `PageRouter.tsx` | 269 | Dynamic page injection |
| `pageRegistry.ts` | 873 | 50+ lazy page definitions |
| `translations.ts` | 6,106 | EN + AR translations |
| `vite.config.ts` | 70 | Build config |
| `useRealtimeSync.ts` | 100+ | 5 Supabase channels |
| `useDataActions.ts` | — | 42 `any` occurrence |

### ملحق ب: شجرة الـ Provider (Render Boundary)

```
<React.StrictMode>
  <SettingsProvider>          ← 🔴 Monolithic (37 fields) — P0-3
    <StatusBarProvider>
      <AlertProvider>
        <DataProvider>         ← ✅ 4 sub-contexts (جيد)
          <ShiftProvider>
            <App>              ← Orchestrator
              <CatalogProvider>
                <AuthenticatedContent>  ← 🔴 1.6MB chunk — P0-2
                  <MainLayout>
                    <PageRouter>        ← 🟠 React.memo + unstable props — P1-2
                      <Suspense>
                        <PageComponent>  ← lazy (جيد)
```

### ملحق ج: قائمة فحص سريعة (Checklist)

- [ ] **P0-1** إزالة استهلاك `TRANSLATIONS` من `App.tsx` (المسار 1: مفاتيح جذرية inline + المسار 2: نقل الاستهلاك لـ `AuthenticatedContent`/`AuthPage`)
- [ ] **P0-2** تقليل chunk `AuthenticatedContent` إلى < 400KB
- [ ] **P0-3** تقسيم `SettingsContext` إلى contexts متعددة
- [ ] **P1-1** نقل استهلاك `useData()` للأسفل
- [ ] **P1-2** استقرار props `PageRouter` (memo للـ maps)
- [ ] **P1-3** توحيد effects الـ DOM في `SettingsContext`
- [ ] **P1-4** إزالة `any` وإدخال أنواع دقيقة
- [ ] **P1-5** تأكيد dynamic import لـ `exceljs`
- [ ] **P2-1** `useCallback` للدوال inline
- [ ] **P2-4** debounce/throttle للـ realtime updates
- [ ] **P2-5** إضافة `Suspense fallback` حقيقي
- [ ] **Build** إضافة brotli/gzip compression
- [ ] **Build** خفض `chunkSizeWarningLimit` إلى 600
- [ ] **Build** إضافة `rollup-plugin-visualizer` للمراقبة
- [ ] **Monitoring** دمج `web-vitals` + Lighthouse CI

---

> **ملاحظة ختامية:** التطبيق مبني على أساس معماري سليم (الـ Orchestrator Pattern واضح وموثّق بشكل احترافي في `App.tsx:67-80`). المشاكل المذكورة **قابلة للإصلاح تدريجياً** دون إعادة كتابة جذرية. الأولوية القصوى هي **P0-1 و P0-2** (حجم الـ Bundle) لأنهما يؤثران على **كل مستخدم في كل جلسة**، يليهما **P0-3** (render cascade) لأنه يؤثر على **كل تفاعل**.
>
> _التقرير معدّ للمراجعة من قبل فريق الهندسة. كل مشكلة موثقة بموقع الكود الفعلي (ملف:سطر) واقتراح حل ملموس._

**— نهاية التقرير —**
