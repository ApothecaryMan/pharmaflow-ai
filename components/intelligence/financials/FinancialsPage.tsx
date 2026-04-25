import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import type React from 'react';
import { useMemo, useState } from 'react';
import type { ProductFinancialItem, FinancialKPIs, CategoryFinancialItem } from '../../../types/intelligence';
import { formatCurrency } from '../../../utils/currency';
import { SmallCard } from '../../common/SmallCard';
import { TanStackTable } from '../../common/TanStackTable';


const categoryColumnHelper = createColumnHelper<CategoryFinancialItem>();
const productColumnHelper = createColumnHelper<ProductFinancialItem>();

import { useFinancials } from '../../../hooks/useFinancials';
import type { FinancialPeriod } from '../../../services/intelligence/intelligenceService';
import { getCurrencySymbol } from '../../../utils/currency';
import { SegmentedControl } from '../../common/SegmentedControl';
import { DashboardPageSkeleton } from '../common/IntelligenceSkeletons';
import { useSettings } from '../../../context';
import { getDisplayName } from '../../../utils/drugDisplayName';

interface FinancialsPageProps {
  t: any;
  language?: string;
  kpis: FinancialKPIs | null;
  products: ProductFinancialItem[];
  categories: CategoryFinancialItem[];
  loading: boolean;
  activeTab: 'products' | 'categories';
  setActiveTab: (tab: 'products' | 'categories') => void;
}

export const FinancialsPage: React.FC<FinancialsPageProps> = ({
  t,
  kpis,
  products,
  categories,
  loading,
  activeTab,
}) => {
  const { textTransform } = useSettings();

  const categoryColumns = useMemo<ColumnDef<CategoryFinancialItem, any>[]>(
    () => [
      categoryColumnHelper.accessor('category_name', {
        header: t?.intelligence?.financials?.categoryGrid?.columns?.category || 'Category',
        cell: (info) => (
          <span className='font-medium text-gray-900 dark:text-white'>{info.getValue()}</span>
        ),
      }),
      categoryColumnHelper.accessor('products_count', {
        header: t?.intelligence?.financials?.categoryGrid?.columns?.products || 'Products',
        cell: (info) => <span className='text-gray-600 dark:text-gray-300'>{info.getValue()}</span>,
      }),
      categoryColumnHelper.accessor('revenue', {
        header: t?.intelligence?.financials?.categoryGrid?.columns?.revenue || 'Revenue',
        cell: (info) => (
          <span className='font-medium text-emerald-600 dark:text-emerald-400'>
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      categoryColumnHelper.accessor('gross_profit', {
        header: t?.intelligence?.financials?.categoryGrid?.columns?.profit || 'Profit',
        cell: (info) => (
          <span className='font-medium text-primary-600 dark:text-primary-400'>
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      categoryColumnHelper.accessor('margin_percent', {
        header: t?.intelligence?.financials?.categoryGrid?.columns?.margin || 'Margin',
        cell: (info) => {
          const val = info.getValue();
          let config = { color: 'red', icon: 'trending_down' };
          if (val >= 35) config = { color: 'emerald', icon: 'trending_up' };
          else if (val >= 25) config = { color: 'amber', icon: 'trending_flat' };

          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current text-${config.color}-700 dark:text-${config.color}-400 text-xs font-bold uppercase tracking-wider bg-transparent`}
            >
              <span className='material-symbols-rounded text-xs'>{config.icon}</span>
              {val}%
            </span>
          );
        },
      }),
      categoryColumnHelper.accessor('abc_distribution', {
        header: t?.intelligence?.financials?.categoryGrid?.columns?.abcDistribution || 'ABC Dist',
        cell: (info) => {
          const dist = info.getValue();
          return (
            <div className='flex gap-1.5'>
              <span className='inline-flex items-center px-1.5 py-0.5 border border-current text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold bg-transparent'>
                A:{dist.a}
              </span>
              <span className='inline-flex items-center px-1.5 py-0.5 border border-current text-primary-700 dark:text-primary-400 rounded-lg text-xs font-bold bg-transparent'>
                B:{dist.b}
              </span>
              <span className='inline-flex items-center px-1.5 py-0.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 rounded-lg text-xs font-bold bg-transparent'>
                C:{dist.c}
              </span>
            </div>
          );
        },
      }),
    ],
    [t]
  );

  const productColumns = useMemo<ColumnDef<ProductFinancialItem, any>[]>(
    () => [
      productColumnHelper.accessor('product_name', {
        header: t?.intelligence?.financials?.productGrid?.columns?.product || 'Product',
        cell: (info) => (
          <div className='flex items-center gap-2'>
            <span
              className={`w-8 h-8 flex items-center justify-center rounded-lg border border-current text-base font-black bg-transparent ${
                info.row.original.abc_class === 'A'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : info.row.original.abc_class === 'B'
                    ? 'text-primary-700 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-400'
              }`}
            >
              {info.row.original.abc_class}
            </span>
            <span className='font-medium text-gray-900 dark:text-white'>
              {getDisplayName({ name: info.getValue() }, textTransform)}
            </span>
          </div>
        ),
      }),
      productColumnHelper.accessor('quantity_sold', {
        header: t?.intelligence?.financials?.productGrid?.columns?.quantitySold || 'Qty Sold',
        cell: (info) => <span className='text-gray-600 dark:text-gray-300'>{info.getValue()}</span>,
      }),
      productColumnHelper.accessor('revenue', {
        header: t?.intelligence?.financials?.productGrid?.columns?.revenue || 'Revenue',
        cell: (info) => (
          <span className='font-medium text-emerald-600 dark:text-emerald-400'>
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      productColumnHelper.accessor('cogs', {
        header: t?.intelligence?.financials?.productGrid?.columns?.cost || 'Cost',
        meta: { align: 'end' },
        cell: (info) => (
          <span className='text-gray-600 dark:text-gray-400'>
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      productColumnHelper.accessor('gross_profit', {
        header: t?.intelligence?.financials?.productGrid?.columns?.profit || 'Profit',
        cell: (info) => (
          <span className='font-bold text-primary-600 dark:text-primary-400'>
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      productColumnHelper.accessor('margin_percent', {
        header: t?.intelligence?.financials?.productGrid?.columns?.margin || 'Margin %',
        cell: (info) => {
          const val = info.getValue();
          let config = { color: 'emerald', icon: 'trending_up' };
          if (val < 15) config = { color: 'red', icon: 'trending_down' };
          else if (val < 25) config = { color: 'amber', icon: 'trending_flat' };

          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current text-${config.color}-700 dark:text-${config.color}-400 text-xs font-bold uppercase tracking-wider bg-transparent`}
            >
              <span className='material-symbols-rounded text-xs'>{config.icon}</span>
              {val.toFixed(1)}%
            </span>
          );
        },
      }),
    ],
    [t, textTransform]
  );

  // Loading skeleton
  if (loading || !kpis) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className='h-full flex flex-col space-y-4 overflow-hidden'>
      {/* KPIs Row */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0'>
        <SmallCard
          title={t.intelligence.financials.kpis.revenue}
          value={kpis.revenue.value}
          type='currency'
          currencyLabel={getCurrencySymbol()}
          icon='payments'
          iconColor='emerald'
          trend={kpis.revenue.change_direction}
          trendValue={`${kpis.revenue.change_percent}%`}
          trendLabel={t.intelligence.financials.kpis.compare}
        />
        <SmallCard
          title={t.intelligence.financials.kpis.grossProfit}
          value={kpis.gross_profit.value}
          type='currency'
          currencyLabel={getCurrencySymbol()}
          icon='account_balance_wallet'
          iconColor='gray'
          trend={kpis.gross_profit.change_direction}
          trendValue={`${kpis.gross_profit.change_percent}%`}
          trendLabel={t.intelligence.financials.kpis.compare}
        />
        <SmallCard
          title={t.intelligence.financials.kpis.margin}
          value={kpis.margin_percent.value}
          valueSuffix='%'
          fractionDigits={1}
          icon='percent'
          iconColor='amber'
          trend={kpis.margin_percent.change_direction}
          trendValue={`${Math.abs(kpis.margin_percent.change_points)} ${t.intelligence.financials.kpis.points}`}
          trendLabel={t.intelligence.financials.kpis.compare}
        />
        <SmallCard
          title={t.intelligence.financials.kpis.unitsSold}
          value={kpis.units_sold.value}
          icon='shopping_cart'
          iconColor='purple'
          trend={kpis.units_sold.change_direction}
          trendValue={`${kpis.units_sold.change_percent}%`}
          trendLabel={t.intelligence.financials.kpis.compare}
        />
      </div>

      {/* Tables Section - Simplified since TanStackTable will provide card styling */}
      <div className='flex-1 min-h-0'>
        {activeTab === 'products' ? (
          <div className='h-full overflow-hidden'>
            {products.length > 0 ? (
              <TanStackTable
                data={products}
                columns={productColumns}
                lite={false}
                tableId='product-financials-table'
                enablePagination={true}
                enableVirtualization={false}
                pageSize='auto'
                enableShowAll={true}
              />
            ) : (
              <div className='bg-(--bg-card) rounded-xl border-2 border-(--border-primary) dark:border-(--border-divider) p-12 text-center h-full flex flex-col items-center justify-center text-gray-500 text-sm'>
                <span className='material-symbols-rounded mb-2 opacity-20' style={{ fontSize: 'var(--icon-xl)' }}>
                  inventory
                </span>
                <p>{t.intelligence.financials.sections.noData}</p>
              </div>
            )}
          </div>
        ) : (
          <div className='h-full overflow-hidden'>
            <TanStackTable
              data={categories}
              columns={categoryColumns}
              lite={false}
              tableId='category-financials-table'
              enablePagination={true}
              enableVirtualization={false}
              pageSize='auto'
              enableShowAll={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};
