/**
 * Application Help Instructions
 *
 * IMPORTANT: Arabic Translation Enforcement Policy
 * -------------------------------------------------
 * All new content added to this file MUST include both English (EN) and Arabic (AR) translations.
 * This is a mandatory requirement to ensure comprehensive Arabic language support across the application.
 *
 * Policy Requirements:
 * - Each help section must have parallel EN and AR objects with identical structure
 * - All text strings must be professionally translated, not transliterated
 * - Maintain consistency in terminology with the main translations.ts file
 * - New help sections must be added for both languages simultaneously
 * - Translation quality should be reviewed before merging
 *
 * @see conversation:edcd4e89-0eb4-414d-9a1e-c5503e6bbb3f for full Arabic translation policy
 *
 * Structure:
 * - Each page has its own export constant (e.g., CASH_REGISTER_HELP, RETURN_HISTORY_HELP)
 * - All help content follows the same structure: EN and AR objects
 * - Sections typically include: title, purpose, quickTasks, shortcuts, visualCues, troubleshooting
 */

export const CASH_REGISTER_HELP = {
  EN: {
    title: 'How to Use Cash Register',
    purpose: {
      title: 'Purpose',
      description:
        'This page is dedicated to opening and closing shifts, recording cash inflows and outflows, and reconciling the cash drawer.',
    },
    quickTasks: {
      title: 'Quick Tasks',
      openShift: {
        title: 'Open a Shift',
        steps: [
          'Click the "Open Shift" button',
          'Enter the starting cash amount in the drawer',
          'Add optional notes (e.g., cashier name)',
          'Click "Confirm"',
        ],
      },
      addCash: {
        title: 'Record Cash Transactions',
        steps: [
          'Use "Add Cash" for deposits or change replenishment',
          'Use "Remove Cash" for expenses or bank transfers',
          'Enter amount and provide a clear reason',
        ],
      },
      closeShift: {
        title: 'Close a Shift',
        steps: [
          'Physically count all cash in the drawer',
          'Click "Close Shift" and enter the actual counted amount',
          'Review the variance (difference between expected and actual)',
          'Add notes if there is a discrepancy and "Confirm"',
        ],
      },
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      items: ['Enter : Submit form', 'Esc : Close modal'],
    },
    visualCues: {
      title: 'Color Codes & Icons',
      items: [
        'Green Variance: Cash overage (actual > expected)',
        'Red Variance: Cash shortage (actual < expected)',
        'Gray Variance: Perfect match (actual = expected)',
      ],
    },
    troubleshooting: {
      title: 'Troubleshooting & Rules',
      items: [
        'Mismatch at closing?: Review the "Transaction Log" for any missed cash entries.',
        'Can I edit a closed shift?: No, closed shifts are locked for auditing. Contact a manager if a correction is needed.',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام سجل النقدية',
    purpose: {
      title: 'الهدف من الشاشة',
      description:
        'هذه الشاشة مخصصة لفتح وإغلاق الوردية، وتسجيل الكاش الوارد والمنصرف، ومطابقة الدرج لمعرفة العجز أو الزيادة.',
    },
    quickTasks: {
      title: 'المهـــام السريعـــــة',
      openShift: {
        title: 'كيف تفتح وردية جديدة؟',
        steps: [
          'اضغط على زر "فتح وردية"',
          'أدخل العهدة (المبلغ النقدي الابتدائي) الموجودة في الدرج',
          'أضف ملاحظات اختيارية (مثل: اسم الكاشير المستلم)',
          'اضغط "تأكيد"',
        ],
      },
      addCash: {
        title: 'كيف تسجل حركة نقدية؟',
        steps: [
          'استخدم "إضافة نقد" لتسجيل فكة أو إيداع',
          'استخدم "سحب نقد" لتسجيل المصروفات أو توريد البنك',
          'أدخل المبلغ مع كتابة سبب واضح للحركة',
        ],
      },
      closeShift: {
        title: 'كيف تقفل الوردية؟',
        steps: [
          'قم بعدّ جميع النقود الموجودة في الدرج فعلياً',
          'اضغط "إغلاق وردية" وأدخل المبلغ الذي قمت بعدّه',
          'راجع الفروقات (العجز أو الزيادة مقارنة بالمتوقع)',
          'أضف ملاحظة لتبرير الفرق إن وجد، ثم اضغط "تأكيد"',
        ],
      },
    },
    shortcuts: {
      title: 'اختصارات الكيبورد',
      items: ['Enter : تأكيد الإدخال أو الحفظ', 'Esc : إغلاق النافذة الحالية'],
    },
    visualCues: {
      title: 'دلالات الألوان والرموز',
      items: [
        'اللون الأخضر (في الفروقات): يوجد زيادة في الدرج (الفعلي أكبر من المتوقع).',
        'اللون الأحمر (في الفروقات): يوجد عجز في الدرج (الفعلي أقل من المتوقع).',
        'اللون الرمادي: تطابق تام (لا يوجد عجز ولا زيادة).',
      ],
    },
    troubleshooting: {
      title: 'حل المشاكل والصلاحيات',
      items: [
        'يوجد عجز عند الإغلاق؟: راجع "سجل المعاملات" لاحتمالية نسيان تسجيل مصروف أو سحب نقدي.',
        'هل يمكنني تعديل وردية مغلقة؟: لا، الورديات المغلقة مقفلة للرقابة. يجب الرجوع لمدير النظام لتسوية الأخطاء.',
      ],
    },
  },
};

export const RETURN_HISTORY_HELP = {
  EN: {
    title: 'How to Use Return History',
    purpose: {
      title: 'Purpose',
      description:
        'The Return History page allows you to view, search, and analyze all product returns processed in your pharmacy. You can filter returns by date, search for specific transactions, and view detailed information about each return.',
    },
    quickTasks: {
      title: 'Quick Tasks',
      search: {
        title: 'Searching for Returns',
        steps: [
          'Use the search box to enter a Return ID, Sale ID, or Customer name',
          'The results update automatically as you type',
        ],
      },
      dateFilter: {
        title: 'Filtering by Date',
        steps: [
          'Click the "From" and "To" date pickers to select a date range',
          'The table will show only returns within the selected date range',
          'Clear dates to reset the filter',
        ],
      },
      viewDetails: {
        title: 'Viewing Return Details',
        steps: [
          'Click the eye icon (👁️) in the Actions column',
          'Review returned items, quantities, and refund amounts',
          'Check the return reason and any additional notes',
        ],
      },
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      items: ['Esc : Close return details modal'],
    },
    visualCues: {
      title: 'Color Codes & Icons',
      items: [
        'Refund Amount (Red): Indicates money returned to the customer',
        'Eye Icon (👁️): View full details of the transaction',
      ],
    },
    troubleshooting: {
      title: 'Troubleshooting & Rules',
      items: [
        'Missing a return?: Check the date filters to ensure the date range covers the return date.',
        'Can I edit a return?: No, returns are final. If there was a mistake, a new corrective transaction must be made.',
        'Analyze Returns: Regularly review return reasons to identify quality issues or inventory problems.',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام سجل المرتجعات',
    purpose: {
      title: 'الهدف من الشاشة',
      description:
        'تتيح لك صفحة سجل المرتجعات عرض جميع مرتجعات المنتجات المعالجة في الصيدلية والبحث عنها وتحليلها، وعرض معلومات تفصيلية عن كل مرتجع.',
    },
    quickTasks: {
      title: 'المهـــام السريعـــــة',
      search: {
        title: 'البحث عن المرتجعات',
        steps: [
          'استخدم مربع البحث لإدخال رقم المرتجع أو رقم البيع أو اسم العميل',
          'تتحدث النتائج تلقائياً أثناء الكتابة',
        ],
      },
      dateFilter: {
        title: 'التصفية حسب التاريخ',
        steps: [
          'استخدم منتقي التاريخ (من/إلى) لتحديد النطاق الزمني',
          'سيعرض الجدول المرتجعات ضمن النطاق الزمني المحدد فقط',
          'امسح التواريخ لإلغاء التصفية',
        ],
      },
      viewDetails: {
        title: 'عرض تفاصيل المرتجع',
        steps: [
          'انقر على أيقونة العين (👁️) في عمود الإجراءات',
          'راجع الأصناف المرتجعة والكميات ومبالغ الاسترداد',
          'تحقق من سبب الإرجاع وأي ملاحظات إضافية',
        ],
      },
    },
    shortcuts: {
      title: 'اختصارات الكيبورد',
      items: ['Esc : إغلاق نافذة تفاصيل المرتجع'],
    },
    visualCues: {
      title: 'دلالات الألوان والرموز',
      items: [
        'مبلغ الاسترداد (أحمر): يشير إلى المبالغ التي تم إرجاعها للعميل.',
        'أيقونة العين (👁️): لعرض التفاصيل الكاملة للمعاملة.',
      ],
    },
    troubleshooting: {
      title: 'حل المشاكل والصلاحيات',
      items: [
        'لا أجد المرتجع المطلوب؟: تأكد من إعدادات تصفية التاريخ وأن النطاق الزمني يشمل تاريخ المرتجع.',
        'هل يمكن تعديل مرتجع مسجل؟: لا، المرتجعات نهائية. في حال وجود خطأ يجب تسجيل حركة تصحيحية جديدة.',
        'تحليل المرتجعات: راجع أسباب الإرجاع بانتظام لتحديد مشاكل الجودة أو إدارة المخزون.',
      ],
    },
  },
};

export const SALES_HISTORY_HELP = {
  EN: {
    title: 'How to Use Sales History',
    purpose: {
      title: 'Purpose',
      description:
        'The Sales History provides a comprehensive view of all sales transactions. You can search, filter, export data, print receipts, and process returns directly from this interface.',
    },
    quickTasks: {
      title: 'Quick Tasks',
      search: {
        title: 'Searching & Filtering',
        steps: [
          'Search by customer name, Sale ID, product, or barcode',
          'Use date pickers (From/To) to filter by date range',
          'Clear dates to view all sales again',
        ],
      },
      sorting: {
        title: 'Sorting & Reordering',
        steps: [
          'Double-click any column header to sort (except Actions)',
          'Drag and drop column headers to rearrange them',
        ],
      },
      details: {
        title: 'Viewing Details',
        steps: [
          'Click the down arrow (▼) to expand a row for a quick item view',
          'Click the eye icon (👁️) for the complete detail modal',
        ],
      },
      actions: {
        title: 'Exporting & Printing',
        steps: [
          'Click the "Download" button to export filtered sales to CSV',
          'Click the "Print" button in details to print a receipt',
        ],
      },
      returns: {
        title: 'Processing Returns',
        steps: [
          'Locate the sale, open details, and click "Return"',
          'Select items, enter reason, and click "Confirm"',
        ],
      },
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      items: ['Esc : Close detail modal or receipt preview'],
    },
    visualCues: {
      title: 'Color Codes & Icons',
      items: [
        'Delivery Icon: Indicates an order that was marked for delivery',
        'Down Arrow (▼): Expands the row for a quick item breakdown',
      ],
    },
    troubleshooting: {
      title: 'Troubleshooting & Rules',
      items: [
        'Cannot return items?: The "Return" button is disabled if the sale has already been fully returned.',
        'Data looks incorrect?: Make sure your date filters are set correctly or cleared.',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام سجل المبيعات',
    purpose: {
      title: 'الهدف من الشاشة',
      description:
        'يوفر سجل المبيعات عرضاً شاملاً لجميع معاملات البيع. يمكنك البحث والتصفية وتصدير البيانات وطباعة الإيصالات ومعالجة المرتجعات مباشرة من هذه الواجهة.',
    },
    quickTasks: {
      title: 'المهـــام السريعـــــة',
      search: {
        title: 'البحث والتصفية',
        steps: [
          'ابحث باسم العميل أو رقم البيع أو المنتج أو الباركود',
          'استخدم منتقي التاريخ (من/إلى) للتصفية حسب التاريخ',
          'امسح التواريخ لعرض جميع المبيعات مرة أخرى',
        ],
      },
      sorting: {
        title: 'الفرز وإعادة الترتيب',
        steps: [
          'انقر نقراً مزدوجاً على رأس العمود للفرز',
          'اسحب وأفلت رؤوس الأعمدة لإعادة ترتيبها',
        ],
      },
      details: {
        title: 'عرض التفاصيل',
        steps: [
          'انقر على السهم (▼) لتوسيع الصف وعرض الأصناف سريعاً',
          'انقر على أيقونة العين (👁️) لفتح نافذة التفاصيل الكاملة',
        ],
      },
      actions: {
        title: 'التصدير والطباعة',
        steps: [
          'انقر على زر "تنزيل" لتصدير المبيعات إلى ملف CSV',
          'انقر على زر "طباعة" في التفاصيل لطباعة الإيصال',
        ],
      },
      returns: {
        title: 'معالجة المرتجعات',
        steps: [
          'حدد المبيعة، افتح التفاصيل، وانقر "إرجاع"',
          'اختر الأصناف، أدخل السبب، وانقر "تأكيد"',
        ],
      },
    },
    shortcuts: {
      title: 'اختصارات الكيبورد',
      items: ['Esc : إغلاق نافذة التفاصيل أو معاينة الإيصال'],
    },
    visualCues: {
      title: 'دلالات الألوان والرموز',
      items: [
        'أيقونة التوصيل: تشير إلى أن الطلب كان لخدمة التوصيل',
        'سهم لأسفل (▼): يوسّع الصف لعرض تفاصيل الأصناف',
      ],
    },
    troubleshooting: {
      title: 'حل المشاكل والصلاحيات',
      items: [
        'لا يمكن إرجاع أصناف؟: يتم تعطيل زر "الإرجاع" إذا تم إرجاع المبيعة بالكامل مسبقاً.',
        'البيانات تبدو غير صحيحة؟: تأكد من ضبط فلاتر التاريخ بشكل صحيح أو مسحها.',
      ],
    },
  },
};

export const PENDING_APPROVAL_HELP = {
  EN: {
    title: 'How to Use Pending Approval',
    purpose: {
      title: 'Purpose',
      description:
        'The Pending Approval page displays incoming purchase orders awaiting your review and authorization. Approving these orders ensures quality control before inventory levels are updated.',
    },
    quickTasks: {
      title: 'Quick Tasks',
      reviewing: {
        title: 'Reviewing Orders',
        steps: [
          'View pending orders in the card grid layout',
          'Click on any card to view complete order details',
          'Verify all quantities, prices, and expiry dates are correct',
        ],
      },
      approving: {
        title: 'Approving an Order',
        steps: [
          'Click the green "Approve" button on a card for a quick approval',
          'Or open the details modal, enter your name in "Approved By", and click "Approve Order"',
          'Inventory will be updated automatically upon approval',
        ],
      },
      rejecting: {
        title: 'Rejecting an Order',
        steps: [
          'Click the red "Reject" button on the card',
          'Optionally provide a reason for rejection (e.g., "Incorrect pricing")',
          'Click "Reject" to confirm',
        ],
      },
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      items: ['Esc : Close order details modal'],
    },
    visualCues: {
      title: 'Color Codes & Icons',
      items: [
        'Status Badge (Yellow): Shows "Pending Review" with an animated indicator',
        'Green Button: Quick Approve',
        'Red Button: Quick Reject',
      ],
    },
    troubleshooting: {
      title: 'Troubleshooting & Rules',
      items: [
        'Missing details?: Open the full detail modal to see expiry dates, costs, discounts, and sale prices.',
        'Can I edit an order here?: No, you can only approve or reject. If corrections are needed, reject it with a reason so it can be re-issued.',
        'Audit Trail: You must enter your name as the approver to maintain a proper audit trail.',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام الموافقات المعلقة',
    purpose: {
      title: 'الهدف من الشاشة',
      description:
        'تعرض صفحة الموافقات المعلقة أوامر الشراء الواردة التي تنتظر مراجعتك وموافقتك. الموافقة على هذه الأوامر تضمن الرقابة على الجودة قبل تحديث مستويات المخزون.',
    },
    quickTasks: {
      title: 'المهـــام السريعـــــة',
      reviewing: {
        title: 'مراجعة الأوامر',
        steps: [
          'استعرض الأوامر المعلقة في تخطيط البطاقات',
          'انقر على أي بطاقة لعرض تفاصيل الطلب الكاملة',
          'تحقق من صحة جميع الكميات، الأسعار، وتواريخ الانتهاء',
        ],
      },
      approving: {
        title: 'الموافقة على الطلب',
        steps: [
          'انقر على الزر الأخضر "موافقة" للموافقة السريعة',
          'أو افتح نافذة التفاصيل، أدخل اسمك في "تمت الموافقة بواسطة"، وانقر "الموافقة على الطلب"',
          'سيتم تحديث المخزون تلقائياً بعد الموافقة',
        ],
      },
      rejecting: {
        title: 'رفض الطلب',
        steps: [
          'انقر على الزر الأحمر "رفض" على البطاقة',
          'اختيارياً، اكتب سبب الرفض (مثل: "الأسعار غير صحيحة")',
          'انقر "رفض" لتأكيد الإجراء',
        ],
      },
    },
    shortcuts: {
      title: 'اختصارات الكيبورد',
      items: ['Esc : إغلاق نافذة تفاصيل الطلب'],
    },
    visualCues: {
      title: 'دلالات الألوان والرموز',
      items: [
        'شارة الحالة (أصفر): تعرض "في انتظار المراجعة" مع مؤشر متحرك',
        'الزر الأخضر: موافقة سريعة',
        'الزر الأحمر: رفض سريع',
      ],
    },
    troubleshooting: {
      title: 'حل المشاكل والصلاحيات',
      items: [
        'تفاصيل ناقصة؟: افتح نافذة التفاصيل الكاملة لرؤية تواريخ الانتهاء، التكاليف، الخصومات وأسعار البيع.',
        'هل يمكنني تعديل الطلب هنا؟: لا، يمكنك فقط الموافقة أو الرفض. إذا كان هناك أخطاء، قم برفض الطلب مع ذكر السبب ليتم إصداره من جديد.',
        'مسار المراجعة: يجب إدخال اسمك كمُعتمد لضمان الشفافية ومسار المراجعة.',
      ],
    },
  },
};

export const DASHBOARD_HELP = {
  EN: {
    title: 'How to Use Dashboard Overview',
    purpose: {
      title: 'Purpose',
      description:
        "The Dashboard Overview provides a comprehensive real-time snapshot of your pharmacy's performance. Monitor key financial metrics, track inventory alerts, analyze sales trends, and identify top products.",
    },
    quickTasks: {
      title: 'Quick Tasks',
      statsCards: {
        title: 'Reviewing Key Metrics',
        steps: [
          'Check Revenue and Expenses for immediate financial health',
          'Track Net Profit (green for positive, red for negative)',
          'Click expand button (↗) on any card for a detailed view',
        ],
      },
      charts: {
        title: 'Analyzing Trends & Products',
        steps: [
          'View the 7-day sales trend in the area chart',
          'Check the Top 5 best-selling products list',
          'Hover over charts for exact amounts and dates',
        ],
      },
      inventory: {
        title: 'Managing Inventory Alerts',
        steps: [
          'Review products with 10 or fewer units in the Low Stock alert',
          'Review items expiring within the next 3 months',
          'Click "Restock" directly from the dashboard to add inventory',
        ],
      },
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      items: ['Esc : Close expanded modal view'],
    },
    visualCues: {
      title: 'Color Codes & Icons',
      items: [
        'Trend Lines: Green (↑ increasing), Red (↓ decreasing), Orange (→ stable)',
        'Expiry Alerts: Red background (expired), Yellow background (expiring soon)',
        'Expand Button (↗): Hover over cards to see this button for detailed views',
      ],
    },
    troubleshooting: {
      title: 'Troubleshooting & Rules',
      items: [
        'Data not updating?: The dashboard shows real-time data but you might need to refresh the page if your connection was interrupted.',
        'Exporting Reports: Use the expand button (↗) to open detailed views where you can download CSV reports.',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام لوحة المعلومات',
    purpose: {
      title: 'الهدف من الشاشة',
      description:
        'توفر لوحة المعلومات نظرة شاملة فورية لأداء الصيدلية. راقب المقاييس المالية الرئيسية، وتتبع تنبيهات المخزون، وحلل اتجاهات المبيعات في عرض مركزي واحد.',
    },
    quickTasks: {
      title: 'المهـــام السريعـــــة',
      statsCards: {
        title: 'مراجعة المقاييس الرئيسية',
        steps: [
          'تحقق من الإيرادات والمصروفات لمعرفة الوضع المالي',
          'تتبع صافي الربح (أخضر للموجب، أحمر للسالب)',
          'انقر على زر التوسيع (↗) في أي بطاقة لعرض التفاصيل',
        ],
      },
      charts: {
        title: 'تحليل الاتجاهات والمنتجات',
        steps: [
          'اعرض اتجاه المبيعات لمدة 7 أيام في المخطط المساحي',
          'راجع قائمة أفضل 5 منتجات مبيعاً',
          'مرر الفأرة فوق المخططات لرؤية المبالغ والتواريخ الدقيقة',
        ],
      },
      inventory: {
        title: 'إدارة تنبيهات المخزون',
        steps: [
          'راجع المنتجات التي تحتوي على 10 وحدات أو أقل (نواقص)',
          'راجع الأصناف التي تنتهي صلاحيتها خلال الأشهر الثلاثة القادمة',
          'انقر "إعادة التخزين" مباشرة من اللوحة لإضافة كميات',
        ],
      },
    },
    shortcuts: {
      title: 'اختصارات الكيبورد',
      items: ['Esc : إغلاق نافذة العرض التفصيلي'],
    },
    visualCues: {
      title: 'دلالات الألوان والرموز',
      items: [
        'خطوط الاتجاه: أخضر (↑ متزايد)، أحمر (↓ متناقص)، برتقالي (→ مستقر)',
        'تنبيهات الصلاحية: خلفية حمراء (منتهية)، خلفية صفراء (تنتهي قريباً)',
        'زر التوسيع (↗): يظهر عند التمرير فوق البطاقات لعرض التفاصيل',
      ],
    },
    troubleshooting: {
      title: 'حل المشاكل والصلاحيات',
      items: [
        'البيانات لا تتحدث؟: تعرض اللوحة بيانات فورية، ولكن قد تحتاج لتحديث الصفحة إذا انقطع الاتصال.',
        'تصدير التقارير: استخدم زر التوسيع (↗) لفتح العروض التفصيلية وتنزيل تقارير CSV.',
      ],
    },
  },
};

export const REALTIME_SALES_MONITOR_HELP = {
  EN: {
    title: 'How to Use Real-Time Sales Monitor',
    purpose: {
      title: 'Purpose',
      description:
        "The Real-Time Sales Monitor provides a live, dynamic view of your pharmacy's sales activity today. Track revenue, transactions, and inventory movement as they happen with live animated feeds.",
    },
    quickTasks: {
      title: 'Quick Tasks',
      monitoring: {
        title: 'Monitoring Live Data',
        steps: [
          "Check Today's Revenue and Total Transactions continuously",
          'Watch the Live Transaction Feed auto-refresh every 60 seconds',
          'Hover over the Hourly Chart to see peak sales times',
        ],
      },
      filtering: {
        title: 'Filtering Transactions',
        steps: [
          'Click "ALL" to see every recent transaction',
          'Click "VIP" to filter for loyal customers (≥$1000 total purchases)',
          'Click "HIGH_VALUE" to see only the top 5% highest-value sales of the day',
        ],
      },
      insights: {
        title: 'Analyzing Insights',
        steps: [
          'Review the Category Distribution pie chart',
          'Check Payment Methods (Cash vs Card breakdown)',
          'Track Walk-in vs Delivery ratios in Insight Cards',
        ],
      },
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      items: ['None specific to this view (fully auto-refreshing)'],
    },
    visualCues: {
      title: 'Color Codes & Icons',
      items: [
        'LIVE Badge: Green pulsing indicator confirming real-time connection',
        'Gold Badge: VIP customer status',
        'Stars Badge: High-value transaction indicator',
      ],
    },
    troubleshooting: {
      title: 'Troubleshooting & Rules',
      items: [
        'Do I need to refresh the page?: No, the page automatically polls for new data and animates updates.',
        'Why am I missing transactions?: Ensure you have no active filters (like VIP or HIGH_VALUE) if you want to see all transactions.',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام مراقب المبيعات الفوري',
    purpose: {
      title: 'الهدف من الشاشة',
      description:
        'يوفر مراقب المبيعات الفوري عرضاً ديناميكياً مباشراً لنشاط المبيعات في صيدليتك اليوم. تتبع الإيرادات والمعاملات فور حدوثها مع موجز مباشر.',
    },
    quickTasks: {
      title: 'المهـــام السريعـــــة',
      monitoring: {
        title: 'مراقبة البيانات المباشرة',
        steps: [
          'تحقق من إيرادات اليوم وإجمالي المعاملات بشكل مستمر',
          'شاهد موجز المعاملات المباشر الذي يتحدث تلقائياً كل 60 ثانية',
          'مرر فوق المخطط الساعي لرؤية أوقات ذروة المبيعات',
        ],
      },
      filtering: {
        title: 'تصفية المعاملات',
        steps: [
          'انقر "الكل" (ALL) لرؤية جميع المعاملات الأخيرة',
          'انقر "VIP" لتصفية العملاء المميزين (إجمالي مشتريات ≥ 1000$)',
          'انقر "HIGH_VALUE" لرؤية أعلى 5% من المبيعات قيمة فقط',
        ],
      },
      insights: {
        title: 'تحليل الرؤى',
        steps: [
          'راجع مخطط توزيع الفئات الدائري',
          'تحقق من طرق الدفع (نقدي مقابل بطاقة)',
          'تتبع نسب طلبات الزيارة مقابل التوصيل في بطاقات الإحصائيات',
        ],
      },
    },
    shortcuts: {
      title: 'اختصارات الكيبورد',
      items: ['لا توجد اختصارات خاصة (الشاشة تتحدث تلقائياً)'],
    },
    visualCues: {
      title: 'دلالات الألوان والرموز',
      items: [
        'شارة LIVE: مؤشر أخضر نابض يؤكد الاتصال الفوري بالبيانات',
        'شارة ذهبية: حالة عميل VIP',
        'شارة نجوم: مؤشر لمعاملة عالية القيمة',
      ],
    },
    troubleshooting: {
      title: 'حل المشاكل والصلاحيات',
      items: [
        'هل أحتاج لتحديث الصفحة؟: لا، الصفحة تجلب البيانات الجديدة تلقائياً وتحدث العرض.',
        'لماذا لا أرى بعض المعاملات؟: تأكد من عدم تفعيل فلاتر (مثل VIP أو HIGH_VALUE) إذا كنت تريد رؤية الكل.',
      ],
    },
  },
};

export const ORG_MANAGEMENT_HELP = {
  EN: {
    title: 'How to Manage Organization',
    purpose: {
      title: 'Purpose',
      description:
        'The Organization Management module provides a centralized view of your entire organization. Monitor branch performance, manage employees across all branches, and track central quotas and subscriptions.',
    },
    quickTasks: {
      title: 'Quick Tasks',
      monitoring: {
        title: 'Monitoring Pulse & Branches',
        steps: [
          'Review the Pulse Grid for top-level metrics (revenue, employees, active branches)',
          'Check the Branch Monitor to compare revenue and activity across locations',
          'Click on a branch for detailed analytics',
        ],
      },
      employees: {
        title: 'Managing Employees',
        steps: [
          'Use the Global Member Matrix to manage all organization employees',
          'Search for employees across all branches using the search bar',
          'Filter by branch or update roles directly from the matrix',
        ],
      },
      quotas: {
        title: 'Tracking Quotas',
        steps: [
          'Check the Quotas section for your current subscription usage',
          'Monitor branch count, employee limits, and feature access',
        ],
      },
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      items: ['No specific shortcuts for this page'],
    },
    visualCues: {
      title: 'Color Codes & Icons',
      items: [
        'Quota Warnings: Visual indicators when approaching license limits',
      ],
    },
    troubleshooting: {
      title: 'Troubleshooting & Rules',
      items: [
        'Security Guard - The Last Owner Rule: The system prevents the removal or role-downgrade of the final organization owner to ensure the organization is never left without an admin.',
        'Missing an employee?: Ensure you clear branch filters in the matrix to search globally.',
      ],
    },
  },
  AR: {
    title: 'كيفية إدارة المنظمة',
    purpose: {
      title: 'الهدف من الشاشة',
      description:
        'توفر وحدة إدارة المنظمة عرضاً مركزياً لمنظمتك بالكامل. راقب أداء الفروع، وأدر الموظفين، وتتبع الحصص المركزية والاشتراكات.',
    },
    quickTasks: {
      title: 'المهـــام السريعـــــة',
      monitoring: {
        title: 'مراقبة النبض والفروع',
        steps: [
          'راجع شبكة النبض لمعرفة المقاييس الكلية (الإيرادات، الموظفين، الفروع النشطة)',
          'تحقق من مراقب الفروع لمقارنة النشاط عبر المواقع',
          'انقر على أي فرع لعرض تحليلاته المفصلة',
        ],
      },
      employees: {
        title: 'إدارة الموظفين',
        steps: [
          'استخدم المصفوفة العامة لإدارة جميع موظفي المنظمة',
          'ابحث عن أي موظف في كافة الفروع باستخدام شريط البحث',
          'قم بتصفية القائمة حسب الفرع أو حدّث الصلاحيات مباشرة',
        ],
      },
      quotas: {
        title: 'تتبع الحصص',
        steps: [
          'راجع قسم الحصص لمعرفة استخدام اشتراكك الحالي',
          'راقب حدود الفروع والموظفين المتاحة في خطتك',
        ],
      },
    },
    shortcuts: {
      title: 'اختصارات الكيبورد',
      items: ['لا توجد اختصارات خاصة بهذه الشاشة'],
    },
    visualCues: {
      title: 'دلالات الألوان والرموز',
      items: [
        'تحذيرات الحصص: مؤشرات مرئية تظهر عند الاقتراب من حدود الترخيص',
      ],
    },
    troubleshooting: {
      title: 'حل المشاكل والصلاحيات',
      items: [
        'قاعدة المالك الأخير (أمان): يمنع النظام إزالة المالك الأخير أو خفض صلاحياته لضمان عدم ترك المنظمة بدون مسؤول.',
        'لا تجد موظفاً؟: تأكد من إزالة فلاتر الفروع في المصفوفة للبحث في كامل المنظمة.',
      ],
    },
  },
};
