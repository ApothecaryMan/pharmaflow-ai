import React from 'react';
import { useSettings } from '../../../../context';
import { permissionsService } from '../../../../services/auth/permissionsService';
import type { Drug } from '../../../../types';
import { getArabicDisplayName, getDisplayName } from '../../../../utils/drugDisplayName';
import { PriceDisplay } from '../../../common/TanStackTable';
import { formatExpiryDate, parseExpiryEndOfMonth } from '../../../../utils/expiryUtils';

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
    <div className='flex flex-col gap-6 p-1' dir="ltr">
      {/* Header Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div className="space-y-1">
          <h2 className='text-3xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight'>
            {getDisplayName(viewingDrug, textTransform)}
          </h2>
          {viewingDrug.nameArabic && (
            <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400" dir="rtl">
              {getArabicDisplayName(viewingDrug)}
            </h3>
          )}
          <p className='text-sm text-gray-500 font-medium italic'>
            {Array.isArray(viewingDrug.genericName) ? viewingDrug.genericName.join(' + ') : (viewingDrug.genericName as any)}
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 text-center">
            <span className="block text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-0.5">{t.stock || 'Total Stock'}</span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{totalStock}</span>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 text-center">
            <span className="block text-[10px] font-black uppercase text-primary-600 dark:text-primary-400 mb-0.5">{t.publicPrice || 'Price'}</span>
            <span className="text-xl font-black text-primary-700 dark:text-primary-300 tabular-nums">
              <PriceDisplay value={viewingDrug.publicPrice} />
            </span>
          </div>
          {drugBatches[0] && (
            <div className="px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 text-center min-w-[120px]">
              <span className="block text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mb-0.5">{currentLang === 'ar' ? 'أقرب صلاحية' : 'Next Expiry'}</span>
              <span className="text-xl font-black text-amber-700 dark:text-amber-300 tabular-nums uppercase">
                {formatExpiryDate(drugBatches[0].expiryDate)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Pharma Profile */}
        <section>
          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
            {currentLang === 'ar' ? 'الملف الدوائي' : 'Pharma Profile'}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">{currentLang === 'ar' ? 'الجهة المصنعة' : 'Manufacturer'}</label>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 line-clamp-1">{viewingDrug.manufacturer || '-'}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">{currentLang === 'ar' ? 'المنشأ' : 'Origin'}</label>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 line-clamp-1">{viewingDrug.origin || '-'}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">{currentLang === 'ar' ? 'الشكل الدوائي' : 'Dosage Form'}</label>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 line-clamp-1">{viewingDrug.dosageForm || '-'}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">{currentLang === 'ar' ? 'التصنيف' : 'Class'}</label>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 line-clamp-1">{viewingDrug.class || '-'}</span>
            </div>
          </div>
          
          {viewingDrug.genericName && (
            <div className="mt-3 p-3 rounded-xl bg-primary-50/30 dark:bg-primary-900/10 border border-primary-100/50 dark:border-primary-800/20">
              <label className="block text-[9px] font-black text-primary-500 uppercase mb-2 tracking-widest">
                {currentLang === 'ar' ? 'الاسم العلمي' : 'Scientific Name'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(viewingDrug.genericName) ? viewingDrug.genericName : [viewingDrug.genericName]).filter(Boolean).map((ing, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-white dark:bg-gray-900 text-[10px] font-bold text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800 shadow-sm uppercase">
                    {(ing as any)?.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Column 2: Identification & Business */}
        <div className="space-y-6">
          <section>
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {currentLang === 'ar' ? 'أكواد التعريف' : 'Identification'}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500">Barcode</span>
                <span className="text-sm font-black tabular-nums tracking-tighter text-gray-800 dark:text-gray-100 leading-none">
                  {viewingDrug.barcode || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500">Internal Code</span>
                <span className="text-sm font-black tabular-nums tracking-tighter text-gray-800 dark:text-gray-100 leading-none">
                  {viewingDrug.internalCode || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500">Database ID</span>
                <span className="text-[10px] font-black tabular-nums text-gray-400 leading-none">
                  {viewingDrug.dbId || viewingDrug.id}
                </span>
              </div>
              {viewingDrug.additionalBarcodes && viewingDrug.additionalBarcodes.length > 0 && (
                <div className="flex flex-col p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-500 mb-2">Additional Barcodes</span>
                  <div className="flex flex-wrap gap-1">
                    {viewingDrug.additionalBarcodes.map((bc, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[9px] font-bold tabular-nums">
                        {bc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {currentLang === 'ar' ? 'بيانات إدارية' : 'Business Insights'}
            </h4>
            <div className="space-y-3">
              {permissionsService.can('reports.view_financial') && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-bold">{currentLang === 'ar' ? 'سعر التكلفة:' : 'Cost Price:'}</span>
                  <span className="font-black tabular-nums text-gray-900 dark:text-gray-100">
                      <PriceDisplay value={viewingDrug.costPrice} />
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold">{currentLang === 'ar' ? 'الخصم الأقصى:' : 'Max Discount:'}</span>
                <span className="bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-lg text-amber-700 dark:text-amber-400 font-black tabular-nums">
                  {viewingDrug.maxDiscount || 10}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold">{currentLang === 'ar' ? 'الترتيب الفرعي:' : 'Item Rank:'}</span>
                <span className="text-gray-900 dark:text-gray-100 font-black tabular-nums">#{viewingDrug.itemRank || '-'}</span>
              </div>
            </div>
            
            {/* Min Stock & Units Tracking */}
            <div className="mt-4 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/50">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase">{currentLang === 'ar' ? 'وحدات لكل عبوة' : 'Units/Pack'}</span>
                  <p className="text-lg font-black text-gray-800 dark:text-gray-200">{viewingDrug.unitsPerPack || 1}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase">{currentLang === 'ar' ? 'الحد الأدنى' : 'Min. Stock'}</span>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400">{viewingDrug.minStock || 5}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Column 3: Batch Tracking (Old Place) */}
        <section className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
              {currentLang === 'ar' ? 'تتبع الصلاحيات' : 'Batch Tracking'}
            </h4>
            <span className="text-[10px] font-bold text-gray-400">{drugBatches.length} {currentLang === 'ar' ? 'تشغيلة' : 'batches'}</span>
          </div>
          <div className="flex-1 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-3 py-2 font-black text-gray-500 uppercase">{currentLang === 'ar' ? 'التشغيلة' : 'Batch'}</th>
                  <th className="px-3 py-2 font-black text-gray-500 uppercase">{currentLang === 'ar' ? 'الصلاحية' : 'Expiry'}</th>
                  <th className="px-3 py-2 font-black text-gray-500 uppercase text-right">{currentLang === 'ar' ? 'الكمية' : 'Qty'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {drugBatches.map((batch, idx) => {
                  const isExpiring = parseExpiryEndOfMonth(batch.expiryDate).getTime() < new Date().getTime() + (90 * 24 * 60 * 60 * 1000);
                  return (
                    <tr key={idx} className={idx === 0 ? "bg-amber-50/30 dark:bg-amber-900/5" : "hover:bg-gray-50/50 dark:hover:bg-gray-800/10"}>
                      <td className="px-3 py-2 font-bold tabular-nums text-gray-500">{batch.internalCode || batch.id.slice(0, 5)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold tabular-nums text-gray-700 dark:text-gray-300">
                            {formatExpiryDate(batch.expiryDate)}
                          </span>
                          {isExpiring && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Expiring Soon" />}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-black tabular-nums ${batch.stock < 10 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                          {batch.stock}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

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
              <div className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary-600 truncate max-w-[140px] uppercase">
                {sub.name}
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
      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/50">
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
