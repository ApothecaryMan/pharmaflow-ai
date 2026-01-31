import { PermissionAction } from './permissions';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  order?: number;
  hasPage?: boolean;
  submenus?: {
    id: string;
    label: string;
    permission?: PermissionAction; // Added for RBAC
    items: (string | { label: string; view?: string; icon?: string; permission?: PermissionAction })[];
  }[];
  permission?: PermissionAction; // Added for RBAC
}

export const PHARMACY_MENU: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "dashboard_customize",
    permission: "reports.view_inventory",
    order: 1,
    hasPage: true,
    submenus: [
      {
        id: "main-dashboard",
        label: "Main Dashboard",
        permission: "reports.view_inventory",
        items: [
          { label: "Dashboard Overview", view: "dashboard", icon: "dashboard" },
          { label: "Business Overview", icon: "business" },
          { label: "Quick Actions Panel", icon: "bolt" },
          { label: "Favorites & Shortcuts", icon: "star" },
          { label: "Recent Activities", icon: "history" },
          { label: "Task Manager", icon: "task_alt" },
          { label: "Important Reminders", icon: "notification_important" }
        ]
      },
      {
        id: "sales-dashboard",
        label: "Sales Dashboard",
        permission: "sale.view_history",
        items: [
          { label: "Real-time Sales Monitor", view: "real-time-sales", icon: "monitoring" },
          { label: "Today's Sales Summary", icon: "today" },
          { label: "Sales by Hour", icon: "schedule" },
          { label: "Sales by Counter", icon: "storefront" },
          { label: "Sales by Payment Method", icon: "payments" },
          { label: "Top Selling Products", icon: "trending_up" },
          { label: "Slow Moving Products", icon: "trending_down" },
          { label: "Sales Trends (7 days)", icon: "timeline" },
          { label: "Sales Trends (30 days)", icon: "auto_graph" },
          { label: "Sales Comparison (YoY)", icon: "compare_arrows" },
          { label: "Target vs Achievement", icon: "track_changes" },
          { label: "Sales Forecast", icon: "online_prediction" },
          { label: "Product Performance", icon: "inventory" },
          { label: "Category-wise Sales", icon: "category" },
          { label: "Brand-wise Sales", icon: "branding_watermark" }
        ]
      },
      {
        id: "inventory-dashboard",
        label: "Inventory Dashboard",
        permission: "reports.view_inventory",
        items: [
          { label: "Stock Overview", icon: "package_2" },
          { label: "Stock Value Summary", icon: "monetization_on" },
          { label: "Low Stock Alerts", icon: "warning" },
          { label: "Out of Stock Items", icon: "remove_shopping_cart" },
          { label: "Overstock Items", icon: "production_quantity_limits" },
          { label: "Expiry Alert Dashboard", icon: "event_busy" },
          { label: "Expired Items (Current)", icon: "event_busy" },
          { label: "Expiring in 7 days", icon: "date_range" },
          { label: "Expiring in 30 days", icon: "calendar_month" },
          { label: "Expiring in 90 days", icon: "event_note" },
          { label: "Stock Movement Chart", icon: "show_chart" },
          { label: "Fast Moving Items", icon: "rocket_launch" },
          { label: "Dead Stock Report", icon: "block" },
          { label: "Inventory Turnover", icon: "sync" },
          { label: "Category-wise Stock", icon: "category" },
          { label: "Location-wise Stock", icon: "location_on" },
          { label: "Batch Expiry Calendar", icon: "calendar_today" }
        ]
      },
      {
        id: "financial-dashboard",
        label: "Financial Dashboard",
        permission: "reports.view_financial",
        items: [
          { label: "Financial Overview", icon: "account_balance" },
          { label: "Revenue Summary", icon: "paid" },
          { label: "Profit & Loss Today", icon: "analytics" },
          { label: "Cash Flow Status", icon: "savings" },
          { label: "Payment Collection Status", icon: "check_circle" },
          { label: "Outstanding Receivables", icon: "pending" },
          { label: "Outstanding Payables", icon: "outbound" },
          { label: "Daily Cash Register", icon: "point_of_sale" },
          { label: "Bank Balance Overview", icon: "account_balance_wallet" },
          { label: "Expense Tracker", icon: "receipt_long" },
          { label: "Revenue vs Expense", icon: "compare" },
          { label: "Profit Margin Analysis", icon: "pie_chart" },
          { label: "Monthly Financial Trends", icon: "bar_chart" },
          { label: "Quarterly Performance", icon: "leaderboard" },
          { label: "Year-to-Date Summary", icon: "summarize" },
          { label: "Budget vs Actual", icon: "fact_check" },
          { label: "Financial Health Score", icon: "health_and_safety" }
        ]
      },
      {
        id: "customer-dashboard",
        label: "Customer Dashboard",
        items: [
          { label: "Customer Overview", view: "customer-overview", icon: "groups" },
          { label: "Loyalty Overview", view: "loyalty-overview", icon: "loyalty" },
          { label: "Customer Loyalty", view: "loyalty-lookup", icon: "card_membership" },
          { label: "New Customers Today", icon: "person_add" },
          { label: "Active Customers", icon: "person" },
          { label: "Customer Growth Trend", icon: "trending_up" },
          { label: "Top Customers", icon: "stars" },
          { label: "Customer Retention Rate", icon: "replay" },
          { label: "Credit Customer Status", icon: "credit_score" },
          { label: "Outstanding Payments", icon: "money_off" },
          { label: "Loyalty Points Summary", icon: "stars" },
          { label: "Customer Satisfaction", icon: "sentiment_satisfied" },
          { label: "Customer Segments", icon: "group_work" },
          { label: "Purchase Frequency", icon: "shopping_bag" },
          { label: "Average Transaction Value", icon: "attach_money" },
          { label: "Customer Lifetime Value", icon: "all_inclusive" }
        ]
      },
      {
        id: "prescription-dashboard",
        label: "Prescription Dashboard",
        items: [
          { label: "Prescription Overview", icon: "prescriptions" },
          { label: "Pending Prescriptions", icon: "hourglass_empty" },
          { label: "In-Progress Count", icon: "loop" },
          { label: "Ready for Pickup", icon: "shopping_bag" },
          { label: "Completed Today", icon: "done_all" },
          { label: "Prescription Queue", icon: "queue" },
          { label: "Average Processing Time", icon: "timer" },
          { label: "Refill Reminders", icon: "restore" },
          { label: "Insurance Claims Status", icon: "verified" },
          { label: "Doctor-wise Prescriptions", icon: "medical_services" },
          { label: "Prescription Trends", icon: "ssid_chart" }
        ]
      },
      {
        id: "purchase-dashboard",
        label: "Purchase Dashboard",
        items: [
          { label: "Purchase Overview", icon: "shopping_cart" },
          { label: "Pending Purchase Orders", icon: "pending_actions" },
          { label: "Orders to Receive", icon: "input" },
          { label: "Supplier Performance", icon: "local_shipping" },
          { label: "Purchase Trends", icon: "trending_flat" },
          { label: "Top Suppliers", icon: "star_rate" },
          { label: "Purchase Value Summary", icon: "price_check" },
          { label: "Payment Due to Suppliers", icon: "payments" },
          { label: "Purchase vs Budget", icon: "savings" },
          { label: "Cost Analysis", icon: "calculate" }
        ]
      },
      {
        id: "employee-dashboard",
        label: "Employee Dashboard",
        items: [
          { label: "Staff Overview", icon: "badge" },
          { label: "Attendance Today", icon: "how_to_reg" },
          { label: "Active Staff Members", icon: "people" },
          { label: "Leave Requests", icon: "event_busy" },
          { label: "Sales by Employee", icon: "point_of_sale" },
          { label: "Employee Performance", icon: "workspace_premium" },
          { label: "Shift Schedule", icon: "schedule", permission: 'shift.view' },
          { label: "Task Assignments", icon: "assignment" },
          { label: "Commission Summary", icon: "attach_money" }
        ]
      },
      {
        id: "compliance-dashboard",
        label: "Compliance Dashboard",
        items: [
          { label: "Compliance Overview", icon: "policy" },
          { label: "License Expiry Status", icon: "badge" },
          { label: "Controlled Drugs Log", icon: "local_police" },
          { label: "Audit Trail Summary", icon: "history_edu" },
          { label: "Regulatory Alerts", icon: "gavel" },
          { label: "Compliance Score", icon: "verified_user" },
          { label: "Pending Inspections", icon: "search" },
          { label: "Document Renewal Status", icon: "autorenew" }
        ]
      },
      {
        id: "analytics-dashboard",
        label: "Analytics Dashboard",
        items: [
          { label: "Business Intelligence", icon: "lightbulb" },
          { label: "Predictive Analytics", icon: "online_prediction" },
          { label: "Trend Analysis", icon: "trending_up" },
          { label: "Pattern Recognition", icon: "scatter_plot" },
          { label: "Seasonal Trends", icon: "wb_sunny" },
          { label: "Market Basket Analysis", icon: "shopping_basket" },
          { label: "Customer Behavior Analysis", icon: "psychology" },
          { label: "Product Affinity Analysis", icon: "link" },
          { label: "Price Optimization", icon: "style" },
          { label: "Demand Forecasting", icon: "query_stats" }
        ]
      },
      {
        id: "alerts-notifications",
        label: "Alerts & Notifications",
        items: [
          { label: "All Notifications", icon: "notifications" },
          { label: "Critical Alerts", icon: "crisis_alert" },
          { label: "Stock Alerts", icon: "inventory" },
          { label: "Expiry Alerts", icon: "event_busy" },
          { label: "Payment Reminders", icon: "payment" },
          { label: "Low Balance Alerts", icon: "money_off" },
          { label: "System Notifications", icon: "dns" },
          { label: "Task Reminders", icon: "task" },
          { label: "Approval Pending", icon: "approval" },
          { label: "Custom Alerts", icon: "tune" }
        ]
      },
      {
        id: "performance-metrics",
        label: "Performance Metrics",
        items: [
          { label: "KPI Dashboard", icon: "speed" },
          { label: "Business Metrics", icon: "analytics" },
          { label: "Operational Efficiency", icon: "settings_suggest" },
          { label: "Inventory Turnover Ratio", icon: "sync" },
          { label: "Gross Profit Margin", icon: "trending_up" },
          { label: "Net Profit Margin", icon: "monetization_on" },
          { label: "Return on Investment", icon: "currency_exchange" },
          { label: "Average Sale Value", icon: "sell" },
          { label: "Conversion Rate", icon: "transform" },
          { label: "Customer Acquisition Cost", icon: "person_add" },
          { label: "Customer Retention Rate", icon: "repeat" },
          { label: "Inventory Days", icon: "calendar_view_day" },
          { label: "Receivables Days", icon: "receipt" },
          { label: "Payables Days", icon: "outbox" }
        ]
      },
      {
        id: "comparison-reports",
        label: "Comparison Reports",
        items: [
          { label: "Day-over-Day Comparison", icon: "view_day" },
          { label: "Week-over-Week", icon: "view_week" },
          { label: "Month-over-Month", icon: "calendar_view_month" },
          { label: "Quarter-over-Quarter", icon: "pie_chart" },
          { label: "Year-over-Year", icon: "calendar_today" },
          { label: "Branch Comparison", icon: "store" },
          { label: "Counter Comparison", icon: "laptop" },
          { label: "Employee Comparison", icon: "group" },
          { label: "Supplier Comparison", icon: "local_shipping" }
        ]
      },
      {
        id: "widgets-customization",
        label: "Widgets & Customization",
        items: [
          { label: "Widget Library", icon: "widgets" },
          { label: "Add Custom Widgets", icon: "add_circle_outline" },
          { label: "Dashboard Layout", icon: "dashboard_customize" },
          { label: "Save Dashboard View", icon: "save" },
          { label: "Dashboard Templates", icon: "space_dashboard" },
          { label: "Color Themes", icon: "palette" },
          { label: "Data Refresh Settings", icon: "sync" },
          { label: "Export Dashboard", icon: "file_download" },
          { label: "Share Dashboard", icon: "share" }
        ]
      }
    ]
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: "package_2",
    permission: "inventory.view",
    order: 2,
    hasPage: true,
    submenus: [
      {
        id: "product-management",
        label: "Product Management",
        items: [
          { label: "Inventory", view: "inventory", icon: "inventory" },
          { label: "Bulk Import", icon: "upload_file" },
          { label: "Bulk Update", icon: "update" },
          { label: "Product Categories", icon: "category" },
          { label: "Product Attributes", icon: "tune" },
          { label: "Barcodes/SKU", icon: "qr_code" },
          { label: "Barcode Printer", view: "barcode-printer", icon: "print", permission: 'inventory.update' },
          { label: "Barcode Studio", view: "barcode-studio", icon: "design_services", permission: 'inventory.update' },
          { label: "Stock Adjustment", view: "stock-adjustment", icon: "edit_note", permission: 'inventory.adjust' },
          { label: "Product Images", icon: "image" },
          { label: "Product Bundles", icon: "package_2" },
          { label: "Product Kits", icon: "medical_services" },
          { label: "Product Variants", icon: "style" },
          { label: "Product Pricing Rules", icon: "price_change" },
          { label: "Product Discounts", icon: "percent" },
          { label: "Product Tags", icon: "label" },
          { label: "Product Reviews", icon: "rate_review" },
          { label: "Product Warranty", icon: "verified" },
          { label: "Product Manuals", icon: "menu_book" },
          { label: "Product Certifications", icon: "workspace_premium" },
          { label: "Product Compliance", icon: "gavel" }
        ]
      },
      {
        id: "stock-control",
        label: "Stock Control",
        items: [
          { label: "Current Stock", icon: "inventory" },
          { label: "Stock Adjustment", icon: "edit", permission: 'inventory.adjust' },
          { label: "Stock Transfer", icon: "local_shipping" },
          { label: "Stock Count", icon: "checklist" },
          { label: "Minimum Stock Levels", icon: "warning" },
          { label: "Reorder Points", icon: "reorder" },
          { label: "Stock Valuation", icon: "attach_money" }
        ]
      },
      {
        id: "categories-classification",
        label: "Categories & Classification",
        items: [
          { label: "Drug Categories", icon: "category" },
          { label: "Therapeutic Classes", icon: "healing" },
          { label: "Generic/Brand", icon: "local_pharmacy" },
          { label: "Controlled Substances", icon: "admin_meds" },
          { label: "OTC/Prescription", icon: "medication" },
          { label: "Manage Categories", icon: "edit_note" },
          { label: "Sub-categories", icon: "subdirectory_arrow_right" }
        ]
      },
      {
        id: "batch-expiry",
        label: "Batch & Expiry",
        items: [
          { label: "Batch Management", icon: "folder_zip" },
          { label: "Batch Tracking", icon: "track_changes" },
          { label: "Expiry Calendar", icon: "calendar_today" },
          { label: "Expired Items", icon: "event_busy" },
          { label: "Near Expiry (30 days)", icon: "date_range" },
          { label: "Near Expiry (60 days)", icon: "event_note" },
          { label: "Near Expiry (90 days)", icon: "event" },
          { label: "Batch Returns", icon: "assignment_return" }
        ]
      },
      {
        id: "stock-alerts",
        label: "Stock Alerts",
        items: [
          { label: "Low Stock Items", icon: "trending_down" },
          { label: "Out of Stock", icon: "remove_shopping_cart" },
          { label: "Overstock Items", icon: "production_quantity_limits" },
          { label: "Dead Stock", icon: "block" },
          { label: "Fast Moving Items", icon: "fast_forward" },
          { label: "Slow Moving Items", icon: "slow_motion_video" }
        ]
      },
      {
        id: "warehouse-management",
        label: "Warehouse Management",
        items: [
          { label: "Multiple Locations", icon: "store" },
          { label: "Bin/Shelf Management", icon: "shelves" },
          { label: "Inter-branch Transfer", icon: "transfer_within_a_station" },
          { label: "Location Mapping", icon: "map" }
        ]
      }
    ]
  },
  {
    id: "sales",
    label: "Sales",
    icon: "point_of_sale",
    permission: "sale.create",
    order: 3,
    hasPage: true,
    submenus: [
      {
        id: "point-of-sale",
        label: "Point of Sale",
        items: [
          { label: "New Sale", view: "pos", icon: "point_of_sale", permission: 'sale.create' },
          { label: "Cash Register", view: "cash-register", icon: "receipt_long", permission: 'shift.open' },
          { label: "Shift History", view: "shift-history", icon: "history", permission: 'shift.reports' }
        ]
      },
      {
        id: "sales-management",
        label: "Sales Management",
        items: [
          { label: "Today's Sales", icon: "today", permission: 'sale.view_history' },
          { label: "Sales History", view: "sales-history", icon: "history", permission: 'sale.view_history' }
        ]
      },
      {
        id: "returns-refunds",
        label: "Returns & Refunds",
        items: [
          { label: "Process Return", icon: "keyboard_return", permission: 'sale.refund' },
          { label: "Return History", view: "return-history", icon: "assignment_return", permission: 'sale.refund' }
        ]
      },
      {
        id: "sales-design",
        label: "Design",
        items: [
          { label: "Receipt Design", view: "receipt-designer", icon: "design_services", permission: 'settings.update' }
        ]
      }
    ]
  },
  {
    id: "purchase",
    label: "Purchase",
    icon: "shopping_cart_checkout",
    permission: "purchase.view",
    order: 4,
    hasPage: true,
    submenus: [
      {
        id: "purchase-orders",
        label: "Purchase Orders",
        items: [
          { label: "Create PO", view: "purchases", icon: "add_shopping_cart" },
          { label: "Draft PO", icon: "edit_note" },
          { label: "Pending Approval", view: "pending-approval", icon: "pending_actions", permission: 'purchase.approve' },
          { label: "Approved PO", icon: "verified" },
          { label: "PO History", icon: "history" },
          { label: "Cancel PO", icon: "cancel" },
          { label: "PO Templates", icon: "file_copy" }
        ]
      },
      {
        id: "goods-receipt",
        label: "Goods Receipt",
        items: [
          { label: "Receive Stock", icon: "move_to_inbox" },
          { label: "Pending Receipts", icon: "hourglass_empty" },
          { label: "Partial Receipts", icon: "pie_chart_outline" },
          { label: "Received Orders", icon: "done_all" },
          { label: "Receipt Verification", icon: "fact_check" },
          { label: "Quality Check", icon: "health_and_safety" }
        ]
      },
      {
        id: "supplier-management",
        label: "Supplier Management",
        permission: "supplier.view",
        items: [
          { label: "Supplier List", view: "suppliers", icon: "local_shipping" },
          { label: "Supplier Profile", icon: "contact_page" },
          { label: "Supplier Ratings", icon: "star_half" },
          { label: "Payment Terms", icon: "payment" },
          { label: "Supplier Catalog", icon: "menu_book" },
          { label: "Supplier Contracts", icon: "gavel" }
        ]
      },
      {
        id: "purchase-returns",
        label: "Purchase Returns",
        items: [
          { label: "Create Return", view: "purchase-returns", icon: "keyboard_return" },
          { label: "Return History", icon: "history" },
          { label: "Return Approval", icon: "approval" },
          { label: "Supplier Credits", icon: "credit_card" }
        ]
      },
      {
        id: "purchase-analytics",
        label: "Purchase Analytics",
        items: [
          { label: "Purchase Reports", icon: "bar_chart" },
          { label: "Supplier Performance", icon: "trending_up" },
          { label: "Cost Analysis", icon: "attach_money" },
          { label: "Order Trends", icon: "ssid_chart" }
        ]
      }
    ]
  },
  {
    id: "customers",
    label: "Customers",
    icon: "group",
    permission: "customer.view",
    order: 5,
    hasPage: true,
    submenus: [
      {
        id: "customer-database",
        label: "Customer Database",
        items: [
          { label: "All Customers", view: "customers", icon: "groups" },
          { label: "Add Customer", icon: "person_add" },
          { label: "Edit Customer", icon: "edit" },
          { label: "Customer Profile", icon: "account_circle" },
          { label: "Customer History", view: "customer-history", icon: "manage_search" },
          { label: "Customer Search", icon: "search" },
          { label: "Import Customers", icon: "upload" },
          { label: "Merge Duplicates", icon: "merge_type" }
        ]
      },
      {
        id: "customer-groups",
        label: "Customer Groups",
        items: [
          { label: "Group Management", icon: "group_work" },
          { label: "Senior Citizens", icon: "elderly" },
          { label: "Corporate Clients", icon: "business" },
          { label: "Insurance Customers", icon: "security" },
          { label: "VIP Customers", icon: "star" },
          { label: "Walk-in Customers", icon: "directions_walk" }
        ]
      },
      {
        id: "credit-management",
        label: "Credit Management",
        items: [
          { label: "Credit Customers", icon: "credit_score" },
          { label: "Outstanding Balance", icon: "account_balance_wallet" },
          { label: "Credit Limit", icon: "credit_card" },
          { label: "Payment Collection", icon: "payments" },
          { label: "Credit History", icon: "history" },
          { label: "Overdue Accounts", icon: "warning" },
          { label: "Payment Reminders", icon: "notifications_active" }
        ]
      },
      {
        id: "loyalty-rewards",
        label: "Loyalty & Rewards",
        items: [
          { label: "Loyalty Program", icon: "loyalty" },
          { label: "Points Management", icon: "stars" },
          { label: "Reward Redemption", icon: "redeem" },
          { label: "Membership Tiers", icon: "military_tech" },
          { label: "Special Offers", icon: "local_offer" },
          { label: "Birthday Rewards", icon: "cake" }
        ]
      },
      {
        id: "customer-communication",
        label: "Customer Communication",
        items: [
          { label: "SMS Notifications", icon: "sms" },
          { label: "Email Campaigns", icon: "email" },
          { label: "WhatsApp Messages", icon: "chat" },
          { label: "Prescription Reminders", icon: "alarm" },
          { label: "Promotional Messages", icon: "campaign" }
        ]
      }
    ]
  },
  {
    id: "prescriptions",
    label: "Prescriptions",
    icon: "description",
    permission: "inventory.view",
    order: 6,
    hasPage: false,
    submenus: [
      {
        id: "prescription-processing",
        label: "Prescription Processing",
        items: [
          { label: "Upload Prescription", icon: "upload_file" },
          { label: "Manual Entry", icon: "keyboard" },
          { label: "Scan Prescription", icon: "scanner" },
          { label: "OCR Recognition", icon: "text_snippet" },
          { label: "Prescription Queue", icon: "queue" },
          { label: "Priority Processing", icon: "priority_high" }
        ]
      },
      {
        id: "prescription-status",
        label: "Prescription Status",
        items: [
          { label: "Pending Review", icon: "hourglass_empty" },
          { label: "In Progress", icon: "loop" },
          { label: "Ready for Pickup", icon: "shopping_bag" },
          { label: "Completed", icon: "check_circle" },
          { label: "Cancelled", icon: "cancel" },
          { label: "On Hold", icon: "pause_circle" }
        ]
      },
      {
        id: "doctor-management",
        label: "Doctor Management",
        items: [
          { label: "Doctor Database", icon: "medical_services" },
          { label: "Add Doctor", icon: "person_add" },
          { label: "Verify Doctor", icon: "verified" },
          { label: "Doctor Prescriptions", icon: "description" },
          { label: "Doctor Analytics", icon: "analytics" }
        ]
      },
      {
        id: "prescription-history",
        label: "Prescription History",
        items: [
          { label: "Customer History", icon: "history" },
          { label: "Refill Management", icon: "restore" },
          { label: "Recurring Prescriptions", icon: "event_repeat" },
          { label: "Prescription Archive", icon: "archive" },
          { label: "Prescription Search", icon: "search" }
        ]
      },
      {
        id: "insurance-claims",
        label: "Insurance & Claims",
        items: [
          { label: "Insurance Verification", icon: "admin_panel_settings" },
          { label: "Claim Submission", icon: "send" },
          { label: "Claim Status", icon: "hourglass_top" },
          { label: "Rejected Claims", icon: "thumb_down" },
          { label: "Insurance Providers", icon: "health_and_safety" }
        ]
      }
    ]
  },
  {
    id: "finance",
    label: "Finance",
    icon: "payments",
    permission: "reports.view_financial",
    order: 7,
    hasPage: false,
    submenus: [
      {
        id: "accounts-management",
        label: "Accounts Management",
        items: [
          { label: "Chart of Accounts", icon: "account_tree" },
          { label: "General Ledger", icon: "book" },
          { label: "Journal Entries", icon: "edit_note" },
          { label: "Account Reconciliation", icon: "compare_arrows" },
          { label: "Trial Balance", icon: "balance" }
        ]
      },
      {
        id: "income-revenue",
        label: "Income & Revenue",
        items: [
          { label: "Revenue Tracking", icon: "trending_up" },
          { label: "Income Sources", icon: "source" },
          { label: "Daily Collections", icon: "today" },
          { label: "Payment Methods", icon: "payment" },
          { label: "Bank Deposits", icon: "account_balance" }
        ]
      },
      {
        id: "expenses",
        label: "Expenses",
        items: [
          { label: "Record Expense", icon: "receipt_long" },
          { label: "Expense Categories", icon: "category" },
          { label: "Recurring Expenses", icon: "repeat" },
          { label: "Expense Approval", icon: "approval" },
          { label: "Petty Cash", icon: "money" },
          { label: "Vendor Payments", icon: "outbound" }
        ]
      },
      {
        id: "invoicing-billing",
        label: "Invoicing & Billing",
        items: [
          { label: "Generate Invoice", icon: "description" },
          { label: "Invoice Templates", icon: "filter_none" },
          { label: "Proforma Invoice", icon: "picture_as_pdf" },
          { label: "Tax Invoice", icon: "gavel" },
          { label: "Credit/Debit Notes", icon: "note_add" },
          { label: "Invoice History", icon: "history" }
        ]
      },
      {
        id: "payments",
        label: "Payments",
        items: [
          { label: "Payment Received", icon: "call_received" },
          { label: "Payment Made", icon: "call_made" },
          { label: "Pending Payments", icon: "hourglass_empty" },
          { label: "Payment Gateway", icon: "payment" },
          { label: "Payment History", icon: "history" },
          { label: "Payment Reconciliation", icon: "fact_check" }
        ]
      },
      {
        id: "financial-reports",
        label: "Financial Reports",
        items: [
          { label: "Profit & Loss", icon: "analytics" },
          { label: "Balance Sheet", icon: "account_balance_wallet" },
          { label: "Cash Flow", icon: "savings" },
          { label: "Income Statement", icon: "summarize" },
          { label: "Financial Summary", icon: "assessment" },
          { label: "Budget vs Actual", icon: "compare" }
        ]
      },
      {
        id: "tax-management",
        label: "Tax Management",
        items: [
          { label: "Tax Configuration", icon: "settings" },
          { label: "Tax Reports", icon: "summarize" },
          { label: "GST/VAT Returns", icon: "assignment_returned" },
          { label: "Tax Exemptions", icon: "money_off" },
          { label: "TDS Management", icon: "percent" }
        ]
      }
    ]
  },
  {
    id: "reports",
    label: "Reports",
    icon: "bar_chart",
    permission: "reports.view_inventory",
    order: 8,
    hasPage: false,
    submenus: [
      {
        id: "sales-reports",
        label: "Sales Reports",
        items: [
          { label: "Daily Sales", icon: "today" },
          { label: "Sales Summary", icon: "summarize" },
          { label: "Sales by Product", icon: "package_2" },
          { label: "Sales by Category", icon: "category" },
          { label: "Sales by Customer", icon: "people" },
          { label: "Sales by Employee", icon: "badge" },
          { label: "Payment Method Report", icon: "payment" },
          { label: "Hourly Sales", icon: "schedule" },
          { label: "Counter-wise Sales", icon: "storefront" }
        ]
      },
      {
        id: "purchase-reports",
        label: "Purchase Reports",
        items: [
          { label: "Purchase Summary", icon: "summarize" },
          { label: "Purchase by Supplier", icon: "local_shipping" },
          { label: "Purchase by Product", icon: "inventory" },
          { label: "Purchase Trends", icon: "trending_up" },
          { label: "Cost Analysis", icon: "attach_money" },
          { label: "Purchase Returns Report", icon: "assignment_return" }
        ]
      },
      {
        id: "inventory-reports",
        label: "Inventory Reports",
        items: [
          { label: "Stock Summary", icon: "inventory" },
          { label: "Stock Movement", icon: "transfer_within_a_station" },
          { label: "Stock Valuation", icon: "monetization_on" },
          { label: "Dead Stock Report", icon: "block" },
          { label: "ABC Analysis", icon: "sort" },
          { label: "Inventory Turnover", icon: "sync" },
          { label: "Stock Aging", icon: "history" },
          { label: "Reorder Report", icon: "reorder" }
        ]
      },
      {
        id: "financial-reports-analytics",
        label: "Financial Reports",
        permission: "reports.view_financial",
        items: [
          { label: "Profit Report", icon: "analytics" },
          { label: "Margin Analysis", icon: "pie_chart" },
          { label: "Revenue Report", icon: "show_chart" },
          { label: "Expense Report", icon: "money_off" },
          { label: "Cash Book", icon: "book" },
          { label: "Bank Book", icon: "account_balance" },
          { label: "Daybook", icon: "calendar_today" }
        ]
      },
      {
        id: "business-intelligence",
        label: "Business Intelligence",
        items: [
          { label: "Sales by Product Analysis", view: "intelligence", icon: "auto_graph", permission: "reports.view_financial" },
          { label: "Login Audit Report", view: "login-audit", icon: "history", permission: "reports.view_financial" },
        ]
      },
      {
        id: "customer-reports",
        label: "Customer Reports",
        items: [
          { label: "Customer Analysis", icon: "person_search" },
          { label: "Top Customers", icon: "star" },
          { label: "Customer Loyalty", icon: "loyalty" },
          { label: "Outstanding Report", icon: "pending" },
          { label: "Customer Aging", icon: "timelapse" }
        ]
      },
      {
        id: "compliance-reports",
        label: "Compliance Reports",
        items: [
          { label: "Expiry Report", icon: "event_busy" },
          { label: "Near Expiry Report", icon: "event" },
          { label: "Controlled Drugs Log", icon: "security" },
          { label: "Narcotic Register", icon: "medication" },
          { label: "Schedule H Report", icon: "description" },
          { label: "Audit Trail Report", icon: "history_edu" }
        ]
      },
      {
        id: "employee-reports",
        label: "Employee Reports",
        items: [
          { label: "Sales by Employee", icon: "point_of_sale" },
          { label: "Employee Performance", icon: "trending_up" },
          { label: "Attendance Report", icon: "schedule" },
          { label: "Commission Report", icon: "attach_money" }
        ]
      },
      {
        id: "custom-reports",
        label: "Custom Reports",
        items: [
          { label: "Report Builder", icon: "build" },
          { label: "Saved Reports", icon: "bookmark" },
          { label: "Scheduled Reports", icon: "alarm" },
          { label: "Export Reports", icon: "file_download" },
          { label: "Report Templates", icon: "copy_all" }
        ]
      }
    ]
  },
  {
    id: "hr",
    label: "HR",
    icon: "badge",
    permission: "users.view",
    order: 9,
    hasPage: false,
    submenus: [
      {
        id: "employee-management",
        label: "Employee Management",
        items: [
          { label: "Employee List", view: "employee-list", icon: "people" },
          { label: "Add Employee", icon: "person_add" },
          { label: "Employee Profile", view: "employee-profile", icon: "account_circle" },
          { label: "Employee Documents", icon: "folder_shared" },
          { label: "Employee Contracts", icon: "gavel" },
          { label: "Department Management", icon: "domain" },
          { label: "Designation Management", icon: "badge" }
        ]
      },
      {
        id: "attendance-leave",
        label: "Attendance & Leave",
        items: [
          { label: "Mark Attendance", icon: "touch_app" },
          { label: "Attendance Register", icon: "fact_check" },
          { label: "Biometric Integration", icon: "fingerprint" },
          { label: "Leave Application", icon: "event_note" },
          { label: "Leave Approval", icon: "approval" },
          { label: "Leave Balance", icon: "account_balance_wallet" },
          { label: "Holiday Calendar", icon: "calendar_month" },
          { label: "Shift Roster", icon: "schedule", permission: 'shift.view' }
        ]
      },
      {
        id: "payroll-management",
        label: "Payroll Management",
        items: [
          { label: "Salary Structure", icon: "account_tree" },
          { label: "Generate Payslip", icon: "receipt" },
          { label: "Salary Processing", icon: "calculate" },
          { label: "Salary Disbursement", icon: "payments" },
          { label: "Advance Salary", icon: "price_check" },
          { label: "Loan Management", icon: "credit_score" },
          { label: "Bonus/Incentives", icon: "stars" }
        ]
      },
      {
        id: "performance",
        label: "Performance",
        items: [
          { label: "Performance Reviews", icon: "rate_review" },
          { label: "Target vs Achievement", icon: "ads_click" },
          { label: "KPI Management", icon: "speed" },
          { label: "Appraisals", icon: "thumb_up" },
          { label: "Training Records", icon: "school" }
        ]
      },
      {
        id: "user-accounts",
        label: "User Accounts",
        permission: "users.manage",
        items: [
          { label: "User Management", icon: "manage_accounts" },
          { label: "Create User", icon: "person_add" },
          { label: "User Roles", icon: "admin_panel_settings" },
          { label: "Access Control", icon: "lock" },
          { label: "Login History", icon: "history" },
          { label: "Active Sessions", icon: "laptop_chromebook" }
        ]
      }
    ]
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: "verified",
    permission: "inventory.view",
    order: 10,
    hasPage: false,
    submenus: [
      {
        id: "drug-regulations",
        label: "Drug Regulations",
        items: [
          { label: "Drug Schedule", icon: "list_alt" },
          { label: "Controlled Substances", icon: "admin_meds" },
          { label: "Narcotic Drugs Log", icon: "warning" },
          { label: "Psychotropic Log", icon: "psychology" },
          { label: "Schedule H/H1/X", icon: "description" },
          { label: "Banned Drugs List", icon: "block" }
        ]
      },
      {
        id: "license-management",
        label: "License Management",
        items: [
          { label: "Drug License", icon: "card_membership" },
          { label: "License Renewal", icon: "autorenew" },
          { label: "GST Registration", icon: "confirmation_number" },
          { label: "Professional Registration", icon: "badge" },
          { label: "License Documents", icon: "folder" },
          { label: "Expiry Tracking", icon: "update" }
        ]
      },
      {
        id: "audit-compliance",
        label: "Audit & Compliance",
        items: [
          { label: "Audit Trail", icon: "history_edu" },
          { label: "User Activity Log", icon: "manage_search" },
          { label: "System Access Log", icon: "login" },
          { label: "Data Change Log", icon: "published_with_changes" },
          { label: "Compliance Checklist", icon: "checklist" },
          { label: "Regulatory Inspections", icon: "search" }
        ]
      },
      {
        id: "quality-control",
        label: "Quality Control",
        items: [
          { label: "Product Quality", icon: "high_quality" },
          { label: "Supplier Audit", icon: "store" },
          { label: "Quality Complaints", icon: "thumb_down" },
          { label: "Product Recalls", icon: "replay" },
          { label: "Adverse Event Reporting", icon: "report_problem" }
        ]
      },
      {
        id: "regulatory-reporting",
        label: "Regulatory Reporting",
        items: [
          { label: "Monthly Returns", icon: "summarize" },
          { label: "Government Reports", icon: "gavel" },
          { label: "DCGI Reports", icon: "account_balance" },
          { label: "State Drug Authority", icon: "local_police" },
          { label: "Export Reports", icon: "file_upload" }
        ]
      }
    ]
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    permission: "settings.view",
    order: 11,
    hasPage: false,
    submenus: [
      {
        id: "general-settings",
        label: "General Settings",
        items: [
          { label: "Company Profile", icon: "business" },
          { label: "Branch Management", icon: "store" },
          { label: "Business Hours", icon: "schedule" },
          { label: "Currency Settings", icon: "attach_money" },
          { label: "Date/Time Format", icon: "calendar_today" },
          { label: "Language Settings", icon: "language" }
        ]
      },
      {
        id: "user-security",
        label: "User & Security",
        permission: 'users.manage',
        items: [
          { label: "User Management", icon: "manage_accounts" },
          { label: "Roles & Permissions", icon: "security" },
          { label: "Password Policy", icon: "password" },
          { label: "Two-Factor Auth", icon: "phonelink_lock" },
          { label: "IP Restrictions", icon: "public_off" },
          { label: "Session Timeout", icon: "timer_off" }
        ]
      },
      {
        id: "pharmacy-configuration",
        label: "Pharmacy Configuration",
        items: [
          { label: "Store Information", icon: "storefront" },
          { label: "Multiple Branches", icon: "domain" },
          { label: "Counter Setup", icon: "point_of_sale" },
          { label: "Department Setup", icon: "category" },
          { label: "License Information", icon: "verified" }
        ]
      },
      {
        id: "tax-pricing",
        label: "Tax & Pricing",
        items: [
          { label: "Tax Configuration", icon: "percent" },
          { label: "Tax Rates", icon: "trending_up" },
          { label: "Pricing Rules", icon: "price_change" },
          { label: "Margin Settings", icon: "margin" },
          { label: "Discount Settings", icon: "discount" },
          { label: "Rounding Rules", icon: "exposure_zero" }
        ]
      },
      {
        id: "notification-settings",
        label: "Notification Settings",
        items: [
          { label: "Email Notifications", icon: "email" },
          { label: "SMS Settings", icon: "sms" },
          { label: "WhatsApp Integration", icon: "chat" },
          { label: "Alert Preferences", icon: "notifications_active" },
          { label: "Reminder Settings", icon: "alarm" },
          { label: "Notification Templates", icon: "edit_notifications" }
        ]
      },

      {
        id: "backup-data",
        label: "Backup & Data",
        permission: "backup.manage",
        items: [
          { label: "Backup Database", icon: "backup" },
          { label: "Restore Data", icon: "restore" },
          { label: "Auto Backup Settings", icon: "settings_backup_restore" },
          { label: "Data Export", icon: "file_upload" },
          { label: "Data Import", icon: "file_download" },
          { label: "Data Migration", icon: "move_to_inbox" }
        ]
      },
      {
        id: "integrations",
        label: "Integrations",
        items: [
          { label: "Payment Gateway", icon: "payment" },
          { label: "SMS Gateway", icon: "sms" },
          { label: "Email Server", icon: "mark_email_read" },
          { label: "Accounting Software", icon: "account_balance" },
          { label: "E-commerce", icon: "shopping_cart" },
          { label: "Third-party APIs", icon: "api" },
          { label: "Barcode Scanner", icon: "qr_code_scanner" }
        ]
      },
      {
        id: "system-settings",
        label: "System Settings",
        permission: 'settings.update',
        items: [
          { label: "System Preferences", icon: "settings" },
          { label: "Module Configuration", icon: "view_module" },
          { label: "Feature Activation", icon: "toggle_on" },
          { label: "System Logs", icon: "assignment" },
          { label: "Performance Settings", icon: "speed" },
          { label: "Cache Management", icon: "cached" }
        ]
      }
    ]
  },
  {
    id: "test",
    label: "Test",
    icon: "science",
    permission: "settings.view",
    order: 12,
    hasPage: true,
    submenus: [
      {
        id: "feature-testing",
        label: "Feature Testing",
        items: [
          { label: "POS v2", view: "test-pos-v2", icon: "point_of_sale" },
          { label: "New Components", view: "test-components", icon: "widgets" },
          { label: "Dashboard Experiments", view: "dashboard-experiments", icon: "dashboard_customize" },
          { label: "Advanced Sm Card", view: "advanced-sm-card", icon: "badge" }
        ]
      },
      {
        id: "development",
        label: "Development",
        items: [
          { label: "Data Context Test", view: "test-data-context", icon: "data_object" },
          { label: "Service Layer Test", view: "test-services", icon: "layers" },
          { label: "POS Test", view: "pos-test", icon: "point_of_sale" },
          { label: "Create PO (Test)", view: "purchases-test", icon: "add_shopping_cart" },
          { label: "Theme Preview", view: "test-theme", icon: "palette" },
          { label: "Modal Tests", view: "modal-tests", icon: "dialogs" },
          { label: "Login Test", view: "login-test", icon: "lock" }
        ]
      }
    ]
  }
];
