import React from 'react';
import type { OrgMetrics } from '../../services/org/orgAggregationService';
import { SmallCard } from '../common/SmallCard';
import { getCurrencySymbol } from '../../utils/currency';

interface OrgPulseGridProps {
  metrics: OrgMetrics;
  color?: string;
  language: 'en' | 'ar';
  isLoading?: boolean;
}

export const OrgPulseGrid: React.FC<OrgPulseGridProps> = ({ metrics, color = 'primary', language, isLoading }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <SmallCard 
        title={language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}
        value={metrics?.totalSales || 0}
        icon="shopping_cart"
        iconColor="primary"
        fractionDigits={0}
        isLoading={isLoading}
      />
      <SmallCard 
        title={language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
        value={metrics?.totalRevenue || 0}
        icon="payments"
        iconColor="emerald"
        type="currency"
        currencyLabel={getCurrencySymbol()}
        isLoading={isLoading}
      />
      <SmallCard 
        title={language === 'ar' ? 'إيرادات اليوم' : "Today's Revenue"}
        value={metrics?.todayRevenue || 0}
        icon="trending_up"
        iconColor="amber"
        type="currency"
        currencyLabel={getCurrencySymbol()}
        isLoading={isLoading}
      />
      
      <SmallCard 
        title={language === 'ar' ? 'الفروع النشطة' : 'Active Branches'}
        value={metrics?.totalBranches || 0}
        icon="store"
        iconColor="blue"
        fractionDigits={0}
        isLoading={isLoading}
      />
      <SmallCard 
        title={language === 'ar' ? 'طاقم العمل' : 'Active Staff'}
        value={metrics?.activeStaffCount || 0}
        icon="group"
        iconColor="violet"
        fractionDigits={0}
        isLoading={isLoading}
      />
      <SmallCard 
        title={language === 'ar' ? 'قيمة المخزون الكلية' : 'Total Inventory Value'}
        value={metrics?.totalInventoryValue || 0}
        icon="inventory_2"
        iconColor="orange"
        type="currency"
        currencyLabel={getCurrencySymbol()}
        isLoading={isLoading}
      />
    </div>
  );
};
