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

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn().mockReturnValue('B1'), // activeBranchId
}));

vi.mock('../../utils/printing', () => ({
  printDocument: vi.fn(),
}));

vi.mock('../../context/TypographyContext', () => ({
  useTypography: vi.fn().mockReturnValue({ fontFamily: 'sans-serif' }),
}));

vi.mock('../common/ContextMenu', () => ({
  useContextMenu: vi.fn().mockReturnValue({}),
}));

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
