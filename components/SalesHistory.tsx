

import React, { useState } from 'react';
import { Sale, CartItem } from '../types';

interface SalesHistoryProps {
  sales: Sale[];
  color: string;
  t: any;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, color, t }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'high' | 'low'>('newest');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // --- Nested/Future Functions for Item Actions ---
  const handleEmailReceipt = (saleId: string) => {
    console.log(`[Future Implementation] Email receipt for Sale ID: ${saleId}`);
    // Future: Trigger backend email service
  };

  const handleDownloadPDF = (saleId: string) => {
    console.log(`[Future Implementation] Download PDF for Sale ID: ${saleId}`);
    // Future: Generate PDF blob and trigger download
  };

  const filteredSales = sales
    .filter(sale => {
      const term = searchTerm.toLowerCase();
      return (
        (sale.customerName?.toLowerCase() || '').includes(term) ||
        sale.id.toLowerCase().includes(term) ||
        sale.items.some(item => 
           item.name.toLowerCase().includes(term) || 
           item.genericName.toLowerCase().includes(term) ||
           (item.barcode && item.barcode.toLowerCase().includes(term))
        )
      );
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'newest': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'high': return b.total - a.total;
        case 'low': return a.total - b.total;
        default: return 0;
      }
    });

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

  const exportToCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = ['ID', 'Date', 'Customer', 'Items Count', 'Subtotal', 'Global Discount (%)', 'Total'];
    const escape = (str: string | number | undefined) => `"${String(str || '').replace(/"/g, '""')}"`;

    const rows = filteredSales.map(sale => [
      sale.id,
      new Date(sale.date).toLocaleString(),
      sale.customerName || 'Guest',
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
    const printWindow = window.open('', '', 'width=600,height=800');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${document.documentElement.dir || 'ltr'}">
      <head>
        <title>Receipt #${sale.id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Roboto', sans-serif; padding: 40px; color: #1e293b; max-width: 480px; margin: 0 auto; background: white; }
          .header { text-align: center; margin-bottom: 30px; }
          .store-name { font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; margin: 0; text-transform: uppercase; }
          .store-sub { font-size: 11px; color: #64748b; letter-spacing: 3px; text-transform: uppercase; margin-top: 5px; }
          
          .divider { border-bottom: 2px dashed #e2e8f0; margin: 20px 0; }
          
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 12px; color: #64748b; margin-bottom: 25px; }
          .meta-item { display: flex; flex-direction: column; }
          .meta-label { font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
          .meta-value { color: #0f172a; font-weight: 500; }
          .text-right { text-align: right; }

          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px; }
          th { text-align: left; border-bottom: 2px solid #e2e8f0; padding: 8px 4px; color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: 700; }
          td { padding: 12px 4px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
          tr:last-child td { border-bottom: none; }
          
          .item-name { font-weight: 500; color: #0f172a; margin-bottom: 2px; }
          .item-meta { font-size: 10px; color: #94a3b8; }
          .discount-badge { display: inline-block; font-size: 9px; background: #fef2f2; color: #ef4444; padding: 1px 4px; border-radius: 4px; font-weight: bold; margin-top: 2px; }
          .unit-badge { display: inline-block; font-size: 9px; background: #f0f9ff; color: #0ea5e9; padding: 1px 4px; border-radius: 4px; font-weight: bold; margin-top: 2px; margin-right: 4px; }

          .total-section { background: #f8fafc; padding: 15px; border-radius: 12px; }
          .total-row { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 6px; }
          .total-row.final { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; align-items: center; }
          
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; line-height: 1.6; }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="store-name">PharmaFlow</h1>
          <div class="store-sub">Pharmacy Management System</div>
        </div>
        
        <div class="divider"></div>

        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Receipt No</span>
            <span class="meta-value">#${sale.id.slice(-6).toUpperCase()}</span>
          </div>
           <div class="meta-item text-right">
            <span class="meta-label">Date Issued</span>
            <span class="meta-value">${new Date(sale.date).toLocaleDateString()} ${new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Customer</span>
            <span class="meta-value">${sale.customerName || 'Walk-in Guest'}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50%">Description</th>
              <th class="text-right" style="width: 15%">Qty</th>
              <th class="text-right" style="width: 15%">Price</th>
              <th class="text-right" style="width: 20%">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(item => {
              // Calculate effective price for display if unit sale
              const effectivePrice = (item.isUnit && item.unitsPerPack) 
                ? item.price / item.unitsPerPack 
                : item.price;
                
              return `
              <tr>
                <td>
                  <div class="item-name">${item.name}</div>
                  ${item.isUnit ? `<span class="unit-badge">UNIT</span>` : ''}
                  ${item.discount && item.discount > 0 
                    ? `<span class="discount-badge">-${item.discount}% OFF</span>` 
                    : `<div class="item-meta">${item.genericName || ''}</div>`
                  }
                </td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">$${effectivePrice.toFixed(2)}</td>
                <td class="text-right" style="font-weight: 600">$${((effectivePrice * item.quantity) * (1 - (item.discount || 0)/100)).toFixed(2)}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <span>Subtotal</span>
            <span>$${(sale.subtotal || 0).toFixed(2)}</span>
          </div>
          ${sale.globalDiscount ? `
          <div class="total-row" style="color: #ef4444;">
            <span>Order Discount (${sale.globalDiscount}%)</span>
            <span>-$${((sale.subtotal || 0) * sale.globalDiscount / 100).toFixed(2)}</span>
          </div>` : ''}
          <div class="total-row final">
            <span>Total Amount</span>
            <span>$${sale.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for choosing PharmaFlow.<br>We wish you good health!</p>
          <p>For inquiries, please keep this receipt.</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">{t.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>
        
        {/* Total Revenue Card */}
        <div className={`px-4 py-2 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-100 dark:border-${color}-900/50 flex flex-col items-end min-w-[140px]`}>
            <span className={`text-[10px] font-bold uppercase text-${color}-600 dark:text-${color}-400`}>{t.totalRevenue}</span>
            <span className={`text-xl font-bold text-${color}-900 dark:text-${color}-100`}>${totalRevenue.toFixed(2)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <span className="material-symbols-rounded absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rtl:left-auto rtl:right-4 ltr:left-4">search</span>
          <input 
            type="text" 
            placeholder={t.searchPlaceholder}
            className="w-full ps-12 pe-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 transition-all text-sm"
            style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
            <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-500 whitespace-nowrap hidden md:block">{t.sortBy}</label>
            <select 
                className="px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 transition-all text-sm"
                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
            >
                <option value="newest">{t.sortNewest}</option>
                <option value="oldest">{t.sortOldest}</option>
                <option value="high">{t.sortHighTotal}</option>
                <option value="low">{t.sortLowTotal}</option>
            </select>
            </div>
            
            <button 
                onClick={exportToCSV}
                disabled={filteredSales.length === 0}
                className={`px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 text-slate-700 dark:text-slate-200`}
            >
                <span className="material-symbols-rounded text-lg">download</span>
                <span className="hidden md:inline">{t.exportCSV}</span>
            </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-start border-collapse">
            <thead className={`bg-${color}-50 dark:bg-${color}-950/30 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider`}>
              <tr>
                <th className="p-4 text-start">{t.headers.date}</th>
                <th className="p-4 text-start">{t.headers.customer}</th>
                <th className="p-4 text-start">{t.headers.items}</th>
                <th className="p-4 text-start">{t.headers.total}</th>
                <th className="p-4 text-end">{t.headers.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                        {new Date(sale.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-500">
                        {new Date(sale.date).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-4">
                     {sale.customerName ? (
                        <div className="font-medium text-slate-700 dark:text-slate-300 text-sm">{sale.customerName}</div>
                     ) : (
                        <span className="text-slate-400 italic text-sm">Guest</span>
                     )}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {sale.items.length} items
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300 text-sm">${sale.total.toFixed(2)}</td>
                  <td className="p-4 text-end flex items-center justify-end gap-2">
                     {/* Future Action */}
                    <button 
                      onClick={() => handleEmailReceipt(sale.id)}
                      className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Email Receipt (Future)"
                    >
                      <span className="material-symbols-rounded text-[18px]">mail</span>
                    </button>

                    <button 
                      onClick={() => setSelectedSale(sale)}
                      className={`px-3 py-1.5 rounded-xl bg-${color}-50 hover:bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:hover:bg-${color}-900/50 dark:text-${color}-300 text-xs font-medium transition-colors`}
                    >
                      {t.headers.actions}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    {t.noResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className={`p-5 bg-${color}-50 dark:bg-${color}-950/30 border-b border-${color}-100 dark:border-${color}-900 flex justify-between items-center`}>
                  <h3 className={`text-lg font-semibold text-${color}-900 dark:text-${color}-100`}>
                    {t.modal.title}
                  </h3>
                  <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-rounded">close</span>
                  </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                          <p className="text-slate-500">{t.modal.id}</p>
                          <p className="font-mono text-slate-700 dark:text-slate-300 text-xs">{selectedSale.id}</p>
                      </div>
                      <div className="text-end">
                          <p className="text-slate-500">{t.modal.date}</p>
                          <p className="font-medium text-slate-700 dark:text-slate-300">{new Date(selectedSale.date).toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                          <p className="text-slate-500">{t.modal.customer}</p>
                          <p className="font-bold text-base text-slate-800 dark:text-slate-200">{selectedSale.customerName || 'Guest'}</p>
                      </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">{t.modal.items}</p>
                      <div className="space-y-2">
                          {selectedSale.items.map((item, idx) => {
                             const effectivePrice = (item.isUnit && item.unitsPerPack) ? item.price / item.unitsPerPack : item.price;
                             return (
                              <div key={idx} className="flex justify-between items-center text-sm p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                  <div>
                                      <p className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                        {item.name}
                                        {item.isUnit && <span className="text-[9px] bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-1 rounded font-bold">UNIT</span>}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                          {t.modal.qty}: {item.quantity} x ${effectivePrice.toFixed(2)}
                                          {item.discount && item.discount > 0 ? ` (-${item.discount}%)` : ''}
                                      </p>
                                  </div>
                                  <div className="font-medium text-slate-700 dark:text-slate-300">
                                      ${((effectivePrice * item.quantity) * (1 - (item.discount || 0)/100)).toFixed(2)}
                                  </div>
                              </div>
                             );
                          })}
                      </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-sm">
                       {selectedSale.subtotal !== undefined && (
                           <div className="flex justify-between text-slate-500">
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
                       <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                           <span>{t.modal.total}</span>
                           <span>${selectedSale.total.toFixed(2)}</span>
                       </div>
                  </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-3">
                  <button 
                    onClick={() => handlePrint(selectedSale)}
                    className={`flex-1 py-2.5 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 transition-colors flex items-center justify-center gap-2`}
                  >
                      <span className="material-symbols-rounded">print</span>
                      {t.modal.print}
                  </button>
                  <button 
                    onClick={() => setSelectedSale(null)}
                    className="flex-1 py-2.5 rounded-full font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                      {t.modal.close}
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};