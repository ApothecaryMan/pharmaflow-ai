import React from 'react';
import type { OrgMetrics } from '../../services/org/orgAggregationService';
import { SmallCard } from '../common/SmallCard';
import { getCurrencySymbol } from '../../utils/currency';

interface OrgPulseGridProps {
  metrics: OrgMetrics;
  color?: string;
  language: 'en' | 'ar';
}

export const OrgPulseGrid: React.FC<OrgPulseGridProps> = ({ metrics, color = 'primary', language }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <SmallCard 
        title={language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}
        value={metrics.totalSales}
        icon="shopping_cart"
        iconColor="primary"
        fractionDigits={0}
      />
      <SmallCard 
        title={language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
        value={metrics.totalRevenue}
        icon="payments"
        iconColor="emerald"
        type="currency"
        currencyLabel={getCurrencySymbol()}
      />
      <SmallCard 
        title={language === 'ar' ? 'إيرادات اليوم' : "Today's Revenue"}
        value={metrics.todayRevenue}
        icon="trending_up"
        iconColor="amber"
        type="currency"
        currencyLabel={getCurrencySymbol()}
      />
      
      <SmallCard 
        title={language === 'ar' ? 'الفروع النشطة' : 'Active Branches'}
        value={metrics.totalBranches}
        icon="store"
        iconColor="blue"
        fractionDigits={0}
      />
      <SmallCard 
        title={language === 'ar' ? 'طاقم العمل' : 'Active Staff'}
        value={metrics.activeStaffCount}
        icon="group"
        iconColor="violet"
        fractionDigits={0}
      />
      <SmallCard 
        title={language === 'ar' ? 'قيمة المخزون الكلية' : 'Total Inventory Value'}
        value={metrics.totalInventoryValue}
        icon="inventory_2"
        iconColor="orange"
        type="currency"
        currencyLabel={getCurrencySymbol()}
      />
    </div>
  );
};
