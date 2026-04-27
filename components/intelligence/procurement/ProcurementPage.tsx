import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { ProcurementItem, ProcurementSummary } from '../../../types/intelligence';
import { TanStackTable } from '../../common/TanStackTable';
import { ConfidenceIndicator } from '../common/ConfidenceIndicator';
import { DashboardPageSkeleton } from '../common/IntelligenceSkeletons';
import { StatusBadge } from '../common/StatusBadge';
import { GeneratePOModal } from './GeneratePOModal';
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
            {info.getValue().toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
            {t?.intelligence?.procurement?.grid?.columns?.perDay || '/day'}
          </span>
        ),
      }),
      columnHelper.accessor('suggested_order_qty', {
        header: t?.intelligence?.procurement?.grid?.columns?.suggested || 'Suggested',
        meta: { align: 'start' },
        cell: (info) => (
          <div className='flex items-center gap-2'>
            <span className='font-bold text-emerald-600 dark:text-emerald-400'>{info.getValue()}</span>
            {info.row.original.skip_reason && (
              <span className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-current text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider bg-transparent'>
                <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-sm)' }}>block</span>
                {t?.intelligence?.procurement?.blocked || 'Low Movement'}
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
              onClick={() => handleGeneratePO([info.row.original.product_id])}
              className='p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors'
              title={t?.intelligence?.procurement?.generatePO || 'Generate PO'}
            >
              <span className='material-symbols-rounded font-icon' style={{ fontSize: 'var(--icon-lg)' }}>add_shopping_cart</span>
            </button>
          </div>
        ),
      }),
    ],
    [columnHelper, handleGeneratePO, t, textTransform]
  );

  // Page renders immediately; TanStackTable handles its own skeletons
  // and maintains data during background refreshes.

  return (
    <div className='h-full flex flex-col space-y-4 overflow-hidden'>
      {/* Modal */}
      <GeneratePOModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        selectedProductIds={selectedForPO}
      />


      {/* Main Grid Container - Simplified since TanStackTable will provide card styling */}
      <div className='flex-1 min-h-0'>
        {filteredItems.length > 0 || loading ? (
          <TanStackTable
            data={filteredItems}
            columns={columns}
            isLoading={loading}
            emptyMessage={t?.intelligence?.procurement?.empty?.title || 'No items to order'}
            tableId='procurement-table'
            lite={false}
            enableSearch={false}
            enablePagination={true}
            enableVirtualization={false}
            pageSize='auto'
            enableShowAll={true}
          />
        ) : (
          <div className='bg-(--bg-card) rounded-xl border-2 border-(--border-primary) dark:border-(--border-divider) p-8 text-center h-full flex flex-col items-center justify-center'>
            <span className='material-symbols-rounded text-gray-400 mb-4 opacity-20' style={{ fontSize: 'var(--icon-2xl)' }}>
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
  );
};
