import React, { useEffect, useState } from 'react';
import { useSettings } from '../../../../context';
import { inventoryService } from '../../../../services/inventory/inventoryService';
import { settingsService } from '../../../../services/settings/settingsService';
import { StorageKeys } from '../../../../config/storageKeys';
import { storage } from '../../../../utils/storage';
import type { Drug } from '../../../../types';
import { PriceDisplay } from '../../../common/TanStackTable';
import { formatExpiryDate } from '../../../../utils/expiryUtils';

interface POSDrugBranchesProps {
  viewingDrug: Drug;
  t: any;
}

export const POSDrugBranches: React.FC<POSDrugBranchesProps> = ({ viewingDrug, t }) => {
  const [otherBranches, setOtherBranches] = useState<Drug[]>([]);
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
        const branchCode = appSettings.branchCode || 'B1';
        
        const allItems = await inventoryService.getAllBranches();
        // Filter for same drug (by barcode) in other branches
        const matches = allItems.filter(d => 
          d.barcode === viewingDrug.barcode && 
          d.branchId !== branchCode &&
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
  }, [viewingDrug.barcode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex-1 p-4 rounded-2xl bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/20 flex items-center gap-4 w-full">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-rounded text-xl">location_on</span>
          </div>
          <div>
            <h4 className="text-sm font-black text-primary-700 dark:text-primary-300 uppercase">
              {currentLang === 'ar' ? 'التوفر في الفروع الأخرى' : 'Cross-Branch Availability'}
            </h4>
            <p className="text-[10px] text-primary-600 dark:text-primary-400 font-medium leading-none">
              {currentLang === 'ar' ? 'جاري عرض المخزون لفروع الشركة (أكواد الفرع)' : 'Showing real-time stock counts for all linked branches.'}
            </p>
          </div>
        </div>

        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
           <button 
             onClick={() => {
               setViewMode('table');
               storage.set(StorageKeys.POS_BRANCHES_VIEW_MODE, 'table');
             }}
             className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600'}`}
           >
             <span className="material-symbols-rounded text-lg">view_list</span>
             <span className="text-[10px] font-black uppercase">{currentLang === 'ar' ? 'جدول' : 'Table'}</span>
           </button>
           <button 
             onClick={() => {
               setViewMode('grid');
               storage.set(StorageKeys.POS_BRANCHES_VIEW_MODE, 'grid');
             }}
             className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600'}`}
           >
             <span className="material-symbols-rounded text-lg">grid_view</span>
             <span className="text-[10px] font-black uppercase">{currentLang === 'ar' ? 'كروت' : 'Cards'}</span>
           </button>
        </div>
      </div>

      {/* Main Content View */}
      {viewMode === 'table' ? (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {currentLang === 'ar' ? 'الفرع' : 'Branch Code'}
                </th>
                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                  {currentLang === 'ar' ? 'تاريخ الصلاحية' : 'Expiry'}
                </th>
                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                  {currentLang === 'ar' ? 'السعر' : 'Price'}
                </th>
                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                  {currentLang === 'ar' ? 'المخزون' : 'Stock'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {otherBranches.length > 0 ? otherBranches.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500">
                        {item.branchId}
                      </div>
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        {currentLang === 'ar' ? `الفرع ${item.branchId}` : `Branch ${item.branchId}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-bold tabular-nums text-gray-600 dark:text-gray-400">
                      {formatExpiryDate(item.expiryDate)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-black text-primary-500">
                      <PriceDisplay value={item.price} />
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-3 py-1 rounded-lg text-xs font-black tabular-nums ${item.stock > 10 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {item.stock}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <span className="material-symbols-rounded text-4xl">inventory_2</span>
                      <span className="text-sm font-bold">
                        {currentLang === 'ar' ? 'هذا الصنف غير متوفر حالياً في أي فروع أخرى' : 'Item not found in any other branches'}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherBranches.length > 0 ? otherBranches.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-400 transition-all group flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-500 transition-colors">
                    <span className="material-symbols-rounded text-xl">store</span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">
                      {currentLang === 'ar' ? 'كود الفرع' : 'Branch Area'}
                    </span>
                    <h5 className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase leading-none mt-0.5">
                      {item.branchId}
                    </h5>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-xl flex flex-col items-end ${item.stock > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30' : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30'}`}>
                  <span className={`text-[9px] font-black uppercase ${item.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {currentLang === 'ar' ? 'المخزون' : 'Stock'}
                  </span>
                  <span className={`text-lg font-black tabular-nums leading-none ${item.stock > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
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
                  <span className="text-xs font-black text-primary-500 tracking-tight">
                    <PriceDisplay value={item.price} />
                  </span>
                </div>
              </div>
            </div>
          )) : (
            <div className="md:col-span-2 p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center gap-2 opacity-30">
              <span className="material-symbols-rounded text-4xl">inventory_2</span>
              <span className="text-sm font-bold uppercase tracking-tight">
                {currentLang === 'ar' ? 'لا يوجد مخزون في أي فروع' : 'No external inventory found'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sync Notice (Always Visible) */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 flex gap-3 items-start">
        <span className="material-symbols-rounded text-blue-500 mt-0.5">info</span>
        <div className="space-y-1">
          <h5 className="text-[11px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest">
            {currentLang === 'ar' ? 'تنبيه المزامنة' : 'Stock Synchronization'}
          </h5>
          <p className="text-xs text-blue-700 dark:text-blue-500 font-medium leading-relaxed">
            {currentLang === 'ar' ? 'الكميات المعروضة هي آخر قراءة مسجلة في النظام. يُرجى التواصل هاتفياً مع الفرع للتأكد من توفر الصنف فعلياً قبل توجيه العميل.' 
            : 'Inventory levels are approximate based on the last sync. Please verify by phone with the branch manager before directing a customer.'}
          </p>
        </div>
      </div>
    </div>
  );
};
