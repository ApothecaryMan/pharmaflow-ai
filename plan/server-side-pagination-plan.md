# Server-Side Pagination & Infinite Scroll Plan

**Goal:** Eliminate full-table-scan `select *` queries that cause 1.9 GB/month PostgREST egress by implementing server-side pagination with infinite scroll in TanStackTable.

**Problem Summary:**
| Metric | Value |
|--------|-------|
| Total monthly egress | ~6.19 GB |
| Realtime (WebSockets) | 42 MB (0.7%) |
| Auth | 6 MB (0.1%) |
| **PostgREST (SQL queries)** | **1.935 GB (97.6%)** |
| Free plan limit | 5 GB |
| Current overage | 1.19 GB |

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Flow](#2-data-flow)
3. [Component Changes](#3-component-changes)
4. [Repository Layer Changes](#4-repository-layer-changes)
5. [Query Hook Changes](#5-query-hook-changes)
6. [Component Migration Order](#6-component-migration-order)
7. [Search & Filter Integration](#7-search--filter-integration)
8. [Infinite Scroll (Show All)](#8-infinite-scroll-show-all)
9. [Migration Checklist](#9-migration-checklist)
10. [Expected Results](#10-expected-results)

---

## 1. Architecture Overview

### Current (Broken)

```
                                         client-side
                                         pagination
User Browser ──→ React Query ──→ Supabase
                  │                 │
                  │                 └─ returns ALL rows (10,000)
                  │                    every query
                  │
                  └─ TanStackTable
                     ├─ getPaginationRowModel() ──► slices 20 rows
                     ├─ getFilteredRowModel()  ──► regex on 10,000 rows
                     └─ PaginationBar          ──► shows 10,000 total
```

### Target (Fixed)

```
                                         server-side
                                         pagination
User Browser ──→ React Query ──→ Supabase
                  │                 │
                  │                 └─ returns 20 rows + total count
                  │
                  └─ TanStackTable
                     ├─ displays 20 rows
                     ├─ PaginationBar shows totalCount from server
                     └─ onPaginationChange ──► parent refetches page
```

---

## 2. Data Flow

### 2.1 Paginated Mode (default)

```
User clicks "Page 3"
  → TanStackTable.onPaginationChange({ pageIndex: 2, pageSize: 50 })
  → Parent component: setPage(2)
  → React Query refetches (cache key includes page param)
  → Repository: supabase.from('drugs')
      .select(columns, { count: 'exact' })
      .eq('branch_id', branchId)
      .range(100, 149)
      .order('name')
  → Returns { data: Drug[50], total: 10000 }
  → TanStackTable receives new data + totalCount
  → PaginationBar shows "101-150 of 10,000"
  → No flash, instant render from cache if previously loaded
```

### 2.2 Search Flow

```
User types "Aspirin" in SearchInput
  → onSearchChange("Aspirin")
  → Parent: setSearch("Aspirin"), setPage(0)
  → React Query refetches (cache key now includes search term)
  → Repository:
      supabase.from('drugs')
        .select(columns, { count: 'exact' })
        .eq('branch_id', branchId)
        .or('name.ilike.%Aspirin%,barcode.ilike.%Aspirin%')
        .range(0, 49)
        .order('name')
  → Returns matching 20 results + total count
  → PaginationBar shows "1-20 of 147"
```

### 2.3 Filter Pill Flow

```
User selects filter: Category = "Antibiotics"
  → onFilterChange({ category: ["Antibiotics"] })
  → Parent: setFilters({ category: ["Antibiotics"] }), setPage(0)
  → Repository:
      .eq('category', 'Antibiotics')
      .range(0, 49)
  → Returns matching results
```

### 2.4 Infinite Scroll Flow

```
User clicks "Show All" button
  → TanStackTable: hides PaginationBar
  → Parent: switches from useInventoryPage to useInventoryInfinite
  → React Query useInfiniteQuery: loads page 1 (50 rows)
  → User scrolls down
  → IntersectionObserver fires on sentinel row
  → fetchNextPage() → loads page 2 (50 rows)
  → Accumulated: 100 rows visible, scroll continues
  → Sentinel fires again → page 3... until all rows loaded
  → "All items loaded" message when done
  → No single large fetch ever occurs
  → Rows accumulate in React Query cache (staleTime 30min)
```

---

## 3. Component Changes

### 3.1 `components/common/table/types.ts`

Add new props:

```typescript
export interface TanStackTableProps<TData extends { id: string | number }, TValue> {
  // ... existing 57 props ...

  // ── Server-Side Pagination ──
  manualPagination?: boolean;                       // Enable server-side mode
  totalCount?: number;                              // Total rows from server
  onPaginationChange?: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  isFetching?: boolean;                             // Show loading during page fetch

  // ── Infinite Scroll (replaces Show All) ──
  enableInfiniteScroll?: boolean;                   // Show the toggle button
  isShowAll?: boolean;                              // Controlled from parent
  onToggleShowAll?: () => void;                     // Toggle callback
  onLoadMore?: () => void;                          // Fetch next page
  hasMore?: boolean;                                // More pages exist?
  isFetchingMore?: boolean;                         // Show bottom spinner
}
```

### 3.2 `components/common/TanStackTable.tsx`

**Changes required:**

| Area | What changes |
|------|-------------|
| `useReactTable()` config | When `manualPagination`: pass `manualPagination: true`, `pageCount: Math.ceil((totalCount || 0) / pageSize)`, wire `onPaginationChange` to parent |
| `getPaginationRowModel` | Only include when NOT `manualPagination` |
| `getFilteredRowModel` | Only include when NOT `manualPagination` (filtering happens server-side) |
| Tables state | When `manualPagination`: remove `globalFilter` and `columnFilters` from state (handled by parent) |
| PaginationBar | When `manualPagination`: use `totalCount` prop instead of `table.getFilteredRowModel().rows.length` for row count display. Show `isFetching` indicator (subtle spinner next to page count). |
| Show All button | When `enableInfiniteScroll`: button toggles `isShowAll` via `onToggleShowAll`. When `isShowAll` is true, hide PaginationBar entirely. |
| Infinite scroll sentinel | Add IntersectionObserver on last row. When sentinel visible + hasMore + not fetching → `onLoadMore()`. Show loading spinner at bottom. |

**Detailed `useReactTable` config change:**

```typescript
const table = useReactTable({
  data,
  columns,
  state: {
    sorting,
    columnVisibility,
    columnSizing,
    // Only use globalFilter/columnFilters when NOT manualPagination
    ...(!manualPagination && {
      globalFilter: debouncedGlobalFilter,
      columnFilters,
    }),
    pagination: isShowAll
      ? { pageIndex: 0, pageSize: data.length || 1 }
      : pagination,
  },
  onSortingChange: setSorting,
  // Only use client-side filtering when NOT manualPagination
  ...(!manualPagination && {
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
  }),
  onPaginationChange: manualPagination
    ? (updater) => {
        const next = typeof updater === 'function' ? updater(pagination) : updater;
        setPagination(next);
        onPaginationChange?.(next);
      }
    : setPagination,
  onColumnVisibilityChange: setColumnVisibility,
  onColumnSizingChange: setColumnSizing,
  enableColumnResizing: true,
  columnResizeMode: 'onChange',
  columnResizeDirection: isRtl ? 'rtl' : 'ltr',
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  // Only client-side filter model when applicable
  ...(!manualPagination && {
    getFilteredRowModel: getFilteredRowModel(),
  }),
  // Only client-side pagination model when applicable
  ...(!manualPagination && enablePagination && {
    getPaginationRowModel: getPaginationRowModel(),
  }),
  // Manual pagination config
  manualPagination,
  pageCount: manualPagination
    ? Math.ceil((totalCount || 0) / pagination.pageSize)
    : undefined,
  globalFilterFn: globalFilterFnStable,
  enableSorting: true,
  defaultColumn: {
    filterFn: unifiedFilterFn,
  },
});
```

**PaginationBar total count change:**

```diff
  <span className='text-(--text-primary) inline-block min-w-[24px] text-center'>
-   {table.getFilteredRowModel().rows.length.toLocaleString()}
+   {manualPagination 
+     ? (totalCount ?? data.length).toLocaleString()
+     : table.getFilteredRowModel().rows.length.toLocaleString()
+   }
  </span>
```

**Infinite scroll sentinel (new, inside tbody after rows):**

```tsx
// Only when infinite scroll mode is active and showAll is toggled
{enableInfiniteScroll && isShowAll && (
  <>
    {rows.map((row) => (
      <RowRenderer key={row.id} row={row} ... />
    ))}
    {/* Sentinel row */}
    <tr ref={sentinelRef}>
      <td colSpan={visibleColumnsCount} className="text-center py-4">
        {isFetchingMore ? (
          <div className="flex items-center justify-center gap-2 text-sm text-(--text-secondary)">
            <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        ) : !hasMore ? (
          <span className="text-sm text-(--text-secondary) opacity-60">
            {t.global?.table?.allLoaded || 'All items loaded'}
          </span>
        ) : null}
      </td>
    </tr>
  </>
)}
```

**IntersectionObserver hook (new):**

```typescript
const sentinelRef = useCallback((node: HTMLTableRowElement | null) => {
  if (!node || !isShowAll) return;
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !isFetchingMore && onLoadMore) {
        onLoadMore();
      }
    },
    { rootMargin: '200px' } // trigger 200px before end
  );
  observer.observe(node);
  return () => observer.disconnect();
}, [isShowAll, hasMore, isFetchingMore, onLoadMore]);
```

**Show All button behavior change:**

```diff
- {enableShowAll && (
-   <button onClick={() => setIsShowAll(!isShowAll)} ...>
-     ...
-   </button>
- )}
+ {enableInfiniteScroll && (
+   <button onClick={onToggleShowAll} ...>
+     <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
+       {isShowAll ? 'splitscreen' : 'view_day'}
+     </span>
+   </button>
+ )}
```

### 3.3 SearchInput + FilterPill

**No changes needed.** These components already emit callbacks (`onSearchChange`, `onUpdateFilter`). The difference is where filtering executes:

| Prop | Before (client-side) | After (server-side) |
|---|---|---|
| `onSearchChange` | Updated `TanStackTable.globalFilter` | Parent updates `search` state → re-fetches |
| `onFilterChange` | Updated `TanStackTable.columnFilters` | Parent updates `filters` state → re-fetches |

Both callbacks already exist in TanStackTable's interface and are forwarded from SearchInput/FilterPill.

---

## 4. Repository Layer Changes

Each repository gets a new `getPage()` method alongside existing `getAll()`. The old `getAll()` stays for components not yet migrated.

### 4.1 Pattern (Example: `inventoryRepository.ts`)

```typescript
export interface PageOptions {
  page: number;              // 1-indexed
  pageSize: number;
  search?: string;           // global text search
  filters?: Record<string, any>;  // column filters
  sort?: { column: string; ascending: boolean };
}

export interface PageResult<T> {
  data: T[];
  total: number;
}

async getPage(
  branchId: string,
  options: PageOptions
): Promise<PageResult<Drug>> {
  const { page, pageSize, search, filters, sort } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(this.tableName)
    .select(
      'id, org_id, branch_id, name, generic_name, category, public_price, unit_price, cost_price, unit_cost_price, stock, damaged_stock, expiry_date, barcode, internal_code, units_per_pack, supplier_id, max_discount, dosage_form, min_stock, origin, manufacturer, tax, status, description, additional_barcodes, item_rank',
      { count: 'exact' }
    )
    .eq('branch_id', branchId);

  // Server-side search
  if (search?.trim()) {
    const term = search.trim();
    query = query.or(
      `name.ilike.%${term}%,barcode.ilike.%${term}%,internal_code.ilike.%${term}%`
    );
  }

  // Server-side filters
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.supplierId) {
    query = query.eq('supplier_id', filters.supplierId);
  }

  // Server-side sorting
  const sortColumn = sort?.column || 'name';
  const ascending = sort?.ascending ?? true;
  query = query.order(sortColumn, { ascending });

  // Pagination
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data || []).map((item) => this.mapFromDb(item)),
    total: count || 0,
  };
}
```

### 4.2 Repositories to Modify

| Repository | File | Searchable Columns | Filterable Columns |
|------------|------|-------------------|-------------------|
| `inventoryRepository` | `services/inventory/repositories/inventoryRepository.ts` | `name`, `barcode`, `internal_code` | `category`, `status`, `supplier_id`, `min_stock` |
| `batchRepository` | `services/inventory/repositories/batchRepository.ts` | `batch_number` | `drug_id`, `expiry_date` |
| `customerRepository` | `services/customers/repositories/customerRepository.ts` | `name`, `phone`, `code` | `status`, `governorate` |
| `employeeRepository` | `services/hr/repositories/employeeRepository.ts` | `name`, `code`, `phone` | `status`, `role`, `department` |
| `supplierRepository` | `services/suppliers/repositories/supplierRepository.ts` | `name`, `code`, `phone` | `status`, `governorate` |
| `branchRepository` | `services/org/repositories/branchRepository.ts` | `name`, `code` | `status` |
| `expenseRepository` | `services/financials/repositories/expenseRepository.ts` | `description`, `category` | `category`, `payment_method`, `date` |

### 4.3 Service Layer Wrappers

Each service wraps the repository's `getPage()`:

```typescript
// services/inventory/inventoryService.ts
async getPage(
  branchId: string,
  options: PageOptions
): Promise<PageResult<Drug>> {
  const settings = await settingsService.getAll();
  const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
  return inventoryRepository.getPage(effectiveBranchId, options);
}
```

---

## 5. Query Hook Changes

### 5.1 Paginated Hook (for PaginationBar mode)

```typescript
// hooks/queries/useInventoryQuery.ts

export function useInventoryPage(
  branchId: string,
  page: number,
  pageSize: number,
  search?: string,
  filters?: Record<string, any>
) {
  return useQuery({
    queryKey: [
      ...queryKeys.inventory.all(branchId),
      'page',
      page,
      pageSize,
      search,
      filters,
    ],
    queryFn: () =>
      inventoryService.getPage(branchId, {
        page,
        pageSize,
        search,
        filters,
      }) as Promise<PageResult<Drug>>,
    enabled: !!branchId,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
```

### 5.2 Infinite Scroll Hook (for Show All mode)

```typescript
// hooks/queries/useInventoryInfinite.ts

export function useInventoryInfinite(
  branchId: string,
  pageSize: number,
  search?: string,
  filters?: Record<string, any>
) {
  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.inventory.all(branchId),
      'infinite',
      pageSize,
      search,
      filters,
    ],
    queryFn: ({ pageParam = 1 }) =>
      inventoryService.getPage(branchId, {
        page: pageParam,
        pageSize,
        search,
        filters,
      }) as Promise<PageResult<Drug>>,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, p) => sum + p.data.length, 0);
      return totalLoaded < lastPage.total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!branchId,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
```

### 5.3 Hooks to Create

| Hook | File | For Tables |
|------|------|-----------|
| `useInventoryPage` + `useInventoryInfinite` | `hooks/queries/useInventoryQuery.ts` | Inventory, Shortages, Expiry |
| `useCustomersPage` + `useCustomersInfinite` | `hooks/queries/useCustomersQuery.ts` | Customers |
| `useEmployeesPage` + `useEmployeesInfinite` | `hooks/queries/useEmployeesQuery.ts` | Employees |
| `useSuppliersPage` + `useSuppliersInfinite` | `hooks/queries/useSuppliersQuery.ts` | Suppliers |
| `useBatchesPage` + `useBatchesInfinite` | `hooks/queries/useBatchesQuery.ts` (new) | Expiry, Batches |

---

## 6. Component Migration Order

Priority determined by: **dataset size × fetch frequency = egress impact**.

| Priority | Component | Current Data | Migrate To | Est. Savings |
|----------|-----------|-------------|------------|-------------|
| **P0** | `Inventory.tsx`, `InventoryManagement.tsx` | `useInventory()` — ALL drugs (largest table) | `useInventoryPage` / `useInventoryInfinite` | ~40% |
| **P1** | `ShortagesPage.tsx` | `useInventory()` — ALL drugs | `useInventoryPage` with server-side low-stock filter | ~10% |
| **P2** | `ExpiryManagement.tsx` | `useBatches()` + `useInventory()` — ALL batches + drugs | `useBatchesPage` (server-side) | ~10% |
| **P3** | `CustomerManagement.tsx` | `useCustomers()` — ALL customers | `useCustomersPage` / `useCustomersInfinite` | ~8% |
| **P4** | `EmployeeList.tsx` | `useEmployees()` — ALL employees | `useEmployeesPage` / `useEmployeesInfinite` | ~5% |
| **P5** | `SuppliersList.tsx` | `useSuppliers()` — ALL suppliers | `useSuppliersPage` / `useSuppliersInfinite` | ~5% |
| **P6** | `ExpenseTracker.tsx` | `useExpenses()` — ALL expenses | Paginated hook | ~3% |
| **P7** | `FinancialsPage.tsx` | Full datasets from hooks | Paginated hooks | ~3% |
| **P8** | `AuditPage.tsx` | Full dataset from hook | Paginated hook | ~2% |
| **P9** | `usePrescriptionPricing.ts` | `inventoryRepository.getAll()` NO BRANCH | `inventoryService.search()` with `.ilike().limit(20)` | ~3% |
| **P10** | `POSDrugAnalytics.tsx` | `salesService.getAll()` | Aggregated RPC query | ~1% |
| **P11** | `orgAggregationService.ts` | `getAll('all')` on multiple tables | SQL aggregation queries in RPC | ~5% |

### Component Usage Pattern (after migration)

```typescript
// components/inventory/Inventory.tsx (migrated)
function Inventory({ branchId }: { branchId: string }) {
  const [isShowAll, setIsShowAll] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const pageSize = 50;

  // Paginated query
  const {
    data: pageData,
    totalCount,
    isFetching,
  } = useInventoryPage(branchId, page + 1, pageSize, search, filters);

  // Infinite query
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInventoryInfinite(branchId, pageSize, search, filters);

  const currentData = isShowAll
    ? infiniteData?.pages.flatMap((p) => p.data) || []
    : pageData?.data || [];

  const handleSearch = useCallback((term: string) => {
    setSearch(term);
    setPage(0); // reset to first page on search
  }, []);

  const handleFilterChange = useCallback((newFilters: Record<string, any[]>) => {
    setFilters(newFilters);
    setPage(0);
  }, []);

  return (
    <TanStackTable
      data={currentData}
      columns={columns}
      tableId='inventory_table'
      isLoading={isFetching && currentData.length === 0}
      // Server-side pagination
      manualPagination={!isShowAll}
      totalCount={totalCount || 0}
      onPaginationChange={(p) => setPage(p.pageIndex)}
      isFetching={isFetching}
      // Search + filters → server-side
      onSearchChange={handleSearch}
      filterableColumns={filterConfigs}
      initialFilters={filters}
      onFilterChange={handleFilterChange}
      // Infinite scroll
      enableInfiniteScroll
      isShowAll={isShowAll}
      onToggleShowAll={() => setIsShowAll((v) => !v)}
      onLoadMore={() => fetchNextPage()}
      hasMore={!!hasNextPage}
      isFetchingMore={isFetchingNextPage}
      // Table features
      enablePagination
      pageSize='auto'
      enableVirtualization
      dense
    />
  );
}
```

---

## 7. Search & Filter Integration

### 7.1 Current State (all client-side)

| Component | Variable | Mechanism |
|-----------|----------|-----------|
| `SearchInput` text field | `globalFilter` string | `getFilteredRowModel()` → `unifiedFilterFn` |
| `FilterPill` dropdowns | `columnFilters` array | `getFilteredRowModel()` → `unifiedFilterFn` |
| `helpers.ts` | `unifiedFilterFn` | Client-side regex on every row |

### 7.2 Target State (server-side when manualPagination)

| Component | Variable | Mechanism |
|-----------|----------|-----------|
| `SearchInput` text field | `onSearchChange` → parent state | Server `.or(ilike...)` in SQL |
| `FilterPill` dropdowns | `onFilterChange` → parent state | Server `.eq()` / `.in()` in SQL |
| `TanStackTable` | `manualPagination=true` | Client filtering disabled |

### 7.3 Filter Config Definitions (stays unchanged)

Filter configs remain in each component. They define which filter pills appear:

```typescript
// components/inventory/Inventory.tsx
const filterConfigs: FilterConfig[] = [
  {
    id: 'status',
    label: 'Status',
    icon: 'toggle_off',
    mode: 'single',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'discontinued', label: 'Discontinued' },
    ],
  },
  {
    id: 'category',
    label: 'Category',
    icon: 'category',
    mode: 'multiple',
    options: categories.map((c) => ({ value: c, label: c })),
  },
];
```

These flow through:
1. `SearchInput` → `filterConfigs` prop → renders filter pills
2. `FilterPill` → `onUpdateFilter(id, values)` → `TanStackTable.onFilterChange(nextFilters)`
3. Parent receives `onFilterChange` → updates state → refetches with `.eq()` applied server-side

### 7.4 Search Debouncing

The existing 150ms debounce in TanStackTable (line 461) remains unchanged. It prevents excessive API calls while typing. Each debounced value triggers a refetch.

---

## 8. Infinite Scroll (Show All)

### 8.1 How it Works

1. **User clicks "Show All"** button in the toolbar
2. **TanStackTable** hides PaginationBar and switches to scroll-based loading
3. **Parent** switches from `useInventoryPage` to `useInventoryInfinite`
4. **IntersectionObserver** on the last table row detects when user scrolls near bottom
5. **`onLoadMore()`** fires → `fetchNextPage()` loads next page from Supabase
6. **Pages accumulate** in React Query cache (data passed to table grows)
7. **Sentinel shows spinner** while fetching, "All items loaded" when done
8. **User stays** in control — never downloads more than they scroll to see

### 8.2 State Machine

```
        ┌─────────────────────────────────────────────────────┐
        │                                                     │
        ▼                                                     │
  ┌──────────┐  click "Show All"   ┌──────────────┐          │
  │ Paginated ├────────────────────►│ InfiniteScroll│         │
  │ Mode      │                     │ (page 1 loaded)│        │
  └─────┬─────┘                    └──────┬────────┘         │
        │                                 │                   │
        │                                 ▼                   │
        │                          ┌──────────────┐          │
        │                     ┌───►│ Scroll down   │          │
        │                     │    │ Sentinel hit  │          │
        │                     │    └──────┬────────┘          │
        │                     │           │                   │
        │                     │           ▼                   │
        │                     │    ┌──────────────┐          │
        │                     │    │ fetchNextPage │          │
        │                     │    │ (loading...)  │          │
        │                     │    └──────┬────────┘          │
        │                     │           │                   │
        │                     │           ▼                   │
        │                     │    ┌──────────────┐          │
        │                     │    │ hasMore?     │           │
        │                     │    │  ┌─ Yes ─────►───────────┘
        │                     │    │  └─ No → "All loaded"    │
        │                     │    └──────────────────         │
        │                     │                                │
        │  click "Show Pages" │                                │
        └─────────────────────┘                                │
          (back to paginated)                                  │
                                                               │
        └──────────────────────────────────────────────────────┘
```

### 8.3 Cursor vs Offset Pagination

We use **offset-based pagination** (`.range(from, to)`) instead of cursor-based for simplicity, since:
- Tables have stable primary keys (UUIDs)
- Sorting is by name/date (not by cursor)
- `useInfiniteQuery` works with offset via `pageParam`

### 8.4 React Query Cache Behavior

```
Paginated Mode:  queryKey = ['inventory', branchId, 'page', 1, 50, '', {}]
Infinite Mode:   queryKey = ['inventory', branchId, 'infinite', 50, '', {}]

They share nothing. If user switches from infinite back to paginated:
  → Paginated query is already cached (from initial load)
  → Instant display, no re-fetch

staleTime: 30 min across both modes
gcTime: 24h (cache persists)
```

---

## 9. Migration Checklist

### Phase 1: Core Infrastructure

- [ ] `types.ts` — Add 8 new props
- [ ] `TanStackTable.tsx` — `useReactTable` config for `manualPagination`
- [ ] `TanStackTable.tsx` — PaginationBar uses `totalCount` prop
- [ ] `TanStackTable.tsx` — Disable client-side filtering in manual mode
- [ ] `TanStackTable.tsx` — Infinite scroll sentinel + IntersectionObserver
- [ ] `TanStackTable.tsx` — Show All button → infinite scroll toggle
- [ ] `TanStackTable.tsx` — isFetching indicator in pagination bar

### Phase 2: Repository Layer

- [ ] `inventoryRepository.ts` — Add `getPage()` with search/filter/sort/range
- [ ] `batchRepository.ts` — Add `getPage()`
- [ ] `customerRepository.ts` — Add `getPage()`
- [ ] `employeeRepository.ts` — Add `getPage()`
- [ ] `supplierRepository.ts` — Add `getPage()`
- [ ] `branchRepository.ts` — Add `getPage()`
- [ ] `expenseRepository.ts` — Add `getPage()`

### Phase 3: Query Hooks

- [ ] `useInventoryQuery.ts` — Add `useInventoryPage` + `useInventoryInfinite`
- [ ] `useCustomersQuery.ts` — Add `useCustomersPage` + `useCustomersInfinite`
- [ ] `useEmployeesQuery.ts` — Add `useEmployeesPage` + `useEmployeesInfinite`
- [ ] `useSuppliersQuery.ts` — Add `useSuppliersPage` + `useSuppliersInfinite`
- [ ] New `useBatchesQuery.ts` — Add `useBatchesPage` + `useBatchesInfinite`

### Phase 4: Component Migration (P0-P2)

- [ ] `Inventory.tsx` — Switch to `useInventoryPage`/`useInventoryInfinite`
- [ ] `InventoryManagement.tsx` — Same
- [ ] `ShortagesPage.tsx` — Switch with server-side low-stock filter
- [ ] `ExpiryManagement.tsx` — Switch to `useBatchesPage`

### Phase 5: Component Migration (P3-P8)

- [ ] `CustomerManagement.tsx` — Switch to `useCustomersPage`/`useCustomersInfinite`
- [ ] `EmployeeList.tsx` — Switch to `useEmployeesPage`/`useEmployeesInfinite`
- [ ] `SuppliersList.tsx` — Switch to `useSuppliersPage`/`useSuppliersInfinite`
- [ ] `ExpenseTracker.tsx` — Switch to paginated hook
- [ ] `FinancialsPage.tsx` — Switch to paginated hooks
- [ ] `AuditPage.tsx` — Switch to paginated hook

### Phase 6: Fix Full-Table-Scan Patterns

- [ ] `usePrescriptionPricing.ts:19` — Replace `getAll()` with `searchDrugs()`
- [ ] `inventoryService.ts:59` `search()` — Replace with `.ilike().limit(20)`
- [ ] `inventoryService.ts:71` `filter()` — Push filters to SQL
- [ ] `intelligenceService.ts:69` — Replace `getAll()` with paginated query
- [ ] `orgAggregationService.ts:184` — Replace `getAll('all')` with SQL aggregation
- [ ] `POSDrugAnalytics.tsx:118` — Replace with aggregated RPC

### Phase 7: Tuning

- [ ] Set `refetchOnWindowFocus: false` on all paginated hooks
- [ ] Increase `staleTime` to 30 min for inventory, customers, employees
- [ ] Remove old `getAll()` methods after all migrations are complete
- [ ] Add `supabase.rpc()` for aggregation queries where needed

---

## 10. Expected Results

### Egress Reduction (PostgREST)

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| **Initial page load** (inventory) | ~3 MB (10,000 rows) | ~20 KB (50 rows) | **99.3%** |
| **Window focus refetch** | ~3 MB | 0 (disabled) | **100%** |
| **Search "Aspirin"** | ~3 MB (filtered client-side) | ~2 KB (server `.ilike`) | **99.9%** |
| **Browse all pages** | ~3 MB (one fetch) | ~300 KB (15 page fetches × 20 KB) | **90%** |
| **Show All (scroll)** | ~3 MB (one fetch) | ~300 KB (scroll-triggered pages) | **90%** |
| **Daily usage (8h)** | ~200 MB | ~15 MB | **92.5%** |
| **Monthly PostgREST** | **1.935 GB** | **~150 MB** | **~92%** |

### Total Monthly Egress

| Type | Before | After |
|------|--------|-------|
| PostgREST | 1.935 GB | ~150 MB |
| Realtime | 42 MB | 42 MB (unchanged) |
| Auth | 6 MB | 6 MB (unchanged) |
| **Total** | **~1.98 GB** | **~198 MB** |

**Result:** PostsgREST drops from 1.9 GB to ~150 MB — well within the 5 GB free plan with 96% headroom.
