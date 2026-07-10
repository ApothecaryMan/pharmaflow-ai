import type { Sale } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import { INVOICE_DEFAULTS, type InvoiceTemplateOptions } from './InvoiceTemplate';

export function generateLayout4HTML(
  sale: Sale,
  opts: InvoiceTemplateOptions,
  _lang?: string,
  _defaults?: any
): string {
  const lang = opts.language || 'EN';
  const isRTL = lang === 'AR';
  const currentDefaults = INVOICE_DEFAULTS[lang];

  return `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}">
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
          font-size: 11px;
          line-height: 1.2; 
          padding: 4px;
          color: #000; width: 72mm; max-width: 72mm; margin: 0 auto; 
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        
        [dir="rtl"], *[dir="rtl"] { font-size: 1.2em; }
        
        .header { text-align: center; margin-bottom: 6px; }
        .store-logo { width: 40px; height: auto; margin: 0 auto 4px auto; display: block; }
        .store-logo svg { width: 100% !important; height: 100% !important; max-height: 12mm; object-fit: contain; }
        .highlight { outline: 2px dashed #000 !important; background-color: rgba(0, 0, 0, 0.05) !important; border-radius: 4px; }
        .store-name { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
        .store-info { font-size: 10px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        th, td { border: 1px solid #000; padding: 5px; font-size: 10px; vertical-align: middle; }
        .unit-row td { padding-top: 1px !important; padding-bottom: 1px !important; }
        th { font-weight: bold; background-color: transparent; text-align: center; }
        .left { text-align: ${isRTL ? 'right' : 'left'}; }
        .right { text-align: ${isRTL ? 'left' : 'right'}; }
        .center { text-align: center; }
        
        .totals-div { margin-top: 6px; border-top: 1px solid #000; padding-top: 4px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; }
        .final-row { font-weight: bold; font-size: 13px; border-top: 1px solid #000; border-bottom: 1px solid #000; margin-top: 4px; padding: 4px 0; }
        .returns-section { margin-top: 6px; }
        
        .footer { text-align: center; margin: 8px 0; font-size: 9px; }
        .barcode-section { text-align: center; margin-top: 4px; }
        #barcode { width: 100%; max-width: 180px; }
      </style>
    </head>
    <body>
      <div class="header">
        ${
          !opts.hideLogo
            ? opts.logoSvgCode
              ? `<div class="store-logo" style="width: 20mm; overflow: hidden; margin: 0 auto 4px auto;">${opts.logoSvgCode}</div>`
              : opts.logoBase64
                ? `<img src="${opts.logoBase64}" alt="Logo" class="store-logo" />`
                : ``
            : ''
        }
        <div class="store-name ${opts.highlightedField === 'storeName' ? 'highlight' : ''}">${opts.storeName ?? (lang === 'AR' ? 'ZINC' : 'ZINC')}</div>
        ${opts.storeSubtitle ? `<div class="store-info ${opts.highlightedField === 'storeSubtitle' ? 'highlight' : ''}">${opts.storeSubtitle}</div>` : ''}
        <div class="store-info" dir="auto">
          <span class="${opts.highlightedField === 'headerAddress' ? 'highlight' : ''}" style="display: inline-block;">${opts.headerAddress ?? currentDefaults.address}</span> <br/> 
          <span class="${opts.highlightedField === 'headerArea' ? 'highlight' : ''}" style="display: inline-block;">${opts.headerArea ?? currentDefaults.area}</span> <br/> 
          <span class="${opts.highlightedField === 'headerHotline' ? 'highlight' : ''}" style="display: inline-block;">${opts.headerHotline ?? currentDefaults.hotline}</span>
        </div>
      </div>
      
      <!-- Meta Table -->
      <table>
        <tbody>
          <tr>
            <th style="width: 30%;" class="left">${lang === 'AR' ? 'رقم الفاتورة' : 'Inv No'}</th>
            <td class="left">${sale.serialId || sale.id}</td>
          </tr>
          <tr>
            <th class="left">${lang === 'AR' ? 'التاريخ' : 'Date'}</th>
            <td class="left">${new Date(sale.date).toLocaleDateString('en-GB')} ${new Date(sale.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
          </tr>
          <tr>
            <th class="left">${lang === 'AR' ? 'العميل' : 'Customer'}</th>
            <td class="left">${sale.customerName ? sale.customerName : 'GUEST'}</td>
          </tr>
          ${
            sale.saleType === 'delivery'
              ? `
          <tr>
            <th class="left">${lang === 'AR' ? 'توصيل' : 'Delivery'}</th>
            <td class="left" dir="auto">
              ${sale.customerPhone ? `<div dir="ltr"> ${sale.customerPhone}</div>` : ''}
              ${sale.customerAddress ? `<div dir="rtl"> ${sale.customerAddress.replace(/\n/g, ' - ')}</div>` : ''}
              ${sale.customerStreetAddress ? `<div dir="rtl"> ${sale.customerStreetAddress.replace(/\n/g, ' - ')}</div>` : ''}
            </td>
          </tr>
          `
              : ''
          }
        </tbody>
      </table>

      <!-- Items Table -->
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">${lang === 'AR' ? 'الصنف' : 'ITEM'}</th>
            <th style="width: 15%;">${lang === 'AR' ? 'كمية' : 'QTY'}</th>
            <th style="width: 25%;">${lang === 'AR' ? 'سعر' : 'PRICE'}</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
            let grossSubtotal = 0;
            let totalItemDiscounts = 0;

            const rows = (sale.items || [])
              .map((item) => {
                const effectivePrice =
                  item.isUnit && item.unitsPerPack
                    ? item.publicPrice / item.unitsPerPack
                    : item.publicPrice;
                const lineGross = effectivePrice * item.quantity;
                const lineNet = lineGross * (1 - (item.discount || 0) / 100);

                grossSubtotal += lineGross;
                totalItemDiscounts += lineGross - lineNet;

                return `
            <tr class="${item.isUnit ? 'unit-row' : ''}">
              <td dir="ltr" style="text-align: left; font-weight: bold;">
                ${getDisplayName(item)}
              </td>
              <td class="center" dir="ltr">${item.quantity}${item.isUnit ? '<div style="font-size: 8px; line-height: 1; margin-top: -2px;">وحدة</div>' : ''}</td>
              <td class="right" dir="ltr">${lineGross.toFixed(2)}</td>
            </tr>`;
              })
              .join('');

            const globalDiscountAmt = sale.globalDiscount
              ? ((sale.subtotal || 0) * sale.globalDiscount) / 100
              : 0;
            const totalDiscount = totalItemDiscounts + globalDiscountAmt;

            return (
              rows +
              `
        </tbody>
      </table>
      
      <!-- Totals Section (Div-based) -->
        <div class="totals-div">
          <div class="total-row">
            <span>${lang === 'AR' ? 'الإجمالي' : 'Subtotal'}</span>
            <span dir="ltr">${grossSubtotal.toFixed(2)}</span>
          </div>
          ${
            totalDiscount > 0
              ? `
          <div class="total-row">
            <span>${lang === 'AR' ? 'إجمالي الخصم' : 'Total Discount'}</span>
            <span dir="ltr">-${totalDiscount.toFixed(2)}</span>
          </div>`
              : ''
          }
          ${
            sale.deliveryFee && sale.deliveryFee > 0
              ? `
          <div class="total-row">
            <span>${lang === 'AR' ? 'خدمة التوصيل' : 'Delivery Fee'}</span>
            <span dir="ltr">${sale.deliveryFee.toFixed(2)}</span>
          </div>`
              : ''
          }
          ${
            sale.tax && sale.tax > 0
              ? `
          <div class="total-row">
            <span>${lang === 'AR' ? 'الضريبة' : 'Tax'}</span>
            <span dir="ltr">${sale.tax.toFixed(2)}</span>
          </div>`
              : ''
          }
          
          <div class="total-row final-row">
            <span>${lang === 'AR' ? 'الصافي' : 'Total'}</span>
            <span dir="ltr">${sale.total.toFixed(2)} EGP</span>
          </div>
        
        ${
          sale.hasReturns && sale.itemReturnedQuantities
            ? `
        <div class="returns-section">
          <div style="font-weight: bold; margin-bottom: 4px; text-align: center;">
            ${lang === 'AR' ? 'المرتجعات' : 'RETURNS'}
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">${lang === 'AR' ? 'الصنف' : 'ITEM'}</th>
                <th style="width: 15%;">${lang === 'AR' ? 'كمية' : 'QTY'}</th>
                <th style="width: 25%;">${lang === 'AR' ? 'سعر' : 'PRICE'}</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(sale.itemReturnedQuantities)
                .filter(([_, qty]) => (qty as number) > 0)
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
                  const returnedAmount =
                    effectivePrice * (qty as number) * (1 - (item.discount || 0) / 100);
                  return `
                <tr class="${item.isUnit ? 'unit-row' : ''}">
                  <td dir="ltr" style="text-align: left; font-weight: bold;">${getDisplayName(item)}</td>
                  <td class="center" dir="ltr">${qty}${item.isUnit ? '<div style="font-size: 8px; line-height: 1; margin-top: -2px;">وحدة</div>' : ''}</td>
                  <td class="right" dir="ltr">${returnedAmount.toFixed(2)}</td>
                </tr>`;
                })
                .join('')}
            </tbody>
          </table>
          <div class="total-row">
             <span>${lang === 'AR' ? 'إجمالي المرتجعات' : 'Total Returns'}</span>
             <span>-${(sale.total - (sale.netTotal ?? sale.total)).toFixed(2)}</span>
          </div>
          <div class="total-row final-row" style="border-top: none;">
            <span>${lang === 'AR' ? 'الإجمالي النهائي' : 'Net Total'}</span>
            <span>${(sale.netTotal ?? sale.total).toFixed(2)}</span>
          </div>
        </div>
        `
            : sale.hasReturns || (sale.netTotal !== undefined && sale.netTotal < sale.total)
              ? `
        <div class="returns-section">
          <div class="total-row">
            <span>${lang === 'AR' ? 'المرتجعات' : 'Returns'}</span>
            <span>-${(sale.total - (sale.netTotal ?? sale.total)).toFixed(2)}</span>
          </div>
          <div class="total-row final-row" style="border-top: none;">
            <span>${lang === 'AR' ? 'الإجمالي النهائي' : 'Net Total'}</span>
            <span>${(sale.netTotal ?? sale.total).toFixed(2)}</span>
          </div>
        </div>`
              : ''
        }
      </div>`
            );
          })()}
      
      <div class="footer">
         ${opts.footerInquiry ? `<div class="${opts.highlightedField === 'footerInquiry' ? 'highlight' : ''}" style="margin-bottom: 4px;">${opts.footerInquiry}</div>` : ''}
         <div class="${opts.highlightedField === 'termsCondition' ? 'highlight' : ''}">${opts.termsCondition ?? currentDefaults.terms.replace(/<br>/g, ' - ')}</div>
         <div style="margin-top: 4px; font-weight: bold; font-size: 11px;" class="${opts.highlightedField === 'footerMessage' ? 'highlight' : ''}">${opts.footerMessage || 'THANK YOU'}</div>
      </div>
      
      <div class="barcode-section">
        <svg id="barcode"></svg>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
      <script>
        window.onload = function() { 
          JsBarcode("#barcode", "${sale.serialId || sale.id}", {
            format: "CODE128", lineColor: "#000", width: 1.5, height: 40,
            displayValue: true, fontSize: 16, margin: 2, fontOptions: "bold"
          });
          if (window.location.search.includes('print=true')) setTimeout(() => window.print(), 500);
        }
      </script>
    </body>
    </html>
  `;
}
