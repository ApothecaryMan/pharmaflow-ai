export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  order?: number;
  hasPage?: boolean;
  submenus?: {
    id: string;
    label: string;
    items: (string | { label: string; view?: string })[];
  }[];
}

export const PHARMACY_MENU: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "dashboard",
    order: 1,
    hasPage: true,
    submenus: [
      {
        id: "main-dashboard",
        label: "Main Dashboard",
        items: [
          { label: "Dashboard Overview", view: "dashboard" },
          "Business Overview",
          "Quick Actions Panel",
          "Favorites & Shortcuts",
          "Recent Activities",
          "Task Manager",
          "Important Reminders"
        ]
      },
      {
        id: "sales-dashboard",
        label: "Sales Dashboard",
        items: [
          { label: "Real-time Sales Monitor", view: "real-time-sales" },
          "Today's Sales Summary",
          "Sales by Hour",
          "Sales by Counter",
          "Sales by Payment Method",
          "Top Selling Products",
          "Slow Moving Products",
          "Sales Trends (7 days)",
          "Sales Trends (30 days)",
          "Sales Comparison (YoY)",
          "Target vs Achievement",
          "Sales Forecast",
          "Product Performance",
          "Category-wise Sales",
          "Brand-wise Sales"
        ]
      },
      {
        id: "inventory-dashboard",
        label: "Inventory Dashboard",
        items: [
          "Stock Overview",
          "Stock Value Summary",
          "Low Stock Alerts",
          "Out of Stock Items",
          "Overstock Items",
          "Expiry Alert Dashboard",
          "Expired Items (Current)",
          "Expiring in 7 days",
          "Expiring in 30 days",
          "Expiring in 90 days",
          "Stock Movement Chart",
          "Fast Moving Items",
          "Dead Stock Report",
          "Inventory Turnover",
          "Category-wise Stock",
          "Location-wise Stock",
          "Batch Expiry Calendar"
        ]
      },
      {
        id: "financial-dashboard",
        label: "Financial Dashboard",
        items: [
          "Financial Overview",
          "Revenue Summary",
          "Profit & Loss Today",
          "Cash Flow Status",
          "Payment Collection Status",
          "Outstanding Receivables",
          "Outstanding Payables",
          "Daily Cash Register",
          "Bank Balance Overview",
          "Expense Tracker",
          "Revenue vs Expense",
          "Profit Margin Analysis",
          "Monthly Financial Trends",
          "Quarterly Performance",
          "Year-to-Date Summary",
          "Budget vs Actual",
          "Financial Health Score"
        ]
      },
      {
        id: "customer-dashboard",
        label: "Customer Dashboard",
        items: [
          { label: "Customer Overview", view: "customer-overview" },
          { label: "Loyalty Overview", view: "loyalty-overview" },
          { label: "Customer Loyalty", view: "loyalty-lookup" },
          "New Customers Today",
          "Active Customers",
          "Customer Growth Trend",
          "Top Customers",
          "Customer Retention Rate",
          "Credit Customer Status",
          "Outstanding Payments",
          "Loyalty Points Summary",
          "Customer Satisfaction",
          "Customer Segments",
          "Purchase Frequency",
          "Average Transaction Value",
          "Customer Lifetime Value"
        ]
      },
      {
        id: "prescription-dashboard",
        label: "Prescription Dashboard",
        items: [
          "Prescription Overview",
          "Pending Prescriptions",
          "In-Progress Count",
          "Ready for Pickup",
          "Completed Today",
          "Prescription Queue",
          "Average Processing Time",
          "Refill Reminders",
          "Insurance Claims Status",
          "Doctor-wise Prescriptions",
          "Prescription Trends"
        ]
      },
      {
        id: "purchase-dashboard",
        label: "Purchase Dashboard",
        items: [
          "Purchase Overview",
          "Pending Purchase Orders",
          "Orders to Receive",
          "Supplier Performance",
          "Purchase Trends",
          "Top Suppliers",
          "Purchase Value Summary",
          "Payment Due to Suppliers",
          "Purchase vs Budget",
          "Cost Analysis"
        ]
      },
      {
        id: "employee-dashboard",
        label: "Employee Dashboard",
        items: [
          "Staff Overview",
          "Attendance Today",
          "Active Staff Members",
          "Leave Requests",
          "Sales by Employee",
          "Employee Performance",
          "Shift Schedule",
          "Task Assignments",
          "Commission Summary"
        ]
      },
      {
        id: "compliance-dashboard",
        label: "Compliance Dashboard",
        items: [
          "Compliance Overview",
          "License Expiry Status",
          "Controlled Drugs Log",
          "Audit Trail Summary",
          "Regulatory Alerts",
          "Compliance Score",
          "Pending Inspections",
          "Document Renewal Status"
        ]
      },
      {
        id: "analytics-dashboard",
        label: "Analytics Dashboard",
        items: [
          "Business Intelligence",
          "Predictive Analytics",
          "Trend Analysis",
          "Pattern Recognition",
          "Seasonal Trends",
          "Market Basket Analysis",
          "Customer Behavior Analysis",
          "Product Affinity Analysis",
          "Price Optimization",
          "Demand Forecasting"
        ]
      },
      {
        id: "alerts-notifications",
        label: "Alerts & Notifications",
        items: [
          "All Notifications",
          "Critical Alerts",
          "Stock Alerts",
          "Expiry Alerts",
          "Payment Reminders",
          "Low Balance Alerts",
          "System Notifications",
          "Task Reminders",
          "Approval Pending",
          "Custom Alerts"
        ]
      },
      {
        id: "performance-metrics",
        label: "Performance Metrics",
        items: [
          "KPI Dashboard",
          "Business Metrics",
          "Operational Efficiency",
          "Inventory Turnover Ratio",
          "Gross Profit Margin",
          "Net Profit Margin",
          "Return on Investment",
          "Average Sale Value",
          "Conversion Rate",
          "Customer Acquisition Cost",
          "Customer Retention Rate",
          "Inventory Days",
          "Receivables Days",
          "Payables Days"
        ]
      },
      {
        id: "comparison-reports",
        label: "Comparison Reports",
        items: [
          "Day-over-Day Comparison",
          "Week-over-Week",
          "Month-over-Month",
          "Quarter-over-Quarter",
          "Year-over-Year",
          "Branch Comparison",
          "Counter Comparison",
          "Employee Comparison",
          "Supplier Comparison"
        ]
      },
      {
        id: "widgets-customization",
        label: "Widgets & Customization",
        items: [
          "Widget Library",
          "Add Custom Widgets",
          "Dashboard Layout",
          "Save Dashboard View",
          "Dashboard Templates",
          "Color Themes",
          "Data Refresh Settings",
          "Export Dashboard",
          "Share Dashboard"
        ]
      }
    ]
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: "inventory_2",
    order: 2,
    hasPage: true,
    submenus: [
      {
        id: "product-management",
        label: "Product Management",
        items: [
          { label: "Inventory", view: "inventory" },
          "Bulk Import",
          "Bulk Update",
          "Product Categories",
          "Product Attributes",
          "Barcodes/SKU",
          { label: "Barcode Printer", view: "barcode-printer" },
          { label: "Barcode Studio", view: "barcode-studio" },
          { label: "Stock Adjustment", view: "stock-adjustment" },
          "Product Images",
          "Product Bundles",
          "Product Kits",
          "Product Variants",
          "Product Pricing Rules",
          "Product Discounts",
          "Product Tags",
          "Product Reviews",
          "Product Warranty",
          "Product Manuals",
          "Product Certifications",
          "Product Compliance"
        ]
      },
      {
        id: "stock-control",
        label: "Stock Control",
        items: [
          "Current Stock",
          "Stock Adjustment",
          "Stock Transfer",
          "Stock Count",
          "Minimum Stock Levels",
          "Reorder Points",
          "Stock Valuation"
        ]
      },
      {
        id: "categories-classification",
        label: "Categories & Classification",
        items: [
          "Drug Categories",
          "Therapeutic Classes",
          "Generic/Brand",
          "Controlled Substances",
          "OTC/Prescription",
          "Manage Categories",
          "Sub-categories"
        ]
      },
      {
        id: "batch-expiry",
        label: "Batch & Expiry",
        items: [
          "Batch Management",
          "Batch Tracking",
          "Expiry Calendar",
          "Expired Items",
          "Near Expiry (30 days)",
          "Near Expiry (60 days)",
          "Near Expiry (90 days)",
          "Batch Returns"
        ]
      },
      {
        id: "stock-alerts",
        label: "Stock Alerts",
        items: [
          "Low Stock Items",
          "Out of Stock",
          "Overstock Items",
          "Dead Stock",
          "Fast Moving Items",
          "Slow Moving Items"
        ]
      },
      {
        id: "warehouse-management",
        label: "Warehouse Management",
        items: [
          "Multiple Locations",
          "Bin/Shelf Management",
          "Inter-branch Transfer",
          "Location Mapping"
        ]
      }
    ]
  },
  {
    id: "sales",
    label: "Sales",
    icon: "point_of_sale",
    order: 3,
    hasPage: true,
    submenus: [
      {
        id: "point-of-sale",
        label: "Point of Sale",
        items: [
          { label: "New Sale", view: "pos" },
          { label: "Cash Register", view: "cash-register" },
          { label: "Shift History", view: "shift-history" }
        ]
      },
      {
        id: "sales-management",
        label: "Sales Management",
        items: [
          "Today's Sales",
          { label: "Sales History", view: "sales-history" }
        ]
      },
      {
        id: "returns-refunds",
        label: "Returns & Refunds",
        items: [
          "Process Return",
          { label: "Return History", view: "return-history" }
        ]
      },
      {
        id: "sales-design",
        label: "Design",
        items: [
          { label: "Receipt Design", view: "receipt-designer" }
        ]
      }
    ]
  },
  {
    id: "purchase",
    label: "Purchase",
    icon: "shopping_cart_checkout",
    order: 4,
    hasPage: true,
    submenus: [
      {
        id: "purchase-orders",
        label: "Purchase Orders",
        items: [
          { label: "Create PO", view: "purchases" },
          "Draft PO",
          { label: "Pending Approval", view: "pending-approval" },
          "Approved PO",
          "PO History",
          "Cancel PO",
          "PO Templates"
        ]
      },
      {
        id: "goods-receipt",
        label: "Goods Receipt",
        items: [
          "Receive Stock",
          "Pending Receipts",
          "Partial Receipts",
          "Received Orders",
          "Receipt Verification",
          "Quality Check"
        ]
      },
      {
        id: "supplier-management",
        label: "Supplier Management",
        items: [
          { label: "Supplier List", view: "suppliers" },
          "Supplier Profile",
          "Supplier Ratings",
          "Payment Terms",
          "Supplier Catalog",
          "Supplier Contracts"
        ]
      },
      {
        id: "purchase-returns",
        label: "Purchase Returns",
        items: [
          { label: "Create Return", view: "purchase-returns" },
          "Return History",
          "Return Approval",
          "Supplier Credits"
        ]
      },
      {
        id: "purchase-analytics",
        label: "Purchase Analytics",
        items: [
          "Purchase Reports",
          "Supplier Performance",
          "Cost Analysis",
          "Order Trends"
        ]
      }
    ]
  },
  {
    id: "customers",
    label: "Customers",
    icon: "group",
    order: 5,
    hasPage: true,
    submenus: [
      {
        id: "customer-database",
        label: "Customer Database",
        items: [

          { label: "All Customers", view: "customers" },
          "Add Customer",
          "Edit Customer",
          "Customer Profile",
          "Customer Search",
          "Import Customers",
          "Merge Duplicates"
        ]
      },
      {
        id: "customer-groups",
        label: "Customer Groups",
        items: [
          "Group Management",
          "Senior Citizens",
          "Corporate Clients",
          "Insurance Customers",
          "VIP Customers",
          "Walk-in Customers"
        ]
      },
      {
        id: "credit-management",
        label: "Credit Management",
        items: [
          "Credit Customers",
          "Outstanding Balance",
          "Credit Limit",
          "Payment Collection",
          "Credit History",
          "Overdue Accounts",
          "Payment Reminders"
        ]
      },
      {
        id: "loyalty-rewards",
        label: "Loyalty & Rewards",
        items: [
          "Loyalty Program",
          "Points Management",
          "Reward Redemption",
          "Membership Tiers",
          "Special Offers",
          "Birthday Rewards"
        ]
      },
      {
        id: "customer-communication",
        label: "Customer Communication",
        items: [
          "SMS Notifications",
          "Email Campaigns",
          "WhatsApp Messages",
          "Prescription Reminders",
          "Promotional Messages"
        ]
      }
    ]
  },
  {
    id: "prescriptions",
    label: "Prescriptions",
    icon: "description",
    order: 6,
    hasPage: false,
    submenus: [
      {
        id: "prescription-processing",
        label: "Prescription Processing",
        items: [
          "Upload Prescription",
          "Manual Entry",
          "Scan Prescription",
          "OCR Recognition",
          "Prescription Queue",
          "Priority Processing"
        ]
      },
      {
        id: "prescription-status",
        label: "Prescription Status",
        items: [
          "Pending Review",
          "In Progress",
          "Ready for Pickup",
          "Completed",
          "Cancelled",
          "On Hold"
        ]
      },
      {
        id: "doctor-management",
        label: "Doctor Management",
        items: [
          "Doctor Database",
          "Add Doctor",
          "Verify Doctor",
          "Doctor Prescriptions",
          "Doctor Analytics"
        ]
      },
      {
        id: "prescription-history",
        label: "Prescription History",
        items: [
          "Customer History",
          "Refill Management",
          "Recurring Prescriptions",
          "Prescription Archive",
          "Prescription Search"
        ]
      },
      {
        id: "insurance-claims",
        label: "Insurance & Claims",
        items: [
          "Insurance Verification",
          "Claim Submission",
          "Claim Status",
          "Rejected Claims",
          "Insurance Providers"
        ]
      }
    ]
  },
  {
    id: "finance",
    label: "Finance",
    icon: "payments",
    order: 7,
    hasPage: false,
    submenus: [
      {
        id: "accounts-management",
        label: "Accounts Management",
        items: [
          "Chart of Accounts",
          "General Ledger",
          "Journal Entries",
          "Account Reconciliation",
          "Trial Balance"
        ]
      },
      {
        id: "income-revenue",
        label: "Income & Revenue",
        items: [
          "Revenue Tracking",
          "Income Sources",
          "Daily Collections",
          "Payment Methods",
          "Bank Deposits"
        ]
      },
      {
        id: "expenses",
        label: "Expenses",
        items: [
          "Record Expense",
          "Expense Categories",
          "Recurring Expenses",
          "Expense Approval",
          "Petty Cash",
          "Vendor Payments"
        ]
      },
      {
        id: "invoicing-billing",
        label: "Invoicing & Billing",
        items: [
          "Generate Invoice",
          "Invoice Templates",
          "Proforma Invoice",
          "Tax Invoice",
          "Credit/Debit Notes",
          "Invoice History"
        ]
      },
      {
        id: "payments",
        label: "Payments",
        items: [
          "Payment Received",
          "Payment Made",
          "Pending Payments",
          "Payment Gateway",
          "Payment History",
          "Payment Reconciliation"
        ]
      },
      {
        id: "financial-reports",
        label: "Financial Reports",
        items: [
          "Profit & Loss",
          "Balance Sheet",
          "Cash Flow",
          "Income Statement",
          "Financial Summary",
          "Budget vs Actual"
        ]
      },
      {
        id: "tax-management",
        label: "Tax Management",
        items: [
          "Tax Configuration",
          "Tax Reports",
          "GST/VAT Returns",
          "Tax Exemptions",
          "TDS Management"
        ]
      }
    ]
  },
  {
    id: "reports",
    label: "Reports",
    icon: "bar_chart",
    order: 8,
    hasPage: false,
    submenus: [
      {
        id: "sales-reports",
        label: "Sales Reports",
        items: [
          "Daily Sales",
          "Sales Summary",
          "Sales by Product",
          "Sales by Category",
          "Sales by Customer",
          "Sales by Employee",
          "Payment Method Report",
          "Hourly Sales",
          "Counter-wise Sales"
        ]
      },
      {
        id: "purchase-reports",
        label: "Purchase Reports",
        items: [
          "Purchase Summary",
          "Purchase by Supplier",
          "Purchase by Product",
          "Purchase Trends",
          "Cost Analysis",
          "Purchase Returns Report"
        ]
      },
      {
        id: "inventory-reports",
        label: "Inventory Reports",
        items: [
          "Stock Summary",
          "Stock Movement",
          "Stock Valuation",
          "Dead Stock Report",
          "ABC Analysis",
          "Inventory Turnover",
          "Stock Aging",
          "Reorder Report"
        ]
      },
      {
        id: "financial-reports-analytics",
        label: "Financial Reports",
        items: [
          "Profit Report",
          "Margin Analysis",
          "Revenue Report",
          "Expense Report",
          "Cash Book",
          "Bank Book",
          "Daybook"
        ]
      },
      {
        id: "customer-reports",
        label: "Customer Reports",
        items: [
          "Customer Analysis",
          "Top Customers",
          "Customer Purchase History",
          "Customer Loyalty",
          "Outstanding Report",
          "Customer Aging"
        ]
      },
      {
        id: "compliance-reports",
        label: "Compliance Reports",
        items: [
          "Expiry Report",
          "Near Expiry Report",
          "Controlled Drugs Log",
          "Narcotic Register",
          "Schedule H Report",
          "Audit Trail Report"
        ]
      },
      {
        id: "employee-reports",
        label: "Employee Reports",
        items: [
          "Sales by Employee",
          "Employee Performance",
          "Attendance Report",
          "Commission Report"
        ]
      },
      {
        id: "custom-reports",
        label: "Custom Reports",
        items: [
          "Report Builder",
          "Saved Reports",
          "Scheduled Reports",
          "Export Reports",
          "Report Templates"
        ]
      }
    ]
  },
  {
    id: "hr",
    label: "HR",
    icon: "badge",
    order: 9,
    hasPage: false,
    submenus: [
      {
        id: "employee-management",
        label: "Employee Management",
        items: [
          "Employee List",
          "Add Employee",
          "Employee Profile",
          "Employee Documents",
          "Employee Contracts",
          "Department Management",
          "Designation Management"
        ]
      },
      {
        id: "attendance-leave",
        label: "Attendance & Leave",
        items: [
          "Mark Attendance",
          "Attendance Register",
          "Biometric Integration",
          "Leave Application",
          "Leave Approval",
          "Leave Balance",
          "Holiday Calendar",
          "Shift Roster"
        ]
      },
      {
        id: "payroll-management",
        label: "Payroll Management",
        items: [
          "Salary Structure",
          "Generate Payslip",
          "Salary Processing",
          "Salary Disbursement",
          "Advance Salary",
          "Loan Management",
          "Bonus/Incentives"
        ]
      },
      {
        id: "performance",
        label: "Performance",
        items: [
          "Performance Reviews",
          "Target vs Achievement",
          "KPI Management",
          "Appraisals",
          "Training Records"
        ]
      },
      {
        id: "user-accounts",
        label: "User Accounts",
        items: [
          "User Management",
          "Create User",
          "User Roles",
          "Access Control",
          "Login History",
          "Active Sessions"
        ]
      }
    ]
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: "verified",
    order: 10,
    hasPage: false,
    submenus: [
      {
        id: "drug-regulations",
        label: "Drug Regulations",
        items: [
          "Drug Schedule",
          "Controlled Substances",
          "Narcotic Drugs Log",
          "Psychotropic Log",
          "Schedule H/H1/X",
          "Banned Drugs List"
        ]
      },
      {
        id: "license-management",
        label: "License Management",
        items: [
          "Drug License",
          "License Renewal",
          "GST Registration",
          "Professional Registration",
          "License Documents",
          "Expiry Tracking"
        ]
      },
      {
        id: "audit-compliance",
        label: "Audit & Compliance",
        items: [
          "Audit Trail",
          "User Activity Log",
          "System Access Log",
          "Data Change Log",
          "Compliance Checklist",
          "Regulatory Inspections"
        ]
      },
      {
        id: "quality-control",
        label: "Quality Control",
        items: [
          "Product Quality",
          "Supplier Audit",
          "Quality Complaints",
          "Product Recalls",
          "Adverse Event Reporting"
        ]
      },
      {
        id: "regulatory-reporting",
        label: "Regulatory Reporting",
        items: [
          "Monthly Returns",
          "Government Reports",
          "DCGI Reports",
          "State Drug Authority",
          "Export Reports"
        ]
      }
    ]
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    order: 11,
    hasPage: true,
    submenus: [
      {
        id: "general-settings",
        label: "General Settings",
        items: [
          "Company Profile",
          "Branch Management",
          "Business Hours",
          "Currency Settings",
          "Date/Time Format",
          "Language Settings"
        ]
      },
      {
        id: "user-security",
        label: "User & Security",
        items: [
          "User Management",
          "Roles & Permissions",
          "Password Policy",
          "Two-Factor Auth",
          "IP Restrictions",
          "Session Timeout"
        ]
      },
      {
        id: "pharmacy-configuration",
        label: "Pharmacy Configuration",
        items: [
          "Store Information",
          "Multiple Branches",
          "Counter Setup",
          "Department Setup",
          "License Information"
        ]
      },
      {
        id: "tax-pricing",
        label: "Tax & Pricing",
        items: [
          "Tax Configuration",
          "Tax Rates",
          "Pricing Rules",
          "Margin Settings",
          "Discount Settings",
          "Rounding Rules"
        ]
      },
      {
        id: "notification-settings",
        label: "Notification Settings",
        items: [
          "Email Notifications",
          "SMS Settings",
          "WhatsApp Integration",
          "Alert Preferences",
          "Reminder Settings",
          "Notification Templates"
        ]
      },
      {
        id: "print-settings",
        label: "Print Settings",
        items: [
          { label: "Printer Settings", view: "printer-settings" },
          "Invoice Templates",
          "Receipt Format",
          "Label Printing",
          "Barcode Settings",
          "Prescription Format",
          "Print Preferences"
        ]
      },
      {
        id: "backup-data",
        label: "Backup & Data",
        items: [
          "Backup Database",
          "Restore Data",
          "Auto Backup Settings",
          "Data Export",
          "Data Import",
          "Data Migration"
        ]
      },
      {
        id: "integrations",
        label: "Integrations",
        items: [
          "Payment Gateway",
          "SMS Gateway",
          "Email Server",
          "Accounting Software",
          "E-commerce",
          "Third-party APIs",
          "Barcode Scanner"
        ]
      },
      {
        id: "system-settings",
        label: "System Settings",
        items: [
          "System Preferences",
          "Module Configuration",
          "Feature Activation",
          "System Logs",
          "Performance Settings",
          "Cache Management"
        ]
      }
    ]
  },
  {
    id: "test",
    label: "Test",
    icon: "science",
    order: 12,
    hasPage: true,
    submenus: [
      {
        id: "feature-testing",
        label: "Feature Testing",
        items: [
          { label: "POS v2", view: "test-pos-v2" },
          { label: "New Components", view: "test-components" },
          { label: "Dashboard Experiments", view: "dashboard-experiments" }
        ]
      },
      {
        id: "development",
        label: "Development",
        items: [
          { label: "Data Context Test", view: "test-data-context" },
          { label: "Data Context Test", view: "test-data-context" },
          { label: "Service Layer Test", view: "test-services" },
          { label: "POS Test", view: "pos-test" },
          { label: "Theme Preview", view: "test-theme" }
        ]
      }
    ]
  }
];
