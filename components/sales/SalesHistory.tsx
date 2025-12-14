

import React, { useState, useRef } from 'react';
import { Sale, CartItem, Return } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { ReturnModal } from '../sales/ReturnModal';
import { DatePicker } from '../common/DatePicker';
import { createSearchRegex } from '../../utils/searchUtils';
import { useSmartDirection } from '../common/SmartInputs';
import { SearchInput } from '../common/SearchInput';
import { SALES_HISTORY_HELP } from '../../i18n/helpInstructions';
import { HelpModal, HelpButton } from '../common/HelpModal';
import { Modal } from '../common/Modal';
import { printInvoice } from './InvoiceTemplate';
import { ThermalPrinterService, isSerialAvailable, isUSBAvailable } from '../../utils/printing';

interface SalesHistoryProps {
  sales: Sale[];
  returns: Return[];
  onProcessReturn: (returnData: Return) => void;
  color: string;
  t: any;
  language: string;
  datePickerTranslations: any;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, returns, onProcessReturn, color, t, language, datePickerTranslations }) => {
  // Determine locale based on language
  const locale = language === 'AR' ? 'ar-EG' : 'en-US';
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Get help content
  const helpContent = SALES_HISTORY_HELP[language as 'EN' | 'AR'] || SALES_HISTORY_HELP.EN;

  // Column definitions
  const initialColumns = [
    { key: 'id', label: 'modal.id', sortable: true },
    { key: 'date', label: 'headers.date', sortable: true },
    { key: 'customer', label: 'headers.customer', sortable: true },
    { key: 'payment', label: 'headers.payment', sortable: true },
    { key: 'items', label: 'headers.items', sortable: true },
    { key: 'total', label: 'headers.total', sortable: true },
    { key: 'actions', label: 'headers.actions', sortable: false }
  ];

  const [columns, setColumns] = useState(initialColumns);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // --- Nested/Future Functions for Item Actions ---
  const handleEmailReceipt = (saleId: string) => {
    console.log(`[Future Implementation] Email receipt for Sale ID: ${saleId}`);
    // Future: Trigger backend email service
  };

  const handleDownloadPDF = (saleId: string) => {
    console.log(`[Future Implementation] Download PDF for Sale ID: ${saleId}`);
    // Future: Generate PDF blob and trigger download
  };

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

  const filteredSales = sales
    .filter(sale => {
      const searchRegex = createSearchRegex(searchTerm);
      const matchesTerm = (
        searchRegex.test(sale.customerName || '') ||
        searchRegex.test(sale.id) ||
        sale.items.some(item => 
           searchRegex.test(item.name) || 
           (item.barcode && searchRegex.test(item.barcode))
        )
      );

      if (!matchesTerm) return false;

      const saleDate = new Date(sale.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && saleDate < start) return false;
      if (end && saleDate > end) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortConfig) {
        const { key, direction } = sortConfig;
        let aValue: any = a[key as keyof Sale];
        let bValue: any = b[key as keyof Sale];

        // Handle specific keys
        if (key === 'items') {
            aValue = a.items.length;
            bValue = b.items.length;
        } else if (key === 'date') {
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
        } else if (key === 'customer') {
            aValue = a.customerName || '';
            bValue = b.customerName || '';
        } else if (key === 'payment') {
            // Sort by translated name
            aValue = a.paymentMethod === 'visa' ? t.visa : t.cash;
            bValue = b.paymentMethod === 'visa' ? t.visa : t.cash;
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        
        // Secondary sort by date (always newest first for stability)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      // Default sort: Newest first
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

  const exportToCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = ['ID', 'Date', 'Customer', 'Customer Code', 'Payment Method', 'Items Count', 'Subtotal', 'Global Discount (%)', 'Total'];
    const escape = (str: string | number | undefined) => `"${String(str || '').replace(/"/g, '""')}"`;

    const rows = filteredSales.map(sale => [
      sale.id,
      new Date(sale.date).toLocaleString(),
      sale.customerName || 'Guest',
      sale.customerCode || '-',
      sale.paymentMethod === 'visa' ? 'Visa' : 'Cash',
      sale.items.length,
      (sale.subtotal || 0).toFixed(2),
      sale.globalDiscount || 0,
      sale.total.toFixed(2)
    ]);

    const csvContent = [
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_history_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (sale: Sale) => {
    // Load saved template options from localStorage
    let savedOptions = {};
    try {
      const saved = localStorage.getItem('invoice_template_options');
      if (saved) {
        savedOptions = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load saved receipt options', e);
    }
    
    // Merge saved options with current language
    printInvoice(sale, { ...savedOptions, language: language as 'EN' | 'AR' });
  };

  // Direct thermal print (ESC/POS)
  const handleThermalPrint = async (sale: Sale, connectionType: 'serial' | 'usb') => {
    const printer = new ThermalPrinterService({ 
      connectionType,
      paperSize: '79mm' 
    });
    
    const result = await printer.printReceipt(sale, {
      printBarcode: true,
      cutPaper: true,
    });
    
    if (!result.success) {
      console.error('Thermal print failed:', result.message);
      // Fallback to browser print
      printInvoice(sale);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight type-expressive">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.subtitle}</p>
        </div>
        
        {/* Total Revenue Card */}
        <div className={`px-4 py-2 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 ${CARD_BASE} flex flex-col items-end min-w-[140px]`}>
            <span className={`text-[10px] font-bold uppercase text-${color}-600 dark:text-${color}-400`}>{t.totalRevenue}</span>
            <span className={`text-xl font-bold text-${color}-900 dark:text-${color}-100`}>${sales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className={`flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${CARD_BASE} p-4 rounded-2xl`}>
        <div className="flex flex-wrap items-center gap-3 w-full sm:flex-1">
            <div className="relative group flex-1">
                <SearchInput
                    value={searchTerm}
                    onSearchChange={setSearchTerm}
                    placeholder={t.searchPlaceholder || "Search sales..."}
                    className="ps-10"
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
            
        <button 
            onClick={exportToCSV}
            disabled={filteredSales.length === 0}
            className={`px-4 py-2.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 text-gray-700 dark:text-gray-200`}
        >
            <span className="material-symbols-rounded text-lg">download</span>
            <span className="hidden md:inline">{t.exportCSV}</span>
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
                        className={`px-3 py-2 text-${col.key === 'actions' ? 'end' : 'start'} ${col.sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800' : 'cursor-move'} transition-colors`}
                        onDoubleClick={() => col.sortable && handleSort(col.key)}
                    >
                        <div className={`flex items-center gap-1 ${col.key === 'actions' ? 'justify-end' : ''}`}>
                            {t[col.label.split('.')[0]][col.label.split('.')[1]]}
                            <span className={`material-symbols-rounded text-[14px] transition-opacity ${sortConfig?.key === col.key ? 'opacity-100' : 'opacity-0'}`}>
                                {sortConfig?.key === col.key && sortConfig.direction === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                            </span>
                        </div>
                    </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredSales.map((sale, index) => {
                // Calculate total returned amount for this sale
                const totalReturned = sale.netTotal !== undefined ? sale.total - sale.netTotal : 0;
                
                return (
                <React.Fragment key={sale.id}>
                <tr 
                    onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-${color}-50 dark:hover:bg-${color}-950/20 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/20' : ''} ${expandedSaleId === sale.id ? `bg-${color}-50/50 dark:bg-${color}-900/10` : ''}`}
                >
                  {columns.map(col => {
                    if (col.key === 'id') {
                        return (
                            <td key={col.key} className="px-3 py-2 font-mono text-xs text-gray-500">
                                #{sale.id}
                            </td>
                        );
                    }
                    if (col.key === 'date') {
                        return (
                            <td key={col.key} className="px-3 py-2">
                                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                    {new Date(sale.date).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    {sale.saleType === 'delivery' && (
                                        <span className="material-symbols-rounded text-[14px] text-blue-500" title="Delivery Order">local_shipping</span>
                                    )}
                                </div>
                            </td>
                        );
                    }
                    if (col.key === 'customer') {
                        return (
                            <td key={col.key} className="px-3 py-2">
                                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                    {sale.customerName || "Guest"}
                                </div>
                                {sale.customerCode && (
                                    <div className="text-xs text-gray-500">
                                        #{sale.customerCode}
                                    </div>
                                )}
                            </td>
                        );
                    }
                    if (col.key === 'payment') {
                        return (
                            <td key={col.key} className="px-3 py-2">
                                <span className={`flex items-center gap-1 ${sale.paymentMethod === 'visa' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                                    <span className="material-symbols-rounded text-[16px]">{sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}</span>
                                    <span className="text-sm font-medium">{sale.paymentMethod === 'visa' ? t.visa : t.cash}</span>
                                </span>
                            </td>
                        );
                    }
                    if (col.key === 'items') {
                        return (
                            <td key={col.key} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                                {sale.items.length} {t.items || "items"}
                            </td>
                        );
                    }
                    if (col.key === 'total') {
                        return (
                            <td key={col.key} className="px-3 py-2 font-bold text-gray-900 dark:text-gray-100">
                                ${sale.total.toFixed(2)}
                                {sale.deliveryFee && sale.deliveryFee > 0 && (
                                    <div className="text-[10px] text-gray-400 font-normal">
                                        +${sale.deliveryFee.toFixed(2)} delivery
                                    </div>
                                )}
                            </td>
                        );
                    }
                    if (col.key === 'actions') {
                        return (
                            <td key={col.key} className="px-3 py-2 text-end" onClick={(e) => e.stopPropagation()}>
                                {/* Status Icons */}
                                {sale.hasReturns ? (
                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                        <span className="material-symbols-rounded text-[16px]">keyboard_return</span>
                                        <span className="text-xs font-bold">-${totalReturned.toFixed(2)}</span>
                                    </div>
                                ) : sale.status === 'cancelled' ? (
                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                        <span className="material-symbols-rounded text-[16px]">cancel</span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                        <span className="material-symbols-rounded text-[16px]">check_circle</span>
                                    </div>
                                )}
                            </td>
                        );
                    }
                    return null;
                  })}
                </tr>
                {expandedSaleId === sale.id && (
                    <tr className="animate-fade-in">
                        <td colSpan={columns.length} className="p-0 border-b border-gray-100 dark:border-gray-800">
                            <div className={`bg-${color}-50/30 dark:bg-${color}-900/5 p-3 flex flex-col md:flex-row gap-4 items-start`}>
                                {/* Items List - Grid Layout for Compactness */}
                                <div className="flex-1 w-full">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider flex items-center gap-2">
                                        <span className="material-symbols-rounded text-[14px]">shopping_bag</span>
                                        {t.modal.items} <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 rounded text-[9px]">{sale.items.length}</span>
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {sale.items.map((item, idx) => {
                                            const effectivePrice = (item.isUnit && item.unitsPerPack) ? item.price / item.unitsPerPack : item.price;
                                            const lineKey = `${item.id}_${idx}`;
                                            const returnedQty = sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
                                            return (
                                                <div key={idx} className={`flex items-center gap-2 p-1.5 rounded border ${returnedQty > 0 ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50'} hover:border-gray-200 dark:hover:border-gray-700 transition-colors`}>
                                                    <div className={`h-8 w-8 rounded ${returnedQty > 0 ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'} flex items-center justify-center text-xs font-bold shrink-0`}>
                                                        {item.quantity}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                                                            {item.name} {item.dosageForm ? `(${item.dosageForm})` : ''}
                                                            {item.isUnit && <span className="text-[8px] bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-1 rounded font-bold">UNIT</span>}
                                                            {returnedQty > 0 && (
                                                                <span className="text-[8px] bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 px-1 rounded font-bold">
                                                                    -{returnedQty} {t.returns?.returned || 'returned'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                            ${effectivePrice.toFixed(2)}
                                                            {item.discount && item.discount > 0 ? <span className="text-green-600 dark:text-green-400">(-{item.discount}%)</span> : ''}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">
                                                        ${((effectivePrice * item.quantity) * (1 - (item.discount || 0)/100)).toFixed(2)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Summary & Actions - Compact Sidebar */}
                                <div className="w-full md:w-56 shrink-0 flex flex-col gap-3 md:border-s border-gray-100 dark:border-gray-800 md:ps-4">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>{t.modal.subtotal}</span>
                                            <span>${(sale.subtotal || 0).toFixed(2)}</span>
                                        </div>
                                        {sale.globalDiscount && sale.globalDiscount > 0 && (
                                            <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                                                <span>Disc. ({sale.globalDiscount}%)</span>
                                                <span>-${((sale.subtotal || 0) * sale.globalDiscount / 100).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {sale.deliveryFee && sale.deliveryFee > 0 && (
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>Delivery</span>
                                                <span>+${sale.deliveryFee.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-1.5 border-t border-gray-100 dark:border-gray-800 border-dashed">
                                            <span>{t.modal.total}</span>
                                            <span>${sale.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        {(() => {
                                            // Check if there are any items that can still be returned (using lineKey pattern)
                                            const hasItemsToReturn = sale.items.some((item, index) => {
                                                const lineKey = `${item.id}_${index}`;
                                                const returnedQty = sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
                                                return returnedQty < item.quantity;
                                            });
                                            
                                            return (
                                                <>
                                                    {hasItemsToReturn && (
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedSale(sale);
                                                                setReturnModalOpen(true);
                                                            }}
                                                            className="py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wide text-white bg-orange-500 hover:bg-orange-600 transition-colors flex items-center justify-center gap-1 shadow-sm shadow-orange-200 dark:shadow-none"
                                                        >
                                                            <span className="material-symbols-rounded text-[14px]">keyboard_return</span>
                                                            {t.returns?.return || 'Return'}
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handlePrint(sale)}
                                                        className={`py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wide text-white bg-${color}-600 hover:bg-${color}-700 transition-colors flex items-center justify-center gap-1 shadow-sm shadow-${color}-200 dark:shadow-none ${!hasItemsToReturn ? 'col-span-2' : ''}`}
                                                    >
                                                        <span className="material-symbols-rounded text-[14px]">print</span>
                                                        Receipt
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                )}
                </React.Fragment>
              );
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    {t.noResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal - hide when return modal is open */}
      {selectedSale && !returnModalOpen && (
        <Modal
            isOpen={true}
            onClose={() => setSelectedSale(null)}
            size="lg"
        >
              <div className={`p-5 bg-${color}-50 dark:bg-${color}-950/30 border-b border-${color}-100 dark:border-${color}-900 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50`}>
                  <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`}>
                          <span className="material-symbols-rounded">receipt_long</span>
                      </div>
                      <h3 className={`text-lg font-bold type-expressive text-${color}-900 dark:text-${color}-100`}>
                        {t.modal.title}
                      </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedSale(null)} 
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                  >
                    <span className="material-symbols-rounded">close</span>
                  </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                          <p className="text-gray-500">{t.modal.id}</p>
                          <p className="font-mono text-gray-700 dark:text-gray-300 text-xs">{selectedSale.id}</p>
                      </div>
                      <div className="text-end">
                          <p className="text-gray-500">{t.modal.date}</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300">{new Date(selectedSale.date).toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                          <p className="text-gray-500">{t.modal.customer}</p>
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-base text-gray-800 dark:text-gray-200">{selectedSale.customerName || 'Guest'}</p>
                            {selectedSale.customerCode && <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500">#{selectedSale.customerCode}</span>}
                          </div>
                      </div>
                      <div className="col-span-2">
                          <p className="text-gray-500">{t.modal.payment}</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <span className="material-symbols-rounded text-[18px] text-gray-400">
                              {selectedSale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}
                            </span>
                            {selectedSale.paymentMethod === 'visa' ? t.visa : t.cash}
                          </p>
                      </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-2">{t.modal.items}</p>
                      <div className="space-y-2">
                          {selectedSale.items.map((item, idx) => {
                             const effectivePrice = (item.isUnit && item.unitsPerPack) ? item.price / item.unitsPerPack : item.price;
                             return (
                              <div key={idx} className="flex justify-between items-center text-sm p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                  <div>
                                      <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1 item-name">
                                        {item.name} {item.dosageForm ? `(${item.dosageForm})` : ''}
                                        {item.isUnit && <span className="text-[9px] bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-1 rounded font-bold">UNIT</span>}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                          {t.modal.qty}: {item.quantity} x ${effectivePrice.toFixed(2)}
                                          {item.discount && item.discount > 0 ? ` (-${item.discount}%)` : ''}
                                      </p>
                                  </div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300">
                                      ${((effectivePrice * item.quantity) * (1 - (item.discount || 0)/100)).toFixed(2)}
                                  </div>
                              </div>
                             );
                          })}
                      </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2 text-sm">
                       {selectedSale.subtotal !== undefined && (
                           <div className="flex justify-between text-gray-500">
                               <span>{t.modal.subtotal}</span>
                               <span>${selectedSale.subtotal.toFixed(2)}</span>
                           </div>
                       )}
                       {selectedSale.globalDiscount !== undefined && selectedSale.globalDiscount > 0 && (
                           <div className="flex justify-between text-green-600 dark:text-green-400">
                               <span>{t.modal.discount} ({selectedSale.globalDiscount}%)</span>
                               <span>-${(selectedSale.subtotal! * selectedSale.globalDiscount / 100).toFixed(2)}</span>
                           </div>
                       )}
                       {selectedSale.deliveryFee && selectedSale.deliveryFee > 0 && (
                           <div className="flex justify-between text-gray-500">
                               <span>Delivery Fee</span>
                               <span>+${selectedSale.deliveryFee.toFixed(2)}</span>
                           </div>
                       )}
                       <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
                           <span>{t.modal.total}</span>
                           <span>${selectedSale.total.toFixed(2)}</span>
                       </div>
                  </div>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex gap-3">
                  {(() => {
                      // Check if there are any items that can still be returned (using lineKey pattern)
                      const hasItemsToReturn = selectedSale.items.some((item, index) => {
                          const lineKey = `${item.id}_${index}`;
                          const returnedQty = selectedSale.itemReturnedQuantities?.[lineKey] || selectedSale.itemReturnedQuantities?.[item.id] || 0;
                          return returnedQty < item.quantity;
                      });
                      
                      return (
                        <>
                          {hasItemsToReturn && (
                            <button 
                              onClick={() => setReturnModalOpen(true)}
                              className={`flex-1 py-2.5 rounded-full font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors flex items-center justify-center gap-2`}
                            >
                                <span className="material-symbols-rounded">keyboard_return</span>
                                {t.returns?.processReturn || 'Process Return'}
                            </button>
                          )}
                          <button 
                            onClick={() => handlePrint(selectedSale)}
                            className={`flex-1 py-2.5 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 transition-colors flex items-center justify-center gap-2`}
                          >
                              <span className="material-symbols-rounded">print</span>
                              {t.modal.print}
                          </button>
                        </>
                      );
                  })()}
              </div>
        </Modal>
      )}

       {/* Return Modal */}
       {selectedSale && returnModalOpen && (
         <ReturnModal
           isOpen={returnModalOpen}
           sale={selectedSale}
           onClose={() => {
             setReturnModalOpen(false);
             setSelectedSale(null);
           }}
           onConfirm={(returnData) => {
             onProcessReturn(returnData);
             setReturnModalOpen(false);
             setSelectedSale(null);
           }}
           color={color}
           t={t}
          />
        )}

      {/* Help */}
      <HelpButton onClick={() => setShowHelp(true)} title={helpContent.title} color={color} isRTL={language === 'AR'} />
      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} helpContent={helpContent as any} color={color} language={language} />
     </div>
   );
 };