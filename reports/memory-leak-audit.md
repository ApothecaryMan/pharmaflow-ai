# Memory Leak Audit — Zinc

## Summary
| Category | Files affected | Issues found | Severity |
|---|---|---|---|
| Supabase channels without cleanup | 0 | 0 | None — all 8 channels properly cleaned |
| Context Provider inline values | 3 | 3 | Critical (re-render storm) |
| Context values not memoized | 2 | 2 | Warning |
| Event listeners without removal | 3 | 3 | Critical / Warning |
| Timers without clear | 0 | 0 | None — all cleared |
| Async without AbortController | 0 | 0 | None — all 6 hooks use it |
| Closures capturing large objects | 4 | 4 | Warning |

---

## Issues

### 🔴 Critical

**1. File:** `utils/storage.ts` — line 447
**Pattern:** `window.addEventListener('storage', (e) => { ... })` at module scope
**Risk:** Anonymous arrow function registered at module level with **no cleanup mechanism**. Holds closures over `SESSION_KEY`, `hasLoadedUserId`, `cachedUsageBytes`, `memoryCache`. Leaks for entire app lifetime.
**Fix:** Use a named function and expose an unsubscribe function from the storage API.

**2. File:** `components/layout/TitleBar.tsx` — lines 154–175
**Pattern:** Double `return` in `useEffect` cleanup — an early `return () => clearInterval(interval)` inside `if (isTauri())` prevents the subsequent `return` that removes `online`/`offline` listeners.
**Risk:** 2 global event listeners leak per mount in Tauri builds. Accumulates across hot reloads.
**Fix:** Restructure to a single cleanup return that clears both the interval and the listeners.

**3. File:** `components/ui/map.tsx` — line 648
**Pattern:** `<MarkerContext.Provider value={{ marker, map }}>` — inline object literal creates new reference every render.
**Risk:** Every consumer of `MarkerContext` re-renders on each `MapMarker` render, even when `marker` and `map` haven't changed.
**Fix:** Wrap with `useMemo(() => ({ marker, map }), [marker, map])`.

**4. File:** `components/inventory/InventoryModuleShell.tsx` — lines 44–52
**Pattern:** Inline object literal in `InventoryHeaderContext.Provider value={{ setLeftContent, ... }}`.
**Risk:** New object every render; all consumers re-render unnecessarily.
**Fix:** Wrap with `useMemo`.

**5. File:** `components/employee-portal/context/EmployeePortalContext.tsx` — line 25
**Pattern:** `<Provider value={{ ...defaultServices, ...services }}>` — spread creates new object every render.
**Risk:** All consumers re-render on every parent render.
**Fix:** Wrap with `useMemo(() => ({ ...defaultServices, ...services }), [services])`.

---

### 🟡 Warning

**6. File:** `components/features/alerts/AlertContext.tsx` — lines 46–60
**Pattern:** `helpers` object (with 4 new arrow functions + `alerts` state array) created every render without `useMemo`.
**Risk:** All consumers re-render on every alert add/remove; arrow functions are recreated each time.
**Fix:** Wrap `helpers` in `useMemo([addAlert, removeAlert, alerts])`.

**7. File:** `hooks/sales/useShift.tsx` — lines 232–242
**Pattern:** Context value object created every render without `useMemo`, even though most properties are stable (`useCallback` / `useMemo` wrapped).
**Risk:** Unnecessary consumer re-renders.
**Fix:** Wrap value in `useMemo`.

**8. File:** `components/ui/map.tsx` — lines 576, 579, 582
**Pattern:** `addEventListener("click" / "mouseenter" / "mouseleave")` inside `useMemo(() => new maplibregl.Marker(...), [])` — no cleanup.
**Risk:** DOM listeners may leak if Maplibre doesn't internally clean them on `marker.remove()`.
**Fix:** Move listeners to a `useEffect` with proper cleanup, or attach via Maplibre's built-in `.on()` API.

**9. Files:**
- `hooks/financials/useFinancialData.ts` (line 85)
- `hooks/inventory/useRisk.ts` (line 69)
- `hooks/purchases/useProcurement.ts` (line 79)
- `hooks/infrastructure/useAudit.ts` (line 65)
**Pattern:** Full state objects (`summary`, `kpis`, `items.length`) in `useCallback` dependency arrays.
**Risk:** Callbacks recreated every time fetched data changes; `useEffect` re-triggers; potential fetch loops if ref-based dedup ever misses.
**Fix:** Remove state objects from deps — the ref-based dedup already prevents unnecessary fetches.

**10. File:** `components/sales/pos/hooks/useBarcodeScanner.ts` — line 141
**Pattern:** `useEffect` depends on `[inventory, ...]` where `inventory` is the full Drug array from context.
**Risk:** `keydown` event listener removed and re-registered on every inventory change.
**Fix:** Use a ref for `inventory`.

**11. File:** `context/DataContext/DataProvider.tsx` — line 205
**Pattern:** `useEffect` depends on `[..., employees, ...]` where `employees` is the full employee array.
**Risk:** `storage` event listener re-registered every time employee list changes.
**Fix:** Use a ref for `employees`.

---

### 🟢 Info

**12. File:** `components/intelligence/procurement/ProcurementPage.tsx` — lines 41–44
**Pattern:** `(window as any).dispatchGlobalEvent = ...` assigned in `useEffect` without cleanup.
**Risk:** Global window property mutation not reverted on unmount.
**Fix:** Set to `undefined` in cleanup.

**13. File:** `hooks/infrastructure/usePreventZoom.ts` — lines 23 vs 29
**Pattern:** `addEventListener('wheel', fn, { passive: false })` vs `removeEventListener('wheel', fn)` (no options).
**Risk:** Inconsistent options object — works in modern browsers but technically mismatched.
**Fix:** Match options in `removeEventListener`.

**14. File:** `components/layout/DynamicEventLayer.tsx` — lines 54 vs 59
**Pattern:** Same options mismatch as above (`{ passive: true }` vs no options).
**Risk:** Same as above.
**Fix:** Match options.

**15. Files:** `context/DataContext/useDataActions.ts` — lines 246, 288
**Pattern:** `completeSale` / `processSalesReturn` depend on `[rawInventory, ...]`.
**Risk:** Recreated every time any inventory item changes; moderate performance impact but no leak.
**Fix:** Use `useRef` for `rawInventory`.

---

## Files scanned

All `.tsx` and `.ts` files under the project root were checked (~190+ files). The source code lives at the root level (not under `src/`), so the audit covered:

- `App.tsx`, `index.tsx`
- `components/` — ui, sales, hr, reports, org, onboarding, inventory, layout, settings, finance, dashboard, mobile, common, features, test, employee-portal, intelligence
- `pages/`
- `hooks/` — auth, inventory, sales, purchases, layout, common, finance, financials, infrastructure, hr, customers, suppliers
- `context/` — DataContext, CatalogContext, SettingsContext
- `services/` — auth, sales, inventory, purchases, returns, suppliers, hr, settings, financials, customers, org, audit, cash, core, api, intelligence, search, validation, transactions, dashboard
- `utils/` — events, storage, network, money, validation, etc.
- `config/`, `data/`, `lib/`, `types/`, `styles/`, `i18n/`

The `src/` directory itself contained only 4 files (`setupTests.ts`, `vite-env.d.ts`, `types/supabase.ts`, `styles/z-index.ts`) — all were clean.
