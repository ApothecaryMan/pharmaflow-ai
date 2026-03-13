import React from 'react';
import { StockMovementType } from '../../../types';
import { formatCurrency } from '../../../utils/currency';
import { formatExpiryDate, checkExpiryStatus, getExpiryStatusConfig } from '../../../utils/expiryUtils';

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
      gray: 'bg-gray-500 text-gray-600',
    };
    return map[color] || map.gray;
  };

  const colorClass = getColorClasses(config.color === 'slate' ? 'gray' : config.color);

  return (
    <div className='flex gap-6 group'>
      {/* Date Column */}
      <div className='w-20 pt-[19px] flex flex-col shrink-0 items-end pe-2'>
        <span className='text-sm font-bold text-gray-700 dark:text-gray-300 leading-tight'>{dateStr}</span>
        <span className='text-[11px] text-gray-400 font-medium font-mono leading-tight'>{timeStr}</span>
      </div>

      {/* Axis Column */}
      <div className='relative flex flex-col items-center w-4 shrink-0'>
        {/* Vertical Line - Top segment (from top of div to dot center) */}
        <div className='absolute top-0 h-[37px] w-px bg-gray-100 dark:bg-(--border) group-first:hidden' />
        {/* Vertical Line - Bottom segment (from dot center to bottom of div) */}
        <div className='absolute top-[37px] bottom-0 w-px bg-gray-100 dark:bg-(--border) group-last:hidden' />
        {/* Dot */}
        <div
          className={`w-3 h-3 rounded-full ring-4 ring-white dark:ring-gray-950 z-10 mt-[31px] ${colorClass.split(' ')[0]}`}
        />
      </div>

      {/* Content Column */}
      <div className='flex-1 pt-[30px] pb-7 group-last:pb-7 border-b border-gray-100 dark:border-(--border) group-last:border-0 min-w-0'>
        <div className='flex flex-col gap-3'>
          {/* Header */}
          <div className='flex items-center gap-2 text-sm leading-none'>
            <span className={`font-bold text-sm tracking-tight ${colorClass.split(' ')[1]}`}>
              {isRTL ? config.arLabel : config.label}
            </span>
            <span className='text-gray-300 dark:text-gray-700 text-[10px]'>•</span>
            <span className='text-[11px] text-(--text-secondary) font-bold flex items-center gap-1 uppercase tracking-wider'>
              <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-sm)' }}>person</span>
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
              <span className='text-[10px] uppercase font-black text-gray-400 tracking-widest'>
                {isRTL ? 'وحدة' : 'UNITS'}
              </span>
            </div>

            {/* Vertical Divider */}
            <div className='w-px h-6 bg-gray-100 dark:bg-white/5' />

            {/* Value (If exists) */}
            {value && value !== 0 && (
              <div className='flex flex-col gap-1'>
                <span className='text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] leading-none'>
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
              <span className='text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] leading-none'>
                {isRTL ? 'الرصيد' : 'BALANCE'}
              </span>
              <div className='flex items-center gap-2 text-xs font-bold text-(--text-secondary) leading-none'>
                <span className='tabular-nums opacity-60'>{previousStock}</span>
                <span className='material-symbols-rounded text-(--text-tertiary)' style={{ fontSize: 'var(--icon-sm)' }}>
                  {isRTL ? 'arrow_back' : 'arrow_forward'}
                </span>
                <span className='text-(--text-primary) font-black tabular-nums'>
                  {newStock}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          {(batchId || expiryDate || reason) && (
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1 mt-1'>
              {batchId && (
                <div className='flex items-center gap-1 text-[11px] font-medium text-(--text-tertiary) uppercase tracking-wider'>
                  <span className='material-symbols-rounded opacity-70' style={{ fontSize: 'var(--icon-sm)' }}>tag</span>
                  <span>{batchId}</span>
                </div>
              )}

              {batchId && (expiryDate || reason) && (
                <span className='text-gray-300 dark:text-gray-700 text-[10px]'>•</span>
              )}

              {expiryDate && (() => {
                const status = checkExpiryStatus(expiryDate);
                const config = getExpiryStatusConfig(status);
                return (
                  <div className={`flex items-center gap-1 text-[11px] font-bold text-${config.color}-600 dark:text-${config.color}-400/80`}>
                    <span className='material-symbols-rounded opacity-80' style={{ fontSize: 'var(--icon-sm)' }}>
                      {status === 'invalid' ? 'event_busy' : 'event_available'}
                    </span>
                    <span>{formatExpiryDate(expiryDate)}</span>
                  </div>
                );
              })()}

              {expiryDate && reason && (
                <span className='text-gray-300 dark:text-gray-700 text-[10px]'>•</span>
              )}

              {reason && (
                <span className='text-xs text-(--text-secondary) italic font-medium px-1 flex items-center gap-1'>
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

export default TimelineItem;
