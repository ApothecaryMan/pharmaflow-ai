import type React from 'react';
import { useState } from 'react';
import type { Sale, Shift, ProcessReturnPayload } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import { pricing } from '../../utils/money';
import { MODAL_FOOTER_BTN_CANCEL, MODAL_FOOTER_BTN_PRIMARY } from '../../utils/themeStyles';
import { FilterDropdown } from '../common/FilterDropdown';
import { MaterialTabs } from '../common/MaterialTabs';
import { Modal } from '../common/Modal';
import { useSmartDirection } from '../common/SmartInputs';
import { useReturnModalLogic } from '../../hooks/sales/useReturnModalLogic';

interface ReturnModalProps {
  isOpen: boolean;
  sale: Sale;
  onClose: () => void;
  onConfirm: (returnData: ProcessReturnPayload) => Promise<boolean> | void;
  color: string;
  t: Translations;
  language?: string;
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
  currentDailyRefunds = 0,
  currentShift,
}) => {
  const {
    step,
    setStep,
    isProcessing,
    setIsProcessing,
    selectedItems,
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
  } = useReturnModalLogic({
    sale,
    currentShift,
    currentDailyRefunds,
    language,
    t,
  });

  const returnNotesDir = useSmartDirection(returnNotes, t.returns.notes);
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);

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
    reset();
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && selectedItems.size === 0) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleConfirm = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (!validateReturn()) {
      setIsProcessing(false);
      return;
    }

    try {
      const payload = buildReturnPayload();
      const success = await onConfirm(payload);
      
      if (success !== false) {
        handleClose();
      }
    } catch (err) {
      console.error('Return processing error:', err);
      setValidationError(t.errors?.unexpected || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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
      disabled={isProcessing}
      footer={
        <div dir='ltr' className='flex gap-3'>
          {step > 1 && (
            <button
              onClick={handleBack}
              className={MODAL_FOOTER_BTN_CANCEL}
              title={t.returns.back}
              type='button'
            >
              <span className='material-symbols-rounded text-lg'>arrow_back</span>
            </button>
          )}

          <div className='flex-1' />

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={step === 1 && selectedItems.size === 0}
              className={MODAL_FOOTER_BTN_PRIMARY}
              type='button'
            >
              {t.returns.next}
              <span className='material-symbols-rounded text-lg'>arrow_forward</span>
            </button>
          ) : (
            <button onClick={handleConfirm} className={MODAL_FOOTER_BTN_PRIMARY} type='button'>
              {isProcessing ? (
                <span className='material-symbols-rounded text-[20px] animate-spin'>sync</span>
              ) : (
                <span className='material-symbols-rounded text-[20px]'>check_circle</span>
              )}
              {isProcessing ? t.common?.processing || 'Processing...' : t.returns.confirmReturn}
            </button>
          )}
        </div>
      }
    >
      {/* Enhanced Progress Indicator */}
      <div className='flex items-center justify-center gap-2 p-4 mb-4 bg-gray-50 dark:bg-gray-950/50 rounded-2xl'>
        {[1, 2, 3].map((s) => (
          <div key={s} className='flex items-center'>
            <div className='flex flex-col items-center'>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  s === step
                    ? `bg-primary-600 text-white shadow-lg shadow-primary-200 dark:shadow-none`
                    : s < step
                      ? `bg-primary-100 dark:bg-primary-900/50 text-primary-600`
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                }`}
              >
                <span className='material-symbols-rounded text-xl'>
                  {s < step ? 'check' : stepIcons[s - 1]}
                </span>
              </div>
              <span
                className={`text-[10px] mt-1 font-medium ${
                  s === step ? `text-primary-600` : 'text-gray-400'
                }`}
              >
                {stepLabels[s - 1]}
              </span>
            </div>
            {s < 3 && (
              <div
                className={`w-12 h-0.5 mx-2 transition-colors ${
                  s < step ? `bg-primary-600` : 'bg-gray-200 dark:bg-gray-800'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className='flex-1'>
        {step === 1 && (
          <div className='space-y-3'>
            <div className='flex items-center justify-between mb-4'>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                {t.returns.selectItems}{' '}
                <span className={`font-bold text-primary-600`}>
                  ({selectedItems.size} {t.returns.itemsSelected})
                </span>
              </p>
              <button
                onClick={isAllSelected ? deselectAll : selectAll}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isAllSelected
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                    : `bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50`
                }`}
                type='button'
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
                  const isSelected = selectedItems.has(item.saleItemId);
                  const selectedQty = selectedItems.get(item.saleItemId) || item.effectiveMaxQty;
                  const expiryDate = item.batchAllocations?.[0]?.expiryDate || item.expiryDate;
                  const expiryDisplay = expiryDate
                    ? `${(new Date(expiryDate).getMonth() + 1).toString().padStart(2, '0')}/${new Date(expiryDate).getFullYear().toString().slice(-2)}`
                    : '--/--';
                  const discountedPrice = pricing.afterDiscount(item.publicPrice, item.discount || 0);
                  const displayPrice = item.effectiveUnitMode && item.unitsPerPack > 1
                    ? discountedPrice / item.unitsPerPack
                    : discountedPrice;
                  const toggleBtn = item.unitsPerPack > 1 ? (
                    <button
                      onClick={() => toggleUnitMode(item.saleItemId, item.effectiveMaxQty, item.unitsPerPack)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold uppercase transition-all border ${
                        isSelected
                          ? item.effectiveUnitMode
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : item.effectiveUnitMode
                            ? 'bg-sky-50 text-sky-500 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800'
                            : 'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}
                      type='button'
                      title={item.effectiveUnitMode ? t.returns.switchToPack : t.returns.switchToUnit}
                    >
                      {item.effectiveUnitMode ? 'U' : 'P'}
                    </button>
                  ) : null;
                  return (
                    <MaterialTabs
                      key={item.saleItemId}
                      index={index}
                      total={availableItems.length}
                      color={color}
                      isSelected={isSelected}
                      onClick={() => toggleItemSelection(item.saleItemId, item.effectiveMaxQty)}
                      className='h-auto py-2'
                    >
                      <div className='w-full flex items-center justify-between gap-4' dir='ltr'>
                        <div className='flex-1 min-w-0 flex flex-col justify-center'>
                          <h4
                            className='font-bold text-gray-900 dark:text-gray-100 truncate text-base leading-tight'
                            style={{ textTransform: 'var(--text-transform)' }}
                          >
                            {getDisplayName({ name: item.name, dosageForm: item.dosageForm })}
                            {item.effectiveUnitMode && (
                              <span className='ml-1 text-base bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider'>
                                {language === 'AR' ? 'وحدة' : 'U'}
                              </span>
                            )}
                          </h4>
                          <div className='flex items-center gap-2 mt-0 leading-none h-4'>
                            <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>
                              {t.modal?.qty || 'Qty'}: {item.effectiveMaxQty}
                            </span>
                            <span className='text-[10px] font-mono font-bold text-gray-400 select-none'>{expiryDisplay}</span>
                            {item.returnedQty > 0 && (
                              <div className='inline-flex items-center gap-1 text-[9px] bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 px-1.5 py-0 rounded-md font-bold border border-orange-100 dark:border-orange-900/30 leading-none h-3.5'>
                                <span className='material-symbols-rounded text-[10px]'>history</span>
                                {item.returnedQty} {language === 'AR' ? 'مُرجع' : 'returned'}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className='flex items-center gap-4 shrink-0'>
                          <div className='flex flex-col items-end leading-tight'>
                            <p className='font-bold text-gray-900 dark:text-gray-100 text-base'>
                              {formatCurrency(displayPrice)}
                            </p>
                            {item.discount > 0 && (
                              <p className='text-[10px] text-gray-400 line-through opacity-60'>
                                {formatCurrency(item.publicPrice)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div role="button" tabIndex={0} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}>
                          <div className='flex items-center gap-1'>
                            {toggleBtn}
                            {isSelected ? (
                              <div className='flex items-center gap-1 bg-[var(--bg-skeleton)] rounded-full p-0.5 border border-gray-200 dark:border-gray-700 shadow-xs'>
                                <button onClick={() => updateItemQuantity(item.saleItemId, Math.max(1, selectedQty - 1))} disabled={selectedQty <= 1} className='w-7 h-7 rounded-full bg-white dark:bg-gray-700 shadow-xs flex items-center justify-center enabled:hover:text-primary-600 dark:enabled:hover:text-primary-400 transition-colors text-gray-600 dark:text-gray-200 disabled:opacity-50 disabled:pointer-events-none' type='button'>
                                  <span className='material-symbols-rounded text-lg'>remove</span>
                                </button>
                                <input type='number' min='1' max={item.effectiveMaxQty} value={selectedQty} onChange={(e) => updateItemQuantity(item.saleItemId, Math.min(item.effectiveMaxQty, Math.max(1, parseInt(e.target.value, 10) || 1)))} className='w-10 text-center bg-transparent font-bold text-sm text-gray-900 dark:text-white border-none p-0 focus:ring-0 appearance-none' />
                                <button onClick={() => updateItemQuantity(item.saleItemId, Math.min(item.effectiveMaxQty, selectedQty + 1))} disabled={selectedQty >= item.effectiveMaxQty} className='w-7 h-7 rounded-full bg-white dark:bg-gray-700 shadow-xs flex items-center justify-center enabled:hover:text-primary-600 dark:enabled:hover:text-primary-400 transition-colors text-gray-600 dark:text-gray-200 disabled:opacity-50 disabled:pointer-events-none' type='button'>
                                  <span className='material-symbols-rounded text-lg'>add</span>
                                </button>
                              </div>
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 ${isSelected ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-transparent'}`}>
                                <span className={`material-symbols-rounded text-lg ${isSelected ? 'opacity-100' : 'opacity-0'}`}>check</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </MaterialTabs>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className='space-y-6'>
            <div>
              <span className='block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1'>
                {t.returns.returnReason} <span className='text-red-500'>*</span>
              </span>
              <FilterDropdown
                items={reasonOptions}
                selectedItem={reasonOptions.find((r) => r.id === returnReason)}
                isOpen={isReasonDropdownOpen}
                onToggle={() => setIsReasonDropdownOpen(!isReasonDropdownOpen)}
                onSelect={(item) => {
                  setReturnReason(item.id as any);
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
                      <span className={`material-symbols-rounded text-primary-600`}>
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
                className={`peer w-full px-4 pt-6 pb-2 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:border-transparent transition-all resize-none font-medium text-gray-900 dark:text-gray-100 placeholder-transparent`}
                style={{ '--tw-ring-color': `var(--color-primary-500)` } as any}
                placeholder='Additional Notes'
              />
              <span
                htmlFor='returnNotes'
                className={`absolute top-2 inset-s-4 text-xs font-bold text-gray-400 pointer-events-none transition-all 
 peer-focus:text-primary-600 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs`}
              >
                {t.returns.notes}
              </span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className='space-y-4'>
            <div
              className={`p-5 rounded-3xl bg-linear-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/30 dark:to-primary-900/20 border border-primary-100 dark:border-primary-800`}
            >
              <div className='flex items-center gap-3 mb-4'>
                <div
                  className={`w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center shadow-xs`}
                >
                  <span className={`material-symbols-rounded text-primary-600`}>
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
                <div className='flex justify-between items-center p-3 rounded-xl bg-white dark:bg-gray-900 shadow-xs border border-gray-100 dark:border-gray-800 mt-2'>
                  <span className={`text-gray-500 font-medium`}>{t.returns.refundAmount}:</span>
                  <span className={`text-xl font-black text-primary-600`}>
                    {formatCurrency(calculateRefund)}
                  </span>
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between px-1'>
                <h4 className='text-sm font-bold text-gray-700 dark:text-gray-300'>
                  {t.returns.itemsToReturn}
                </h4>
                <span className='text-xs font-medium text-gray-500 bg-[var(--bg-skeleton)] px-2 py-0.5 rounded-full'>
                  {selectedItems.size} {selectedItems.size === 1 ? t.returns.item : t.returns.items}
                </span>
              </div>

              <div className='max-h-60 overflow-y-auto pr-1 flex flex-col gap-[2px] custom-scrollbar'>
                {Array.from(selectedItems.entries()).map(([lineKey, qty], index) => {
                  const item = availableItems.find((i) => i.saleItemId === lineKey);
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
                            className='font-bold text-gray-900 dark:text-gray-100 truncate text-base leading-tight'
                            style={{ textTransform: 'var(--text-transform)' }}
                          >
                            {getDisplayName({
                              name: item.name,
                              dosageForm: item.dosageForm,
                            })}
                            {item.effectiveUnitMode && (
                              <span className='ml-1 text-base bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider'>
                                {language === 'AR' ? 'وحدة' : 'U'}
                              </span>
                            )}
                          </h4>
                          <div className='flex items-center gap-2 mt-0 leading-none h-4'>
                            <span className='text-[10px] font-mono font-bold text-gray-400 select-none'>
                              {item.expiryDate
                                ? `${(new Date(item.expiryDate).getMonth() + 1).toString().padStart(2, '0')}/${new Date(item.expiryDate).getFullYear().toString().slice(-2)}`
                                : '--/--'}
                            </span>
                          </div>
                        </div>

                        <div className='flex items-center gap-6 shrink-0'>
                          <div className='flex flex-col items-end leading-tight'>
                            <p className='font-bold text-gray-900 dark:text-gray-100 text-base'>
                              {formatCurrency(pricing.afterDiscount(item.publicPrice, item.discount || 0))}
                            </p>
                            {item.discount > 0 && (
                              <p className='text-[10px] text-gray-400 line-through opacity-60'>
                                {formatCurrency(item.publicPrice)}
                              </p>
                            )}
                          </div>
                          <div className='flex flex-col items-end'>
                            <span className='font-bold text-gray-900 dark:text-gray-100 text-base'>
                              {qty} {item.effectiveUnitMode
                                ? (qty === 1 ? t.returns.unit : t.returns.units)
                                : (qty === 1 ? t.returns.pack : t.returns.packs)}
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
                <div className='w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0'>
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
    </Modal>
  );
};
