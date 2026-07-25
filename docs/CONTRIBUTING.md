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
│   ├── timeService.ts               # NTP Time Sync
│   ├── geminiService.ts             # AI Integration
│   ├── auditService.ts              # System audit logging
│   └── salesHelpers.ts              # Cartesian product & cart utils
│
├── hooks/
│   ├── queries/                        # React Query domain hooks
│   │   ├── useInventoryQuery.ts        # useInventory(), useBatches(), useSuppliers()
│   │   ├── useSalesQuery.ts            # useRecentSales(), useTodaySales()
│   │   ├── usePurchasesQuery.ts        # usePurchases(), usePurchase()
│   │   ├── useCustomersQuery.ts        # useCustomers()
│   │   ├── useEmployeesQuery.ts        # useEmployees()
│   │   ├── useBranchesQuery.ts         # useBranches()
│   │   ├── useReturnsQuery.ts          # useSalesReturns(), usePurchaseReturns()
│   │   └── useOrgQuery.ts              # useActiveOrg()
│   │
│   ├── mutations/                      # React Query mutation hooks
│   │   ├── useInventoryMutations.ts    # useAddProduct(), useUpdateProduct()
│   │   ├── useSalesMutations.ts        # useCompleteSale(), useAddSale()
│   │   ├── usePurchaseMutations.ts     # useAddPurchase(), useApprovePurchase()
│   │   ├── useReturnsMutations.ts      # useProcessSalesReturn(), useCreatePurchaseReturn()
│   │   ├── useCustomerMutations.ts     # useAddCustomer(), useUpdateCustomer()
│   │   └── useEmployeeMutations.ts     # useAddEmployee(), useUpdateEmployee()
│   │
│   ├── realtime/
│   │   └── useRealtimeSync.ts          # Supabase → invalidateQueries
│   │
│   ├── stores/                         # Zustand state management
│   │   ├── authStore.ts                # activeBranchId, currentEmployee, switchBranch
│   │   ├── posStore.ts                 # Cart items, checkout state
│   │   └── uiStore.ts                  # Sidebar, theme, language
│   │
│   ├── useAppState.ts                  # View & UI state management
│   ├── useAuth.ts                      # Authentication & route guards
│   ├── useNavigation.ts                # Navigation handlers & menu filtering
│   ├── useEntityHandlers.ts            # Legacy CRUD handlers (AuthenticatedContent only)
│   ├── useFilterDropdown.ts            # Keyboard nav for dropdowns
│   ├── useLongPress.ts                 # Touch long-press detection
│   ├── usePOSTabs.ts                   # Multi-tab POS state
│   ├── useColumnReorder.ts             # Table column DnD
│   ├── useDebounce.ts                  # Debounce values
│   ├── useTheme.ts                     # Apply theme CSS vars
│   ├── useShift.tsx                    # Shift management
│   ├── usePersistedState.ts            # Trusted storage hook
│   ├── useSmartPosition.ts             # Popover positioning
│   ├── usePrinter.ts                   # Printer hook
│   ├── useDynamicTickerData.ts         # Ticker data hook
│   └── useProcurement.ts               # Procurement operations
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

## SHORT DIRECTORY STRUCTURE

```
pharmaflow-ai/
├── App.tsx                          # Root orchestrator component
├── index.tsx                        # Entry point
├── index.html
├── vite.config.ts                   # Vite config (React + Tailwind v4)
├── tsconfig.json
├── components.json                  # Shadcn/ui config
├── biome.json                       # Linter/formatter config
│
├── src/                             # Minimal src (types/styles only)
│   ├── types/                       # Generated Supabase types
│   └── styles/
│
├── api/                             # Vercel serverless API
│   └── time.ts                      # GET /api/time (server timestamp)
│
├── config/                          # Application configuration
│   ├── routes.ts                    # Route constants (ViewState enum)
│   ├── pageRegistry.ts              # Lazy-loaded page registry (60+ pages)
│   ├── menuData.ts                  # Sidebar menu structure (13 modules)
│   ├── permissions.ts               # RBAC permissions & role-permission maps
│   ├── permissionsMapping.ts        # Page-to-permission mapping
│   ├── employeeRoles.ts             # User role definitions
│   ├── storageKeys.ts               # localStorage key constants
│   ├── themeColors.ts               # Theme color definitions
│   ├── layoutConfig.ts              # Layout configuration
│   ├── fonts.ts                     # Font configuration
│   └── index.ts                     # Barrel export
│
├── types/                           # Domain type definitions (18 files)
│   ├── index.ts                     # Barrel export
│   ├── actions.ts                   # ActionContext (performer, branch, shift)
│   ├── auth.ts                      # UserSession, LoginAuditEntry, registration
│   ├── cash.ts                      # CashTransaction, Shift
│   ├── common.ts                    # ThemeColor, Language, ViewState, DateRange, AuditLog
│   ├── customers.ts                 # Customer
│   ├── expense.ts                   # Expense, ExpenseSummary
│   ├── hr.ts                        # Employee, AttendanceEvent, UserProfile, EmploymentRequest
│   ├── intelligence.ts              # ProcurementItem, ExpiryRiskItem, Financial KPIs, AuditTransaction
│   ├── inventory.ts                 # Drug, GlobalDrug, GroupedDrug, StockBatch, BatchAllocation, StockMovement, DrugApproval
│   ├── locationTypes.ts             # Location, City, Area
│   ├── org.ts                       # Organization, OrgMember, Subscription, Branch
│   ├── purchases.ts                 # Purchase, PurchaseItem, PurchaseTab, PurchaseReturn
│   ├── returns.ts                   # Return, ReturnItem, ReturnPolicy
│   ├── sales.ts                     # Sale, SaleItem, SaleItemBatch, CartItem, SaleTab, OrderModification
│   ├── suppliers.ts                 # Supplier
│   └── templates.ts                 # MarketplaceTemplate
│
├── stores/                          # Zustand state stores (4 stores)
│   ├── authStore.ts                 # Auth/branch/org state, switchBranch/switchOrg/reinitialize
│   ├── posStore.ts                  # POS cart, checkout, tab management
│   ├── uiStore.ts                   # Sidebar, darkMode, language, view
│   └── keyboardStore.ts             # Keyboard shortcut overrides
│
├── services/                        # Business logic layer (26 service directories)
│   ├── index.ts                     # Barrel export
│   ├── api/
│   │   ├── client.ts                # HTTP API client
│   │   └── index.ts
│   ├── core/                        # Base classes & error types
│   │   ├── BaseRepository.ts        # Generic CRUD repository
│   │   ├── baseDomainService.ts     # Domain service base
│   │   ├── baseEntityService.ts
│   │   ├── baseReportService.ts
│   │   ├── errors.ts                # NotFoundError, DuplicateRecordError, TenantScopeError
│   │   └── mappers.ts
│   ├── auth/
│   │   ├── authService.ts           # Login/logout/session management (772 lines)
│   │   ├── permissionsService.ts    # RBAC permission checking
│   │   ├── forgotPasswordService.ts
│   │   ├── hashUtils.ts
│   │   └── repositories/
│   │       └── sessionRepository.ts
│   ├── sales/
│   │   ├── salesService.ts          # CRUD, pagination, filtering
│   │   ├── pricingService.ts        # Price calculation
│   │   └── repositories/
│   │       └── salesRepository.ts
│   ├── purchases/
│   │   ├── purchaseService.ts       # CRUD, status transitions, invoice IDs
│   │   └── repositories/
│   │       └── purchaseRepository.ts
│   ├── returns/
│   │   ├── returnService.ts         # Sales returns + purchase returns
│   │   └── repositories/
│   │       └── returnsRepository.ts
│   ├── inventory/
│   │   ├── inventoryService.ts      # CRUD, barcode search, barcode scanning
│   │   ├── batchService.ts          # FEFO batch allocation
│   │   ├── drugApprovalService.ts   # New drug approval workflow
│   │   ├── openFdaService.ts        # FDA drug data integration
│   │   ├── stockMovement/
│   │   │   ├── stockMovementService.ts
│   │   │   └── types.ts
│   │   └── repositories/
│   │       ├── inventoryRepository.ts
│   │       ├── batchRepository.ts
│   │       ├── drugApprovalRepository.ts
│   │       └── stockMovementRepository.ts
│   ├── cash/
│   │   ├── cashService.ts           # Open/close shift, cash transactions
│   │   └── repositories/
│   │       └── cashRepository.ts
│   ├── customers/
│   │   ├── customerService.ts       # CRUD, loyalty points
│   │   ├── loyaltyUtils.ts
│   │   └── repositories/
│   ├── financials/
│   │   ├── financialService.ts      # P&L, daily breakdown, financial reports
│   │   ├── expenseService.ts        # Expense CRUD
│   │   ├── dateRangeService.ts      # Date range utilities
│   │   └── repositories/
│   ├── hr/
│   │   ├── employeeService.ts       # Employee CRUD
│   │   ├── attendanceService.ts     # Clock in/out
│   │   ├── attendanceReportService.ts
│   │   └── repositories/
│   ├── suppliers/
│   │   ├── supplierService.ts
│   │   └── repositories/
│   ├── settings/
│   │   ├── settingsService.ts       # App settings CRUD
│   │   ├── holidaysService.ts       # Holiday management
│   │   └── repositories/
│   ├── org/
│   │   ├── orgService.ts            # Organization CRUD
│   │   ├── branchService.ts         # Branch CRUD
│   │   ├── orgMembersService.ts     # Org membership
│   │   ├── orgAggregationService.ts # Cross-branch aggregation
│   │   └── repositories/
│   ├── dashboard/
│   │   ├── dashboardService.ts      # Dashboard KPIs
│   │   ├── achievementService.ts    # Daily targets/achievements
│   │   └── repositories/
│   ├── intelligence/
│   │   └── intelligenceService.ts   # Business intelligence data
│   ├── realtime/
│   │   ├── registry.ts              # Realtime subscription registry
│   │   ├── patchers.ts              # Optimistic update patchers
│   │   └── useRealtimeDispatcher.ts # Realtime event dispatcher
│   ├── search/
│   │   ├── drugSearchService.ts     # Full-text drug search
│   │   └── catalogCacheService.ts   # Catalog caching
│   ├── audit/
│   │   ├── auditService.ts          # Audit logging
│   │   └── repositories/
│   ├── transactions/
│   │   ├── transactionService.ts    # Atomic transaction orchestration
│   │   ├── undoManager.ts           # Undo/rollback capability
│   │   └── repositories/
│   ├── infrastructure/
│   │   └── printerService.ts        # Thermal/printer integration
│   ├── geminiService.ts             # Google Gemini AI integration
│   └── timeService.ts               # Server-time verification
│
├── hooks/                           # React hooks (19 directories)
│   ├── index.ts                     # Barrel export
│   ├── auth/                        # useAuth, useAuthenticatedData, useOnboardingStatus
│   ├── common/                      # useLongPress, useClockSkew
│   ├── sales/                       # useFinancials, usePOSTabs, useSalesHandlers, useShift
│   ├── inventory/                   # useInventoryHandlers, useInventorySearch, useRisk, useComputedInventory
│   ├── purchases/                   # useProcurement, usePurchaseHandlers, usePurchaseTabs
│   ├── customers/                   # useCustomerHandlers
│   ├── finance/                     # useExpenses
│   ├── hr/                          # useEmployeeHandlers
│   ├── suppliers/                   # useSupplierHandlers
│   ├── layout/                      # useAppState, useNavigation, useTheme, useUrlSync, useColumnReorder, useFilterDropdown, useDynamicTickerData
│   ├── infrastructure/              # useAudit, useDesktopSettings, usePrinter, usePreventZoom, useSessionHeartbeat
│   ├── mutations/                   # usePurchaseMutations, useReturnsMutations, useSalesMutations
│   ├── queries/                     # Query hooks
│   ├── keyboard/                    # useShortcuts, shortcuts.constants
│   └── useHandlerInfrastructure.ts  # Central mutation orchestrator
│
├── context/                         # React contexts
│   ├── CatalogContext.tsx
│   ├── HelpContext.tsx
│   ├── NotificationContext.tsx
│   ├── QueryProvider.tsx            # TanStack Query provider
│   ├── SettingsContext.tsx           # Theme, language, notifications
│   ├── ThemeContext.tsx
│   ├── TypographyContext.tsx
│   └── UIContext.tsx
│
├── components/                      # UI components (25 directories)
│   ├── ai/                          # AI features
│   ├── auth/                        # Login, AuthPage, SignUp
│   ├── common/                      # AppLoadingScreen, shared widgets
│   ├── cosmoceutical/               # CosmoceuticalPage
│   ├── customers/                   # 8 component files (management, history, loyalty, map)
│   ├── dashboard/                   # Dashboard, RealTimeSalesMonitor, LiveWidget
│   ├── employee-portal/             # EmployeeDashboard (Tauri employee self-service)
│   ├── experiments/                 # AdvancedSmCard, DashboardExperiments
│   ├── features/                    # alerts/ NotificationOverlay
│   ├── finance/                     # ExpenseTracker, RecordExpenseModal
│   ├── hr/                          # EmployeeList, EmployeeProfile, StaffOverview, attendance/
│   ├── intelligence/                # audit/, common/, financials/, procurement/, risk/
│   ├── inventory/                   # 21 files (Inventory, ExpiryManagement, BarcodeStudio, StockAdjustment, Shortages, etc.)
│   ├── layout/                      # 20 files (MainLayout, Navbar, Sidebar, PageRouter, StatusBar, etc.)
│   ├── mobile/                      # Mobile-specific components
│   ├── onboarding/                  # OrgSetupScreen, BranchSetupScreen, EmployeeSetupScreen
│   ├── org/                         # OrganizationManagementPage
│   ├── performance/                 # PerformanceMetrics
│   ├── prescriptions/               # DrugInteractionsPage
│   ├── purchases/                   # 7 files (Purchases, PurchaseHistory, PurchaseReturns, SuppliersList, etc.)
│   ├── reports/                     # LoginAuditList, ProfitLossPage
│   ├── sales/                       # 18 files (POS/, CashRegister, SalesHistory, ReturnHistory, etc.)
│   ├── settings/                    # 10 files (BranchSettings, ThemeStudio, DesktopSettings, etc.)
│   ├── test/                        # ModalTests, AnimatedCounterLab, FilterDropdownTest, etc.
│   └── ui/                          # Shadcn/ui primitives (button, card, dialog, etc.)
│
├── lib/                             # Library initializations
│   ├── supabase.ts                  # Supabase client (guarded)
│   ├── queryClient.ts               # TanStack Query client
│   ├── queryKeys.ts                 # Centralized query key factory
│   ├── queryCache.ts
│   └── utils.ts
│
├── pages/                           # Standalone page components
│   └── IntelligenceDashboard.tsx
│
├── utils/                           # Utility functions (47 files)
│   ├── currency.ts, money.ts        # Money/currency handling
│   ├── idGenerator.ts               # UUID, sequential ID generation
│   ├── storage.ts                   # localStorage wrapper with quota monitoring
│   ├── stockUtils.ts, expiryUtils.ts, inventory.ts
│   ├── searchUtils.ts
│   ├── printing/, qz-printer.ts     # Thermal printing
│   ├── webAuthnUtils.ts             # Biometric auth
│   ├── network.ts, networkTracker.ts
│   ├── qz-security/
│   ├── events/                      # Custom event system
│   └── platform.ts                  # Tauri vs browser detection
│
├── supabase/                        # Database & edge functions
│   ├── config.toml                  # Supabase project config
│   ├── functions/                   # Edge Functions
│   │   ├── compute-daily-achievements/index.ts
│   │   ├── sync-holidays/index.ts
│   │   └── process-checkout/index.ts
│   ├── migrations/                  # ~140 SQL migrations (Mar-Jun 2026)
│   └── *.sql                        # RPC definitions, triggers, seeds
│
├── i18n/                            # Internationalization
│   ├── index.ts
│   ├── translations.ts             # English translations
│   ├── rootStrings.ts              # Root UI strings
│   ├── menuTranslations.ts         # Menu translations (AR)
│   └── helpInstructions.ts
│
├── fonts/                           # Custom fonts
├── public/                          # Static assets
├── logs/                            # Brand logos (SVG)
├── docs/                            # Documentation
├── specs/                           # Feature specs (batch-grouping, employee-portal, etc.)
├── reports/                         # Audit/analysis reports
├── tests/                           # Test suites
├── scripts/                         # Utility scripts
├── templates/                       # Templates
├── stress-tests/                    # Load tests
└── mcp-design-server/              # MCP design tools
```

## TECH STACK

Layer -> Technology
Frontend -> React 19.2, TypeScript 5.8, Vite 6.2
Routing -> Custom ViewState-based router (no React Router -- uses @tanstack/react-router bundled but the app uses its own custom PageRouter component)
State Management -> Zustand 5 (4 stores), TanStack React Query 5 (server state)
UI Library -> Radix UI, Shadcn/ui (custom), Lucide React icons, MynaUI icons
Styling -> Tailwind CSS v4, tw-animate-css, framer-motion, clsx, class-variance-authority
Database -> PostgreSQL via Supabase (140+ migrations)
ORM/Client -> @supabase/supabase-js (direct SQL queries via JS client, RPC calls, custom repository pattern)
Auth -> Supabase Auth + WebAuthn (biometric via @simplewebauthn/browser)
Desktop -> Tauri v2 (with plugins for printing, shortcuts, OS, updater, shell)
Charts -> Recharts 3.5
Tables -> TanStack React Table v8
Virtualization -> TanStack React Virtual v3
Drag/Drop -> dnd-kit
Search -> Custom full-text search (not Elastic/Solr)
Printing -> Tauri thermal printer plugin + QZ Tray for browser printing
AI -> Google Gemini (@google/genai)
Barcode -> barcode-detector, qrcode
Spreadsheet -> ExcelJS (export)
Testing -> Vitest, Testing Library, jsdom
Linting -> Biome (replacing ESLint)
Maps -> MapLibre GL (customer density map)
i18n -> Custom (no i18next -- manual translation objects)
Deployment -> Vercel-ready (vercel.json), Tauri builds
Command Palette -> cmdk (command menu)

## 🏗️ Architecture & Data Flow

### 1. State Management & Data Flow

The application uses a **Cache-First Architecture** with three tiers of state:

1. **React Query (Server State)**:
    - All domain data is fetched, cached, and background-refetched through React Query (`@tanstack/react-query`).
    - Cache is persisted to IndexedDB via `@tanstack/react-query-persist-client` for offline resilience.
    - Components consume data through auto-caching domain query hooks (e.g., `useInventory(branchId)`, `useRecentSales(branchId)`, `useEmployees(orgId)`).
    - Data flow: `Service` → `React Query Cache` → `Component` via query hook.

2. **Zustand (UI-Only State)**:
    - Lightweight, non-persisted stores for auth, POS cart, UI preferences, and other client-only concerns.
    - Stores: `useAuthStore`, `usePOSStore`, `useUIStore`.
    - ❌ Do not put domain data in Zustand — its lifecycle is local to the browser session.

3. **Mutations (Writes)**:
    - All writes go through mutation hooks (e.g., `useCompleteSale()`, `useAddProduct()`, `useAddPurchase()`).
    - On success, mutations auto-invalidate related React Query caches so components re-render with fresh data.

4. **Realtime Sync**:
    - Supabase Realtime listens for database changes and calls `queryClient.invalidateQueries()` to trigger background refetches.
    - Components remain unaware of the sync layer — they simply re-render when their query cache is invalidated.
    - There is no monolithic `useData()` hook; each component fetches exactly the data it needs.

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

- ✅ **Reading data**: Use query hooks (`useInventory`, `useRecentSales`, etc.) — auto-cached with background refetch.
- ✅ **Writing data**: Use mutation hooks (`useCompleteSale`, `useAddProduct`, etc.) — auto-invalidate on success.
- ✅ **UI-only state**: Use Zustand stores (`useAuthStore`, `usePOSStore`, `useUIStore`).
- ✅ **Legacy pass-through**: `useEntityHandlers` is used only in `AuthenticatedContent`; prefer individual mutation hooks for new code.
- ❌ **Forbidden**: Calling `api.get()` or `api.post()` directly within a React Component `useEffect` or button handler.
- ❌ **Forbidden**: Using `useData()` — it no longer exists.

---

### 10. AI Integration & LLM Guidelines

**RULE:** AI functionality (`geminiService.ts`, `AIAssistant`) should act as an accelerator, not a hard business constraint.

- **Prompt Engineering**: Prompts must be context-rich and strictly formatted (e.g., demanding valid JSON outputs to prevent parsing crashes).
- **Graceful Degradation**: If the AI endpoint rate-limits or fails, the core system workflow MUST have a non-AI fallback.
- **Security Check**: Never pass un-sanitized PII or credentials in LLM prompts.

---

### 11. Error Handling & Validation

**RULE:** Fail predictably. Catch early.

- **Zod Validations**: Input data MUST be schema-validated using Zod at the boundary (before calling services or syncing) to guarantee type safety at runtime.
- **User-Friendly Errors**: Raw exception text (e.g., `TypeError: Failed to fetch`) should never reach the UI. Catch at the service boundary and convert to a `TRANSLATIONS` warning toast via `AlertContext`.

---

### 12. Authentication & Dual Login Architecture

**RULE:** The application strictly enforces a Dual-Layer Authentication approach to separate Global Identity from Pharmacy/Local Access.

- **Global Identity (`auth.users`)**: Used only for the unified **Employee Portal**. Users register with Email/Phone and have an account not tied to any specific pharmacy.
- **Pharmacy Access (Local `employees` Table)**: Access to the Point of Sale (POS) or any specific Pharmacy organization is strictly isolated. Employees MUST use the `QuickLogin` component, which bypasses Supabase `auth.users` and hashes local credentials using `hashUtils.ts` directly against the local `employees` table.
- **Workspace Switcher**: If an employee works at multiple pharmacies (multiple `employees` rows linked to one `auth_user_id`), the `WorkspaceSwitcher` intercepts the login flow and prompts them to select their active pharmacy context (`orgId`).

---

## 🛠️ Workflow: Adding a New Page

1. **Create Component**: Build your page in `components/[module]/MyPage.tsx`.
    - Use query hooks (`useInventory`, `useRecentSales`, etc.) for data fetching. Use mutation hooks (`useCompleteSale`, `useAddProduct`, etc.) for writes. Use Zustand stores (`useAuthStore`, `usePOSStore`) for UI state.
2. **Add Skeleton**: Create a loading state in `components/skeletons/` and map it in `PageSkeletonRegistry.tsx`.
3. **Define Permissions**: If the page is restricted, define the new permission in `config/permissions.ts`.
4. **Register Page**: Add it to `config/pageRegistry.ts`.

    ```typescript
    export const PAGE_REGISTRY = {
      "my-new-page": {
        id: "my-new-page",
        component: MyPage,
        permission: "module.view", // RBAC protection
      },
    };
    ```

5. **Update Menu**: Add an entry to `config/menuData.ts`.
6. **Add Translations**: Update `i18n/menuTranslations.ts` and `i18n/translations.ts` (Both EN & AR).

---

## 📝 Code Review Checklist

Before submitting code, ensure:

- [ ] **Data Safety**: Using `db.ts` or `storage.ts`? (No raw `localStorage`)
- [ ] **Offline-First**: Mutating actions are dispatched to an offline queue mechanism?
- [ ] **Data Validation**: API boundaries and form inputs use `zod` schema validation?
- [ ] **State Management**: Using query hooks for data, Zustand stores for UI state? (No `useState` for domain data)
- [ ] **UI Components**:
  - Using `SmartInputs`? (No raw `<input>`)
  - Using `FilterDropdown` and `TanStackTable`?
- [ ] **Translations**: 100% coverage (EN + AR)? No dynamic string concatenation for text?
- [ ] **RBAC**: Sensitive UI buttons explicitly use `canPerformAction`?

---

## 📚 Reference

- **React Query & Caching**: See `hooks/queries/` and `context/QueryProvider.tsx`.
- **Zustand Stores**: See `stores/authStore.ts`, `stores/posStore.ts`, `stores/uiStore.ts`.
- **Mutation Hooks**: See `hooks/mutations/`.
- **Query Hooks**: See `hooks/queries/`.
- **Realtime Sync**: See `hooks/realtime/useRealtimeSync.ts`.
- **Entity Handlers**: See `hooks/useEntityHandlers.ts`.

---

## 🗄️ Database Entity Relationship Map

```
organizations (1) ──< (N) branches (1) ──< (N) employees
     │                      │                      │
     ├── org_members        ├── shifts              └── attendance_events
     ├── subscriptions      ├── cash_transactions
     ├── drug_approvals     ├── expenses
     └── audit_logs         ├── login_audits
                            │
                            ├── drugs (inventory) (1) ──< (N) stock_batches
                            │       │                          │
                            │       └── stock_movements        └── purchase_id ── purchases
                            │
                            ├── suppliers (1) ──< (N) purchases (1) ──< (N) purchase_items
                            │       │                │
                            │       │                └── purchase_returns (1) ──< (N) purchase_return_items
                            │       │
                            │       └── drugs.supplier_id
                            │
                            ├── sales (1) ──< (N) sale_items (1) ──< (N) sale_item_batches
                            │       │                │
                            │       │                └── stock_batches (FK batch_id)
                            │       │
                            │       └── returns (1) ──< (N) return_items
                            │
                            └── customers
                                    │
                                    └── registered_by ── employees
```

**Multi-Tenant Isolation Columns**: Every business table carries both `org_id` (organization scope) and `branch_id` (branch scope). RLS enforces `org_id IN (get_user_org_ids())` and/or `branch_id IN (get_user_branch_ids())` on every query.

**Snapshot Pattern**: Key transaction tables store snapshot columns at transaction time (e.g., `supplier_name_snapshot`, `drug_name_snapshot`, `performed_by_name_snapshot`) so historical records stay accurate even when source data changes.

---

## 🔄 Core Business Flows

### Sales (Checkout) — `process_checkout` RPC

```
User taps "Complete Sale"
  → useSalesHandlers.handleCompleteSale(saleData)
    → Permission check: sale.create
    → Data validation, time validation
    → transactionService.processCheckout(saleData, [], context)
      → supabase.rpc('process_checkout', { p_payload })
        [PL/pgSQL SECURITY DEFINER — SINGLE DB TRANSACTION]
        ├── Validate employee exists
        ├── Resolve shift (auto-detect open shift)
        ├── Atomic daily order number via branch_daily_sequences upsert
        ├── Generate serial ID: {BRANCH_CODE}-{YYYYMMDD}-{NNNN}
        ├── INSERT sales record
        ├── FOR each cart item:
        │   ├── Resolve drug_id, calculate cost_price
        │   ├── Convert qty to units (qty × unitsPerPack)
        │   ├── INSERT sale_items record
        │   ├── FEFO cursor: SELECT stock_batches
        │   │   ORDER BY (preferred batch) DESC, expiry ASC, created ASC
        │   │   FOR UPDATE (row-level lock prevents overselling)
        │   ├── Greedy deduction: UPDATE batch qty -= taken
        │   └── RAISE EXCEPTION if insufficient stock
        ├── Update customer loyalty (points, visits, purchases)
        ├── IF cash: INSERT cash_transactions + atomic_increment_shift(cash_sales)
        ├── IF visa: INSERT cash_transactions + atomic_increment_shift(card_sales)
        └── RETURN { success, sale with items }
```

**FEFO Sort Order**: `(id = v_payload_id) DESC, expiry_date ASC, created_at ASC` — user-selected batch first, then earliest expiry first, then oldest created first.

### Purchases (Create → Receive) — `process_purchase_receipt` RPC

**Status Machine**: `pending → approved → received → (inventory updated)` or `pending → completed` (direct buy)

```
Purchase created (status=pending)
  → Approve: status=approved (authorization step, no stock change)
  → Mark as Received: calls process_purchase_receipt RPC
    [PL/pgSQL SECURITY DEFINER — SINGLE DB TRANSACTION]
    ├── SELECT purchase FOR UPDATE (prevents double-receipt)
    ├── Status guards (already received → idempotent; rejected → error)
    ├── FOR each purchase_item:
    │   ├── Resolve unit quantities, expiry date
    │   ├── INSERT into stock_batches (creates new batch per item)
    │   │   └── fn_log_stock_movement trigger fires → stock_movements row
    │   ├── Calculate Weighted Average Cost (WAC) across all batches
    │   ├── UPDATE drugs:
    │   │   ├── cost_price = WAC × unitsPerPack
    │   │   ├── unit_cost_price = WAC (unit level)
    │   │   ├── public_price = from purchase item
    │   │   └── expiry_date = MIN across all batches
    │   └── drug.stock auto-updated via trigger
    ├── UPDATE purchase: status=received, received_by, received_at
    └── IF cash payment: cash_transactions + atomic_increment_shift(cash_purchases)
```

**Weighted Average Cost (WAC)**: `SUM(qty × cost_price) / NULLIF(SUM(qty), 0)` across all non-zero batches for the drug.

### Sales Returns — `process_return` RPC

```
User processes return
  → Permission check: sale.refund
  → Role-based refund limit (pharmacist max 1000 EGP, cashier max 500 EGP)
  → transactionService.processReturn(returnData, [], sale, context)
    → supabase.rpc('process_return', { p_payload })
      [PL/pgSQL SECURITY DEFINER — SINGLE DB TRANSACTION]
      ├── SELECT sale FOR UPDATE, SELECT shift FOR UPDATE
      ├── Generate serial: RET-YYYYMMDDNNN
      ├── INSERT returns header
      ├── set_stock_context('return_customer')
      ├── FOR each returned item:
      │   ├── Validate qty ≤ available_to_return (from item_returned_quantities)
      │   ├── Calculate refund: ROUND(qty × public_price × (total/subtotal), 2)
      │   ├── IF condition = 'sellable': UPDATE stock_batches (+qty)
      │   └── UPDATE sales.item_returned_quantities JSONB
      ├── UPDATE sales (net_total, status='returned' if full return)
      ├── Reverse loyalty points proportionally
      ├── IF originally cash: INSERT cash_transactions + atomic_increment_shift(returns)
      └── IF originally visa: INSERT cash_transactions + atomic_increment_shift(card_returns)
```

**Critical constraint**: Cannot return more than `sale_item.quantity - already_returned`. Damaged/expired items are recorded but NOT added back to inventory.

### Purchase Returns — `process_purchase_return` RPC

```
User returns stock to supplier
  → transactionService.processPurchaseReturnTransaction(ret, context)
    → returnService.createPurchaseReturn(ret)
      → supabase.rpc('process_purchase_return', { p_payload })
        [PL/pgSQL SECURITY DEFINER — SINGLE DB TRANSACTION]
        ├── has_branch_permission() authorization check
        ├── INSERT purchase_returns + purchase_return_items
        ├── FOR each item:
        │   ├── SELECT drug FOR UPDATE, set_stock_context('return_supplier')
        │   ├── FIFO cursor: SELECT stock_batches ORDER BY expiry ASC
        │   │   FOR UPDATE — deduct qty across batches
        │   └── RAISE EXCEPTION if insufficient stock
        └── IF cash: INSERT cash_transactions + atomic_increment_shift(cash_purchase_returns)
```

### Stock Adjustments — `process_stock_adjustment` RPC

```
Inventory → Stock Adjustment → Process
  → inventoryService.processStockAdjustment(payload)
    → supabase.rpc('process_stock_adjustment', { p_payload })
      ├── FOR each adjustment:
      │   ├── atomic_increment_stock(drug_id, delta)
      │   ├── atomic_increment_batch(batch_id, delta)
      │   └── INSERT stock_movements (type='adjustment')
      └── All wrapped in single DB transaction
```

**Movement types** (10 total):
| Type | Sign | Description |
|------|------|-------------|
| `initial` | + | First-time stock entry |
| `purchase` | + | Received from supplier |
| `return_customer` | + | Customer returned goods |
| `transfer_in` | + | From another branch |
| `sale` | - | Sold to customer |
| `return_supplier` | - | Returned to supplier |
| `damage` | - | Damaged or expired |
| `transfer_out` | - | Sent to another branch |
| `adjustment` | ± | Manual count correction |
| `correction` | ± | Data correction |

---

## 🔒 Concurrency & Atomic Operations

All critical financial and inventory operations run as **SECURITY DEFINER PL/pgSQL functions** inside single database transactions.

### Row-Level Locking (FOR UPDATE)

| Operation | What Gets Locked | Purpose |
|-----------|-----------------|---------|
| `process_checkout` | `stock_batches` (per item) | Prevents overselling (P0 fix) |
| `process_return` | `sales` → `shifts` → `stock_movements` | Consistent lock order prevents deadlock |
| `process_cancellation` | `sales` → `shifts` → `stock_movements` | Same lock order as return |
| `process_purchase_receipt` | `purchases` → `drugs` → `stock_batches` | Prevents double-receipt |
| `process_purchase_return` | `drugs` → `stock_batches` | FIFO deduction safety |
| `atomic_increment_shift` | `shifts` (self-lock) | Prevents TOCTOU balance race (P1 fix) |

### Shift Balance Protection

`atomic_increment_shift` self-locks the shift row before every cash operation:

```sql
PERFORM 1 FROM shifts WHERE id = p_shift_id FOR UPDATE;
-- Then validates: (cash_in + cash_sales + cash_purchase_returns) -
--   (cash_out + returns + cash_purchases) >= requested_outflow
-- RAISE EXCEPTION if insufficient balance
UPDATE shifts SET cash_sales = cash_sales + delta, ...;
```

### Partial Unique Index

```sql
CREATE UNIQUE INDEX idx_shifts_branch_open ON shifts (branch_id) WHERE status = 'open';
```

Prevents two open shifts for the same branch at the database level.

### Optimistic Locking

`stock_batches` uses a `version` column incremented on every write. `atomic_increment_batch` checks `WHERE id = ? AND quantity + delta >= 0 AND version = expected_version` — prevents negative stock and race conditions.

---

## ⚔️ Critical RPC Layer Reference

All RPCs are `SECURITY DEFINER` (bypass RLS) with `SET search_path = public`.

| RPC | File | Signature | Tables Touched |
|-----|------|-----------|----------------|
| `process_checkout` | `20260729` | `(p_payload JSONB)` | sales, sale_items, stock_batches, branch_daily_sequences, customers, cash_transactions, shifts |
| `process_return` | `20260731` | `(p_payload JSONB)` | returns, return_items, sales, stock_batches, stock_movements, customers, cash_transactions, shifts |
| `process_cancellation` | `20260729` | `(p_payload JSONB)` | sales, stock_batches, stock_movements, customers, cash_transactions, shifts |
| `process_purchase_receipt` | `20260722` | `(p_payload JSONB)` | purchases, purchase_items, stock_batches, stock_movements, drugs, cash_transactions, shifts |
| `process_purchase_return` | `20260727` | `(p_payload JSONB)` | purchase_returns, purchase_return_items, stock_batches, stock_movements, cash_transactions, shifts |
| `process_stock_adjustment` | `20260619` | `(p_payload JSONB)` | drugs, stock_batches, stock_movements |
| `atomic_increment_shift` | `20260731` | 9 named params | shifts |
| `open_shift` | earlier | `(p_payload JSONB)` | shifts |
| `close_shift` | earlier | `(p_payload JSONB)` | shifts |
| `atomic_increment_batch` | earlier | `(p_batch_id UUID, p_delta INTEGER)` | stock_batches |
| `atomic_increment_stock` | earlier | `(p_drug_id UUID, p_delta INTEGER)` | drugs |

### Edge Functions (TypeScript)

| Function | File | Trigger |
|----------|------|---------|
| `compute-daily-achievements` | `supabase/functions/` | Scheduled/cron |
| `sync-holidays` | `supabase/functions/` | Manual |
| `process-checkout` | `supabase/functions/` | Legacy (RPC is primary path) |

---

## 🧪 Known Bugs (P0-P1)

Documented in `tests/optimistic_bugs.test.ts`. These are **frontend cache-layer bugs** that create temporary data inconsistency (resolved on next server refetch).

### Bug 1 — Sales Batch Deduction (`useSalesMutations.ts:95-104`)

**Problem**: The `onSuccess` cache handler deducts from ALL batches of the same drug instead of using FIFO. If drug-A has batches B1(10) and B2(10), and customer buys 2, both batches lose 2 → cache shows total 16 instead of 18.

**Impact**: POS cart momentarily shows wrong batch availability. Corrected on next `invalidateQueries`.

**Fix**: Replace `.map()` with FIFO-aware deduction that subtracts from the earliest-expiring batch first.

### Bug 2 — Purchase Default Expiry (`usePurchaseMutations.ts:48`)

**Problem**: When a purchase item has no `expiryDate`, the cache handler defaults to `new Date().toISOString()` → the batch appears already expired.

**Impact**: Expiry warnings triggered immediately for newly purchased stock.

**Fix**: Default to `+1 year` or reject the item.

### Bug 3 — Purchase Cache Miss (`usePurchaseMutations.ts:78-79`)

**Problem**: On purchase approval, the cache handler reads `cachedDetail?.items`. If the detail page was never opened, cache is `undefined` → `items` becomes `[]` → inventory patch silently does nothing.

**Impact**: Inventory cache is not updated until the next background refetch.

**Fix**: Read items from the purchase response or the purchase list cache as fallback.

---

## 📊 Production Readiness Scorecard

| Criterion | Grade | Notes |
|-----------|-------|-------|
| **Atomicity** | A | All critical flows use SECURITY DEFINER RPCs in single DB transactions |
| **Concurrency** | B+ | P0 (overselling) and P1 (shift balance) fixed; no idempotency key yet |
| **Data Integrity** | A | FK constraints, NOT NULL, UNIQUE indexes, triggers, optimistic locking |
| **Financial Accuracy** | A- | Money uses smallest-unit conversion; tax uses largest-remainder allocation; card/visa tracking added Jul 29-31 2026 |
| **Security (RLS)** | A- | All tables tenant-isolated; `stock_batches`/`stock_movements` read-only via RLS, mutations via RPCs only |
| **Security (Auth)** | A | WebAuthn biometrics, Supabase Auth, RBAC permissions, session management, dual-login architecture |
| **Frontend Cache** | C | 3 known cache bugs causing momentary inconsistency until server refetch |
| **Audit Trail** | A | `stock_movements` auto-logged via DB triggers; `audit_logs` for business events; `login_audits` separate |
| **Test Coverage** | D | 6 concurrency integration tests; zero unit tests for 20+ RPC functions; zero service-layer tests |
| **Error Handling** | B | RPCs return structured `{success, error}`; frontend catches + toasts; undo manager exists but limited scope |
| **Offline Resilience** | C | Sync engine and DLQ exist; core flows require server for atomic RPCs |

## 🔐 Security Model

### Multi-Tenant RLS

Every business table has `org_id` and `branch_id`. Two helper functions enforce tenant isolation:

- **`get_user_org_ids()`** — returns all orgs the current `auth.uid()` belongs to (via `org_members`)
- **`get_user_branch_ids()`** — returns all branches across those orgs

**Policy pattern** (applied to all 30+ tables):
```sql
CREATE POLICY "tenant_isolation" ON sales
  FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
```

**Special case — `stock_batches` and `stock_movements`**: `FOR SELECT ONLY` — all mutations must go through SECURITY DEFINER RPCs (see RPC layer above).

### Dual-Layer Authentication

1. **Global Identity** (`auth.users`): Supabase Auth for Employee Portal. Email/phone registration, not tied to any pharmacy.
2. **Pharmacy Access** (`employees` table): Local credentials hashed via SHA-256, bypasses `auth.users`. Used for POS QuickLogin.
3. **Workspace Switcher**: Multi-pharmacy employees select active `orgId` + `branchId` on login.

### Role-Based Permissions

Defined in `config/permissions.ts`. 13 employee roles mapped to granular permissions:

| Role Group | Example Permissions |
|------------|-------------------|
| Admin/Owner | `sale.create`, `sale.cancel`, `sale.refund`, `inventory.update`, `purchase.approve`, `users.manage` |
| Pharmacist | `sale.create`, `sale.cancel` (≤500 EGP), `sale.refund` (≤1000 EGP), `inventory.view` |
| Cashier | `sale.create`, `sale.refund` (≤500 EGP) |
| Inventory Officer | `inventory.view`, `inventory.adjust`, `purchase.receive` |

## 🔄 State Management Architecture

### Three Tiers

| Tier | Technology | Purpose | Persistence |
|------|-----------|---------|-------------|
| **Server State** | TanStack React Query 5 | All domain data (inventory, sales, purchases) | IndexedDB via persist-client |
| **UI State** | Zustand 5 | Cart, auth context, preferences | localStorage (selective) |
| **Form/Temp State** | React useState/useReducer | Ephemeral UI state | None |

### Query Key Factory (`lib/queryKeys.ts`)

Centralized key generation prevents cache key drift:

```typescript
queryKeys.inventory.all(branchId)
queryKeys.sales.detail(saleId)
queryKeys.batches.all(branchId)
queryKeys.shifts.all(branchId)
// ... etc
```

### Data Flow Pattern

```
React Component
  → Query Hook (useInventory, useRecentSales)
    → React Query Cache (auto-refetch, stale-while-revalidate)
      → Service Layer (business logic, validation)
        → Repository Layer (data access)
          → Supabase JS Client / RPC
            → PostgreSQL (with RLS, triggers, locking)
```

**Mutations**: Write operations go through mutation hooks → `transactionService` → Supabase RPC (for critical operations) or direct service methods (for CRUD). On success, React Query cache is updated optimistically and invalidated for background refetch.

---

**Build something amazing!** 🚀
