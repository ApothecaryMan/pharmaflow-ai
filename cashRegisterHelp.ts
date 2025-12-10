/**
 * Cash Register Help Instructions
 * 
 * IMPORTANT: Arabic Translation Enforcement
 * -----------------------------------------
 * All new content added to this file MUST include both English (EN) and Arabic (AR) translations.
 * This is a mandatory requirement to ensure comprehensive Arabic language support across the application.
 * 
 * Structure:
 * - Each section must have parallel EN and AR objects
 * - All text strings must be translated, not transliterated
 * - Maintain consistency in terminology with the main translations.ts file
 * 
 * @see conversation:edcd4e89-0eb4-414d-9a1e-c5503e6bbb3f for Arabic translation policy
 */

export const CASH_REGISTER_HELP = {
  EN: {
    title: 'How to Use Cash Register',
    openShift: {
      title: '1. Opening a Shift',
      steps: [
        'Click the "Open Shift" button at the top right',
        'Enter the starting cash amount in the drawer',
        'Add optional notes about the shift (e.g., cashier name, date)',
        'Click "Confirm" to start the shift'
      ]
    },
    transactions: {
      title: '2. Managing Cash Transactions',
      addCash: {
        title: 'Adding Cash (Cash In)',
        steps: [
          'Click "Add Cash (In)" button',
          'Enter the amount being added',
          'Provide a reason (e.g., "Bank deposit", "Change replenishment")',
          'Click "Confirm"'
        ]
      },
      removeCash: {
        title: 'Removing Cash (Cash Out)',
        steps: [
          'Click "Remove Cash (Out)" button',
          'Enter the amount being removed',
          'Provide a reason (e.g., "Bank deposit", "Expense payment")',
          'Click "Confirm"'
        ]
      }
    },
    closeShift: {
      title: '3. Closing a Shift',
      steps: [
        'Count all cash in the drawer physically',
        'Click "Close Shift" button',
        'Enter the actual counted amount',
        'Review the variance (difference between expected and actual)',
        'Add notes if there is a discrepancy',
        'Click "Confirm" to close the shift'
      ]
    },
    tips: {
      title: 'Tips & Best Practices',
      items: [
        'Always count cash carefully during shift close',
        'Document all cash movements with clear reasons',
        'Investigate and resolve any variances immediately',
        'Keep shift opening balances consistent',
        'Review transaction history regularly for accuracy'
      ]
    }
  },
  AR: {
    title: 'كيفية استخدام سجل النقدية',
    openShift: {
      title: '1. فتح وردية',
      steps: [
        'اضغط على زر "فتح وردية" في أعلى اليمين',
        'أدخل المبلغ النقدي الابتدائي في الدرج',
        'أضف ملاحظات اختيارية عن الوردية (مثل: اسم الكاشير، التاريخ)',
        'اضغط "تأكيد" لبدء الوردية'
      ]
    },
    transactions: {
      title: '2. إدارة المعاملات النقدية',
      addCash: {
        title: 'إضافة نقد (وارد نقدي)',
        steps: [
          'اضغط على زر "إضافة نقد (إيداع)"',
          'أدخل المبلغ المراد إضافته',
          'اذكر السبب (مثل: "إيداع بنكي"، "تعويض صرافة")',
          'اضغط "تأكيد"'
        ]
      },
      removeCash: {
        title: 'سحب نقد (صادر نقدي)',
        steps: [
          'اضغط على زر "سحب نقد (صرف)"',
          'أدخل المبلغ المراد سحبه',
          'اذكر السبب (مثل: "إيداع بنكي"، "دفع مصروفات")',
          'اضغط "تأكيد"'
        ]
      }
    },
    closeShift: {
      title: '3. إغلاق وردية',
      steps: [
        'عد جميع النقود في الدرج فعلياً',
        'اضغط على زر "إغلاق وردية"',
        'أدخل المبلغ الفعلي المحصل',
        'راجع الفروقات (الفرق بين المتوقع والفعلي)',
        'أضف ملاحظات في حالة وجود فرق',
        'اضغط "تأكيد" لإغلاق الوردية'
      ]
    },
    tips: {
      title: 'نصائح وأفضل الممارسات',
      items: [
        'احرص على عد النقود بدقة عند إغلاق الوردية',
        'وثق جميع حركات النقد بأسباب واضحة',
        'حقق وحل أي فروقات فوراً',
        'حافظ على رصيد افتتاحي ثابت للورديات',
        'راجع سجل المعاملات بانتظام للتأكد من الدقة'
      ]
    }
  }
};
