import type React from 'react';
import { useEffect, useState } from 'react';
import type { ExpiryRiskItem, RiskSummary } from '../../../types/intelligence';
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

  // Page renders immediately; individual parts handle their own loading states.

  return (
    <div className='h-full flex flex-col space-y-4 overflow-hidden'>
      {/* Discount Modal */}
      <CreateDiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        selectedBatchIds={selectedBatchIds}
      />


      {/* Detailed Grid - Simplified since TanStackTable will provide card styling */}
      <div className='flex-1 min-h-0'>
        <ExpiryRiskGrid
          data={items}
          t={t}
          isLoading={loading}
        />
      </div>
    </div>
  );
};
