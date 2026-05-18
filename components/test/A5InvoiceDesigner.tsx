import React, { useState, useRef } from 'react';
import { PageHeader } from '../common/PageHeader';

interface InvoiceItem {
  id: string;
  nameAr: string;
  nameEn: string;
  batch: string;
  expiry: string;
  qty: number; // packages
  bonus: number; // extra bonus packages
  publicPrice: number; // EGP (Price for consumers)
  buyPrice: number; // EGP (Price paid to supplier)
  discount: number; // percentage (e.g. 20%)
  tax: number; // VAT percentage (e.g. 14%)
}

interface SupplierTemplate {
  id: string;
  nameAr: string;
  nameEn: string;
  typeAr: string;
  typeEn: string;
  logo: string; // icon name or emoji representation
  accentColor: string; // tailwind color class
  secondaryColor: string;
  commercialRegister: string;
  taxCard: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  stampAr: string;
  stampEn: string;
}

const EGYPTIAN_SUPPLIERS: SupplierTemplate[] = [
  {
    id: 'united-pharmacists',
    nameAr: 'الشركة المتحدة للصيادلة (UCP)',
    nameEn: 'United Company for Pharmacists',
    typeAr: 'شركة مساهمة مصرية لتوزيع الأدوية',
    typeEn: 'Egyptian Joint Stock Co. for Drug Distribution',
    logo: 'corporate_fare',
    accentColor: '#b45309', // Amber-700
    secondaryColor: '#fef3c7',
    commercialRegister: 'س.ت: 45678 - الجيزة',
    taxCard: 'ب.ض: 112-233-445',
    addressAr: 'المنطقة الصناعية الثالثة، السادس من أكتوبر، الجيزة',
    addressEn: '3rd Industrial Zone, 6th of October City, Giza',
    phone: 'الخط الساخن: 19600',
    stampAr: 'الشركة المتحدة للصيادلة - قسم حسابات الموزعين',
    stampEn: 'United Company for Pharmacists - Accounts Dept.'
  },
  {
    id: 'ibnsina-pharma',
    nameAr: 'ابن سينا فارما ش.م.م',
    nameEn: 'Ibnsina Pharma S.A.E',
    typeAr: 'الموزع الأسرع نمواً للأدوية في مصر',
    typeEn: 'Fastest Growing Pharmaceutical Distributor in Egypt',
    logo: 'partner_exchange',
    accentColor: '#047857', // Emerald-700
    secondaryColor: '#d1fae5',
    commercialRegister: 'س.ت: 12345 - القاهرة',
    taxCard: 'ب.ض: 987-654-321',
    addressAr: 'العقار رقم 4، المجاورة الخامسة، التجمع الخامس، القاهرة الجديدة',
    addressEn: 'Building 4, 5th District, 5th Settlement, New Cairo',
    phone: 'الخط الساخن: 19580',
    stampAr: 'ابن سينا فارما - خاضع للمراجعة والفحص',
    stampEn: 'Ibnsina Pharma - Approved & Controlled'
  },
  {
    id: 'egyptian-drug-trading',
    nameAr: 'الشركة المصرية لتجارة الأدوية',
    nameEn: 'Egyptian Drug Trading Company',
    typeAr: 'إحدى شركات وزارة قطاع الأعمال العام',
    typeEn: 'State-owned Ministry of Business Sector Affiliate',
    logo: 'account_balance',
    accentColor: '#1d4ed8', // Blue-700
    secondaryColor: '#dbeafe',
    commercialRegister: 'س.ت: 78910 - القاهرة',
    taxCard: 'ب.ض: 556-667-778',
    addressAr: 'شبرا، ميدان الخلفاوي، القاهرة',
    addressEn: 'Shubra, El-Khalafawy Square, Cairo',
    phone: 'الخط الساخن: 16805',
    stampAr: 'المصرية لتجارة الأدوية - صيدلية الإسعاف وفروع التوزيع',
    stampEn: 'Egyptian Drug Trading Co. - Central Distribution'
  }
];

const DEFAULT_MEDICINES: InvoiceItem[] = [
  {
    id: 'med-1',
    nameAr: 'بانادول إكسترا (500 ملجم / 65 ملجم)',
    nameEn: 'Panadol Extra (500mg / 65mg)',
    batch: 'B240508X',
    expiry: '2028-11',
    qty: 150,
    bonus: 10,
    publicPrice: 48.00,
    buyPrice: 38.40,
    discount: 20.00,
    tax: 14.00
  },
  {
    id: 'med-2',
    nameAr: 'كونكور 5 ملجم (30 قرص)',
    nameEn: 'Concor 5mg (30 Tabs)',
    batch: 'C260122A',
    expiry: '2028-06',
    qty: 60,
    bonus: 2,
    publicPrice: 81.00,
    buyPrice: 68.85,
    discount: 15.00,
    tax: 14.00
  },
  {
    id: 'med-3',
    nameAr: 'أوجمنتين 1 جرام (14 قرص)',
    nameEn: 'Augmentin 1g (14 Tabs)',
    batch: 'AUG9901Z',
    expiry: '2027-09',
    qty: 85,
    bonus: 5,
    publicPrice: 131.00,
    buyPrice: 104.80,
    discount: 20.00,
    tax: 14.00
  },
  {
    id: 'med-4',
    nameAr: 'كاتافلام 50 ملجم (20 قرص)',
    nameEn: 'Cataflam 50mg (20 Tabs)',
    batch: 'CAT404M',
    expiry: '2028-02',
    qty: 110,
    bonus: 0,
    publicPrice: 57.00,
    buyPrice: 48.45,
    discount: 15.00,
    tax: 14.00
  },
  {
    id: 'med-5',
    nameAr: 'تلفاست 180 ملجم (20 قرص)',
    nameEn: 'Telfast 180mg (20 Tabs)',
    batch: 'TEL771B',
    expiry: '2027-12',
    qty: 40,
    bonus: 4,
    publicPrice: 105.00,
    buyPrice: 84.00,
    discount: 20.00,
    tax: 14.00
  }
];

const ROW_HEIGHT_CLASS = 'h-[24px]' as const;
const ROW_MAX_HEIGHT_CLASS = 'max-h-[24px]' as const;
const ROW_MIN_HEIGHT_CLASS = 'min-h-[24px]' as const;

export const A5InvoiceDesigner: React.FC<{ color?: string; t?: any; language: 'EN' | 'AR' }> = ({ language }) => {
  // Designer States
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('united-pharmacists');
  const [items, setItems] = useState<InvoiceItem[]>(DEFAULT_MEDICINES);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [accentColor, setAccentColor] = useState<string>('#b45309'); // dynamic accent hex
  const [invoiceNumber, setInvoiceNumber] = useState<string>('PF-2026/8945');
  const [invoiceDate, setInvoiceDate] = useState<string>('2026-05-18');
  const [pharmacyName, setPharmacyName] = useState<string>(language === 'AR' ? 'صيدلية الشفاء الكبرى' : 'Al-Shifa Grand Pharmacy');
  const [pharmacyTaxId, setPharmacyTaxId] = useState<string>('443-882-991');
  const [barcodeNumber, setBarcodeNumber] = useState<string>('SUPP-CODE-9831');

  // Toggle layout details
  const [showBatchNumber, setShowBatchNumber] = useState<boolean>(true);
  const [showBonusColumn, setShowBonusColumn] = useState<boolean>(true);
  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [showSignature, setShowSignature] = useState<boolean>(true);
  const [showDisclaimers, setShowDisclaimers] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base'>('sm');
  const [itemsLanguage, setItemsLanguage] = useState<'AR' | 'EN' | 'BOTH'>('AR');

  // Stamp Customization States
  const [stampStatus, setStampStatus] = useState<string>('★ APPROVED ★');
  const [stampSupplier, setStampSupplier] = useState<string>('UNITED-PHARMACISTS');
  const [stampLocationAR, setStampLocationAR] = useState<string>('مستودع مصر');
  const [stampLocationEN, setStampLocationEN] = useState<string>('EGYPT STAMP');
  const [stampDate, setStampDate] = useState<string>('2026-05-18');
  const [stampRotation, setStampRotation] = useState<number>(6);

  // Edit / Add Item States
  const [newItem, setNewItem] = useState<Partial<InvoiceItem>>({
    nameAr: '',
    nameEn: '',
    batch: 'BAT-' + Math.random().toString(36).substring(3, 8).toUpperCase(),
    expiry: '2028-12',
    qty: 10,
    bonus: 0,
    publicPrice: 50.00,
    buyPrice: 40.00,
    discount: 20.00,
    tax: 14.00
  });

  const supplier = EGYPTIAN_SUPPLIERS.find(s => s.id === selectedSupplierId) || EGYPTIAN_SUPPLIERS[0];
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync color when template changes
  const handleSupplierChange = (id: string) => {
    setSelectedSupplierId(id);
    const chosen = EGYPTIAN_SUPPLIERS.find(s => s.id === id);
    if (chosen) {
      setAccentColor(chosen.accentColor);
      setStampSupplier(chosen.id.toUpperCase());
    }
  };

  // Calculations
  const calculateTotals = () => {
    let totalPublic = 0;
    let totalBuy = 0;
    let totalDiscountVal = 0;
    let totalTaxVal = 0;
    let netTotal = 0;
    let totalPackages = 0;

    items.forEach(item => {
      const lineCost = item.buyPrice * item.qty;
      const discountAmount = lineCost * (item.discount / 100);
      const afterDiscount = lineCost - discountAmount;
      const taxAmount = afterDiscount * (item.tax / 100);
      
      totalPublic += item.publicPrice * item.qty;
      totalBuy += lineCost;
      totalDiscountVal += discountAmount;
      totalTaxVal += taxAmount;
      netTotal += afterDiscount + taxAmount;
      totalPackages += item.qty + item.bonus;
    });

    return {
      totalPublic,
      totalBuy,
      totalDiscountVal,
      totalTaxVal,
      netTotal,
      totalPackages
    };
  };

  const totals = calculateTotals();

  // Add Item to table
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.nameAr || !newItem.nameEn) return;
    
    const added: InvoiceItem = {
      id: 'med-' + Date.now(),
      nameAr: newItem.nameAr || '',
      nameEn: newItem.nameEn || '',
      batch: newItem.batch || 'B' + Date.now().toString().slice(-6),
      expiry: newItem.expiry || '2028-12',
      qty: Number(newItem.qty) || 10,
      bonus: Number(newItem.bonus) || 0,
      publicPrice: Number(newItem.publicPrice) || 10.00,
      buyPrice: Number(newItem.buyPrice) || 8.00,
      discount: Number(newItem.discount) || 0,
      tax: Number(newItem.tax) || 14.00
    };

    setItems([...items, added]);
    // Reset inputs
    setNewItem({
      nameAr: '',
      nameEn: '',
      batch: 'BAT-' + Math.random().toString(36).substring(3, 8).toUpperCase(),
      expiry: '2028-12',
      qty: 10,
      bonus: 0,
      publicPrice: 50.00,
      buyPrice: 40.00,
      discount: 20.00,
      tax: 14.00
    });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Printing engine trigger with isolated print iframe to solve page margins and styling shifts
  const handlePrint = () => {
    const printContent = document.getElementById('printable-a5-invoice');
    if (!printContent) return;

    // Create a temporary hidden printing iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="${language === 'AR' ? 'rtl' : 'ltr'}">
        <head>
          <title>${language === 'AR' ? 'فاتورة مشتريات A5' : 'A5 Invoice'}</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    zinc: {
                      450: '#a1a1aa',
                      550: '#71717a',
                      650: '#52525b',
                      850: '#27272a',
                      855: '#1e1e24',
                    }
                  }
                }
              }
            }
          </script>
          <style>
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
              }
              @page {
                size: A5 ${orientation} !important;
                margin: 0 !important;
              }
              .page-div {
                border: none !important;
                box-shadow: none !important;
                margin: 0 !important;
                padding: 8mm !important;
                width: ${orientation === 'portrait' ? '148mm' : '210mm'} !important;
                height: ${orientation === 'portrait' ? '210mm' : '148mm'} !important;
                page-break-after: always !important;
                break-after: page !important;
              }
              .page-div:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
              color: black;
            }
            .page-div {
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              color: black !important;
              width: ${orientation === 'portrait' ? '148mm' : '210mm'};
              height: ${orientation === 'portrait' ? '210mm' : '148mm'};
            }
          </style>
        </head>
        <body>
          <div class="w-full flex flex-col items-center bg-white" style="direction: ${language === 'AR' ? 'rtl' : 'ltr'};">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Give Tailwind and custom icons/fonts a moment to render cleanly inside the iframe
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove temporary iframe after printing dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 700);
  };

  const fontSizeClass = fontSize === 'xs' ? 'text-[10px]' : fontSize === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#282828] p-6 space-y-6 overflow-y-auto" dir={language === 'AR' ? 'rtl' : 'ltr'}>
      

      {/* Screen layout: Two grid columns (Design Desk on left/right, Live Sheet in main) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ========================================================
            COLUMN 1: LIVE INTERACTIVE PREVIEW & PRINT (lg:col-span-7)
            ======================================================== */}
        <div className="lg:col-span-7 lg:sticky lg:top-24 flex flex-col items-center space-y-4">
          
          {/* Controls Bar for Live Preview Panel */}
          <div className="w-full flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-zinc-650 dark:text-zinc-300">
                {language === 'AR' ? 'لوحة المعاينة التفاعلية المباشرة' : 'Live High-Fidelity Paper Canvas'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.1))}
                  className="w-6 h-6 flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg active:scale-95 transition-all cursor-pointer"
                  title={language === 'AR' ? 'تصغير' : 'Zoom Out'}
                >
                  <span className="material-symbols-rounded text-sm">zoom_out</span>
                </button>
                
                <span className="text-[9px] font-black text-zinc-700 dark:text-zinc-200 min-w-[28px] text-center select-none font-mono">
                  {Math.round(zoomScale * 100)}%
                </span>
                
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.min(1.5, prev + 0.1))}
                  className="w-6 h-6 flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg active:scale-95 transition-all cursor-pointer"
                  title={language === 'AR' ? 'تكبير' : 'Zoom In'}
                >
                  <span className="material-symbols-rounded text-sm">zoom_in</span>
                </button>

                {zoomScale !== 1 && (
                  <button
                    type="button"
                    onClick={() => setZoomScale(1)}
                    className="w-5 h-5 flex items-center justify-center text-amber-650 hover:text-amber-500 rounded-md active:scale-95 transition-all cursor-pointer border-l border-zinc-200 dark:border-zinc-700 pl-0.5"
                    title={language === 'AR' ? 'إعادة تعيين' : 'Reset'}
                  >
                    <span className="material-symbols-rounded text-xs">restart_alt</span>
                  </button>
                )}
              </div>

              {/* Quick orientation toggle */}
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold rounded-lg cursor-pointer transition-all ${
                    orientation === 'portrait'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-400 dark:text-zinc-550 hover:text-zinc-650'
                  }`}
                >
                  <span className="material-symbols-rounded text-xs">crop_portrait</span>
                  {language === 'AR' ? 'رأسي' : 'Portrait'}
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold rounded-lg cursor-pointer transition-all ${
                    orientation === 'landscape'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-400 dark:text-zinc-550 hover:text-zinc-655'
                  }`}
                >
                  <span className="material-symbols-rounded text-xs">crop_landscape</span>
                  {language === 'AR' ? 'أفقي' : 'Landscape'}
                </button>
              </div>
            </div>
          </div>

          {/* Printable Container / A5 Realistic Paper Preview with Zoom Sandbox */}
          <div className="w-full flex justify-center overflow-auto p-6 max-h-[calc(100vh-220px)] custom-scrollbar bg-zinc-100/50 dark:bg-zinc-900/30 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/30">
            <div 
              className="zoom-wrapper shrink-0"
              style={{ 
                transform: `scale(${zoomScale})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                width: orientation === 'portrait' ? '148mm' : '210mm',
                height: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                alignItems: 'center',
              }}
            >
              {/* 
                A5 Dynamic Paginated Layout:
                Each page has a fixed dimension (148mm x 210mm in portrait, or 210mm x 148mm in landscape).
                We dynamically chunk items based on orientation to prevent overflow.
              */}
              {(() => {
                const maxIntermediate = orientation === 'portrait' ? 17 : 8;
                const maxLast = orientation === 'portrait' ? 11 : 4;

                const pageChunks = [];
                let tempItems = [...items];

                while (tempItems.length > 0) {
                  if (tempItems.length <= maxLast) {
                    pageChunks.push(tempItems);
                    tempItems = [];
                    break;
                  }

                  const takeCount = Math.min(tempItems.length, maxIntermediate);
                  const chunk = tempItems.slice(0, takeCount);
                  pageChunks.push(chunk);
                  tempItems = tempItems.slice(takeCount);

                  // If we took everything but this page cannot hold the footer (chunk.length > maxLast)
                  if (tempItems.length === 0 && chunk.length > maxLast) {
                    pageChunks.push([]);
                  }
                }

                if (pageChunks.length === 0) {
                  pageChunks.push([]);
                }

                return (
                  <div
                    id="printable-a5-invoice"
                    className="flex flex-col gap-6 print:gap-0 bg-transparent print:bg-white w-full items-center"
                  >
                    {pageChunks.map((pageItems, pageIdx) => {
                      const isLastPage = pageIdx === pageChunks.length - 1;
                      const maxIntermediate = orientation === 'portrait' ? 14 : 7;
                      const maxLast = orientation === 'portrait' ? 8 : 3;
                      const pageCapacity = isLastPage ? maxLast : maxIntermediate;
                      const previousItemsCount = pageChunks.slice(0, pageIdx).reduce((sum, chunk) => sum + chunk.length, 0);

                      return (
                        <div
                          key={pageIdx}
                          ref={pageIdx === 0 ? printAreaRef : undefined}
                          className={`bg-white text-black border border-zinc-300 shadow-2xl relative overflow-hidden select-none print:shadow-none print:border-none shrink-0 flex flex-col justify-between page-div ${
                            orientation === 'portrait' 
                              ? 'w-[148mm] h-[210mm] pt-[8mm] px-[8mm] pb-[4mm]' 
                              : 'w-[210mm] h-[148mm] pt-[8mm] px-[8mm] pb-[4mm]'
                          }`}
                          style={{
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            direction: language === 'AR' ? 'rtl' : 'ltr',
                            pageBreakAfter: pageIdx < pageChunks.length - 1 ? 'always' : 'auto',
                            breakAfter: pageIdx < pageChunks.length - 1 ? 'page' : 'auto',
                          }}
                        >
                          <div>
                            {/* 1. Header Band with Egyptian Supplier Details */}
                            <div 
                              className="flex items-start justify-between border-b-2 pb-1.5 mb-1.5"
                              style={{ borderColor: accentColor }}
                            >
                              {/* Supplier info */}
                              <div className="space-y-1 max-w-[65%]">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-rounded text-2xl" style={{ color: accentColor }}>
                                    {supplier.logo}
                                  </span>
                                  <h1 className="text-sm font-black tracking-tight" style={{ color: accentColor }}>
                                    {language === 'AR' ? supplier.nameAr : supplier.nameEn}
                                  </h1>
                                </div>
                                <p className="text-[10px] text-zinc-500 font-bold">
                                  {language === 'AR' ? supplier.typeAr : supplier.typeEn}
                                </p>
                                <p className="text-[9px] text-zinc-555 leading-relaxed">
                                  {language === 'AR' ? supplier.addressAr : supplier.addressEn}
                                </p>
                              </div>

                              {/* Corporate/Warehouse Registration Metadata */}
                              <div className="text-right space-y-1">
                                <span className="inline-block px-2 py-0.5 text-[8px] font-black text-white rounded" style={{ backgroundColor: accentColor }}>
                                  {supplier.phone}
                                </span>
                                <p className="text-[9px] text-zinc-650 font-extrabold">
                                  {supplier.commercialRegister}
                                </p>
                                <p className="text-[9px] text-zinc-650 font-extrabold">
                                  {supplier.taxCard}
                                </p>
                              </div>
                            </div>

                            {/* 2. Bill To & Invoice Info block */}
                            <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 mb-3 text-[10px]">
                              <div className="space-y-1">
                                <p className="font-extrabold text-zinc-500 text-[8px] uppercase tracking-wider">
                                  {language === 'AR' ? 'الجهة المستلمة (الصيدلية)' : 'Billed To (Pharmacy)'}
                                </p>
                                <p className="font-black text-zinc-900 text-xs">
                                  {pharmacyName}
                                </p>
                                <p className="text-[9px] text-zinc-600 font-bold">
                                  {language === 'AR' ? 'الرقم الضريبي الصيدلية:' : 'Pharmacy Tax ID:'} {pharmacyTaxId}
                                </p>
                              </div>
                              <div className="space-y-1 text-right">
                                <p className="font-extrabold text-zinc-500 text-[8px] uppercase tracking-wider">
                                  {language === 'AR' ? 'بيانات الحركة الماليّة' : 'Document Details'}
                                </p>
                                <p className="font-bold text-zinc-900">
                                  {language === 'AR' ? 'رقم الفاتورة:' : 'Invoice No:'} <span className="font-mono">{invoiceNumber}</span>
                                </p>
                                <p className="text-[9px] text-zinc-600 font-bold">
                                  {language === 'AR' ? 'تاريخ التوريد:' : 'Supply Date:'} <span className="font-mono">{invoiceDate}</span>
                                </p>
                              </div>
                            </div>

                            {/* 3. Detailed Complex Purchase Medicine Table */}
                            <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-zinc-100 text-zinc-700 font-extrabold border-b border-zinc-200" style={{ fontSize: '9px' }}>
                                    <th className="p-1.5 text-center w-6 border-r border-zinc-200">#</th>
                                    <th className="p-1.5 border-r border-zinc-200">{language === 'AR' ? 'اسم الصنف الدوائي' : 'Medicine (Name/Generic)'}</th>
                                    {showBatchNumber && <th className="p-1.5 text-center border-r border-zinc-200">{language === 'AR' ? 'التشغيلة' : 'Batch'}</th>}
                                    <th className="p-1.5 text-center border-r border-zinc-200">{language === 'AR' ? 'الصلاحية' : 'Expiry'}</th>
                                    <th className="p-1.5 text-center border-r border-zinc-200">{language === 'AR' ? 'الكمية' : 'Qty'}</th>
                                    {showBonusColumn && <th className="p-1.5 text-center border-r border-zinc-200">{language === 'AR' ? 'بونص' : 'Bonus'}</th>}
                                    <th className="p-1.5 text-right border-r border-zinc-200">{language === 'AR' ? 'الجمهور' : 'Public'}</th>
                                    <th className="p-1.5 text-right border-r border-zinc-200">{language === 'AR' ? 'الشراء' : 'Buy'}</th>
                                    <th className="p-1.5 text-center border-x border-zinc-200">{language === 'AR' ? 'الخصم' : 'Disc.'}</th>
                                    <th className="p-1.5 text-right">{language === 'AR' ? 'الإجمالي' : 'Total'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pageItems.map((item, idx) => {
                                    const absoluteIdx = previousItemsCount + idx;
                                    const lineCost = item.buyPrice * item.qty;
                                    const discountVal = lineCost * (item.discount / 100);
                                    const afterDiscount = lineCost - discountVal;
                                    const taxVal = afterDiscount * (item.tax / 100);
                                    const lineNet = afterDiscount + taxVal;

                                    return (
                                      <tr 
                                        key={item.id} 
                                        className={`border-b border-zinc-200 ${fontSizeClass} text-zinc-900 font-medium hover:bg-zinc-50 ${ROW_HEIGHT_CLASS} ${ROW_MAX_HEIGHT_CLASS} ${ROW_MIN_HEIGHT_CLASS}`}
                                      >
                                        <td className={`p-1 text-center font-bold border-r border-zinc-200 ${ROW_HEIGHT_CLASS} overflow-hidden whitespace-nowrap align-middle`}>{absoluteIdx + 1}</td>
                                        <td className={`p-1 border-r border-zinc-200 ${ROW_HEIGHT_CLASS} overflow-hidden align-middle`}>
                                          <div className={`font-extrabold text-[9px] text-zinc-950 line-clamp-2 leading-[10px] break-words ${
                                            orientation === 'portrait' ? 'max-w-[125px]' : 'max-w-[200px]'
                                          }`} title={itemsLanguage === 'AR' ? item.nameAr : itemsLanguage === 'EN' ? item.nameEn : `${item.nameAr} (${item.nameEn})`}>
                                            {itemsLanguage === 'AR' 
                                              ? item.nameAr 
                                              : itemsLanguage === 'EN' 
                                                ? item.nameEn 
                                                : `${item.nameAr} (${item.nameEn})`}
                                          </div>
                                        </td>
                                        {showBatchNumber && (
                                          <td className={`p-1 text-center font-mono text-[9px] text-zinc-650 border-r border-zinc-200 ${ROW_HEIGHT_CLASS} overflow-hidden whitespace-nowrap align-middle truncate max-w-[50px]`}>
                                            {item.batch}
                                          </td>
                                        )}
                                        <td className={`p-1 text-center font-mono text-[9px] text-zinc-650 border-r border-zinc-200 ${ROW_HEIGHT_CLASS} overflow-hidden whitespace-nowrap align-middle truncate max-w-[50px]`}>
                                          {item.expiry}
                                        </td>
                                        <td className={`p-1 text-center font-bold text-zinc-900 border-r border-zinc-200 ${ROW_HEIGHT_CLASS} overflow-hidden whitespace-nowrap align-middle`}>
                                          {item.qty}
                                        </td>
                                        {showBonusColumn && (
                                          <td className={`p-1 text-center text-emerald-700 font-extrabold border-r border-zinc-200 ${ROW_HEIGHT_CLASS} overflow-hidden whitespace-nowrap align-middle`}>
                                            {item.bonus > 0 ? `+${item.bonus}` : '0'}
                                          </td>
                                        )}
                                        <td className={`p-1 text-right font-mono text-zinc-650 border-r border-zinc-200 ${ROW_HEIGHT_CLASS} overflow-hidden whitespace-nowrap align-middle`}>
                                          {item.publicPrice.toFixed(2)}
                                        </td>
                                        <td className={`p-1 text-right font-mono text-zinc-900 border-r border-zinc-200 ${ROW_HEIGHT_CLASS} overflow-hidden whitespace-nowrap align-middle`}>
                                          {item.buyPrice.toFixed(2)}
                                        </td>
                                        <td className={`p-1 text-center font-bold text-amber-700 border-x border-zinc-200 ${ROW_HEIGHT_CLASS} overflow-hidden whitespace-nowrap align-middle`}>
                                          {item.discount > 0 ? `${item.discount}%` : '-'}
                                        </td>
                                        <td className={`p-1 text-right font-extrabold font-mono text-zinc-950 ${ROW_HEIGHT_CLASS} overflow-hidden whitespace-nowrap align-middle`}>
                                          {lineNet.toFixed(2)}
                                        </td>
                                      </tr>
                                    );
                                  })}

                                  {pageItems.length === 0 && (
                                    <tr>
                                      <td colSpan={10} className="p-8 text-center text-zinc-400 font-bold text-xs">
                                        {language === 'AR' ? 'لا توجد أصناف حالياً في فاتورة المشتريات' : 'No items added in the purchase invoice'}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Footer and signatures block */}
                          <div>
                            {isLastPage ? (
                              <>
                                {/* 4. Financial Sum & Total Summary */}
                                <div className={`grid grid-cols-2 text-[10px] ${
                                  orientation === 'landscape' ? 'gap-2.5 mt-1.5' : 'gap-4 mt-3'
                                }`}>
                                  {/* Left Side: General Egyptian Terms and Notes */}
                                  <div className={`border border-zinc-200 rounded-lg bg-zinc-50/50 flex flex-col justify-between ${
                                    orientation === 'landscape' ? 'p-1.5 space-y-1' : 'p-2 space-y-1.5'
                                  }`}>
                                    <div className="space-y-1">
                                      <p className="font-extrabold text-[8px] text-zinc-500 uppercase tracking-wider">
                                        {language === 'AR' ? 'الشروط والملاحظات الضريبية' : 'Terms & Tax Declaration'}
                                      </p>
                                      <p className={`text-zinc-600 leading-relaxed ${
                                        orientation === 'landscape' ? 'text-[7.5px]' : 'text-[8px]'
                                      }`}>
                                        {language === 'AR'
                                          ? 'تخضع هذه الأصناف لقوانين وزارة الصحة المصرية. الفاتورة تشمل ضريبة القيمة المضافة 14% لغير المعفى منها. الدفع مستحق خلال 45 يوماً من تاريخ التوريد.'
                                          : 'Items subject to MOH regulations. Pricing includes 14% VAT where applicable. Payment terms: NET 45 days.'}
                                      </p>
                                      {showDisclaimers && (
                                        <p className={`leading-tight text-zinc-450 font-bold ${
                                          orientation === 'landscape' ? 'text-[6.5px]' : 'text-[7.5px]'
                                        }`}>
                                          {language === 'AR' 
                                            ? '• معتمدة إلكترونياً ومتصلة بالفحص المالي لمخازن الأدوية المركزية.' 
                                            : '• Electronically approved and mapped to central warehouses clearance.'}
                                        </p>
                                      )}
                                    </div>
                                    {showDisclaimers && (
                                      <div className={`border-t border-dashed border-zinc-300 flex items-center justify-center ${
                                        orientation === 'landscape' ? 'pt-1.5' : 'pt-2'
                                      }`}>
                                        <div className={`border border-zinc-400 flex flex-col items-center justify-center font-mono font-black text-zinc-700 bg-white rounded shadow-sm ${
                                          orientation === 'landscape' ? 'w-10 h-10 text-[9px]' : 'w-12 h-12 text-[10px]'
                                        }`}>
                                          <span className="text-[6px] text-zinc-400 leading-none mb-0.5 font-bold">E-INVOICE</span>
                                          <span className="font-black tracking-wider leading-none">QR</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Right Side: Totals grid */}
                                  <div className={`border border-zinc-200 rounded-lg overflow-hidden font-bold ${
                                    orientation === 'landscape' ? 'text-[8.5px]' : 'text-[9px]'
                                  }`}>
                                    <div className={`grid grid-cols-2 border-b border-zinc-200 ${
                                      orientation === 'landscape' ? 'p-1' : 'p-1.5'
                                    }`}>
                                      <span className="text-zinc-600">{language === 'AR' ? 'إجمالي الجمهور:' : 'Total Public:'}</span>
                                      <span className="text-right font-mono font-extrabold">{totals.totalPublic.toFixed(2)} EGP</span>
                                    </div>
                                    <div className={`grid grid-cols-2 border-b border-zinc-200 ${
                                      orientation === 'landscape' ? 'p-1' : 'p-1.5'
                                    }`}>
                                      <span className="text-zinc-600">{language === 'AR' ? 'إجمالي سعر الشراء:' : 'Total Buying:'}</span>
                                      <span className="text-right font-mono font-extrabold">{totals.totalBuy.toFixed(2)} EGP</span>
                                    </div>
                                    <div className={`grid grid-cols-2 border-b border-zinc-200 text-amber-700 bg-amber-50/40 ${
                                      orientation === 'landscape' ? 'p-1' : 'p-1.5'
                                    }`}>
                                      <span>{language === 'AR' ? 'قيمة الخصم التجاري:' : 'Discount Value:'}</span>
                                      <span className="text-right font-mono font-extrabold">-{totals.totalDiscountVal.toFixed(2)} EGP</span>
                                    </div>
                                    <div className={`grid grid-cols-2 border-b border-zinc-200 text-zinc-600 ${
                                      orientation === 'landscape' ? 'p-1' : 'p-1.5'
                                    }`}>
                                      <span>{language === 'AR' ? 'ضريبة القيمة المضافة 14%:' : 'Total VAT 14%:'}</span>
                                      <span className="text-right font-mono font-extrabold">+{totals.totalTaxVal.toFixed(2)} EGP</span>
                                    </div>
                                    <div 
                                      className={`grid grid-cols-2 text-white font-black ${
                                        orientation === 'landscape' ? 'p-1.5 text-[10px]' : 'p-2 text-xs'
                                      }`}
                                      style={{ backgroundColor: accentColor }}
                                    >
                                      <span>{language === 'AR' ? 'صافي القيمة المستحقة:' : 'Net Invoice Value:'}</span>
                                      <span className={`text-right font-mono font-black ${
                                        orientation === 'landscape' ? 'text-xs' : 'text-sm'
                                      }`}>{totals.netTotal.toFixed(2)} EGP</span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : null}

                            {/* 5. Stamp / Signature blocks on bottom footer */}
                            <div className={`border-t border-dashed border-zinc-300 flex items-end justify-between select-none ${
                              orientation === 'landscape' 
                                ? 'mt-1 pt-1 text-[7.5px] pb-0.5' 
                                : 'mt-1.5 pt-1.5 text-[9px] pb-1'
                            }`}>
                              
                              {/* Pharmacist / Receiver Signature */}
                              {showSignature && (
                                <div className={orientation === 'landscape' ? 'space-y-1' : 'space-y-2'}>
                                  <p className="font-extrabold text-zinc-500">
                                    {language === 'AR' ? 'المستلم (مدير الصيدلية):' : 'Receiver (Pharmacy Director):'}
                                  </p>
                                  <div className={`border-b border-black w-24 ${
                                    orientation === 'landscape' ? 'h-2' : 'h-3'
                                  }`}></div>
                                  <p className={`text-zinc-400 font-medium ${
                                    orientation === 'landscape' ? 'text-[6.5px]' : 'text-[7px]'
                                  }`}>
                                    {language === 'AR' ? 'التوقيع والختم الصيدلاني' : 'Signature & Professional Seal'}
                                  </p>
                                </div>
                              )}

                              {/* Warehouse stamp design representation */}
                              {showStamp && (
                                <div className="flex flex-col items-center justify-center">
                                  <div 
                                    className={`rounded-full border-4 border-double flex flex-col items-center justify-center font-bold text-center select-none opacity-80 ${
                                      orientation === 'landscape' 
                                        ? 'w-14 h-14 p-0.5 text-[5.5px]' 
                                        : 'w-20 h-20 p-1 text-[7px]'
                                    }`}
                                    style={{ 
                                      borderColor: accentColor + 'cc', 
                                      color: accentColor + 'cc',
                                      fontFamily: 'monospace',
                                      transform: `rotate(${stampRotation}deg)`
                                    }}
                                  >
                                    <span>{stampStatus}</span>
                                    <span className="scale-75 font-black tracking-tight leading-none" style={{ fontSize: orientation === 'landscape' ? '4.5px' : '6px' }}>{stampSupplier}</span>
                                    <span className="border-t border-b border-dashed py-0.5 my-0.5 leading-none w-full" style={{ fontSize: orientation === 'landscape' ? '5px' : '7px' }}>
                                      {language === 'AR' ? stampLocationAR : stampLocationEN}
                                    </span>
                                    <span style={{ fontSize: orientation === 'landscape' ? '5px' : '7px' }}>{stampDate}</span>
                                  </div>
                                </div>
                              )}

                              {/* Corporate standard code stamp */}
                              {/* Corporate standard code stamp & Barcode */}
                              <div className="flex flex-col items-end gap-1 select-none">
                                {/* Barcode moved here for professional bottom empty space filling */}
                                <div className="flex flex-col items-center justify-center select-none pb-0.5">
                                  <div className="flex items-center gap-[1px]">
                                    {(barcodeNumber || 'SUPP-CODE-9831').split('').map((char, idx) => {
                                      const code = char.charCodeAt(0);
                                      const width = ((code + idx * 3) % 3) + 1; // 1 to 3px wide lines
                                      return (
                                        <div key={idx} className="bg-zinc-700" style={{ width: `${width}px`, height: '14px' }}></div>
                                      );
                                    })}
                                  </div>
                                  <span className="text-[6px] tracking-widest text-zinc-450 font-mono block">{barcodeNumber}</span>
                                </div>

                                <div className="text-right space-y-0.5">
                                <p className={`text-zinc-400 font-extrabold ${
                                  orientation === 'landscape' ? 'text-[7.5px]' : 'text-[8px]'
                                }`}>
                                  {language === 'AR' ? 'سلسلة الإمداد والخدمات الطبية' : 'Healthcare Supply Chain Co.'}
                                </p>
                                <p className={`text-zinc-400 font-bold ${
                                  orientation === 'landscape' ? 'text-[6.5px]' : 'text-[7px]'
                                }`}>
                                  {language === 'AR' ? 'مطبوع بواسطة: نظام فارما فلو الذكي' : 'Printed via PharmaFlow AI'}
                                </p>
                                <p className={`font-mono text-zinc-400 ${
                                  orientation === 'landscape' ? 'text-[6.5px]' : 'text-[7px]'
                                }`}>
                                  {language === 'AR' ? 'صفحة' : 'Page'} {pageIdx + 1} {language === 'AR' ? 'من' : 'of'} {pageChunks.length}
                                </p>
                              </div>
                            </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Real-time browser print triggering instructions */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs space-y-2.5">
            <h4 className="font-extrabold text-zinc-805 dark:text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-lg text-emerald-500">info</span>
              {language === 'AR' ? 'تعليمات طباعة A5 الاحترافية:' : 'Professional A5 Printing Guide:'}
            </h4>
            <ul className="list-disc list-inside space-y-1 text-zinc-550 dark:text-zinc-400 pl-2 leading-relaxed">
              {language === 'AR' ? (
                <>
                  <li>عند الضغط على زر <strong className="text-emerald-500">اختبار الطباعة</strong>، ستفتح لك شاشة المتصفح المخصصة للطباعة تلقائياً.</li>
                  <li>قم باختيار مقاس الورق <strong className="text-zinc-900 dark:text-white font-black">A5</strong> من إعدادات الطابعة لتعبئة الورقة بالكامل.</li>
                  <li>تأكد من إلغاء خيار "الهوامش" (Margins: None) والـ "Headers and Footers" للحصول على النسبة المثالية للمخازن.</li>
                </>
              ) : (
                <>
                  <li>Clicking <strong className="text-emerald-500">Try Print A5</strong> invokes the native system print workflow configured for this document.</li>
                  <li>Set the printer paper size to <strong className="text-zinc-900 dark:text-white font-black">A5</strong> in the print settings dialog.</li>
                  <li>Recommended margins: <strong className="text-zinc-900 dark:text-white font-black">None</strong>, and disable browser Headers/Footers.</li>
                </>
              )}
            </ul>
          </div>

        </div>

        {/* ========================================================
            COLUMN 2: DESIGN LAB CONTROL PANEL & EDITOR (lg:col-span-5)
            ======================================================== */}
        <div className="lg:col-span-5 lg:h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-3 space-y-6 pb-12">

          {/* Action trigger block */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-3xl p-6 shadow-lg border border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-white">
                {language === 'AR' ? 'جاهز للطباعة الحقيقية؟' : 'Ready to Test Print?'}
              </h3>
              <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
                {language === 'AR' 
                  ? 'قم بإرسال الفاتورة إلى طابعة الفواتير المخصصة فوراً واختبار دقة هوامش A5.' 
                  : 'Send to your network pharmacy printer to test high fidelity scaling.'}
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-650 hover:from-emerald-400 hover:to-teal-500 text-white px-5 py-3 rounded-2xl font-black text-xs shadow-md shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-rounded text-lg">print</span>
              {language === 'AR' ? 'اختبار طباعة الفاتورة' : 'Try Print A5'}
            </button>
          </div>
          
          {/* Section A: Corporate Supplier Template Customizer */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2 border-b border-[var(--border-divider)] pb-3">
              <span className="material-symbols-rounded text-lg text-amber-500">storefront</span>
              {language === 'AR' ? 'مورد الأدوية والمخازن' : 'Egyptian Drug Supplier'}
            </h3>
            
            {/* Supplier selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                {language === 'AR' ? 'اختر الشركة الموردة للأدوية (رئيسية بمصر)' : 'Select Medicine Supplier Template'}
              </label>
              <div className="space-y-2.5">
                {EGYPTIAN_SUPPLIERS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSupplierChange(s.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                      selectedSupplierId === s.id
                        ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#1e1e1e]/50'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: s.accentColor }}
                      >
                        <span className="material-symbols-rounded text-lg">{s.logo}</span>
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-black text-zinc-900 dark:text-white">
                          {language === 'AR' ? s.nameAr : s.nameEn}
                        </h4>
                        <span className="text-[9px] text-zinc-450 font-bold">
                          {language === 'AR' ? s.commercialRegister : s.commercialRegister}
                        </span>
                      </div>
                    </div>
                    
                    {/* Tick icon if selected */}
                    {selectedSupplierId === s.id && (
                      <span className="material-symbols-rounded text-lg" style={{ color: s.accentColor }}>
                        check_circle
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section B: Live Invoice Info Editor */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2 border-b border-[var(--border-divider)] pb-3">
              <span className="material-symbols-rounded text-lg text-emerald-500">edit_note</span>
              {language === 'AR' ? 'تعديل بيانات ترويسة الفاتورة' : 'Live Header Details'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                  {language === 'AR' ? 'رقم الفاتورة' : 'Invoice Number'}
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white font-mono focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                  {language === 'AR' ? 'تاريخ الفاتورة' : 'Invoice Date'}
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white font-mono focus:border-zinc-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-550 uppercase tracking-wider block">
                  {language === 'AR' ? 'اسم الصيدلية المستلمة' : 'Pharmacy Name'}
                </label>
                <input
                  type="text"
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white font-extrabold focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-550 uppercase tracking-wider block">
                  {language === 'AR' ? 'الرقم الضريبي للصيدلية' : 'Pharmacy Tax ID'}
                </label>
                <input
                  type="text"
                  value={pharmacyTaxId}
                  onChange={(e) => setPharmacyTaxId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white font-mono focus:border-zinc-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-550 uppercase tracking-wider block">
                {language === 'AR' ? 'رقم الباركود (أسفل الفاتورة)' : 'Barcode Number (Bottom Footer)'}
              </label>
              <input
                type="text"
                value={barcodeNumber}
                onChange={(e) => setBarcodeNumber(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white font-mono focus:border-zinc-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Section C: Layout Tweaker & Show/Hide columns */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2 border-b border-[var(--border-divider)] pb-3">
              <span className="material-symbols-rounded text-lg text-indigo-500">settings_suggest</span>
              {language === 'AR' ? 'تخصيص الهيكل والأعمدة المطبوعة' : 'Layout Customization Engine'}
            </h3>

            {/* Accent hex tuning */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                {language === 'AR' ? 'اللون المميز للفاتورة' : 'Primary Hex Accent'}
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={accentColor} 
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none w-28"
                />
              </div>
            </div>

            {/* Font size selectors */}
            <div className="space-y-2 pt-1.5">
              <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                {language === 'AR' ? 'حجم الخط في جدول الأدوية' : 'Table Font Sizing'}
              </label>
              <div className="flex gap-2">
                {(['xs', 'sm', 'base'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setFontSize(sz)}
                    className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-xl border cursor-pointer capitalize transition-all ${
                      fontSize === sz
                        ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#1e1e1e] text-zinc-900 dark:text-white font-black'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-450 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {sz === 'xs' ? 'Ultra Compact (8px)' : sz === 'sm' ? 'Default A5 (10px)' : 'Comfortable (12px)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Medicine Name Language Selector */}
            <div className="space-y-2 pt-1.5">
              <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                {language === 'AR' ? 'لغة عرض أسماء الأدوية بالفاتورة' : 'Medicine Display Language'}
              </label>
              <div className="flex gap-2">
                {(['AR', 'EN', 'BOTH'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setItemsLanguage(lang)}
                    className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-xl border cursor-pointer capitalize transition-all ${
                      itemsLanguage === lang
                        ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#1e1e1e] text-zinc-900 dark:text-white font-black'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-450 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {lang === 'AR' 
                      ? (language === 'AR' ? 'العربية' : 'Arabic') 
                      : lang === 'EN' 
                        ? (language === 'AR' ? 'الإنجليزية' : 'English') 
                        : (language === 'AR' ? 'ثنائي اللغة' : 'Bilingual')}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles list */}
            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                {language === 'AR' ? 'إظهار وإخفاء حقول الفاتورة التفصيلية' : 'Toggle Visual Components'}
              </label>
              
              <div className="grid grid-cols-2 gap-3.5">
                

                <button
                  onClick={() => setShowBatchNumber(!showBatchNumber)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    showBatchNumber ? 'border-emerald-500 bg-emerald-500/5 text-emerald-800 dark:text-emerald-350' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="material-symbols-rounded text-base">{showBatchNumber ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span className="text-[11px] font-extrabold">{language === 'AR' ? 'رقم التشغيلة (Batch)' : 'Batch Number'}</span>
                </button>

                <button
                  onClick={() => setShowBonusColumn(!showBonusColumn)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    showBonusColumn ? 'border-emerald-500 bg-emerald-500/5 text-emerald-800 dark:text-emerald-350' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="material-symbols-rounded text-base">{showBonusColumn ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span className="text-[11px] font-extrabold">{language === 'AR' ? 'عمود البونص (+)' : 'Bonus Column'}</span>
                </button>

                <button
                  onClick={() => setShowStamp(!showStamp)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    showStamp ? 'border-emerald-500 bg-emerald-500/5 text-emerald-800 dark:text-emerald-350' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="material-symbols-rounded text-base">{showStamp ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span className="text-[11px] font-extrabold">{language === 'AR' ? 'ختم الموزع المالي' : 'Corporate Stamp'}</span>
                </button>

                <button
                  onClick={() => setShowSignature(!showSignature)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    showSignature ? 'border-emerald-500 bg-emerald-500/5 text-emerald-800 dark:text-emerald-350' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="material-symbols-rounded text-base">{showSignature ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span className="text-[11px] font-extrabold">{language === 'AR' ? 'توقيع المستلم' : 'Signature Box'}</span>
                </button>

                <button
                  onClick={() => setShowDisclaimers(!showDisclaimers)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    showDisclaimers ? 'border-emerald-500 bg-emerald-500/5 text-emerald-800 dark:text-emerald-350' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="material-symbols-rounded text-base">{showDisclaimers ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span className="text-[11px] font-extrabold">{language === 'AR' ? 'الملاحظات والباركود' : 'Disclaimers'}</span>
                </button>

              </div>
            </div>

          </div>

          {/* Section D: Stamp Customizer */}
          {showStamp && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2 border-b border-[var(--border-divider)] pb-3">
                <span className="material-symbols-rounded text-lg text-amber-600">verified</span>
                {language === 'AR' ? 'تعديل وتخصيص الختم المالي' : 'Financial Stamp Customizer'}
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                    {language === 'AR' ? 'حالة الختم (أعلى)' : 'Stamp Status (Top)'}
                  </label>
                  <input
                    type="text"
                    value={stampStatus}
                    onChange={(e) => setStampStatus(e.target.value)}
                    className="bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-extrabold focus:outline-none w-full"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                    {language === 'AR' ? 'اسم الموزع (الوسط)' : 'Supplier Name (Middle)'}
                  </label>
                  <input
                    type="text"
                    value={stampSupplier}
                    onChange={(e) => setStampSupplier(e.target.value)}
                    className="bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-extrabold focus:outline-none w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                    {language === 'AR' ? 'الفرع (عربي)' : 'Location (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={stampLocationAR}
                    onChange={(e) => setStampLocationAR(e.target.value)}
                    className="bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-extrabold focus:outline-none w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                    {language === 'AR' ? 'الفرع (إنجليزي)' : 'Location (English)'}
                  </label>
                  <input
                    type="text"
                    value={stampLocationEN}
                    onChange={(e) => setStampLocationEN(e.target.value)}
                    className="bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-extrabold focus:outline-none w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                    {language === 'AR' ? 'تاريخ الختم' : 'Stamp Date'}
                  </label>
                  <input
                    type="text"
                    value={stampDate}
                    onChange={(e) => setStampDate(e.target.value)}
                    className="bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-extrabold focus:outline-none w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">
                    {language === 'AR' ? 'درجة الدوران (°)' : 'Rotation Degree (°)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={stampRotation}
                      onChange={(e) => setStampRotation(parseInt(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer h-1 bg-zinc-200 rounded-lg appearance-none"
                    />
                    <span className="text-[10px] font-mono font-bold w-8 text-right text-zinc-650 dark:text-zinc-350">{stampRotation}°</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section E: High-Complexity Medicine Items Manager */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2 border-b border-[var(--border-divider)] pb-3">
              <span className="material-symbols-rounded text-lg text-amber-500">ballot</span>
              {language === 'AR' ? 'إدارة وحقن الأصناف الدوائية بالفاتورة' : 'Invoice Items Manager'}
            </h3>

            {/* List of current items */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-[#1e1e1e] rounded-xl border border-zinc-150 dark:border-zinc-850">
                  <div className="text-left">
                    <p className="text-xs font-black text-zinc-800 dark:text-zinc-100 leading-tight">
                      {language === 'AR' ? item.nameAr : item.nameEn}
                    </p>
                    <span className="text-[9px] text-zinc-450 font-bold block mt-0.5">
                      {item.qty} علب × {item.buyPrice} ج.م | خصم {item.discount}%
                    </span>
                  </div>
                  
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <span className="material-symbols-rounded text-base">delete</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Add Item form */}
            <form onSubmit={handleAddItem} className="pt-3 border-t border-[var(--border-divider)] space-y-3">
              <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-550 uppercase tracking-widest block">
                {language === 'AR' ? 'إضافة دواء جديد للفاتورة' : 'Inject New Medicine'}
              </span>

              {/* Medicine Name inputs */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder={language === 'AR' ? 'اسم الدواء (عربي)' : 'Medicine Name (AR)'}
                  value={newItem.nameAr || ''}
                  onChange={(e) => setNewItem({ ...newItem, nameAr: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder={language === 'AR' ? 'اسم الدواء (إنجليزي)' : 'Medicine Name (EN)'}
                  value={newItem.nameEn || ''}
                  onChange={(e) => setNewItem({ ...newItem, nameEn: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                  required
                />
              </div>



              {/* Batch & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder={language === 'AR' ? 'التشغيلة (Batch)' : 'Batch Code'}
                  value={newItem.batch || ''}
                  onChange={(e) => setNewItem({ ...newItem, batch: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none"
                />
                <input
                  type="text"
                  placeholder={language === 'AR' ? 'الصلاحية (السنة-الشهر)' : 'Expiry YYYY-MM'}
                  value={newItem.expiry || ''}
                  onChange={(e) => setNewItem({ ...newItem, expiry: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none"
                />
              </div>

              {/* Qty & Bonus */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-450 uppercase block">{language === 'AR' ? 'الكمية (علبة)' : 'Qty (Boxes)'}</label>
                  <input
                    type="number"
                    value={newItem.qty || ''}
                    onChange={(e) => setNewItem({ ...newItem, qty: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-450 uppercase block">{language === 'AR' ? 'بونص إضافي' : 'Bonus Boxes'}</label>
                  <input
                    type="number"
                    value={newItem.bonus || 0}
                    onChange={(e) => setNewItem({ ...newItem, bonus: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Public & Buy Prices */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-455 uppercase block">{language === 'AR' ? 'سعر الجمهور' : 'Public Price'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.publicPrice || ''}
                    onChange={(e) => setNewItem({ ...newItem, publicPrice: Math.max(0.01, Number(e.target.value)) })}
                    className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-455 uppercase block">{language === 'AR' ? 'سعر الشراء' : 'Buy Price'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.buyPrice || ''}
                    onChange={(e) => setNewItem({ ...newItem, buyPrice: Math.max(0.01, Number(e.target.value)) })}
                    className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-455 uppercase block">{language === 'AR' ? 'الخصم %' : 'Disc. %'}</label>
                  <input
                    type="number"
                    value={newItem.discount || 0}
                    onChange={(e) => setNewItem({ ...newItem, discount: Math.min(100, Math.max(0, Number(e.target.value))) })}
                    className="w-full bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-2.5 rounded-xl text-xs font-black hover:bg-zinc-800 dark:hover:bg-zinc-100 cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-rounded text-base">add</span>
                {language === 'AR' ? 'حقن الصنف في فاتورة A5' : 'Inject Medicine Row'}
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Fallback CSS specifically for native Ctrl+P */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Fallback simple layout for native Ctrl+P */
          body * {
            visibility: hidden !important;
          }
          #printable-a5-invoice, 
          #printable-a5-invoice * {
            visibility: visible !important;
          }
          #printable-a5-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      ` }} />

    </div>
  );
};
