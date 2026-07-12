# Server-Side Pagination — Compact Execution Plan

**Goal:** Cut PostgREST egress from 1.9 GB → ~200 MB/month by paginating Inventory queries server-side in TanStackTable.

**Scope:** Inventory only. One table, one hook, one component migration. ~8 files changed.

---

## Phase 1: TanStackTable — Add Server-Side Pagination Mode

### 1.1 `components/common/table/types.ts`

Add 4 props to `TanStackTableProps`:

```typescript
manualPagination?: boolean;
totalCount?: number;
onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
isFetching?: boolean;
```

### 1.2 `components/common/TanStackTable.tsx`

**`useReactTable` config** — when `manualPagination` is true:
- Set `manualPagination: true`
- Set `pageCount: Math.ceil((totalCount || 0) / pagination.pageSize)`
- Wire `onPaginationChange` to forward state to parent
- Omit `getPaginationRowModel` and `getFilteredRowModel` (they're client-side)

**PaginationBar** — In the "of X" display, replace:
```diff
- table.getFilteredRowModel().rows.length.toLocaleString()
+ manualPagination 
+   ? (totalCount ?? data.length).toLocaleString()
+   : table.getFilteredRowModel().rows.length.toLocaleString()
```

**"Show All" button** — when `manualPagination`, disable it or cap at loading a reasonable chunk (e.g., 500 rows). No infinite scroll in this phase.

**`isFetching` indicator** — Add a small spinner next to the page count in the pagination bar when `manualPagination && isFetching`.

---

## Phase 2: Inventory Repository — Add `getPage()`

### 2.1 `services/inventory/repositories/inventoryRepository.ts`

Add the method alongside existing `getAll()`:

```typescript
async getPage(
  branchId: string,
  options: {
    page: number;       // 1-indexed
    pageSize: number;   // max 200
    search?: string;
    filters?: Record<string, any>;
    sort?: { column: string; ascending: boolean };
  }
): Promise<{ data: Drug[]; total: number }> {
  const from = (options.page - 1) * options.pageSize;
  const to = from + options.pageSize - 1;

  let query = supabase
    .from(this.tableName)
    .select(
      'id, org_id, branch_id, name, generic_name, category, public_price, unit_price, cost_price, unit_cost_price, stock, damaged_stock, expiry_date, barcode, internal_code, units_per_pack, supplier_id, max_discount, dosage_form, min_stock, origin, manufacturer, tax, status, description, additional_barcodes, item_rank',
      { count: 'exact' }
    )
    .eq('branch_id', branchId);

  if (options.search?.trim()) {
    const term = options.search.trim();
    query = query.or(`name.ilike.%${term}%,barcode.ilike.%${term}%,internal_code.ilike.%${term}%`);
  }

  if (options.filters) {
    if (options.filters.category) query = query.eq('category', options.filters.category);
    if (options.filters.status) query = query.eq('status', options.filters.status);
  }

  const sortCol = options.sort?.column || 'name';
  const asc = options.sort?.ascending ?? true;
  query = query.order(sortCol, { ascending });

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data || []).map((item) => this.mapFromDb(item)),
    total: count || 0,
  };
}
```

### 2.2 `services/inventory/inventoryService.ts`

Add a thin wrapper:

```typescript
async getPage(
  branchId: string,
  options: { page: number; pageSize: number; search?: string; filters?: Record<string, any> }
): Promise<{ data: Drug[]; total: number }> {
  const settings = await settingsService.getAll();
  const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
  return inventoryRepository.getPage(effectiveBranchId, options);
}
```

---

## Phase 3: Query Hook

### 3.1 `hooks/queries/useInventoryQuery.ts`

Add new hook:

```typescript
export function useInventoryPage(
  branchId: string,
  page: number,
  pageSize: number,
  search?: string,
  filters?: Record<string, any>
) {
  return useQuery({
    queryKey: [...queryKeys.inventory.all(branchId), 'page', page, pageSize, search, filters],
    queryFn: () =>
      inventoryService.getPage(branchId, { page, pageSize, search, filters }) as Promise<{
        data: Drug[];
        total: number;
      }>,
    enabled: !!branchId,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
```

No changes to existing hooks. `useInventory` and `useRawInventory` remain for backward compatibility.

---

## Phase 4: Component Migration

### 4.1 `components/inventory/Inventory.tsx`

Replace:
```diff
- const { data: inventory, isLoading } = useInventory(activeBranchId);
+ const [page, setPage] = useState(0);
+ const [search, setSearch] = useState('');
+ const [filters, setFilters] = useState<Record<string, any>>({});
+ const pageSize = 'auto' as const;
+ const [tablePageSize, setTablePageSize] = useState(50);
+
+ const { data: pageResult, isLoading, isFetching } = useInventoryPage(
+   activeBranchId,
+   page + 1,
+   tablePageSize,
+   search,
+   filters
+ );
+
+ const currentData = pageResult?.data || [];
+ const totalCount = pageResult?.total || 0;
```

In the `<TanStackTable>` props:
```diff
- data={groupedInventory}
+ data={currentData}
+ manualPagination
+ totalCount={totalCount}
+ onPaginationChange={(p) => setPage(p.pageIndex)}
+ isFetching={isFetching}
+ onSearchChange={(val) => { setSearch(val); setPage(0); }}
+ filterableColumns={filterConfigs}
+ initialFilters={filters}
+ onFilterChange={(f) => { setFilters(f); setPage(0); }}
```

Also fix `inventoryService.search()` (line 59) to use `.ilike().limit(20)` instead of `getAll()` + client filter.

---

## Summary

| Step | Files | What |
|------|-------|------|
| 1 | `types.ts`, `TanStackTable.tsx` | Add `manualPagination`, `totalCount`, `onPaginationChange`, `isFetching` |
| 2 | `inventoryRepository.ts`, `inventoryService.ts` | Add `getPage()` with `.range()`, `.ilike()`, `.eq()` |
| 3 | `useInventoryQuery.ts` | Add `useInventoryPage` hook |
| 4 | `Inventory.tsx` | Wire up paginated query + TanStackTable props |
| 5 | `inventoryService.ts` | Fix `search()` to use `.ilike().limit(20)` |

**~8 files. ~1 day. ~70-80% egress savings.**
