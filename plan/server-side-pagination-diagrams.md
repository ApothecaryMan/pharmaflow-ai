# Architecture Diagram: Server-Side Pagination & Infinite Scroll

## 1. Current vs Target Architecture

### 1.1 Current (Broken)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Browser                                        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  React Component                                                         ││
│  │  ┌─────────────┐   ┌──────────────────────────────────────────────────┐  ││
│  │  │ useQuery()   │   │  TanStackTable                                    │  ││
│  │  │              │   │                                                  │  ││
│  │  │ queryKey:    │   │  data = ALL 10,000 rows                          │  ││
│  │  │ ['inventory',│   │                                                  │  ││
│  │  │  branchId]   │──►│  ┌─────────────────────────────┐                │  ││
│  │  │              │   │  │ getPaginationRowModel()      │  client        │  ││
│  │  │ data: 10,000 │   │  │ slices 20 rows for display  │  pagination    │  ││
│  │  └─────────────┘   │  └─────────────────────────────┘                │  ││
│  │                    │  ┌─────────────────────────────┐                │  ││
│  │                    │  │ getFilteredRowModel()       │  client        │  ││
│  │                    │  │ regex on all 10,000 rows    │  filtering     │  ││
│  │                    │  └─────────────────────────────┘                │  ││
│  │                    │  ┌─────────────────────────────┐                │  ││
│  │                    │  │ SearchInput + FilterPill    │                │  ││
│  │                    │  │  → globalFilter / colFilters│  all client    │  ││
│  │                    │  └─────────────────────────────┘                │  ││
│  │                    └──────────────────────────────────────────────────┘  ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│                         ▲ HTTP response: ~3 MB JSON                          │
│                         │                                                     │
└─────────────────────────┼─────────────────────────────────────────────────────┘
                          │
                  ┌───────┴───────┐
                  │   Supabase    │
                  │               │
                  │  SELECT *     │
                  │  FROM drugs   │
                  │  WHERE        │
                  │  branch_id=X  │
                  │               │
                  │  Returns:     │
                  │  10,000 rows  │
                  └───────────────┘

  PROBLEM: Full table scan every query, 3MB payload, 1.9 GB/month
```

### 1.2 Target (Fixed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Browser                                        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  React Component                                                         ││
│  │  ┌─────────────┐   ┌──────────────────────────────────────────────────┐  ││
│  │  │ useQuery()   │   │  TanStackTable                                    │  ││
│  │  │              │   │                                                  │  ││
│  │  │ queryKey:    │   │  data = 50 rows (current page)                   │  ││
│  │  │ ['inventory',│   │                                                  │  ││
│  │  │  branchId,   │──►│  ┌─────────────────────────────┐                │  ││
│  │  │  'page',     │   │  │ manualPagination: true       │  server        │  ││
│  │  │  1, 50]      │   │  │ No getPaginationRowModel     │  pagination    │  ││
│  │  │              │   │  └─────────────────────────────┘                │  ││
│  │  │ data:        │   │  ┌─────────────────────────────┐                │  ││
│  │  │ {data: 50,  │   │  │ No getFilteredRowModel       │  no client     │  ││
│  │  │  total: 10000}│   │  │ Filtering happens server-side│  filtering    │  ││
│  │  └─────────────┘   │  └─────────────────────────────┘                │  ││
│  │                    │  ┌─────────────────────────────┐                │  ││
│  │                    │  │ SearchInput + FilterPill    │                │  ││
│  │                    │  │  → triggers parent refetch  │  triggers      │  ││
│  │                    │  │  → SQL ilike/eq happens     │  server query  │  ││
│  │                    │  └─────────────────────────────┘                │  ││
│  │                    │                                                  │  ││
│  │                    │  PaginationBar: "1-50 of 10,000"                 │  ││
│  │                    │    ↑ totalCount from server                       │  ││
│  │                    └──────────────────────────────────────────────────┘  ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│                         ▲ HTTP response: ~20 KB JSON                         │
│                         │                                                     │
└─────────────────────────┼─────────────────────────────────────────────────────┘
                          │
                  ┌───────┴───────┐
                  │   Supabase    │
                  │               │
                  │  SELECT cols  │
                  │  FROM drugs   │
                  │  WHERE        │
                  │  branch_id=X  │
                  │  RANGE(0,49)  │
                  │  ORDER BY name│
                  │               │
                  │  + COUNT(*)=  │
                  │  10,000 (exact)│
                  │               │
                  │  Returns:     │
                  │  50 rows      │
                  └───────────────┘

  SOLUTION: Range-limited query, ~20 KB payload, ~150 MB/month
```

---

## 2. Component Architecture

### 2.1 TanStackTable Prop Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  <TanStackTable />                                                          │
│                                                                             │
│  ┌──────────────────── Props ─────────────────────────────┐                │
│  │                                                        │                │
│  │  data: TData[]                      ← current page rows                │
│  │  columns: ColumnDef[]               ← column definitions               │
│  │                                                        │                │
│  │  // ── Server-Side Pagination ──                      │                │
│  │  manualPagination?: boolean          ← enables server mode             │
│  │  totalCount?: number                 ← from server COUNT               │
│  │  onPaginationChange?: fn             ← page change → parent refetch    │
│  │  isFetching?: boolean                ← loading indicator               │
│  │                                                        │                │
│  │  // ── Search + Filters ──                              │                │
│  │  onSearchChange?: fn                 ← text search → server ilike     │
│  │  filterableColumns?: FilterConfig[]  ← pill definitions               │
│  │  initialFilters?: Record<string,any[]>← active filter state           │
│  │  onFilterChange?: fn                 ← filter change → server eq      │
│  │                                                        │                │
│  │  // ── Infinite Scroll ──                               │                │
│  │  enableInfiniteScroll?: boolean      ← show "Show All" button         │
│  │  isShowAll?: boolean                 ← scroll mode active?             │
│  │  onToggleShowAll?: fn                ← toggle callback                │
│  │  onLoadMore?: fn                     ← sentinel hit → fetchNextPage   │
│  │  hasMore?: boolean                   ← more pages exist?               │
│  │  isFetchingMore?: boolean            ← bottom spinner                 │
│  └────────────────────────────────────────────────────────────────────────┘
│                                                                             │
│  ┌─────────────────── Internal State ────────────────────┐                │
│  │                                                        │                │
│  │  [pagination, setPagination]    ← { pageIndex, pageSize }               │
│  │  [sorting, setSorting]          ← for client sort (kept)               │
│  │  [columnVisibility, ...]        ← unchanged                           │
│  └────────────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 useReactTable Config Decision Tree

```
                    ┌──────────────┐
                    │  Component   │
                    │  Receives    │
                    │  Props       │
                    └──────┬───────┘
                           │
                    ┌──────▼──────┐
                    │ manual      │
                    │ Pagination  │
                    │ = true?     │
                    └──┬──────┬───┘
                       │      │
                  YES  │      │  NO
                       │      │
              ┌────────▼┐    ┌▼────────┐
              │ Server   │    │ Client   │
              │ Paginate │    │ Paginate │
              └────┬─────┘    └────┬─────┘
                   │               │
                   ▼               ▼
    ┌─────────────────────────┐  ┌─────────────────────────┐
    │ manualPagination: true  │  │ manualPagination: false │
    │ pageCount: computed     │  │ getPaginationRowModel() │
    │                          │  │                          │
    │ NO getPaginationRowModel│  │ getFilteredRowModel()    │
    │ NO getFilteredRowModel  │  │ onGlobalFilterChange     │
    │                          │  │ onColumnFiltersChange    │
    │ onPaginationChange:      │  │ (client-side filter)    │
    │   → parent callback      │  │                          │
    └─────────────────────────┘  └─────────────────────────┘
```

---

## 3. Data Flow Diagrams

### 3.1 Page Navigation Flow

```
User clicks "Next Page"
       │
       ▼
┌──────────────────┐
│ TanStackTable    │
│                  │
│ onPagination:    │
│ {pageIndex: 2,  │
│  pageSize: 50}   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Parent Component │
│                  │
│ setPage(2)       │
│                  │
│ Triggers re-     │
│ render with      │
│ new page number  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│ useInventoryPage(            │
│   branchId,                  │
│   page: 3,    ← 1-indexed   │
│   pageSize: 50               │
│ )                            │
│                              │
│ React Query:                 │
│ CACHE HIT?                   │
│  YES → instant return        │
│  NO  → fetch from Supabase  │
└────────┬─────────────────────┘
         │ (if cache miss)
         ▼
┌──────────────────────────────┐
│ inventoryService.getPage()   │
│                              │
│ inventoryRepository.getPage()│
│                              │
│ supabase.from('drugs')       │
│   .select(cols, {            │
│     count: 'exact'           │
│   })                         │
│   .eq('branch_id', X)        │
│   .range(100, 149)           │
│   .order('name')             │
│                              │
│ Returns:                     │
│ { data: Drug[],              │
│   total: 10000 }             │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────┐
│ TanStackTable    │
│                  │
│ data = 50 rows   │
│ totalCount = 10000│
│                  │
│ Re-renders:      │
│ "101-150 of 10,000"│
└──────────────────┘
```

### 3.2 Search Flow

```
User types "Aspirin" in SearchInput
       │
       ▼
┌───────────────────────┐
│ TanStackTable         │
│                       │
│ onSearchChange("Aspirin")│
│ (150ms debounce)      │
└────────┬──────────────┘
         │
         ▼
┌───────────────────────┐
│ Parent Component      │
│                       │
│ setSearch("Aspirin")  │
│ setPage(0)    ← reset!│
│                       │
│ Triggers re-render    │
└────────┬──────────────┘
         │
         ▼
┌───────────────────────┐
│ useInventoryPage(     │
│   branchId,           │
│   page: 1,            │
│   search: "Aspirin",  │
│   filters: {}         │
│ )                     │
│                       │
│ queryKey includes     │
│ search param →        │
│ fresh fetch           │
└────────┬──────────────┘
         │
         ▼
┌───────────────────────┐
│ inventoryRepository   │
│  .getPage()           │
│                       │
│ supabase              │
│   .select(cols,       │
│     { count: 'exact' })│
│   .eq('branch_id', X) │
│   .or(                │
│     name.ilike.%Aspirin%, │
│     barcode.ilike.%Aspirin% │
│   )                   │
│   .range(0, 49)       │
│                       │
│ Returns:              │
│ { data: 5 drugs,      │
│   total: 147 }        │
└────────┬──────────────┘
         │
         ▼
┌───────────────────────┐
│ TanStackTable         │
│                       │
│ data = 5 rows         │
│ totalCount = 147      │
│ PaginationBar:        │
│ "1-5 of 147"          │
└───────────────────────┘
```

### 3.3 Filter Pill Flow

```
User clicks filter pill "Status: Active"
       │
       ▼
┌───────────────────────┐
│ FilterPill component  │
│                       │
│ onUpdate("status",    │
│   ["active"])         │
└────────┬──────────────┘
         │
         ▼
┌───────────────────────┐
│ TanStackTable         │
│                       │
│ onFilterChange({      │
│   status: ["active"]  │
│ })                    │
└────────┬──────────────┘
         │
         ▼
┌───────────────────────┐
│ Parent Component      │
│                       │
│ setFilters({          │
│   status: ["active"]  │
│ })                    │
│ setPage(0)  ← reset!  │
└────────┬──────────────┘
         │
         ▼
┌───────────────────────┐
│ useInventoryPage(     │
│   branchId,           │
│   page: 1,            │
│   filters: {          │
│     status: ['active']│
│   }                   │
│ )                     │
└────────┬──────────────┘
         │
         ▼
┌───────────────────────┐
│ inventoryRepository   │
│  .getPage()           │
│                       │
│ supabase              │
│   .select(cols,       │
│     { count: 'exact' })│
│   .eq('branch_id', X) │
│   .eq('status', 'active')│
│   .range(0, 49)       │
└───────────────────────┘
```

### 3.4 Infinite Scroll Flow

```
User clicks "Show All" button
       │
       ▼
┌───────────────────────┐
│ Parent Component      │
│                       │
│ setIsShowAll(true)    │
│                       │
│ Switch query:         │
│ useInventoryPage →    │
│ useInventoryInfinite  │
└────────┬──────────────┘
         │
         ▼
┌────────────────────────────────┐
│ useInventoryInfinite(          │
│   branchId, pageSize: 50      │
│ )                              │
│                                │
│ pageParam = 1 (initial page)  │
│  → fetches page 1 (50 rows)  │
│                                │
│ data.pages = [                 │
│   { data: Drug[50],           │
│     total: 10000 }             │
│ ]                              │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ TanStackTable                  │
│                                │
│ isShowAll = true               │
│ PaginationBar = hidden         │
│                                │
│ data = Drug[50] (page 1)       │
│                                │
│ SentryRef: IntersectionObserver│
│   observing last row           │
└────────────────────────────────┘
         │
  User scrolls down
         │
         ▼
┌────────────────────────────────┐
│ IntersectionObserver fires     │
│                                │
│ sentinel row is visible        │
│ hasMore = true                 │
│ isFetchingMore = false         │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ onLoadMore()                   │
│  → fetchNextPage()             │
│                                │
│ pageParam = 2                  │
│  → fetches page 2 (50 rows)   │
│                                │
│ Show spinner at bottom         │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Query resolves                 │
│                                │
│ data.pages = [                 │
│   page 1: Drug[50],            │
│   page 2: Drug[50]             │
│ ]                              │
│                                │
│ data = Drug[100] (accumulated) │
│                                │
│ Spinner hidden                 │
│ Sentinel re-observes new last  │
└────────────────────────────────┘
         │
  User scrolls more...
         │
         ▼
  (repeats until all pages loaded)
         │
         ▼
┌────────────────────────────────┐
│ hasMore = false                 │
│                                │
│ totalLoaded = 10000            │
│ lastPage.total = 10000         │
│                                │
│ getNextPageParam → undefined   │
│                                │
│ TanStackTable shows:           │
│ "All items loaded"             │
└────────────────────────────────┘
```

---

## 4. Component Tree

```
<App>
  └── <CatalogProvider>
      └── <QueryClientProvider>
          └── <Inventory>
              │
              ├── State: page, search, filters, isShowAll
              │
              ├── useInventoryPage(branchId, page, search, filters)
              │   └── React Query cache
              │       ├── cache hit → instant
              │       └── cache miss → inventoryService.getPage()
              │           └── inventoryRepository.getPage()
              │               └── supabase.query().range().order()
              │
              ├── useInventoryInfinite(branchId, search, filters)
              │   └── React Query useInfiniteQuery
              │       └── fetchNextPage() → inventoryService.getPage()
              │           └── inventoryRepository.getPage()
              │               └── supabase.query().range().order()
              │
              └── <TanStackTable
                    data={isShowAll ? infiniteData.flat() : pageData}
                    totalCount={totalCount}
                    manualPagination={!isShowAll}
                    onPaginationChange={setPage}
                    onSearchChange={handleSearch}
                    onFilterChange={handleFilters}
                    enableInfiniteScroll
                    isShowAll={isShowAll}
                    onToggleShowAll={toggleShowAll}
                    onLoadMore={fetchNextPage}
                    hasMore={hasNextPage}
                    isFetchingMore={isFetchingNextPage}
                  >
                  ├── <SearchInput />
                  │   ├── text field → onSearchChange
                  │   └── filter pills → FilterPill → onUpdateFilter
                  │
                  ├── <table>
                  │   ├── <thead> (column headers with sort)
                  │   ├── <tbody>
                  │   │   ├── rows (virtualized with useVirtualizer)
                  │   │   └── sentinel row (IntersectionObserver)
                  │   └── </table>
                  │
                  └── <TablePaginationBar>
                      ├── Page count: "1-50 of 10,000"
                      ├── Navigation: ◀ 1 2 3 ... 200 ▶
                      ├── Jump-to-page input
                      └── Show All / Show Pages toggle
                    </TanStackTable>
```

---

## 5. State Diagram

```
                    ┌──────────────────────────┐
                    │  App Loads               │
                    │                          │
                    │  useInventoryPage fires  │
                    │  Page 1 loaded (50 rows) │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │     PAGINATED MODE       │
                    │                          │
                    │  PaginationBar visible    │
                    │  Data: current page only  │
                    │  Search/filters: server   │
                    │                          │
                    │  ┌──┐     ┌──┐          │
                    │  │◄ │◄ 1/200 ►│ ►│        │
                    │  └──┘     └──┘          │
                    └────────────┬─────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
  │ Click page nav  │  │ Type search text │  │ Select filter   │
  │                 │  │                  │  │                 │
  │ onPagination:   │  │ onSearchChange:  │  │ onFilterChange: │
  │ pageIndex=2     │  │ "Aspirin"        │  │ status=active   │
  │                 │  │ setPage(0)       │  │ setPage(0)      │
  │ Refetch page    │  │ Refetch with     │  │ Refetch with    │
  │ from server     │  │ search param     │  │ filter param    │
  └────────┬────────┘  └────────┬─────────┘  └────────┬────────┘
           │                    │                      │
           └────────────────────┼──────────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │   FETCHING (loading) │
                    │                      │
                    │  isFetching = true   │
                    │  Spinner active      │
                    │  Data stale shown    │
                    └──────────────────────┘
                                │
                    (Supabase responds)
                                │
                                ▼
                    ┌──────────────────────┐
                    │   DATA UPDATED       │
                    │                      │
                    │  isFetching = false  │
                    │  New data rendered   │
                    │  Cache updated       │
                    └──────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │ User clicks "Show All"│
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │   INFINITE SCROLL    │
                    │                      │
                    │  PaginationBar hidden │
                    │  useInfiniteQuery    │
                    │  Page 1 loaded       │
                    │  Sentry observing    │
                    └──────────────────────┘
                                │
                   ┌────────────┴────────────┐
                   │                         │
                   ▼                         ▼
        ┌──────────────────┐       ┌──────────────────┐
        │ User scrolls     │       │ User clicks      │
        │ to bottom        │       │ "Show Pages"     │
        │                  │       │                  │
        │ Sentinel fires   │       │ Switch back to   │
        │ hasMore = true   │       │ paginated mode   │
        │ fetchNextPage()  │       │ Page 1 loaded    │
        │ Append to data   │       │ PaginationBar    │
        └──────────────────┘       └──────────────────┘
                   │                        │
                   ▼                        │
        ┌──────────────────┐                │
        │ hasMore = false  │                │
        │ "All loaded"     │                │
        └──────────────────┘                │
                   │                        │
                   └───────────┬────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Back to PAGINATED    │
                    │ MODE                 │
                    └──────────────────────┘
```

---

## 6. Repository Pattern

### 6.1 Method Signature

```typescript
// ─── Types ───
interface PageOptions {
  page: number;              // 1-indexed
  pageSize: number;          // rows per page (max 200)
  search?: string;           // global text search
  filters?: Record<string, any>;  // column → value(s)
  sort?: {
    column: string;          // column name
    ascending: boolean;      // direction
  };
}

interface PageResult<T> {
  data: T[];
  total: number;
}

// ─── SQL Translation ───
async getPage(branchId: string, options: PageOptions): Promise<PageResult<Drug>> {
  const from = (options.page - 1) * options.pageSize;
  const to = from + options.pageSize - 1;

  let query = supabase
    .from(this.tableName)
    .select(COLUMNS, { count: 'exact' })
    .eq('branch_id', branchId);

  // Search → OR filter
  if (options.search) {
    query = query.or(
      `name.ilike.%${term}%,barcode.ilike.%${term}%`
    );
  }

  // Filters → EQ/IN/NOT
  if (options.filters?.status) {
    query = query.eq('status', options.filters.status);
  }
  if (options.filters?.category) {
    query = query.in('category', options.filters.category);
  }

  // Sort → ORDER BY
  query = query.order(
    options.sort?.column || 'name',
    { ascending: options.sort?.ascending ?? true }
  );

  // Paginate → RANGE
  query = query.range(from, to);

  const { data, count } = await query;
  return {
    data: (data || []).map(this.mapFromDb),
    total: count || 0,
  };
}
```

### 6.2 SQL vs Code Mapping

```
PageOptions          SQL
─────────────────────────────────────
page: 1             OFFSET 0
pageSize: 50        LIMIT 50
                    → .range(0, 49)

search: "Aspirin"   WHERE (name ILIKE '%Aspirin%'
                           OR barcode ILIKE '%Aspirin%')
                    → .or('...ilike...')

filters: {          WHERE
  status: 'active'    status = 'active'
  category: ['A','B'] category IN ('A', 'B')
}
                    → .eq() / .in()

sort: {             ORDER BY name ASC
  column: 'name',
  ascending: true
}
                    → .order('name')

total               SELECT COUNT(*) OVER()
                    → { count: 'exact' }
```

---

## 7. Query Hook Patterns

### 7.1 Paginated Hook (for PaginationBar mode)

```
┌──────────────────────────────────────────────────────────────────┐
│  useInventoryPage(branchId, page, pageSize, search, filters)     │
│                                                                  │
│  queryKey                                                         │
│  ─────────                                                       │
│  ['inventory', branchId, 'page', page, pageSize, search, filters]│
│  Example: ['inventory', 'abc123', 'page', 1, 50, '', {}]         │
│                                                                  │
│  Each unique combination = separate cache entry                  │
│  Changing page, search, or filter → different cache key          │
│                                                                  │
│  staleTime: 30 min  → data stays fresh for 30 min               │
│  gcTime: 24h        → garbage collected after 24h               │
│  refetchOnWindowFocus: false  → no re-fetch on tab switch       │
│                                                                  │
│  Returns: {                                                      │
│    data: { data: Drug[], total: number },                        │
│    isLoading, isFetching,                                        │
│    error                                                         │
│  }                                                               │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Infinite Scroll Hook (for Show All mode)

```
┌──────────────────────────────────────────────────────────────────┐
│  useInventoryInfinite(branchId, pageSize, search, filters)       │
│                                                                  │
│  queryKey                                                         │
│  ─────────                                                       │
│  ['inventory', branchId, 'infinite', pageSize, search, filters]  │
│                                                                  │
│  Pages are accumulated in data.pages[]                           │
│                                                                  │
│  getNextPageParam:                                               │
│    totalLoaded = sum of all data lengths                         │
│    if totalLoaded < lastPage.total → return next page number     │
│    else → undefined (no more pages)                              │
│                                                                  │
│  staleTime: 30 min  → prevents re-fetch of already-loaded pages │
│  gcTime: 24h        → cache survives page navigations           │
│                                                                  │
│  Returns: {                                                      │
│    data: { pages: [{ data: Drug[], total }],                     │
│    pageParams: [...] },                                          │
│    fetchNextPage: fn,                                            │
│    hasNextPage: boolean,                                         │
│    isFetchingNextPage: boolean,                                  │
│    isLoading                                                     │
│  }                                                               │
└──────────────────────────────────────────────────────────────────┘
```

### 7.3 Cache Invalidation on Mutations

```
┌────────────────────────────────────────────┐
│ mutation succeeds (create/update/delete)   │
│                                           │
│ queryClient.invalidateQueries({           │
│   queryKey: ['inventory', branchId]       │
│ })                                        │
│                                           │
│ This invalidates BOTH:                    │
│   ['inventory', branchId, 'page', ...]    │
│   ['inventory', branchId, 'infinite', ...]│
│                                           │
│ Next time each query is used, it refetches│
└────────────────────────────────────────────┘
```

---

## 8. Migration Path by Component

### 8.1 Component Change Map

```
Component              Current Hook            New Hook              Impact
────────────────────────────────────────────────────────────────────────────
Inventory.tsx          useInventory()          useInventoryPage        P0
InventoryManagement.tsx useInventory()          useInventoryPage        P0
ShortagesPage.tsx      useInventory()          useInventoryPage        P1
ExpiryManagement.tsx   useBatches()            useBatchesPage          P2
CustomerManagement.tsx useCustomers()          useCustomersPage        P3
EmployeeList.tsx       useEmployees()          useEmployeesPage        P4
SuppliersList.tsx      useSuppliers()          useSuppliersPage        P5
ExpenseTracker.tsx     useExpenses()           useExpensesPage()       P6
FinancialsPage.tsx     useFinancials()         useFinancialsPage()     P7
AuditPage.tsx          useAudit()              useAuditPage()          P8
```

### 8.2 Shared FilterableTables (references keep working)

```
TanStackTable receives:

  manualPagination={true}
  onSearchChange={handleSearch}
  filterableColumns={filterConfigs}
  initialFilters={activeFilters}
  onFilterChange={handleFilterChange}

  ↓

  SearchInput still gets filterConfigs → renders filter pills
  FilterPill still emits onUpdateFilter(id, values)
  TanStackTable forwards to parent via onFilterChange
  Parent updates filters state → refetches with .eq()/.in()
  No FilterPill/TanStackTable code changes needed
```

---

## 9. Key Numbers

### 9.1 Egress Per Action

```
              Without Pagination          With Pagination
              ──────────────────          ────────────────
Page Load     3 MB (10,000 rows)          20 KB (50 rows)
Search        3 MB (filter client)        2 KB (server ilike)
Window Focus  3 MB (full refetch)         0 (disabled)
Browse pages  3 MB (one fetch all)        ~300 KB (15 pages × 20 KB)
Show All      3 MB (one fetch all)        ~300 KB (scroll-triggered)
Daily (8h)    ~200 MB                     ~15 MB
Monthly       ~1.9 GB                     ~150 MB
```

### 9.2 Memory Per Action

```
              Without Pagination          With Pagination
              ──────────────────          ────────────────
JS Heap       10,000 objects              50 objects
React state   10,000 rows                  50 rows
DOM nodes     10,000 (virtualized)         50 (virtualized)
Cache size    ~5 MB                        ~50 KB (per page)
              (all data)                   (only visible page)
```

### 9.3 Query Cost Per Action

```
              Supabase Query Cost
              ────────────────────
Without       Full table scan + full row transfer
With          Index scan + row sample + COUNT(*) (cheap)
```

---

## 10. Error & Edge Case Handling

### 10.1 Loading States

```
┌───────────────────────┐
│ Initial Load          │
│                       │
│ isLoading = true      │
│ data = []             │
│ → Show skeleton rows  │
│   (already in table)  │
└───────────────────────┘

┌───────────────────────┐
│ Page Change / Search  │
│                       │
│ isFetching = true     │
│ data = (stale page)   │
│ → Show subtle spinner │
│   in pagination bar   │
│ → Keep showing old    │
│   data until new      │
│   arrives             │
└───────────────────────┘

┌───────────────────────┐
│ Infinite Scroll More  │
│                       │
│ isFetchingMore = true │
│ data = accumulated    │
│ → Show spinner at     │
│   bottom of table     │
│ → Keep existing rows  │
│   visible             │
└───────────────────────┘
```

### 10.2 Error States

```
┌───────────────────────────┐
│ Query Error               │
│                           │
│ Error toast notification  │
│ Row stays on current page │
│ Retry button in pagination│
└───────────────────────────┘

┌───────────────────────────┐
│ Search Returns 0 Results  │
│                           │
│ data = []                 │
│ totalCount = 0            │
│ PaginationBar hidden      │
│ Empty state message shown │
│ "No items match your      │
│  search"                  │
└───────────────────────────┘

┌───────────────────────────┐
│ Infinite Scroll Fails     │
│                           │
│ Error shown at bottom:    │
│ "Failed to load. Retry?"  │
│ Button to retry page      │
└───────────────────────────┘
```

### 10.3 Edge Cases

```
┌────────────────────────────────────┐
│ Rapid Page Changes                 │
│                                    │
│ User clicks page 1 → 2 → 3 → 4    │
│                                    │
│ React Query deduplicates:          │
│ Only last page 4 query executes    │
│ Pages 1-3 cancelled automatically  │
│                                    │
│ TanStackTable shows stale page     │
│ until page 4 resolves              │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Rapid Search Typing               │
│                                    │
│ User types: "A" → "As" → "Asp"    │
│                                    │
│ 150ms debounce in TanStackTable    │
│ Only final "Asp" query executes    │
│ Previous queries cancelled         │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Data Changes While Browsing       │
│                                    │
│ Realtime subscription fires:       │
│ Drug added/deleted/updated         │
│                                    │
│ queryClient.invalidateQueries()   │
│ Current page refetches             │
│ Pagination recalculates            │
│ User stays on current page         │
│ if valid, or page 0 if beyond last│
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ "Show All" with 20,000+ rows      │
│                                    │
│ Infinite scroll loads 50 at a time │
│ Still uses IntersectionObserver    │
│ Memory accumulates but gradually   │
│ User can scroll through all        │
│ Or click "Show Pages" to go back  │
│ to paginated mode                  │
└────────────────────────────────────┘
```

---

## 11. Performance Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial page load (inventory) | < 30 KB | Supabase response size |
| Search response | < 5 KB | Supabase response size |
| Page navigation | < 50ms | React re-render time |
| Cache hit (same page) | < 5ms | React Query retrieval |
| Search debounce | 150ms | TanStackTable debounce |
| Infinite scroll trigger | 200px before end | IntersectionObserver rootMargin |
| Scroll performance | 60fps | useVirtualizer + MemoizedRow |
| Total monthly egress | < 200 MB | Supabase dashboard |
