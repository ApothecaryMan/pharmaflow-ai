import type React from 'react';
import type { FinancialKPIs } from '../../../types/intelligence';
import { SmallCard } from '../../common/SmallCard';

interface FinancialsKPIsProps {
  kpis: FinancialKPIs | null;
  t?: any;
  isLoading?: boolean;
}

export const FinancialsKPIs: React.FC<FinancialsKPIsProps> = ({ kpis, t, isLoading }) => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
      <SmallCard
        title={t?.intelligence?.financials?.kpis?.revenue}
        value={kpis?.revenue?.value || 0}
        type='currency'
        icon='payments'
        iconColor='emerald'
        trend={kpis?.revenue?.change_direction}
        trendValue={kpis?.revenue ? `${kpis.revenue.change_percent}%` : ''}
        trendLabel={t?.intelligence?.financials?.kpis?.compare}
        isLoading={isLoading}
      />
      <SmallCard
        title={t?.intelligence?.financials?.kpis?.grossProfit}
        value={kpis?.gross_profit?.value || 0}
        type='currency'
        icon='account_balance_wallet'
        iconColor='gray'
        trend={kpis?.gross_profit?.change_direction}
        trendValue={kpis?.gross_profit ? `${kpis.gross_profit.change_percent}%` : ''}
        trendLabel={t?.intelligence?.financials?.kpis?.compare}
        isLoading={isLoading}
      />
      <SmallCard
        title={t?.intelligence?.financials?.kpis?.margin}
        value={kpis?.margin_percent?.value || 0}
        valueSuffix='%'
        fractionDigits={1}
        icon='percent'
        iconColor='amber'
        trend={kpis?.margin_percent?.change_direction}
        trendValue={kpis?.margin_percent ? `${Math.abs(kpis.margin_percent.change_points)} ${t?.intelligence?.financials?.kpis?.points}` : ''}
        trendLabel={t?.intelligence?.financials?.kpis?.compare}
        isLoading={isLoading}
      />
      <SmallCard
        title={t?.intelligence?.financials?.kpis?.unitsSold}
        value={kpis?.units_sold?.value || 0}
        icon='shopping_cart'
        iconColor='purple'
        trend={kpis?.units_sold?.change_direction}
        trendValue={kpis?.units_sold ? `${kpis.units_sold.change_percent}%` : ''}
        trendLabel={t?.intelligence?.financials?.kpis?.compare}
        isLoading={isLoading}
      />
    </div>
  );
};
