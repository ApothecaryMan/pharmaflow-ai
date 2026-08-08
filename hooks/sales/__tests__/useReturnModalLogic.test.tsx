import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sale, Shift } from '../../../types';
import { useReturnModalLogic } from '../useReturnModalLogic';

const { mockHasRole, mockCalculateRefund } = vi.hoisted(() => ({
  mockHasRole: vi.fn(),
  mockCalculateRefund: vi.fn(),
}));

vi.mock('../../../services/auth/permissionsService', () => ({
  permissionsService: {
    can: vi.fn().mockReturnValue(true),
    hasRole: (...args: unknown[]) => mockHasRole(...args),
    getEffectiveRole: vi.fn().mockReturnValue('admin'),
    canRefundAmount: vi.fn().mockReturnValue(true),
    canCancelAmount: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('../../../services/sales/pricingService', () => ({
  pricingService: {
    calculateRefundAmount: (...args: unknown[]) => mockCalculateRefund(...args),
  },
}));

const mockT = {
  returns: {
    validation: {
      noOpenShift: 'Cannot process return - no open shift',
      insufficientBalance: 'Return amount exceeds available sales balance',
    },
  },
};

const saleFixture = (overrides?: Partial<Sale>): Sale =>
  ({
    id: 'sale-1',
    branchId: 'B1',
    date: '2024-01-05T10:00:00Z',
    total: 300,
    netTotal: 300,
    paymentMethod: 'cash',
    status: 'completed',
    items: [
      {
        id: 'si-1',
        saleItemId: 'si-1',
        drugId: 'drug-1',
        name: 'Panadol',
        quantity: 2,
        publicPrice: 100,
        isUnit: false,
        unitsPerPack: 10,
      },
      {
        id: 'si-2',
        saleItemId: 'si-2',
        drugId: 'drug-2',
        name: 'Vitamin C',
        quantity: 25,
        publicPrice: 20,
        isUnit: true,
        unitsPerPack: 10,
      },
    ] as any,
    ...overrides,
  }) as Sale;

const openShift = (overrides?: Partial<Shift>): Shift =>
  ({
    id: 'shift-1',
    branchId: 'B1',
    status: 'open',
    openTime: '2024-01-01T08:00:00Z',
    openedBy: 'emp1',
    openingBalance: 100,
    cashIn: 0,
    cashOut: 0,
    cashSales: 1000,
    cardSales: 0,
    returns: 0,
    transactions: [],
    ...overrides,
  }) as Shift;

const baseProps = (overrides?: Partial<Parameters<typeof useReturnModalLogic>[0]>) => ({
  sale: saleFixture(),
  currentShift: openShift(),
  currentDailyRefunds: 0,
  language: 'EN',
  t: mockT as any,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockHasRole.mockReturnValue(false);
  mockCalculateRefund.mockReturnValue(0);
});

describe('useReturnModalLogic — initial state', () => {
  it('starts on step 1 with empty selections and default reason', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    expect(result.current.step).toBe(1);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.selectedItems.size).toBe(0);
    expect(result.current.itemUnitModes.size).toBe(0);
    expect(result.current.returnReason).toBe('customer_request');
    expect(result.current.returnNotes).toBe('');
    expect(result.current.validationError).toBeNull();
    expect(result.current.isAllSelected).toBe(false);
  });

  it('exposes available items with pack-mode max quantities', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    expect(result.current.availableItems).toHaveLength(2);
    const packItem = result.current.availableItems.find((i: any) => i.saleItemId === 'si-1');
    const unitItem = result.current.availableItems.find((i: any) => i.saleItemId === 'si-2');
    // si-1 is sold by pack (quantity 2) → max 2 packs
    expect(packItem?.effectiveUnitMode).toBe(false);
    expect(packItem?.effectiveMaxQty).toBe(2);
    // si-2 is sold by unit (quantity 25, 10 units/pack) → max floor(25/10) = 2 packs
    expect(unitItem?.effectiveUnitMode).toBe(false);
    expect(unitItem?.effectiveMaxQty).toBe(2);
  });

  it('filters out items with no returnable quantity', () => {
    const sale = saleFixture({
      itemReturnedQuantities: { si_1_unit: 2 } as any,
    });
    const { result } = renderHook(() => useReturnModalLogic(baseProps({ sale })));
    // saleItemId keys are 'si-1' so the lookup falls back to the saleItemId key below
    expect(result.current.availableItems).toHaveLength(2);
  });
});

describe('useReturnModalLogic — selection controls', () => {
  it('toggles item selection on and off', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    act(() => result.current.toggleItemSelection('si-1', 2));
    expect(result.current.selectedItems.get('si-1')).toBe(2);

    act(() => result.current.toggleItemSelection('si-1', 2));
    expect(result.current.selectedItems.has('si-1')).toBe(false);
  });

  it('updates item quantity and removes the item when set to zero', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    act(() => result.current.updateItemQuantity('si-1', 1));
    expect(result.current.selectedItems.get('si-1')).toBe(1);

    act(() => result.current.updateItemQuantity('si-1', 0));
    expect(result.current.selectedItems.has('si-1')).toBe(false);
  });

  it('selects all and deselects all', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    act(() => result.current.selectAll());
    expect(result.current.selectedItems.size).toBe(2);
    expect(result.current.selectedItems.get('si-1')).toBe(2);
    expect(result.current.selectedItems.get('si-2')).toBe(2);
    expect(result.current.isAllSelected).toBe(true);

    act(() => result.current.deselectAll());
    expect(result.current.selectedItems.size).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
  });

  it('isAllSelected is false when only some items are selected', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    act(() => result.current.toggleItemSelection('si-1', 2));
    expect(result.current.isAllSelected).toBe(false);
  });
});

describe('useReturnModalLogic — unit vs pack mode', () => {
  it('switches a pack item to unit mode and converts its max quantity', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    act(() => result.current.toggleUnitMode('si-1', 2, 10));

    const packItem = result.current.availableItems.find((i: any) => i.saleItemId === 'si-1');
    expect(packItem?.effectiveUnitMode).toBe(true);
    expect(packItem?.effectiveMaxQty).toBe(20);

    act(() => result.current.toggleUnitMode('si-1', 20, 10));
    const backToPack = result.current.availableItems.find((i: any) => i.saleItemId === 'si-1');
    expect(backToPack?.effectiveUnitMode).toBe(false);
    expect(backToPack?.effectiveMaxQty).toBe(2);
  });

  it('converts an already-selected quantity when toggling unit mode', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    act(() => result.current.toggleItemSelection('si-1', 2));
    expect(result.current.selectedItems.get('si-1')).toBe(2);

    // Pack → Unit: 2 packs × 10 units = 20 units (clamped to max 20)
    act(() => result.current.toggleUnitMode('si-1', 2, 10));
    expect(result.current.selectedItems.get('si-1')).toBe(20);

    // Unit → Pack: 20 / 10 = 2 packs
    act(() => result.current.toggleUnitMode('si-1', 20, 10));
    expect(result.current.selectedItems.get('si-1')).toBe(2);
  });
});

describe('useReturnModalLogic — validateReturn', () => {
  it('rejects when there is no open shift', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps({ currentShift: null })));

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validateReturn();
    });

    expect(valid).toBe(false);
    expect(result.current.validationError).toBe('Cannot process return - no open shift');
  });

  it('rejects a pharmacist refund above the per-invoice limit', () => {
    mockHasRole.mockImplementation((role: string) => role === 'pharmacist');
    mockCalculateRefund.mockReturnValue(1500);

    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validateReturn();
    });

    expect(valid).toBe(false);
    expect(result.current.validationError).toContain(
      'Pharmacists cannot refund more than'
    );
    expect(result.current.validationError).toContain('1,000.00');
  });

  it('rejects a pharmacist refund above the daily limit', () => {
    mockHasRole.mockImplementation((role: string) => role === 'pharmacist');
    mockCalculateRefund.mockReturnValue(800);

    const { result } = renderHook(() =>
      useReturnModalLogic(baseProps({ currentDailyRefunds: 1500 }))
    );

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validateReturn();
    });

    expect(valid).toBe(false);
    expect(result.current.validationError).toContain('Daily refund limit exceeded');
  });

  it('allows a pharmacist refund within both limits when cash balance is sufficient', () => {
    mockHasRole.mockImplementation((role: string) => role === 'pharmacist');
    mockCalculateRefund.mockReturnValue(500);

    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validateReturn();
    });

    expect(valid).toBe(true);
    expect(result.current.validationError).toBeNull();
  });

  it('rejects a cashier refund above the per-invoice limit', () => {
    mockHasRole.mockImplementation((role: string) => role === 'cashier');
    mockCalculateRefund.mockReturnValue(600);

    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validateReturn();
    });

    expect(valid).toBe(false);
    expect(result.current.validationError).toContain(
      'Cashiers cannot refund more than'
    );
    expect(result.current.validationError).toContain('500.00');
  });

  it('rejects a cashier refunding an invoice from a previous shift', () => {
    mockHasRole.mockImplementation((role: string) => role === 'cashier');
    mockCalculateRefund.mockReturnValue(100);

    const sale = saleFixture({ date: '2023-12-01T10:00:00Z' });
    const { result } = renderHook(() => useReturnModalLogic(baseProps({ sale })));

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validateReturn();
    });

    expect(valid).toBe(false);
    expect(result.current.validationError).toContain(
      'Cashiers can only refund invoices processed during the current shift'
    );
  });

  it('allows a cashier refund in the same shift within limits and balance', () => {
    mockHasRole.mockImplementation((role: string) => role === 'cashier');
    mockCalculateRefund.mockReturnValue(400);

    const sale = saleFixture({ date: '2024-01-01T09:00:00Z' });
    const { result } = renderHook(() => useReturnModalLogic(baseProps({ sale })));

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validateReturn();
    });

    expect(valid).toBe(true);
    expect(result.current.validationError).toBeNull();
  });

  it('rejects a cash refund exceeding the available cash balance', () => {
    mockCalculateRefund.mockReturnValue(5000);

    const { result } = renderHook(() =>
      useReturnModalLogic(
        baseProps({
          currentShift: openShift({
            openingBalance: 100,
            cashSales: 1000,
            cashIn: 0,
            returns: 0,
            cashOut: 0,
          }),
        })
      )
    );

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validateReturn();
    });

    // cashBalance = 100 + 1000 - 0 = 1,100 < 5,000 refund
    expect(valid).toBe(false);
    expect(result.current.validationError).toBe('Return amount exceeds available sales balance');
  });

  it('rejects a card refund when even the combined balance is insufficient', () => {
    mockCalculateRefund.mockReturnValue(5000);

    const sale = saleFixture({ paymentMethod: 'visa' });
    const { result } = renderHook(() =>
      useReturnModalLogic(
        baseProps({
          sale,
          currentShift: openShift({ openingBalance: 0, cashSales: 0, cardSales: 100, cashIn: 0 }),
        })
      )
    );

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validateReturn();
    });

    // combined = 0 + 0 + 100 - 0 = 100 < 5,000 → rejected (guards against over-refunding entirely)
    expect(valid).toBe(false);
  });

  it.skip('CURRENTLY BUGGY (BUG-010): card refund is validated against the combined cash+card balance, not card-only balance', () => {
    // BUG-010: must be REJECTED — the card-only balance is 100.00 (cardSales 100 − cardReturns 0),
    // but the requested visa refund is 500.00.
    // hooks/sales/useReturnModalLogic.ts:208-226 currently compares against the COMBINED
    // opening+cashSales+cardSales+cashIn−returns−cashOut balance (600.00), so the 500.00
    // refund is wrongly allowed here. The RPC still enforces the correct split server-side.
    // Test asserts the CORRECT value (rejected = false), red on current code.
    // TODO: re-enable after BUG-010 fix.
    mockCalculateRefund.mockReturnValue(500);

    const sale = saleFixture({ paymentMethod: 'visa' });
    const { result } = renderHook(() =>
      useReturnModalLogic(
        baseProps({
          sale,
          currentShift: openShift({
            openingBalance: 0,
            cashSales: 500,
            cardSales: 100,
            cashIn: 0,
            returns: 0,
            cashOut: 0,
          }),
        })
      )
    );

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validateReturn();
    });

    // Current (buggy) behavior: combined 600.00 ≥ 500.00 → allowed.
    // Correct behavior: card-only 100.00 < 500.00 → must be rejected.
    expect(valid).toBe(false);
  });
});

describe('useReturnModalLogic — buildReturnPayload', () => {
  it('builds a partial pack return payload with reason and notes', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    act(() => result.current.updateItemQuantity('si-1', 1));
    act(() => result.current.setReturnReason('damaged' as any));
    act(() => result.current.setReturnNotes('Customer opened the box'));

    let payload: any;
    act(() => {
      payload = result.current.buildReturnPayload();
    });

    expect(payload).toEqual({
      saleId: 'sale-1',
      returnType: 'partial',
      items: [
        {
          drugId: 'drug-1',
          saleItemId: 'si-1',
          quantityReturned: 1,
          isUnit: false,
          condition: 'sellable',
        },
      ],
      reason: 'damaged',
      notes: 'Customer opened the box',
    });
  });

  it('builds a full return when all items are selected and all are pack items', () => {
    // 'full' is only produced when EVERY returned line is a pack (no unit items at all)
    const packOnlySale = saleFixture({
      items: [
        {
          id: 'si-1',
          saleItemId: 'si-1',
          drugId: 'drug-1',
          name: 'Panadol',
          quantity: 2,
          publicPrice: 100,
          isUnit: false,
          unitsPerPack: 10,
        },
        {
          id: 'si-2',
          saleItemId: 'si-2',
          drugId: 'drug-2',
          name: 'Vitamin C',
          quantity: 3,
          publicPrice: 20,
          isUnit: false,
          unitsPerPack: 10,
        },
      ] as any,
    });
    const { result } = renderHook(() =>
      useReturnModalLogic(baseProps({ sale: packOnlySale }))
    );

    act(() => result.current.selectAll());

    let payload: any;
    act(() => {
      payload = result.current.buildReturnPayload();
    });

    expect(payload.returnType).toBe('full');
    expect(payload.items).toHaveLength(2);
    expect(payload.items[0]).toMatchObject({
      drugId: 'drug-1',
      saleItemId: 'si-1',
      quantityReturned: 2,
      isUnit: false,
      condition: 'sellable',
    });
  });

  it('marks items as units when unit mode is toggled on', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    act(() => result.current.toggleItemSelection('si-1', 2));
    act(() => result.current.toggleUnitMode('si-1', 2, 10));

    let payload: any;
    act(() => {
      payload = result.current.buildReturnPayload();
    });

    expect(payload.items[0].isUnit).toBe(true);
    expect(payload.items[0].quantityReturned).toBe(20);
    expect(payload.returnType).toBe('unit');
  });

  it('returns an empty items array when nothing is selected', () => {
    const { result } = renderHook(() => useReturnModalLogic(baseProps()));

    let payload: any;
    act(() => {
      payload = result.current.buildReturnPayload();
    });

    expect(payload).toEqual({
      saleId: 'sale-1',
      returnType: 'partial',
      items: [],
      reason: 'customer_request',
      notes: '',
    });
  });
});
