import type { CartItem, Customer, Sale, Drug } from '../../../../types';
import { getLocationName } from '../../../../data/locations';

import { formatExpiryDate as formatExpiryDateShared } from '../../../../utils/expiryUtils';

/**
 * Standardizes the display of expiry dates.
 * Re-exported from shared utilities.
 */
export const formatExpiryDate = formatExpiryDateShared;

/**
 * Formats a timestamp into a 12-hour time string (HH:MM AM/PM).
 */
export const formatTime = (timestamp: number | undefined): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
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
  branchId: string;
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
    branchId,
  } = params;

  return {
    date: date.toISOString(),
    items,
    branchId,
    customerName: customerName || customer?.name || 'Guest Customer',
    customerCode: (customerCode || customer?.code) || undefined,
    customerPhone: customer?.phone,
    customerAddress: formatFullAddress(customer, language),
    customerStreetAddress: customer?.streetAddress,
    paymentMethod,
    saleType,
    deliveryFee,
    globalDiscount,
    subtotal,
    total,
    deliveryEmployeeId: deliveryEmployeeId || undefined,
    status,
    processingTimeMinutes,
  } as Sale;
};

