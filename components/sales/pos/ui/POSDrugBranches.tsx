import React, { useEffect, useState } from 'react';
import { useSettings } from '../../../../context';
import { inventoryService } from '../../../../services/inventory/inventoryService';
import { settingsService } from '../../../../services/settings/settingsService';
import { StorageKeys } from '../../../../config/storageKeys';
import { storage } from '../../../../utils/storage';
import type { Drug } from '../../../../types';
import { SegmentedControl } from '../../../common/SegmentedControl';
import { branchService } from '../../../../services/org/branchService';
import { TanStackTable, PriceDisplay } from '../../../common/TanStackTable';
import { formatExpiryDate } from '../../../../utils/expiryUtils';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

interface POSDrugBranchesProps {
  viewingDrug: Drug;
  t: any;
}

export const POSDrugBranches: React.FC<POSDrugBranchesProps> = ({ viewingDrug, t }) => {
  const [otherBranches, setOtherBranches] = useState<Drug[]>([]);
  const [branchNames, setBranchNames] = useState<Record<string, string>>({});
  const [branchCodes, setBranchCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => 
    storage.get<'table' | 'grid'>(StorageKeys.POS_BRANCHES_VIEW_MODE, 'table')
  );
  const { language } = useSettings();
  const currentLang = language.toLowerCase() as 'en' | 'ar';

  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      try {
        const appSettings = await settingsService.getAll();
        const activeBranchId = appSettings.activeBranchId || '';
        
        const allItems = await inventoryService.getAllBranches();
        
        // Fetch all branches to get names
        const targetOrgId = viewingDrug.orgId || appSettings.orgId;
        const allBranches = await branchService.getAll(targetOrgId);
        const namesMap: Record<string, string> = {};
        const codesMap: Record<string, string> = {};
        allBranches.forEach(b => {
          namesMap[b.id] = b.name;
          codesMap[b.id] = b.code;
        });
        setBranchNames(namesMap);
        setBranchCodes(codesMap);

        // Filter for same drug (by barcode) in other branches
        const matches = allItems.filter(d => 
          d.barcode === viewingDrug.barcode && 
          d.branchId !== activeBranchId &&
          d.branchId !== undefined
        );
        setOtherBranches(matches);
      } catch (error) {
        console.error('Failed to fetch branch inventory:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [viewingDrug.barcode, currentLang]);

  const columns = useMemo<ColumnDef<Drug>[]>(() => [
    {
      id: 'code',
      header: '#',
      cell: ({ row }) => (
        <span className="text-[10px] font-black text-gray-400 tabular-nums uppercase">
          {branchCodes[row.original.branchId!] || '#'}
        </span>
      ),
      meta: { align: 'start' }
    },
    {
      accessorKey: 'branchId',
      header: currentLang === 'ar' ? 'الفرع' : 'Branch',
      cell: ({ row }) => (
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
          {branchNames[row.original.branchId!] || row.original.branchId}
        </span>
      )
    },
    {
      accessorKey: 'expiryDate',
      header: currentLang === 'ar' ? 'تاريخ الصلاحية' : 'Expiry',
      cell: ({ getValue }) => (
        <span className="text-xs font-bold tabular-nums text-gray-600 dark:text-gray-400">
          {formatExpiryDate(getValue() as string)}
        </span>
      ),
      meta: { align: 'center' }
    },
    {
      accessorKey: 'publicPrice',
      header: currentLang === 'ar' ? 'السعر' : 'Price',
      cell: ({ getValue }) => (
        <span className="text-xs font-black text-gray-900 dark:text-white">
          <PriceDisplay value={getValue() as number} />
        </span>
      ),
      meta: { align: 'center' }
    },
    {
      accessorKey: 'stock',
      header: currentLang === 'ar' ? 'المخزون' : 'Stock',
      cell: ({ getValue }) => (
        <span className="text-sm font-black tabular-nums text-gray-900 dark:text-white">
          {getValue() as number}
        </span>
      ),
      meta: { align: 'center' }
    }
  ], [currentLang, branchNames]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header & Toggle */}
      <div className="flex justify-center items-center gap-4">

        <SegmentedControl
          size="xs"
          fullWidth={false}
          options={[
            { 
              label: currentLang === 'ar' ? 'جدول' : 'Table', 
              value: 'table', 
              icon: 'view_list' 
            },
            { 
              label: currentLang === 'ar' ? 'كروت' : 'Cards', 
              value: 'grid', 
              icon: 'grid_view' 
            }
          ]}
          value={viewMode}
          onChange={(v: 'table' | 'grid') => {
            setViewMode(v);
            storage.set(StorageKeys.POS_BRANCHES_VIEW_MODE, v);
          }}
        />
      </div>

      {/* Main Content View */}
      {viewMode === 'table' ? (
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900/50 [&_thead]:bg-white [&_thead]:dark:bg-gray-900/50">
          <TanStackTable 
            data={otherBranches}
            columns={columns}
            lite
            dense
            enableTopToolbar={false}
            emptyMessage={currentLang === 'ar' ? 'هذا الصنف غير متوفر حالياً في أي فروع أخرى' : 'Item not found in any other branches'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherBranches.length > 0 ? otherBranches.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-400 transition-all group flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-500 transition-colors">
                    <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-lg)', lineHeight: 1 }}>store</span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">
                      {branchCodes[item.branchId!] || item.branchId}
                    </span>
                    <h5 className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase leading-none mt-0.5">
                      {branchNames[item.branchId!] || item.branchId}
                    </h5>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase text-gray-500">
                    {currentLang === 'ar' ? 'المخزون' : 'Stock'}
                  </span>
                  <span className="text-lg font-black tabular-nums leading-none text-gray-900 dark:text-white">
                    {item.stock}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-800/50">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">{currentLang === 'ar' ? 'الصلاحية' : 'Expiry'}</span>
                  <span className="text-[11px] font-black text-gray-600 dark:text-gray-400 tabular-nums">
                    {formatExpiryDate(item.expiryDate)}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">{currentLang === 'ar' ? 'السعر' : 'Unit Price'}</span>
                  <span className="text-xs font-black text-gray-900 dark:text-white tracking-tight">
                    <PriceDisplay value={item.publicPrice} />
                  </span>
                </div>
              </div>
            </div>
          )) : (
            <div className="md:col-span-2 p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center gap-2 opacity-30">
              <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-3xl)', lineHeight: 1 }}>inventory_2</span>
              <span className="text-sm font-bold uppercase tracking-tight">
                {currentLang === 'ar' ? 'لا يوجد مخزون في أي فروع' : 'No external inventory found'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sync Notice (Always Visible) */}
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex gap-3 items-start">
        <span className="material-symbols-rounded text-gray-500 mt-0.5" style={{ fontSize: 'var(--icon-sm)', lineHeight: 1 }}>info</span>
        <div className="space-y-1">
          <h5 className="text-[11px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-widest">
            {currentLang === 'ar' ? 'تنبيه المزامنة' : 'Stock Synchronization'}
          </h5>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
            {currentLang === 'ar' ? 'الكميات المعروضة هي آخر قراءة مسجلة في النظام. يُرجى التواصل هاتفياً مع الفرع للتأكد من توفر الصنف فعلياً قبل توجيه العميل.' 
            : 'Inventory levels are approximate based on the last sync. Please verify by phone with the branch manager before directing a customer.'}
          </p>
        </div>
      </div>
    </div>
  );
};
