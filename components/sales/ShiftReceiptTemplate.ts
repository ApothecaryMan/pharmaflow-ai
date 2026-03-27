import type { Language, Shift } from '../../types';
import { formatCurrency } from '../../utils/currency';

export const generateShiftReceiptHTML = (shift: Shift, language: Language = 'EN'): string => {
  const isAr = language === 'AR';

  // Format currency helpers - without currency symbol
  const f = (amount: number | undefined) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const title = isAr ? 'إيصال تسليم الدرج' : 'Shift Close Receipt';
  const branchName = shift.branchName || 'Zinc';

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    let str = d.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
    if (isAr) {
      str = str.replace(' AM', ' ص').replace(' PM', ' م');
    }
    return str;
  };

  const openTime = formatTime(shift.openTime);
  const closeTime = shift.closeTime ? formatTime(shift.closeTime) : '-';
  const printTime = formatTime(new Date().toISOString());

  const durationHrs = Math.floor((shift.shiftDurationMinutes || 0) / 60);
  const durationMins = (shift.shiftDurationMinutes || 0) % 60;
  const durationText = isAr 
    ? `${durationHrs} س ${durationMins} د` 
    : `${durationHrs}h ${durationMins}m`;

  const cashSalesNum = shift.cashSales || 0;
  const cardSalesNum = shift.cardSales || 0;
  const totalRevenues = shift.openingBalance + cashSalesNum + (shift.cashIn || 0) + (shift.cashPurchaseReturns || 0) + cardSalesNum;
  
  const cashReturnsNum = shift.returns || 0;
  const totalExpenses = (shift.cashPurchases || 0) + cashReturnsNum + (shift.cashOut || 0);

  const varianceNum = (shift.closingBalance || 0) - (shift.expectedBalance || 0);
  const varianceText = varianceNum > 0 
    ? (isAr ? `زيادة` : `Surplus`)
    : varianceNum < 0 
      ? (isAr ? `عجز` : `Shortage`)
      : (isAr ? `متطابق` : `Balanced`);

  const html = `
<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      height: auto !important;
      background-color: #ffffff;
      overflow: visible !important;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      line-height: 1.4;
      color: #000;
      width: 80mm;
      max-width: 80mm;
      padding: 5px 10px;
      box-sizing: border-box;
      direction: ${isAr ? 'rtl' : 'ltr'};
      text-align: ${isAr ? 'right' : 'left'};
      -webkit-print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; height: 0; }
    .strong-divider { border-top: 2px solid #000; margin: 6px 0; height: 0; }
    
    .header-logo {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 2px;
      margin-bottom: 5px;
    }
    .header-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    .info-label { width: 40%; font-weight: bold; }
    .info-value { width: 60%; }
    
    .section-title {
      font-weight: bold;
      text-decoration: underline;
      margin: 6px 0 4px 0;
    }
    
    .dt-row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
      align-items: flex-end;
    }
    .dt-label { width: 60%; }
    .dt-val { width: 40%; text-align: ${isAr ? 'left' : 'right'}; font-family: 'Courier New', monospace; }
    

    
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
      font-size: 14px;
      font-weight: bold;
    }
    .total-val { text-align: ${isAr ? 'left' : 'right'}; }
    
    .audit-box {
      border: 1px solid #000;
      padding: 5px;
      margin: 6px 0;
      border-radius: 4px;
    }
    
    .signatures {
      margin-top: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sig-line {
      flex: 1;
      border-bottom: 1px dashed #000;
      height: 1px;
      margin-top: 10px;
    }
    
    .footer {
      font-size: 11px;
      text-align: center;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #cccccc;
    }
    .duplicate-watermark {
      border: 2px solid #000;
      padding: 4px 8px;
      font-weight: 900;
      font-size: 18px;
      transform: rotate(-5deg);
      margin: 10px auto;
      width: fit-content;
      text-transform: uppercase;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  ${shift.printCount && shift.printCount > 1 ? `
    <div class="text-center">
      <div class="duplicate-watermark">${isAr ? 'نسخة مكررة' : 'DUPLICATE COPY'}</div>
    </div>
  ` : ''}
  <div class="text-center header-title">${title}</div>
  <div class="strong-divider"></div>

  <div class="info-row">
    <span class="info-label">${isAr ? 'رقم الشيفت:' : 'Shift #:'}</span>
    <span class="info-value">${shift.handoverReceiptNumber || '-'}</span>
  </div>
  <div class="info-row">
    <span class="info-label">${isAr ? 'وقت الإغلاق:' : 'Close Time:'}</span>
    <span class="info-value">${closeTime}</span>
  </div>
  <div class="info-row">
    <span class="info-label">${isAr ? 'الفرع:' : 'Branch:'}</span>
    <span class="info-value">${branchName}</span>
  </div>
  <div class="info-row">
    <span class="info-label">${isAr ? 'فتح بواسطة:' : 'Opened By:'}</span>
    <span class="info-value">${shift.openedBy}</span>
  </div>
  <div class="info-row">
    <span class="info-label">${isAr ? 'أغلق بواسطة:' : 'Closed By:'}</span>
    <span class="info-value">${shift.closedBy || '-'}</span>
  </div>
  <div class="info-row">
    <span class="info-label">${isAr ? 'مدة الوردية:' : 'Duration:'}</span>
    <span class="info-value">${durationText}</span>
  </div>

  <div class="divider"></div>

  <div class="section-title">${isAr ? 'الإيرادات:' : 'Revenues:'}</div>
  
  <div class="dt-row">
    <span class="dt-label">${isAr ? 'رصيد افتتاحي' : 'Opening Balance'}</span>
    <span class="dt-val">${f(shift.openingBalance)}</span>
  </div>
  <div class="dt-row">
    <span class="dt-label">
      ${isAr ? 'فواتير بيع كاش' : 'Cash Sales'}
      <strong>(${shift.cashInvoiceCount || 0})</strong>
    </span>
    <span class="dt-val">${f(cashSalesNum)}</span>
  </div>
  <div class="dt-row">
    <span class="dt-label">${isAr ? 'مرتجع شراء كاش' : 'Cash Purch. Returns'}</span>
    <span class="dt-val">${f(shift.cashPurchaseReturns)}</span>
  </div>
  <div class="dt-row">
    <span class="dt-label">
      ${isAr ? 'تحصيل فيزا' : 'Card Submissions'}
      <strong>(${shift.cardInvoiceCount || 0})</strong>
    </span>
    <span class="dt-val">${f(cardSalesNum)}</span>
  </div>
  <div class="dt-row">
    <span class="dt-label">${isAr ? 'إضافة نقدية' : 'Cash In'}</span>
    <span class="dt-val">${f(shift.cashIn)}</span>
  </div>
  <div class="total-row mt-1">
    <span>${isAr ? 'إجمالي الإيرادات' : 'Total Revenues'}</span>
    <span class="total-val">${f(totalRevenues)}</span>
  </div>

  <div class="divider"></div>

  <div class="section-title">${isAr ? 'المصروفات:' : 'Expenses:'}</div>
  <div class="dt-row">
    <span class="dt-label">${isAr ? 'فواتير شراء كاش' : 'Cash Purchases'}</span>
    <span class="dt-val">${f(shift.cashPurchases)}</span>
  </div>
  <div class="dt-row">
    <span class="dt-label">${isAr ? 'مرتجع بيع نقدي' : 'Cash Sales Returns'}</span>
    <span class="dt-val">(${f(cashReturnsNum)})</span>
  </div>
  <div class="dt-row">
    <span class="dt-label">${isAr ? 'سحب نقدية' : 'Cash Out'}</span>
    <span class="dt-val">${f(shift.cashOut)}</span>
  </div>
  <div class="total-row mt-1">
    <span>${isAr ? 'إجمالي المصروفات' : 'Total Expenses'}</span>
    <span class="total-val">${f(totalExpenses)}</span>
  </div>

  <div class="audit-box">
    <div class="dt-row">
      <span class="dt-label">${isAr ? 'صافي المبيعات النقدية' : 'Net Cash Sales'}</span>
      <span class="dt-val">${f(cashSalesNum - cashReturnsNum)}</span>
    </div>
    <div class="dt-row">
      <span class="dt-label">${isAr ? 'إجمالي الخصومات' : 'Total Discounts'}</span>
      <span class="dt-val">(${f(shift.totalDiscounts)})</span>
    </div>
  </div>

  <div class="dt-row mt-2">
    <span class="dt-label bold">${isAr ? 'النقدية المتوقعة' : 'Expected Cash'}</span>
    <span class="dt-val">${f(shift.expectedBalance)}</span>
  </div>
  <div class="dt-row">
    <span class="dt-label bold">${isAr ? 'النقدية في الدرج (فعلي)' : 'Counted Cash'}</span>
    <span class="dt-val">${f(shift.closingBalance)}</span>
  </div>
  <div class="dt-row">
    <span class="dt-label bold">${isAr ? 'الفيزا في الدرج' : 'Card Submissions'}</span>
    <span class="dt-val">${f(cardSalesNum)}</span>
  </div>

  <div class="divider"></div>

  <div class="dt-row">
    <span class="dt-label">${isAr ? 'الفرق (' + varianceText + ')' : 'Variance (' + varianceText + ')'}</span>
    <span class="dt-val">
      ${f(Math.abs(varianceNum))}
      ${Math.abs(varianceNum) > 50 ? ' *' : ''}
    </span>
  </div>
  <div class="total-row">
    <span>${isAr ? 'تحويل إلى خزينة' : 'Transfer to Treasury'}</span>
    <span class="total-val">${f(shift.expectedBalance)}</span>
  </div>

  <div class="strong-divider"></div>

  <div class="signatures">
    <span>${isAr ? 'توقيع المستلم:' : 'Signature:'}</span>
    <div class="sig-line"></div>
  </div>

  <div class="footer">
    ${shift.id}<br>
    ${isAr ? 'تاريخ الطباعة:' : 'Printed on:'} ${printTime}<br>
  </div>
  
  <!-- Auto-print script for browser fallback -->
  <script>
    window.onload = function() {
      if(!window.opener) { 
        // If not opened in a popup, maybe it's QZ tray so don't do anything
      }
    };
  </script>
</body>
</html>
  `;

  return html;
};
