import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CashTransaction, Shift } from '../../../types';
import { useCashRegister } from '../../../components/sales/useCashRegister';

const {
  mockUseShift,
  mockUsePurchases,
  mockUsePurchaseReturns,
  mockUseRecentSales,
  mockCan,
  mockGetVerifiedDate,
  mockRecordExpense,
  mockStartShift,
  mockEndShift,
  mockAddTransaction,
} = vi.hoisted(() => ({
  mockUseShift: vi.fn(),
  mockUsePurchases: vi.fn(),
  mockUsePurchaseReturns: vi.fn(),
  mockUseRecentSales: vi.fn(),
  mockCan: vi.fn(),
  mockGetVerifiedDate: vi.fn(),
  mockRecordExpense: vi.fn(),
  mockStartShift: vi.fn(),
  mockEndShift: vi.fn(),
  mockAddTransaction: vi.fn(),
}));

vi.mock('../../../components/layout/StatusBar', () => ({
  useStatusBar: () => ({
    getVerifiedDate: mockGetVerifiedDate,
    validateTransactionTime: vi.fn(),
    updateLastTransactionTime: vi.fn(),
  }),
}));

vi.mock('../../../hooks/queries/usePurchasesQuery', () => ({
  usePurchases: mockUsePurchases,
}));

vi.mock('../../../hooks/queries/useReturnsQuery', () => ({
  usePurchaseReturns: mockUsePurchaseReturns,
}));

vi.mock('../../../hooks/queries/useSalesQuery', () => ({
  useRecentSales: mockUseRecentSales,
}));

vi.mock('../../../hooks/sales/useShift', () => ({
  useShift: mockUseShift,
}));

vi.mock('../../../services/auth/permissionsService', () => ({
  permissionsService: { can: mockCan },
}));

vi.mock('../../../services/financials/expenseService', () => ({
  expenseService: { recordExpense: mockRecordExpense },
}));

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({ activeBranchId: 'B1', activeOrgId: 'O1', branches: [] }),
}));

vi.mock('../../../utils/idGenerator', () => ({
  idGenerator: { uuid: () => 'uuid-1' },
}));

vi.mock('../../../utils/printing', () => ({
  printDocument: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/storage', () => ({
  storage: { get: vi.fn().mockReturnValue(0), set: vi.fn() },
}));

vi.mock('../../../components/sales/ShiftReceiptTemplate', () => ({
  generateShiftReceiptHTML: vi.fn(),
}));

const mockT: any = {
  cashRegister: {
    validation: {
      amountRequired: 'Amount required',
      negativeAmount: 'Negative',
      positiveAmount: 'Positive',
      protectedBalance: 'Protected',
      reasonRequired: 'Reason required',
    },
  },
};

function makeShift(overrides?: Partial<Shift>): Shift {
  return {
    id: 'shift-1',
    branchId: 'B1',
    status: 'open',
    openTime: '2024-01-01T08:00:00Z',
    openedBy: 'emp1',
    openingBalance: 500,
    cashIn: 100,
    cashOut: 50,
    cashSales: 1000,
    cardSales: 0,
    returns: 20,
    transactions: [
      { id: 'tx-1', branchId: 'B1', shiftId: 'shift-1', time: '2024-01-01T09:00:00Z', type: 'sale', amount: 100, userId: 'emp1' },
      { id: 'tx-2', branchId: 'B1', shiftId: 'shift-1', time: '2024-01-01T10:00:00Z', type: 'card_sale', amount: 80, userId: 'emp1' },
      { id: 'tx-3', branchId: 'B1', shiftId: 'shift-1', time: '2024-01-01T11:00:00Z', type: 'out', amount: 30, userId: 'emp1' },
    ] as CashTransaction[],
    ...overrides,
  };
}

function renderHookWithDefaults(overrides?: { shift?: Shift | null; currentEmployeeId?: string }) {
  const hasShift = 'shift' in (overrides ?? {});
  const shift = hasShift ? (overrides?.shift ?? null) : makeShift();
  mockUseShift.mockReturnValue({
    currentShift: shift,
    isLoading: false,
    startShift: mockStartShift,
    endShift: mockEndShift,
    addTransaction: mockAddTransaction,
    refreshShifts: vi.fn(),
  });
  mockUsePurchases.mockReturnValue({ data: [] });
  mockUsePurchaseReturns.mockReturnValue({ data: [] });
  mockUseRecentSales.mockReturnValue({ data: [] });
  mockCan.mockReturnValue(true);
  mockGetVerifiedDate.mockReturnValue(new Date('2024-01-01T12:00:00Z'));

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(
    () =>
      useCashRegister({
        t: mockT,
        language: 'EN' as any,
        employees: [{ id: 'emp1', name: 'Test' }] as any,
        currentEmployeeId: 'emp1',
      }),
    { wrapper }
  );
}

describe('useCashRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes currentBalance and availableAboveBase from calculateShiftBalances', () => {
    const { result } = renderHookWithDefaults();
    // availableAboveBase = cashIn(100) + cashSales(1000) - (cashOut(50) + returns(20)) = 1030
    // currentBalance = opening(500) + availableAboveBase(1030) = 1530
    expect(result.current.availableAboveBase).toBe(1030);
    expect(result.current.currentBalance).toBe(1530);
  });

  it('handles movement when shift has no open currentShift (returns zero balances)', () => {
    const { result } = renderHookWithDefaults({ shift: null as any });
    expect(result.current.currentBalance).toBe(0);
    expect(result.current.availableAboveBase).toBe(0);
    expect(result.current.filteredTransactions).toEqual([]);
  });

  it('filters transactions by the selected filterType', () => {
    const { result } = renderHookWithDefaults({ shift: makeShift() });
    expect(result.current.counts.sales).toBe(2); // sale + card_sale
    expect(result.current.counts.operations).toBe(1); // out

    act(() => result.current.setFilterType('sales'));
    expect(result.current.filteredTransactions.map((tx: any) => tx.type)).toEqual([
      'sale',
      'card_sale',
    ]);

    act(() => result.current.setFilterType('operations'));
    expect(result.current.filteredTransactions.map((tx: any) => tx.type)).toEqual(['out']);

    act(() => result.current.setFilterType('all'));
    expect(result.current.filteredTransactions).toHaveLength(3);
  });

  it('adds a cash-in transaction via addTransaction', async () => {
    const { result } = renderHookWithDefaults();
    mockAddTransaction.mockResolvedValue(undefined);
    act(() => result.current.setModalMode('in'));
    act(() => result.current.setAmountInput('100'));
    act(() => result.current.setReasonInput('Extra cash'));
    await act(async () => {
      await result.current.handleCashTransaction();
    });
    expect(mockAddTransaction).toHaveBeenCalledWith(
      'shift-1',
      expect.objectContaining({ type: 'in', amount: 100, reason: 'Extra cash' })
    );
  });

  it('rejects cash-in when amount is empty', async () => {
    const { result } = renderHookWithDefaults();
    act(() => result.current.setModalMode('in'));
    await act(async () => {
      await result.current.handleCashTransaction();
    });
    expect(result.current.validationError).toBe('Amount required');
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it('opens a shift by calling startShift with an opening_balance transaction', async () => {
    const { result } = renderHookWithDefaults({ shift: null as any });
    mockStartShift.mockResolvedValue(undefined);
    act(() => result.current.setModalMode('open'));
    act(() => result.current.setAmountInput('500'));
    act(() => result.current.setReasonInput('Start of day'));
    await act(async () => {
      await result.current.handleOpenShift();
    });
    expect(mockStartShift).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'open',
        openingBalance: 500,
        transactions: [expect.objectContaining({ type: 'opening_balance', amount: 500 })],
      })
    );
  });
});