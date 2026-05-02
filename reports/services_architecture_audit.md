# PharmaFlow — Services Architecture Audit

> **Date:** 2026-05-02  
> **Scope:** `services/` directory — 60 `.ts` files, 8,587 lines of production code  
> **Author:** Automated audit based on full source review

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| Total service files (excl. tests) | 60 |
| Total production lines | 8,587 |
| Domain folders | 21 |
| Base classes | 3 |
| Test files | 10 |
| **Test coverage (by file count)** | **26%** (10/38 service files) |
| Services with 0 tests & financial impact | 4 (critical) |
| Naming convention violations | 5 files |

### Verdict

البنية **مقبولة هيكلياً** — الـ domain folders منظمة، الـ base classes بتقلل التكرار، والـ RLS أمان حقيقي. لكن في **7 مشاكل جوهرية** بتخلي الكود صعب الصيانة والتوسع. مفيش منهم blocking — لكن كل واحدة بتزود الـ technical debt.

---

## 2. Security Model Assessment

### ✅ الحكم النهائي: آمن

الـ RLS chain يعتمد بالكامل على `auth.uid()` — موقّع من JWT Supabase ومش قابل للتلاعب:

```
User Request
    │
    ▼
auth.uid()          ← JWT signed by Supabase (immutable)
    │
    ▼
get_my_orgs()       ← SELECT org_id FROM org_members WHERE user_id = auth.uid()
    │                  (SECURITY DEFINER — bypasses RLS safely)
    ▼
RLS Policy:
  org_id  IN (SELECT get_my_orgs())         ← main tables
  branch_id IN (SELECT get_my_branches())   ← child tables
```

**لو user فتح DevTools وحاول يعمل `supabase.from('drugs').select('*')` مباشرة:**
- الـ RLS هيمنع أي row مش تابعة لـ `org_id` بتاعته.
- مش محتاج الـ frontend service عشان الحماية — Supabase هو الـ enforcement layer.

### ⚠️ Performance Note

`get_my_orgs()` و `get_my_branches()` مش معرّفين كـ `STABLE`:

```sql
-- Current:
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recommended:
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

بدون `STABLE`، PostgreSQL بيستدعي الـ function مرة لكل row بدل مرة واحدة للـ query. ده بيأثر على **الأداء** مش الأمان.

> [!TIP]
> **✅ [FIXED] 2026-05-02:**
> تم إنشاء Migration رقم `20260502000000` يضيف الـ `STABLE` marker للـ functions دي.

---

## 3. Structural Issues

### 3.1 — Three Base Classes With Overlapping Responsibilities

```
BaseDomainService (116 lines)
    ├── getAll(), getById(), create(), update(), delete()
    └── mapFromDb(), mapToDb()

BaseEntityService extends BaseDomainService (81 lines)
    ├── search() — ilike on searchColumns
    └── filterByStatus()

BaseReportService (146 lines — standalone)
    ├── getHistory() — date range + pagination
    ├── getAggregates() — sum/count
    └── mapDbToDomain(), mapDomainToDb()
```

| Class | Used By |
|---|---|
| `BaseDomainService` | `cashService` (shifts + transactions), `returnService` |
| `BaseEntityService` | `customerService`, `supplierService` |
| `BaseReportService` | `stockMovementService` only |

**المشكلة:** `BaseReportService` معندهاش inheritance relationship مع `BaseDomainService` رغم إن الاتنين بيعملوا نفس الـ pattern (table name, map from/to DB). ده بيعني إن `stockMovementService` مش ممكن يستخدم `create()` من `BaseDomainService`.

**التوصية:** إما merge `BaseReportService` into `BaseDomainService` كـ mixin/optional methods، أو document بوضوح ليه هم separate.

> [!TIP]
> **✅ [RESOLVED via Documentation] 2026-05-02:**
> تم إضافة توثيق معماري (Header Comments) في الـ 3 كلاسات يوضح سبب الفصل: الـ Reports هي `Append-only` ولا يجب أن ترث عمليات الحذف أو التعديل من الـ `BaseDomainService` للحفاظ على نزاهة البيانات. تم إبقاء الفصل "مقصوداً" مع توضيحه برمجياً.

---

### 3.2 — `transactionService` is a God Orchestrator (525 lines)

| Method | Lines | Orchestrates |
|---|---|---|
| `processCheckout` | ~160 | `batchService` → `inventoryService` → `stockMovementService` → `salesService` → `cashService` → `auditService` |
| `processReturn` | ~150 | `batchService` → `stockMovementService` → `salesService` → `cashService` → `auditService` |
| `processPurchaseTransaction` | ~40 | `purchaseService` → `cashService` → `auditService` |
| `processDirectPurchaseTransaction` | ~60 | `purchaseService` → `cashService` → `auditService` |
| `processPurchaseReturnTransaction` | ~35 | `purchaseService` → `returnService` → `cashService` → `auditService` |

**المشكلة مش إن الـ service موجودة** — ده pattern مشروع (Saga/Orchestrator). المشكلة إنها:

1. **خالطة orchestration بـ data mapping** — بتبني `Sale` objects يدوياً بدل ما `salesService` يعمل ده.
2. **الـ `UndoManager` pattern غير متسق** — `processCheckout` و `processDirectPurchase` عندهم undo. `processReturn` **مفيهاش** رغم إنها بتعدّل 4 tables.
3. **`processReturn` بتعمل `Promise.all` على writes مترابطة** — لو واحدة فشلت والتانية نجحت، مفيش rollback.

**التوصية:**
- فصل الـ mapping logic وإرجاعه للـ domain services.
- توحيد `UndoManager` كـ required pattern في كل method.
- تأجيل `Promise.all` للـ writes اللي فعلاً independent.

---

### 3.3 — `returnService` Duplicates `transactionService` Logic

`returnService.createSalesReturn()` بتعمل:
1. Update inventory
2. Log stock movements
3. Insert return record

بينما `transactionService.processReturn()` بتعمل **نفس الحاجة** بنهج مختلف. الاتنين موجودين ومتاحين للاستدعاء.

| Aspect | `returnService.createSalesReturn` | `transactionService.processReturn` |
|---|---|---|
| Stock movements | ✅ | ✅ |
| Batch allocation | ✅ | ✅ |
| Cash transaction | ❌ | ✅ |
| Sale update (netTotal) | ❌ | ✅ |
| UndoManager | ❌ | ❌ |
| Called from | `DataContext.addReturn` | `DataContext.processSalesReturn` |

**المشكلة:** مسارين لنفس العملية — حسب الكود اللي بيستدعيهم، ممكن return يحصل من غير ما الـ sale.netTotal يتحدث.

**التوصية:** `returnService.createSalesReturn()` المفروض يكون low-level persistence only. كل الـ business orchestration يمر من `transactionService`.

---

### 3.4 — Legacy Services Still in Codebase

#### `migrationService.ts` (115 lines)
- **مكتوب لـ localStorage** — بيستخدم `localStorage.getItem(StorageKeys.MIGRATION_BACKUP)`.
- **غير مستخدم مع Supabase** — الـ migration logic (6-digit codes, pack→unit conversion) كانت لنسخة offline قديمة.
- **خطورة:** صفر — لكنه dead code بيخلي الـ codebase أكبر من اللازم.

#### `backupService.ts` (156 lines)
- **بيعمل export/import من localStorage + IndexedDB**.
- **غير مرتبط بـ Supabase** — الـ data الحقيقية في الـ database، مش locally.
- **خطورة:** لو user عمل import قديم فوق data حديثة، هيحصل desync بين localStorage والـ DB.

#### `db.ts` (IndexedDB wrapper)
- **بيعرّف `STORES` لـ IndexedDB**: `inventory`, `sales`, `sync_queue`, etc.
- **المفروض يكون deprecated** — لكنه لسه imported في `backupService`.

**التوصية:** أرشفة الـ 3 files دول في folder `_legacy/` أو حذفهم بالكامل. هم مش بيتنفذوا في الـ normal flow.

---

### 3.5 — `geminiService.ts` — API Key Exposure Risk

```typescript
// DEV mode: Uses direct API key from .env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });
```

- **في DEV:** الـ API key بيتبعت directly من الـ browser. أي مستخدم يقدر يشوفه في Network tab.
- **في PROD:** بيروح على `/api/ai` — Netlify function proxy. ده آمن.
- **المشكلة:** `VITE_` prefix يعني الـ key مبني في الـ production bundle حتى لو مش بيتستخدم. Vite بيعمل tree-shake بس للـ dead code — الـ `if (import.meta.env.DEV)` conditional ممكن يفضل موجود حسب الـ build.

**التوصية:** استخدام Netlify function حتى في DEV (localhost proxy).

---

### 3.6 — `intelligenceService.ts` — The Largest Service (770 lines)

**وظيفته:** حسابات analytics معقدة — Procurement Summary, Risk Assessment, Financial KPIs, Pareto ABC Classification.

**المشكلة:**
1. **770 سطر في ملف واحد** — أكبر service في الكود بفارق كبير.
2. **بيعمل aggregate calculations في الـ frontend** بدل الـ database — `for (const sale of sales)` loops على كل الـ sales ده يفضل `SELECT SUM() GROUP BY` في SQL.
3. **بيعمل N+1 calls** — `getAll()` for drugs + `getAll()` for sales + `getAll()` for batches في كل method call.
4. **0 tests** على service بيحسب KPIs مالية.

**التوصية:** تقسيم لـ 4 files (`procurement.ts`, `risk.ts`, `financials.ts`, `audit.ts`) ونقل الـ heavy aggregations لـ SQL views أو Supabase RPC functions.

---

## 4. Naming Convention Violations

| File | Convention | Expected |
|---|---|---|
| `DashboardService.ts` | PascalCase | `dashboardService.ts` |
| `BaseReportService.ts` | PascalCase | `baseReportService.ts` |
| `BaseDomainService.ts` | PascalCase | `baseDomainService.ts` |
| `BaseEntityService.ts` | PascalCase | `baseEntityService.ts` |
| `DrugSearchEngine.ts` | PascalCase | `drugSearchEngine.ts` |
| `forgotPassword.service.ts` | dot-separated | `forgotPasswordService.ts` |

**الـ Pattern:** 32/38 files بتستخدم `camelCase.ts`. الـ 6 الباقيين PascalCase أو dot-separated.

**ملاحظة:** `DashboardService.ts` هو الوحيد اللي بيعمل export لـ **class** مش object/singleton — ده بيفسر الـ PascalCase. بس الـ base classes كمان classes ومع ذلك بعضهم PascalCase. الـ convention مش consistent.

**التوصية:** توحيد على `camelCase` لكل الـ service files. الـ class name جوا الملف يفضل PascalCase.

---

## 5. Test Coverage Analysis

### Tested Services (10/38 = 26%)

| Service | Test File | Risk Level |
|---|---|---|
| `authService` | ✅ `authService.test.ts` | 🟢 |
| `hashUtils` | ✅ `hashUtils.test.ts` | 🟢 |
| `customerService` | ✅ `customerService.test.ts` | 🟢 |
| `batchService` | ✅ `batchService.test.ts` | 🟢 |
| `inventoryService` | ✅ `inventoryService.test.ts` | 🟢 |
| `purchaseService` | ✅ `purchaseService.test.ts` | 🟢 |
| `salesService` | ✅ `salesService.test.ts` | 🟢 |
| `settingsService` | ✅ `settingsService.test.ts` | 🟢 |
| `supplierService` | ✅ `supplierService.test.ts` | 🟢 |
| `timeService` | ✅ `timeService.test.ts` | 🟢 |

### Critical Untested Services

| Service | Lines | Risk | Why Critical |
|---|---|---|---|
| **`transactionService`** | 525 | 🔴 **P0** | Orchestrates ALL financial transactions — sale checkout, returns, purchases. A bug here = data corruption across 5+ tables. |
| **`cashService`** | 217 | 🔴 **P0** | Manages shifts and cash register. Cash discrepancies = direct financial loss. |
| **`returnService`** | 300 | 🔴 **P1** | Handles refunds and stock restoration. Untested refund logic = money leak. |
| **`intelligenceService`** | 770 | 🟡 **P2** | Financial KPIs and analytics. Wrong numbers mislead business decisions. |
| **`DashboardService`** | 438 | 🟡 **P2** | Revenue/COGS/profit calculations. Pure functions — easiest to test. |
| **`pricingService`** | — | 🟡 **P2** | Price calculations affect every sale. |

**ملاحظة قاسية:** الـ services اللي فيها tests هي الـ CRUD البسيط (add/update/delete). الـ services اللي **محتاجة** tests بجد — orchestration و financial calculations — هي بالظبط اللي مفيهاش ولا test واحد.

---

## 6. Dependency Map

```
                    ┌──────────────┐
                    │ DataContext   │ (642 lines — wires everything)
                    └──────┬───────┘
                           │ delegates to
              ┌────────────┼──────────────┐
              ▼            ▼              ▼
     transactionService  refreshAll()   switchBranch()
     (525 lines)          │               │
     │                    │               │
     ├→ salesService      ├→ inventoryService
     ├→ purchaseService   ├→ salesService
     ├→ batchService      ├→ supplierService
     ├→ inventoryService  ├→ purchaseService
     ├→ stockMovementSvc  ├→ returnService
     ├→ cashService       ├→ customerService
     ├→ auditService      ├→ employeeService
     ├→ returnService     ├→ batchService
     └→ settingsService   └→ branchService
```

**Key risk:** `transactionService` imports 8 services directly. لو أي واحد فيهم changed API، الـ orchestrator بيتكسر.

---

## 7. Recommendations Matrix

| # | Issue | Priority | Effort | Impact |
|---|---|---|---|---|
| 1 | Add tests for `transactionService` | 🔴 P0 | High | Prevents data corruption |
| 2 | Add tests for `cashService` | 🔴 P0 | Medium | Prevents financial errors |
| 3 | Add tests for `DashboardService` (pure functions) | 🟡 P1 | Low | Quick win — all static methods |
| 4 | Remove `UndoManager` gap in `processReturn` | 🔴 P0 | Low | Prevents partial writes |
| 5 | Eliminate `returnService` ↔ `transactionService` duplication | 🟡 P1 | Medium | Single path for returns |
| 6 | Archive `migrationService`, `backupService`, `db.ts` | 🟢 P2 | Low | Reduces dead code |
| 7 | Standardize naming to camelCase | 🟢 P3 | Low | Consistency |
| 8 | Add `STABLE` to RLS helper functions | 🟡 P1 | Trivial | DB performance |
| 9 | Move `intelligenceService` aggregations to SQL | 🟡 P2 | High | Frontend performance |
| 10 | Secure `geminiService` dev-mode API key | 🟡 P1 | Medium | Security |

---

## 8. Summary Per Service

> Quick reference for each service — what it does, what's wrong, and its test status.

| # | Service | Lines | Base Class | Tests | Role | Issues |
|---|---|---|---|---|---|---|
| 1 | `inventoryService` | 307 | Custom | ✅ | Drug CRUD + stock updates | — |
| 2 | `batchService` | 535 | Custom | ✅ | Stock batch management (FEFO) | — |
| 3 | `stockMovementService` | 281 | `BaseReportService` | ❌ | Movement logging + history | — |
| 4 | `salesService` | 255 | `BaseDomainService` | ✅ | Sale CRUD | — |
| 5 | `pricingService` | — | — | ❌ | Price calculations | Should be tested |
| 6 | `purchaseService` | 348 | `BaseDomainService` | ✅ | Purchase order CRUD | — |
| 7 | `returnService` | 300 | `BaseDomainService` | ❌ | Returns (sales + purchase) | Duplicates `transactionService` |
| 8 | `cashService` | 217 | `BaseDomainService` | ❌ | Shifts + cash transactions | **P0: No tests on money** |
| 9 | `customerService` | 209 | `BaseEntityService` | ✅ | Customer CRUD + search | — |
| 10 | `supplierService` | — | `BaseEntityService` | ✅ | Supplier CRUD + search | — |
| 11 | `employeeService` | — | Custom | ❌ | Employee CRUD | — |
| 12 | `authService` | 473 | Custom | ✅ | Auth + session management | — |
| 13 | `forgotPassword.service` | — | — | ❌ | Password reset | Naming violation |
| 14 | `permissions` | — | — | ❌ | Role-based access | — |
| 15 | `transactionService` | 525 | — | ❌ | **Orchestrator** | **P0: No tests, UndoManager gap** |
| 16 | `cashService` | 217 | — | ❌ | Cash register | **P0: No tests** |
| 17 | `DashboardService` | 438 | — | ❌ | Analytics (pure functions) | Easy to test |
| 18 | `intelligenceService` | 770 | — | ❌ | BI analytics | **Largest file, 0 tests** |
| 19 | `geminiService` | 280 | — | ❌ | AI integration | Dev API key exposure |
| 20 | `settingsService` | — | Custom | ✅ | App settings | — |
| 21 | `branchService` | 177 | Custom | ❌ | Branch CRUD | — |
| 22 | `orgService` | 207 | — | ❌ | Organization management | — |
| 23 | `orgMembersService` | — | — | ❌ | Org membership | — |
| 24 | `orgAggregationService` | 241 | — | ❌ | Cross-branch aggregation | — |
| 25 | `timeService` | 233 | — | ✅ | Server time sync | — |
| 26 | `auditService` | — | — | ❌ | Audit logging | Fire-and-forget, low risk |
| 27 | `validationService` | — | — | ❌ | Data validation | — |
| 28 | `migrationService` | 115 | — | ❌ | **Legacy** (localStorage) | Dead code |
| 29 | `backupService` | 156 | — | ❌ | **Legacy** (localStorage/IDB) | Dead code |
| 30 | `DrugSearchEngine` | 230 | — | ❌ | Full-text search engine | — |

---

## 9. The Hidden Orchestrator: `DataContext` ↔ `useEntityHandlers`

> هذا القسم يغطي أخطر مشكلة معمارية في الكود — مش في `services/`، لكن في الطبقة اللي فوقيها.

### 9.1 — الأرقام

| File | Lines | Bytes | Imports |
|---|---|---|---|
| `DataContext.tsx` | 642 | 25KB | 16 services + 3 hooks |
| `useEntityHandlers.ts` | **1,801** | **64KB** | 17 services + 6 utils |
| **المجموع** | **2,443** | **89KB** | — |

للمقارنة: **كل الـ services مجتمعة = 8,587 سطر**. ده معناه إن الـ "wiring layer" لوحدها = **28%** من حجم كل الـ services.

---

### 9.2 — الفصل المزعوم: مين بيعمل إيه؟

```
┌─────────────────────────────────────────────────┐
│              useEntityHandlers.ts                │
│              (1,801 lines)                       │
│                                                  │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Auth    │  │ Business │  │ UI Feedback    │  │
│  │ Guards  │  │ Logic    │  │ (success/error)│  │
│  │         │  │          │  │                │  │
│  │ L:222-  │  │ L:633-   │  │ Inline in     │  │
│  │   630   │  │  1700    │  │ every handler │  │
│  └────┬────┘  └────┬─────┘  └───────┬────────┘  │
│       │            │                │            │
│       ▼            ▼                ▼            │
│  permissionsService   transactionService    useAlert()│
│                       inventoryService              │
│                       batchService                  │
│                       stockOps.*                    │
│                       salesService                  │
└──────────────────────┬──────────────────────────────┘
                       │ delegates some ops
                       ▼
              ┌────────────────┐
              │  DataContext    │
              │  (642 lines)   │
              │                │
              │  - State mgmt  │
              │  - Realtime    │
              │  - refreshAll  │
              │  - switchBranch│
              └────────────────┘
```

**الفكرة المقصودة:**
- `DataContext` = State + Realtime subscriptions + data fetching
- `useEntityHandlers` = UI handlers (auth guards + delegate to services)
- `transactionService` = Business orchestration (atomic multi-table writes)

**الواقع:**
- `useEntityHandlers` **هو orchestrator ثاني** بيعمل business logic مباشرة.

---

### 9.3 — ثلاث مسارات مختلفة لنفس العمليات

#### مثال: عملية البيع (Sale)

| المسار | الكود | ماذا يفعل |
|---|---|---|
| **المسار A** | `useEntityHandlers.handleCompleteSale` → `DataContext.completeSale` → `transactionService.processCheckout` | ✅ صح — يمر من كل الطبقات |
| **المسار B** | `DataContext.addSale` → `salesService.create` مباشرة | ⚠️ يتجاوز `transactionService` — لا batch allocation، لا stock movement |

#### مثال: عملية الإرجاع (Return)

| المسار | الكود | ماذا يفعل |
|---|---|---|
| **المسار A** | `useEntityHandlers.handleProcessReturn` → `DataContext.processSalesReturn` → `transactionService.processReturn` | ✅ صح — atomic |
| **المسار B** | `DataContext.addReturn` → `returnService.createSalesReturn` | ⚠️ يتجاوز cash transaction + sale.netTotal update |

#### مثال: إلغاء البيع (Sale Cancellation)

| المسار | الكود | ماذا يفعل |
|---|---|---|
| **المسار الوحيد** | `useEntityHandlers.handleUpdateSale` (lines 1200-1606) | 🔴 **400 سطر من business logic** مباشرة في الـ hook — لا يمر من `transactionService` نهائياً |

ده أخطر مثال: الـ cancellation logic (استرجاع stock، تعديل shift balance، order modifications للـ delivery) **كله مكتوب inline** في الـ hook بدل ما يكون في service مخصص.

---

### 9.4 — المشاكل الجوهرية

#### 🔴 A. `handleUpdateSale` — 400 سطر من الـ Business Logic في Hook

```typescript
// Lines 1200-1606 in useEntityHandlers.ts
const handleUpdateSale = useCallback(async (saleId, updates) => {
  // Cancellation: 100 lines of stock restoration
  // Item modification: 200 lines of batch allocation/deallocation  
  // Delivery completion: 20 lines of shift recording
  // Persistence: 10 lines
}, [...26 dependencies]);
```

هذا الـ handler لوحده:
- يستدعي `stockOps.returnStock()` و `stockOps.deductStock()` مباشرة
- يتعامل مع `batchService.getAllBatches()` يدوياً
- يعمل `inventoryService.updateStock()` per-item في loop
- يسجل cash transactions مباشرة عبر `addTransaction()`
- **مفيهوش UndoManager** — لو فشل في النص، الـ stock يفضل inconsistent
- **مفيهوش test واحد**

#### 🔴 B. Legacy `migrationService` لسه بيتنفذ

```typescript
// Line 198-219 in useEntityHandlers.ts
useEffect(() => {
  const { hasUpdates, migratedInventory } = migrationService.runMigrations(inventory);
  if (hasUpdates) setInventory(migratedInventory);
}, [isLoading, inventory, setInventory]);
```

الـ `migrationService` (اللي قلنا عليه dead code في Section 3.4) **لسه بيتنفذ on every mount**. بيعمل localStorage reads وstock calculations على data بقت في Supabase.

#### 🟡 C. `useCallback` Dependency Arrays مش دقيقة

```typescript
// Line 465 — handleAddSupplier dependencies
[setSuppliers, currentEmployeeId, employees, activeBranchId, error, success]
```

`employees` هنا array reference — بيتغير مع كل `refreshAll()`. ده معناه إن **كل الـ handlers بتتعمل recreate** مع كل data refresh رغم إن الـ handler مش بيستخدم الـ array كله — بس بيعمل `.find()` على employee واحد.

#### 🟡 D. `applyPurchaseToInventory` — Dead Code (133 lines)

```typescript
// Lines 633-716 — applyPurchaseToInventory
const applyPurchaseToInventory = useCallback(async (purchase: Purchase) => {
  // 133 lines of inventory update logic
  // ...
}, [inventory, setInventory, setBatches, ...]);
```

هذه الدالة **مش موجودة في الـ return object** (line 1765-1799). معنى ده إنها **dead code** — 133 سطر مش بيتنفذوا خالص. الـ purchase flow الفعلي بيمر من `transactionService.processDirectPurchaseTransaction`.

---

### 9.5 — الحجم الحقيقي للمشكلة

| Layer | Lines | Business Logic? | Tests? |
|---|---|---|---|
| `services/` (38 files) | 8,587 | ✅ Moderate | 26% |
| `transactionService` | 525 | ✅ Heavy | ❌ |
| **`useEntityHandlers`** | **1,801** | **✅ Heavy** | **❌** |
| `DataContext` | 642 | Minimal | ❌ |
| **Total orchestration without tests** | **2,968** | — | **0%** |

**الأرقام بتقول:** في ~3,000 سطر من orchestration code (الكود اللي بيربط كل حاجة ببعض) — **وده بالظبط الكود اللي مفيهوش ولا test واحد.**

---

### 9.6 — خطة التعامل

| # | Action | Priority | Effort | Impact |
|---|---|---|---|---|
| 1 | نقل `handleUpdateSale` cancellation/modification logic لـ `transactionService.processCancellation()` | 🔴 P0 | High | يوحّد الـ rollback logic في مكان واحد |
| 2 | حذف `applyPurchaseToInventory` (dead code) | 🟢 P2 | Trivial | -133 lines |
| 3 | إزالة `migrationService` call من الـ useEffect | 🟡 P1 | Trivial | Removes legacy execution |
| 4 | فصل `useEntityHandlers` لـ domain-specific hooks | 🟡 P2 | Medium | `useInventoryHandlers`, `useSalesHandlers`, `usePurchaseHandlers`, `useHRHandlers` |
| 5 | استبدال `employees` array dependency بـ `currentEmployeeId` + مرجع مستقر | 🟢 P3 | Low | Reduces unnecessary re-renders |
| 6 | توحيد المسارات: كل operation يمر من `transactionService` أو ما يمرش — مفيش middle ground | 🔴 P0 | High | Architectural clarity |

---

*End of audit.*
