# PharmaFlow-AI (ZINC) — Architecture Remediation Plan

**Status:** Approved  
**Priority:** High  
**Estimated effort:** 6–8 weeks (incremental, parallelizable)

---

## Table of Contents

1. [Phase 0 — Low-Effort Quick Wins](#phase-0--low-effort-quick-wins)
2. [Phase 1 — Decentralize Data Fetching](#phase-1--decentralize-data-fetching)
3. [Phase 2 — Adopt a Standard Router](#phase-2--adopt-a-standard-router)
4. [Phase 3 — Deprecate Imperative Cache Mutations](#phase-3--deprecate-imperative-cache-mutations)
5. [Phase 4 — Consolidate State Management](#phase-4--consolidate-state-management)
6. [Phase 5 — Clean Up Dependencies & Bundling](#phase-5--clean-up-dependencies--bundling)
7. [Phase 6 — i18n Splitting](#phase-6--i18n-splitting)
8. [Phase 7 — Service Layer Standardization](#phase-7--service-layer-standardization)
9. [Phase 8 — Offline Storage Migration](#phase-8--offline-storage-migration)
10. [Risks & Mitigations](#risks--mitigations)

---

## Current Architecture (As-Is)

```
App.tsx (orchestrator)
  └── AuthenticatedContent.tsx (GOD COMPONENT)
        ├── fetches 9 queries at top level
        ├── creates 7 setQueryData wrappers
        ├── creates useEntityHandlers (22 params → 18 handlers)
        ├── creates handlers object → drills to PageRouter
        └── wraps PageRouter

PageRouter.tsx
  ├── re-fetches SAME 9 queries (double fetch)
  ├── giant switch on ViewState via PAGE_REGISTRY
  └── passes handlers + data as props to each page

Each page component
  └── receives everything via props (implicit contract)
      — no useQuery calls, no mutation hooks
      — relies on handlers.set* for updates
```

### Key Metrics

| Metric | Current |
|---|---|
| AuthenticatedContent.tsx | 665 lines |
| AuthenticatedContent fetches at top | 9 queries |
| PageRouter.tsx | 301 lines |
| PageRouter re-fetches | 9 queries (identical) |
| setQueryData wrappers | 7 (with TRANSITIONAL comment) |
| useEntityHandlers params | 22 input, 18 output |
| handlers object dests | ~25 entries |
| PAGE_REGISTRY.ts | 1,048 lines |
| pageRegistry requiredProps | ~70 manual entries |
| Translations file | 6,341 lines / 238KB |
| framer-motion + motion | Both v12.38.0 (duplicate) |

---

## Phase 0 — Low-Effort Quick Wins

> **Effort:** 1–2 days  
> **Risk:** None  
> **Can be done in parallel**

### 0.1 Remove duplicate `motion` package

- `package.json` lists both `framer-motion ^12.38.0` and `motion ^12.38.0`
- 0 imports from `motion` exist across the codebase
- All 28+ components import from `framer-motion`

**Action:** Remove `"motion": "^12.38.0"` from dependencies. Run `npm uninstall motion`.

**Saves:** ~50KB bundle (unused)

### 0.2 Move `shadcn` to devDependencies

**Action:** Move `"shadcn": "^4.0.0"` from `dependencies` to `devDependencies`.

### 0.3 Clean up version drift

| File | Version |
|---|---|
| `package.json` | 2.070 |
| `Cargo.toml` | 2.0.23 |
| `tauri.conf.json` | 2.0.70 |

**Action:** Align to `2.0.70` as canonical value in all three files.

### 0.4 Remove stale directories

- `services/business/` — empty
- `services/clinical/` — empty
- `services/repositories/` — empty directory (repositories live in subdirs)

**Action:** Remove empty directories. Recreate them if/when needed.

---

## Phase 1 — Decentralize Data Fetching

> **Effort:** 2–3 weeks  
> **Risk:** Medium — requires careful migration to avoid breaking pages  
> **Core change:** Remove the God Component pattern

### Problem

`AuthenticatedContent.tsx` (line 130–138) fetches ALL domain data up front:

```typescript
const { data: inventory = [] } = useInventory(activeBranchId);
const { data: sales = [] } = useRecentSales(activeBranchId);
const { data: employees = [] } = useEmployees(activeBranchId);
const { data: customers = [] } = useCustomers(activeBranchId);
const { data: suppliers = [] } = useSuppliers(activeBranchId);
const { data: purchases = [] } = usePurchases(activeBranchId);
const { data: purchaseReturns = [] } = usePurchaseReturns(activeBranchId);
const { data: returns = [] } = useSalesReturns(activeBranchId);
const { data: batches = [] } = useBatches(activeBranchId);
```

This data is passed through `handlers` → `PageRouter` → injected as props to pages.

**Worse:** `PageRouter.tsx` lines 58–66 **re-fetches** every single one of these queries again.

### End State

Each page calls its own `useQuery` hooks internally. No data is fetched at the `AuthenticatedContent` level. No data is passed through `PageRouter` as props.

```typescript
// Before: page receives data as props
const InventoryPage = ({ inventory, onAddDrug }) => { ... }

// After: page calls its own hooks
const InventoryPage = () => {
  const { data: inventory } = useInventory(activeBranchId);
  const addDrug = useAddDrug();
  // no props needed
}
```

### Migration Strategy (Incremental)

#### Step 1.1 — Remove PageRouter re-fetches (safe, immediate)

`PageRouter.tsx` lines 58–66 duplicate the parent's queries. React Query deduplicates the network request, but both components render on every cache change.

**Action:** Remove all `use*` calls from `PageRouter.tsx`. Make `PageRouter` a pure routing switch that only receives `view` and renders the lazy component.

**Affects:** PageRouter.tsx lines 58–66. Delete them. Any page that depends on data injected via `dataMap` must first be migrated to fetch its own data (Step 1.2).

#### Step 1.2 — Migrate pages one by one (highest-traffic first)

Priority order:

| Priority | Page | Current Props | Own-Query Feasibility |
|---|---|---|---|
| P0 | POS (`pos`) | inventory, customers, employees, sales | Already has `activeBranchId` in authStore |
| P0 | Inventory | inventory | Trivial — own query |
| P1 | Sales History | sales, returns, customers, employees | 4 queries, all domain-specific |
| P1 | Purchases | inventory, suppliers, purchases, purchaseReturns | 4 queries |
| P2 | Dashboard | sales, inventory, purchases, customers | Dashboard is the hardest — may keep as composite last |
| P2 | Customer Overview | customers, sales, | 2 queries |
| P3 | Suppliers | suppliers | 1 query — trivial |
| P3 | Employees | employees | 1 query — trivial |
| P3 | All others | varies | Migrate last |

**Pattern for each migration:**

```typescript
// Step 1: Add useQuery calls inside the component
// Step 2: Remove the props from the component's interface
// Step 3: Remove the entry from pageRegistry.requiredProps
// Step 4: Remove the entry from dataMap in PageRouter.tsx
// Step 5: Remove the entry from AuthenticatedContent's top-level fetch
```

#### Step 1.3 — Remove top-level fetches from AuthenticatedContent

After all pages are migrated, delete lines 130–139 from `AuthenticatedContent.tsx`.

Slim down `AuthenticatedContentProps` to only pass auth/app state, not domain data.

#### Step 1.4 — Remove `handlers` object

After all pages use their own mutations, delete:
- The `handlers` useMemo (lines 470–529)
- The `set*` callbacks (lines 204–319)
- The `useEntityHandlers` call (lines 347–401)
- The `useEntityHandlers.ts` file itself
- The `handlerMap` in PageRouter (lines 191–225)

---

## Phase 2 — Adopt a Standard Router

> **Effort:** 2–3 weeks  
> **Risk:** Medium-High — routing is the spine of the app  
> **Depends on:** Phase 1 (pages must own their data first)

### Problem

The app uses a custom hash-based routing system:

- `ViewState` — 80+ string literal union type
- `useUrlSync` — syncs browser hash with view state
- `PageRouter` — giant switch rendering `PAGE_REGISTRY[view]`
- `PAGE_REGISTRY` — 1,048 lines of manual config
- `requiredProps` — ~70 entries manually specifying which props each page needs

### Recommendation: TanStack Router

**Why TanStack Router over React Router v7:**

| Criterion | TanStack Router | React Router v7 |
|---|---|---|
| Type-safe routes | Native (100% type-safe params) | Via `generatePath` / manual typing |
| React Query integration | Built-in loaders with `@tanstack/react-router` | Manual with `loader` |
| Code splitting | Automatic per route | Manual via `lazy` |
| Already in monorepo | Same org as React Query | Different org |
| File-based routing | Supported | Supported |

### Migration Strategy

#### Step 2.1 — Define typed routes alongside current system (parallel)

Create `routeTree.ts` that mirrors the existing `ViewState` routes as TanStack Router routes.

```typescript
const routeTree = rootRoute({
  component: MainLayout,
}).children([
  route('/dashboard', { component: Dashboard }),
  route('/pos', { component: POS }),
  route('/inventory', { component: Inventory }),
  route('/sales-history', { component: SalesHistory }),
  // ...all other routes
]);
```

Both systems run in parallel. Keep `useUrlSync` writing to hash while TanStack Router reads from it.

#### Step 2.2 — Replace `PageRouter` with TanStack `<RouterProvider>`

Once `PAGE_REGISTRY` no longer injects data (Phase 1 complete), swap `PageRouter` with `<RouterProvider router={router} />`.

**Remove:**
- `PAGE_REGISTRY.ts` (or reduce to routing config only)
- `PageRouter.tsx`
- `useUrlSync.ts`
- `config/routes.ts` (the ROUTES constant)

#### Step 2.3 — Add before-route guards for RBAC

TanStack Router supports `beforeLoad` hooks — replace the permission check in `PageRouter.tsx` (lines 128–157):

```typescript
beforeLoad: ({ location }) => {
  const pagePermission = PERMISSIONS_MAPPING[location.pathname];
  if (pagePermission && !permissionsService.can(pagePermission)) {
    throw redirect({ to: '/unauthorized' });
  }
}
```

---

## Phase 3 — Deprecate Imperative Cache Mutations

> **Effort:** 1–2 weeks  
> **Risk:** Low — each mutation is isolated  
> **Depends on:** Phase 1 (pages using own mutations)

### Problem

`AuthenticatedContent.tsx` lines 204–319 contain 7 wrapper functions that call `queryClient.setQueryData`. The code itself says:

> *"TRANSITIONAL: These adapters exist for backward compatibility with components that still use imperative setState patterns. Each setter bakes in the query key parameters (e.g., limit=100). If any consumer uses a non-default limit, the setter will miss the correct cache entry. Prefer invalidateQueries() when the old setter pattern is fully removed."*

### End State

All mutations use the standard React Query pattern:

```typescript
// ✅ Instead of: handlers.setInventory(newList)
// Each component uses its own mutation hook:

const mutation = useMutation({
  mutationFn: (drug) => inventoryService.addDrug(drug),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all(activeBranchId) });
  },
});
```

### Migration

#### Step 3.1 — Audit all usages of `handlers.set*`

Search for all imports of handler functions in page components.

```
rg "handlers\.set|handlers\.handle|onAddDrug|onUpdateDrug|onDeleteDrug" --type tsx
```

#### Step 3.2 — Replace each with `useMutation`

For each handler found, check if a mutation hook already exists (many do — `useAddPurchase`, `useCompleteSale`, etc.). If so, switch to it. If not, create one in `/hooks/mutations/`.

#### Step 3.3 — Verify optimistic updates are handled correctly

Some handlers do optimistic updates on `setQueryData`. These must be migrated to `onMutate` / `onSettled` in the mutation hook:

```typescript
const mutation = useMutation({
  mutationFn: addDrug,
  onMutate: async (newDrug) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.inventory.all(branchId) });
    const previous = queryClient.getQueryData(queryKeys.inventory.all(branchId));
    queryClient.setQueryData(queryKeys.inventory.all(branchId), (old) => [...old, newDrug]);
    return { previous };
  },
  onError: (err, newDrug, context) => {
    queryClient.setQueryData(queryKeys.inventory.all(branchId), context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all(branchId) });
  },
});
```

#### Step 3.4 — Remove setQueryData wrappers

After all consumers are migrated, delete:
- All `set*` callback definitions in AuthenticatedContent
- `useEntityHandlers.ts` (after Phase 1)
- The `handlers` prop type

---

## Phase 4 — Consolidate State Management

> **Effort:** 1 week  
> **Risk:** Low — mostly renames and moves  
> **Depends on:** Phase 1 (data removed from context)

### Problem

Current state tiers:

| Tier | Technology | Count |
|---|---|---|
| Server state | React Query | All domain data |
| Client UI state | Zustand | 5 stores |
| Cross-cutting | React Context | 9 providers |
| Component state | useAppState | Layout/view state |

Blur zone: Some Context providers (SettingsContext) compose 4 sub-contexts and mirror what Zustand already handles.

### End State

| State Type | Technology | Examples |
|---|---|---|
| Server state | React Query only | Inventory, sales, employees |
| Client state | Zustand only | UI prefs, cart, modals |
| Provider-only | React Context | Theme (CSS vars), CatalogProvider (IndexedDB) |

### Migration

#### Step 4.1 — Move `useAppState` to a Zustand slice

`useAppState` is a custom hook that manages view, module, sidebar state. It's currently mixed between component state (useState) and localStorage.

**Action:** Create `stores/layoutStore.ts`:

```typescript
interface LayoutState {
  view: ViewState;
  activeModule: string;
  sidebarVisible: boolean;
  setView: (view: ViewState) => void;
  setActiveModule: (module: string) => void;
  toggleSidebar: () => void;
}
```

All components that use `useAppState()` → `useLayoutStore()`.

#### Step 4.2 — Simplify SettingsContext

SettingsContext currently composes 4 providers:
- ThemeContext
- UIContext
- TypographyContext
- NotificationContext

**Action:** Merge UI state (sidebar, dark mode, language, developer mode) into `uiStore.ts`. Keep ThemeContext only for CSS variable injection (which needs a provider). Keep NotificationContext for the alert system.

**After:** Only ThemeContext and NotificationContext remain as providers.

#### Step 4.3 — Remove providers that are no longer needed

- `AnimationProvider` — wraps `MotionConfig`, can live in `App.tsx` directly
- `HelpProvider` — if only used by help system, make it a Zustand store instead

#### Step 4.4 — Flatten provider tree

Current `index.tsx` provider nesting:

```
SettingsProvider
  └── AnimationProvider
        └── HelpProvider
              └── StatusBarProvider
                    └── AlertProvider
                          └── QueryProvider
                                └── ShiftProvider
                                      └── App
```

Target:

```
QueryProvider
  └── ThemeProvider
        └── App
```

Everything else becomes Zustand stores or hooks.

---

## Phase 5 — Clean Up Dependencies & Bundling

> **Effort:** 2–3 days  
> **Risk:** Low  
> **Can be done in parallel with other phases**

### Problems Identified

1. `framer-motion` + `motion` — duplicate (Phase 0)
2. `shadcn` in dependencies (Phase 0)
3. `@tailwindcss/postcss` unnecessary with `@tailwindcss/vite`
4. Manual `manualChunks` in vite.config.ts — maintenance burden
5. No tree-shaking config for large icon libraries

### Actions

#### Step 5.1 — Remove `@tailwindcss/postcss`

Tailwind v4 loads via the Vite plugin. The PostCSS plugin is only needed if you use PostCSS. Vite config only uses `@tailwindcss/vite`.

**Action:** Remove `"@tailwindcss/postcss"` and `"postcss"` and `"autoprefixer"` from devDependencies. Remove `postcss.config.js` (if present).

#### Step 5.2 — Simplify Vite manualChunks

Current `vite.config.ts` has 8 manual chunk entries. These were needed before Vite's built-in chunking matured. Vite 6 now handles code-splitting well for `node_modules`.

**Action:** Replace with a simpler strategy that only splits truly heavy libraries that are dynamically imported:

```typescript
manualChunks(id) {
  // Only keep chunks for libs loaded via dynamic import
  if (id.includes('node_modules/exceljs')) return 'vendor-excel';
  if (id.includes('node_modules/maplibre-gl')) return 'vendor-maplibre';
  if (id.includes('node_modules/@google/genai')) return 'vendor-genai';
  // Remove the rest — let Vite handle it
}
```

Remove: `vendor-recharts`, `vendor-motion`, `vendor-table`, `vendor-dnd-kit`, `vendor-lucide`, `vendor-virtual`, `vendor-radix`, `vendor-supabase`.

These are either small enough or already loaded lazily.

#### Step 5.3 — Audit for unused dependencies

Run `depcheck` or review against imports:

```
npx depcheck --skip-missing
```

Likely candidates for removal:
- `react-hotkeys-hook` — verify keyboard shortcuts still use it
- `barcode-detector` — verify if still in use
- `@fontsource-variable/geist` — verify font is still loaded via npm vs self-hosted

#### Step 5.4 — Add bundle analysis tooling

Add to `package.json` scripts:

```json
"analyze": "vite build --config vite.config.ts && npx vite-bundle-visualizer"
```

---

## Phase 6 — i18n Splitting

> **Effort:** 1 week  
> **Risk:** Low — incremental, leaf-level changes  
> **Parallel:** Can be done independently

### Problem

`i18n/translations.ts` — 6,341 lines / 238KB single file loaded eagerly once lazy content mounts.

### Solution

Split by domain module:

```
i18n/
├── index.ts                     # barrel, lazy loader
├── common.ts                    # shared strings (table headers, actions)
├── domains/
│   ├── auth.ts                  # login, permissions
│   ├── dashboard.ts             # widgets, KPIs
│   ├── inventory.ts             # drugs, batches, barcodes
│   ├── pos.ts                   # POS UI, payment
│   ├── sales-history.ts         # sales, returns
│   ├── purchases.ts             # orders, suppliers
│   ├── customers.ts             # customer management
│   ├── employees.ts             # HR, attendance
│   ├── settings.ts              # theme, branch config
│   └── reports.ts               # P&L, audit
└── ar/                          # Arabic mirrors (same structure)
```

### Migration Pattern

```typescript
// Before: import all translations at top
import { TRANSLATIONS } from '../../i18n/translations';

// After: dynamic import per module
const { default: t } = await import('../../i18n/domains/pos.ts');
// or via a lazy hook:
const t = useDomainTranslation('pos');
```

Create a `useDomainTranslation` hook:

```typescript
function useDomainTranslation(domain: string) {
  const { language } = useSettings();
  const [t, setT] = useState(null);

  useEffect(() => {
    import(`../../i18n/domains/${domain}.ts`).then((mod) => {
      setT(mod.default[language]);
    });
  }, [domain, language]);

  return t ?? {};
}
```

For pages rendered before the lazy translation is loaded, show a skeleton or common-only strings.

### Progressive Loading Strategy

1. **Root strings** (already split as `rootStrings.ts`) — loaded eagerly (~2KB)
2. **Menu navigation** (`menuTranslations.ts`) — loaded with layout (~8KB)
3. **Domain translations** — loaded per page via the hook (~30–50KB each, parallel)

---

## Phase 7 — Service Layer Standardization

> **Effort:** 1 week  
> **Risk:** Low-Medium — mostly renames and moves  
> **Parallel:** Can be done independently

### Problem

Inconsistent patterns across services:

- Some use repositories (`services/inventory/repositories/`, `services/auth/repositories/`)
- Some are flat (`services/customers/`, `services/suppliers/`)
- Empty directories suggest abandoned refactoring (`services/business/`, `services/clinical/`)

### Solution

Standardize on: **Service → Repository (optional) → Supabase client**

```typescript
// All services follow this pattern:
class SalesService extends BaseEntityService<Sale> {
  // Domain-specific logic lives here
  // Data access goes through repository if it exists, or direct supabase
}
```

### Migration

#### Step 7.1 — Remove empty directories

- `services/business/`
- `services/clinical/`
- `services/repositories/` (if empty at top level)

#### Step 7.2 — Add repository to services that lack one

Services without repositories:

| Service | Likely not needed? | Action |
|---|---|---|
| `customers/` | Small, direct queries | Add if testability needed |
| `suppliers/` | Small, direct queries | Add if testability needed |
| `returns/` | Moderate complexity | Add repository |
| `expense/` | Small | Leave as-is |
| `cash/` | Moderate complexity | Add repository |

#### Step 7.3 — Move toward interface-based services

Define service interfaces so mutation hooks can be tested:

```typescript
// types/services.ts
export interface IInventoryService {
  getAll(branchId: string): Promise<Drug[]>;
  add(drug: Omit<Drug, 'id'>): Promise<Drug>;
  update(id: string, drug: Partial<Drug>): Promise<Drug>;
  delete(id: string): Promise<void>;
}
```

---

## Phase 8 — Offline Storage Migration

> **Effort:** 2 weeks  
> **Risk:** Medium — data loss possible if migration is wrong  
> **Parallel:** Independent of Phase 1–4

### Problem

The app uses localStorage for most persistent state. The app's own quota monitoring confirms the risk:

```typescript
// storage.ts — monitors quota because 5MB limit is a real threat
const info = storage.getQuotaInfo();
if (info.isCloseToLimit) { alert.warning(...); }
```

For a pharmacy POS that needs offline capability, 5MB is tight. The app already uses `idb` (IndexedDB wrapper) for React Query cache persistence — extend this pattern.

### Solution

Migrate from localStorage (`storage.ts`) to IndexedDB (`idb`) for:

1. Session data
2. Branch/organization cache
3. User preferences
4. Audit logs
5. Any data >50KB

### Migration Strategy

#### Step 8.1 — Define IndexedDB schema

```typescript
// lib/db.ts
import { openDB } from 'idb';

const DB_NAME = 'pharmaflow';
const DB_VERSION = 1;

export const db = await openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // Object stores
    db.createObjectStore('sessions', { keyPath: 'id' });
    db.createObjectStore('settings', { keyPath: 'key' });
    db.createObjectStore('cache', { keyPath: 'key' });
    db.createObjectStore('audit-logs', { keyPath: 'id', autoIncrement: true });
    db.createObjectStore('pending-sync', { keyPath: 'id', autoIncrement: true });
  },
});
```

#### Step 8.2 — Create adapter with localStorage fallback

For the transition period, create a read-through adapter:

```typescript
class StorageAdapter {
  async get(key: string) {
    const fromIdb = await db.get('cache', key);
    if (fromIdb !== undefined) return fromIdb.value;
    return storage.get(key); // localStorage fallback
  }

  async set(key: string, value: any) {
    await db.put('cache', { key, value, timestamp: Date.now() });
  }
}
```

#### Step 8.3 — Migrate specific stores

Priority:

1. **Session/auth** — `authStore.ts` persistence (already has localStorage keys)
2. **Settings/preferences** — `uiStore.ts`, theme prefs
3. **Audit logs** — these accumulate and can exceed 5MB
4. **Store switcher** — `activeBranchId` and related cache

#### Step 8.4 — Remove localStorage quota monitoring

Once migration is complete, the 5MB worry is gone. Remove the quota check (App.tsx lines 137–184) and remove `storage.getQuotaInfo()`. The `pharma_storage_quota_exceeded` event listener can be removed.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Data fetching decentralization breaks a page | Medium | Migrate pages one by one, test each before moving to the next |
| Router migration breaks deep links | Medium | Run both routing systems in parallel during transition |
| setQueryData removal breaks optimistic updates | Low | Verify onMutate/onSettled match previous behavior exactly |
| IndexedDB migration loses localStorage data | Low | Read-through adapter ensures zero data loss |
| i18n split causes missing translations | Low | Lazy imports show skeleton until translation loads |
| Phase dependencies cause churn | Medium | Phases 5, 6, 7, 8 are fully parallelizable — do them concurrently |
| Team context-switching | Medium | Assign each phase to a different team member; they're independent |

---

## Recommended Order

```
Week 1   │ Phase 0 (quick wins) + Phase 5 (dependencies)
         │ Phase 6 (i18n split starts, parallel)
         │ Phase 8 (IndexedDB starts, parallel)
Week 2-3 │ Phase 1 (decentralize data fetching)
         │   Step 1.1 (remove PageRouter double-fetch) — day 1
         │   Step 1.2 (P0-P1 pages) — week 2
         │   Step 1.3-1.4 (cleanup) — week 3
         │ Phase 7 (service layer, parallel)
Week 4-5 │ Phase 2 (TanStack Router)
         │ Phase 3 (deprecate setQueryData)
Week 6   │ Phase 4 (consolidate state)
         │ Tie up loose ends, full QA pass
```

---

## Success Criteria

- [ ] AuthenticatedContent.tsx < 200 lines (down from 665)
- [ ] PageRouter.tsx < 50 lines (down from 301)
- [ ] PAGE_REGISTRY.ts < 100 lines (down from 1,048)
- [ ] Zero `setQueryData` wrappers
- [ ] All domain data fetched in the component that renders it
- [ ] TanStack Router handles all routing
- [ ] Zustand is the only client state library
- [ ] `framer-motion` removed (only `motion` retained or vice versa)
- [ ] Translations split into lazy-loaded domain modules
- [ ] localStorage quota warnings eliminated (migrated to IndexedDB)
- [ ] All services follow the same pattern
- [ ] Bundle size reduced by >15%
- [ ] All existing tests pass (no regressions)
