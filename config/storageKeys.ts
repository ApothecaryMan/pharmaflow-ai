export const StorageKeys = {
  // Core config
  VIEW: 'pharma_view',
  ACTIVE_MODULE: 'pharma_activeModule',
  THEME: 'pharma_theme', // Note: SettingsContext might use different keys, need to check
  DARK_MODE: 'pharma_darkMode',
  LANGUAGE: 'pharma_language',
  SIDEBAR_VISIBLE: 'pharma_sidebarVisible',
  NAV_STYLE: 'pharma_navStyle',
  DEVELOPER_MODE: 'pharma_developerMode',
  POS_SIDEBAR_WIDTH: 'pos_sidebar_width',
  POS_TABS: 'pharma_pos_tabs',
  POS_ACTIVE_TAB_ID: 'pharma_pos_active_tab_id',
  PRINTER_SETTINGS: 'pharma_printer_config',
  
  // Label Printer & Barcode Studio
  RECEIPT_TEMPLATES: 'receipt_templates',
  RECEIPT_ACTIVE_TEMPLATE_ID: 'receipt_active_template_id',
  LABEL_DEFAULT_TEMPLATE: 'pharma_label_default_template',
  LABEL_TEMPLATES: 'pharma_label_templates',
  LABEL_DESIGN: 'pharma_label_design',
  SCREEN_CALIBRATION_RATIO: 'pharma_screen_calibration_ratio',

  SETTINGS: 'pharma_settings',
  SEQUENCES: 'pharma_sequences',
  
  // Data
  INVENTORY: 'pharma_inventory',
  EMPLOYEES: 'pharma_employees',
  SALES: 'pharma_sales',
  CUSTOMERS: 'pharma_customers',
  SUPPLIERS: 'pharma_suppliers',
  PURCHASES: 'pharma_purchases',
  PURCHASE_RETURNS: 'pharma_purchase_returns',
  RETURNS: 'pharma_returns',
  SHIFTS: 'pharma_shifts',
  STOCK_BATCHES: 'pharma_stock_batches',
  STOCK_MOVEMENTS: 'pharma_stock_movements',
  
  // User/Session
  PROFILE_IMAGE: 'pharma_profileImage',
  CURRENT_EMPLOYEE_ID: 'pharma_currentEmployeeId',

  // Misc
  MIGRATION_V1_UNITS: 'pharma_migration_v1_units',
  MIGRATION_BACKUP: 'pharma_backup_pre_migration_v1',
  CSV_LOADED_V5: 'pharma_csv_loaded_v5',
  
  // Time Service
  TIME_OFFSET: 'pharmaflow_time_offset',
  LAST_SYNC: 'pharmaflow_last_sync',
} as const;

export type StorageKeys = typeof StorageKeys[keyof typeof StorageKeys];
