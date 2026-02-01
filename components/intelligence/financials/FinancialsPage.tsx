import React, { useState, useMemo } from 'react';
import { SmallCard } from '../../common/SmallCard';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { TanStackTable } from '../../common/TanStackTable';
import { formatCurrency } from '../../../utils/currency';
import { ProductFinancialItem } from '../../../types/intelligence';

interface CategoryBreakdownItem {
  category_id: string;
  category_name: string;
  products_count: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_percent: number;
  abc_distribution: {
    a: number;
    b: number;
    c: number;
  };
}

// Mock data
const mockCategoryData: CategoryBreakdownItem[] = [
  {
    category_id: 'CAT-01',
    category_name: 'مسكنات',
    products_count: 45,
    revenue: 125000,
    cogs: 87500,
    gross_profit: 37500,
    margin_percent: 30,
    abc_distribution: { a: 12, b: 18, c: 15 }
  },
  {
    category_id: 'CAT-02',
    category_name: 'مضادات حيوية',
    products_count: 32,
    revenue: 98000,
    cogs: 68600,
    gross_profit: 29400,
    margin_percent: 30,
    abc_distribution: { a: 8, b: 14, c: 10 }
  },
  {
    category_id: 'CAT-03',
    category_name: 'فيتامينات',
    products_count: 28,
    revenue: 45000,
    cogs: 27000,
    gross_profit: 18000,
    margin_percent: 40,
    abc_distribution: { a: 5, b: 12, c: 11 }
  },
  {
    category_id: 'CAT-04',
    category_name: 'مستحضرات تجميل',
    products_count: 55,
    revenue: 78000,
    cogs: 46800,
    gross_profit: 31200,
    margin_percent: 40,
    abc_distribution: { a: 15, b: 22, c: 18 }
  }
];

const categoryColumnHelper = createColumnHelper<CategoryBreakdownItem>();
const productColumnHelper = createColumnHelper<ProductFinancialItem>();

import { FilterDropdown } from '../../common/FilterDropdown';
import { useFinancials } from '../../../hooks/useFinancials';
import { FinancialPeriod } from '../../../services/intelligence/intelligenceService';
import { getCurrencySymbol } from '../../../utils/currency';
import { SegmentedControl } from '../../common/SegmentedControl';
import { DashboardPageSkeleton } from '../common/IntelligenceSkeletons';

interface FinancialsPageProps {
  t: any;
  language?: string;
}

export const FinancialsPage: React.FC<FinancialsPageProps> = ({ t }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod>('this_month');
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const { kpis, products, loading } = useFinancials(selectedPeriod);

  const periodOptions = useMemo(() => [
    { label: t.intelligence.financials.filters.periods.this_month, value: 'this_month' as FinancialPeriod },
    { label: t.intelligence.financials.filters.periods.last_month, value: 'last_month' as FinancialPeriod },
    { label: t.intelligence.financials.filters.periods.last_3_months, value: 'last_3_months' as FinancialPeriod },
    { label: t.intelligence.financials.filters.periods.this_year, value: 'this_year' as FinancialPeriod }
  ], [t]);

  const categoryColumns = useMemo<ColumnDef<CategoryBreakdownItem, any>[]>(() => [
    categoryColumnHelper.accessor('category_name', {
      header: t?.intelligence?.financials?.categoryGrid?.columns?.category || 'Category',
      cell: info => (
        <span className="font-medium text-gray-900 dark:text-white">
          {info.getValue()}
        </span>
      )
    }),
    categoryColumnHelper.accessor('products_count', {
      header: t?.intelligence?.financials?.categoryGrid?.columns?.products || 'Products',
      cell: info => (
        <span className="text-gray-600 dark:text-gray-300">{info.getValue()}</span>
      )
    }),
    categoryColumnHelper.accessor('revenue', {
      header: t?.intelligence?.financials?.categoryGrid?.columns?.revenue || 'Revenue',
      cell: info => (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {formatCurrency(info.getValue())}
        </span>
      )
    }),
    categoryColumnHelper.accessor('gross_profit', {
      header: t?.intelligence?.financials?.categoryGrid?.columns?.profit || 'Profit',
      cell: info => (
        <span className="font-medium text-blue-600 dark:text-blue-400">
          {formatCurrency(info.getValue())}
        </span>
      )
    }),
    categoryColumnHelper.accessor('margin_percent', {
      header: t?.intelligence?.financials?.categoryGrid?.columns?.margin || 'Margin',
      cell: info => {
        const val = info.getValue();
        let config = { color: 'red', icon: 'trending_down' };
        if (val >= 35) config = { color: 'emerald', icon: 'trending_up' };
        else if (val >= 25) config = { color: 'amber', icon: 'trending_flat' };
        
        return (
          <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-xs font-bold uppercase tracking-wider bg-transparent`}>
            <span className="material-symbols-rounded text-xs">{config.icon}</span>
            {val}%
          </span>
        );
      }
    }),
    categoryColumnHelper.accessor('abc_distribution', {
      header: t?.intelligence?.financials?.categoryGrid?.columns?.abcDistribution || 'ABC Dist',
      cell: info => {
        const dist = info.getValue();
        return (
          <div className="flex gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold bg-transparent">A:{dist.a}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold bg-transparent">B:{dist.b}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 rounded-lg text-xs font-bold bg-transparent">C:{dist.c}</span>
          </div>
        );
      }
    })
  ], [t]);


  /*
   * Columns Definitions
   */
  const productColumns = useMemo<ColumnDef<ProductFinancialItem, any>[]>(() => [
    productColumnHelper.accessor('product_name', {
      header: t?.intelligence?.financials?.productGrid?.columns?.product || 'Product',
      cell: info => (
        <div className="flex items-center gap-2">
           <span className={`w-8 h-8 flex items-center justify-center rounded-lg border text-base font-black bg-transparent ${
             info.row.original.abc_class === 'A' ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400' :
             info.row.original.abc_class === 'B' ? 'border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400' :
             'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400'
           }`}>
             {info.row.original.abc_class}
           </span>
           <span className="font-medium text-gray-900 dark:text-white">{info.getValue()}</span>
        </div>
      ),
    }),
    productColumnHelper.accessor('quantity_sold', {
        header: t?.intelligence?.financials?.productGrid?.columns?.quantitySold || 'Qty Sold',
        cell: info => <span className="text-gray-600 dark:text-gray-300">{info.getValue()}</span>,
    }),
    productColumnHelper.accessor('revenue', {
        header: t?.intelligence?.financials?.productGrid?.columns?.revenue || 'Revenue',
        cell: info => <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(info.getValue())}</span>,
    }),
    productColumnHelper.accessor('cogs', {
        header: t?.intelligence?.financials?.productGrid?.columns?.cost || 'Cost',
        meta: { align: 'end' },
        cell: info => <span className="text-gray-600 dark:text-gray-400">{formatCurrency(info.getValue())}</span>,
    }),
    productColumnHelper.accessor('gross_profit', {
        header: t?.intelligence?.financials?.productGrid?.columns?.profit || 'Profit',
        cell: info => (
            <span className="font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(info.getValue())}
            </span>
        ),
    }),
    productColumnHelper.accessor('margin_percent', {
        header: t?.intelligence?.financials?.productGrid?.columns?.margin || 'Margin %',
        cell: info => {
            const val = info.getValue();
            let config = { color: 'emerald', icon: 'trending_up' };
            if (val < 15) config = { color: 'red', icon: 'trending_down' };
            else if (val < 25) config = { color: 'amber', icon: 'trending_flat' };
            
            return (
                <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-xs font-bold uppercase tracking-wider bg-transparent`}>
                    <span className="material-symbols-rounded text-xs">{config.icon}</span>
                    {val.toFixed(1)}%
                </span>
            );
        },
    }),
  ], [t]);

  const selectedOption = periodOptions.find(p => p.value === selectedPeriod);

  // Loading skeleton
  if (loading || !kpis) {
    return <DashboardPageSkeleton withTopBar />;
  }

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
       {/* KPIs Row */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <SmallCard 
             title={t.intelligence.financials.kpis.revenue}
             value={kpis.revenue.value}
             type="currency"
             currencyLabel={getCurrencySymbol()}
             icon="payments"
             iconColor="emerald"
             trend={kpis.revenue.change_direction}
             trendValue={`${kpis.revenue.change_percent}%`}
             trendLabel={t.intelligence.financials.kpis.compare}
          />
          <SmallCard 
             title={t.intelligence.financials.kpis.grossProfit}
             value={kpis.gross_profit.value}
             type="currency"
             currencyLabel={getCurrencySymbol()}
             icon="account_balance_wallet"
             iconColor="blue"
             trend={kpis.gross_profit.change_direction}
             trendValue={`${kpis.gross_profit.change_percent}%`}
             trendLabel={t.intelligence.financials.kpis.compare}
          />
          <SmallCard 
             title={t.intelligence.financials.kpis.margin}
             value={kpis.margin_percent.value}
             valueSuffix="%"
             fractionDigits={1}
             icon="percent"
             iconColor="amber"
             trend={kpis.margin_percent.change_direction}
             trendValue={`${Math.abs(kpis.margin_percent.change_points)} ${t.intelligence.financials.kpis.points}`}
             trendLabel={t.intelligence.financials.kpis.compare}
          />
          <SmallCard 
             title={t.intelligence.financials.kpis.unitsSold}
             value={kpis.units_sold.value}
             icon="shopping_cart"
             iconColor="purple"
             trend={kpis.units_sold.change_direction}
             trendValue={`${kpis.units_sold.change_percent}%`}
             trendLabel={t.intelligence.financials.kpis.compare}
          />
       </div>

       {/* Tables Section */}
       <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 mb-4 shrink-0">
            <SegmentedControl 
              value={activeTab}
              onChange={(val) => setActiveTab(val as 'products' | 'categories')}
              options={[
                { 
                  label: t.intelligence.financials.sections.productProfitability, 
                  value: 'products',
                  icon: 'inventory_2'
                },
                { 
                  label: t.intelligence.financials.sections.categoryBreakdown, 
                  value: 'categories',
                  icon: 'category'
                }
              ]}
              size="sm"
              color="blue"
              fullWidth={false}
              variant="onPage"
            />
            
            <div className="flex items-center gap-2">
              <div className="relative min-w-[4rem]">
                <FilterDropdown
                  floating
                  items={periodOptions}
                  selectedItem={selectedOption}
                  onSelect={(item) => setSelectedPeriod(item.value)}
                  keyExtractor={(item) => item.value}
                  renderItem={(item, isSelected) => (
                    <span className={`${isSelected ? 'font-bold text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        {item.label}
                    </span>
                  )}
                  renderSelected={(item) => (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-rounded text-gray-400 text-lg">calendar_today</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                        {item?.label || t.intelligence.financials.filters.select}
                      </span>
                    </div>
                  )}
                  variant="input"
                  className="z-50"
                  minHeight={36}
                />
              </div>

              <button 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 transition-all active:scale-95"
                title={t.intelligence.financials.filters.export}
              >
                <span className="material-symbols-rounded">file_download</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'products' ? (
              <div className="h-full overflow-hidden">
                {products.length > 0 ? (
                  <TanStackTable 
                      data={products} 
                      columns={productColumns} 
                      lite={true}
                      tableId="product-financials-table"
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <span className="material-symbols-rounded text-4xl mb-2 opacity-20">inventory</span>
                    <p>{t.intelligence.financials.sections.noData}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full overflow-hidden">
                <TanStackTable 
                    data={mockCategoryData}
                    columns={categoryColumns}
                    lite={true}
                    tableId="category-financials-table"
                />
              </div>
            )}
          </div>
       </div>
    </div>
  );
};


