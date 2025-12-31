# Contributing to PharmaFlow AI

## 📂 Project Structure

```
pharmaflow-ai/
├── .agent/             # Agentic AI Configuration
│   └── workflows/
│       ├── enforce-translations.md  # Translation enforcement rules
│       └── new-page-standard.md     # New page creation standards
│
├── components/
│   ├── common/         # Shared UI Components
│   │   ├── SmartInputs.tsx
│   │   │   ├── useSmartDirection()      # Auto-detect RTL/LTR
│   │   │   ├── isValidEmail()           # Email validation
│   │   │   ├── isValidPhone()           # Phone validation
│   │   │   ├── cleanPhone()             # Strip non-digits
│   │   │   ├── SmartInput              # RTL-aware input
│   │   │   ├── SmartDateInput          # MM/YY masked date
│   │   │   ├── SmartPhoneInput         # Phone input
│   │   │   ├── SmartEmailInput         # Email input
│   │   │   └── SmartAutocomplete       # Autocomplete with ghost text
│   │   │
│   │   ├── SegmentedControl.tsx
│   │   │   └── SegmentedControl        # iOS-style segment picker
│   │   │
│   │   ├── Switch.tsx                   # Toggle switch
│   │   │
│   │   ├── TanStackTable.tsx
│   │   │   ├── fuzzyFilter()            # Fuzzy search filter
│   │   │   └── TanStackTable           # Advanced data table
│   │   │
│   │   ├── ExpandingDropdown.tsx
│   │   │   └── ExpandingDropdown       # Animated dropdown
│   │   │
│   │   ├── ContextMenu.tsx
│   │   │   ├── useContextMenu()         # Hook for manual trigger
│   │   │   ├── useContextMenuTrigger()  # Event handlers hook
│   │   │   ├── ContextMenuProvider     # Wrap app to enable
│   │   │   └── ContextMenuTrigger      # Wrapper component
│   │   │
│   │   ├── DatePicker.tsx
│   │   │   └── DatePicker              # Date + time picker
│   │   │
│   │   ├── Modal.tsx
│   │   │   └── Modal                   # Portal-based dialog
│   │   │
│   │   ├── SearchInput.tsx
│   │   │   └── SearchInput             # Search with clear button
│   │   │
│   │   ├── Toast.tsx                    # Notification toasts
│   │   ├── HelpModal.tsx                # Help modal
│   │   └── hooks/
│   │
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   │   └── NavbarComponent         # Top navigation + profile
│   │   │
│   │   ├── SidebarMenu.tsx
│   │   │   └── SidebarMenu             # Collapsible side nav
│   │   │
│   │   ├── SidebarDropdown.tsx          # Submenu dropdown
│   │   ├── TabBar.tsx
│   │   │   ├── SortableTab             # Draggable tab
│   │   │   └── TabBar                  # Multi-tab manager
│   │   │
│   │   └── DashboardIcon.tsx            # Custom icon component
│   │
│   ├── dashboard/
│   │   ├── Dashboard.tsx                # Main dashboard
│   │   └── RealTimeSalesMonitor.tsx     # Live sales chart
│   │
│   ├── sales/
│   │   ├── POS.tsx                      # Point of Sale
│   │   ├── CashRegister.tsx             # Cash management
│   │   ├── SalesHistory.tsx             # History + returns
│   │   ├── ReceiptDesigner.tsx          # Receipt templates
│   │   ├── ReturnModal.tsx              # Process returns
│   │   ├── ReturnHistory.tsx            # Return logs
│   │   ├── ShiftHistory.tsx             # Shift logs
│   │   ├── SortableCartItem.tsx         # Drag cart items
│   │   └── InvoiceTemplate.ts           # Invoice generator
│   │
│   ├── inventory/
│   │   ├── Inventory.tsx                # Product list
│   │   ├── BarcodeStudio.tsx            # Barcode designer
│   │   ├── BarcodePrinter.tsx           # Print queue
│   │   ├── BarcodePreview.tsx           # Preview component
│   │   ├── LabelPrinter.ts
│   │   │   └── printLabels()            # Send to printer
│   │   ├── StockAdjustment.tsx          # Stock corrections
│   │   └── AddProduct.tsx               # Add product form
│   │
│   ├── purchases/
│   │   ├── Purchases.tsx                # Purchase orders
│   │   ├── PurchaseReturns.tsx          # Supplier returns
│   │   ├── SuppliersList.tsx            # Supplier CRUD
│   │   ├── Suppliers.tsx                # Overview
│   │   └── PendingApproval.tsx          # Approval queue
│   │
│   ├── customers/
│   │   ├── CustomerManagement.tsx       # Full management
│   │   ├── CustomerOverview.tsx         # Stats dashboard
│   │   ├── CustomerLoyaltyOverview.tsx  # Loyalty stats
│   │   └── CustomerLoyaltyLookup.tsx    # Lookup by phone
│   │
│   ├── ai/
│   │   └── AIAssistant.tsx              # Chat interface
│   │
│   └── test/
│       └── POSTest.tsx                  # POS variant
│
├── hooks/
│   ├── useExpandingDropdown.ts
│   │   └── useExpandingDropdown()       # Keyboard nav for dropdowns
│   │
│   ├── useLongPress.ts
│   │   └── useLongPress()               # Touch long-press detection
│   │
│   ├── usePOSTabs.ts
│   │   └── usePOSTabs()                 # Multi-tab POS state
│   │
│   ├── useColumnReorder.ts
│   │   └── useColumnReorder()           # Table column DnD
│   │
│   ├── useDebounce.ts
│   │   └── useDebounce()                # Debounce values
│   │
│   └── useTheme.ts
│       └── useTheme()                   # Apply theme CSS vars
│
├── utils/
│   ├── searchUtils.ts                   # Search helpers
│   ├── expiryUtils.ts                   # Expiry calculations
│   ├── themeStyles.ts                   # Style constants
│   ├── barcodeEncoders.ts               # Barcode encoding
│   └── printing/                        # Print utilities
│
├── data/
│   ├── locations.ts                     # Egypt governorates
│   ├── areas.ts                         # Area codes
│   ├── countryCodes.ts                  # Phone codes
│   └── productCategories.ts             # Categories + types
│
├── config/
│   ├── menuData.ts                      # Menu structure
│   └── pageRegistry.ts                  # Page → Props map
│
├── i18n/
│   ├── translations.ts                  # UI text (EN + AR)
│   ├── menuTranslations.ts              # Menu text
│   └── helpInstructions.ts              # Help content
│
├── types/
│   └── index.ts                         # Type exports
│
├── public/
│   └── sounds/                          # POS audio files
│
└── Config Files
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.ts
    └── tsconfig.json
```

---

## 🏗️ Architecture & Data Flow

### 1. State Management (Current)

Currently, **`App.tsx`** acts as the central store for the application.

- **State**: Held in `App.tsx` (`inventory`, `sales`, `customers`, etc.).
- **Access**: Data is passed down to pages via **Props** defined in `config/pageRegistry.ts`.
- **Updates**: Handler functions (e.g., `onAddDrug`, `onCompleteSale`) are passed down as props.

### 2. Service Layer

While state is in `App.tsx`, complex business logic and data persistence should be handled by **Services** (`services/*`).

- **Do not** write complex calculations inside UI components. Move them to services.
- **Do not** access `localStorage` directly in components.

---

## 🚨 Mandatory Standards

### 1. Internationalization (i18n)

**RULE:** All user-facing text MUST be internationalized.
**AR (Arabic) translation is MANDATORY for every new key.**

#### Files

- `i18n/translations.ts`: General UI text.
- `i18n/menuTranslations.ts`: Sidebar & Menu items.
- `i18n/helpInstructions.ts`: Help content & tooltips.

#### Forbidden ❌

- Hardcoded English string: `<div>Total</div>`
- String concatenation: `"Hello " + name`

#### Required ✅

- **Strict Typing**: NEVER use `any`. Use `t: typeof TRANSLATIONS.EN.moduleName`.
- **Friendly Tone**: Use human-centric, polite, and clear language.
- **Completeness**: Add keys to `i18n/translations.ts` immediately. MUST have both EN and AR values.
- **Usage**: Use `props.t.key`. No hardcoded strings.

---

### 2. UI/UX & Design

**Goal:** "Premium, Modern, & Dynamic."
All UI elements must look professional. Avoid basic browser defaults.

#### Standard Components (MUST USE)

| Component           | Use Case            | File                           |
| ------------------- | ------------------- | ------------------------------ |
| `SmartInput`        | Standard text input | `common/SmartInputs.tsx`       |
| `SmartPhoneInput`   | Phone number input  | `common/SmartInputs.tsx`       |
| `SmartEmailInput`   | Email input         | `common/SmartInputs.tsx`       |
| `SmartDateInput`    | Date picker         | `common/SmartInputs.tsx`       |
| `ExpandingDropdown` | Dropdown selection  | `common/ExpandingDropdown.tsx` |
| `SegmentedControl`  | Segmented buttons   | `common/SegmentedControl.tsx`  |
| `Switch`            | Toggle switch       | `common/Switch.tsx`            |
| `SearchInput`       | Search bar          | `common/SearchInput.tsx`       |
| `Modal`             | Dialog/popup        | `common/Modal.tsx`             |
| `TanStackTable`     | Data tables         | `common/TanStackTable.tsx`     |
| `ContextMenu`       | Right-click menus   | `common/ContextMenu.tsx`       |
| `Navbar`            | Top Navigation      | `layout/Navbar.tsx`            |
| `Sidebar`           | Side Navigation     | `layout/Sidebar.tsx`           |

**Forbidden:** Never use HTML `<select>`, raw `<input>`, or `<table>` directly.

#### iOS Safari Compatibility

When using buttons with explicit dimensions, add appearance reset:

```tsx
style={{ WebkitAppearance: 'none', appearance: 'none' }}
```

#### SegmentedControl Variants

Use the `variant` prop based on parent background:

- `variant="onCard"` (default): For gray-800 card backgrounds
- `variant="onPage"`: For gray-900 page backgrounds

#### Styling Rules

- **Close Buttons**: `w-8 h-8 (or w-10 h-10) flex items-center justify-center rounded-full`
- **Icon Boxes**: Use consistent padding/rounded corners.
- **Colors**: Use semantic colors from Tailwind config or `index.css`.

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
    - Ensure it accepts `color`, `t`, `language`, and data props.
2.  **Register Page**: Add it to `config/pageRegistry.ts`.
    ```typescript
    export const PAGE_REGISTRY = {
      "my-new-page": {
        id: "my-new-page",
        component: MyPage,
        requiredProps: ["inventory", "onAddDrug"],
      },
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

- **SmartInputs**: See `components/common/SmartInputs.tsx` for docs.
- **SegmentedControl**: See `components/common/SegmentedControl.tsx` for variant usage.
- **Services**: See `services/` for business logic.
- **Page Registry**: See `config/pageRegistry.ts` for props injection.
- **Tailwind Config**: See `tailwind.config.js` for safelist and theme.

---

**Build something amazing!** 🚀
