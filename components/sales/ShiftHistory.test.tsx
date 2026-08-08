import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftHistory } from './ShiftHistory';

// Mock dependencies
vi.mock('../../hooks/queries/useEmployeesQuery', () => ({
  useEmployees: vi.fn().mockReturnValue({ data: [] }),
}));

vi.mock('../../hooks/sales/useShift', () => ({
  useShift: vi.fn().mockReturnValue({
    shifts: [
      {
        id: 'shift-1',
        serialId: 'shift-1',
        branchId: 'B1',
        status: 'closed',
        openTime: '2024-01-01T10:00:00Z',
        closeTime: '2024-01-01T18:00:00Z',
        openedBy: 'emp1',
        openingBalance: 100,
        closingBalance: 500,
        cashSales: 400,
        cardSales: 0,
        cashIn: 0,
        cashOut: 0,
        returns: 0,
        transactions: [], // Simulating backend returning empty transactions array
      },
    ],
    isLoading: false,
    endShift: vi.fn(),
  }),
}));

const mockUseShiftTransactions = vi.fn();
vi.mock('../../hooks/queries/useShiftsQuery', () => ({
  useShiftTransactions: (...args: any[]) => mockUseShiftTransactions(...args),
}));

vi.mock('../../hooks/queries/useInventoryQuery', () => ({
  useSuppliers: vi.fn().mockReturnValue({ data: [] }),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn().mockReturnValue('B1'), // activeBranchId
}));

vi.mock('../../utils/printing', () => ({
  printDocument: vi.fn(),
}));

vi.mock('../../context/TypographyContext', () => ({
  useTypography: vi.fn().mockReturnValue({ fontFamily: 'sans-serif' }),
}));

vi.mock('../../context/UIContext', () => ({
  useUI: vi.fn().mockReturnValue({ developerMode: false }),
}));

vi.mock('../common/ContextMenu', () => ({
  useContextMenu: vi.fn().mockReturnValue({}),
  ContextMenu: ({ children, title }: any) => <div data-testid='context-menu'>{title}<div>{children}</div></div>,
  ContextMenuTrigger: ({ children }: any) => <div>{children}</div>,
  ContextMenuItem: ({ children, onClick }: any) => <button type='button' onClick={onClick}>{children}</button>,
  ContextMenuSeparator: () => <div data-testid='separator' />,
}));

vi.mock('../common/DatePicker', () => ({
  DateRangePicker: ({ onStartDateChange, onEndDateChange }: any) => (
    <div>
      <button type='button' onClick={() => onStartDateChange?.('2024-01-01')}>from</button>
      <button type='button' onClick={() => onEndDateChange?.('2024-01-31')}>to</button>
    </div>
  ),
}));

vi.mock('../common/SearchInput', () => ({
  SearchInput: ({ onSearchChange, placeholder }: any) => (
    <input aria-label='search' placeholder={placeholder} onChange={(e) => onSearchChange?.(e.target.value)} />
  ),
}));

vi.mock('../common/Modal', () => ({
  Modal: ({ isOpen, show, header, title, tabs, activeTab, onTabChange, children, footer }: any) => {
    if (!isOpen && !show) return null;
    return (
      <div data-testid='modal'>
        <div>{header ?? title}</div>
        <div>
          {(tabs ?? []).map((tab: any) => <button key={tab.value} type='button' onClick={() => onTabChange?.(tab.value)}>{tab.label}</button>)}
        </div>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    );
  },
}));

vi.mock('../common/PageHeader', () => ({
  PageHeader: ({ leftContent, rightContent, centerContent, bottomContent, showBottom }: any) => (
    <div data-testid='page-header'>
      <div>{centerContent}</div>
      <div>{leftContent}</div>
      <div>{rightContent}</div>
      {showBottom && <div>{bottomContent}</div>}
    </div>
  ),
}));

vi.mock('../common/SegmentedControl', () => ({
  SegmentedControl: ({ options }: any) => (
    <div>{options.map((o: any) => <span key={o.value}>{o.label}</span>)}</div>
  ),
}));

// Real TanStackTable virtualization does not render cells in jsdom, so stub
// it to render each data row's cells from the column accessors.
vi.mock('../common/TanStackTable', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../common/TanStackTable')>();
  return {
    ...actual,
    TanStackTable: ({ data, columns, onRowClick }: any) => (
      <div data-testid='test-table'>
        {data.map((row: any, ri: number) => (
          <div key={ri} data-testid={`row-${ri}`} onClick={() => onRowClick?.(row)}>
            {columns.map((col: any, ci: number) => {
              let value: string = '';
              const getter = col.accessorFn ?? col.accessorKey;
              if (typeof getter === 'function') value = getter(row);
              else value = row[getter];
              if (typeof value !== 'string') value = String(value);
              return <span key={ci} data-testid={`cell-${ri}-${ci}`}>{value}</span>;
            })}
          </div>
        ))}
      </div>
    ),
  };
});

// Mock Translations
const mockT = {
  shiftHistory: {
    title: 'Shifts',
    headers: { shiftNumber: 'Shift #' },
    details: {
      title: 'Shift Details',
      transactionLog: 'Transaction Log',
      noTransactions: 'No transactions found',
    },
  },
  cashRegister: {
    title: 'Register',
    types: { sale: 'Sale', in: 'Cash In' },
  },
};

describe('ShiftHistory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and displays transactions dynamically when a shift is selected', () => {
    // 1. Setup mock to return transactions dynamically
    mockUseShiftTransactions.mockReturnValue({
      data: [
        { id: 'tx-1', type: 'sale', amount: 50, reason: 'Test Sale', time: '2024-01-01T11:00:00Z' },
        { id: 'tx-2', type: 'in', amount: 100, reason: 'Add Change', time: '2024-01-01T12:00:00Z' },
      ],
      isLoading: false,
    });

    // 2. Render component
    render(
      <ShiftHistory
        color="indigo"
        t={mockT as any}
        language="EN"
        datePickerTranslations={{}}
      />
    );

    // 3. Find and click the shift row to open the modal
    // TanStackTable renders the shift ID in the row
    const shiftRow = screen.getByText('shift-1');
    fireEvent.click(shiftRow);

    // Verify useShiftTransactions was called with the selected shift ID
    expect(mockUseShiftTransactions).toHaveBeenCalledWith('shift-1', 'B1');

    // 4. Switch to the 'Transaction Log' tab in the modal
    const logTab = screen.getByText('Transaction Log');
    fireEvent.click(logTab);

    // 5. Verify the dynamically fetched transactions are rendered
    expect(screen.getByText('Test Sale')).toBeInTheDocument();
    expect(screen.getByText('Add Change')).toBeInTheDocument();
    
    // Verify fallback "No transactions found" is NOT shown
    expect(screen.queryByText('No transactions found')).not.toBeInTheDocument();
  });

  it('displays loading state while transactions are being fetched', () => {
    mockUseShiftTransactions.mockReturnValue({
      data: [],
      isLoading: true, // Simulating loading state
    });

    render(
      <ShiftHistory
        color="indigo"
        t={mockT as any}
        language="EN"
        datePickerTranslations={{}}
      />
    );

    const shiftRow = screen.getByText('shift-1');
    fireEvent.click(shiftRow);

    const logTab = screen.getByText('Transaction Log');
    fireEvent.click(logTab);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

// --- Variance & balance math audit ---
// BUG-SH-04 (ShiftHistory.tsx:345) and BUG-SH-05 (:426) were flagged for review.
// Reading the source, the variance accessor ALREADY calculates:
//   expected = opening + cashSales + cashIn + cashPurchaseReturns - cashOut - returns - cashPurchases
// and the CSV export reuses the exact same formula. So the math is consistent and
// correct — these are CORRECT-behavior tests, not regression locks.
describe('ShiftHistory variance & balance math (BUG-SH-04 / BUG-SH-05 audit)', () => {
  let mockedUseShift: { mockReturnValue: (v: any) => void; mockReset: () => void };

  beforeEach(async () => {
    const mod = await import('../../hooks/sales/useShift');
    mockedUseShift = (mod as any).useShift;
  });

  afterEach(() => {
    mockedUseShift?.mockReset();
  });

  function renderWithShift(shift: any) {
    mockedUseShift.mockReturnValue({
      shifts: [shift],
      isLoading: false,
      endShift: vi.fn(),
    });
    mockUseShiftTransactions.mockReturnValue({ data: [], isLoading: false });
    render(
      <ShiftHistory
        color="indigo"
        t={mockT as any}
        language="EN"
        datePickerTranslations={{}}
      />
    );
  }

  it('computes variance including sales returns and cash purchases in the expected balance', () => {
    // opening=1000, cashSales=1500, cashIn=200, cashPurchaseReturns=100
    // cashOut=50, returns=300, cashPurchases=100
    // expected = 1000+1500+200+100 - (50+300+100) = 2350
    // closing = 2400 => variance = +50
    renderWithShift({
      id: 'shift-a',
      serialId: 'SH-0001',
      status: 'closed',
      openTime: '2024-01-01T08:00:00Z',
      closeTime: '2024-01-01T16:00:00Z',
      openedBy: 'emp1',
      openingBalance: 1000,
      cashSales: 1500,
      cardSales: 0,
      cashIn: 200,
      cashOut: 50,
      cashPurchaseReturns: 100,
      cashPurchases: 100,
      returns: 300,
      closingBalance: 2400,
      transactions: [],
    });

    // 2400 - 2350 = variance +50
    expect(screen.getByText('50')).toBeInTheDocument();
  });
});
