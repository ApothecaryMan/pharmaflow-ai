import type React from 'react';
import { useState } from 'react';
import { useRisk } from '../../../hooks/useRisk';
import { formatCurrency, getCurrencySymbol } from '../../../utils/currency';
import { SegmentedProgressCard } from '../../common/ProgressCard';
import { SmallCard } from '../../common/SmallCard';
import { DashboardPageSkeleton } from '../common/IntelligenceSkeletons';
import { CreateDiscountModal } from './CreateDiscountModal';
import { ExpiryRiskGrid } from './ExpiryRiskGrid';

interface RiskPageProps {
  t: any;
  language?: string;
}

export const RiskPage: React.FC<RiskPageProps> = ({ t }) => {
  const { summary, items, loading } = useRisk();
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  const handleApplyDiscount = () => {
    // Get batch IDs from current items
    const batchIds = items.slice(0, 5).map((item) => item.batch_id);
    setSelectedBatchIds(batchIds);
    setIsDiscountModalOpen(true);
  };

  // Loading skeleton
  if (loading) {
    return <DashboardPageSkeleton />;
  }

  // Empty state
  if (!summary || items.length === 0) {
    return (
      <div className='space-y-6 animate-fade-in'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          <SmallCard
            title={t?.intelligence?.risk?.kpis?.valueAtRisk || 'Value at Risk'}
            value={0}
            type='currency'
            currencyLabel={getCurrencySymbol()}
            subValue={t?.intelligence?.risk?.kpis?.total || 'Total'}
            icon='trending_down'
            iconColor='red'
          />

          <SmallCard
            title={t?.intelligence?.risk?.kpis?.batchesAtRisk || 'Batches at Risk'}
            value={0}
            subValue={t?.intelligence?.risk?.kpis?.batch || 'batch'}
            icon='inventory'
            iconColor='amber'
          />

          <SegmentedProgressCard
            title='توزيع المخاطر حسب الإلحاح'
            className='col-span-1 lg:col-span-2'
            compact={true}
            segments={[
              {
                value: 0,
                color: 'bg-red-500',
                label: 'حرج',
                tooltip: 'حرج (< 30 يوم)',
              },
              {
                value: 0,
                color: 'bg-amber-500',
                label: 'عالي',
                tooltip: 'عالي (30-60 يوم)',
              },
              {
                value: 0,
                color: 'bg-blue-400',
                label: 'متوسط',
                tooltip: 'متوسط (60-90 يوم)',
              },
            ]}
            sideStat={{
              label: 'فرصة استرداد',
              value: formatCurrency(0),
              valueColor: 'text-emerald-600 dark:text-emerald-400',
            }}
          />
        </div>
        <div className='p-8 text-center bg-transparent'>
          <span className='material-symbols-rounded text-5xl text-emerald-500 mb-4'>verified</span>
          <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-2'>
            {t.intelligence.risk.empty.title}
          </h3>
          <p className='text-gray-500'>{t.intelligence.risk.empty.subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col space-y-4 overflow-hidden'>
      {/* Discount Modal */}
      <CreateDiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        selectedBatchIds={selectedBatchIds}
      />

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0'>
        <SmallCard
          title={t?.intelligence?.risk?.kpis?.valueAtRisk || 'Value at Risk'}
          value={summary.total_value_at_risk}
          type='currency'
          currencyLabel={getCurrencySymbol()}
          subValue={t?.intelligence?.risk?.kpis?.total || 'Total'}
          icon='trending_down'
          iconColor='red'
        />

        <SmallCard
          title={t?.intelligence?.risk?.kpis?.batchesAtRisk || 'Batches at Risk'}
          value={summary.total_batches_at_risk}
          subValue={t?.intelligence?.risk?.kpis?.batch || 'batch'}
          icon='inventory'
          iconColor='amber'
        />

        <SegmentedProgressCard
          title='توزيع المخاطر حسب الإلحاح'
          className='col-span-1 lg:col-span-2'
          compact={true}
          segments={[
            {
              value: summary.by_urgency.critical.count,
              color: 'bg-red-500',
              label: 'حرج',
              tooltip: 'حرج (< 30 يوم)',
            },
            {
              value: summary.by_urgency.high.count,
              color: 'bg-amber-500',
              label: 'عالي',
              tooltip: 'عالي (30-60 يوم)',
            },
            {
              value: summary.by_urgency.medium.count,
              color: 'bg-blue-400',
              label: 'متوسط',
              tooltip: 'متوسط (60-90 يوم)',
            },
          ]}
          sideStat={{
            label: 'فرصة استرداد',
            value: formatCurrency(summary.potential_recovery_value),
            valueColor: 'text-emerald-600 dark:text-emerald-400',
          }}
        />
      </div>

      {/* Detailed Grid */}
      <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex-1 flex flex-col overflow-hidden'>
        <div className='flex justify-between items-center px-4 py-4 shrink-0'>
          <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
            {t.intelligence.risk.sections.expiryAnalysis}
          </h3>
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => console.log('Create Return List')}
              className='px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100'
            >
              {t.intelligence.risk.actions.createReturn}
            </button>
            <button
              type='button'
              onClick={handleApplyDiscount}
              className='px-3 py-1.5 text-sm bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors border border-amber-100 flex items-center gap-1'
            >
              <span className='material-symbols-rounded text-lg font-icon'>sell</span>
              {t.intelligence.risk.actions.applyDiscount}
            </button>
          </div>
        </div>
        <div className='flex-1 overflow-hidden'>
          <ExpiryRiskGrid data={items} t={t} />
        </div>
      </div>
    </div>
  );
};
