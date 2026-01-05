import React, { useState, useMemo } from 'react';
import { Sale, Return, ReturnReason, ReturnItem, CartItem, Shift } from '../../types';
import { useSmartDirection } from '../common/SmartInputs';
import { Modal } from '../common/Modal';

interface ReturnModalProps {
  isOpen: boolean;
  sale: Sale;
  onClose: () => void;
  onConfirm: (returnData: Return) => void;
  color: string;
  t: any;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ 
  isOpen, 
  sale, 
  onClose, 
  onConfirm,
  color,
  t 
}) => {
  const [step, setStep] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [returnReason, setReturnReason] = useState<ReturnReason>('customer_request');
  const [returnNotes, setReturnNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const returnNotesDir = useSmartDirection(returnNotes, t.returns.notes);

  // Get available items for return (items that haven't been fully returned yet)
  // Use a unique key for each cart line item (index-based) to distinguish same drug as pack vs unit
  const availableItems = useMemo(() => {
    return sale.items.map((item, index) => {
      // Create a unique key for this line item (combines drugId + index for uniqueness)
      const lineKey = `${item.id}_${index}`;
      const returnedQty = sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
      const availableQty = item.quantity - returnedQty;
      return {
        ...item,
        lineKey,
        returnedQty,
        availableQty
      };
    }).filter(item => item.availableQty > 0);
  }, [sale]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setSelectedItems(new Map());
    setReturnReason('customer_request');
    setReturnNotes('');
    setValidationError(null);
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && selectedItems.size === 0) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const toggleItemSelection = (lineKey: string, maxQty: number) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(lineKey)) {
      newSelected.delete(lineKey);
    } else {
      newSelected.set(lineKey, maxQty);
    }
    setSelectedItems(newSelected);
  };

  const updateItemQuantity = (lineKey: string, quantity: number) => {
    const newSelected = new Map(selectedItems);
    if (quantity > 0) {
      newSelected.set(lineKey, quantity);
    } else {
      newSelected.delete(lineKey);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Map<string, number>();
    availableItems.forEach(item => {
      newSelected.set(item.lineKey, item.availableQty);
    });
    setSelectedItems(newSelected);
  };

  const deselectAll = () => {
    setSelectedItems(new Map());
  };

  const isAllSelected = availableItems.length > 0 && 
    availableItems.every(item => selectedItems.has(item.lineKey));

  const calculateRefund = useMemo(() => {
    let returnedSubtotal = 0;
    selectedItems.forEach((quantity, lineKey) => {
      const item = availableItems.find(i => i.lineKey === lineKey);
      if (item) {
        const effectivePrice = (item.isUnit && item.unitsPerPack) 
          ? item.price / item.unitsPerPack 
          : item.price;
        const itemTotal = effectivePrice * quantity;
        const withItemDiscount = itemTotal * (1 - (item.discount || 0) / 100);
        returnedSubtotal += withItemDiscount;
      }
    });

    // Apply global discount proportionally if it exists
    if (sale.globalDiscount && sale.globalDiscount > 0) {
      return returnedSubtotal * (1 - sale.globalDiscount / 100);
    }

    return returnedSubtotal;
  }, [selectedItems, availableItems, sale.globalDiscount]);

  const handleConfirm = () => {
    // VALIDATION: Check shift status and balance
    try {
      const savedShifts = localStorage.getItem('pharma_shifts');
      if (!savedShifts) {
        setValidationError(t.returns.validation?.noOpenShift || 'Cannot process return - no open shift');
        return;
      }
      
      const allShifts: Shift[] = JSON.parse(savedShifts);
      const openShift = allShifts.find(s => s.status === 'open');
      
      if (!openShift) {
        setValidationError(t.returns.validation?.noOpenShift || 'Cannot process return - no open shift');
        return;
      }
      
      // Check if refund exceeds available sales balance (sales + deposits - already processed returns)
      const totalSales = openShift.cashSales + (openShift.cardSales || 0);
      const totalDeposits = openShift.cashIn || 0;
      const alreadyReturned = openShift.returns || 0;
      const availableBalance = totalSales + totalDeposits - alreadyReturned;
      
      if (calculateRefund > availableBalance) {
        setValidationError(t.returns.validation?.insufficientBalance || 'Return amount exceeds available sales balance');
        return;
      }
    } catch (e) {
      console.error('Failed to validate shift:', e);
    }

    const returnItems: ReturnItem[] = [];

    selectedItems.forEach((quantity, lineKey) => {
      const item = availableItems.find(i => i.lineKey === lineKey);
      if (item) {
        const effectivePrice = (item.isUnit && item.unitsPerPack) 
          ? item.price / item.unitsPerPack 
          : item.price;
        const itemTotal = effectivePrice * quantity;
        const discountedPrice = itemTotal * (1 - (item.discount || 0) / 100);

        returnItems.push({
          drugId: lineKey, // Use lineKey for unique tracking
          name: item.name + (item.isUnit ? ' (UNIT)' : ''),
          quantityReturned: quantity,
          isUnit: item.isUnit || false,
          originalPrice: effectivePrice,
          refundAmount: discountedPrice,
          reason: returnReason,
          condition: 'sellable'
        });
      }
    });

    const returnData: Return = {
      id: `ret_${Date.now()}`,
      saleId: sale.id,
      date: new Date().toISOString(),
      returnType: isAllSelected ? 'full' : 'partial',
      items: returnItems,
      totalRefund: calculateRefund,
      reason: returnReason,
      notes: returnNotes
    };

    onConfirm(returnData);
    handleClose();
  };

  return (
    <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="2xl"
        zIndex={100}
        title={t.returns.processReturn}
        subtitle={`${step === 1 ? t.returns.step2 : step === 2 ? t.returns.step3 : t.returns.step4}`}
    >
        {/* Progress Indicator - Sticky at top of content if needed, or just flow */}
        <div className="flex items-center justify-center gap-2 p-4 mb-4 bg-gray-50 dark:bg-gray-950/50 rounded-xl">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s === step 
                  ? `bg-${color}-600 text-white` 
                  : s < step 
                    ? `bg-${color}-200 dark:bg-${color}-900/50 text-${color}-700 dark:text-${color}-300`
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? `bg-${color}-600` : 'bg-gray-200 dark:bg-gray-800'}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Step 1: Select Items */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t.returns.selectItems} ({selectedItems.size} {t.returns.itemsSelected})
                </p>
                <button
                  onClick={isAllSelected ? deselectAll : selectAll}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isAllSelected 
                      ? 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                      : `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300`
                  }`}
                >
                  {isAllSelected ? t.returns.deselectAll || 'Deselect All' : t.returns.selectAll || 'Select All'}
                </button>
              </div>
              
              {availableItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t.returns.noItemsAvailable || 'All items have been returned'}
                </div>
              ) : (
                availableItems.map(item => {
                  const isSelected = selectedItems.has(item.lineKey);
                  const selectedQty = selectedItems.get(item.lineKey) || item.availableQty;

                  return (
                    <div
                      key={item.lineKey}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-950/20`
                          : 'border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(item.lineKey, item.availableQty)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {item.name}
                            {item.isUnit && <span className="ml-2 text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-2 py-0.5 rounded font-bold">UNIT</span>}
                            {item.returnedQty > 0 && (
                              <span className="ml-2 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 px-2 py-0.5 rounded font-bold">
                                {item.returnedQty} returned
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500">
                            ${((item.isUnit && item.unitsPerPack ? item.price / item.unitsPerPack : item.price).toFixed(2))} × {item.availableQty} available
                          </p>
                          
                          {isSelected && (
                            <div className="mt-3 flex items-center gap-3">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t.returns.returnQuantity}:
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateItemQuantity(item.lineKey, Math.max(1, selectedQty - 1))}
                                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
                                >
                                  <span className="material-symbols-rounded text-lg">remove</span>
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.availableQty}
                                  value={selectedQty}
                                  onChange={(e) => updateItemQuantity(item.lineKey, Math.min(item.availableQty, Math.max(1, parseInt(e.target.value) || 1)))}
                                  className="w-16 px-2 py-1 text-center rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800"
                                />
                                <button
                                  onClick={() => updateItemQuantity(item.lineKey, Math.min(item.availableQty, selectedQty + 1))}
                                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
                                >
                                  <span className="material-symbols-rounded text-lg">add</span>
                                </button>
                                <span className="text-sm text-gray-500">/ {item.availableQty} {t.returns.maxQuantity}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Step 2: Reason & Notes */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.returns.returnReason} *
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                >
                  <option value="customer_request">{t.returns.reasons.customer_request}</option>
                  <option value="wrong_item">{t.returns.reasons.wrong_item}</option>
                  <option value="damaged">{t.returns.reasons.damaged}</option>
                  <option value="expired">{t.returns.reasons.expired}</option>
                  <option value="defective">{t.returns.reasons.defective}</option>
                  <option value="other">{t.returns.reasons.other}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.returns.notes}
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 transition-all resize-none"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  placeholder={t.returns.notes}
                  dir={returnNotesDir}
                />
              </div>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl bg-${color}-50 dark:bg-${color}-950/20 border border-${color}-100 dark:border-${color}-900`}>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">{t.returns.reviewReturn}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t.returns.returnReason}:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {t.returns.reasons[returnReason]}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className={`text-${color}-900 dark:text-${color}-100`}>{t.returns.refundAmount}:</span>
                    <span className={`text-${color}-900 dark:text-${color}-100`}>${calculateRefund.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t.returns.itemsToReturn}:</h4>
                {Array.from(selectedItems.entries()).map(([lineKey, qty]) => {
                  const item = availableItems.find(i => i.lineKey === lineKey);
                  if (!item) return null;
                  return (
                    <div key={lineKey} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {item.name}
                          {item.isUnit && <span className="ml-1 text-xs text-sky-600">(UNIT)</span>}
                        </p>
                        <p className="text-xs text-gray-500">{qty} {item.isUnit ? 'units' : 'packs'} {t.returns.willBeRestored}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 flex items-center gap-3">
                  <span className="material-symbols-rounded text-red-500">error</span>
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">{validationError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 mt-4">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="px-6 py-2.5 rounded-full font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors"
            >
              {t.returns.back}
            </button>
          )}
          
          <button
            onClick={handleClose}
            className="px-6 py-2.5 rounded-full font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {t.returns.cancelReturn}
          </button>

          <div className="flex-1" />

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={step === 1 && selectedItems.size === 0}
              className={`px-6 py-2.5 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
            >
              {t.returns.next}
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              className={`px-6 py-2.5 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 transition-all flex items-center gap-2`}
            >
              <span className="material-symbols-rounded text-[20px]">check_circle</span>
              {t.returns.confirmReturn}
            </button>
          )}
        </div>
    </Modal>
  );
};
