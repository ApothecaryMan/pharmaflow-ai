import type React from 'react';
import type { AuditTransaction } from '../../../types/intelligence';
import { formatCurrency } from '../../../utils/currency';
import { Modal } from '../../common/Modal';
import { useSettings } from '../../../context';
import { getDisplayName } from '../../../utils/drugDisplayName';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: AuditTransaction | null;
  t?: any;
  language?: string;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  t,
  language = 'EN',
}) => {
  const { textTransform } = useSettings();
  if (!transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t?.intelligence?.audit?.details?.title || 'Transaction Details'} #${transaction.invoice_number}`}
      size='lg'
      icon='receipt_long'
    >
      <div className='space-y-6'>
        {/* Header Info */}
        <div className='grid grid-cols-2 gap-4'>
          <div className='bg-gray-50 dark:bg-gray-800 p-4 rounded-xl'>
            <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
              {t?.intelligence?.audit?.details?.dateTime || 'Date & Time'}
            </p>
            <p className='font-bold text-gray-900 dark:text-white'>
              {new Date(transaction.timestamp).toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className='bg-gray-50 dark:bg-gray-800 p-4 rounded-xl'>
            <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
              {t?.intelligence?.audit?.details?.totalAmount || 'Total Amount'}
            </p>
            <p className='font-bold text-2xl text-emerald-600 dark:text-emerald-400'>
              {formatCurrency(transaction.amount)}
            </p>
          </div>
        </div>

        {/* Transaction Details */}
        <div className='border-t border-gray-100 dark:border-gray-700 pt-4'>
          <h4 className='text-sm font-bold text-gray-700 dark:text-gray-300 mb-3'>
            {t?.intelligence?.audit?.details?.additionalDetails || 'Additional Details'}
          </h4>
          <div className='grid grid-cols-2 gap-3 text-sm'>
            <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
              <span className='text-gray-500'>{t?.intelligence?.audit?.grid?.columns?.type || 'Type'}</span>
              {(() => {
                let config = { color: 'gray', icon: 'edit', label: t?.intelligence?.audit?.types?.edit || 'Edit' };
                if (transaction.type === 'SALE')
                  config = { color: 'emerald', icon: 'check_circle', label: t?.intelligence?.audit?.types?.sale || 'Sale' };
                else if (transaction.type === 'RETURN')
                  config = { color: 'red', icon: 'keyboard_return', label: t?.intelligence?.audit?.types?.return || 'Return' };
                else if (transaction.type === 'VOID')
                  config = { color: 'gray', icon: 'cancel', label: t?.intelligence?.audit?.types?.void || 'Void' };

                return (
                  <span
                    className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current text-${config.color}-700 dark:text-${config.color}-400 text-xs font-bold uppercase tracking-wider bg-transparent`}
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-sm)' }}>{config.icon}</span>
                    {config.label}
                  </span>
                );
              })()}
            </div>
            <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
              <span className='text-gray-500'>{t?.intelligence?.audit?.grid?.columns?.qty || 'Qty'}</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {transaction.quantity}
              </span>
            </div>
            <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
              <span className='text-gray-500'>{t?.intelligence?.audit?.grid?.columns?.product || 'Product'}</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {getDisplayName({ name: transaction.product_name }, textTransform)}
              </span>
            </div>
            <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
              <span className='text-gray-500'>{t?.intelligence?.audit?.grid?.columns?.user || 'User'}</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {transaction.cashier_name}
              </span>
            </div>
          </div>
        </div>

        {/* Anomaly Warning */}
        {transaction.has_anomaly && (
          <div className='bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2'>
            <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>warning</span>
            <span>{t?.intelligence?.audit?.details?.anomalyWarning || 'Warning'}: {transaction.anomaly_reason || (t?.intelligence?.audit?.details?.anomalyDetected || 'Anomaly detected in this transaction')}</span>
          </div>
        )}

        {/* Actions */}
        <div className='flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700'>
          <button
            onClick={() => console.log('Print receipt')}
            className='px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors font-medium flex items-center gap-2 text-sm'
          >
            <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>print</span>
            {t?.common?.print || 'Print'}
          </button>
          <button
            type='button'
            onClick={onClose}
            className='px-6 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors font-medium text-sm'
          >
            {t?.common?.close || 'Close'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
