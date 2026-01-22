import React, { useMemo } from 'react';
import { formatCurrency } from '../../../utils/currency';
// Force refresh
import { 
  createColumnHelper, 
} from '@tanstack/react-table';
import { TanStackTable } from '../../common/TanStackTable';
import { ExpiryRiskItem } from '../../../types/intelligence';

// --- Local Components ---
type BadgeColor = 'emerald' | 'blue' | 'amber' | 'red' | 'gray' | 'purple';

const StatusBadge = ({
  status,
  label,
  color,
  size = 'md',
  language = 'EN'
}: {
  status: string;
  label?: string;
  color?: BadgeColor;
  size?: 'sm' | 'md';
  language?: string;
}) => {
  // Default mappings
  const getStatusConfig = (statusKey: string): { color: BadgeColor; label: string } => {
    const isAr = language === 'AR';
    switch (statusKey) {
      // Risk Category
      case 'HIGH': return { color: 'red', label: isAr ? 'مخاطرة عالية' : 'High Risk' };
      case 'MEDIUM': return { color: 'amber', label: isAr ? 'مخاطرة متوسطة' : 'Medium Risk' };
      case 'CRITICAL_RISK': return { color: 'red', label: isAr ? 'مخاطرة حرجة' : 'Critical Risk' };
      case 'LOW_RISK': return { color: 'emerald', label: isAr ? 'مخاطرة قليلة' : 'Low Risk' };
      
      default: return { color: 'gray', label: statusKey };
    }
  };

  const config = getStatusConfig(status);
  const finalColor = color || config.color;
  const finalLabel = label || config.label;

  const colorClasses = {
    emerald: 'bg-transparent text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    amber: 'bg-transparent text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    red: 'bg-transparent text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    gray: 'bg-transparent text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center justify-center rounded-md border font-medium whitespace-nowrap ${colorClasses[finalColor]} ${sizeClass}`}>
      {finalLabel}
    </span>
  );
};

interface ExpiryRiskGridProps {
  data: ExpiryRiskItem[];
  t?: any;
}

export const ExpiryRiskGrid: React.FC<ExpiryRiskGridProps> = ({ data, t }) => {
  // Infer language from T object or default (hacky but works if T structure is consistent)
  const language = t?.metadata?.language || 'EN'; // Placeholder if needed, or just pass 'EN' if not critical. 
  // Actually usually T comes from useTranslation which doesn't expose language directly often?
  // Let's assume EN for now unless passed. But wait, `t` here is prop.
  // We can pass language prop if available. 
  // For now, let's just assume EN or use safe default.

  const columnHelper = createColumnHelper<ExpiryRiskItem>();

  const columns = useMemo(() => [
    columnHelper.accessor('product_name', {
      header: t?.intelligence?.risk?.grid?.columns?.product || 'Product / Batch',
      cell: info => (
        <div>
          <div className="font-medium">{info.getValue()}</div>
          <div className="text-xs text-gray-500 font-mono">{info.row.original.batch_number}</div>
        </div>
      ),
    }),
    columnHelper.accessor('days_until_expiry', {
      header: t?.intelligence?.risk?.grid?.columns?.daysLeft || 'Days Left',
      cell: info => {
        const val = info.getValue();
        return (
            <span className={`font-bold ${val < 30 ? 'text-red-600' : val < 60 ? 'text-amber-500' : 'text-blue-500'}`}>
                {val} {t?.intelligence?.risk?.grid?.day || 'day'}
            </span>
        );
      },
    }),
    columnHelper.accessor('current_quantity', {
        header: t?.intelligence?.risk?.grid?.columns?.quantity || 'Quantity',
        meta: { align: 'center' },
        cell: info => info.getValue()
    }),
    columnHelper.accessor('value_at_risk', {
        header: t?.intelligence?.risk?.grid?.columns?.valueAtRisk || 'Value at Risk',
        meta: { align: 'center' },
        cell: info => formatCurrency(info.getValue())
    }),
    columnHelper.accessor('risk_category', {
      header: t?.intelligence?.risk?.grid?.columns?.riskCategory || 'Risk Category',
      cell: info => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('expected_recovery_value', {
        header: t?.intelligence?.risk?.grid?.columns?.recovery || 'Est. Recovery',
        meta: { align: 'center' },
        cell: info => (
            <span className="text-emerald-600 font-medium">
                {formatCurrency(info.getValue() ?? 0)}
            </span>
        )
    }),
    columnHelper.display({
        id: 'actions',
        header: t?.intelligence?.risk?.grid?.columns?.action || 'Action',
        meta: { align: 'end' },
        cell: info => {
           const action = info.row.original.recommended_action;
           return (
             <div className="flex justify-end">
               <button className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors">
                   {action === 'DISCOUNT_AGGRESSIVE' ? (t?.intelligence?.risk?.grid?.actions?.discount50 || '50% Off') : 
                    action === 'DISCOUNT_MODERATE' ? (t?.intelligence?.risk?.grid?.actions?.discount25 || '25% Off') :
                    action === 'RETURN' ? (t?.intelligence?.risk?.grid?.actions?.return || 'Return') : (t?.intelligence?.risk?.grid?.actions?.action || 'Action')}
               </button>
             </div>
           );
        }
    })
  ], [columnHelper, t]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
        <TanStackTable
            data={data}
            columns={columns}
            lite={true}
            tableId="expiry-risk-table"
            enableSearch={false}
            emptyMessage={t?.intelligence?.risk?.grid?.empty || "No risking items found"}
        />
    </div>
  );
};
