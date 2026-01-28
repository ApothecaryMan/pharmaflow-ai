import React, { useState, useMemo } from 'react';
import { SegmentedControl } from '../common/SegmentedControl';
import { useContextMenu } from '../common/ContextMenu';
import { PurchaseReturn, PurchaseReturnItem, Purchase, Drug } from '../../types';
import { useSmartDirection } from '../common/SmartInputs';
import { Modal } from '../common/Modal';
import { TanStackTable } from '../common/TanStackTable';
import { ColumnDef } from '@tanstack/react-table';
import { SearchInput } from '../common/SearchInput';
import { CARD_BASE } from '../../utils/themeStyles';
import { getDisplayName } from '../../utils/drugDisplayName';

interface PurchaseReturnsProps {
  purchases: Purchase[];
  purchaseReturns: PurchaseReturn[];
  setPurchaseReturns: (returns: PurchaseReturn[]) => void;
  drugs: Drug[];
  setDrugs: (drugs: Drug[]) => void;
  color: string;
  t: any;
  language: 'EN' | 'AR';
  onCreatePurchaseReturn?: (ret: PurchaseReturn) => Promise<void>;
}

export const PurchaseReturns: React.FC<PurchaseReturnsProps> = ({ 
  purchases, 
  purchaseReturns, 
  setPurchaseReturns,
  drugs,
  setDrugs,
  color, 
  t, 
  language,
  onCreatePurchaseReturn
}) => {
  const { showMenu } = useContextMenu();
  const [mode, setMode] = useState<'create' | 'history'>('create');
  const [search, setSearch] = useState('');
  const searchDir = useSmartDirection(search, t.purchaseReturns?.searchPlaceholder || 'Search returns...');

  // Create Return state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [returnItems, setReturnItems] = useState<PurchaseReturnItem[]>([]);
  const [notes, setNotes] = useState('');
  const notesDir = useSmartDirection(notes, t.purchaseReturns?.notesPlaceholder || 'Add any additional notes about this return...');
  
  // Track item-specific form data (quantity, reason, condition for each item)
  const [itemFormData, setItemFormData] = useState<Record<string, { quantity: number; reason: PurchaseReturnItem['reason']; condition: PurchaseReturnItem['condition'] }>>({});

  // Details modal state
  const [viewingReturn, setViewingReturn] = useState<PurchaseReturn | null>(null);



  // Helper: Get row context menu actions
  const getRowActions = (returnRecord: PurchaseReturn) => [
    { label: t.purchaseReturns?.contextMenu?.viewDetails || 'View Details', icon: 'visibility', action: () => handleViewDetails(returnRecord) }
  ];

  // Table columns definition
  const columns = useMemo<ColumnDef<PurchaseReturn>[]>(() => [
    {
      accessorKey: 'id',
      header: t.purchaseReturns?.tableHeaders?.id || 'Return ID',
      size: 100,
      meta: { align: 'start' },
      cell: ({ getValue }) => <span className="text-xs font-mono text-gray-500 truncate">{getValue() as string}</span>
    },
    {
      accessorKey: 'date',
      header: t.purchaseReturns?.tableHeaders?.date || 'Date',
      size: 120,
      meta: { align: 'start' },
      cell: ({ getValue }) => <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{new Date(getValue() as string).toLocaleDateString()}</span>
    },
    {
      accessorKey: 'purchaseId',
      header: t.purchaseReturns?.tableHeaders?.purchaseId || 'Purchase ID',
      size: 120,
      meta: { align: 'start' },
      cell: ({ getValue }) => <span className="text-xs font-mono text-gray-500 truncate">{getValue() as string}</span>
    },
    {
      accessorKey: 'supplierName',
      header: t.purchaseReturns?.tableHeaders?.supplier || 'Supplier',
      size: 180,
      meta: { align: 'start' },
      cell: ({ getValue }) => <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{getValue() as string}</span>
    },
    {
      accessorKey: 'totalRefund',
      header: t.purchaseReturns?.tableHeaders?.refund || 'Total Refund',
      size: 130,
      meta: { align: 'end' },
      cell: ({ getValue }) => <span className="text-sm font-bold text-red-600 dark:text-red-400 truncate">${(getValue() as number).toFixed(2)}</span>
    },
    {
      accessorKey: 'status',
      header: t.purchaseReturns?.tableHeaders?.status || 'Status',
      size: 120,
      meta: { align: 'center' },
      cell: ({ getValue }) => {
        const val = getValue() as string;
        const style = 
           val === 'completed' ? { color: 'emerald', icon: 'check_circle' } :
           val === 'approved' ? { color: 'blue', icon: 'verified' } :
           { color: 'amber', icon: 'hourglass_top' };

        return (
          <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border bg-transparent border-${style.color}-200 dark:border-${style.color}-900/50 text-${style.color}-700 dark:text-${style.color}-400 text-xs font-bold uppercase tracking-wider`}>
            <span className="material-symbols-rounded text-sm">{style.icon}</span>
            {t.purchaseReturns?.status?.[val] || val}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: t.purchaseReturns?.tableHeaders?.action || 'Action',
      size: 80,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            showMenu(e.clientX, e.clientY, getRowActions(row.original));
          }}
          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors outline-none"
          title="Actions"
        >
          <span className="material-symbols-rounded text-[20px]">more_vert</span>
        </button>
      )
    }
  ], [t, getRowActions]); // getRowActions is stable component reference but we just in case include it


  // Add item to return
  const handleAddReturnItem = (drugId: string, quantity: number, reason: PurchaseReturnItem['reason'], condition: PurchaseReturnItem['condition']) => {
    if (!selectedPurchase) return;
    
    const purchaseItem = selectedPurchase.items.find(item => item.drugId === drugId);
    if (!purchaseItem) return;

    // Check if item with same drugId, reason, AND condition already exists
    const existingItemIndex = returnItems.findIndex(item => 
      item.drugId === drugId && 
      item.reason === reason && 
      item.condition === condition
    );
    
    if (existingItemIndex >= 0) {
      // Update existing item - merge quantities only if reason and condition match
      setReturnItems(prev => prev.map((item, index) => {
        if (index === existingItemIndex) {
          const newQuantity = item.quantityReturned + quantity;
          return {
            ...item,
            quantityReturned: newQuantity,
            refundAmount: newQuantity * item.costPrice
          };
        }
        return item;
      }));
    } else {
      // Add new item (different reason/condition = separate entry)
      const refundAmount = quantity * purchaseItem.costPrice;
      
      const newItem: PurchaseReturnItem = {
        drugId,
        name: purchaseItem.name,
        quantityReturned: quantity,
        costPrice: purchaseItem.costPrice,
        refundAmount,
        dosageForm: purchaseItem.dosageForm,
        reason,
        condition
      };

      setReturnItems(prev => [...prev, newItem]);
    }
  };

  // Remove item from return
  const handleRemoveReturnItem = (index: number) => {
    setReturnItems(prev => prev.filter((_, i) => i !== index));
  };

  // Submit return
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase || returnItems.length === 0) {
      alert(t.purchaseReturns?.messages?.selectPurchaseAlert || 'Please select a purchase and add items to return');
      return;
    }

    const totalRefund = returnItems.reduce((sum, item) => sum + item.refundAmount, 0);
    const nextId = (purchaseReturns.length + 1).toString().padStart(3, '0');

    const newReturn: PurchaseReturn = {
      id: nextId,
      purchaseId: selectedPurchase.id,
      supplierId: selectedPurchase.supplierId,
      supplierName: selectedPurchase.supplierName,
      date: new Date().toISOString(),
      items: returnItems,
      totalRefund,
      status: 'pending',
      notes
    };

    if (onCreatePurchaseReturn) {
        await onCreatePurchaseReturn(newReturn);
    } else {
        // Fallback (should not happen if wired correctly)
        console.error("onCreatePurchaseReturn prop likely missing");
        setPurchaseReturns([...purchaseReturns, newReturn]);
    }
    
    // Reset form
    setSelectedPurchase(null);
    setReturnItems([]);
    setNotes('');
    setItemFormData({});
    setIsCreateModalOpen(false);
  };

  // View details
  const handleViewDetails = (returnRecord: PurchaseReturn) => {
    setViewingReturn(returnRecord);
  };

  // Return all items from purchase
  const handleReturnAll = () => {
    if (!selectedPurchase) return;
    
    const allItems: PurchaseReturnItem[] = selectedPurchase.items
      .filter(item => {
        const returned = getReturnedQuantity(selectedPurchase.id, item.drugId);
        return item.quantity > returned;
      })
      .map(item => {
        const returned = getReturnedQuantity(selectedPurchase.id, item.drugId);
        const availableQty = item.quantity - returned;
        return {
          drugId: item.drugId,
          name: item.name,
          quantityReturned: availableQty,
          costPrice: item.costPrice,
          refundAmount: availableQty * item.costPrice,
          dosageForm: item.dosageForm,
          reason: 'other' as const,
          condition: 'other' as const
        };
      });
    
    setReturnItems(allItems);
  };

  // Helper: Get total returned quantity for an item
  const getReturnedQuantity = (purchaseId: string, drugId: string): number => {
    return purchaseReturns
      .filter(r => r.purchaseId === purchaseId)
      .reduce((sum, r) => {
        const item = r.items.find(i => i.drugId === drugId);
        return sum + (item?.quantityReturned || 0);
      }, 0);
  };

  // Get available purchases (not fully returned)
  const availablePurchases = purchases.filter(p => {
    if (p.status !== 'completed') return false;
    
    // Check if all items are fully returned
    const allReturned = p.items.every(item => {
      const returned = getReturnedQuantity(p.id, item.drugId);
      return returned >= item.quantity;
    });
    
    return !allReturned;
  });





  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in p-4 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight type-expressive">{t.purchaseReturns?.returnHistory || 'Return History'}</h2>
          <p className="text-sm text-gray-500">{t.purchaseReturns?.historySubtitle || 'View all purchase returns'}</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-${color}-600 hover:bg-${color}-700 text-white font-bold shadow-lg shadow-${color}-200 dark:shadow-none transition-all active:scale-95`}
        >
          <span className="material-symbols-rounded text-[20px]">add_circle</span>
          {t.purchaseReturns?.createReturn || 'Create Return'}
        </button>
      </div>

      {/* RETURN HISTORY TABLE (Always visible now) */}
      <div className="flex-shrink-0">
        <SearchInput
            value={search}
            onSearchChange={setSearch}
            placeholder={t.purchaseReturns?.searchPlaceholder || 'Search returns...'}
            wrapperClassName="w-96"
            className="p-3 rounded-xl border-gray-200 dark:border-gray-700"
            style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
          />
      </div>

      <div className={`flex-1 overflow-hidden ${CARD_BASE} rounded-xl p-0 flex flex-col`}>
          <TanStackTable
            data={purchaseReturns}
            columns={columns}
            tableId="purchase_returns_history"
            globalFilter={search}
            onSearchChange={setSearch}
            enableTopToolbar={false}
            searchPlaceholder={t.purchaseReturns?.searchPlaceholder || 'Search returns...'}
            onRowClick={(row) => handleViewDetails(row)}
            onRowContextMenu={(e, row) => showMenu(e.clientX, e.clientY, getRowActions(row))}
            color={color}
          />
      </div>

      {/* CREATE RETURN MODAL */}
      {isCreateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedPurchase(null);
            setReturnItems([]);
            setNotes('');
          }}
          size="2xl"
          zIndex={50}
          title={t.purchaseReturns?.createReturn || 'Create Return'}
          icon="add_circle"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setSelectedPurchase(null);
                  setReturnItems([]);
                  setNotes('');
                }}
                className="px-6 py-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm font-medium"
              >
                {t.modal?.cancel || 'Cancel'}
              </button>
              <button
                onClick={(e) => handleSubmitReturn(e as any)}
                disabled={returnItems.length === 0}
                className={`px-8 py-3 rounded-xl shadow-lg transition-all font-bold flex items-center gap-2 ${
                  returnItems.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : `bg-${color}-600 hover:bg-${color}-700 text-white`
                }`}
              >
                <span className="material-symbols-rounded">check_circle</span>
                {t.purchaseReturns?.submit || 'Submit Return'}
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Purchase Selection */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                <span className="material-symbols-rounded text-[18px]">receipt_long</span>
                {t.purchaseReturns?.selectPurchase || 'Select Purchase Order'}
              </h3>
              <select
                value={selectedPurchase?.id || ''}
                onChange={(e) => {
                  const purchase = purchases.find(p => p.id === e.target.value);
                  setSelectedPurchase(purchase || null);
                  setReturnItems([]);
                  setItemFormData({});
                }}
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all"
                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                required
              >
                <option value="">{t.purchaseReturns?.selectPlaceholder || 'Select a purchase order...'}</option>
                {availablePurchases.map(purchase => (
                  <option key={purchase.id} value={purchase.id}>
                    PO #{purchase.id} - {purchase.supplierName} - ${purchase.totalCost.toFixed(2)} ({new Date(purchase.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
              
              {selectedPurchase && (
                <button
                  type="button"
                  onClick={handleReturnAll}
                  className={`mt-3 w-full px-4 py-2 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 hover:bg-${color}-200 dark:hover:bg-${color}-900/50 text-sm font-bold transition-colors flex items-center justify-center gap-2`}
                >
                  <span className="material-symbols-rounded text-[18px]">assignment_return</span>
                  {t.purchaseReturns?.returnAll || 'Return All Items from This Purchase'}
                </button>
              )}
            </div>

            {/* Return Items (Redesigned as Card List) */}
            {selectedPurchase && returnItems.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                  <span className="material-symbols-rounded text-[18px]">inventory_2</span>
                  {t.purchaseReturns?.itemsToReturn || 'Items to Return'}
                </h3>
                
                <div className="space-y-2">
                  {returnItems.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center group hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm mb-1 truncate">
                          {getDisplayName({ ...item, dosageForm: item.dosageForm || drugs.find(d => d.id === item.drugId)?.dosageForm })}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="opacity-70">{t.purchaseReturns?.quantity || 'Qty'}:</span> {item.quantityReturned} <span className="mx-1 opacity-30">|</span> 
                          <span className="opacity-70">{t.purchaseReturns?.reason || 'Reason'}:</span> {t.purchaseReturns?.reasons?.[item.reason] || item.reason} <span className="mx-1 opacity-30">|</span> 
                          <span className="opacity-70">{t.purchaseReturns?.condition || 'Cond'}:</span> {t.purchaseReturns?.conditions?.[item.condition] || item.condition}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-red-600 text-sm">${item.refundAmount.toFixed(2)}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveReturnItem(index)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        >
                          <span className="material-symbols-rounded text-[20px]">delete_sweep</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center p-3 rounded-xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 mt-4 shadow-sm">
                    <span className="text-sm text-gray-500 font-medium">{t.purchaseReturns?.totalRefund || 'Total Refund'}</span>
                    <span className="text-xl font-black text-red-600">${returnItems.reduce((sum, item) => sum + item.refundAmount, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}


            {/* Available Items from Purchase */}
            {selectedPurchase && (
              <div>
                <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 h-4 flex items-center gap-2">
                   <div className="h-[2px] w-6 bg-gray-200 dark:bg-gray-800 rounded-full" />
                   {t.purchaseReturns?.availableItems || 'Available Items from Purchase Order'}
                </h3>
                <div className="space-y-3">
                  {selectedPurchase.items
                    .filter(item => {
                      const returned = getReturnedQuantity(selectedPurchase.id, item.drugId);
                      const alreadyInReturn = returnItems
                        .filter(ri => ri.drugId === item.drugId)
                        .reduce((sum, ri) => sum + ri.quantityReturned, 0);
                      const available = item.quantity - returned - alreadyInReturn;
                      return available > 0;
                    })
                    .map((purchaseItem, index) => {
                      const itemKey = purchaseItem.drugId;
                      const returnedQty = getReturnedQuantity(selectedPurchase.id, itemKey);
                      const alreadyInReturn = returnItems
                        .filter(ri => ri.drugId === itemKey)
                        .reduce((sum, ri) => sum + ri.quantityReturned, 0);
                      const availableQty = purchaseItem.quantity - returnedQty - alreadyInReturn;
                      const formData = itemFormData[itemKey] || { quantity: 1, reason: 'damaged' as const, condition: 'damaged' as const };
                      
                      const updateItemFormData = (updates: Partial<typeof formData>) => {
                        setItemFormData(prev => ({
                          ...prev,
                          [itemKey]: { ...formData, ...updates }
                        }));
                      };
                      
                      return (
                        <div key={index} className="p-4 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm group hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                          <div className="flex items-start justify-between mb-3 min-w-0">
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-gray-900 dark:text-white text-base truncate">{getDisplayName(purchaseItem)}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500`}>
                                   {t.purchaseReturns?.available || 'Avail'}: {availableQty}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                   ${purchaseItem.costPrice.toFixed(2)}/{t.purchaseReturns?.pack || 'pk'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">{t.purchaseReturns?.quantity || 'Quantity'}</label>
                              <input
                                type="number"
                                min="1"
                                max={availableQty}
                                value={formData.quantity}
                                onChange={(e) => updateItemFormData({ quantity: Math.min(availableQty, Math.max(1, parseInt(e.target.value) || 1)) })}
                                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                              />
                            </div>
                            
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">{t.purchaseReturns?.reason || 'Reason'}</label>
                              <select
                                value={formData.reason}
                                onChange={(e) => updateItemFormData({ reason: e.target.value as PurchaseReturnItem['reason'] })}
                                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                              >
                                <option value="damaged">{t.purchaseReturns?.reasons?.damaged || 'Damaged'}</option>
                                <option value="expired">{t.purchaseReturns?.reasons?.expired || 'Expired'}</option>
                                <option value="wrong_item">{t.purchaseReturns?.reasons?.wrong_item || 'Wrong Item'}</option>
                                <option value="defective">{t.purchaseReturns?.reasons?.defective || 'Defective'}</option>
                                <option value="overage">{t.purchaseReturns?.reasons?.overage || 'Overage'}</option>
                                <option value="other">{t.purchaseReturns?.reasons?.other || 'Other'}</option>
                              </select>
                            </div>
                            
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">{t.purchaseReturns?.condition || 'Condition'}</label>
                              <select
                                value={formData.condition}
                                onChange={(e) => updateItemFormData({ condition: e.target.value as PurchaseReturnItem['condition'] })}
                                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                              >
                                <option value="damaged">{t.purchaseReturns?.conditions?.damaged || 'Damaged'}</option>
                                <option value="expired">{t.purchaseReturns?.conditions?.expired || 'Expired'}</option>
                                <option value="other">{t.purchaseReturns?.conditions?.other || 'Other'}</option>
                              </select>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                handleAddReturnItem(purchaseItem.drugId, formData.quantity, formData.reason, formData.condition);
                                updateItemFormData({ quantity: 1 });
                              }}
                              className={`w-full py-2.5 rounded-xl bg-${color}-600/10 hover:bg-${color}-600 text-${color}-600 hover:text-white text-xs font-black transition-all border border-${color}-600/20 active:scale-95`}
                            >
                              <span className="material-symbols-rounded block mb-0.5">add_shopping_cart</span>
                              {t.purchaseReturns?.addToReturn || 'Add'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            {/* Additional Notes */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                <span className="material-symbols-rounded text-[18px]">notes</span>
                {t.purchaseReturns?.additionalNotes || 'Additional Notes'}
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                dir={notesDir}
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all resize-none text-sm font-medium"
                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                placeholder={t.purchaseReturns?.notesPlaceholder || 'Add any additional notes about this return...'}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Details View Modal */}
      {viewingReturn && (
        <Modal
            isOpen={true}
            onClose={() => setViewingReturn(null)}
            size="2xl"
            zIndex={50}
            title={t.purchaseReturns?.returnDetails || 'Return Details'}
            icon="assignment_return"
            footer={
              <div className="flex justify-end">
                <button
                  onClick={() => setViewingReturn(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {t.modal?.close || 'Close'}
                </button>
              </div>
            }
        >
            <div className="space-y-6">
              
              {/* Return Information Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">info</span>
                  {t.purchaseReturns?.returnInfo || 'Return Information'}
                </h3>
                
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                   <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.tableHeaders?.id || 'Return ID'}</label>
                      <p className="font-bold text-gray-900 dark:text-white font-mono text-sm">{viewingReturn.id}</p>
                   </div>
                   <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.tableHeaders?.date || 'Date'}</label>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{new Date(viewingReturn.date).toLocaleDateString()}</p>
                   </div>

                   <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.tableHeaders?.purchaseId || 'Purchase ID'}</label>
                      <p className="font-bold text-gray-900 dark:text-white font-mono text-sm">{viewingReturn.purchaseId}</p>
                   </div>
                   <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.tableHeaders?.supplier || 'Supplier'}</label>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{viewingReturn.supplierName}</p>
                   </div>

                   <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.tableHeaders?.status || 'Status'}</label>
                       {(() => {
                          const status = viewingReturn.status;
                          const style = 
                             status === 'completed' ? { color: 'emerald', icon: 'check_circle' } :
                             status === 'approved' ? { color: 'blue', icon: 'verified' } :
                             { color: 'amber', icon: 'hourglass_top' };
                          
                          return (
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border bg-transparent border-${style.color}-200 dark:border-${style.color}-900/50 text-${style.color}-700 dark:text-${style.color}-400 text-xs font-bold uppercase tracking-wider`}>
                                  <span className="material-symbols-rounded text-sm">{style.icon}</span>
                                  {t.purchaseReturns?.status?.[status] || status}
                              </span>
                          );
                       })()}
                   </div>
                   <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.totalRefund || 'Total Refund'}</label>
                      <p className="font-bold text-red-600 text-sm">${viewingReturn.totalRefund.toFixed(2)}</p>
                   </div>
                </div>
              </div>

              {/* Returned Items Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">inventory_2</span>
                  {t.purchaseReturns?.returnedItems || 'Returned Items'}
                </h3>
                
                <div className="space-y-2">
                  {viewingReturn.items.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center group hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                       <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                             {getDisplayName({ ...item, dosageForm: item.dosageForm || drugs.find(d => d.id === item.drugId)?.dosageForm })}
                          </p>
                          <p className="text-xs text-gray-500">
                             <span className="opacity-70">{t.purchaseReturns?.quantity || 'Qty'}:</span> {item.quantityReturned} <span className="mx-1 opacity-30">|</span> 
                             <span className="opacity-70">{t.purchases?.detailsModal?.cost || 'Cost'}:</span> ${item.costPrice.toFixed(2)} <span className="mx-1 opacity-30">|</span> 
                             <span className="opacity-70">{t.purchaseReturns?.reason || 'Reason'}:</span> {t.purchaseReturns?.reasons?.[item.reason] || item.reason}
                          </p>
                       </div>
                       <p className="font-bold text-red-600 text-sm">
                          ${item.refundAmount.toFixed(2)}
                       </p>
                    </div>
                  ))}
                </div>
              </div>

              {viewingReturn.notes && (
                 <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <span className="material-symbols-rounded text-[18px]">notes</span>
                      {t.purchaseReturns?.notes || 'Notes'}
                    </h3>
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-900 dark:text-amber-100 border border-amber-100 dark:border-amber-900/30 text-sm">
                      {viewingReturn.notes}
                    </div>
                 </div>
              )}

            </div>
        </Modal>
      )}
    </div>
  );
};
