
import React, { useState } from 'react';
import { Return, Sale, CartItem } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { DatePicker } from '../common/DatePicker';
import { createSearchRegex } from '../../utils/searchUtils';
import { useSmartDirection } from '../common/SmartInputs';
import { SearchInput } from '../common/SearchInput';
import { RETURN_HISTORY_HELP } from '../../i18n/helpInstructions';
import { HelpModal, HelpButton } from '../common/HelpModal';
import { Modal } from '../common/Modal';

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
  const [showHelp, setShowHelp] = useState(false);

  // Get help content based on language
  const helpContent = RETURN_HISTORY_HELP[language as 'EN' | 'AR'] || RETURN_HISTORY_HELP.EN;

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
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.subtitle}</p>
        </div>
      </div>

      {/* Filters */}
       <div className={`flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${CARD_BASE} p-4 rounded-2xl`}>
        <div className="flex flex-wrap items-center gap-3 w-full sm:flex-1">
            <div className="relative group flex-1">
                <SearchInput
                    value={searchTerm}
                    onSearchChange={setSearchTerm}
                    placeholder={t.searchPlaceholder || "Search returns..."}
                    className="bg-gray-50 dark:bg-gray-800 border-none ps-10"
                    wrapperClassName="w-full"
                />
            </div>
            
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700">
                <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    label={t.dateFrom || "From"}
                    color={color}
                    icon="calendar_today"
                    locale={locale}
                    translations={datePickerTranslations}
                />
                <span className="text-gray-300 dark:text-gray-700 rtl:rotate-180">
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
      <div className={`flex-1 ${CARD_BASE} rounded-3xl overflow-hidden flex flex-col`}>
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
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
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
                        <tr key={ret.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">#{ret.id}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                {new Date(ret.date).toLocaleDateString(locale)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">#{ret.saleId}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                                {sale?.customerName || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-red-600 dark:text-red-400">
                                -${ret.totalRefund.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 capitalize`}>
                                    {t.reasons?.[ret.reason] || ret.reason}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-end">
                                <button 
                                    onClick={() => setSelectedReturn(ret)}
                                    className={`p-2 rounded-full hover:bg-${color}-50 dark:hover:bg-${color}-900/20 text-gray-400 hover:text-${color}-600 dark:hover:text-${color}-400 transition-colors`}
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
        <Modal
            isOpen={true}
            onClose={() => setSelectedReturn(null)}
            size="2xl"
            zIndex={50}
        >
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t.modal.title}</h3>
                        <p className="text-sm text-gray-500">#{selectedReturn.id} • {new Date(selectedReturn.date).toLocaleString(locale)}</p>
                    </div>
                    <button 
                        onClick={() => setSelectedReturn(null)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t.headers.saleId}</p>
                            <p className="font-medium">#{selectedReturn.saleId}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t.headers.reason}</p>
                            <p className="font-medium capitalize">{t.reasons?.[selectedReturn.reason] || selectedReturn.reason}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium mb-3 text-sm text-gray-500 uppercase tracking-wider">{t.modal.itemsReturned}</h4>
                        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                            <table className="w-full text-sm text-start">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3 text-start">{t.modal.item}</th>
                                        <th className="px-4 py-3 text-center">{t.modal.qty}</th>
                                        <th className="px-4 py-3 text-end">{t.modal.refund}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {selectedReturn.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{item.name} {item.dosageForm ? `(${item.dosageForm})` : ''}</div>
                                                <div className="text-xs text-gray-500">{item.isUnit ? t.modal.unit : t.modal.pack}</div>
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

                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="text-end">
                            <p className="text-sm text-gray-500">{t.headers.totalRefund}</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">-${selectedReturn.totalRefund.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
        </Modal>
      )}

      {/* Help */}
      <HelpButton onClick={() => setShowHelp(true)} title={helpContent.title} color={color} isRTL={language === 'AR'} />
      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} helpContent={helpContent as any} color={color} language={language} />
    </div>
  );
};
