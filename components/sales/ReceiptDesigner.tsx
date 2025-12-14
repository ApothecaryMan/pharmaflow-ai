import React, { useState, useEffect } from 'react';
import { SmartInput } from '../common/SmartInputs';
import { generateInvoiceHTML, InvoiceTemplateOptions } from '../sales/InvoiceTemplate';
import { Sale } from '../../types';

interface ReceiptDesignerProps {
  color: string;
  t: any;
  language: 'EN' | 'AR';
}

export const ReceiptDesigner: React.FC<ReceiptDesignerProps> = ({ color, t, language }) => {
  // Track if component has mounted (to avoid overwriting localStorage on first render)
  const [hasMounted, setHasMounted] = useState(false);

  // 1. State for Designer Options - Lazy initialization from localStorage
  const [options, setOptions] = useState<InvoiceTemplateOptions>(() => {
    const defaultOptions: InvoiceTemplateOptions = {
      storeName: 'PharmaFlow Pharmacy',
      storeSubtitle: 'Premium Care Center',
      headerAddress: language === 'AR' ? '١٢٣ رسينا' : '123 Rasena',
      headerArea: language === 'AR' ? 'مدينة نصر' : 'Nasr City',
      headerHotline: '19099',
      footerMessage: 'Thank you for your visit!',
      footerInquiry: 'For questions, call 19099',
      termsCondition: language === 'AR' 
        ? 'ادوية التلاجة ومستحضرات التجميل وشرايط الدواء لا ترجع<br>استرجاع الادوية والاجهزة السليمة خلال 14 يوم' 
        : 'Refrigerated medicines & cosmetics are non-refundable<br>Returns within 14 days',
      language: language
    };
    
    // Try to load from localStorage immediately
    try {
      const saved = localStorage.getItem('invoice_template_options');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultOptions, ...parsed };
      }
    } catch (e) {
      console.error("Failed to load receipt options", e);
    }
    return defaultOptions;
  });

  // Mark as mounted after first render
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Save options on change (only after mount to avoid overwriting)
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem('invoice_template_options', JSON.stringify(options));
    }
  }, [options, hasMounted]);

  // Preview-only toggles (not saved to localStorage, just for visualization)
  const [showDeliveryPreview, setShowDeliveryPreview] = useState(false);
  const [showReturnsPreview, setShowReturnsPreview] = useState(false);

  // 2. Dummy Sale Data for Preview
  const DUMMY_SALE: Sale = {
    id: 'TRX-998877',
    date: new Date().toISOString(),
    dailyOrderNumber: 42,
    status: 'completed',
    items: [
      { id: '1', name: 'Panadol Extra 500mg', genericName: 'Paracetamol', quantity: 2, price: 15.50, costPrice: 10, category: 'Medicine', isUnit: false, stock: 100, expiryDate: '2025-12-31', description: 'Painkiller', discount: 10 },
      { id: '2', name: 'Vitamin C 1000mg', genericName: 'Ascorbic Acid', quantity: 3, price: 45.00, costPrice: 30, category: 'Vitamins', isUnit: true, unitsPerPack: 30, stock: 50, expiryDate: '2026-06-30', description: 'Immunity' },
      { id: '3', name: 'Face Mask (Premium)', genericName: 'Mask', quantity: 5, price: 5.00, costPrice: 2, category: 'Supplies', isUnit: false, stock: 500, expiryDate: '2030-01-01', description: 'Protection' },
    ],
    subtotal: 101.00,
    total: showDeliveryPreview ? 111.00 : 101.00,
    globalDiscount: 0,
    paymentMethod: 'cash',
    customerName: 'Ahmed Mohamed',
    customerCode: 'CUST-101',
    // Delivery preview - with address and phone
    saleType: showDeliveryPreview ? 'delivery' : 'walk-in',
    deliveryFee: showDeliveryPreview ? 10.00 : 0,
    customerPhone: showDeliveryPreview ? '01012345678' : undefined,
    customerAddress: showDeliveryPreview ? 'شارع الملك فيصل - الجيزة' : undefined,
    customerStreetAddress: showDeliveryPreview ? 'عمارة 15 - الدور 3 - شقة 7' : undefined,
    // Returns preview
    hasReturns: showReturnsPreview,
    netTotal: showReturnsPreview ? 56.00 : undefined,
    itemReturnedQuantities: showReturnsPreview ? { '2_1': 1 } : undefined
  };

  // 3. Preview HTML Generation
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    const html = generateInvoiceHTML(DUMMY_SALE, { ...options, language });
    setPreviewHtml(html);
  }, [options, language, showDeliveryPreview, showReturnsPreview]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6 p-4">
      {/* LEFT: Controls */}
      <div className="w-full lg:w-1/3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 overflow-y-auto custom-scrollbar">
        <h2 className={`text-2xl font-bold mb-6 text-${color}-600`}>
           {language === 'AR' ? 'مصمم الفاتورة' : 'Receipt Designer'}
        </h2>

        <div className="space-y-4">
          {/* Logo Upload + SVG Code - Side by Side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Logo Upload */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <span className="material-symbols-rounded text-[14px]">image</span>
                {language === 'AR' ? 'صورة' : 'Image'}
              </label>
              {(options.logoBase64 && !options.logoSvgCode) ? (
                <div className="relative bg-gray-50 dark:bg-gray-900 rounded-xl p-2 flex items-center justify-center border border-gray-200 dark:border-gray-800 aspect-square">
                  <img 
                    src={options.logoBase64} 
                    alt="Logo" 
                    style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }}
                  />
                  <button
                    onClick={() => setOptions({ ...options, logoBase64: '' })}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm z-10"
                  >
                    <span className="material-symbols-rounded text-[12px]">close</span>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors bg-gray-50 dark:bg-gray-900 aspect-square">
                  <span className="material-symbols-rounded text-gray-400 text-[24px]">upload</span>
                  <span className="text-xs text-gray-500">PNG / SVG</span>
                  <input 
                    type="file" 
                    accept=".png,.svg,image/png,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setOptions({ ...options, logoBase64: event.target?.result as string, logoSvgCode: '' });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>

            {/* SVG Code Input */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <span className="material-symbols-rounded text-[14px]">code</span>
                {language === 'AR' ? 'كود SVG' : 'SVG Code'}
              </label>
              {options.logoSvgCode ? (
                <div className="relative bg-gray-50 dark:bg-gray-900 rounded-xl p-2 flex items-center justify-center border border-gray-200 dark:border-gray-800 aspect-square">
                  <div 
                    style={{ maxWidth: '80%', maxHeight: '80%', overflow: 'hidden' }}
                    dangerouslySetInnerHTML={{ __html: options.logoSvgCode }} 
                  />
                  <button
                    onClick={() => setOptions({ ...options, logoSvgCode: '' })}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm z-10"
                  >
                    <span className="material-symbols-rounded text-[12px]">close</span>
                  </button>
                </div>
              ) : (
                <textarea 
                  value={options.logoSvgCode || ''}
                  onChange={(e) => setOptions({ ...options, logoSvgCode: e.target.value, logoBase64: '' })}
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none transition-all resize-none font-mono text-[9px] aspect-square"
                  placeholder={language === 'AR' ? '<كود svg>...' : '<svg>...</svg>'}
                  dir="ltr"
                />
              )}
            </div>
          </div>

          {/* Font Selector */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <span className="material-symbols-rounded text-[14px]">text_format</span>
              {language === 'AR' ? 'الخط' : 'Font'}
            </label>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setOptions({ ...options, receiptFont: 'courier' })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  (options.receiptFont || 'courier') === 'courier'
                    ? `bg-${color}-600 text-white shadow-sm`
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                Fake Receipt
              </button>
              <button
                onClick={() => setOptions({ ...options, receiptFont: 'receipt-basic' })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  options.receiptFont === 'receipt-basic'
                    ? `bg-${color}-600 text-white shadow-sm`
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                Receiptional
              </button>
            </div>
          </div>

          {/* Preview Options - Visual Only */}
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeliveryPreview}
                onChange={(e) => setShowDeliveryPreview(e.target.checked)}
                className={`w-4 h-4 rounded border-gray-300 text-${color}-600 focus:ring-${color}-500`}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'AR' ? 'عرض الدليفري' : 'Show Delivery'}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showReturnsPreview}
                onChange={(e) => setShowReturnsPreview(e.target.checked)}
                className={`w-4 h-4 rounded border-gray-300 text-${color}-600 focus:ring-${color}-500`}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'AR' ? 'عرض المرتجعات' : 'Show Returns'}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.showAddressBox !== false}
                onChange={(e) => setOptions({ ...options, showAddressBox: e.target.checked })}
                className={`w-4 h-4 rounded border-gray-300 text-${color}-600 focus:ring-${color}-500`}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'AR' ? 'بوردر العنوان' : 'Address Box'}
              </span>
            </label>
          </div>

          <hr className="border-dashed border-gray-200 dark:border-gray-700 my-4" />

          {/* Pharmacy Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'AR' ? 'اسم الصيدلية' : 'Pharmacy Name'}
            </label>
            <SmartInput 
                value={options.storeName}
                onChange={(e) => setOptions({...options, storeName: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                placeholder={language === 'AR' ? 'اسم الصيدلية...' : 'Pharmacy name...'}
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'AR' ? 'العنوان الفرعي' : 'Subtitle'}
            </label>
            <SmartInput 
                value={options.storeSubtitle}
                onChange={(e) => setOptions({...options, storeSubtitle: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                placeholder={language === 'AR' ? 'شعار الصيدلية...' : 'Pharmacy slogan...'}
            />
          </div>

          {/* Address Line 1 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'AR' ? 'العنوان (سطر 1)' : 'Address Line 1'}
            </label>
            <SmartInput 
                value={options.headerAddress}
                onChange={(e) => setOptions({...options, headerAddress: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                placeholder={language === 'AR' ? 'العنوان...' : 'Address line 1...'}
            />
          </div>

           {/* Address Line 2 */}
           <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'AR' ? 'العنوان (سطر 2)' : 'Address Line 2 (Area)'}
            </label>
            <SmartInput 
                value={options.headerArea}
                onChange={(e) => setOptions({...options, headerArea: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                placeholder={language === 'AR' ? 'المنطقة/المدينة...' : 'Area/City...'}
            />
          </div>

          {/* Hotline */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'AR' ? 'الخط الساخن' : 'Hotline'}
            </label>
            <SmartInput 
                value={options.headerHotline}
                onChange={(e) => setOptions({...options, headerHotline: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                placeholder={language === 'AR' ? 'الخط الساخن...' : '19xxx'}
            />
          </div>

          <hr className="border-dashed border-gray-200 dark:border-gray-700 my-4" />

          {/* Terms */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'AR' ? 'الشروط والأحكام' : 'Terms & Conditions'}
            </label>
            <textarea 
                value={options.termsCondition?.replace(/<br>/g, '\n')}
                onChange={(e) => setOptions({...options, termsCondition: e.target.value.replace(/\n/g, '<br>')})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all h-24 resize-none"
                placeholder={language === 'AR' ? 'الشروط والأحكام...' : 'Terms...'}
                dir={language === 'AR' ? 'rtl' : 'ltr'}
            />
          </div>

          <hr className="border-dashed border-gray-200 dark:border-gray-700 my-4" />

          {/* Footer Message */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'AR' ? 'رسالة التذييل' : 'Footer Message'}
            </label>
            <SmartInput 
                value={options.footerMessage}
                onChange={(e) => setOptions({...options, footerMessage: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                placeholder={language === 'AR' ? 'رسالة الشكر...' : 'Thank you message...'}
            />
          </div>
          
           {/* Inquiry Message */}
           <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'AR' ? 'رسالة الاستفسار' : 'Inquiry Info'}
            </label>
            <SmartInput 
                value={options.footerInquiry}
                onChange={(e) => setOptions({...options, footerInquiry: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                placeholder={language === 'AR' ? 'معلومات التواصل...' : 'Contact info...'}
            />
          </div>


        </div>
      </div>

      {/* RIGHT: Preview */}
      <div className="flex-1 rounded-2xl flex justify-center p-8 border border-gray-200 dark:border-gray-800 overflow-y-auto custom-scrollbar bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-gray-100 dark:bg-gray-950">
        <div className="bg-white shadow-2xl shadow-gray-300 dark:shadow-black flex-shrink-0 transition-all duration-200 ease-in-out rounded-lg overflow-hidden" style={{ width: '79mm', height: 'fit-content', minHeight: '300px' }}>
          <iframe 
            srcDoc={previewHtml}
            className="w-full border-none pointer-events-none block"
            style={{ height: '0px', minHeight: '100%', overflow: 'hidden' }}
            title="Receipt Preview"
            scrolling="no"
            onLoad={(e) => {
              const iframe = e.target as HTMLIFrameElement;
              if (iframe.contentWindow) {
                // Determine height from content
                const height = iframe.contentWindow.document.body.scrollHeight;
                // Add a small buffer just in case
                iframe.style.height = `${height + 20}px`;
                // Also ensure parent gets updated if needed
                iframe.parentElement!.style.height = `${height + 20}px`;
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
