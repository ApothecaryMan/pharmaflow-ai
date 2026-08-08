import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '../../../../../lib/queryKeys';

const { mockCan } = vi.hoisted(() => ({
  mockCan: vi.fn(),
}));

const mockAuthState = vi.hoisted(() => ({
  activeBranchId: 'B1',
  branches: [{ id: 'B1', name: 'Main', code: 'MN01', deliveryFee: 5 }],
}));

const { mockProcessCheckout } = vi.hoisted(() => ({
  mockProcessCheckout: vi.fn(),
}));

const { mockGetActiveReceiptSettings, mockGenerateInvoiceHTML } = vi.hoisted(() => ({
  mockGetActiveReceiptSettings: vi.fn(),
  mockGenerateInvoiceHTML: vi.fn(),
}));

const { mockPrintDocument } = vi.hoisted(() => ({
  mockPrintDocument: vi.fn(),
}));

import { usePOSCheckout } from '../usePOSCheckout';
import { useCompleteSale } from '../../../../../hooks/mutations/useSalesMutations';
import { pricingService } from '../../../../../services/sales/pricingService';
import { calculateSalePoints } from '../../../../../services/customers/loyaltyUtils';
import type { CartItem, Customer, Sale } from '../../../../../types';

vi.mock('../../../../../services/auth/permissionsService', () => ({
  permissionsService: {
    can: mockCan,
  },
}));

vi.mock('../../../../../stores/authStore', () => ({
  useAuthStore: (selector: any) => selector(mockAuthState),
}));

vi.mock('../../../../../utils/printing', () => ({
  printDocument: mockPrintDocument,
}));

vi.mock('../../../InvoiceTemplate', () => ({
  getActiveReceiptSettings: mockGetActiveReceiptSettings,
  generateInvoiceHTML: mockGenerateInvoiceHTML,
}));

vi.mock('../../../../../services/transactions/transactionService', () => ({
  transactionService: {
    processCheckout: mockProcessCheckout,
  },
}));

vi.mock('../../../../../services/sales', () => ({
  salesService: {
    create: vi.fn(),
  },
}));

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
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
    quantity: 1,
    isUnit: false,
    ...overrides,
  } as CartItem;
}

const cartItem = makeCartItem();

function makeProps(overrides: Record<string, any> = {}): any {
  return {
    cart: [cartItem],
    mergedCartItems: [
      { id: 'd1', pack: { ...cartItem, quantity: 1 }, unit: null, common: cartItem },
    ],
    showToastError: vi.fn(),
    addNotification: vi.fn(),
    playSuccess: vi.fn(),
    getVerifiedDate: () => new Date('2024-01-01T12:00:00Z'),
    activeTab: { id: 'tab-1', firstItemAt: Date.now() - 60_000 },
    activeTabId: 'tab-1',
    removeTab: vi.fn(),
    onCompleteSale: vi.fn().mockResolvedValue({ success: true, sale: { id: 'sale-1' } }),
    customerName: 'Ahmed',
    customerCode: 'CUST1',
    selectedCustomer: null,
    language: 'EN',
    t: { selectDriver: 'Select Driver' } as any,
    cartTotal: 300,
    subtotal: 300,
    activeBranchId: 'B1',
    sales: [] as Sale[],
    ...overrides,
  };
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  mockCan.mockReturnValue(true);
  mockAuthState.activeBranchId = 'B1';
  mockAuthState.branches = [{ id: 'B1', name: 'Main', code: 'MN01', deliveryFee: 5 }];
  mockGetActiveReceiptSettings.mockReturnValue({
    autoPrintOnComplete: false,
    autoPrintOnDelivery: false,
  });
  mockGenerateInvoiceHTML.mockReturnValue('<html></html>');
  mockPrintDocument.mockResolvedValue(undefined);
});

describe('usePOSCheckout — buildSalePayload output (walk-in)', () => {
  it('passes a fully-populated sale payload to onCompleteSale', async () => {
    const props = makeProps();
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('walk-in');
    });

    expect(props.onCompleteSale).toHaveBeenCalledTimes(1);
    expect(props.onCompleteSale).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [cartItem],
        customerName: 'Ahmed',
        customerCode: 'CUST1',
        paymentMethod: 'cash',
        saleType: 'walk-in',
        deliveryFee: 0,
        subtotal: 300,
        total: 300,
        status: 'completed',
        branchId: 'B1',
        date: '2024-01-01T12:00:00.000Z',
      })
    );
  });

  it('filters out cart lines with zero quantity from the payload items', async () => {
    const zeroQty = makeCartItem({ id: 'd2', name: 'Drug B', quantity: 0 });
    const props = makeProps({ cart: [cartItem, zeroQty] });
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('walk-in');
    });

    const payload = (props.onCompleteSale as any).mock.calls[0][0];
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].id).toBe('d1');
  });

  it('totals in the payload match pricingService.calculateOrderTotals for the cart', async () => {
    const items = [
      makeCartItem({ id: 'd1', publicPrice: 100, quantity: 3 }),
      makeCartItem({ id: 'd2', publicPrice: 50, quantity: 2, discount: 10 }),
    ];
    const totals = pricingService.calculateOrderTotals(items);
    const props = makeProps({
      cart: items,
      cartTotal: totals.finalTotal,
      subtotal: totals.netSubtotal,
    });
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('walk-in');
    });

    expect(props.onCompleteSale).toHaveBeenCalledWith(
      expect.objectContaining({ subtotal: totals.netSubtotal, total: totals.finalTotal })
    );
  });

  it('computes the same earned points for the payload that calculateSalePoints produces downstream', async () => {
    const props = makeProps({ cartTotal: 3000, subtotal: 3000 });
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('walk-in');
    });

    const payload = (props.onCompleteSale as any).mock.calls[0][0];
    // usePOSCheckout/buildSalePayload do not attach earnedPoints — the mutation
    // (transactionService._buildCheckoutPayload) computes them from the payload.
    expect(calculateSalePoints(payload).totalEarned).toBeGreaterThan(0);
  });

  it('falls back to Cash Customer when no name or customer is provided', async () => {
    const props = makeProps({ customerName: '', customerCode: '', selectedCustomer: null });
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('walk-in');
    });

    expect(props.onCompleteSale).toHaveBeenCalledWith(
      expect.objectContaining({ customerName: 'Cash Customer', customerCode: undefined })
    );
  });

  it('prefers the typed customerName/customerCode over the selected customer record', async () => {
    const selected: Customer = {
      id: 'c2',
      name: 'Selected Name',
      code: 'SELECTED',
      phone: '011',
    } as Customer;
    const props = makeProps({
      customerName: 'Typed Name',
      customerCode: 'TYPED',
      selectedCustomer: selected,
    });
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('walk-in');
    });

    expect(props.onCompleteSale).toHaveBeenCalledWith(
      expect.objectContaining({ customerName: 'Typed Name', customerCode: 'TYPED' })
    );
  });
});

describe('usePOSCheckout — delivery checkout', () => {
  it('includes deliveryFee in the total and marks the sale as with_delivery', async () => {
    const props = makeProps();
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    act(() => {
      result.current.setDeliveryEmployeeId('emp1');
      result.current.setDeliveryFee(50);
    });

    await act(async () => {
      await result.current.handleCheckout('delivery');
    });

    expect(props.onCompleteSale).toHaveBeenCalledWith(
      expect.objectContaining({
        saleType: 'delivery',
        deliveryFee: 50,
        deliveryEmployeeId: 'emp1',
        status: 'with_delivery',
        total: 350, // cartTotal 300 + deliveryFee 50
      })
    );
  });

  it('allows a pending delivery without a selected driver and marks it pending', async () => {
    const props = makeProps();
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    act(() => {
      result.current.setDeliveryFee(30);
    });

    await act(async () => {
      await result.current.handleCheckout('delivery', true);
    });

    expect(props.onCompleteSale).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', deliveryFee: 30, deliveryEmployeeId: undefined })
    );
  });

  it('blocks a non-pending delivery without a driver and keeps the cart untouched', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const props = makeProps();
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('delivery');
    });

    expect(alertSpy).toHaveBeenCalledWith('Select Driver');
    expect(props.onCompleteSale).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('usePOSCheckout — sticky per-customer delivery fee memory', () => {
  const deliverySale: Sale = {
    id: 's1',
    branchId: 'B1',
    date: '2024-01-01T00:00:00Z',
    items: [],
    total: 500,
    paymentMethod: 'cash',
    saleType: 'delivery',
    deliveryFee: 8,
    status: 'completed',
    customerCode: 'CUST1',
  } as Sale;

  it('defaults to the global branch delivery fee for guest customers', () => {
    const props = makeProps({ selectedCustomer: null, sales: [deliverySale] });
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    expect(result.current.deliveryFee).toBe(5);
  });

  it('remembers the last delivery fee for a returning customer', () => {
    const props = makeProps({ selectedCustomer: null, sales: [deliverySale] });
    const { result, rerender } = renderHook(() => usePOSCheckout(props), { wrapper });

    props.selectedCustomer = { id: 'c1', name: 'Ahmed', code: 'CUST1', phone: '011' } as Customer;
    rerender();

    expect(result.current.deliveryFee).toBe(8);
  });

  it('clamps a remembered fee up to the global branch delivery fee', () => {
    const lowFeeSale: Sale = { ...deliverySale, deliveryFee: 3 };
    const props = makeProps({ selectedCustomer: null, sales: [lowFeeSale] });
    const { result, rerender } = renderHook(() => usePOSCheckout(props), { wrapper });

    props.selectedCustomer = { id: 'c1', name: 'Ahmed', code: 'CUST1', phone: '011' } as Customer;
    rerender();

    expect(result.current.deliveryFee).toBe(5);
  });

  it('keeps the global fee for a customer with no prior delivery history', () => {
    const props = makeProps({ selectedCustomer: null, sales: [deliverySale] });
    const { result, rerender } = renderHook(() => usePOSCheckout(props), { wrapper });

    props.selectedCustomer = { id: 'c9', name: 'New', code: 'CUST9', phone: '012' } as Customer;
    rerender();

    expect(result.current.deliveryFee).toBe(5);
  });
});

describe('usePOSCheckout — validation & permissions', () => {
  it('does nothing when the cart is invalid (empty merged items)', async () => {
    const props = makeProps({ cart: [], mergedCartItems: [] });
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('walk-in');
    });

    expect(props.onCompleteSale).not.toHaveBeenCalled();
  });

  it('blocks checkout without sale.create permission', async () => {
    mockCan.mockReturnValue(false);
    const props = makeProps();
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('walk-in');
    });

    expect(props.showToastError).toHaveBeenCalledWith(
      'Permission Denied: Cannot perform checkout'
    );
    expect(props.onCompleteSale).not.toHaveBeenCalled();
  });
});

describe('usePOSCheckout — success and failure paths', () => {
  it('cleans up the checkout UI, plays success, notifies, and removes the tab on success', async () => {
    const props = makeProps();
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('walk-in');
    });

    expect(props.playSuccess).toHaveBeenCalledTimes(1);
    expect(props.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ messageKey: 'saleComplete', type: 'success' })
    );
    expect(props.removeTab).toHaveBeenCalledWith('tab-1');
    expect(result.current.isProcessing).toBe(false);
  });

  it('preserves the cart and does not remove the tab when checkout fails', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const props = makeProps();
    props.onCompleteSale.mockResolvedValue({ success: false });
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('walk-in');
    });

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(props.removeTab).not.toHaveBeenCalled();
    expect(props.playSuccess).not.toHaveBeenCalled();
    expect(props.addNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ messageKey: 'saleComplete' })
    );
    expect(result.current.isProcessing).toBe(false);
    consoleWarnSpy.mockRestore();
  });

  it('prints a receipt on success when the branch settings enable auto-print', async () => {
    mockGetActiveReceiptSettings.mockReturnValue({
      autoPrintOnComplete: true,
      autoPrintOnDelivery: false,
    });
    const props = makeProps();
    props.onCompleteSale.mockResolvedValue({ success: true, sale: { id: 'sale-1' } as Sale });
    const { result } = renderHook(() => usePOSCheckout(props), { wrapper });

    await act(async () => {
      await result.current.handleCheckout('walk-in');
    });

    expect(mockGenerateInvoiceHTML).toHaveBeenCalled();
    expect(mockPrintDocument).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'receipt', width: 80 })
    );
  });
});

describe('useCompleteSale — success path invalidates caches', () => {
  it('calls transactionService.processCheckout and invalidates all affected query prefixes', async () => {
    mockProcessCheckout.mockResolvedValue({
      success: true,
      sale: { id: 'sale-1', branchId: 'B1' },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const clientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCompleteSale(), { wrapper: clientWrapper });

    await act(async () => {
      await result.current.mutateAsync({
        saleData: {
          items: [cartItem],
          customerName: 'Ahmed',
          paymentMethod: 'cash',
          total: 300,
          subtotal: 300,
        },
        context: {
          performerId: 'emp1',
          performerName: 'Admin',
          branchId: 'B1',
          shiftId: 'sh1',
          orgId: 'O1',
          timestamp: '2024-01-01T12:00:00Z',
        },
      });
    });

    expect(mockProcessCheckout).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.prefixes.sales });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.prefixes.inventory });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.prefixes.batches });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.prefixes.shifts });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.prefixes.cashTransactions,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });
});
