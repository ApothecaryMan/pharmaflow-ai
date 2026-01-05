import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SegmentedControl } from '../common/SegmentedControl';
import { useContextMenu, useContextMenuTrigger } from '../common/ContextMenu';
import { PurchaseReturn, PurchaseReturnItem, Purchase, Drug } from '../../types';
import { useColumnReorder } from '../../hooks/useColumnReorder';
import { useSmartDirection } from '../common/SmartInputs';
import { Modal } from '../common/Modal';

interface PurchaseReturnsProps {
  purchases: Purchase[];
  purchaseReturns: PurchaseReturn[];
  setPurchaseReturns: (returns: PurchaseReturn[]) => void;
  drugs: Drug[];
  setDrugs: (drugs: Drug[]) => void;
  color: string;
  t: any;
  language: 'EN' | 'AR';
}

export const PurchaseReturns: React.FC<PurchaseReturnsProps> = ({ 
  purchases, 
  purchaseReturns, 
  setPurchaseReturns,
  drugs,
  setDrugs,
  color, 
  t, 
  language 
}) => {
  const { showMenu } = useContextMenu();
  const [mode, setMode] = useState<'create' | 'history'>('create');
  const [search, setSearch] = useState('');
  const searchDir = useSmartDirection(search, t.purchaseReturns?.searchPlaceholder || 'Search returns...');

  // Create Return state
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [returnItems, setReturnItems] = useState<PurchaseReturnItem[]>([]);
  const [notes, setNotes] = useState('');
  const notesDir = useSmartDirection(notes, t.purchaseReturns?.notesPlaceholder || 'Add any additional notes about this return...');
  
  // Track item-specific form data (quantity, reason, condition for each item)
  const [itemFormData, setItemFormData] = useState<Record<string, { quantity: number; reason: PurchaseReturnItem['reason']; condition: PurchaseReturnItem['condition'] }>>({});

  // Details modal state
  const [viewingReturn, setViewingReturn] = useState<PurchaseReturn | null>(null);

  // Column management for history table
  const {
    columnOrder,
    hiddenColumns,
    draggedColumn,
    dragOverColumn,
    toggleColumnVisibility,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnTouchMove,
    handleColumnDrop,
    handleColumnTouchEnd,
    handleColumnDragEnd,
  } = useColumnReorder({
    defaultColumns: ['id', 'date', 'purchaseId', 'supplier', 'totalRefund', 'status', 'action'],
    storageKey: 'purchase_returns_columns'
  });

  // Column widths
  const [columnWidths, setColumnWidths] = useState<Record<string, number | undefined>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('purchase_returns_column_widths');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse column widths', e); }
      }
    }
    return {
      id: 100,
      date: 120,
      purchaseId: 120,
      supplier: 180,
      totalRefund: 130,
      status: 120,
      action: 80
    };
  });

  useEffect(() => {
    localStorage.setItem('purchase_returns_column_widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  const [isColumnResizing, setIsColumnResizing] = useState(false);
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const startColumnResize = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsColumnResizing(true);
    resizingColumn.current = columnId;
    startX.current = e.pageX;
    startWidth.current = columnWidths[columnId] || 100;

    document.addEventListener('mousemove', handleColumnResizeMove);
    document.addEventListener('mouseup', endColumnResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleColumnResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const diff = e.pageX - startX.current;
    const isRTL = document.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';
    const finalDiff = isRTL ? -diff : diff;
    const newWidth = Math.max(50, startWidth.current + finalDiff);
    setColumnWidths(prev => ({ ...prev, [resizingColumn.current!]: newWidth }));
  }, []);

  const endColumnResize = useCallback(() => {
    setIsColumnResizing(false);
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleColumnResizeMove);
    document.removeEventListener('mouseup', endColumnResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleColumnResizeMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleColumnResizeMove);
      document.removeEventListener('mouseup', endColumnResize);
    };
  }, [endColumnResize, handleColumnResizeMove]);

  const handleAutoFit = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    setColumnWidths(prev => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
  };

  const columnsDef = {
    id: { label: t.purchaseReturns?.tableHeaders?.id || 'Return ID', className: 'px-3 py-2 text-start' },
    date: { label: t.purchaseReturns?.tableHeaders?.date || 'Date', className: 'px-3 py-2 text-start' },
    purchaseId: { label: t.purchaseReturns?.tableHeaders?.purchaseId || 'Purchase ID', className: 'px-3 py-2 text-start' },
    supplier: { label: t.purchaseReturns?.tableHeaders?.supplier || 'Supplier', className: 'px-3 py-2 text-start' },
    totalRefund: { label: t.purchaseReturns?.tableHeaders?.refund || 'Total Refund', className: 'px-3 py-2 text-end' },
    status: { label: t.purchaseReturns?.tableHeaders?.status || 'Status', className: 'px-3 py-2 text-center' },
    action: { label: t.purchaseReturns?.tableHeaders?.action || 'Action', className: 'px-3 py-2 text-center' }
  };

  // Helper: Get row context menu actions
  const getRowActions = (returnRecord: PurchaseReturn) => [
    { label: t.purchaseReturns?.contextMenu?.viewDetails || 'View Details', icon: 'visibility', action: () => handleViewDetails(returnRecord) }
  ];

  // Helper: Get header context menu actions
  const getHeaderActions = () => [
    { label: t.contextMenu?.showHideColumns || 'Show/Hide Columns', icon: 'visibility', action: () => {} },
    { separator: true },
    ...Object.keys(columnsDef).map(colId => ({
      label: columnsDef[colId as keyof typeof columnsDef].label,
      icon: hiddenColumns.has(colId) ? 'visibility_off' : 'visibility',
      action: () => toggleColumnVisibility(colId)
    }))
  ];

  // Header context menu trigger
  const { triggerProps: headerTriggerProps } = useContextMenuTrigger({
    actions: getHeaderActions
  });

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
  const handleSubmitReturn = (e: React.FormEvent) => {
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

    setPurchaseReturns([...purchaseReturns, newReturn]);
    
    // Reset form
    setSelectedPurchase(null);
    setReturnItems([]);
    setNotes('');
    setItemFormData({});
    setMode('history');
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

  // Filter returns
  const filteredReturns = purchaseReturns.filter(r => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      r.id.toLowerCase().includes(searchLower) ||
      r.purchaseId.toLowerCase().includes(searchLower) ||
      r.supplierName.toLowerCase().includes(searchLower)
    );
  });

  const renderCell = (returnRecord: PurchaseReturn, columnId: string) => {
    switch(columnId) {
      case 'id':
        return <span className="text-xs font-mono text-gray-500 truncate">{returnRecord.id}</span>;
      case 'date':
        return <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{new Date(returnRecord.date).toLocaleDateString()}</span>;
      case 'purchaseId':
        return <span className="text-xs font-mono text-gray-500 truncate">{returnRecord.purchaseId}</span>;
      case 'supplier':
        return <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{returnRecord.supplierName}</span>;
      case 'totalRefund':
        return <span className="text-sm font-bold text-red-600 dark:text-red-400 truncate">${returnRecord.totalRefund.toFixed(2)}</span>;
      case 'status':
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            returnRecord.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            returnRecord.status === 'approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {t.purchaseReturns?.status?.[returnRecord.status] || returnRecord.status}
          </span>
        );
      case 'action':
        return (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              showMenu(e.clientX, e.clientY, getRowActions(returnRecord));
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors outline-none"
            title="Actions"
          >
            <span className="material-symbols-rounded text-[20px]">more_vert</span>
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in p-4 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight type-expressive">{mode === 'create' ? (t.purchaseReturns?.createReturn || 'Create Return') : (t.purchaseReturns?.returnHistory || 'Return History')}</h2>
          <p className="text-sm text-gray-500">{mode === 'create' ? (t.purchaseReturns?.createSubtitle || 'Return items to supplier') : (t.purchaseReturns?.historySubtitle || 'View all purchase returns')}</p>
        </div>
          <SegmentedControl
            value={mode}
            onChange={(val) => setMode(val as 'create' | 'history')}
            color={color}
            shape="pill"
            size="sm"
            options={[
                { label: t.purchaseReturns?.createReturn || 'Create Return', value: 'create' },
                { label: t.purchaseReturns?.returnHistory || 'Return History', value: 'history' }
            ]}
          />
      </div>

      {mode === 'create' ? (
        /* CREATE RETURN FORM */
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmitReturn} className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Purchase Selection */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
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
                  className="mt-3 w-full px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded text-[18px]">assignment_return</span>
                  {t.purchaseReturns?.returnAll || 'Return All Items from This Purchase'}
                </button>
              )}
            </div>

            {/* Return Items */}
            {selectedPurchase && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                  <span className="material-symbols-rounded text-[18px]">inventory_2</span>
                  {t.purchaseReturns?.itemsToReturn || 'Items to Return'}
                </h3>
                
                {returnItems.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {returnItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            <span className="font-bold">{t.purchaseReturns?.quantity || 'Qty'}:</span> {item.quantityReturned} | <span className="font-bold">{t.purchaseReturns?.reason || 'Reason'}:</span> {t.purchaseReturns?.reasons?.[item.reason] || item.reason} | <span className="font-bold">{t.purchaseReturns?.condition || 'Condition'}:</span> {t.purchaseReturns?.conditions?.[item.condition] || item.condition}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-red-600">${item.refundAmount.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveReturnItem(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-rounded text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{t.purchaseReturns?.totalRefund || 'Total Refund'}</p>
                        <p className="text-2xl font-bold text-red-600">
                          ${returnItems.reduce((sum, item) => sum + item.refundAmount, 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}


                {/* Available Items from Purchase */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">{t.purchaseReturns?.availableItems || 'Available Items from Purchase Order'}</h4>
                  {selectedPurchase.items
                    .filter(item => {
                      const returned = getReturnedQuantity(selectedPurchase.id, item.drugId);
                      // Sum ALL return items for this drug (regardless of reason/condition)
                      const alreadyInReturn = returnItems
                        .filter(ri => ri.drugId === item.drugId)
                        .reduce((sum, ri) => sum + ri.quantityReturned, 0);
                      const available = item.quantity - returned - alreadyInReturn;
                      return available > 0;
                    })
                    .map((purchaseItem, index) => {
                    const itemKey = purchaseItem.drugId;
                    const returnedQty = getReturnedQuantity(selectedPurchase.id, itemKey);
                    // Sum ALL return items for this drug (regardless of reason/condition)
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
                      <div key={index} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 dark:text-white">{purchaseItem.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              <span className="font-bold">{t.purchaseReturns?.available || 'Available'}:</span> {availableQty} {t.purchaseReturns?.packs || 'packs'} (<span className="font-bold">{t.menu?.totalItems || 'Total'}:</span> {purchaseItem.quantity}, <span className="font-bold">{t.purchaseReturns?.returnedItems || 'Returned'}:</span> {returnedQty}, <span className="font-bold">{t.purchaseReturns?.inReturnList || 'In Return List'}:</span> {alreadyInReturn}) | <span className="font-bold">{t.purchases?.detailsModal?.cost || 'Cost'}:</span> ${purchaseItem.costPrice.toFixed(2)}/{t.purchaseReturns?.pack || 'pack'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.purchaseReturns?.quantity || 'Quantity'}</label>
                            <input
                              type="number"
                              min="1"
                              max={availableQty}
                              value={formData.quantity}
                              onChange={(e) => updateItemFormData({ quantity: Math.min(availableQty, Math.max(1, parseInt(e.target.value) || 1)) })}
                              className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.purchaseReturns?.reason || 'Reason'}</label>
                            <select
                              value={formData.reason}
                              onChange={(e) => updateItemFormData({ reason: e.target.value as PurchaseReturnItem['reason'] })}
                              className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm"
                            >
                              <option value="damaged">{t.purchaseReturns?.reasons?.damaged || 'Damaged'}</option>
                              <option value="expired">{t.purchaseReturns?.reasons?.expired || 'Expired'}</option>
                              <option value="wrong_item">{t.purchaseReturns?.reasons?.wrong_item || 'Wrong Item'}</option>
                              <option value="defective">{t.purchaseReturns?.reasons?.defective || 'Defective'}</option>
                              <option value="overage">{t.purchaseReturns?.reasons?.overage || 'Overage - Entered by Mistake'}</option>
                              <option value="other">{t.purchaseReturns?.reasons?.other || 'Other'}</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.purchaseReturns?.condition || 'Condition'}</label>
                            <select
                              value={formData.condition}
                              onChange={(e) => updateItemFormData({ condition: e.target.value as PurchaseReturnItem['condition'] })}
                              className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm"
                            >
                              <option value="damaged">{t.purchaseReturns?.conditions?.damaged || 'Damaged'}</option>
                              <option value="expired">{t.purchaseReturns?.conditions?.expired || 'Expired'}</option>
                              <option value="other">{t.purchaseReturns?.conditions?.other || 'Other'}</option>
                            </select>
                          </div>
                          
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => {
                                handleAddReturnItem(purchaseItem.drugId, formData.quantity, formData.reason, formData.condition);
                                updateItemFormData({ quantity: 1 });
                              }}
                              className={`w-full px-3 py-2 rounded-lg bg-${color}-600 hover:bg-${color}-700 text-white text-sm font-medium transition-colors`}
                            >
                              {t.purchaseReturns?.addToReturn || 'Add to Return'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                <span className="material-symbols-rounded text-[18px]">notes</span>
                {t.purchaseReturns?.additionalNotes || 'Additional Notes'}
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                dir={notesDir}
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all resize-none"
                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                placeholder={t.purchaseReturns?.notesPlaceholder || 'Add any additional notes about this return...'}
              />

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPurchase(null);
                    setReturnItems([]);
                    setNotes('');
                  }}
                  className="px-6 py-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm font-medium"
                >
                  {t.purchaseReturns?.clear || 'Clear'}
                </button>
                <button
                  type="submit"
                  disabled={returnItems.length === 0}
                  className={`px-6 py-3 rounded-xl shadow-lg transition-all font-bold ${
                    returnItems.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : `bg-${color}-600 hover:bg-${color}-700 text-white`
                  }`}
                >
                  {t.purchaseReturns?.submit || 'Submit Return'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* RETURN HISTORY TABLE */
        <>
          {/* Search */}
          <div className="flex-shrink-0">
            <input 
              type="text" 
              placeholder={t.purchaseReturns?.searchPlaceholder || 'Search returns...'}
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all text-sm"
              style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
              value={search}
              onChange={e => setSearch(e.target.value)}
              dir={searchDir}
              autoComplete="off"
            />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full min-w-full table-fixed border-collapse">
              <thead className={`bg-${color}-50 dark:bg-${color}-900 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider sticky top-0 z-10 shadow-sm`}>
                <tr>
                  {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                    <th
                      key={columnId}
                      data-column-id={columnId}
                      className={`${columnsDef[columnId as keyof typeof columnsDef].className} ${!isColumnResizing ? 'cursor-grab active:cursor-grabbing' : ''} select-none transition-colors relative group/header hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        draggedColumn === columnId ? 'opacity-50' : ''
                      } ${dragOverColumn === columnId ? `bg-${color}-100 dark:bg-${color}-900/50` : ''}`}
                      title={columnsDef[columnId as keyof typeof columnsDef].label}
                      draggable={!isColumnResizing}
                      onDragStart={(e) => {
                        if ((e.target as HTMLElement).closest('.resize-handle')) {
                          e.preventDefault();
                          return;
                        }
                        handleColumnDragStart(e, columnId);
                      }}
                      onDragOver={(e) => handleColumnDragOver(e, columnId)}
                      onDrop={(e) => handleColumnDrop(e, columnId)}
                      onDragEnd={handleColumnDragEnd}
                      onTouchStart={(e) => {
                        if ((e.target as HTMLElement).closest('.resize-handle')) return;
                        e.stopPropagation();
                        handleColumnDragStart(e, columnId);
                      }}
                      onTouchMove={(e) => handleColumnTouchMove(e)}
                      onTouchEnd={(e) => handleColumnTouchEnd(e)}
                      {...headerTriggerProps}
                      style={{ width: columnWidths[columnId] ? `${columnWidths[columnId]}px` : 'auto' }}
                    >
                      <div className="flex items-center justify-between h-full w-full">
                        <span className="truncate flex-1">{columnsDef[columnId as keyof typeof columnsDef].label}</span>
                        
                        <div 
                          className="resize-handle absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 cursor-col-resize z-20 flex items-center justify-center opacity-0 group-hover/header:opacity-100 transition-opacity"
                          style={{ right: '-8px' }}
                          onMouseDown={(e) => startColumnResize(e, columnId)}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => handleAutoFit(e, columnId)}
                        >
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((returnRecord, index) => (
                  <tr 
                    key={returnRecord.id}
                    onClick={() => handleViewDetails(returnRecord)}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-${color}-50 dark:hover:bg-${color}-950/20 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/20' : ''}`}
                  >
                    {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                      <td 
                        key={columnId} 
                        className={`${columnsDef[columnId as keyof typeof columnsDef].className} align-middle border-none`}
                        style={{ width: columnWidths[columnId] ? `${columnWidths[columnId]}px` : 'auto' }}
                      >
                        {renderCell(returnRecord, columnId)}
                      </td>
                    ))}
                  </tr>
                ))}
                {filteredReturns.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-gray-400">
                      {search.trim() 
                        ? (t.purchaseReturns?.messages?.noReturnsFound || 'No returns found matching your search')
                        : (t.purchaseReturns?.messages?.noReturnsYet || 'No purchase returns yet')
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Details View Modal */}
      {viewingReturn && (
        <Modal
            isOpen={true}
            onClose={() => setViewingReturn(null)}
            size="3xl"
            zIndex={50}
            title={t.purchaseReturns?.returnDetails || 'Return Details'}
            icon="assignment_return"
        >
            {/* Content */}
            <div className="space-y-6">
              {/* Return Information */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">info</span>
                  {t.purchaseReturns?.returnInfo || 'Return Information'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.tableHeaders?.id || 'Return ID'}</label>
                    <p className="text-sm text-gray-900 dark:text-white font-mono">{viewingReturn.id}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.tableHeaders?.date || 'Date'}</label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(viewingReturn.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.tableHeaders?.purchaseId || 'Purchase ID'}</label>
                    <p className="text-sm text-gray-900 dark:text-white font-mono">{viewingReturn.purchaseId}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.tableHeaders?.supplier || 'Supplier'}</label>
                    <p className="text-sm text-gray-900 dark:text-white font-bold">{viewingReturn.supplierName}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.tableHeaders?.status || 'Status'}</label>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      viewingReturn.status === 'completed' ? 'bg-green-100 text-green-700' :
                      viewingReturn.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {t.purchaseReturns?.status?.[viewingReturn.status] || viewingReturn.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.purchaseReturns?.totalRefund || 'Total Refund'}</label>
                    <p className="text-lg font-bold text-red-600">${viewingReturn.totalRefund.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Returned Items */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">inventory_2</span>
                  {t.purchaseReturns?.returnedItems || 'Returned Items'}
                </h4>
                <div className="space-y-2">
                  {viewingReturn.items.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-bold">{t.purchaseReturns?.quantity || 'Qty'}:</span> {item.quantityReturned} | <span className="font-bold">{t.purchases?.detailsModal?.cost || 'Cost'}:</span> ${item.costPrice.toFixed(2)} | <span className="font-bold">{t.purchaseReturns?.reason || 'Reason'}:</span> {t.purchaseReturns?.reasons?.[item.reason] || item.reason} | <span className="font-bold">{t.purchaseReturns?.condition || 'Condition'}:</span> {t.purchaseReturns?.conditions?.[item.condition] || item.condition}
                          </p>
                        </div>
                        <p className="font-bold text-red-600">${item.refundAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {viewingReturn.notes && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <span className="material-symbols-rounded text-[18px]">notes</span>
                    {t.purchaseReturns?.notes || 'Notes'}
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    {viewingReturn.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setViewingReturn(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
};
