# Fix Hardcoded Limit Fetches (Recent Data Bug)

## Problem

Components rely on `useRecentSales(100)` and `usePurchases(100)`, then filter in-memory. Once a branch surpasses 100 sales/purchases globally, data vanishes from filtered views (employee history, customer history, etc.).

## New Hooks

| Hook | File | Signature | Backend Call |
|------|------|-----------|-------------|
| `useEmployeeSales` | `hooks/queries/useSalesQuery.ts` | `(employeeId, branchId, dateRange?)` | `salesService.filter({ soldByEmployeeId, dateFrom, dateTo })` |
| `useCustomerSales` | `hooks/queries/useSalesQuery.ts` | `(customerId, branchId)` | `salesService.getByCustomer(customerId, branchId)` |
| `usePurchasesPage` | `hooks/queries/usePurchasesQuery.ts` | `(branchId, page, pageSize, filters)` | `purchaseService.listPage(...)` |

## Component Changes

### HR / Staff

| Component | Current | Replace With | Notes |
|-----------|---------|--------------|-------|
| `StaffOverview.tsx` | `useRecentSales(branchId)` + frontend today-filter | `useTodaySales(branchId)` | Remove `todaysSales` useMemo |
| `EmployeeProfile.tsx` | `useRecentSales(branchId)` | `useEmployeeSales(employeeId, branchId, dateRange)` + `useTodaySales(branchId)` for shift comparison | Default filter is 'month' — only fetches full history when user selects "All" |
| `EmployeeDetailsModal.tsx` | `useRecentSales(branchId)` | `useEmployeeSales(employee.id, branchId)` | Shows lifetime stats — no date filter needed |

### Customer

| Component | Current | Replace With | Notes |
|-----------|---------|--------------|-------|
| `CustomerHistory.tsx` | `useRecentSales(branchId)` + frontend registered-customer filter | `useSalesPage` with server-side date/search pagination | Keep frontend `registeredCodes` Set lookup (cheap) |
| `CustomerOverview.tsx` | `useRecentSales(branchId)` for `satisfactionMetrics` | `useSalesPage` (size ~500) or keep but accept approximation | `sales` IS used here (return rate, avg order, repeat rate) |
| `CustomerLoyaltyOverview.tsx` | `useRecentSales(branchId)` for points activity/trend | `useSalesPage` (size ~90) with date range | Replace inline `recentPointsActivity` / `pointsTrend` |

### Purchases

| Component | Current | Replace With | Notes |
|-----------|---------|--------------|-------|
| `PurchaseHistory.tsx` | `usePurchases(branchId)` + manual `purchaseService.listPage()` in useEffect | `usePurchasesPage(branchId, page, pageSize, filters)` | Already does pagination — wrap in proper hook; keep `usePurchases` for handler dependency |
| `PendingApproval.tsx` | `usePurchases(branchId)` + frontend `p.status === 'pending'` | `purchaseService.filter({ status: 'pending' })` or `usePurchasesPage` | Move pending filter to backend |

## Notes

- `useEmployeeSales` with no dateRange fetches **lifetime** — default view stays at 'month' (existing behavior), so "All" is the only case that fetches full history
- `useCustomerSales` fetches via `salesService.getByCustomer()` which delegates to `filter({ customerCode })` — already implemented
- `useSalesPage` already exists in `useSalesQuery.ts` — no need to create from scratch
- `usePurchasesPage` is new — mirrors `useSalesPage` pattern
