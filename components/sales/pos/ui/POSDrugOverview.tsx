import React from 'react';
import { useSettings } from '../../../../context';
import { permissionsService } from '../../../../services/auth/permissionsService';
import type { Drug } from '../../../../types';
import { getArabicDisplayName, getDisplayName } from '../../../../utils/drugDisplayName';
import { PriceDisplay } from '../../../common/TanStackTable';
import { formatExpiryDate, parseExpiryEndOfMonth, getExpiryColorClass } from '../../../../utils/expiryUtils';
import { resolveUnits } from '../../../../utils/stockOperations';
import { formatStockAmount } from '../../../../utils/inventory';

const formatDrugQty = (units: number, unitsPerPack: number, lang: string) => {
  const packs = units / (unitsPerPack || 1);
  const isInteger = Number.isInteger(packs);
  const packsStr = isInteger ? packs.toString() : parseFloat(packs.toFixed(2)).toString();
  const packLabel = lang === 'ar' ? 'علبة' : 'Packs';
  
  return `${packsStr} ${packLabel}`;
};

// ─── INTERNAL MINI-COMPONENTS (Rule 5) ─────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  bgClass?: string;
}> = ({ label, value, bgClass = 'bg-gray-50 dark:bg-gray-800/50' }) => (
  <div className={`px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-700 ${bgClass} flex items-center justify-between gap-3`}>
    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex-shrink-0">{label}</span>
    <div className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">{value}</div>
  </div>
);

const OverviewRow: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: string;
}> = ({ label, value, icon }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <div className="flex items-center gap-2">
      {icon && <span className="material-symbols-rounded text-gray-400 text-xs">{icon}</span>}
      <span className="text-xs font-bold text-gray-500">{label}</span>
    </div>
    <span className="text-xs font-black text-gray-900 dark:text-gray-100 tabular-nums">{value}</span>
  </div>
);

interface POSDrugOverviewProps {
  viewingDrug: Drug;
  drugBatches: Drug[];
  substitutes: Drug[];
  totalStock: number;
  t: any; // Type-safe but flexible for nested translation keys
  setViewingDrug: (drug: Drug | null) => void;
}

export const POSDrugOverview: React.FC<POSDrugOverviewProps> = ({
  viewingDrug,
  drugBatches,
  substitutes,
  totalStock,
  t,
  setViewingDrug
}) => {
  const { language, textTransform } = useSettings();
  const currentLang = language.toLowerCase() as 'en' | 'ar';

  return (
    <div className='flex flex-col gap-6 p-1' dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-3 order-2 md:order-first">
          <div className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-3">
            <span className="material-symbols-rounded text-emerald-500" style={{ fontSize: 'var(--icon-lg)' }}>inventory_2</span>
            <div>
              <span className="block text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-0.5">{t.stock || 'Total Stock'}</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums leading-none">
                {formatDrugQty(totalStock, viewingDrug.unitsPerPack || 1, currentLang)}
              </span>
            </div>
          </div>

          <div className="px-4 py-3 rounded-2xl bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/50 flex items-center gap-3">
            <span className="material-symbols-rounded text-primary-500" style={{ fontSize: 'var(--icon-lg)' }}>sell</span>
            <div>
              <span className="block text-[9px] font-black uppercase text-primary-600 dark:text-primary-400 tracking-wider mb-0.5">{t.publicPrice || 'Price'}</span>
              <span className="text-xl font-black text-primary-700 dark:text-primary-300 tabular-nums leading-none">
                <PriceDisplay value={viewingDrug.publicPrice} />
              </span>
            </div>
          </div>

          {drugBatches[0] && (
            <div className="px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 flex items-center gap-3">
              <span className="material-symbols-rounded text-amber-500" style={{ fontSize: 'var(--icon-lg)' }}>event</span>
              <div>
                <span className="block text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider mb-0.5">{currentLang === 'ar' ? 'أقرب صلاحية' : 'Next Expiry'}</span>
                <span className="text-xl font-black text-amber-700 dark:text-amber-300 tabular-nums leading-none uppercase">
                  {formatExpiryDate(drugBatches[0].expiryDate)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1 order-1 md:order-last text-start" dir="ltr">
          <h2 className='text-3xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight'>
            {getDisplayName(viewingDrug, textTransform)}
          </h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            {Array.isArray(viewingDrug.genericName) ? viewingDrug.genericName.join(' + ') : viewingDrug.genericName}
          </p>
          {viewingDrug.nameAr && (
            <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400 mt-1" dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
              {getArabicDisplayName(viewingDrug)}
            </h3>
          )}
        </div>
      </div>

      {/* Main Content Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pharma Profile - Small Cards */}
        <StatCard label={currentLang === 'ar' ? 'المصنع' : 'MFR'} value={viewingDrug.manufacturer || '-'} />
        <StatCard label={currentLang === 'ar' ? 'الشكل' : 'FORM'} value={viewingDrug.dosageForm || '-'} />
        <StatCard label={currentLang === 'ar' ? 'الفئة' : 'CAT'} value={viewingDrug.category || '-'} />
        <StatCard label={currentLang === 'ar' ? 'المنشأ' : 'ORG'} value={viewingDrug.origin || '-'} />

        {/* Unified Business & Inventory Card */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 flex flex-col gap-6">
          {/* Top: Identification & Business List */}
          <div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded text-primary-500 text-sm">business_center</span>
              {currentLang === 'ar' ? 'بيانات العمل والتعريف' : 'Business & Identification'}
            </h4>
            <div className="space-y-0.5">
              <OverviewRow icon="barcode" label="Barcode" value={viewingDrug.barcode || '-'} />
              {permissionsService.can('reports.view_financial') && (
                <OverviewRow icon="payments" label={currentLang === 'ar' ? 'سعر التكلفة' : 'Cost Price'} value={<PriceDisplay value={viewingDrug.costPrice} />} />
              )}
              <OverviewRow icon="sell" label={currentLang === 'ar' ? 'الخصم الأقصى' : 'Max Discount'} value={`${viewingDrug.maxDiscount || 0}%`} />
              <OverviewRow label={currentLang === 'ar' ? 'وحدات / عبوة' : 'Units / Pack'} value={viewingDrug.unitsPerPack || 1} />
              <OverviewRow label={currentLang === 'ar' ? 'حد الطلب' : 'Reorder Level'} value={viewingDrug.minStock || 5} />
            </div>
          </div>
        </div>

        {/* Batch Tracking - Grouped by Expiry */}
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900/50">
          <table className="w-full text-center text-xs">
            <thead className="border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-wider">{currentLang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-wider">{currentLang === 'ar' ? 'الكمية الإجمالية' : 'Total Qty'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {Object.entries(
                drugBatches.reduce((acc: Record<string, number>, batch) => {
                  const date = batch.expiryDate;
                  acc[date] = (acc[date] || 0) + batch.stock;
                  return acc;
                }, {})
              )
              .sort(([dateA], [dateB]) => parseExpiryEndOfMonth(dateA).getTime() - parseExpiryEndOfMonth(dateB).getTime())
              .map(([expiryDate, totalStock], idx) => {
                return (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                    <td className="px-4 py-2">
                      <span className={`tabular-nums ${getExpiryColorClass(expiryDate)}`}>
                        {formatExpiryDate(expiryDate)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`font-black tabular-nums ${totalStock < (viewingDrug.minStock || 5) ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatDrugQty(totalStock, viewingDrug.unitsPerPack || 1, currentLang)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>



      {/* Substitutes Section */}
      <section>
        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
          {currentLang === 'ar' ? 'البدائل المتاحة (نفس الاسم العلمي)' : 'Available Substitutes'}
        </h4>
        <div className="flex flex-wrap gap-2">
          {substitutes.length > 0 ? substitutes.map(sub => (
            <div 
              key={sub.id}
              onClick={() => setViewingDrug(sub)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 cursor-pointer transition-all group"
            >
              <div className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary-600 uppercase leading-tight mb-1">
                {getDisplayName(sub, textTransform)}
              </div>
              <div className="text-[10px] font-black text-primary-500">
                <PriceDisplay value={sub.publicPrice} />
              </div>
            </div>
          )) : (
            <span className="text-xs text-gray-400 italic">{currentLang === 'ar' ? 'لا يوجد بدائل مسجلة بنفس الاسم العلمي' : 'No substitutes found with same generic name.'}</span>
          )}
        </div>
      </section>

      {/* Description Footer */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
        <label className='text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest'>
          {t?.modal?.description || 'Description'}
        </label>
        <p className='text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium'>
          {viewingDrug.description || t?.modal?.noDescription || 'No detailed description available for this clinical record.'}
        </p>
      </div>
    </div>
  );
};
