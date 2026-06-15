/**
 * Data Generators for Stress Tests
 * Creates realistic random data for checkout, inventory, and customer operations.
 */

import { TEST_DATA } from '../config.js';

/**
 * Pick N random drugs from the test pool.
 */
export function pickRandomDrugs(count) {
  const shuffled = TEST_DATA.drugs.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Generate a realistic checkout payload for process_checkout RPC.
 * @param {object} overrides - Override any fields in the payload.
 */
export function generateCheckoutPayload(overrides = {}) {
  const itemCount = randomInt(1, 5);
  const selectedDrugs = pickRandomDrugs(itemCount);

  const items = selectedDrugs.map((drug) => ({
    id: drug.id,
    name: drug.name,
    dosageForm: 'Tablet',
    quantity: randomInt(1, 3),
    isUnit: false,
    publicPrice: drug.price,
    discount: Math.random() > 0.7 ? randomInt(1, 10) : 0,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.publicPrice * item.quantity, 0);
  const globalDiscount = Math.random() > 0.8 ? randomInt(5, 15) : 0;
  const total = subtotal * (1 - globalDiscount / 100);

  return {
    branchId: TEST_DATA.branchId,
    orgId: TEST_DATA.orgId,
    performerId: overrides.performerId || TEST_DATA.employeeId,
    performerName: overrides.performerName || TEST_DATA.employeeName,
    shiftId: TEST_DATA.shiftIds[randomInt(0, TEST_DATA.shiftIds.length - 1)],
    timestamp: new Date().toISOString(),

    items,
    customerName: generateCustomerName(),
    customerPhone: generatePhone(),
    paymentMethod: Math.random() > 0.3 ? 'cash' : 'visa',
    saleType: Math.random() > 0.85 ? 'delivery' : 'walk-in',
    status: 'completed',
    deliveryFee: 0,
    globalDiscount,
    total: Math.round(total * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,

    ...overrides,
  };
}

/**
 * Generate a random Egyptian customer name (Arabic).
 */
export function generateCustomerName() {
  const firstNames = [
    'أحمد',
    'محمد',
    'علي',
    'حسن',
    'فاطمة',
    'سارة',
    'خالد',
    'مصطفى',
    'ياسر',
    'نورا',
    'عمر',
    'هند',
    'كريم',
    'منى',
    'طارق',
  ];
  const lastNames = [
    'محمود',
    'إبراهيم',
    'عبدالله',
    'حسين',
    'السيد',
    'رمضان',
    'عوض',
    'فؤاد',
    'شعبان',
    'غانم',
  ];
  return `${firstNames[randomInt(0, firstNames.length - 1)]} ${lastNames[randomInt(0, lastNames.length - 1)]}`;
}

/**
 * Generate a random Egyptian phone number.
 */
export function generatePhone() {
  const prefixes = ['010', '011', '012', '015'];
  const prefix = prefixes[randomInt(0, prefixes.length - 1)];
  const suffix = String(randomInt(10000000, 99999999));
  return `${prefix}${suffix}`;
}

/**
 * Generate a random drug object for inventory tests.
 */
export function generateDrug(branchId, orgId) {
  const names = [
    'Panadol Extra',
    'Augmentin 1g',
    'Concor 5mg',
    'Januvia 100mg',
    'Lipitor 20mg',
    'Nexium 40mg',
    'Plavix 75mg',
    'Ventolin Inhaler',
    'Glucophage 500mg',
    'Zithromax 500mg',
    'Flagyl 500mg',
    'Aspocid 75mg',
  ];
  const categories = ['analgesics', 'antibiotics', 'cardiovascular', 'diabetes', 'gi'];

  return {
    branch_id: branchId || TEST_DATA.branchId,
    org_id: orgId || TEST_DATA.orgId,
    name: `STRESS-${names[randomInt(0, names.length - 1)]}-${randomInt(1000, 9999)}`,
    category: categories[randomInt(0, categories.length - 1)],
    public_price: randomInt(10, 500),
    cost_price: randomInt(5, 300),
    stock: randomInt(50, 1000),
    status: 'active',
    expiry_date: '2028-06-01',
  };
}

/**
 * Random integer between min and max (inclusive).
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random sleep duration to simulate human behavior.
 */
export function humanDelay() {
  return Math.random() * 2 + 0.5; // 0.5 - 2.5 seconds
}
