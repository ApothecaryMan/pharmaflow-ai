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
 * - Sections typically include: title, overview, features, usage, understanding, tips
 */

/**
 * Cash Register Help Instructions
 */
export const CASH_REGISTER_HELP = {
  EN: {
    title: 'How to Use Cash Register',
    overview: {
      title: 'Overview',
      description:
        'The Cash Register module helps you manage cash flow through shifts. Track opening balances, record cash transactions, and reconcile at the end of each shift to ensure accuracy and accountability.',
    },
    usage: {
      title: 'How to Use',
      openShift: {
        title: '1. Opening a Shift',
        steps: [
          'Click the "Open Shift" button at the top right',
          'Enter the starting cash amount in the drawer',
          'Add optional notes about the shift (e.g., cashier name, date)',
          'Click "Confirm" to start the shift',
        ],
      },
      addCash: {
        title: '2. Adding Cash (Cash In)',
        steps: [
          'Click "Add Cash (In)" button',
          'Enter the amount being added',
          'Provide a reason (e.g., "Bank deposit", "Change replenishment")',
          'Click "Confirm"',
        ],
      },
      removeCash: {
        title: '3. Removing Cash (Cash Out)',
        steps: [
          'Click "Remove Cash (Out)" button',
          'Enter the amount being removed',
          'Provide a reason (e.g., "Bank deposit", "Expense payment")',
          'Click "Confirm"',
        ],
      },
      closeShift: {
        title: '4. Closing a Shift',
        steps: [
          'Count all cash in the drawer physically',
          'Click "Close Shift" button',
          'Enter the actual counted amount',
          'Review the variance (difference between expected and actual)',
          'Add notes if there is a discrepancy',
          'Click "Confirm" to close the shift',
        ],
      },
    },
    features: {
      title: 'Key Features',
      items: [
        'Shift-based cash management',
        'Real-time cash balance tracking',
        'Transaction history with reasons',
        'Variance detection and reporting',
        'Notes and comments for accountability',
        'Shift history for auditing',
      ],
    },
    understanding: {
      title: 'Understanding the Interface',
      cards: [
        'Opening Balance: Cash in drawer when shift starts',
        'Current Balance: Real-time cash amount in drawer',
        'Expected Balance: Calculated from all transactions',
        'Variance: Difference between expected and actual amounts',
        'Transaction Log: History of all cash movements',
      ],
    },
    tips: {
      title: 'Tips & Best Practices',
      items: [
        'Always count cash carefully during shift close',
        'Document all cash movements with clear reasons',
        'Investigate and resolve any variances immediately',
        'Keep shift opening balances consistent',
        'Review transaction history regularly for accuracy',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام سجل النقدية',
    overview: {
      title: 'نظرة عامة',
      description:
        'وحدة سجل النقدية تساعدك في إدارة التدفق النقدي من خلال الورديات. تتبع الأرصدة الافتتاحية، سجل المعاملات النقدية، وقم بالتسوية في نهاية كل وردية لضمان الدقة والمساءلة.',
    },
    usage: {
      title: 'كيفية الاستخدام',
      openShift: {
        title: '1. فتح وردية',
        steps: [
          'اضغط على زر "فتح وردية" في أعلى اليمين',
          'أدخل المبلغ النقدي الابتدائي في الدرج',
          'أضف ملاحظات اختيارية عن الوردية (مثل: اسم الكاشير، التاريخ)',
          'اضغط "تأكيد" لبدء الوردية',
        ],
      },
      addCash: {
        title: '2. إضافة نقد (وارد نقدي)',
        steps: [
          'اضغط على زر "إضافة نقد (إيداع)"',
          'أدخل المبلغ المراد إضافته',
          'اذكر السبب (مثل: "إيداع بنكي"، "تعويض صرافة")',
          'اضغط "تأكيد"',
        ],
      },
      removeCash: {
        title: '3. سحب نقد (صادر نقدي)',
        steps: [
          'اضغط على زر "سحب نقد (صرف)"',
          'أدخل المبلغ المراد سحبه',
          'اذكر السبب (مثل: "إيداع بنكي"، "دفع مصروفات")',
          'اضغط "تأكيد"',
        ],
      },
      closeShift: {
        title: '4. إغلاق وردية',
        steps: [
          'عد جميع النقود في الدرج فعلياً',
          'اضغط على زر "إغلاق وردية"',
          'أدخل المبلغ الفعلي المحصل',
          'راجع الفروقات (الفرق بين المتوقع والفعلي)',
          'أضف ملاحظات في حالة وجود فرق',
          'اضغط "تأكيد" لإغلاق الوردية',
        ],
      },
    },
    features: {
      title: 'الميزات الرئيسية',
      items: [
        'إدارة النقد على أساس الورديات',
        'تتبع رصيد النقد في الوقت الفعلي',
        'سجل المعاملات مع الأسباب',
        'كشف الفروقات والتقارير',
        'ملاحظات وتعليقات للمساءلة',
        'سجل الورديات للتدقيق',
      ],
    },
    understanding: {
      title: 'فهم الواجهة',
      cards: [
        'الرصيد الافتتاحي: النقد في الدرج عند بدء الوردية',
        'الرصيد الحالي: مبلغ النقد الفعلي في الدرج',
        'الرصيد المتوقع: محسوب من جميع المعاملات',
        'الفرق: الفرق بين المبالغ المتوقعة والفعلية',
        'سجل المعاملات: تاريخ جميع حركات النقد',
      ],
    },
    tips: {
      title: 'نصائح وأفضل الممارسات',
      items: [
        'احرص على عد النقود بدقة عند إغلاق الوردية',
        'وثق جميع حركات النقد بأسباب واضحة',
        'حقق وحل أي فروقات فوراً',
        'حافظ على رصيد افتتاحي ثابت للورديات',
        'راجع سجل المعاملات بانتظام للتأكد من الدقة',
      ],
    },
  },
};

/**
 * Return History Help Instructions
 */
export const RETURN_HISTORY_HELP = {
  EN: {
    title: 'How to Use Return History',
    overview: {
      title: 'Overview',
      description:
        'The Return History page allows you to view, search, and analyze all product returns processed in your pharmacy. You can filter returns by date, search for specific transactions, and view detailed information about each return.',
    },
    features: {
      title: 'Key Features',
      items: [
        'Search returns by Return ID, Sale ID, or Customer name',
        'Filter returns by date range (From/To)',
        'View complete return details including items and refund amounts',
        'Track return reasons (Damaged, Expired, Wrong Item, etc.)',
        'Monitor total refund amounts for each transaction',
      ],
    },
    usage: {
      title: 'How to Use',
      search: {
        title: '1. Searching for Returns',
        steps: [
          'Use the search box to enter a Return ID, Sale ID, or Customer name',
          'The results update automatically as you type',
          'Search is case-insensitive and supports partial matches',
        ],
      },
      dateFilter: {
        title: '2. Filtering by Date',
        steps: [
          'Click the "From" date picker to select a start date',
          'Click the "To" date picker to select an end date',
          'The table will show only returns within the selected date range',
          'Clear dates by clicking the date pickers and selecting empty',
        ],
      },
      viewDetails: {
        title: '3. Viewing Return Details',
        steps: [
          'Click the eye icon (👁️) in the Actions column',
          'A modal will open showing complete return information',
          'Review returned items, quantities, and refund amounts',
          'Check the return reason and any additional notes',
          'Close the modal by clicking the X button or outside the modal',
        ],
      },
    },
    understanding: {
      title: 'Understanding the Table',
      columns: [
        'Return ID: Unique identifier for the return transaction',
        'Date: When the return was processed',
        'Sale ID: Original sale transaction that was returned',
        'Customer: Name of the customer making the return',
        'Refund Amount: Total amount refunded (shown in red with minus sign)',
        'Reason: Category explaining why items were returned',
        'Actions: Button to view full return details',
      ],
    },
    tips: {
      title: 'Tips & Best Practices',
      items: [
        'Regularly review return patterns to identify quality issues',
        'Use date filters to analyze returns for specific periods',
        'Check return reasons to improve inventory management',
        'Cross-reference Return ID with Sale ID for audit trails',
        'Export data (if available) for further analysis and reporting',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام سجل المرتجعات',
    overview: {
      title: 'نظرة عامة',
      description:
        'تتيح لك صفحة سجل المرتجعات عرض جميع مرتجعات المنتجات المعالجة في الصيدلية والبحث عنها وتحليلها. يمكنك تصفية المرتجعات حسب التاريخ، والبحث عن معاملات محددة، وعرض معلومات تفصيلية عن كل مرتجع.',
    },
    features: {
      title: 'الميزات الرئيسية',
      items: [
        'البحث عن المرتجعات برقم المرتجع أو رقم البيع أو اسم العميل',
        'تصفية المرتجعات حسب نطاق التاريخ (من/إلى)',
        'عرض تفاصيل المرتجع الكاملة بما في ذلك الأصناف ومبالغ الاسترداد',
        'تتبع أسباب الإرجاع (تالف، منتهي الصلاحية، صنف خاطئ، إلخ)',
        'مراقبة إجمالي مبالغ الاسترداد لكل معاملة',
      ],
    },
    usage: {
      title: 'كيفية الاستخدام',
      search: {
        title: '1. البحث عن المرتجعات',
        steps: [
          'استخدم مربع البحث لإدخال رقم المرتجع أو رقم البيع أو اسم العميل',
          'تتحدث النتائج تلقائياً أثناء الكتابة',
          'البحث غير حساس لحالة الأحرف ويدعم المطابقات الجزئية',
        ],
      },
      dateFilter: {
        title: '2. التصفية حسب التاريخ',
        steps: [
          'انقر على منتقي التاريخ "من" لتحديد تاريخ البداية',
          'انقر على منتقي التاريخ "إلى" لتحديد تاريخ النهاية',
          'سيعرض الجدول المرتجعات ضمن النطاق الزمني المحدد فقط',
          'امسح التواريخ بالنقر على منتقي التاريخ واختيار فارغ',
        ],
      },
      viewDetails: {
        title: '3. عرض تفاصيل المرتجع',
        steps: [
          'انقر على أيقونة العين (👁️) في عمود الإجراءات',
          'ستفتح نافذة منبثقة تعرض معلومات المرتجع الكاملة',
          'راجع الأصناف المرتجعة والكميات ومبالغ الاسترداد',
          'تحقق من سبب الإرجاع وأي ملاحظات إضافية',
          'أغلق النافذة بالنقر على زر X أو خارج النافذة',
        ],
      },
    },
    understanding: {
      title: 'فهم الجدول',
      columns: [
        'رقم المرتجع: معرّف فريد لمعاملة الإرجاع',
        'التاريخ: متى تمت معالجة الإرجاع',
        'رقم البيع: معاملة البيع الأصلية التي تم إرجاعها',
        'العميل: اسم العميل الذي يقوم بالإرجاع',
        'مبلغ الاسترداد: المبلغ الإجمالي المسترد (يظهر بالأحمر مع علامة ناقص)',
        'السبب: الفئة التي توضح سبب إرجاع الأصناف',
        'الإجراءات: زر لعرض تفاصيل المرتجع الكاملة',
      ],
    },
    tips: {
      title: 'نصائح وأفضل الممارسات',
      items: [
        'راجع أنماط الإرجاع بانتظام لتحديد مشاكل الجودة',
        'استخدم فلاتر التاريخ لتحليل المرتجعات لفترات محددة',
        'تحقق من أسباب الإرجاع لتحسين إدارة المخزون',
        'قارن رقم المرتجع مع رقم البيع لمسارات المراجعة',
        'صدّر البيانات (إن توفرت) لمزيد من التحليل والتقارير',
      ],
    },
  },
};

/**
 * Sales History Help Instructions
 */
export const SALES_HISTORY_HELP = {
  EN: {
    title: 'How to Use Sales History',
    overview: {
      title: 'Overview',
      description:
        'Sales History provides a comprehensive view of all sales transactions in your pharmacy. You can search, filter, sort, export data, view detailed breakdowns, print receipts, and process returns directly from this interface.',
    },
    usage: {
      title: 'How to Use',
      search: {
        title: '1. Searching Sales',
        steps: [
          'Use the search box to find sales by Customer Name, Sale ID, Product Name, or Barcode',
          'Results update automatically as you type',
          'Search supports partial matches and is case-insensitive',
        ],
      },
      dateFilter: {
        title: '2. Filtering by Date Range',
        steps: [
          'Click "From" date picker to set the start date',
          'Click "To" date picker to set the end date',
          'Only sales within the selected range will be displayed',
          'Clear dates to view all sales again',
        ],
      },
      sorting: {
        title: '3. Sorting Columns',
        steps: [
          'Double-click any column header to sort (except Actions column)',
          'First click sorts ascending (↑), second click sorts descending (↓)',
          'Arrow indicator shows current sort direction',
          'Default sort is by date (newest first)',
        ],
      },
      reordering: {
        title: '4. Reordering Columns',
        steps: [
          'Drag and drop column headers to rearrange them',
          'Click and hold on a column header',
          'Drag it to the desired position',
          'Release to apply the new order',
        ],
      },
      expandRow: {
        title: '5. Viewing Sale Details',
        steps: [
          'Click the down arrow (▼) to expand a sale row',
          'View all items in the sale with quantities and prices',
          'See subtotal, discounts, delivery fees, and final total',
          'Click up arrow (▲) to collapse the row',
        ],
      },
      detailModal: {
        title: '6. Opening Detail Modal',
        steps: [
          'Click the eye icon (👁️) in the Actions column',
          'View complete sale information in a dedicated modal',
          'Access additional actions like printing or processing returns',
          'Close by clicking X or anywhere outside the modal',
        ],
      },
      export: {
        title: '7. Exporting to CSV',
        steps: [
          'Click the "Download" button (CSV icon) in the filter section',
          'A CSV file will download with all filtered sales data',
          'File includes: ID, Date, Customer, Payment Method, Items, and Total',
          'Open in Excel or Google Sheets for further analysis',
        ],
      },
      printing: {
        title: '8. Printing Receipts',
        steps: [
          'Expand a sale row or open the detail modal',
          'Click the "Print" button (printer icon)',
          'A formatted receipt will open in a new window',
          'The receipt includes items, prices, and a barcode',
          'Use browser print dialog to print or save as PDF',
        ],
      },
      returns: {
        title: '9. Processing Returns',
        steps: [
          'Locate the sale you want to return',
          'Expand the row or open detail modal',
          'Click the "Return" button (only if no returns processed yet)',
          'Select items and quantities to return',
          'Enter return reason and notes',
          'Click "Confirm" to process the return',
        ],
      },
    },
    features: {
      title: 'Key Features',
      items: [
        'Advanced search across multiple fields (customer, product, barcode, ID)',
        'Date range filtering for specific time periods',
        'Sortable columns with visual sort indicators',
        'Drag-and-drop column reordering for customized layout',
        'Expandable rows showing complete item breakdowns',
        'Real-time total revenue calculation for filtered results',
        'One-click CSV export for data analysis',
        'Professional receipt printing with barcodes',
        'In-app return processing without leaving the page',
        'Responsive design optimized for all screen sizes',
      ],
    },
    understanding: {
      title: 'Understanding the Table',
      columns: [
        'ID: Unique sale transaction identifier',
        'Date: Date and time of the sale with delivery icon if applicable',
        'Customer: Customer name and code (or "Guest" for walk-ins)',
        'Payment: Payment method (Cash/Visa) with corresponding icon',
        'Items: Number of items in the sale',
        'Total: Final sale amount including discounts and fees',
        'Actions: Quick actions (Expand, View Details)',
      ],
      expandedView:
        'The expanded view shows all items with unit indicators, discounts, and action buttons for printing or processing returns.',
    },
    tips: {
      title: 'Tips & Best Practices',
      items: [
        'Use date filters to analyze sales for specific periods (daily, weekly, monthly)',
        'Export data regularly for backup and external reporting',
        'Double-check customer information before processing returns',
        'Print receipts immediately after sales for customer records',
        'Use column sorting to identify high-value transactions',
        'Reorder columns based on your most frequent workflows',
        'Search by barcode for quick product-specific sale lookups',
        'Monitor the total revenue indicator to track performance',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام سجل المبيعات',
    overview: {
      title: 'نظرة عامة',
      description:
        'يوفر سجل المبيعات عرضاً شاملاً لجميع معاملات البيع في الصيدلية. يمكنك البحث والتصفية والفرز وتصدير البيانات وعرض التفاصيل الكاملة وطباعة الإيصالات ومعالجة المرتجعات مباشرة من هذه الواجهة.',
    },
    usage: {
      title: 'كيفية الاستخدام',
      search: {
        title: '1. البحث عن المبيعات',
        steps: [
          'استخدم مربع البحث للعثور على المبيعات باسم العميل أو رقم البيع أو اسم المنتج أو الباركود',
          'تتحدث النتائج تلقائياً أثناء الكتابة',
          'البحث يدعم المطابقات الجزئية وغير حساس لحالة الأحرف',
        ],
      },
      dateFilter: {
        title: '2. التصفية حسب نطاق التاريخ',
        steps: [
          'انقر على منتقي التاريخ "من" لتعيين تاريخ البداية',
          'انقر على منتقي التاريخ "إلى" لتعيين تاريخ النهاية',
          'سيتم عرض المبيعات ضمن النطاق المحدد فقط',
          'امسح التواريخ لعرض جميع المبيعات مرة أخرى',
        ],
      },
      sorting: {
        title: '3. فرز الأعمدة',
        steps: [
          'انقر نقراً مزدوجاً على أي رأس عمود للفرز (ما عدا عمود الإجراءات)',
          'النقرة الأولى تفرز تصاعدياً (↑)، والثانية تنازلياً (↓)',
          'مؤشر السهم يوضح اتجاه الفرز الحالي',
          'الفرز الافتراضي حسب التاريخ (الأحدث أولاً)',
        ],
      },
      reordering: {
        title: '4. إعادة ترتيب الأعمدة',
        steps: [
          'اسحب وأفلت رؤوس الأعمدة لإعادة ترتيبها',
          'انقر واستمر في الضغط على رأس العمود',
          'اسحبه إلى الموقع المطلوب',
          'أفلت لتطبيق الترتيب الجديد',
        ],
      },
      expandRow: {
        title: '5. عرض تفاصيل البيع',
        steps: [
          'انقر على السهم لأسفل (▼) لتوسيع صف البيع',
          'اعرض جميع الأصناف في البيع مع الكميات والأسعار',
          'شاهد المجموع الفرعي والخصومات ورسوم التوصيل والإجمالي النهائي',
          'انقر على السهم لأعلى (▲) لطي الصف',
        ],
      },
      detailModal: {
        title: '6. فتح نافذة التفاصيل',
        steps: [
          'انقر على أيقونة العين (👁️) في عمود الإجراءات',
          'اعرض معلومات البيع الكاملة في نافذة مخصصة',
          'الوصول إلى إجراءات إضافية مثل الطباعة أو معالجة المرتجعات',
          'أغلق بالنقر على X أو في أي مكان خارج النافذة',
        ],
      },
      export: {
        title: '7. التصدير إلى CSV',
        steps: [
          'انقر على زر "تنزيل" (أيقونة CSV) في قسم الفلاتر',
          'سيتم تنزيل ملف CSV يحتوي على جميع بيانات المبيعات المصفاة',
          'يتضمن الملف: رقم البيع، التاريخ، العميل، طريقة الدفع، الأصناف، والإجمالي',
          'افتحه في Excel أو Google Sheets لمزيد من التحليل',
        ],
      },
      printing: {
        title: '8. طباعة الإيصالات',
        steps: [
          'وسّع صف البيع أو افتح نافذة التفاصيل',
          'انقر على زر "طباعة" (أيقونة الطابعة)',
          'سيفتح إيصال منسق في نافذة جديدة',
          'يتضمن الإيصال الأصناف والأسعار والباركود',
          'استخدم مربع حوار طباعة المتصفح للطباعة أو الحفظ كـ PDF',
        ],
      },
      returns: {
        title: '9. معالجة المرتجعات',
        steps: [
          'حدد موقع البيع الذي تريد إرجاعه',
          'وسّع الصف أو افتح نافذة التفاصيل',
          'انقر على زر "إرجاع" (فقط إذا لم تتم معالجة مرتجعات بعد)',
          'اختر الأصناف والكميات المراد إرجاعها',
          'أدخل سبب الإرجاع والملاحظات',
          'انقر على "تأكيد" لمعالجة الإرجاع',
        ],
      },
    },
    features: {
      title: 'الميزات الرئيسية',
      items: [
        'بحث متقدم عبر حقول متعددة (العميل، المنتج، الباركود، الرقم)',
        'تصفية نطاق التاريخ لفترات زمنية محددة',
        'أعمدة قابلة للفرز مع مؤشرات مرئية',
        'إعادة ترتيب الأعمدة بالسحب والإفلات للتخطيط المخصص',
        'صفوف قابلة للتوسيع تعرض تفاصيل الأصناف الكاملة',
        'حساب إجمالي الإيرادات فوري للنتائج المصفاة',
        'تصدير CSV بنقرة واحدة لتحليل البيانات',
        'طباعة إيصالات احترافية مع باركود',
        'معالجة المرتجعات داخل التطبيق دون مغادرة الصفحة',
        'تصميم متجاوب محسّن لجميع أحجام الشاشات',
      ],
    },
    understanding: {
      title: 'فهم الجدول',
      columns: [
        'الرقم: معرّف فريد لمعاملة البيع',
        'التاريخ: تاريخ ووقت البيع مع أيقونة التوصيل إن وُجدت',
        'العميل: اسم العميل ورمزه (أو "ضيف" للعملاء العابرين)',
        'الدفع: طريقة الدفع (نقدي/فيزا) مع الأيقونة المقابلة',
        'الأصناف: عدد الأصناف في البيع',
        'الإجمالي: المبلغ النهائي للبيع شاملاً الخصومات والرسوم',
        'الإجراءات: إجراءات سريعة (توسيع، عرض التفاصيل)',
      ],
      expandedView:
        'العرض الموسع يُظهر جميع الأصناف مع مؤشرات الوحدة والخصومات وأزرار الإجراءات للطباعة أو معالجة المرتجعات.',
    },
    tips: {
      title: 'نصائح وأفضل الممارسات',
      items: [
        'استخدم فلاتر التاريخ لتحليل المبيعات لفترات محددة (يومية، أسبوعية، شهرية)',
        'صدّر البيانات بانتظام للنسخ الاحتياطي والتقارير الخارجية',
        'تحقق من معلومات العميل قبل معالجة المرتجعات',
        'اطبع الإيصالات فوراً بعد المبيعات لسجلات العملاء',
        'استخدم فرز الأعمدة لتحديد المعاملات ذات القيمة العالية',
        'أعد ترتيب الأعمدة حسب سير عملك الأكثر تكراراً',
        'ابحث بالباركود للبحث السريع عن مبيعات منتج معين',
        'راقب مؤشر إجمالي الإيرادات لتتبع الأداء',
      ],
    },
  },
};

/**
 * Pending Approval Help Instructions
 */
export const PENDING_APPROVAL_HELP = {
  EN: {
    title: 'How to Use Pending Approval',
    overview: {
      title: 'Overview',
      description:
        'The Pending Approval page displays all incoming purchase orders awaiting your review and authorization. You must approve orders before inventory levels are updated. This ensures quality control and prevents errors in stock management.',
    },
    usage: {
      title: 'How to Use',
      reviewing: {
        title: '1. Reviewing Pending Orders',
        steps: [
          'View all pending purchase orders in a card grid layout',
          'Each card shows: Supplier, Invoice ID, Date, Total Cost, and Item Count',
          'Orders are marked with "Pending Review" status badge',
          'Click on any card to view complete order details',
        ],
      },
      viewDetails: {
        title: '2. Viewing Order Details',
        steps: [
          'Click on a purchase order card to open the detail modal',
          'Review supplier information, invoice number, payment type, and total cost',
          'Examine the items table showing: Item Name, Expiry Date, Quantity, Cost, Discount %, Sale Price, and Total',
          'Verify all quantities, prices, and expiry dates are correct',
          'Enter your name in the "Approved By" field (required for approval)',
        ],
      },
      approving: {
        title: '3. Approving an Order',
        steps: [
          'Open the purchase order detail modal',
          'Enter your name in the "Approved By" field at the top',
          'Review all items carefully',
          'Click the "Approve Order" button at the bottom',
          'The order will be approved and inventory will be updated automatically',
        ],
      },
      quickApprove: {
        title: '4. Quick Approve (from Card)',
        steps: [
          'Locate the purchase order card you want to approve',
          'Click the green "Approve" button on the card (without opening details)',
          'Enter your name in the approval modal',
          'Click "Confirm" to approve the order immediately',
        ],
      },
      rejecting: {
        title: '5. Rejecting an Order',
        steps: [
          'Locate the purchase order you want to reject',
          'Click the red "Reject" button on the card',
          'A confirmation modal will appear',
          'Optionally provide a reason for rejection (e.g., "Incorrect pricing")',
          'Click "Reject" to confirm - the order will be marked as rejected',
        ],
      },
    },
    features: {
      title: 'Key Features',
      items: [
        'Real-time view of all pending purchase orders',
        'Card-based layout for easy scanning and quick actions',
        'Detailed item breakdown with expiry dates and pricing',
        'Dual approval methods: Quick approve from card or detailed review',
        'Rejection with optional reason tracking',
        'Approver name logging for audit trail',
        'Automatic inventory update upon approval',
        'Empty state when no pending orders exist',
        'Responsive design for mobile and desktop use',
      ],
    },
    understanding: {
      title: 'Understanding the Card View',
      cards: [
        'Supplier: Name of the supplier providing the products',
        'Invoice ID: External invoice number from the supplier',
        'Date: When the purchase order was created',
        'Total Cost: Complete cost of the purchase order',
        'Items Count: Total number of items in the order',
        'Status Badge: Shows "Pending Review" with animated indicator',
        'Action Buttons: Green "Approve" and Red "Reject" buttons',
      ],
      modalDetails:
        'The detail modal provides a complete item-by-item breakdown with expiry dates, quantities, costs, discounts, and sale prices. Always verify expiry dates and pricing before approval.',
    },
    tips: {
      title: 'Tips & Best Practices',
      items: [
        'Always verify expiry dates before approving purchases',
        'Double-check pricing against supplier invoices',
        'Use the detail modal for thorough review of large orders',
        'Quick approve only for familiar, verified orders',
        'Always provide rejection reasons for better supplier communication',
        'Ensure you enter the correct approver name for audit compliance',
        'Review item quantities against warehouse capacity',
        'Check for duplicate orders before approval',
        'Regularly monitor pending approvals to avoid delays',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام الموافقات المعلقة',
    overview: {
      title: 'نظرة عامة',
      description:
        'تعرض صفحة الموافقات المعلقة جميع أوامر الشراء الواردة التي تنتظر مراجعتك وموافقتك. يجب الموافقة على الأوامر قبل تحديث مستويات المخزون. يضمن ذلك مراقبة الجودة ويمنع الأخطاء في إدارة المخزون.',
    },
    usage: {
      title: 'كيفية الاستخدام',
      reviewing: {
        title: '1. مراجعة الأوامر المعلقة',
        steps: [
          'اعرض جميع أوامر الشراء المعلقة في تخطيط شبكي للبطاقات',
          'كل بطاقة تعرض: المورد، رقم الفاتورة، التاريخ، التكلفة الإجمالية، وعدد الأصناف',
          'الأوامر موسومة بشارة حالة "في انتظار المراجعة"',
          'انقر على أي بطاقة لعرض تفاصيل الطلب الكاملة',
        ],
      },
      viewDetails: {
        title: '2. عرض تفاصيل الطلب',
        steps: [
          'انقر على بطاقة أمر الشراء لفتح نافذة التفاصيل',
          'راجع معلومات المورد ورقم الفاتورة ونوع الدفع والتكلفة الإجمالية',
          'افحص جدول الأصناف الذي يعرض: اسم الصنف، تاريخ الانتهاء، الكمية، التكلفة، الخصم %، سعر البيع، والإجمالي',
          'تحقق من صحة جميع الكميات والأسعار وتواريخ الانتهاء',
          'أدخل اسمك في حقل "تمت الموافقة بواسطة" (مطلوب للموافقة)',
        ],
      },
      approving: {
        title: '3. الموافقة على طلب',
        steps: [
          'افتح نافذة تفاصيل أمر الشراء',
          'أدخل اسمك في حقل "تمت الموافقة بواسطة" في الأعلى',
          'راجع جميع الأصناف بعناية',
          'انقر على زر "الموافقة على الطلب" في الأسفل',
          'ستتم الموافقة على الطلب وسيتم تحديث المخزون تلقائياً',
        ],
      },
      quickApprove: {
        title: '4. الموافقة السريعة (من البطاقة)',
        steps: [
          'حدد موقع بطاقة أمر الشراء الذي تريد الموافقة عليه',
          'انقر على الزر الأخضر "موافقة" على البطاقة (دون فتح التفاصيل)',
          'أدخل اسمك في نافذة الموافقة',
          'انقر "تأكيد" للموافقة على الطلب فوراً',
        ],
      },
      rejecting: {
        title: '5. رفض طلب',
        steps: [
          'حدد موقع أمر الشراء الذي تريد رفضه',
          'انقر على الزر الأحمر "رفض" على البطاقة',
          'ستظهر نافذة تأكيد',
          'اختيارياً، قدم سبباً للرفض (مثل: "أسعار غير صحيحة")',
          'انقر "رفض" للتأكيد - سيتم وضع علامة الرفض على الطلب',
        ],
      },
    },
    features: {
      title: 'الميزات الرئيسية',
      items: [
        'عرض فوري لجميع أوامر الشراء المعلقة',
        'تخطيط قائم على البطاقات لسهولة المسح والإجراءات السريعة',
        'تفصيل شامل للأصناف مع تواريخ الانتهاء والأسعار',
        'طريقتان للموافقة: موافقة سريعة من البطاقة أو مراجعة تفصيلية',
        'الرفض مع تتبع اختياري للسبب',
        'تسجيل اسم الموافق لمسار المراجعة',
        'تحديث تلقائي للمخزون عند الموافقة',
        'حالة فارغة عندما لا توجد أوامر معلقة',
        'تصميم متجاوب للهاتف المحمول وسطح المكتب',
      ],
    },
    understanding: {
      title: 'فهم عرض البطاقات',
      cards: [
        'المورد: اسم المورد الذي يوفر المنتجات',
        'رقم الفاتورة: رقم الفاتورة الخارجية من المورد',
        'التاريخ: متى تم إنشاء أمر الشراء',
        'التكلفة الإجمالية: التكلفة الكاملة لأمر الشراء',
        'عدد الأصناف: العدد الإجمالي للأصناف في الطلب',
        'شارة الحالة: تعرض "في انتظار المراجعة" مع مؤشر متحرك',
        'أزرار الإجراءات: أزرار "موافقة" الأخضر و"رفض" الأحمر',
      ],
      modalDetails:
        'توفر نافذة التفاصيل تفصيلاً كاملاً لكل صنف مع تواريخ الانتهاء والكميات والتكاليف والخصومات وأسعار البيع. تحقق دائماً من تواريخ الانتهاء والأسعار قبل الموافقة.',
    },
    tips: {
      title: 'نصائح وأفضل الممارسات',
      items: [
        'تحقق دائماً من تواريخ الانتهاء قبل الموافقة على المشتريات',
        'راجع الأسعار مقابل فواتير الموردين',
        'استخدم نافذة التفاصيل للمراجعة الشاملة للطلبات الكبيرة',
        'الموافقة السريعة فقط للطلبات المألوفة والمتحقق منها',
        'قدم دائماً أسباب الرفض لتحسين التواصل مع الموردين',
        'تأكد من إدخال اسم الموافق الصحيح للامتثال للمراجعة',
        'راجع كميات الأصناف مقابل سعة المستودع',
        'تحقق من الطلبات المكررة قبل الموافقة',
        'راقب الموافقات المعلقة بانتظام لتجنب التأخير',
      ],
    },
  },
};

/**
 * Dashboard Overview Help Instructions
 */
export const DASHBOARD_HELP = {
  EN: {
    title: 'How to Use Dashboard Overview',
    overview: {
      title: 'Overview',
      description:
        "The Dashboard Overview provides a comprehensive real-time snapshot of your pharmacy's performance. Monitor key financial metrics, track inventory alerts, analyze sales trends, and identify top-performing products all in one centralized view.",
    },
    usage: {
      title: 'How to Use',
      statsCards: {
        title: '1. Understanding Stats Cards',
        steps: [
          'View Revenue: Total income from all sales transactions',
          'Monitor Expenses: Total costs from purchases and operations',
          'Track Net Profit: Calculated as Revenue minus Expenses (green for positive, red for negative)',
          'Check Low Stock: Number of products with 10 or fewer units remaining',
          'Click expand button (↗) on any card to view detailed breakdown',
        ],
      },
      salesChart: {
        title: '2. Analyzing Sales Trends',
        steps: [
          'View 7-day sales trend in the area chart',
          'Chart color indicates trend: Green (↑ increasing), Red (↓ decreasing), Orange (→ stable)',
          'Hover over the chart to see exact sales amounts for each day',
          'Click expand button for a larger, more detailed view',
          'Use trend data to identify peak sales days and plan accordingly',
        ],
      },
      topSelling: {
        title: '3. Reviewing Top Selling Products',
        steps: [
          'View the top 5 best-selling products ranked by quantity sold',
          'Products are numbered 1-5 based on performance',
          'See total quantity sold for each product',
          'Click expand button to view top 20 products with revenue details',
          'Use this data to optimize inventory stocking decisions',
        ],
      },
      lowStock: {
        title: '4. Managing Low Stock Alerts',
        steps: [
          'Review products with 10 or fewer units in stock',
          'Each item shows current stock level (e.g., "5 left")',
          'Click "Restock" button on any item to add inventory',
          'Enter desired quantity in the restock modal',
          'Submit to update inventory immediately',
          'Click expand to see complete list of all low-stock items',
        ],
      },
      expiring: {
        title: '5. Monitoring Expiring Items',
        steps: [
          'View products expiring within the next 3 months',
          'Items are sorted by expiry date (nearest first)',
          'Red background indicates already expired items',
          'Yellow background shows items expiring soon',
          'Days remaining indicator helps prioritize action',
          'Click expand for full list and plan promotions or returns',
        ],
      },
      recentSales: {
        title: '6. Reviewing Recent Transactions',
        steps: [
          'View the 5 most recent sales transactions',
          'Each entry shows: Customer name/code, Date & Time, Transaction ID, Payment method',
          'Payment method is color-coded: Blue (Visa), Green (Cash)',
          'See total amount and number of items per transaction',
          'Click expand to view last 20 transactions with full details',
        ],
      },
      expandViews: {
        title: '7. Using Expand Features',
        steps: [
          'Hover over any dashboard card to reveal expand button (↗)',
          'Click expand to open detailed view in a modal',
          'Expanded views show more data, additional columns, and export options',
          'Use CSV export buttons in expanded views for offline analysis',
          'Close modals by clicking outside or using the X button',
        ],
      },
      restocking: {
        title: '8. Quick Restocking',
        steps: [
          'Identify low-stock item from the alerts section',
          'Click "Restock" button next to the product',
          'Modal opens showing current stock level',
          'Enter quantity to add (default: 10 units)',
          'Click "Confirm" to update inventory instantly',
          'Changes reflect immediately across all views',
        ],
      },
    },
    features: {
      title: 'Key Features',
      items: [
        'Real-time financial metrics dashboard',
        'Dynamic sales trend chart with smart color coding',
        'Top 5 best-selling products ranking',
        'Automated low stock alerts (≤10 units)',
        'Expiry tracking for next 3 months',
        'Recent sales transaction feed',
        'Expandable detailed views for all sections',
        'CSV export for offline data analysis',
        'Quick restock functionality from dashboard',
        'Responsive grid layout adapting to screen size',
        'Dark mode support for comfortable viewing',
      ],
    },
    understanding: {
      title: 'Understanding Dashboard Elements',
      cards: [
        'Revenue Card: Displays total sales income with primary color theme',
        'Expenses Card: Shows total purchase costs in red',
        'Net Profit Card: Revenue - Expenses, color changes based on positive/negative',
        'Low Stock Card: Count of products needing attention in orange',
        'Sales Chart: 7-day trend with gradient fill and dynamic coloring',
        'Top Selling: Ranked list with numbered badges and quantity sold',
        'Low Stock Alerts: Orange-bordered cards with restock action button',
        'Expiring Items: Color-coded by urgency (red=expired, yellow=soon)',
        'Recent Sales: Transaction cards with payment method icons',
      ],
      expandInfo:
        'Expand buttons (↗) appear on hover and provide access to detailed views with more data points, additional insights, and export capabilities.',
    },
    tips: {
      title: 'Tips & Best Practices',
      items: [
        'Check dashboard daily to stay informed about pharmacy performance',
        'Monitor sales trends to identify busy periods and adjust staffing',
        'Act on low stock alerts promptly to prevent stockouts',
        'Review expiring items weekly to plan promotions or returns',
        'Use top-selling data to optimize purchasing and shelf placement',
        'Export expanded views for monthly reports and analysis',
        'Set aside time each morning to review recent sales',
        'Watch net profit trends to identify cost control opportunities',
        'Use quick restock for urgent replenishment needs',
        'Compare current metrics with previous periods for growth tracking',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام لوحة المعلومات',
    overview: {
      title: 'نظرة عامة',
      description:
        'توفر لوحة المعلومات نظرة شاملة فورية لأداء الصيدلية. راقب المقاييس المالية الرئيسية، وتتبع تنبيهات المخزون، وحلل اتجاهات المبيعات، وحدد المنتجات الأكثر مبيعاً كل ذلك في عرض مركزي واحد.',
    },
    usage: {
      title: 'كيفية الاستخدام',
      statsCards: {
        title: '1. فهم بطاقات الإحصائيات',
        steps: [
          'عرض الإيرادات: إجمالي الدخل من جميع معاملات المبيعات',
          'مراقبة المصروفات: إجمالي التكاليف من المشتريات والعمليات',
          'تتبع صافي الربح: يُحسب بطرح المصروفات من الإيرادات (أخضر للموجب، أحمر للسالب)',
          'فحص المخزون المنخفض: عدد المنتجات المتبقية 10 وحدات أو أقل',
          'انقر على زر التوسيع (↗) في أي بطاقة لعرض التفاصيل الكاملة',
        ],
      },
      salesChart: {
        title: '2. تحليل اتجاهات المبيعات',
        steps: [
          'اعرض اتجاه المبيعات لمدة 7 أيام في المخطط المساحي',
          'لون المخطط يشير للاتجاه: أخضر (↑ متزايد)، أحمر (↓ متناقص)، برتقالي (→ مستقر)',
          'مرر الفأرة فوق المخطط لرؤية مبالغ المبيعات الدقيقة لكل يوم',
          'انقر على زر التوسيع لعرض أكبر وأكثر تفصيلاً',
          'استخدم بيانات الاتجاه لتحديد أيام ذروة المبيعات والتخطيط وفقاً لذلك',
        ],
      },
      topSelling: {
        title: '3. مراجعة المنتجات الأكثر مبيعاً',
        steps: [
          'اعرض أفضل 5 منتجات مبيعاً مرتبة حسب الكمية المباعة',
          'المنتجات مرقمة من 1-5 بناءً على الأداء',
          'شاهد إجمالي الكمية المباعة لكل منتج',
          'انقر على زر التوسيع لعرض أفضل 20 منتج مع تفاصيل الإيرادات',
          'استخدم هذه البيانات لتحسين قرارات تخزين المخزون',
        ],
      },
      lowStock: {
        title: '4. إدارة تنبيهات المخزون المنخفض',
        steps: [
          'راجع المنتجات التي تحتوي على 10 وحدات أو أقل في المخزون',
          'كل عنصر يعرض مستوى المخزون الحالي (مثل: "5 متبقية")',
          'انقر على زر "إعادة التخزين" بجانب أي عنصر لإضافة مخزون',
          'أدخل الكمية المطلوبة في نافذة إعادة التخزين',
          'أرسل لتحديث المخزون فوراً',
          'انقر على التوسيع لرؤية القائمة الكاملة لجميع الأصناف منخفضة المخزون',
        ],
      },
      expiring: {
        title: '5. مراقبة الأصناف منتهية الصلاحية',
        steps: [
          'اعرض المنتجات التي تنتهي صلاحيتها خلال الأشهر الثلاثة القادمة',
          'الأصناف مرتبة حسب تاريخ الانتهاء (الأقرب أولاً)',
          'الخلفية الحمراء تشير للأصناف منتهية الصلاحية بالفعل',
          'الخلفية الصفراء تعرض الأصناف التي تنتهي قريباً',
          'مؤشر الأيام المتبقية يساعد في تحديد الأولويات',
          'انقر على التوسيع للقائمة الكاملة وخطط للعروض أو المرتجعات',
        ],
      },
      recentSales: {
        title: '6. مراجعة المعاملات الأخيرة',
        steps: [
          'اعرض آخر 5 معاملات مبيعات',
          'كل إدخال يعرض: اسم/رمز العميل، التاريخ والوقت، رقم المعاملة، طريقة الدفع',
          'طريقة الدفع مرمزة بالألوان: أزرق (فيزا)، أخضر (نقدي)',
          'شاهد المبلغ الإجمالي وعدد الأصناف لكل معاملة',
          'انقر على التوسيع لعرض آخر 20 معاملة مع التفاصيل الكاملة',
        ],
      },
      expandViews: {
        title: '7. استخدام ميزات التوسيع',
        steps: [
          'مرر الفأرة فوق أي بطاقة لوحة معلومات لإظهار زر التوسيع (↗)',
          'انقر على التوسيع لفتح عرض تفصيلي في نافذة',
          'العروض الموسعة تعرض المزيد من البيانات والأعمدة الإضافية وخيارات التصدير',
          'استخدم أزرار تصدير CSV في العروض الموسعة للتحليل غير المتصل',
          'أغلق النوافذ بالنقر خارج أو باستخدام زر X',
        ],
      },
      restocking: {
        title: '8. إعادة التخزين السريع',
        steps: [
          'حدد صنف منخفض المخزون من قسم التنبيهات',
          'انقر على زر "إعادة التخزين" بجانب المنتج',
          'تفتح نافذة تعرض مستوى المخزون الحالي',
          'أدخل الكمية المراد إضافتها (افتراضي: 10 وحدات)',
          'انقر "تأكيد" لتحديث المخزون فوراً',
          'التغييرات تنعكس فوراً عبر جميع العروض',
        ],
      },
    },
    features: {
      title: 'الميزات الرئيسية',
      items: [
        'لوحة مقاييس مالية فورية',
        'مخطط اتجاه مبيعات ديناميكي مع ترميز لوني ذكي',
        'تصنيف أفضل 5 منتجات مبيعاً',
        'تنبيهات تلقائية للمخزون المنخفض (≤10 وحدات)',
        'تتبع انتهاء الصلاحية للأشهر الثلاثة القادمة',
        'موجز معاملات المبيعات الأخيرة',
        'عروض تفصيلية قابلة للتوسيع لجميع الأقسام',
        'تصدير CSV لتحليل البيانات غير المتصل',
        'وظيفة إعادة تخزين سريعة من لوحة المعلومات',
        'تخطيط شبكي متجاوب يتكيف مع حجم الشاشة',
        'دعم الوضع الداكن للعرض المريح',
      ],
    },
    understanding: {
      title: 'فهم عناصر لوحة المعلومات',
      cards: [
        'بطاقة الإيرادات: تعرض إجمالي دخل المبيعات مع موضوع اللون الأساسي',
        'بطاقة المصروفات: تعرض إجمالي تكاليف الشراء باللون الأحمر',
        'بطاقة صافي الربح: الإيرادات - المصروفات، اللون يتغير حسب الموجب/السالب',
        'بطاقة المخزون المنخفض: عدد المنتجات التي تحتاج انتباه باللون البرتقالي',
        'مخطط المبيعات: اتجاه 7 أيام مع تعبئة متدرجة وتلوين ديناميكي',
        'الأكثر مبيعاً: قائمة مرتبة مع شارات مرقمة والكمية المباعة',
        'تنبيهات المخزون المنخفض: بطاقات بحدود برتقالية مع زر إعادة التخزين',
        'الأصناف منتهية الصلاحية: مرمزة بالألوان حسب الإلحاح (أحمر=منتهي، أصفر=قريباً)',
        'المبيعات الأخيرة: بطاقات معاملات مع أيقونات طرق الدفع',
      ],
      expandInfo:
        'أزرار التوسيع (↗) تظهر عند التمرير وتوفر وصولاً لعروض تفصيلية مع المزيد من نقاط البيانات والرؤى الإضافية وقدرات التصدير.',
    },
    tips: {
      title: 'نصائح وأفضل الممارسات',
      items: [
        'تحقق من لوحة المعلومات يومياً للبقاء على اطلاع بأداء الصيدلية',
        'راقب اتجاهات المبيعات لتحديد الفترات المزدحمة وضبط التوظيف',
        'تصرف فوراً بشأن تنبيهات المخزون المنخفض لمنع نفاد المخزون',
        'راجع الأصناف منتهية الصلاحية أسبوعياً لتخطيط العروض أو المرتجعات',
        'استخدم بيانات الأكثر مبيعاً لتحسين الشراء والتنسيق على الرفوف',
        'صدّر العروض الموسعة للتقارير والتحليلات الشهرية',
        'خصص وقتاً كل صباح لمراجعة المبيعات الأخيرة',
        'راقب اتجاهات صافي الربح لتحديد فرص التحكم في التكاليف',
        'استخدم إعادة التخزين السريع لاحتياجات التجديد العاجلة',
        'قارن المقاييس الحالية مع الفترات السابقة لتتبع النمو',
      ],
    },
  },
};

/**
 * Real-Time Sales Monitor Help Instructions
 */
export const REALTIME_SALES_MONITOR_HELP = {
  EN: {
    title: 'How to Use Real-Time Sales Monitor',
    overview: {
      title: 'Overview',
      description:
        "The Real-Time Sales Monitor provides a live, dynamic view of your pharmacy's sales activity today. Track revenue, transactions, and inventory movement as they happen with animated counters, live transaction feeds, and interactive charts.",
    },
    usage: {
      title: 'How to Use',
      heroStats: {
        title: '1. Understanding Hero Stats Cards',
        steps: [
          "Today's Revenue: Total sales income for today with percentage change indicator",
          'Total Transactions: Number of completed sales and average transaction value',
          'Items Sold: Total units sold today and top-selling category',
          'Active Counters: Number of POS stations currently online vs total',
          'Click any card to expand and see detailed breakdown',
        ],
      },
      transactionFeed: {
        title: '2. Monitoring Live Transactions',
        steps: [
          'View the 20 most recent transactions in real-time',
          'New transactions appear at the top with subtle animation',
          'Each row shows: Time, Sale ID, Items count, Total, Payment method, Status',
          'VIP customers are marked with gold "verified" badge',
          'High-value transactions (top 5%) are marked with "stars" badge',
          'Payment icons: Green (Cash), Blue (Card/Visa)',
        ],
      },
      filterTransactions: {
        title: '3. Filtering Transactions',
        steps: [
          'Use filter buttons above the transaction table (ALL, VIP, HIGH_VALUE)',
          'ALL: Shows all recent transactions (default live view)',
          'VIP: Filters to show only VIP customer transactions (≥$1000 total purchases)',
          'HIGH_VALUE: Shows only top 5% highest-value transactions of the day',
          'Switching filters refreshes the view instantly',
        ],
      },
      insightCards: {
        title: '4. Reading Insight Cards',
        steps: [
          'Sales Rate: Average revenue generated per hour since opening',
          'Invoices: Average number of transactions processed per hour',
          'New Cust.: Rate of new customers acquired per hour',
          'Orders: Walk-in vs Delivery breakdown with progress bars',
          'Customers: Registered vs Anonymous breakdown percentage',
        ],
      },
      hourlyChart: {
        title: '5. Analyzing Hourly Trends',
        steps: [
          'View hourly revenue distribution in the area chart',
          'Chart shows data from opening hour to current hour',
          'Hover over chart to see exact revenue for any hour',
          'Identify peak hours and slow periods for staffing optimization',
          'Blue gradient indicates revenue accumulation',
        ],
      },
      topProducts: {
        title: '6. Reviewing Top Products',
        steps: [
          'View top 5 best-selling products of the day',
          'Products ranked by quantity sold',
          'Each entry shows: Rank, Product name, Quantity sold, Revenue generated',
          'Use this data to monitor inventory levels of popular items',
        ],
      },
      paymentMethods: {
        title: '7. Understanding Payment Distribution',
        steps: [
          'Donut chart shows Cash vs Card payment breakdown',
          'Center displays total revenue for the day',
          'Green represents Cash payments',
          'Indigo/Purple represents Card/Visa payments',
          'Hover for exact amounts per payment method',
        ],
      },
      categoryDistribution: {
        title: '8. Analyzing Category Distribution',
        steps: [
          'View sales breakdown by product category',
          'Medicine: Blue segment (tablets, capsules, syrups, etc.)',
          'Cosmetic: Pink segment (creams, lotions, skincare)',
          'General: Gray segment (other non-categorized items)',
          'Identify which categories drive the most revenue',
        ],
      },
    },
    features: {
      title: 'Key Features',
      items: [
        'Live indicator with pulsing animation showing real-time status',
        'Animated number counters with smooth digit transitions',
        'Auto-refreshing transaction feed every 60 seconds',
        'New transaction highlighting with fade-in animation',
        'VIP and High-Value transaction badges',
        'Filterable transaction table (ALL/VIP/High Value)',
        'Hourly rate calculations (Sales, Invoices, Customers)',
        'Order type distribution (Walk-in vs Delivery)',
        'Customer loyalty tracking (Registered vs Anonymous)',
        'Interactive hourly revenue area chart',
        'Top 5 products with revenue data',
        'Payment method pie chart (Cash vs Card)',
        'Category distribution visualization',
        'Expandable cards for detailed analysis',
        'RTL/LTR language support',
        'Dark mode optimized visuals',
      ],
    },
    understanding: {
      title: 'Understanding the Interface',
      cards: [
        'LIVE Badge: Green pulsing indicator confirming real-time data',
        'Revenue Change %: Comparison with previous day (mock data)',
        "High-Value Transaction: Top 5% of today's sales by amount",
        'VIP Customer: Customer with lifetime purchases ≥ $1,000',
        'Hourly Rate: Calculated from opening time to current hour',
        'Walk-in: In-store sales with immediate fulfillment',
        'Delivery: Orders marked for delivery or courier dispatch',
        'Registered: Sales to customers with accounts or loyalty codes',
        'Anonymous: Guest checkout sales without customer identification',
      ],
      liveUpdate:
        'The page automatically refreshes data without requiring manual reload. New transactions slide into the feed with animation.',
    },
    tips: {
      title: 'Tips & Best Practices',
      items: [
        'Keep monitor visible on a secondary screen for constant oversight',
        'Watch for VIP transactions to provide priority service',
        'Monitor hourly trends to optimize staffing during peak times',
        'Check payment distribution to ensure card processing is working',
        'Review top products mid-day to prevent stockouts',
        'Use HIGH_VALUE filter to identify premium customer activity',
        'Compare walk-in vs delivery ratios across days',
        'Track new customer rate as indicator of marketing effectiveness',
        'Expand cards for detailed analysis during slow periods',
        'Use category data to plan promotional activities',
      ],
    },
  },
  AR: {
    title: 'كيفية استخدام مراقب المبيعات الفوري',
    overview: {
      title: 'نظرة عامة',
      description:
        'يوفر مراقب المبيعات الفوري عرضاً ديناميكياً مباشراً لنشاط المبيعات في صيدليتك اليوم. تتبع الإيرادات والمعاملات وحركة المخزون فور حدوثها مع عدادات متحركة وموجز معاملات مباشر ومخططات تفاعلية.',
    },
    usage: {
      title: 'كيفية الاستخدام',
      heroStats: {
        title: '1. فهم بطاقات الإحصائيات الرئيسية',
        steps: [
          'إيرادات اليوم: إجمالي دخل المبيعات لليوم مع مؤشر نسبة التغيير',
          'إجمالي المعاملات: عدد المبيعات المكتملة ومتوسط قيمة المعاملة',
          'الأصناف المباعة: إجمالي الوحدات المباعة اليوم والفئة الأكثر مبيعاً',
          'الكاونترات النشطة: عدد محطات نقاط البيع المتصلة حالياً مقابل الإجمالي',
          'انقر على أي بطاقة للتوسيع ورؤية التفاصيل',
        ],
      },
      transactionFeed: {
        title: '2. مراقبة المعاملات المباشرة',
        steps: [
          'اعرض آخر 20 معاملة في الوقت الفعلي',
          'المعاملات الجديدة تظهر في الأعلى مع رسوم متحركة خفيفة',
          'كل صف يعرض: الوقت، رقم البيع، عدد الأصناف، الإجمالي، طريقة الدفع، الحالة',
          'عملاء VIP موسومون بشارة "verified" ذهبية',
          'المعاملات عالية القيمة (أعلى 5%) موسومة بشارة "stars"',
          'أيقونات الدفع: أخضر (نقدي)، أزرق (بطاقة/فيزا)',
        ],
      },
      filterTransactions: {
        title: '3. تصفية المعاملات',
        steps: [
          'استخدم أزرار الفلتر فوق جدول المعاملات (ALL, VIP, HIGH_VALUE)',
          'ALL: يعرض جميع المعاملات الأخيرة (العرض المباشر الافتراضي)',
          'VIP: يصفي لعرض معاملات عملاء VIP فقط (≥1000$ إجمالي المشتريات)',
          'HIGH_VALUE: يعرض أعلى 5% معاملات قيمة لليوم فقط',
          'تبديل الفلاتر يحدث العرض فوراً',
        ],
      },
      insightCards: {
        title: '4. قراءة بطاقات الإحصائيات',
        steps: [
          'معدل المبيعات: متوسط الإيرادات المولدة في الساعة منذ الافتتاح',
          'الفواتير: متوسط عدد المعاملات المعالجة في الساعة',
          'عملاء جدد: معدل اكتساب العملاء الجدد في الساعة',
          'الطلبات: توزيع الزيارات مقابل التوصيل مع أشرطة تقدم',
          'العملاء: نسبة المسجلين مقابل المجهولين',
        ],
      },
      hourlyChart: {
        title: '5. تحليل الاتجاهات بالساعة',
        steps: [
          'اعرض توزيع الإيرادات بالساعة في المخطط المساحي',
          'المخطط يعرض البيانات من ساعة الافتتاح للساعة الحالية',
          'مرر فوق المخطط لرؤية الإيرادات الدقيقة لأي ساعة',
          'حدد ساعات الذروة والفترات البطيئة لتحسين التوظيف',
          'التدرج الأزرق يشير لتراكم الإيرادات',
        ],
      },
      topProducts: {
        title: '6. مراجعة أفضل المنتجات',
        steps: [
          'اعرض أفضل 5 منتجات مبيعاً لليوم',
          'المنتجات مرتبة حسب الكمية المباعة',
          'كل إدخال يعرض: الترتيب، اسم المنتج، الكمية المباعة، الإيرادات المولدة',
          'استخدم هذه البيانات لمراقبة مستويات مخزون الأصناف الشائعة',
        ],
      },
      paymentMethods: {
        title: '7. فهم توزيع طرق الدفع',
        steps: [
          'المخطط الدائري يعرض توزيع الدفع النقدي مقابل البطاقة',
          'المركز يعرض إجمالي الإيرادات لليوم',
          'الأخضر يمثل المدفوعات النقدية',
          'البنفسجي يمثل مدفوعات البطاقة/الفيزا',
          'مرر لرؤية المبالغ الدقيقة لكل طريقة دفع',
        ],
      },
      categoryDistribution: {
        title: '8. تحليل توزيع الفئات',
        steps: [
          'اعرض تفصيل المبيعات حسب فئة المنتج',
          'الأدوية: الجزء الأزرق (أقراص، كبسولات، شراب، إلخ)',
          'مستحضرات التجميل: الجزء الوردي (كريمات، لوشن، العناية بالبشرة)',
          'عام: الجزء الرمادي (الأصناف غير المصنفة الأخرى)',
          'حدد الفئات التي تحقق أكبر قدر من الإيرادات',
        ],
      },
    },
    features: {
      title: 'الميزات الرئيسية',
      items: [
        'مؤشر مباشر مع رسوم متحركة نابضة تعرض الحالة الفورية',
        'عدادات أرقام متحركة مع انتقالات سلسة للأرقام',
        'موجز معاملات يتحدث تلقائياً كل 60 ثانية',
        'تمييز المعاملات الجديدة برسوم متحركة للتلاشي',
        'شارات معاملات VIP وعالية القيمة',
        'جدول معاملات قابل للتصفية (الكل/VIP/قيمة عالية)',
        'حسابات المعدل بالساعة (المبيعات، الفواتير، العملاء)',
        'توزيع نوع الطلب (زيارة مقابل توصيل)',
        'تتبع ولاء العملاء (مسجلون مقابل مجهولون)',
        'مخطط مساحي تفاعلي للإيرادات بالساعة',
        'أفضل 5 منتجات مع بيانات الإيرادات',
        'مخطط دائري لطرق الدفع (نقدي مقابل بطاقة)',
        'تصور توزيع الفئات',
        'بطاقات قابلة للتوسيع للتحليل المفصل',
        'دعم اللغة من اليمين لليسار واليسار لليمين',
        'مرئيات محسنة للوضع الداكن',
      ],
    },
    understanding: {
      title: 'فهم الواجهة',
      cards: [
        'شارة LIVE: مؤشر أخضر نابض يؤكد البيانات الفورية',
        'نسبة تغير الإيرادات: مقارنة مع اليوم السابق (بيانات تجريبية)',
        'معاملة عالية القيمة: أعلى 5% من مبيعات اليوم بالمبلغ',
        'عميل VIP: عميل بإجمالي مشتريات مدى الحياة ≥ 1,000$',
        'المعدل بالساعة: محسوب من وقت الافتتاح للساعة الحالية',
        'زيارة: مبيعات داخل المتجر مع تنفيذ فوري',
        'توصيل: طلبات موسومة للتوصيل أو الإرسال',
        'مسجل: مبيعات لعملاء بحسابات أو رموز ولاء',
        'مجهول: مبيعات دفع ضيف بدون تعريف العميل',
      ],
      liveUpdate:
        'الصفحة تحدث البيانات تلقائياً دون الحاجة لإعادة التحميل اليدوي. المعاملات الجديدة تنزلق للموجز برسوم متحركة.',
    },
    tips: {
      title: 'نصائح وأفضل الممارسات',
      items: [
        'أبقِ المراقب مرئياً على شاشة ثانوية للمراقبة المستمرة',
        'راقب معاملات VIP لتقديم خدمة ذات أولوية',
        'راقب الاتجاهات بالساعة لتحسين التوظيف خلال أوقات الذروة',
        'تحقق من توزيع الدفع للتأكد من عمل معالجة البطاقات',
        'راجع أفضل المنتجات في منتصف اليوم لمنع نفاد المخزون',
        'استخدم فلتر HIGH_VALUE لتحديد نشاط العملاء المميزين',
        'قارن نسب الزيارة مقابل التوصيل عبر الأيام',
        'تتبع معدل العملاء الجدد كمؤشر لفعالية التسويق',
        'وسّع البطاقات للتحليل المفصل خلال الفترات البطيئة',
        'استخدم بيانات الفئات للتخطيط للأنشطة الترويجية',
      ],
    },
  },
};

/**
 * Organization Management Help Instructions
 */
export const ORG_MANAGEMENT_HELP = {
  EN: {
    title: 'How to Manage Organization',
    overview: {
      title: 'Overview',
      description:
        'The Organization Management module provides a centralized view of your entire organization. Monitor branch performance, manage employees across all branches, and track central quotas and subscriptions.',
    },
    usage: {
      title: 'How to Use',
      pulseGrid: {
        title: '1. Monitoring Organization Pulse',
        steps: [
          'Review top-level metrics for the entire organization',
          'Track total revenue, employee count, and active branches',
          'Monitor overall performance trends at a glance',
        ],
      },
      branchMonitor: {
        title: '2. Branch Performance',
        steps: [
          'View individual branch performance in the monitor section',
          'Compare branches by revenue and activity',
          'Click on a branch to view detailed branch-specific analytics',
        ],
      },
      memberMatrix: {
        title: '3. Global Member Management',
        steps: [
          'Manage all organization employees in the Global Matrix',
          'Quickly search for employees across all branches',
          'Filter the list by branch for more focused management',
          'Update roles and permissions directly from the matrix',
        ],
      },
      quotas: {
        title: '4. Managing Quotas',
        steps: [
          'Track your current subscription usage and limits',
          'Monitor branch count, employee limits, and feature access',
          'Get alerts when you approach your organization limits',
        ],
      },
      lastOwner: {
        title: '5. Security: The Last Owner Rule',
        steps: [
          'The system prevents the removal of the final organization owner',
          'You cannot downgrade your own role if you are the only owner',
          'This ensures your organization is never left without an administrator',
        ],
      },
    },
    features: {
      title: 'Key Features',
      items: [
        'Organization-wide data aggregation',
        'Cross-branch member list with smart search',
        'High-density branch performance monitoring',
        'Centralized subscription and quota tracking',
        'RTL-first design with Material UI aesthetics',
        'Built-in security guards for owner management',
      ],
    },
    understanding: {
      title: 'Understanding the Interface',
      cards: [
        'Pulse Grid: Real-time high-level organizational health metrics',
        'Branch Monitor: Revenue and activity comparison across locations',
        'Global Matrix: Unified directory of all organizational human resources',
        'Quota Monitor: Visual representation of license and resource limits',
      ],
    },
    tips: {
      title: 'Tips & Best Practices',
      items: [
        'Use branch filters in the matrix for easier navigation',
        'Regularly monitor quotas to avoid service interruptions',
        'Keep employee records updated for accurate reporting',
        'Leverage the "Last Owner Rule" for organizational stability',
      ],
    },
  },
  AR: {
    title: 'كيفية إدارة المنظمة',
    overview: {
      title: 'نظرة عامة',
      description:
        'توفر وحدة إدارة المنظمة عرضاً مركزياً لمنظمتك بالكامل. راقب أداء الفروع، وأدر الموظفين عبر جميع الفروع، وتتبع الحصص المركزية والاشتراكات.',
    },
    usage: {
      title: 'كيفية الاستخدام',
      pulseGrid: {
        title: '1. مراقبة نبض المنظمة',
        steps: [
          'راجع المقاييس عالية المستوى للمنظمة بالكامل',
          'تتبع إجمالي الإيرادات، وعدد الموظفين، والفروع النشطة',
          'راقب اتجاهات الأداء العام بنظرة سريعة',
        ],
      },
      branchMonitor: {
        title: '2. أداء الفروع',
        steps: [
          'اعرض أداء الفروع الفردية في قسم المراقب',
          'قارن الفروع حسب الإيرادات والنشاط',
          'انقر على فرع لعرض تحليلات مفصلة خاصة بالفرع',
        ],
      },
      memberMatrix: {
        title: '3. الإدارة العامة للأعضاء',
        steps: [
          'أدر جميع موظفي المنظمة في المصفوفة العامة',
          'ابحث بسرعة عن الموظفين عبر جميع الفروع',
          'قم بتصفية القائمة حسب الفرع لإدارة أكثر تركيزاً',
          'حدث الأدوار والأذونات مباشرة من المصفوفة',
        ],
      },
      quotas: {
        title: '4. إدارة الحصص',
        steps: [
          'تتبع استخدام اشتراكك الحالي وحدوده',
          'راقب عدد الفروع، وحدود الموظفين، والوصول إلى الميزات',
          'احصل على تنبيهات عندما تقترب من حدود منظمتك',
        ],
      },
      lastOwner: {
        title: '5. الأمان: قاعدة المالك الأخير',
        steps: [
          'يمنع النظام إزالة المالك الأخير للمنظمة',
          'لا يمكنك خفض دورك الخاص إذا كنت المالك الوحيد',
          'يضمن ذلك عدم ترك منظمتك بدون مسؤول أبداً',
        ],
      },
    },
    features: {
      title: 'الميزات الرئيسية',
      items: [
        'تجميع البيانات على مستوى المنظمة',
        'قائمة أعضاء عبر الفروع مع بحث ذكي',
        'مراقبة أداء الفروع عالية الكثافة',
        'تتبع مركزي للاشتراكات والحصص',
        'تصميم يدعم العربية أولاً بجماليات Material UI',
        'حراس أمان مدمجون لإدارة المالكين',
      ],
    },
    understanding: {
      title: 'فهم الواجهة',
      cards: [
        'شبكة النبض: مقاييس صحة المنظمة عالية المستوى في الوقت الفعلي',
        'مراقب الفروع: مقارنة الإيرادات والنشاط عبر المواقع',
        'المصفوفة العامة: دليل موحد لجميع الموارد البشرية في المنظمة',
        'مراقب الحصص: تمثيل مرئي لحدود الترخيص والموارد',
      ],
    },
    tips: {
      title: 'نصائح وأفضل الممارسات',
      items: [
        'استخدم فلاتر الفروع في المصفوفة لتنقل أسهل',
        'راقب الحصص بانتظام لتجنب انقطاع الخدمة',
        'حافظ على تحديث سجلات الموظفين لتقارير دقيقة',
        'استفد من "قاعدة المالك الأخير" لاستقرار المنظمة',
      ],
    },
  },
};
