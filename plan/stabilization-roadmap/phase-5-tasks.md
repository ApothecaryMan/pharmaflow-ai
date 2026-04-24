# Phase 5 Tasks: Performance Optimization & Final Polish

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked

---

## PILLAR 1: PERFORMANCE

---

## Task 1: Profile DataContext Re-renders
**File**: `services/DataContext.tsx`
**Estimate**: 30 min
**Depends on**: Nothing

- [ ] Add React DevTools Profiler to the app (dev mode only)
- [ ] Perform a common action sequence: open dashboard → search → complete sale → return to dashboard
- [ ] Record how many times each context consumer re-renders
- [ ] Document which components re-render unnecessarily
- [ ] Measure time spent in re-renders (target: < 100ms per cycle)
- [ ] **Decision point**: If re-renders > 100ms, proceed with Task 2 (context splitting). If < 100ms, skip Task 2.

**Verification**: Profiler report saved. Decision documented.

---

## Task 2: Split DataContext (CONDITIONAL)
**File**: `services/DataContext.tsx` → multiple context files
**Estimate**: 2 hours
**Depends on**: Task 1 (only if re-renders are problematic)

- [ ] Create `services/contexts/InventoryContext.tsx` (inventory, batches)
- [ ] Create `services/contexts/SalesContext.tsx` (sales, returns)
- [ ] Create `services/contexts/PurchaseContext.tsx` (purchases, purchaseReturns)
- [ ] Keep `DataContext` as orchestrator (activeBranchId, branch switching)
- [ ] Update `useData()` to compose from child contexts
- [ ] Update all consumer components (find all `useData()` imports)
- [ ] Verify no component receives stale data after split

**Verification**: Same action sequence as Task 1. Re-renders reduced by ≥ 50%.

---

## Task 3: Verify Virtual Scrolling in Tables
**Files**: `components/common/TanStackTable.tsx`, all components using it
**Estimate**: 20 min
**Depends on**: Nothing

- [ ] Load inventory page with 500+ items
- [ ] Verify `enableVirtualization` is `true` by default or set explicitly
- [ ] Check scroll performance (target: 60fps, no jank)
- [ ] If virtualization is off in any table with > 100 rows, enable it
- [ ] Test: Inventory, Sales History, Employee List, Supplier List

**Verification**: Smooth scrolling with 500+ rows.

---

## Task 4: Audit Search Debounce Usage
**Files**: All components with search inputs
**Estimate**: 25 min
**Depends on**: Nothing

- [ ] Search codebase for `setSearch` or `onSearchChange` patterns
- [ ] For each search input, verify `useDebounce(search, 200)` is applied before filtering
- [ ] Components to check:
  - [ ] POS medicine search
  - [ ] Inventory page search
  - [ ] BarcodePrinter search
  - [ ] Customer search
  - [ ] Employee search
  - [ ] Supplier search
- [ ] Add debounce where missing

**Verification**: Type quickly in each search. No lag or freeze.

---

## Task 5: Optimize Dashboard Analytics
**File**: `components/dashboard/useRealTimeSalesAnalytics.ts`
**Estimate**: 20 min
**Depends on**: Nothing

- [ ] Profile the hook with React DevTools
- [ ] Check if `useMemo` dependencies are correct (no unnecessary recalculations)
- [ ] Verify `todaysSales` filter runs once per sales array change (not on every render)
- [ ] If any computation takes > 50ms, consider:
  - [ ] Caching results in `useRef`
  - [ ] Moving to a web worker (last resort)

**Verification**: Dashboard renders < 100ms on 500 sales.

---

## Task 6: Audit Bundle Size
**Estimate**: 20 min
**Depends on**: Nothing

- [ ] Run `npm run build`
- [ ] Check chunk sizes in `dist/assets/`
- [ ] Identify any chunk > 500KB (gzipped)
- [ ] If found:
  - [ ] Check for unnecessary imports (e.g., entire lodash instead of lodash-es)
  - [ ] Verify tree-shaking is working (no dead code in bundle)
  - [ ] Add manual chunk splitting in `vite.config.ts` if needed
- [ ] Document chunk sizes

**Verification**: No chunk > 500KB gzipped. Build completes with 0 warnings.

---

## PILLAR 2: CODE HYGIENE

---

## Task 7: Remove console.log Statements
**Files**: Entire codebase
**Estimate**: 25 min
**Depends on**: Nothing

- [ ] Run `findstr /s /i "console.log" *.ts *.tsx` to find all occurrences
- [ ] Remove every `console.log()` call
- [ ] Keep: `console.error()` and `console.warn()` where appropriate
- [ ] Remove: `console.info()` (use audit service instead)
- [ ] Verify no `console.log` remains in non-test files

**Verification**: `findstr /s "console.log" *.ts *.tsx` returns only test files or 0 results.

---

## Task 8: Clean Up `as any` Type Assertions
**Files**: `services/**/*.ts`, `hooks/**/*.ts`
**Estimate**: 40 min
**Depends on**: Nothing

- [ ] Run `findstr /s "as any" services\*.ts hooks\*.ts` to find all occurrences
- [ ] For each occurrence:
  - If proper type exists: replace `as any` with correct type
  - If no type exists: create an appropriate interface
  - If unavoidable (third-party API): add `// eslint-disable-next-line` with comment
- [ ] Focus on service layer first (most critical)
- [ ] Components may keep `as any` if the fix is too invasive

**Verification**: 0 `as any` in services/. Count in components documented.

---

## Task 9: Remove Dead Code & Unused Exports
**Files**: Entire codebase
**Estimate**: 30 min
**Depends on**: Nothing

- [ ] Use `tsc` unused variable warnings to identify dead code
- [ ] Check for files with 0 importers:
  - [ ] Search for each filename in the codebase
  - [ ] If not imported anywhere and not an entry point, delete it
- [ ] Remove commented-out code blocks (> 5 lines)
- [ ] Remove resolved `// TODO`, `// HACK`, `// BUG-*` comments

**Verification**: `tsc --noEmit` passes. No unreachable code warnings.

---

## Task 10: Clean Up Legacy Comments
**Files**: Entire codebase
**Estimate**: 15 min
**Depends on**: Nothing

- [ ] Search for `// TODO` — remove if resolved, keep if genuinely needed
- [ ] Search for `// HACK` — refactor the hack or document why it's needed
- [ ] Search for `// BUG-` — verify the bug is fixed, remove comment
- [ ] Search for `// TEMPORARY` or `// TEMP` — remove or make permanent
- [ ] Search for `// OLD` or `// LEGACY` — remove dead references

**Verification**: Manual review. Remaining comments are all intentional.

---

## PILLAR 3: PRODUCTION READINESS

---

## Task 11: Verify Error Boundary Coverage
**File**: `App.tsx`, `components/common/ErrorBoundary.tsx`
**Estimate**: 20 min
**Depends on**: Nothing

- [ ] Verify `ErrorBoundary` wraps every top-level page component in `App.tsx`
- [ ] Test: throw an error in Dashboard component → verify fallback UI shown
- [ ] Test: throw an error in POS component → verify fallback UI shown
- [ ] Verify "Try Again" button resets the error state correctly
- [ ] Verify error is logged to `auditService` with `severity: 'critical'`

**Verification**: Deliberate error shows fallback UI, not white screen.

---

## Task 12: Verify Offline Graceful Degradation
**Files**: All service files, `hooks/useNetworkStatus.tsx`
**Estimate**: 25 min
**Depends on**: Nothing

- [ ] Disconnect from internet (or disable Supabase URL)
- [ ] Verify app loads from local storage
- [ ] Verify sales can be processed offline (local storage)
- [ ] Verify `useNetworkStatus` shows offline banner
- [ ] Verify `syncQueueService` queues operations for later sync
- [ ] Reconnect — verify queued operations are synced

**Verification**: Full checkout flow works offline. Data appears after reconnect.

---

## Task 13: Verify Build Configuration
**File**: `vite.config.ts`
**Estimate**: 15 min
**Depends on**: Nothing

- [ ] Verify `build.minify` is `true` or `'terser'`
- [ ] Verify `build.sourcemap` is `true` (for debugging production issues)
- [ ] Verify chunk splitting is configured for vendor libraries
- [ ] Verify `build.rollupOptions.output.manualChunks` separates:
  - React / ReactDOM
  - TanStack Table
  - Supabase client
- [ ] Run `npm run build` — verify 0 warnings

**Verification**: Build succeeds. Chunks are properly split.

---

## Task 14: Verify Environment Configuration
**Files**: `.env`, `.env.example`
**Estimate**: 10 min
**Depends on**: Nothing

- [ ] List every `import.meta.env.VITE_*` usage in the codebase
- [ ] Verify every var exists in `.env.example`
- [ ] Verify `.env.example` has descriptive comments for each var
- [ ] Verify no secrets are in `.env.example` (only placeholder values)

**Verification**: `.env.example` is complete and safe to commit.

---

## Task 15: Final Build & Verification
**Estimate**: 20 min
**Depends on**: All above

- [ ] Run `tsc --noEmit` — 0 errors
- [ ] Run `npm run build` — 0 warnings
- [ ] Run `npm run preview` — app loads correctly
- [ ] Navigate through all major pages:
  - [ ] Dashboard
  - [ ] POS / Checkout
  - [ ] Inventory
  - [ ] Sales History
  - [ ] Purchases
  - [ ] Customers
  - [ ] Employees
  - [ ] Cash Register
  - [ ] Settings
- [ ] Check browser console — 0 errors in production build
- [ ] Run Lighthouse audit — Performance ≥ 80
- [ ] Mark Phase 5 as COMPLETED
- [ ] **PROJECT READY FOR DEPLOYMENT** 🚀

---

## Estimated Total: ~7 hours
