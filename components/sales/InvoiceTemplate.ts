/**
 * Invoice Template Generator
 *
 * This module contains the receipt/invoice HTML template generation logic.
 * Used by SalesHistory and other components for printing receipts.
 */

import { StorageKeys } from '../../config/storageKeys';
import type { Sale } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import { printDocument } from '../../utils/printing';
import { getReceiptFontsCSS } from '../../utils/printing';
import { generateLayout2HTML } from './InvoiceLayout2';
import { generateLayout3HTML } from './InvoiceLayout3';
import { generateLayout4HTML } from './InvoiceLayout4';
import { generateLayout5HTML } from './InvoiceLayout5';
import { generateLayout6HTML } from './InvoiceLayout6';
import { pricing } from '../../utils/money';

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
  /** Hide the logo when printing */
  hideLogo?: boolean;
  /** Auto-print on Payment Complete (Any Order) */
  autoPrintOnComplete?: boolean;
  /** Auto-print on Delivery Order Creation */
  autoPrintOnDelivery?: boolean;
  /** ID of the field currently focused in the designer, for preview highlighting */
  highlightedField?: string;
  /** Selected layout */
  receiptLayout?: 'layout-1' | 'layout-2' | 'layout-3' | 'layout-4' | 'layout-5' | 'layout-6';
}

export const defaultOptions: InvoiceTemplateOptions = {
  storeName: 'ZINC',
  storeSubtitle: 'Pharmacy Management System',
  footerMessage: 'Thank you for choosing Zinc.<br>We wish you good health!',
  footerInquiry: 'For inquiries, please keep this receipt.',
  language: 'EN',
};

/**
 * Helper to fetch the active receipt template and its options from printSettings.
 */
export function getActiveReceiptSettings(
  printSettings?: Record<string, any>
): InvoiceTemplateOptions {
  try {
    const templates = printSettings?.[StorageKeys.RECEIPT_TEMPLATES] || [];
    const activeId = printSettings?.[StorageKeys.RECEIPT_ACTIVE_TEMPLATE_ID] || null;

    const activeTemplate =
      templates.find((t: any) => t.id === activeId) ||
      templates.find((t: any) => t.isDefault) ||
      templates[0];

    if (activeTemplate?.options) {
      return { ...defaultOptions, ...activeTemplate.options };
    }
  } catch (e) {
    console.error('Failed to load active receipt settings', e);
  }
  return defaultOptions;
}

export const INVOICE_DEFAULTS = {
  EN: {
    address: '123 Abu Hamous',
    area: 'Beheira',
    hotline: '19099',
    terms: `Refrigerated medicines, cosmetics & strips are non-refundable<br>Medicines & devices refundable within 14 days<br>30-day warranty on devices`,
  },
  AR: {
    address: 'Ãƒâ„¢Ã‚Â¡Ãƒâ„¢Ã‚Â¢Ãƒâ„¢Ã‚Â£ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Âµ',
    area: 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â±ÃƒËœÃ‚Â©',
    hotline: '19099',
    terms: `ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â© Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­ÃƒËœÃ‚Â¶ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â· ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¹<br>ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â²ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â®Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ 14 Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦<br>ÃƒËœÃ‚Â¶Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â  30 Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â²ÃƒËœÃ‚Â©`,
  },
};

/**
 * Generates the HTML content for a printable receipt/invoice.
 *
 * @param sale - The sale object containing all transaction details
 * @param opts - Optional configuration for the template
 * @returns Complete HTML string for the receipt
 */
export function generateLayout1HTML(
  sale: Sale,
  opts: InvoiceTemplateOptions,
  _lang?: string,
  _defaults?: any
): string {
  const lang = opts.language || 'EN';
  const _isRTL = lang === 'AR';

  // Default fallbacks if keys are missing but allow empty string if explicitly set?
  // We use || which means empty string falls back to default.
  // If user wants completely empty, they might need a way, but simple || is safer for now.
  const currentDefaults = INVOICE_DEFAULTS[lang];

  return `
    <!DOCTYPE html>
    <html dir="ltr">
    <head>
      <title>Receipt #${sale.id}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <style>
        /* Embedded Font Declarations */
        ${getReceiptFontsCSS()}
        
        /* 80mm Thermal Receipt - ~300px at 72dpi */
        @page { 
          margin: 0; 
          size: 80mm auto;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          height: auto !important;
          background-color: #ffffff;
          overflow: visible !important;
        }
        body { 
          font-family: ${opts.receiptFont === 'receipt-basic' ? "'Receiptional Receipt', 'Raqami', Arial, sans-serif" : "'Fake Receipt', 'Raqami', Arial, sans-serif"}; 
          font-size: ${opts.receiptFont === 'receipt-basic' ? '10px' : '11px'};
          font-weight: normal;
          line-height: ${opts.receiptFont === 'receipt-basic' ? '1.5' : '1.3'};
          padding: 8px; 
          color: #000; 
          width: 72mm;
          max-width: 72mm;
          margin: 0 auto; 
          background: white; 
          -webkit-print-color-adjust: exact;
        }
        
        /* Arabic text specific styling */
        [dir="rtl"], *[dir="rtl"] {
          font-size: 1.1em; /* Make Arabic slightly larger */
        }
        
        .header { text-align: center; margin-bottom: 10px; }
        .store-logo { width: 80px; height: auto; margin: 0 auto 5px auto; display: block; }
        .store-logo svg { width: 100% !important; height: 100% !important; max-height: 15mm; object-fit: contain; }
        .highlight { outline: 2px dashed #000 !important; background-color: rgba(0, 0, 0, 0.05) !important; border-radius: 4px; }
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
        .discount { font-style: italic; color: #000; }
        
        .totals { margin-top: 5px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
        .final { border-top: 1px dashed #000; padding-top: 5px; margin-top: 2px; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 2px; }
        
        .footer { text-align: center; margin-top: 6px; margin-bottom: 6px; line-height: 1.2; }
        .barcode-section { text-align: center; margin-top: 4px; }
        #barcode { width: 100%; max-width: 200px; height: auto; }
        
        @media print {
          body { width: 72mm; margin: 0; padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${
          !opts.hideLogo
            ? opts.logoSvgCode
              ? `<div class="store-logo" style="width: 40mm; max-height: 15mm; overflow: hidden; margin: 0 auto 5px auto;">${opts.logoSvgCode}</div>`
              : opts.logoBase64
                ? `<img src="${opts.logoBase64}" alt="Logo" class="store-logo" style="width: 40mm; max-height: 15mm; object-fit: contain;" />`
                : `<img src="/app_icon.svg" alt="Logo" class="store-logo" style="width: 60px;" />`
            : ''
        }
        <div class="store-name ${opts.highlightedField === 'storeName' ? 'highlight' : ''}">${opts.storeName ?? (lang === 'AR' ? 'ZINC' : 'ZINC')}</div>
        <div class="store-info ${opts.highlightedField === 'storeSubtitle' ? 'highlight' : ''}">${opts.storeSubtitle ?? (lang === 'AR' ? 'Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¸ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒâ„¢Ã…Â ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª' : 'Pharmacy Management System')}</div>
        <div class="store-info ${opts.highlightedField === 'headerAddress' ? 'highlight' : ''}" dir="auto">${opts.headerAddress ?? currentDefaults.address}</div>
        <div class="store-info ${opts.highlightedField === 'headerArea' ? 'highlight' : ''}" dir="auto">${opts.headerArea ?? currentDefaults.area}</div>
        <div class="hotline ${opts.highlightedField === 'headerHotline' ? 'highlight' : ''}" dir="ltr">${opts.headerHotline ?? currentDefaults.hotline}</div>
      </div>
      
      <hr class="divider">
      
      <div class="info-row">
        <span>${sale.customerCode ? sale.customerCode : ''} ${sale.customerName || 'Guest'}${(sale as any).isTemporaryInfo ? ' *' : ''}</span>
        <span>#${sale.dailyOrderNumber || 1}</span>
      </div>
      
      <div class="info-row">
        <span>ORDR ${sale.serialId || sale.id}</span>
        <span>${new Date(sale.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(sale.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
      </div>
      
      <hr class="divider">
      <div style="text-align: center; margin: 5px 0;">
        ${sale.saleType === 'delivery' ? 'DELIVERY' : 'WALK-IN'}
      </div>
      ${
        sale.saleType === 'delivery' &&
        (sale.customerPhone || sale.customerAddress || sale.customerStreetAddress)
          ? `
      <div class="customer-section" style="text-align: center; margin: 4px 0;">
        ${sale.customerPhone ? `<div class="customer-detail" dir="ltr" style="unicode-bidi: embed;">Tel: ${sale.customerPhone}</div>` : ''}
        ${sale.customerAddress ? `<div class="customer-detail" dir="rtl" style="unicode-bidi: embed; text-align: center;">${sale.customerAddress.replace(/\n/g, '<br>')}${(sale as any).isTemporaryInfo ? ' *' : ''}</div>` : ''}
        ${sale.customerStreetAddress ? `<div class="customer-detail" dir="rtl" style="unicode-bidi: embed; text-align: center;">${sale.customerStreetAddress.replace(/\n/g, '<br>')}${(sale as any).isTemporaryInfo ? ' *' : ''}</div>` : ''}
      </div>
      `
          : ''
      }
      <hr class="divider">

      <table>
        <tbody>
          ${(sale.items || [])
            .map((item) => {
              const effectivePrice =
                item.publicPrice;
              const _lineTotal = effectivePrice * item.quantity * (1 - (item.discount || 0) / 100);

              return `
            <tr>
              <td colspan="2">${getDisplayName(item)}${item.isUnit ? ' (UNIT)' : ''}</td>
              <td class="right">${item.quantity} x ${effectivePrice.toFixed(2)}</td>
            </tr>
            ${
              item.discount && item.discount > 0
                ? `
            <tr>
              <td></td>
              <td class="discount">  -${item.discount}% DISC</td>
              <td class="right">-${((effectivePrice * item.quantity * item.discount) / 100).toFixed(2)}</td>
            </tr>
            `
                : ''
            }
          `;
            })
            .join('')}
        </tbody>
      </table>

      <hr class="divider">
      
      <div class="totals">
        <div class="total-row">
          <span>SUBTOTAL</span>
          <span>${(sale.subtotal || 0).toFixed(2)}</span>
        </div>
        ${
          sale.globalDiscount
            ? `
        <div class="total-row">
          <span>DISCOUNT (${sale.globalDiscount}%)</span>
          <span>-${(((sale.subtotal || 0) * sale.globalDiscount) / 100).toFixed(2)}</span>
        </div>`
            : ''
        }
        ${
          sale.deliveryFee && sale.deliveryFee > 0
            ? `
        <div class="total-row">
          <span>DELIVERY</span>
          <span>${sale.deliveryFee.toFixed(2)}</span>
        </div>`
            : ''
        }
        ${
          sale.tax && sale.tax > 0
            ? `
        <div class="total-row">
          <span>${lang === 'AR' ? 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¶ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â©' : 'TAX'}</span>
          <span>${sale.tax.toFixed(2)}</span>
        </div>`
            : ''
        }
        <div class="total-row">
          <span>PAYMENT (${(sale.paymentMethod || 'CASH').toUpperCase()})</span>
          <span>${sale.total.toFixed(2)}</span>
        </div>
        <div class="total-row" style="border-top: 1px dashed #000; padding-top: 5px; margin-top: 2px; border-bottom: 1px dashed #000; padding-bottom: 5px;">
          <span>TOTAL</span>
          <span>${sale.total.toFixed(2)} EGP</span>
        </div>
        ${
          sale.hasReturns || (sale.netTotal !== undefined && sale.netTotal < sale.total)
            ? `
        <div style="margin-top: 8px; padding-top: 4px;">
          <div style="text-align: center; margin-bottom: 4px;">ÃƒÂ¢Ã¢â‚¬Â Ã‚Â© RETURNS</div>
          ${
            sale.itemReturnedQuantities
              ? Object.entries(sale.itemReturnedQuantities)
                  .filter(([_, qty]) => qty > 0)
                  .map(([lineKey, qty]) => {
                    // lineKey can be "drugId_unit" or "drugId_pack" or just "drugId"
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
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #000; margin: 2px 0;">
            <span>${item.name} x${qty}</span>
            <span>-${returnedAmount.toFixed(2)}</span>
          </div>`;
                  })
                  .join('')
              : ''
          }
          <div class="total-row" style="border-top: 1px dashed #000; padding-top: 5px; margin-top: 4px;">
            <span>RETURNED TOTAL</span>
            <span>-${(sale.total - (sale.netTotal ?? sale.total)).toFixed(2)}</span>
          </div>
          <div class="total-row" style="border-top: 1px dashed #000; padding-top: 5px; margin-top: 2px; border-bottom: 1px dashed #000; padding-bottom: 5px;">
            <span>NET TOTAL</span>
            <span>${(sale.netTotal ?? sale.total).toFixed(2)}</span>
          </div>
        </div>
        `
            : ''
        }
      </div>
      
      <div style="text-align: center; margin: 10px 0 8px 0; line-height: 1.5;">
         ${opts.footerInquiry ? `<p class="${opts.highlightedField === 'footerInquiry' ? 'highlight' : ''}" style="margin: 2px 0;">${opts.footerInquiry}</p>` : ''}
         <div style="margin-top: 4px;" class="${opts.highlightedField === 'termsCondition' ? 'highlight' : ''}">
           ${opts.termsCondition ?? currentDefaults.terms}
         </div>
      </div>
      
      <div class="footer">
        ${
          opts.footerMessage
            ? `<p class="${opts.highlightedField === 'footerMessage' ? 'highlight' : ''}" style="margin: 2px 0;">${opts.footerMessage}</p>`
            : `<p class="${opts.highlightedField === 'footerMessage' ? 'highlight' : ''}" style="margin: 2px 0;">THANKS FOR CHOOSING ${opts.storeName || 'US'}</p>`
        }
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
            height: 50,
            displayValue: true,
            fontSize: 16,
            margin: 5,
            fontOptions: "bold"
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
 * Prints the invoice using the unified print engine.
 * Supports silent printing (Tauri/QZ Tray) with browser fallback.
 *
 * @param sale - The sale object to print
 * @param options - Optional template configuration
 */

export const RECEIPT_TEMPLATES = [
  { id: 'layout-1', name: 'Standard (Default)', isPremium: false },
  {
    id: 'layout-2',
    name: 'Modern Dark',
    isPremium: true,
    price: 9.99,
    description: 'A bold, modern look with an inverted header.',
  },
  {
    id: 'layout-3',
    name: 'Compact Minimal',
    isPremium: true,
    price: 4.99,
    description: 'Saves thermal paper with tight spacing and smaller fonts.',
  },
  {
    id: 'layout-4',
    name: 'Structured Grid',
    isPremium: true,
    price: 5.99,
    description: 'A highly organized table-based design for clear data separation.',
  },
  {
    id: 'layout-5',
    name: 'Elegant Typography',
    isPremium: true,
    price: 6.99,
    description: 'Distinctive design using modern fonts for a premium feel.',
  },
  {
    id: 'layout-6',
    name: 'Borderless Minimal',
    isPremium: true,
    price: 3.99,
    description: 'A completely clean, border-free design that organizes data using whitespace.',
  },
];

export function generateInvoiceHTML(sale: Sale, opts: InvoiceTemplateOptions = {}): string {
  const safeSale = {
    ...sale,
    items: sale.items || [],
    total: sale.total || 0,
    subtotal: sale.subtotal || 0,
    tax: sale.tax || 0,
    deliveryFee: sale.deliveryFee || 0,
    netTotal: sale.netTotal !== undefined ? sale.netTotal : sale.total || 0,
    globalDiscount: sale.globalDiscount || 0,
  } as Sale;

  if (opts.receiptLayout === 'layout-2') return generateLayout2HTML(safeSale, opts);
  if (opts.receiptLayout === 'layout-3') return generateLayout3HTML(safeSale, opts);
  if (opts.receiptLayout === 'layout-4') return generateLayout4HTML(safeSale, opts);
  if (opts.receiptLayout === 'layout-5') return generateLayout5HTML(safeSale, opts);
  if (opts.receiptLayout === 'layout-6') return generateLayout6HTML(safeSale, opts);
  return generateLayout1HTML(safeSale, opts);
}

export async function printInvoice(
  sale: Sale,
  options: InvoiceTemplateOptions = {}
): Promise<void> {
  const htmlContent = generateInvoiceHTML(sale, options);

  await printDocument({
    html: htmlContent,
    width: 80,
    height: 297, // Standard 80mm width receipt
    kind: 'receipt',
    orientation: 'portrait',
    autoPrintFallback: true, // Trigger print in popup fallback
  });
}
