# Contributing to PharmaFlow AI

## 📂 Project Structure

```
pharmaflow-ai/
├── components/
│   ├── common/         # Shared UI (SmartInputs, PosDropdown, Modal, etc.)
│   ├── layout/         # Navigation (Navbar, Sidebar, TabBar)
│   ├── dashboard/      # Dashboard widgets and views
│   ├── sales/          # POS, SalesHistory, InvoiceDesigner
│   ├── inventory/      # Inventory management, BarcodeStudio
│   ├── purchases/      # Purchase orders, suppliers
│   ├── customers/      # Customer directory
│   └── ai/             # AI Assistant features
├── services/           # Backend Service Layer (Business Logic)
│   ├── api/            # API simulation
│   ├── inventory/      # Inventory CRUD logic
│   ├── sales/          # Sales calculation logic
│   └── DataContext.tsx # (Beta) Future State Provider
├── config/             # Configuration (menuData.ts, pageRegistry.ts)
├── i18n/               # Internationalization (translations.ts, menuTranslations.ts)
├── hooks/              # Custom React hooks
└── types/              # TypeScript definitions
```

---

## 🏗️ Architecture & Data Flow

### 1. State Management (Current)
Currently, **`App.tsx`** acts as the central store for the application.
*   **State**: Held in `App.tsx` (`inventory`, `sales`, `customers`, etc.).
*   **Access**: Data is passed down to pages via **Props** defined in `config/pageRegistry.ts`.
*   **Updates**: Handler functions (e.g., `onAddDrug`, `onCompleteSale`) are passed down as props.

### 2. Service Layer
While state is in `App.tsx`, complex business logic and data persistence should be handled by **Services** (`services/*`).
*   **Do not** write complex calculations inside UI components. Move them to services.
*   **Do not** access `localStorage` directly in components.

---

## 🚨 Mandatory Standards

### 1. Internationalization (i18n)

**RULE:** All user-facing text MUST be internationalized.
**AR (Arabic) translation is MANDATORY for every new key.**

#### Files
*   `i18n/translations.ts`: General UI text.
*   `i18n/menuTranslations.ts`: Sidebar & Menu items.

#### Forbidden ❌
*   Hardcoded English string: `<div>Total</div>`
*   String concatenation: `"Hello " + name`

#### Required ✅
*   Use `props.t` (translation object) passed from parent.
*   All Input placeholders, Table headers, Button labels.

---

### 2. UI/UX & Design

**Goal:** "Premium, Modern, & Dynamic."
All UI elements must look professional. Avoid basic browser defaults.

#### Standard Components
*   **Input Fields**: MUST use `SmartInputs` family to handle LTR/RTL automatically.
    *   `SmartInput`: Standard text.
    *   `SmartPhoneInput`: Formatting & validation for phones.
    *   `SmartEmailInput`: Email validation.
    *   `SmartDateInput`: Date picker.
*   **Dropdowns**: MUST use `PosDropdown` (or `useExpandingDropdown` hook). Never use HTML `<select>`.
*   **Search**: Use `SearchInput` component.
*   **Modals**: Use `Modal` component (handles z-index & backdrop correctly).

#### Styling Rules
*   **Close Buttons**: Standardize style → `w-8 h-8 (or w-10 h-10) flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`. Do NOT use `p-2` without fixed width/height.
*   **Icon Boxes**: Use consistent padding/rounded corners.
*   **Colors**: Use semantic colors from `index.css` or Tailwind classes.

---

## 🛠️ Workflow: Adding a New Page

1.  **Create Component**: Build your page in `components/[module]/MyPage.tsx`.
    *   Ensure it accepts `color`, `t`, `language`, and data props (e.g., `inventory`).
2.  **Register Page**: Add it to `config/pageRegistry.ts`.
    ```typescript
    export const PAGE_REGISTRY = {
      'my-new-page': {
         id: 'my-new-page',
         component: MyPage,
         requiredProps: ['inventory', 'onAddDrug'], // Define data needs here
         // ...
      }
    };
    ```
    *   *Note: `App.tsx` will automatically inject the props listed in `requiredProps`.*
3.  **Update Menu**: Add entry to `config/menuData.ts`.
4.  **Add Translations**: Update `i18n/menuTranslations.ts` and `i18n/translations.ts`.

---

## 📝 Code Review Checklist

Before submitting:
- [ ] **Inputs**: Using `SmartInputs`? (No raw `<input>`)
- [ ] **Dropdowns**: Using `PosDropdown`?
- [ ] **Translations**: 100% covered (EN + AR)?
- [ ] **RTL Support**: Tested in Arabic mode?
- [ ] **Props**: Component receives data via props (not importing globals)?
- [ ] **Type Safety**: No `any` types?

---

## 📚 Reference

*   **SmartInputs**: See `components/common/SmartInputs.tsx` for docs.
*   **Services**: See `services/` for business logic.
*   **Page Registry**: See `config/pageRegistry.ts` for props injection configuration.

---
**Build something amazing!** 🚀
