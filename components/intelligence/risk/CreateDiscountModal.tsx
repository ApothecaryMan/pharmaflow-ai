import type React from 'react';
import { useState } from 'react';
import { Modal } from '../../common/Modal';

interface CreateDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBatchIds: string[];
  productName?: string;
  t?: any;
}

export const CreateDiscountModal: React.FC<CreateDiscountModalProps> = ({
  isOpen,
  onClose,
  selectedBatchIds,
  productName,
  t,
}) => {
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [validDays, setValidDays] = useState<number>(14);

  const handleApply = () => {
    console.log('Apply Discount:', { discountType, discountValue, validDays, selectedBatchIds });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='تطبيق سياسة تخفيض' size='md' icon='sell'>
      <div className='space-y-5'>
        {/* Info Banner */}
        <div className='bg-rose-50 dark:bg-rose-900/20 p-4 flex gap-3 text-rose-700 dark:text-rose-400'>
          <span className='material-symbols-rounded shrink-0' style={{ fontSize: 'var(--icon-lg)' }}>warning</span>
          <p className='text-xs font-medium'>
            {t?.intelligence?.risk?.discount?.warning || 'Discounting items can help recover value, but ensure it complies with local regulations.'}
          </p>
        </div>

        {/* Discount Type */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            نوع التخفيض
          </label>
          <div className='flex gap-3'>
            <button
              onClick={() => setDiscountType('PERCENTAGE')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                discountType === 'PERCENTAGE'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'border-[--border-divider] text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className='material-symbols-rounded mb-1 font-icon' style={{ fontSize: 'var(--icon-lg)' }}>percent</span>
              <span className='text-sm font-bold'>{t?.intelligence?.risk?.discount?.percentage || 'Percentage'}</span>
            </button>
            <button
              onClick={() => setDiscountType('FIXED')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                discountType === 'FIXED'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'border-[--border-divider] text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className='material-symbols-rounded mb-1 font-icon' style={{ fontSize: 'var(--icon-lg)' }}>payments</span>
              <span className='text-sm font-bold'>{t?.intelligence?.risk?.discount?.fixed || 'Fixed Amount'}</span>
            </button>
          </div>
        </div>

        {/* Discount Value */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            {discountType === 'PERCENTAGE' ? 'نسبة التخفيض (%)' : 'مبلغ التخفيض (ج.م)'}
          </label>
          <input
            type='number'
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            min={1}
            max={discountType === 'PERCENTAGE' ? 100 : undefined}
            className='w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-hidden transition-all text-lg font-bold text-center'
          />
          {discountType === 'PERCENTAGE' && (
            <div className='flex gap-2 mt-2'>
              {[10, 15, 20, 25, 30].map((val) => (
                <button
                  key={val}
                  type='button'
                  onClick={() => setDiscountValue(val)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    discountValue === val
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
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
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            مدة صلاحية العرض (أيام)
          </label>
          <input
            type='number'
            value={validDays}
            onChange={(e) => setValidDays(Number(e.target.value))}
            min={1}
            className='w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-hidden transition-all'
          />
        </div>

        {/* Actions */}
        <div className='flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors font-medium'
          >
            إلغاء
          </button>
          <button
            onClick={handleApply} // Changed from onClose to handleApply
            className='flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2'
          >
            <span className='material-symbols-rounded font-icon' style={{ fontSize: 'var(--icon-base)' }}>check_circle</span>
            {t?.settings?.common?.apply || 'Apply Discount'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
