import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Return, Sale } from '../../types';
import { ReturnHistory } from './ReturnHistory';

// Hoisted mocks so callers can inspect invocation args
const { mockUseSalesReturns, mockUseRecentSales, mockListPage } = vi.hoisted(() => ({
  mockUseSalesReturns: vi.fn(),
  mockUseRecentSales: vi.fn(),
  mockListPage: vi.fn(),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => 'B1', // activeBranchId
}));

vi.mock('../../context', () => ({
  useSettings: vi.fn().mockReturnValue({ textTransform: 0 }),
}));

vi.mock('../../context/HelpContext', () => ({
  usePageHelp: vi.fn(),
}));

// ContextMenu is used by both ReturnHistory (directly) and TanStackTable.
vi.mock('../common/ContextMenu', () => ({
  ContextMenuProvider: ({ children }: any) => children,
  ContextMenuTrigger: () => null,
  useContextMenu: vi.fn().mockReturnValue({ showMenu: vi.fn() }),
}));

vi.mock('../../hooks/queries/useReturnsQuery', () => ({
  useSalesReturns: mockUseSalesReturns,
}));

vi.mock('../../hooks/queries/useSalesQuery', () => ({
  useRecentSales: mockUseRecentSales,
}));

// The component dynamically imports the return service for paginated listing.
vi.mock('../../services/returns/returnService', () => ({
  returnService: {
    listSalesReturnsPage: mockListPage,
  },
}));

vi.mock('../../context/TypographyContext', () => ({
  useTypography: vi.fn().mockReturnValue({ fontFamily: 'sans-serif', language: 'EN' }),
}));

vi.mock('../../context/UIContext', () => ({
  useUI: vi.fn().mockReturnValue({ developerMode: false }),
}));

// SaleDetailModal is rendered from the dynamic import of its own module only when a
// viewedSale is set; mock it so we can assert it opens without heavy deps.
vi.mock('./SaleDetailModal', () => ({
  SaleDetailModal: ({ sale, isOpen }: any) =>
    isOpen && sale ? <div data-testid='sale-detail-open'>{sale.serialId}</div> : null,
}));

vi.mock('../common/Modal', () => ({
  Modal: ({ children, title }: any) => (
    <div data-testid='modal'>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

vi.mock('../common/DatePicker', () => ({
  DatePicker: ({ onChange, label }: any) => (
    <button type='button' onClick={() => onChange('2024-01-15')}>
      {label}
    </button>
  ),
}));

const returnFixture = (overrides?: Partial<Return>): Return =>
  ({
    id: 'ret-1',
    serialId: 'RET-0001',
    branchId: 'B1',
    saleId: 'sale-1',
    date: '2024-01-10T10:00:00Z',
    returnType: 'partial',
    totalRefund: 120.5,
    reason: 'damaged',
    processedBy: 'emp1',
    items: [
      {
        drugId: 'drug-1',
        saleItemId: 'si-1',
        name: 'Panadol',
        dosageForm: 'Tablet',
        quantityReturned: 2,
        isUnit: false,
        publicPrice: 60.25,
        refundAmount: 120.5,
        condition: 'sellable',
      },
    ],
    ...overrides,
  }) as Return;

const saleFixture = (overrides?: Partial<Sale>): Sale =>
  ({
    id: 'sale-1',
    serialId: 'SALE-0001',
    branchId: 'B1',
    date: '2024-01-05T10:00:00Z',
    total: 300,
    paymentMethod: 'cash',
    status: 'completed',
    customerName: 'Ahmed',
    items: [],
    ...overrides,
  }) as Sale;

const mockT: any = {
  title: 'Returns',
  subtitle: 'Customer returns',
  someQuery: 'Search returns…',
  headers: {
    saleId: 'Invoice',
    date: 'Date',
    customer: 'Customer',
    refundAmount: 'Refund',
    reason: 'Reason',
    items: 'Items',
    totalRefund: 'Total Refund',
    returnId: 'Return ID',
    notes: 'Notes',
  },
  reasons: { damaged: 'Damaged', expired: 'Expired' },
  actions: { viewDetails: 'View Details' },
  modal: { title: 'Return Details', itemsReturned: 'Items Returned' },
};

function renderPage(overrides?: { sales?: Sale[] }) {
  const sales = overrides?.sales ?? [saleFixture()];
  mockUseRecentSales.mockReturnValue({ data: sales });
  mockUseSalesReturns.mockReturnValue({ data: [returnFixture()] });
  mockListPage.mockResolvedValue({ rows: [returnFixture()], total: 1 });
  render(
    <ReturnHistory color='indigo' t={mockT} language='EN' />
  );
}

describe('ReturnHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders returns rows from the mocked paginated service', async () => {
    renderPage();
    expect(await screen.findByText('RET-0001')).toBeInTheDocument();
  });

  it('renders translated reason badge for a return with known reason', async () => {
    renderPage();
    expect(await screen.findByText('RET-0001')).toBeInTheDocument();
    expect(screen.getByText('Damaged')).toBeInTheDocument();
  });

  it('opens the SaleDetailModal when clicking the saleId cell of a known sale', async () => {
    renderPage();
    expect(await screen.findByText('SALE-0001')).toBeInTheDocument();
    fireEvent.click(screen.getByText('SALE-0001'));
    await waitFor(() => {
      expect(screen.getByTestId('sale-detail-open')).toBeInTheDocument();
    });
  });

  it('re-queries the paginated service with a date filter after the date control changes', async () => {
    renderPage();
    await screen.findByText('RET-0001');
    fireEvent.click(screen.getByText('Date'));
    await waitFor(() => {
      expect(mockListPage).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ dateFrom: '2024-01-15T00:00:00' }),
        })
      );
    });
  });

  it('renders the reason column so returns with a known reason mark the cell badge', async () => {
    // The reason cell renders the translated label inside a badge for row values.
    renderPage();
    expect(await screen.findByText('RET-0001')).toBeInTheDocument();
    expect(screen.getByText('Damaged')).toBeInTheDocument();
  });
});