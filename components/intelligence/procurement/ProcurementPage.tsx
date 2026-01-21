import React, { useState, useMemo } from 'react';
import { ProcurementKPIs } from './ProcurementKPIs';
import { FilterDropdown } from '../../common/FilterDropdown';
import { GeneratePOModal } from './GeneratePOModal';
import { useProcurement } from '../../../hooks/useProcurement';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { ProcurementItem } from '../../../types/intelligence';
import { TanStackTable } from '../../common/TanStackTable';
import { StatusBadge } from '../common/StatusBadge';
import { ConfidenceIndicator } from '../common/ConfidenceIndicator';

interface ProcurementPageProps {
  t: any;
  language?: string;
}

export const ProcurementPage: React.FC<ProcurementPageProps> = ({ t }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [selectedForPO, setSelectedForPO] = useState<string[]>([]);

  const { summary, filteredItems, loading, suppliers, categories } = useProcurement({
    supplierId: selectedSupplier,
    categoryId: selectedCategory
  });

  // Build dropdown options
  const supplierOptions = useMemo(() => [
    { label: t.intelligence.procurement.filters.all, value: 'all' },
    ...suppliers.map(s => ({ label: s.name, value: s.id }))
  ], [suppliers, t]);

  const categoryOptions = useMemo(() => [
    { label: t.intelligence.procurement.filters.all, value: 'all' },
    ...categories.map(c => ({ label: c.name, value: c.id }))
  ], [categories, t]);

  const handleGeneratePO = (ids: string[]) => {
    setSelectedForPO(ids);
    setIsPOModalOpen(true);
  };

  const columnHelper = createColumnHelper<ProcurementItem>();

  const columns = useMemo<ColumnDef<ProcurementItem, any>[]>(() => [
    columnHelper.accessor('product_name', {
      header: t?.intelligence?.procurement?.grid?.columns?.product || 'Product',
      cell: info => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{info.getValue()}</div>
          <div className="text-xs text-gray-500">{info.row.original.supplier_name}</div>
        </div>
      ),
    }),
    columnHelper.accessor('stock_status', {
      header: t?.intelligence?.procurement?.grid?.columns?.stockStatus || 'Status',
      cell: info => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('current_stock', {
      header: t?.intelligence?.procurement?.grid?.columns?.available || 'Available',
      cell: info => (
        <div className="flex flex-col items-center">
          <span className="font-bold">{info.getValue()}</span>
          <span className="text-xs text-gray-400">
            {info.row.original.stock_days ? `${info.row.original.stock_days} ${t?.intelligence?.procurement?.grid?.columns?.days || 'days'}` : '-'}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('avg_daily_sales', {
      header: t?.intelligence?.procurement?.grid?.columns?.dailySales || 'Daily Sales',
      cell: info => (
          <span className="text-gray-600 dark:text-gray-300">
              {info.getValue().toFixed(1)} {t?.intelligence?.procurement?.grid?.columns?.perDay || '/day'}
          </span>
      ),
    }),
    columnHelper.accessor('suggested_order_qty', {
      header: t?.intelligence?.procurement?.grid?.columns?.suggested || 'Suggested',
      cell: info => (
        <div className="flex items-center gap-2">
           <span className="font-bold text-blue-600 dark:text-blue-400">
             {info.getValue()}
           </span>
           {info.row.original.skip_reason && (
             <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-lg font-bold">
               {t?.intelligence?.procurement?.grid?.skipped || 'Skipped'}
             </span>
           )}
        </div>
      ),
    }),
    columnHelper.accessor('confidence_score', {
      header: t?.intelligence?.procurement?.grid?.columns?.confidence || 'Confidence',
      cell: info => (
          <div>
              <ConfidenceIndicator score={info.getValue()} size="sm" />
          </div>
      ),
    }),
    columnHelper.display({
        id: 'actions',
        header: '',
        cell: info => (
            <div>
                <button 
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-95"
                onClick={() => handleGeneratePO([info.row.original.product_id])}
                >
                    <span className="material-symbols-rounded text-xl font-icon">add_shopping_cart</span>
                </button>
            </div>
        )
    })
  ], [columnHelper, handleGeneratePO, t]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Modal */}
      <GeneratePOModal 
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        selectedProductIds={selectedForPO}
      />

      {/* Filters Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 shrink-0">
         <div className="flex flex-wrap gap-2 items-center">
            <div className="relative h-[42px] min-w-[12rem]">
            <FilterDropdown
              floating
              items={supplierOptions}
              selectedItem={supplierOptions.find(i => i.value === selectedSupplier)}
              onSelect={(item) => setSelectedSupplier(item.value)}
              keyExtractor={(item) => item.value}
              renderItem={(item, isSelected) => (
                 <span className={`${isSelected ? 'font-bold text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                    {item.label}
                 </span>
              )}
              renderSelected={(item) => (
                <div className="flex items-center gap-2">
                   <span className="material-symbols-rounded text-gray-500 text-lg">inventory_2</span>
                   <span className="text-gray-500 text-xs">{t.intelligence.procurement.filters.supplier}:</span>
                   <span className="font-medium text-gray-900 dark:text-white text-sm">
                     {item?.label || t.intelligence.procurement.filters.select}
                   </span>
                </div>
              )}
              variant="input"
              className="z-50"
              minHeight={42}
            />
            </div>
            
            <div className="relative h-[42px] min-w-[12rem]">
             <FilterDropdown
              floating
              items={categoryOptions}
              selectedItem={categoryOptions.find(i => i.value === selectedCategory)}
              onSelect={(item) => setSelectedCategory(item.value)}
              keyExtractor={(item) => item.value}
              renderItem={(item, isSelected) => (
                <span className={`${isSelected ? 'font-bold text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                  {item.label}
                </span>
              )}
              renderSelected={(item) => (
                <div className="flex items-center gap-2">
                   <span className="material-symbols-rounded text-gray-500 text-lg">category</span>
                   <span className="text-gray-500 text-xs">{t.intelligence.procurement.filters.category}:</span>
                   <span className="font-medium text-gray-900 dark:text-white text-sm">
                     {item?.label || t.intelligence.procurement.filters.select}
                   </span>
                </div>
              )}
              variant="input"
              className="z-40"
              minHeight={42}
            />
            </div>
         </div>
         
         <div className="flex gap-2">
            <button 
              onClick={() => handleGeneratePO(filteredItems.map(i => i.product_id))}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm active:scale-95"
            >
                <span className="material-symbols-rounded text-lg">add_shopping_cart</span>
                {t.intelligence.procurement.actions.generatePO}
            </button>
         </div>
      </div>

      {/* KPIs */}
      <div className="shrink-0">
        {summary && <ProcurementKPIs summary={summary} />}
      </div>

      {/* Main Grid Container */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {filteredItems.length > 0 ? (
            <TanStackTable
              data={filteredItems}
              columns={columns}
              isLoading={loading}
              emptyMessage={t.intelligence.procurement.empty.title}
              tableId="procurement-table"
              lite={true}
              enableSearch={false}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
              <span className="material-symbols-rounded text-5xl text-gray-400 mb-4 opacity-20">inventory</span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t.intelligence.procurement.empty.title}</h3>
              <p className="text-gray-500">{t.intelligence.procurement.empty.subtitle}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
