import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockCan } = vi.hoisted(() => ({
  mockCan: vi.fn(),
}));

const { mockGroupInventory, mockAutoDistribute, mockFindTargetBatch } = vi.hoisted(() => ({
  mockGroupInventory: vi.fn(),
  mockAutoDistribute: vi.fn(),
  mockFindTargetBatch: vi.fn(),
}));

import { usePOSCart } from '../usePOSCart';
import type { CartItem, Drug } from '../../../../../types';
import { resolveDisplayStock } from '../../../../../utils/stockUtils';

vi.mock('../../../../../services/auth/permissionsService', () => ({
  permissionsService: {
    can: mockCan,
  },
}));

vi.mock('../../../../../services/inventory/batchService', () => ({
  batchService: {
    groupInventory: mockGroupInventory,
    autoDistributeQuantities: mockAutoDistribute,
    findTargetBatch: mockFindTargetBatch,
  },
}));

function makeDrug(overrides: Partial<Drug> = {}): Drug {
  return {
    id: 'd1',
    name: 'Paracetamol',
    genericName: ['paracetamol'],
    category: 'Medicine',
    publicPrice: 100,
    costPrice: 60,
    stock: 100,
    expiryDate: '2026-12-31',
    dosageForm: 'Tablet',
    unitsPerPack: 10,
    ...overrides,
  } as Drug;
}

interface CartHarness {
  result: { current: ReturnType<typeof usePOSCart> };
  rerender: (props?: any) => void;
  props: any;
  tabState: Record<string, any>;
  updateTabCalls: any[];
}

function createCartHarness(initialCart: CartItem[] = []): CartHarness {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const updateTabCalls: any[] = [];
  const inventoryHolder: { current: Drug[] } = { current: [] as Drug[] };
  const tabRef: { current: Record<string, any> } = {
    current: {
      id: 'tab-1',
      cart: initialCart,
      discount: 0,
      createdAt: Date.now(),
      firstItemAt: undefined,
    },
  };

  const propsMocks = {
    showToastError: vi.fn(),
    addNotification: vi.fn(),
    playBeep: vi.fn(),
    playError: vi.fn(),
    t: { stockLimitReached: 'Stock limit reached' } as any,
  };

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const utils = renderHook(
    () => {
      const [tab, setTab] = React.useState<Record<string, any>>(tabRef.current);
      tabRef.current = tab;

      const updateTab = (_id: string, updates: any) => {
        updateTabCalls.push(updates);
        setTab((prev) => ({ ...prev, ...updates }));
      };

      return usePOSCart({
        activeTab: tab,
        activeTabId: 'tab-1',
        updateTab,
        inventory: inventoryHolder.current,
        showToastError: propsMocks.showToastError,
        addNotification: propsMocks.addNotification,
        playBeep: propsMocks.playBeep,
        playError: propsMocks.playError,
        t: propsMocks.t,
      });
    },
    { wrapper }
  );

  const props = {
    ...propsMocks,
    set inventory(v: Drug[]) {
      inventoryHolder.current = v;
    },
  };

  const tabStateProxy = new Proxy(
    {},
    {
      get: (_target, prop) => tabRef.current[prop as string],
    }
  );

  return {
    ...utils,
    props,
    tabState: tabStateProxy as Record<string, any>,
    updateTabCalls,
  } as CartHarness;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCan.mockReturnValue(true);
  mockGroupInventory.mockReturnValue([]);
  mockAutoDistribute.mockReturnValue([]);
  mockFindTargetBatch.mockReturnValue(null);
});

describe('usePOSCart — cart merge logic', () => {
  it('merges repeated additions of the same drug+mode into a single line with incremented quantity', () => {
    const { result } = createCartHarness();
    const drug = makeDrug();

    act(() => result.current.addToCart(drug, false, 1));
    act(() => result.current.addToCart(drug, false, 2));

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(3);
    expect(result.current.cart[0].isUnit).toBe(false);
  });

  it('keeps pack and unit as separate lines and groups them visually by drug id', () => {
    const { result } = createCartHarness();
    const drug = makeDrug();

    act(() => result.current.addToCart(drug, false, 1));
    act(() => result.current.addToCart(drug, true, 5));

    expect(result.current.cart).toHaveLength(2);
    expect(result.current.mergedCartItems).toHaveLength(1);
    const group = result.current.mergedCartItems[0];
    expect(group.id).toBe('d1');
    expect(group.pack?.quantity).toBe(1);
    expect(group.pack?.isUnit).toBe(false);
    expect(group.unit?.quantity).toBe(5);
    expect(group.unit?.isUnit).toBe(true);
    expect(group.common.id).toBe('d1');
  });

  it('does not merge different drugs into the same visual group', () => {
    const { result } = createCartHarness();
    const d1 = makeDrug({ id: 'd1', name: 'Drug A' });
    const d2 = makeDrug({ id: 'd2', name: 'Drug B' });

    act(() => result.current.addToCart(d1, false, 1));
    act(() => result.current.addToCart(d2, false, 1));

    expect(result.current.cart).toHaveLength(2);
    expect(result.current.mergedCartItems).toHaveLength(2);
  });

  it('refuses to add a drug with zero stock', () => {
    const { result, props } = createCartHarness();
    const drug = makeDrug({ stock: 0 });

    act(() => result.current.addToCart(drug, false, 1));

    expect(result.current.cart).toHaveLength(0);
    expect(props.playBeep).not.toHaveBeenCalled();
  });

  it('rejects additions that would exceed total available stock', () => {
    const { result } = createCartHarness();
    const drug = makeDrug({ stock: 10 }); // 10 units = 1 pack of 10

    act(() => result.current.addToCart(drug, false, 1));
    act(() => result.current.addToCart(drug, false, 1)); // would need 20 units

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(1);
  });
});

describe('usePOSCart — addGroupToCart batch distribution', () => {
  it('distributes quantities across batches using batchService and adds them to the cart', () => {
    const { result } = createCartHarness();
    const batch = makeDrug({ id: 'batch-1', stock: 50 });

    mockGroupInventory.mockReturnValue([
      {
        id: 'batch-1',
        groupId: 'g1',
        totalStock: 50,
        stock: 50,
        batches: [batch],
        name: batch.name,
        dosageForm: batch.dosageForm,
      },
    ]);
    mockAutoDistribute.mockReturnValue([{ batchId: 'batch-1', packQty: 2, unitQty: 0 }]);

    act(() => result.current.addGroupToCart([batch]));

    expect(mockAutoDistribute).toHaveBeenCalled();
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].id).toBe('batch-1');
    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.cart[0].isUnit).toBe(false);
  });

  it('falls back to findTargetBatch when distribution yields nothing', () => {
    const { result } = createCartHarness();
    const batch = makeDrug({ id: 'batch-1', stock: 50 });

    mockGroupInventory.mockReturnValue([
      {
        id: 'batch-1',
        groupId: 'g1',
        totalStock: 50,
        stock: 50,
        batches: [batch],
        name: batch.name,
        dosageForm: batch.dosageForm,
      },
    ]);
    mockAutoDistribute.mockReturnValue([]);
    mockFindTargetBatch.mockReturnValue(batch);

    act(() => result.current.addGroupToCart([batch]));

    expect(mockFindTargetBatch).toHaveBeenCalled();
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].id).toBe('batch-1');
  });
});

describe('usePOSCart — selectedUnits / selectedBatches records', () => {
  it('records the selected unit mode and batch per drug grouping key', () => {
    const { result } = createCartHarness();

    act(() => {
      result.current.setSelectedUnits({ g1: 'unit' });
      result.current.setSelectedBatches({ g1: 'batch-2' });
    });

    expect(result.current.selectedUnits).toEqual({ g1: 'unit' });
    expect(result.current.selectedBatches).toEqual({ g1: 'batch-2' });
  });
});

describe('usePOSCart — remove item', () => {
  it('removeFromCart removes only the matching mode (pack vs unit) line', () => {
    const { result } = createCartHarness();
    const drug = makeDrug();

    act(() => result.current.addToCart(drug, false, 1));
    act(() => result.current.addToCart(drug, true, 5));
    expect(result.current.cart).toHaveLength(2);

    act(() => result.current.removeFromCart('d1', true));

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].isUnit).toBe(false);
  });

  it('removeDrugFromCart removes all lines (pack and unit) for the drug', () => {
    const { result } = createCartHarness();
    const drug = makeDrug();

    act(() => result.current.addToCart(drug, false, 1));
    act(() => result.current.addToCart(drug, true, 5));

    act(() => result.current.removeDrugFromCart('d1'));

    expect(result.current.cart).toHaveLength(0);
  });
});

describe('usePOSCart — quantity update & unit mode toggle', () => {
  it('updateQuantity increments and decrements the matching line', () => {
    const { result, props } = createCartHarness();
    const drug = makeDrug();
    props.inventory = [drug];

    act(() => result.current.addToCart(drug, false, 2));
    act(() => result.current.updateQuantity('d1', false, 1));
    expect(result.current.cart[0].quantity).toBe(3);

    act(() => result.current.updateQuantity('d1', false, -2));
    expect(result.current.cart[0].quantity).toBe(1);
  });

  it('updateQuantity removes the line when the delta drives quantity below zero', () => {
    const { result, props } = createCartHarness();
    const drug = makeDrug();
    props.inventory = [drug];

    act(() => result.current.addToCart(drug, false, 1));
    act(() => result.current.updateQuantity('d1', false, -2));

    expect(result.current.cart).toHaveLength(0);
  });

  it('toggleUnitMode converts a pack line into a unit line using unitsPerPack', () => {
    const { result } = createCartHarness();
    const drug = makeDrug({ unitsPerPack: 10 });

    act(() => result.current.addToCart(drug, false, 2)); // 2 packs
    act(() => result.current.toggleUnitMode('d1', false));

    const unitItem = result.current.cart.find((i: CartItem) => i.isUnit);
    expect(unitItem?.quantity).toBe(20);
    expect(unitItem?.publicPrice).toBe(10); // unit price = 100 / 10
  });
});

describe('usePOSCart — out-of-stock tracking', () => {
  it('fires an out-of-stock notification when a drug stock drops from positive to zero', () => {
    const { rerender, props } = createCartHarness();
    const drug = makeDrug({ stock: 5 });

    props.inventory = [drug];
    rerender();
    expect(props.addNotification).not.toHaveBeenCalled();

    props.inventory = [{ ...drug, stock: 0 }];
    rerender();

    expect(props.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ messageKey: 'outOfStock', type: 'out_of_stock' })
    );
    expect(props.playError).toHaveBeenCalled();
  });
});

describe('usePOSCart — permission checks', () => {
  it('blocks item discount when the user lacks sale.discount permission', () => {
    mockCan.mockReturnValue(false);
    const { result, props } = createCartHarness();
    const drug = makeDrug();

    act(() => result.current.addToCart(drug, false, 1));
    act(() => result.current.updateItemDiscount('d1', false, 5));

    expect(props.showToastError).toHaveBeenCalledWith(
      'Permission Denied: Cannot apply item discount'
    );
    expect(result.current.cart[0].discount).toBe(0);
  });
});

describe('usePOSCart — item discount clamping', () => {
  it('clamps item discount to item.maxDiscount', () => {
    const { result } = createCartHarness();
    const drug = makeDrug({ maxDiscount: 5 });

    act(() => result.current.addToCart(drug, false, 1));
    act(() => result.current.updateItemDiscount('d1', false, 20));

    expect(result.current.cart[0].discount).toBe(5);
  });

  it('defaults the discount cap to 10 when item has no maxDiscount', () => {
    const { result } = createCartHarness();
    const drug = makeDrug();

    act(() => result.current.addToCart(drug, false, 1));
    act(() => result.current.updateItemDiscount('d1', false, 50));

    expect(result.current.cart[0].discount).toBe(10);
  });

  it('clamps negative discounts to 0', () => {
    const { result } = createCartHarness();
    const drug = makeDrug({ maxDiscount: 5 });

    act(() => result.current.addToCart(drug, false, 1));
    act(() => result.current.updateItemDiscount('d1', false, -3));

    expect(result.current.cart[0].discount).toBe(0);
  });
});

describe('utils/stockUtils — resolveDisplayStock', () => {
  it('returns raw units for unit mode and pack conversion for pack mode', () => {
    expect(resolveDisplayStock(50, 10, 'unit')).toBe(50);
    expect(resolveDisplayStock(50, 10, 'pack')).toBe(5);
    expect(resolveDisplayStock(5, 10, 'pack')).toBe(0.5);
    expect(resolveDisplayStock(12, 1, 'pack')).toBe(12);
  });
});
