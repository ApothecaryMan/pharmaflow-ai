# Services Analysis Report

This document outlines the role and functions of each service file in the project.

## 📄 stockMovementService.ts
- **Path:** `services/inventory/stockMovement/stockMovementService.ts`
- **Role:** Provides functionality related to stockMovementService

**Functions / Methods:**
- `StockMovementServiceImpl.mapDbToDomain()`
- `StockMovementServiceImpl.mapDomainToDb()`
- `StockMovementServiceImpl.test()`
- `StockMovementServiceImpl.getAll()`
- `StockMovementServiceImpl.getHistory()`
- `StockMovementServiceImpl.getByDrugId()`
- `StockMovementServiceImpl.logMovement()`
- `StockMovementServiceImpl.getCurrentUserSync()`
- `StockMovementServiceImpl.uuid()`
- `StockMovementServiceImpl.Date()`
- `StockMovementServiceImpl.toISOString()`
- `StockMovementServiceImpl.await()`
- `StockMovementServiceImpl.from()`
- `StockMovementServiceImpl.insert()`
- `StockMovementServiceImpl.select()`
- `StockMovementServiceImpl.eq()`
- `StockMovementServiceImpl.gte()`
- `StockMovementServiceImpl.lte()`
- `StockMovementServiceImpl.order()`
- `StockMovementServiceImpl.range()`
- `StockMovementServiceImpl.map()`
- `StockMovementServiceImpl.error()`
- `StockMovementServiceImpl.getSummaryByDrug()`
- `StockMovementServiceImpl.reduce()`
- `StockMovementServiceImpl.abs()`
- `StockMovementServiceImpl.includes()`
- `StockMovementServiceImpl.getKPISummary()`
- `StockMovementServiceImpl.approveMovement()`
- `StockMovementServiceImpl.updateMovementStatus()`
- `StockMovementServiceImpl.rejectMovement()`
- `StockMovementServiceImpl.update()`
- `StockMovementServiceImpl.logMovementsBulk()`
- `StockMovementServiceImpl.calculateMovementValue()`


---

## 📄 batchService.ts
- **Path:** `services/inventory/batchService.ts`
- **Role:** Stock Batch Service - FEFO (First Expiry First Out) Inventory Management Online-Only implementation using Supabase. /

**Functions / Methods:**
- `batchService.fetchBatchesFromSupabase()`
- `batchService.from()`
- `batchService.select()`
- `batchService.if()`
- `batchService.eq()`
- `batchService.in()`
- `batchService.order()`
- `batchService.ascending()`
- `batchService.return()`
- `batchService.map()`
- `batchService.catch()`
- `batchService.error()`
- `batchService.failed()`
- `batchService.getAllBatches()`
- `batchService.getBatchById()`
- `batchService.batchId()`
- `batchService.maybeSingle()`
- `batchService.mapDbToBatch()`
- `batchService.createBatch()`
- `batchService.batch()`
- `batchService.getAll()`
- `batchService.test()`
- `batchService.is()`
- `batchService.data()`
- `batchService.multiply()`
- `batchService.add()`
- `batchService.divide()`
- `batchService.rpc()`
- `batchService.p_batch_id()`
- `batchService.p_delta()`
- `batchService.update()`
- `batchService.cost_price()`
- `batchService.date_received()`
- `batchService.Date()`
- `batchService.toISOString()`
- `batchService.newBatch()`
- `batchService.id()`
- `batchService.uuid()`
- `batchService.branchId()`
- `batchService.orgId()`
- `batchService.version()`
- `batchService.insert()`
- `batchService.mapBatchToDb()`
- `batchService.updateBatchQuantity()`
- `batchService.delta()`
- `batchService.skipFetch()`
- `batchService.Atomic()`
- `batchService.Error()`
- `batchService.updateBatch()`
- `batchService.updates()`
- `batchService.allocateStockBulk()`
- `batchService.requests()`
- `batchService.drugId()`
- `batchService.quantity()`
- `batchService.referenceDate()`
- `batchService.allocations()`
- `batchService.filter()`
- `batchService.Set()`
- `batchService.Optimization()`
- `batchService.reduce()`
- `batchService.all()`
- `batchService.async()`
- `batchService.allocateStock()`
- `batchService.for()`
- `batchService.quantityNeeded()`
- `batchService.commitChanges()`
- `batchService.parseExpiryEndOfMonth()`
- `batchService.isNaN()`
- `batchService.getTime()`
- `batchService.logic()`
- `batchService.sort()`
- `batchService.min()`
- `batchService.push()`
- `batchService.expiryDate()`
- `batchService.batchNumber()`
- `batchService.committedAllocations()`
- `batchService.returnStock()`
- `batchService.quantityToReturn()`
- `batchService.redistribution()`
- `batchService.first()`
- `batchService.it()`
- `batchService.costPrice()`
- `batchService.dateReceived()`
- `batchService.remaining()`
- `batchService.getTotalStock()`
- `batchService.getEarliestExpiry()`
- `batchService.calculateGlobalWAC()`
- `batchService.hasStock()`
- `batchService.getStockSummary()`
- `batchService.totalStock()`
- `batchService.batchCount()`
- `batchService.earliestExpiry()`
- `batchService.batches()`
- `batchService.groupInventory()`
- `batchService.drugs()`
- `batchService.groups()`
- `batchService.forEach()`
- `batchService.getGroupingKey()`
- `batchService.entries()`
- `batchService.allBatchesInGroup()`
- `batchService.attached()`
- `batchService.date()`
- `batchService.1()`
- `batchService.drug()`
- `batchService.groupId()`
- `batchService.stock()`
- `batchService.autoDistributeQuantities()`
- `batchService.totalPacks()`
- `batchService.totalUnits()`
- `batchService.packQty()`
- `batchService.unitQty()`
- `batchService.results()`
- `batchService.floor()`
- `batchService.findTargetBatch()`
- `batchService.group()`
- `batchService.currentCart()`
- `batchService.find()`
- `batchService.deleteBatchById()`
- `batchService.delete()`
- `batchService.deleteBatchesByDrugId()`
- `batchService.validateCartStock()`
- `batchService.cart()`
- `batchService.name()`
- `batchService.available()`
- `batchService.required()`
- `batchService.resolveUnits()`
- `batchService.set()`
- `batchService.get()`
- `batchService.issues()`
- `getGroupingKey()`


---

## 📄 inventoryService.ts
- **Path:** `services/inventory/inventoryService.ts`
- **Role:** Provides functionality related to inventoryService

**Functions / Methods:**
- `InventoryServiceImpl.mapFromDb()`
- `InventoryServiceImpl.mapToDb()`
- `InventoryServiceImpl.test()`
- `InventoryServiceImpl.getAllBranches()`
- `InventoryServiceImpl.from()`
- `InventoryServiceImpl.select()`
- `InventoryServiceImpl.eq()`
- `InventoryServiceImpl.map()`
- `InventoryServiceImpl.error()`
- `InventoryServiceImpl.getByBarcode()`
- `InventoryServiceImpl.maybeSingle()`
- `InventoryServiceImpl.getAll()`
- `InventoryServiceImpl.find()`
- `InventoryServiceImpl.search()`
- `InventoryServiceImpl.toLowerCase()`
- `InventoryServiceImpl.filter()`
- `InventoryServiceImpl.includes()`
- `InventoryServiceImpl.some()`
- `InventoryServiceImpl.Date()`
- `InventoryServiceImpl.setDate()`
- `InventoryServiceImpl.getDate()`
- `InventoryServiceImpl.parseExpiryEndOfMonth()`
- `InventoryServiceImpl.create()`
- `InventoryServiceImpl.uuid()`
- `InventoryServiceImpl.code()`
- `InventoryServiceImpl.insert()`
- `InventoryServiceImpl.createBatch()`
- `InventoryServiceImpl.toISOString()`
- `InventoryServiceImpl.updateStock()`
- `InventoryServiceImpl.rpc()`
- `InventoryServiceImpl.getById()`
- `InventoryServiceImpl.Error()`
- `InventoryServiceImpl.updateBatchQuantity()`
- `InventoryServiceImpl.allocateStock()`
- `InventoryServiceImpl.abs()`
- `InventoryServiceImpl.updateStockCount()`
- `InventoryServiceImpl.max()`
- `InventoryServiceImpl.update()`
- `InventoryServiceImpl.updateStockBulk()`
- `InventoryServiceImpl.all()`
- `InventoryServiceImpl.getStats()`
- `InventoryServiceImpl.getTime()`
- `InventoryServiceImpl.reduce()`
- `InventoryServiceImpl.getLowStock()`
- `InventoryServiceImpl.getExpiringSoon()`
- `InventoryServiceImpl.save()`
- `InventoryServiceImpl.isUuid()`
- `InventoryServiceImpl.upsert()`


---

## 📄 pricingService.ts
- **Path:** `services/sales/pricingService.ts`
- **Role:** Provides functionality related to pricingService

**Functions / Methods:**
- `pricingService.calculateItemTotal()`
- `pricingService.item()`
- `pricingService.multiply()`
- `pricingService.if()`
- `pricingService.subtract()`
- `pricingService.calculateOrderTotals()`
- `pricingService.items()`
- `pricingService.globalDiscountPercent()`
- `pricingService.totals()`
- `pricingService.reduce()`
- `pricingService.add()`
- `pricingService.map()`
- `pricingService.toSmallestUnit()`
- `pricingService.allocate()`
- `pricingService.forEach()`
- `pricingService.inclusiveAmount()`
- `pricingService.taxAmount()`
- `pricingService.subtotalExclTax()`
- `pricingService.totalDiscountAmount()`
- `pricingService.calculateRefundAmount()`
- `pricingService.sale()`
- `pricingService.selectedItems()`
- `pricingService.index()`
- `pricingService.has()`
- `pricingService.get()`
- `pricingService.divide()`
- `pricingService.calculateMaxDiscount()`
- `pricingService.costPrice()`
- `pricingService.publicPrice()`
- `pricingService.actualMargin()`
- `pricingService.floor()`
- `pricingService.manualMaxDiscount()`
- `pricingService.max()`
- `pricingService()`


---

## 📄 salesService.ts
- **Path:** `services/sales/salesService.ts`
- **Role:** Sales Service - Sales transaction operations Online-Only implementation using Supabase /

**Functions / Methods:**
- `SalesServiceImpl.mapFromDb()`
- `SalesServiceImpl.mapToDb()`
- `SalesServiceImpl.getAll()`
- `SalesServiceImpl.from()`
- `SalesServiceImpl.select()`
- `SalesServiceImpl.toLowerCase()`
- `SalesServiceImpl.eq()`
- `SalesServiceImpl.order()`
- `SalesServiceImpl.map()`
- `SalesServiceImpl.error()`
- `SalesServiceImpl.getByCustomer()`
- `SalesServiceImpl.getByDateRange()`
- `SalesServiceImpl.gte()`
- `SalesServiceImpl.lte()`
- `SalesServiceImpl.getToday()`
- `SalesServiceImpl.Date()`
- `SalesServiceImpl.toISOString()`
- `SalesServiceImpl.split()`
- `SalesServiceImpl.create()`
- `SalesServiceImpl.uuid()`
- `SalesServiceImpl.insert()`
- `SalesServiceImpl.getStats()`
- `SalesServiceImpl.filter()`
- `SalesServiceImpl.startsWith()`
- `SalesServiceImpl.reduce()`
- `SalesServiceImpl.add()`
- `SalesServiceImpl.divide()`
- `SalesServiceImpl.save()`
- `SalesServiceImpl.upsert()`


---

## 📄 customerService.ts
- **Path:** `services/customers/customerService.ts`
- **Role:** Customer Service - Customer CRUD and loyalty operations Online-Only implementation using Supabase /

**Functions / Methods:**
- `CustomerServiceImpl.mapFromDb()`
- `CustomerServiceImpl.Number()`
- `CustomerServiceImpl.Date()`
- `CustomerServiceImpl.toISOString()`
- `CustomerServiceImpl.mapToDb()`
- `CustomerServiceImpl.getByPhone()`
- `CustomerServiceImpl.getAll()`
- `CustomerServiceImpl.from()`
- `CustomerServiceImpl.select()`
- `CustomerServiceImpl.eq()`
- `CustomerServiceImpl.toLowerCase()`
- `CustomerServiceImpl.maybeSingle()`
- `CustomerServiceImpl.error()`
- `CustomerServiceImpl.filter()`
- `CustomerServiceImpl.search()`
- `CustomerServiceImpl.order()`
- `CustomerServiceImpl.map()`
- `CustomerServiceImpl.create()`
- `CustomerServiceImpl.uuid()`
- `CustomerServiceImpl.generate()`
- `CustomerServiceImpl.code()`
- `CustomerServiceImpl.insert()`
- `CustomerServiceImpl.addLoyaltyPoints()`
- `CustomerServiceImpl.getById()`
- `CustomerServiceImpl.Error()`
- `CustomerServiceImpl.update()`
- `CustomerServiceImpl.redeemLoyaltyPoints()`
- `CustomerServiceImpl.getStats()`
- `CustomerServiceImpl.reduce()`
- `CustomerServiceImpl.getVip()`
- `CustomerServiceImpl.save()`
- `CustomerServiceImpl.upsert()`


---

## 📄 purchaseService.ts
- **Path:** `services/purchases/purchaseService.ts`
- **Role:** Purchase Service - Purchase order operations Online-Only implementation using Supabase /

**Functions / Methods:**
- `PurchaseServiceImpl.mapFromDb()`
- `PurchaseServiceImpl.mapToDb()`
- `PurchaseServiceImpl.getAll()`
- `PurchaseServiceImpl.from()`
- `PurchaseServiceImpl.select()`
- `PurchaseServiceImpl.toLowerCase()`
- `PurchaseServiceImpl.eq()`
- `PurchaseServiceImpl.order()`
- `PurchaseServiceImpl.map()`
- `PurchaseServiceImpl.error()`
- `PurchaseServiceImpl.getBySupplier()`
- `PurchaseServiceImpl.getByStatus()`
- `PurchaseServiceImpl.getPending()`
- `PurchaseServiceImpl.filter()`
- `PurchaseServiceImpl.gte()`
- `PurchaseServiceImpl.lte()`
- `PurchaseServiceImpl.create()`
- `PurchaseServiceImpl.uuid()`
- `PurchaseServiceImpl.Date()`
- `PurchaseServiceImpl.toISOString()`
- `PurchaseServiceImpl.insert()`
- `PurchaseServiceImpl.single()`
- `PurchaseServiceImpl.approve()`
- `PurchaseServiceImpl.getById()`
- `PurchaseServiceImpl.Error()`
- `PurchaseServiceImpl.update()`
- `PurchaseServiceImpl.markAsReceived()`
- `PurchaseServiceImpl.processInventoryReceipt()`
- `PurchaseServiceImpl.getTotalStock()`
- `PurchaseServiceImpl.resolveUnits()`
- `PurchaseServiceImpl.now()`
- `PurchaseServiceImpl.dates()`
- `PurchaseServiceImpl.includes()`
- `PurchaseServiceImpl.createBatch()`
- `PurchaseServiceImpl.logMovement()`
- `PurchaseServiceImpl.updateStockBulk()`
- `PurchaseServiceImpl.getEarliestExpiry()`
- `PurchaseServiceImpl.calculateGlobalWAC()`
- `PurchaseServiceImpl.divide()`
- `PurchaseServiceImpl.reject()`
- `PurchaseServiceImpl.getStats()`
- `PurchaseServiceImpl.reduce()`
- `PurchaseServiceImpl.add()`
- `PurchaseServiceImpl.save()`
- `PurchaseServiceImpl.upsert()`


---

## 📄 supplierService.ts
- **Path:** `services/suppliers/supplierService.ts`
- **Role:** Supplier Service - Supplier CRUD operations Online-Only implementation using Supabase /

**Functions / Methods:**
- `SupplierServiceImpl.mapFromDb()`
- `SupplierServiceImpl.Date()`
- `SupplierServiceImpl.toISOString()`
- `SupplierServiceImpl.mapToDb()`
- `SupplierServiceImpl.create()`
- `SupplierServiceImpl.getAll()`
- `SupplierServiceImpl.test()`
- `SupplierServiceImpl.isUuid()`
- `SupplierServiceImpl.Error()`
- `SupplierServiceImpl.rpc()`
- `SupplierServiceImpl.error()`
- `SupplierServiceImpl.save()`
- `SupplierServiceImpl.map()`
- `SupplierServiceImpl.from()`
- `SupplierServiceImpl.upsert()`


---

## 📄 returnService.ts
- **Path:** `services/returns/returnService.ts`
- **Role:** Return Service - Sales and purchase return operations Online-Only implementation using Supabase /

**Functions / Methods:**
- `SalesReturnServiceImpl.mapFromDb()`
- `SalesReturnServiceImpl.mapToDb()`
- `PurchaseReturnServiceImpl.mapFromDb()`
- `PurchaseReturnServiceImpl.mapToDb()`


---

## 📄 cashService.ts
- **Path:** `services/cash/cashService.ts`
- **Role:** Cash Service - Cash register and shift operations Unified with Supabase - Online-only implementation. /

**Functions / Methods:**
- `ShiftsServiceImpl.mapFromDb()`
- `ShiftsServiceImpl.Number()`
- `ShiftsServiceImpl.mapToDb()`
- `CashTransactionsServiceImpl.mapFromDb()`
- `CashTransactionsServiceImpl.Number()`
- `CashTransactionsServiceImpl.mapToDb()`


---

## 📄 settingsService.ts
- **Path:** `services/settings/settingsService.ts`
- **Role:** Settings Service - Manages user preferences and app configuration /

**Functions / Methods:**
- `createSettingsService()`


---

## 📄 forgotPassword.service.ts
- **Path:** `services/auth/forgotPassword.service.ts`
- **Role:** Provides functionality related to forgotPassword.service

**Functions / Methods:**
- `validateResetPasswordEmail()`
- `requestPasswordReset()`


---

## 📄 authService.ts
- **Path:** `services/auth/authService.ts`
- **Role:** Auth Service - Authentication and session management Online-Only implementation using Supabase /

**Functions / Methods:**
- `authService.getCurrentUser()`
- `authService.if()`
- `authService.getCurrentUserSync()`
- `authService.data()`
- `authService.user()`
- `authService.getUser()`
- `authService.removeItem()`
- `authService.syncSessionWithDatabase()`
- `authService.catch()`
- `authService.warn()`
- `authService.userId()`
- `authService.getItem()`
- `authService.existingSession()`
- `authService.parse()`
- `authService.all()`
- `authService.from()`
- `authService.select()`
- `authService.eq()`
- `authService.maybeSingle()`
- `authService.session()`
- `authService.Logic()`
- `authService.auth_user_id()`
- `authService.orgRole()`
- `authService.orgId()`
- `authService.username()`
- `authService.employeeId()`
- `authService.branchId()`
- `authService.role()`
- `authService.department()`
- `authService.setItem()`
- `authService.stringify()`
- `authService.error()`
- `authService.updateSession()`
- `authService.updates()`
- `authService.signUp()`
- `authService.name()`
- `authService.email()`
- `authService.password()`
- `authService.success()`
- `authService.options()`
- `authService.err()`
- `authService.message()`
- `authService.resetPassword()`
- `authService.resetPasswordForEmail()`
- `authService.redirectTo()`
- `authService.login()`
- `authService.includes()`
- `authService.rpc()`
- `authService.p_username()`
- `authService.signInWithPassword()`
- `authService.Error()`
- `authService.update()`
- `authService.split()`
- `authService.setActiveOrgId()`
- `authService.logout()`
- `authService.signOut()`
- `authService.clearEmployeeSession()`
- `authService.getUserId()`
- `authService.remove()`
- `authService.for()`
- `authService.key()`
- `authService.endsWith()`
- `authService.push()`
- `authService.forEach()`
- `authService.dispatchEvent()`
- `authService.StorageEvent()`
- `authService.newValue()`
- `authService.hasSession()`
- `authService.logAuditEvent()`
- `authService.entry()`
- `authService.getLoginHistory()`
- `authService.newEntry()`
- `authService.id()`
- `authService.random()`
- `authService.toString()`
- `authService.substring()`
- `authService.timestamp()`
- `authService.Date()`
- `authService.toISOString()`
- `authService.slice()`
- `authService.filter()`
- `authService.registerBiometric()`
- `authService.credentialId()`
- `authService.publicKey()`
- `authService.biometricCredentialId()`
- `authService.biometricPublicKey()`
- `authService.loginWithBiometric()`
- `authService.employees()`
- `authService.find()`
- `authService.generateTempPassword()`
- `authService.length()`
- `authService.charAt()`
- `authService.floor()`
- `authService.handleForgotPassword()`
- `authService.Note()`
- `authService.Password()`
- `authService.updatePassword()`
- `authService.newPassword()`
- `authService.updateUser()`
- `authService.import()`
- `authService.hashPassword()`
- `authService.log()`
- `authService.resendConfirmation()`
- `authService.resend()`
- `authService.type()`
- `authService.emailRedirectTo()`


---

## 📄 employeeService.ts
- **Path:** `services/hr/employeeService.ts`
- **Role:** Employee Service - Staff management operations Online-Only implementation using Supabase /

**Functions / Methods:**
- `EmployeeServiceImpl.mapFromDb()`
- `EmployeeServiceImpl.mapToDb()`
- `EmployeeServiceImpl.getAll()`
- `EmployeeServiceImpl.getActiveOrgId()`
- `EmployeeServiceImpl.toLowerCase()`
- `EmployeeServiceImpl.from()`
- `EmployeeServiceImpl.select()`
- `EmployeeServiceImpl.eq()`
- `EmployeeServiceImpl.or()`
- `EmployeeServiceImpl.join()`
- `EmployeeServiceImpl.order()`
- `EmployeeServiceImpl.map()`
- `EmployeeServiceImpl.error()`
- `EmployeeServiceImpl.create()`
- `EmployeeServiceImpl.uuid()`
- `EmployeeServiceImpl.reduce()`
- `EmployeeServiceImpl.parseInt()`
- `EmployeeServiceImpl.replace()`
- `EmployeeServiceImpl.max()`
- `EmployeeServiceImpl.isNaN()`
- `EmployeeServiceImpl.String()`
- `EmployeeServiceImpl.padStart()`
- `EmployeeServiceImpl.warn()`
- `EmployeeServiceImpl.insert()`
- `EmployeeServiceImpl.save()`
- `EmployeeServiceImpl.upsert()`


---

## 📄 intelligenceService.ts
- **Path:** `services/intelligence/intelligenceService.ts`
- **Role:** Intelligence Service - Provides analytics data for the Intelligence Dashboard Real data functions for Procurement, Risk, Financials, and Audit /

**Functions / Methods:**
- `intelligenceService.Procurement()`
- `intelligenceService.getProcurementSummary()`
- `intelligenceService.async()`
- `intelligenceService.getProcurementItems()`
- `intelligenceService.filter()`
- `intelligenceService.reduce()`
- `intelligenceService.length()`
- `intelligenceService.items_needing_order()`
- `intelligenceService.items_out_of_stock()`
- `intelligenceService.avg_confidence_score()`
- `intelligenceService.round()`
- `intelligenceService.pending_po_count()`
- `intelligenceService.pending_po_value()`
- `intelligenceService.estimated_lost_sales()`
- `intelligenceService.add()`
- `intelligenceService.multiply()`
- `intelligenceService.EGP()`
- `intelligenceService.getAll()`
- `intelligenceService.Date()`
- `intelligenceService.getTime()`
- `intelligenceService.SALES()`
- `intelligenceService.getByDateRange()`
- `intelligenceService.toISOString()`
- `intelligenceService.sales()`
- `intelligenceService.Map()`
- `intelligenceService.map()`
- `intelligenceService.getAllBatches()`
- `intelligenceService.lookup()`
- `intelligenceService.Efficiency()`
- `intelligenceService.O()`
- `intelligenceService.for()`
- `intelligenceService.set()`
- `intelligenceService.get()`
- `intelligenceService.drug()`
- `intelligenceService.last7()`
- `intelligenceService.last14()`
- `intelligenceService.last30()`
- `intelligenceService.if()`
- `intelligenceService.quantity()`
- `intelligenceService.days()`
- `intelligenceService.avgDailySales()`
- `intelligenceService.stockStatus()`
- `intelligenceService.trend()`
- `intelligenceService.max()`
- `intelligenceService.ceil()`
- `intelligenceService.85()`
- `intelligenceService.70()`
- `intelligenceService.id()`
- `intelligenceService.product_id()`
- `intelligenceService.product_name()`
- `intelligenceService.getDisplayName()`
- `intelligenceService.name()`
- `intelligenceService.dosageForm()`
- `intelligenceService.sku()`
- `intelligenceService.slice()`
- `intelligenceService.supplier_id()`
- `intelligenceService.supplier_name()`
- `intelligenceService.category_id()`
- `intelligenceService.category_name()`
- `intelligenceService.current_stock()`
- `intelligenceService.stock_days()`
- `intelligenceService.stock_status()`
- `intelligenceService.reorder_point_days()`
- `intelligenceService.avg_daily_sales()`
- `intelligenceService.velocity_breakdown()`
- `intelligenceService.last_7_days()`
- `intelligenceService.last_14_days()`
- `intelligenceService.last_30_days()`
- `intelligenceService.velocity_cv()`
- `intelligenceService.seasonal_trajectory()`
- `intelligenceService.seasonal_index_current()`
- `intelligenceService.seasonal_index_next()`
- `intelligenceService.seasonal_confidence()`
- `intelligenceService.suggested_order_qty()`
- `intelligenceService.skip_reason()`
- `intelligenceService.confidence_score()`
- `intelligenceService.confidence_components()`
- `intelligenceService.velocity_stability()`
- `intelligenceService.80()`
- `intelligenceService.data_recency()`
- `intelligenceService.90()`
- `intelligenceService.seasonality_certainty()`
- `intelligenceService.lead_time_reliability()`
- `intelligenceService.calculateParetoABC()`
- `intelligenceService.revenue()`
- `intelligenceService.find()`
- `intelligenceService.dataQuality()`
- `intelligenceService.abc_class()`
- `intelligenceService.data_quality_flag()`
- `intelligenceService.sort()`
- `intelligenceService.OUT_OF_STOCK()`
- `intelligenceService.CRITICAL()`
- `intelligenceService.LOW()`
- `intelligenceService.NORMAL()`
- `intelligenceService.OVERSTOCK()`
- `intelligenceService.Risk()`
- `intelligenceService.getRiskSummary()`
- `intelligenceService.getExpiryRiskItems()`
- `intelligenceService.summary()`
- `intelligenceService.total_value_at_risk()`
- `intelligenceService.total_batches_at_risk()`
- `intelligenceService.by_urgency()`
- `intelligenceService.critical()`
- `intelligenceService.count()`
- `intelligenceService.value()`
- `intelligenceService.high()`
- `intelligenceService.medium()`
- `intelligenceService.potential_recovery_value()`
- `intelligenceService.parseExpiryEndOfMonth()`
- `intelligenceService.riskItems()`
- `intelligenceService.riskCategory()`
- `intelligenceService.score()`
- `intelligenceService.min()`
- `intelligenceService.recommendedAction()`
- `intelligenceService.recommendedDiscount()`
- `intelligenceService.recovery()`
- `intelligenceService.afterDiscount()`
- `intelligenceService.batch_id()`
- `intelligenceService.batch_number()`
- `intelligenceService.current_quantity()`
- `intelligenceService.expiry_date()`
- `intelligenceService.days_until_expiry()`
- `intelligenceService.sellable_days_remaining()`
- `intelligenceService.value_at_risk()`
- `intelligenceService.risk_score()`
- `intelligenceService.risk_category()`
- `intelligenceService.risk_score_breakdown()`
- `intelligenceService.urgency_score()`
- `intelligenceService.velocity_score()`
- `intelligenceService.value_score()`
- `intelligenceService.calculation_explanation()`
- `intelligenceService.clearance_analysis()`
- `intelligenceService.current_velocity()`
- `intelligenceService.projected_units_sold()`
- `intelligenceService.projected_remaining()`
- `intelligenceService.will_clear_in_time()`
- `intelligenceService.required_velocity_to_clear()`
- `intelligenceService.recommended_action()`
- `intelligenceService.recommended_discount_percent()`
- `intelligenceService.expected_recovery_value()`
- `intelligenceService.Financials()`
- `intelligenceService.getFinancialKPIs()`
- `intelligenceService.period()`
- `intelligenceService.Fetching()`
- `intelligenceService.getDateRangeForPeriod()`
- `intelligenceService.getPreviousPeriodRange()`
- `intelligenceService.start()`
- `intelligenceService.end()`
- `intelligenceService.filterSalesByDateRange()`
- `intelligenceService.calculateMetrics()`
- `intelligenceService.100()`
- `intelligenceService.calculateChange()`
- `intelligenceService.subtract()`
- `intelligenceService.change_percent()`
- `intelligenceService.change_direction()`
- `intelligenceService.gross_profit()`
- `intelligenceService.margin_percent()`
- `intelligenceService.change_points()`
- `intelligenceService.units_sold()`
- `intelligenceService.getProductFinancials()`
- `intelligenceService.quantity_sold()`
- `intelligenceService.cogs()`
- `intelligenceService.Defensive()`
- `intelligenceService.from()`
- `intelligenceService.values()`
- `intelligenceService.divide()`
- `intelligenceService.getCategoryFinancials()`
- `intelligenceService.products_count()`
- `intelligenceService.abc_distribution()`
- `intelligenceService.a()`
- `intelligenceService.b()`
- `intelligenceService.c()`
- `intelligenceService.Audit()`
- `intelligenceService.getAuditTransactions()`
- `intelligenceService.limit()`
- `intelligenceService.Optimized()`
- `intelligenceService.setDate()`
- `intelligenceService.getDate()`
- `intelligenceService.all()`
- `intelligenceService.dateFrom()`
- `intelligenceService.getAllSalesReturns()`
- `intelligenceService.transactions()`
- `intelligenceService.push()`
- `intelligenceService.timestamp()`
- `intelligenceService.invoice_number()`
- `intelligenceService.type()`
- `intelligenceService.cashier_name()`
- `intelligenceService.amount()`
- `intelligenceService.has_anomaly()`
- `intelligenceService.anomaly_reason()`
- `intelligenceService.descending()`


---

## 📄 migrationService.ts
- **Path:** `services/migration/migrationService.ts`
- **Role:** Provides functionality related to migrationService

**Functions / Methods:**
- `runMigrations()`


---

## 📄 backupService.ts
- **Path:** `services/backup/backupService.ts`
- **Role:** Backup Service - Handles full application data export and import. Captures both localStorage (pharma_ keys) and IndexedDB stores. /

**Functions / Methods:**
- `backupService.exportBackup()`
- `backupService.backup()`
- `backupService.version()`
- `backupService.timestamp()`
- `backupService.Date()`
- `backupService.toISOString()`
- `backupService.localStorage()`
- `backupService.indexedDB()`
- `backupService.for()`
- `backupService.key()`
- `backupService.if()`
- `backupService.some()`
- `backupService.startsWith()`
- `backupService.getItem()`
- `backupService.parse()`
- `backupService.catch()`
- `backupService.values()`
- `backupService.runTransaction()`
- `backupService.objectStore()`
- `backupService.getAll()`
- `backupService.resolve()`
- `backupService.reject()`
- `backupService.Download()`
- `backupService.Blob()`
- `backupService.stringify()`
- `backupService.type()`
- `backupService.createObjectURL()`
- `backupService.createElement()`
- `backupService.split()`
- `backupService.appendChild()`
- `backupService.click()`
- `backupService.removeChild()`
- `backupService.revokeObjectURL()`
- `backupService.importBackup()`
- `backupService.file()`
- `backupService.Promise()`
- `backupService.FileReader()`
- `backupService.async()`
- `backupService.Error()`
- `backupService.warning()`
- `backupService.warn()`
- `backupService.mismatch()`
- `backupService.keysToRemove()`
- `backupService.push()`
- `backupService.forEach()`
- `backupService.removeItem()`
- `backupService.entries()`
- `backupService.setItem()`
- `backupService.stores()`
- `backupService.has()`
- `backupService.log()`
- `backupService.store()`
- `backupService.Guard()`
- `backupService.contains()`
- `backupService.clear()`
- `backupService.add()`
- `backupService.res()`
- `backupService.rej()`
- `backupService.reload()`
- `backupService.error()`
- `backupService.Failed()`
- `backupService.readAsText()`


---

## 📄 transactionService.ts
- **Path:** `services/transactions/transactionService.ts`
- **Role:** Transaction Service - Orchestrates atomic operations across services Online-Only implementation /

**Functions / Methods:**
- `transactionService.processCheckout()`
- `transactionService.saleData()`
- `transactionService.items()`
- `transactionService.customerName()`
- `transactionService.paymentMethod()`
- `transactionService.total()`
- `transactionService.subtotal()`
- `transactionService.globalDiscount()`
- `transactionService.inventory()`
- `transactionService.context()`
- `transactionService.branchId()`
- `transactionService.performerId()`
- `transactionService.Date()`
- `transactionService.UndoManager()`
- `transactionService.getAll()`
- `transactionService.stockMutations()`
- `transactionService.id()`
- `transactionService.quantity()`
- `transactionService.movementEntries()`
- `transactionService.map()`
- `transactionService.find()`
- `transactionService.some()`
- `transactionService.resolveUnits()`
- `transactionService.drugId()`
- `transactionService.name()`
- `transactionService.preferredBatchId()`
- `transactionService.allocateStockBulk()`
- `transactionService.push()`
- `transactionService.async()`
- `transactionService.for()`
- `transactionService.reduce()`
- `transactionService.returnStock()`
- `transactionService.processedItems()`
- `transactionService.if()`
- `transactionService.stock()`
- `transactionService.forEach()`
- `transactionService.drugName()`
- `transactionService.type()`
- `transactionService.previousStock()`
- `transactionService.newStock()`
- `transactionService.reason()`
- `transactionService.performedBy()`
- `transactionService.status()`
- `transactionService.batchId()`
- `transactionService.expiryDate()`
- `transactionService.batchAllocations()`
- `transactionService.uuid()`
- `transactionService.data()`
- `transactionService.error()`
- `transactionService.rpc()`
- `transactionService.p_branch_id()`
- `transactionService.warn()`
- `transactionService.ID()`
- `transactionService.generate()`
- `transactionService.newSale()`
- `transactionService.date()`
- `transactionService.toISOString()`
- `transactionService.soldByEmployeeId()`
- `transactionService.updatedAt()`
- `transactionService.updateStockBulk()`
- `transactionService.logMovementsBulk()`
- `transactionService.from()`
- `transactionService.delete()`
- `transactionService.in()`
- `transactionService.create()`
- `transactionService.eq()`
- `transactionService.linked()`
- `transactionService.forget()`
- `transactionService.addTransaction()`
- `transactionService.orgId()`
- `transactionService.shiftId()`
- `transactionService.time()`
- `transactionService.amount()`
- `transactionService.userId()`
- `transactionService.relatedSaleId()`
- `transactionService.catch()`
- `transactionService.failed()`
- `transactionService.log()`
- `transactionService.details()`
- `transactionService.Total()`
- `transactionService.entityId()`
- `transactionService.success()`
- `transactionService.sale()`
- `transactionService.err()`
- `transactionService.undoAll()`
- `transactionService.processReturn()`
- `transactionService.returnData()`
- `transactionService.batchReturnOps()`
- `transactionService.allocations()`
- `transactionService.quantityToReturn()`
- `transactionService.012()`
- `transactionService.database()`
- `transactionService.netTotal()`
- `transactionService.subtract()`
- `transactionService.Simplified()`
- `transactionService.isGte()`
- `transactionService.balance()`
- `transactionService.referenceId()`
- `transactionService.Fix()`
- `transactionService.1()`
- `transactionService.FIX()`
- `transactionService.all()`
- `transactionService.2()`
- `transactionService.Writes()`
- `transactionService.Note()`
- `transactionService.insert()`
- `transactionService.serial_id()`
- `transactionService.branch_id()`
- `transactionService.org_id()`
- `transactionService.sale_id()`
- `transactionService.return_type()`
- `transactionService.total_refund()`
- `transactionService.notes()`
- `transactionService.processed_by()`
- `transactionService.return_id()`
- `transactionService.drug_id()`
- `transactionService.quantity_returned()`
- `transactionService.is_unit()`
- `transactionService.public_price()`
- `transactionService.refund_amount()`
- `transactionService.condition()`
- `transactionService.dosage_form()`
- `transactionService.update()`
- `transactionService.itemReturnedQuantities()`
- `transactionService.filter()`
- `transactionService.r()`
- `transactionService.Refund()`
- `transactionService.processPurchaseTransaction()`
- `transactionService.purchaseId()`
- `transactionService.getById()`
- `transactionService.Error()`
- `transactionService.approve()`
- `transactionService.processDirectPurchaseTransaction()`
- `transactionService.purchase()`
- `transactionService.createdBy()`
- `transactionService.createdByName()`
- `transactionService.first()`
- `transactionService.markAsReceived()`
- `transactionService.processPurchaseReturnTransaction()`
- `transactionService.returnInput()`
- `transactionService.createPurchaseReturn()`
- `UndoManager.push()`
- `UndoManager.undoAll()`
- `UndoManager.warn()`
- `UndoManager.error()`


---

## 📄 orgMembersService.ts
- **Path:** `services/org/orgMembersService.ts`
- **Role:** Provides functionality related to orgMembersService

**Functions / Methods:**
- `orgMembersService.invite()`
- `orgMembersService.async()`
- `orgMembersService.orgId()`
- `orgMembersService.email()`
- `orgMembersService.role()`
- `orgMembersService.uuid()`
- `orgMembersService.Date()`
- `orgMembersService.setDate()`
- `orgMembersService.getDate()`
- `orgMembersService.id()`
- `orgMembersService.expiresAt()`
- `orgMembersService.toISOString()`
- `orgMembersService.status()`
- `orgMembersService.from()`
- `orgMembersService.insert()`
- `orgMembersService.org_id()`
- `orgMembersService.expires_at()`
- `orgMembersService.if()`
- `orgMembersService.catch()`
- `orgMembersService.warn()`
- `orgMembersService.getInviteByToken()`
- `orgMembersService.token()`
- `orgMembersService.select()`
- `orgMembersService.eq()`
- `orgMembersService.single()`
- `orgMembersService.acceptInvite()`
- `orgMembersService.userId()`
- `orgMembersService.error()`
- `orgMembersService.user_id()`
- `orgMembersService.update()`
- `orgMembersService.failed()`
- `orgMembersService.removeMember()`
- `orgMembersService.memberId()`
- `orgMembersService.delete()`


---

## 📄 orgService.ts
- **Path:** `services/org/orgService.ts`
- **Role:** Organization Service — Manages multi-tenant organizations. Online-Only implementation using Supabase. /

**Functions / Methods:**
- `orgService.create()`
- `orgService.name()`
- `orgService.ownerId()`
- `orgService.plan()`
- `orgService.org()`
- `orgService.membership()`
- `orgService.subscription()`
- `orgService.generateSlug()`
- `orgService.now()`
- `orgService.toString()`
- `orgService.rpc()`
- `orgService.p_name()`
- `orgService.p_slug()`
- `orgService.p_owner_id()`
- `orgService.p_plan()`
- `orgService.if()`
- `orgService.error()`
- `orgService.RPC()`
- `orgService.Error()`
- `orgService.mapOrg()`
- `orgService.mapMember()`
- `orgService.mapSubscription()`
- `orgService.getUserOrgs()`
- `orgService.userId()`
- `orgService.includes()`
- `orgService.data()`
- `orgService.from()`
- `orgService.select()`
- `orgService.eq()`
- `orgService.map()`
- `orgService.m()`
- `orgService.in()`
- `orgService.return()`
- `orgService.getById()`
- `orgService.orgId()`
- `orgService.maybeSingle()`
- `orgService.update()`
- `orgService.updates()`
- `orgService.logo_url()`
- `orgService.single()`
- `orgService.getMembers()`
- `orgService.getUserRole()`
- `orgService.addMember()`
- `orgService.role()`
- `orgService.insert()`
- `orgService.org_id()`
- `orgService.user_id()`
- `orgService.updateMemberRole()`
- `orgService.removeMember()`
- `orgService.delete()`
- `orgService.getSubscription()`
- `orgService.getActiveOrgId()`
- `orgService.get()`
- `orgService.setActiveOrgId()`
- `orgService.set()`
- `orgService.clearActiveOrg()`
- `orgService.remove()`
- `orgService.claimOrganization()`
- `orgService.owner_id()`


---

## 📄 orgAggregationService.ts
- **Path:** `services/org/orgAggregationService.ts`
- **Role:** Provides functionality related to orgAggregationService

**Functions / Methods:**
- `orgAggregationService.aggregateOrgData()`
- `orgAggregationService.async()`
- `orgAggregationService.orgId()`
- `orgAggregationService.all()`
- `orgAggregationService.getAll()`
- `orgAggregationService.getMembers()`
- `orgAggregationService.catch()`
- `orgAggregationService.getAllBranches()`
- `orgAggregationService.computeMetrics()`
- `orgAggregationService.revalidate()`
- `orgAggregationService.cacheMetrics()`
- `orgAggregationService.Set()`
- `orgAggregationService.map()`
- `orgAggregationService.filter()`
- `orgAggregationService.has()`
- `orgAggregationService.memberRoleMap()`
- `orgAggregationService.for()`
- `orgAggregationService.Managers()`
- `orgAggregationService.Staff()`
- `orgAggregationService.orgRole()`
- `orgAggregationService.employees()`
- `orgAggregationService.managers()`
- `orgAggregationService.staff()`
- `getCachedMetrics()`
- `orgAggregationService()`


---

## 📄 validationService.ts
- **Path:** `services/validation/validationService.ts`
- **Role:** Validation Service - Centralized rules for data integrity /

**Functions / Methods:**
- `validationService.formats()`
- `validationService.isValidBarcode()`
- `validationService.barcode()`
- `validationService.if()`
- `validationService.test()`
- `validationService.codes()`
- `validationService.isValidEntityCode()`
- `validationService.code()`
- `validationService.prefix()`
- `validationService.RegExp()`
- `validationService.isValidPhone()`
- `validationService.phone()`
- `validationService.Matches()`
- `validationService.isValidEmail()`
- `validationService.email()`
- `validationService()`


---

## 📄 BaseReportService.ts
- **Path:** `services/core/BaseReportService.ts`
- **Role:** Provides functionality related to BaseReportService

**Functions / Methods:**
- `BaseReportService.mapDbToDomain()`
- `BaseReportService.mapDomainToDb()`
- `BaseReportService.getHistory()`
- `BaseReportService.from()`
- `BaseReportService.select()`
- `BaseReportService.toLowerCase()`
- `BaseReportService.eq()`
- `BaseReportService.gte()`
- `BaseReportService.lte()`
- `BaseReportService.applyCustomFilters()`
- `BaseReportService.order()`
- `BaseReportService.range()`
- `BaseReportService.error()`
- `BaseReportService.map()`
- `BaseReportService.data()`
- `BaseReportService.getAggregates()`
- `BaseReportService.join()`
- `BaseReportService.forEach()`
- `BaseReportService.reduce()`
- `BaseReportService.Number()`


---

## 📄 BaseDomainService.ts
- **Path:** `services/core/BaseDomainService.ts`
- **Role:** Provides functionality related to BaseDomainService

**Functions / Methods:**
- `BaseDomainService.mapFromDb()`
- `BaseDomainService.mapToDb()`
- `BaseDomainService.getAll()`
- `BaseDomainService.toLowerCase()`
- `BaseDomainService.from()`
- `BaseDomainService.select()`
- `BaseDomainService.eq()`
- `BaseDomainService.map()`
- `BaseDomainService.error()`
- `BaseDomainService.getById()`
- `BaseDomainService.await()`
- `BaseDomainService.single()`
- `BaseDomainService.create()`
- `BaseDomainService.uuid()`
- `BaseDomainService.insert()`
- `BaseDomainService.update()`
- `BaseDomainService.Error()`
- `BaseDomainService.delete()`


---

## 📄 BaseEntityService.ts
- **Path:** `services/core/BaseEntityService.ts`
- **Role:** Provides functionality related to BaseEntityService

**Functions / Methods:**
- `BaseEntityService.Column()`
- `BaseEntityService.search()`
- `BaseEntityService.trim()`
- `BaseEntityService.getAll()`
- `BaseEntityService.toLowerCase()`
- `BaseEntityService.from()`
- `BaseEntityService.select()`
- `BaseEntityService.eq()`
- `BaseEntityService.map()`
- `BaseEntityService.join()`
- `BaseEntityService.or()`
- `BaseEntityService.mapFromDb()`
- `BaseEntityService.error()`
- `BaseEntityService.status()`
- `BaseEntityService.filterByStatus()`


---

## 📄 DashboardService.ts
- **Path:** `services/dashboard/DashboardService.ts`
- **Role:** Provides functionality related to DashboardService

**Functions / Methods:**
- `DashboardService.Sum()`
- `DashboardService.calculateRevenueAndReturns()`
- `DashboardService.forEach()`
- `DashboardService.multiply()`
- `DashboardService.toSmallestUnit()`
- `DashboardService.returned()`
- `DashboardService.Discount()`
- `DashboardService.max()`
- `DashboardService.fromSmallestUnit()`
- `DashboardService.Sold()`
- `DashboardService.calculateCogs()`
- `DashboardService.find()`
- `DashboardService.divide()`
- `DashboardService.calculateInventoryValuation()`
- `DashboardService.filter()`
- `DashboardService.calculateProfitability()`
- `DashboardService.subtract()`
- `DashboardService.calculateEfficiency()`
- `DashboardService.analyzeMovement()`
- `DashboardService.Drug()`
- `DashboardService.levels()`
- `DashboardService.O()`
- `DashboardService.Risk()`
- `DashboardService.5()`
- `DashboardService.add()`
- `DashboardService.calculateAverages()`
- `DashboardService.getSalesDynamics()`
- `DashboardService.Date()`
- `DashboardService.getHours()`
- `DashboardService.entries()`
- `DashboardService.sort()`
- `DashboardService.parseInt()`
- `DashboardService.getTopSelling()`
- `DashboardService.values()`
- `DashboardService.slice()`
- `DashboardService.getExpiringSoon()`
- `DashboardService.setMonth()`
- `DashboardService.getMonth()`
- `DashboardService.some()`
- `DashboardService.map()`
- `DashboardService.getTime()`
- `DashboardService.getSalesTrends()`
- `DashboardService.toLocaleDateString()`


---

## 📄 auditService.ts
- **Path:** `services/auditService.ts`
- **Role:** Provides functionality related to auditService

**Functions / Methods:**
- `auditService.log()`
- `auditService.async()`
- `auditService.action()`
- `auditService.data()`
- `auditService.if()`
- `auditService.uuid()`
- `auditService.replace()`
- `auditService.random()`
- `auditService.r()`
- `auditService.toString()`
- `auditService.import()`
- `auditService.getAll()`
- `auditService.entry()`
- `auditService.id()`
- `auditService.generateId()`
- `auditService.timestamp()`
- `auditService.Date()`
- `auditService.toISOString()`
- `auditService.orgId()`
- `auditService.from()`
- `auditService.insert()`
- `auditService.mapAuditToDb()`
- `auditService.then()`
- `auditService.warn()`
- `auditService.slice()`
- `auditService.set()`
- `auditService.catch()`
- `auditService.error()`
- `auditService.getLogs()`
- `auditService.select()`
- `auditService.order()`
- `auditService.ascending()`
- `auditService.limit()`
- `auditService.eq()`
- `auditService.map()`
- `auditService.filter()`
- `auditService.getOrgLogs()`
- `auditService.failed()`
- `auditService.fallback()`
- `auditService.logs()`
- `auditService()`


---

## 📄 timeService.ts
- **Path:** `services/timeService.ts`
- **Role:** TimeService - Provides verified time to prevent date tampering Strategy: 1. Sync with external time API when online 2. Calculate offset between server time and system time 3. Store offset in localStorage for offline use 4. Provide verified date by applying offset to system time /

**Functions / Methods:**
- `TimeService.loadStoredOffset()`
- `TimeService.parseInt()`
- `TimeService.isNaN()`
- `TimeService.warn()`
- `TimeService.syncTime()`
- `TimeService.now()`
- `TimeService.First()`
- `TimeService.rpc()`
- `TimeService.Date()`
- `TimeService.getTime()`
- `TimeService.set()`
- `TimeService.toString()`
- `TimeService.log()`
- `TimeService.startsWith()`
- `TimeService.URL()`
- `TimeService.AbortController()`
- `TimeService.setTimeout()`
- `TimeService.abort()`
- `TimeService.fetch()`
- `TimeService.clearTimeout()`
- `TimeService.Error()`
- `TimeService.json()`
- `TimeService.TimeAPI()`
- `TimeService.0()`
- `TimeService.successful()`
- `TimeService.date()`
- `TimeService.getVerifiedDate()`
- `TimeService.getOffset()`
- `TimeService.recently()`
- `TimeService.isSynced()`
- `TimeService.getLastSyncTime()`


---

## 📄 branchService.ts
- **Path:** `services/branchService.ts`
- **Role:** Branch Service - Handles CRUD operations for pharmacy branches. Online-Only implementation using Supabase. /

**Functions / Methods:**
- `BranchServiceImpl.mapFromDb()`
- `BranchServiceImpl.Date()`
- `BranchServiceImpl.toISOString()`
- `BranchServiceImpl.mapToDb()`
- `BranchServiceImpl.getAll()`
- `BranchServiceImpl.getActiveOrgId()`
- `BranchServiceImpl.from()`
- `BranchServiceImpl.select()`
- `BranchServiceImpl.eq()`
- `BranchServiceImpl.order()`
- `BranchServiceImpl.map()`
- `BranchServiceImpl.error()`
- `BranchServiceImpl.getAllByOrg()`
- `BranchServiceImpl.getActive()`
- `BranchServiceImpl.get()`
- `BranchServiceImpl.ensureDefaultBranch()`
- `BranchServiceImpl.getById()`
- `BranchServiceImpl.setActive()`
- `BranchServiceImpl.set()`
- `BranchServiceImpl.generateCode()`
- `BranchServiceImpl.reduce()`
- `BranchServiceImpl.match()`
- `BranchServiceImpl.parseInt()`
- `BranchServiceImpl.max()`
- `BranchServiceImpl.String()`
- `BranchServiceImpl.padStart()`
- `BranchServiceImpl.create()`
- `BranchServiceImpl.uuid()`
- `BranchServiceImpl.insert()`
- `BranchServiceImpl.delete()`
- `BranchServiceImpl.remove()`
- `BranchServiceImpl.assignEmployees()`
- `BranchServiceImpl.filter()`
- `BranchServiceImpl.includes()`
- `BranchServiceImpl.update()`
- `BranchServiceImpl.some()`
- `BranchServiceImpl.find()`


---

## 📄 geminiService.ts
- **Path:** `services/geminiService.ts`
- **Role:** Provides functionality related to geminiService

**Functions / Methods:**
- `and.tip()`
- `and.generateContent()`
- `and.error()`
- `and.toString()`
- `and.includes()`
- `and.Error()`
- `and.fetch()`
- `and.stringify()`
- `and.warn()`
- `and.json()`
- `analyzeDrugInteraction()`
- `generateHealthTip()`


---

