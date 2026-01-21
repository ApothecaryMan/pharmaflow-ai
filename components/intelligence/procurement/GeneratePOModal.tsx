import React from 'react';
import { Modal } from '../../common/Modal';

// Using a standard Modal interface if available, otherwise a simple implementation
interface GeneratePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProductIds: string[];
}

export const GeneratePOModal: React.FC<GeneratePOModalProps> = ({ 
  isOpen, 
  onClose, 
  selectedProductIds 
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إنشاء طلب شراء"
      size="lg"
      icon="shopping_cart"
    >
      <div className="space-y-4">
          <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
            <span className="material-symbols-rounded text-xl shrink-0">info</span>
            <p>سيتم إنشاء مسودة طلب شراء لـ <strong>{selectedProductIds.length}</strong> أصناف مختارة. يمكنك مراجعة الكميات والأسعار قبل الإرسال للمورد.</p>
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الملاحظات</label>
              <textarea 
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none h-24"
                placeholder="أضف ملاحظات للمورد..."
              />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              إلغاء
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 font-medium flex items-center gap-2"
            >
              <span className="material-symbols-rounded">send</span>
              إنشاء الطلب
            </button>
          </div>
      </div>
    </Modal>
  );
};
