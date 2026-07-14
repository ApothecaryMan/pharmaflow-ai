import type { ShortcutCategory, ShortcutDef, ShortcutScope, ViewNavigationMap } from './types';

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    name: 'Global',
    nameAr: 'عام',
    shortcuts: [
      {
        id: 'global.command-palette',
        keys: 'ctrl+k',
        label: 'Command Palette',
        labelAr: 'قائمة الأوامر',
        category: 'Global',
        scope: 'global',
      },
      {
        id: 'global.shortcuts-help',
        keys: 'f1',
        label: 'Shortcuts Help',
        labelAr: 'عرض الاختصارات',
        category: 'Global',
        scope: 'global',
      },
      {
        id: 'global.nav-pos',
        keys: 'alt+1',
        label: 'Navigate → POS',
        labelAr: 'نقطة البيع',
        category: 'Global',
        scope: 'global',
      },
      {
        id: 'global.nav-inventory',
        keys: 'alt+2',
        label: 'Navigate → Inventory',
        labelAr: 'المخزون',
        category: 'Global',
        scope: 'global',
      },
      {
        id: 'global.nav-purchases',
        keys: 'alt+3',
        label: 'Navigate → Purchases',
        labelAr: 'المشتريات',
        category: 'Global',
        scope: 'global',
      },
      {
        id: 'global.nav-dashboard',
        keys: 'alt+4',
        label: 'Navigate → Dashboard',
        labelAr: 'لوحة التحكم',
        category: 'Global',
        scope: 'global',
      },
      {
        id: 'global.nav-sales-history',
        keys: 'alt+5',
        label: 'Navigate → Sales History',
        labelAr: 'سجل المبيعات',
        category: 'Global',
        scope: 'global',
      },
      {
        id: 'global.nav-customers',
        keys: 'alt+6',
        label: 'Navigate → Customers',
        labelAr: 'العملاء',
        category: 'Global',
        scope: 'global',
      },
      {
        id: 'global.nav-reports',
        keys: 'alt+7',
        label: 'Navigate → Reports',
        labelAr: 'التقارير',
        category: 'Global',
        scope: 'global',
      },
      {
        id: 'global.nav-settings',
        keys: 'alt+8',
        label: 'Navigate → Settings',
        labelAr: 'الإعدادات',
        category: 'Global',
        scope: 'global',
      },
    ],
  },
  {
    name: 'POS',
    nameAr: 'نقطة البيع',
    shortcuts: [
      {
        id: 'pos.new-tab',
        keys: 'f2',
        label: 'New POS Tab',
        labelAr: 'تبويبة جديدة',
        category: 'POS',
        scope: 'pos',
      },
      {
        id: 'pos.focus-search',
        keys: 'f9',
        label: 'Focus Search',
        labelAr: 'التركيز على البحث',
        category: 'POS',
        scope: 'pos',
      },
      {
        id: 'pos.checkout',
        keys: 'ctrl+enter',
        label: 'Checkout',
        labelAr: 'إتمام البيع',
        category: 'POS',
        scope: 'pos',
      },
      {
        id: 'pos.qty-increase',
        keys: '+',
        label: 'Increase Quantity',
        labelAr: 'زيادة الكمية',
        category: 'POS',
        scope: 'pos',
      },
      {
        id: 'pos.qty-decrease',
        keys: '-',
        label: 'Decrease Quantity',
        labelAr: 'تقليل الكمية',
        category: 'POS',
        scope: 'pos',
      },
      {
        id: 'pos.delete-item',
        keys: 'delete',
        label: 'Remove Item',
        labelAr: 'حذف الصنف',
        category: 'POS',
        scope: 'pos',
      },
      {
        id: 'pos.delivery-orders',
        keys: 'ctrl+d',
        label: 'Delivery Orders',
        labelAr: 'طلبات التوصيل',
        category: 'POS',
        scope: 'pos',
      },
      {
        id: 'pos.print-receipt',
        keys: 'ctrl+p',
        label: 'Print Receipt',
        labelAr: 'طباعة الفاتورة',
        category: 'POS',
        scope: 'pos',
      },
    ],
  },
  {
    name: 'Inventory',
    nameAr: 'المخزون',
    shortcuts: [
      {
        id: 'inventory.add-product',
        keys: 'ctrl+n',
        label: 'Add New Product',
        labelAr: 'إضافة صنف جديد',
        category: 'Inventory',
        scope: 'inventory',
      },
      {
        id: 'inventory.edit',
        keys: 'ctrl+e',
        label: 'Edit Selected',
        labelAr: 'تعديل المحدد',
        category: 'Inventory',
        scope: 'inventory',
      },
      {
        id: 'inventory.delete',
        keys: 'delete',
        label: 'Delete Selected',
        labelAr: 'حذف المحدد',
        category: 'Inventory',
        scope: 'inventory',
      },
      {
        id: 'inventory.search',
        keys: 'ctrl+f',
        label: 'Focus Table Search',
        labelAr: 'بحث في الجدول',
        category: 'Inventory',
        scope: 'inventory',
      },
    ],
  },
  {
    name: 'Purchases',
    nameAr: 'المشتريات',
    shortcuts: [
      {
        id: 'purchases.new-order',
        keys: 'ctrl+n',
        label: 'New Purchase Order',
        labelAr: 'أمر شراء جديد',
        category: 'Purchases',
        scope: 'purchases',
      },
      {
        id: 'purchases.save-draft',
        keys: 'ctrl+s',
        label: 'Save Draft',
        labelAr: 'حفظ المسودة',
        category: 'Purchases',
        scope: 'purchases',
      },
    ],
  },
  {
    name: 'Barcode Studio',
    nameAr: 'استوديو الباركود',
    shortcuts: [
      {
        id: 'barcode-studio.print',
        keys: 'ctrl+p',
        label: 'Print',
        labelAr: 'طباعة',
        category: 'Barcode Studio',
        scope: 'barcode-studio',
      },
      {
        id: 'barcode-studio.undo',
        keys: 'ctrl+z',
        label: 'Undo',
        labelAr: 'تراجع',
        category: 'Barcode Studio',
        scope: 'barcode-studio',
      },
      {
        id: 'barcode-studio.redo',
        keys: 'ctrl+y',
        label: 'Redo',
        labelAr: 'إعادة',
        category: 'Barcode Studio',
        scope: 'barcode-studio',
      },
    ],
  },
  {
    name: 'Calculator',
    nameAr: 'آلة حاسبة',
    shortcuts: [
      {
        id: 'calculator.calculate',
        keys: 'enter',
        label: 'Calculate',
        labelAr: 'حساب',
        category: 'Calculator',
        scope: 'calculator',
      },
      {
        id: 'calculator.clear',
        keys: 'escape',
        label: 'Clear',
        labelAr: 'مسح',
        category: 'Calculator',
        scope: 'calculator',
      },
    ],
  },
];

export const VIEW_NAVIGATION_MAP: ViewNavigationMap = {
  1: 'pos',
  2: 'inventory',
  3: 'purchases',
  4: 'dashboard',
  5: 'sales-history',
  6: 'customers',
  7: 'intelligence',
  8: 'desktop-settings',
};

export const DEFAULT_SHORTCUTS: Record<string, string> = {};

for (const category of SHORTCUT_CATEGORIES) {
  for (const shortcut of category.shortcuts) {
    DEFAULT_SHORTCUTS[shortcut.id] = shortcut.keys;
  }
}

export function getShortcutById(id: string): ShortcutDef | undefined {
  for (const category of SHORTCUT_CATEGORIES) {
    for (const shortcut of category.shortcuts) {
      if (shortcut.id === id) return shortcut;
    }
  }
  return undefined;
}

export function getShortcutsByScope(scope: ShortcutScope): ShortcutDef[] {
  const result: ShortcutDef[] = [];
  for (const category of SHORTCUT_CATEGORIES) {
    for (const shortcut of category.shortcuts) {
      if (shortcut.scope === scope) result.push(shortcut);
    }
  }
  return result;
}
