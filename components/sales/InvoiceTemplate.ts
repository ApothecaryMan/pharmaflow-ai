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
  /** Language for the receipt */
  language?: 'EN' | 'AR';
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
  
  const headerDetails = {
    EN: {
      name: 'PharmaFlow Pharmacy',
      address: '123 Rasena',
      area: 'Nasr City',
      hotline: '19099'
    },
    AR: {
      name: 'صيدلية فارما فلو',
      address: '١٢٣ رسينا',
      area: 'مدينة نصر',
      hotline: '19099'
    }
  };

  const currentHeader = headerDetails[lang];

  return `
    <!DOCTYPE html>
    <html dir="ltr">
    <head>
      <title>Receipt #${sale.id}</title>
      <style>
        /* Import Fake Receipt font */
        @import url('https://fonts.cdnfonts.com/css/fake-receipt');
        
        /* 79mm Thermal Receipt - ~280px at 72dpi */
        @page { 
          size: 79mm auto; 
          margin: 0; 
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Fake Receipt', 'Courier New', Courier, monospace; 
          font-size: 11px;
          font-weight: normal;
          line-height: 1.3;
          padding: 8px; 
          color: #000; 
          width: 79mm;
          max-width: 79mm;
          margin: 0 auto; 
          background: white; 
        }
        
        .header { text-align: center; margin-bottom: 10px; }
        .store-logo { width: 80px; height: auto; margin: 0 auto 5px auto; display: block; }
        .store-name { margin-bottom: 2px; }
        .store-info { margin-bottom: 2px; }
        .hotline { margin-top: 2px; }
        
        .divider { border-top: 1px dashed #000; margin: 5px 0; border-bottom: none; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
        
        .customer-section { border: 1px dashed #000; padding: 4px; border-radius: 4px; margin: 5px 0; }
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
        <img src="/logo_outline.svg" alt="Logo" class="store-logo" />
        <div class="store-name">${currentHeader.name}</div>
        <div class="store-info" dir="auto">${currentHeader.address}</div>
        <div class="store-info" dir="auto">${currentHeader.area}</div>
        <div class="hotline" dir="ltr">${currentHeader.hotline}</div>
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
        ${sale.customerAddress ? `<div class="customer-detail" dir="rtl" style="unicode-bidi: embed; text-align: center;">${sale.customerAddress}</div>` : ''}
        ${sale.customerStreetAddress ? `<div class="customer-detail" dir="rtl" style="unicode-bidi: embed; text-align: center;">${sale.customerStreetAddress}</div>` : ''}
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
        <div class="total-row final" style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 4px 0;">
          <span>TOTAL</span>
          <span>${sale.total.toFixed(2)}</span>
        </div>
        ${(sale.hasReturns || (sale.netTotal !== undefined && sale.netTotal < sale.total)) ? `
        <div style="margin-top: 8px; padding-top: 4px;">
          ${sale.returnDetails && sale.returnDetails.length > 0 ? 
            sale.returnDetails.map((returnOp, index) => {
              const dateObj = new Date(returnOp.date);
              const formattedDate = dateObj.toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'});
              const formattedTime = dateObj.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true}).toLowerCase();
              const showDateHeader = sale.returnDetails!.length > 1;
              return `
              ${showDateHeader ? `<div style="text-align: center; margin: 8px 0 4px 0;">↩ RETURNS ${formattedTime} - ${formattedDate}</div>` : `<div style="text-align: center; margin-bottom: 4px;">↩ RETURNS</div>`}
              ${returnOp.items.map(item => `
              <div class="total-row" style="color: #c00;">
                <span>↩ ${item.name} (${item.quantity})</span>
                <span>-${item.refundAmount.toFixed(2)}</span>
              </div>
              `).join('')}
              `;
            }).join('')
            : `
            <div style="text-align: center; margin-bottom: 4px;">↩ RETURNS</div>
            ${sale.items.filter(item => sale.itemReturnedQuantities && sale.itemReturnedQuantities[item.id] > 0).map(item => {
              const returnedQty = sale.itemReturnedQuantities![item.id] || 0;
              const effectivePrice = (item.isUnit && item.unitsPerPack) ? item.price / item.unitsPerPack : item.price;
              const discountedPrice = effectivePrice * (1 - (item.discount || 0) / 100);
              const returnAmount = returnedQty * discountedPrice;
              return `
              <div class="total-row" style="color: #c00;">
                <span>↩ ${item.name} (${returnedQty})</span>
                <span>-${returnAmount.toFixed(2)}</span>
              </div>`;
            }).join('')}
            `
          }
          <div class="total-row" style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #000;">
            <span>RETURNED TOTAL</span>
            <span>-${(sale.total - (sale.netTotal ?? sale.total)).toFixed(2)}</span>
          </div>
          <div class="total-row final" style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 4px 0;">
            <span>NET TOTAL</span>
            <span>${(sale.netTotal ?? sale.total).toFixed(2)}</span>
          </div>
        </div>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin: 10px 0 8px 0; line-height: 1.5;">
        ${lang === 'AR' ? `
        <p style="margin: 2px 0;" dir="rtl">ادوية التلاجة ومستحضرات التجميل وشرايط الدواء لا ترجع</p>
        <p style="margin: 2px 0;" dir="rtl">استرجاع الادوية والاجهزة السليمة خلال 14 يوم</p>
        <p style="margin: 2px 0;" dir="rtl">ضمان 30 يوم على الاجهزة</p>
        ` : `
        <p style="margin: 2px 0;">Refrigerated medicines, cosmetics & strips are non-refundable</p>
        <p style="margin: 2px 0;">Medicines & devices refundable within 14 days</p>
        <p style="margin: 2px 0;">30-day warranty on devices</p>
        `}
      </div>
      
      <div class="footer" style="margin-top: 6px; margin-bottom: 6px; line-height: 1.2;">
        <p style="margin: 2px 0;">THANKS FOR CHOOSING ${opts.storeName?.toUpperCase()}</p>
        <p style="margin: 2px 0;">WE HOPE TO SEE YOU AGAIN SOON!!!</p>
        <p style="margin: 2px 0;">TRN ${sale.id.slice(-5).toUpperCase()}</p>
      </div>
      
      <div class="barcode-section" style="margin-top: 4px;">
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
          setTimeout(() => window.print(), 500);
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
