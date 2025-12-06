import React, { useState } from 'react';
import { Return, Sale } from '../types';
import { DatePicker } from './DatePicker';
import { createSearchRegex } from '../utils/searchUtils';

interface ReturnHistoryProps {
  returns: Return[];
  sales: Sale[];
  color: string;
  t: any;
  language: string;
  datePickerTranslations: any;
}

export const ReturnHistory: React.FC<ReturnHistoryProps> = ({ returns, sales, color, t, language, datePickerTranslations }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);

  // Locale for dates
  const locale = language === 'AR' ? 'ar-EG' : 'en-US';

  // Filter returns
  const filteredReturns = returns.filter(ret => {
    const sale = sales.find(s => s.id === ret.saleId);
    const customerName = sale?.customerName || '';
    const searchRegex = createSearchRegex(searchTerm);
    
    const matchesSearch = 
      searchRegex.test(ret.id) ||
      searchRegex.test(ret.saleId) ||
      searchRegex.test(customerName);

    const returnDate = new Date(ret.date);
    const matchesDate = 
        (!startDate || returnDate >= startDate) &&
        (!endDate || returnDate <= endDate);

    return matchesSearch && matchesDate;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
       {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">{t.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>
      </div>

      {/* Filters */}
       <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:flex-1">
            <div className="relative group flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <span className="material-symbols-rounded text-[20px]">search</span>
                </span>
                <input
                    type="text"
                    placeholder={t.searchPlaceholder || "Search returns..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-full text-sm w-full focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
                />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    label={t.dateFrom || "From"}
                    color={color}
                    icon="calendar_today"
                    locale={locale}
                    translations={datePickerTranslations}
                />
                <span className="text-slate-300 dark:text-slate-700 rtl:rotate-180">
                    <span className="material-symbols-rounded text-[16px]">arrow_forward</span>
                </span>
                <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    label={t.dateTo || "To"}
                    color={color}
                    icon="event"
                    locale={locale}
                    translations={datePickerTranslations}
                />
            </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-start border-collapse">
            <thead className={`bg-${color}-50 dark:bg-${color}-900 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider sticky top-0 z-10 shadow-sm`}>
              <tr>
                <th className="px-6 py-4 text-start">{t.headers.returnId}</th>
                <th className="px-6 py-4 text-start">{t.headers.date}</th>
                <th className="px-6 py-4 text-start">{t.headers.saleId}</th>
                <th className="px-6 py-4 text-start">{t.headers.customer}</th>
                <th className="px-6 py-4 text-start">{t.headers.refundAmount}</th>
                <th className="px-6 py-4 text-start">{t.headers.reason}</th>
                <th className="px-6 py-4 text-end">{t.headers.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-${color}-50 dark:bg-${color}-900/20 flex items-center justify-center`}>
                        <span className={`material-symbols-rounded text-${color}-500 text-2xl`}>assignment_return</span>
                      </div>
                      <p>{t.noResults}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => {
                    const sale = sales.find(s => s.id === ret.saleId);
                    return (
                        <tr key={ret.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">#{ret.id}</td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                {new Date(ret.date).toLocaleDateString(locale)}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">#{ret.saleId}</td>
                            <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100 font-medium">
                                {sale?.customerName || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-red-600 dark:text-red-400">
                                -${ret.totalRefund.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 capitalize`}>
                                    {t.reasons?.[ret.reason] || ret.reason}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-end">
                                <button 
                                    onClick={() => setSelectedReturn(ret)}
                                    className={`p-2 rounded-full hover:bg-${color}-50 dark:hover:bg-${color}-900/20 text-slate-400 hover:text-${color}-600 dark:hover:text-${color}-400 transition-colors`}
                                    title={t.actions.viewDetails}
                                >
                                    <span className="material-symbols-rounded">visibility</span>
                                </button>
                            </td>
                        </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.modal.title}</h3>
                        <p className="text-sm text-slate-500">#{selectedReturn.id} • {new Date(selectedReturn.date).toLocaleString(locale)}</p>
                    </div>
                    <button 
                        onClick={() => setSelectedReturn(null)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t.headers.saleId}</p>
                            <p className="font-medium">#{selectedReturn.saleId}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t.headers.reason}</p>
                            <p className="font-medium capitalize">{t.reasons?.[selectedReturn.reason] || selectedReturn.reason}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium mb-3 text-sm text-slate-500 uppercase tracking-wider">{t.modal.itemsReturned}</h4>
                        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                            <table className="w-full text-sm text-start">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 text-start">{t.modal.item}</th>
                                        <th className="px-4 py-3 text-center">{t.modal.qty}</th>
                                        <th className="px-4 py-3 text-end">{t.modal.refund}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {selectedReturn.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{item.name} {item.dosageForm ? `(${item.dosageForm})` : ''}</div>
                                                <div className="text-xs text-slate-500">{item.isUnit ? t.modal.unit : t.modal.pack}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">{item.quantityReturned}</td>
                                            <td className="px-4 py-3 text-end font-medium">${item.refundAmount.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {selectedReturn.notes && (
                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100 border border-amber-100 dark:border-amber-900/30">
                            <p className="text-xs font-bold uppercase tracking-wider mb-1">{t.headers.notes}</p>
                            <p className="text-sm">{selectedReturn.notes}</p>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-end">
                            <p className="text-sm text-slate-500">{t.headers.totalRefund}</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">-${selectedReturn.totalRefund.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
