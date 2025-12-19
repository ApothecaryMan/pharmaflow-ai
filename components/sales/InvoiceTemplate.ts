/**
 * Invoice Template Generator
 * 
 * This module contains the receipt/invoice HTML template generation logic.
 * Used by SalesHistory and other components for printing receipts.
 */

import { Sale, CartItem } from '../../types';

export interface InvoiceTemplateOptions {
  /** Store name to display in header */
  storeName?: string;
  /** Store subtitle/tagline */
  storeSubtitle?: string;
  /** Footer thank you message */
  footerMessage?: string;
  /** Footer inquiry message */
  footerInquiry?: string;
  /** Address Line 1 */
  headerAddress?: string;
  /** Address Line 2 (Area/City) */
  headerArea?: string;
  /** Hotline Number */
  headerHotline?: string;
  /** Terms & Conditions Text */
  termsCondition?: string;
  /** Language for the receipt */
  language?: 'EN' | 'AR';
  /** Base64-encoded logo image (PNG/SVG) */
  logoBase64?: string;
  /** Raw SVG markup for inline logo */
  logoSvgCode?: string;
  /** Font family for receipt text */
  receiptFont?: 'courier' | 'receipt-basic';
  /** Show border box around delivery address */
  showAddressBox?: boolean;
  /** Auto-print on Payment Complete (Any Order) */
  autoPrintOnComplete?: boolean;
  /** Auto-print on Delivery Order Creation */
  autoPrintOnDelivery?: boolean;
}

const defaultOptions: InvoiceTemplateOptions = {
  storeName: 'PharmaFlow',
  storeSubtitle: 'Pharmacy Management System',
  footerMessage: 'Thank you for choosing PharmaFlow.<br>We wish you good health!',
  footerInquiry: 'For inquiries, please keep this receipt.',
  language: 'EN'
};

/**
 * Generates the HTML content for a printable receipt/invoice.
 * 
 * @param sale - The sale object containing all transaction details
 * @param opts - Optional configuration for the template
 * @returns Complete HTML string for the receipt
 */
export function generateInvoiceHTML(sale: Sale, opts: InvoiceTemplateOptions = {}): string {
  const lang = opts.language || 'EN';
  const isRTL = lang === 'AR';
  
  // Default fallbacks if keys are missing but allow empty string if explicitly set?
  // We use || which means empty string falls back to default. 
  // If user wants completely empty, they might need a way, but simple || is safer for now.
  const defaults = {
    EN: {
      address: '123 Rasena',
      area: 'Nasr City',
      hotline: '19099',
      terms: `Refrigerated medicines, cosmetics & strips are non-refundable<br>Medicines & devices refundable within 14 days<br>30-day warranty on devices`
    },
    AR: {
      address: '١٢٣ رسينا',
      area: 'مدينة نصر',
      hotline: '19099',
      terms: `ادوية التلاجة ومستحضرات التجميل وشرايط الدواء لا ترجع<br>استرجاع الادوية والاجهزة السليمة خلال 14 يوم<br>ضمان 30 يوم على الاجهزة`
    }
  };

  const currentDefaults = defaults[lang];

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
        
        /* 79mm Thermal Receipt - ~280px at 72dpi */
        @page { 
          size: 79mm auto; 
          margin: 0; 
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: ${opts.receiptFont === 'receipt-basic' ? "'Receiptional Receipt', 'Raqami', Arial, sans-serif" : "'Fake Receipt', 'Raqami', Arial, sans-serif"}; 
          font-size: ${opts.receiptFont === 'receipt-basic' ? '10px' : '11px'};
          font-weight: normal;
          line-height: ${opts.receiptFont === 'receipt-basic' ? '1.5' : '1.3'};
          padding: 8px; 
          color: #000; 
          width: 79mm;
          max-width: 79mm;
          margin: 0 auto; 
          background: white; 
        }
        
        /* Arabic text specific styling */
        [dir="rtl"], *[dir="rtl"] {
          font-size: 1.1em; /* Make Arabic slightly larger */
        }
        
        .header { text-align: center; margin-bottom: 10px; }
        .store-logo { width: 80px; height: auto; margin: 0 auto 5px auto; display: block; }
        .store-name { margin-bottom: 2px; font-weight: bold; font-size: 14px; }
        .store-info { margin-bottom: 2px; font-size: 10px; }
        .hotline { margin-top: 2px; }
        
        .divider { border-top: 1px dashed #000; margin: 5px 0; border-bottom: none; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
        
        .customer-section { ${opts.showAddressBox !== false ? 'border: 1px dashed #000; padding: 4px; border-radius: 4px;' : ''} margin: 5px 0; }
        .customer-detail { margin-bottom: 2px; }
        
        table { width: 100%; border-collapse: collapse; margin: 5px 0; }
        th { text-align: left; border-bottom: 1px dashed #000; padding-bottom: 2px; }
        td { padding: 2px 0; vertical-align: top; }
        .right { text-align: right; }
        .center { text-align: center; }
        .item-qty { width: 20px; }
        .discount { font-style: italic; color: #444; }
        
        .totals { margin-top: 5px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
        .final { border-top: 1px dashed #000; padding-top: 5px; margin-top: 2px; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 2px; }
        
        .footer { text-align: center; margin-top: 6px; margin-bottom: 6px; line-height: 1.2; }
        .barcode-section { text-align: center; margin-top: 4px; }
        #barcode { width: 100%; max-width: 200px; height: 50px; }
        
        @media print {
          body { width: 79mm; margin: 0; padding: 0 5px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${opts.logoSvgCode 
          ? `<div class="store-logo" style="width: 40mm; max-height: 15mm; overflow: hidden; margin: 0 auto 5px auto;">${opts.logoSvgCode}</div>` 
          : opts.logoBase64 
            ? `<img src="${opts.logoBase64}" alt="Logo" class="store-logo" style="width: 40mm; max-height: 15mm; object-fit: contain;" />`
            : `<img src="/logo_outline.svg" alt="Logo" class="store-logo" />`
        }
        <div class="store-name">${opts.storeName ?? (lang === 'AR' ? 'صيدلية فارما فلو' : 'PharmaFlow Pharmacy')}</div>
        <div class="store-info">${opts.storeSubtitle ?? (lang === 'AR' ? 'نظام إدارة الصيدليات' : 'Pharmacy Management System')}</div>
        <div class="store-info" dir="auto">${opts.headerAddress ?? currentDefaults.address}</div>
        <div class="store-info" dir="auto">${opts.headerArea ?? currentDefaults.area}</div>
        <div class="hotline" dir="ltr">${opts.headerHotline ?? currentDefaults.hotline}</div>
      </div>
      
      <hr class="divider">
      
      <div class="info-row">
        <span>${sale.customerCode ? sale.customerCode : ''} ${sale.customerName || 'Guest'}</span>
        <span>#${sale.dailyOrderNumber || 1}</span>
      </div>
      
      <div class="info-row">
        <span>ORDR ${sale.id}</span>
        <span>${new Date(sale.date).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'})} ${new Date(sale.date).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true})}</span>
      </div>
      
      <hr class="divider">
      <div style="text-align: center; margin: 5px 0;">
        ${sale.saleType === 'delivery' ? 'DELIVERY' : 'WALK-IN'}
      </div>
      ${sale.saleType === 'delivery' && (sale.customerPhone || sale.customerAddress || sale.customerStreetAddress) ? `
      <div class="customer-section" style="text-align: center; margin: 4px 0;">
        ${sale.customerPhone ? `<div class="customer-detail" dir="ltr" style="unicode-bidi: embed;">Tel: ${sale.customerPhone}</div>` : ''}
        ${sale.customerAddress ? `<div class="customer-detail" dir="rtl" style="unicode-bidi: embed; text-align: center;">${sale.customerAddress.replace(/\n/g, '<br>')}</div>` : ''}
        ${sale.customerStreetAddress ? `<div class="customer-detail" dir="rtl" style="unicode-bidi: embed; text-align: center;">${sale.customerStreetAddress.replace(/\n/g, '<br>')}</div>` : ''}
      </div>
      ` : ''}
      <hr class="divider">

      <table>
        <tbody>
          ${sale.items.map(item => {
            const effectivePrice = (item.isUnit && item.unitsPerPack) 
              ? item.price / item.unitsPerPack 
              : item.price;
            const lineTotal = (effectivePrice * item.quantity) * (1 - (item.discount || 0)/100);
              
            return `
            <tr>
              <td colspan="2">${item.name}${item.dosageForm ? ' ' + item.dosageForm : ''}${item.isUnit ? ' (UNIT)' : ''}</td>
              <td class="right">${item.quantity} x ${effectivePrice.toFixed(2)}</td>
            </tr>
            ${item.discount && item.discount > 0 ? `
            <tr>
              <td></td>
              <td class="discount">  -${item.discount}% DISC</td>
              <td class="right">-${(effectivePrice * item.quantity * item.discount / 100).toFixed(2)}</td>
            </tr>
            ` : ''}
          `}).join('')}
        </tbody>
      </table>

      <hr class="divider">
      
      <div class="totals">
        <div class="total-row">
          <span>SUBTOTAL</span>
          <span>${(sale.subtotal || 0).toFixed(2)}</span>
        </div>
        ${sale.globalDiscount ? `
        <div class="total-row">
          <span>DISCOUNT (${sale.globalDiscount}%)</span>
          <span>-${((sale.subtotal || 0) * sale.globalDiscount / 100).toFixed(2)}</span>
        </div>` : ''}
        ${sale.deliveryFee && sale.deliveryFee > 0 ? `
        <div class="total-row">
          <span>DELIVERY</span>
          <span>${sale.deliveryFee.toFixed(2)}</span>
        </div>` : ''}
        <div class="total-row">
          <span>TAX</span>
          <span>0.00</span>
        </div>
        <div class="total-row">
          <span>PAYMENT (${(sale.paymentMethod || 'CASH').toUpperCase()})</span>
          <span>${sale.total.toFixed(2)}</span>
        </div>
        <div class="total-row" style="border-top: 1px dashed #000; padding-top: 5px; margin-top: 2px; border-bottom: 1px dashed #000; padding-bottom: 5px;">
          <span>TOTAL</span>
          <span>${sale.total.toFixed(2)}</span>
        </div>
        ${(sale.hasReturns || (sale.netTotal !== undefined && sale.netTotal < sale.total)) ? `
        <div style="margin-top: 8px; padding-top: 4px;">
          <div style="text-align: center; margin-bottom: 4px;">↩ RETURNS</div>
          ${sale.itemReturnedQuantities ? Object.entries(sale.itemReturnedQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([lineKey, qty]) => {
              // lineKey can be "drugId_index" or just "drugId"
              const parts = lineKey.split('_');
              const drugId = parts[0];
              const index = parts.length > 1 ? parseInt(parts[1]) : 0;
              const item = sale.items.find((it, idx) => it.id === drugId && (parts.length > 1 ? idx === index : true));
              if (!item) return '';
              const effectivePrice = (item.isUnit && item.unitsPerPack) ? item.price / item.unitsPerPack : item.price;
              const returnedAmount = effectivePrice * qty * (1 - (item.discount || 0) / 100);
              return `
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666; margin: 2px 0;">
            <span>${item.name} x${qty}</span>
            <span>-${returnedAmount.toFixed(2)}</span>
          </div>`;
            }).join('') : ''}
          <div class="total-row" style="border-top: 1px dashed #000; padding-top: 5px; margin-top: 4px;">
            <span>RETURNED TOTAL</span>
            <span>-${(sale.total - (sale.netTotal ?? sale.total)).toFixed(2)}</span>
          </div>
          <div class="total-row" style="border-top: 1px dashed #000; padding-top: 5px; margin-top: 2px; border-bottom: 1px dashed #000; padding-bottom: 5px;">
            <span>NET TOTAL</span>
            <span>${(sale.netTotal ?? sale.total).toFixed(2)}</span>
          </div>
        </div>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin: 10px 0 8px 0; line-height: 1.5;">
         ${opts.footerInquiry 
           ? `<p style="margin: 2px 0;">${opts.footerInquiry}</p>`
           : ''}
         <div style="margin-top: 4px;">
           ${opts.termsCondition ?? currentDefaults.terms}
         </div>
      </div>
      
      <div class="footer">
        ${opts.footerMessage 
          ? `<p style="margin: 2px 0;">${opts.footerMessage}</p>`
          : `<p style="margin: 2px 0;">THANKS FOR CHOOSING ${opts.storeName || 'US'}</p>`
        }
      </div>
      
      <div class="barcode-section">
        <svg id="barcode"></svg>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
      <script>
        window.onload = function() { 
          JsBarcode("#barcode", "${sale.id}", {
            format: "CODE39",
            lineColor: "#000",
            width: 2,
            height: 50,
            displayValue: true,
            fontSize: 12,
            margin: 5
          });
          const isPrint = window.location.search.includes('print=true');
          if (isPrint) setTimeout(() => window.print(), 500);
        }
      </script>
    </body>
    </html>
  `;
}

/**
 * Opens a print window with the generated invoice HTML.
 * 
 * @param sale - The sale object to print
 * @param options - Optional template configuration
 */
export function printInvoice(sale: Sale, options: InvoiceTemplateOptions = {}): void {
  const printWindow = window.open('', '', 'width=600,height=800');
  if (!printWindow) return;

  const htmlContent = generateInvoiceHTML(sale, options);
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
