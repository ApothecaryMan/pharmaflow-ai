import { createColumnHelper } from '@tanstack/react-table';
import React, { useCallback, useMemo, useState } from 'react';
import { batchService } from '../../../services/inventory/batchService';
import {
  type CartItem,
  type Customer,
  type Drug,
  type Employee,
  type Language,
  OrderModificationRecord,
  type Sale,
} from '../../../types';
import { useAlert, useSettings } from '../../../context';
import { formatCurrency, money, pricing } from '../../../utils/currency';
import { getDisplayName } from '../../../utils/drugDisplayName';
import { FilterDropdown } from '../../common/FilterDropdown';
import { SmartInput, SmartTextarea } from '../../common/SmartInputs';
import { MaterialTabs } from '../../common/MaterialTabs';
import { Modal } from '../../common/Modal';
import { SearchInput } from '../../common/SearchInput';
import { SegmentedControl } from '../../common/SegmentedControl';
import { TanStackTable } from '../../common/TanStackTable';
import { useContextMenu } from '../../common/ContextMenu';
import { getActiveReceiptSettings, printInvoice } from '../InvoiceTemplate';
import { InsightTooltip } from '../../common/InsightTooltip';
import { Tooltip } from '../../common/Tooltip';
import { isToday, isAfter, subHours, parseISO } from 'date-fns';
import { pricingService } from '../../../services/sales/pricingService';
import * as stockOps from '../../../utils/stockOperations';
import { idGenerator } from '../../../utils/idGenerator';
import { useShift } from '../../../hooks/sales/useShift';
import { resolvePrice } from '../../../utils/stockOperations';

const ShiftWarning = ({ t, compact = false }: { t: any; compact?: boolean }) => (
  <div className={`flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 ${compact ? 'h-7 px-2 w-full' : 'h-[42px] px-4'}`}>
    <div className='flex items-center gap-1.5 text-red-700 dark:text-red-300'>
      <span className='material-symbols-rounded' style={{ fontSize: compact ? '16px' : '18px' }}>
        warning
      </span>
      <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold`}>
        {t.pleaseOpenShiftToStart || 'برجاء فتح الدرج للبدء'}
      </p>
    </div>
  </div>
);

const DriverSelect = ({
  driverId,
  drivers,
  onSelect,
  t,
  disabled = false,
}: {
  driverId?: string;
  drivers: Employee[];
  onSelect: (d: Employee) => void;
  t: any;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = drivers.find((d) => d.id === driverId);

  return (
    <div className='relative w-full h-8'>
      <FilterDropdown
        items={drivers}
        selectedItem={selected}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        onSelect={(d) => {
          onSelect(d);
          setIsOpen(false);
        }}
        renderItem={(d) => <div className='p-1.5 font-medium'>{d.name}</div>}
        renderSelected={(d) => (
          <div className='px-1 font-bold whitespace-nowrap overflow-hidden text-ellipsis'>
            {d ? d.name : t.selectDriver || 'Select Driver'}
          </div>
        )}
        keyExtractor={(d) => d.id}
        className='absolute top-0 left-0 w-full'
        zIndexHigh='z-200'
        color='blue'
        variant='input'
        disabled={disabled}
        dense={true}
      />
    </div>
  );
};

export type DeliveryTab = 'all' | 'pending' | 'active' | 'completed';

export interface DeliveryOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  employees: Employee[];
  inventory: Drug[];
  onUpdateSale: (saleId: string, updates: Partial<Sale>) => void;
  language?: Language;
  t: any;
  color?: string;
  currentEmployeeId?: string;
  customers?: Customer[];
  onViewCustomerHistory?: (customer: Customer) => void;
  activeBranchId?: string;
}

// Pending item change type
interface PendingItemChange {
  id: string; // drugId
  isUnit: boolean;
  originalQuantity: number;
  newQuantity: number;
  deleted: boolean;
}

interface PendingDiscountChange {
  id: string; // drugId
  originalDiscount: number;
  newDiscount: number;
}

export const DeliveryOrdersModal: React.FC<DeliveryOrdersModalProps> = ({
  isOpen,
  onClose,
  sales,
  employees,
  inventory,
  onUpdateSale,
  language,
  t,
  currentEmployeeId,
  customers = [],
  onViewCustomerHistory,
  activeBranchId,
}) => {
  const { currentShift } = useShift();
  const hasOpenShift = !!currentShift;
  const [activeTab, setActiveTab] = useState<DeliveryTab>('all');
  const { error: showToastError } = useAlert();
  const { textTransform, language: settingsLanguage } = useSettings();
  const currentLanguage = language || settingsLanguage;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Edit mode state - Unified history stack
  const [isEditMode, setIsEditMode] = useState(false);
  const [editHistory, setEditHistory] = useState<{
    stack: Array<{
      changes: Map<string, PendingItemChange>;
      discounts: Map<string, PendingDiscountChange>;
    }>;
    index: number;
  }>({
    stack: [{ changes: new Map(), discounts: new Map() }],
    index: 0,
  });

  const { changes: pendingChanges, discounts: pendingDiscountChanges } =
    editHistory.stack[editHistory.index];

  const pushState = useCallback(
    (modifier: (current: {
      changes: Map<string, PendingItemChange>;
      discounts: Map<string, PendingDiscountChange>;
    }) => {
      changes: Map<string, PendingItemChange>;
      discounts: Map<string, PendingDiscountChange>;
    }) => {
      setEditHistory((prev) => {
        const current = prev.stack[prev.index];
        const next = modifier(current);
        const newStack = prev.stack.slice(0, prev.index + 1);
        return {
          stack: [
            ...newStack,
            { changes: new Map(next.changes), discounts: new Map(next.discounts) },
          ],
          index: newStack.length,
        };
      });
    },
    []
  );

  const undo = useCallback(() => {
    setEditHistory((prev) => ({
      ...prev,
      index: Math.max(0, prev.index - 1),
    }));
  }, []);

  const redo = useCallback(() => {
    setEditHistory((prev) => ({
      ...prev,
      index: Math.min(prev.stack.length - 1, prev.index + 1),
    }));
  }, []);
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'history'>('items'); // Replaces showHistory toggle
  const [expandedHistoryRecordId, setExpandedHistoryRecordId] = useState<string | null>(null);
  const [orderToCancelId, setOrderToCancelId] = useState<string | null>(null);
  const [orderToEditGuestId, setOrderToEditGuestId] = useState<string | null>(null);
  const [tempGuestName, setTempGuestName] = useState('');
  const [tempGuestAddress, setTempGuestAddress] = useState('');
  const [originalGuestInfo, setOriginalGuestInfo] = useState<{ name: string; address: string } | null>(null);

  const selectedSale = useMemo(() => {
    return sales.find((s) => s.id === selectedSaleId);
  }, [sales, selectedSaleId]);

  // Calculate Pending Value Insights
  const pendingStats = useMemo(() => {
    const pendingSales = sales.filter((s) => 
      s.status === 'pending' && 
      s.saleType === 'delivery' &&
      (!activeBranchId || s.branchId === activeBranchId)
    );
    const now = new Date();
    const twentyFourHoursAgo = subHours(now, 24);

    const stats = {
      total: 0,
      today: { value: 0, count: 0 },
      last24h: { value: 0, count: 0 },
      older: { value: 0, count: 0 },
    };

    pendingSales.forEach((s) => {
      const saleDate = parseISO(s.date);
      stats.total = money.add(stats.total, s.total);

      if (isToday(saleDate)) {
        stats.today.value = money.add(stats.today.value, s.total);
        stats.today.count += 1;
      }

      if (isAfter(saleDate, twentyFourHoursAgo)) {
        stats.last24h.value = money.add(stats.last24h.value, s.total);
        stats.last24h.count += 1;
      } else {
        stats.older.value = money.add(stats.older.value, s.total);
        stats.older.count += 1;
      }
    });

    return stats;
  }, [sales, activeBranchId]);

  // Reset to table view when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedSaleId(null);
      setIsEditMode(false);
      setEditHistory({
        stack: [{ changes: new Map(), discounts: new Map() }],
        index: 0,
      });
      setOrderToEditGuestId(null);
    }
  }, [isOpen]);

  // Handle guest info save
  const handleSaveGuestInfo = useCallback(() => {
    if (orderToEditGuestId) {
      onUpdateSale(orderToEditGuestId, {
        customerName: tempGuestName || t.guestCustomer || 'Guest Customer',
        customerStreetAddress: tempGuestAddress,
        isTemporaryInfo: true, // Special flag for visual marking
      } as any);
      setOrderToEditGuestId(null);
    }
  }, [orderToEditGuestId, tempGuestName, tempGuestAddress, onUpdateSale, t.guestCustomer]);

  // Check if order can be edited (only pending/active, not completed)
  const canEdit = useMemo(() => {
    return (
      selectedSale &&
      selectedSale.status !== 'completed' &&
      selectedSale.status !== 'cancelled' &&
      !selectedSale.hasReturns && // Prevent conflicting edits if part of the order was returned
      !!currentEmployeeId &&
      hasOpenShift
    ); // Must be logged in and shift open
  }, [selectedSale, currentEmployeeId, hasOpenShift]);

  const { showMenu } = useContextMenu();

  const handleRowContextMenu = useCallback((e: React.MouseEvent, sale: Sale) => {
    e.preventDefault();
    showMenu(e.clientX, e.clientY, [
      {
        label: t.printReceipt || 'Print Receipt',
        icon: 'print',
        action: () => {
          const opts = getActiveReceiptSettings();
          printInvoice(sale, opts);
        },
      },
      {
        label: t.editOrder || 'Edit Order',
        icon: 'edit',
        action: () => {
          setSelectedSaleId(sale.id);
          setIsEditMode(true);
        },
        disabled: sale.status === 'completed' || sale.status === 'cancelled' || !hasOpenShift,
      },
    ]);
  }, [showMenu, t.printReceipt, t.editOrder, setSelectedSaleId, setIsEditMode]);

  // Get current quantity for an item (considering pending changes)
  const getItemQuantity = useCallback(
    (itemId: string, isUnit: boolean, originalQty: number): number => {
      const key = `${itemId}-${isUnit ? 'unit' : 'pack'}`;
      const change = pendingChanges.get(key);
      if (change) {
        return change.deleted ? 0 : change.newQuantity;
      }
      return originalQty;
    },
    [pendingChanges]
  );

  // Handle quantity change with robust stock validation (Exact logic from POS Cart)
  const handleQuantityChange = useCallback(
    (item: CartItem, isUnit: boolean, delta: number) => {
      const drug = inventory.find((d) => d.id === item.id);
      if (!drug) return;

      const unitsPerPack = drug.unitsPerPack || 1;

      // 1. Determine Current Pending State (Before this change)
      // We need the OTHER component's quantity to calculate total usage
      // Access the original sale items to find the pair
      const saleItems = selectedSale?.items.filter((i) => i.id === item.id) || [];
      const originalPackItem = saleItems.find((i) => !i.isUnit);
      const originalUnitItem = saleItems.find((i) => i.isUnit);

      const originalPackQty = originalPackItem?.quantity || 0;
      const originalUnitQty = originalUnitItem?.quantity || 0;

      const currentPendingPackQty = getItemQuantity(item.id, false, originalPackQty);
      const currentPendingUnitQty = getItemQuantity(item.id, true, originalUnitQty);

      // 2. Calculate New Proposed Quantity for the target component
      const currentTargetQty = isUnit ? currentPendingUnitQty : currentPendingPackQty;
      const proposedQty = Math.max(0, currentTargetQty + delta); // Prevent negative

      // 3. Calculate Limits (Total Units)
      // drug.stock is typically stored as Total Units in the system (based on POS analysis)
      // Available Limit = Actual Stock in Inventory + What we already own in this Order
      const totalOriginalUnitsOwned = stockOps.resolveUnits(originalPackQty, false, unitsPerPack) + 
                                     stockOps.resolveUnits(originalUnitQty, true, unitsPerPack);
      const maxUnitsAvailable = drug.stock + totalOriginalUnitsOwned;

      // 4. Calculate Proposed Total Usage
      const proposedPackQty = isUnit ? currentPendingPackQty : proposedQty;
      const proposedUnitQty = isUnit ? proposedQty : currentPendingUnitQty;
      const proposedTotalUnits = stockOps.resolveUnits(proposedPackQty, false, unitsPerPack) + 
                                stockOps.resolveUnits(proposedUnitQty, true, unitsPerPack);

      // 5. Validation & Clamping
      let finalQty = proposedQty;

      if (proposedTotalUnits > maxUnitsAvailable) {
        // Clamp to max available
        if (isUnit) {
          // If changing Unit: Max Unit = MaxAvailable - (Pack * UPP)
          const maxUnit = maxUnitsAvailable - proposedPackQty * unitsPerPack;
          finalQty = Math.max(0, maxUnit);
        } else {
          // If changing Pack: Max Pack = floor((MaxAvailable - Unit) / UPP)
          const maxPack = Math.floor((maxUnitsAvailable - proposedUnitQty) / unitsPerPack);
          finalQty = Math.max(0, maxPack);
        }
      }

      // 6. Apply Change
      const key = `${item.id}-${isUnit ? 'unit' : 'pack'}`;
      const originalQtyForThisType = isUnit ? originalUnitQty : originalPackQty;

      pushState((current) => {
        const nextChanges = new Map(current.changes);
        if (finalQty === originalQtyForThisType) {
          nextChanges.delete(key); // Reverted to original
        } else {
          nextChanges.set(key, {
            id: item.id,
            isUnit,
            originalQuantity: originalQtyForThisType,
            newQuantity: finalQty,
            deleted: finalQty === 0,
          });
        }
        return { changes: nextChanges, discounts: current.discounts };
      });
    },
    [inventory, selectedSale, getItemQuantity, pushState]
  );

  // Check if we can increase quantity (Used for + button disable state)
  const canIncreaseQuantity = useCallback(
    (itemId: string, isUnit: boolean): boolean => {
      // We can simulate a +1 change and see if it passes validation
      // Or just check strictly against stock.
      const drug = inventory.find((d) => d.id === itemId);
      if (!drug) return false;

      // We need to access the LATEST pending state to know if we are at limit
      const saleItems = selectedSale?.items.filter((i) => i.id === itemId) || [];
      const originalPackItem = saleItems.find((i) => !i.isUnit);
      const originalUnitItem = saleItems.find((i) => i.isUnit);

      const originalPackQty = originalPackItem?.quantity || 0;
      const originalUnitQty = originalUnitItem?.quantity || 0;

      const currentPackQty = getItemQuantity(itemId, false, originalPackQty);
      const currentUnitQty = getItemQuantity(itemId, true, originalUnitQty);

      const unitsPerPack = drug.unitsPerPack || 1;
      const totalOriginalUnitsOwned = originalPackQty * unitsPerPack + originalUnitQty;
      const maxUnitsAvailable = drug.stock + totalOriginalUnitsOwned; // This includes current stock + what we hold

      // Current usage
      const currentUsageUnits = currentPackQty * unitsPerPack + currentUnitQty;

      // Cost of adding 1
      const cost = isUnit ? 1 : unitsPerPack;

      return currentUsageUnits + cost <= maxUnitsAvailable;
    },
    [inventory, selectedSale, getItemQuantity]
  );

  // Handle delete both pack and unit for an item
  const handleDeleteFullItem = useCallback(
    (drugId: string, packItem?: CartItem, unitItem?: CartItem) => {
      pushState((current) => {
        const nextChanges = new Map(current.changes);
        if (packItem) {
          nextChanges.set(`${drugId}-pack`, {
            id: drugId,
            isUnit: false,
            originalQuantity: packItem.quantity,
            newQuantity: 0,
            deleted: true,
          });
        }
        if (unitItem) {
          nextChanges.set(`${drugId}-unit`, {
            id: drugId,
            isUnit: true,
            originalQuantity: unitItem.quantity,
            newQuantity: 0,
            deleted: true,
          });
        }
        return { changes: nextChanges, discounts: current.discounts };
      });
    },
    [pushState]
  );

  // Handle restore item (undo delete)
  const handleRestoreFullItem = useCallback(
    (drugId: string) => {
      pushState((current) => {
        const nextChanges = new Map(current.changes);
        nextChanges.delete(`${drugId}-pack`);
        nextChanges.delete(`${drugId}-unit`);
        return { changes: nextChanges, discounts: current.discounts };
      });
    },
    [pushState]
  );

  // Handle discount change for an item
  const handleDiscountChange = useCallback(
    (drugId: string, newDiscount: number) => {
      const saleItems = selectedSale?.items.filter((i) => i.id === drugId) || [];
      const originalDiscount = saleItems[0]?.discount || 0;

      pushState((current) => {
        const nextDiscounts = new Map(current.discounts);
        if (newDiscount === originalDiscount) {
          nextDiscounts.delete(drugId);
        } else {
          nextDiscounts.set(drugId, {
            id: drugId,
            originalDiscount,
            newDiscount: Math.min(100, Math.max(0, newDiscount)),
          });
        }
        return { changes: current.changes, discounts: nextDiscounts };
      });
    },
    [selectedSale, pushState]
  );

  // Get current discount for an item (considering pending changes)
  const getItemDiscount = useCallback(
    (drugId: string, originalDiscount: number): number => {
      const change = pendingDiscountChanges.get(drugId);
      return change ? change.newDiscount : originalDiscount;
    },
    [pendingDiscountChanges]
  );

  // Check if there are pending changes
  const hasChanges = useMemo(
    () => pendingChanges.size > 0 || pendingDiscountChanges.size > 0,
    [pendingChanges, pendingDiscountChanges]
  );

  // Handle save changes
  const handleSaveChanges = useCallback(() => {
    if (!selectedSale || !hasChanges) return;

    try {
      // Build updated items array
      const updatedItems: CartItem[] = [];

      const processedKeys = new Set<string>();

      // Pass 1: Handle updates to existing items
      for (const item of selectedSale.items) {
        const key = `${item.id}-${item.isUnit ? 'unit' : 'pack'}`;
        processedKeys.add(key);
        const change = pendingChanges.get(key);
        const discountChange = pendingDiscountChanges.get(item.id);

        if (change) {
          if (change.deleted || change.newQuantity <= 0) {
            continue; // Exclude deleted/zero items
          }
          updatedItems.push({
            ...item,
            quantity: change.newQuantity,
            discount: discountChange ? discountChange.newDiscount : item.discount,
          });
        } else {
          updatedItems.push({
            ...item,
            discount: discountChange ? discountChange.newDiscount : item.discount,
          });
        }
      }

      // Pass 2: Handle NEW items (e.g. adding Pack to a Unit-only item)
      for (const [key, change] of pendingChanges.entries()) {
        if (processedKeys.has(key)) continue;
        if (change.deleted || change.newQuantity <= 0) continue;

        // Find a sibling item to clone common props from
        const sibling = selectedSale.items.find((i) => i.id === change.id);
        if (sibling) {
          // Use getItemDiscount to get the potentially modified discount
          const discountToApply = getItemDiscount(change.id, sibling.discount || 0);
          updatedItems.push({
            ...sibling,
            isUnit: change.isUnit,
            quantity: change.newQuantity,
            discount: discountToApply,
            // Clear batchAllocations - handleUpdateSale will allocate new stock
            batchAllocations: undefined,
          });
        }
      }

      // Step 1: Calculate totals using unified pricing service
      const totals = pricingService.calculateOrderTotals(updatedItems, selectedSale.globalDiscount || 0);
      
      const subtotal = totals.netSubtotal;
      const finalTotal = money.add(totals.finalTotal, selectedSale.deliveryFee || 0);

      // Step 4: Generate Modifications for History
      const modifications: any[] = [];
      const currentEmployee = employees.find((e) => e.id === currentEmployeeId);

      // Add Quantity changes
      for (const [key, change] of pendingChanges.entries()) {
        const [drugId, type] = key.split('-');
        const isUnit = type === 'unit';
        const originalItem = selectedSale.items.find(
          (i) => i.id === drugId && !!i.isUnit === isUnit
        );
        const drug = inventory.find((d) => d.id === drugId);

        modifications.push({
          type: change.deleted ? 'item_removed' : originalItem ? 'quantity_update' : 'item_added',
          itemId: drugId,
          itemName: originalItem?.name || drug?.name || 'Unknown Product',
          dosageForm: originalItem?.dosageForm || drug?.dosageForm,
          previousQuantity: originalItem?.quantity || 0,
          newQuantity: change.newQuantity,
        });
      }

      // Add Discount changes
      for (const [drugId, change] of pendingDiscountChanges.entries()) {
        const drug = inventory.find((d) => d.id === drugId);
        const anyItem = selectedSale.items.find((i) => i.id === drugId);

        modifications.push({
          type: 'discount_update',
          itemId: drugId,
          itemName: anyItem?.name || drug?.name || 'Unknown Product',
          dosageForm: anyItem?.dosageForm || drug?.dosageForm,
          previousDiscount: change.originalDiscount,
          newDiscount: change.newDiscount,
        });
      }

      const newRecord = {
        id: idGenerator.uuid(),
        timestamp: new Date().toISOString(),
        modifiedBy: currentEmployee?.name || t.system || 'System',
        modifications,
      };

      onUpdateSale(selectedSale.id, {
        items: updatedItems,
        subtotal: subtotal,
        total: finalTotal,
        modificationHistory: [...(selectedSale.modificationHistory || []), newRecord],
      });

      // Reset edit state only after successful update
      setEditHistory({
        stack: [{ changes: new Map(), discounts: new Map() }],
        index: 0,
      });
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save delivery order changes:', error);
    }
  }, [
    selectedSale,
    hasChanges,
    pendingChanges,
    pendingDiscountChanges,
    onUpdateSale,
    getItemDiscount,
    employees,
    currentEmployeeId,
    inventory,
    t,
  ]);

  // Handle discard changes
  const handleDiscardChanges = useCallback(() => {
    setEditHistory({
      stack: [{ changes: new Map(), discounts: new Map() }],
      index: 0,
    });
    setIsEditMode(false);
  }, []);

  // Filter sales based on active tab
  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => {
        if (s.saleType !== 'delivery') return false;
        
        // Branch Filter (Multi-tenant isolation)
        if (activeBranchId && s.branchId !== activeBranchId) return false;

        if (activeTab === 'all') {
          // Show only active orders (pending + in-transit), exclude history
          return s.status !== 'completed' && s.status !== 'cancelled';
        }
        if (activeTab === 'pending') {
          return s.status === 'pending';
        }
        if (activeTab === 'active') {
          return s.status === 'with_delivery' || s.status === 'on_way';
        }
        if (activeTab === 'completed') {
          return s.status === 'completed' || s.status === 'cancelled';
        }
        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, activeTab, activeBranchId]);

  const deliveryDrivers = useMemo(() => {
    return employees.filter((e) => e.role === 'delivery');
  }, [employees]);

  const columnHelper = createColumnHelper<Sale>();

  const columns = useMemo(
    () => [
      // Order Serial ID (Order Number)
      columnHelper.accessor('serialId', {
        header: t.orderId || 'Order #',
        size: 90,
        meta: { align: 'start' },
        cell: (info) => (
          <span className='font-mono font-bold text-sm text-gray-900 dark:text-gray-100'>
            {info.getValue() || info.row.original.id.slice(0, 8)}
          </span>
        ),
      }),
      // Time and Date
      columnHelper.accessor('date', {
        header: t.time || 'Time',
        size: 120,
        meta: { align: 'center' },
        cell: (info) => (
          <span className='text-sm text-gray-700 dark:text-gray-300'>
            {info.getValue() as string}
          </span>
        ),
      }),
      // Customer Code
      columnHelper.accessor('customerCode', {
        header: t.customerCode || 'Client ID',
        size: 100,
        meta: { align: 'center' },
        cell: (info) => {
          const code = info.getValue() as string;
          // Robust lookup: check both custom code and system serial ID
          const customer = customers.find(c => c.code === code || c.serialId === code);
          const isClickable = !!customer && !!onViewCustomerHistory;

          return (
            <span 
              onClick={(e) => {
                if (isClickable) {
                  e.stopPropagation();
                  onViewCustomerHistory(customer);
                }
              }}
              className={`font-mono font-bold text-sm select-none ${
                isClickable 
                  ? 'text-primary-600 dark:text-primary-400 cursor-pointer hover:underline decoration-primary-300 dark:decoration-primary-700 underline-offset-2 transition-all active:scale-95' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}
              title={isClickable ? t.viewCustomerHistory || 'View Customer History' : undefined}
            >
              {code || '-'}
            </span>
          );
        },
      }),
      // Customer name
      columnHelper.accessor('customerName', {
        header: t.customer || 'Customer',
        size: 220,
        meta: { flex: true, align: 'start', dir: 'rtl' },
        cell: (info) => {
          const s = info.row.original;
          const name = info.getValue();
          const isGuest = !s.customerCode || s.customerCode === '-';
          const hasTempInfo = (s as any).isTemporaryInfo;
          // Support both English and Arabic identifiers for Guest Customer
          const isGuestName = name === 'Guest Customer' || name === 'عميل غير مسجل' || name === t.guestCustomer;
          const displayName = isGuestName ? t.guestCustomer || name : name;
          
          return (
            <div className='flex items-center gap-1 group'>
              <span className='font-bold text-gray-900 dark:text-gray-100' dir='auto'>
                {displayName}
              </span>
              {isGuest && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOrderToEditGuestId(s.id);
                    const isGenericGuest = s.customerName === 'Guest Customer' || s.customerName === 'عميل غير مسجل' || s.customerName === t.guestCustomer;
                    const name = isGenericGuest ? '' : s.customerName;
                    const address = s.customerStreetAddress || '';
                    setTempGuestName(name);
                    setTempGuestAddress(address);
                    setOriginalGuestInfo({ name, address });
                  }}
                  className='p-1 transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30'
                  title={t.editGuestInfo || 'Edit Guest Info'}
                  disabled={!hasOpenShift}
                >
                  <span 
                    className='material-symbols-rounded'
                    style={{ fontSize: 'var(--icon-md)' }}
                  >
                    edit_note
                  </span>
                </button>
              )}
            </div>
          );
        },
      }),
      // Customer address
      columnHelper.accessor('customerAddress', {
        header: t.address || 'Address',
        size: 280,
        cell: (info) => {
          const manualAddress = info.row.original.customerStreetAddress;
          const standardAddress = info.getValue();
          const displayAddress = manualAddress || standardAddress;
          
          return (
            <div className='text-[11px] leading-tight whitespace-normal line-clamp-1' title={displayAddress}>
              {manualAddress ? (
                <span className='font-bold text-gray-900 dark:text-gray-100'>
                  {manualAddress}
                </span>
              ) : (
                <span className='text-gray-400 dark:text-gray-500'>
                  {standardAddress || '-'}
                </span>
              )}
            </div>
          );
        },
      }),
      // Order total amount
      columnHelper.accessor('total', {
        header: t.total || 'Total',
        size: 80,
        meta: { align: 'center' },
        cell: (info) => {
          const method = info.row.original.paymentMethod;
          const isCard = method === 'visa' || method === 'credit';
          
          return (
            <div className='flex flex-col items-start leading-tight'>
              <span className={`font-bold ${isCard ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {formatCurrency(info.getValue())}
              </span>
              {(info.row.original.globalDiscount || 0) > 0 && (
                <span className='text-[10px] text-red-500 font-medium'>
                  -{info.row.original.globalDiscount}%
                </span>
              )}
            </div>
          );
        },
      }),
      // Delivery driver selection
      columnHelper.accessor('deliveryEmployeeId', {
        header: t.deliveryMan || 'Delivery Man',
        size: 150,
        meta: { align: 'center', isId: false },
        cell: (info) => {
          const s = info.row.original;
          const isSelectDisabled = s.status === 'completed' || s.status === 'cancelled';

          return (
            <div onClick={(e) => e.stopPropagation()}>
              <DriverSelect
                driverId={info.getValue()}
                drivers={deliveryDrivers}
                onSelect={(d) => onUpdateSale(s.id, { deliveryEmployeeId: d.id })}
                t={t}
                disabled={isSelectDisabled || !hasOpenShift}
              />
            </div>
          );
        },
      }),
      // Action column for status changes
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 200,
        meta: {
          align: 'end',
        },
        cell: (info) => {
          const s = info.row.original;

          if (!hasOpenShift && s.status !== 'completed' && s.status !== 'cancelled') {
            return (
              <div className='flex items-center justify-end h-full' onClick={(e) => e.stopPropagation()}>
                <ShiftWarning t={t} compact={true} />
              </div>
            );
          }

          return (
            <div className='flex items-center justify-end gap-1.5' onClick={(e) => e.stopPropagation()}>
              {/* Slot 1: Cancel Button (Fixed Width) */}
              <div className='w-8 flex justify-center shrink-0'>
                {(s.status === 'pending' ||
                  s.status === 'with_delivery' ||
                  s.status === 'on_way') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOrderToCancelId(s.id);
                    }}
                    className='p-1 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20'
                    title={t.cancel || 'Cancel'}
                  >
                    <span className='material-symbols-rounded text-[20px]'>block</span>
                  </button>
                )}
              </div>

              {/* Slot 2: Main Action Button (Fixed Width) */}
              <div className='w-24 flex justify-center shrink-0'>
                {s.status === 'pending' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateSale(s.id, { status: 'with_delivery' });
                    }}
                    className='h-7 w-full bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors flex items-center justify-center whitespace-nowrap'
                  >
                    {t.start || 'Start'}
                  </button>
                )}
                {s.status === 'with_delivery' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateSale(s.id, { status: 'on_way' });
                    }}
                    className='h-7 w-full bg-orange-100 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-200 transition-colors flex items-center justify-center whitespace-nowrap'
                  >
                    {t.onWay || 'On Way'}
                  </button>
                )}
                {s.status === 'on_way' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateSale(s.id, { status: 'completed' });
                    }}
                    className='h-7 w-full bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors flex items-center justify-center whitespace-nowrap'
                  >
                    {t.complete || 'Complete'}
                  </button>
                )}
                {s.status === 'completed' && (
                  <div className='flex items-center gap-1 text-green-600' title={t.completed || 'تم التوصيل'}>
                    <span className='material-symbols-rounded text-lg'>task_alt</span>
                    <span className='text-[10px] font-bold uppercase'>{t.completed || 'مكتمل'}</span>
                  </div>
                )}
                {s.status === 'cancelled' && (
                  <div className='flex items-center gap-1 text-red-600' title={t.cancelled || 'ملغى'}>
                    <span className='material-symbols-rounded text-lg'>cancel</span>
                    <span className='text-[10px] font-bold uppercase'>{t.cancelled || 'ملغى'}</span>
                  </div>
                )}
              </div>

              {/* Slot 3: Undo Button (Fixed Width) */}
              <div className='w-8 flex justify-center shrink-0'>
                {(s.status === 'on_way' || s.status === 'with_delivery') ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const prevStatus = s.status === 'on_way' ? 'with_delivery' : 'pending';
                      onUpdateSale(s.id, { status: prevStatus });
                    }}
                    className='p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    title={t.undo || 'Undo'}
                  >
                    <span className='material-symbols-rounded text-[20px]'>undo</span>
                  </button>
                ) : (
                  <div className='w-8' /> // Consistent space if no undo button
                )}
              </div>
            </div>
          );
        },
      }),
    ],
    [t, deliveryDrivers, onUpdateSale, activeTab, customers, onViewCustomerHistory]
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.deliveryOrders || 'Delivery Orders'}
      icon='local_shipping'
      size='6xl'
      width='max-w-7xl'
      hideCloseButton={true}
      tabs={[
        {
          label: `${t.all || 'الكل'} (${sales.filter((s) => s.saleType === 'delivery' && s.status !== 'completed' && s.status !== 'cancelled' && (!activeBranchId || s.branchId === activeBranchId)).length})`,
          value: 'all',
          icon: 'list',
        },
        {
          label: `${t.pending || 'قيد الانتظار'} (${sales.filter((s) => s.status === 'pending' && s.saleType === 'delivery' && (!activeBranchId || s.branchId === activeBranchId)).length})`,
          value: 'pending',
          icon: 'pending',
        },
        {
          label: `${t.active || 'النشطة'} (${sales.filter((s) => (s.status === 'with_delivery' || s.status === 'on_way') && s.saleType === 'delivery' && (!activeBranchId || s.branchId === activeBranchId)).length})`,
          value: 'active',
          icon: 'local_shipping',
        },
        { label: t.history || 'السجل', value: 'completed', icon: 'history' },
      ]}
      activeTab={activeTab}
      onTabChange={(val) => {
        setActiveTab(val as DeliveryTab);
        setSelectedSaleId(null);
      }}
      headerActions={
        <div className='flex items-center pe-2'>
          <div className='w-[300px] flex items-center'>
            <SearchInput
              value={searchQuery}
              onSearchChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder={t.searchOrder || 'Search orders...'}
              autoFocus={true}
              wrapperClassName='w-full h-8 !py-0'
              className='!py-1 text-[13px]'
            />
          </div>
        </div>
      }
    >
      <div className='flex flex-col h-[70vh]'>
        {selectedSaleId && selectedSale ? (
          <div className='flex-1 flex flex-col overflow-hidden'>
            {/* Inner Header - High-Density Integrated Row */}
            <div className='flex items-center justify-between h-11 mb-4 border border-zinc-200 dark:border-white/10 shrink-0 bg-white dark:bg-zinc-900/50 rounded-2xl px-1.5 shadow-sm'>
              <div className='flex items-center h-full gap-0 min-w-0'>
                {/* 1. Back Action */}
                <button
                  onClick={() => setSelectedSaleId(null)}
                  className='h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors group shrink-0'
                  title={t.back || 'Back'}
                >
                  <span className='material-symbols-rounded text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors text-[20px]'>
                    arrow_back
                  </span>
                </button>

                <div className='h-4 w-px bg-zinc-200 dark:bg-white/10 mx-2.5' />

                {/* 2. Order Identity */}
                <div className='flex items-center shrink-0'>
                  <span className='text-[16px] font-black font-mono text-zinc-900 dark:text-white leading-none tracking-tight'>
                    #{selectedSale.serialId || selectedSale.id.slice(0, 8)}
                  </span>
                </div>

                <div className='h-4 w-px bg-zinc-200 dark:bg-white/10 mx-2.5' />

                {/* 3. Status Badge (Compact) */}
                <div
                  className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest border shrink-0 ${
                    selectedSale.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                      : selectedSale.status === 'cancelled'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                  }`}
                >
                  <span className='material-symbols-rounded text-sm' style={{ fontVariationSettings: "'FILL' 1" }}>
                    {selectedSale.status === 'completed' ? 'verified' : selectedSale.status === 'cancelled' ? 'cancel' : 'pending'}
                  </span>
                  <span>{t[selectedSale.status] || selectedSale.status}</span>
                </div>

                <div className='h-4 w-px bg-zinc-200 dark:bg-white/10 mx-2.5' />

                {/* 4. Customer/Guest Identity */}
                <div className='flex items-center gap-2.5 min-w-0'>
                  <div className='w-6 h-6 rounded-full bg-zinc-200 dark:bg-white/10 flex items-center justify-center shrink-0'>
                    <span className='material-symbols-rounded text-base text-zinc-500'>person</span>
                  </div>
                  <div className='flex items-center gap-2 truncate'>
                    <span className='text-[13px] font-bold text-zinc-800 dark:text-zinc-200 truncate'>
                      {selectedSale.customerName}
                    </span>
                    {selectedSale.customerPhone && (
                      <span className='text-[11px] text-zinc-400 font-mono opacity-80' dir='ltr'>
                        {selectedSale.customerPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Navigation & Global Actions */}
              <div className='flex items-center gap-4 h-full'>
                {(() => {
                  const tabOptions = [
                    {
                      label: t.orderItems || 'Items',
                      value: 'items',
                      icon: 'shopping_cart',
                      count: selectedSale.items.length,
                    },
                  ];

                  if (selectedSale.modificationHistory?.length) {
                    tabOptions.push({
                      label: t.history || 'History',
                      value: 'history',
                      icon: 'history',
                      count: selectedSale.modificationHistory.length,
                      activeColor: 'orange',
                    } as any);
                  }

                  return (
                    <div className='flex items-center gap-3'>
                      {/* Unified Edit Control Group */}
                      {isEditMode && (
                        <div className='flex items-center gap-1'>
                          {/* Multi-step Undo */}
                          <button
                            onClick={undo}
                            disabled={editHistory.index <= 0}
                            className='h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 disabled:opacity-30 transition-colors'
                            title={t.undo || 'Undo'}
                          >
                            <span className='material-symbols-rounded text-[20px]'>undo</span>
                          </button>

                          {/* Multi-step Redo */}
                          <button
                            onClick={redo}
                            disabled={editHistory.index >= editHistory.stack.length - 1}
                            className='h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 disabled:opacity-30 transition-colors'
                            title={t.redo || 'Redo'}
                          >
                            <span className='material-symbols-rounded text-[20px]'>redo</span>
                          </button>

                          <div className='h-4 w-px bg-zinc-200 dark:bg-white/10 mx-1' />

                          {/* Commit Change */}
                          <button
                            onClick={handleSaveChanges}
                            disabled={!hasChanges}
                            className='h-8 px-4 text-[11px] font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-30 flex items-center gap-1.5 shadow-sm shadow-emerald-500/20'
                          >
                            <span className='material-symbols-rounded text-sm' style={{ fontVariationSettings: "'FILL' 1" }}>done_all</span>
                            {t.saveChanges || 'Save'}
                          </button>
                        </div>
                      )}

                      <SegmentedControl
                        options={tabOptions}
                        value={activeSubTab}
                        onChange={(val) => setActiveSubTab(val as 'items' | 'history')}
                        size='xs'
                        fullWidth={false}
                      />
                    </div>
                  );
                })()}

                {!hasOpenShift &&
                  selectedSale?.status !== 'completed' &&
                  selectedSale?.status !== 'cancelled' && (
                    <ShiftWarning t={t} compact={true} />
                  )}

                {!currentEmployeeId &&
                  hasOpenShift &&
                  selectedSale?.status !== 'completed' &&
                  selectedSale?.status !== 'cancelled' && (
                    <div className='flex items-center gap-1.5 text-[10px] text-rose-500 font-black uppercase tracking-tighter bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-100 dark:border-rose-500/20 animate-pulse'>
                      <span className='material-symbols-rounded text-sm'>lock</span>
                      {t.loginToEdit}
                    </div>
                  )}
              </div>
            </div>

            {/* Content Area */}
            <div className='flex-1 overflow-y-auto pr-2 custom-scrollbar' dir='ltr'>
              {activeSubTab === 'items' ? (
                <div className='grid grid-cols-2 gap-x-4 gap-y-1'>
                  {(() => {
                    // Group items by ID
                    const mergedItems = selectedSale.items.reduce(
                      (acc, item) => {
                        if (!acc[item.id]) {
                          acc[item.id] = {
                            common: item,
                            packItem: undefined,
                            unitItem: undefined,
                          };
                        }
                        if (item.isUnit) {
                          acc[item.id].unitItem = item;
                        } else {
                          acc[item.id].packItem = item;
                        }
                        return acc;
                      },
                      {} as Record<
                        string,
                        { common: CartItem; packItem?: CartItem; unitItem?: CartItem }
                      >
                    );

                    const mergedList = Object.values(mergedItems);

                    return mergedList.map((merged, idx) => {
                      const { common, packItem, unitItem } = merged;
                      const rowIdx = Math.floor(idx / 2);
                      const rowCount = Math.ceil(mergedList.length / 2);

                      // Calculate Display Quantities (including pending changes)
                      // Use common.id to ensure we get state even if one component (pack/unitItem) is undefined initially
                      const packQty = getItemQuantity(common.id, false, packItem?.quantity || 0);
                      const unitQty = getItemQuantity(common.id, true, unitItem?.quantity || 0);

                      // Check if item is logically deleted (both parts deleted or zero)
                      // Note: If original item didn't exist (e.g. no packItem), we consider its qty 0.
                      // We need to check if we have PENDING deletions for existing items.
                      const packDeleted = packItem
                        ? pendingChanges.get(`${packItem.id}-pack`)?.deleted
                        : false;
                      const unitDeleted = unitItem
                        ? pendingChanges.get(`${unitItem.id}-unit`)?.deleted
                        : false;

                      // Check for changes to highlight (Moved up to fix scoping error)
                      const hasPackChange = packQty !== (packItem?.quantity || 0);
                      const hasUnitChange = unitQty !== (unitItem?.quantity || 0);
                      const hasChange = hasPackChange || hasUnitChange;

                      // Item is considered fully deleted if all its existing components are marked deleted
                      // OR if the resulting quantities are both zero (which happens if deleted via handleQuantityChange 0)
                      const isDeleted =
                        ((packItem ? packDeleted : true) && (unitItem ? unitDeleted : true)) ||
                        (packQty === 0 && unitQty === 0 && !hasPackChange && !hasUnitChange);
                      // Added !hasChanges check to ensure we don't treat a newly added 0 as deleted (though 0 usually means deleted)
                      // Actually if packQty=0 and unitQty=0, it IS effectively deleted.

                      // Display Price Calculation
                      const unitsPerPack = common.unitsPerPack || 1;
                      const packPrice = common.publicPrice;
                      const unitPrice = common.publicPrice / unitsPerPack;
                      const totalPrice = money.add(
                        money.multiply(packPrice, packQty, 0),
                        money.multiply(unitPrice, unitQty, 0)
                      );

                      const hasDualMode = unitsPerPack > 1;

                      return (
                        <MaterialTabs
                          key={`${common.id}-${idx}`}
                          index={rowIdx}
                          total={rowCount}
                          color={isDeleted ? 'red' : hasChange ? 'orange' : 'blue'}
                          isSelected={false}
                          className={`h-auto! py-3 ${isDeleted ? 'opacity-50' : ''}`}
                        >
                          <div className='flex items-center justify-between w-full' dir='ltr'>
                            <div className='flex items-center gap-4'>
                              <div className='flex flex-col text-left'>
                                <span
                                  className={`font-bold text-sm ${isDeleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
                                >
                                  {getDisplayName(common, textTransform)}
                                </span>
                              </div>
                            </div>

                            <div className='flex items-center gap-6'>
                              {/* Quantity Controls / Display - "Split Pill" Design (Cloned from SortableCartItem) */}
                              {isEditMode && !isDeleted ? (
                                /* EXACT STYLE FROM SortableCartItem.tsx */
                                <div className='flex items-center bg-white dark:bg-gray-900 rounded-lg border shadow-xs h-6 overflow-hidden transition-colors w-18 border-gray-200 dark:border-gray-700'>
                                  {/* Pack Input */}
                                  <input
                                    type='number'
                                    min='0'
                                    placeholder={hasDualMode ? 'P' : '1'}
                                    value={packQty === 0 ? '' : packQty}
                                    onChange={(e) => {
                                      const val =
                                        e.target.value === '' ? 0 : parseFloat(e.target.value);
                                      if (isNaN(val)) return;
                                      // Use common as target if packItem missing (e.g. adding pack to unit-only)
                                      const targetItem = packItem || common;
                                      // Delta MUST be calculated against CURRENT DISPLAYED QTY (packQty), not original
                                      if (targetItem)
                                        handleQuantityChange(targetItem, false, val - packQty);
                                    }}
                                    className={`h-full text-center bg-transparent focus:outline-hidden focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-gray-300 font-bold text-[10px] text-gray-900 dark:text-gray-100 shrink-0 min-w-0 ${hasDualMode ? 'w-1/2' : 'w-full'}`}
                                  />

                                  {/* Separator */}
                                  {hasDualMode && (
                                    <div className='w-px h-4 bg-gray-200 dark:bg-gray-700 shrink-0'></div>
                                  )}

                                  {/* Unit Input - Only if Dual Mode */}
                                  {hasDualMode && (
                                    <input
                                      type='number'
                                      min='0'
                                      placeholder='U'
                                      value={unitQty === 0 ? '' : unitQty}
                                      onChange={(e) => {
                                        const val =
                                          e.target.value === '' ? 0 : parseInt(e.target.value);
                                        if (isNaN(val)) return;
                                        const targetItem = unitItem || common;
                                        // Delta MUST be calculated against CURRENT DISPLAYED QTY (unitQty)
                                        if (targetItem)
                                          handleQuantityChange(targetItem, true, val - unitQty);
                                      }}
                                      className='h-full w-1/2 text-center bg-transparent focus:outline-hidden focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-blue-200 font-bold text-[10px] text-primary-600 dark:text-blue-400 shrink-0 min-w-0'
                                    />
                                  )}
                                </div>
                              ) : (
                                /* View Mode - Static Split Pill (Matching exact dimensions) */
                                <div className='flex items-center justify-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 h-6 overflow-hidden shadow-xs w-18'>
                                  {hasDualMode ? (
                                    <div className='flex items-center gap-0 w-full'>
                                      <span
                                        className={`flex-1 text-center font-bold text-[10px] ${packQty > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-300 dark:text-gray-600'}`}
                                      >
                                        {packQty}
                                      </span>
                                      <div className='w-px h-4 bg-gray-200 dark:bg-gray-700 shrink-0'></div>
                                      <span
                                        className={`flex-1 text-center font-bold text-[10px] ${unitQty > 0 ? 'text-primary-600 dark:text-blue-400' : 'text-blue-200 dark:text-blue-900/40'}`}
                                      >
                                        {unitQty === 0 && unitQty !== undefined ? 'U' : unitQty}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className='font-bold text-[10px] text-gray-900 dark:text-gray-100'>
                                      {packQty}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Discount Control - Edit Mode Only */}
                              {isEditMode &&
                                !isDeleted &&
                                (() => {
                                  const drug = inventory.find((d) => d.id === common.id);
                                  const cost = drug?.costPrice || 0;
                                  const price = common.publicPrice || 0;
                                  const margin = pricing.actualMargin(cost, price);
                                  let calculatedMax = 10;
                                  if (margin < 20) calculatedMax = Math.floor(margin / 2);
                                  const effectiveMax =
                                    drug?.maxDiscount && drug.maxDiscount > 0
                                      ? drug.maxDiscount
                                      : calculatedMax;
                                  const currentDiscount = getItemDiscount(
                                    common.id,
                                    common.discount || 0
                                  );

                                  return (
                                    <div
                                      title={`Max: ${effectiveMax}%`}
                                      className={`flex items-center rounded-lg border shadow-xs h-6 overflow-hidden transition-colors w-14 shrink-0 ${
                                        currentDiscount > 0
                                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                                      }`}
                                    >
                                      <button
                                        onClick={() => {
                                          const newVal = currentDiscount === 0 ? effectiveMax : 0;
                                          handleDiscountChange(common.id, newVal);
                                        }}
                                        className={`w-6 h-full flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 ${
                                          currentDiscount > 0
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-gray-400'
                                        }`}
                                      >
                                        <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>
                                          percent
                                        </span>
                                      </button>
                                      <input
                                        type='number'
                                        value={currentDiscount || ''}
                                        placeholder='0'
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          let finalVal = !isNaN(val) && val >= 0 ? val : 0;
                                          if (finalVal > effectiveMax) finalVal = effectiveMax;
                                          handleDiscountChange(common.id, finalVal);
                                        }}
                                        className={`w-8 min-w-0 h-full text-[10px] font-bold text-center bg-transparent focus:outline-hidden focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                          currentDiscount > 0
                                            ? 'text-green-700 dark:text-green-300 placeholder-green-300'
                                            : 'text-gray-900 dark:text-gray-100 placeholder-gray-400'
                                        }`}
                                      />
                                    </div>
                                  );
                                })()}

                              {/* Price Display */}
                              <div className='flex flex-col items-end min-w-[70px]'>
                                <span className='text-xs text-gray-400 uppercase tracking-wider text-[10px]'>
                                  {t.publicPrice || 'Price'}
                                </span>
                                <span className='font-bold text-gray-900 dark:text-gray-100 text-sm'>
                                  {formatCurrency(
                                    pricing.afterDiscount(
                                      totalPrice,
                                      getItemDiscount(common.id, common.discount || 0)
                                    )
                                  )}
                                </span>
                              </div>

                              {/* Delete/Restore Button */}
                              {isEditMode &&
                                (isDeleted ? (
                                  <button
                                    onClick={() => handleRestoreFullItem(common.id)}
                                    className='w-8 h-8 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors'
                                    title={t.restore || 'Restore'}
                                  >
                                    <span className='material-symbols-rounded'>undo</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleDeleteFullItem(common.id, packItem, unitItem)
                                    }
                                    className='w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors'
                                    title={t.delete || 'Delete'}
                                  >
                                    <span className='material-symbols-rounded text-xl'>delete</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        </MaterialTabs>
                      );
                    });
                  })()}
                </div>
              ) : (
                /* Modification History View */
                <div className='relative pl-6 space-y-2 py-2' dir='ltr'>
                  {/* Vertical Timeline Rail */}
                  <div className='absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800 z-0'></div>

                  {selectedSale.modificationHistory
                    ?.slice()
                    .reverse()
                    .map((record, idx) => {
                      const isExpanded = expandedHistoryRecordId === record.id;
                      const date = new Date(record.timestamp);
                      const timeStr = date.toLocaleString(currentLanguage === 'AR' ? 'ar-EG-u-nu-latn' : 'en-US', {
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true,
                      });

                      // Calculate relative time
                      const getRelativeTime = (d: Date) => {
                        const now = new Date();
                        const diff = now.getTime() - d.getTime();
                        const mins = Math.floor(diff / 60000);
                        const hours = Math.floor(mins / 60);
                        const days = Math.floor(hours / 24);

                        if (mins < 1) return t.justNow || 'Just now';
                        if (mins < 60)
                          return currentLanguage === 'AR'
                            ? `${t.ago || 'منذ'} ${mins} د`
                            : `${mins}m ${t.ago || 'ago'}`;
                        if (hours < 24)
                          return currentLanguage === 'AR'
                            ? `${t.ago || 'منذ'} ${hours} س`
                            : `${hours}h ${t.ago || 'ago'}`;
                        return date.toLocaleDateString(currentLanguage === 'AR' ? 'ar-EG-u-nu-latn' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                        });
                      };

                      const hasDeletions = record.modifications.some(
                        (m) => m.type === 'item_removed'
                      );
                      const nodeColor = hasDeletions ? 'red' : 'orange';

                      return (
                        <div key={record.id} className='relative z-10'>
                          {/* Timeline Node */}
                          <div
                            className={`absolute -left-[18px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-xs transition-all duration-300 ${
                              isExpanded
                                ? hasDeletions
                                  ? 'bg-red-500 scale-110'
                                  : 'bg-orange-500 scale-125'
                                : hasDeletions
                                  ? 'bg-red-300'
                                  : 'bg-orange-300'
                            }`}
                          ></div>

                          <MaterialTabs
                            index={idx}
                            total={selectedSale.modificationHistory?.length || 0}
                            className={`h-auto! py-3 transition-all duration-300 ${isExpanded ? 'bg-gray-100 hover:bg-gray-200/50 dark:bg-gray-900/40 dark:hover:bg-white/10 dark:ring-1 dark:ring-gray-800 shadow-xs' : 'hover:bg-gray-100/50 dark:hover:bg-white/10'}`}
                            onClick={() =>
                              setExpandedHistoryRecordId(isExpanded ? null : record.id)
                            }
                          >
                            <div className='flex flex-col w-full'>
                              {/* Collapsed Timeline Summary */}
                              <div
                                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${!isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                              >
                                <div className='overflow-hidden min-h-0'>
                                  <div className='flex items-center justify-between w-full gap-4'>
                                    <div className='flex flex-col gap-0.5 min-w-0'>
                                      <div className='flex items-center gap-2'>
                                        <span className='text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                                          {getRelativeTime(date)}
                                        </span>
                                        <span className='w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600'></span>
                                        <span className='text-sm font-bold text-gray-900 dark:text-gray-100 truncate' dir='rtl'>
                                          {record.modifications.length}{' '}
                                          {record.modifications.length === 1
                                            ? t.modification || 'Change'
                                            : t.modifications || 'Changes'}
                                        </span>
                                      </div>
                                      <div className='flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 flex-wrap'>
                                        {record.modifications.map((m, mIdx) => {
                                          const drug = inventory.find((d) => d.id === m.itemId);
                                          const displayName = getDisplayName(
                                            {
                                              name: m.itemName,
                                              dosageForm: m.dosageForm || drug?.dosageForm,
                                            },
                                            textTransform
                                          );
                                          return (
                                            <span
                                              key={mIdx}
                                              className='whitespace-nowrap flex items-center'
                                            >
                                              {displayName}
                                              {mIdx < record.modifications.length - 1 && (
                                                <span className='mx-1 opacity-50'>|</span>
                                              )}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>

                                      <div className='flex items-center gap-2 shrink-0'>
                                        {record.modifications.some((m) => m.type === 'item_removed') && (
                                          <span
                                            className='material-symbols-rounded text-xl text-red-600 dark:text-red-400'
                                            title={t.deleted || 'Deleted'}
                                          >
                                            delete
                                          </span>
                                        )}
                                        {record.modifications.some((m) => m.type === 'quantity_update') && (
                                          <span
                                            className='material-symbols-rounded text-xl text-orange-600 dark:text-orange-400'
                                            title={t.quantityUpdated || 'Quantity Updated'}
                                          >
                                            edit_square
                                          </span>
                                        )}
                                        {record.modifications.some((m) => m.type === 'discount_update') && (
                                          <span
                                            className='material-symbols-rounded text-xl text-blue-600 dark:text-blue-400'
                                            title={t.discountUpdated || 'Discount Updated'}
                                          >
                                            percent
                                          </span>
                                        )}
                                        {record.modifications.some((m) => m.type === 'item_added') && (
                                          <span
                                            className='material-symbols-rounded text-xl text-green-600 dark:text-green-400'
                                            title={t.itemAdded || 'Item Added'}
                                          >
                                            add_circle
                                          </span>
                                        )}
                                      {record.modifiedBy && (
                                        <div className='flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hidden sm:flex'>
                                          <span>{record.modifiedBy}</span>
                                          <span className='material-symbols-rounded text-base'>
                                            account_circle
                                          </span>
                                        </div>
                                      )}
                                      <span className='material-symbols-rounded text-gray-300 group-hover:text-primary-500 transition-transform duration-300 rotate-0'>
                                        expand_more
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Timeline Detail */}
                              <div
                                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                              >
                                <div className='overflow-hidden min-h-0'>
                                  <div className='space-y-4 pt-1'>
                                    <div className='flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800'>
                                      <div className='flex flex-col'>
                                        <span className='text-xs font-bold text-primary-600 dark:text-blue-400'>
                                          {timeStr}
                                        </span>
                                        <span className='text-[10px] text-gray-500 uppercase tracking-widest'>
                                          {date.toLocaleDateString(
                                            currentLanguage === 'AR' ? 'ar-EG-u-nu-latn' : 'en-US',
                                            { weekday: 'long', day: 'numeric', month: 'long' }
                                          )}
                                        </span>
                                      </div>
                                      <div className='flex items-center gap-3'>
                                        {record.modifiedBy && (
                                          <div className='flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400'>
                                            {record.modifiedBy}
                                            <span className='material-symbols-rounded text-base'>
                                              account_circle
                                            </span>
                                          </div>
                                        )}
                                        <span className='material-symbols-rounded text-gray-400 transition-transform duration-300 rotate-180'>
                                          expand_more
                                        </span>
                                      </div>
                                    </div>

                                    <div className='space-y-1'>
                                      {record.modifications.map((mod, modIdx) => {
                                        const isIncrease = (mod.newQuantity || 0) > (mod.previousQuantity || 0);
                                        const isDeletion = mod.type === 'item_removed';
                                        const isDiscount = mod.type === 'discount_update';

                                        return (
                                          <div
                                            key={modIdx}
                                            className='flex items-center gap-3 py-1'
                                          >
                                            <span
                                              className={`shrink-0 ${
                                                isDeletion
                                                  ? 'text-red-600 dark:text-red-400'
                                                  : isDiscount
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : isIncrease
                                                      ? 'text-green-600 dark:text-green-400'
                                                      : 'text-orange-600 dark:text-orange-400'
                                              }`}
                                            >
                                              <span className='material-symbols-rounded text-lg'>
                                                {isDeletion ? 'delete' : 'edit_square'}
                                              </span>
                                            </span>

                                            <div className='flex items-center justify-between flex-1 min-w-0 gap-4'>
                                              <span className='font-bold text-gray-900 dark:text-gray-100 text-sm truncate'>
                                                {(() => {
                                                  const drug = inventory.find(
                                                    (d) => d.id === mod.itemId
                                                  );
                                                  return getDisplayName(
                                                    {
                                                      name: mod.itemName,
                                                      dosageForm: mod.dosageForm || drug?.dosageForm,
                                                    },
                                                    textTransform
                                                  );
                                                })()}
                                              </span>
                                              <div className='flex items-center gap-2 ml-8 shrink-0'>
                                                <div
                                                  className={`flex items-center gap-1.5 font-bold text-xs ${
                                                    isDeletion
                                                      ? 'text-red-600 dark:text-red-400'
                                                      : isDiscount
                                                        ? 'text-blue-600 dark:text-blue-400'
                                                        : isIncrease
                                                          ? 'text-green-600 dark:text-green-400'
                                                          : 'text-orange-600 dark:text-orange-400'
                                                  }`}
                                                >
                                                  {isDiscount ? (
                                                    <>
                                                      <span>{mod.previousDiscount}%</span>
                                                      <span className='material-symbols-rounded text-sm opacity-50'>
                                                        arrow_forward
                                                      </span>
                                                      <span>{mod.newDiscount}%</span>
                                                    </>
                                                  ) : isDeletion ? (
                                                    <span className='text-red-500 font-bold text-xs'>
                                                      {t.deleted || 'Deleted'}{' '}
                                                      {mod.previousQuantity}
                                                    </span>
                                                  ) : (
                                                    <>
                                                      <span>{mod.previousQuantity}</span>
                                                      <span className='material-symbols-rounded text-sm opacity-50'>
                                                        arrow_forward
                                                      </span>
                                                      <span>{mod.newQuantity}</span>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </MaterialTabs>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Table View */
          <div className='flex-1 overflow-auto custom-scrollbar'>
            <TanStackTable
              data={filteredSales}
              columns={columns}
              enableSearch={false}
              enableTopToolbar={false}
              globalFilter={searchQuery}
              searchPlaceholder={t.searchOrder || 'Search orders...'}
              emptyMessage={t.noOrders || 'No delivery orders found'}
              onRowClick={(row) => setSelectedSaleId(row.id)}
              onRowContextMenu={handleRowContextMenu}
              lite={true}
              dense={true}
              enablePagination={false}
            />
          </div>
        )}

        {/* Footer Summary */}
        <div className='mt-4 flex justify-between items-center text-sm border-t border-gray-100 dark:border-gray-800 pt-4'>
          <div className='flex items-center gap-3'>
            <div className='flex flex-col'>
              <span className='text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1'>
                {t.totalPending || 'Total Pending Value'}
              </span>
              <div className='flex items-center gap-2'>
                <span className='text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight'>
                  {formatCurrency(pendingStats.total)}
                </span>
                
                <Tooltip
                  content={
                    <InsightTooltip
                      title={t.pendingValueDetails}
                      value={pendingStats.total}
                      icon='analytics'
                      iconColorClass='text-blue-500'
                      language={currentLanguage}
                      calculations={[
                        {
                          label: t.timeDistribution,
                          math: (
                            <div className='flex flex-col gap-1 w-full'>
                              <div className='flex justify-between items-center text-[11px]'>
                                <span className='opacity-60'>{t.today}:</span>
                                <span>{formatCurrency(pendingStats.today.value, 'EGP', currentLanguage === 'AR' ? 'ar-EG' : 'en-US')}</span>
                              </div>
                              <div className='flex justify-between items-center text-[11px]'>
                                <span className='opacity-60'>{t.last24Hours}:</span>
                                <span>{formatCurrency(pendingStats.last24h.value, 'EGP', currentLanguage === 'AR' ? 'ar-EG' : 'en-US')}</span>
                              </div>
                              <div className='flex justify-between items-center text-[11px] border-t border-white/10 pt-1 mt-1'>
                                <span className='opacity-60'>{t.older}:</span>
                                <span>{formatCurrency(pendingStats.older.value, 'EGP', currentLanguage === 'AR' ? 'ar-EG' : 'en-US')}</span>
                              </div>
                            </div>
                          ),
                          isCurrency: false
                        }
                      ]}
                      details={[
                        {
                          icon: 'today',
                          label: t.todaysOrders,
                          value: `${pendingStats.today.count} ${pendingStats.today.count === 1 ? t.orderSingular : t.orderPlural}`,
                          isCurrency: false,
                          colorClass: 'text-emerald-500'
                        },
                        {
                          icon: 'history_toggle_off',
                          label: t.last24Hours,
                          value: `${pendingStats.last24h.count} ${pendingStats.last24h.count === 1 ? t.orderSingular : t.orderPlural}`,
                          isCurrency: false,
                          colorClass: 'text-blue-500'
                        },
                        {
                          icon: 'event_busy',
                          label: t.olderOrders,
                          value: `${pendingStats.older.count} ${pendingStats.older.count === 1 ? t.orderSingular : t.orderPlural}`,
                          isCurrency: false,
                          colorClass: 'text-orange-500'
                        }
                      ]}
                      footer={t.pendingValueInsightFooter}
                    />
                  }
                >
                  <span className='material-symbols-rounded text-gray-400 hover:text-blue-500 transition-colors cursor-help text-[20px]'>
                    info
                  </span>
                </Tooltip>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            {canEdit && !isEditMode && selectedSaleId && selectedSale && (
              <button
                onClick={() => setIsEditMode(true)}
                className='px-6 py-2 bg-primary-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors'
              >
                {t.editOrder || 'Edit Order'}
              </button>
            )}
            <button
              onClick={onClose}
              className='px-6 py-2 bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400 font-bold rounded-xl transition-all cursor-pointer'
            >
              {t.close || 'Close'}
            </button>
          </div>
        </div>
      </div>
    </Modal>

    {/* Cancel Confirmation Modal */}
    {orderToCancelId && (
      <Modal
        isOpen={!!orderToCancelId}
        onClose={() => setOrderToCancelId(null)}
        title={t.cancel || 'Cancel Order'}
        icon='warning'
        size='sm'
        hideCloseButton={true}
      >
        <div className='p-2'>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>
            {t.cancelOrderConfirm}
          </p>
          <div className='flex justify-end gap-3'>
            <button
              onClick={() => setOrderToCancelId(null)}
              className='px-4 py-2 font-bold text-zinc-500 dark:text-zinc-400 bg-transparent border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-lg transition-all cursor-pointer'
            >
              {t.keepOrder}
            </button>
            <button
              onClick={() => {
                onUpdateSale(orderToCancelId, { status: 'cancelled' });
                setOrderToCancelId(null);
              }}
              className='px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2'
            >
              <span className='material-symbols-rounded text-sm'>block</span>
              {t.cancel || 'Yes, Cancel'}
            </button>
          </div>
        </div>
      </Modal>
    )}
    {/* Edit Guest Info Modal */}
    {orderToEditGuestId && (
      <Modal
        isOpen={!!orderToEditGuestId}
        onClose={() => setOrderToEditGuestId(null)}
        title={t.editGuestInfo || 'Edit Guest Info'}
        icon='person_add'
        size='sm'
        bodyClassName='p-1.5'
        hideCloseButton={true}
      >
        <div className='flex flex-col gap-2'>
          <div className='bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/50'>
            <div className='flex flex-col gap-1'>
              <label className='text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest'>
                {t.tempCustomerName || 'Temporary Name'}
              </label>
              <SmartInput
                type='text'
                value={tempGuestName}
                onChange={(e) => setTempGuestName(e.target.value)}
                placeholder={t.guestCustomer || 'Guest Customer'}
                className='!py-1.5'
                autoFocus
              />
            </div>
          </div>

          <div className='bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/50'>
            <div className='flex flex-col gap-1'>
              <label className='text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest'>
                {t.tempCustomerAddress || 'Temporary Address'}
              </label>
              <SmartTextarea
                value={tempGuestAddress}
                onChange={(e) => setTempGuestAddress(e.target.value)}
                placeholder={t.addressPlaceholder || 'Enter full delivery address...'}
                className='min-h-[60px] resize-none !py-1.5'
              />
            </div>
          </div>

          <div className='flex gap-1.5'>
            <button
              onClick={handleSaveGuestInfo}
              disabled={
                !originalGuestInfo ||
                (tempGuestName === originalGuestInfo.name && tempGuestAddress === originalGuestInfo.address)
              }
              className='flex-1 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black rounded-lg transition-all uppercase tracking-widest hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed cursor-pointer'
            >
              {t.saveChanges || 'Save'}
            </button>
            <button
              onClick={() => setOrderToEditGuestId(null)}
              className='px-4 py-1.5 bg-transparent text-zinc-500 dark:text-zinc-400 text-xs font-black rounded-lg transition-all uppercase tracking-widest border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 cursor-pointer'
            >
              {t.cancel || 'Cancel'}
            </button>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
};
