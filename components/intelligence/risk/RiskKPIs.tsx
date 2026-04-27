import type React from 'react';
import type { RiskSummary } from '../../../types/intelligence';
import { formatCurrency } from '../../../utils/currency';
import { SegmentedProgressCard } from '../../common/ProgressCard';
import { SmallCard } from '../../common/SmallCard';

interface RiskKPIsProps {
  summary: RiskSummary | null;
  t?: any;
  isLoading?: boolean;
}

export const RiskKPIs: React.FC<RiskKPIsProps> = ({ summary, t, isLoading }) => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
      <SmallCard
        title={t?.intelligence?.risk?.kpis?.valueAtRisk || 'Value at Risk'}
        value={summary?.total_value_at_risk || 0}
        type='currency'
        subValue={t?.intelligence?.risk?.kpis?.total || 'Total'}
        icon='trending_down'
        iconColor='red'
        isLoading={isLoading}
      />

      <SmallCard
        title={t?.intelligence?.risk?.kpis?.batchesAtRisk || 'Batches at Risk'}
        value={summary?.total_batches_at_risk || 0}
        subValue={t?.intelligence?.risk?.kpis?.batch || 'batch'}
        icon='inventory'
        iconColor='amber'
        isLoading={isLoading}
      />

      <SegmentedProgressCard
        title='توزيع المخاطر حسب الإلحاح'
        className='col-span-1 lg:col-span-2'
        compact={true}
        isLoading={isLoading}
        segments={[
          {
            value: summary?.by_urgency?.critical?.count || 0,
            color: 'bg-red-500',
            label: 'حرج',
            tooltip: 'حرج (< 30 يوم)',
          },
          {
            value: summary?.by_urgency?.high?.count || 0,
            color: 'bg-amber-500',
            label: 'عالي',
            tooltip: 'عالي (30-60 يوم)',
          },
          {
            value: summary?.by_urgency?.medium?.count || 0,
            color: 'bg-primary-400',
            label: 'متوسط',
            tooltip: 'متوسط (60-90 يوم)',
          },
        ]}
        sideStat={{
          label: 'فرصة استرداد',
          value: formatCurrency(summary?.potential_recovery_value || 0),
          valueColor: 'text-emerald-600 dark:text-emerald-400',
        }}
      />
    </div>
  );
};
