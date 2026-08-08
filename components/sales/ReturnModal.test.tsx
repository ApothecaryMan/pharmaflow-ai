import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Sale, Shift } from '../../types';
import { ReturnModal } from './ReturnModal';

vi.mock('../../hooks/sales/useReturnModalLogic', async () => {
  const React = await import('react');
  return {
    useReturnModalLogic: ({ sale, currentDailyRefunds }: any) => {
      const [step, setStep] = React.useState(1);
      const [isProcessing, setIsProcessing] = React.useState(false);
      const [selectedItems, setSelectedItems] = React.useState(new Map<string, number>());
      const [itemUnitModes, setItemUnitModes] = React.useState(new Map<string, boolean>());
      const [returnReason, setReturnReason] = React.useState('customer_request');
      const [returnNotes, setReturnNotes] = React.useState('');
      const [validationError, setValidationError] = React.useState(undefined as string | undefined);

      const availableItems = (sale?.items || [])
        .map((item: any) => {
          const saleItemId = item.saleItemId ?? item.id;
          const isUnit = item.isUnit ?? item.is_unit ?? false;
          const publicPrice = item.publicPrice ?? item.public_price ?? 0;
          const unitsPerPack = item.unitsPerPack ?? 1;
          const returnedQty =
            sale.itemReturnedQuantities?.[`${saleItemId}_unit`] ||
            sale.itemReturnedQuantities?.[`${saleItemId}_pack`] ||
            sale.itemReturnedQuantities?.[saleItemId] ||
            0;
          const availableQty = (item.quantity ?? item.quantity_sold ?? 0) - returnedQty;
          const effectiveUnitMode = itemUnitModes.get(saleItemId) ?? false;
          const effectiveMaxQty = effectiveUnitMode
            ? isUnit
              ? availableQty
              : availableQty * unitsPerPack
            : isUnit
              ? Math.max(0, Math.floor(availableQty / unitsPerPack))
              : availableQty;
          return {
            ...item,
            saleItemId,
            isUnit,
            publicPrice,
            unitsPerPack,
            effectiveMaxQty,
            effectiveUnitMode,
            returnedQty,
            availableQty,
          };
        })
        .filter((item: any) => item.effectiveMaxQty > 0);

      const isAllSelected =
        availableItems.length > 0 &&
        availableItems.every((i: any) => selectedItems.has(i.saleItemId));

      const calculateRefund = Array.from(selectedItems.entries()).reduce((sum, [id, qty]) => {
        const item = availableItems.find((i: any) => i.saleItemId === id);
        if (!item) return sum;
        return (sum as number) + (qty as number) * (item.publicPrice as number);
      }, 0);

      const toggleItemSelection = (id: string, maxQty: number) => {
        setSelectedItems((prev) => {
          const next = new Map(prev);
          if (next.has(id)) next.delete(id);
          else next.set(id, maxQty);
          return next;
        });
      };

      const updateItemQuantity = (id: string, quantity: number) => {
        setSelectedItems((prev) => {
          const next = new Map(prev);
          if (quantity > 0) next.set(id, quantity);
          else next.delete(id);
          return next;
        });
      };

      const toggleUnitMode = (id: string, currentMaxQty: number, unitsPerPack: number) => {
        setItemUnitModes((prev) => {
          const next = new Map(prev);
          next.set(id, !(next.get(id) ?? false));
          return next;
        });
        setSelectedItems((prev) => {
          const next = new Map(prev);
          const currentQty = next.get(id) ?? 0;
          if ((currentQty as number) > 0) {
            const currentMode = itemUnitModes.get(id) ?? false;
            const newMode = !currentMode;
            const convertedQty = newMode
              ? (currentQty as number) * unitsPerPack
              : Math.max(1, Math.floor((currentQty as number) / unitsPerPack));
            const availableInNewMode = newMode
              ? currentMaxQty * unitsPerPack
              : Math.max(1, Math.floor(currentMaxQty / unitsPerPack));
            next.set(id, Math.min(convertedQty, availableInNewMode));
          }
          return next;
        });
      };

      const selectAll = () => {
        const next = new Map<string, number>();
        availableItems.forEach((i: any) => next.set(i.saleItemId, i.effectiveMaxQty));
        setSelectedItems(next);
      };

      const deselectAll = () => setSelectedItems(new Map());

      const buildReturnPayload = () => {
        const returnItems: any[] = [];
        (sale?.items || []).forEach((item: any) => {
          const saleItemId = item.saleItemId ?? item.id;
          const selectedQty = selectedItems.get(saleItemId);
          if (selectedQty != null && selectedQty > 0) {
            const toggledMode = itemUnitModes.get(saleItemId) ?? false;
            const isUnit = item.isUnit ?? false;
            returnItems.push({
              drugId: item.drugId ?? item.drug_id,
              saleItemId,
              quantityReturned: selectedQty,
              isUnit: toggledMode ? !isUnit : isUnit,
              condition: 'sellable',
            });
          }
        });
        return {
          saleId: sale.id,
          returnType: isAllSelected
            ? returnItems.some((i) => i.isUnit)
              ? 'unit'
              : 'full'
            : returnItems.some((i) => i.isUnit)
              ? 'unit'
              : 'partial',
          items: returnItems,
          reason: returnReason,
          notes: returnNotes,
        };
      };

      const validateReturn = () => true;

      const reset = () => {
        setStep(1);
        setSelectedItems(new Map());
        setItemUnitModes(new Map());
        setReturnReason('customer_request');
        setReturnNotes('');
        setValidationError(null);
      };

      return {
        step,
        setStep,
        isProcessing,
        setIsProcessing,
        selectedItems,
        itemUnitModes,
        returnReason,
        setReturnReason,
        returnNotes,
        setReturnNotes,
        validationError,
        setValidationError,
        availableItems,
        toggleItemSelection,
        updateItemQuantity,
        toggleUnitMode,
        selectAll,
        deselectAll,
        isAllSelected,
        calculateRefund,
        validateReturn,
        buildReturnPayload,
        reset,
      };
    },
  };
});

vi.mock('../common/Modal', () => ({
  Modal: ({ children, title, subtitle, footer, disabled }: any) => (
    <div data-testid='modal' data-disabled={disabled ? 'true' : 'false'}>
      <h2>{title}</h2>
      <div>{subtitle}</div>
      {children}
      {footer}
    </div>
  ),
}));

vi.mock('../common/MaterialTabs', () => ({
  MaterialTabs: ({ children, onClick, isSelected, className }: any) => (
    <div
      role='button'
      data-selected={isSelected ? 'true' : 'false'}
      onClick={onClick}
      className={className}
    >
      {children}
    </div>
  ),
}));

vi.mock('../common/FilterDropdown', () => ({
  FilterDropdown: ({ items, selectedItem, onSelect }: any) => (
    <div data-testid='reason-dropdown'>
      <span>{selectedItem?.label || 'Select Reason'}</span>
      {items.map((it: any) => (
        <button key={it.id} type='button' onClick={() => onSelect(it)}>
          {it.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../common/SmartInputs', () => ({
  useSmartDirection: () => 'ltr',
}));

vi.mock('../../utils/drugDisplayName', () => ({
  getDisplayName: ({ name, dosageForm }: any) =>
    `${name}${dosageForm ? ` ${dosageForm}` : ''}`,
}));

const saleFixture = (overrides?: Partial<Sale>): Sale =>
  ({
    id: 'sale-1',
    branchId: 'B1',
    date: '2024-01-05T10:00:00Z',
    total: 300,
    netTotal: 300,
    paymentMethod: 'cash',
    status: 'completed',
    items: [
      {
        id: 'si-1',
        saleItemId: 'si-1',
        drugId: 'drug-1',
        name: 'Panadol',
        dosageForm: 'Tablet',
        quantity: 2,
        publicPrice: 100,
        discount: 0,
        isUnit: false,
        unitsPerPack: 10,
      },
      {
        id: 'si-2',
        saleItemId: 'si-2',
        drugId: 'drug-2',
        name: 'Vitamin C',
        dosageForm: 'Syrup',
        quantity: 3,
        publicPrice: 20,
        discount: 0,
        isUnit: false,
        unitsPerPack: 1,
      },
    ] as any,
    ...overrides,
  }) as Sale;

const mockT = {
  returns: {
    processReturn: 'Process Return',
    step2: 'Step 2: Select Items',
    step3: 'Step 3: Reason & Notes',
    step4: 'Step 4: Review & Confirm',
    selectItems: 'Select Items to Return',
    itemsSelected: 'items selected',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    noItemsAvailable: 'All items have been returned',
    returnReason: 'Return Reason',
    reasons: {
      customer_request: 'Customer Request',
      wrong_item: 'Wrong Item',
      damaged: 'Damaged',
      expired: 'Expired',
      defective: 'Defective',
      other: 'Other',
    },
    notes: 'Additional Notes',
    refundAmount: 'Refund Amount',
    confirmReturn: 'Confirm Return',
    next: 'Next',
    back: 'Back',
    itemsToReturn: 'Items to Return',
    reviewReturn: 'Review Return',
    item: 'item',
    items: 'items',
    pack: 'pack',
    packs: 'packs',
    unit: 'unit',
    units: 'units',
    quantity: 'Quantity',
    switchToUnit: 'Switch to Unit',
    switchToPack: 'Switch to Pack',
  },
  modal: { qty: 'Qty' },
  common: { processing: 'Processing...' },
  errors: { unexpected: 'An unexpected error occurred. Please try again.' },
};

function renderModal(overrides?: {
  isOpen?: boolean;
  sale?: Sale;
  onClose?: () => void;
  onConfirm?: () => Promise<boolean>;
  language?: string;
  currentShift?: any;
}) {
  const { isOpen = true, sale = saleFixture(), language = 'EN', currentShift = null } = overrides ?? {};
  const onClose = overrides?.onClose ? vi.fn(overrides.onClose) : vi.fn();
  const onConfirm = overrides?.onConfirm
    ? vi.fn(overrides.onConfirm)
    : vi.fn(() => Promise.resolve(true));
  render(
    <ReturnModal
      isOpen={isOpen}
      sale={sale}
      onClose={onClose}
      onConfirm={onConfirm}
      color='indigo'
      t={mockT as any}
      language={language}
      currentDailyRefunds={0}
      currentShift={currentShift}
    />
  );
  return { onClose, onConfirm };
}

describe('ReturnModal — step 1: item selection', () => {
it('renders sale items available for return with name, max qty and price', () => {
    renderModal();

    expect(screen.getByText('Panadol Tablet')).toBeInTheDocument();
    expect(screen.getByText('Vitamin C Syrup')).toBeInTheDocument();
    expect(screen.getByText('Qty: 2')).toBeInTheDocument();
    expect(screen.getByText('Qty: 3')).toBeInTheDocument();
    expect(screen.getByText(/100\.00/)).toBeInTheDocument();
    expect(screen.getByText(/20\.00/)).toBeInTheDocument();
  });

  it('shows the selected-item counter and disables Next until an item is selected', () => {
    renderModal();

    expect(screen.getByText(/0 items selected/)).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeDisabled();

    fireEvent.click(screen.getByText('Panadol Tablet'));

    expect(screen.getByText(/1 items selected/)).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeEnabled();
  });

  it('toggles an item off when clicked again', () => {
    renderModal();

    fireEvent.click(screen.getByText('Panadol Tablet'));
    fireEvent.click(screen.getByText('Panadol Tablet'));

    expect(screen.getByText(/0 items selected/)).toBeInTheDocument();
  });

  it('selects all then deselects all', () => {
    renderModal();

    fireEvent.click(screen.getByText('Select All'));

    expect(screen.getByText(/2 items selected/)).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Deselect All'));

    expect(screen.getByText(/0 items selected/)).toBeInTheDocument();
    expect(screen.getByText('Select All')).toBeInTheDocument();
  });

  it('changes the returned quantity with the + / - steppers and the input', () => {
    renderModal();

    fireEvent.click(screen.getByText('Panadol Tablet'));

    const qtyInput = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(qtyInput.value).toBe('2');

    // decrement (the real UI uses icon buttons without a title attribute)
    fireEvent.click(screen.getByText('remove').closest('button')!);
    expect(qtyInput.value).toBe('1');

    // direct input change
    fireEvent.change(qtyInput, { target: { value: '2' } });
    expect(qtyInput.value).toBe('2');
  });

  it('toggles a pack item to unit mode and converts the selected quantity', () => {
    renderModal();

    fireEvent.click(screen.getByText('Panadol Tablet'));
    expect(screen.getByTitle('Switch to Unit')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Switch to Unit'));

    // Now in unit mode: max qty becomes 2 packs × 10 units = 20 units
    expect(screen.getByText('Qty: 20')).toBeInTheDocument();
    expect(screen.getByTitle('Switch to Pack')).toBeInTheDocument();

    const qtyInput = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(qtyInput.value).toBe('20');

    fireEvent.click(screen.getByTitle('Switch to Pack'));
    expect(screen.getByText('Qty: 2')).toBeInTheDocument();
  });
});

describe('ReturnModal — 3-step flow', () => {
  it('advances to step 2 (reason) then step 3 (review)', async () => {
    renderModal();

    fireEvent.click(screen.getByText('Panadol Tablet'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Return Reason')).toBeInTheDocument(); // step 2
    expect(screen.getByText('Next')).toBeEnabled();

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Review Return')).toBeInTheDocument(); // step 3
    expect(screen.getByText('Confirm Return')).toBeInTheDocument();
  });

  it('goes back from step 2 to step 1', async () => {
    renderModal();

    fireEvent.click(screen.getByText('Panadol Tablet'));
    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText('Return Reason')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Back'));
    expect(screen.getByText('Select Items to Return')).toBeInTheDocument();
  });
});

describe('ReturnModal — step 2: reason & notes', () => {
  it('renders all six reason options', async () => {
    renderModal();

    fireEvent.click(screen.getByText('Panadol Tablet'));
    fireEvent.click(screen.getByText('Next'));

    for (const label of ['Customer Request', 'Wrong Item', 'Damaged', 'Expired', 'Defective', 'Other']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('captures the selected reason and notes and reflects them on review', async () => {
    renderModal();

    fireEvent.click(screen.getByText('Panadol Tablet'));
    fireEvent.click(screen.getByText('Next'));

    fireEvent.click(screen.getByText('Damaged'));
    fireEvent.change(screen.getByPlaceholderText('Additional Notes'), {
      target: { value: 'Opened box' },
    });

    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText('Review Return')).toBeInTheDocument();
    expect(screen.getByText('Damaged')).toBeInTheDocument();
  });
});

describe('ReturnModal — step 3: review & confirm', () => {
  it('displays the computed refund total', async () => {
    renderModal();

    fireEvent.click(screen.getByText('Panadol Tablet'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    // 2 × 100.00 = 200.00 refund for the mocked logic
    expect(screen.getByText(/200\.00/)).toBeInTheDocument();
  });

  it('lists the selected items with quantity unit labels on review', async () => {
    renderModal();

    fireEvent.click(screen.getByText('Panadol Tablet'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText('2 packs')).toBeInTheDocument();
  });

  it('calls onConfirm with the built ProcessReturnPayload and closes on success', async () => {
    const { onClose, onConfirm } = renderModal({
      onConfirm: () => Promise.resolve(true),
    });

    fireEvent.click(screen.getByText('Panadol Tablet'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => fireEvent.click(screen.getByText('Confirm Return')));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        saleId: 'sale-1',
        returnType: 'partial',
        items: [
          {
            drugId: 'drug-1',
            saleItemId: 'si-1',
            quantityReturned: 2,
            isUnit: false,
            condition: 'sellable',
          },
        ],
        reason: 'customer_request',
        notes: '',
      });
    });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('CURRENT BEHAVIOR (verify intent): does NOT close when onConfirm resolves false', async () => {
    // INTENT-UNKNOWN: the modal stays open when the confirm handler rejects (returns false),
    // but the UI does not surface any inline error on step 3 in that case.
    // May be intentional (allow the caller to show its own toast) or a UX gap. Flag for review.
    const { onClose, onConfirm } = renderModal({
      onConfirm: () => Promise.resolve(false),
    });

    fireEvent.click(screen.getByText('Panadol Tablet'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    fireEvent.click(screen.getByText('Confirm Return'));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sends the selected reason and notes in the built payload', async () => {
    const { onConfirm } = renderModal({
      onConfirm: () => Promise.resolve(true),
    });

    fireEvent.click(screen.getByText('Panadol Tablet'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Damaged'));
    fireEvent.change(screen.getByPlaceholderText('Additional Notes'), {
      target: { value: 'Damaged box' },
    });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Confirm Return'));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'damaged', notes: 'Damaged box' })
    );
  });
});