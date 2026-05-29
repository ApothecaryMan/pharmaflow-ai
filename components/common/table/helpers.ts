import { type FilterFn } from '@tanstack/react-table';
import { storage } from '../../../utils/storage';
import { normalizeDigits } from '../../../utils/localization';
import { createSearchRegex } from '../../../utils/searchUtils';
import { getSmartDirection } from '../SmartInputs';
import {
  getHeaderJustifyClass,
  getItemsAlignClass,
  getTextAlignClass,
} from '../TableAlignment';

/**
 * A pure utility to check if a value matches a filter (string search or array pills).
 * Handles digit normalization and case-insensitivity.
 */
export const checkValueMatchesFilter = (value: any, filterValue: any): boolean => {
  if (filterValue === undefined || filterValue === null || filterValue === '') return true;

  // 1. Handle Array-based filters (Pills)
  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0 || filterValue.includes('all')) return true;

    // Cell value might be an array or a scalar
    if (Array.isArray(value)) {
      return value.some((v) => filterValue.includes(v));
    }
    return filterValue.includes(value);
  }

  // 2. Handle String-based filters (Search)
  const normalizedSearch = normalizeDigits(String(filterValue || ''));
  const regex = createSearchRegex(normalizedSearch);
  const strValue = normalizeDigits(String(value || ''));

  return regex.test(strValue);
};

// Define a unified filter function compatible with TanStack FilterFn signature
export const unifiedFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  return checkValueMatchesFilter(row.getValue(columnId), filterValue);
};

// Stable global filter fn
export const globalFilterFnStable: FilterFn<any> = (row, columnId, filterValue) => {
  return checkValueMatchesFilter(row.getValue(columnId), filterValue);
};

// Technical column detection set for O(1) lookups
const TECHNICAL_COLUMN_KEYWORDS = new Set([
  'id',
  'sku',
  'barcode',
  'batch',
  'serial',
  'email',
  'address',
  'phone',
  'mobile',
  'invoice',
  'receipt',
  'code',
]);

/**
 * Checks if a column id or header string contains any technical keyword.
 */
export const isTechnicalColumn = (columnId: string, header: string, meta: any): boolean => {
  if (meta?.isId || meta?.noConvert) return true;
  const id = columnId.toLowerCase();
  const h = header.toLowerCase();
  return Array.from(TECHNICAL_COLUMN_KEYWORDS).some((kw) => id.includes(kw) || h.includes(kw));
};

// Helper to get stored settings
export const getStoredSettings = (tableId: string) => {
  return storage.get(`table-settings-${tableId}`, null);
};

// Encapsulates clipboard copying with fallback for non-secure contexts
export const copyTextToClipboard = (text: string): Promise<boolean> => {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }
  document.body.removeChild(textArea);
  return Promise.resolve(success);
};

const ALIGN_END_KEYWORDS = ['price', 'cost', 'revenue', 'profit', 'qty', 'quantity', 'amount', 'total', 'balance'];
const ALIGN_CENTER_KEYWORDS = ['status', 'active', 'is_', 'action', 'driver', 'man'];

export const getSmartAlignment = (columnId: string, meta?: any): 'start' | 'end' | 'center' => {
  if (meta?.align)
    return meta.align === 'left' ? 'start' : meta.align === 'right' ? 'end' : meta.align;

  const id = columnId.toLowerCase();
  if (ALIGN_END_KEYWORDS.some((key) => id.includes(key)))
    return 'end';
  if (ALIGN_CENTER_KEYWORDS.some((key) => id.includes(key)))
    return 'center';
  return 'start';
};

export const getColumnWidth = (column: any, isFlex: boolean, columnSizing: any) => {
  const isResized = columnSizing && !!columnSizing[column.id];
  return isFlex && !isResized ? 'auto' : column.getSize();
};

export const getCellDirection = (columnId: string, meta: any, cellValue: any, isRtl: boolean) => {
  const id = columnId.toLowerCase();
  if (id === 'name') return 'ltr';
  if (meta?.isId || meta?.isAction) return isRtl ? 'rtl' : 'ltr';
  // Disabled content-based auto direction check
  // if (meta?.dir === 'auto') return getSmartDirection(String(cellValue || ''));
  return meta?.dir && meta.dir !== 'auto' ? meta.dir : (isRtl ? 'rtl' : 'ltr');
};

export const formatSmartDate = (
  dateVal: string | number | Date,
  todayTs: number,
  yesterdayTs: number,
  isRtl: boolean
) => {
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return null;

  const targetTs = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const isToday = targetTs === todayTs;
  const isYesterday = targetTs === yesterdayTs;

  const dateLabel = isToday
    ? isRtl ? 'اليوم' : 'Today'
    : isYesterday
      ? isRtl ? 'أمس' : 'Yesterday'
      : date.toLocaleDateString();

  const hourRaw = date.getHours();
  const ampm = isRtl ? (hourRaw >= 12 ? 'م' : 'ص') : hourRaw >= 12 ? 'PM' : 'AM';
  const displayHour = (hourRaw % 12 || 12).toLocaleString(undefined, { useGrouping: false });
  const displayMinute = date.getMinutes().toLocaleString(undefined, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
  const formattedTime = `${displayHour}:${displayMinute} ${ampm}`;

  return {
    isToday,
    dateLabel,
    formattedTime,
  };
};

export const computeColumnMeta = (column: any, columnAlignment: Record<string, any>) => {
  const id = column.id;
  const colId = id.toLowerCase();
  const meta = column.columnDef.meta;
  const header = String(column.columnDef.header || '').toLowerCase();

  const align = (meta?.disableAlignment ? null : columnAlignment[id]) || getSmartAlignment(id, meta);

  const isId = meta?.isId ?? (colId.includes('id') || colId.includes('code'));
  const isDate =
    (['date', 'time', 'timestamp', 'visit'].some((k) => colId.includes(k)) ||
      (colId.includes('at') && !colId.includes('csat'))) &&
    !colId.includes('expiry');

  const isTechnical = isTechnicalColumn(colId, header, meta);

  return {
    align,
    isId,
    isDate,
    isTechnical,
    isAction: colId.includes('action'),
    isFlex: meta?.flex ?? colId.includes('name'),
    justifyClass: getHeaderJustifyClass(align),
    textAlignClass: getTextAlignClass(align),
    itemsAlignClass: getItemsAlignClass(align),
    width: meta?.width,
    minWidth: meta?.minWidth,
    smartDate: meta?.smartDate !== false,
  };
};

export const getHeaderAlignment = (column: any, meta: any, isRtl: boolean) => {
  let headerAlign = column.columnDef.meta?.headerAlign;
  if (!headerAlign && column.id.toLowerCase() === 'name') {
    headerAlign = isRtl ? 'end' : 'start';
  }
  return headerAlign || meta?.align || 'start';
};
