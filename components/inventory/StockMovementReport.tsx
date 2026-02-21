import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../../services';
import { useSettings } from '../../context';
import { TRANSLATIONS } from '../../i18n/translations';
import { stockMovementService } from '../../services/inventory/stockMovement/stockMovementService';
import { StockMovement, StockMovementSummary, Drug } from '../../types';
import { SearchDropdown, useSearchKeyboardNavigation } from '../common/SearchDropdown';
import { DatePicker } from '../common/DatePicker';
import { TimelineItem } from './stockMovement';
import { SmallCard } from '../common/SmallCard';
import { CARD_LG } from '../../utils/themeStyles';
import { getDisplayName } from '../../utils/drugDisplayName';
import { formatCurrency } from '../../utils/currency';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmartInput } from '../common/SmartInputs';


interface StockMovementReportProps {
  onViewChange: (view: string, params?: any) => void;
}

const StockMovementReport: React.FC<StockMovementReportProps> = ({ onViewChange }) => {
  const { inventory, isLoading: isDataLoading } = useData();
  const { language, theme } = useSettings();
  const themeColor = theme.primary;
  const t = TRANSLATIONS[language];
  const isRTL = language === 'AR';

  // --- State ---
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return {
      start: start.toISOString(),
      end: now.toISOString()
    };
  });
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [summary, setSummary] = useState<StockMovementSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewType, setViewType] = useState<'summary' | 'timeline'>('summary');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // --- Search Logic ---
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return inventory.filter(d => {
      if (!d) return false;
      const query = searchQuery.toLowerCase();
      const displayName = getDisplayName(d).toLowerCase();
      const nameMatch = d.name?.toLowerCase().includes(query) || displayName.includes(query);
      const arabicMatch = d.nameArabic?.includes(searchQuery);
      const idMatch = d.id?.toLowerCase().includes(query);
      const barcodeMatch = d.barcode?.includes(searchQuery);
      return nameMatch || arabicMatch || idMatch || barcodeMatch;
    }).slice(0, 8);
  }, [searchQuery, inventory]);

  const handleSelectDrug = (drug: Drug) => {
    setSelectedDrug(drug);
    setSearchQuery(getDisplayName(drug));
    setShowSearch(false);
  };

  const { highlightedIndex, onKeyDown } = useSearchKeyboardNavigation({
    results: searchResults,
    onSelect: handleSelectDrug,
    isOpen: showSearch
  });

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!selectedDrug) return;
    setIsLoading(true);
    try {
      const filters = {
        drugId: selectedDrug.id,
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      
      const moveHistory = await stockMovementService.getHistory(filters) as StockMovement[];
      const moveSummary = await stockMovementService.getSummaryByDrug(selectedDrug.id, filters);
      
      setHistory(moveHistory);
      setSummary(moveSummary);
    } catch (error) {
      console.error('Error fetching stock movement data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDrug, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Helpers ---
  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    const headers = ["Date", "Type", "Quantity", "Previous", "New", "Reason", "Performed By"];
    const rows = history.map(m => [
      new Date(m.timestamp).toLocaleString(),
      m.type,
      m.quantity,
      m.previousStock,
      m.newStock,
      m.reason || "",
      m.performedByName || m.performedBy
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `stock_movement_${getDisplayName(selectedDrug as Drug) || 'report'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render Sections ---
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-rounded text-[40px] text-slate-400">package_2</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        {isRTL ? 'اختر صنفاً للمتابعة' : 'Select a drug to begin monitoring'}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md">
        {isRTL ? 'ابحث عن أي صنف في الصيدلية لعرض تاريخ حركته، ملخص المخزون والتحليلات.' : 'Search for any drug in your inventory to view its chronological movement history, stock summaries, and analytics.'}
      </p>
    </div>
  );

  return (
    <div className={`p-6 w-full h-full flex flex-col gap-6 overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header & Filter Bar - Fixed Height */}
      <div className={`flex flex-col gap-4 p-4 rounded-3xl shrink-0 ${CARD_LG}`}>
        {/* Top Row: Search and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="flex-1 relative max-w-lg">
            <div className="relative group">
              <span className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 material-symbols-rounded">search</span>
              <SmartInput
                type="text"
                placeholder={isRTL ? 'البحث عن صنف...' : 'Search for drug...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                onKeyDown={onKeyDown}
                className="w-full pl-12 rtl:pl-4 rtl:pr-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-hidden text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              <SearchDropdown
                isVisible={showSearch && searchResults.length > 0}
                results={searchResults}
                highlightedIndex={highlightedIndex}
                onSelect={handleSelectDrug}
                columns={[
                  { 
                    header: t.inventory.headers.name, 
                    width: 'flex-4',
                    render: (d: Drug) => {
                      const displayName = getDisplayName(d);
                      const itemDir = /[\u0600-\u06FF]/.test(displayName) ? 'rtl' : 'ltr';
                      return (
                        <div className="font-bold whitespace-normal" dir={itemDir}>
                          {displayName}
                        </div>
                      );
                    } 
                  },
                  { 
                    header: t.inventory.headers.stock, 
                    width: 'w-24 shrink-0',
                    render: (d: Drug) => (
                      <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border text-xs font-bold uppercase tracking-wider bg-transparent ${
                        d.stock < (d.minStock || 5) ? 'border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400' : 'border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        <span className="material-symbols-rounded text-sm">
                          {d.stock < (d.minStock || 5) ? 'warning' : 'check_circle'}
                        </span>
                        {d.stock}
                      </span>
                    )
                  },
                  { 
                    header: t.inventory.headers.price, 
                    width: 'w-28 shrink-0',
                    render: (d: Drug) => <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(d.price)}</span> 
                  }
                ]}
              />
            </div>
          </div>

          {/* Date Range & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              value={dateRange.start}
              onChange={(val) => setDateRange(prev => ({ ...prev, start: val }))}
              label={isRTL ? 'من' : 'From'}
              color={themeColor}
              size="md"
            />
            <DatePicker
              value={dateRange.end}
              onChange={(val) => setDateRange(prev => ({ ...prev, end: val }))}
              label={isRTL ? 'إلى' : 'To'}
              color={themeColor}
              size="md"
            />
            <button
              onClick={exportCSV}
              disabled={history.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-rounded">download</span>
              <span className="hidden sm:inline font-semibold">{isRTL ? 'تصدير' : 'Export'}</span>
            </button>
          </div>
        </div>
      </div>

      {!selectedDrug ? renderEmptyState() : (
        <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 overflow-hidden">
          {/* Sidebar KPIs - Fixed Height or Scrollable if needed */}
          <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0 overflow-y-auto max-h-full scrollbar-hide">
            <SmallCard
              title={isRTL ? 'وارد المخزون' : 'Stock In'}
              value={summary?.totalIn || 0}
              icon="south_west"
              iconColor="emerald"
            />
            <SmallCard
              title={isRTL ? 'صادر المخزون' : 'Stock Out'}
              value={summary?.totalOut || 0}
              icon="north_east"
              iconColor="rose"
            />
            <SmallCard
              title={isRTL ? 'المرتجعات' : 'Returns'}
              value={summary?.returns || 0}
              icon="rotate_left"
              iconColor="sky"
            />
            <SmallCard
              title={isRTL ? 'المخزون الحالي' : 'Current Stock'}
              value={summary?.currentStock || 0}
              icon="package_2"
              iconColor="indigo"
            />
          </div>

          {/* Main Content Area - Scrollable Table */}
          <div className="flex-1 w-full min-w-0 h-full flex flex-col overflow-hidden">
            <div className={`overflow-hidden rounded-3xl ${CARD_LG} flex flex-col h-full`}>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0" dir="ltr">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {getDisplayName(selectedDrug)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="material-symbols-rounded text-slate-400 text-sm">qr_code_2</span>
                      <span className="text-sm font-mono text-slate-500 font-medium">
                        {selectedDrug?.barcode || (isRTL ? 'لا يوجد باركود' : 'No Barcode')}
                      </span>
                    </div>
                  </div>
                </div>

                <SegmentedControl
                  value={viewType}
                  onChange={(v) => setViewType(v as 'summary' | 'timeline')}
                  options={[
                    { label: isRTL ? 'ملخص' : 'Summary', value: 'summary', icon: 'list' },
                    { label: isRTL ? 'الخط الزمني' : 'Timeline', value: 'timeline', icon: 'schedule' }
                  ]}
                  size="sm"
                  variant="onCard"
                  color="blue"
                  className="min-w-[240px]"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-6 min-h-0 main-content-scroll">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-slate-500 font-medium">{isRTL ? 'جاري التحميل...' : 'Syncing data...'}</span>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    {isRTL ? 'لا توجد حركات في هذه الفترة' : 'No movements recorded in this period'}
                  </div>
                ) : viewType === 'timeline' ? (
                  <div className="max-w-3xl mx-auto py-4">
                    {history.map((m, idx) => (
                      <TimelineItem
                        key={m.id}
                        type={m.type}
                        date={m.timestamp}
                        quantity={m.quantity}
                        previousStock={m.previousStock}
                        newStock={m.newStock}
                        reason={m.reason}
                        performedBy={m.performedByName || m.performedBy}
                        isRTL={isRTL}
                        status={m.status}
                        batchId={m.batchId}
                        expiryDate={m.expiryDate}
                        value={getMovementValue(m, selectedDrug)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left rtl:text-right border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase px-4">
                          <th className="pb-4 pl-4 rtl:pl-0 rtl:pr-4">{isRTL ? 'التاريخ' : 'DATE'}</th>
                          <th className="pb-4">{isRTL ? 'النوع' : 'TYPE'}</th>
                          <th className="pb-4">{isRTL ? 'الكمية' : 'QUANTITY'}</th>
                          <th className="pb-4">{isRTL ? 'التشغيلة / الصلاحية' : 'BATCH / EXPIRY'}</th>
                          <th className="pb-4">{isRTL ? 'القيمة' : 'VALUE'}</th>
                          <th className="pb-4">{isRTL ? 'المخزون' : 'STOCK'}</th>
                          <th className="pb-4">{isRTL ? 'بواسطة' : 'USER'}</th>
                          <th className="pb-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((m) => (
                          <React.Fragment key={m.id}>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/10 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer" onClick={() => toggleRow(m.id)}>
                              <td className="py-2 pl-4 rtl:pl-0 rtl:pr-4 rounded-l-2xl rtl:rounded-l-none rtl:rounded-r-2xl">
                                <span className="text-sm font-normal text-slate-900 dark:text-white">
                                  {new Date(m.timestamp).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="py-2">
                                <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border text-[10px] font-normal uppercase tracking-wider bg-transparent ${
                                  m.type === 'sale' ? 'border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400' :
                                  m.type === 'purchase' ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400' :
                                  m.type === 'return_customer' ? 'border-sky-200 dark:border-sky-900/50 text-sky-700 dark:text-sky-400' :
                                  m.type === 'return_supplier' ? 'border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400' :
                                  m.type === 'adjustment' ? 'border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400' :
                                  m.type === 'damage' ? 'border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400' :
                                  'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                  <span className="material-symbols-rounded text-sm">
                                    {m.type === 'sale' ? 'north_east' :
                                     m.type === 'purchase' ? 'south_west' :
                                     m.type === 'return_customer' || m.type === 'return_supplier' ? 'rotate_left' :
                                     m.type === 'adjustment' ? 'settings' :
                                     m.type === 'damage' ? 'warning' : 'info'}
                                  </span>
                                  {isRTL ? 
                                    (m.type === 'sale' ? 'بيع' :
                                     m.type === 'purchase' ? 'شراء' :
                                     m.type === 'return_customer' ? 'مرتجع عميل' :
                                     m.type === 'return_supplier' ? 'مرتجع مورد' :
                                     m.type === 'adjustment' ? 'تعديل' :
                                     m.type === 'damage' ? 'تلف' :
                                     m.type === 'transfer_in' ? 'تحويل وارد' :
                                     m.type === 'transfer_out' ? 'تحويل صادر' :
                                     m.type === 'initial' ? 'رصيد أول' :
                                     m.type === 'correction' ? 'تصحيح' : m.type)
                                    : m.type.replace(/_/g, ' ')
                                  }
                                </span>
                              </td>
                              <td className="py-2">
                                <div className="flex flex-col gap-1 items-start">
                                  {m.batchId ? (
                                    <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-transparent">
                                      <span className="material-symbols-rounded text-sm">tag</span>
                                      {m.batchId.substring(0, 6)}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">-</span>
                                  )}
                                  {m.expiryDate && (
                                    <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider bg-transparent ${
                                      new Date(m.expiryDate) < new Date() ? 'border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400' :
                                      new Date(m.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) ? 'border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400' :
                                      'border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                                    }`}>
                                      <span className="material-symbols-rounded text-sm">
                                        {new Date(m.expiryDate) < new Date() ? 'event_busy' : 'event_available'}
                                      </span>
                                      {new Date(m.expiryDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2">
                                {(() => {
                                  const val = getMovementValue(m, selectedDrug);
                                  return (
                                    <span className={`text-sm font-bold tabular-nums ${val > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                      {formatCurrency(Math.abs(val))}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="py-2">
                                <span className={`text-sm font-medium ${m.quantity > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {m.quantity > 0 ? '+' : ''}{m.quantity}
                                </span>
                              </td>
                              <td className="py-2">
                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                  <span className="font-normal text-slate-400">{m.previousStock}</span>
                                  <span className="material-symbols-rounded text-[14px]">{isRTL ? 'arrow_back' : 'arrow_forward'}</span>
                                  <span className="font-medium text-slate-900 dark:text-white">{m.newStock}</span>
                                </div>
                              </td>
                              <td className="py-2">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 bg-transparent">
                                  <span className="material-symbols-rounded text-sm">person</span>
                                  {m.performedByName || m.performedBy}
                                </span>
                              </td>
                              <td className="py-2 pr-4 rtl:pr-0 rtl:pl-4 rounded-r-2xl rtl:rounded-r-none rtl:rounded-l-2xl text-right rtl:text-left">
                                  <span className="material-symbols-rounded text-[20px]">
                                    {expandedRows.has(m.id) ? 'expand_more' : (isRTL ? 'chevron_left' : 'chevron_right')}
                                  </span>
                              </td>
                            </tr>
                            {expandedRows.has(m.id) && (
                              <tr className="bg-slate-50/20 dark:bg-slate-800/5">
                                <td colSpan={8} className="px-6 py-4 rounded-2xl">
                                  <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                                    <div>
                                      <span className="text-slate-400 block mb-1 uppercase tracking-widest text-[9px] font-bold">{isRTL ? 'رقم المرجع' : 'REFERENCE ID'}</span>
                                      {m.referenceId && m.referenceId !== 'N/A' ? (
                                        <button 
                                          onClick={() => {
                                            // Navigation Logic based on Movement Type
                                            if (m.type === 'sale') {
                                              onViewChange('sales-history', { id: m.referenceId });
                                            } else if (m.type === 'purchase') {
                                              onViewChange('purchases', { id: m.referenceId });
                                            } else if (m.type === 'return_customer') {
                                              onViewChange('return-history', { id: m.referenceId });
                                            }
                                          }}
                                          disabled={!['sale', 'purchase', 'return_customer'].includes(m.type)}
                                          className={`font-mono font-bold text-left rtl:text-right ${
                                            ['sale', 'purchase', 'return_customer'].includes(m.type) 
                                              ? 'text-blue-600 dark:text-blue-400 hover:underline cursor-pointer' 
                                              : 'text-slate-700 dark:text-slate-200 cursor-default'
                                          }`}
                                        >
                                          {m.referenceId}
                                          {['sale', 'purchase', 'return_customer'].includes(m.type) && (
                                            <span className="material-symbols-rounded text-[10px] align-middle ms-1">open_in_new</span>
                                          )}
                                        </button>
                                      ) : (
                                        <span className="font-mono text-slate-700 dark:text-slate-200">N/A</span>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <span className="text-slate-400 block mb-1 uppercase tracking-widest text-[9px] font-bold">{isRTL ? 'السبب / الملاحظات' : 'REASON / NOTES'}</span>
                                      <span className="text-slate-700 dark:text-slate-200">{m.reason || (isRTL ? 'لا يوجد سبب محدد' : 'No reason specified')}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block mb-1 uppercase tracking-widest text-[9px] font-bold">{isRTL ? 'التاريخ الكامل' : 'FULL TIMESTAMP'}</span>
                                      <span className="text-slate-700 dark:text-slate-200">{new Date(m.timestamp).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  const getMovementValue = (movement: StockMovement, drug: Drug | null): number => {
    if (!drug) return 0;
    
    // Sales and Customer Returns use Selling Price (Revenue)
    if (movement.type === 'sale' || movement.type === 'return_customer') {
      return movement.quantity * drug.price;
    }
    
    // All other movements (Purchase, Damage, Adjustment) use Cost Price (Asset Value)
    return movement.quantity * drug.costPrice;
  };

export default StockMovementReport;
