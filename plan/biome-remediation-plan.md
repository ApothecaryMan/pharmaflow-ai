# Biome Lint Remediation Plan

**Goal:** Zero Biome lint errors (530 remaining) and warnings (1,047 remaining).

---

## Phase 1 — Auto-Fixable (Unsafe) — ~200 errors

Run `npx biome check --write --unsafe` to fix:
- `noUnusedFunctionParameters` (5) — prefix with `_`
- Performance/complexity rules

**⚠️ Risk:** None. All unsafe fixes are trivial renames.

---

## Phase 2 — High Volume, Low Risk — ~107 errors

### 2a. `noSvgWithoutTitle` (106)
Add `<title>` as first child of every `<svg>` missing it.

**Files (70):** `App.tsx`, `components/auth/Login.tsx`, `components/common/Icons.tsx`, `components/common/SearchInput.tsx`, `components/common/Tooltip.tsx`, all `components/employee-portal/decorations/*` (49 files), `components/experiments/*`, `components/layout/*`, `components/onboarding/*`, `components/sales/*`, `components/settings/*`, `components/test/*`, `components/ui/map.tsx`, `utils/banners.tsx`

**Effort:** ⭐ (simple find/replace) **✕ 70 files**

### 2b. `noImplicitAnyLet` (10)
Add explicit type annotations to `let` variables.

**Effort:** ⭐ (add types)

---

## Phase 3 — Medium Volume, Consistent Pattern — ~239 errors

### 3a. `noArrayIndexKey` (85)
Replace `key={index}` with stable unique keys.

**Files (47):** `components/common/ChartWidget`, `ContextMenu`, `HelpModal`, `InsightTooltip`, `InteractiveCard`, `ProgressCard`, `ScreenCalibration`, `SearchDropdown`, `ShortcutsOverlay`, `TanStackTable`, `TrixComparisonTemplate`, `CustomerOverview`, `Dashboard`, `RealTimeSalesMonitor`, 5 decorations, `EmploymentRequestsList`, `HistoryTab`, `ProfileTab`, `AdvancedSmCard`, `DashboardExperiments`, `useStaffAnalytics`, `AddProduct`, `BarcodePreview`, `EditProductModal`, `Inventory`, `SnowParticles`, `SnowPile`, `LandingPage`, `Navbar`, `SidebarDropdown`, `DrugInteractionsPage`, `PendingApproval`, `PurchaseHistory`, `PurchaseReturns`, `SuppliersList`, `LoginAuditList`, `DeliveryOrdersModal`, `POSCartSidebar`, `POSCustomerHistoryModal`, `POSDrugAnalytics`, `POSDrugBranches`, `POSDrugOverview`, `ReturnHistory`, `SaleDetailModal`, `ShiftHistory`, `DesktopSettings`, `EffectsControls`, `PricingPage`, `A5InvoiceDesigner`, `ScrollbarLab`, `BranchMasterMonitor`

**Strategy:** Look for `item.id`, `item.code`, or derive composite key.
- If `item.id` exists → use `item.id`
- If no id → use `\`${item.someField}-${index}\``
- Static skeletons → add `// biome-ignore lint/suspicious/noArrayIndexKey` with justification

**Effort:** ⭐⭐ (need to inspect each map's data shape)

### 3b. `noRestrictedElements` (23)
Replace restricted HTML elements (like `<marquee>`, `<blink>`) with accessible alternatives.

**Effort:** ⭐ (simple replacement)

---

## Phase 4 — Complex Patterns — ~199 errors

### 4a. `noStaticElementInteractions` (97)
Add proper `role` and keyboard handlers to `<div>`, `<span>`, etc. that have `onClick`.

**Strategy:** Add `role="button"` + `tabIndex={0}` + `onKeyDown` handler.

**Effort:** ⭐⭐ (boilerplate but repetitive)

### 4b. `useKeyWithClickEvents` (62)
Add `onKeyDown` handlers wherever `onClick` exists without keyboard support.

**Strategy:** Pair with `noStaticElementInteractions` — fix together.

**Effort:** ⭐⭐ (same fix as 4a)

### 4c. `useExhaustiveDependencies` (43)
Add missing dependencies to `useEffect`, `useMemo`, `useCallback` arrays.

**Effort:** ⭐⭐⭐ (must understand each hook's logic — potential runtime bugs if wrong)

### 4d. `noNonNullAssertion` (46)
Replace `!` (non-null assertion) with optional chaining or proper null checks.

**Effort:** ⭐⭐ (simple replacement, but each needs context)

---

## Phase 5 — Hardest — ~999 errors

### `noExplicitAny` (999)
Replace `any` with proper types across the entire codebase.

**Strategy:**
1. Replace function params `: any` → `: unknown` + narrow
2. Replace `as any` casts → proper assertion or type
3. Replace generic hooks `useState<any>` → proper generic

**Work by directory (largest first):**
| Directory | Est. count |
|-----------|-----------|
| `components/` | ~700 |
| `hooks/` | ~100 |
| `services/` | ~100 |
| `utils/`, `context/`, `stores/` | ~99 |

**Effort:** ⭐⭐⭐⭐⭐ (5-10 min per file, potentially 100+ files)

**Suggested approach:** Fix as discovered during feature work rather than pure lint chase. The ROI of fixing all 999 is low since these don't block compilation (Vite transpiles with esbuild).

---

## Phase 6 — Quick Wins — ~34 errors

### 6a. `noAssignInExpressions` (13) + `noSelfCompare` (2) + `noThenProperty` (1) + `noCommentText` (1)
Bugs waiting to happen — fix immediately.

**Effort:** ⭐

### 6b. `noDangerouslySetInnerHtml` (7)
Replace `dangerouslySetInnerHTML` with sanitized/component approach.

**Effort:** ⭐⭐

### 6c. `noShadowRestrictedNames` (5)
Rename variables that shadow globals (e.g., `name`, `top`).

**Effort:** ⭐

### 6d. Remaining rules (~15 errors)
- `useSemanticElements` (5) — replace `<div>` with `<nav>`, `<main>`, etc.
- `useHookAtTopLevel` (4) — move hooks out of conditionals
- `useIterableCallbackReturn` (29) — ensure callbacks return proper values
- `noAccumulatingSpread` (1) — avoid spread in loops
- `useJsxKeyInIterable` (1) — add missing key
- `noStaticOnlyClass` (1) — convert to constants
- `useGenericFontNames` (1), `useFocusableInteractive` (1), `useAriaPropsSupportedByRole` (1) — a11y fixes

**Effort:** ⭐–⭐⭐

---

## Summary

| Phase | Category | Count | Difficulty | Est. Time |
|-------|----------|-------|-----------|-----------|
| 1 | Auto-fix (unsafe) | ~200 | 🟢 Easy | 1 min |
| 2a | `noSvgWithoutTitle` | 106 | 🟢 Easy | 15 min |
| 2b | `noImplicitAnyLet` | 10 | 🟢 Easy | 5 min |
| 3a | `noArrayIndexKey` | 85 | 🟡 Medium | 30 min |
| 3b | `noRestrictedElements` | 23 | 🟢 Easy | 10 min |
| 4a | `noStaticElementInteractions` | 97 | 🟡 Medium | 30 min |
| 4b | `useKeyWithClickEvents` | 62 | 🟡 Medium | (bundled with 4a) |
| 4c | `useExhaustiveDependencies` | 43 | 🔴 Hard | 45 min |
| 4d | `noNonNullAssertion` | 46 | 🟡 Medium | 20 min |
| 5 | `noExplicitAny` | 999 | 🔴 Hardest | Deferred |
| 6 | Various quick wins | ~34 | 🟢 Easy | 15 min |

**Total non-any errors:** 530 - 999 (any) = **~530 actual lint issues** (w/ any = 1,529 total diags, but 999 are `any`).

**Recommendation:** Fix Phases 1–4 + 6 first. Defer Phase 5 (`noExplicitAny` — 999 errors) — low ROI since Vite/ESBuild ignores these at build time.
