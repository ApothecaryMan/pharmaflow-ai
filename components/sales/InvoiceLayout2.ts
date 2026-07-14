import type { Sale } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import { INVOICE_DEFAULTS, type InvoiceTemplateOptions } from './InvoiceTemplate';

export function generateLayout2HTML(
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
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
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
          font-size: ${opts.receiptFont === 'receipt-basic' ? '11px' : '12px'};
          line-height: 1.3; padding: 8px; color: #000; width: 72mm; max-width: 72mm; margin: 0 auto; 
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        
        [dir="rtl"], *[dir="rtl"] { font-size: 1.1em; }
        
        /* Modern Bordered Header */
        .header { 
          background: #fff; color: #000; padding: 12px; border: 2px solid #000; border-radius: 8px; 
          text-align: center; margin-bottom: 12px; 
        }
        .highlight { outline: 2px dashed #000 !important; background-color: rgba(0, 0, 0, 0.05) !important; border-radius: 4px; }
        
        .store-logo { width: 60px; height: auto; margin: 0 auto 5px auto; display: block; }
        .store-logo svg { width: 100% !important; height: 100% !important; max-height: 15mm; object-fit: contain; }
        
        .store-name { margin-bottom: 4px; font-weight: bold; font-size: 16px; letter-spacing: 1px; }
        .store-info { margin-bottom: 2px; font-size: 10px; opacity: 0.9; }
        
        .section-box { border: 2px solid #000; border-radius: 6px; padding: 6px; margin: 8px 0; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-weight: bold; }
        
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th { text-align: left; border-bottom: 2px solid #000; padding-bottom: 4px; text-transform: uppercase; font-size: 10px; }
        td { padding: 4px 0; vertical-align: top; }
        
        .right { text-align: right; }
        
        .totals { margin-top: 10px; padding: 8px; border: 2px solid #000; border-radius: 6px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
        .final { 
          background: #000; color: #fff; font-size: 14px; font-weight: bold; 
          padding: 6px; border-radius: 4px; margin-top: 6px; 
        }
        
        .footer { text-align: center; margin-top: 12px; line-height: 1.4; font-weight: bold; font-size: 11px; }
        .barcode-section { text-align: center; margin-top: 12px; }
        #barcode { width: 100%; max-width: 220px; }
      </style>
    </head>
    <body>
      <div class="header">
        ${
          !opts.hideLogo
            ? opts.logoSvgCode
              ? `<div class="store-logo" style="width: 30mm; max-height: 15mm; overflow: hidden; margin: 0 auto 5px auto;">${opts.logoSvgCode}</div>`
              : opts.logoBase64
                ? `<img src="${opts.logoBase64}" alt="Logo" class="store-logo" />`
                : `<img src="/app_icon.svg" alt="Logo" class="store-logo" />`
            : ''
        }
        <div class="store-name ${opts.highlightedField === 'storeName' ? 'highlight' : ''}">${opts.storeName ?? (lang === 'AR' ? 'ZINC' : 'ZINC')}</div>
        <div class="store-info ${opts.highlightedField === 'storeSubtitle' ? 'highlight' : ''}">${opts.storeSubtitle ?? (lang === 'AR' ? 'نظام إدارة الصيدليات' : 'Pharmacy Management System')}</div>
        <div class="store-info ${opts.highlightedField === 'headerAddress' ? 'highlight' : ''}" dir="auto">${opts.headerAddress ?? currentDefaults.address}</div>
        <div class="store-info ${opts.highlightedField === 'headerArea' ? 'highlight' : ''}" dir="auto">${opts.headerArea ?? currentDefaults.area}</div>
        <div class="store-info ${opts.highlightedField === 'headerHotline' ? 'highlight' : ''}" dir="ltr" style="font-weight: bold; font-size: 12px; margin-top: 4px;">${opts.headerHotline ?? currentDefaults.hotline}</div>
      </div>
      
      <div class="section-box">
        <div class="info-row">
          <span>${sale.customerName ? (sale.customerCode ? `${sale.customerCode} ` : '') + sale.customerName : 'GUEST'}</span>
          <span>#${sale.dailyOrderNumber || 1}</span>
        </div>
        <div class="info-row" style="font-size: 10px; font-weight: normal;">
          <span>ID: ${sale.serialId || sale.id}</span>
          <span>${new Date(sale.date).toLocaleDateString('en-GB')} ${new Date(sale.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
        </div>
        ${
          sale.saleType !== 'delivery'
            ? `
        <div style="text-align: center; margin-top: 4px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px;">
          WALK-IN
        </div>`
            : ''
        }
      </div>

      ${
        sale.saleType === 'delivery'
          ? `
      <div class="section-box" style="text-align: center;">
        <div style="font-weight: bold; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #000;">DELIVERY</div>
        ${sale.customerPhone ? `<div dir="ltr" style="font-weight: bold; font-size: 12px;">TEL: ${sale.customerPhone}</div>` : ''}
        ${sale.customerAddress ? `<div dir="rtl" style="margin-top: 4px;">${sale.customerAddress.replace(/\n/g, '<br>')}</div>` : ''}
        ${sale.customerStreetAddress ? `<div dir="rtl" style="margin-top: 2px;">${sale.customerStreetAddress.replace(/\n/g, '<br>')}</div>` : ''}
      </div>
      `
          : ''
      }

      <table>
        <thead>
          <tr>
            <th colspan="2">ITEM</th>
            <th class="right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${(sale.items || [])
            .map((item) => {
              const effectivePrice =
                item.isUnit && item.unitsPerPack
                  ? item.publicPrice / item.unitsPerPack
                  : item.publicPrice;
              const lineTotal = effectivePrice * item.quantity * (1 - (item.discount || 0) / 100);

              return `
            <tr>
              <td colspan="2">
                <div style="font-weight: bold;">${getDisplayName(item)}${item.isUnit ? ' (U)' : ''}</div>
                <div style="font-size: 10px; opacity: 0.8;">
                  ${item.quantity} x ${effectivePrice.toFixed(2)}
                  ${item.discount && item.discount > 0 ? `<span style="font-style: italic; margin-left: 4px;">(-${item.discount}%)</span>` : ''}
                </div>
              </td>
              <td class="right" style="vertical-align: middle; font-weight: bold; font-size: 12px;">
                ${lineTotal.toFixed(2)}
              </td>
            </tr>
          `;
            })
            .join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <div class="total-row">
          <span>SUBTOTAL</span>
          <span>${(sale.subtotal || 0).toFixed(2)}</span>
        </div>
        ${
          sale.globalDiscount
            ? `<div class="total-row">
                <span>DISCOUNT (${sale.globalDiscount}%)</span>
                <span>-${(((sale.subtotal || 0) * sale.globalDiscount) / 100).toFixed(2)}</span>
              </div>`
            : ''
        }
        ${
          sale.deliveryFee && sale.deliveryFee > 0
            ? `<div class="total-row"><span>DELIVERY</span><span>${sale.deliveryFee.toFixed(2)}</span></div>`
            : ''
        }
        ${
          sale.tax && sale.tax > 0
            ? `
        <div class="total-row">
          <span>TAX</span>
          <span>${sale.tax.toFixed(2)}</span>
        </div>`
            : ''
        }
        <div class="total-row final">
          <span>TOTAL</span>
          <span>${sale.total.toFixed(2)} EGP</span>
        </div>
        
        ${
          sale.hasReturns || (sale.netTotal !== undefined && sale.netTotal < sale.total)
            ? `
        <div style="margin-top: 8px; padding-top: 6px; border-top: 2px solid #000;">
          <div style="text-align: center; font-weight: bold; margin-bottom: 4px;">RETURNS</div>
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
                      item.isUnit && item.unitsPerPack
                        ? item.publicPrice / item.unitsPerPack
                        : item.publicPrice;
                    const returnedAmount = effectivePrice * qty * (1 - (item.discount || 0) / 100);
                    return `
          <div style="display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0;">
            <span>${item.name} x${qty}</span>
            <span>-${returnedAmount.toFixed(2)}</span>
          </div>`;
                  })
                  .join('')
              : ''
          }
          <div class="total-row" style="margin-top: 6px;">
            <span>RETURNED TOTAL</span>
            <span>-${(sale.total - (sale.netTotal ?? sale.total)).toFixed(2)}</span>
          </div>
          <div class="total-row final" style="margin-top: 4px; background: #333;">
            <span>NET TOTAL</span>
            <span>${(sale.netTotal ?? sale.total).toFixed(2)}</span>
          </div>
        </div>
        `
            : ''
        }
      </div>
      
      <div style="text-align: center; margin: 12px 0 8px 0; font-size: 10px;">
         ${opts.footerInquiry ? `<div class="${opts.highlightedField === 'footerInquiry' ? 'highlight' : ''}" style="margin-bottom: 4px; font-weight: bold;">${opts.footerInquiry}</div>` : ''}
         <div class="${opts.highlightedField === 'termsCondition' ? 'highlight' : ''}">
           ${opts.termsCondition ?? currentDefaults.terms}
         </div>
      </div>
      
      <div class="footer">
        <div class="${opts.highlightedField === 'footerMessage' ? 'highlight' : ''}">${opts.footerMessage || `THANKS FOR CHOOSING ${opts.storeName || 'US'}`}</div>
      </div>
      
      <div class="barcode-section">
        <svg id="barcode"></svg>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
      <script>
        window.onload = function() { 
          JsBarcode("#barcode", "${sale.serialId || sale.id}", {
            format: "CODE128",
            lineColor: "#000",
            width: 2,
            height: 45,
            displayValue: true,
            fontSize: 16,
            margin: 5,
            fontOptions: "bold"
          });
          if (window.location.search.includes('print=true')) setTimeout(() => window.print(), 500);
        }
      </script>
    </body>
    </html>
  `;
}
