import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import type React from 'react';
import { useMemo, useState } from 'react';
import type {
  CategoryFinancialItem,
  FinancialKPIs,
  ProductFinancialItem,
} from '../../../types/intelligence';
import { formatCurrency } from '../../../utils/currency';
import { TanStackTable } from '../../common/TanStackTable';

const categoryColumnHelper = createColumnHelper<CategoryFinancialItem>();
const productColumnHelper = createColumnHelper<ProductFinancialItem>();

import { useSettings } from '../../../context';
import { useFinancials } from '../../../hooks/sales/useFinancials';
import type { FinancialPeriod } from '../../../services/intelligence/intelligenceService';
import { getDisplayName } from '../../../utils/drugDisplayName';
import { SegmentedControl } from '../../common/SegmentedControl';
import { DashboardPageSkeleton } from '../common/IntelligenceSkeletons';

interface FinancialsPageProps {
  t: Translations;
  language?: string;
  kpis: FinancialKPIs | null;
  products: ProductFinancialItem[];
  categories: CategoryFinancialItem[];
  loading: boolean;
  activeTab: 'products' | 'categories';
  setActiveTab: (tab: 'products' | 'categories') => void;
  globalFilter?: string;
  columnFilters?: Record<string, any[]>;
}

export const FinancialsPage: React.FC<FinancialsPageProps> = ({
  t,
  kpis,
  products,
  categories,
  loading,
  activeTab,
  globalFilter,
  columnFilters = {},
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
          let badgeClass = 'badge-danger';
          let icon = 'trending_down';
          if (val >= 35) {
            badgeClass = 'badge-success';
            icon = 'trending_up';
          } else if (val >= 25) {
            badgeClass = 'badge-warning';
            icon = 'trending_flat';
          }

          return (
            <span className={`${badgeClass} gap-1.5`}>
              <span className='material-symbols-rounded'>{icon}</span>
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
              <span className='badge-success !px-1.5 !py-0.5'>A:{dist.a}</span>
              <span className='badge-info !px-1.5 !py-0.5'>B:{dist.b}</span>
              <span className='badge-neutral !px-1.5 !py-0.5'>C:{dist.c}</span>
            </div>
          );
        },
      }),
    ],
    [t]
  );

  const productColumns = useMemo<ColumnDef<ProductFinancialItem, any>[]>(
    () => [
      productColumnHelper.accessor('abc_class', {
        header: 'ABC',
        meta: { hideFromSettings: true, width: 150, align: 'start' },
      }),
      productColumnHelper.accessor('product_name', {
        header: t?.intelligence?.financials?.productGrid?.columns?.product || 'Product',
        meta: { width: 811, align: 'end' },
        cell: (info) => (
          <div className='flex items-center gap-2'>
            <span
              className={`w-8 h-8 !flex items-center justify-center text-base font-black ${
                info.row.original.abc_class === 'A'
                  ? 'badge-success'
                  : info.row.original.abc_class === 'B'
                    ? 'badge-info'
                    : 'badge-neutral'
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
        meta: { width: 150, align: 'center' },
        cell: (info) => <span className='text-gray-600 dark:text-gray-300'>{info.getValue()}</span>,
      }),
      productColumnHelper.accessor('revenue', {
        header: t?.intelligence?.financials?.productGrid?.columns?.revenue || 'Revenue',
        meta: { width: 150, align: 'start' },
        cell: (info) => (
          <span className='font-medium text-emerald-600 dark:text-emerald-400'>
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      productColumnHelper.accessor('cogs', {
        header: t?.intelligence?.financials?.productGrid?.columns?.cost || 'Cost',
        meta: { width: 150, align: 'start' },
        cell: (info) => (
          <span className='text-gray-600 dark:text-gray-400'>
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      productColumnHelper.accessor('gross_profit', {
        header: t?.intelligence?.financials?.productGrid?.columns?.profit || 'Profit',
        meta: { width: 150, align: 'start' },
        cell: (info) => (
          <span className='font-bold text-primary-600 dark:text-primary-400'>
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      productColumnHelper.accessor('margin_percent', {
        header: t?.intelligence?.financials?.productGrid?.columns?.margin || 'Margin %',
        meta: { width: 150, align: 'center' },
        cell: (info) => {
          const val = info.getValue();
          let badgeClass = 'badge-success';
          let icon = 'trending_up';
          if (val < 15) {
            badgeClass = 'badge-danger';
            icon = 'trending_down';
          } else if (val < 25) {
            badgeClass = 'badge-warning';
            icon = 'trending_flat';
          }

          return (
            <span className={`${badgeClass} gap-1.5`}>
              <span className='material-symbols-rounded'>{icon}</span>
              {val.toLocaleString(undefined, { maximumFractionDigits: 1 })}%
            </span>
          );
        },
      }),
    ],
    [t, textTransform]
  );

  // Page renders immediately; individual parts handle their own loading states.

  return (
    <div className='h-full flex flex-col space-y-4 overflow-hidden'>
      {/* Tables Section - Simplified since TanStackTable will provide card styling */}
      <div className='flex-1 min-h-0'>
        {activeTab === 'products' ? (
          <div className='h-full overflow-hidden'>
            {products.length > 0 || loading ? (
              <TanStackTable
                data={products}
                columns={productColumns}
                isLoading={loading}
                lite={false}
                tableId='product-financials-table'
                enablePagination={true}
                enableVirtualization={false}
                pageSize='auto'
                enableShowAll={true}
                globalFilter={globalFilter}
                enableSearch={false}
                initialFilters={columnFilters}
                defaultHiddenColumns={['abc_class']}
              />
            ) : (
              <div className='bg-(--bg-card) rounded-xl border-2 border-(--border-primary) dark:border-(--border-divider) p-12 text-center h-full flex flex-col items-center justify-center text-gray-500 text-sm'>
                <span
                  className='material-symbols-rounded mb-2 opacity-20'
                  style={{ fontSize: 'var(--icon-xl)' }}
                >
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
              isLoading={loading}
              lite={false}
              tableId='category-financials-table'
              enablePagination={true}
              enableVirtualization={false}
              pageSize='auto'
              enableShowAll={true}
              globalFilter={globalFilter}
              enableSearch={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};
