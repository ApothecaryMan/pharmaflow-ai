import type React from 'react';
import type { ProcurementSummary } from '../../../types/intelligence';
import { formatCurrency, getCurrencySymbol } from '../../../utils/currency';
import { SmallCard } from '../../common/SmallCard';

interface ProcurementKPIsProps {
  summary: ProcurementSummary;
  t?: any;
}

export const ProcurementKPIs: React.FC<ProcurementKPIsProps> = ({ summary, t }) => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
      <SmallCard
        title={t?.intelligence?.procurement?.kpis?.needingOrder || 'Needing Order'}
        value={summary.items_needing_order}
        subValue={t?.intelligence?.procurement?.kpis?.items || 'items'}
        icon='shopping_cart'
        iconColor='blue'
        trend='up'
        trendValue='12'
        trendLabel={t?.intelligence?.procurement?.kpis?.vsLastWeek || 'vs last week'}
      />

      <SmallCard
        title={t?.intelligence?.procurement?.kpis?.outOfStock || 'Out of Stock'}
        value={summary.items_out_of_stock}
        subValue={t?.intelligence?.procurement?.kpis?.items || 'items'}
        icon='warning'
        iconColor={summary.items_out_of_stock > 0 ? 'red' : 'emerald'}
        trend='down'
        trendValue='2'
        trendLabel={t?.intelligence?.procurement?.kpis?.improved || 'improved'}
      />

      <SmallCard
        title={t?.intelligence?.procurement?.kpis?.lostSales || 'Lost Sales'}
        value={summary.estimated_lost_sales}
        type='currency'
        currencyLabel={getCurrencySymbol()}
        icon='money_off'
        iconColor='amber'
      />

      <SmallCard
        title={t?.intelligence?.procurement?.kpis?.pendingPO || 'Pending PO'}
        value={summary.pending_po_count}
        subValue={`${t?.settings?.common?.value || 'Value'} ${formatCurrency(summary.pending_po_value)}`}
        icon='pending_actions'
        iconColor='gray'
      />
    </div>
  );
};
