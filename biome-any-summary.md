# تقرير مشاكل `any` في المشروع

هذا الملف لتتبع تقدم إصلاح `any` في ملفات المشروع.

- [ ] **context/DataContext/useDataActions.ts** (53 occurrences)
- [ ] **hooks/__tests__/useEntityHandlers.test.tsx** (36 occurrences)
- [ ] **types/tauri-plugins.d.ts** (28 occurrences)
- [ ] **components/inventory/studio/PropertyInspector.tsx** (20 occurrences)
- [ ] **services/search/drugSearchService.ts** (15 occurrences)
- [ ] **components/sales/pos/ui/POSCartSidebar.tsx** (15 occurrences)
- [ ] **services/org/orgAggregationService.ts** (14 occurrences)
- [ ] **components/purchases/Purchases.tsx** (14 occurrences)
- [ ] **components/common/TanStackTable.tsx** (14 occurrences)
- [ ] **components/common/table/helpers.ts** (14 occurrences)
- [ ] **services/transactions/transactionService.ts** (13 occurrences)
- [ ] **services/financials/financialService.ts** (13 occurrences)
- [ ] **components/purchases/PurchaseHistory.tsx** (13 occurrences)
- [ ] **components/inventory/Inventory.tsx** (13 occurrences)
- [ ] **components/dashboard/Dashboard.tsx** (13 occurrences)
- [ ] **services/auth/authService.ts** (12 occurrences)
- [ ] **components/sales/SaleDetailModal.tsx** (12 occurrences)
- [ ] **components/purchases/SuppliersList.tsx** (12 occurrences)
- [ ] **components/inventory/LabelPrinter.ts** (12 occurrences)
- [ ] **services/transactions/transactionService.test.ts** (11 occurrences)
- [ ] **components/hr/EmployeeFormModal.tsx** (11 occurrences)
- [ ] **utils/exportUtils.ts** (10 occurrences)
- [ ] **context/DataContext/useRealtimeSync.ts** (10 occurrences)
- [ ] **components/layout/StatusBar/items/SettingsMenu.tsx** (10 occurrences)
- [ ] **components/experiments/AdvancedSmCard.tsx** (10 occurrences)
- [ ] **components/common/ChartWidget.tsx** (10 occurrences)
- [ ] **services/returns/repositories/returnsRepository.ts** (9 occurrences)
- [ ] **services/core/baseDomainService.ts** (9 occurrences)
- [ ] **components/ui/map.tsx** (9 occurrences)
- [ ] **components/inventory/BarcodeStudio.tsx** (9 occurrences)
- [ ] **components/hr/EmployeeProfile.tsx** (9 occurrences)
- [ ] **components/experiments/ExpandedChartModal.tsx** (9 occurrences)

- [ ] **services/inventory/stockMovement/stockMovementService.ts** (8 occurrences)
- [ ] **hooks/__tests__/useAuth.test.ts** (8 occurrences)
- [ ] **components/sales/pos/POS.tsx** (8 occurrences)
- [ ] **components/sales/InvoiceTemplate.ts** (8 occurrences)
- [ ] **components/layout/PageRouter.tsx** (8 occurrences)
- [ ] **components/common/table/MemoizedRow.tsx** (8 occurrences)

- [ ] **hooks/__tests__/usePrinter.test.ts** (7 occurrences)
- [x] **utils/storage.ts** (0/8 occurrences) - **Fixed**: Replaced `any` with `unknown` across memory caching, event simulations, session extraction, and error handling, using proper object structure narrowing.
- [x] **services/org/repositories/orgRepository.ts** (0/7 occurrences) - **Fixed**: Created strict DB DTO interfaces (`OrganizationDbRow`, `OrgMemberDbRow`, `SubscriptionDbRow`) and updated repository maps and return promises to eliminate `any`.
- [x] **components/mobile/MobileSearchCartDrawer.tsx** (0/7 occurrences) - **Fixed**: Replaced generic array/object types with `CartItem`, `Drug` and perfectly mapped `sidebarProps` to strictly satisfy `POSCartSidebarProps` including the real `t` translations instead of mocked and forced type casting.
- [x] **components/dashboard/useDashboardAnalytics.ts** (0/7 occurrences) - **Fixed**: Replaced generic array operations with a strongly typed `DailyData` interface, properly mapped numeric fields, and casted unknown iterators safely.
- [x] **components/customers/CustomerManagement.tsx** (0/7 occurrences) - **Fixed**: Used `Record<string, unknown>` instead of `any` for generic objects, applied exact property casts (`Customer['preferredContact']`), safely used `'accessorKey' in col` for type narrowing, and properly typed `formData` with `Omit<Customer, ...>`.
- [x] **services/sales/salesService.ts** (0/6 occurrences) - **Fixed**: Used `Record<string, unknown>` for DB mapping, eliminated force casts by accessing interface properties directly, used `in` checks for safe property access, and safely casted returns using `unknown`.
- [x] **services/cash/repositories/cashRepository.ts** (0/6 occurrences) - **Fixed**: Created exact DB DTO interfaces (`ShiftDbRow`, `CashTransactionDbRow`) to represent Supabase schema and replaced loose generic object mapping.
- [x] **hooks/sales/useSalesHandlers.ts** (0/6 occurrences) - **Fixed**: Added global Window declaration for `__PHARMA_FLOW_ORG_ID__`, used precise `SaleData` and `Return` interfaces instead of `any`, and replaced type assertions with property checks.
- [x] **hooks/layout/useNavigation.ts** (0/6 occurrences) - **Fixed**: Replaced `Record<string, any>` with `Record<string, unknown>` to ensure type safety in navigation params.
- [x] **hooks/auth/useSessionHandlers.ts** (0/6 occurrences) - **Fixed**: Used strict typing for `employees`, `branches` and defined `ExtendedSession` for `storage.get` to eliminate `any`.
- [x] **config/pageRegistry.ts** (0/6 occurrences) - **Fixed**: Replaced loose `any`/`unknown` and `ComponentType<any>` with a strictly typed `InjectedPageProps` interface mapping all 40+ injected properties to their correct domain types (`Sale`, `StockBatch`, `Employee`, `Shift`, etc.).
