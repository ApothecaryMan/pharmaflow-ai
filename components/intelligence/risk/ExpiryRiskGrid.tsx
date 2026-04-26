// Force refresh
import { createColumnHelper } from '@tanstack/react-table';
import type React from 'react';
import { useMemo } from 'react';
import type { ExpiryRiskItem } from '../../../types/intelligence';
import { formatCurrency } from '../../../utils/currency';
import { TanStackTable } from '../../common/TanStackTable';
import { StatusBadge } from '../common/StatusBadge';
import { useSettings } from '../../../context';
import { getDisplayName } from '../../../utils/drugDisplayName';

// --- Local Components ---
// StatusBadge moved to shared components

interface ExpiryRiskGridProps {
  data: ExpiryRiskItem[];
  t?: any;
  leftCustomControls?: React.ReactNode;
  isLoading?: boolean;
}

export const ExpiryRiskGrid: React.FC<ExpiryRiskGridProps> = ({ data, t, leftCustomControls, isLoading = false }) => {
  // Infer language from T object or default (hacky but works if T structure is consistent)
  const language = t?.metadata?.language || 'EN'; // Placeholder if needed, or just pass 'EN' if not critical.
  // Actually usually T comes from useTranslation which doesn't expose language directly often?
  // Let's assume EN for now unless passed. But wait, `t` here is prop.
  // We can pass language prop if available.
  // For now, let's just assume EN or use safe default.

  const { textTransform } = useSettings();

  const columnHelper = createColumnHelper<ExpiryRiskItem>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('product_name', {
        header: t?.intelligence?.risk?.grid?.columns?.product || 'Product / Batch',
        cell: (info) => (
          <div>
            <div className='font-medium'>
              {getDisplayName({ name: info.getValue() }, textTransform)}
            </div>
            <div className='text-xs text-gray-500 font-mono'>{info.row.original.batch_number}</div>
          </div>
        ),
      }),
      columnHelper.accessor('days_until_expiry', {
        header: t?.intelligence?.risk?.grid?.columns?.daysLeft || 'Days Left',
        cell: (info) => {
          const val = info.getValue();
          return (
            <span
              className={`font-bold ${val < 30 ? 'text-red-600' : val < 60 ? 'text-amber-500' : 'text-emerald-600'}`}
            >
              {val} {t?.intelligence?.risk?.grid?.day || 'day'}
            </span>
          );
        },
      }),
      columnHelper.accessor('current_quantity', {
        header: t?.intelligence?.risk?.grid?.columns?.quantity || 'Quantity',
        meta: { align: 'center' },
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('value_at_risk', {
        header: t?.intelligence?.risk?.grid?.columns?.valueAtRisk || 'Value at Risk',
        meta: { align: 'center' },
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor('risk_category', {
        header: t?.intelligence?.risk?.grid?.columns?.riskCategory || 'Risk Category',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('expected_recovery_value', {
        header: t?.intelligence?.risk?.grid?.columns?.recovery || 'Est. Recovery',
        meta: { align: 'center' },
        cell: (info) => (
          <span className='text-emerald-600 font-medium'>
            {formatCurrency(info.getValue() ?? 0)}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: t?.intelligence?.risk?.grid?.columns?.action || 'Action',
        meta: { align: 'end' },
        cell: (info) => {
          const action = info.row.original.recommended_action;
          return (
            <div className='flex justify-end'>
              <button className='px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-sm text-xs font-medium transition-colors'>
                {action === 'DISCOUNT_AGGRESSIVE'
                  ? t?.intelligence?.risk?.grid?.actions?.discount50 || '50% Off'
                  : action === 'DISCOUNT_MODERATE'
                    ? t?.intelligence?.risk?.grid?.actions?.discount25 || '25% Off'
                    : action === 'RETURN'
                      ? t?.intelligence?.risk?.grid?.actions?.return || 'Return'
                      : t?.intelligence?.risk?.grid?.actions?.action || 'Action'}
              </button>
            </div>
          );
        },
      }),
    ],
    [columnHelper, t, textTransform]
  );

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      <TanStackTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        lite={false}
        tableId='expiry-risk-table'
        enableSearch={false}
        emptyMessage={t?.intelligence?.risk?.grid?.empty || 'No risking items found'}
        enablePagination={true}
        enableVirtualization={false}
        pageSize='auto'
        enableShowAll={true}
        leftCustomControls={leftCustomControls}
      />
    </div>
  );
};

