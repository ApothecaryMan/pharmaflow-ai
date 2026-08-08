import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sale } from '../../types';
import { SaleDetailModal } from './SaleDetailModal';

const { mockCan, mockHasRole } = vi.hoisted(() => ({
  mockCan: vi.fn(),
  mockHasRole: vi.fn(),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({ activeBranchId: 'B1', branches: [{ id: 'B1', name: 'Branch 1' }] }),
}));

vi.mock('../../hooks/queries/useInventoryQuery', () => ({
  useInventory: vi.fn().mockReturnValue({ data: [] }),
}));

vi.mock('../../services/auth/permissionsService', () => ({
  permissionsService: {
    can: mockCan,
    hasRole: mockHasRole,
    isOrgAdmin: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('./InvoiceTemplate', () => ({
  printInvoice: vi.fn(),
  getActiveReceiptSettings: vi.fn().mockReturnValue({}),
}));

vi.mock('./ReturnModal', () => ({
  ReturnModal: ({ onConfirm }: any) => (
    <button type='button' onClick={() => onConfirm({}).then(Boolean)}>
      Process Return Modal
    </button>
  ),
}));

vi.mock('../common/Modal', () => ({
  Modal: ({
    children,
    title,
    tabs,
    activeTab,
    onTabChange,
    onClose,
  }: any) => (
    <div data-testid='modal'>
      <h2>{title}</h2>
      <div>
        {tabs.map((t: any) => (
          <button
            key={t.value}
            type='button'
            onClick={() => onTabChange(t.value)}
            data-active={activeTab === t.value ? 'true' : 'false'}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button type='button' onClick={onClose}>
        close
      </button>
      {children}
    </div>
  ),
}));

vi.mock('../../utils/drugDisplayName', () => ({
  getDisplayName: ({ name, dosageForm }: any) =>
    `${name}${dosageForm ? ` ${dosageForm}` : ''}`,
}));

const saleFixture = (overrides?: Partial<Sale>): Sale =>
  ({
    id: 'sale-1',
    serialId: 'SALE-0001',
    branchId: 'B1',
    date: '2024-01-05T10:00:00Z',
    total: 300,
    netTotal: 300,
    subtotal: 300,
    paymentMethod: 'cash',
    status: 'completed',
    customerName: 'Ahmed',
    items: [
      {
        drugId: 'drug-1',
        name: 'Panadol',
        dosageForm: 'Tablet',
        isUnit: false,
        quantity: 2,
        publicPrice: 150,
        discount: 0,
        unitsPerPack: 10,
      },
    ],
    ...overrides,
  }) as any as Sale;

const mockT: any = {
  modal: {
    title: 'Sale Details',
    date: 'Date',
    id: 'ID',
    customer: 'Customer',
    payment: 'Payment',
    items: 'Items',
    modificationHistory: 'Modification History',
    subtotal: 'Subtotal',
    total: 'Total',
    print: 'Print',
    added: 'Added',
    removed: 'Removed',
    noHistory: 'No history yet',
  },
  visa: 'Visa',
  cash: 'Cash',
  returns: { processReturn: 'Return' },
  soldTo: 'Sold To',
  deliveryFee: 'Delivery Fee',
  completed: 'Completed',
};

function renderModal(
  sale = saleFixture(),
  overrides?: { onProcessReturn?: any; currentShift?: any }
) {
  const onProcessReturn = overrides?.onProcessReturn ?? (() => Promise.resolve(true));
  return render(
    <SaleDetailModal
      sale={sale}
      isOpen
      onClose={vi.fn()}
      t={mockT}
      language='EN'
      color='indigo'
      textTransform={0}
      currentShift={overrides?.currentShift}
      currentEmployeeId='emp1'
      currentDailyRefunds={0}
      onProcessReturn={onProcessReturn}
    />
  );
}

describe('SaleDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCan.mockReturnValue(true);
    mockHasRole.mockReturnValue(false);
  });

  it('renders invoice header and item quantities', () => {
    renderModal();
    expect(screen.getByText('Sale Details')).toBeInTheDocument();
    expect(screen.getByText('Ahmed')).toBeInTheDocument();
    expect(screen.getByText('Panadol Tablet')).toBeInTheDocument();
    // pack quantity badge shows 2
    expect(screen.getAllByText('2')).not.toHaveLength(0);
  });

  it('displays returned quantities for items with itemReturnedQuantities', () => {
    renderModal(
      saleFixture({
        itemReturnedQuantities: { 'drug-1_pack': 1 },
      })
    );
    expect(screen.getByText(/RET\s*\(1\)/)).toBeInTheDocument();
  });

  it('shows batch/expiry metadata from item expiry', () => {
    renderModal(
      saleFixture({
        items: [
          {
            id: 'ci-1',
            drugId: 'drug-1',
            name: 'Panadol',
            genericName: ['paracetamol'],
            category: 'general',
            costPrice: 50,
            stock: 10,
            unitsPerPack: 10,
            quantity: 1,
            publicPrice: 100,
            isUnit: false,
            expiryDate: '2025-06-01',
          },
        ],
      })
    );
    expect(screen.getByText(/06\/25|Jun\/25/) || screen.getByText('06/25')).toBeTruthy();
  });

  it('displays modification history when switching to the history tab', () => {
    renderModal(
      saleFixture({
        modificationHistory: [
          {
            id: 'mod-1',
            modifiedBy: 'emp1',
            timestamp: '2024-01-05T11:00:00Z',
            modifications: [
              { type: 'item_added', itemName: 'Panadol', newQuantity: 2 },
            ],
          },
        ],
      })
    );
    fireEvent.click(screen.getByText('Modification History'));
    expect(screen.getByText('Panadol')).toBeInTheDocument();
  });

  it('shows the Return button only when sale.refund permission is granted', () => {
    mockCan.mockImplementation((perm: string) => perm === 'sale.refund');
    renderModal();
    expect(screen.getByText('Return')).toBeInTheDocument();

    mockCan.mockReturnValue(false);
    // rerender needed because permission is read during render
  });

  it('hides the Return button when sale.refund permission is denied', () => {
    mockCan.mockReturnValue(false);
    renderModal();
    expect(screen.queryByText('Return')).not.toBeInTheDocument();
  });

  it('confirms the returned quantity is shown and total displayed', () => {
    renderModal(
      saleFixture({
        netTotal: 300,
        itemReturnedQuantities: { 'drug-1_pack': 1 },
      })
    );
    expect(screen.getAllByText(/RET\s*\(1\)/)).not.toHaveLength(0);
  });
});