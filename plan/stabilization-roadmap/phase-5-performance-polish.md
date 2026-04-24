# Phase 5: Performance Optimization & Final Polish

## Status: NOT STARTED
## Depends On: Phase 4 (Tenant Verification)

---

## Objective

With the architecture verified and audit trail in place, this phase focuses on making
PharmaFlow **fast, responsive, and production-ready**. The work is split into three pillars:

1. **Performance** — Reduce load times, minimize re-renders, optimize data fetching.
2. **Code Hygiene** — Remove dead code, unused imports, commented-out blocks.
3. **Production Readiness** — Error boundaries, offline handling, build optimization.

---

## Scope

### Pillar 1: Performance

| Area | Problem | Solution |
|------|---------|----------|
| DataContext re-renders | Every state update re-renders all consumers | Split into focused contexts or use `useSyncExternalStore` |
| Large inventory lists | 1000+ items cause scroll jank | Virtual scrolling (already in TanStackTable — verify active) |
| Search performance | Regex on full inventory on every keystroke | Debounce + memoize search results |
| Dashboard calculations | Heavy `useMemo` chains in analytics hook | Profile and optimize; consider web workers for heavy math |
| Bundle size | Unused imports / dead code increase bundle | Tree-shake with Vite; audit chunk sizes |
| Image/font loading | Blocking render on font load | Preload critical fonts; lazy-load non-critical assets |

### Pillar 2: Code Hygiene

| Area | Action |
|------|--------|
| Legacy comments | Remove `// TODO`, `// HACK`, `// BUG-*` if resolved |
| Unused exports | Find and remove exports that have 0 importers |
| Console.log | Remove all `console.log` (keep `console.error` and `console.warn`) |
| Type assertions | Replace `as any` with proper types where feasible |
| Dead files | Remove files in `components/`, `services/`, `hooks/` that are not imported anywhere |

### Pillar 3: Production Readiness

| Area | Action |
|------|--------|
| Error boundaries | Verify `ErrorBoundary` wraps all route-level components |
| Offline detection | `useNetworkStatus` should show a banner when offline |
| Supabase fallback | All services must gracefully degrade to local storage when Supabase is unreachable |
| Build config | Verify `vite.config.ts` has proper chunk splitting, minification, and source maps |
| Environment vars | Verify `.env.example` matches all vars used in code |
| SEO / Meta | Verify `index.html` has proper title, description, icons |

---

## Architecture Decisions

### 1. Context Splitting Strategy

Instead of one monolithic `DataContext` holding inventory, sales, customers, purchases, etc.,
split into:

```
DataContext (orchestrator — holds activeBranchId, provides useData())
├── InventoryContext (inventory, batches)
├── SalesContext (sales, returns)
├── PurchaseContext (purchases, purchaseReturns)
├── CustomerContext (customers)
└── EmployeeContext (employees)
```

Each child context only re-renders its consumers when its specific data changes.

**Decision**: Evaluate complexity. If DataContext updates are < 100ms, the split may not
be worth the refactoring cost. Profile first, decide second.

### 2. Debounce Standard

All search inputs should debounce at **200ms**. The `useDebounce` hook already exists in
`hooks/useDebounce.ts`. Verify it's used consistently across:
- Medicine search (POS)
- Inventory search
- Customer search
- Employee search
- Supplier search

### 3. Build Optimization

Vite should produce:
- Vendor chunk (React, TanStack, etc.)
- App chunk (our code)
- CSS chunk
- No chunk > 500KB gzipped

### 4. Console Cleanup Rules

- `console.log` → Remove entirely
- `console.warn` → Keep only for recoverable issues (fallback triggered, stale data)
- `console.error` → Keep for actual errors
- `console.info` → Remove (use audit logs instead)

---

## Success Criteria

1. Lighthouse Performance score ≥ 80 on dashboard page.
2. First Contentful Paint < 2s on localhost.
3. No `console.log` statements in production build.
4. No `as any` type assertions in service layer (components may have limited exceptions).
5. Vite build completes with 0 warnings.
6. `tsc --noEmit` passes with 0 errors.
7. All error boundaries render fallback UI instead of white screen.
8. App functions correctly with Supabase disconnected (local storage fallback).
