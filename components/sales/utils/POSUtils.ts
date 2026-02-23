import type { CartItem, Customer, Sale, Drug } from '../../../types';
import { getLocationName } from '../../../data/locations';

/**
 * Standardizes the display of expiry dates.
 * Handles Date objects, ISO strings, and MM/YYYY strings.
 */
export const formatExpiryDate = (expiryDate: any): string => {
  if (!expiryDate) return '-';

  // If it's a standard Date or ISO string
  const dateObj = new Date(expiryDate);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toLocaleDateString('en-US', {
      month: '2-digit',
      year: '2-digit',
    });
  }

  // Fallback for MM/YYYY strings
  if (typeof expiryDate === 'string' && expiryDate.includes('/')) {
    const parts = expiryDate.split('/');
    if (parts.length === 2) {
      const month = parts[0].padStart(2, '0');
      const year = parts[1].length === 4 ? parts[1].slice(-2) : parts[1];
      return `${month}/${year}`;
    }
  }

  return expiryDate;
};

/**
 * Consolidates customer address components into a single string.
 */
export const formatFullAddress = (customer: Customer | null, language: 'EN' | 'AR' = 'EN'): string | undefined => {
  if (!customer) return undefined;

  return [
    customer.area ? getLocationName(customer.area, 'area', language) : '',
    customer.city ? getLocationName(customer.city, 'city', language) : '',
    customer.governorate ? getLocationName(customer.governorate, 'gov', language) : '',
  ]
    .filter(Boolean)
    .join(', ');
};

/**
 * Builds a standardized Sale object used for both API payloads and printing.
 */
export interface SalePayloadParams {
  items: CartItem[];
  customer: Customer | null;
  customerName?: string;
  customerCode?: string;
  paymentMethod: 'cash' | 'visa';
  saleType: 'walk-in' | 'delivery';
  deliveryFee: number;
  globalDiscount: number;
  subtotal: number;
  total: number;
  language?: 'EN' | 'AR';
  deliveryEmployeeId?: string;
  status?: Sale['status'];
  processingTimeMinutes?: number;
  date?: Date;
}

export const buildSalePayload = (params: SalePayloadParams): Sale => {
  const {
    items,
    customer,
    customerName,
    customerCode,
    paymentMethod,
    saleType,
    deliveryFee,
    globalDiscount,
    subtotal,
    total,
    language = 'EN',
    deliveryEmployeeId,
    status = 'completed',
    processingTimeMinutes,
    date = new Date(),
  } = params;

  return {
    id: `TRX-${date.getTime().toString().slice(-6)}`,
    date: date.toISOString(),
    items,
    customerName: customerName || customer?.name || 'Guest Customer',
    customerCode: customerCode || customer?.code,
    customerPhone: customer?.phone,
    customerAddress: formatFullAddress(customer, language),
    customerStreetAddress: customer?.streetAddress,
    paymentMethod,
    saleType,
    deliveryFee,
    globalDiscount,
    subtotal,
    total,
    deliveryEmployeeId,
    status,
    processingTimeMinutes,
    dailyOrderNumber: 0, // Should be assigned by server/state manager
  };
};

/**
 * Validates if adding a specific quantity of a drug (in packs or units) 
 * would exceed the current total stock.
 */
export const isStockConstraintMet = (
  drugId: string,
  stock: number,
  unitsPerPack: number | undefined,
  currentCart: CartItem[],
  delta: number,
  isUnit: boolean
): boolean => {
  // Calculate existing units in cart for this drug
  const existingUnits = currentCart
    .filter((item) => item.id === drugId)
    .reduce((sum, item) => {
      const perPack = item.unitsPerPack || 1;
      return sum + (item.isUnit ? item.quantity : item.quantity * perPack);
    }, 0);

  // Calculate new units to be added
  const newUnits = isUnit ? delta : delta * (unitsPerPack || 1);

  return existingUnits + newUnits <= stock;
};
