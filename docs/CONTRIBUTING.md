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

#### Dynamic Texts & Error Codes

- ❌ **Forbidden**: Hardcoded English or Arabic strings (`<div>Total</div>` or `"Hello " + name`).
- ✅ **Required**: Use structural translation keys (`t: typeof TRANSLATIONS.EN.moduleName`).
- **Backend Errors**: The backend MUST return unified `errorCode` (e.g., `ERR_INSUFFICIENT_STOCK`). The frontend is responsible for translating these codes via `i18n`. Never pass translated messages directly from the server.
- **Namespaces**: For large modules, clearly namespace keys (e.g., `POS.CART_EMPTY`, `INVENTORY.ADD_ITEM_SUCCESS`) to maintain readability.

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

#### Interaction & Animation

- Use `framer-motion` for meaningful micro-interactions (e.g., button presses, modal popups). Avoid heavy animations that might drop frames on point-of-sale machines.
- **POS Design Philosophy**: For Point-of-Sale interfaces, prioritize large touch targets, keyboard shortcuts over mouse navigation, and eliminate unnecessary scrolling.

#### Badge & Status Indicator Design

- **Container**: `inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border bg-transparent`
- **Typography**: `text-xs font-bold uppercase tracking-wider`
- **Icons**: Always include a `material-symbols-rounded` icon (size `text-sm`).

#### iOS Safari Compatibility

When using buttons with explicit dimensions, add appearance reset:

```tsx
style={{ WebkitAppearance: 'none', appearance: 'none' }}
```

---

### 3. Storage & Persistence

**RULE:** NEVER access `localStorage` directly.
Use the type-safe `StorageService` or Local/IndexedDB engines via `db.ts`.

#### Persistence Strategy

1. **`localStorage` via `storage.ts`**: Reserved strictly for lightweight UI state (theme, language, selected branch, auth tokens).
2. **IndexedDB via `db.ts`**: Used for heavy datasets requiring fast offline querying (e.g., local inventory cache, offline transaction queues).

#### Usage Examples

```typescript
import { storage } from "../../utils/storage";
import { StorageKeys } from "../../config/storageKeys";

// ✅ Correct: Type-safe and failsafe
const items = storage.get<Item[]>(StorageKeys.INVENTORY, []);
storage.set(StorageKeys.INVENTORY, newItems);
```

---

### 4. Tailwind CSS Configuration

Tailwind is configured locally. See `tailwind.config.js`.

**Semantic Theming**:

- ❌ **Forbidden**: Using hardcoded utility colors for structural UI (`bg-red-500`, `text-blue-600`).
- ✅ **Required**: Use semantic variables (`bg-primary`, `text-destructive`, `bg-card`) which seamlessly support Light/Dark transitions.

**Dynamic Classes**:
Use the `safelist` in `tailwind.config.js` for dynamic color classes:

```javascript
// Classes like bg-${theme}-600 are preserved via safelist
```

---

### 5. ID Generation (Prefix Strategy)

**RULE:** Do NOT use `Date.now()` or `UUID` directly for entity IDs.
Use the `idGenerator` utility to ensure unique, readable, and scalable IDs (e.g., `B1-1001`).

#### Why?

- **Multi-Branch Support:** Prevents collisions across branches entirely.
- **Readability:** Easier to reference `B1-0042` than a long, opaque UUID.
- **Self-Healing:** Automatically recovers sequence if storage is cleared.

#### ID Format Strategy

All critical transactions and entities generate IDs conforming to the local branch shard:
`[BranchCode]-[Sequence]-[RandomSuffix]`
This guarantees global uniqueness when data eventually syncs to the central database.

---

### 6. Role-Based Access Control (RBAC) & ABAC

**RULE:** All sensitive actions, pages, and menu items MUST be gated by permissions.

#### Architecture

- **Roles**: Defined in `config/permissions.ts` (e.g., `admin`, `manager`, `pharmacist`).
- **Permissions**: Granular actions (e.g., `inventory.update`, `reports.view_financial`).
- **Helper**: `canPerformAction(role, permission)` checks access.
- **Attribute-Based Rules (ABAC)**: For context-sensitive checks (e.g., "Cashier can only void a transaction if it belongs to their active shift"), supplement RBAC with explicit state-checks.

#### Implementation Steps

1. **Page Protection**: Add `permission` to `PAGE_REGISTRY` in `config/pageRegistry.ts`.
2. **Menu Visibility**: Add `permission` to `MenuItem` in `config/menuData.ts`.
3. **Component-Level Gating**: Use `canPerformAction` to conditionally render buttons.

---

### 7. Audit Logging & Localization

**RULE:** System activities (Login, Switch User, Logout, Financial Changes) MUST be logged securely and symmetrically.

#### Event Payload Structure

Every audit event should strive to capture context deterministically:

- `actor_id` (Who?)
- `action` (What?)
- `entity_type` & `entity_id` (On what?)
- `branch_id` (Where?)
- `timestamp` (When?)

#### The `translateDetails` Pattern

When logging dynamic events (e.g., "Switched from Employee A"), **do not log translated strings**. Log the **English pattern/metadata** and translate it in the view layer via `translateDetails(row.details)`.

#### Avatar & Photos

- **System Actions**: Use the application logo icon.
- **Employee Actions**: Always include `employeeId` to resolve photos dynamically in the log table.

---

### 8. Synchronization & Offline-First Protocol

**RULE:** The system must function gracefully without an active internet connection.

- **Offline Queues**: All mutating API actions (Sales, Inventory Adjustments) must be dispatched through the queue, not awaited directly over the network.
- **Dead Letter Queue (DLQ)**: Failed syncs must route to a DLQ state rather than perpetually blocking the main queue. The user interface must flag these for manual review or automated retries.
- **Conflict Resolution**: The client dictates local state, and conflicts on sync (e.g., negative stock on server) should leverage Optimistic Locking techniques.

---

### 9. State Management & Hooks

**RULE:** Preserve the Separation of Concerns (SoC) between UI logic and Data logic.

- ❌ **Forbidden**: Calling `api.get()` or `api.post()` directly within a React Component `useEffect` or button handler.
- ✅ **Required**: Use domain hooks (e.g., `useEntityHandlers`, `useProcurement`) which internally manage caching, syncing, and dispatching.
- **Internal Component State**: Limit the use of `useState` strictly to UI-only state (e.g., modal open/close).

---

### 10. AI Integration & LLM Guidelines

**RULE:** AI functionality (`geminiService.ts`, `AIAssistant`) should act as an accelerator, not a hard business constraint.

- **Prompt Engineering**: Prompts must be context-rich and strictly formatted (e.g., demanding valid JSON outputs to prevent parsing crashes).
- **Graceful Degradation**: If the AI endpoint rate-limits or fails, the core system workflow MUST have a non-AI fallback.
- **Security Check**: Never pass un-sanitized PII or credentials in LLM prompts.

---

### 11. Error Handling & Validation

**RULE:** Fail predictably. Catch early.

- **Boundary Protection**: Use React `<ErrorBoundary>` wrappers around critical modules (e.g., the POS grid) so a single bug doesn't crash the entire app shell.
- **Zod Validations**: Input data MUST be schema-validated using Zod at the boundary (before calling services or syncing) to guarantee type safety at runtime.
- **User-Friendly Errors**: Raw exception text (e.g., `TypeError: Failed to fetch`) should never reach the UI. Catch at the service boundary and convert to a `TRANSLATIONS` warning toast via `AlertContext`.

---

## 🛠️ Workflow: Adding a New Page

1.  **Create Component**: Build your page in `components/[module]/MyPage.tsx`.
    - Ensure it uses `useData()` from `DataContext` for global state and `useEntityHandlers()` for domain logic.
    - Wrap the page export in an `<ErrorBoundary>` if it controls critical workflows.
2.  **Add Skeleton**: Create a loading state in `components/skeletons/` and map it in `PageSkeletonRegistry.tsx`.
3.  **Define Permissions**: If the page is restricted, define the new permission in `config/permissions.ts`.
4.  **Register Page**: Add it to `config/pageRegistry.ts`.
    ```typescript
    export const PAGE_REGISTRY = {
      "my-new-page": {
        id: "my-new-page",
        component: MyPage,
        permission: "module.view", // RBAC protection
      },
    };
    ```
5.  **Update Menu**: Add an entry to `config/menuData.ts`.
6.  **Add Translations**: Update `i18n/menuTranslations.ts` and `i18n/translations.ts` (Both EN & AR).

---

## 📝 Code Review Checklist

Before submitting code, ensure:

- [ ] **Data Safety**: Using `db.ts` or `storage.ts`? (No raw `localStorage`)
- [ ] **Offline-First**: Mutating actions are dispatched to an offline queue mechanism?
- [ ] **Data Validation**: API boundaries and form inputs use `zod` schema validation?
- [ ] **State Management**: Using `useData` for shared state, limiting `useState` to pure UI toggles?
- [ ] **UI Components**:
  - Using `SmartInputs`? (No raw `<input>`)
  - Using `FilterDropdown` and `TanStackTable`?
- [ ] **Translations**: 100% coverage (EN + AR)? No dynamic string concatenation for text?
- [ ] **RBAC**: Sensitive UI buttons explicitly use `canPerformAction`?
- [ ] **Error Handling**: Wrapped in `<ErrorBoundary>`? Errors logged and translated via `AlertContext` instead of crashing the view?

---

## 📚 Reference

- **Storage & IndexedDB**: See `utils/storage.ts` and `services/db.ts`.
- **Sync Engine**: See `services/sync/syncEngine.ts` and `syncQueueService.ts`.
- **Entity Handlers & Hooks**: See `hooks/useEntityHandlers.ts`.
- **SmartInputs**: See `components/common/SmartInputs.tsx` for robust form docs.
- **SegmentedControl**: See `components/common/SegmentedControl.tsx` for variant usage.
- **Page Registry**: See `config/pageRegistry.ts` for route injection.
- **Tailwind Config**: See `tailwind.config.js` for safelists and semantic variables.

---

**Build something amazing!** 🚀
