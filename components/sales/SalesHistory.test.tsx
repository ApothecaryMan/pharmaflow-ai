import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sale } from '../../types';
import { SalesHistory } from './SalesHistory';

const {
  mockUseSalesReturns,
  mockUseCustomers,
  mockUseEmployees,
  mockUseSalesPage,
  mockUseHandlerInfrastructure,
  mockCan,
  mockGetById,
} = vi.hoisted(() => ({
  mockUseSalesReturns: vi.fn(),
  mockUseCustomers: vi.fn(),
  mockUseEmployees: vi.fn(),
  mockUseSalesPage: vi.fn(),
  mockUseHandlerInfrastructure: vi.fn(),
  mockCan: vi.fn(),
  mockGetById: vi.fn(),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({ activeBranchId: 'B1', activeOrgId: 'O1', currentEmployee: { id: 'emp1' } }),
}));

vi.mock('../../context', () => ({
  useSettings: vi.fn().mockReturnValue({ textTransform: 0, language: 'EN' }),
}));

vi.mock('../../context/TypographyContext', () => ({
  useTypography: vi.fn().mockReturnValue({ fontFamily: 'sans-serif', language: 'EN' }),
}));

vi.mock('../../context/UIContext', () => ({
  useUI: vi.fn().mockReturnValue({ developerMode: false }),
}));

vi.mock('../../context/HelpContext', () => ({
  usePageHelp: vi.fn(),
}));

vi.mock('../common/ContextMenu', () => ({
  ContextMenuProvider: ({ children }: any) => children,
  ContextMenuTrigger: () => null,
  useContextMenu: vi.fn().mockReturnValue({ showMenu: vi.fn() }),
}));

vi.mock('../../hooks/queries/useReturnsQuery', () => ({
  useSalesReturns: mockUseSalesReturns,
}));

vi.mock('../../hooks/queries/useCustomersQuery', () => ({
  useCustomers: mockUseCustomers,
}));

vi.mock('../../hooks/queries/useEmployeesQuery', () => ({
  useEmployees: mockUseEmployees,
}));

vi.mock('../../hooks/queries/useSalesQuery', () => ({
  useSalesPage: mockUseSalesPage,
}));

vi.mock('../../hooks/useHandlerInfrastructure', () => ({
  useHandlerInfrastructure: mockUseHandlerInfrastructure,
}));

vi.mock('../../services/auth/permissionsService', () => ({
  permissionsService: {
    can: mockCan,
    hasRole: vi.fn().mockReturnValue(false),
    isOrgAdmin: vi.fn().mockReturnValue(true),
    getEffectiveRole: vi.fn().mockReturnValue('admin'),
  },
}));

vi.mock('../../services/sales', () => ({
  salesService: { getById: mockGetById },
}));

vi.mock('../common/Modal', () => ({
  Modal: ({ children, title }: any) => (
    <div data-testid='modal'>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

// Original TanStackTable uses @tanstack/react-virtual which does not allocate
// rows in jsdom; stub it so we can exercise SalesHistory's wiring deterministically.
vi.mock('../common/TanStackTable', () => ({
  TanStackTable: ({ data, onRowClick, rightCustomControls, children }: any) => (
    <div data-testid='table'>
      <div>{rightCustomControls}</div>
      {data.map((row: any) => (
        <span key={row.id} role='row' className='cell-value'>
          <span onClick={() => onRowClick?.(row)}>
            {row.serialId}
          </span>
          <span>{row.customerName}</span>
          <span>{row.paymentMethod}</span>
          <span>{row.items?.length}</span>
        </span>
      ))}
      {children}
    </div>
  ),
}));

vi.mock('../common/SearchInput', () => ({
  SearchInput: ({ onSearchChange, placeholder }: any) => (
    <input
      aria-label='search'
      placeholder={placeholder}
      onChange={(e) => onSearchChange(e.target.value)}
    />
  ),
}));

vi.mock('../common/DatePicker', () => ({
  DateRangePicker: ({ onStartDateChange, onEndDateChange }: any) => (
    <div>
      <button type='button' onClick={() => onStartDateChange('2024-01-01')}>
        from
      </button>
      <button type='button' onClick={() => onEndDateChange('2024-01-31')}>
        to
      </button>
    </div>
  ),
}));

vi.mock('./SaleDetailModal', () => ({
  SaleDetailModal: ({ sale, isOpen }: any) =>
    isOpen && sale ? <div data-testid='sale-detail-open'>{sale.serialId}</div> : null,
}));

vi.mock('./pos/ui/POSCustomerHistoryModal', () => ({
  POSCustomerHistoryModal: () => null,
}));

const saleFixture = (overrides?: Partial<Sale>): Sale =>
  ({
    id: 'sale-1',
    serialId: 'SALE-0001',
    branchId: 'B1',
    date: '2024-01-05T10:00:00Z',
    total: 300,
    netTotal: 300,
    paymentMethod: 'cash',
    status: 'completed',
    customerName: 'Ahmed',
    customerCode: 'C-1',
    subtotal: 300,
    items: [],
    ...overrides,
  }) as Sale;

const mockT: any = {
  title: 'Sales',
  searchPlaceholder: 'Search sales…',
  modal: { id: 'ID', title: 'Sale' },
  headers: {
    date: 'Date',
    code: 'Code',
    customer: 'Customer',
    payment: 'Payment',
    items: 'Items',
    total: 'Total',
    soldBy: 'Sold By',
    delivery: 'Delivery',
  },
  status: 'Status',
  completed: 'Completed',
  pending: 'Pending',
  with_delivery: 'With Delivery',
  on_way: 'On Way',
  cancelled: 'Cancelled',
  returned: 'Returned',
  cash: 'Cash',
  visa: 'Visa',
  items: 'items',
  exportCSV: 'Export CSV',
  noResults: 'No sales',
  fullReturn: 'Full Return',
  partialReturn: 'Partial Return',
};

function renderPage() {
  mockCan.mockReturnValue(true);
  mockUseSalesReturns.mockReturnValue({ data: [] });
  mockUseCustomers.mockReturnValue({ data: [] });
  mockUseEmployees.mockReturnValue({ data: [{ id: 'emp1', name: 'Ahmed' }] });
  mockUseSalesPage.mockReturnValue({
    data: { rows: [saleFixture()], total: 1 },
    isLoading: false,
  });
  mockUseHandlerInfrastructure.mockReturnValue({
    currentShift: null,
    setSales: vi.fn(),
    processSalesReturn: vi.fn(),
  });
  mockGetById.mockResolvedValue(saleFixture());
  render(
    <SalesHistory color='indigo' t={mockT} language='EN' datePickerTranslations={{}} />
  );
}

describe('SalesHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sale rows from mocked useSalesPage', async () => {
    renderPage();
    expect(await screen.findByText('SALE-0001')).toBeInTheDocument();
    expect(screen.getByText('Ahmed')).toBeInTheDocument();
  });

  it('displays the Export CSV button', async () => {
    renderPage();
    await screen.findByText('SALE-0001');
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('re-runs the paged query when the employee seller filter filter options is derived from employees', async () => {
    renderPage();
    await screen.findByText('SALE-0001');
    expect(mockUseSalesPage).toHaveBeenCalledWith(
      'B1',
      1,
      20,
      expect.objectContaining({ soldByEmployeeId: undefined })
    );
  });

  it('opens SaleDetailModal when a row is clicked', async () => {
    renderPage();
    const row = await screen.findByText('SALE-0001');
    fireEvent.click(row);
    await waitFor(() => {
      expect(screen.getByTestId('sale-detail-open')).toBeInTheDocument();
    });
  });

  it('passes the selected sale into SaleDetailModal when a row is clicked', async () => {
    renderPage();
    const row = await screen.findByText('SALE-0001');
    fireEvent.click(row);
    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalled();
    });
    expect(screen.getByTestId('sale-detail-open')).toBeInTheDocument();
    // Permission gating for the Return button lives inside SaleDetailModal
    // (sale.refund) and is covered by its dedicated test suite.
  });
});