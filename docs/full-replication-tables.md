# كشف شامل بجميع ملفات المزامنة وتحديثات الكاش

> هذا الملف يغطي **كل** ملف يؤثر على React Query Cache في المشروع، مع شرح وظيفته، حالته، وما يتبقى لإكمال "الريبلكيشن الكامل".

---

## 1. 📦 `hooks/mutations/useSalesMutations.ts`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `useCompleteSale` | `setQueryData([inventory.all], deduct stock)` + `invalidateQueries` لـ 8 keys (sale detail, shifts, cashTx, inventory, batches, sales.recent, sales.today, dashboard) | إتمام عملية البيع — خصم المخزون، تحديث الشفت، إضافة الفاتورة للقائمة | 🔶 | `setQueryData` يتبعه `invalidateQueries` على نفس المفتاح — إزالة الـ `invalidateQueries` الزائدة والاكتفاء بـ `setQueryData` + Realtime |
| `useAddSale` | `invalidateQueries` لـ 4 keys (sale detail, sales.recent, sales.today, dashboard) | إضافة فاتورة آجلة/معلقة (بدون دفع) | ❌ | لا يوجد أي `setQueryData` — إضافة تحديث متفائل لقوائم المبيعات + لوحة التحكم |

---

## 2. 📦 `hooks/mutations/useReturnsMutations.ts`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `useProcessSalesReturn` | `setQueriesData(['sales'], mark hasReturns)` + `invalidateQueries` لـ 7 keys (sale detail, shifts, cashTx, inventory, batches, returns.sales, dashboard) | تسجيل مرتجع مبيعات | 🔶 | إضافة `setQueryData` لإرجاع الكميات للمخزون + الباتشات بدلاً من invalidate |
| `useCreatePurchaseReturn` | `invalidateQueries` لـ 5 keys (shifts, cashTx, inventory, returns.purchases, dashboard) | تسجيل مرتجع مشتريات | ❌ | لا يوجد أي `setQueryData` — إضافة تحديث متفائل للمخزون + قائمة المرتجعات |

---

## 3. 📦 `hooks/mutations/usePurchaseMutations.ts`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `useAddPurchase` | `invalidateQueries` لـ 2-4 keys (purchases.all, dashboard, + inventory + batches if completed) | إضافة فاتورة مشتريات جديدة | ❌ | إضافة `setQueryData` للمخزون والباتشات عند الاكتمال |
| `useApprovePurchase` | `invalidateQueries` لـ 5 keys (purchase detail, purchases.all, inventory, batches, dashboard) | الموافقة على أمر شراء | ❌ | `setQueryData` لدمج كميات الفاتورة مع كاش المخزون والباتشات |
| `useMarkPurchaseReceived` | `invalidateQueries` لـ 5 keys (مثل approve) | تسلم المشتريات | ❌ | مثل `useApprovePurchase` |
| `useRejectPurchase` | `invalidateQueries` لـ 5 keys (مثل approve) | رفض الأمر | ❌ | `setQueryData` لتحديث حالة الفاتورة فقط (لا تأثير على المخزون) |

---

## 4. 📦 `hooks/mutations/useInventoryMutations.ts`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `useAddProduct` | `invalidateQueries` لـ 2 keys (inventory.all, batches.all) | إضافة صنف جديد للمخزون | ❌ | `setQueryData` لإضافة الصنف للكاش |
| `useUpdateProduct` | `invalidateQueries` لـ 2 keys (inventory.all, batches.all) | تعديل بيانات صنف | ❌ | `setQueryData` لتحديث الصنف في الكاش |
| `useDeleteProduct` | `invalidateQueries` لـ 1 key فقط (inventory.all) — **ينقصه batches** | حذف صنف | ❌ | `setQueryData` للحذف + إضافة `removeQueries` للـ batch detail + إصلاح نقص batches |

---

## 5. 📦 `hooks/mutations/useCustomerMutations.ts`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `useAddCustomer` | `invalidateQueries([customers.all(branchId)])` | إضافة عميل | 🔶 | `setQueryData` (الـ Realtime Patcher `patchListCache` موجود ✅ للـ cross-device) |
| `useUpdateCustomer` | `invalidateQueries([customers.all(branchId)])` | تعديل بيانات عميل | 🔶 | `setQueryData` لتحديث بيانات العميل + نقاط الولاء |
| `useDeleteCustomer` | `invalidateQueries([customers.all(branchId)])` | حذف عميل | 🔶 | `setQueryData` لحذف العميل من الكاش |

---

## 6. 📦 `hooks/mutations/useSupplierMutations.ts`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `useAddSupplier` | `invalidateQueries([suppliers.all(branchId)])` | إضافة مورد | 🔶 | `setQueryData` (الـ Realtime Patcher موجود ✅) |
| `useUpdateSupplier` | `invalidateQueries([suppliers.all(branchId)])` | تعديل بيانات مورد | 🔶 | `setQueryData` |
| `useDeleteSupplier` | `invalidateQueries([suppliers.all(branchId)])` | حذف مورد | 🔶 | `setQueryData` |

---

## 7. 📦 `hooks/mutations/useEmployeeMutations.ts`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `useAddEmployee` | `invalidateQueries([employees.all, employees.allByOrg])` | إضافة موظف | ❌ | `setQueryData` + **إضافة اشتراك Realtime لجدول employees** (غير موجود حالياً) |
| `useUpdateEmployee` | `invalidateQueries([employees.all, employees.allByOrg])` | تعديل موظف | ❌ | نفس الشيء |
| `useDeleteEmployee` | `invalidateQueries([employees.all, employees.allByOrg])` | حذف موظف | ❌ | نفس الشيء |

---

## 8. 📂 `hooks/sales/useSalesHandlers.ts`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `handleUpdateSale` (إلغاء) | Local state + 8 `invalidateQueries` (inventory, batches, sales.recent, sales.today, sale detail, shifts, cashTx) | إلغاء فاتورة وإرجاع المخزون | 🔶 | الاستغناء عن الـ React state الموازي + استبدال invalidation بـ `setQueryData` |
| `handleUpdateSale` (تعديل) | Local state + 5 `invalidateQueries` (inventory, batches, sales.recent, sales.today, sale detail) | تعديل أصناف الفاتورة | 🔶 | نفس الشيء |
| `handleUpdateSale` (إتمام توصيل) | 6 `invalidateQueries` (sales.recent, sales.today, sale detail, shifts, cashTx, dashboard) | تغيير حالة الطلب إلى مكتمل | ❌ | `setQueryData` لتغيير الحالة + تحديث الشفت/الخزنة |

---

## 9. 📂 `hooks/inventory/useInventoryHandlers.ts`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `handleAddDrug` | Local state + `batchService.getAllBatches()` + 3 `invalidateQueries` (inventory, batches, dashboard) | إضافة صنف مع batches | 🔶 | إزالة `batchService.getAllBatches()` والاكتفاء بـ `setQueryData` |
| `handleUpdateDrug` | Local state + 4 `invalidateQueries` (inventory, drug detail, batches, dashboard) | تعديل صنف + تسوية رصيد | ❌ | `setQueryData` بدلاً من invalidation |
| `handleDeleteDrug` | Local state + `removeQueries([drug detail])` + 3 `invalidateQueries` (inventory, batches, dashboard) | حذف صنف | 🔶 | `setQueryData` للحذف + التخلص من `batchService.getAllBatches()` |
| `handleRestock` | `inventoryService.processStockAdjustment()` + 4 `invalidateQueries` (inventory, batches, dashboard) | إضافة رصيد يدوي | ❌ | `setQueryData` للكمية الجديدة + الباتشات |

---

## 10. 📂 `hooks/finance/useExpenses.ts`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `recordExpense` | `invalidateExpenses()` (predicate) + `invalidateQueries` للـ shifts + cashTx | تسجيل مصروف | ❌ | صعب التحسين due to filter-based queries. **الحل:** `setQueryData` للـ shifts/cashTx فقط، وترك invalidateExpenses مؤقتاً |
| `deleteExpense` | `invalidateExpenses()` فقط | حذف مصروف | ❌ | نفس الشيء |

---

## 11. 📂 `components/sales/useCashRegister.ts`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `handleOpenShift` | عبر `startShift()` → `refreshShifts()` → `invalidateQueries([shifts.all])` | فتح شفت | ❌ | `setQueryData` لإضافة الشفت الجديد للكاش |
| `handleCloseShift` | عبر `endShift()` → `refreshShifts()` → `invalidateQueries([shifts.all])` | غلق شفت | ❌ | `setQueryData` لتحديث حالة الشفت |
| `handleCashTransaction` (صرف) | `expenseService.recordExpense()` + `refreshShifts()` + `invalidateQueries([cashTx])` | صرف من الخزنة | ❌ | `setQueryData` لإضافة الحركة |
| `handleCashTransaction` (قبض) | عبر `addTransaction()` → `refreshShifts()` + `invalidateQueries([cashTx])` | إيداع في الخزنة | ❌ | `setQueryData` مباشرة |

---

## 12. 📂 `hooks/sales/useShift.tsx`

| الدالة | الـ Cache Operations الحالية | وظيفتها | تم؟ | المطلوب |
|--------|------------------------------|---------|:---:|---------|
| `refreshShifts` | `invalidateQueries([shifts.all(branchId)])` | تحديث قائمة الشفتات | ❌ | `setQueryData` |
| `addTransaction` | `refreshShifts()` + `invalidateQueries([cashTx])` | إضافة حركة خزنة | ❌ | `setQueryData` لإضافة الحركة |
| `startShift` → `openShift` | `refreshShifts()` بعد الاستدعاء | فتح شفت | ❌ | `setQueryData` |
| `endShift` → `closeShift` | `refreshShifts()` بعد الاستدعاء | غلق شفت | ❌ | `setQueryData` |

---

## 13. 🛠️ `services/realtime/patchers.ts`

| الدالة | الوظيفة | المعطيات | تم؟ | المطلوب |
|--------|---------|---------|:---:|---------|
| `patchListCache<T>` | تحديث قائمة مسطحة (flat array) في الكاش عند INSERT/UPDATE/DELETE عبر Realtime | `queryKeyFactory`, `currentBranchId` | ✅ | يدعم `T[]` فقط — يحتاج `patchPagedListCache<T>` للـ `{ rows: T[], count: number }` |
| `patchDetailCache<T>` | تحديث كاش العنصر الفردي (detail) عند INSERT/UPDATE/DELETE | `queryKeyFactory` | ✅ | لا تغيير |
| `invalidateBranchScope(prefix)` | إبطال جميع الاستعلامات التي تبدأ بـ prefix وتحتوي على branchId | `prefix`, `currentBranchId` | ✅ | مؤقت — سيتم الاستغناء عنه تدريجياً |
| `invalidateDashboard(branchId)` | إبطال كاش لوحة التحكم | `currentBranchId` | ✅ | **جديد:** إنشاء `patchDashboardStats` أو الانتقال لجدول `dashboard_summary` |
| **جديد:** `patchPagedListCache<T>` | تحديث القائمة المقسمة إلى صفحات (`{ rows, count }`) | `queryKeyFactory`, `currentBranchId` | ❌ | **إنشاؤه** لدعم sales.recent, sales.today, purchases.all |

---

## 14. 🛠️ `services/realtime/registry.ts`

| الجدول (Table) | الأحداث (Events) | المعالجات الحالية (Handlers) | نوع التحديث | تم؟ | المطلوب |
|:--------------|:----------------:|:----------------------------|:-----------:|:---:|:--------|
| `drugs` | `*` | `patchListCache(inventory.all)` + search index + `invalidateDashboard` | Delta (قائمة) | ✅ | إضافة `patchDetailCache(inventory.detail)` للـ `['drug', drugId]` |
| `stock_batches` | `*` | `patchListCache(batches.all)` + `invalidateDashboard` | Delta (قائمة) | ✅ | إضافة `patchDetailCache(batches.detail)` للـ `['batch', batchId]` |
| `sales` | `*` | `invalidateBranchScope('sales')` + `patchDetailCache(sales.detail)` + `invalidateDashboard` | Full refetch + Delta detail | 🔶 | تغيير `invalidateBranchScope` إلى `patchPagedListCache` |
| `returns` | `*` | `invalidateBranchScope('returns')` + `invalidateDashboard` | Full refetch | ❌ | إضافة `patchPagedListCache` |
| `purchases` | `*` | `invalidateBranchScope('purchases')` + `patchDetailCache(purchases.detail)` + `invalidateDashboard` | Full refetch + Delta detail | 🔶 | تغيير `invalidateBranchScope` إلى `patchPagedListCache` |
| `customers` | `*` | `patchListCache(customers.all)` | Delta | ✅ | لا تغيير |
| `suppliers` | `*` | `patchListCache(suppliers.all)` | Delta | ✅ | لا تغيير |
| `shifts` | `*` | `patchListCache(shifts.all)` + `patchDetailCache(shifts.detail)` | Delta | ✅ | لا تغيير |
| `expenses` | `*` | `invalidateBranchScope('expenses')` | Full refetch | ❌ | صعب التحسين due to filter queries |
| `cash_transactions` | `*` | `invalidateBranchScope('cashTransactions')` + `invalidateQueries([shifts.all])` | Full refetch | ❌ | إضافة `patchListCache` |
| `employees` | — | **غير موجود** ❌ | — | ❌ | **إنشاء اشتراك** + `patchListCache(employees.all)` و `employees.allByOrg` |
| `branches` | — | **غير موجود** ❌ | — | ❌ | **إنشاء اشتراك** + `patchListCache(branches.all)` |
| `org` | — | **غير موجود** ❌ | — | ❌ | **إنشاء اشتراك** + `patchDetailCache` |
| `achievements` | — | **غير موجود** ❌ | — | ❌ | أولوية منخفضة |
| `audit` | — | **غير موجود** ❌ | — | ❌ | أولوية منخفضة |

---

## 15. 🛠️ `services/realtime/useRealtimeDispatcher.ts`

| السلوك | الـ Cache Operations | تم؟ | المطلوب |
|--------|---------------------|:---:|---------|
| Online recovery (عودة الاتصال) | `invalidateQueries` لكل البادئات (12 prefix: inventory, batches, sales, purchases, returns, employees, customers, suppliers, branches, shifts, cashTx, expenses, audit, dashboard) | ✅ | تحسين ليكون انتقائياً بناءً على `updated_at` بدلاً من إعادة تحميل الكل |

---

## 16. 📁 `hooks/queries/` — جميع ملفات الاستعلامات

| الملف | الـ Hooks الموجودة | Query Keys | staleTime | علاقتها بالمزامنة |
|-------|-------------------|-----------|:---------:|-------------------|
| `useSalesQuery.ts` | `useRecentSales`, `useTodaySales`, `useSale`, `useSalesPage`, `useEmployeeSales`, `useCustomerSales` | sales.recent, sales.today, sale detail, sales.page, sales.employee, sales.customer | 1-5 min | تحتاج `patchPagedListCache` للـ recent/today/page |
| `useReturnsQuery.ts` | `useSalesReturns`, `usePurchaseReturns` | returns.sales, returns.purchases | 5 min | تحتاج `patchPagedListCache` |
| `usePurchasesQuery.ts` | `usePurchases`, `usePurchase`, `usePurchasesPage` | purchases.all, purchase detail, purchases.page | 1-5 min | تحتاج `patchPagedListCache` للـ all/page |
| `useInventoryQuery.ts` | `useRawInventory`, `useDrug`, `useLowStock`, `useBatches`, `useBatch` | inventory.all, drug detail, low-stock, batches.all, batch detail | 5 min | Detail patcher مفقود للـ drug و batch |
| `useDashboardQuery.ts` | `useDashboardStats` | dashboard.stats | 5 min | Full refetch في كل مرة — يحتاج `patchDashboardStats` أو جدول مخصص |
| `useCustomersQuery.ts` | `useRawCustomers`, `useCustomers` | customers.all | 30 min | ✅ Patcher موجود |
| `useSuppliersQuery.ts` | (ضمن useInventoryQuery) | suppliers.all | 30 min | ✅ Patcher موجود |
| `useEmployeesQuery.ts` | `useEmployees`, `useAllEmployees` | employees.all, employees.allByOrg | 60 min | ❌ لا يوجد Realtime subscription |
| `useBranchesQuery.ts` | `useBranches` | branches.all | 30 min | ❌ لا يوجد Realtime subscription |
| `useOrgQuery.ts` | `useActiveOrg`, `useOrgMembers`, `useOrgSubscription`, `useOrgLogs` | org detail, org.members, org.subscription, org.logs | 2-60 min | ❌ لا يوجد Realtime subscription |
| `useShiftsQuery.ts` | `useShifts`, `useShiftTransactions` | shifts.all, cashTx | 1-5 min | ✅ Patcher موجود للشفتات |
| `useExpensesQuery.ts` | `useExpensesList`, `useExpensesSummary` | expenses.list (filtered), expenses.summary | 1 min | ❌ Full refetch فقط |
| `useSessionsQuery.ts` | `useActiveSessions` | sessions.active | 30s | ❌ لا يوجد Realtime |
| `useAuditQuery.ts` | `useAuditTransactions` | audit.transactions | 2 min | ❌ لا يوجد Realtime |

---

## 17. 🧩 `hooks/useHandlerInfrastructure.ts`

| الدالة | Cache Operation | تم؟ | ملاحظات |
|--------|----------------|:---:|---------|
| `setInventory(updater)` | `setQueryData([inventory.all(branchId)], updater)` | ✅ | يستخدم في الـ handlers كبديل لـ local state |
| `setSales(updater)` | `setQueryData([sales.recent(branchId, 100)], updater)` | ✅ | يحدث key واحد فقط (recent) — لا يؤثر على today/today |
| `setPurchases(updater)` | `setQueryData([purchases.all(branchId, 100)], updater)` | ✅ | |
| `setReturns(updater)` | `setQueryData([returns.sales(branchId, 100)], updater)` | ✅ | |
| `setPurchaseReturns(updater)` | `setQueryData([returns.purchases(branchId, 100)], updater)` | ✅ | |
| `setCustomers(updater)` | `setQueryData([customers.all(branchId)], updater)` | ✅ | |
| `setBatches(updater)` | `setQueryData([batches.all(branchId)], updater)` | ✅ | |

---

## 18. 🏪 `stores/authStore.ts`

| الدالة | Cache Operation | تم؟ | المطلوب |
|--------|----------------|:---:|---------|
| `refreshAll()` | `invalidateQueries` لـ 10 بادئات (inventory, sales, purchases, batches, returns, employees, customers, suppliers, branches, org) | ✅ | لا تغيير — هذه دالة "تحديث شامل" وتستخدم فقط عند تغيير الفرع أو تسجيل الدخول |
| `updateBranch()` | `invalidateQueries(['branches'])` | ✅ | لا تغيير |

---

## 19. 📁 `hooks/infrastructure/useAudit.ts`

| الدالة | Cache Operation | تم؟ |
|--------|----------------|:---:|
| `refresh()` | `invalidateQueries([audit.transactions(branchId, limit)])` | ✅ |

---

## 20. 🧩 بقية الـ Components (Invaldiations مباشرة)

| الملف (Component) | `invalidateQueries` | تم؟ | المطلوب |
|-------------------|---------------------|:---:|---------|
| `StockAdjustment.tsx` | `['inventory']` (prefix) | ✅ | لا تغيير مؤقت |
| `ExpiryManagement.tsx` | `['inventory']`, `['batches']` | ✅ | لا تغيير مؤقت |
| `PurchaseReturns.tsx` | `['returns']`, `['inventory']` | ✅ | لا تغيير مؤقت |
| `BranchSettings.tsx` | `['branches']`, `['employees']` | ✅ | لا تغيير مؤقت |
| `ActiveSessionsPage.tsx` | `['sessions']` | ✅ | لا تغيير مؤقت |
| `EmployeeDashboard.tsx` | `['employees']` | ✅ | لا تغيير مؤقت |
| `OrgSettings.tsx` | `['org', orgId]` | ✅ | لا تغيير مؤقت |

---

## ملخص الإنجاز

| القسم | الحالة |
|-------|:------:|
| المبيعات (useSalesMutations) | 🔶 جزئي |
| المبيعات (useSalesHandlers) | 🔶 جزئي |
| المردودات (useReturnsMutations) | ❌ لم يبدأ |
| المشتريات (usePurchaseMutations) | ❌ لم يبدأ |
| المخزون (useInventoryMutations) | ❌ لم يبدأ |
| المخزون (useInventoryHandlers) | 🔶 جزئي |
| العملاء (useCustomerMutations) | 🔶 جزئي |
| الموردين (useSupplierMutations) | 🔶 جزئي |
| الموظفين (useEmployeeMutations) | ❌ لم يبدأ |
| المصروفات (useExpenses) | ❌ لم يبدأ |
| الخزنة (useCashRegister) | ❌ لم يبدأ |
| الشفتات (useShift) | ❌ لم يبدأ |
| **Realtime Registry** | 🔶 جزئي (ينقصه 5 جداول) |
| **Patchers** | 🔶 جزئي (ينقصه PagedList + Dashboard) |
| **Dashboard** | ❌ لم يبدأ |
| **Online Recovery** | ✅ يعمل (يحتاج تحسين) |

**المفتاح:** ✅ مكتمل | 🔶 يحتاج تحسين/تنظيف | ❌ لم يبدأ
