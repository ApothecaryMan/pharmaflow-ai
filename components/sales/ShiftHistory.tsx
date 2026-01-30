import React, { useState, useMemo } from 'react';
import { Shift } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { DatePicker } from '../common/DatePicker';
import { createSearchRegex } from '../../utils/searchUtils';
import { SearchInput } from '../common/SearchInput';

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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);

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

  // Column definitions
  const initialColumns = [
    { key: 'id', label: 'headers.shiftId', sortable: true },
    { key: 'openTime', label: 'headers.openTime', sortable: true },
    { key: 'closeTime', label: 'headers.closeTime', sortable: true },
    { key: 'duration', label: 'headers.duration', sortable: true },
    { key: 'openingBalance', label: 'headers.openingBalance', sortable: true },
    { key: 'closingBalance', label: 'headers.closingBalance', sortable: true },
    { key: 'variance', label: 'headers.variance', sortable: true }
  ];

  const [columns, setColumns] = useState(initialColumns);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDragStart = (e: React.DragEvent, key: string) => {
    setDraggedColumn(key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === key) return;
    
    const sourceIndex = columns.findIndex(col => col.key === draggedColumn);
    const targetIndex = columns.findIndex(col => col.key === key);
    
    if (sourceIndex !== -1 && targetIndex !== -1) {
        const newColumns = [...columns];
        const [removed] = newColumns.splice(sourceIndex, 1);
        newColumns.splice(targetIndex, 0, removed);
        setColumns(newColumns);
    }
  };

  const filteredShifts = shifts
    .filter(shift => {
      const searchRegex = createSearchRegex(searchTerm);
      const matchesTerm = searchRegex.test(shift.id) || searchRegex.test(shift.openedBy);

      if (!matchesTerm) return false;

      const shiftDate = new Date(shift.openTime);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && shiftDate < start) return false;
      if (end && shiftDate > end) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortConfig) {
        const { key, direction } = sortConfig;
        let aValue: any = a[key as keyof Shift];
        let bValue: any = b[key as keyof Shift];

        if (key === 'openTime' || key === 'closeTime') {
            aValue = new Date(aValue as string).getTime();
            bValue = new Date(bValue as string).getTime();
        } else if (key === 'duration') {
            aValue = a.closeTime ? new Date(a.closeTime).getTime() - new Date(a.openTime).getTime() : 0;
            bValue = b.closeTime ? new Date(b.closeTime).getTime() - new Date(b.openTime).getTime() : 0;
        } else if (key === 'closingBalance') {
            aValue = a.closingBalance || 0;
            bValue = b.closingBalance || 0;
        } else if (key === 'variance') {
            const aExpected = a.openingBalance + a.cashSales + a.cashIn - a.cashOut;
            const bExpected = b.openingBalance + b.cashSales + b.cashIn - b.cashOut;
            aValue = (a.closingBalance || 0) - aExpected;
            bValue = (b.closingBalance || 0) - bExpected;
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        
        return new Date(b.openTime).getTime() - new Date(a.openTime).getTime();
      }

      return new Date(b.openTime).getTime() - new Date(a.openTime).getTime();
    });

  // Calculate summary stats
  const totalRevenue = filteredShifts.reduce((sum, shift) => sum + shift.cashSales + (shift.cardSales || 0), 0);
  const avgPerShift = filteredShifts.length > 0 ? totalRevenue / filteredShifts.length : 0;

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
            <span className={`text-xl font-bold text-${color}-900 dark:text-${color}-100`}>${totalRevenue.toFixed(2)}</span>
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
      <div className={`flex-1 ${CARD_BASE} rounded-3xl overflow-hidden flex flex-col`}>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-start border-collapse">
            <thead className={`bg-${color}-50 dark:bg-${color}-900 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider sticky top-0 z-10 shadow-sm`}>
              <tr>
                {columns.map((col) => (
                    <th 
                        key={col.key}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, col.key)}
                        onDragOver={(e) => handleDragOver(e, col.key)}
                        className={`px-3 py-2 text-start ${col.sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800' : 'cursor-move'} transition-colors`}
                        onDoubleClick={() => col.sortable && handleSort(col.key)}
                    >
                        <div className="flex items-center gap-1">
                            {t.shiftHistory?.[col.label.split('.')[0]]?.[col.label.split('.')[1]] || col.label}
                            <span className={`material-symbols-rounded text-[14px] transition-opacity ${sortConfig?.key === col.key ? 'opacity-100' : 'opacity-0'}`}>
                                {sortConfig?.key === col.key && sortConfig.direction === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                            </span>
                        </div>
                    </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredShifts.map((shift, index) => {
                const expectedBalance = shift.openingBalance + shift.cashSales + shift.cashIn - shift.cashOut;
                const variance = (shift.closingBalance || 0) - expectedBalance;
                
                return (
                <React.Fragment key={shift.id}>
                <tr 
                    onClick={() => setExpandedShiftId(expandedShiftId === shift.id ? null : shift.id)}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-${color}-50 dark:hover:bg-${color}-950/20 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/20' : ''} ${expandedShiftId === shift.id ? `bg-${color}-50/50 dark:bg-${color}-900/10` : ''}`}
                >
                  {columns.map(col => {
                    if (col.key === 'id') {
                        return (
                            <td key={col.key} className="px-3 py-2 font-mono text-xs text-gray-500">
                                #{shift.id.slice(-6)}
                            </td>
                        );
                    }
                    if (col.key === 'openTime') {
                        return (
                            <td key={col.key} className="px-3 py-2">
                                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                    {new Date(shift.openTime).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {formatTime(new Date(shift.openTime))}
                                </div>
                            </td>
                        );
                    }
                    if (col.key === 'closeTime') {
                        return (
                            <td key={col.key} className="px-3 py-2">
                                {shift.closeTime ? (
                                    <>
                                        <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                            {new Date(shift.closeTime).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatTime(new Date(shift.closeTime))}
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-gray-400">-</span>
                                )}
                            </td>
                        );
                    }
                    if (col.key === 'duration') {
                        return (
                            <td key={col.key} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                                {formatDuration(shift.openTime, shift.closeTime)}
                            </td>
                        );
                    }
                    if (col.key === 'openingBalance') {
                        return (
                            <td key={col.key} className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                                ${shift.openingBalance.toFixed(2)}
                            </td>
                        );
                    }
                    if (col.key === 'closingBalance') {
                        return (
                            <td key={col.key} className="px-3 py-2 font-bold text-gray-900 dark:text-gray-100">
                                ${(shift.closingBalance || 0).toFixed(2)}
                            </td>
                        );
                    }
                    if (col.key === 'variance') {
                        return (
                            <td key={col.key} className="px-3 py-2">
                                <span className={`font-bold ${variance === 0 ? 'text-gray-500' : variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {variance > 0 ? '+' : ''}{variance === 0 ? '$0.00' : `$${variance.toFixed(2)}`}
                                </span>
                            </td>
                        );
                    }
                    return null;
                  })}
                </tr>
                {expandedShiftId === shift.id && (
                    <tr className="animate-fade-in">
                        <td colSpan={columns.length} className="p-0 border-b border-gray-100 dark:border-gray-800">
                            <div className={`bg-${color}-50/30 dark:bg-${color}-900/5 p-4`}>
                                {/* Shift Details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.shiftHistory?.details?.openedBy || 'Opened By'}</p>
                                        <p className="text-sm font-medium">{shift.openedBy}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.shiftHistory?.details?.cashSales || 'Cash Sales'}</p>
                                        <p className="text-sm font-medium text-green-600">${shift.cashSales.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.shiftHistory?.details?.cardSales || 'Card Sales'}</p>
                                        <p className="text-sm font-medium text-violet-600">${(shift.cardSales || 0).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.shiftHistory?.details?.transactions || 'Transactions'}</p>
                                        <p className="text-sm font-medium">{shift.transactions.length}</p>
                                    </div>
                                </div>

                                {/* Transactions List */}
                                {shift.transactions.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">{t.shiftHistory?.details?.transactionLog || 'Transaction Log'}</h4>
                                        <div className="space-y-1 max-h-60 overflow-y-auto">
                                            {shift.transactions.slice(0, 10).map(tx => (
                                                <div key={tx.id} className="flex items-center justify-between text-xs p-2 rounded bg-white dark:bg-gray-900/50">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px]
                                                            ${tx.type === 'in' || tx.type === 'opening' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                                                            ${tx.type === 'out' || tx.type === 'closing' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : ''}
                                                            ${tx.type === 'sale' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : ''}
                                                            ${tx.type === 'card_sale' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : ''}
                                                            ${tx.type === 'return' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : ''}
                                                        `}>
                                                            {t.cashRegister?.types?.[tx.type] || tx.type}
                                                        </span>
                                                        <span className="text-gray-600 dark:text-gray-400">{tx.reason}</span>
                                                    </div>
                                                    <span className={`font-bold ${['in', 'opening', 'sale', 'card_sale'].includes(tx.type) ? 'text-green-600' : 'text-red-600'}`}>
                                                        {['in', 'opening', 'sale', 'card_sale'].includes(tx.type) ? '+' : '-'}${tx.amount.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                            {shift.transactions.length > 10 && (
                                                <p className="text-xs text-gray-400 text-center py-2">
                                                    +{shift.transactions.length - 10} {t.shiftHistory?.details?.moreTransactions || 'more transactions'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </td>
                    </tr>
                )}
                </React.Fragment>
              )})}
              {filteredShifts.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="p-12 text-center text-gray-400">
                    {t.shiftHistory?.noResults || 'No shifts found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
