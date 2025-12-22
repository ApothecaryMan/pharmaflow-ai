# Contributing to PharmaFlow AI

## 📂 Project Structure

```
pharmaflow-ai/
├── components/
│   ├── common/         # Shared UI Components
│   │   ├── SmartInputs.tsx      # LTR/RTL-aware input components
│   │   ├── SegmentedControl.tsx # iOS-style segmented buttons
│   │   ├── Switch.tsx           # Toggle switch component
│   │   ├── TanStackTable.tsx    # Advanced data table
│   │   ├── ExpandingDropdown.tsx# Animated dropdown
│   │   ├── ContextMenu.tsx      # Right-click/long-press context menu
│   │   ├── DatePicker.tsx       # Date selection component
│   │   ├── Modal.tsx            # Standard modal dialog
│   │   ├── SearchInput.tsx      # Search input with icon
│   │   ├── Toast.tsx            # Notification toasts
│   │   └── hooks/               # Component-specific hooks (usePosSounds, usePosShortcuts)
│   ├── layout/         # Navigation & Structure
│   │   ├── Navbar.tsx           # Top navigation bar
│   │   ├── Sidebar.tsx          # Side navigation
│   │   ├── SidebarDropdown.tsx  # Dropdown for sidebar items
│   │   ├── TabBar.tsx           # Multi-tab management
│   │   └── DashboardIcon.tsx    # Custom dashboard icon
│   ├── dashboard/      # Dashboard & Analytics
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   └── RealTimeSalesMonitor.tsx # Live sales tracking
│   ├── sales/          # Point of Sale & Sales Management
│   │   ├── POS.tsx              # Point of Sale (production)
│   │   ├── CashRegister.tsx     # Shift & cash management
│   │   ├── SalesHistory.tsx     # Sales history & returns
│   │   ├── ReceiptDesigner.tsx  # Receipt template editor
│   │   ├── ReturnModal.tsx      # Return processing modal
│   │   ├── ReturnHistory.tsx    # Return history view
│   │   ├── ShiftHistory.tsx     # Shift history view
│   │   ├── SortableCartItem.tsx # Drag-and-drop cart item
│   │   └── InvoiceTemplate.ts   # Invoice HTML generator
│   ├── inventory/      # Inventory Management
│   │   ├── Inventory.tsx        # Main inventory view
│   │   ├── BarcodeStudio.tsx    # Barcode generator
│   │   └── AddDrug.tsx          # Add drug form
│   ├── purchases/      # Purchase Management
│   │   ├── Purchases.tsx        # Purchase orders
│   │   ├── PurchaseReturns.tsx  # Purchase returns
│   │   └── SuppliersList.tsx    # Supplier management
│   ├── customers/      # Customer Management
│   │   └── CustomerManagement.tsx
│   ├── ai/             # AI Assistant Features
│   │   └── AIAssistant.tsx
│   ├── test/           # Development/Testing Components
│   │   └── POSTest.tsx          # POS testing variant
│   └── providers/      # Context Providers
│       └── (future providers)
│
├── services/           # Backend Service Layer
│   ├── api/            # API simulation
│   ├── inventory/      # Inventory CRUD logic
│   ├── sales/          # Sales calculation logic
│   ├── customers/      # Customer data management
│   ├── purchases/      # Purchase order logic
│   ├── suppliers/      # Supplier management
│   ├── returns/        # Return processing logic
│   ├── cash/           # Cash register & shift logic
│   ├── settings/       # Application settings
│   └── DataContext.tsx # (Beta) Future State Provider
│
├── hooks/              # Custom React Hooks
│   ├── useExpandingDropdown.ts  # Dropdown keyboard navigation
│   ├── useLongPress.ts          # Touch/long-press detection
│   ├── usePOSTabs.ts            # Multi-tab POS state management
│   ├── useColumnReorder.ts      # Table column drag reordering
│   └── useTheme.ts              # Theme management
│
├── utils/              # Utility Functions
│   ├── searchUtils.ts           # Search & filtering helpers
│   ├── expiryUtils.ts           # Expiry date calculations
│   ├── themeStyles.ts           # Shared style constants
│   ├── barcodeEncoders.ts       # Barcode encoding utilities
│   └── printing/                # Print utilities subfolder
│
├── data/               # Static Data & Constants
│   ├── locations.ts             # Governorate/City/Area data
│   ├── areas.ts                 # Area codes and names
│   ├── countryCodes.ts          # Phone country codes
│   └── productCategories.ts     # Product category definitions
│
├── config/             # Configuration Files
│   ├── menuData.ts              # Menu structure definition
│   └── pageRegistry.ts          # Page → Props mapping
│
├── i18n/               # Internationalization
│   ├── translations.ts          # General UI text (EN + AR)
│   ├── menuTranslations.ts      # Menu/navigation text
│   └── helpInstructions.ts      # Help & tooltip content
│
├── types/              # TypeScript Definitions
│   └── index.ts                 # All type exports
│
├── public/             # Static Assets
│   └── sounds/                  # Audio files for POS
│
└── Config Files
    ├── tailwind.config.js       # Tailwind CSS configuration
    ├── postcss.config.js        # PostCSS configuration
    ├── vite.config.ts           # Vite build configuration
    └── tsconfig.json            # TypeScript configuration
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
*   `i18n/helpInstructions.ts`: Help content & tooltips.

#### Forbidden ❌
*   Hardcoded English string: `<div>Total</div>`
*   String concatenation: `"Hello " + name`

#### Required ✅
*   **Strict Typing**: NEVER use `any`. Use `t: typeof TRANSLATIONS.EN.moduleName`.
*   **Friendly Tone**: Use human-centric, polite, and clear language.
*   **Completeness**: Add keys to `i18n/translations.ts` immediately. MUST have both EN and AR values.
*   **Usage**: Use `props.t.key`. No hardcoded strings.

---

### 2. UI/UX & Design

**Goal:** "Premium, Modern, & Dynamic."
All UI elements must look professional. Avoid basic browser defaults.

#### Standard Components (MUST USE)
| Component | Use Case | File |
|-----------|----------|------|
| `SmartInput` | Standard text input | `common/SmartInputs.tsx` |
| `SmartPhoneInput` | Phone number input | `common/SmartInputs.tsx` |
| `SmartEmailInput` | Email input | `common/SmartInputs.tsx` |
| `SmartDateInput` | Date picker | `common/SmartInputs.tsx` |
| `ExpandingDropdown` | Dropdown selection | `common/ExpandingDropdown.tsx` |
| `SegmentedControl` | Segmented buttons | `common/SegmentedControl.tsx` |
| `Switch` | Toggle switch | `common/Switch.tsx` |
| `SearchInput` | Search bar | `common/SearchInput.tsx` |
| `Modal` | Dialog/popup | `common/Modal.tsx` |
| `TanStackTable` | Data tables | `common/TanStackTable.tsx` |
| `ContextMenu` | Right-click menus | `common/ContextMenu.tsx` |

**Forbidden:** Never use HTML `<select>`, raw `<input>`, or `<table>` directly.

#### iOS Safari Compatibility
When using buttons with explicit dimensions, add appearance reset:
```tsx
style={{ WebkitAppearance: 'none', appearance: 'none' }}
```

#### SegmentedControl Variants
Use the `variant` prop based on parent background:
*   `variant="onCard"` (default): For gray-800 card backgrounds
*   `variant="onPage"`: For gray-900 page backgrounds

#### Styling Rules
*   **Close Buttons**: `w-8 h-8 (or w-10 h-10) flex items-center justify-center rounded-full`
*   **Icon Boxes**: Use consistent padding/rounded corners.
*   **Colors**: Use semantic colors from Tailwind config or `index.css`.

---

### 3. Tailwind CSS Configuration

Tailwind is configured locally (not CDN). See `tailwind.config.js`.

**Dynamic Classes**: Use the `safelist` in `tailwind.config.js` for dynamic color classes:
```javascript
// Classes like bg-${theme}-600 are preserved via safelist
```

---

## 🛠️ Workflow: Adding a New Page

1.  **Create Component**: Build your page in `components/[module]/MyPage.tsx`.
    *   Ensure it accepts `color`, `t`, `language`, and data props.
2.  **Register Page**: Add it to `config/pageRegistry.ts`.
    ```typescript
    export const PAGE_REGISTRY = {
      'my-new-page': {
         id: 'my-new-page',
         component: MyPage,
         requiredProps: ['inventory', 'onAddDrug'],
      }
    };
    ```
3.  **Update Menu**: Add entry to `config/menuData.ts`.
4.  **Add Translations**: Update `i18n/menuTranslations.ts` and `i18n/translations.ts`.

---

## 📝 Code Review Checklist

Before submitting:
- [ ] **Inputs**: Using `SmartInputs`? (No raw `<input>`)
- [ ] **Dropdowns**: Using `ExpandingDropdown`?
- [ ] **Segmented Controls**: Using `SegmentedControl` with correct `variant`?
- [ ] **Switches**: Using `Switch` component?
- [ ] **Tables**: Using `TanStackTable`?
- [ ] **Translations**: 100% covered (EN + AR)?
- [ ] **RTL Support**: Tested in Arabic mode?
- [ ] **iOS Safari**: Buttons have `WebkitAppearance: none` if needed?
- [ ] **Props**: Component receives data via props (not importing globals)?
- [ ] **Type Safety**: No `any` types?

---

## 📚 Reference

*   **SmartInputs**: See `components/common/SmartInputs.tsx` for docs.
*   **SegmentedControl**: See `components/common/SegmentedControl.tsx` for variant usage.
*   **Services**: See `services/` for business logic.
*   **Page Registry**: See `config/pageRegistry.ts` for props injection.
*   **Tailwind Config**: See `tailwind.config.js` for safelist and theme.

---

**Build something amazing!** 🚀
