import React from 'react';
import { formatCurrency } from '../../../utils/currency';
import { Modal } from '../../common/Modal';
import { AuditTransaction } from '../../../types/intelligence';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: AuditTransaction | null;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  if (!transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تفاصيل العملية #${transaction.invoice_number}`}
      size="lg"
      icon="receipt_long"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">التاريخ والوقت</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {new Date(transaction.timestamp).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي العملية</p>
            <p className="font-bold text-2xl text-emerald-600 dark:text-emerald-400">
              {formatCurrency(transaction.amount)}
            </p>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">تفاصيل إضافية</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">نوع العملية</span>
              <span className={`font-medium px-2 py-0.5 rounded ${
                transaction.type === 'SALE' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : transaction.type === 'RETURN'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {transaction.type === 'SALE' ? 'بيع' : 
                 transaction.type === 'RETURN' ? 'مرتجع' : 
                 transaction.type === 'VOID' ? 'إلغاء' : 'تعديل'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">الكمية</span>
              <span className="font-medium text-gray-900 dark:text-white">{transaction.quantity}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">المنتج</span>
              <span className="font-medium text-gray-900 dark:text-white">{transaction.product_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">المستخدم</span>
              <span className="font-medium text-gray-900 dark:text-white">{transaction.cashier_name}</span>
            </div>
          </div>
        </div>

        {/* Anomaly Warning */}
        {transaction.has_anomaly && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <span className="material-symbols-rounded">warning</span>
            <span>تنبيه: {transaction.anomaly_reason || 'تم اكتشاف شذوذ في هذه العملية'}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={() => console.log('Print receipt')}
            className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors font-medium flex items-center gap-2"
          >
            <span className="material-symbols-rounded text-lg">print</span>
            طباعة
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
};
