# Revenue Discrepancy Fix: Dashboard vs RealTime Sales

## Problem

Revenue mismatch between Dashboard (407.40) and RealTime Sales (465.80).

## Root Cause

Two separate calculation engines:

| Metric | Dashboard | RealTime Sales |
|--------|-----------|----------------|
| Engine | `compute_financial_summary_with_snapshots` RPC | `calculateRevenueAndReturns()` TypeScript |
| Cross-day returns | ✅ Included | ❌ Missed |
| Tax / delivery fees | ✅ Included | ❌ Ignored |
| Filters `completed` only | ✅ | ❌ |
| Result | 407.40 (correct) | 465.80 (inflated) |

## Steps

### Step 1: Delete `calculateRevenueAndReturns` from `financialService.ts`

Remove the function entirely (lines ~50–97). Also remove it from `dashboardService.ts` (lines ~39–96, already marked `@deprecated`).

### Step 2: Fix per-sale call sites in `dashboardService.ts`

**`getSalesDynamics`** (line ~284):
```
- const { totalRevenue } = DashboardService.calculateRevenueAndReturns([sale]);
+ const totalRevenue = sale.netTotal ?? sale.total;
```

**`calculateAverages`** (lines ~250–263): Delete the method — its two consumers will compute inline.

### Step 3: Refactor `useRealTimeSalesAnalytics.ts`

**Props**: add `finSummary: FinancialSummary | null`

**`coreMetrics`**: replace `financialService.calculateRevenueAndReturns(todaysSales)` with:
```ts
revenue: finSummary?.net_revenue ?? 0
transactions: finSummary?.total_transactions ?? todaysSales.length
itemsSold: finSummary?.total_units_sold ?? 0
returns: finSummary?.return_revenue ?? 0
```

**`averages`**: replace `DashboardService.calculateAverages(todaysSales)` with inline computation from `finSummary` fields.

**`highValueAnalysis`**: replace `calculateRevenueAndReturns([sale]).totalRevenue` with `sale.netTotal ?? sale.total`.

Remove `import { financialService }`.

### Step 4: Wire `useFinancialData('today')` into `RealTimeSalesMonitor.tsx`

```ts
import { useFinancialData } from '../../hooks/financials/useFinancialData';

const { summary: finSummary } = useFinancialData('today');

// Pass to hook:
const analytics = useRealTimeSalesAnalytics({
  sales: filteredByBranchSales,
  customers,
  products,
  shifts,
  language,
  finSummary,
});
```

### Step 5: Update tests

Remove `calculateRevenueAndReturns` test suite from `financialService.test.ts`.

---

### Verification

1. Open Dashboard → note Today's Revenue / Transactions / Items Sold / Returns
2. Open RealTime Sales Monitor → hero cards match exactly
3. Process a return against yesterday's sale → both pages reduce net revenue equally
