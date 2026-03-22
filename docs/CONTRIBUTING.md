# Contributing to Zinc

## 📂 Project Structure

```
zinc/
├── .agent/             # Agentic AI Configuration
│   └── workflows/
│       ├── enforce-translations.md  # Translation enforcement rules
│       └── new-page-standard.md     # New page creation standards
│
├── components/
│   ├── features/
│   │   └── alerts/
│   │       ├── AlertContext.tsx        # Centralized notifications
│   │       └── AlertsAndAds.tsx        # Status bar UI
│   │
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
│   │   ├── FilterDropdown.tsx
│   │   │   └── FilterDropdown       # Animated dropdown
│   │   │
│   │   ├── FloatingInput.tsx           # Input with floating label
│   │   ├── ExpandedModal.tsx           # Full screen modal wrapper
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
│   │   ├── ScreenCalibration.tsx       # Screen sizing helper
│   │   ├── TableAlignment.tsx          # Table content alignment
│   │   ├── HelpModal.tsx               # Help modal
│   │   ├── AnimatedCounter.tsx         # Numbers with roll animation
│   │   ├── ChartWidget.tsx             # Standard Area/Bar chart
│   │   ├── SmallCard.tsx               # Simple stat card
│   │   ├── ProgressCard.tsx            # Multi-goal progress bar
│   │   └── CompactProgressCard.tsx     # Half-height stacking card
│   │
│   ├── skeletons/
│   │   ├── PageSkeletonRegistry.tsx     # Skeleton lookup by view
│   │   └── GenericSkeleton.tsx          # Fallback loader
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
│   │   ├── DashboardSkeletons.tsx       # Loading skeletons
│   │   └── RealTimeSalesMonitor.tsx     # Live sales chart
│   │
│   ├── reports/
│   │   └── LoginAuditList.tsx           # Audit table with translation logic
│   │
│   ├── intelligence/
│   │   ├── audit/
│   │   │   ├── AuditPage.tsx            # Audit Dashboard
│   │   │   └── TransactionLogGrid.tsx   # Audit Table
│   │   ├── financials/
│   │   │   └── FinancialsPage.tsx       # Profit/Loss Analytics
│   │   ├── procurement/
│   │   │   └── ProcurementPage.tsx      # Stock Reordering
│   │   └── risk/
│   │       └── RiskPage.tsx             # Expiry & Stagnant Stock
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
│   ├── hr/
│   │   ├── EmployeeList.tsx             # Employee directory
│   │   └── EmployeeProfile.tsx          # Employee details & stats
│   │
│   ├── settings/
│   │   └── PrinterSettings.tsx          # Printer configuration
│   │
│   ├── experiments/                     # Experimental features
│   │   ├── DashboardExperiments.tsx
│   │   └── ExpandedChartModal.tsx
│   │
│   ├── ai/
│   │   └── AIAssistant.tsx              # Chat interface
│   │
│   └── test/
│       ├── POSTest.tsx                  # POS variant
│       └── LoginTest.tsx                # Testing authentication
│
├── services/
│   ├── api/                         # API Clean Clients
│   ├── auth/                        # Authentication & Session
│   │   ├── authService.ts           # Login/Logout/Session
│   │   │   ├── logAuditEvent()      # Audit logger
│   │   │   ├── getLoginHistory()    # History retriever
│   │   │   └── login/logout()       # Auth actions
│   │   ├── hashUtils.ts             # SHA-256 hashing
│   │   └── index.ts                 # Barrel export
│   ├── sales/                       # Sales & POS Logic
│   ├── inventory/                   # Stock & Product Logic
│   │   ├── inventoryService.ts      # Main inventory service
│   │   └── batchService.ts          # FEFO batch stock management
│   ├── hr/                          # Employee Management
│   ├── finance/                     # Financial Transactions
│   ├── customers/                   # Customer CRM
│   ├── suppliers/                   # Supplier Relations
│   ├── purchases/                   # Procurement Logic
│   ├── returns/                     # Return Handling
│   │   └── returnService.ts         # Return operations logic
│   ├── sync/                        # Synchronization
│   │   └── syncEngine.ts            # Local/Remote sync engine
│   ├── settings/                    # App Configuration
│   ├── migration/                   # Data Migration & Upgrades
│   │   ├── migrationService.ts      # Migration logic
│   │   └── index.ts                 # Barrel export
│   ├── DataContext.tsx              # Unifying Data Provider
│   ├── timeService.ts               # NTP Time Sync
│   ├── geminiService.ts             # AI Integration
│   ├── auditService.ts              # System audit logging
│   └── salesHelpers.ts              # Cartesian product & cart utils
│
├── hooks/
│   ├── useAppState.ts
│   │   └── useAppState()                # View & UI state management
│   ├── useAuth.ts
│   │   └── useAuth()                    # Authentication & route guards
│   ├── useNavigation.ts
│   │   └── useNavigation()              # Navigation handlers & menu filtering
│   ├── useEntityHandlers.ts
│   │   └── useEntityHandlers()          # CRUD handlers for all entities
│   ├── useFilterDropdown.ts
│   │   └── useFilterDropdown()          # Keyboard nav for dropdowns
│   ├── useLongPress.ts
│   │   └── useLongPress()               # Touch long-press detection
│   ├── usePOSTabs.ts
│   │   └── usePOSTabs()                 # Multi-tab POS state
│   ├── useColumnReorder.ts
│   │   └── useColumnReorder()           # Table column DnD
│   ├── useDebounce.ts
│   │   └── useDebounce()                # Debounce values
│   ├── useTheme.ts
│   │   └── useTheme()                   # Apply theme CSS vars
│   ├── useShift.tsx
│   │   └── useShift()                   # Shift management
│   ├── usePersistedState.ts
│   │   └── usePersistedState()          # Trusted storage hook
│   ├── useSmartPosition.ts              # Popover positioning
│   ├── usePrinter.ts                    # Printer hook
│   ├── useDynamicTickerData.ts          # Ticker data hook
│   └── useProcurement.ts                # Procurement operations
│
├── utils/
│   ├── searchUtils.ts                   # Search helpers
│   ├── expiryUtils.ts                   # Expiry calculations
│   ├── themeStyles.ts                   # Style constants
│   ├── barcodeEncoders.ts               # Barcode encoding
│   ├── storage.ts                       # TYPE-SAFE STORAGE SERVICE
│   ├── qzPrinter.ts                     # QZ Tray printer utilities
│   ├── inventory.ts                     # Inventory formatters & validators
│   │   └── validateStock()              # Stock validation
│   ├── shiftHelpers.ts                  # Shift transaction utilities
│   │   └── addTransactionToOpenShift()  # Update shift with transaction
│   ├── loyaltyPoints.ts                 # Loyalty points calculator
│   │   └── calculateLoyaltyPoints()     # Tiered points calculation
│   ├── drugDisplayName.ts               # Drug name formatting utility
│   │   ├── getDisplayName()             # Format drug name + dosage form
│   │   └── getFullDisplayName()         # Include strength in display
│   └── printing/                        # Print utilities
│
├── data/
│   ├── locations.ts                     # Egypt governorates
│   ├── areas.ts                         # Area codes
│   ├── countryCodes.ts                  # Phone codes
│   ├── productCategories.ts             # Categories + types
│   └── sample-inventory.ts              # Initial seed data
│
├── config/
│   ├── permissions.ts                   # RBAC Role Definitions
│   │   ├── canPerformAction()           # Permission check hook
│   │   └── ROLE_PERMISSIONS             # Role-to-action mapping
│   ├── menuData.ts                      # Menu structure
│   ├── pageRegistry.ts                  # Page → Props map
│   ├── storageKeys.ts                   # STORAGE KEY CONSTANTS
│   ├── themeColors.ts                   # Theme palettes
│   ├── fonts.ts                         # Font definitions
│   └── routes.ts                        # Route constants & test routes
│
├── i18n/
│   ├── translations.ts                  # UI text (EN + AR)
│   ├── menuTranslations.ts              # Menu text
│   ├── helpInstructions.ts              # Help content
│   └── index.ts                         # i18n Exports
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

### 1. State Management & Data Flow

The application uses an **Offline-First, Hybrid State Management** approach:

1.  **Global UI State** (`App.tsx` & `SettingsContext`):
    - Managed via `usePersistedState` hook (auto-syncs to `localStorage`).
    - Includes view state, active module, theme, and language preferences.

2.  **Domain Data & Caching** (`DataContext.tsx` & Services):
    - Entities are managed by specialized services (e.g., `inventoryService`, `salesService`) and injected via `DataContext.tsx`.
    - **Caching**: Heavy entities (e.g., Drugs, Employees) use dedicated cache services (`drugCacheService.ts`, `employeeCacheService.ts`) for instant access.
    - Data flows: `Service` (Fetch/Cache) → `Context` (Store) → `Component` (View/Hook).
    - Access data via centralized hooks like `useData()`, `useAuth()`, or domain-specific hooks (e.g., `useProcurement()`).

### 2. Service Layer & Persistence

**Services (`services/*`) are the designated boundaries for:**

- **Business Logic**: Calculations, validations, and domain rules.
- **Data Persistence**: Local storage engines (IndexedDB via `db.ts`, `localStorage`).
- **API / Storage Interactions**: Network requests.

**Rules:**

- ❌ **Do not** write complex calculations inside components.
- ❌ **Do not** access `localStorage` directly (Use `storage.ts`).

### 3. Synchronization & Concurrency

To ensure reliability in a multi-branch, high-load environment:

- **Sync Engine**: `syncEngine.ts` and `syncQueueService.ts` handle background data synchronization between local state and remote servers.
- **Dead Letter Queue (DLQ)**: Failed sync actions are routed to a DLQ for retry/inspection, ensuring the main queue is not blocked.
- **Optimistic Locking**: Critical operations like batched stock updates (FEFO) employ optimistic locking to prevent race conditions during concurrent sales.

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

| Component             | Use Case             | File                             |
| --------------------- | -------------------- | -------------------------------- |
| `SmartInput`          | Standard text input  | `common/SmartInputs.tsx`         |
| `SmartPhoneInput`     | Phone number input   | `common/SmartInputs.tsx`         |
| `SmartEmailInput`     | Email input          | `common/SmartInputs.tsx`         |
| `SmartDateInput`      | Date input (Masked)  | `common/SmartInputs.tsx`         |
| `FloatingInput`       | Floating label input | `common/FloatingInput.tsx`       |
| `DatePicker`          | Calendar picker      | `common/DatePicker.tsx`          |
| `FilterDropdown`      | Dropdown selection   | `common/FilterDropdown.tsx`      |
| `ExpandedModal`       | Full screen modal    | `common/ExpandedModal.tsx`       |
| `SegmentedControl`    | Segmented buttons    | `common/SegmentedControl.tsx`    |
| `Switch`              | Toggle switch        | `common/Switch.tsx`              |
| `SearchInput`         | Search bar           | `common/SearchInput.tsx`         |
| `Modal`               | Dialog/popup         | `common/Modal.tsx`               |
| `HelpModal`           | Help dialog          | `common/HelpModal.tsx`           |
| `Alerts & Ads`        | Notifications        | `features/alerts`                |
| `TanStackTable`       | Data tables          | `common/TanStackTable.tsx`       |
| `ContextMenu`         | Right-click menus    | `common/ContextMenu.tsx`         |
| `Navbar`              | Top Navigation       | `layout/Navbar.tsx`              |
| `SidebarMenu`         | Side Navigation      | `layout/SidebarMenu.tsx`         |
| `TabBar`              | Tabbed Interface     | `layout/TabBar.tsx`              |
| `StatusBar`           | System Status        | `layout/StatusBar/StatusBar.tsx` |
| `AnimatedCounter`     | Value animation      | `common/AnimatedCounter.tsx`     |
| `ChartWidget`         | Data visualization   | `common/ChartWidget.tsx`         |
| `SmallCard`           | KPI/Stat cards       | `common/SmallCard.tsx`           |
| `ProgressCard`        | Task progress        | `common/ProgressCard.tsx`        |
| `FlexDataCard`        | Distribution data    | `common/ProgressCard.tsx`        |
| `CompactProgressCard` | Multi-stacking stats | `common/CompactProgressCard.tsx` |

**Forbidden:** Never use HTML `<select>`, raw `<input>`, or `<table>` directly.

#### Badge & Status Indicator Design ("The Perfect Way")

To maintain a consistent, premium look for statuses and tags, follow these specs:

- **Container**: `inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border bg-transparent`
- **Typography**: `text-xs font-bold uppercase tracking-wider`
- **Icons**: Always include a `material-symbols-rounded` icon (size `text-sm`).
- **Example**:
  ```tsx
  <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider bg-transparent">
    <span className="material-symbols-rounded text-sm">check_circle</span>
    APPROVED
  </span>
  ```

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

#### Branding & Transitions Standard

To maintain a premium "first impression," the login and splash screens follow a minimalist aesthetic:

- **Minimalist Loading**: Avoid bulky cards or containers during transitions. Use slim progress bars and focused text on a dark background.
- **Official Assets**: Always use official wordmarks (`logo_word_white.svg`) and icons (`logo_icon_white.svg`) instead of text-based titles or generic icons.
- **Realistic Progress**: Transition bars MUST simulate realistic multi-stage loading (use `Math.random()` increments and staged messages).
- **White Accents**: Use white text (`text-white` or `text-white/40`) for loading states to ensure a high-contrast, clean look.

---

### 3. Storage & Persistence

**RULE:** NEVER access `localStorage` directly.
Use the type-safe `StorageService` for all local storage operations.

**Why?**

- Prevents key collisions (via central `StorageKeys` enum).
- Ensures safe JSON parsing & stringifying.
- Provides consistent error handling (try-catch).

#### Usage

```typescript
import { storage } from "../../utils/storage";
import { StorageKeys } from "../../config/storageKeys";

// ✅ Correct: Type-safe and failsafe
const items = storage.get<Item[]>(StorageKeys.INVENTORY, []);
storage.set(StorageKeys.INVENTORY, newItems);

// ❌ Forbidden
localStorage.getItem("inventory");
localStorage.setItem("data", JSON.stringify(data));
```

---

### 4. Tailwind CSS Configuration

Tailwind is configured locally (not CDN). See `tailwind.config.js`.

**Dynamic Classes**: Use the `safelist` in `tailwind.config.js` for dynamic color classes:

```javascript
// Classes like bg-${theme}-600 are preserved via safelist
```

---

### 5. ID Generation (Prefix Strategy)

**RULE:** Do NOT use `Date.now()` or `UUID` for entity IDs.
Use the `idGenerator` utility to ensure unique, readable, and scalable IDs (e.g., `B1-1001`).

#### Why?

- **Multi-Branch Support:** Prevents collisions between branches.
- **Readability:** Easier to reference `B1-0042` than a long timestamp.
- **Self-Healing:** Automatically recovers sequence if storage is cleared.

#### Usage

```typescript
import { idGenerator } from "../../utils/idGenerator";

// ✅ Correct
const newId = idGenerator.generate("sales"); // Returns "B1-0001"

// ❌ Forbidden
const newId = Date.now().toString();
```

---

### 6. Role-Based Access Control (RBAC)

**RULE:** All sensitive actions, pages, and menu items MUST be gated by permissions.

#### Architecture

- **Roles**: Defined in `config/permissions.ts` (e.g., `admin`, `manager`, `pharmacist`).
- **Permissions**: Granular actions (e.g., `inventory.update`, `reports.view_financial`).
- **Helper**: `canPerformAction(role, permission)` checks access.

#### Implementation Steps

1. **Page Protection**: Add `permission` to `PAGE_REGISTRY` in `config/pageRegistry.ts`.

   ```typescript
   'employee-list': {
     // ...
     permission: 'users.view' // Redirects to Access Restricted if user lacks permission
   }
   ```

2. **Menu Visibility**: Add `permission` to `MenuItem` in `config/menuData.ts`.

   ```typescript
   {
     label: "Financial Reports",
     permission: "reports.view_financial" // Hides menu item if user lacks permission
   }
   ```

3. **Component-Level Gating**: Use `canPerformAction` to hide specific buttons/UI.

   ```typescript
   import { canPerformAction } from '../../config/permissions';

   // ... inside component
   {canPerformAction(userRole, 'inventory.delete') && (
     <button onClick={handleDelete}>Delete</button>
   )}
   ```

4. **New Permissions**: Only add new permissions to `config/permissions.ts` if a suitable one doesn't exist. Update `ALL_PERMISSIONS` and `ROLE_PERMISSIONS` accordingly.

---

### 7. Audit Logging & Localization

**RULE:** System activities (Login, Switch User, Logout) MUST be logged with localized details.

#### The `translateDetails` Pattern

When logging dynamic events (e.g., "Switched from Employee A"), do not log translated strings. Log the **English pattern** and translate it in the view layer.

- **Service**: `authService.logAuditEvent({ ..., details: "Switched from name" })`
- **Component**: Use `translateDetails(row.details)` in the table cell.
- **Translation**: Define regex patterns in `translations.ts` under `loginAudit.detailPatterns`.

#### Avatar & Photos

- **System Actions**: Use the application logo icon for system/admin actions.
- **Employee Actions**: Always include `employeeId` in audit entries. The `LoginAuditList` component automatically resolves this ID to a photo or initial using the `useData()` hook.

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
- [ ] **Dropdowns**: Using `FilterDropdown`?
- [ ] **Segmented Controls**: Using `SegmentedControl` with correct `variant`?
- [ ] **Switches**: Using `Switch` component?
- [ ] **Storage**: Using `StorageService`? (No `localStorage`)
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
- **StorageService**: See `utils/storage.ts` for persistence.
- **Services**: See `services/` for business logic.
- **Page Registry**: See `config/pageRegistry.ts` for props injection.
- **Tailwind Config**: See `tailwind.config.js` for safelist and theme.

---

**Build something amazing!** 🚀
