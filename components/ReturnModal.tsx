import React, { useState, useMemo } from 'react';
import { Sale, Return, ReturnType, ReturnReason, ReturnItem, CartItem } from '../types';

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
  const [returnType, setReturnType] = useState<ReturnType | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [returnReason, setReturnReason] = useState<ReturnReason>('customer_request');
  const [returnNotes, setReturnNotes] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setReturnType(null);
    setSelectedItems(new Map());
    setReturnReason('customer_request');
    setReturnNotes('');
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && !returnType) return;
    if (step === 2 && returnType !== 'full' && selectedItems.size === 0) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const toggleItemSelection = (item: CartItem) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      newSelected.set(item.id, item.quantity);
    }
    setSelectedItems(newSelected);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    const newSelected = new Map(selectedItems);
    if (quantity > 0) {
      newSelected.set(itemId, quantity);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const calculateRefund = useMemo(() => {
    if (returnType === 'full') {
      // For full returns, return the exact total (already includes global discount)
      return sale.total;
    }

    // Calculate subtotal of returned items (with item discounts)
    let returnedSubtotal = 0;
    selectedItems.forEach((quantity, itemId) => {
      const item = sale.items.find(i => i.id === itemId);
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
    if (sale.globalDiscount && sale.subtotal && sale.subtotal > 0) {
      const globalDiscountMultiplier = 1 - (sale.globalDiscount / 100);
      return returnedSubtotal * globalDiscountMultiplier;
    }

    return returnedSubtotal;
  }, [returnType, selectedItems, sale]);

  const handleConfirm = () => {
    const returnItems: ReturnItem[] = [];

    if (returnType === 'full') {
      sale.items.forEach(item => {
        const effectivePrice = (item.isUnit && item.unitsPerPack) 
          ? item.price / item.unitsPerPack 
          : item.price;
        const itemTotal = effectivePrice * item.quantity;
        const discountedPrice = itemTotal * (1 - (item.discount || 0) / 100);

        returnItems.push({
          drugId: item.id,
          name: item.name,
          quantityReturned: item.quantity,
          isUnit: item.isUnit || false,
          originalPrice: effectivePrice,
          refundAmount: discountedPrice,
          reason: returnReason
        });
      });
    } else {
      selectedItems.forEach((quantity, itemId) => {
        const item = sale.items.find(i => i.id === itemId);
        if (item) {
          const effectivePrice = (item.isUnit && item.unitsPerPack) 
            ? item.price / item.unitsPerPack 
            : item.price;
          const itemTotal = effectivePrice * quantity;
          const discountedPrice = itemTotal * (1 - (item.discount || 0) / 100);

          returnItems.push({
            drugId: item.id,
            name: item.name,
            quantityReturned: quantity,
            isUnit: item.isUnit || false,
            originalPrice: effectivePrice,
            refundAmount: discountedPrice,
            reason: returnReason
          });
        }
      });
    }

    const returnData: Return = {
      id: `ret_${Date.now()}`,
      saleId: sale.id,
      date: new Date().toISOString(),
      returnType: returnType!,
      items: returnItems,
      totalRefund: calculateRefund,
      reason: returnReason,
      notes: returnNotes
    };

    onConfirm(returnData);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 dark:bg-gray-950/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-${color}-50 dark:bg-${color}-950/20`}>
          <div>
            <h2 className={`text-xl font-bold text-${color}-900 dark:text-${color}-100`}>
              {t.returns.processReturn}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 1 && t.returns.step1}
              {step === 2 && t.returns.step2}
              {step === 3 && t.returns.step3}
              {step === 4 && t.returns.step4}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 dark:bg-gray-950/50">
          {[1, 2, 3, 4].map(s => (
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
              {s < 4 && <div className={`w-12 h-0.5 ${s < step ? `bg-${color}-600` : 'bg-gray-200 dark:bg-gray-800'}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Return Type */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t.returns.selectReturnType}
              </p>
              
              <button
                onClick={() => setReturnType('full')}
                className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                  returnType === 'full'
                    ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-950/20`
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    returnType === 'full' ? `border-${color}-500` : 'border-gray-300'
                  }`}>
                    {returnType === 'full' && <div className={`w-3 h-3 rounded-full bg-${color}-500`} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{t.returns.fullReturn}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t.returns.fullReturnDesc}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setReturnType('partial')}
                className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                  returnType === 'partial'
                    ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-950/20`
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    returnType === 'partial' ? `border-${color}-500` : 'border-gray-300'
                  }`}>
                    {returnType === 'partial' && <div className={`w-3 h-3 rounded-full bg-${color}-500`} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{t.returns.partialReturn}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t.returns.partialReturnDesc}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setReturnType('unit')}
                className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                  returnType === 'unit'
                    ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-950/20`
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    returnType === 'unit' ? `border-${color}-500` : 'border-gray-300'
                  }`}>
                    {returnType === 'unit' && <div className={`w-3 h-3 rounded-full bg-${color}-500`} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{t.returns.unitReturn}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t.returns.unitReturnDesc}</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Select Items (for partial/unit returns) */}
          {step === 2 && returnType !== 'full' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t.returns.selectItems} ({selectedItems.size} {t.returns.itemsSelected})
              </p>
              
              {sale.items.map(item => {
                const isSelected = selectedItems.has(item.id);
                const returnedQty = sale.itemReturnedQuantities?.[item.id] || 0;
                const availableQty = item.quantity - returnedQty;
                const selectedQty = selectedItems.get(item.id) || Math.min(availableQty, item.quantity);

                // Skip items that have been fully returned
                if (availableQty <= 0) {
                  return null;
                }

                return (
                  <div
                    key={item.id}
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
                        onChange={() => toggleItemSelection(item)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {item.name}
                          {item.isUnit && <span className="ml-2 text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-2 py-0.5 rounded font-bold">UNIT</span>}
                          {returnedQty > 0 && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 px-2 py-0.5 rounded font-bold">
                              {returnedQty} returned
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-500">
                          ${((item.isUnit && item.unitsPerPack ? item.price / item.unitsPerPack : item.price).toFixed(2))} × {availableQty} available
                        </p>
                        
                        {isSelected && (
                          <div className="mt-3 flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {t.returns.returnQuantity}:
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateItemQuantity(item.id, Math.max(1, selectedQty - 1))}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
                              >
                                <span className="material-symbols-rounded text-lg">remove</span>
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={availableQty}
                                value={selectedQty}
                                onChange={(e) => updateItemQuantity(item.id, Math.min(availableQty, Math.max(1, parseInt(e.target.value) || 1)))}
                                className="w-16 px-2 py-1 text-center rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800"
                              />
                              <button
                                onClick={() => updateItemQuantity(item.id, Math.min(availableQty, selectedQty + 1))}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
                              >
                                <span className="material-symbols-rounded text-lg">add</span>
                              </button>
                              <span className="text-sm text-gray-500">/ {availableQty} {t.returns.maxQuantity}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}

          {/* Step 2 for Full Return - Just show summary */}
          {step === 2 && returnType === 'full' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t.returns.totalItems}: {sale.items.length}
              </p>
              {sale.items.map(item => (
                <div key={item.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.name}</h4>
                      <p className="text-sm text-gray-500">
                        {item.quantity} × ${((item.isUnit && item.unitsPerPack ? item.price / item.unitsPerPack : item.price).toFixed(2))}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      ${(item.price * item.quantity * (1 - (item.discount || 0) / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Reason & Notes */}
          {step === 3 && (
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
                />
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl bg-${color}-50 dark:bg-${color}-950/20 border border-${color}-100 dark:border-${color}-900`}>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">{t.returns.reviewReturn}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t.returns.returnType}:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {returnType === 'full' && t.returns.fullReturn}
                      {returnType === 'partial' && t.returns.partialReturn}
                      {returnType === 'unit' && t.returns.unitReturn}
                    </span>
                  </div>
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
                {(returnType === 'full' ? sale.items : Array.from(selectedItems.entries()).map(([id, qty]) => {
                  const item = sale.items.find(i => i.id === id)!;
                  return { ...item, quantity: qty };
                })).map(item => (
                  <div key={item.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.quantity} {item.isUnit ? 'units' : 'packs'} {t.returns.willBeRestored}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex gap-3">
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

          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !returnType) ||
                (step === 2 && returnType !== 'full' && selectedItems.size === 0)
              }
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
      </div>
    </div>
  );
};
