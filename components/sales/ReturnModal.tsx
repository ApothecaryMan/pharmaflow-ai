import type React from 'react';
import { useMemo, useState } from 'react';
import { useStatusBar } from '../../components/layout/StatusBar';
import type { Return, ReturnItem, ReturnReason, Sale, Shift } from '../../types';
import { FilterDropdown } from '../common/FilterDropdown';
import { MaterialTabs } from '../common/MaterialTabs';
import { Modal } from '../common/Modal';
import { useSmartDirection } from '../common/SmartInputs';

interface ReturnModalProps {
  isOpen: boolean;
  sale: Sale;
  onClose: () => void;
  onConfirm: (returnData: Return) => void;
  color: string;
  t: any;
  language?: string;
  userRole?: string;
  currentDailyRefunds?: number;
  currentShift: Shift | null;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  sale,
  onClose,
  onConfirm,
  color,
  t,
  language = 'EN',
  userRole,
  currentDailyRefunds = 0,
  currentShift,
}) => {
  const { getVerifiedDate } = useStatusBar();
  const [step, setStep] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [returnReason, setReturnReason] = useState<ReturnReason>('customer_request');
  const [returnNotes, setReturnNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);
  const returnNotesDir = useSmartDirection(returnNotes, t.returns.notes);

  // Get available items for return (items that haven't been fully returned yet)
  const availableItems = useMemo(() => {
    return sale.items
      .map((item, index) => {
        // Create a unique key for this line item (combines drugId + index for uniqueness)
        const lineKey = `${item.id}_${index}`;
        const returnedQty =
          sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        const availableQty = item.quantity - returnedQty;
        return {
          ...item,
          lineKey,
          returnedQty,
          availableQty,
        };
      })
      .filter((item) => item.availableQty > 0);
  }, [sale]);

  const reasonOptions = [
    { id: 'customer_request', label: t.returns.reasons.customer_request, icon: 'person' },
    { id: 'wrong_item', label: t.returns.reasons.wrong_item, icon: 'error' },
    { id: 'damaged', label: t.returns.reasons.damaged, icon: 'broken_image' },
    { id: 'expired', label: t.returns.reasons.expired, icon: 'event_busy' },
    { id: 'defective', label: t.returns.reasons.defective, icon: 'build' },
    { id: 'other', label: t.returns.reasons.other, icon: 'more_horiz' },
  ];

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
    availableItems.forEach((item) => {
      newSelected.set(item.lineKey, item.availableQty);
    });
    setSelectedItems(newSelected);
  };

  const deselectAll = () => {
    setSelectedItems(new Map());
  };

  const isAllSelected =
    availableItems.length > 0 && availableItems.every((item) => selectedItems.has(item.lineKey));

  const calculateRefund = useMemo(() => {
    let returnedSubtotal = 0;
    selectedItems.forEach((quantity, lineKey) => {
      const item = availableItems.find((i) => i.lineKey === lineKey);
      if (item) {
        const effectivePrice =
          item.isUnit && item.unitsPerPack ? item.price / item.unitsPerPack : item.price;
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
        setValidationError(
          t.returns.validation?.noOpenShift || 'Cannot process return - no open shift'
        );
        return;
      }

      const allShifts: Shift[] = JSON.parse(savedShifts);
      const openShift = allShifts.find((s) => s.status === 'open');

      if (!openShift) {
        setValidationError(
          t.returns.validation?.noOpenShift || 'Cannot process return - no open shift'
        );
        return;
      }

      // --- Pharmacist Threshold Validation ---
      if (userRole === 'pharmacist') {
        // Limit 1: Per Invoice (1000 EGP)
        const REFUND_LIMIT_PER_INVOICE = 1000;
        if (calculateRefund > REFUND_LIMIT_PER_INVOICE) {
          const errorMsg =
            language === 'AR'
              ? `خطأ: لا يمكن استرجاع مبلغ أكبر من ${REFUND_LIMIT_PER_INVOICE} جنيه في العملية الواحدة للصيدلي. يرجى طلب موافقة المدير.`
              : `Error: Pharmacists cannot refund more than ${REFUND_LIMIT_PER_INVOICE} EGP per invoice. Please request manager approval.`;
          setValidationError(errorMsg);
          return;
        }

        // Limit 2: Daily Total (2000 EGP)
        const DAILY_REFUND_LIMIT = 2000;
        const projectedDailyTotal = (currentDailyRefunds || 0) + calculateRefund;
        if (projectedDailyTotal > DAILY_REFUND_LIMIT) {
          const errorMsg =
            language === 'AR'
              ? `خطأ: تم تجاوز الحد اليومي للمرتجعات (${DAILY_REFUND_LIMIT} جنيه). الإجمالي الحالي: ${currentDailyRefunds?.toFixed(2)}, المبلغ المطلوب: ${calculateRefund.toFixed(2)}. يرجى طلب موافقة المدير.`
              : `Error: Daily refund limit exceeded (${DAILY_REFUND_LIMIT} EGP). Current: ${currentDailyRefunds?.toFixed(2)}, Requested: ${calculateRefund.toFixed(2)}. Please request manager approval.`;
          setValidationError(errorMsg);
          return;
        }
      }

      // --- Cashier Validation ---
      if (userRole === 'cashier') {
        // Limit 1: Same Shift Only
        const isSameShift =
          !!currentShift && new Date(sale.date) >= new Date(currentShift.openTime);
        if (!isSameShift) {
          const errorMsg =
            language === 'AR'
              ? 'خطأ: يمكن للكاشير استرجاع الفواتير التي تمت في نفس الوردية فقط.'
              : 'Error: Cashiers can only refund invoices processed during the current shift.';
          setValidationError(errorMsg);
          return;
        }

        // Limit 2: Per Invoice (500 EGP)
        const CASHIER_REFUND_LIMIT = 500;
        if (calculateRefund > CASHIER_REFUND_LIMIT) {
          const errorMsg =
            language === 'AR'
              ? `خطأ: لا يمكن للكاشير استرجاع مبلغ أكبر من ${CASHIER_REFUND_LIMIT} جنيه في العملية الواحدة.`
              : `Error: Cashiers cannot refund more than ${CASHIER_REFUND_LIMIT} EGP per invoice.`;
          setValidationError(errorMsg);
          return;
        }
      }

      // Check if refund exceeds available sales balance (sales + deposits - already processed returns)
      const totalSales = openShift.cashSales + (openShift.cardSales || 0);
      const totalDeposits = openShift.cashIn || 0;
      const alreadyReturned = openShift.returns || 0;
      const availableBalance = totalSales + totalDeposits - alreadyReturned;

      if (calculateRefund > availableBalance) {
        setValidationError(
          t.returns.validation?.insufficientBalance ||
            'Return amount exceeds available sales balance'
        );
        return;
      }
    } catch (e) {
      console.error('Failed to validate shift:', e);
    }

    const returnItems: ReturnItem[] = [];

    selectedItems.forEach((quantity, lineKey) => {
      const item = availableItems.find((i) => i.lineKey === lineKey);
      if (item) {
        const effectivePrice =
          item.isUnit && item.unitsPerPack ? item.price / item.unitsPerPack : item.price;
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
          condition: 'sellable',
        });
      }
    });

    const returnData: Return = {
      id: `ret_${getVerifiedDate().getTime()}`,
      saleId: sale.id,
      date: getVerifiedDate().toISOString(),
      returnType: isAllSelected ? 'full' : 'partial',
      items: returnItems,
      totalRefund: calculateRefund,
      reason: returnReason,
      notes: returnNotes,
    };

    onConfirm(returnData);
    handleClose();
  };

  const stepIcons = ['checklist', 'description', 'verified'];
  const stepLabels = [t.returns.step2, t.returns.step3, t.returns.step4];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size='2xl'
      zIndex={100}
      title={t.returns.processReturn}
      subtitle={`${step === 1 ? t.returns.step2 : step === 2 ? t.returns.step3 : t.returns.step4}`}
    >
      {/* Enhanced Progress Indicator */}
      <div className='flex items-center justify-center gap-2 p-4 mb-4 bg-gray-50 dark:bg-gray-950/50 rounded-2xl'>
        {[1, 2, 3].map((s) => (
          <div key={s} className='flex items-center'>
            <div className='flex flex-col items-center'>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  s === step
                    ? `bg-${color}-600 text-white shadow-lg shadow-${color}-200 dark:shadow-none`
                    : s < step
                      ? `bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600`
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                }`}
              >
                <span className='material-symbols-rounded text-xl'>
                  {s < step ? 'check' : stepIcons[s - 1]}
                </span>
              </div>
              <span
                className={`text-[10px] mt-1 font-medium ${
                  s === step ? `text-${color}-600` : 'text-gray-400'
                }`}
              >
                {stepLabels[s - 1]}
              </span>
            </div>
            {s < 3 && (
              <div
                className={`w-12 h-0.5 mx-2 transition-colors ${
                  s < step ? `bg-${color}-600` : 'bg-gray-200 dark:bg-gray-800'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className='flex-1'>
        {/* Step 1: Select Items */}
        {step === 1 && (
          <div className='space-y-3'>
            <div className='flex items-center justify-between mb-4'>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                {t.returns.selectItems}{' '}
                <span className={`font-bold text-${color}-600`}>
                  ({selectedItems.size} {t.returns.itemsSelected})
                </span>
              </p>
              <button
                onClick={isAllSelected ? deselectAll : selectAll}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isAllSelected
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                    : `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 hover:bg-${color}-200 dark:hover:bg-${color}-900/50`
                }`}
              >
                {isAllSelected
                  ? t.returns.deselectAll || 'Deselect All'
                  : t.returns.selectAll || 'Select All'}
              </button>
            </div>

            {availableItems.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800'>
                <span className='material-symbols-rounded text-4xl mb-2 text-gray-400'>
                  inventory_2
                </span>
                <p>{t.returns.noItemsAvailable || 'All items have been returned'}</p>
              </div>
            ) : (
              <div className='flex flex-col gap-[2px]'>
                {availableItems.map((item, index) => {
                  const isSelected = selectedItems.has(item.lineKey);
                  const selectedQty = selectedItems.get(item.lineKey) || item.availableQty;
                  return (
                    <MaterialTabs
                      key={item.lineKey}
                      index={index}
                      total={availableItems.length}
                      color={color}
                      isSelected={isSelected}
                      onClick={() => toggleItemSelection(item.lineKey, item.availableQty)}
                      className='h-auto py-2'
                    >
                      <div className='w-full flex items-center justify-between gap-4' dir='ltr'>
                        <div className='flex-1 min-w-0 flex flex-col justify-center'>
                          <h4
                            className='font-bold text-gray-900 dark:text-gray-100 truncate text-base leading-tight'
                            style={{ textTransform: 'var(--text-transform)' }}
                          >
                            {item.name}
                            {item.dosageForm && <span className='ml-1'>{item.dosageForm}</span>}
                            {item.isUnit && (
                              <span className='ml-1 text-base bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider'>
                                U
                              </span>
                            )}
                          </h4>
                          <div className='flex items-center gap-2 mt-0 leading-none h-4'>
                            <span
                              className={`text-[10px] font-bold uppercase ${isSelected ? `text-${color}-600 dark:text-${color}-400` : 'text-gray-400'}`}
                            >
                              {t.modal?.qty || 'Qty'}: {item.availableQty}
                            </span>
                            {item.returnedQty > 0 && (
                              <div className='inline-flex items-center gap-1 text-[9px] bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 px-1.5 py-0 rounded-md font-bold border border-orange-100 dark:border-orange-900/30 leading-none h-3.5'>
                                <span className='material-symbols-rounded text-[10px]'>
                                  history
                                </span>
                                {item.returnedQty} {language === 'AR' ? 'مرتجع' : 'returned'}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className='flex items-center gap-4 flex-shrink-0'>
                          <p className='font-bold text-gray-900 dark:text-gray-100 text-base'>
                            $
                            {(item.isUnit && item.unitsPerPack
                              ? item.price / item.unitsPerPack
                              : item.price
                            ).toFixed(2)}
                          </p>
                        </div>

                        {/* Right Side: Selection Indicator OR Counter */}
                        <div onClick={(e) => e.stopPropagation()}>
                          {isSelected ? (
                            <div className='flex items-center gap-3 animate-fadeIn'>
                              <div className='flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 border border-gray-200 dark:border-gray-700 shadow-sm'>
                                <button
                                  onClick={() =>
                                    updateItemQuantity(item.lineKey, Math.max(1, selectedQty - 1))
                                  }
                                  disabled={selectedQty <= 1}
                                  className={`w-7 h-7 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center enabled:hover:text-${color}-600 dark:enabled:hover:text-${color}-400 transition-colors text-gray-600 dark:text-gray-200 disabled:opacity-50 disabled:pointer-events-none`}
                                >
                                  <span className='material-symbols-rounded text-lg'>remove</span>
                                </button>
                                <input
                                  type='number'
                                  min='1'
                                  max={item.availableQty}
                                  value={selectedQty}
                                  onChange={(e) =>
                                    updateItemQuantity(
                                      item.lineKey,
                                      Math.min(
                                        item.availableQty,
                                        Math.max(1, parseInt(e.target.value) || 1)
                                      )
                                    )
                                  }
                                  className='w-10 text-center bg-transparent font-bold text-sm text-gray-900 dark:text-white border-none p-0 focus:ring-0 appearance-none'
                                />
                                <button
                                  onClick={() =>
                                    updateItemQuantity(
                                      item.lineKey,
                                      Math.min(item.availableQty, selectedQty + 1)
                                    )
                                  }
                                  disabled={selectedQty >= item.availableQty}
                                  className={`w-7 h-7 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center enabled:hover:text-${color}-600 dark:enabled:hover:text-${color}-400 transition-colors text-gray-600 dark:text-gray-200 disabled:opacity-50 disabled:pointer-events-none`}
                                >
                                  <span className='material-symbols-rounded text-lg'>add</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 ${
                                isSelected
                                  ? `bg-${color}-600 border-${color}-600 text-white`
                                  : 'border-gray-200 dark:border-gray-700 text-transparent'
                              }`}
                            >
                              <span
                                className={`material-symbols-rounded text-lg ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                              >
                                check
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </MaterialTabs>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Reason & Notes */}
        {step === 2 && (
          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1'>
                {t.returns.returnReason} <span className='text-red-500'>*</span>
              </label>
              <FilterDropdown
                items={reasonOptions}
                selectedItem={reasonOptions.find((r) => r.id === returnReason)}
                isOpen={isReasonDropdownOpen}
                onToggle={() => setIsReasonDropdownOpen(!isReasonDropdownOpen)}
                onSelect={(item) => {
                  setReturnReason(item.id as ReturnReason);
                  setIsReasonDropdownOpen(false);
                }}
                keyExtractor={(item) => item.id}
                renderItem={(item) => (
                  <div className='flex items-center gap-3 py-1'>
                    <span className='material-symbols-rounded text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300 transition-colors'>
                      {item.icon}
                    </span>
                    <span className='font-medium'>{item.label}</span>
                  </div>
                )}
                renderSelected={(item) => (
                  <div className='flex items-center gap-2'>
                    {item && (
                      <span className={`material-symbols-rounded text-${color}-600`}>
                        {item.icon}
                      </span>
                    )}
                    <span className='font-medium'>{item?.label || 'Select Reason'}</span>
                  </div>
                )}
                variant='input'
                color={color}
                className='w-full z-20'
              />
            </div>

            <div className='relative group'>
              <textarea
                id='returnNotes'
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                rows={4}
                dir={returnNotesDir}
                className={`peer w-full px-4 pt-6 pb-2 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none font-medium text-gray-900 dark:text-gray-100 placeholder-transparent`}
                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                placeholder='Additional Notes'
              />
              <label
                htmlFor='returnNotes'
                className={`absolute top-2 start-4 text-xs font-bold text-gray-400 pointer-events-none transition-all 
                    peer-focus:text-${color}-600 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs`}
              >
                {t.returns.notes}
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <div className='space-y-4'>
            <div
              className={`p-5 rounded-3xl bg-gradient-to-br from-${color}-50 to-${color}-100/50 dark:from-${color}-950/30 dark:to-${color}-900/20 border border-${color}-100 dark:border-${color}-800`}
            >
              <div className='flex items-center gap-3 mb-4'>
                <div
                  className={`w-10 h-10 rounded-full bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center shadow-sm`}
                >
                  <span className={`material-symbols-rounded text-${color}-600`}>
                    assignment_return
                  </span>
                </div>
                <h3 className='font-bold text-lg text-gray-900 dark:text-gray-100'>
                  {t.returns.reviewReturn}
                </h3>
              </div>

              <div className='space-y-3 text-sm'>
                <div className='flex items-center gap-3 p-2 rounded-xl bg-white/50 dark:bg-gray-900/20'>
                  <span className='material-symbols-rounded text-gray-400'>help</span>
                  <span className='text-gray-600 dark:text-gray-400 font-medium'>
                    {t.returns.returnReason}:
                  </span>
                  <span className='font-bold text-gray-900 dark:text-gray-100 ms-auto'>
                    {t.returns.reasons[returnReason]}
                  </span>
                </div>
                <div className='flex justify-between items-center p-3 rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 mt-2'>
                  <span className={`text-gray-500 font-medium`}>{t.returns.refundAmount}:</span>
                  <span className={`text-xl font-black text-${color}-600`}>
                    ${calculateRefund.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between px-1'>
                <h4 className='text-sm font-bold text-gray-700 dark:text-gray-300'>
                  {t.returns.itemsToReturn}
                </h4>
                <span className='text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full'>
                  {selectedItems.size} {selectedItems.size === 1 ? t.returns.item : t.returns.items}
                </span>
              </div>

              <div className='max-h-60 overflow-y-auto pr-1 flex flex-col gap-[2px] custom-scrollbar'>
                {Array.from(selectedItems.entries()).map(([lineKey, qty], index) => {
                  const item = availableItems.find((i) => i.lineKey === lineKey);
                  if (!item) return null;

                  return (
                    <MaterialTabs
                      key={lineKey}
                      index={index}
                      total={selectedItems.size}
                      className='bg-gray-50 dark:bg-gray-800/50'
                    >
                      <div
                        className='w-full flex items-center justify-between gap-4 px-4'
                        dir='ltr'
                      >
                        <div className='flex-1 min-w-0 flex items-center gap-2'>
                          <h4
                            className='font-bold text-gray-900 dark:text-gray-100 truncate text-base'
                            style={{ textTransform: 'var(--text-transform)' }}
                          >
                            {item.name}
                            {item.dosageForm && <span className='ml-1'>{item.dosageForm}</span>}
                            {item.isUnit && (
                              <span className='ml-1 text-base bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider'>
                                U
                              </span>
                            )}
                          </h4>
                        </div>

                        <div className='flex items-center gap-4 flex-shrink-0'>
                          <div className='flex flex-col items-end'>
                            <span className='font-bold text-gray-900 dark:text-gray-100 text-base'>
                              {qty}{' '}
                              {item.isUnit
                                ? qty === 1
                                  ? t.returns.unit
                                  : t.returns.units
                                : qty === 1
                                  ? t.returns.pack
                                  : t.returns.packs}
                            </span>
                            <span className='text-[10px] uppercase font-bold text-gray-500'>
                              {t.returns.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    </MaterialTabs>
                  );
                })}
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className='p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 flex items-center gap-3 animate-shake'>
                <div className='w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0'>
                  <span className='material-symbols-rounded text-red-500'>error</span>
                </div>
                <p className='text-sm text-red-700 dark:text-red-300 font-bold'>
                  {validationError}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div dir='ltr' className='pt-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 mt-4'>
        {step > 1 && (
          <button
            onClick={handleBack}
            className='w-12 h-12 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors flex items-center justify-center'
            title={t.returns.back}
          >
            <span className='material-symbols-rounded text-lg'>arrow_back</span>
          </button>
        )}

        <div className='flex-1' />

        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={step === 1 && selectedItems.size === 0}
            className={`px-8 py-2.5 rounded-xl font-bold text-white bg-${color}-600 enabled:hover:bg-${color}-700 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 shadow-lg shadow-${color}-200 dark:shadow-none`}
          >
            {t.returns.next}
            <span className='material-symbols-rounded text-lg'>arrow_forward</span>
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            className={`px-8 py-2.5 rounded-xl font-bold text-white bg-${color}-600 hover:bg-${color}-700 transition-all flex items-center gap-2 shadow-lg shadow-${color}-200 dark:shadow-none`}
          >
            <span className='material-symbols-rounded text-[20px]'>check_circle</span>
            {t.returns.confirmReturn}
          </button>
        )}
      </div>
    </Modal>
  );
};
