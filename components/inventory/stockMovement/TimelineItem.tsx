import React from 'react';
import { StockMovementType } from '../../../types';
import { formatCurrency } from '../../../utils/currency';

interface TimelineItemProps {
  type: StockMovementType;
  date: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  performedBy: string;
  isRTL: boolean;
  status: 'approved' | 'pending' | 'rejected';
  batchId?: string;
  expiryDate?: string;
  value?: number;
}

const typeConfig: Record<StockMovementType, { color: string, label: string, arLabel: string }> = {
  sale: { color: 'rose', label: 'Sale', arLabel: 'بيع' },
  purchase: { color: 'emerald', label: 'Purchase', arLabel: 'شراء' },
  return_customer: { color: 'sky', label: 'Customer Return', arLabel: 'مرتجع عميل' },
  return_supplier: { color: 'orange', label: 'Supplier Return', arLabel: 'مرتجع مورد' },
  adjustment: { color: 'amber', label: 'Adjustment', arLabel: 'تعديل' },
  damage: { color: 'red', label: 'Damage', arLabel: 'تلف' },
  transfer_in: { color: 'indigo', label: 'Transfer In', arLabel: 'تحويل وارد' },
  transfer_out: { color: 'violet', label: 'Transfer Out', arLabel: 'تحويل صادر' },
  initial: { color: 'teal', label: 'Initial Stock', arLabel: 'مخزون رصيد أول' },
  correction: { color: 'slate', label: 'Correction', arLabel: 'تصحيح' },
};

export const TimelineItem: React.FC<TimelineItemProps> = ({
  type,
  date,
  quantity,
  previousStock,
  newStock,
  performedBy,
  isRTL,
  status,
  reason,
  batchId,
  expiryDate,
  value
}) => {
  const config = typeConfig[type] || typeConfig.adjustment;
  const dateObj = new Date(date);
  
  const dateStr = dateObj.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
  
  const timeStr = dateObj.toLocaleTimeString(isRTL ? 'ar-EG-u-nu-latn' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getColorClasses = (color: string) => {
    const map: Record<string, string> = {
      emerald: 'bg-emerald-500 text-emerald-600',
      rose: 'bg-rose-500 text-rose-600',
      sky: 'bg-sky-500 text-sky-600',
      orange: 'bg-orange-500 text-orange-600',
      amber: 'bg-amber-500 text-amber-600',
      red: 'bg-red-500 text-red-600',
      indigo: 'bg-indigo-500 text-indigo-600',
      violet: 'bg-violet-500 text-violet-600',
      teal: 'bg-teal-500 text-teal-600',
      slate: 'bg-slate-500 text-slate-600',
    };
    return map[color] || map.slate;
  };

  const colorClass = getColorClasses(config.color);

  return (
    <div className='flex gap-6 group'>
      {/* Date Column */}
      <div className='w-20 pt-7 flex flex-col shrink-0 items-end pe-2'>
        <span className='text-sm font-bold text-slate-700 dark:text-slate-300'>{dateStr}</span>
        <span className='text-[11px] text-slate-400 font-medium font-mono'>{timeStr}</span>
      </div>

      {/* Axis Column */}
      <div className='relative flex flex-col items-center w-4 shrink-0'>
        {/* Vertical Line */}
        <div className='absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 group-last:hidden' />
        {/* Dot */}
        <div
          className={`w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-900 z-10 mt-[31px] ${colorClass.split(' ')[0]}`}
        />
      </div>

      {/* Content Column */}
      <div className='flex-1 pt-7 pb-7 group-last:pb-7 border-b border-slate-100 dark:border-slate-800 group-last:border-0 min-w-0'>
        <div className='flex flex-col gap-3'>
          {/* Header */}
          <div className='flex items-center gap-2 text-sm leading-none'>
            <span className={`font-bold text-sm tracking-tight ${colorClass.split(' ')[1]}`}>
              {isRTL ? config.arLabel : config.label}
            </span>
            <span className='text-slate-300 dark:text-slate-700 text-[10px]'>•</span>
            <span className='text-[11px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-wider'>
              <span className='material-symbols-rounded text-[16px] opacity-70'>person</span>
              {performedBy}
            </span>
          </div>

          {/* Main Stats Row */}
          <div className='flex flex-wrap items-center gap-x-8 gap-y-3'>
            {/* Quantity */}
            <div className='flex items-baseline gap-1.5'>
              <span
                className={`text-3xl font-black tabular-nums tracking-tighter leading-none ${quantity > 0 ? 'text-emerald-500' : 'text-rose-500'}`}
              >
                {quantity > 0 ? '+' : ''}
                {quantity}
              </span>
              <span className='text-[10px] uppercase font-black text-slate-400 tracking-widest'>
                {isRTL ? 'وحدة' : 'UNITS'}
              </span>
            </div>

            {/* Vertical Divider */}
            <div className='w-px h-6 bg-slate-100 dark:bg-slate-800/50' />

            {/* Value (If exists) */}
            {value && value !== 0 && (
              <div className='flex flex-col gap-1'>
                <span className='text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none'>
                  {isRTL ? 'القيمة' : 'VALUE'}
                </span>
                <span
                  className={`text-base font-bold tabular-nums leading-none tracking-tight ${value > 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                >
                  {formatCurrency(Math.abs(value))}
                </span>
              </div>
            )}

            {/* Change Context */}
            <div className='flex flex-col gap-1'>
              <span className='text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none'>
                {isRTL ? 'الرصيد' : 'BALANCE'}
              </span>
              <div className='flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 leading-none'>
                <span className='tabular-nums opacity-60'>{previousStock}</span>
                <span className='material-symbols-rounded text-[14px] text-slate-300 dark:text-slate-700 rtl:rotate-180'>
                  arrow_right_alt
                </span>
                <span className='text-slate-900 dark:text-slate-100 font-black tabular-nums'>
                  {newStock}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Chips */}
          {(batchId || expiryDate || reason) && (
            <div className='flex flex-wrap items-center gap-2 mt-1'>
              {batchId && (
                <span className='inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold font-mono text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800'>
                  <span className='material-symbols-rounded text-[14px] opacity-70'>tag</span>
                  {batchId}
                </span>
              )}

              {expiryDate && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black border ${
                    new Date(expiryDate) < new Date()
                      ? 'text-rose-700 bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/30'
                      : new Date(expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                        ? 'text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/30'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30'
                  }`}
                >
                  <span className='material-symbols-rounded text-[14px]'>
                    {new Date(expiryDate) < new Date() ? 'event_busy' : 'event_available'}
                  </span>
                  {new Date(expiryDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}

              {reason && (
                <span className='text-xs text-slate-400 dark:text-slate-500 italic font-medium px-1 flex items-center gap-1'>
                   {reason}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
