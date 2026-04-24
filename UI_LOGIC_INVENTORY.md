| # | File Path | Component Name | Classification | Issues Found | Suggested Target File |
|---|-----------|---------------|----------------|--------------|----------------------|
| 1 | components/layout/PageRouter.tsx | PageRouter | ?? MEDIUM | Validation/permission rules | usePageRouter.ts |
| 2 | components/auth/AuthPage.tsx | AuthPage | ?? MEDIUM | Validation/permission rules (parents: App.tsx) | useAuthPage.ts |
| 3 | components/auth/ForgotPassword.tsx | ForgotPassword | ?? HIGH | Complex local state; Validation/permission rules (parents: components/auth/AuthPage.tsx) | auth.service.ts / useForgotPassword.ts |
| 4 | components/auth/Login.tsx | Login | ?? HIGH | Effect orchestration; Validation/permission rules (parents: components/auth/AuthPage.tsx) | auth.service.ts / useLogin.ts |
| 5 | components/auth/SignUp.tsx | SignUp | ?? HIGH | Validation/permission rules (parents: components/auth/AuthPage.tsx) | auth.service.ts / useSignUp.ts |
| 6 | components/common/AnimatedCounter.tsx | AnimatedCounter | ? SKIP | Pure UI primitive/barrel (parents: components/common/SmallCard.tsx, components/dashboard/RealTimeSalesMonitor.tsx) | - |
| 7 | components/common/ChartWidget.tsx | CustomTooltipContent | ? SKIP | Pure UI primitive/barrel (parents: components/dashboard/Dashboard.tsx, components/dashboard/RealTimeSalesMonitor.tsx, components/hr/EmployeeProfile.tsx) | - |
| 8 | components/common/CompactProgressCard.tsx | CompactProgressCard | ? SKIP | Pure UI primitive/barrel (parents: components/experiments/AdvancedSmCard.tsx) | - |
| 9 | components/common/ContextMenu.tsx | useContextMenu | ? SKIP | Effect orchestration (parents: components/common/SearchInput.tsx, components/common/FilterPill.tsx, components/common/TanStackTable.tsx, components/customers/CustomerManagement.tsx, components/inventory/BarcodePrinter.tsx, ...) | - |
| 10 | components/common/DatePicker.tsx | DatePicker | ?? HIGH | Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation (parents: components/inventory/StockAdjustment.tsx, components/purchases/Purchases.tsx, components/sales/ReturnHistory.tsx, components/sales/SalesHistory.tsx, components/sales/ShiftHistory.tsx, ...) | domain.service.ts / useDatePicker.ts |
| 11 | components/common/ErrorBoundary.tsx | ErrorBoundary | ?? HIGH | Validation/permission rules (parents: components/hr/StaffOverview.tsx) | domain.service.ts / useErrorBoundary.ts |
| 12 | components/common/ExpandedModal.tsx | ExpandedModal | ? SKIP | Pure UI primitive/barrel (parents: components/customers/CustomerOverview.tsx, components/dashboard/Dashboard.tsx, components/dashboard/RealTimeSalesMonitor.tsx) | - |
| 13 | components/common/FilterDropdown.tsx | FilterDropdown | ? SKIP | Effect orchestration; Derived data/transformation; Validation/permission rules (parents: components/customers/CustomerManagement.tsx, components/common/LocationSelector.tsx, components/hr/EmployeeList.tsx, components/hr/EmployeeProfile.tsx, components/inventory/BarcodeStudio.tsx, ...) | - |
| 14 | components/common/FilterPill.tsx | FilterPill | ? SKIP | Derived data/transformation (parents: components/common/SearchInput.tsx, components/common/TanStackTable.tsx, components/hr/EmployeeList.tsx, components/inventory/Inventory.tsx, components/purchases/Purchases.tsx, ...) | - |
| 15 | components/common/FloatingInput.tsx | FloatingInput | ? SKIP | Pure UI primitive/barrel (parents: components/purchases/Purchases.tsx, components/test/PurchasesTest.tsx) | - |
| 16 | components/common/HasPermission.tsx | HasPermission | ? SKIP | Validation/permission rules (parents: components/dashboard/Dashboard.tsx) | - |
| 17 | components/common/HelpModal.tsx | HelpModal | ? SKIP | Derived data/transformation (parents: components/dashboard/Dashboard.tsx, components/dashboard/RealTimeSalesMonitor.tsx, components/purchases/PendingApproval.tsx, components/sales/CashRegister.tsx, components/sales/ReturnHistory.tsx, ...) | - |
| 18 | components/common/InsightTooltip.tsx | CurrencyValue | ? SKIP | Pure UI primitive/barrel (parents: components/dashboard/Dashboard.tsx, components/dashboard/useDashboardAnalytics.ts, components/dashboard/RealTimeSalesMonitor.tsx, components/dashboard/useRealTimeSalesAnalytics.ts, components/hr/StaffSpotlightTicker.tsx, ...) | - |
| 19 | components/common/InteractiveCard.tsx | InteractiveCard | ? SKIP | Effect orchestration (parents: components/customers/CustomerManagement.tsx, components/inventory/Inventory.tsx, components/sales/ShiftHistory.tsx) | - |
| 20 | components/common/LocationSelector.tsx | LocationSelector | ?? MEDIUM | Effect orchestration; Derived data/transformation (parents: components/customers/CustomerManagement.tsx, components/settings/BranchSettings.tsx, components/purchases/SuppliersList.tsx, components/onboarding/BranchSetupScreen.tsx) | useLocationSelector.ts |
| 21 | components/common/MaterialTabs.tsx | MaterialTabs | ? SKIP | Pure UI primitive/barrel (parents: components/dashboard/Dashboard.tsx, components/settings/BranchSettings.tsx, components/sales/pos/DeliveryOrdersModal.tsx, components/sales/pos/ui/POSCustomerHistoryModal.tsx, components/sales/pos/ui/ClosedTabsHistoryModal.tsx, ...) | - |
| 22 | components/common/Modal.tsx | BUTTON_CLOSE_BASE | ? SKIP | Effect orchestration; Validation/permission rules (parents: components/customers/CustomerManagement.tsx, components/common/ExpandedModal.tsx, components/common/HelpModal.tsx, components/dashboard/Dashboard.tsx, components/experiments/ExpandedChartModal.tsx, ...) | - |
| 23 | components/common/ProgressCard.tsx | ProgressCard | ? SKIP | Pure UI primitive/barrel (parents: components/dashboard/RealTimeSalesMonitor.tsx, components/experiments/AdvancedSmCard.tsx, components/intelligence/risk/RiskPage.tsx) | - |
| 24 | components/common/ScreenCalibration.tsx | ScreenCalibration | ? SKIP | Effect orchestration (parents: components/inventory/BarcodeStudio.tsx) | - |
| 25 | components/common/SearchDropdown.tsx | SearchDropdown | ? SKIP | Effect orchestration; Derived data/transformation (parents: components/customers/CustomerLoyaltyLookup.tsx, components/inventory/BarcodePrinter.tsx, components/inventory/StockAdjustment.tsx, components/purchases/Purchases.tsx, components/sales/pos/ui/POSCustomerPanel.tsx) | - |
| 26 | components/common/SearchInput.tsx | SearchInput | ? SKIP | Effect orchestration; Derived data/transformation (parents: components/customers/CustomerHistory.tsx, components/common/TanStackTable.tsx, components/customers/CustomerLoyaltyLookup.tsx, components/inventory/BarcodePrinter.tsx, components/inventory/studio/PropertyInspector.tsx, ...) | - |
| 27 | components/common/SecureGate.tsx | SecureGate | ?? HIGH | Storage side effects; Complex local state; Effect orchestration; Validation/permission rules (parents: App.tsx) | domain.service.ts / useSecureGate.ts |
| 28 | components/common/SegmentedControl.tsx | SegmentedControl | ? SKIP | Effect orchestration (parents: components/customers/CustomerHistory.tsx, components/common/Modal.tsx, components/customers/CustomerManagement.tsx, components/common/ChartWidget.tsx, components/dashboard/RealTimeSalesMonitor.tsx, ...) | - |
| 29 | components/common/SmallCard.tsx | SmallCard | ? SKIP | Pure UI primitive/barrel (parents: components/customers/CustomerLoyaltyLookup.tsx, components/customers/CustomerLoyaltyOverview.tsx, components/customers/CustomerOverview.tsx, components/dashboard/Dashboard.tsx, components/dashboard/RealTimeSalesMonitor.tsx, ...) | - |
| 30 | components/common/SmartInputs.tsx | getSmartDirection | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules (parents: components/common/SearchInput.tsx, components/common/TanStackTable.tsx, components/customers/CustomerLoyaltyLookup.tsx, components/customers/CustomerManagement.tsx, components/hr/EmployeeList.tsx, ...) | domain.service.ts / useSmartInputs.ts |
| 31 | components/common/Switch.tsx | Switch | ? SKIP | Effect orchestration (parents: components/customers/CustomerManagement.tsx, components/hr/EmployeeList.tsx, components/inventory/BarcodePrinter.tsx, components/reports/LoginAuditList.tsx, components/layout/Navbar.tsx, ...) | - |
| 32 | components/common/TableAlignment.tsx | AlignButton | ? SKIP | Pure UI primitive/barrel (parents: components/common/TanStackTable.tsx) | - |
| 33 | components/common/TanStackTable.tsx | PriceDisplay | ?? HIGH | Storage side effects; Complex local state; Effect orchestration; Derived data/transformation (parents: components/customers/CustomerHistory.tsx, components/customers/CustomerLoyaltyLookup.tsx, components/customers/CustomerManagement.tsx, components/hr/EmployeeList.tsx, components/hr/StaffOverview.tsx, ...) | domain.service.ts / useTanStackTable.ts |
| 34 | components/common/Tooltip.tsx | Tooltip | ? SKIP | Effect orchestration; Validation/permission rules (parents: components/common/FilterPill.tsx, components/common/SearchInput.tsx, components/common/SmallCard.tsx, components/common/ProgressCard.tsx, components/hr/StaffSpotlightTicker.tsx, ...) | - |
| 35 | components/common/hooks/usePosShortcuts.ts | usePosShortcuts | ? SKIP | Effect orchestration (parents: components/sales/pos/POS.tsx) | - |
| 36 | components/common/hooks/usePosSounds.ts | usePosSounds | ? SKIP | Effect orchestration (parents: components/dashboard/RealTimeSalesMonitor.tsx, components/hr/EmployeeList.tsx, components/inventory/BarcodePrinter.tsx, components/inventory/BarcodeStudio.tsx, components/inventory/StockAdjustment.tsx, ...) | - |
| 37 | components/common/index.ts | index | ? SKIP | Validation/permission rules; Re-export barrel (parents: components/inventory/Inventory.tsx) | - |
| 38 | components/customers/CustomerDeliveryView.tsx | DELIVERY_ROUTE | ?? LOW | Mostly clean (parents: components/customers/CustomerDensityMap.tsx) | useCustomerDeliveryView.ts |
| 39 | components/customers/CustomerDensityMap.tsx | generateMockCustomers | ?? HIGH | Direct Supabase/query logic; Effect orchestration | customers.service.ts / useCustomerDensityMap.ts |
| 40 | components/customers/CustomerHistory.tsx | CustomerHistory | ?? MEDIUM | Effect orchestration; Derived data/transformation | useCustomerHistory.ts |
| 41 | components/customers/CustomerLoyaltyLookup.tsx | CustomerLoyaltyLookup | ?? MEDIUM | Effect orchestration; Derived data/transformation | useCustomerLoyaltyLookup.ts |
| 42 | components/customers/CustomerLoyaltyOverview.tsx | CustomerLoyaltyOverview | ?? HIGH | Direct Supabase/query logic; Derived data/transformation | customers.service.ts / useCustomerLoyaltyOverview.ts |
| 43 | components/customers/CustomerManagement.tsx | CustomerManagement | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules | customers.service.ts / useCustomerManagement.ts |
| 44 | components/customers/CustomerOverview.tsx | CustomerOverview | ?? HIGH | Derived data/transformation; Validation/permission rules | customers.service.ts / useCustomerOverview.ts |
| 45 | components/dashboard/Dashboard.tsx | Dashboard | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules | domain.service.ts / useDashboard.ts |
| 46 | components/dashboard/DashboardSkeletons.tsx | StatsRowSkeleton | ?? LOW | Derived data/transformation | useDashboardSkeletons.ts |
| 47 | components/dashboard/RealTimeSalesMonitor.tsx | RealTimeSalesMonitor | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation | domain.service.ts / useRealTimeSalesMonitor.ts |
| 48 | components/dashboard/useDashboardAnalytics.ts | useDashboardAnalytics | ?? HIGH | Derived data/transformation (parents: components/dashboard/Dashboard.tsx) | components/dashboard/useDashboardAnalytics.ts |
| 49 | components/dashboard/useRealTimeSalesAnalytics.ts | useRealTimeSalesAnalytics | ?? HIGH | Derived data/transformation (parents: components/dashboard/RealTimeSalesMonitor.tsx) | components/dashboard/useRealTimeSalesAnalytics.ts |
| 50 | components/experiments/AdvancedSmCard.tsx | SparklineCard | ?? MEDIUM | Mostly clean | useAdvancedSmCard.ts |
| 51 | components/experiments/DashboardExperiments.tsx | DashboardExperiments | ?? MEDIUM | Derived data/transformation | useDashboardExperiments.ts |
| 52 | components/experiments/ExpandedChartModal.tsx | ExpandedChartModal | ?? HIGH | Direct Supabase/query logic; Complex local state; Derived data/transformation (parents: components/experiments/AdvancedSmCard.tsx, components/hr/EmployeeProfile.tsx) | domain.service.ts / useExpandedChartModal.ts |
| 53 | components/experiments/ExpandedProgressModal.tsx | ExpandedProgressModal | ?? HIGH | Direct Supabase/query logic; Derived data/transformation (parents: components/experiments/AdvancedSmCard.tsx) | domain.service.ts / useExpandedProgressModal.ts |
| 54 | components/hr/EmployeeList.tsx | EmployeeList | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules | domain.service.ts / useEmployeeList.ts |
| 55 | components/hr/EmployeeProfile.tsx | EmployeeProfile | ?? HIGH | Direct Supabase/query logic; Storage side effects; Complex local state; Effect orchestration | domain.service.ts / useEmployeeProfile.ts |
| 56 | components/hr/RoleIcon.tsx | RoleIcon | ? SKIP | Pure UI primitive/barrel (parents: components/hr/EmployeeList.tsx, components/onboarding/EmployeeSetupScreen.tsx) | - |
| 57 | components/hr/StaffOverview.tsx | StaffOverview | ?? MEDIUM | Derived data/transformation | useStaffOverview.ts |
| 58 | components/hr/StaffSpotlightTicker.tsx | StaffSpotlightTicker | ?? LOW | Mostly clean (parents: components/hr/StaffOverview.tsx) | useStaffSpotlightTicker.ts |
| 59 | components/hr/config/trustScoreConfig.ts | TRUST_SCORE_WEIGHTS | ?? LOW | Mostly clean (parents: components/hr/hooks/useStaffAnalytics.tsx) | usetrustScoreConfig.ts |
| 60 | components/hr/hooks/useStaffAnalytics.tsx | useStaffAnalytics | ?? MEDIUM | Derived data/transformation (parents: components/hr/StaffOverview.tsx) | components/hr/hooks/useStaffAnalytics.tsx |
| 61 | components/hr/types/staffOverview.types.ts | staffOverview.types | ? SKIP | Pure UI primitive/barrel (parents: components/hr/hooks/useStaffAnalytics.tsx, components/hr/StaffSpotlightTicker.tsx, components/hr/StaffOverview.tsx) | - |
| 62 | components/intelligence/audit/AuditPage.tsx | AuditPage | ?? MEDIUM | Mostly clean (parents: pages/IntelligenceDashboard.tsx) | useAuditPage.ts |
| 63 | components/intelligence/audit/TransactionDetailModal.tsx | TransactionDetailModal | ?? MEDIUM | Mostly clean (parents: components/intelligence/audit/AuditPage.tsx) | useTransactionDetailModal.ts |
| 64 | components/intelligence/common/ConfidenceIndicator.tsx | ConfidenceIndicator | ? SKIP | Pure UI primitive/barrel (parents: components/intelligence/procurement/ProcurementPage.tsx) | - |
| 65 | components/intelligence/common/IntelligenceSkeletons.tsx | KPIGridSkeleton | ? SKIP | Pure UI primitive/barrel (parents: components/intelligence/audit/AuditPage.tsx, components/intelligence/financials/FinancialsPage.tsx, components/intelligence/procurement/ProcurementPage.tsx, components/intelligence/risk/RiskPage.tsx) | - |
| 66 | components/intelligence/common/StatusBadge.tsx | StatusBadge | ? SKIP | Validation/permission rules (parents: components/intelligence/procurement/ProcurementPage.tsx, components/intelligence/risk/ExpiryRiskGrid.tsx) | - |
| 67 | components/intelligence/financials/FinancialsPage.tsx | FinancialsPage | ?? MEDIUM | Mostly clean (parents: pages/IntelligenceDashboard.tsx) | useFinancialsPage.ts |
| 68 | components/intelligence/procurement/GeneratePOModal.tsx | GeneratePOModal | ?? MEDIUM | Mostly clean (parents: components/intelligence/procurement/ProcurementPage.tsx) | useGeneratePOModal.ts |
| 69 | components/intelligence/procurement/ProcurementKPIs.tsx | ProcurementKPIs | ?? LOW | Mostly clean (parents: components/intelligence/procurement/ProcurementPage.tsx) | useProcurementKPIs.ts |
| 70 | components/intelligence/procurement/ProcurementPage.tsx | ProcurementPage | ?? MEDIUM | Effect orchestration (parents: pages/IntelligenceDashboard.tsx) | useProcurementPage.ts |
| 71 | components/intelligence/risk/CreateDiscountModal.tsx | CreateDiscountModal | ?? MEDIUM | Mostly clean (parents: components/intelligence/risk/RiskPage.tsx) | useCreateDiscountModal.ts |
| 72 | components/intelligence/risk/ExpiryRiskGrid.tsx | ExpiryRiskGrid | ?? MEDIUM | Mostly clean (parents: components/intelligence/risk/RiskPage.tsx) | useExpiryRiskGrid.ts |
| 73 | components/intelligence/risk/RiskPage.tsx | RiskPage | ?? MEDIUM | Effect orchestration (parents: pages/IntelligenceDashboard.tsx) | useRiskPage.ts |
| 74 | components/inventory/AddProduct.tsx | AddProduct | ?? HIGH | Effect orchestration; Derived data/transformation; Validation/permission rules (parents: components/inventory/Inventory.tsx) | inventory.service.ts / useAddProduct.ts |
| 75 | components/inventory/BarcodePreview.tsx | BarcodePreview | ?? MEDIUM | Derived data/transformation (parents: components/inventory/BarcodeStudio.tsx) | useBarcodePreview.ts |
| 76 | components/inventory/BarcodePrinter.tsx | BarcodePrinter | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation | inventory.service.ts / useBarcodePrinter.ts |
| 77 | components/inventory/BarcodeStudio.tsx | BarcodeStudio | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation | inventory.service.ts / useBarcodeStudio.ts |
| 78 | components/inventory/Inventory.tsx | Inventory | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules | inventory.service.ts / useInventory.ts |
| 79 | components/inventory/InventoryManagement.tsx | InventoryManagement | ?? MEDIUM | Effect orchestration | useInventoryManagement.ts |
| 80 | components/inventory/LabelPrinter.ts | LABEL_PRESETS | ?? MEDIUM | Validation/permission rules (parents: components/inventory/BarcodePrinter.tsx, components/inventory/BarcodePreview.tsx, components/inventory/BarcodeStudio.tsx, components/inventory/Inventory.tsx) | useLabelPrinter.ts |
| 81 | components/inventory/StockAdjustment.tsx | StockAdjustment | ?? HIGH | Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation | inventory.service.ts / useStockAdjustment.ts |
| 82 | components/inventory/StockAdjustmentPrint.tsx | StockAdjustmentPrint | ?? MEDIUM | Effect orchestration (parents: components/inventory/StockAdjustment.tsx) | useStockAdjustmentPrint.ts |
| 83 | components/inventory/index.ts | index | ? SKIP | Re-export barrel | - |
| 84 | components/inventory/studio/PropertyInspector.tsx | PropertyInspector | ?? MEDIUM | Mostly clean (parents: components/inventory/BarcodeStudio.tsx) | usePropertyInspector.ts |
| 85 | components/inventory/studio/SidebarSection.tsx | SidebarSection | ? SKIP | Pure UI primitive/barrel (parents: components/inventory/studio/PropertyInspector.tsx) | - |
| 86 | components/inventory/studio/types.ts | types | ? SKIP | Pure UI primitive/barrel (parents: components/inventory/LabelPrinter.ts, components/inventory/BarcodePrinter.tsx, components/inventory/BarcodePreview.tsx, components/inventory/studio/PropertyInspector.tsx, components/inventory/BarcodeStudio.tsx) | - |
| 87 | components/layout/LandingPage.tsx | LandingPage | ?? LOW | Mostly clean (parents: components/layout/PageRouter.tsx) | useLandingPage.ts |
| 88 | components/layout/MainLayout.tsx | MainLayout | ?? MEDIUM | Validation/permission rules (parents: App.tsx) | useMainLayout.ts |
| 89 | components/layout/MobileDrawer.tsx | MobileDrawer | ?? MEDIUM | Effect orchestration (parents: components/layout/MobileNavigation.tsx) | useMobileDrawer.ts |
| 90 | components/layout/MobileNavigation.tsx | MobileNavigation | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules (parents: components/layout/MainLayout.tsx) | domain.service.ts / useMobileNavigation.ts |
| 91 | components/layout/Navbar.tsx | Navbar | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules (parents: components/layout/MainLayout.tsx) | domain.service.ts / useNavbar.ts |
| 92 | components/layout/PageRouter.tsx | PageRouter | ?? MEDIUM | Validation/permission rules (parents: App.tsx) | usePageRouter.ts |
| 93 | components/layout/SidebarContent.tsx | SidebarContent | ?? MEDIUM | Mostly clean (parents: components/layout/MobileDrawer.tsx, components/layout/MainLayout.tsx) | useSidebarContent.ts |
| 94 | components/layout/SidebarDropdown.tsx | SidebarDropdown | ?? MEDIUM | Derived data/transformation (parents: components/layout/Navbar.tsx) | useSidebarDropdown.ts |
| 95 | components/layout/SidebarMenu.tsx | SidebarMenu | ?? MEDIUM | Effect orchestration; Derived data/transformation (parents: components/layout/SidebarContent.tsx) | useSidebarMenu.ts |
| 96 | components/layout/StatusBar/StatusBarItem.tsx | StatusBarItem | ? SKIP | Pure UI primitive/barrel (parents: components/layout/StatusBar/items/SettingsMenu.tsx) | - |
| 97 | components/layout/StatusBar/index.ts | index | ? SKIP | Re-export barrel (parents: components/customers/CustomerManagement.tsx, components/inventory/BarcodePrinter.tsx, components/inventory/BarcodeStudio.tsx, components/inventory/AddProduct.tsx, components/inventory/Inventory.tsx, ...) | - |
| 98 | components/layout/StatusBar/items/SettingsMenu.tsx | SettingsMenu | ?? HIGH | Complex local state; Effect orchestration; Validation/permission rules (parents: components/layout/Navbar.tsx) | domain.service.ts / useSettingsMenu.ts |
| 99 | components/layout/TabBar.tsx | TabBar | ?? MEDIUM | Effect orchestration (parents: components/sales/pos/ui/POSPageHeader.tsx) | useTabBar.ts |
| 100 | components/mobile/InlineBarcodeScanner.tsx | InlineBarcodeScanner | ?? MEDIUM | Complex local state; Effect orchestration (parents: components/mobile/MobileMedicineSearch.tsx) | useInlineBarcodeScanner.ts |
| 101 | components/mobile/MobileMedicineSearch.tsx | MobileMedicineSearch | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation (parents: components/layout/MobileNavigation.tsx) | domain.service.ts / useMobileMedicineSearch.ts |
| 102 | components/mobile/MobileSearchCartDrawer.tsx | MobileSearchCartDrawer | ?? HIGH | Direct Supabase/query logic; Derived data/transformation; Validation/permission rules (parents: components/mobile/MobileMedicineSearch.tsx, components/layout/MobileNavigation.tsx) | domain.service.ts / useMobileSearchCartDrawer.ts |
| 103 | components/onboarding/BranchSetupScreen.tsx | BranchSetupScreen | ?? HIGH | Complex local state; Validation/permission rules (parents: App.tsx) | domain.service.ts / useBranchSetupScreen.ts |
| 104 | components/onboarding/EmployeeSetupScreen.tsx | EmployeeSetupScreen | ?? HIGH | Complex local state; Effect orchestration; Validation/permission rules (parents: App.tsx) | domain.service.ts / useEmployeeSetupScreen.ts |
| 105 | components/onboarding/OnboardingStepper.tsx | OnboardingStepper | ?? LOW | Mostly clean (parents: components/onboarding/OrgSetupScreen.tsx, components/onboarding/BranchSetupScreen.tsx, components/onboarding/EmployeeSetupScreen.tsx) | useOnboardingStepper.ts |
| 106 | components/onboarding/OrgSetupScreen.tsx | OrgSetupScreen | ?? HIGH | Complex local state; Validation/permission rules (parents: App.tsx) | domain.service.ts / useOrgSetupScreen.ts |
| 107 | components/org/BranchMasterMonitor.tsx | BranchMasterMonitor | ?? LOW | Mostly clean (parents: components/org/OrganizationManagementPage.tsx) | useBranchMasterMonitor.ts |
| 108 | components/org/MemberPermissionMatrix.tsx | MemberPermissionMatrix | ?? MEDIUM | Derived data/transformation; Validation/permission rules (parents: components/org/OrganizationManagementPage.tsx) | useMemberPermissionMatrix.ts |
| 109 | components/org/OrgPulseGrid.tsx | OrgPulseGrid | ?? LOW | Mostly clean (parents: components/org/OrganizationManagementPage.tsx) | useOrgPulseGrid.ts |
| 110 | components/org/OrganizationManagementPage.tsx | OrganizationManagementPage | ?? HIGH | Direct Supabase/query logic; Complex local state; Effect orchestration; Validation/permission rules | organization.service.ts / useOrganizationManagementPage.ts |
| 111 | components/org/QuotaMonitor.tsx | QuotaMonitor | ?? LOW | Mostly clean (parents: components/org/OrganizationManagementPage.tsx) | useQuotaMonitor.ts |
| 112 | components/purchases/PendingApproval.tsx | PendingApproval | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules | purchases.service.ts / usePendingApproval.ts |
| 113 | components/purchases/PurchaseReturns.tsx | PurchaseReturns | ?? HIGH | Complex local state; Derived data/transformation; Validation/permission rules | purchases.service.ts / usePurchaseReturns.ts |
| 114 | components/purchases/Purchases.tsx | Purchases | ?? HIGH | Direct Supabase/query logic; Storage side effects; Complex local state; Effect orchestration | purchases.service.ts / usePurchases.ts |
| 115 | components/purchases/SuppliersList.tsx | SuppliersList | ?? HIGH | Direct Supabase/query logic; Complex local state; Derived data/transformation; Validation/permission rules | purchases.service.ts / useSuppliersList.ts |
| 116 | components/reports/LoginAuditList.tsx | LoginAuditList | ?? HIGH | Derived data/transformation; Validation/permission rules | domain.service.ts / useLoginAuditList.ts |
| 117 | components/sales/CashRegister.tsx | CashRegister | ?? HIGH | Complex local state; Derived data/transformation; Validation/permission rules | sales.service.ts / useCashRegister.ts |
| 118 | components/sales/InvoiceTemplate.ts | defaultOptions | ?? MEDIUM | Mostly clean (parents: components/sales/pos/DeliveryOrdersModal.tsx, components/sales/pos/hooks/usePOSCheckout.ts, components/sales/ReceiptDesigner.tsx, components/sales/SaleDetailModal.tsx, components/sales/SalesHistory.tsx) | useInvoiceTemplate.ts |
| 119 | components/sales/ReceiptDesigner.tsx | ReceiptDesigner | ?? HIGH | Storage side effects; Complex local state; Effect orchestration; Derived data/transformation | sales.service.ts / useReceiptDesigner.ts |
| 120 | components/sales/ReturnHistory.tsx | ReturnHistory | ?? MEDIUM | Complex local state; Effect orchestration; Derived data/transformation | useReturnHistory.ts |
| 121 | components/sales/ReturnModal.tsx | ReturnModal | ?? HIGH | Direct Supabase/query logic; Complex local state; Derived data/transformation; Validation/permission rules (parents: components/sales/SaleDetailModal.tsx, components/sales/SalesHistory.tsx) | sales.service.ts / useReturnModal.ts |
| 122 | components/sales/SaleDetailModal.tsx | SaleDetailModal | ?? HIGH | Direct Supabase/query logic; Derived data/transformation; Validation/permission rules (parents: components/sales/ReturnHistory.tsx, components/sales/SalesHistory.tsx) | sales.service.ts / useSaleDetailModal.ts |
| 123 | components/sales/SalesHistory.tsx | SalesHistory | ?? HIGH | Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules | sales.service.ts / useSalesHistory.ts |
| 124 | components/sales/ShiftHistory.tsx | ShiftHistory | ?? HIGH | Complex local state; Derived data/transformation | sales.service.ts / useShiftHistory.ts |
| 125 | components/sales/ShiftReceiptTemplate.ts | generateShiftReceiptHTML | ?? LOW | Mostly clean (parents: components/sales/CashRegister.tsx, components/sales/ReceiptDesigner.tsx, components/sales/ShiftHistory.tsx) | useShiftReceiptTemplate.ts |
| 126 | components/sales/pos/CartItemControls.tsx | CartItemExpiryBadge | ?? MEDIUM | Validation/permission rules (parents: components/sales/pos/SortableCartItem.tsx, components/mobile/MobileMedicineSearch.tsx) | useCartItemControls.ts |
| 127 | components/sales/pos/DeliveryOrdersModal.tsx | DeliveryOrdersModal | ?? HIGH | Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation (parents: components/sales/pos/POS.tsx) | sales.service.ts / useDeliveryOrdersModal.ts |
| 128 | components/sales/pos/POS.tsx | POS | ?? HIGH | Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation | sales.service.ts / usePOS.ts |
| 129 | components/sales/pos/SortableCartItem.tsx | calculateItemTotal | ?? MEDIUM | Validation/permission rules (parents: components/sales/pos/POS.tsx, components/sales/pos/ui/POSCartSidebar.tsx) | useSortableCartItem.ts |
| 130 | components/sales/pos/hooks/useBarcodeScanner.ts | useBarcodeScanner | ?? MEDIUM | Effect orchestration (parents: components/sales/pos/POS.tsx) | components/sales/pos/hooks/useBarcodeScanner.ts |
| 131 | components/sales/pos/hooks/usePOSCart.ts | usePOSCart | ?? HIGH | Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation (parents: components/sales/pos/POS.tsx) | components/sales/pos/hooks/usePOSCart.ts |
| 132 | components/sales/pos/hooks/usePOSCheckout.ts | usePOSCheckout | ?? MEDIUM | Complex local state; Effect orchestration; Validation/permission rules (parents: components/sales/pos/POS.tsx) | components/sales/pos/hooks/usePOSCheckout.ts |
| 133 | components/sales/pos/hooks/usePOSCustomer.ts | usePOSCustomer | ?? MEDIUM | Complex local state; Effect orchestration (parents: components/sales/pos/POS.tsx) | components/sales/pos/hooks/usePOSCustomer.ts |
| 134 | components/sales/pos/hooks/usePOSSearchAndFilters.ts | usePOSSearchAndFilters | ?? MEDIUM | Derived data/transformation (parents: components/sales/pos/POS.tsx) | components/sales/pos/hooks/usePOSSearchAndFilters.ts |
| 135 | components/sales/pos/hooks/usePOSSearchWorker.ts | usePOSSearchWorker | ?? MEDIUM | Effect orchestration (parents: components/sales/pos/POS.tsx) | components/sales/pos/hooks/usePOSSearchWorker.ts |
| 136 | components/sales/pos/hooks/usePOSSidebarResizer.ts | usePOSSidebarResizer | ?? MEDIUM | Effect orchestration (parents: components/sales/pos/POS.tsx) | components/sales/pos/hooks/usePOSSidebarResizer.ts |
| 137 | components/sales/pos/ui/ClosedTabsHistoryModal.tsx | ClosedTabsHistoryModal | ?? MEDIUM | Mostly clean (parents: components/sales/pos/POS.tsx) | useClosedTabsHistoryModal.ts |
| 138 | components/sales/pos/ui/POSCartSidebar.tsx | POSCartSidebar | ?? MEDIUM | Derived data/transformation; Validation/permission rules (parents: components/sales/pos/POS.tsx, components/mobile/MobileSearchCartDrawer.tsx) | usePOSCartSidebar.ts |
| 139 | components/sales/pos/ui/POSCustomerHistoryModal.tsx | POSCustomerHistoryModal | ?? MEDIUM | Effect orchestration; Derived data/transformation (parents: components/sales/pos/POS.tsx, components/sales/SalesHistory.tsx) | usePOSCustomerHistoryModal.ts |
| 140 | components/sales/pos/ui/POSCustomerPanel.tsx | POSCustomerPanel | ?? MEDIUM | Mostly clean (parents: components/sales/pos/POS.tsx) | usePOSCustomerPanel.ts |
| 141 | components/sales/pos/ui/POSDrugAnalytics.tsx | POSDrugAnalytics | ?? MEDIUM | Effect orchestration (parents: components/sales/pos/POS.tsx) | usePOSDrugAnalytics.ts |
| 142 | components/sales/pos/ui/POSDrugBranches.tsx | POSDrugBranches | ?? MEDIUM | Effect orchestration (parents: components/sales/pos/POS.tsx) | usePOSDrugBranches.ts |
| 143 | components/sales/pos/ui/POSDrugOverview.tsx | POSDrugOverview | ?? MEDIUM | Derived data/transformation; Validation/permission rules (parents: components/sales/pos/POS.tsx) | usePOSDrugOverview.ts |
| 144 | components/sales/pos/ui/POSPageHeader.tsx | POSPageHeader | ?? MEDIUM | Mostly clean (parents: components/sales/pos/POS.tsx) | usePOSPageHeader.ts |
| 145 | components/sales/pos/utils/POSUtils.ts | formatExpiryDate | ?? MEDIUM | Validation/permission rules (parents: components/sales/pos/ui/ClosedTabsHistoryModal.tsx, components/sales/pos/hooks/usePOSCart.ts, components/sales/pos/hooks/usePOSCheckout.ts) | usePOSUtils.ts |
| 146 | components/settings/BranchSettings.tsx | BranchSettings | ?? HIGH | Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation | domain.service.ts / useBranchSettings.ts |
| 147 | components/settings/PrinterSettings.tsx | PrinterSettings | ?? MEDIUM | Complex local state; Effect orchestration (parents: components/layout/Navbar.tsx) | usePrinterSettings.ts |
| 148 | components/skeletons/GenericSkeleton.tsx | GenericSkeleton | ? SKIP | Pure UI primitive/barrel (parents: components/skeletons/PageSkeletonRegistry.tsx) | - |
| 149 | components/skeletons/InventorySkeleton.tsx | InventorySkeleton | ? SKIP | Pure UI primitive/barrel | - |
| 150 | components/skeletons/POSSkeleton.tsx | POSSkeleton | ? SKIP | Derived data/transformation | - |
| 151 | components/skeletons/PageSkeletonRegistry.tsx | PageSkeletonRegistry | ? SKIP | Pure UI primitive/barrel (parents: components/layout/PageRouter.tsx, App.tsx) | - |
| 152 | components/test/ModalTests.tsx | ModalTests | ?? MEDIUM | Mostly clean | useModalTests.ts |
| 153 | components/test/PurchasesTest.tsx | PurchasesTest | ?? HIGH | Direct Supabase/query logic; Storage side effects; Complex local state; Effect orchestration | domain.service.ts / usePurchasesTest.ts |
| 154 | pages/IntelligenceDashboard.tsx | IntelligenceDashboard | ?? MEDIUM | Complex local state; Effect orchestration; Derived data/transformation; Entangled enough to consider rewrite | useIntelligenceDashboard.ts |

### Refactor Order (suggested sequence):
1. ?? HIGH components/auth/ForgotPassword.tsx ? Complex local state; Validation/permission rules.
2. ?? HIGH components/auth/Login.tsx ? Effect orchestration; Validation/permission rules.
3. ?? HIGH components/auth/SignUp.tsx ? Validation/permission rules.
4. ?? HIGH components/common/DatePicker.tsx ? Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation.
5. ?? HIGH components/common/ErrorBoundary.tsx ? Validation/permission rules.
6. ?? HIGH components/common/SecureGate.tsx ? Storage side effects; Complex local state; Effect orchestration; Validation/permission rules.
7. ?? HIGH components/common/SmartInputs.tsx ? Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules.
8. ?? HIGH components/common/TanStackTable.tsx ? Storage side effects; Complex local state; Effect orchestration; Derived data/transformation.
9. ?? HIGH components/customers/CustomerDensityMap.tsx ? Direct Supabase/query logic; Effect orchestration.
10. ?? HIGH components/customers/CustomerLoyaltyOverview.tsx ? Direct Supabase/query logic; Derived data/transformation.
11. ?? HIGH components/customers/CustomerManagement.tsx ? Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules.
12. ?? HIGH components/customers/CustomerOverview.tsx ? Derived data/transformation; Validation/permission rules.
13. ?? HIGH components/dashboard/Dashboard.tsx ? Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules.
14. ?? HIGH components/dashboard/RealTimeSalesMonitor.tsx ? Complex local state; Effect orchestration; Derived data/transformation.
15. ?? HIGH components/dashboard/useDashboardAnalytics.ts ? Derived data/transformation.
16. ?? HIGH components/dashboard/useRealTimeSalesAnalytics.ts ? Derived data/transformation.
17. ?? HIGH components/experiments/ExpandedChartModal.tsx ? Direct Supabase/query logic; Complex local state; Derived data/transformation.
18. ?? HIGH components/experiments/ExpandedProgressModal.tsx ? Direct Supabase/query logic; Derived data/transformation.
19. ?? HIGH components/hr/EmployeeList.tsx ? Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules.
20. ?? HIGH components/hr/EmployeeProfile.tsx ? Direct Supabase/query logic; Storage side effects; Complex local state; Effect orchestration.
21. ?? HIGH components/inventory/AddProduct.tsx ? Effect orchestration; Derived data/transformation; Validation/permission rules.
22. ?? HIGH components/inventory/BarcodePrinter.tsx ? Complex local state; Effect orchestration; Derived data/transformation.
23. ?? HIGH components/inventory/BarcodeStudio.tsx ? Complex local state; Effect orchestration; Derived data/transformation.
24. ?? HIGH components/inventory/Inventory.tsx ? Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules.
25. ?? HIGH components/inventory/StockAdjustment.tsx ? Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation.
26. ?? HIGH components/layout/MobileNavigation.tsx ? Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules.
27. ?? HIGH components/layout/Navbar.tsx ? Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules.
28. ?? HIGH components/layout/StatusBar/items/SettingsMenu.tsx ? Complex local state; Effect orchestration; Validation/permission rules.
29. ?? HIGH components/mobile/MobileMedicineSearch.tsx ? Complex local state; Effect orchestration; Derived data/transformation.
30. ?? HIGH components/mobile/MobileSearchCartDrawer.tsx ? Direct Supabase/query logic; Derived data/transformation; Validation/permission rules.
31. ?? HIGH components/onboarding/BranchSetupScreen.tsx ? Complex local state; Validation/permission rules.
32. ?? HIGH components/onboarding/EmployeeSetupScreen.tsx ? Complex local state; Effect orchestration; Validation/permission rules.
33. ?? HIGH components/onboarding/OrgSetupScreen.tsx ? Complex local state; Validation/permission rules.
34. ?? HIGH components/org/OrganizationManagementPage.tsx ? Direct Supabase/query logic; Complex local state; Effect orchestration; Validation/permission rules.
35. ?? HIGH components/purchases/PendingApproval.tsx ? Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules.
36. ?? HIGH components/purchases/PurchaseReturns.tsx ? Complex local state; Derived data/transformation; Validation/permission rules.
37. ?? HIGH components/purchases/Purchases.tsx ? Direct Supabase/query logic; Storage side effects; Complex local state; Effect orchestration.
38. ?? HIGH components/purchases/SuppliersList.tsx ? Direct Supabase/query logic; Complex local state; Derived data/transformation; Validation/permission rules.
39. ?? HIGH components/reports/LoginAuditList.tsx ? Derived data/transformation; Validation/permission rules.
40. ?? HIGH components/sales/CashRegister.tsx ? Complex local state; Derived data/transformation; Validation/permission rules.
41. ?? HIGH components/sales/ReceiptDesigner.tsx ? Storage side effects; Complex local state; Effect orchestration; Derived data/transformation.
42. ?? HIGH components/sales/ReturnModal.tsx ? Direct Supabase/query logic; Complex local state; Derived data/transformation; Validation/permission rules.
43. ?? HIGH components/sales/SaleDetailModal.tsx ? Direct Supabase/query logic; Derived data/transformation; Validation/permission rules.
44. ?? HIGH components/sales/SalesHistory.tsx ? Complex local state; Effect orchestration; Derived data/transformation; Validation/permission rules.
45. ?? HIGH components/sales/ShiftHistory.tsx ? Complex local state; Derived data/transformation.
46. ?? HIGH components/sales/pos/DeliveryOrdersModal.tsx ? Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation.
47. ?? HIGH components/sales/pos/POS.tsx ? Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation.
48. ?? HIGH components/sales/pos/hooks/usePOSCart.ts ? Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation.
49. ?? HIGH components/settings/BranchSettings.tsx ? Direct Supabase/query logic; Complex local state; Effect orchestration; Derived data/transformation.
50. ?? HIGH components/test/PurchasesTest.tsx ? Direct Supabase/query logic; Storage side effects; Complex local state; Effect orchestration.
51. ?? MEDIUM components/layout/PageRouter.tsx ? Validation/permission rules.
52. ?? MEDIUM components/auth/AuthPage.tsx ? Validation/permission rules.
53. ?? MEDIUM components/common/LocationSelector.tsx ? Effect orchestration; Derived data/transformation.
54. ?? MEDIUM components/customers/CustomerHistory.tsx ? Effect orchestration; Derived data/transformation.
55. ?? MEDIUM components/customers/CustomerLoyaltyLookup.tsx ? Effect orchestration; Derived data/transformation.
56. ?? MEDIUM components/experiments/AdvancedSmCard.tsx ? Mostly clean.
57. ?? MEDIUM components/experiments/DashboardExperiments.tsx ? Derived data/transformation.
58. ?? MEDIUM components/hr/StaffOverview.tsx ? Derived data/transformation.
59. ?? MEDIUM components/hr/hooks/useStaffAnalytics.tsx ? Derived data/transformation.
60. ?? MEDIUM components/intelligence/audit/AuditPage.tsx ? Mostly clean.
61. ?? MEDIUM components/intelligence/audit/TransactionDetailModal.tsx ? Mostly clean.
62. ?? MEDIUM components/intelligence/financials/FinancialsPage.tsx ? Mostly clean.
63. ?? MEDIUM components/intelligence/procurement/GeneratePOModal.tsx ? Mostly clean.
64. ?? MEDIUM components/intelligence/procurement/ProcurementPage.tsx ? Effect orchestration.
65. ?? MEDIUM components/intelligence/risk/CreateDiscountModal.tsx ? Mostly clean.
66. ?? MEDIUM components/intelligence/risk/ExpiryRiskGrid.tsx ? Mostly clean.
67. ?? MEDIUM components/intelligence/risk/RiskPage.tsx ? Effect orchestration.
68. ?? MEDIUM components/inventory/BarcodePreview.tsx ? Derived data/transformation.
69. ?? MEDIUM components/inventory/InventoryManagement.tsx ? Effect orchestration.
70. ?? MEDIUM components/inventory/LabelPrinter.ts ? Validation/permission rules.
71. ?? MEDIUM components/inventory/StockAdjustmentPrint.tsx ? Effect orchestration.
72. ?? MEDIUM components/inventory/studio/PropertyInspector.tsx ? Mostly clean.
73. ?? MEDIUM components/layout/MainLayout.tsx ? Validation/permission rules.
74. ?? MEDIUM components/layout/MobileDrawer.tsx ? Effect orchestration.
75. ?? MEDIUM components/layout/PageRouter.tsx ? Validation/permission rules.
76. ?? MEDIUM components/layout/SidebarContent.tsx ? Mostly clean.
77. ?? MEDIUM components/layout/SidebarDropdown.tsx ? Derived data/transformation.
78. ?? MEDIUM components/layout/SidebarMenu.tsx ? Effect orchestration; Derived data/transformation.
79. ?? MEDIUM components/layout/TabBar.tsx ? Effect orchestration.
80. ?? MEDIUM components/mobile/InlineBarcodeScanner.tsx ? Complex local state; Effect orchestration.
81. ?? MEDIUM components/org/MemberPermissionMatrix.tsx ? Derived data/transformation; Validation/permission rules.
82. ?? MEDIUM components/sales/InvoiceTemplate.ts ? Mostly clean.
83. ?? MEDIUM components/sales/ReturnHistory.tsx ? Complex local state; Effect orchestration; Derived data/transformation.
84. ?? MEDIUM components/sales/pos/CartItemControls.tsx ? Validation/permission rules.
85. ?? MEDIUM components/sales/pos/SortableCartItem.tsx ? Validation/permission rules.
86. ?? MEDIUM components/sales/pos/hooks/useBarcodeScanner.ts ? Effect orchestration.
87. ?? MEDIUM components/sales/pos/hooks/usePOSCheckout.ts ? Complex local state; Effect orchestration; Validation/permission rules.
88. ?? MEDIUM components/sales/pos/hooks/usePOSCustomer.ts ? Complex local state; Effect orchestration.
89. ?? MEDIUM components/sales/pos/hooks/usePOSSearchAndFilters.ts ? Derived data/transformation.
90. ?? MEDIUM components/sales/pos/hooks/usePOSSearchWorker.ts ? Effect orchestration.
91. ?? MEDIUM components/sales/pos/hooks/usePOSSidebarResizer.ts ? Effect orchestration.
92. ?? MEDIUM components/sales/pos/ui/ClosedTabsHistoryModal.tsx ? Mostly clean.
93. ?? MEDIUM components/sales/pos/ui/POSCartSidebar.tsx ? Derived data/transformation; Validation/permission rules.
94. ?? MEDIUM components/sales/pos/ui/POSCustomerHistoryModal.tsx ? Effect orchestration; Derived data/transformation.
95. ?? MEDIUM components/sales/pos/ui/POSCustomerPanel.tsx ? Mostly clean.
96. ?? MEDIUM components/sales/pos/ui/POSDrugAnalytics.tsx ? Effect orchestration.
97. ?? MEDIUM components/sales/pos/ui/POSDrugBranches.tsx ? Effect orchestration.
98. ?? MEDIUM components/sales/pos/ui/POSDrugOverview.tsx ? Derived data/transformation; Validation/permission rules.
99. ?? MEDIUM components/sales/pos/ui/POSPageHeader.tsx ? Mostly clean.
100. ?? MEDIUM components/sales/pos/utils/POSUtils.ts ? Validation/permission rules.
101. ?? MEDIUM components/settings/PrinterSettings.tsx ? Complex local state; Effect orchestration.
102. ?? MEDIUM components/test/ModalTests.tsx ? Mostly clean.
103. ?? MEDIUM pages/IntelligenceDashboard.tsx ? Complex local state; Effect orchestration; Derived data/transformation; Entangled enough to consider rewrite.

### Shared Utilities Needed:
- Date/expiry formatting and age bucketing: repeated in inventory, POS, sales history, shift history, and intelligence views.
- Currency/number formatting and totals: repeated across dashboard, sales, purchases, POS, and intelligence components.
- Search/filter/sort predicates: repeated in Inventory, Purchases, CustomerManagement, SalesHistory, ReturnHistory, and mobile search.
- Validation helpers for required fields, email/phone/password, permissions, quantity/price bounds: repeated in auth, onboarding, purchases, customers, employees, and returns.
- Receipt/invoice/print template generation: split shared print formatting from ReceiptDesigner, InvoiceTemplate, ShiftReceiptTemplate, Barcode/Label printers.
- Supabase CRUD/query adapters: consolidate direct `.from().select()/insert()/update()` usage in page components into domain services.
- Local/session storage helpers for drafts, gates, settings, and tab state: repeated across POS, Purchases, ReceiptDesigner, SecureGate, and app shell.
