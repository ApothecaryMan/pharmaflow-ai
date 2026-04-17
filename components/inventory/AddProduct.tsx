import type React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useStatusBar } from '../../components/layout/StatusBar';
import {
  getCategories,
  getLocalizedCategory,
  getLocalizedProductType,
  getProductTypes,
} from '../../data/productCategories';
import { validateStock } from '../../utils/inventory';
import type { Drug } from '../../types';
import { FilterDropdown } from '../common/FilterDropdown';
import { SmartDateInput, SmartInput, SmartTextarea } from '../common/SmartInputs';
import { Tooltip } from '../common/Tooltip';
import { CARD_LG, INPUT_BASE } from '../../utils/themeStyles';
import * as stockOps from '../../utils/stockOperations';
import { SegmentedControl } from '../common/SegmentedControl';
import { idGenerator } from '../../utils/idGenerator';
import { validationService } from '../../services/validation/validationService';

interface AddProductProps {
  inventory: Drug[];
  onAddDrug: (drug: Omit<Drug, 'id' | 'branchId' | 'createdAt' | 'updatedAt'>) => void;
  color: string;
  t: any;
  language?: string;
  hideHeader?: boolean;
  onCancel?: () => void;
}


export const AddProduct: React.FC<AddProductProps> = ({
  inventory,
  onAddDrug,
  color,
  t,
  language = 'EN',
  hideHeader = false,
  onCancel,
}) => {
  const { getVerifiedDate } = useStatusBar();
  const currentLang = language.toLowerCase() as 'en' | 'ar';
  const isRTL = currentLang === 'ar';

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Drug>>({
    name: '',
    nameArabic: '',
    genericName: [],
    category: 'General',
    dosageForm: '',
    price: 0,
    costPrice: 0,
    tax: 0,
    stock: 0,
    unitsPerPack: 1,
    minStock: 5,
    maxDiscount: 10,
    expiryDate: '',
    description: '',
    barcode: '',
    internalCode: '',
    additionalBarcodes: [],
    manufacturer: '',
    origin: 'local',
    itemRank: 'normal',
    status: 'active',
  });

  const scannerBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);
  const fastKeyCount = useRef<number>(0);
  const scannerTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;

      const now = Date.now();
      const isFast = lastKeyTime.current > 0 && now - lastKeyTime.current < 40;
      lastKeyTime.current = now;

      if (!isFast && e.key !== 'Enter') {
        if (fastKeyCount.current < 2) scannerBuffer.current = '';
        fastKeyCount.current = 0;
      }

      if (e.key === 'Enter') {
        const barcode = scannerBuffer.current.trim();
        if (barcode.length >= 3 && fastKeyCount.current >= 2) {
          e.preventDefault();
          setFormData(prev => {
            if (!prev.barcode) return { ...prev, barcode };
            if (prev.barcode !== barcode && !prev.additionalBarcodes?.includes(barcode)) {
              return { ...prev, additionalBarcodes: [...(prev.additionalBarcodes || []), barcode] };
            }
            return prev;
          });
          if (barcodeInputRef.current) barcodeInputRef.current.value = '';
        }
        scannerBuffer.current = '';
        fastKeyCount.current = 0;
        return;
      }

      if (e.key.length === 1) {
        scannerBuffer.current += e.key;
        if (isFast) fastKeyCount.current++;
        
        if (fastKeyCount.current >= 2) {
          e.preventDefault();
          const el = document.activeElement;
          if (el instanceof HTMLInputElement && fastKeyCount.current === 2) {
            el.value = el.value.slice(0, -2);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }

      if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
      scannerTimeout.current = setTimeout(() => {
        scannerBuffer.current = '';
        fastKeyCount.current = 0;
      }, 300);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [formData.barcode]);


  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  // Auto-generate internal code if empty
  const generateInternalCode = () => {
    // Delegation: The service layer will provide this during submission if left empty.
    // This maintains the placeholder while ensuring centralization.
    setFormData(prev => ({ ...prev, internalCode: '' }));
  };

  const margin = useMemo(() => {
    if (!formData.price || !formData.costPrice) return 0;
    // Calculation accounting for tax: profit = (price - cost) / price
    const profit = formData.price - formData.costPrice;
    return (profit / formData.price) * 100;
  }, [formData.price, formData.costPrice]);

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();

    // Capture any pending barcode from the input ref if the user didn't press Enter
    let finalBarcode = formData.barcode;
    let finalAdditionalBarcodes = [...(formData.additionalBarcodes || [])];
    
    const pendingBarcode = barcodeInputRef.current?.value.trim();
    if (pendingBarcode) {
      if (!finalBarcode) {
        finalBarcode = pendingBarcode;
      } else if (finalBarcode !== pendingBarcode && !finalAdditionalBarcodes.includes(pendingBarcode)) {
        finalAdditionalBarcodes.push(pendingBarcode);
      }
    }

    // Validate Primary Barcode
    if (finalBarcode && !validationService.isValidBarcode(finalBarcode)) {
      // In a real app, we'd use useAlert or similar. Here we rely on console + parent error handling.
      console.warn('[AddProduct] Invalid barcode format:', finalBarcode);
    }

    // Final internalCode assignment occurs in the service layer if empty
    const finalInternalCode = formData.internalCode;

    const newDrug: Omit<Drug, 'id' | 'branchId' | 'createdAt' | 'updatedAt'> = {
      name: formData.name || '',
      nameArabic: formData.nameArabic,
      genericName: formData.genericName,
      category: formData.category || 'General',
      price: formData.price || 0,
      costPrice: formData.costPrice || 0,
      tax: formData.tax,
      stock: validateStock(stockOps.resolveUnits(formData.stock || 0, false, formData.unitsPerPack)),
      expiryDate: formData.expiryDate || '',
      description: formData.description,
      barcode: finalBarcode,
      internalCode: finalInternalCode,
      unitsPerPack: formData.unitsPerPack || 1,
      minStock: formData.minStock,
      maxDiscount: formData.maxDiscount,
      dosageForm: formData.dosageForm,
      manufacturer: formData.manufacturer,
      origin: formData.origin,
      itemRank: formData.itemRank,
      status: formData.status || 'active',
      additionalBarcodes: finalAdditionalBarcodes,
    };

    try {
      await onAddDrug(newDrug as Drug);
      
      if (addAnother) {
        handleClear();
      } else {
        onCancel?.();
      }
    } catch (err) {
      // Errors are handled by the alert context in useEntityHandlers, 
      // but we catch here to prevent navigation if needed.
      console.error('Failed to add drug:', err);
    }
  };

  const handleClear = () => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.value = '';
    }
    setFormData({
      name: '',
      nameArabic: '',
      genericName: [],
      category: 'General',
      dosageForm: '',
      price: 0,
      costPrice: 0,
      tax: 0,
      stock: 0,
      unitsPerPack: 1,
      minStock: 5,
      maxDiscount: 10,
      expiryDate: '',
      description: '',
      barcode: '',
      internalCode: '',
      additionalBarcodes: [],
      manufacturer: '',
      origin: 'local',
      itemRank: 'normal',
      status: 'active',
    });
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in p-1">
      {/* Header */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 page-title">
              {t.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t.subtitle}
            </p>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {false && (
        <div className="fixed top-24 right-8 z-50 animate-slide-up">
          <div className="bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
            <span className="material-symbols-rounded">check_circle</span>
            <span className="font-medium">{t.messages?.success || 'Product added successfully!'}</span>
          </div>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24">
        {/* Left Column: Data Entry (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Identification */}
          <div className={`${CARD_LG} p-4 space-y-4`}>
            <div className="flex items-center justify-between border-b border-(--border-divider) pb-2 mb-4">
              <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {t.sections?.identification}
              </h3>
              <span className="material-symbols-rounded text-gray-400 text-lg">fingerprint</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1.5 flex-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 flex justify-between">
                  <span>{t.fields?.brandName} *</span>
                  <span className="text-primary-500 lowercase font-medium">{t.placeholders?.langDetect}</span>
                </label>
                <SmartInput
                  required
                  placeholder={t.placeholders?.brandName}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={INPUT_BASE}
                />
              </div>

              <div className="space-y-1.5 flex-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  {t.fields?.nameArabic}
                </label>
                <SmartInput
                  placeholder={t.placeholders?.nameArabic}
                  value={formData.nameArabic}
                  onChange={(e) => setFormData({ ...formData, nameArabic: e.target.value })}
                  className={INPUT_BASE}
                  dir="rtl"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  {t.fields?.genericName} *
                </label>
                <SmartInput
                  required
                  dir="auto"
                  placeholder={t.placeholders?.genericName}
                  value={formData.genericName?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, genericName: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className={INPUT_BASE}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  {t.fields?.barcode}
                </label>
                <div className={`${INPUT_BASE} flex flex-wrap gap-2 p-1.5 min-h-[44px] focus-within:ring-2 focus-within:ring-blue-500 transition-all`}>
                  {formData.barcode && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-100 dark:border-blue-800">
                      {formData.barcode}
                      <button type="button" onClick={() => setFormData({ ...formData, barcode: '' })} className="hover:text-red-500">
                        <span className="material-symbols-rounded text-sm">close</span>
                      </button>
                    </span>
                  )}
                  {formData.additionalBarcodes?.map((code, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] font-bold border border-gray-200 dark:border-gray-600">
                      {code}
                      <button type="button" onClick={() => {
                        const newCodes = [...(formData.additionalBarcodes || [])];
                        newCodes.splice(idx, 1);
                        setFormData({ ...formData, additionalBarcodes: newCodes });
                      }} className="hover:text-red-500">
                        <span className="material-symbols-rounded text-sm">close</span>
                      </button>
                    </span>
                  ))}
                  <input
                    ref={barcodeInputRef}
                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-[100px] px-1"
                    placeholder={t.placeholders?.barcode}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val) {
                          if (!formData.barcode) setFormData({ ...formData, barcode: val });
                          else setFormData({ ...formData, additionalBarcodes: [...(formData.additionalBarcodes || []), val] });
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  {t.fields?.internalCode}
                </label>
                <div className="relative">
                  <SmartInput
                    placeholder={t.placeholders?.internalCode}
                    value={formData.internalCode}
                    onChange={(e) => setFormData({ ...formData, internalCode: e.target.value })}
                    className={`${INPUT_BASE} font-mono pr-12`}
                  />
                  <button
                    type="button"
                    onClick={generateInternalCode}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-gray-50 dark:hover:bg-blue-900/20 transition-all"
                  >
                    <span className="material-symbols-rounded text-lg">magic_button</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Classification */}
          <div className={`${CARD_LG} p-4 space-y-4`}>
            <div className="flex items-center justify-between border-b border-(--border-divider) pb-2 mb-4">
              <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {t.sections?.classification}
              </h3>
              <span className="material-symbols-rounded text-gray-400 text-lg">category</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Classification Fields (Left 2/3) */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                    {t.fields?.category}
                  </label>
                  <FilterDropdown
                    variant="input"
                    minHeight="44px"
                    items={getCategories(currentLang)}
                    selectedItem={formData.category}
                    isOpen={isCategoryOpen}
                    onToggle={() => setIsCategoryOpen(!isCategoryOpen)}
                    onSelect={(val) => {
                      setFormData({ ...formData, category: val, dosageForm: '' });
                      setIsCategoryOpen(false);
                    }}
                    keyExtractor={(c) => c}
                    renderSelected={(c) => getLocalizedCategory(c || 'General', currentLang)}
                    renderItem={(c) => getLocalizedCategory(c, currentLang)}
                    className="w-full"
                    color={color}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                    {t.fields?.dosageForm}
                  </label>
                  <FilterDropdown
                    variant="input"
                    minHeight="44px"
                    items={getProductTypes(formData.category || 'General', currentLang)}
                    selectedItem={formData.dosageForm || ''}
                    isOpen={isTypeOpen}
                    onToggle={() => setIsTypeOpen(!isTypeOpen)}
                    onSelect={(val) => {
                      setFormData({ ...formData, dosageForm: val });
                      setIsTypeOpen(false);
                    }}
                    keyExtractor={(c) => c}
                    renderSelected={(c) =>
                      c ? getLocalizedProductType(c, currentLang) : t.placeholders?.dosageForm
                    }
                    renderItem={(c) => getLocalizedProductType(c, currentLang)}
                    className="w-full"
                    color={color}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                    {t.fields?.manufacturer}
                  </label>
                  <SmartInput
                    placeholder={t.placeholders?.manufacturer}
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className={INPUT_BASE}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                    {t.fields?.origin}
                  </label>
                  <SegmentedControl
                    value={formData.origin as 'local' | 'imported'}
                    onChange={(val) => setFormData({ ...formData, origin: val })}
                    options={[
                      { label: t.fields?.originLocal, value: 'local' },
                      { label: t.fields?.originImported, value: 'imported' },
                    ]}
                    size="sm"
                    color="blue"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                    {t.fields?.status || 'Product Status'}
                  </label>
                  <SegmentedControl
                    value={formData.status || 'active'}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={[
                      { label: t.active || 'Active', value: 'active', activeColor: 'green' },
                      { label: t.inactive || 'Inactive', value: 'inactive', activeColor: 'amber' },
                      { label: t.discontinued || 'Discontinued', value: 'discontinued', activeColor: 'red' },
                    ]}
                    size="sm"
                    color="blue"
                  />
                </div>
              </div>

              {/* Usage / Additional Details (Right 1/3) */}
              <div className="h-full flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  {t.fields?.description}
                </label>
                <SmartTextarea
                  placeholder={t.placeholders?.description}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${INPUT_BASE} flex-1 resize-none h-full`}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Inventory & Finance (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Section 4: Inventory & Storage */}
          <div className={`${CARD_LG} p-4 space-y-5`}>
            <div className="flex items-center justify-between border-b border-(--border-divider) pb-2 mb-4">
              <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {t.sections?.inventory}
              </h3>
              <span className="material-symbols-rounded text-gray-400 text-lg">inventory</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  {t.fields?.stock} *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  className={INPUT_BASE}
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  {t.fields?.unitsPerPack}
                </label>
                <input
                  type="number"
                  min="1"
                  className={INPUT_BASE}
                  value={formData.unitsPerPack}
                  onChange={(e) => setFormData({ ...formData, unitsPerPack: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  {t.fields?.minStock}
                </label>
                <input
                  type="number"
                  className={INPUT_BASE}
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  {t.fields?.expiryDate} *
                </label>
                <SmartDateInput
                  required
                  value={formData.expiryDate}
                  onChange={(val) => setFormData({ ...formData, expiryDate: val })}
                  className={INPUT_BASE}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Financials */}
          <div className={`${CARD_LG} p-4 space-y-5`}>
            <div className="flex items-center justify-between border-b border-(--border-divider) pb-2 mb-4">
              <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {t.sections?.financial}
              </h3>
              <span className="material-symbols-rounded text-gray-400 text-lg">payments</span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 flex justify-between">
                    <span>{t.fields?.price} *</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    className={INPUT_BASE}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                    {t.fields?.costPrice} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className={INPUT_BASE}
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                    {t.fields?.tax}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className={INPUT_BASE}
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar: Sticky Bottom */}
        <div className={`${hideHeader ? 'absolute' : 'fixed'} bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-(--border-divider) p-4 z-40 lg:pl-[64px]`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Left side: Secondary actions */}
            <div className="flex-1">
              <Tooltip 
                content={t.tooltips?.clear} 
                position="top"
                delay={500}
              >
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-6 py-3 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-sm transition-all flex items-center gap-2 group"
                >
                  <span className="material-symbols-rounded text-lg">
                    backspace
                  </span>
                  {t.actions?.clear}
                </button>
              </Tooltip>
            </div>

            {/* Center: Live Financial Info */}
            <div className="hidden lg:flex items-center gap-6 px-6 py-1 border-x border-gray-200 dark:border-gray-800">
              <div className="flex flex-col items-center min-w-[100px]">
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider leading-none mb-1">{t.fields?.liveProfit}</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-black leading-none ${((formData.price || 0) - (formData.costPrice || 0)) > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                    {((formData.price || 0) - (formData.costPrice || 0)).toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">{t.fields?.currency}</span>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider leading-none mb-1.5">{t.fields?.margin}</span>
                <div className={`px-4 py-1 rounded-full font-black text-[11px] transition-all duration-500 border ${
                  margin > 25 
                    ? 'bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200/50 dark:border-green-500/30' 
                    : margin > 10 
                      ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/30' 
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-500/30 opacity-60'
                }`}>
                  {margin.toFixed(1)}%
                </div>
              </div>
            </div>
            
            {/* Right side: Primary actions */}
            <div className="flex-1 flex items-center justify-end gap-3">
              <Tooltip 
                content={t.tooltips?.saveAndNew} 
                position="top"
                delay={500}
              >
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  className="px-6 py-3 rounded-2xl text-primary-600/80 dark:text-blue-400/80 hover:bg-gray-50 dark:hover:bg-blue-900/40 font-bold text-sm transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-rounded text-lg">add_circle</span>
                  {t.actions?.saveAndNew}
                </button>
              </Tooltip>

              <Tooltip 
                content={t.tooltips?.save} 
                position="top"
                delay={500}
              >
                <button
                  type="submit"
                  className="px-8 py-3 rounded-2xl bg-primary-600/90 hover:bg-primary-600 text-white font-bold text-sm transition-all active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-rounded">check_circle</span>
                  {t.actions?.save}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
