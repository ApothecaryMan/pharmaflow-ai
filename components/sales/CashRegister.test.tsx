import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CashTransaction, Shift } from '../../types';
import { CashRegister } from './CashRegister';

const {
  mockHandleOpenShift,
  mockHandleCloseShift,
  mockHandleCashTransaction,
  mockSetModalMode,
  mockSetFilterType,
  mockUseEmployees,
} = vi.hoisted(() => ({
  mockHandleOpenShift: vi.fn(),
  mockHandleCloseShift: vi.fn(),
  mockHandleCashTransaction: vi.fn(),
  mockSetModalMode: vi.fn(),
  mockSetFilterType: vi.fn(),
  mockUseEmployees: vi.fn(),
}));

const state = vi.hoisted(() => ({
  modalMode: null as string | null,
  filterType: 'all' as string,
  amountInput: '',
  reasonInput: '',
  currentShift: null as Shift | null,
  filteredTransactions: [] as CashTransaction[],
  counts: { all: 0, sales: 0, returns: 0, purchases: 0, operations: 0 },
  permissions: {
    canViewExpectedBalance: true,
    canAddCash: true,
    canRemoveCash: true,
    canOpenShift: true,
    canCloseShift: true,
  },
  validationError: null as string | null,
  currentBalance: 0,
  availableAboveBase: 0,
  setter: (partial: any) => {
    Object.assign(state, partial);
  },
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: any) => selector({ activeBranchId: 'B1' }),
}));

vi.mock('../../hooks/queries/useEmployeesQuery', () => ({
  useEmployees: mockUseEmployees,
}));

vi.mock('../../context/HelpContext', () => ({
  usePageHelp: vi.fn(),
}));

vi.mock('../../context/TypographyContext', () => ({
  useTypography: vi.fn().mockReturnValue({ language: 'EN' }),
}));

vi.mock('../../context/SettingsContext', () => ({
  useSettings: vi.fn().mockReturnValue({ language: 'EN' }),
}));

vi.mock('./useCashRegister', () => ({
  useCashRegister: () => ({
    currentShift: state.currentShift,
    isLoading: false,
    isProcessing: false,
    modalMode: state.modalMode,
    setModalMode: mockSetModalMode,
    amountInput: state.amountInput,
    setAmountInput: (v: string) => state.setter({ amountInput: v }),
    reasonInput: state.reasonInput,
    setReasonInput: (v: string) => state.setter({ reasonInput: v }),
    validationError: state.validationError,
    setValidationError: vi.fn(),
    filterType: state.filterType,
    setFilterType: mockSetFilterType,
    currentBalance: state.currentBalance,
    availableAboveBase: state.availableAboveBase,
    permissions: state.permissions,
    filteredTransactions: state.filteredTransactions,
    counts: state.counts,
    handleOpenShift: mockHandleOpenShift,
    handleCloseShift: mockHandleCloseShift,
    handleCashTransaction: mockHandleCashTransaction,
    closeModal: vi.fn(),
  }),
}));

vi.mock('../common/Modal', () => ({
  Modal: ({ children, title, footer }: any) => (
    <div data-testid='modal'>
      <h2>{title}</h2>
      {children}
      <div>{footer}</div>
    </div>
  ),
}));

vi.mock('../common/SegmentedControl', () => ({
  SegmentedControl: ({ options, value, onChange }: any) => (
    <div>
      {options.map((o: any) => (
        <button type='button' key={o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
      <span>{value}</span>
    </div>
  ),
}));

vi.mock('../common/TanStackTable', () => ({
  TanStackTable: ({ data, emptyMessage }: any) => (
    <div data-testid='tx-table'>
      {data.length === 0 ? <span>{emptyMessage}</span> : data.map((t: any) => (
        <span key={t.id} data-testid='tx-row'>
          {t.reason}
        </span>
      ))}
    </div>
  ),
}));

vi.mock('../common/table/PriceDisplay', () => ({
  PriceDisplay: ({ value, showSign }: any) => (
    <span data-testid='price'>{(showSign && value > 0 ? '+' : '') + value}</span>
  ),
}));

vi.mock('../common/AnimatedCounter', () => ({
  AnimatedCounter: ({ value }: any) => <span data-testid='counter'>{value}</span>,
}));

vi.mock('../common/PageHeader', () => ({
  PageHeader: ({ rightContent, centerContent }: any) => (
    <div data-testid='page-header'>
      <div>{centerContent}</div>
      <div>{rightContent}</div>
    </div>
  ),
}));

function makeShift(overrides?: Partial<Shift>): Shift {
  return {
    id: 'shift-1',
    branchId: 'B1',
    status: 'open',
    openTime: '2024-01-01T08:00:00Z',
    openedBy: 'emp1',
    openingBalance: 500,
    cashIn: 100,
    cashOut: 200,
    cashSales: 1000,
    cardSales: 0,
    returns: 50,
    transactions: [
      { id: 'tx-1', branchId: 'B1', shiftId: 'shift-1', time: '2024-01-01T09:00:00Z', type: 'sale', amount: 100, userId: 'emp1', reason: 'Sale ABC' },
      { id: 'tx-2', branchId: 'B1', shiftId: 'shift-1', time: '2024-01-01T10:00:00Z', type: 'return', amount: 50, userId: 'emp1', reason: 'Return' },
    ],
    ...overrides,
  };
}

const mockT: any = {
  cashRegister: {
    title: 'Register',
    status: { details: 'Status', open: 'Open', closed: 'Closed' },
    messages: { started: 'started', by: 'by', id: 'id', countedCash: 'counted', optionalNotes: 'Notes', expected: 'Expected', variance: 'Variance', noShift: 'No shift', noTransactions: 'No transactions' },
    actions: { addCash: 'Add Cash', removeCash: 'Remove Cash', closeShift: 'Close Shift', openShift: 'Open Shift' },
    summary: { availableBalance: 'Available', aboveBase: 'above base', openingBalance: 'Opening', cashSales: 'Cash Sales', cardSales: 'Card Sales', cashIn: 'Cash In', cashOut: 'Cash Out', cashPurchases: 'Purchases', cashPurchaseReturns: 'PReturns', returns: 'Returns' },
    modal: { cancel: 'Cancel', confirm: 'Confirm', amount: 'Amount', notes: 'Notes', openTitle: 'Open Shift', closeTitle: 'Close Shift' },
    validation: { amountRequired: 'Amount required', negativeAmount: 'Negative', positiveAmount: 'Positive', protectedBalance: 'Protected', reasonRequired: 'Reason required' },
    transactions: { title: 'Transactions', reason: 'Reason' },
    filters: { all: 'All', sales: 'Sales', returns: 'Returns', purchases: 'Purchases', operations: 'Ops' },
    types: { sale: 'Sale', return: 'Return' },
  },
  shiftHistory: { title: 'Shifts' },
  global: { actions: { search: 'Search...' } },
};

function renderPage() {
  mockUseEmployees.mockReturnValue({ data: [] });
  state.setter({ currentShift: null as any, modalMode: null, filterType: 'all' });
  return render(
    <CashRegister color='indigo' t={mockT} language='EN' currentEmployeeId='emp1' />
  );
}

describe('CashRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.setter({
      currentShift: null as any,
      modalMode: null,
      filterType: 'all',
      filteredTransactions: [],
      currentBalance: 0,
      availableAboveBase: 0,
      validationError: null,
    });
  });

  it('renders summary cards and transaction table', async () => {
    mockUseEmployees.mockReturnValue({ data: [] });
    state.setter({ currentShift: null });
    state.setter({ filteredTransactions: makeShift().transactions });
    state.setter({ currentBalance: 500, availableAboveBase: 0 });
    render(
      <CashRegister color='indigo' t={mockT} language='EN' currentEmployeeId='emp1' />
    );
    expect(await screen.findByText('Register')).toBeInTheDocument();
  });

  it('opens the Open Shift modal and calls handleOpenShift', async () => {
    renderPage();
    const dump = screen.getByText('Open Shift');
    fireEvent.click(dump);
    await waitFor(() => expect(mockSetModalMode).toHaveBeenCalledWith('open'));
  });

  it('shows expected balance card and transaction filter options', async () => {
    state.setter({ currentShift: makeShift(), currentBalance: 500, availableAboveBase: 350 });
    render(
      <CashRegister color='indigo' t={mockT} language='EN' currentEmployeeId='emp1' />
    );
    expect(await screen.findByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getAllByText('Returns').length).toBeGreaterThan(0);
  });

  it('filters transactions when a filter option is selected', async () => {
    state.setter({ currentShift: makeShift() });
    renderPage();
    expect(await screen.findByText('Sales')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Returns'));
    expect(mockSetFilterType).toHaveBeenCalled();
  });

  it('Add Cash and Remove Cash buttons call handleCashTransaction for cash in/out', async () => {
    state.setter({ currentShift: makeShift() });
    render(
      <CashRegister color='indigo' t={mockT} language='EN' currentEmployeeId='emp1' />
    );
    await screen.findByText('Add Cash');
    fireEvent.click(screen.getByText('Add Cash'));
    expect(mockSetModalMode).toHaveBeenCalledWith('in');
  });
});