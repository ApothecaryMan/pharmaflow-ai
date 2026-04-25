---
description: Standard workflow for creating new pages to ensure consistency and reuse of existing components.
---

# Create New Page Standard (Hub Pattern)

Follow this workflow whenever you are asked to create a new page or module in PharmaFlow AI.

## 1. Component Props (Mandatory)

Pages are injected via `PageRouter`. They **MUST** support the following props:

```tsx
interface MyPageProps {
  color: any; // Theme primary
  t: any; // Translations
  language: 'EN' | 'AR';
  isLoading?: boolean; // Managed by PageRouter
  onViewChange?: (view: string) => void; // For switching views in a Hub
}
```

## 2. Page Structure Template

Modern pages should NOT render Sidebar/Navbar. They render the content shell:

```tsx
import React from "react";
import { PageHeader } from "../common/PageHeader";
import { SegmentedControl } from "../common/SegmentedControl";
import { MyPageSkeleton } from "../skeletons/MySkeletons";

export const MyPage: React.FC<MyPageProps> = ({ 
  color, t, language, isLoading, onViewChange 
}) => {
  return (
    <div className="h-full space-y-6 animate-fade-in overflow-y-auto">
      <PageHeader
        title={t.module.title}
        centerContent={
          <SegmentedControl
            options={[
              { value: 'view1', label: t.module.view1, icon: 'list' },
              { value: 'view2', label: t.module.view2, icon: 'analytics' }
            ]}
            value="view1"
            onChange={(val) => onViewChange?.(val)}
            color={typeof color === 'string' ? color : color.name}
            variant="onPage"
            shape="pill"
            className="w-full sm:w-[480px]"
          />
        }
        rightContent={/* Filters / Actions */}
      />

      {isLoading ? (
        <MyPageSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Main Content Components */}
        </div>
      )}
    </div>
  );
};
```

## 3. Progressive Loading Rules
- **NEVER** hide the entire page with a loading spinner.
- Use **Centralized Skeletons** from `components/skeletons/`.
- Ensure the `PageHeader` is visible even while data is loading.

## 4. Registration
1. Add to `config/pageRegistry.ts` with correct `requiredProps`.
2. Add to `config/menuData.ts` if it's a top-level menu item.

## 5. Verification Checklist
- [x] Does the header show up immediately?
- [x] Does it use `PageHeader` with slots (left/center/right)?
- [x] Are skeletons used for content areas?
- [x] Is `onViewChange` linked to the `SegmentedControl`?
- [x] Are translations handled via the `t` prop?
