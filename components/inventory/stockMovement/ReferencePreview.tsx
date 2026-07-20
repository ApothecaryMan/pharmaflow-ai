import type React from 'react';
import { useEffect, useState } from 'react';
import { salesRepository } from '../../../services/sales/repositories/salesRepository';
import { purchaseRepository } from '../../../services/purchases/repositories/purchaseRepository';
import { returnsRepository } from '../../../services/returns/repositories/returnsRepository';
import type { Sale, Purchase, Return, PurchaseReturn } from '../../../types';
import { formatCurrency } from '../../../utils/currency';
import { useSettings } from '../../../context';

interface ReferencePreviewProps {
  referenceId: string;
  type: string;
  onClose: () => void;
}

export const ReferencePreview: React.FC<ReferencePreviewProps> = ({ referenceId, type, onClose }) => {
  const { language } = useSettings();
  const isRTL = language === 'AR';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Sale | Purchase | Return | PurchaseReturn | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        let result: any = null;
        if (type === 'sale') {
          result = await salesRepository.getById(referenceId);
        } else if (type === 'purchase') {
          result = await purchaseRepository.getById(referenceId);
        } else if (type === 'return_customer') {
          result = await returnsRepository.getSalesById(referenceId);
        }
        
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load reference data', err);
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [referenceId, type]);

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center h-full p-8'>
        <div className='w-8 h-8 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mb-4' />
        <span className='text-gray-500 text-sm'>{isRTL ? '???? ???????...' : 'Loading...'}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className='flex flex-col items-center justify-center h-full p-8'>
        <span className='material-symbols-rounded text-gray-400 text-4xl mb-4'>error</span>
        <span className='text-gray-500 text-sm'>
          {isRTL ? '?? ??? ?????? ??? ????????' : 'Details not found'}
        </span>
      </div>
    );
  }

  const isSale = type === 'sale';
  const isPurchase = type === 'purchase';
  const isReturn = type === 'return_customer';

  const date = data.date || (data as any).created_at || (data as any).timestamp;
  const serialId = (data as any).serialId || (data as any).serial_id || data.id.slice(0, 8);
  const items = data.items || [];
  const totalAmount = data.totalAmount || (data as any).total_amount || 0;

  return (
    <div className='flex flex-col h-full bg-white dark:bg-(--bg-navbar) shadow-xl border-l rtl:border-l-0 rtl:border-r border-gray-200 dark:border-white/10'>
      <div className='flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10'>
        <div>
          <h3 className='font-bold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2'>
            {isSale && <span className='material-symbols-rounded text-rose-500 text-xl'>receipt</span>}
            {isPurchase && <span className='material-symbols-rounded text-emerald-500 text-xl'>local_shipping</span>}
            {isReturn && <span className='material-symbols-rounded text-sky-500 text-xl'>assignment_return</span>}
            {isRTL ? '?????? ??????' : 'Movement Details'}
          </h3>
          <p className='text-sm text-gray-500 font-mono mt-1'>{serialId}</p>
        </div>
        <button
          onClick={onClose}
          className='p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-500 transition-colors'
        >
          <span className='material-symbols-rounded'>close</span>
        </button>
      </div>

      <div className='flex-1 overflow-y-auto p-4'>
        <div className='grid grid-cols-2 gap-3 mb-6'>
          <div className='bg-gray-50 dark:bg-white/5 p-3 rounded-xl'>
            <span className='block text-[10px] uppercase font-bold text-gray-500 mb-1'>
              {isRTL ? '???????' : 'Date'}
            </span>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              {date ? new Date(date).toLocaleString() : 'N/A'}
            </span>
          </div>
          <div className='bg-gray-50 dark:bg-white/5 p-3 rounded-xl'>
            <span className='block text-[10px] uppercase font-bold text-gray-500 mb-1'>
              {isRTL ? '????????' : 'Total'}
            </span>
            <span className='text-sm font-bold text-gray-900 dark:text-white'>
              {formatCurrency(totalAmount, 'EGP', isRTL ? 'ar-EG' : 'en-US')}
            </span>
          </div>
        </div>

        <div>
          <h4 className='text-sm font-bold text-gray-900 dark:text-white mb-3'>
            {isRTL ? '???????' : 'Items'} ({items.length})
          </h4>
          <div className='space-y-3'>
            {items.map((item: any, idx: number) => (
              <div key={idx} className='bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 p-3 rounded-xl shadow-sm'>
                <div className='font-medium text-gray-900 dark:text-gray-100 text-sm mb-2'>
                  {item.drugName || item.drug_name || 'Unknown Item'}
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-gray-500 bg-gray-100 dark:bg-black/20 px-2 py-0.5 rounded text-xs font-bold'>
                    {item.quantity} {isRTL ? '????' : 'Pack'}
                  </span>
                  <span className='font-bold text-gray-900 dark:text-white'>
                    {formatCurrency(item.unitPrice || item.unit_price || item.costPrice || 0, 'EGP', isRTL ? 'ar-EG' : 'en-US')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
