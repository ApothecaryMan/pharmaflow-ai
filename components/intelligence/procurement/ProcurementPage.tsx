import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { ProcurementItem, ProcurementSummary } from '../../../types/intelligence';
import { TanStackTable } from '../../common/TanStackTable';
import { ConfidenceIndicator } from '../common/ConfidenceIndicator';
import { DashboardPageSkeleton } from '../common/IntelligenceSkeletons';
import { StatusBadge } from '../common/StatusBadge';
import { GeneratePOModal } from './GeneratePOModal';
import { ProcurementKPIs } from './ProcurementKPIs';
import { useSettings } from '../../../context';
import { getDisplayName } from '../../../utils/drugDisplayName';

interface ProcurementPageProps {
  t: any;
  language?: string;
  summary: ProcurementSummary | null;
  filteredItems: ProcurementItem[];
  loading: boolean;
}

export const ProcurementPage: React.FC<ProcurementPageProps> = ({
  t,
  language = 'EN',
  summary,
  filteredItems,
  loading,
}) => {
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [selectedForPO, setSelectedForPO] = useState<string[]>([]);
  const { textTransform } = useSettings();

  // Listen for global event from Header
  useEffect(() => {
    const handleGlobalPO = (e: any) => {
      if (e.detail?.ids) {
        setSelectedForPO(e.detail.ids);
        setIsPOModalOpen(true);
      }
    };
    window.addEventListener('OPEN_PO_MODAL' as any, handleGlobalPO);
    (window as any).dispatchGlobalEvent = (name: string, data: any) => {
        window.dispatchEvent(new CustomEvent(name, { detail: { ids: data } }));
    };
    return () => window.removeEventListener('OPEN_PO_MODAL' as any, handleGlobalPO);
  }, []);

  const handleGeneratePO = (ids: string[]) => {
    setSelectedForPO(ids);
    setIsPOModalOpen(true);
  };

  const columnHelper = createColumnHelper<ProcurementItem>();

  const columns = useMemo<ColumnDef<ProcurementItem, any>[]>(
    () => [
      columnHelper.accessor('product_name', {
        header: t?.intelligence?.procurement?.grid?.columns?.product || 'Product',
        meta: { align: 'start' },
        cell: (info) => (
          <div>
            <div className='font-medium text-gray-900 dark:text-white'>
              {getDisplayName({ name: info.getValue() }, textTransform)}
            </div>
            <div className='text-xs text-gray-500'>{info.row.original.supplier_name}</div>
          </div>
        ),
      }),
      columnHelper.accessor('stock_status', {
        header: t?.intelligence?.procurement?.grid?.columns?.stockStatus || 'Status',
        meta: { align: 'center' },
        cell: (info) => <StatusBadge status={info.getValue()} language={language} />,
      }),
      columnHelper.accessor('current_stock', {
        header: t?.intelligence?.procurement?.grid?.columns?.available || 'Available',
        meta: { align: 'center' },
        cell: (info) => (
          <div className='flex flex-col'>
            <span className='font-bold'>{info.getValue()}</span>
            <span className='text-xs text-gray-400'>
              {info.row.original.stock_days
                ? `${info.row.original.stock_days} ${t?.intelligence?.procurement?.grid?.columns?.days || 'days'}`
                : '-'}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('avg_daily_sales', {
        header: t?.intelligence?.procurement?.grid?.columns?.dailySales || 'Daily Sales',
        meta: { align: 'center' },
        cell: (info) => (
          <span className='text-gray-600 dark:text-gray-300'>
            {info.getValue().toFixed(1)}{' '}
            {t?.intelligence?.procurement?.grid?.columns?.perDay || '/day'}
          </span>
        ),
      }),
      columnHelper.accessor('suggested_order_qty', {
        header: t?.intelligence?.procurement?.grid?.columns?.suggested || 'Suggested',
        meta: { align: 'start' },
        cell: (info) => (
          <div className='flex items-center gap-2'>
            <span className='font-bold text-blue-600 dark:text-blue-400'>{info.getValue()}</span>
            {info.row.original.skip_reason && (
              <span className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider bg-transparent'>
                <span className='material-symbols-rounded text-xs'>block</span>
                {t?.intelligence?.procurement?.grid?.skipped || 'Skipped'}
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('confidence_score', {
        header: t?.intelligence?.procurement?.grid?.columns?.confidence || 'Confidence',
        meta: { align: 'center' },
        cell: (info) => (
          <div>
            <ConfidenceIndicator score={info.getValue()} size='sm' />
          </div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        meta: { align: 'end' },
        cell: (info) => (
          <div className='flex justify-end'>
            <button
              className='w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all active:scale-95'
              onClick={() => handleGeneratePO([info.row.original.product_id])}
            >
              <span className='material-symbols-rounded text-xl font-icon'>add_shopping_cart</span>
            </button>
          </div>
        ),
      }),
    ],
    [columnHelper, handleGeneratePO, t, textTransform]
  );

  // Loading skeleton
  if (loading) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className='h-full flex flex-col space-y-4 overflow-hidden'>
      {/* Modal */}
      <GeneratePOModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        selectedProductIds={selectedForPO}
      />

      {/* KPIs */}
      <div className='shrink-0'>{summary && <ProcurementKPIs summary={summary} />}</div>

      {/* Main Grid Container */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex-1 flex flex-col overflow-hidden'>
        <div className='flex-1 overflow-hidden'>
          {filteredItems.length > 0 ? (
            <TanStackTable
              data={filteredItems}
              columns={columns}
              isLoading={loading}
              emptyMessage={t?.intelligence?.procurement?.empty?.title || 'No items to order'}
              tableId='procurement-table'
              lite={true}
              enableSearch={false}
              enablePagination={true}
              enableVirtualization={false}
              pageSize='auto'
              enableShowAll={true}
            />
          ) : (
            <div className='bg-white dark:bg-gray-800 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center'>
              <span className='material-symbols-rounded text-5xl text-gray-400 mb-4 opacity-20'>
                inventory
              </span>
              <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-2'>
                {t?.intelligence?.procurement?.empty?.title || 'No items needing order'}
              </h3>
              <p className='text-gray-500'>{t?.intelligence?.procurement?.empty?.subtitle || 'Your inventory seems to be well stocked'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
