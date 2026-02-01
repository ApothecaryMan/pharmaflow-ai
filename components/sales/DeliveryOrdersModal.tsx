import React, { useState, useMemo, useCallback } from 'react';
import { MaterialTabs } from '../common/MaterialTabs';
import { Modal } from '../common/Modal';
import { TanStackTable } from '../common/TanStackTable';
import { createColumnHelper } from '@tanstack/react-table';
import { Sale, Employee, Language, CartItem, Drug, OrderModificationRecord } from '../../types';
import { SegmentedControl } from '../common/SegmentedControl';
import { FilterDropdown } from '../common/FilterDropdown';
import { formatCurrency } from '../../utils/currency';
import { SearchInput } from '../common/SearchInput';
import { batchService } from '../../services/inventory/batchService';
import { getDisplayName } from '../../utils/drugDisplayName';

const DriverSelect = ({ 
  driverId, 
  drivers, 
  onSelect,
  t,
  disabled = false
}: { 
  driverId?: string, 
  drivers: Employee[], 
  onSelect: (d: Employee) => void,
  t: any,
  disabled?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = drivers.find(d => d.id === driverId);

  return (
    <div className="relative w-full h-10">
       <FilterDropdown
          items={drivers}
          selectedItem={selected}
          isOpen={isOpen}
          onToggle={() => setIsOpen(!isOpen)}
          onSelect={(d) => {
              onSelect(d);
              setIsOpen(false);
          }}
          renderItem={(d) => <div className="p-2 font-medium">{d.name}</div>}
          renderSelected={(d) => <div className="px-2 font-bold whitespace-nowrap overflow-hidden text-ellipsis">{d ? d.name : (t.selectDriver || 'Select Driver')}</div>}
          keyExtractor={(d) => d.id}
          className="absolute top-0 left-0 w-full"
          zIndexHigh="z-[200]"
          color="blue"
          variant="input"
          disabled={disabled}
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
  language = 'EN',
  t,
  currentEmployeeId
}) => {
  const [activeTab, setActiveTab] = useState<DeliveryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingItemChange>>(new Map());
  const [pendingDiscountChanges, setPendingDiscountChanges] = useState<Map<string, PendingDiscountChange>>(new Map());
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'history'>('items'); // Replaces showHistory toggle
  const [expandedHistoryRecordId, setExpandedHistoryRecordId] = useState<string | null>(null);

  const selectedSale = useMemo(() => {
    return sales.find(s => s.id === selectedSaleId);
  }, [sales, selectedSaleId]);

  // Reset to table view when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedSaleId(null);
      setIsEditMode(false);
      setPendingChanges(new Map());
      setPendingDiscountChanges(new Map());
    }
  }, [isOpen]);

  // Check if order can be edited (only pending/active, not completed)
  const canEdit = useMemo(() => {
    return selectedSale && 
           selectedSale.status !== 'completed' && 
           selectedSale.status !== 'cancelled' &&
           !!currentEmployeeId; // Must be logged in
  }, [selectedSale, currentEmployeeId]);

  // Get current quantity for an item (considering pending changes)
  const getItemQuantity = useCallback((itemId: string, isUnit: boolean, originalQty: number): number => {
    const key = `${itemId}-${isUnit ? 'unit' : 'pack'}`;
    const change = pendingChanges.get(key);
    if (change) {
      return change.deleted ? 0 : change.newQuantity;
    }
    return originalQty;
  }, [pendingChanges]);

  // Handle quantity change with robust stock validation (Exact logic from POS Cart)
  const handleQuantityChange = useCallback((item: CartItem, isUnit: boolean, delta: number) => {
    const drug = inventory.find(d => d.id === item.id);
    if (!drug) return;

    const unitsPerPack = drug.unitsPerPack || 1;
    
    // 1. Determine Current Pending State (Before this change)
    // We need the OTHER component's quantity to calculate total usage
    // Access the original sale items to find the pair
    const saleItems = selectedSale?.items.filter(i => i.id === item.id) || [];
    const originalPackItem = saleItems.find(i => !i.isUnit);
    const originalUnitItem = saleItems.find(i => i.isUnit);

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
    const totalOriginalUnitsOwned = (originalPackQty * unitsPerPack) + originalUnitQty;
    const maxUnitsAvailable = drug.stock + totalOriginalUnitsOwned;

    // 4. Calculate Proposed Total Usage
    const proposedPackQty = isUnit ? currentPendingPackQty : proposedQty;
    const proposedUnitQty = isUnit ? proposedQty : currentPendingUnitQty;
    const proposedTotalUnits = (proposedPackQty * unitsPerPack) + proposedUnitQty;

    // 5. Validation & Clamping
    let finalQty = proposedQty;

    if (proposedTotalUnits > maxUnitsAvailable) {
        // Clamp to max available
        if (isUnit) {
            // If changing Unit: Max Unit = MaxAvailable - (Pack * UPP)
            const maxUnit = maxUnitsAvailable - (proposedPackQty * unitsPerPack);
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

    setPendingChanges(prev => {
      const next = new Map(prev);
      if (finalQty === originalQtyForThisType) {
        next.delete(key); // Reverted to original
      } else {
        next.set(key, {
          id: item.id,
          isUnit,
          originalQuantity: originalQtyForThisType,
          newQuantity: finalQty,
          deleted: finalQty === 0
        });
      }
      return next;
    });

  }, [inventory, selectedSale, getItemQuantity]);

  // Check if we can increase quantity (Used for + button disable state)
  const canIncreaseQuantity = useCallback((itemId: string, isUnit: boolean): boolean => {
    // We can simulate a +1 change and see if it passes validation
    // Or just check strictly against stock.
    const drug = inventory.find(d => d.id === itemId);
    if (!drug) return false;

    // We need to access the LATEST pending state to know if we are at limit
    const saleItems = selectedSale?.items.filter(i => i.id === itemId) || [];
    const originalPackItem = saleItems.find(i => !i.isUnit);
    const originalUnitItem = saleItems.find(i => i.isUnit);
    
    const originalPackQty = originalPackItem?.quantity || 0;
    const originalUnitQty = originalUnitItem?.quantity || 0;

    const currentPackQty = getItemQuantity(itemId, false, originalPackQty);
    const currentUnitQty = getItemQuantity(itemId, true, originalUnitQty);
    
    const unitsPerPack = drug.unitsPerPack || 1;
    const totalOriginalUnitsOwned = (originalPackQty * unitsPerPack) + originalUnitQty;
    const maxUnitsAvailable = drug.stock + totalOriginalUnitsOwned; // This includes current stock + what we hold
    
    // Current usage
    const currentUsageUnits = (currentPackQty * unitsPerPack) + currentUnitQty;
    
    // Cost of adding 1
    const cost = isUnit ? 1 : unitsPerPack;
    
    return currentUsageUnits + cost <= maxUnitsAvailable;
  }, [inventory, selectedSale, getItemQuantity]);

  // Handle delete both pack and unit for an item
  const handleDeleteFullItem = useCallback((drugId: string, packItem?: CartItem, unitItem?: CartItem) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      if (packItem) {
        next.set(`${drugId}-pack`, {
          id: drugId,
          isUnit: false,
          originalQuantity: packItem.quantity,
          newQuantity: 0,
          deleted: true
        });
      }
      if (unitItem) {
        next.set(`${drugId}-unit`, {
          id: drugId,
          isUnit: true,
          originalQuantity: unitItem.quantity,
          newQuantity: 0,
          deleted: true
        });
      }
      return next;
    });
  }, []);

  // Handle restore item (undo delete)
  const handleRestoreFullItem = useCallback((drugId: string) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.delete(`${drugId}-pack`);
      next.delete(`${drugId}-unit`);
      return next;
    });
  }, []);

  // Handle discount change for an item
  const handleDiscountChange = useCallback((drugId: string, newDiscount: number) => {
    const saleItems = selectedSale?.items.filter(i => i.id === drugId) || [];
    const originalDiscount = saleItems[0]?.discount || 0;
    
    setPendingDiscountChanges(prev => {
      const next = new Map(prev);
      if (newDiscount === originalDiscount) {
        next.delete(drugId);
      } else {
        next.set(drugId, {
          id: drugId,
          originalDiscount,
          newDiscount: Math.min(100, Math.max(0, newDiscount))
        });
      }
      return next;
    });
  }, [selectedSale]);

  // Get current discount for an item (considering pending changes)
  const getItemDiscount = useCallback((drugId: string, originalDiscount: number): number => {
    const change = pendingDiscountChanges.get(drugId);
    return change ? change.newDiscount : originalDiscount;
  }, [pendingDiscountChanges]);

  // Check if there are pending changes
  const hasChanges = useMemo(() => pendingChanges.size > 0 || pendingDiscountChanges.size > 0, [pendingChanges, pendingDiscountChanges]);

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
                discount: discountChange ? discountChange.newDiscount : item.discount
              });
          } else {
              updatedItems.push({
                ...item,
                discount: discountChange ? discountChange.newDiscount : item.discount
              });
          }
      }

      // Pass 2: Handle NEW items (e.g. adding Pack to a Unit-only item)
      for (const [key, change] of pendingChanges.entries()) {
          if (processedKeys.has(key)) continue;
          if (change.deleted || change.newQuantity <= 0) continue;

          // Find a sibling item to clone common props from
          const sibling = selectedSale.items.find(i => i.id === change.id);
          if (sibling) {
               // Use getItemDiscount to get the potentially modified discount
               const discountToApply = getItemDiscount(change.id, sibling.discount || 0);
               updatedItems.push({
                   ...sibling,
                   isUnit: change.isUnit,
                   quantity: change.newQuantity,
                   discount: discountToApply,
                   // Clear batchAllocations - handleUpdateSale will allocate new stock
                   batchAllocations: undefined
               });
          }
      }
      
      // Step 1: Calculate subtotal
      const subtotal = updatedItems.reduce((sum, item) => {
        const unitsPerPack = item.unitsPerPack || 1;
        const basePrice = item.isUnit ? (item.price / unitsPerPack) : item.price;
        const itemPrice = basePrice * item.quantity;
        const afterItemDiscount = itemPrice * (1 - (item.discount || 0) / 100);
        return sum + afterItemDiscount;
      }, 0);
      
      // Step 2: Apply global discount (percentage on subtotal)
      const afterGlobalDiscount = subtotal * (1 - (selectedSale.globalDiscount || 0) / 100);
      
      // Step 3: Add delivery fee to get final total
      const finalTotal = afterGlobalDiscount + (selectedSale.deliveryFee || 0);
      
      onUpdateSale(selectedSale.id, { 
        items: updatedItems,
        subtotal: subtotal,
        total: finalTotal
      });
      
      // Reset edit state only after successful update
      setPendingChanges(new Map());
      setPendingDiscountChanges(new Map());
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save delivery order changes:', error);
      // TODO: Show error toast to user
    }
  }, [selectedSale, hasChanges, pendingChanges, pendingDiscountChanges, onUpdateSale]);

  // Handle discard changes
  const handleDiscardChanges = useCallback(() => {
    setPendingChanges(new Map());
    setPendingDiscountChanges(new Map());
    setIsEditMode(false);
  }, []);
  
  // Filter sales based on active tab
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.saleType !== 'delivery') return false;
      
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
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, activeTab]);

  const deliveryDrivers = useMemo(() => {
    return employees.filter(e => e.role === 'delivery');
  }, [employees]);

  const columnHelper = createColumnHelper<Sale>();

  const columns = useMemo(() => [
    // Order daily number (ID)
    columnHelper.accessor('customerCode', {
      header: 'ID',
      size: 60,
      meta: { align: 'start' }
    }),
    // Time and Date
    columnHelper.accessor('date', {
      header: t.time || 'Time',
      size: 120,
      meta: { align: 'center' }
    }),
    // Customer name and code badge
    columnHelper.accessor('customerName', {
      header: t.customer || 'Customer',
      size: 150,
      cell: info => {
        const name = info.getValue();
        const displayName = name === 'Guest Customer' ? (t.guestCustomer || name) : name;
        return (
          <div className="leading-tight">
            <span className="font-bold text-gray-900 dark:text-gray-100 block mb-1">{displayName}</span>
            {info.row.original.customerCode && (
                <span className="inline-block text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-mono font-bold leading-none border border-gray-200 dark:border-gray-700">
                    #{info.row.original.customerCode}
                </span>
            )}
          </div>
        );
      }
    }),
    // Customer address
    columnHelper.accessor('customerAddress', {
      header: t.address || 'Address',
      size: 200,
      cell: info => (
        <div className="text-xs whitespace-normal line-clamp-2" title={info.getValue()}>
             {info.row.original.customerStreetAddress && (
                 <div className="font-bold text-gray-900 dark:text-gray-100">{info.row.original.customerStreetAddress}</div>
             )}
             <div className="text-gray-400">{info.getValue() || '-'}</div>
        </div>
      )
    }),
    // Order total amount
    columnHelper.accessor('total', {
      header: t.total || 'Total',
      size: 100,
      cell: info => (
        <div className="flex flex-col items-start leading-tight">
          <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(info.getValue())}</span>
          {(info.row.original.globalDiscount || 0) > 0 && (
            <span className="text-[10px] text-red-500 font-medium">-{info.row.original.globalDiscount}%</span>
          )}
        </div>
      )
    }),
    // Delivery driver selection
    columnHelper.accessor('deliveryEmployeeId', {
      header: t.deliveryMan || 'Delivery Man',
      size: 180,
      cell: info => {
        const s = info.row.original;
        const isSelectDisabled = s.status === 'completed' || s.status === 'cancelled';
        
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DriverSelect 
               driverId={info.getValue()} 
               drivers={deliveryDrivers} 
               onSelect={(d) => onUpdateSale(s.id, { deliveryEmployeeId: d.id })}
               t={t}
               disabled={isSelectDisabled}
            />
          </div>
        );
      }
    }),
    // Action column for status changes
    columnHelper.display({
      id: 'actions',
      header: '',
      size: 220,
      meta: {
        align: 'end'
      },
      cell: info => {
        const s = info.row.original;
        
        return (
          <div className="flex gap-2 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
             {/* Start button (when order is pending) */}
             {s.status === 'pending' && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateSale(s.id, { status: 'with_delivery' }); }}
                    className="h-8 px-3 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors flex items-center justify-center whitespace-nowrap"
                 >
                    {t.start || 'Start'}
                 </button>
             )}
             {/* 'On Way' button */}
             {s.status === 'with_delivery' && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateSale(s.id, { status: 'on_way' }); }}
                    className="h-8 px-3 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-200 transition-colors flex items-center justify-center whitespace-nowrap"
                 >
                    {t.onWay || 'On Way'}
                 </button>
             )}
             {/* Complete button with Undo feature */}
             {s.status === 'on_way' && (
                 <div className="flex items-center gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateSale(s.id, { status: 'pending' }); }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Back to Pending"
                    >
                        <span className="material-symbols-rounded text-lg text-[18px]">undo</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateSale(s.id, { status: 'completed' }); }}
                        className="h-8 px-3 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors flex items-center justify-center whitespace-nowrap"
                    >
                        {t.complete || 'Complete'}
                    </button>
                 </div>
             )}
             {/* Cancel button (icon only) */}
             {(s.status === 'pending' || s.status === 'with_delivery' || s.status === 'on_way') && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateSale(s.id, { status: 'cancelled' }); }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors ml-1"
                    title={t.cancel || 'Cancel'}
                 >
                    <span className="material-symbols-rounded text-xl">block</span>
                 </button>
             )}
             {/* Final completed state (icon + text) */}
             {s.status === 'completed' && (
                 <div className="flex items-center gap-1 text-green-600 px-1" title={t.completed || 'Completed'}>
                    <span className="material-symbols-rounded text-xl">task_alt</span>
                    <span className="text-[10px] font-bold uppercase">{t.completed || 'Done'}</span>
                 </div>
             )}
             {/* Final cancelled state */}
             {s.status === 'cancelled' && (
                 <div className="flex items-center gap-1 text-red-600 px-1" title={t.cancelled || 'Cancelled'}>
                    <span className="material-symbols-rounded text-xl">cancel</span>
                    <span className="text-[10px] font-bold uppercase">{t.cancelled || 'Void'}</span>
                 </div>
             )}
          </div>
        )
      }
    })
  ], [t, deliveryDrivers, onUpdateSale, activeTab]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.deliveryOrders || 'Delivery Orders'}
      icon="local_shipping"
      size="6xl"
      width="max-w-7xl"
      headerActions={
        <div className="flex items-center gap-3">
           {/* Search Input */}
           <div className="w-64">
               <SearchInput
                  value={searchQuery}
                  onSearchChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  placeholder={t.searchOrder || "Search orders..."}
                  autoFocus={true}
               />
           </div>

           {/* Tabs */}
           <div className="min-w-[300px]">
               <SegmentedControl
                   options={[
                     { label: `${t.all || 'All'} (${sales.filter(s => s.saleType === 'delivery' && s.status !== 'completed' && s.status !== 'cancelled').length})`, value: 'all', icon: 'list' },
                      { label: `${t.pending || 'Pending'} (${sales.filter(s => s.status === 'pending' && s.saleType === 'delivery').length})`, value: 'pending', icon: 'pending' },
                     { label: `${t.active || 'Active'} (${sales.filter(s => (s.status === 'with_delivery' || s.status === 'on_way') && s.saleType === 'delivery').length})`, value: 'active', icon: 'local_shipping' },
                     { label: t.history || 'History', value: 'completed', icon: 'history' }
                   ]}
                   value={activeTab}
                   onChange={(val) => setActiveTab(val as DeliveryTab)}
                   size="sm"
                   variant="onCard"
                />
           </div>
        </div>
      }
      hideCloseButton={true}
    >
      <div className="flex flex-col h-[70vh]">
          
         {selectedSaleId && selectedSale ? (
             <div className="flex-1 flex flex-col overflow-hidden">
                 {/* Redesigned Header Layout - Single Row */}
                 <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                     {/* Left: Order Info */}
                     <div className="flex items-center gap-3">
                         <button 
                            onClick={() => setSelectedSaleId(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group flex-shrink-0"
                         >
                             <span className="material-symbols-rounded text-gray-500 group-hover:text-blue-600 transition-colors text-lg">arrow_back</span>
                         </button>
                         <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2 flex-wrap">
                                 <span className="text-2xl font-bold font-mono">#{selectedSale.customerCode || '-'}</span>
                                 <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                                     selectedSale.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50' :
                                     selectedSale.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50' :
                                     'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50'
                                 }`}>
                                     <span className="material-symbols-rounded text-sm">
                                         {selectedSale.status === 'completed' ? 'task_alt' :
                                          selectedSale.status === 'cancelled' ? 'cancel' :
                                          selectedSale.status === 'on_way' ? 'local_shipping' :
                                          selectedSale.status === 'with_delivery' ? 'delivery_dining' : 'pending'}
                                     </span>
                                     <span>{t[selectedSale.status] || selectedSale.status}</span>
                                 </div>
                             </div>
                             <div className="flex items-center gap-2 text-sm text-gray-500">
                                 <span className="font-medium text-gray-900 dark:text-gray-100">{selectedSale.customerName}</span>
                                 {selectedSale.customerCode && <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0 rounded text-[10px] font-mono border border-gray-200 dark:border-gray-700">#{selectedSale.customerCode}</span>}
                                 {selectedSale.customerPhone && <span className="text-xs text-gray-400" dir="ltr">({selectedSale.customerPhone})</span>}
                             </div>
                         </div>
                     </div>

                     {/* Right: Actions (Tabs + Edit / Login Warning) */}
                     <div className="flex items-center gap-3">
                        {/* Navigation Tabs */}
                        {(() => {
                           const tabOptions = [
                              { 
                                 label: t.orderItems || 'Items', 
                                 value: 'items', 
                                 icon: 'shopping_cart', 
                                 count: selectedSale.items.length 
                              }
                           ];
                           
                           if (selectedSale.modificationHistory && selectedSale.modificationHistory.length > 0) {
                              tabOptions.push({
                                 label: t.history || 'History',
                                 value: 'history',
                                 icon: 'history',
                                 count: selectedSale.modificationHistory.length,
                                 activeColor: 'orange' 
                              } as any);
                           }
                           
                           return (
                              <SegmentedControl
                                 options={tabOptions}
                                 value={activeSubTab}
                                 onChange={(val) => setActiveSubTab(val as 'items' | 'history')}
                                 size="sm"
                                 variant="onCard"
                                 fullWidth={false}
                              />
                           );
                        })()}


                         
                         {!currentEmployeeId && selectedSale && selectedSale.status !== 'completed' && selectedSale.status !== 'cancelled' && (
                            <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl border border-red-100 dark:border-red-900/30 animate-pulse h-[42px]">
                               <span className="material-symbols-rounded text-sm">lock</span>
                               {t.loginToEdit || 'Login to edit'}
                            </span>
                         )}
                     </div>
                 </div>

                 {/* Content Area */}
                 <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar" dir="ltr">
                     {activeSubTab === 'items' ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {(() => {
                                // Group items by ID
                                const mergedItems = selectedSale.items.reduce((acc, item) => {
                                    if (!acc[item.id]) {
                                        acc[item.id] = { 
                                            common: item, 
                                            packItem: undefined, 
                                            unitItem: undefined 
                                        };
                                    }
                                    if (item.isUnit) {
                                        acc[item.id].unitItem = item;
                                    } else {
                                        acc[item.id].packItem = item;
                                    }
                                    return acc;
                                }, {} as Record<string, { common: CartItem, packItem?: CartItem, unitItem?: CartItem }>);

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
                                    const packDeleted = packItem ? pendingChanges.get(`${packItem.id}-pack`)?.deleted : false;
                                    const unitDeleted = unitItem ? pendingChanges.get(`${unitItem.id}-unit`)?.deleted : false;
                                    
                                    // Check for changes to highlight (Moved up to fix scoping error)
                                    const hasPackChange = packQty !== (packItem?.quantity || 0);
                                    const hasUnitChange = unitQty !== (unitItem?.quantity || 0);
                                    const hasChange = hasPackChange || hasUnitChange;
                                    
                                    // Item is considered fully deleted if all its existing components are marked deleted
                                    // OR if the resulting quantities are both zero (which happens if deleted via handleQuantityChange 0)
                                    const isDeleted = (packItem ? packDeleted : true) && (unitItem ? unitDeleted : true) 
                                                      || (packQty === 0 && unitQty === 0 && !hasPackChange && !hasUnitChange);
                                                      // Added !hasChanges check to ensure we don't treat a newly added 0 as deleted (though 0 usually means deleted)
                                                      // Actually if packQty=0 and unitQty=0, it IS effectively deleted.

                                    // Display Price Calculation
                                    const unitsPerPack = common.unitsPerPack || 1;
                                    const packPrice = common.price;
                                    const unitPrice = common.price / unitsPerPack;
                                    const totalPrice = (packQty * packPrice) + (unitQty * unitPrice);

                                    const hasDualMode = unitsPerPack > 1;

                                    return (
                                    <MaterialTabs 
                                       key={`${common.id}-${idx}`}
                                       index={rowIdx} 
                                       total={rowCount}
                                       color={isDeleted ? 'red' : hasChange ? 'orange' : 'blue'}
                                       isSelected={false}
                                       className={`!h-auto py-3 ${isDeleted ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-center justify-between w-full" dir="ltr">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col text-left">
                                                    <span className={`font-bold text-sm ${isDeleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                       {getDisplayName(common)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500">{common.genericName}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                {/* Quantity Controls / Display - "Split Pill" Design (Cloned from SortableCartItem) */}
                                                {isEditMode && !isDeleted ? (
                                                   /* EXACT STYLE FROM SortableCartItem.tsx */
                                                   <div className="flex items-center bg-white dark:bg-gray-900 rounded-lg border shadow-sm h-6 overflow-hidden transition-colors w-[4.5rem] border-gray-200 dark:border-gray-700">
                                                        {/* Pack Input */}
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder={hasDualMode ? "P" : "1"}
                                                            value={packQty === 0 ? '' : packQty}
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                                if (isNaN(val)) return;
                                                                // Use common as target if packItem missing (e.g. adding pack to unit-only)
                                                                const targetItem = packItem || common;
                                                                // Delta MUST be calculated against CURRENT DISPLAYED QTY (packQty), not original
                                                                if(targetItem) handleQuantityChange(targetItem, false, val - packQty);
                                                            }}
                                                            className={`h-full text-center bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-gray-300 font-bold text-[10px] text-gray-900 dark:text-gray-100 shrink-0 min-w-0 ${hasDualMode ? 'w-1/2' : 'w-full'}`}
                                                        />
                                                        
                                                        {/* Separator */}
                                                        {hasDualMode && (
                                                            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                                                        )}
                                                        
                                                        {/* Unit Input - Only if Dual Mode */}
                                                        {hasDualMode && (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                placeholder="U"
                                                                value={unitQty === 0 ? '' : unitQty}
                                                                onChange={(e) => {
                                                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                                    if (isNaN(val)) return;
                                                                    const targetItem = unitItem || common;
                                                                    // Delta MUST be calculated against CURRENT DISPLAYED QTY (unitQty)
                                                                    if(targetItem) handleQuantityChange(targetItem, true, val - unitQty);
                                                                }}
                                                                className="h-full w-1/2 text-center bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-blue-200 font-bold text-[10px] text-blue-600 dark:text-blue-400 shrink-0 min-w-0"
                                                            />
                                                        )}
                                                   </div>
                                                 ) : (
                                                    /* View Mode - Static Split Pill (Matching exact dimensions) */
                                                    <div className="flex items-center justify-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 h-6 overflow-hidden shadow-sm w-[4.5rem]">
                                                       {hasDualMode ? (
                                                           <div className="flex items-center gap-0 w-full">
                                                               <span className={`flex-1 text-center font-bold text-[10px] ${packQty > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-300 dark:text-gray-600'}`}>
                                                                   {packQty}
                                                               </span>
                                                               <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                                                               <span className={`flex-1 text-center font-bold text-[10px] ${unitQty > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-blue-200 dark:text-blue-900/40'}`}>
                                                                   {unitQty === 0 && unitQty !== undefined ? 'U' : unitQty}
                                                               </span>
                                                           </div>
                                                       ) : (
                                                           <span className="font-bold text-[10px] text-gray-900 dark:text-gray-100">{packQty}</span>
                                                       )}
                                                    </div>
                                                 )}
                                                
                                                {/* Discount Control - Edit Mode Only */}
                                                {isEditMode && !isDeleted && (() => {
                                                    const drug = inventory.find(d => d.id === common.id);
                                                    const cost = drug?.costPrice || 0;
                                                    const price = common.price || 0;
                                                    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
                                                    let calculatedMax = 10;
                                                    if (margin < 20) calculatedMax = Math.floor(margin / 2);
                                                    const effectiveMax = (drug?.maxDiscount && drug.maxDiscount > 0) ? drug.maxDiscount : calculatedMax;
                                                    const currentDiscount = getItemDiscount(common.id, common.discount || 0);
                                                    
                                                    return (
                                                        <div
                                                            title={`Max: ${effectiveMax}%`}
                                                            className={`flex items-center rounded-lg border shadow-sm h-6 overflow-hidden transition-colors w-14 shrink-0 ${
                                                                currentDiscount > 0
                                                                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                                                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                                                            }`}
                                                        >
                                                            <button
                                                                onClick={() => {
                                                                    const newVal = currentDiscount === 0 ? effectiveMax : 0;
                                                                    handleDiscountChange(common.id, newVal);
                                                                }}
                                                                className={`w-6 h-full flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 ${
                                                                    currentDiscount > 0
                                                                        ? "text-green-600 dark:text-green-400"
                                                                        : "text-gray-400"
                                                                }`}
                                                            >
                                                                <span className="material-symbols-rounded text-[12px]">percent</span>
                                                            </button>
                                                            <input
                                                                type="number"
                                                                value={currentDiscount || ""}
                                                                placeholder="0"
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    let finalVal = !isNaN(val) && val >= 0 ? val : 0;
                                                                    if (finalVal > effectiveMax) finalVal = effectiveMax;
                                                                    handleDiscountChange(common.id, finalVal);
                                                                }}
                                                                className={`w-8 min-w-0 h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                                    currentDiscount > 0
                                                                        ? "text-green-700 dark:text-green-300 placeholder-green-300"
                                                                        : "text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                                                }`}
                                                            />
                                                        </div>
                                                    );
                                                })()}

                                                {/* Price Display */}
                                                <div className="flex flex-col items-end min-w-[70px]">
                                                    <span className="text-xs text-gray-400 uppercase tracking-wider text-[10px]">{t.price || 'Price'}</span>
                                                    <span className="font-bold text-green-600 text-sm">
                                                       {formatCurrency(totalPrice * (1 - (getItemDiscount(common.id, common.discount || 0)) / 100))}
                                                    </span>
                                                </div>
                                                
                                                {/* Delete/Restore Button */}
                                                {isEditMode && (
                                                   isDeleted ? (
                                                      <button
                                                         onClick={() => handleRestoreFullItem(common.id)}
                                                         className="w-8 h-8 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                                                         title={t.restore || 'Restore'}
                                                      >
                                                         <span className="material-symbols-rounded">undo</span>
                                                      </button>
                                                   ) : (
                                                      <button
                                                         onClick={() => handleDeleteFullItem(common.id, packItem, unitItem)}
                                                         className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                         title={t.delete || 'Delete'}
                                                      >
                                                         <span className="material-symbols-rounded">delete</span>
                                                      </button>
                                                   )
                                                )}
                                            </div>
                                        </div>
                                    </MaterialTabs>
                                    );
                                });
                            })()}
                        </div>
                     ) : (
                        /* Modification History View */
                        /* Modification History View */
                        <div className="relative pl-6 space-y-2 py-2" dir="ltr">
                           {/* Vertical Timeline Rail */}
                           <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800 z-0"></div>

                           {selectedSale.modificationHistory?.slice().reverse().map((record, idx) => {
                               const isExpanded = expandedHistoryRecordId === record.id;
                               const date = new Date(record.timestamp);
                               const timeStr = date.toLocaleString(language === 'AR' ? 'ar-EG' : 'en-US', {
                                  hour: 'numeric',
                                  minute: 'numeric',
                                  hour12: true
                               });
                               
                               // Calculate relative time
                               const getRelativeTime = (d: Date) => {
                                  const now = new Date();
                                  const diff = now.getTime() - d.getTime();
                                  const mins = Math.floor(diff / 60000);
                                  const hours = Math.floor(mins / 60);
                                  const days = Math.floor(hours / 24);

                                  if (mins < 1) return t.justNow || 'Just now';
                                  if (mins < 60) return language === 'AR' ? `${t.ago || 'منذ'} ${mins} د` : `${mins}m ${t.ago || 'ago'}`;
                                  if (hours < 24) return language === 'AR' ? `${t.ago || 'منذ'} ${hours} س` : `${hours}h ${t.ago || 'ago'}`;
                                  return date.toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' });
                               };

                               const hasDeletions = record.modifications.some(m => m.type === 'item_removed');
                               const nodeColor = hasDeletions ? 'red' : 'orange';

                               return (
                                  <div key={record.id} className="relative z-10">
                                     {/* Timeline Node */}
                                     <div className={`absolute -left-[18px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm transition-all duration-300 ${
                                        isExpanded 
                                           ? (hasDeletions ? 'bg-red-500 scale-110' : 'bg-orange-500 scale-125') 
                                           : (hasDeletions ? 'bg-red-300' : 'bg-orange-300')
                                     }`}></div>

                                        <MaterialTabs 
                                        index={idx} 
                                        total={selectedSale.modificationHistory?.length || 0}
                                        className={`!h-auto py-3 transition-all duration-300 ${isExpanded ? 'bg-[#F3F4F6] dark:bg-blue-950/20 dark:ring-1 dark:ring-blue-900/40 shadow-sm' : 'hover:bg-gray-100/50 dark:hover:bg-white/10'}`}
                                        onClick={() => setExpandedHistoryRecordId(isExpanded ? null : record.id)}
                                     >
                                        <div className="flex flex-col w-full">
                                           {/* Collapsed Timeline Summary */}
                                           <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${!isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                              <div className="overflow-hidden min-h-0">
                                                 <div className="flex items-center justify-between w-full gap-4">
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                       <div className="flex items-center gap-2">
                                                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                             {getRelativeTime(date)}
                                                          </span>
                                                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                                             {record.modifications.length} {record.modifications.length === 1 ? (t.modification || 'Change') : (t.modifications || 'Changes')}
                                                          </span>
                                                       </div>
                                                       <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 flex-wrap">
                                                          {record.modifications.map((m, mIdx) => {
                                                              const drug = inventory.find(d => d.id === m.itemId);
                                                              const displayName = getDisplayName({ name: m.itemName, dosageForm: m.dosageForm || drug?.dosageForm });
                                                              return (
                                                                  <span key={mIdx} className="whitespace-nowrap flex items-center">
                                                                      {displayName}
                                                                      {mIdx < record.modifications.length - 1 && (
                                                                         <span className="mx-1 opacity-50">|</span>
                                                                      )}
                                                                  </span>
                                                              );
                                                           })}
                                                       </div>
                                                    </div>
   
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                       {record.modifications.some(m => m.type === 'item_removed') && (
                                                          <span className="material-symbols-rounded text-xl text-red-500" title={t.deleted || 'Deleted'}>delete</span>
                                                       )}
                                                       {record.modifiedBy && (
                                                          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hidden sm:flex">
                                                             <span>{record.modifiedBy}</span>
                                                             <span className="material-symbols-rounded text-base">account_circle</span>
                                                          </div>
                                                       )}
                                                       <span className="material-symbols-rounded text-gray-300 group-hover:text-blue-500 transition-transform duration-300 rotate-0">expand_more</span>
                                                    </div>
                                                 </div>
                                              </div>
                                           </div>

                                           {/* Expanded Timeline Detail */}
                                           <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                              <div className="overflow-hidden min-h-0">
                                                 <div className="space-y-4 pt-1">
                                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                                                       <div className="flex flex-col">
                                                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{timeStr}</span>
                                                          <span className="text-[10px] text-gray-500 uppercase tracking-widest">{date.toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                                       </div>
                                                       <div className="flex items-center gap-3">
                                                          {record.modifiedBy && (
                                                             <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                                {record.modifiedBy}
                                                                <span className="material-symbols-rounded text-base">account_circle</span>
                                                             </div>
                                                          )}
                                                          <span className="material-symbols-rounded text-gray-400 transition-transform duration-300 rotate-180">expand_more</span>
                                                       </div>
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                       {record.modifications.map((mod, modIdx) => {
                                                          const isIncrease = mod.newQuantity > mod.previousQuantity;
                                                          const isDeletion = mod.type === 'item_removed';
                                                          
                                                          return (
                                                             <div key={modIdx} className="flex items-center gap-3 py-1">
                                                                <span className={`flex-shrink-0 ${
                                                                   isDeletion ? 'text-red-500' : 
                                                                   isIncrease ? 'text-green-500' : 'text-orange-500'
                                                                }`}>
                                                                   <span className="material-symbols-rounded text-lg">
                                                                      {isDeletion ? 'delete' : 'edit_square'}
                                                                   </span>
                                                                </span>
                                                                
                                                                <div className="flex items-center justify-between flex-1 min-w-0 gap-4">
                                                                   <span className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{(() => {
                                                                          const drug = inventory.find(d => d.id === mod.itemId);
                                                                          return getDisplayName({ name: mod.itemName, dosageForm: mod.dosageForm || drug?.dosageForm });
                                                                       })()}</span>
                                                                   <div className="flex items-center gap-2 ml-8 flex-shrink-0">
                                                                      {isDeletion ? (
                                                                         <span className="text-red-500 font-bold text-xs">
                                                                            {t.deleted || 'Deleted'} {mod.previousQuantity}
                                                                         </span>
                                                                      ) : (
                                                                         <div className={`flex items-center gap-1.5 font-bold text-xs ${
                                                                            isIncrease ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                                                                         }`}>
                                                                            <span>{mod.previousQuantity}</span>
                                                                            <span className="material-symbols-rounded text-sm opacity-50">
                                                                               arrow_forward
                                                                            </span>
                                                                            <span>{mod.newQuantity}</span>
                                                                         </div>
                                                                      )}
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

                 {/* Edit Mode Actions */}
                 {isEditMode && (
                    <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                       <button
                          onClick={handleDiscardChanges}
                          className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                       >
                          {t.discard || 'Discard'}
                       </button>
                       <button
                          onClick={handleSaveChanges}
                          disabled={!hasChanges}
                          className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
                       >
                          {t.saveChanges || 'Save Changes'}
                       </button>
                    </div>
                 )}
             </div>
         ) : (
             /* Table View */
             <div className="flex-1 overflow-hidden">
                <TanStackTable
                   data={filteredSales}
                   columns={columns}
                   enableSearch={false} 
                   enableTopToolbar={false}
                   globalFilter={searchQuery}
                   searchPlaceholder={t.searchOrder || "Search orders..."}
                   emptyMessage={t.noOrders || "No delivery orders found"}
                   onRowClick={(row) => setSelectedSaleId(row.id)}
                   lite={true}
                />
             </div>
         )}

         {/* Footer Summary */}
         <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
             <span>{t.totalPending || 'Total Pending Value'}: <strong>{formatCurrency(sales.filter(s => s.status === 'pending' && s.saleType === 'delivery').reduce((sum, s) => sum + s.total, 0))}</strong></span>
             
             <div className="flex items-center gap-3">
                 {canEdit && !isEditMode && selectedSaleId && selectedSale && (
                    <button
                       onClick={() => setIsEditMode(true)}
                       className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                    >
                       {t.editOrder || 'Edit Order'}
                    </button>
                 )}
                 <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
                >
                    {t.close || 'Close'}
                </button>
             </div>
         </div>
      </div>
    </Modal>
  );
};
