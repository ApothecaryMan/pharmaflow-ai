import { Sale } from '../../types';
import { InvoiceTemplateOptions, INVOICE_DEFAULTS } from './InvoiceTemplate';
import { getDisplayName } from '../../utils/drugDisplayName';

export function generateLayout6HTML(sale: Sale, opts: InvoiceTemplateOptions, _lang?: string, _defaults?: any): string {
  const lang = opts.language || 'EN';
  const isRTL = lang === 'AR';
  const currentDefaults = INVOICE_DEFAULTS[lang];

  return `
    <!DOCTYPE html>
    <html dir="ltr">
    <head>
      <title>Receipt #${sale.id}</title>
      <style>
        /* Local Font Declarations */
        @font-face {
          font-family: 'Fake Receipt';
          src: url('/fonts/fake-receipt.woff') format('woff');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Receiptional Receipt';
          src: url('/fonts/receiptional-receipt.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Raqami';
          src: url('/fonts/Raqami.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
          word-spacing: -2px;
          font-display: swap;
        }
        
        @page { margin: 0; size: 80mm auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          min-height: 100%; height: auto !important; background-color: #ffffff; overflow: visible !important;
        }
        body { 
          font-family: ${opts.receiptFont === 'receipt-basic' ? "'Receiptional Receipt', 'Raqami', Arial, sans-serif" : "'Fake Receipt', 'Raqami', Arial, sans-serif"}; 
          font-size: 10px; /* Clean organized size */
          line-height: 1.2; 
          padding: 4px; /* Clean padding */
          color: #000; width: 72mm; max-width: 72mm; margin: 0 auto; 
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        
        .header { text-align: center; margin-bottom: 8px; }
        .store-logo { width: 35px; height: auto; margin: 0 auto 4px auto; display: block; }
        .store-logo svg { width: 100% !important; height: 100% !important; max-height: 10mm; object-fit: contain; }
        .highlight { outline: 2px dashed #000 !important; background-color: rgba(0, 0, 0, 0.05) !important; border-radius: 4px; }
        .store-name { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
        .store-info { font-size: 9px; color: #333; }
        
        .spacer { height: 8px; }
        
        .meta-info { display: flex; justify-content: space-between; font-size: 9px; margin: 2px 0; }
        
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th { text-align: left; padding-bottom: 4px; font-weight: bold; font-size: 10px; border: none; }
        td { padding: 2px 0; vertical-align: top; border: none; }
        .right { text-align: right; }
        
        .totals { margin-top: 8px; padding-top: 8px; border: none; }
        .total-row { display: flex; justify-content: space-between; padding: 2px 0; border: none; }
        .final { font-weight: bold; font-size: 13px; margin-top: 4px; padding-top: 4px; border: none; }
        
        .footer { text-align: center; margin: 12px 0 8px 0; font-size: 9px; line-height: 1.3; color: #333; }
        .barcode-section { text-align: center; margin-top: 8px; }
        #barcode { width: 100%; max-width: 180px; height: auto; }
      </style>
    </head>
    <body>
      ${
        (opts.logoSvgCode || opts.logoBase64) && !opts.hideLogo
        ? `
        <div class="header" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; text-align: ${isRTL ? 'right' : 'left'};" dir="${isRTL ? 'rtl' : 'ltr'}">
          ${opts.logoSvgCode 
              ? `<div class="store-logo" style="width: 15mm; height: auto; margin: 0; flex-shrink: 0;">${opts.logoSvgCode}</div>` 
              : `<img src="${opts.logoBase64}" alt="Logo" class="store-logo" style="width: 15mm; height: auto; margin: 0; flex-shrink: 0;" />`
          }
          <div style="flex-grow: 1;">
            <div class="store-name ${opts.highlightedField === 'storeName' ? 'highlight' : ''}" style="margin-bottom: 2px;">${opts.storeName ?? (isRTL ? 'ZINC' : 'ZINC')}</div>
            ${opts.storeSubtitle ? `<div class="store-info ${opts.highlightedField === 'storeSubtitle' ? 'highlight' : ''}" style="margin-bottom: 2px; font-weight: bold;">${opts.storeSubtitle}</div>` : ''}
            <div class="store-info" dir="auto"><span class="${opts.highlightedField === 'headerAddress' ? 'highlight' : ''}">${opts.headerAddress ?? currentDefaults.address}</span> | <span class="${opts.highlightedField === 'headerHotline' ? 'highlight' : ''}">${opts.headerHotline ?? currentDefaults.hotline}</span></div>
          </div>
        </div>
        `
        : `
        <div class="header" style="text-align: center; margin-bottom: 8px;">
          <div class="store-name ${opts.highlightedField === 'storeName' ? 'highlight' : ''}" style="margin-bottom: 2px;">${opts.storeName ?? (isRTL ? 'ZINC' : 'ZINC')}</div>
          ${opts.storeSubtitle ? `<div class="store-info ${opts.highlightedField === 'storeSubtitle' ? 'highlight' : ''}" style="margin-bottom: 2px; font-weight: bold;">${opts.storeSubtitle}</div>` : ''}
          <div class="store-info" dir="auto"><span class="${opts.highlightedField === 'headerAddress' ? 'highlight' : ''}">${opts.headerAddress ?? currentDefaults.address}</span> | <span class="${opts.highlightedField === 'headerHotline' ? 'highlight' : ''}">${opts.headerHotline ?? currentDefaults.hotline}</span></div>
        </div>
        `
      }
      
      <div class="spacer"></div>
      
      <div class="meta-info">
        <span>${sale.customerName ? sale.customerName : 'GUEST'}</span>
        <span style="font-weight: bold;">#${sale.dailyOrderNumber || 1}</span>
      </div>
      <div class="meta-info">
        <span>ID:${sale.serialId || sale.id}</span>
        <span>${new Date(sale.date).toLocaleDateString('en-GB')} ${new Date(sale.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
      </div>
      
      ${sale.saleType === 'delivery' ? `
      <div class="spacer"></div>
      <div style="text-align: center; margin: 4px 0;"><span style="background-color: #000; color: #fff; padding: 2px 8px; border-radius: 2px; display: inline-block; font-weight: bold;">${lang === 'AR' ? 'توصيل' : 'DELIVERY'}</span></div>
      ${sale.customerPhone ? `<div dir="ltr" style="text-align: center; font-weight: bold;">${sale.customerPhone}</div>` : ''}
      ${sale.customerAddress ? `<div dir="rtl" style="text-align: center; font-size: 9px;">${sale.customerAddress.replace(/\n/g, ' ')}</div>` : ''}
      ${sale.customerStreetAddress ? `<div dir="rtl" style="text-align: center; font-size: 9px;">${sale.customerStreetAddress.replace(/\n/g, ' ')}</div>` : ''}
      ` : ''}
      
      <div class="spacer"></div>

      <table>
        <thead><tr><th>ITEM</th><th class="right">TOT</th></tr></thead>
        <tbody>
          ${(sale.items || [])
            .map((item) => {
              const effectivePrice = item.isUnit && item.unitsPerPack ? item.publicPrice / item.unitsPerPack : item.publicPrice;
              const lineTotal = effectivePrice * item.quantity * (1 - (item.discount || 0) / 100);
              return `
            <tr>
              <td>
                <div style="font-weight: bold;">${getDisplayName(item)}${item.isUnit ? '(U)' : ''}</div>
                <div style="font-size: 8px; color: #444;">${item.quantity} x ${effectivePrice.toFixed(1)}</div>
              </td>
              <td class="right" style="font-weight: bold;">${lineTotal.toFixed(2)}</td>
            </tr>`;
            }).join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <div class="total-row" style="color: #444;"><span>SUB</span><span>${(sale.subtotal || 0).toFixed(2)}</span></div>
        ${sale.globalDiscount ? `<div class="total-row" style="color: #444;"><span>DISC</span><span>-${(((sale.subtotal || 0) * sale.globalDiscount) / 100).toFixed(2)}</span></div>` : ''}
        ${sale.deliveryFee && sale.deliveryFee > 0 ? `<div class="total-row" style="color: #444;"><span>DEL</span><span>${sale.deliveryFee.toFixed(2)}</span></div>` : ''}
        ${
          sale.tax && sale.tax > 0
            ? `<div class="total-row" style="color: #444;"><span>${lang === 'AR' ? 'الضريبة' : 'TAX'}</span><span>${sale.tax.toFixed(2)}</span></div>`
            : ''
        }
        <div class="total-row final"><span>TOTAL</span><span>${sale.total.toFixed(2)} EGP</span></div>
        
        ${
          sale.hasReturns || (sale.netTotal !== undefined && sale.netTotal < sale.total)
            ? `
        <div class="spacer"></div>
        <div style="text-align: center; margin-bottom: 8px;"><span style="background-color: #000; color: #fff; padding: 2px 8px; border-radius: 2px; display: inline-block; font-weight: bold;">${lang === 'AR' ? 'المرتجعات' : 'RETURNS'}</span></div>
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
                  const effectivePrice = item.isUnit && item.unitsPerPack ? item.publicPrice / item.unitsPerPack : item.publicPrice;
                  const returnedAmount = effectivePrice * qty * (1 - (item.discount || 0) / 100);
                  return `
        <div style="display: flex; justify-content: space-between; font-size: 9px; margin: 2px 0;">
          <span>${item.name} x${qty}</span>
          <span>-${returnedAmount.toFixed(2)}</span>
        </div>`;
                })
                .join('')
            : ''
        }
        <div class="spacer"></div>
        <div class="total-row" style="color: #444;">
          <span>RET. TOT</span>
          <span>-${(sale.total - (sale.netTotal ?? sale.total)).toFixed(2)}</span>
        </div>
        <div class="total-row final">
          <span>NET TOTAL</span>
          <span>${(sale.netTotal ?? sale.total).toFixed(2)}</span>
        </div>
        `
            : ''
        }
      </div>
      
      <div class="footer">
         ${opts.footerInquiry ? `<div class="${opts.highlightedField === 'footerInquiry' ? 'highlight' : ''}" style="margin-bottom: 4px;">${opts.footerInquiry}</div>` : ''}
         <div class="${opts.highlightedField === 'termsCondition' ? 'highlight' : ''}">${opts.termsCondition ?? currentDefaults.terms.replace(/<br>/g, ' - ')}</div>
         <div style="margin-top: 4px; font-weight: bold;" class="${opts.highlightedField === 'footerMessage' ? 'highlight' : ''}">${opts.footerMessage || 'THANK YOU'}</div>
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
