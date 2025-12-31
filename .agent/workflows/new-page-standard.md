---
description: Standard workflow for creating new pages to ensure consistency and reuse of existing components.
---

# Create New Page Standard

Follow this workflow whenever you are asked to create a new page or module in PharmaFlow AI.

## 1. Review Standards

- **Read**: `CONTRIBUTING.md` to refresh on mandatory components.
- **Goal**: Create a page that matches the "Premium, Modern & Dynamic" design system.

## 2. Component Selection (Mandatory)

You **MUST** use the following components. Do not build custom alternatives.

| Context           | Component                   | Path                                      |
| :---------------- | :-------------------------- | :---------------------------------------- |
| **Layout**        | `Navbar`, `Sidebar`         | `components/layout/`                      |
| **Inputs**        | `SmartInput`, `SearchInput` | `components/common/`                      |
| **Dropdowns**     | `ExpandingDropdown`         | `components/common/ExpandingDropdown.tsx` |
| **Tabs/Segments** | `SegmentedControl`          | `components/common/SegmentedControl.tsx`  |
| **Tables**        | `TanStackTable`             | `components/common/TanStackTable.tsx`     |
| **Modals**        | `Modal`                     | `components/common/Modal.tsx`             |
| **Icons**         | `material-symbols-rounded`  | (Span class)                              |

## 3. Page Structure Template

Start your new page file (e.g., `components/mymodule/MyPage.tsx`) with this structure:

```tsx
import React, { useState } from "react";
import { Navbar } from "../layout/Navbar";
import { Sidebar } from "../layout/Sidebar";
import { useTheme } from "../../hooks/useTheme";
import { MENU_ITEMS } from "../../config/menuData";

// Props must include these for layout to work
interface MyPageProps {
  activeModule: string;
  onModuleChange: (id: string) => void;
  // ... other props from App.tsx
}

export const MyPage: React.FC<MyPageProps> = (props) => {
  const { theme, currentTheme } = useTheme();

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans transition-colors duration-300 ease-in-out theme-${theme}`}
    >
      <Navbar {...props} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar {...props} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 w-full relative">
          {/* Page Content Here */}
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Use Standard Components here */}
          </div>
        </main>
      </div>
    </div>
  );
};
```

## 4. Registration & Wiring

1.  **Register Page**: Add entry to `config/pageRegistry.ts`.
2.  **Add Menu Item**: Update `config/menuData.ts`.
3.  **Add Translations**:
    - Add module name to `i18n/menuTranslations.ts` (EN + AR).
    - Add UI strings to `i18n/translations.ts` (EN + AR).

## 5. Documentation Update (MANDATORY)

After creating the new page, **you MUST update** the project structure in `CONTRIBUTING.md`:

1. Open `CONTRIBUTING.md` and find the "## 📂 Project Structure" section.
2. Add your new file to the appropriate folder in the file tree.
3. Include a brief comment describing the file's purpose.

**Example:**

```
│   ├── inventory/      # Inventory Management
│   │   ├── Inventory.tsx        # Main inventory view
│   │   ├── MyNewPage.tsx        # <-- ADD YOUR NEW FILE HERE
```

## 6. Verification

- [ ] Did you use `Navbar` and `Sidebar`?
- [ ] Are all inputs "Smart"?
- [ ] Is there any hardcoded English text? (If yes, fix it).
- [ ] Did you add Arabic translations?
- [ ] Did you update `CONTRIBUTING.md` with the new file?
