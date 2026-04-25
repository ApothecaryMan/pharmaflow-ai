import type React from 'react';
import { Modal } from '../../common/Modal';

// Using a standard Modal interface if available, otherwise a simple implementation
interface GeneratePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProductIds: string[];
  t?: any;
}

export const GeneratePOModal: React.FC<GeneratePOModalProps> = ({
  isOpen,
  onClose,
  selectedProductIds,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t?.intelligence?.procurement?.po?.title || 'Create Purchase Order'} 
      size='lg' 
      icon='shopping_cart'
    >
      <div className='space-y-4'>
        {/* Info Banner */}
        <div className='bg-emerald-50 dark:bg-emerald-900/20 p-4 flex gap-3 text-emerald-700 dark:text-emerald-400 rounded-xl'>
          <span className='material-symbols-rounded shrink-0' style={{ fontSize: 'var(--icon-lg)' }}>info</span>
          <p className='text-xs font-medium leading-relaxed'>
            {t?.intelligence?.procurement?.po?.info || 'Generate a purchase order for the selected items to replenish your inventory.'}
          </p>
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            {t?.intelligence?.procurement?.po?.notes || 'Notes'}
          </label>
          <textarea
            className='w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-hidden transition-all resize-none h-24 text-sm'
            placeholder={t?.intelligence?.procurement?.po?.notesPlaceholder || 'Add notes for the supplier...'}
          />
        </div>

        <div className='flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700'>
          <button
            onClick={onClose}
            className='px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors font-medium text-sm'
          >
            {t?.common?.cancel || 'Cancel'}
          </button>
          <button
            onClick={() => {
              console.log('Sending PO for:', selectedProductIds);
              onClose();
            }}
            className='flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2'
          >
            <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-base)' }}>send</span>
            {t?.intelligence?.procurement?.buttons?.sendPO || 'Send PO'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
