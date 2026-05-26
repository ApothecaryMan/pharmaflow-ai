import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { FilterDropdown } from '../common/FilterDropdown';
import { SmartTextarea, SmartInput } from '../common/SmartInputs';
import type { TRANSLATIONS } from '../../i18n/translations';
import type { ExpenseCategory, ExpensePaymentMethod, Shift } from '../../types';

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: typeof TRANSLATIONS.EN;
  language: 'EN' | 'AR';
  onRecord: (payload: {
    amount: number;
    category: ExpenseCategory;
    description: string;
    paymentMethod: ExpensePaymentMethod;
  }) => Promise<any>;
  currentShift: Shift | null;
}

export const RecordExpenseModal: React.FC<RecordExpenseModalProps> = ({
  isOpen,
  onClose,
  t,
  language,
  onRecord,
  currentShift,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('misc');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('cash');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const amountInputRef = useRef<HTMLInputElement>(null);
  const isRtl = language === 'AR';

  // Focus amount input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 50);
      // Reset form fields
      setAmount('');
      setCategory('misc');
      setDescription('');
      setPaymentMethod('cash');
      setValidationError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Compute shift balance details if active
  const shiftBalanceDetails = (() => {
    if (!currentShift) return null;
    
    // Balance lock calculations: available cash above base (openingBalance)
    const cashInTotal = Number(currentShift.cashIn || 0);
    const cashSalesTotal = Number(currentShift.cashSales || 0);
    const cashPurchaseReturnsTotal = Number(currentShift.cashPurchaseReturns || 0);
    const cashOutTotal = Number(currentShift.cashOut || 0);
    const returnsTotal = Number(currentShift.returns || 0);
    const cashPurchasesTotal = Number(currentShift.cashPurchases || 0);

    const availableCashAboveBase = 
      (cashInTotal + cashSalesTotal + cashPurchaseReturnsTotal) - 
      (cashOutTotal + returnsTotal + cashPurchasesTotal);

    return {
      availableCashAboveBase,
      openingBalance: Number(currentShift.openingBalance || 0),
    };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      setValidationError(t.expenses.validation.amountRequired);
      return;
    }
    if (parsedAmount <= 0) {
      setValidationError(t.expenses.validation.positiveAmount);
      return;
    }
    if (!description.trim()) {
      setValidationError(t.expenses.validation.descriptionRequired);
      return;
    }

    // Shift balance validation for cash payments
    if (paymentMethod === 'cash' && shiftBalanceDetails) {
      if (parsedAmount > shiftBalanceDetails.availableCashAboveBase) {
        setValidationError(t.expenses.validation.insufficientBalance);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onRecord({
        amount: parsedAmount,
        category,
        description: description.trim(),
        paymentMethod,
      });
      onClose();
    } catch (err: any) {
      console.error('[RecordExpenseModal] Submission failed:', err);
      setValidationError(err.message || 'An error occurred while saving the expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories: { value: ExpenseCategory; label: string }[] = [
    { value: 'utilities', label: t.expenses.categories.utilities },
    { value: 'rent', label: t.expenses.categories.rent },
    { value: 'maintenance', label: t.expenses.categories.maintenance },
    { value: 'supplies', label: t.expenses.categories.supplies },
    { value: 'petty_cash', label: t.expenses.categories.petty_cash },
    { value: 'transportation', label: t.expenses.categories.transportation },
    { value: 'salaries', label: t.expenses.categories.salaries },
    { value: 'misc', label: t.expenses.categories.misc },
  ];

  const selectedCategoryOption = categories.find(c => c.value === category) || categories[7];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.expenses.modal.title}
      icon="receipt_long"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-start" dir={isRtl ? 'rtl' : 'ltr'}>
        {validationError && (
          <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg flex items-center gap-2">
            <span className="material-symbols-rounded text-sm">warning</span>
            <span>{validationError}</span>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label htmlFor="expense-amount-input" className="block text-xs font-bold text-(--text-secondary) uppercase mb-1">
            {t.expenses.modal.amount}
          </label>
          <div className="relative rounded-lg">
            <SmartInput
              id="expense-amount-input"
              ref={amountInputRef}
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full h-10 bg-zinc-500/5 dark:bg-zinc-400/10 border border-(--border-divider) rounded-lg text-sm ${
                isRtl ? 'text-right pl-12 pr-3' : 'text-left pr-12  pl-3'
              }`}
              required
            />
            <div className={`absolute inset-y-0 flex items-center pr-3 pointer-events-none ${isRtl ? 'left-3' : 'right-3'}`}>
              <span className="text-xs text-(--text-tertiary)">{t.global.currency}</span>
            </div>
          </div>
        </div>

        {/* Category Dropdown */}
        <div>
          <label htmlFor="expense-category-dropdown" className="block text-xs font-bold text-(--text-secondary) uppercase mb-1">
            {t.expenses.modal.category}
          </label>
          <FilterDropdown
            items={categories}
            selectedItem={selectedCategoryOption}
            onSelect={(item) => setCategory(item.value)}
            keyExtractor={(item) => item.value}
            renderSelected={(item) => <span>{item?.label || t.expenses.categories.misc}</span>}
            renderItem={(item) => <span>{item.label}</span>}
            variant="input"
            className="w-full"
            color="emerald"
            floating={true}
            minHeight={40}
          />
        </div>

        {/* Payment Method Selector */}
        <div>
          <span className="block text-xs font-bold text-(--text-secondary) uppercase mb-1">
            {t.expenses.modal.paymentMethod}
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(['cash', 'bank_transfer', 'card'] as ExpensePaymentMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`h-9 text-xs font-medium rounded-lg border transition-all duration-200 ${
                  paymentMethod === method
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'border-(--border-divider) hover:bg-zinc-500/5 text-(--text-secondary)'
                }`}
              >
                {method === 'cash'
                  ? t.expenses.modal.cash
                  : method === 'bank_transfer'
                  ? t.expenses.modal.bank_transfer
                  : t.expenses.modal.card}
              </button>
            ))}
          </div>
        </div>

        {/* Active Shift Cash Warning Info Box */}
        {paymentMethod === 'cash' && (
          <div className="p-3 bg-zinc-500/5 dark:bg-zinc-400/5 border border-(--border-divider) rounded-lg space-y-1">
            {currentShift ? (
              <div className="flex justify-between items-center text-xs">
                <span className="text-(--text-secondary)">{t.expenses.modal.shiftBalance}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {shiftBalanceDetails?.availableCashAboveBase.toFixed(2)} {t.global.currency}
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                <span className="material-symbols-rounded text-sm shrink-0">info</span>
                <span>{t.expenses.modal.noShiftWarning}</span>
              </div>
            )}
          </div>
        )}

        {/* Description Textarea */}
        <div>
          <label htmlFor="expense-desc-input" className="block text-xs font-bold text-(--text-secondary) uppercase mb-1">
            {t.expenses.modal.description}
          </label>
          <SmartTextarea
            id="expense-desc-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-zinc-500/5 dark:bg-zinc-400/10 border border-(--border-divider) rounded-lg text-sm h-20 resize-none"
            placeholder={t.expenses.modal.description}
            required
          />
        </div>

        {/* Actions Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-(--border-divider)/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 text-xs font-semibold rounded-lg border border-(--border-divider) hover:bg-zinc-500/5 transition-all text-(--text-secondary)"
            disabled={isSubmitting}
          >
            {t.expenses.modal.cancel}
          </button>
          <button
            type="submit"
            className="px-4 h-9 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? t.common.loading : t.expenses.modal.confirm}
          </button>
        </div>
      </form>
    </Modal>
  );
};
