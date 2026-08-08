import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { ShiftProvider, useShift } from '../useShift';
import type { CashTransaction, Shift } from '../../../types';

const mockAuthState = vi.hoisted(() => ({ activeBranchId: 'B1' }));

const { mockUseShifts, mockUseShiftTransactions } = vi.hoisted(() => ({
  mockUseShifts: vi.fn(),
  mockUseShiftTransactions: vi.fn(),
}));

const { mockOpenShift, mockCloseShift, mockAddTransaction, mockGetAllShifts } = vi.hoisted(() => ({
  mockOpenShift: vi.fn(),
  mockCloseShift: vi.fn(),
  mockAddTransaction: vi.fn(),
  mockGetAllShifts: vi.fn(),
}));

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: any) => selector(mockAuthState),
}));

vi.mock('../../queries/useShiftsQuery', () => ({
  useShifts: mockUseShifts,
  useShiftTransactions: mockUseShiftTransactions,
}));

vi.mock('../../../services/cash/cashService', () => ({
  cashService: {
    openShift: mockOpenShift,
    closeShift: mockCloseShift,
    addTransaction: mockAddTransaction,
    getAllShifts: mockGetAllShifts,
  },
}));

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 'shift-1',
    branchId: 'B1',
    status: 'open',
    openTime: '2024-01-01T08:00:00Z',
    openedBy: 'emp1',
    openingBalance: 500,
    cashIn: 0,
    cashOut: 0,
    cashSales: 0,
    cardSales: 0,
    returns: 0,
    transactions: [],
    ...overrides,
  } as Shift;
}

function makeTransaction(overrides: Partial<CashTransaction> = {}): CashTransaction {
  return {
    id: 'tx-1',
    branchId: 'B1',
    shiftId: 'shift-1',
    time: '2024-01-01T10:00:00Z',
    type: 'sale',
    amount: 150,
    userId: 'emp1',
    ...overrides,
  } as CashTransaction;
}

function renderShiftHook() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <ShiftProvider>{children}</ShiftProvider>
    </QueryClientProvider>
  );
  const utils = renderHook(() => useShift(), { wrapper });
  return { ...utils, queryClient };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthState.activeBranchId = 'B1';
  mockUseShifts.mockReturnValue({ data: [], isLoading: false });
  mockUseShiftTransactions.mockReturnValue({ data: [] });
});

describe('useShift — derived state', () => {
  it('exposes branch-scoped shifts and the open shift merged with its transactions as currentShift', () => {
    const openB1 = makeShift({ id: 'open-B1', status: 'open' });
    const closedB1 = makeShift({ id: 'closed-B1', status: 'closed' });
    const openB2 = makeShift({ id: 'open-B2', branchId: 'B2', status: 'open' });
    const tx = makeTransaction({ id: 'tx-1', shiftId: 'open-B1' });

    mockUseShifts.mockReturnValue({ data: [openB1, closedB1, openB2], isLoading: false });
    mockUseShiftTransactions.mockReturnValue({ data: [tx] });

    const { result } = renderShiftHook();

    expect(result.current.shifts).toEqual([openB1, closedB1]); // branch-scoped to B1
    expect(result.current.currentShift).toEqual({ ...openB1, transactions: [tx] });
    expect(result.current.isLoading).toBe(false);
  });

  it('returns null currentShift when there is no open shift for the active branch', () => {
    const closedB1 = makeShift({ id: 'closed-B1', status: 'closed' });
    const openB2 = makeShift({ id: 'open-B2', branchId: 'B2', status: 'open' });

    mockUseShifts.mockReturnValue({ data: [closedB1, openB2], isLoading: false });

    const { result } = renderShiftHook();

    expect(result.current.currentShift).toBeNull();
    expect(result.current.shifts).toEqual([closedB1]);
  });

  it('reports isLoading from the underlying shifts query', () => {
    mockUseShifts.mockReturnValue({ data: [], isLoading: true });

    const { result } = renderShiftHook();

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useShift — startShift', () => {
  it('calls cashService.openShift with the active branch and prepends the created shift to the cache', async () => {
    const existing = makeShift({ id: 'previous', status: 'closed' });
    const created = makeShift({ id: 'new-shift', openingBalance: 1000 });
    mockOpenShift.mockResolvedValue(created);

    const { result, queryClient } = renderShiftHook();
    queryClient.setQueryData(queryKeys.shifts.all('B1'), [existing]);

    await act(async () => {
      await result.current.startShift({ openingBalance: 1000, openedBy: 'emp1' } as any);
    });

    expect(mockOpenShift).toHaveBeenCalledWith(1000, 'emp1', 'B1');
    expect(queryClient.getQueryData(queryKeys.shifts.all('B1'))).toEqual([created, existing]);
  });
});

describe('useShift — endShift', () => {
  it('calls cashService.closeShift with closing data and replaces the shift in the cache', async () => {
    const openShift = makeShift({ id: 'shift-1', status: 'open' });
    const closed = makeShift({
      id: 'shift-1',
      status: 'closed',
      closingBalance: 1200,
      closedBy: 'emp1',
      notes: 'night close',
    });
    mockCloseShift.mockResolvedValue(closed);

    const { result, queryClient } = renderShiftHook();
    queryClient.setQueryData(queryKeys.shifts.all('B1'), [openShift]);

    await act(async () => {
      await result.current.endShift(closed);
    });

    expect(mockCloseShift).toHaveBeenCalledWith('shift-1', 1200, 'emp1', 'night close');
    expect(queryClient.getQueryData(queryKeys.shifts.all('B1'))).toEqual([closed]);
  });
});

describe('useShift — addTransaction', () => {
  it('forwards the transaction to cashService and updates the transaction + shift caches', async () => {
    const existingTx = makeTransaction({ id: 'tx-old' });
    const openShift = makeShift({ id: 'shift-1' });
    const newTx = makeTransaction({ id: 'tx-new', amount: 200, relatedSaleId: 'sale-9' });
    mockAddTransaction.mockResolvedValue(newTx);

    const { result, queryClient } = renderShiftHook();
    queryClient.setQueryData(queryKeys.cashTransactions.byShift('shift-1', 'B1'), [existingTx]);
    queryClient.setQueryData(queryKeys.shifts.all('B1'), [openShift]);

    await act(async () => {
      await result.current.addTransaction('shift-1', newTx, { cashSales: 200 });
    });

    expect(mockAddTransaction).toHaveBeenCalledWith('shift-1', {
      branchId: 'B1',
      shiftId: 'shift-1',
      time: newTx.time,
      type: 'sale',
      amount: 200,
      reason: undefined,
      userId: 'emp1',
      relatedSaleId: 'sale-9',
    });

    expect(queryClient.getQueryData(queryKeys.cashTransactions.byShift('shift-1', 'B1'))).toEqual([
      existingTx,
      newTx,
    ]);
    expect(queryClient.getQueryData(queryKeys.shifts.all('B1'))).toEqual([
      { ...openShift, cashSales: 200 },
    ]);
  });
});

describe('useShift — refreshShifts', () => {
  it('fetches shifts for the active branch and seeds the cache', async () => {
    const shifts = [makeShift()];
    mockGetAllShifts.mockResolvedValue(shifts);

    const { result, queryClient } = renderShiftHook();

    await act(async () => {
      await result.current.refreshShifts();
    });

    expect(mockGetAllShifts).toHaveBeenCalledWith('B1');
    expect(queryClient.getQueryData(queryKeys.shifts.all('B1'))).toEqual(shifts);
  });
});

describe('useShift — provider boundary', () => {
  it('throws when used outside of the ShiftProvider', () => {
    expect(() => renderHook(() => useShift())).toThrow(
      'useShift must be used within a ShiftProvider'
    );
  });
});
