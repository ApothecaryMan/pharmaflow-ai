import type React from 'react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { StorageKeys } from '../../config/storageKeys';
import { useData } from '../../context/DataContext';
import { useShift } from '../../hooks/sales/useShift';
import type { Sale, Shift } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { storage } from '../../utils/storage';
import { FilterDropdown } from '../common/FilterDropdown';
import { TemplateMarketplaceModal } from '../common/TemplateMarketplaceModal';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmartInput, useSmartDirection } from '../common/SmartInputs';
import { Tooltip } from '../common/Tooltip';
import { useStatusBar } from '../layout/StatusBar';
import { generateInvoiceHTML, type InvoiceTemplateOptions, RECEIPT_TEMPLATES } from '../sales/InvoiceTemplate';
import { generateShiftReceiptHTML } from './ShiftReceiptTemplate';
import { CARD_BASE } from '../../utils/themeStyles';

interface ReceiptDesignerProps {
  color: string;
  t: Translations;
  language: 'EN' | 'AR';
}

export const ReceiptDesigner: React.FC<ReceiptDesignerProps> = ({ color, t, language }) => {
  const { branches, activeBranchId, updateBranch } = useData();
  const activeBranch = useMemo(
    () => branches?.find((b: any) => b.id === activeBranchId),
    [branches, activeBranchId]
  );
  const { getVerifiedDate } = useStatusBar();
  const [hasMounted, setHasMounted] = useState(false);
  const { shifts } = useShift();
  const [previewMode, setPreviewMode] = useState<'sale' | 'shift'>('sale');

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

  // Define default options based on language and active branch
  const defaultOptions: InvoiceTemplateOptions = {
    storeName: activeBranch?.name || 'ZINC',
    storeSubtitle: 'Premium Care Center',
    headerAddress: activeBranch?.address || (language === 'AR' ? '١٢٣ ابوحمص' : '123 Abu Hommos'),
    headerArea: activeBranch?.area || (language === 'AR' ? 'مدينة نصر' : 'Nasr City'),
    headerHotline: activeBranch?.phone || '19099',
    footerMessage: 'Thank you for your visit!',
    footerInquiry: 'For questions, call 19099',
    showAddressBox: false,
    termsCondition:
      language === 'AR'
        ? 'ادوية التلاجة ومستحضرات التجميل وشرايط الدواء لا ترجع<br>استرجاع الادوية والاجهزة السليمة خلال 14 يوم'
        : 'Refrigerated medicines & cosmetics are non-refundable<br>Returns within 14 days',
    language: language,
  };

  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');

  const [hasChanges, setHasChanges] = useState(false);
  const lastSavedState = useRef<string>('');
  const loadedBranchId = useRef<string | null>(null);
  const justLoaded = useRef(false);

  // Initial load and sync when branch changes
  useEffect(() => {
    if (!activeBranchId || !branches || branches.length === 0 || !activeBranch) return;

    // Only load if it's the first time for this branch, so we don't overwrite unsaved changes on polling
    if (loadedBranchId.current === activeBranchId && hasMounted) {
      return;
    }

    try {
      const savedTemplates = activeBranch.printSettings?.[StorageKeys.RECEIPT_TEMPLATES] || [];
      let activeId = '';
      let templatesToSet = [];

      if (savedTemplates.length > 0) {
        templatesToSet = savedTemplates;
        // Find saved active or default
        const savedActive =
          activeBranch.printSettings?.[StorageKeys.RECEIPT_ACTIVE_TEMPLATE_ID] || null;
        if (savedActive && savedTemplates.some((t: SavedTemplate) => t.id === savedActive)) {
          activeId = savedActive;
        } else {
          const def = savedTemplates.find((t: SavedTemplate) => t.isDefault);
          activeId = def ? def.id : savedTemplates[0].id;
        }
      } else {
        // Fallback to default
        const initial = [
          {
            id: 'default',
            name: 'Standard Template',
            isDefault: true,
            options: defaultOptions,
          },
        ];
        templatesToSet = initial;
        activeId = 'default';
      }

      setTemplates(templatesToSet);
      setActiveTemplateId(activeId);

      const activeTemplate = templatesToSet.find((t: SavedTemplate) => t.id === activeId);
      if (activeTemplate) {
        setOptions(activeTemplate.options);
      }
      
      loadedBranchId.current = activeBranchId;
      justLoaded.current = true;
    } catch (e) {
      console.error('Failed to load templates', e);
    }
  }, [activeBranchId, branches, hasMounted]);

  const [options, setOptions] = useState<InvoiceTemplateOptions>(() => {
    const active = templates.find((t) => t.id === activeTemplateId) || templates[0];
    return active ? active.options : defaultOptions;
  });
  
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isEditingName, setIsEditingName] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [quotaError, setQuotaError] = useState(false);

  // Sync options to templates
  useEffect(() => {
    if (hasMounted) {
      setTemplates((prev) => prev.map((t) => (t.id === activeTemplateId ? { ...t, options } : t)));
    }
  }, [options, hasMounted, activeTemplateId]);

  // Compute hasChanges
  useEffect(() => {
    if (!hasMounted) return;
    const currentState = JSON.stringify({ templates, activeTemplateId });
    if (justLoaded.current) {
      lastSavedState.current = currentState;
      justLoaded.current = false;
    }
    setHasChanges(currentState !== lastSavedState.current);
  }, [templates, activeTemplateId, hasMounted]);

  // Handle template selection
  const handleTemplateSelect = (id: string) => {
    setActiveTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      setOptions(template.options);
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return;
    const newTemplate: SavedTemplate = {
      id: idGenerator.generateSync('receipts'),
      name: newTemplateName,
      isDefault: false,
      options: { ...options },
    };
    setTemplates((prev) => [...prev, newTemplate]);
    setActiveTemplateId(newTemplate.id);
    setIsAddingTemplate(false);
    setNewTemplateName('');
  };

  const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (templates.length <= 1) return; // Prevent deleting last one

    const newTemplates = templates.filter((t) => t.id !== id);
    setTemplates(newTemplates);

    if (activeTemplateId === id) {
      const next = newTemplates[0];
      setActiveTemplateId(next.id);
      setOptions(next.options);
    }
  };

  const handleSetDefault = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTemplates((prev) =>
      prev.map((t) => ({
        ...t,
        isDefault: t.id === id,
      }))
    );
  };

  const handleRenameTemplate = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === 'click') e.stopPropagation();
    if (!isEditingName || !editingNameValue.trim()) {
      setIsEditingName(null);
      return;
    }

    setTemplates((prev) =>
      prev.map((t) => (t.id === isEditingName ? { ...t, name: editingNameValue } : t))
    );
    setIsEditingName(null);
  };

  /* -------------------------------------------------------------------------- */
  /*                                  PREVIEW                                   */
  /* -------------------------------------------------------------------------- */

  // Preview-only toggles (not saved to localStorage, just for visualization)
  const [showDeliveryPreview, setShowDeliveryPreview] = useState(false);
  const [showReturnsPreview, setShowReturnsPreview] = useState(false);
  const [showDuplicatePreview, setShowDuplicatePreview] = useState(false);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  // 2. Dummy Sale Data for Preview
  const DUMMY_SALE: Sale = {
    id: 'TRX-998877',
    branchId: 'BR-001',
    date: getVerifiedDate().toISOString(),
    dailyOrderNumber: 42,
    status: 'completed',
    items: [
      {
        id: '1',
        branchId: 'BR-001',
        name: 'Panadol Extra 500mg',
        genericName: ['Paracetamol'],
        quantity: 2,
        publicPrice: 15.5,
        costPrice: 10,
        category: 'Medicine',
        isUnit: false,
        stock: 100,
        expiryDate: '2025-12-31',
        description: 'Painkiller',
        discount: 10,
      },
      {
        id: '2',
        branchId: 'BR-001',
        name: 'Vitamin C Ascorbic Panadol Acid 1000mg',
        genericName: ['Ascorbic Acid'],
        quantity: 395,
        publicPrice: 45000.0,
        costPrice: 30,
        category: 'Vitamins',
        isUnit: true,
        unitsPerPack: 30,
        stock: 50,
        expiryDate: '2026-06-30',
        description: 'Immunity',
      },
      {
        id: '3',
        branchId: 'BR-001',
        name: 'Face Mask (Premium)',
        genericName: ['Mask'],
        quantity: 5,
        publicPrice: 5.0,
        costPrice: 2,
        category: 'Supplies',
        isUnit: false,
        stock: 500,
        expiryDate: '2030-01-01',
        description: 'Protection',
      },
    ],
    subtotal: 101.0,
    total: showDeliveryPreview ? 111.0 : 101.0,
    globalDiscount: 0,
    paymentMethod: 'cash',
    customerName: 'Ahmed Mohamed',
    customerCode: 'CUST-101',
    // Delivery preview - with address and phone
    saleType: showDeliveryPreview ? 'delivery' : 'walk-in',
    deliveryFee: showDeliveryPreview ? 10.0 : 0,
    customerPhone: showDeliveryPreview ? '01012345678' : undefined,
    customerAddress: showDeliveryPreview ? 'شارع الملك فيصل - الجيزة' : undefined,
    customerStreetAddress: showDeliveryPreview ? 'عمارة 15 - الدور 3 - شقة 7' : undefined,
    // Returns preview
    hasReturns: showReturnsPreview,
    netTotal: showReturnsPreview ? 56.0 : undefined,
    itemReturnedQuantities: showReturnsPreview ? { '2_1': 1 } : undefined,
  };

  const DUMMY_SHIFT: Shift = useMemo(() => {
    const now = getVerifiedDate();
    const openTime = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 hours ago
    return {
      id: 'SHIFT-889900',
      branchId: 'BR-001',
      status: 'closed',
      openTime: openTime.toISOString(),
      closeTime: now.toISOString(),
      openedBy: 'Dr. Ahmed',
      closedBy: 'Dr. Ahmed',
      openingBalance: 1000,
      closingBalance: 8600,
      expectedBalance: 8650,
      cashIn: 500,
      cashOut: 450,
      cashSales: 7500,
      cardSales: 2100,
      returns: 400,
      cashPurchases: 1200,
      cashPurchaseReturns: 150,
      totalDiscounts: 230,
      cashInvoiceCount: 65,
      cardInvoiceCount: 14,
      shiftDurationMinutes: 480,
      handoverReceiptNumber: 1042,
      printCount: showDuplicatePreview ? 2 : 1,
      transactions: [],
    };
  }, [getVerifiedDate, showDuplicatePreview]);

  // 3. Preview HTML Generation
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    if (previewMode === 'shift') {
      setPreviewHtml(generateShiftReceiptHTML(DUMMY_SHIFT, language));
      return;
    }

    // Update DUMMY_SALE to reflect preview toggles
    const activeDummySale = {
      ...DUMMY_SALE,
      total: showDeliveryPreview ? 111.0 : 101.0,
      returns: showReturnsPreview
        ? [
            {
              id: 'RET-1',
              date: getVerifiedDate().toISOString(),
              totalRefund: 15.5,
              items: [],
              originalSaleId: DUMMY_SALE.id,
              userId: 'admin',
            },
          ]
        : undefined,
    } as Sale;

    const html = generateInvoiceHTML(activeDummySale, { ...options, language, highlightedField: highlightedField || undefined });
    setPreviewHtml(html);
  }, [options, language, showDeliveryPreview, showReturnsPreview, previewMode, DUMMY_SHIFT, highlightedField]);

  const payloadSize = useMemo(() => {
    if (!previewHtml) return '0 B';
    const bytes = new TextEncoder().encode(previewHtml).length;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, [previewHtml]);
  
  const actualPrintSize = useMemo(() => {
    if (!previewHtml) return '0 B';

    // 1. Raw Payload size (the string itself)
    const htmlBytes = new TextEncoder().encode(previewHtml).length;

    // 2. Resource Dependencies (Approximate download sizes from public folder)
    let dependencyBytes = 30 * 1024; // JsBarcode.min.js (~30KB Gzipped)

    // Add font sizes
    const fontSizes = {
      'fake-receipt': 48 * 1024,
      raqami: 74.5 * 1024,
      receiptional: 134 * 1024,
    };

    // Always includes Raqami for Arabic fallback in current template
    dependencyBytes += fontSizes['raqami'];

    if (options.receiptFont === 'receipt-basic') {
      dependencyBytes += fontSizes['receiptional'];
    } else {
      dependencyBytes += fontSizes['fake-receipt'];
    }

    // If using default logo (not custom svg or base64)
    if (!options.logoBase64 && !options.logoSvgCode) {
      dependencyBytes += 84 * 1024; // app_icon.svg size
    }

    const total = htmlBytes + dependencyBytes;

    if (total < 1024) return `${total.toFixed(0)} B`;
    if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`;
    return `${(total / (1024 * 1024)).toFixed(1)} MB`;
  }, [previewHtml, options.receiptFont, options.logoBase64, options.logoSvgCode]);

  return (
    <div className='flex flex-col h-full gap-4 py-4 max-w-[1600px] mx-auto w-full'>
      {/* TOP: Template Manager Header */}
      <div className={`${CARD_BASE} p-2 px-4 rounded-2xl flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md bg-white/90 dark:bg-muted/90 border border-gray-100 dark:border-border`}>
        <div className='flex items-center gap-3 w-full lg:w-auto'>
          <h1 className='text-lg font-bold text-gray-800 dark:text-white whitespace-nowrap shrink-0'>
            {t.receiptDesigner?.title || (language === 'AR' ? 'تصميم الفواتير' : 'Receipt Designer')}
          </h1>
        </div>

        <div className='flex flex-wrap xl:flex-nowrap items-center justify-end gap-2 md:gap-3 shrink-0 ms-auto max-w-full'>
          <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 whitespace-nowrap shrink-0 hidden md:block'>
            {isAddingTemplate ? t.receiptDesigner.newTemplate : t.receiptDesigner.activeTemplate}
          </label>
          <div className='flex flex-wrap md:flex-nowrap items-center gap-2 min-w-0'>
            {isAddingTemplate || isEditingName ? (
              <div className='flex items-center gap-2 w-full animate-fadeIn'>
                <SmartInput
                  autoFocus
                  value={isEditingName ? editingNameValue : newTemplateName}
                  onChange={(e) => isEditingName ? setEditingNameValue(e.target.value) : setNewTemplateName(e.target.value)}
                  placeholder={isEditingName ? t.receiptDesigner.renameTemplate : t.receiptDesigner.newTemplatePlaceholder}
                  className='flex-1 !h-10 text-sm'
                  onKeyDown={(e) => e.key === 'Enter' && (isEditingName ? handleRenameTemplate(e as any) : handleCreateTemplate())}
                />
                <Tooltip content={t.common?.save || 'Save'} position="bottom">
                  <button
                    onClick={(e) => isEditingName ? handleRenameTemplate(e as any) : handleCreateTemplate()}
                    className='w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center transition-colors shrink-0'
                  >
                    <span className='material-symbols-rounded text-[20px]'>check</span>
                  </button>
                </Tooltip>
                <Tooltip content={t.common?.cancel || 'Cancel'} position="bottom">
                  <button
                    onClick={() => { setIsAddingTemplate(false); setIsEditingName(null); }}
                    className='w-10 h-10 bg-gray-600 hover:bg-gray-700 text-white rounded-xl flex items-center justify-center transition-colors shrink-0'
                  >
                    <span className='material-symbols-rounded text-[20px]'>close</span>
                  </button>
                </Tooltip>
              </div>
            ) : (
              <>
                <div className='relative h-10 w-full sm:w-[240px] md:w-[280px] shrink-0 flex items-center gap-1.5'>
                  <div className='flex-1 h-full relative'>
                    <FilterDropdown<SavedTemplate>
                      items={templates}
                      selectedItem={templates.find((t) => t.id === activeTemplateId)}
                      isOpen={isDropdownOpen}
                      onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
                      onSelect={(template) => {
                        handleTemplateSelect(template.id);
                        setIsDropdownOpen(false);
                      }}
                      minHeight={38}
                      keyExtractor={(item) => item.id}
                      renderSelected={(item) => (
                        <div className='flex items-center justify-between w-full'>
                          <span className='font-bold text-gray-800 dark:text-white truncate'>
                            {item?.name}
                          </span>
                          {item?.isDefault && (
                            <span className='ms-2 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold'>
                              Def
                            </span>
                          )}
                        </div>
                      )}
                      renderItem={(item, isSelected) => (
                        <div className='flex items-center justify-between w-full py-1'>
                          <div className='flex items-center gap-2 flex-1 min-w-0'>
                            <span
                              className={`text-sm truncate ${isSelected ? 'font-bold text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                              {item.name}
                            </span>
                            {item.isDefault && (
                              <span className='text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold'>
                                Def
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      variant='input'
                      className='w-full absolute top-0 start-0 z-10'
                    />
                  </div>

                  {/* Context Actions for Active Template */}
                  <div className='flex items-center bg-gray-100 dark:bg-muted/50 rounded-xl p-1 shrink-0 h-10 border border-gray-200 dark:border-border'>
                    <Tooltip content={t.receiptDesigner.renameTemplate || 'Rename'} position="bottom">
                      <button
                        onClick={() => {
                          const activeTpl = templates.find(t => t.id === activeTemplateId);
                          if (activeTpl) {
                             setIsEditingName(activeTpl.id);
                             setEditingNameValue(activeTpl.name);
                          }
                        }}
                        className='w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white dark:hover:bg-accent transition-all group'
                      >
                        <span className='material-symbols-rounded text-[18px] group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-500'>edit</span>
                      </button>
                    </Tooltip>
                    {templates.find(t => t.id === activeTemplateId) && !templates.find(t => t.id === activeTemplateId)?.isDefault && (
                      <Tooltip content={t.receiptDesigner.setDefault || 'Set Default'} position="bottom">
                        <button
                          onClick={(e) => handleSetDefault(e as any, activeTemplateId)}
                          className='w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:bg-white dark:hover:bg-accent transition-all'
                        >
                          <span className='material-symbols-rounded text-[18px]'>bookmark_add</span>
                        </button>
                      </Tooltip>
                    )}
                    {templates.length > 1 && (
                      <Tooltip content={t.receiptDesigner.deleteTemplate || 'Delete'} position="bottom">
                        <button
                          onClick={(e) => handleDeleteTemplate(e as any, activeTemplateId)}
                          className='w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-white dark:hover:bg-accent transition-all'
                        >
                          <span className='material-symbols-rounded text-[18px]'>delete</span>
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
                {hasChanges && (
                  <Tooltip content={t.common?.save || 'Save'} position="bottom">
                    <button
                      onClick={async () => {
                        setIsSaving(true);
                        try {
                          const newSettings = {
                            ...(activeBranch?.printSettings || {}),
                            [StorageKeys.RECEIPT_TEMPLATES]: templates,
                            [StorageKeys.RECEIPT_ACTIVE_TEMPLATE_ID]: activeTemplateId,
                          };
                          await updateBranch(activeBranchId, { printSettings: newSettings });
                          lastSavedState.current = JSON.stringify({ templates, activeTemplateId });
                          setHasChanges(false);
                          setQuotaError(false);
                        } catch (err) {
                          console.error('Failed to save settings:', err);
                          setQuotaError(true);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className='h-10 px-3 lg:px-4 flex items-center gap-1.5 justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-sm hover:shadow-md active:scale-95 shrink-0 border border-transparent animate-fadeIn'
                    >
                      <span className='material-symbols-rounded text-[20px]'>save</span>
                      <span className='hidden lg:inline text-[13px] font-bold'>{t.common?.save || 'Save'}</span>
                    </button>
                  </Tooltip>
                )}
                {hasChanges && (
                  <Tooltip content={t.common?.reset || 'Reset to Defaults'} position="bottom">
                    <button
                      onClick={() => {
                        if (confirm(t.common?.confirmReset || 'Reset all settings to defaults?')) {
                          setOptions(defaultOptions);
                        }
                      }}
                      className='h-10 px-3 lg:px-4 flex items-center gap-1.5 justify-center rounded-xl bg-white dark:bg-muted/50 border border-gray-200 dark:border-border text-gray-600 dark:text-gray-400 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-500/50 dark:hover:bg-red-500/10 hover:bg-red-50 transition-all active:scale-95 shrink-0'
                    >
                      <span className='material-symbols-rounded text-[20px]'>restart_alt</span>
                      <span className='hidden lg:inline text-[13px] font-bold'>{t.common?.reset || 'Reset'}</span>
                    </button>
                  </Tooltip>
                )}
                <Tooltip content={t.common?.add || 'Add'} position="bottom">
                  <button
                    onClick={() => setIsAddingTemplate(true)}
                    className='h-10 px-3 lg:px-4 flex items-center gap-1.5 justify-center rounded-xl bg-white dark:bg-muted/50 border border-gray-200 dark:border-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all active:scale-95 shrink-0 hover:border-primary-500 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400'
                  >
                    <span className='material-symbols-rounded text-[20px]'>add</span>
                    <span className='hidden lg:inline text-[13px] font-bold'>{t.common?.add || 'Add'}</span>
                  </button>
                </Tooltip>
                <Tooltip content={t.receiptDesigner.gallery?.title || 'Templates Market'} position="bottom">
                  <button
                    onClick={() => setIsGalleryOpen(true)}
                    className='h-10 px-3 lg:px-4 flex items-center gap-1.5 justify-center rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 transition-all active:scale-95 shrink-0 border border-transparent'
                  >
                    <span className='material-symbols-rounded text-[20px]'>storefront</span>
                    <span className='hidden xl:inline text-[13px] font-bold'>{t.receiptDesigner.gallery?.title || 'Market'}</span>
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: Controls and Preview */}
      <div className='flex flex-col lg:flex-row flex-1 gap-6 min-h-0'>
        {/* LEFT: Controls */}
        <div
          className={`w-full lg:w-1/3 ${CARD_BASE} rounded-2xl p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4 transition-opacity duration-300 ${previewMode === 'shift' ? 'opacity-30 pointer-events-none grayscale' : ''}`}
        >
          {/* Layout Selection */}
        <div className='mt-4 mb-2'>
          <label className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1'>
            <span className='material-symbols-rounded text-[14px]'>dashboard</span>
            {language === 'AR' ? 'شكل الفاتورة' : 'Receipt Layout'}
          </label>
          <div className='grid grid-cols-5 gap-2'>
            {RECEIPT_TEMPLATES.map(t => {
              const isActive = (options.receiptLayout || 'layout-1') === t.id;
              const translatedName = language === 'AR' 
                ? t.name.replace('Standard (Default)', 'الأساسي (افتراضي)')
                        .replace('Modern Dark', 'عصري داكن')
                        .replace('Compact Minimal', 'مضغوط')
                        .replace('Structured Grid', 'جدول منتظم')
                        .replace('Elegant Typography', 'أنيق طباعياً')
                : t.name;
                
              return (
                <button
                  key={t.id}
                  onClick={() => setOptions({ ...options, receiptLayout: t.id as any })}
                  className={`p-1.5 rounded-lg border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                    isActive 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500 shadow-sm' 
                      : 'border-gray-200 dark:border-border hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-muted'
                  }`}
                  title={t.description}
                >
                  <span className='text-[10px] font-medium leading-tight text-center break-words w-full'>
                    {translatedName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className='space-y-3'>
          {/* Logo Section - Compact Grid */}
          <div className='grid grid-cols-2 gap-3'>
            {/* Logo Upload */}
            <div className='space-y-1'>
              <label className='text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between'>
                <div className='flex items-center gap-1'>
                  <span className='material-symbols-rounded text-[14px]'>image</span>
                  {t.inventory.headers.images || 'Image'}
                </div>
                {quotaError && (
                  <span className='text-[10px] text-red-500 font-bold animate-pulse'>
                    {t.receiptDesigner.storage?.full || 'Storage Full!'}
                  </span>
                )}
              </label>
              {options.logoBase64 && !options.logoSvgCode ? (
                <div
                  className={`relative bg-gray-50 dark:bg-muted/30 rounded-xl p-2 flex items-center justify-center border ${quotaError ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'} h-24 w-full`}
                >
                  <img
                    src={options.logoBase64}
                    alt='Logo'
                    className={`max-h-full max-w-full object-contain ${options.hideLogo ? 'opacity-30 grayscale' : ''}`}
                  />
                  <div className="absolute top-1 end-7 z-10">
                    <Tooltip content={options.hideLogo ? (language === 'AR' ? 'إظهار' : 'Show') : (language === 'AR' ? 'إخفاء' : 'Hide')} position="top">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setOptions({ ...options, hideLogo: !options.hideLogo });
                        }}
                        className={`w-5 h-5 ${options.hideLogo ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-full flex items-center justify-center shadow-xs`}
                      >
                        <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>
                          {options.hideLogo ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </Tooltip>
                  </div>
                  <div className="absolute top-1 end-1 z-10">
                    <Tooltip content={language === 'AR' ? 'مسح اللوجو' : 'Remove Logo'} position="top">
                      <button
                        onClick={() => {
                          setOptions({ ...options, logoBase64: '' });
                          setQuotaError(false);
                        }}
                        className='w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-xs'
                      >
                        <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>close</span>
                      </button>
                    </Tooltip>
                  </div>
                  <div className='absolute bottom-1 end-1 px-1.5 py-0.5 rounded-md bg-black/40 text-white text-[9px] font-mono z-10 pointer-events-none'>
                    {Math.round((options.logoBase64.length * (3 / 4)) / 1024)} KB
                  </div>
                  {quotaError && (
                    <div className='absolute inset-0 bg-red-500/10 rounded-xl flex items-center justify-center pointer-events-none'>
                      <span className='text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold'>
                        {t.receiptDesigner.storage?.fileTooLarge || 'File too large'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed ${quotaError ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-300 dark:border-border hover:border-gray-400 dark:hover:border-border'} cursor-pointer transition-colors bg-gray-50 dark:bg-muted/30 h-24 w-full`}
                >
                  {quotaError ? (
                    <>
                      <span className='material-symbols-rounded text-red-500 text-[24px]'>
                        error
                      </span>
                      <span className='text-[10px] text-red-500 font-bold'>
                        {t.receiptDesigner.storage?.quotaExceeded || 'Storage Quota Exceeded'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className='material-symbols-rounded text-gray-400 text-[24px]'>
                        upload
                      </span>
                      <span className='text-[10px] text-gray-500 uppercase font-bold'>
                        {t.receiptDesigner.storage?.pngSvg || 'PNG / SVG'}
                      </span>
                    </>
                  )}
                  <input
                    type='file'
                    accept='.png,.svg,image/png,image/svg+xml'
                    className='hidden'
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setOptions({
                          ...options,
                          logoBase64: event.target?.result as string,
                          logoSvgCode: '',
                        });
                        setQuotaError(false); // Reset validation check on new attempt
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>

            {/* SVG Code Input */}
            <div className='space-y-1'>
              <label className='text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between'>
                <div className='flex items-center gap-1'>
                  <span className='material-symbols-rounded text-[14px]'>code</span>
                  SVG Code
                </div>
                {quotaError && (
                  <span className='text-[10px] text-red-500 font-bold animate-pulse'>
                    {t.receiptDesigner.storage?.full || 'Storage Full!'}
                  </span>
                )}
              </label>
              {options.logoSvgCode ? (
                <div
                  className={`relative bg-gray-50 dark:bg-muted/30 rounded-xl p-2 flex items-center justify-center border ${quotaError ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'} h-24 w-full`}
                >
                  <div
                    className={`w-full h-full flex items-center justify-center overflow-hidden ${options.hideLogo ? 'opacity-30 grayscale' : ''}`}
                    dangerouslySetInnerHTML={{ __html: options.logoSvgCode }}
                  />
                  <div className="absolute top-1 start-1 z-10">
                    <Tooltip content={options.hideLogo ? (language === 'AR' ? 'إظهار' : 'Show') : (language === 'AR' ? 'إخفاء' : 'Hide')} position="top">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setOptions({ ...options, hideLogo: !options.hideLogo });
                        }}
                        className={`w-5 h-5 ${options.hideLogo ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-full flex items-center justify-center shadow-xs`}
                      >
                        <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>
                          {options.hideLogo ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </Tooltip>
                  </div>
                  <div className="absolute top-1 end-1 z-10">
                    <Tooltip content={language === 'AR' ? 'مسح اللوجو' : 'Remove Logo'} position="top">
                      <button
                        onClick={() => {
                          setOptions({ ...options, logoSvgCode: '' });
                          setQuotaError(false);
                        }}
                        className='w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-xs'
                      >
                        <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>close</span>
                      </button>
                    </Tooltip>
                  </div>
                  <div className='absolute bottom-1 end-1 px-1.5 py-0.5 rounded-md bg-black/40 text-white text-[9px] font-mono z-10 pointer-events-none'>
                    {Math.round(options.logoSvgCode.length / 1024)} KB
                  </div>
                </div>
              ) : (
                <textarea
                  value={options.logoSvgCode || ''}
                  onChange={(e) => {
                    setOptions({ ...options, logoSvgCode: e.target.value, logoBase64: '' });
                    setQuotaError(false);
                  }}
                  className={`w-full h-24 p-2 rounded-xl border ${quotaError ? 'border-red-500' : 'border-gray-200 dark:border-border'} bg-gray-50 dark:bg-muted/30 focus:outline-hidden transition-all resize-none font-mono text-[9px]`}
                  placeholder='Paste SVG code here...'
                  dir='ltr'
                />
              )}
            </div>
          </div>

          {/* Settings Grid */}
          <div className='grid grid-cols-2 gap-3'>
            {/* Font Selector */}
            <div className='col-span-2 space-y-1'>
              <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                {t.receiptDesigner.options.font}
              </label>
              <SegmentedControl
                value={options.receiptFont || 'courier'}
                onChange={(val) => setOptions({ ...options, receiptFont: val })}
                size='sm'
                options={[
                  { label: 'Fake Receipt', value: 'courier' },
                  { label: 'Receiptional', value: 'receipt-basic' },
                ]}
              />
            </div>

            <div className='col-span-1 space-y-1'>
              <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                {t.receiptDesigner.options.storeName}
              </label>
              <SmartInput
                value={options.storeName}
                onChange={(e) => setOptions({ ...options, storeName: e.target.value })}
                onFocus={() => setHighlightedField('storeName')}
                onBlur={() => setHighlightedField(null)}
                className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30 text-sm'
                placeholder='Name...'
              />
            </div>

            <div className='col-span-1 space-y-1'>
              <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                {t.receiptDesigner.options.storeSubtitle}
              </label>
              <SmartInput
                value={options.storeSubtitle}
                onChange={(e) => setOptions({ ...options, storeSubtitle: e.target.value })}
                onFocus={() => setHighlightedField('storeSubtitle')}
                onBlur={() => setHighlightedField(null)}
                className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30 text-sm'
                placeholder='Slogan...'
              />
            </div>

            <div className='col-span-1 space-y-1'>
              <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                {t.receiptDesigner.options.hotline}
              </label>
              <SmartInput
                value={options.headerHotline}
                onChange={(e) => setOptions({ ...options, headerHotline: e.target.value })}
                onFocus={() => setHighlightedField('headerHotline')}
                onBlur={() => setHighlightedField(null)}
                className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30 text-sm'
                placeholder='19xxx...'
              />
            </div>

            <div className='col-span-1 space-y-1'>
              <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                {t.receiptDesigner.options.footer}
              </label>
              <SmartInput
                value={options.footerMessage}
                onChange={(e) => setOptions({ ...options, footerMessage: e.target.value })}
                onFocus={() => setHighlightedField('footerMessage')}
                onBlur={() => setHighlightedField(null)}
                className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30 text-sm'
                placeholder='Thanks...'
              />
            </div>

            <div className='col-span-2 space-y-1'>
              <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                {t.receiptDesigner.options.inquiry}
              </label>
              <SmartInput
                value={options.footerInquiry}
                onChange={(e) => setOptions({ ...options, footerInquiry: e.target.value })}
                onFocus={() => setHighlightedField('footerInquiry')}
                onBlur={() => setHighlightedField(null)}
                className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30 text-sm'
                placeholder='Questions?...'
              />
            </div>

            <div className='col-span-2 grid grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <label className='text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between'>
                  <span>{t.receiptDesigner.options.address}</span>
                  {activeBranch?.address && options.headerAddress !== activeBranch.address && (
                    <button
                      onClick={() =>
                        setOptions({ ...options, headerAddress: activeBranch.address })
                      }
                      className='text-[10px] text-primary-500 hover:underline'
                    >
                      {t.receiptDesigner.options?.useBranchInfo || 'Use Branch Info'}
                    </button>
                  )}
                </label>
                <SmartInput
                  value={options.headerAddress}
                  onChange={(e) => setOptions({ ...options, headerAddress: e.target.value })}
                  onFocus={() => setHighlightedField('headerAddress')}
                  onBlur={() => setHighlightedField(null)}
                  className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30 text-sm'
                  placeholder='Street...'
                />
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between'>
                  <span>{t.receiptDesigner.options.area}</span>
                  {activeBranch?.area && options.headerArea !== activeBranch.area && (
                    <button
                      onClick={() => setOptions({ ...options, headerArea: activeBranch.area })}
                      className='text-[10px] text-primary-500 hover:underline'
                    >
                      {t.receiptDesigner.options?.useBranchInfo || 'Use Branch Info'}
                    </button>
                  )}
                </label>
                <SmartInput
                  value={options.headerArea}
                  onChange={(e) => setOptions({ ...options, headerArea: e.target.value })}
                  onFocus={() => setHighlightedField('headerArea')}
                  onBlur={() => setHighlightedField(null)}
                  className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30 text-sm'
                  placeholder='Area...'
                />
              </div>
            </div>
            {/* Printing Preferences */}
            <div className='col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800'>
              <label className='text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block'>
                {t.receiptDesigner.printingPreferences || 'Printing Preferences'}
              </label>
              <SegmentedControl
                value={
                  options.autoPrintOnComplete
                    ? 'all'
                    : options.autoPrintOnDelivery
                      ? 'delivery'
                      : 'none'
                }
                onChange={(val) => {
                  setOptions({
                    ...options,
                    autoPrintOnComplete: val === 'all',
                    autoPrintOnDelivery: val === 'delivery',
                  });
                }}
                size='sm'
                options={[
                  {
                    label: t.receiptDesigner.autoPrintDelivery || 'Delivery Only',
                    value: 'delivery',
                  },
                  { label: t.receiptDesigner.autoPrintAll || 'All Orders', value: 'all' },
                  { label: t.receiptDesigner.autoPrintNone || 'None', value: 'none' },
                ]}
              />
            </div>

            <div className='col-span-2 space-y-1'>
              <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                {t.receiptDesigner.options.terms}
              </label>
              <textarea
                value={options.termsCondition?.replace(/\u003cbr\u003e/g, '\n')}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    termsCondition: e.target.value.replace(/\n/g, '\u003cbr\u003e'),
                  })
                }
                dir={useSmartDirection(
                  options.termsCondition?.replace(/\u003cbr\u003e/g, '\n'),
                  '...'
                )}
                onFocus={() => setHighlightedField('termsCondition')}
                onBlur={() => setHighlightedField(null)}
                className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all h-20 resize-none'
                placeholder='...'
              />
            </div>
          </div>

          {/* Toggles */}
          <div className='grid grid-cols-3 gap-2 mt-2'>
            <label className='flex items-center justify-between gap-2 cursor-pointer px-2 py-1.5 bg-gray-50 dark:bg-muted/30 rounded-xl h-10 transition-all hover:bg-gray-100 dark:hover:bg-gray-700'>
              <span className='text-[10px] font-bold text-gray-500 uppercase tracking-tight leading-tight'>
                {t.receiptDesigner.options.addressBox}
              </span>
              <input
                type='checkbox'
                checked={options.showAddressBox !== false}
                onChange={(e) => setOptions({ ...options, showAddressBox: e.target.checked })}
                className={`w-4 h-4 rounded-sm border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer`}
              />
            </label>

            <label className='flex items-center justify-between gap-2 cursor-pointer px-2 py-1.5 bg-gray-50 dark:bg-muted/30 rounded-xl h-10 transition-all hover:bg-gray-100 dark:hover:bg-gray-700'>
              <span className='text-[10px] font-bold text-gray-500 uppercase tracking-tight leading-tight'>
                {t.pos.deliveryOrder}
              </span>
              <input
                type='checkbox'
                checked={showDeliveryPreview}
                onChange={(e) => setShowDeliveryPreview(e.target.checked)}
                className={`w-4 h-4 rounded-sm border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer`}
              />
            </label>

            <label className='flex items-center justify-between gap-2 cursor-pointer px-2 py-1.5 bg-gray-50 dark:bg-muted/30 rounded-xl h-10 transition-all hover:bg-gray-100 dark:hover:bg-gray-700'>
              <span className='text-[10px] font-bold text-gray-500 uppercase tracking-tight leading-tight'>
                {t.salesHistory.returns.returned}
              </span>
              <input
                type='checkbox'
                checked={showReturnsPreview}
                onChange={(e) => setShowReturnsPreview(e.target.checked)}
                className={`w-4 h-4 rounded-sm border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer`}
              />
            </label>
          </div>
        </div>
      </div>

      {/* RIGHT: Preview */}
      <div className='flex-1 rounded-2xl border border-gray-200 dark:border-gray-800 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-size-[20px_20px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-gray-100 dark:bg-gray-950 relative flex flex-col overflow-hidden'>
        {/* Top-Left Unified Stats Badge */}
        <div className='absolute top-4 start-4 flex items-center px-2.5 h-7 bg-white/80 dark:bg-muted/80 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-border/50 shadow-xs text-[10px] font-bold gap-3 z-20 pointer-events-none'>
          <Tooltip content={t.receiptDesigner.preview?.memorySize || 'Real Printing Memory Size (Actual)'} position="bottom">
            <div className='flex items-center gap-1.2'>
              <span className='material-symbols-rounded text-[16px] text-primary-500'>memory</span>
              <span className='text-primary-600 dark:text-blue-400'>{actualPrintSize}</span>
            </div>
          </Tooltip>
          <div className='w-px h-3 bg-gray-200 dark:bg-gray-700' />
          <Tooltip content={t.receiptDesigner.preview?.payloadSize || 'Raw Data Transfer Size (Payload)'} position="bottom">
            <div
              className='flex items-center gap-1.2 opacity-80'
            >
              <span className='material-symbols-rounded text-[16px] text-gray-400'>database</span>
              <span className='text-gray-500 dark:text-gray-400'>{payloadSize}</span>
            </div>
          </Tooltip>
        </div>

        {/* Top-Right Action Button */}
        <div className='absolute top-4 end-4 z-20 flex gap-2'>
          <button
            type='button'
            className={`h-7 px-3 bg-white/80 dark:bg-muted/80 hover:bg-white dark:hover:bg-muted backdrop-blur-md rounded-xl border shadow-xs text-[10px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer pointer-events-auto ${previewMode === 'shift' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-gray-200/50 dark:border-border/50 text-gray-700 dark:text-gray-300'}`}
            onClick={() => setPreviewMode(previewMode === 'sale' ? 'shift' : 'sale')}
          >
            <span className='material-symbols-rounded'>receipt_long</span>
            {previewMode === 'shift'
              ? t.receiptDesigner.preview?.saleReceipt || 'Sale Receipt'
              : t.receiptDesigner.preview?.shiftReceipt || 'Shift Receipt'}
          </button>

          {previewMode === 'shift' && (
            <button
              type='button'
              className={`h-7 px-3 bg-white/80 dark:bg-muted/80 hover:bg-white dark:hover:bg-muted backdrop-blur-md rounded-xl border shadow-xs text-[10px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer pointer-events-auto ${showDuplicatePreview ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-gray-200/50 dark:border-border/50 text-gray-700 dark:text-gray-300'}`}
              onClick={() => setShowDuplicatePreview(!showDuplicatePreview)}
            >
              <span className='material-symbols-rounded'>content_copy</span>
              {t.receiptDesigner.preview?.previewAsDuplicate || 'Preview as Duplicate'}
            </button>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className='flex-1 overflow-y-auto custom-scrollbar p-8 flex justify-center'>
          <div
            className='bg-white shadow-2xl shadow-gray-300 dark:shadow-black shrink-0 transition-all duration-200 ease-in-out rounded-lg overflow-hidden'
            style={{ width: '80mm', height: 'fit-content', minHeight: '300px' }}
          >
            <iframe
              srcDoc={previewHtml}
              className='w-full border-none pointer-events-none block'
              style={{ height: '0px', minHeight: '100%', overflow: 'hidden' }}
              title='Receipt Preview'
              scrolling='no'
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
      </div>

      {/* Templates Market Gallery */}
      <TemplateMarketplaceModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        templates={RECEIPT_TEMPLATES.map((t: any) => ({
          ...t,
          previewHtml: generateInvoiceHTML(
            { ...DUMMY_SALE, total: 111.0, saleType: 'delivery' } as any, 
            { ...options, receiptLayout: t.id as any }
          ),
          renderDimensions: { width: '80mm', height: '140mm', scale: 1.0 }
        }))}
        selectedId={options.receiptLayout || 'layout-1'}
        onSelect={(id) => setOptions({ ...options, receiptLayout: id as any })}
        onUnlockPremium={(id) => {
          alert('Premium templates store coming soon!');
        }}
        t={t.receiptDesigner}
        color='primary'
      />
    </div>
  );
};

