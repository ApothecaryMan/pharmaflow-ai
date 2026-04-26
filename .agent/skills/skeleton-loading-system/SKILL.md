---
name: skeleton-loading-system
description: Comprehensive guide for PharmaFlow AI's progressive skeleton loading architecture. Use when creating new pages, adding loading states, building skeleton components, or debugging loading UI issues. Covers the 4-tier loading hierarchy, design tokens, anti-patterns, and step-by-step checklists for adding skeletons to new features.
---

# Skeleton Loading System — Architecture & Implementation Guide

> **Philosophy**: The UI should feel "already rendered" from the first frame. No spinners. No blank screens. No layout shift. Every pixel has a placeholder before data arrives.

---

## 1. Architecture Overview

PharmaFlow AI uses a **4-tier progressive loading hierarchy**. Each tier handles a different lifecycle stage:

```
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 0 — App Bootstrap (Auth + Onboarding Check)                  │
│  └─ Full-screen spinner on black bg (the ONLY spinner allowed)     │
│     File: App.tsx                                                  │
├─────────────────────────────────────────────────────────────────────┤
│  TIER 1 — Page Transition Skeleton (Blocking / Full-page)          │
│  └─ PageSkeletonRegistry → reads PAGE_REGISTRY[view].skeleton      │
│     Orchestrator: PageRouter.tsx                                   │
│     Registry: components/skeletons/PageSkeletonRegistry.tsx        │
├─────────────────────────────────────────────────────────────────────┤
│  TIER 2 — Section-Level Skeletons (Non-blocking / Progressive)     │
│  └─ Parent passes isLoading prop to children                       │
│     Children swap their content with imported skeleton components   │
├─────────────────────────────────────────────────────────────────────┤
│  TIER 3 — Inline Element Skeletons (Component-internal)            │
│  └─ Component handles loading internally via isLoading prop        │
│     No separate skeleton component, just conditional className     │
└─────────────────────────────────────────────────────────────────────┘
```

### Decision Tree: Which Tier to Use?

```
Is it the initial app boot / auth check?
  → TIER 0 (spinner — already implemented, don't touch)

Is data loaded per-page and the ENTIRE page depends on it?
  → TIER 1 (register a skeleton in PAGE_REGISTRY)

Does only a SECTION of the page depend on async data?
  → TIER 2 (create skeleton components, import in section)

Is it a SINGLE element (card, value, badge) that loads?
  → TIER 3 (handle inline with isLoading prop + conditional classes)
```

---

## 2. Tier 1 — Page Transition Skeletons

### How It Works

1. `App.tsx` passes `isLoading` (from `DataContext`) to `PageRouter`
2. `PageRouter` checks: is `isLoading === true`? Is the current view NOT in the exclusion list?
3. If yes → renders `<PageSkeletonRegistry view={view} />`
4. `PageSkeletonRegistry` looks up `PAGE_REGISTRY[view].skeleton` and renders it

### The Exclusion List (PageRouter)

Some pages handle loading **internally** (Tier 2 pattern) and skip the blocking skeleton:

```tsx
// These pages render their OWN progressive skeletons
if (
  isLoading &&
  view !== 'inventory' &&
  view !== 'customers' &&
  // ... other pages that handle loading internally
) {
  return <PageSkeletonRegistry view={view} />;
}
```

> **Rule**: If a page handles its own loading, add it to this exclusion list.

### PageConfig Type (pageRegistry.ts)

```tsx
interface PageConfig {
  id: string;
  component: ComponentType<any>;
  skeleton?: ComponentType<any>;     // ← Tier 1 skeleton
  skeletonProps?: Record<string, any>; // ← Optional props for skeleton
  // ... other fields
}
```

### Registration Example

```tsx
// In config/pageRegistry.ts
'my-page': {
  id: 'my-page',
  component: MyPageComponent,
  skeleton: MyPageSkeleton,            // ← The skeleton component
  skeletonProps: { withTopBar: true },  // ← Props forwarded to skeleton
  permission: 'some.permission',
  layout: 'dashboard',
},
```

### The PageSkeletonRegistry (Orchestrator)

```tsx
// components/skeletons/PageSkeletonRegistry.tsx
export const PageSkeletonRegistry = ({ view }: { view: string }) => {
  const config = PAGE_REGISTRY[view];
  const Skeleton = config?.skeleton || (() => null); // Fallback to empty
  const skeletonProps = config?.skeletonProps || {};

  return (
    <div className='animate-fade-in transition-opacity duration-300'>
      <Skeleton {...skeletonProps} />
    </div>
  );
};
```

---

## 3. Tier 2 — Section-Level Skeletons

### The Pattern

```tsx
// Parent Page Component
const [isLoading, setIsLoading] = useState(true);

// 1. Fetch data
useEffect(() => { fetchData().finally(() => setIsLoading(false)) }, []);

// 2. Pass isLoading to ALL children (single source of truth)
return (
  <>
    <PageHeader ... />  {/* ← Always renders immediately */}
    <ChildSection isLoading={isLoading} data={data} />
    <AnotherSection isLoading={isLoading} data={data} />
  </>
);
```

```tsx
// Child Component
import { ItemRowSkeleton } from '../skeletons/MyModuleSkeletons';

export const ListSection = ({ items, isLoading }) => {
  return (
    <div className={`p-5 rounded-3xl ${CARD_BASE}`}>
      <h3>Section Title</h3> {/* ← Header always visible */}
      
      <div>
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => <ItemRowSkeleton key={i} />)}
          </>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map(item => <ItemRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
};
```

### Key Rules

1. **Single source of truth**: `isLoading` state lives in the parent page, never in children
2. **Header always renders**: The page shell (header, navigation tabs) never shows skeletons
3. **Ternary pattern**: Always `isLoading ? <Skeleton /> : isEmpty ? <Empty /> : <Content />`
4. **Count matters**: Render a realistic number of skeleton items (e.g., 4 rows, not 1 or 20)

---

## 4. Tier 3 — Inline Element Skeletons

### The Pattern

No separate skeleton component. The component itself has conditional rendering based on `isLoading`:

```tsx
// A component that handles its own skeleton internally
export const MetricCard = ({ title, value, icon, iconColor, isLoading }) => {
  return (
    <div className={`p-3 rounded-2xl ${CARD_BASE}`}>
      {/* Icon — swaps to gray box when loading */}
      <div className={`w-12 h-12 rounded-xl ${
        isLoading 
          ? 'bg-zinc-100 dark:bg-zinc-800 animate-pulse' 
          : `text-${iconColor}-600`
      }`}>
        {!isLoading && <span className="material-symbols-rounded">{icon}</span>}
      </div>

      {/* Title — always visible (static content) */}
      <p className="text-xs">{title}</p>
      
      {/* Value — swaps to gray bar when loading */}
      {isLoading ? (
        <div className="h-8 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
      ) : (
        <h4>{value}</h4>
      )}
    </div>
  );
};
```

### Data Tables (Built-in Skeleton Rows)

Tables should generate their own skeleton rows based on column definitions:

```tsx
{isLoading && rows.length === 0 ? (
  Array.from({ length: 8 }).map((_, i) => (
    <tr key={`skeleton-row-${i}`} className="animate-pulse border-b">
      {table.getAllColumns().map(col => (
        <td key={`skeleton-cell-${col.id}-${i}`} className="py-4 px-4">
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded" />
        </td>
      ))}
    </tr>
  ))
)}
```

> **Rule**: If a reusable common component supports `isLoading`, prefer using it over creating a separate skeleton.

---

## 5. Design Tokens & Visual Standards

### Color Palette for Skeleton Blocks

| Variant | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| **Primary block** | `bg-zinc-100` | `dark:bg-zinc-800` | Icons, titles, main content areas |
| **Secondary block** | `bg-zinc-50` | `dark:bg-zinc-800/50` | Subtitles, badges, secondary info |
| **Card container** | `bg-white` | `dark:bg-zinc-900` | Full card skeletons |

> **Standard palette**: Always use `zinc` variants for all skeletons. Do NOT mix `gray`/`neutral` colors.

### Border & Rounding

```css
/* Cards */
border border-zinc-200 dark:border-zinc-800 rounded-xl   /* Small cards */
border border-zinc-200 dark:border-zinc-800 rounded-3xl  /* Large card containers */

/* Elements inside cards */
rounded        /* Small text blocks */
rounded-lg     /* Buttons, inputs */
rounded-full   /* Badges, avatar circles */
rounded-xl     /* Icon containers */
```

### Animation Classes

| Class | Effect | When to Use |
|---|---|---|
| `animate-pulse` | Opacity fade in/out (shimmer) | **On every skeleton block** — this is the core loading indicator |
| `animate-fade-in` | Opacity 0→1 entrance | **On skeleton containers** — smooth appearance when switching views |

### Sizing Convention

```
Icon placeholder    → w-10 h-10  or  w-12 h-12 rounded-xl
Title placeholder   → h-4 w-24  or  h-4 w-32
Subtitle            → h-3 w-16  or  h-3 w-20
Value/number        → h-6 w-16  or  h-8 w-20
Badge               → h-4 w-16 rounded-full  or  h-6 w-20 rounded-full
Button              → h-8 flex-1 rounded-lg
Avatar              → w-8 h-8 rounded-full  (with border-2 border-white for stacked)
Progress bar        → h-2 w-full rounded-full
```

---

## 6. File Organization

### Directory Structure

```
components/skeletons/
├── PageSkeletonRegistry.tsx          # Tier 1 orchestrator (DO NOT modify)
└── {Module}Skeletons.tsx             # Per-module skeleton components
```

### Naming Convention

| Type | Naming Pattern | Example |
|---|---|---|
| **Full-page skeleton** | `{PageName}Skeleton` | `POSSkeleton`, `InventorySkeleton` |
| **Section skeleton** | `{SectionName}Skeleton` | `ItemRowSkeleton`, `ProgressBarSkeleton` |
| **Composite skeleton** | `{Feature}{Type}Skeleton` | `KPIGridSkeleton`, `StatsRowSkeleton` |
| **Skeleton file** | `{Module}Skeletons.tsx` | `SalesSkeletons.tsx`, `HRSkeletons.tsx` |

---

## 7. Step-by-Step: Adding Skeletons to a New Feature

### Scenario A: New Full Page (Tier 1)

1. **Study the page layout** — identify the major visual sections
2. **Create skeleton file** in `components/skeletons/{Module}Skeleton.tsx`
3. **Mirror the layout exactly** — same grid, same gaps, same dimensions
4. **Register in pageRegistry.ts**:
   ```tsx
   'my-page': {
     skeleton: MyPageSkeleton,
     // ...
   }
   ```
5. **Verify**: The skeleton should NOT be in the PageRouter exclusion list

### Scenario B: Progressive Page with Internal Sections (Tier 2)

1. **Create skeleton atoms** in `components/skeletons/{Module}Skeletons.tsx`
2. **Add `isLoading` prop** to the page's interface
3. **Pass `isLoading` to every child section**
4. **Each child does the ternary**: `isLoading ? <Skeleton /> : <Content />`
5. **Add page to PageRouter exclusion list**
6. **Verify**: Header renders immediately, sections show skeletons, then data

### Scenario C: Adding Loading to an Existing Common Component (Tier 3)

1. **Add `isLoading?: boolean` to the component's props interface**
2. **Wrap dynamic content** in `isLoading ? <gray-block /> : <content />`
3. **Apply `animate-pulse`** to skeleton blocks
4. **Keep static content visible** (titles, labels that don't change)

---

## 8. Anti-Patterns ❌

### ❌ Never: Full-page loading spinners
```tsx
// BAD — blocks the entire page
if (isLoading) return <LoadingSpinner />;
```

### ❌ Never: Generic "Loading..." text
```tsx
// BAD — no structural preview
if (isLoading) return <p>Loading...</p>;
```

### ❌ Never: Skeleton + Spinner together
```tsx
// BAD — double loading indicator
{isLoading && <Skeleton />}
{isLoading && <Spinner />}  // ← Pick one, never both
```

### ❌ Never: Skeletons that don't match the real layout
```tsx
// BAD — causes layout shift when data loads
<div className="h-20 w-full" />  // skeleton is 80px
// but actual content is 200px    // ← jarring jump
```

### ❌ Never: `isLoading` state in child components
```tsx
// BAD — duplicated state, potential race conditions
const ChildSection = ({ data }) => {
  const [isLoading, setIsLoading] = useState(true);  // ❌ Don't!
  // ...
};
```

### ❌ Never: Mixed color palettes
```tsx
// BAD — inconsistent skeleton colors
<div className="bg-gray-200" />      // ← gray palette
<div className="bg-zinc-100" />      // ← zinc palette in same skeleton
```

### ✅ Correct Pattern
```tsx
// GOOD — centralized loading, progressive render
const ParentPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <>
      <PageHeader ... />                          {/* Always visible */}
      <Section1 isLoading={isLoading} data={data} />
      <Section2 isLoading={isLoading} data={data} />
    </>
  );
};
```

---

## 9. Skeleton Component Templates

### Atomic Skeleton (for a single row/card)

```tsx
import React from 'react';

/**
 * Skeleton for a single [ITEM_NAME] in [SECTION_NAME]
 */
export const [ItemName]Skeleton = () => (
  <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 animate-pulse">
    <div className="flex items-center gap-4">
      {/* Icon placeholder */}
      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      {/* Text content */}
      <div className="space-y-2">
        <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
      </div>
    </div>
    {/* Right side actions/badges */}
    <div className="flex items-center gap-6">
      <div className="h-4 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-full" />
    </div>
  </div>
);
```

### Card Skeleton (for grid layouts)

```tsx
export const [CardName]Skeleton = () => (
  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm min-h-[220px] animate-pulse">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
      </div>
      <div className="h-4 w-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-full" />
    </div>
    <div className="space-y-2 mt-auto">
      <div className="h-3 w-full bg-zinc-50 dark:bg-zinc-800/50 rounded" />
      <div className="h-3 w-2/3 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
    </div>
    <div className="flex gap-2 pt-2">
      <div className="h-8 flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
      <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
    </div>
  </div>
);
```

### Composite Skeleton (full page)

```tsx
export const [PageName]Skeleton = () => (
  <div className="space-y-6 animate-fade-in h-full">
    {/* KPI Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
      ))}
    </div>
    
    {/* Main Content Area */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-80 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 animate-pulse" />
      <div className="h-80 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 animate-pulse" />
    </div>
  </div>
);
```

### Table Skeleton (for data tables)

```tsx
export const [TableName]Skeleton = () => (
  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-fade-in">
    {/* Table Header */}
    <div className="h-12 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center px-4 gap-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`h-4 bg-zinc-100 dark:bg-zinc-800 rounded ${i === 2 ? 'flex-1' : 'w-24'}`} />
      ))}
    </div>
    {/* Table Rows */}
    <div className="p-4 space-y-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded" />
            <div className="h-3 w-1/3 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
          </div>
          <div className="h-6 w-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-full" />
          <div className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  </div>
);
```

---

## 10. Verification Checklist

When reviewing or adding skeletons, verify:

- [ ] **No layout shift**: Skeleton dimensions match real content dimensions
- [ ] **Dark mode support**: Every `bg-zinc-100` has a `dark:bg-zinc-800` pair
- [ ] **Animation present**: Root or individual blocks have `animate-pulse`
- [ ] **Smooth entrance**: Container has `animate-fade-in`
- [ ] **Headers visible**: Page header / section titles render immediately (no skeleton on headers)
- [ ] **Realistic count**: List skeletons show a plausible number of items (3-8 usually)
- [ ] **No spinners**: Zero usage of spinner/ring loading indicators
- [ ] **Single loading source**: `isLoading` comes from parent, never duplicated in children
- [ ] **Empty state handled**: After loading, if data is empty, show empty state (not skeleton forever)
- [ ] **Registry updated**: If Tier 1, the skeleton is registered in `PAGE_REGISTRY` with correct props
- [ ] **Consistent palette**: All blocks use `zinc` only, no `gray`/`neutral` mixing
