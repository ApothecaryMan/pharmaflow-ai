import type React from 'react';
import { useEffect, useState } from 'react';
import type { ExpiryRiskItem, RiskSummary } from '../../../types/intelligence';
import { formatCurrency, getCurrencySymbol } from '../../../utils/currency';
import { SegmentedProgressCard } from '../../common/ProgressCard';
import { SmallCard } from '../../common/SmallCard';
import { DashboardPageSkeleton } from '../common/IntelligenceSkeletons';
import { CreateDiscountModal } from './CreateDiscountModal';
import { ExpiryRiskGrid } from './ExpiryRiskGrid';

interface RiskPageProps {
  t: any;
  language?: string;
  summary: RiskSummary | null;
  items: ExpiryRiskItem[];
  loading: boolean;
}

export const RiskPage: React.FC<RiskPageProps> = ({ t, summary, items, loading }) => {
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  // Listen for global event from Header
  useEffect(() => {
    const handleGlobalDiscount = () => {
      // Default to first 5 items if none selected (as per original logic)
      const batchIds = items.slice(0, 5).map((item) => item.batch_id);
      setSelectedBatchIds(batchIds);
      setIsDiscountModalOpen(true);
    };
    window.addEventListener('OPEN_DISCOUNT_MODAL' as any, handleGlobalDiscount);
    return () => window.removeEventListener('OPEN_DISCOUNT_MODAL' as any, handleGlobalDiscount);
  }, [items]);

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
                color: 'bg-primary-400',
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
          <span className='material-symbols-rounded text-emerald-500 mb-4' style={{ fontSize: 'var(--icon-2xl)' }}>verified</span>
          <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-2'>
            {t?.intelligence?.risk?.empty?.title || 'No risks identified'}
          </h3>
          <p className='text-gray-500'>{t?.intelligence?.risk?.empty?.subtitle || 'All batches are well within expiry'}</p>
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
              color: 'bg-primary-400',
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

      {/* Detailed Grid - Simplified since TanStackTable will provide card styling */}
      <div className='flex-1 min-h-0'>
        <ExpiryRiskGrid
          data={items}
          t={t}
          leftCustomControls={
            <h3 className='text-base font-bold text-gray-900 dark:text-white px-1'>
              {t?.intelligence?.risk?.sections?.expiryAnalysis || 'Expiry Analysis'}
            </h3>
          }
        />
      </div>
    </div>
  );
};
