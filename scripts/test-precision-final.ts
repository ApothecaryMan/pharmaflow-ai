
import { money, tax, pricing } from '../utils/money.ts';
import { pricingService } from '../services/sales/pricingService.ts';

const runTests = () => {
  console.log('🚀 Starting Precision Financial Math Final Validation...');
  let passed = 0;
  let failed = 0;

  const assert = (name: string, actual: any, expected: any) => {
    if (actual === expected) {
      console.log(`✅ PASSED: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Actual: ${actual} (${typeof actual})`);
      console.error(`   Expected: ${expected} (${typeof expected})`);
      failed++;
    }
  };

  // --- Test Case 1: Simple Allocation ---
  console.log('\n--- Case 1: Partial Return Allocation ---');
  const sale = {
    total: 30,
    netTotal: 27, // 10% global discount
    globalDiscount: 10,
    items: [
      { id: '1', name: 'Item A', price: 10, quantity: 3, isUnit: false }
    ]
  };
  
  // Selected 1 item for return
  const selected1 = new Map([['1_pack', 1]]);
  const refund1 = pricingService.calculateRefundAmount(sale as any, selected1);
  assert('Refund for 1/3 items (10% global discount)', refund1, 9);

  // Selected 2 items for return
  const selected2 = new Map([['1_pack', 2]]);
  const refund2 = pricingService.calculateRefundAmount(sale as any, selected2);
  assert('Refund for 2/3 items (10% global discount)', refund2, 18);
  assert('Sum of partial refunds equals total', money.add(refund1, refund2), 27);

  // --- Test Case 2: Rounding Half Up ---
  console.log('\n--- Case 2: Rounding Half Up (5.555 -> 5.56) ---');
  const val = 5.555;
  const rounded = money.fromSmallestUnit(money.toSmallestUnit(val));
  assert('Rounding 5.555 half up using money engine', rounded, 5.56);

  // --- Test Case 3: Tax Extraction (Inclusive) ---
  console.log('\n--- Case 3: Tax Extraction (Inclusive) ---');
  const gross = 100;
  const taxResult = tax.invoiceTax(gross, 0, 14, 'inclusive');
  assert('Extracted tax from 100 (14%)', taxResult.taxAmount, 12.28);
  assert('Net excluding tax', taxResult.base, 87.72);

  // --- Test Case 4: Multiple Items Allocation ---
  console.log('\n--- Case 4: Multi-Item Complex Allocation ---');
  const saleMulti = {
    total: 100,
    netTotal: 90,
    items: [
      { id: 'A', name: 'A', price: 33.33, quantity: 1, isUnit: false },
      { id: 'B', name: 'B', price: 33.33, quantity: 1, isUnit: false },
      { id: 'C', name: 'C', price: 33.34, quantity: 1, isUnit: false },
    ]
  };
  
  const refundA = pricingService.calculateRefundAmount(saleMulti as any, new Map([['A_pack', 1]]));
  const refundB = pricingService.calculateRefundAmount(saleMulti as any, new Map([['B_pack', 1]]));
  const refundC = pricingService.calculateRefundAmount(saleMulti as any, new Map([['C_pack', 1]]));
  
  assert('Refund for item A', refundA, 30);
  assert('Refund for item B', refundB, 30);
  assert('Refund for item C', refundC, 30);
  assert('Sum of all refunds', money.add(money.add(refundA, refundB), refundC), 90);

  console.log(`\n🏁 Validation Complete: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
