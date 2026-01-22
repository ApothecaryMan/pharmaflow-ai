import React, { useState, useMemo } from 'react';
import { ProcurementKPIs } from './ProcurementKPIs';
import { FilterDropdown } from '../../common/FilterDropdown';
import { GeneratePOModal } from './GeneratePOModal';
import { useProcurement } from '../../../hooks/useProcurement';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { ProcurementItem } from '../../../types/intelligence';
import { TanStackTable } from '../../common/TanStackTable';
import { ConfidenceIndicator } from '../common/ConfidenceIndicator';
import { DashboardPageSkeleton } from '../common/IntelligenceSkeletons';

// --- Local Components ---

type BadgeColor = 'emerald' | 'blue' | 'amber' | 'red' | 'gray' | 'purple';

const StatusBadge = ({
  status,
  label,
  color,
  size = 'md',
  language = 'EN'
}: {
  status: string;
  label?: string;
  color?: BadgeColor;
  size?: 'sm' | 'md';
  language?: string;
}) => {
  // Default mappings
  const getStatusConfig = (statusKey: string): { color: BadgeColor; label: string } => {
    const isAr = language === 'AR';
    switch (statusKey) {
      // Stock Status
      case 'NORMAL': return { color: 'emerald', label: isAr ? 'طبيعي' : 'Normal' };
      case 'LOW': return { color: 'amber', label: isAr ? 'منخفض' : 'Low' };
      case 'CRITICAL': return { color: 'red', label: isAr ? 'حرج' : 'Critical' };
      case 'OUT_OF_STOCK': return { color: 'red', label: isAr ? 'نافذ' : 'Out of Stock' };
      case 'OVERSTOCK': return { color: 'purple', label: isAr ? 'فائض' : 'Overstock' };
      
      // Seasonal Trajectory
      case 'RISING': return { color: 'emerald', label: isAr ? 'صعود ↗' : 'Rising ↗' };
      case 'STABLE': return { color: 'blue', label: isAr ? 'مستقر ─' : 'Stable ─' };
      case 'DECLINING': return { color: 'amber', label: isAr ? 'هبوط ↘' : 'Declining ↘' };
      
      // Risk Category
      case 'HIGH': return { color: 'red', label: isAr ? 'مخاطرة عالية' : 'High Risk' };
      case 'MEDIUM': return { color: 'amber', label: isAr ? 'مخاطرة متوسطة' : 'Medium Risk' };
      case 'CRITICAL_RISK': return { color: 'red', label: isAr ? 'مخاطرة حرجة' : 'Critical Risk' };
      case 'LOW_RISK': return { color: 'emerald', label: isAr ? 'مخاطرة قليلة' : 'Low Risk' };

      // Data Quality
      case 'GOOD': return { color: 'emerald', label: isAr ? 'جيدة' : 'Good' };
      case 'SPARSE': return { color: 'amber', label: isAr ? 'قليلة' : 'Sparse' };
      case 'NEW_PRODUCT': return { color: 'blue', label: isAr ? 'جديد' : 'New' };
      
      default: return { color: 'gray', label: statusKey };
    }
  };

  const config = getStatusConfig(status);
  const finalColor = color || config.color;
  const finalLabel = label || config.label;

  const colorClasses = {
    emerald: 'bg-transparent text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    blue: 'bg-transparent text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    amber: 'bg-transparent text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    red: 'bg-transparent text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    gray: 'bg-transparent text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    purple: 'bg-transparent text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center justify-center rounded-md border font-medium whitespace-nowrap ${colorClasses[finalColor]} ${sizeClass}`}>
      {finalLabel}
    </span>
  );
};

interface ProcurementPageProps {
  t: any;
  language?: string;
}

export const ProcurementPage: React.FC<ProcurementPageProps> = ({ t, language = 'EN' }) => {
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
      meta: { align: 'start' },
      cell: info => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{info.getValue()}</div>
          <div className="text-xs text-gray-500">{info.row.original.supplier_name}</div>
        </div>
      ),
    }),
    columnHelper.accessor('stock_status', {
      header: t?.intelligence?.procurement?.grid?.columns?.stockStatus || 'Status',
      meta: { align: 'center' },
      cell: info => <StatusBadge status={info.getValue()} language={language} />,
    }),
    columnHelper.accessor('current_stock', {
      header: t?.intelligence?.procurement?.grid?.columns?.available || 'Available',
      meta: { align: 'center' },
      cell: info => (
        <div className="flex flex-col">
          <span className="font-bold">{info.getValue()}</span>
          <span className="text-xs text-gray-400">
            {info.row.original.stock_days ? `${info.row.original.stock_days} ${t?.intelligence?.procurement?.grid?.columns?.days || 'days'}` : '-'}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('avg_daily_sales', {
      header: t?.intelligence?.procurement?.grid?.columns?.dailySales || 'Daily Sales',
      meta: { align: 'center' },
      cell: info => (
          <span className="text-gray-600 dark:text-gray-300">
              {info.getValue().toFixed(1)} {t?.intelligence?.procurement?.grid?.columns?.perDay || '/day'}
          </span>
      ),
    }),
    columnHelper.accessor('suggested_order_qty', {
      header: t?.intelligence?.procurement?.grid?.columns?.suggested || 'Suggested',
      meta: { align: 'start' },
      cell: info => (
        <div className="flex items-center gap-2">
           <span className="font-bold text-blue-600 dark:text-blue-400">
             {info.getValue()}
           </span>
           {info.row.original.skip_reason && (
             <span className="text-[10px] text-amber-600 border border-amber-200 dark:border-amber-700 bg-transparent px-1.5 py-0.5 rounded-md font-bold">
               {t?.intelligence?.procurement?.grid?.skipped || 'Skipped'}
             </span>
           )}
        </div>
      ),
    }),
    columnHelper.accessor('confidence_score', {
      header: t?.intelligence?.procurement?.grid?.columns?.confidence || 'Confidence',
      meta: { align: 'center' },
      cell: info => (
          <div>
              <ConfidenceIndicator score={info.getValue()} size="sm" />
          </div>
      ),
    }),
    columnHelper.display({
        id: 'actions',
        header: '',
        meta: { align: 'end' },
        cell: info => (
            <div className="flex justify-end">
                <button 
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all active:scale-95"
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
    return <DashboardPageSkeleton withTopBar />;
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
