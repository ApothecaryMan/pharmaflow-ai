import React, { useState, useEffect } from 'react';
import { SmartInput } from '../common/SmartInputs';
import { PosDropdown } from '../common/PosDropdown';
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

  useEffect(() => {
    setHasMounted(true);
  }, []);


  /* -------------------------------------------------------------------------- */
  /*                               TEMPLATE MANAGER                             */
  /* -------------------------------------------------------------------------- */

  interface SavedTemplate {
    id: string;
    name: string;
    isDefault: boolean;
    options: InvoiceTemplateOptions;
  }

  // Define default options based on language
  const defaultOptions: InvoiceTemplateOptions = {
    storeName: 'PharmaFlow Pharmacy',
    storeSubtitle: 'Premium Care Center',
    headerAddress: language === 'AR' ? '١٢٣ رسينا' : '123 Rasena',
    headerArea: language === 'AR' ? 'مدينة نصر' : 'Nasr City',
    headerHotline: '19099',
    footerMessage: 'Thank you for your visit!',
    footerInquiry: 'For questions, call 19099',
    showAddressBox: false,
    termsCondition: language === 'AR' 
      ? 'ادوية التلاجة ومستحضرات التجميل وشرايط الدواء لا ترجع<br>استرجاع الادوية والاجهزة السليمة خلال 14 يوم' 
      : 'Refrigerated medicines & cosmetics are non-refundable<br>Returns within 14 days',
    language: language
  };

  const [templates, setTemplates] = useState<SavedTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('receipt_templates');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure default template exists if none are saved or if the saved ones are empty
        if (parsed.length > 0) {
            return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load templates", e);
    }
    // Fallback to a single default template if none loaded or error
    return [{
        id: 'default',
        name: 'Standard Template',
        isDefault: true,
        options: defaultOptions
    }];
  });

  const [activeTemplateId, setActiveTemplateId] = useState<string>(() => {
    const savedActive = localStorage.getItem('receipt_active_template_id');
    if (savedActive) return savedActive;
    const def = templates.find(t => t.isDefault);
    return def ? def.id : templates[0].id;
  });

  const [options, setOptions] = useState<InvoiceTemplateOptions>(() => {
    const active = templates.find(t => t.id === activeTemplateId) || templates[0];
    return active.options;
  });
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isEditingName, setIsEditingName] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Track last saved state to show/hide save button
  const [lastSavedOptions, setLastSavedOptions] = useState<string>(() => JSON.stringify(options));

  // Persist templates
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem('receipt_templates', JSON.stringify(templates));
      localStorage.setItem('receipt_active_template_id', activeTemplateId);
    }
  }, [templates, activeTemplateId, hasMounted]);

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return;
    const newTemplate: SavedTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      isDefault: false,
      options: { ...options }
    };
    setTemplates(prev => [...prev, newTemplate]);
    setActiveTemplateId(newTemplate.id);
    setIsAddingTemplate(false);
    setNewTemplateName('');
  };

  const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (templates.length <= 1) return; // Prevent deleting last one
    
    const newTemplates = templates.filter(t => t.id !== id);
    setTemplates(newTemplates);
    
    if (activeTemplateId === id) {
        const next = newTemplates[0];
        setActiveTemplateId(next.id);
        setOptions(next.options);
    }
  };

  const handleSetDefault = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTemplates(prev => prev.map(t => ({
        ...t,
        isDefault: t.id === id
    })));
  };

  const handleRenameTemplate = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === 'click') e.stopPropagation();
    if (!isEditingName || !editingNameValue.trim()) {
        setIsEditingName(null);
        return;
    }
    
    setTemplates(prev => prev.map(t => t.id === isEditingName ? { ...t, name: editingNameValue } : t));
    setIsEditingName(null);
  };

  const handleSelectTemplate = (template: SavedTemplate) => {
    setActiveTemplateId(template.id);
    setOptions(template.options);
    setLastSavedOptions(JSON.stringify(template.options));
  };
  
  // Auto-save changes to current template (debounced slightly by effect nature or just direct)
  // For now, let's make it manual save or auto-update?
  // Requirement says "Save option". Usually implies specific action, but "Saved Templates" often implies auto-save in modern apps.
  // Let's simple auto-update the "active" template in memory when options change, so we don't lose work when switching?
  // No, switching normally reloads.
  // Let's update the active template in the `templates` array whenever `options` changes.
  useEffect(() => {
      if (hasMounted) {
          setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...t, options } : t));
      }
  }, [options]);

  const hasChanges = JSON.stringify(options) !== lastSavedOptions;

  /* -------------------------------------------------------------------------- */
  /*                                  PREVIEW                                   */
  /* -------------------------------------------------------------------------- */
  
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
      <div className="w-full lg:w-1/3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
        
        {/* Template Manager Header */}
                <div className="w-full">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block px-1">
                        {isAddingTemplate 
                            ? t.receiptDesigner.newTemplate
                            : t.receiptDesigner.activeTemplate
                        }
                    </label>
                    <div className="flex items-center gap-2">
                        {isAddingTemplate ? (
                            <div className="flex items-center gap-2 w-full animate-fadeIn">
                                <input 
                                    autoFocus
                                    value={newTemplateName}
                                    onChange={(e) => setNewTemplateName(e.target.value)}
                                    placeholder={t.receiptDesigner.newTemplatePlaceholder}
                                    className="flex-1 h-10 bg-white dark:bg-gray-900 border border-blue-500 rounded-xl px-4 text-sm focus:outline-none text-gray-800 dark:text-white transition-all shadow-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTemplate()}
                                />
                                <button 
                                    onClick={handleCreateTemplate}
                                    className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95"
                                >
                                    <span className="material-symbols-rounded text-[20px]">check</span>
                                </button>
                                <button 
                                    onClick={() => setIsAddingTemplate(false)}
                                    className="w-10 h-10 bg-gray-500 hover:bg-gray-600 text-white rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95"
                                >
                                    <span className="material-symbols-rounded text-[20px]">close</span>
                                </button>
                            </div>
                        ) : (
                             <>
                                 <PosDropdown<SavedTemplate>
                                    items={templates}
                                    selectedItem={templates.find(t => t.id === activeTemplateId)}
                                    isOpen={isDropdownOpen}
                                    onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
                                    onSelect={(template) => {
                                        handleSelectTemplate(template);
                                        setIsDropdownOpen(false);
                                    }}
                                    keyExtractor={(item) => item.id}
                                    renderSelected={(item) => (
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-bold text-gray-800 dark:text-white truncate">{item?.name}</span>
                                            {item?.isDefault && (
                                                <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold">
                                                    Def
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    renderItem={(item, isSelected) => (
                                        <div className="flex items-center justify-between w-full group py-1">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {isEditingName === item.id ? (
                                                    <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                                        <input 
                                                            autoFocus
                                                            value={editingNameValue}
                                                            onChange={(e) => setEditingNameValue(e.target.value)}
                                                            className="flex-1 bg-white dark:bg-gray-800 border border-blue-500 rounded-lg px-2 h-7 text-xs focus:outline-none text-gray-800 dark:text-white"
                                                            onKeyDown={(e) => e.key === 'Enter' && handleRenameTemplate(e)}
                                                        />
                                                        <button 
                                                            onClick={(e) => handleRenameTemplate(e)}
                                                            className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center transition-colors shadow-sm"
                                                        >
                                                            <span className="material-symbols-rounded text-[14px]">check</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className={`text-sm truncate ${isSelected ? 'font-bold text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {item.name}
                                                        </span>
                                                        {item.isDefault && (
                                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold">
                                                                Def
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            {!isEditingName && (
                                                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsEditingName(item.id);
                                                            setEditingNameValue(item.name);
                                                        }}
                                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-blue-500"
                                                        title={t.receiptDesigner.renameTemplate}
                                                    >
                                                        <span className="material-symbols-rounded text-[16px]">edit</span>
                                                    </button>
                                                    {!item.isDefault && (
                                                        <button 
                                                            onClick={(e) => handleSetDefault(e, item.id)}
                                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-emerald-500"
                                                            title={t.receiptDesigner.setDefault}
                                                        >
                                                            <span className="material-symbols-rounded text-[16px]">bookmark_add</span>
                                                        </button>
                                                    )}
                                                    {templates.length > 1 && (
                                                        <button 
                                                            onClick={(e) => handleDeleteTemplate(e, item.id)}
                                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-500"
                                                            title={t.receiptDesigner.deleteTemplate}
                                                        >
                                                            <span className="material-symbols-rounded text-[16px]">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    variant="input"
                                    className="w-full flex-1"
                                 />
                                 {hasChanges && (
                                     <button
                                        onClick={() => {
                                            localStorage.setItem('receipt_templates', JSON.stringify(templates));
                                            localStorage.setItem('receipt_active_template_id', activeTemplateId);
                                            setLastSavedOptions(JSON.stringify(options));
                                        }}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-100 dark:border-emerald-800/50 animate-fadeIn"
                                        title={t.common?.save || 'Save'}
                                     >
                                        <span className="material-symbols-rounded">save</span>
                                     </button>
                                 )}
                                 <button
                                    onClick={() => setIsAddingTemplate(true)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-blue-500 hover:text-white transition-all border border-gray-200 dark:border-gray-700"
                                 >
                                    <span className="material-symbols-rounded">add</span>
                                 </button>
                             </>
                        )}
                    </div>
                </div>
        
        <hr className="border-gray-100 dark:border-gray-700/50" />

        <div className="space-y-3">
          {/* Logo Section - Compact Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Logo Upload */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className="material-symbols-rounded text-[14px]">image</span>
                {t.inventory.headers.images || 'Image'}
              </label>
              {(options.logoBase64 && !options.logoSvgCode) ? (
                <div className="relative bg-gray-50 dark:bg-gray-900 rounded-xl p-2 flex items-center justify-center border border-gray-200 dark:border-gray-800 h-24 w-full">
                  <img 
                    src={options.logoBase64} 
                    alt="Logo" 
                    className="max-h-full max-w-full object-contain"
                  />
                  <button
                    onClick={() => setOptions({ ...options, logoBase64: '' })}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm z-10"
                  >
                    <span className="material-symbols-rounded text-[12px]">close</span>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors bg-gray-50 dark:bg-gray-900 h-24 w-full">
                  <span className="material-symbols-rounded text-gray-400 text-[24px]">upload</span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold">PNG / SVG</span>
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
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className="material-symbols-rounded text-[14px]">code</span>
                SVG Code
              </label>
              {options.logoSvgCode ? (
                <div className="relative bg-gray-50 dark:bg-gray-900 rounded-xl p-2 flex items-center justify-center border border-gray-200 dark:border-gray-800 h-24 w-full">
                  <div 
                    className="w-full h-full flex items-center justify-center overflow-hidden"
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
                  className="w-full h-24 p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none transition-all resize-none font-mono text-[9px]"
                  placeholder="Paste SVG code here..."
                  dir="ltr"
                />
              )}
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-2 gap-3">
             {/* Font Selector */}
             <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.receiptDesigner.options.font}
                </label>
                <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setOptions({ ...options, receiptFont: 'courier' })}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    (options.receiptFont || 'courier') === 'courier'
                        ? `bg-${color}-600 text-white shadow-sm`
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                >
                    Fake Receipt
                </button>
                <button
                    onClick={() => setOptions({ ...options, receiptFont: 'receipt-basic' })}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    options.receiptFont === 'receipt-basic'
                        ? `bg-${color}-600 text-white shadow-sm`
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                >
                    Receiptional
                </button>
                </div>
            </div>

            <div className="col-span-1 space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.receiptDesigner.options.storeName}
                </label>
                <SmartInput 
                    value={options.storeName}
                    onChange={(e) => setOptions({...options, storeName: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                    placeholder="Name..."
                />
            </div>
            
             <div className="col-span-1 space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.receiptDesigner.options.storeSubtitle}
                </label>
                <SmartInput 
                    value={options.storeSubtitle}
                    onChange={(e) => setOptions({...options, storeSubtitle: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                    placeholder="Slogan..."
                />
            </div>

             <div className="col-span-1 space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.receiptDesigner.options.hotline}
                </label>
                <SmartInput 
                    value={options.headerHotline}
                    onChange={(e) => setOptions({...options, headerHotline: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                    placeholder="19xxx..."
                />
            </div>

             <div className="col-span-1 space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.receiptDesigner.options.footer}
                </label>
                <SmartInput 
                    value={options.footerMessage}
                    onChange={(e) => setOptions({...options, footerMessage: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                    placeholder="Thanks..."
                />
            </div>

             <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.receiptDesigner.options.inquiry}
                </label>
                <SmartInput 
                    value={options.footerInquiry}
                    onChange={(e) => setOptions({...options, footerInquiry: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                    placeholder="Questions?..."
                />
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {t.receiptDesigner.options.address}
                    </label>
                    <SmartInput 
                        value={options.headerAddress}
                        onChange={(e) => setOptions({...options, headerAddress: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                        placeholder="Street..."
                    />
                </div>
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {t.receiptDesigner.options.area}
                    </label>
                    <SmartInput 
                        value={options.headerArea}
                        onChange={(e) => setOptions({...options, headerArea: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                        placeholder="Area..."
                    />
                </div>
            </div>

            <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.receiptDesigner.options.terms}
                </label>
                <textarea 
                    value={options.termsCondition?.replace(/<br>/g, '\n')}
                    onChange={(e) => setOptions({...options, termsCondition: e.target.value.replace(/\n/g, '<br>')})}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-20 resize-none"
                    placeholder="..."
                />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-3 gap-2 mt-2">
             <label className="flex items-center justify-between gap-2 cursor-pointer px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl h-10 transition-all hover:bg-gray-100 dark:hover:bg-gray-700">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight leading-tight">
                {t.receiptDesigner.options.addressBox}
              </span>
              <input
                type="checkbox"
                checked={options.showAddressBox !== false}
                onChange={(e) => setOptions({ ...options, showAddressBox: e.target.checked })}
                className={`w-4 h-4 rounded border-gray-300 text-${color}-600 focus:ring-${color}-500 cursor-pointer`}
              />
            </label>

            <label className="flex items-center justify-between gap-2 cursor-pointer px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl h-10 transition-all hover:bg-gray-100 dark:hover:bg-gray-700">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight leading-tight">
                {t.pos.deliveryOrder}
              </span>
              <input
                type="checkbox"
                checked={showDeliveryPreview}
                onChange={(e) => setShowDeliveryPreview(e.target.checked)}
                className={`w-4 h-4 rounded border-gray-300 text-${color}-600 focus:ring-${color}-500 cursor-pointer`}
              />
            </label>

             <label className="flex items-center justify-between gap-2 cursor-pointer px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl h-10 transition-all hover:bg-gray-100 dark:hover:bg-gray-700">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight leading-tight">
                {t.salesHistory.returns.returned}
              </span>
              <input
                type="checkbox"
                checked={showReturnsPreview}
                onChange={(e) => setShowReturnsPreview(e.target.checked)}
                className={`w-4 h-4 rounded border-gray-300 text-${color}-600 focus:ring-${color}-500 cursor-pointer`}
              />
            </label>
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
