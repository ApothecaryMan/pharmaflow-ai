---
name: modern-page-hub
description: Guidelines for building modern, progressive pages with unified headers and centralized skeletons.
---

# Modern Page Hub Pattern

This skill defines the standard for building "Hub" style pages in PharmaFlow AI. This pattern ensures a premium user experience with instant navigation, consistent layouts, and professional loading states.

## 1. Component Props & Interface
Every page in a Hub must support at least these props:
```tsx
interface PageProps {
  color: any; // Primary theme color (can be string or ThemeColor object)
  t: any; // Translation object
  language: 'EN' | 'AR';
  isLoading?: boolean; // Managed by PageRouter
  onViewChange?: (view: string) => void; // For the Hub Switcher
}
```

## 2. Progressive Loading Architecture
**Rule**: Never return a full-page loading spinner. The page shell (Header/Navigation) must render immediately.

### The Implementation
1. Remove any `if (isLoading) return <Loading />` blocks from the top of the component.
2. Use centralized skeletons from `components/skeletons/`.
3. Wrap the main content in a conditional:

```tsx
return (
  <div className="h-full space-y-6 overflow-y-auto">
    <PageHeader ... />

    {isLoading ? (
      <SpecificPageSkeleton />
    ) : (
      <>
        {/* Main Page Content */}
      </>
    )}
  </div>
);
```

## 3. Unified PageHeader
Use the `PageHeader` component with the following slots:

- **leftContent**: Title, icon, or profile info.
- **centerContent**: The **Hub Switcher** (using `SegmentedControl`).
- **rightContent**: Actions, filters, or date pickers.

### Hub Switcher Example
```tsx
<SegmentedControl
  options={[
    { value: 'list', label: t.hr.list, icon: 'badge' },
    { value: 'overview', label: t.hr.overview, icon: 'supervisor_account' },
    { value: 'profile', label: t.hr.profile, icon: 'person' }
  ]}
  value={currentView}
  onChange={(val) => onViewChange?.(val)}
  color={typeof color === 'string' ? color : color.name}
  variant="onPage"
  shape="pill"
  className="w-full sm:w-[480px]"
/>
```

## 4. Page Registry Configuration
Ensure the page is correctly registered in `config/pageRegistry.ts` with the required props:
```tsx
'page-id': {
  id: 'page-id',
  component: PageComponent,
  requiredProps: ['color', 't', 'language', 'isLoading', 'onViewChange'],
  permission: 'relevant.permission',
}
```

## 5. Visual Standards
- **Typography**: Use `text-zinc-900` / `dark:text-white` for titles and `text-zinc-500` for subtitles.
- **Spacing**: Standard `px-page` for horizontal padding and `py-3.5` for header height.
- **Borders**: Avoid harsh borders. Use `border-zinc-200/50` or disable borders in the header for a cleaner look.
