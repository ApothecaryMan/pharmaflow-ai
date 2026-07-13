import React, { useMemo } from 'react';
import { useSettings } from '../../context';
import { stockMovementService } from '../../services/inventory/stockMovement/stockMovementService';
import { type Drug, StockMovement } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { getDisplayName, getFullDisplayName } from '../../utils/drugDisplayName';
import {
  checkExpiryStatus,
  formatExpiryDate,
  getExpiryStatusConfig,
} from '../../utils/expiryUtils';
import { formatStockAmount } from '../../utils/inventory';
import { CARD_BASE, CARD_LG, ICON_BTN } from '../../utils/themeStyles';
import { DateRangePicker } from '../common/DatePicker';
import type { FilterConfig } from '../common/FilterPill';
import { SearchDropdown } from '../common/SearchDropdown';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmallCard } from '../common/SmallCard';
import { useInventoryHeader } from './InventoryHeaderContext';
import { TimelineItem } from './stockMovement';
import { useStockMovementReport } from './useStockMovementReport';

interface StockMovementReportProps {
  onViewChange: (view: string, params?: any) => void;
}

const StockMovementReport: React.FC<StockMovementReportProps> = ({ onViewChange }) => {
  const { language } = useSettings();
  const isRTL = language === 'AR';

  const {
    // State
    selectedDrug,
    searchQuery,
    showSearch,
    showAll,
    dateRange,
    history,
    summary,
    isLoading,
    viewType,
    expandedRows,
    activeFilters,
    filteredHistory,
    searchResults,
    suggestions,
    highlightedIndex,
    columns,
    t,
    themeColor,
    textTransform,

    // Handlers
    setShowSearch,
    setDateRange,
    setViewType,
    handleSelectDrug,
    onKeyDown,
    toggleRow,
    exportCSV,
    handleUpdateFilter,
    handleSearchChange,
    handleClearSearch,
    toggleShowAll,
  } = useStockMovementReport({ onViewChange });

  const { setLeftContent, setRightContent, setBottomContent, setShowStatsToggle } =
    useInventoryHeader();

  // --- Analytics ---
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      sale: 0,
      purchase: 0,
      adjustment: 0,
      damage: 0,
      return: 0,
    };
    filteredHistory.forEach((m) => {
      // Basic grouping logic for the capsule
      if (m.type === 'sale') counts.sale++;
      else if (m.type === 'purchase') counts.purchase++;
      else if (m.type === 'adjustment') counts.adjustment++;
      else if (m.type === 'damage') counts.damage++;
      else counts.return++;
    });
    return counts;
  }, [filteredHistory]);

  // --- Column Configuration ---
  // moved to useStockMovementReport.ts

  // --- Data Filtering & Processing ---
  // moved to useStockMovementReport.ts

  // --- Search Logic ---
  // moved to useStockMovementReport.ts

  const filterConfigs = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'type',
        label: isRTL ? 'النوع' : 'Movement Type',
        icon: 'category',
        mode: 'single',
        options: [
          { label: isRTL ? 'بيع' : 'Sale', value: 'sale', icon: 'north_east' },
          { label: isRTL ? 'شراء' : 'Purchase', value: 'purchase', icon: 'south_west' },
          { label: isRTL ? 'تعديل' : 'Adjustment', value: 'adjustment', icon: 'settings' },
          { label: isRTL ? 'تلف' : 'Damage', value: 'damage', icon: 'warning' },
          {
            label: isRTL ? 'مرتجع عميل' : 'Customer Return',
            value: 'return_customer',
            icon: 'rotate_left',
          },
          {
            label: isRTL ? 'مرتجع مورد' : 'Supplier Return',
            value: 'return_supplier',
            icon: 'rotate_left',
          },
        ],
      },
      {
        id: 'status',
        label: isRTL ? 'الحالة' : 'Status',
        icon: 'check_circle',
        mode: 'single',
        options: [
          { label: isRTL ? 'مقبول' : 'Approved', value: 'approved', icon: 'check_circle' },
          { label: isRTL ? 'معلق' : 'Pending', value: 'pending', icon: 'schedule' },
          { label: isRTL ? 'مرفوض' : 'Rejected', value: 'rejected', icon: 'cancel' },
        ],
      },
    ],
    [isRTL]
  );

  // --- Data Fetching ---
  // moved to useStockMovementReport.ts

  // --- Helpers ---
  // toggleRow moved to useStockMovementReport.ts
  // exportCSV moved to useStockMovementReport.ts

  // --- Render Sections ---
  const renderEmptyState = () => (
    <div className='flex flex-col items-center justify-center py-20 px-4 text-center'>
      <div className='w-20 h-20 bg-gray-100 dark:bg-(--bg-surface-neutral) rounded-full flex items-center justify-center mb-6'>
        <span
          className='material-symbols-rounded text-gray-400 dark:text-gray-500'
          style={{ fontSize: 'var(--icon-2xl)' }}
        >
          package_2
        </span>
      </div>
      <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 page-title'>
        {isRTL ? 'اختر صنفاً للمتابعة' : 'Select a drug to begin monitoring'}
      </h1>
      <p className='text-gray-500 dark:text-gray-400 max-w-md'>
        {isRTL
          ? 'ابحث عن أي صنف في الصيدلية لعرض تاريخ حركته، ملخص المخزون والتحليلات.'
          : 'Search for any drug in your inventory to view its chronological movement history, stock summaries, and analytics.'}
      </p>
    </div>
  );

  React.useEffect(() => {
    setLeftContent(
      <div className='relative flex-1 max-w-md'>
        <SearchInput
          placeholder={isRTL ? 'البحث عن صنف...' : 'Search for drug...'}
          value={searchQuery}
          onSearchChange={handleSearchChange}
          onFocus={() => setShowSearch(true)}
          onKeyDown={onKeyDown}
          onClear={handleClearSearch}
          enableAutocomplete
          suggestions={suggestions}
          filterConfigs={filterConfigs}
          activeFilters={activeFilters}
          onUpdateFilter={handleUpdateFilter}
        />
        {/* Absolute positioned dropdown for search results */}
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
                const displayName = getFullDisplayName(d, textTransform);
                const itemDir = /[\u0600-\u06FF]/.test(displayName) ? 'rtl' : 'ltr';
                return (
                  <div className='font-bold whitespace-normal' dir={itemDir}>
                    {displayName}
                  </div>
                );
              },
            },
            {
              header: t.inventory.headers.stock,
              width: 'w-24 shrink-0',
              render: (d: Drug) => {
                const packs = Math.floor(d.stock / (d.unitsPerPack || 1));
                const units = d.stock % (d.unitsPerPack || 1);
                return (
                  <div
                    className={`tabular-nums border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-0.5 rounded-lg shrink-0 min-w-[36px] text-center font-bold ${
                      d.stock < (d.minStock || 5) * (d.unitsPerPack || 1)
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {packs}
                    {units > 0 && (
                      <span className='text-[8px] opacity-50 ml-0.5 text-blue-500'>{units}u</span>
                    )}
                  </div>
                );
              },
            },
            {
              header: t.inventory.headers.publicPrice,
              width: 'w-28 shrink-0',
              render: (d: Drug) => (
                <span className='font-medium text-gray-700 dark:text-gray-300'>
                  {formatCurrency(d.publicPrice)}
                </span>
              ),
            },
          ]}
        />
      </div>
    );

    setRightContent(
      <div className='flex items-center gap-3'>
        <button
          onClick={toggleShowAll}
          title={showAll ? t.stockMovement.todayOnly : t.stockMovement.showAll}
          className={ICON_BTN(showAll)}
        >
          <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
            {showAll ? 'filter_alt_off' : 'all_inclusive'}
          </span>
        </button>
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onStartDateChange={(val) => setDateRange((prev) => ({ ...prev, start: val }))}
          onEndDateChange={(val) => setDateRange((prev) => ({ ...prev, end: val }))}
          color={themeColor}
          size='sm'
          locale={language === 'AR' ? 'ar-EG' : 'en-US'}
        />
        <button
          onClick={exportCSV}
          disabled={history.length === 0}
          title={isRTL ? 'تصدير' : 'Export'}
          className={`${ICON_BTN(false)} disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
            download
          </span>
        </button>
      </div>
    );

    setShowStatsToggle(!!selectedDrug);

    setBottomContent(
      selectedDrug ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 '>
          <SmallCard
            title={isRTL ? 'وارد المخزون' : 'Stock In'}
            value={(summary?.totalIn || 0) / (selectedDrug?.unitsPerPack || 1)}
            fractionDigits={
              (summary?.totalIn || 0) % (selectedDrug?.unitsPerPack || 1) === 0 ? 0 : 2
            }
            valueSuffix={isRTL ? 'علبة' : 'Packs'}
            icon='south_west'
            iconColor='emerald'
            className='w-full'
          />
          <SmallCard
            title={isRTL ? 'صادر المخزون' : 'Stock Out'}
            value={(summary?.totalOut || 0) / (selectedDrug?.unitsPerPack || 1)}
            fractionDigits={
              (summary?.totalOut || 0) % (selectedDrug?.unitsPerPack || 1) === 0 ? 0 : 2
            }
            valueSuffix={isRTL ? 'علبة' : 'Packs'}
            icon='north_east'
            iconColor='rose'
            className='w-full'
          />
          <SmallCard
            title={isRTL ? 'المرتجعات' : 'Returns'}
            value={(summary?.returns || 0) / (selectedDrug?.unitsPerPack || 1)}
            fractionDigits={
              (summary?.returns || 0) % (selectedDrug?.unitsPerPack || 1) === 0 ? 0 : 2
            }
            valueSuffix={isRTL ? 'علبة' : 'Packs'}
            icon='rotate_left'
            iconColor='sky'
            className='w-full'
          />
          <SmallCard
            title={isRTL ? 'المخزون الحالي' : 'Current Stock'}
            value={(summary?.currentStock || 0) / (selectedDrug?.unitsPerPack || 1)}
            fractionDigits={
              (summary?.currentStock || 0) % (selectedDrug?.unitsPerPack || 1) === 0 ? 0 : 2
            }
            valueSuffix={isRTL ? 'علبة' : 'Packs'}
            icon='package_2'
            iconColor='indigo'
            className='w-full'
          />
        </div>
      ) : null
    );

    return () => {
      setLeftContent(null);
      setRightContent(null);
      setBottomContent(null);
      setShowStatsToggle(false);
    };
  }, [
    searchQuery,
    showSearch,
    searchResults,
    highlightedIndex,
    activeFilters,
    filterConfigs,
    suggestions,
    handleSearchChange,
    handleClearSearch,
    handleUpdateFilter,
    handleSelectDrug,
    onKeyDown,
    t,
    isRTL,
    textTransform,
    showAll,
    dateRange,
    themeColor,
    language,
    exportCSV,
    history.length,
    toggleShowAll,
    setDateRange,
    selectedDrug,
    summary,
    setLeftContent,
    setRightContent,
    setBottomContent,
    setShowStatsToggle,
  ]);

  return (
    <div
      className={`h-full flex flex-col gap-2 overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {!selectedDrug && !showAll ? (
        renderEmptyState()
      ) : (
        <div className='flex flex-col gap-0 items-start flex-1 overflow-hidden'>
          {/* Main Content Area - Scrollable Table */}
          <div className='flex-1 w-full min-w-0 h-full flex flex-col overflow-hidden'>
            <div className={`overflow-hidden rounded-3xl ${CARD_LG} flex flex-col h-full`}>
              <div className='p-6 grid grid-cols-3 items-center shrink-0'>
                {/* Start: Title & Info */}
                <div className='flex flex-col gap-1 justify-self-start'>
                  <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                    {showAll
                      ? t.stockMovement.allProductsReport
                      : getDisplayName(selectedDrug, textTransform)}
                  </h3>
                  <div className='flex items-center gap-2'>
                    <span
                      className='material-symbols-rounded text-gray-400'
                      style={{ fontSize: 'var(--icon-sm)' }}
                    >
                      {showAll ? 'inventory' : 'qr_code_2'}
                    </span>
                    <span className='text-xs font-mono text-gray-500 font-medium'>
                      {showAll
                        ? t.stockMovement.allMovements
                        : selectedDrug?.barcode || (isRTL ? 'لا يوجد باركود' : 'No Barcode')}
                    </span>
                  </div>
                </div>

                {/* Center: View Switcher */}
                <div className='justify-self-center'>
                  <SegmentedControl
                    value={viewType}
                    onChange={(v) => setViewType(v as 'summary' | 'timeline')}
                    options={[
                      { label: isRTL ? 'ملخص' : 'Summary', value: 'summary', icon: 'list' },
                      {
                        label: isRTL ? 'الخط الزمني' : 'Timeline',
                        value: 'timeline',
                        icon: 'schedule',
                      },
                    ]}
                    size='xs'
                    iconSize='var(--icon-md)'
                    className='min-w-[240px]'
                  />
                </div>

                {/* End: Detailed Stats Capsule (Interactive Filters) */}
                <div className='justify-self-end'>
                  <div
                    className={`flex items-center rounded-2xl border border-gray-100 dark:border-(--border-divider) ${CARD_BASE} overflow-hidden divide-x divide-gray-100 dark:divide-(--border-divider) rtl:divide-x-reverse`}
                  >
                    {/* Sale Filter */}
                    <button
                      onClick={() =>
                        handleUpdateFilter(
                          'type',
                          activeFilters.type?.[0] === 'sale' ? [] : ['sale']
                        )
                      }
                      className={`px-3 py-1.5 flex items-center gap-2 transition-all cursor-pointer ${activeFilters.type?.[0] === 'sale' ? 'bg-rose-50 dark:bg-rose-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                      <span
                        className={`text-[9px] font-black tracking-tighter uppercase ${activeFilters.type?.[0] === 'sale' ? 'text-rose-700 dark:text-rose-300' : 'text-rose-600 dark:text-rose-400'}`}
                      >
                        {isRTL ? 'بيع' : 'SALE'}
                      </span>
                      <span className='text-[11px] font-black tabular-nums text-gray-900 dark:text-gray-100'>
                        {typeCounts.sale}
                      </span>
                    </button>

                    {/* Purchase Filter */}
                    <button
                      onClick={() =>
                        handleUpdateFilter(
                          'type',
                          activeFilters.type?.[0] === 'purchase' ? [] : ['purchase']
                        )
                      }
                      className={`px-3 py-1.5 flex items-center gap-2 transition-all cursor-pointer ${activeFilters.type?.[0] === 'purchase' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                      <span
                        className={`text-[9px] font-black tracking-tighter uppercase ${activeFilters.type?.[0] === 'purchase' ? 'text-emerald-700 dark:text-emerald-300' : 'text-emerald-600 dark:text-emerald-400'}`}
                      >
                        {isRTL ? 'شراء' : 'PURCHASE'}
                      </span>
                      <span className='text-[11px] font-black tabular-nums text-gray-900 dark:text-gray-100'>
                        {typeCounts.purchase}
                      </span>
                    </button>

                    {/* Adjustment Filter */}
                    <button
                      onClick={() =>
                        handleUpdateFilter(
                          'type',
                          activeFilters.type?.[0] === 'adjustment' ? [] : ['adjustment']
                        )
                      }
                      className={`px-3 py-1.5 flex items-center gap-2 transition-all cursor-pointer ${activeFilters.type?.[0] === 'adjustment' ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                      <span
                        className={`text-[9px] font-black tracking-tighter uppercase ${activeFilters.type?.[0] === 'adjustment' ? 'text-blue-700 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400'}`}
                      >
                        {isRTL ? 'تسوية' : 'ADJUST'}
                      </span>
                      <span className='text-[11px] font-black tabular-nums text-gray-900 dark:text-gray-100'>
                        {typeCounts.adjustment}
                      </span>
                    </button>

                    {/* Damage Filter */}
                    <button
                      onClick={() =>
                        handleUpdateFilter(
                          'type',
                          activeFilters.type?.[0] === 'damage' ? [] : ['damage']
                        )
                      }
                      className={`px-3 py-1.5 flex items-center gap-2 transition-all cursor-pointer ${activeFilters.type?.[0] === 'damage' ? 'bg-orange-50 dark:bg-orange-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                      <span
                        className={`text-[9px] font-black tracking-tighter uppercase ${activeFilters.type?.[0] === 'damage' ? 'text-orange-700 dark:text-orange-300' : 'text-orange-600 dark:text-orange-400'}`}
                      >
                        {isRTL ? 'هالك' : 'DAMAGE'}
                      </span>
                      <span className='text-[11px] font-black tabular-nums text-gray-900 dark:text-gray-100'>
                        {typeCounts.damage}
                      </span>
                    </button>

                    {/* Clear Filters / Total Count */}
                    <button
                      onClick={() => handleUpdateFilter('type', [])}
                      className='px-4 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2 transition-all cursor-pointer'
                      title={isRTL ? 'عرض الكل' : 'Show All'}
                    >
                      <span className='text-[10px] font-black tracking-widest uppercase text-primary-600 dark:text-primary-400'>
                        {filteredHistory.length}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Fixed Table Header (Sync with body) */}
              {!isLoading && filteredHistory.length > 0 && viewType === 'summary' && (
                <div className='px-6 pb-2 border-b border-gray-100 dark:border-(--border-divider) shrink-0'>
                  <table className='w-full text-left rtl:text-right border-separate border-spacing-y-0 table-fixed'>
                    <thead>
                      <tr className='text-[11px] font-black tracking-widest text-(--text-tertiary) uppercase'>
                        {columns.map((col, idx) => (
                          <th
                            key={col.id}
                            style={{ width: col.width }}
                            className={`pb-2 ${idx === 0 ? 'pl-4 rtl:pl-0 rtl:pr-4' : ''} ${col.id === 'actions' ? 'text-center' : ''}`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  </table>
                </div>
              )}

              <div className='flex-1 overflow-y-auto p-6 pt-0 min-h-0 main-content-scroll'>
                {isLoading ? (
                  <div className='flex flex-col items-center justify-center py-20 gap-4'>
                    <div className='w-12 h-12 border-4 border-primary-500/20 border-t-blue-500 rounded-full animate-spin' />
                    <span className='text-gray-500 font-medium'>
                      {isRTL ? 'جاري التحميل...' : 'Syncing data...'}
                    </span>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className='text-center py-20 text-gray-400'>
                    {isRTL ? 'لا توجد حركات في هذه الفترة' : 'No movements recorded in this period'}
                  </div>
                ) : viewType === 'timeline' ? (
                  <div className='max-w-3xl mx-auto py-4'>
                    {filteredHistory.map((m, idx) => (
                      <TimelineItem
                        key={m.id}
                        type={m.type}
                        date={m.timestamp}
                        quantity={m.quantity}
                        previousStock={m.previousStock}
                        newStock={m.newStock}
                        reason={m.reason}
                        performedBy={
                          m.performedByName || m.performedBy || (isRTL ? 'النظام' : 'System')
                        }
                        isRTL={isRTL}
                        status={m.status}
                        batchId={m.batchId}
                        expiryDate={m.expiryDate}
                        value={stockMovementService.calculateMovementValue(m, selectedDrug)}
                        unitsPerPack={selectedDrug?.unitsPerPack}
                        drugName={
                          showAll ? getDisplayName({ name: m.drugName }, textTransform) : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className='overflow-x-auto h-full'>
                    <table className='w-full text-left rtl:text-right border-separate border-spacing-y-2 table-fixed'>
                      <tbody className='align-top'>
                        {filteredHistory.map((m) => (
                          <React.Fragment key={m.id}>
                            <tr
                              className='bg-gray-50/50 dark:bg-(--bg-surface-neutral) hover:bg-gray-50 dark:hover:bg-(--bg-input) transition-colors group cursor-pointer'
                              onClick={() => toggleRow(m.id)}
                            >
                              <td
                                style={{ width: columns[0].width }}
                                className='py-2 pl-4 rtl:pl-0 rtl:pr-4 rounded-l-2xl rtl:rounded-l-none rtl:rounded-r-2xl'
                              >
                                <span className='text-sm font-normal text-gray-900 dark:text-gray-100'>
                                  {new Date(m.timestamp).toLocaleDateString(
                                    isRTL ? 'ar-EG' : 'en-US',
                                    { day: 'numeric', month: 'short' }
                                  )}
                                </span>
                                <span className='text-[10px] text-(--text-tertiary) block'>
                                  {new Date(m.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </td>
                              {showAll && (
                                <td style={{ width: columns[1].width }} className='py-2'>
                                  <span
                                    className='text-xs font-bold text-gray-900 dark:text-gray-100 block truncate max-w-[180px]'
                                    title={m.drugName}
                                  >
                                    {getDisplayName({ name: m.drugName }, textTransform)}
                                  </span>
                                </td>
                              )}
                              <td
                                style={{ width: columns[showAll ? 2 : 1].width }}
                                className='py-2'
                              >
                                <span
                                  className={`gap-1.5 ${
                                    m.type === 'sale'
                                      ? 'badge-danger'
                                      : m.type === 'purchase'
                                        ? 'badge-success'
                                        : m.type === 'return_customer'
                                          ? 'badge-info'
                                          : m.type === 'return_supplier'
                                            ? 'badge-orange'
                                            : m.type === 'adjustment'
                                              ? 'badge-warning'
                                              : m.type === 'damage'
                                                ? 'badge-danger'
                                                : 'badge-neutral'
                                  }`}
                                >
                                  <span
                                    className='material-symbols-rounded'
                                    style={{ fontSize: 'var(--icon-sm)' }}
                                  >
                                    {m.type === 'sale'
                                      ? 'north_east'
                                      : m.type === 'purchase'
                                        ? 'south_west'
                                        : m.type === 'return_customer' ||
                                            m.type === 'return_supplier'
                                          ? 'rotate_left'
                                          : m.type === 'adjustment'
                                            ? 'settings'
                                            : m.type === 'damage'
                                              ? 'warning'
                                              : 'info'}
                                  </span>
                                  {isRTL
                                    ? m.type === 'sale'
                                      ? 'بيع'
                                      : m.type === 'purchase'
                                        ? 'شراء'
                                        : m.type === 'return_customer'
                                          ? 'مرتجع عميل'
                                          : m.type === 'return_supplier'
                                            ? 'مرتجع مورد'
                                            : m.type === 'adjustment'
                                              ? 'تعديل'
                                              : m.type === 'damage'
                                                ? 'تلف'
                                                : m.type === 'transfer_in'
                                                  ? 'تحويل وارد'
                                                  : m.type === 'transfer_out'
                                                    ? 'تحويل صادر'
                                                    : m.type === 'initial'
                                                      ? 'رصيد أول'
                                                      : m.type === 'correction'
                                                        ? 'تصحيح'
                                                        : m.type
                                    : m.type.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td
                                style={{ width: columns[showAll ? 3 : 2].width }}
                                className='py-2'
                              >
                                <span
                                  className={`text-sm font-bold tabular-nums ${m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                                >
                                  {m.quantity > 0 ? '+' : m.quantity < 0 ? '-' : ''}
                                  {formatStockAmount(
                                    Math.abs(m.quantity),
                                    selectedDrug?.unitsPerPack,
                                    isRTL ? 'علبة' : 'Packs'
                                  )}
                                </span>
                              </td>
                              <td
                                style={{ width: columns[showAll ? 4 : 3].width }}
                                className='py-2'
                              >
                                <div className='flex flex-col gap-1 items-start'>
                                  {m.expiryDate ? (
                                    (() => {
                                      const status = checkExpiryStatus(m.expiryDate);
                                      const config = getExpiryStatusConfig(status);
                                      return (
                                        <span
                                          className={`gap-1.5 ${
                                            config.color === 'emerald'
                                              ? 'badge-success'
                                              : config.color === 'amber'
                                                ? 'badge-warning'
                                                : config.color === 'orange'
                                                  ? 'badge-orange'
                                                  : 'badge-danger'
                                          }`}
                                        >
                                          <span
                                            className='material-symbols-rounded'
                                            style={{ fontSize: 'var(--icon-sm)' }}
                                          >
                                            {status === 'invalid'
                                              ? 'event_busy'
                                              : 'event_available'}
                                          </span>
                                          {formatExpiryDate(m.expiryDate)}
                                        </span>
                                      );
                                    })()
                                  ) : (
                                    <span className='text-[10px] text-gray-400'>-</span>
                                  )}
                                </div>
                              </td>
                              <td
                                style={{ width: columns[showAll ? 5 : 4].width }}
                                className='py-2'
                              >
                                <span
                                  className={`text-sm font-medium tabular-nums text-(--text-secondary)`}
                                >
                                  {formatCurrency(
                                    Math.abs(
                                      stockMovementService.calculateMovementValue(m, selectedDrug)
                                    )
                                  )}
                                </span>
                              </td>
                              <td
                                style={{ width: columns[showAll ? 6 : 5].width }}
                                className='py-2'
                              >
                                <div className='text-xs text-gray-500 flex items-center gap-1'>
                                  <span className='font-normal text-gray-400'>
                                    {formatStockAmount(
                                      m.previousStock,
                                      selectedDrug?.unitsPerPack,
                                      ''
                                    )}
                                  </span>
                                  <span
                                    className='material-symbols-rounded text-(--text-tertiary)'
                                    style={{ fontSize: 'var(--icon-sm)' }}
                                  >
                                    {isRTL ? 'arrow_back' : 'arrow_forward'}
                                  </span>
                                  <span className='font-medium text-gray-900 dark:text-gray-100'>
                                    {formatStockAmount(m.newStock, selectedDrug?.unitsPerPack, '')}
                                  </span>
                                </div>
                              </td>
                              <td
                                style={{ width: columns[showAll ? 7 : 6].width }}
                                className='py-2'
                              >
                                <span className='badge-neutral gap-1.5'>
                                  <span
                                    className='material-symbols-rounded'
                                    style={{ fontSize: 'var(--icon-sm)' }}
                                  >
                                    person
                                  </span>
                                  <span className='truncate'>
                                    {m.performedByName ||
                                      m.performedBy ||
                                      (isRTL ? 'النظام' : 'System')}
                                  </span>
                                </span>
                              </td>
                              <td
                                style={{ width: columns[showAll ? 8 : 7].width }}
                                className='py-2 pr-4 rtl:pr-0 rtl:pl-4 rounded-r-2xl rtl:rounded-r-none rtl:rounded-l-2xl text-right rtl:text-left'
                              >
                                <span
                                  className='material-symbols-rounded transition-transform duration-200 text-gray-400'
                                  style={{
                                    fontSize: 'var(--icon-md)',
                                    transform: expandedRows.has(m.id) ? 'rotate(180deg)' : 'none',
                                  }}
                                >
                                  expand_more
                                </span>
                              </td>
                            </tr>
                            {expandedRows.has(m.id) && (
                              <tr className='bg-gray-50/20 dark:bg-(--bg-input)'>
                                <td colSpan={8} className='px-6 py-4 rounded-2xl'>
                                  <div className='flex flex-wrap gap-x-8 gap-y-2 text-xs'>
                                    <div>
                                      <span className='text-gray-400 block mb-1 uppercase tracking-widest text-[9px] font-bold'>
                                        {isRTL ? 'رقم المرجع' : 'REFERENCE ID'}
                                      </span>
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
                                          disabled={
                                            !['sale', 'purchase', 'return_customer'].includes(
                                              m.type
                                            )
                                          }
                                          className={`font-mono font-bold text-left rtl:text-right ${
                                            ['sale', 'purchase', 'return_customer'].includes(m.type)
                                              ? 'text-primary-600 dark:text-blue-400 hover:underline cursor-pointer'
                                              : 'text-gray-700 dark:text-gray-200 cursor-default'
                                          }`}
                                        >
                                          {m.referenceId}
                                          {['sale', 'purchase', 'return_customer'].includes(
                                            m.type
                                          ) && (
                                            <span
                                              className='material-symbols-rounded align-middle ms-1'
                                              style={{ fontSize: 'var(--icon-xs)' }}
                                            >
                                              open_in_new
                                            </span>
                                          )}
                                        </button>
                                      ) : (
                                        <span className='font-mono text-gray-700 dark:text-gray-200'>
                                          N/A
                                        </span>
                                      )}
                                    </div>
                                    <div className='flex-1'>
                                      <span className='text-(--text-tertiary) block mb-1 uppercase tracking-widest text-[9px] font-bold'>
                                        {isRTL ? 'السبب / الملاحظات' : 'REASON / NOTES'}
                                      </span>
                                      <span className='text-(--text-primary) font-medium'>
                                        {m.reason ||
                                          (isRTL ? 'لا يوجد سبب محدد' : 'No reason specified')}
                                      </span>
                                    </div>
                                    <div>
                                      <span className='text-(--text-tertiary) block mb-1 uppercase tracking-widest text-[9px] font-bold'>
                                        {isRTL ? 'التاريخ الكامل' : 'FULL TIMESTAMP'}
                                      </span>
                                      <span className='text-(--text-primary) font-medium'>
                                        {new Date(m.timestamp).toLocaleString()}
                                      </span>
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

// getMovementValue moved to stockMovementService.calculateMovementValue

export default StockMovementReport;
