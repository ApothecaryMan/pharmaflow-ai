import type { Sale } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import { INVOICE_DEFAULTS, type InvoiceTemplateOptions } from './InvoiceTemplate';
import { getReceiptFontsCSS } from '../../utils/printing';
import { pricing } from '../../utils/money';

export function generateLayout3HTML(
  sale: Sale,
  opts: InvoiceTemplateOptions,
  _lang?: string,
  _defaults?: any
): string {
  const lang = opts.language || 'EN';
  const _isRTL = lang === 'AR';
  const currentDefaults = INVOICE_DEFAULTS[lang];

  return `
    <!DOCTYPE html>
    <html dir="ltr">
    <head>
      <title>Receipt #${sale.id}</title>
      <style>
        /* Embedded Font Declarations */
        ${getReceiptFontsCSS()}
        
        @page { margin: 0; size: 80mm auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          min-height: 100%; height: auto !important; background-color: #ffffff; overflow: visible !important;
        }
        body { 
          font-family: ${opts.receiptFont === 'receipt-basic' ? "'Receiptional Receipt', 'Raqami', Arial, sans-serif" : "'Fake Receipt', 'Raqami', Arial, sans-serif"}; 
          font-size: 9px; /* Unified compact size */
          font-weight: bold;
          line-height: 1.1; 
          padding: 2px 4px; /* Ultra tight padding */
          color: #000; width: 72mm; max-width: 72mm; margin: 0 auto; 
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        
        
        
        .header { text-align: center; margin-bottom: 4px; }
        .store-logo { width: 35px; height: auto; margin: 0 auto 2px auto; display: block; }
        .store-logo svg { width: 100% !important; height: 100% !important; max-height: 10mm; object-fit: contain; }
        .highlight { outline: 2px dashed #000 !important; background-color: rgba(0, 0, 0, 0.05) !important; border-radius: 4px; }
        .store-name { margin-bottom: 1px; }
        .store-info { }
        
        .divider { border-top: 1px dashed #000; margin: 2px 0; border-bottom: none; }
        
        .meta-info { display: flex; justify-content: space-between; margin: 1px 0; }
        
        table { width: 100%; border-collapse: collapse; margin: 2px 0; }
        th { border-bottom: 1px dashed #000; text-align: left; padding-bottom: 1px; }
        td { padding: 1px 0; vertical-align: top; }
        .right { text-align: right; }
        
        .totals { margin-top: 2px; border-top: 1px dashed #000; padding-top: 2px; }
        .total-row { display: flex; justify-content: space-between; }
        .final { margin-top: 2px; padding: 2px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }
        
        .footer { text-align: center; margin: 4px 0; line-height: 1.2; }
        .barcode-section { text-align: center; margin-top: 2px; }
        #barcode { width: 100%; max-width: 180px; height: auto; } /* Minimum 10mm height */
      </style>
    </head>
    <body>
      <div class="header">
        <!-- Logo intentionally omitted for compact layout -->
        <div class="store-name ${opts.highlightedField === 'storeName' ? 'highlight' : ''}">${opts.storeName ?? (lang === 'AR' ? 'ZINC' : 'ZINC')}</div>
        ${opts.storeSubtitle ? `<div class="store-info ${opts.highlightedField === 'storeSubtitle' ? 'highlight' : ''}">${opts.storeSubtitle}</div>` : ''}
        <div class="store-info" dir="auto"><span class="${opts.highlightedField === 'headerAddress' ? 'highlight' : ''}">${opts.headerAddress ?? currentDefaults.address}</span> | <span class="${opts.highlightedField === 'headerHotline' ? 'highlight' : ''}">${opts.headerHotline ?? currentDefaults.hotline}</span></div>
      </div>
      
      <hr class="divider">
      <div class="meta-info">
        <span>${sale.customerName ? sale.customerName : 'GUEST'}</span>
        <span>#${sale.dailyOrderNumber || 1}</span>
      </div>
      <div class="meta-info">
        <span>ID:${sale.serialId || sale.id}</span>
        <span>${new Date(sale.date).toLocaleDateString('en-GB')} ${new Date(sale.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
      </div>
      ${
        sale.saleType === 'delivery'
          ? `
      <div style="text-align: center; margin: 4px 0;"><span style="background-color: #000; color: #fff; padding: 2px 8px; border-radius: 2px; display: inline-block;">DELIVERY</span></div>
      ${sale.customerPhone ? `<div dir="ltr" style="text-align: center;">${sale.customerPhone}</div>` : ''}
      ${sale.customerAddress ? `<div dir="rtl" style="text-align: center;">${sale.customerAddress.replace(/\n/g, ' ')}</div>` : ''}
      ${sale.customerStreetAddress ? `<div dir="rtl" style="text-align: center;">${sale.customerStreetAddress.replace(/\n/g, ' ')}</div>` : ''}
      `
          : ''
      }
      <hr class="divider">

      <table>
        <thead><tr><th>ITEM</th><th class="right">TOT</th></tr></thead>
        <tbody>
          ${(sale.items || [])
            .map((item) => {
              const effectivePrice =
                item.publicPrice;
              const lineTotal = pricing.afterDiscount(effectivePrice * item.quantity, item.discount || 0);
              return `
            <tr>
              <td>
                ${getDisplayName(item)}${item.isUnit ? '(U)' : ''} 
                <span >[${item.quantity}x${effectivePrice.toFixed(1)}]</span>
              </td>
              <td class="right">${lineTotal.toFixed(2)}</td>
            </tr>`;
            })
            .join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <div class="total-row"><span>SUB</span><span>${(sale.subtotal || 0).toFixed(2)}</span></div>
        ${sale.globalDiscount ? `<div class="total-row"><span>DISC</span><span>-${(((sale.subtotal || 0) * sale.globalDiscount) / 100).toFixed(2)}</span></div>` : ''}
        ${sale.deliveryFee && sale.deliveryFee > 0 ? `<div class="total-row"><span>DEL</span><span>${sale.deliveryFee.toFixed(2)}</span></div>` : ''}
        ${
          sale.tax && sale.tax > 0
            ? `<div class="total-row"><span>${lang === 'AR' ? 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¶ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â©' : 'TAX'}</span><span>${sale.tax.toFixed(2)}</span></div>`
            : ''
        }
        <div class="total-row final"><span>TOT</span><span>${sale.total.toFixed(2)} EGP</span></div>
        
        ${
          sale.hasReturns || (sale.netTotal !== undefined && sale.netTotal < sale.total)
            ? `
        <div style="margin-top: 4px; padding-top: 2px;">
          <div style="text-align: center; margin-bottom: 4px;"><span style="background-color: #000; color: #fff; padding: 2px 8px; border-radius: 2px; display: inline-block;">RETURNS</span></div>
          ${
            sale.itemReturnedQuantities
              ? Object.entries(sale.itemReturnedQuantities)
                  .filter(([_, qty]) => qty > 0)
                  .map(([lineKey, qty]) => {
                    const parts = lineKey.split('_');
                    const drugId = parts[0];
                    const suffix = parts.length > 1 ? parts[1] : null;

                    const item = (sale.items || []).find((it) => {
                      const itDrugId = (it as any).drugId ?? (it as any).drug_id ?? it.id;
                      if (itDrugId !== drugId) return false;
                      if (!suffix) return true;
                      if (suffix === 'unit') return !!it.isUnit;
                      if (suffix === 'pack') return !it.isUnit;
                      return true;
                    });
                    if (!item) return '';
                    const effectivePrice =
                      item.publicPrice;
                    const returnedAmount = pricing.afterDiscount(effectivePrice * qty, item.discount || 0);
                    return `
          <div style="display: flex; justify-content: space-between;  margin: 1px 0;">
            <span>${item.name} x${qty}</span>
            <span>-${returnedAmount.toFixed(2)}</span>
          </div>`;
                  })
                  .join('')
              : ''
          }
          <div class="total-row" style="margin-top: 2px;">
            <span>RET. TOT</span>
            <span>-${(sale.total - (sale.netTotal ?? sale.total)).toFixed(2)}</span>
          </div>
          <div class="total-row final">
            <span>NET</span>
            <span>${(sale.netTotal ?? sale.total).toFixed(2)}</span>
          </div>
        </div>
        `
            : ''
        }
      </div>
      
      <div class="footer">
         ${opts.footerInquiry ? `<div class="${opts.highlightedField === 'footerInquiry' ? 'highlight' : ''}" style="margin-bottom: 2px;">${opts.footerInquiry}</div>` : ''}
         <div class="${opts.highlightedField === 'termsCondition' ? 'highlight' : ''}">${opts.termsCondition ?? currentDefaults.terms.replace(/<br>/g, ' - ')}</div>
         <div style="margin-top: 2px;" class="${opts.highlightedField === 'footerMessage' ? 'highlight' : ''}">${opts.footerMessage || 'THANK YOU'}</div>
      </div>
      
      <div class="barcode-section">
        <svg id="barcode"></svg>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
      <script>
        window.onload = function() { 
          JsBarcode("#barcode", "${sale.serialId || sale.id}", {
            format: "CODE128", lineColor: "#000", width: 1.5, height: 38,
            displayValue: true, fontSize: 16, margin: 2, fontOptions: "bold"
          });
          if (window.location.search.includes('print=true')) setTimeout(() => window.print(), 500);
        }
      </script>
    </body>
    </html>
  `;
}
