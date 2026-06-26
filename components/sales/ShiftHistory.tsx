import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useShift } from '../../hooks/sales/useShift';
import { auditService } from '../../services/audit/auditService';
import type { Employee, Shift } from '../../types';
import { printDocument } from '../../utils/printing';
import { createSearchRegex } from '../../utils/searchUtils';
import { CARD_BASE } from '../../utils/themeStyles';
import { DatePicker, DateRangePicker } from '../common/DatePicker';
import { InteractiveCard } from '../common/InteractiveCard';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { PriceDisplay, TanStackTable } from '../common/TanStackTable';
import { generateShiftReceiptHTML } from './ShiftReceiptTemplate';

interface ShiftHistoryProps {
  color: string;
  t: Translations;
  language: string;
  datePickerTranslations: any;
  employees?: Employee[];
  onViewChange?: (view: string) => void;
}

const getTxBadgeClass = (type: string): string => {
  switch (type) {
    case 'in':
    case 'opening':
    case 'purchase_return':
      return 'badge-neutral';
    case 'out':
    case 'closing':
    case 'purchase':
      return 'badge-danger';
    case 'sale':
      return 'badge-success';
    case 'card_sale':
      return 'badge-purple';
    case 'return':
      return 'badge-orange';
    default:
      return 'badge-neutral';
  }
};

const renderPendingBadge = (t: any) => (
  <span className='badge-neutral gap-1.5'>
    <span className='w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-zinc-500' />
    {t.salesHistory?.pending || 'Pending'}
  </span>
);

export const ShiftHistory: React.FC<ShiftHistoryProps> = ({
  color,
  t,
  language,
  datePickerTranslations,
  employees,
  onViewChange,
}) => {
  const locale = language === 'AR' ? 'ar-EG' : 'en-US';
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Load shifts from useShift hook (sharded storage)
  const { shifts: allShiftsFromHook, isLoading, endShift } = useShift();

  const handleReprintShift = async (shift: Shift) => {
    // 1. Increment print count locally
    const updatedShift: Shift = {
      ...shift,
      printCount: (shift.printCount || 1) + 1,
    };

    // 2. Audit reprint action
    auditService.log('shift.reprint', {
      details: {
        shiftId: shift.id,
        receiptNumber: shift.handoverReceiptNumber,
        originalPrintCount: shift.printCount || 1,
      },
      entityId: shift.id,
      entityType: 'shift',
    });

    // 3. Update local selection for receipt generation
    setSelectedShift(updatedShift);

    // 3. Print
    try {
      const html = generateShiftReceiptHTML(updatedShift, language as any, employees);
      await printDocument({
        html,
        width: 80,
        height: 297,
        kind: 'receipt',
        orientation: 'portrait',
        autoPrintFallback: true,
      });
    } catch (err) {
      console.error('Reprint failed:', err);
    }
  };

  const shifts = useMemo(() => {
    // Show all shifts including active (open) ones
    return allShiftsFromHook;
  }, [allShiftsFromHook]);

  const formatRelativeDate = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (targetDate.getTime() === today.getTime()) {
      return language === 'AR' ? 'اليوم' : 'Today';
    } else if (targetDate.getTime() === yesterday.getTime()) {
      return language === 'AR' ? 'أمس' : 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  const formatTime = (date: Date) => {
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (language === 'AR') {
      return timeString.replace('AM', 'ص').replace('PM', 'م');
    }
    return timeString;
  };

  const formatDuration = (openTime: string, closeTime?: string): React.ReactNode => {
    if (!closeTime) return '-';
    const duration = new Date(closeTime).getTime() - new Date(openTime).getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    const labels = t.shiftHistory?.durationLabels;

    const renderUnit = (val: number, isHour: boolean) => {
      let label = '';
      let showNumber = true;

      if (language === 'AR') {
        if (val === 1) {
          label = isHour ? labels?.hourSingular : labels?.minuteSingular;
          showNumber = false;
        } else if (val === 2) {
          label = isHour ? labels?.hourDual : labels?.minuteDual;
          showNumber = false;
        } else if (val >= 3 && val <= 10) {
          label = isHour ? labels?.hours3to10 : labels?.minutes3to10;
        } else {
          label = isHour ? labels?.hours11plus : labels?.minutes11plus;
        }
      } else {
        if (val === 1) {
          label = isHour ? labels?.hourSingular : labels?.minuteSingular;
        } else if (val === 2) {
          label = isHour ? labels?.hourDual : labels?.minuteDual;
        } else {
          label = isHour
            ? labels?.hourPlural || labels?.hours3to10
            : labels?.minutePlural || labels?.minutes3to10;
        }
      }

      if (!showNumber) {
        return <span className='font-bold text-sm'>{label}</span>;
      }

      return (
        <span className='inline-flex items-baseline gap-1'>
          <span className='font-bold text-sm'>{val}</span>
          <span className='text-xs text-gray-500 font-light dark:text-gray-400'>{label}</span>
        </span>
      );
    };

    const hasHours = hours > 0;
    const hasMinutes = minutes > 0;

    if (!hasHours && !hasMinutes) {
      return renderUnit(0, false);
    }

    if (hasHours && hasMinutes) {
      return (
        <span className='inline-flex items-baseline gap-1'>
          {renderUnit(hours, true)}
          <span className='text-xs text-gray-500 font-light dark:text-gray-400'>{labels?.and}</span>
          {renderUnit(minutes, false)}
        </span>
      );
    }

    if (hasHours) {
      return renderUnit(hours, true);
    }

    return renderUnit(minutes, false);
  };

  // Column definitions for TanStackTable
  const columns = useMemo<ColumnDef<Shift>[]>(
    () => [
      {
        id: 'id',
        accessorFn: (row) => row.handoverReceiptNumber || row.id.slice(-6),
        header: t.shiftHistory?.headers?.shiftNumber || 'Shift #',
        cell: ({ getValue, row }) => {
          const shiftId = getValue() as string;
          if (row.original.status === 'open') {
            return (
              <span className='badge-success gap-1'>
                <span className='w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse' />
                {shiftId}
              </span>
            );
          }
          return <span className='font-medium text-gray-900 dark:text-gray-100'>{shiftId}</span>;
        },
        meta: { align: 'start' },
      },
      {
        accessorKey: 'openTime',
        header: t.shiftHistory?.headers?.openTime || 'Open Time',
        meta: { align: 'center' },
      },
      {
        id: 'openedBy',
        header: t.shiftHistory?.headers?.openedBy || 'Opened By',
        accessorFn: (row) => {
          const emp = employees?.find((e) => e.id === row.openedBy);
          return emp?.name || row.openedBy;
        },
        cell: ({ getValue }) => (
          <span className='text-sm text-gray-700 dark:text-gray-300 truncate'>
            {getValue() as string}
          </span>
        ),
        meta: { align: 'center' },
      },
      {
        accessorKey: 'closeTime',
        header: t.shiftHistory?.headers?.closeTime || 'Close Time',
        cell: ({ getValue, row }) => {
          if (row.original.status === 'open' || !getValue()) {
            return (
              <span className='badge-success gap-1.5'>
                <span className='w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse' />
                {t.shiftHistory?.activeNow || 'Active Now'}
              </span>
            );
          }
          return undefined; // fallback to smartDate auto-formatting
        },
        meta: { align: 'center' },
      },
      {
        id: 'closedBy',
        header: t.shiftHistory?.headers?.closedBy || 'Closed By',
        accessorFn: (row) => {
          if (row.status === 'open' || !row.closedBy) return '';
          const emp = employees?.find((e) => e.id === row.closedBy);
          return emp?.name || row.closedBy;
        },
        cell: ({ getValue, row }) => {
          if (row.original.status === 'open' || !row.original.closedBy) {
            return renderPendingBadge(t);
          }
          return (
            <span className='text-sm text-gray-700 dark:text-gray-300 truncate'>
              {getValue() as string}
            </span>
          );
        },
        meta: { align: 'center' },
      },
      {
        id: 'duration',
        header: t.shiftHistory?.headers?.duration || 'Duration',
        accessorFn: (row) => {
          const endTime = row.status === 'open' ? new Date().toISOString() : row.closeTime;
          if (!endTime) return 0;
          return new Date(endTime).getTime() - new Date(row.openTime).getTime();
        },
        cell: ({ row }) => {
          const durationElement = formatDuration(
            row.original.openTime,
            row.original.status === 'open' ? new Date().toISOString() : row.original.closeTime
          );
          return (
            <span
              className={`text-sm ${row.original.status === 'open' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}
            >
              {durationElement}
            </span>
          );
        },
        meta: { align: 'start', smartDate: false },
      },
      {
        accessorKey: 'openingBalance',
        header: t.shiftHistory?.headers?.openingBalance || 'Opening',
        cell: ({ getValue }) => <PriceDisplay value={getValue() as number} />,
        meta: { align: 'center' },
      },
      {
        accessorKey: 'closingBalance',
        header: t.shiftHistory?.headers?.closingBalance || 'Closing',
        cell: ({ getValue, row }) => {
          if (row.original.status === 'open') {
            return renderPendingBadge(t);
          }
          return <PriceDisplay value={(getValue() as number) || 0} />;
        },
        meta: { align: 'start' },
      },
      {
        id: 'variance',
        header: t.shiftHistory?.headers?.variance || 'Variance',
        accessorFn: (row) => {
          if (row.status === 'open') return null;
          // BUG-SH-04: Variance must account for returns and purchases
          const expected =
            row.openingBalance +
            row.cashSales +
            row.cashIn +
            (row.cashPurchaseReturns || 0) -
            row.cashOut -
            (row.returns || 0) -
            (row.cashPurchases || 0);
          return (row.closingBalance || 0) - expected;
        },
        cell: ({ getValue }) => {
          const variance = getValue() as number | null;
          if (variance === null) {
            return renderPendingBadge(t);
          }
          return (
            <span
              className={`font-bold ${variance === 0 ? 'text-gray-500' : variance > 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              <PriceDisplay value={variance} showSign />
            </span>
          );
        },
        meta: { align: 'start' },
      },
    ],
    [t, language, employees]
  );

  const filteredShifts = useMemo(() => {
    const searchRegex = createSearchRegex(searchTerm);
    return shifts.filter((shift) => {
      const openerName = employees?.find((e) => e.id === shift.openedBy)?.name || shift.openedBy;
      const matchesTerm = searchRegex.test(shift.id) || searchRegex.test(openerName);

      if (!matchesTerm) return false;

      const shiftDate = new Date(shift.openTime);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && shiftDate < start) return false;
      if (end && shiftDate > end) return false;

      return true;
    });
  }, [shifts, searchTerm, startDate, endDate]);

  // Calculate summary stats
  const totalRevenue = filteredShifts.reduce(
    (sum, shift) => sum + shift.cashSales + (shift.cardSales || 0),
    0
  );

  const exportToCSV = () => {
    if (filteredShifts.length === 0) return;

    const headers = [
      'Shift ID',
      'Opened',
      'Opened By',
      'Closed',
      'Closed By',
      'Duration (hrs)',
      'Opening Balance',
      'Closing Balance',
      'Cash Sales',
      'Card Sales',
      'Cash In',
      'Cash Out',
      'Variance',
    ];
    const escape = (str: string | number | undefined) =>
      `"${String(str || '').replace(/"/g, '""')}"`;

    const rows = filteredShifts.map((shift) => {
      const duration = shift.closeTime
        ? (new Date(shift.closeTime).getTime() - new Date(shift.openTime).getTime()) /
          (1000 * 60 * 60)
        : 0;
      // BUG-SH-05: Sync CSV export math with table logic
      const expected =
        shift.openingBalance +
        shift.cashSales +
        shift.cashIn +
        (shift.cashPurchaseReturns || 0) -
        shift.cashOut -
        (shift.returns || 0) -
        (shift.cashPurchases || 0);
      const variance =
        shift.status === 'open' ? 'N/A' : ((shift.closingBalance || 0) - expected).toFixed(2);

      const openedByName = employees?.find((e) => e.id === shift.openedBy)?.name || shift.openedBy;
      const closedByName = shift.closedBy
        ? employees?.find((e) => e.id === shift.closedBy)?.name || shift.closedBy
        : 'N/A';

      return [
        shift.id,
        new Date(shift.openTime).toLocaleString(),
        openedByName,
        shift.closeTime ? new Date(shift.closeTime).toLocaleString() : 'N/A',
        closedByName,
        duration.toFixed(2),
        shift.openingBalance.toFixed(2),
        shift.status === 'open' ? 'N/A' : (shift.closingBalance || 0).toFixed(2),
        shift.cashSales.toFixed(2),
        (shift.cardSales || 0).toFixed(2),
        shift.cashIn.toFixed(2),
        shift.cashOut.toFixed(2),
        variance,
      ];
    });

    const csvContent = [
      headers.map(escape).join(','),
      ...rows.map((row) => row.map(escape).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shift_history_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in'>
      {/* Page Header */}
      <PageHeader
        centerContent={
          <SegmentedControl
            size='md'
            shape='pill'
            iconSize='--icon-lg'
            useGraphicFont={true}
            options={[
              {
                label: t.cashRegister?.title || 'Register',
                value: 'cash-register',
                icon: 'point_of_sale',
              },
              { label: t.shiftHistory?.title || 'Shifts', value: 'shift-history', icon: 'history' },
            ]}
            value='shift-history'
            onChange={(val) => onViewChange?.(val as string)}
          />
        }
        leftContent={
          <SearchInput
            value={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder={t.shiftHistory?.searchPlaceholder || 'Search...'}
            color={color}
            width='320px'
          />
        }
        rightContent={
          <div className='flex items-center gap-3'>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              color={color}
              locale={locale}
            />
            <button
              onClick={exportToCSV}
              disabled={filteredShifts.length === 0}
              className={`px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-(--border-divider) hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 text-gray-700 dark:text-gray-200`}
            >
              <span className='material-symbols-rounded text-lg'>download</span>
              <span className='hidden md:inline'>{t.shiftHistory?.exportCSV || 'Export CSV'}</span>
            </button>
          </div>
        }
        showStatsToggle={true}
        showBottom={showSummary}
        onToggleBottom={() => setShowSummary(!showSummary)}
        bottomContent={
          <div className='flex items-center justify-end'>
            <InteractiveCard
              isLoading={isLoading}
              className='flex flex-col items-end min-w-[200px] px-6 py-3 rounded-2xl'
              pages={[
                {
                  theme: 'bg-primary-50 dark:bg-primary-900/20',
                  content: (
                    <div className='flex flex-col items-end w-full'>
                      <span className='text-[10px] font-bold uppercase text-primary-600 dark:text-primary-400'>
                        {t.shiftHistory?.summary?.totalShifts || 'Total Shifts'}
                      </span>
                      <span className='text-2xl font-bold text-primary-900 dark:text-primary-100'>
                        {filteredShifts.length}
                      </span>
                    </div>
                  ),
                },
                {
                  theme: 'bg-green-50 dark:bg-green-900/20',
                  content: (
                    <div className='flex flex-col items-end w-full'>
                      <span className='text-[10px] font-bold uppercase text-green-600 dark:text-green-400'>
                        {t.shiftHistory?.summary?.totalRevenue || 'Total Revenue'}
                      </span>
                      <span className='text-2xl font-bold text-green-900 dark:text-green-100'>
                        <PriceDisplay value={totalRevenue} compact={totalRevenue >= 1000} />
                      </span>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        }
      />

      {/* Table Card */}
      <div className={`flex-1 ${CARD_BASE} rounded-xl overflow-hidden flex flex-col`}>
        <TanStackTable
          data={filteredShifts}
          columns={columns}
          color={color}
          isLoading={isLoading}
          tableId='shift_history_table'
          onRowClick={(shift) => setSelectedShift(shift)}
          manualFiltering={true}
          enableSearch={false}
          enableTopToolbar={false}
          globalFilter={searchTerm}
          onSearchChange={setSearchTerm}
          lite={true}
          dense={true}
          initialSorting={[{ id: 'openTime', desc: true }]}
          enablePagination={true}
          enableVirtualization={false}
          pageSize='auto'
          enableShowAll={true}
        />
      </div>

      {/* Shift Details Modal */}
      {selectedShift && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedShift(null)}
          size='2xl'
          title={t.shiftHistory?.details?.title || 'Shift Details'}
          icon='receipt_long'
          subtitle={`${t.shiftHistory?.headers?.shiftNumber || 'Shift #'}: #${selectedShift.handoverReceiptNumber || selectedShift.id.slice(-6)} • ${new Date(selectedShift.openTime).toLocaleDateString()}`}
          headerActions={
            <button
              onClick={() => handleReprintShift(selectedShift)}
              className='w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-primary-500 hover:text-white transition-all flex items-center justify-center border border-(--border-divider)'
              title={language === 'AR' ? 'إعادة طباعة' : 'Reprint'}
            >
              <span className='material-symbols-rounded text-[22px]'>print</span>
            </button>
          }
        >
          <div className='space-y-6'>
            {/* Summary Grid */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50'>
                <p className='text-[10px] font-bold uppercase text-gray-500 mb-1'>
                  {t.shiftHistory?.details?.openedBy || 'Opened By'}
                </p>
                <p className='text-sm font-medium truncate'>
                  {employees?.find((e) => e.id === selectedShift.openedBy)?.name ||
                    selectedShift.openedBy}
                </p>
              </div>
              <div className='p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50'>
                <p className='text-[10px] font-bold uppercase text-gray-500 mb-1'>
                  {t.shiftHistory?.details?.cashSales || 'Cash Sales'}
                </p>
                <p className='text-sm font-bold text-green-600'>
                  <PriceDisplay value={selectedShift.cashSales} />
                </p>
              </div>
              <div className='p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50'>
                <p className='text-[10px] font-bold uppercase text-gray-500 mb-1'>
                  {t.shiftHistory?.details?.cashPurchases}
                </p>
                <p className='text-sm font-bold text-red-600'>
                  <PriceDisplay value={selectedShift.cashPurchases || 0} />
                </p>
              </div>
              <div className='p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50'>
                <p className='text-[10px] font-bold uppercase text-gray-500 mb-1'>
                  {t.shiftHistory?.details?.cardSales || 'Card Sales'}
                </p>
                <p className='text-sm font-bold text-violet-600'>
                  <PriceDisplay value={selectedShift.cardSales || 0} />
                </p>
              </div>
              <div className='p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50'>
                <p className='text-[10px] font-bold uppercase text-gray-500 mb-1'>
                  {t.shiftHistory?.details?.transactions || 'Transactions'}
                </p>
                <p className='text-sm font-bold text-gray-600 dark:text-gray-400'>
                  {selectedShift.transactions.length}
                </p>
              </div>
            </div>

            {/* Balances */}
            <div className='grid grid-cols-2 gap-4'>
              <div
                className={`p-4 rounded-2xl border border-(--border-divider) bg-white dark:bg-gray-900/50`}
              >
                <div className='flex justify-between items-start mb-2'>
                  <p className='text-xs font-bold uppercase text-gray-400'>
                    {t.shiftHistory?.headers?.openingBalance || 'Opening Balance'}
                  </p>
                  <span className='text-[10px] text-gray-400 font-medium'>
                    {formatTime(new Date(selectedShift.openTime))}
                  </span>
                </div>
                <p className='text-xl font-bold'>
                  <PriceDisplay value={selectedShift.openingBalance} />
                </p>
                <p className='text-[10px] text-gray-400 mt-1'>
                  {formatRelativeDate(new Date(selectedShift.openTime))}
                </p>
              </div>
              <div
                className={`p-4 rounded-2xl border border-(--border-divider) bg-white dark:bg-gray-900/50`}
              >
                <div className='flex justify-between items-start mb-2'>
                  <p className='text-xs font-bold uppercase text-gray-400'>
                    {t.shiftHistory?.headers?.closingBalance || 'Closing Balance'}
                  </p>
                  {selectedShift.closeTime && (
                    <span className='text-[10px] text-gray-400 font-medium'>
                      {formatTime(new Date(selectedShift.closeTime))}
                    </span>
                  )}
                </div>
                <p className='text-xl font-bold'>
                  <PriceDisplay value={selectedShift.closingBalance || 0} />
                </p>
                {selectedShift.closeTime && (
                  <p className='text-[10px] text-gray-400 mt-1'>
                    {formatRelativeDate(new Date(selectedShift.closeTime))}
                  </p>
                )}
              </div>
            </div>

            {/* Transaction Log */}
            <div>
              <h4 className='text-xs font-bold uppercase text-gray-400 mb-3 ml-1'>
                {t.shiftHistory?.details?.transactionLog || 'Transaction Log'}
              </h4>
              <div className='space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar'>
                {selectedShift.transactions.length > 0 ? (
                  selectedShift.transactions.map((tx, idx) => (
                    <div
                      key={tx.id || idx}
                      className='flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-colors'
                    >
                      <div className='flex items-center gap-3'>
                        <span className={getTxBadgeClass(tx.type)}>
                          {t.cashRegister?.types?.[tx.type] || tx.type}
                        </span>
                        <div>
                          <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            {tx.reason}
                          </div>
                          {tx.time && (
                            <div className='text-[10px] text-gray-400 flex items-center gap-2'>
                              <span>{new Date(tx.time).toLocaleTimeString()}</span>
                              <span>•</span>
                              <span>
                                {employees?.find((e) => e.id === tx.userId)?.name || tx.userId}
                              </span>
                              {tx.id && (
                                <>
                                  <span>•</span>
                                  <span className='font-mono opacity-60'>{tx.id.slice(-8)}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold tabular-nums ${['in', 'opening', 'sale', 'card_sale', 'purchase_return'].includes(tx.type) ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {['in', 'opening', 'sale', 'card_sale', 'purchase_return'].includes(tx.type)
                          ? '+'
                          : '-'}
                        <PriceDisplay value={tx.amount} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='py-8 text-center text-gray-400 italic text-sm'>
                    {t.shiftHistory?.details?.noTransactions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
