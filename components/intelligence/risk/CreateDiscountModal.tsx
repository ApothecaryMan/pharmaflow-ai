import React, { useState } from 'react';
import { Modal } from '../../common/Modal';

interface CreateDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBatchIds: string[];
  productName?: string;
}

export const CreateDiscountModal: React.FC<CreateDiscountModalProps> = ({
  isOpen,
  onClose,
  selectedBatchIds,
  productName
}) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [validDays, setValidDays] = useState<number>(14);

  const handleApply = () => {
    console.log('Apply Discount:', { discountType, discountValue, validDays, selectedBatchIds });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تطبيق سياسة تخفيض"
      size="md"
      icon="discount"
    >
      <div className="space-y-5">
        {/* Info Banner */}
        <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
          <span className="material-symbols-rounded text-xl shrink-0">warning</span>
          <p>
            سيتم تطبيق التخفيض على <strong>{selectedBatchIds.length}</strong> باتش
            {productName && <> من <strong>{productName}</strong></>}
            . يمكنك تعديل نسبة التخفيض ومدته قبل التطبيق.
          </p>
        </div>

        {/* Discount Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            نوع التخفيض
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDiscountType('percentage')}
              className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
                discountType === 'percentage'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              <span className="material-symbols-rounded text-2xl mb-1">percent</span>
              <p className="font-medium">نسبة مئوية</p>
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('fixed')}
              className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
                discountType === 'fixed'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              <span className="material-symbols-rounded text-2xl mb-1">attach_money</span>
              <p className="font-medium">مبلغ ثابت</p>
            </button>
          </div>
        </div>

        {/* Discount Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {discountType === 'percentage' ? 'نسبة التخفيض (%)' : 'مبلغ التخفيض (ج.م)'}
          </label>
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            min={1}
            max={discountType === 'percentage' ? 100 : undefined}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-lg font-bold text-center"
          />
          {discountType === 'percentage' && (
            <div className="flex gap-2 mt-2">
              {[10, 15, 20, 25, 30].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDiscountValue(val)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    discountValue === val
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Validity Period */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            مدة صلاحية العرض (أيام)
          </label>
          <input
            type="number"
            value={validDays}
            onChange={(e) => setValidDays(Number(e.target.value))}
            min={1}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 font-medium flex items-center gap-2"
          >
            <span className="material-symbols-rounded">check</span>
            تطبيق التخفيض
          </button>
        </div>
      </div>
    </Modal>
  );
};
