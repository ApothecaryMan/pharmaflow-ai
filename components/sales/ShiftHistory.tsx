import React, { useState, useMemo } from 'react';
import { Shift } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { DatePicker } from '../common/DatePicker';
import { createSearchRegex } from '../../utils/searchUtils';
import { SearchInput } from '../common/SearchInput';
import { TanStackTable, PriceDisplay } from '../common/TanStackTable';
import { ColumnDef } from '@tanstack/react-table';
import { Modal } from '../common/Modal';

interface ShiftHistoryProps {
  color: string;
  t: any;
  language: string;
  datePickerTranslations: any;
}

export const ShiftHistory: React.FC<ShiftHistoryProps> = ({ color, t, language, datePickerTranslations }) => {
  const locale = language === 'AR' ? 'ar-EG' : 'en-US';
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  // Load shifts from localStorage
  const shifts = useMemo(() => {
    const savedShifts = localStorage.getItem('pharma_shifts');
    if (savedShifts) {
      const allShifts: Shift[] = JSON.parse(savedShifts);
      // Only show closed shifts
      return allShifts.filter(s => s.status === 'closed');
    }
    return [];
  }, []);

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
    const timeString = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    if (language === 'AR') {
      return timeString.replace('AM', 'ص').replace('PM', 'م');
    }
    return timeString;
  };

  const formatDuration = (openTime: string, closeTime?: string) => {
    if (!closeTime) return '-';
    const duration = new Date(closeTime).getTime() - new Date(openTime).getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const hourLabel = language === 'AR' ? 'س' : 'h';
    const minuteLabel = language === 'AR' ? 'د' : 'm';
    return `${hours}${hourLabel} ${minutes}${minuteLabel}`;
  };

  // Column definitions for TanStackTable
  const columns = useMemo<ColumnDef<Shift>[]>(() => [
    {
      accessorKey: 'id',
      header: t.shiftHistory?.headers?.shiftId || 'Shift ID',
      meta: { align: 'start' }
    },
    {
      accessorKey: 'openTime',
      header: t.shiftHistory?.headers?.openTime || 'Open Time',
      meta: { align: 'center' }
    },
    {
      accessorKey: 'closeTime',
      header: t.shiftHistory?.headers?.closeTime || 'Close Time',
      meta: { align: 'center' }
    },
    {
      id: 'duration',
      header: t.shiftHistory?.headers?.duration || 'Duration',
      accessorFn: (row) => formatDuration(row.openTime, row.closeTime),
      cell: ({ getValue }) => <span className="text-sm text-gray-600 dark:text-gray-400">{getValue() as string}</span>,
      meta: { align: 'center' }
    },
    {
      accessorKey: 'openingBalance',
      header: t.shiftHistory?.headers?.openingBalance || 'Opening',
      cell: ({ getValue }) => <PriceDisplay value={getValue() as number} />,
      meta: { align: 'center' }
    },
    {
      accessorKey: 'closingBalance',
      header: t.shiftHistory?.headers?.closingBalance || 'Closing',
      cell: ({ getValue }) => <PriceDisplay value={getValue() as number || 0} />,
      meta: { align: 'center' }
    },
    {
      id: 'variance',
      header: t.shiftHistory?.headers?.variance || 'Variance',
      accessorFn: (row) => {
        const expected = row.openingBalance + row.cashSales + row.cashIn - row.cashOut;
        return (row.closingBalance || 0) - expected;
      },
      cell: ({ getValue }) => {
        const variance = getValue() as number;
        return (
          <span className={`font-bold ${variance === 0 ? 'text-gray-500' : variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {variance > 0 ? '+' : ''}<PriceDisplay value={variance} />
          </span>
        );
      },
      meta: { align: 'center' }
    }
  ], [t, language]);

  const filteredShifts = useMemo(() => {
    const searchRegex = createSearchRegex(searchTerm);
    return shifts.filter(shift => {
      const matchesTerm = searchRegex.test(shift.id) || searchRegex.test(shift.openedBy);

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
  const totalRevenue = filteredShifts.reduce((sum, shift) => sum + shift.cashSales + (shift.cardSales || 0), 0);

  const exportToCSV = () => {
    if (filteredShifts.length === 0) return;

    const headers = ['Shift ID', 'Opened', 'Closed', 'Duration (hrs)', 'Opening Balance', 'Closing Balance', 'Cash Sales', 'Card Sales', 'Cash In', 'Cash Out', 'Variance'];
    const escape = (str: string | number | undefined) => `"${String(str || '').replace(/"/g, '""')}"`;

    const rows = filteredShifts.map(shift => {
      const duration = shift.closeTime ? (new Date(shift.closeTime).getTime() - new Date(shift.openTime).getTime()) / (1000 * 60 * 60) : 0;
      const expected = shift.openingBalance + shift.cashSales + shift.cashIn - shift.cashOut;
      const variance = (shift.closingBalance || 0) - expected;
      
      return [
        shift.id,
        new Date(shift.openTime).toLocaleString(),
        shift.closeTime ? new Date(shift.closeTime).toLocaleString() : 'N/A',
        duration.toFixed(2),
        shift.openingBalance.toFixed(2),
        (shift.closingBalance || 0).toFixed(2),
        shift.cashSales.toFixed(2),
        (shift.cardSales || 0).toFixed(2),
        shift.cashIn.toFixed(2),
        shift.cashOut.toFixed(2),
        variance.toFixed(2)
      ];
    });

    const csvContent = [
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shift_history_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight type-expressive">{t.shiftHistory?.title || 'Shift History'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.shiftHistory?.subtitle || 'View past cash register shifts'}</p>
        </div>
        
        {/* Summary Cards */}
        <div className="flex gap-3">
          <div className={`px-4 py-2 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 ${CARD_BASE} flex flex-col items-end min-w-[120px]`}>
            <span className={`text-[10px] font-bold uppercase text-${color}-600 dark:text-${color}-400`}>{t.shiftHistory?.summary?.totalShifts || 'Total Shifts'}</span>
            <span className={`text-xl font-bold text-${color}-900 dark:text-${color}-100`}>{filteredShifts.length}</span>
          </div>
          <div className={`px-4 py-2 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 ${CARD_BASE} flex flex-col items-end min-w-[140px]`}>
            <span className={`text-[10px] font-bold uppercase text-${color}-600 dark:text-${color}-400`}>{t.shiftHistory?.summary?.totalRevenue || 'Total Revenue'}</span>
            <span className={`text-xl font-bold text-${color}-900 dark:text-${color}-100`}><PriceDisplay value={totalRevenue} /></span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${CARD_BASE} p-4 rounded-2xl`}>
        <div className="flex flex-wrap items-center gap-3 w-full sm:flex-1">
            <div className="relative group flex-1">
                <SearchInput
                    value={searchTerm}
                    onSearchChange={setSearchTerm}
                    placeholder={t.shiftHistory?.searchPlaceholder || "Search by shift ID or user..."}
                    color={color}
                    wrapperClassName="w-full"
                />
            </div>
            
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700">
                <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    label={t.shiftHistory?.dateFrom || "From"}
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
                    label={t.shiftHistory?.dateTo || "To"}
                    color={color}
                    icon="event"
                    locale={locale}
                    translations={datePickerTranslations}
                />
            </div>
        </div>
            
        <button 
            onClick={exportToCSV}
            disabled={filteredShifts.length === 0}
            className={`px-4 py-2.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 text-gray-700 dark:text-gray-200`}
        >
            <span className="material-symbols-rounded text-lg">download</span>
            <span className="hidden md:inline">{t.shiftHistory?.exportCSV || 'Export CSV'}</span>
        </button>
      </div>

      {/* Table Card */}
      <div className={`flex-1 ${CARD_BASE} rounded-xl overflow-hidden flex flex-col`}>
        <TanStackTable
            data={filteredShifts}
            columns={columns}
            color={color}
            tableId="shift_history_table"
            onRowClick={(shift) => setSelectedShift(shift)}
            manualFiltering={true}
            enableSearch={false}
            lite={true}
            dense={true}
            initialSorting={[{ id: 'openTime', desc: true }]}
        />
      </div>

      {/* Shift Details Modal */}
      {selectedShift && (
        <Modal
            isOpen={true}
            onClose={() => setSelectedShift(null)}
            size="2xl"
            title={t.shiftHistory?.details?.title || 'Shift Details'}
            icon="receipt_long"
            subtitle={`${t.shiftHistory?.headers?.shiftId || 'ID'}: #${selectedShift.id.slice(-6)} • ${new Date(selectedShift.openTime).toLocaleDateString()}`}
        >
            <div className="space-y-6">
                {/* Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{t.shiftHistory?.details?.openedBy || 'Opened By'}</p>
                        <p className="text-sm font-medium truncate">{selectedShift.openedBy}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{t.shiftHistory?.details?.cashSales || 'Cash Sales'}</p>
                        <p className="text-sm font-bold text-green-600"><PriceDisplay value={selectedShift.cashSales} /></p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{t.shiftHistory?.details?.cardSales || 'Card Sales'}</p>
                        <p className="text-sm font-bold text-violet-600"><PriceDisplay value={selectedShift.cardSales || 0} /></p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{t.shiftHistory?.details?.transactions || 'Transactions'}</p>
                        <p className="text-sm font-bold text-blue-600">{selectedShift.transactions.length}</p>
                    </div>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50`}>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-bold uppercase text-gray-400">{t.shiftHistory?.headers?.openingBalance || 'Opening Balance'}</p>
                            <span className="text-[10px] text-gray-400 font-medium">{formatTime(new Date(selectedShift.openTime))}</span>
                        </div>
                        <p className="text-xl font-bold"><PriceDisplay value={selectedShift.openingBalance} /></p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatRelativeDate(new Date(selectedShift.openTime))}</p>
                    </div>
                    <div className={`p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50`}>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-bold uppercase text-gray-400">{t.shiftHistory?.headers?.closingBalance || 'Closing Balance'}</p>
                            {selectedShift.closeTime && <span className="text-[10px] text-gray-400 font-medium">{formatTime(new Date(selectedShift.closeTime))}</span>}
                        </div>
                        <p className="text-xl font-bold"><PriceDisplay value={selectedShift.closingBalance || 0} /></p>
                        {selectedShift.closeTime && <p className="text-[10px] text-gray-400 mt-1">{formatRelativeDate(new Date(selectedShift.closeTime))}</p>}
                    </div>
                </div>

                {/* Transaction Log */}
                <div>
                   <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 ml-1">{t.shiftHistory?.details?.transactionLog || 'Transaction Log'}</h4>
                   <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                       {selectedShift.transactions.length > 0 ? (
                           selectedShift.transactions.map((tx, idx) => (
                               <div key={tx.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-colors">
                                   <div className="flex items-center gap-3">
                                       <span className={`px-2 py-0.5 rounded-lg font-bold uppercase text-[9px] tracking-wider border
                                           ${tx.type === 'in' || tx.type === 'opening' ? 'border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-900/30 dark:text-blue-400 dark:bg-blue-900/10' : ''}
                                           ${tx.type === 'out' || tx.type === 'closing' ? 'border-red-200 text-red-700 bg-red-50/50 dark:border-red-900/30 dark:text-red-400 dark:bg-red-900/10' : ''}
                                           ${tx.type === 'sale' ? 'border-green-200 text-green-700 bg-green-50/50 dark:border-green-900/30 dark:text-green-400 dark:bg-green-900/10' : ''}
                                           ${tx.type === 'card_sale' ? 'border-violet-200 text-violet-700 bg-violet-50/50 dark:border-violet-900/30 dark:text-violet-400 dark:bg-violet-900/10' : ''}
                                           ${tx.type === 'return' ? 'border-orange-200 text-orange-700 bg-orange-50/50 dark:border-orange-900/30 dark:text-orange-400 dark:bg-orange-900/10' : ''}
                                       `}>
                                           {t.cashRegister?.types?.[tx.type] || tx.type}
                                       </span>
                                       <div>
                                           <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{tx.reason}</div>
                                           {tx.time && <div className="text-[10px] text-gray-400">{new Date(tx.time).toLocaleTimeString()}</div>}
                                       </div>
                                   </div>
                                   <div className={`text-sm font-bold tabular-nums ${['in', 'opening', 'sale', 'card_sale'].includes(tx.type) ? 'text-green-600' : 'text-red-600'}`}>
                                       {['in', 'opening', 'sale', 'card_sale'].includes(tx.type) ? '+' : '-'}<PriceDisplay value={tx.amount} />
                                   </div>
                               </div>
                           ))
                       ) : (
                           <div className="py-8 text-center text-gray-400 italic text-sm">
                               {t.shiftHistory?.details?.noTransactions || 'No transactions recorded'}
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
