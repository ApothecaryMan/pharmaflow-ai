import { Sale } from '../../types';
import { InvoiceTemplateOptions, INVOICE_DEFAULTS } from './InvoiceTemplate';
import { getDisplayName } from '../../utils/drugDisplayName';

export function generateLayout5HTML(sale: Sale, opts: InvoiceTemplateOptions, _lang?: string, _defaults?: any): string {
  const lang = opts.language || 'EN';
  const isRTL = lang === 'AR';
  const currentDefaults = INVOICE_DEFAULTS[lang];

  return `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}">
    <head>
      <title>Receipt #${sale.id}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        @page { margin: 0; size: 80mm auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          min-height: 100%; height: auto !important; background-color: #ffffff; overflow: visible !important;
        }
        body { 
          font-family: 'Outfit', 'Cairo', sans-serif; 
          font-size: 11px;
          line-height: 1.4; 
          padding: 8px;
          color: #000; width: 72mm; max-width: 72mm; margin: 0 auto; 
          background: white; 
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        
        /* Typography */
        h1, h2, h3, h4, h5, h6, th, .bold { font-weight: 700; }
        [dir="rtl"], *[dir="rtl"] { font-size: 1.15em; }
        
        .header { text-align: center; margin-bottom: 8px; }
        .store-logo { width: 40px; height: auto; margin: 0 auto 6px auto; display: block; }
        .store-logo svg { width: 100% !important; height: 100% !important; max-height: 12mm; object-fit: contain; }
        .highlight { outline: 2px dashed #000 !important; background-color: rgba(0, 0, 0, 0.05) !important; border-radius: 4px; }
        .store-name { font-size: 16px; letter-spacing: 0.5px; margin-bottom: 2px; }
        .store-info { font-size: 10px; color: #000; }
        
        .meta-section { margin-bottom: 10px; padding: 6px; border: 1px solid #000; font-size: 10px; }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .meta-label { font-weight: 600; color: #000; }
        .meta-value { font-weight: 700; }
        
        .delivery-box { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #000; }
        .delivery-text { font-size: 11px; margin-top: 2px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000; }
        th { border: 1px solid #000; padding: 4px; text-transform: uppercase; font-size: 9px; color: #000; }
        td { border: 1px solid #000; padding: 6px; vertical-align: middle; }
        .unit-row td { padding-top: 1px !important; padding-bottom: 1px !important; }
        
        .left { text-align: left !important; }
        .right { text-align: right !important; }
        .center { text-align: center; }
        
        .item-name { font-weight: 600; font-size: 11px; display: block; margin-bottom: 2px; }
        
        .totals-section { margin-top: 8px; padding-top: 6px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
        .final-row { font-weight: 700; font-size: 14px; margin-top: 6px; padding: 6px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
        
        .footer { text-align: center; margin: 12px 0; font-size: 9.5px; color: #000; }
        .footer-thanks { font-weight: 700; font-size: 12px; color: #000; margin-bottom: 4px; letter-spacing: 0.5px; }
        
        .barcode-section { text-align: center; margin-top: 8px; }
        #barcode { width: 100%; max-width: 200px; }
      </style>
    </head>
    <body>
      <div class="header">
        ${
          !opts.hideLogo ? (
            opts.logoSvgCode
              ? `<div class="store-logo" style="width: 22mm; overflow: hidden; margin: 0 auto 6px auto;">${opts.logoSvgCode}</div>`
              : opts.logoBase64
                ? `<img src="${opts.logoBase64}" alt="Logo" class="store-logo" />`
                : ``
          ) : ''
        }
        <div class="store-name bold ${opts.highlightedField === 'storeName' ? 'highlight' : ''}">${opts.storeName ?? (lang === 'AR' ? 'ZINC' : 'ZINC')}</div>
        ${opts.storeSubtitle ? `<div class="store-info bold ${opts.highlightedField === 'storeSubtitle' ? 'highlight' : ''}">${opts.storeSubtitle}</div>` : ''}
        <div class="store-info" dir="auto">
          <span class="${opts.highlightedField === 'headerAddress' ? 'highlight' : ''}">${opts.headerAddress ?? currentDefaults.address}</span> - 
          <span class="${opts.highlightedField === 'headerArea' ? 'highlight' : ''}">${opts.headerArea ?? currentDefaults.area}</span> <br/> 
          <span class="${opts.highlightedField === 'headerHotline' ? 'highlight' : ''}" style="display: inline-block;">${opts.headerHotline ?? currentDefaults.hotline}</span>
        </div>
      </div>
      
      <div class="meta-section">
        <div class="meta-row">
          <span class="meta-label">${lang === 'AR' ? 'رقم الفاتورة' : 'Invoice No'}</span>
          <span class="meta-value">${sale.serialId || sale.id}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">${lang === 'AR' ? 'التاريخ' : 'Date'}</span>
          <span class="meta-value">${new Date(sale.date).toLocaleDateString('en-GB')} ${new Date(sale.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">${lang === 'AR' ? 'العميل' : 'Customer'}</span>
          <span class="meta-value">${sale.customerName ? sale.customerName : (lang === 'AR' ? 'عميل نقدي' : 'GUEST')}</span>
        </div>
        
        ${sale.saleType === 'delivery' ? `
        <div class="delivery-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <div class="meta-label" style="margin-bottom: 0;">${lang === 'AR' ? 'توصيل' : 'Delivery'}</div>
            ${sale.customerPhone ? `<div class="delivery-text bold" dir="ltr" style="margin-bottom: 0; font-size: 11px;">${sale.customerPhone}</div>` : ''}
          </div>
          ${sale.customerAddress ? `<div class="delivery-text" dir="rtl">${sale.customerAddress.replace(/\n/g, ' - ')}</div>` : ''}
          ${sale.customerStreetAddress ? `<div class="delivery-text" dir="rtl">${sale.customerStreetAddress.replace(/\n/g, ' - ')}</div>` : ''}
        </div>
        ` : ''}
      </div>

      <table>
        <tbody>
          ${(() => {
            let grossSubtotal = 0;
            let totalItemDiscounts = 0;
            
            const rows = (sale.items || []).map((item) => {
              const effectivePrice = item.isUnit && item.unitsPerPack ? item.publicPrice / item.unitsPerPack : item.publicPrice;
              const lineGross = effectivePrice * item.quantity;
              const lineNet = lineGross * (1 - (item.discount || 0) / 100);
              
              grossSubtotal += lineGross;
              totalItemDiscounts += (lineGross - lineNet);
              
              return `
            <tr class="${item.isUnit ? 'unit-row' : ''}">
              <td class="left" dir="ltr">
                <span class="item-name">${getDisplayName(item)}</span>
              </td>
              <td class="center bold" style="font-size: 12px; vertical-align: middle;">${item.quantity}${item.isUnit ? '<div style="font-size: 8px; line-height: 1; margin-top: -2px;">وحدة</div>' : ''}</td>
              <td class="left bold" style="vertical-align: middle;">${lineGross.toFixed(2)}</td>
            </tr>`;
            }).join('');
            
            const globalDiscountAmt = sale.globalDiscount ? ((sale.subtotal || 0) * sale.globalDiscount / 100) : 0;
            const totalDiscount = totalItemDiscounts + globalDiscountAmt;
            
            return rows + `
        </tbody>
      </table>
      
      <div class="totals-section">
        <div class="total-row">
          <span class="meta-label">${lang === 'AR' ? 'المجموع الفرعي' : 'Subtotal'}</span>
          <span class="meta-value">${grossSubtotal.toFixed(2)}</span>
        </div>
        ${totalDiscount > 0 ? `
        <div class="total-row">
          <span class="meta-label">${lang === 'AR' ? 'إجمالي الخصم' : 'Total Discount'}</span>
          <span class="meta-value">-${totalDiscount.toFixed(2)}</span>
        </div>` : ''}
        ${sale.deliveryFee && sale.deliveryFee > 0 ? `
        <div class="total-row">
          <span class="meta-label">${lang === 'AR' ? 'خدمة التوصيل' : 'Delivery Fee'}</span>
          <span class="meta-value">${sale.deliveryFee.toFixed(2)}</span>
        </div>` : ''}
        ${
          sale.tax && sale.tax > 0 ? `
        <div class="total-row">
          <span class="meta-label">${lang === 'AR' ? 'الضريبة' : 'Tax'}</span>
          <span class="meta-value">${sale.tax.toFixed(2)}</span>
        </div>` : ''
        }
        
        <div class="total-row final-row">
          <span>${lang === 'AR' ? 'الإجمالي المطلوب' : 'TOTAL'}</span>
          <span>${sale.total.toFixed(2)} EGP</span>
        </div>
        
        ${sale.hasReturns && sale.itemReturnedQuantities ? `
        <div style="margin-top: 4px;">
          <div style="font-weight: 700; margin-bottom: 4px; text-align: center; font-size: 11px;">
            ${lang === 'AR' ? 'المرتجعات' : 'RETURNS'}
          </div>
          <table>
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
                    const effectivePrice = item.isUnit && item.unitsPerPack ? item.publicPrice / item.unitsPerPack : item.publicPrice;
                    const returnedAmount = effectivePrice * (qty as number) * (1 - (item.discount || 0) / 100);
                    return `
                <tr class="${item.isUnit ? 'unit-row' : ''}">
                  <td class="left" dir="ltr"><span class="item-name">${getDisplayName(item)}</span></td>
                  <td class="center bold" style="font-size: 12px; vertical-align: middle;">${qty}${item.isUnit ? '<div style="font-size: 8px; line-height: 1; margin-top: -2px;">وحدة</div>' : ''}</td>
                  <td class="left bold" style="vertical-align: middle;">${returnedAmount.toFixed(2)}</td>
                </tr>`;
                  }).join('')}
            </tbody>
          </table>
          <div class="total-row">
             <span class="meta-label">${lang === 'AR' ? 'إجمالي المرتجعات' : 'Total Returns'}</span>
             <span class="meta-value">-${(sale.total - (sale.netTotal ?? sale.total)).toFixed(2)}</span>
          </div>
          <div class="total-row final-row" style="margin-top: 2px;">
            <span>${lang === 'AR' ? 'الصافي بعد المرتجع' : 'FINAL TOTAL'}</span>
            <span>${(sale.netTotal ?? sale.total).toFixed(2)}</span>
          </div>
        </div>
        ` : sale.hasReturns || (sale.netTotal !== undefined && sale.netTotal < sale.total)
            ? `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #000;">
          <div class="total-row">
            <span class="meta-label">${lang === 'AR' ? 'المرتجعات' : 'Returns'}</span>
            <span class="meta-value">-${(sale.total - (sale.netTotal ?? sale.total)).toFixed(2)}</span>
          </div>
          <div class="total-row final-row" style="margin-top: 2px;">
            <span>${lang === 'AR' ? 'الصافي بعد المرتجع' : 'FINAL TOTAL'}</span>
            <span>${(sale.netTotal ?? sale.total).toFixed(2)}</span>
          </div>
        </div>`
            : ''
        }
      </div>`;
          })()}
      
      <div class="footer">
         ${opts.footerInquiry ? `<div class="${opts.highlightedField === 'footerInquiry' ? 'highlight' : ''}" style="margin-bottom: 4px;">${opts.footerInquiry}</div>` : ''}
         <div class="footer-thanks ${opts.highlightedField === 'footerMessage' ? 'highlight' : ''}">${opts.footerMessage || (lang === 'AR' ? 'شكراً لزيارتكم' : 'THANK YOU FOR VISITING')}</div>
         <div class="${opts.highlightedField === 'termsCondition' ? 'highlight' : ''}">${opts.termsCondition ?? currentDefaults.terms.replace(/<br>/g, ' - ')}</div>
      </div>
      
      <div class="barcode-section">
        <svg id="barcode"></svg>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
      <script>
        window.onload = function() { 
          JsBarcode("#barcode", "${sale.serialId || sale.id}", {
            format: "CODE128", lineColor: "#000", width: 1.5, height: 35,
            displayValue: true, fontSize: 16, margin: 0, fontOptions: "bold"
          });
        }
      </script>
    </body>
    </html>
  `;
}
