import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../context';
import {
  getCategories,
  getLocalizedCategory,
  getLocalizedProductType,
  getProductTypes,
} from '../../data/productCategories';
import type { Drug } from '../../types';
import { validateStock } from '../../utils/inventory';
import { resolveUnits } from '../../utils/stockUtils';
import { FilterDropdown } from '../common';
import { Modal } from '../common/Modal';
import { SmartDateInput, SmartInput, SmartTextarea } from '../common/SmartInputs';
import { MODAL_FOOTER_BTN_CANCEL, MODAL_FOOTER_BTN_PRIMARY } from '../../utils/themeStyles';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDrug: Drug | null;
  initialData?: Partial<Drug> | null;
  inventory: Drug[];
  onAddDrug: (drug: Omit<Drug, 'id' | 'branchId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateDrug: (drug: Drug) => void;
  color?: string;
  t: Translations;
}

const DEFAULT_FORM_STATE: Partial<Drug> = {
  name: '',
  nameAr: '',
  genericName: [],
  category: 'General',
  publicPrice: 0,
  unitPrice: 0,
  costPrice: 0,
  unitCostPrice: 0,
  stock: 0,
  expiryDate: '',
  description: '',
  barcode: '',
  internalCode: '',
  unitsPerPack: 1,
  maxDiscount: 10,
  additionalBarcodes: [],
  dosageForm: '',
  status: 'active',
};

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  editingDrug,
  initialData,
  inventory,
  onAddDrug,
  onUpdateDrug,
  color,
  t,
}) => {
  const { language: currentLang } = useSettings();
  const currentLangCode = currentLang.toLowerCase() as 'en' | 'ar';

  const [formData, setFormData] = useState<Partial<Drug>>(DEFAULT_FORM_STATE);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isEditDosageOpen, setIsEditDosageOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'inventoryPricing'>('general');

  // Initialize form state when modal opens or editing/initial drug changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
      if (editingDrug) {
        // Convert stock units to Packs for display
        const packs = editingDrug.stock / (editingDrug.unitsPerPack || 1);
        setFormData({
          ...editingDrug,
          stock: packs, // display in packs
          genericName: Array.isArray(editingDrug.genericName)
            ? editingDrug.genericName
            : editingDrug.genericName
              ? [editingDrug.genericName]
              : [],
        });
      } else if (initialData) {
        setFormData({
          ...DEFAULT_FORM_STATE,
          ...initialData,
          genericName: Array.isArray(initialData.genericName)
            ? initialData.genericName
            : initialData.genericName
              ? [initialData.genericName]
              : [],
        });
      } else {
        setFormData(DEFAULT_FORM_STATE);
      }
    }
  }, [isOpen, editingDrug, initialData]);

  const generateInternalCode = () => {
    // Find highest existing 6-digit numeric code
    const existingCodes = inventory
      .map((d) => d.internalCode)
      .filter((c) => c && /^\d{6}$/.test(c))
      .map((c) => parseInt(c!, 10));

    const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const nextCode = String(maxCode + 1).padStart(6, '0');

    setFormData((prev) => ({ ...prev, internalCode: nextCode }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare data: Convert stock (Packs) to Total Units
    const submissionData = {
      ...formData,
      stock: validateStock(resolveUnits(formData.stock || 0, false, formData.unitsPerPack)),
    };

    if (editingDrug) {
      onUpdateDrug({ ...editingDrug, ...submissionData } as Drug);
      onClose();
    } else if (formData.name && formData.expiryDate) {
      onAddDrug(submissionData as Omit<Drug, 'id' | 'branchId' | 'createdAt' | 'updatedAt'>);
      onClose();
    }
  };

  // Responsive layout class definitions based on sidebar vs. standard modal state
  const innerGridClass = 'grid grid-cols-1 md:grid-cols-2 gap-4';

  const pricingGridClass = 'grid grid-cols-1 md:grid-cols-2 gap-3';

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='4xl'
      zIndex={50}
      title={editingDrug ? t.modal.edit : t.modal.add}
      icon={editingDrug ? 'edit' : 'add_circle'}
      tabs={[
        { label: t.modal?.tabGeneral || 'General Info', value: 'general', icon: 'info' },
        {
          label: t.modal?.tabInventoryPricing || 'Inventory & Pricing',
          value: 'inventoryPricing',
          icon: 'payments',
        },
      ]}
      activeTab={activeTab}
      onTabChange={(val) => setActiveTab(val as 'general' | 'inventoryPricing')}
      footer={
        <div className='flex gap-3 w-full'>
          <button
            type='button'
            onClick={onClose}
            className={MODAL_FOOTER_BTN_CANCEL}
          >
            {t.modal.cancel}
          </button>
          <button
            type='submit'
            form='edit-drug-form'
            className={MODAL_FOOTER_BTN_PRIMARY}
          >
            {t.modal.save}
          </button>
        </div>
      }
    >
      <form id='edit-drug-form' onSubmit={handleSubmit} className='h-full'>
        {activeTab === 'general' ? (
          <div className={`${innerGridClass} gap-y-4`}>
            <div>
              <label
                htmlFor='brand-name'
                className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                {t.modal.brand} *
              </label>
              <SmartInput
                id='brand-name'
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label
                htmlFor='name-arabic'
                className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                {t.modal.nameArabic || 'Arabic Name'}
              </label>
              <SmartInput
                id='name-arabic'
                value={formData.nameAr || ''}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                dir='rtl'
              />
            </div>
            <div className='md:col-span-2 space-y-1'>
              <label
                htmlFor='generic-name'
                className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                Generic Name
              </label>
              <SmartInput
                id='generic-name'
                value={
                  Array.isArray(formData.genericName)
                    ? formData.genericName.join(', ')
                    : formData.genericName || ''
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    genericName: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>

            <div>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                {t.modal.category} *
              </label>
              <FilterDropdown
                variant='input'
                items={getCategories(currentLangCode)}
                selectedItem={formData.category} // English ID
                isOpen={isEditCategoryOpen}
                onToggle={() => setIsEditCategoryOpen(!isEditCategoryOpen)}
                onSelect={(val) => {
                  setFormData({ ...formData, category: val, dosageForm: '' });
                  setIsEditCategoryOpen(false);
                }}
                keyExtractor={(c) => c}
                renderSelected={(c) => getLocalizedCategory(c || 'General', currentLangCode)}
                renderItem={(c) => getLocalizedCategory(c, currentLangCode)}
                className='w-full h-[50px]'
                color={color}
              />
            </div>
            <div>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Product Type
              </label>
              <FilterDropdown
                variant='input'
                items={getProductTypes(formData.category || 'General', currentLangCode)} // English IDs
                selectedItem={formData.dosageForm || ''}
                isOpen={isEditDosageOpen}
                onToggle={() => setIsEditDosageOpen(!isEditDosageOpen)}
                onSelect={(val) => {
                  setFormData({ ...formData, dosageForm: val });
                  setIsEditDosageOpen(false);
                }}
                keyExtractor={(c) => c}
                renderSelected={(c) =>
                  c
                    ? getLocalizedProductType(c, currentLangCode)
                    : t.addProduct?.placeholders?.dosageForm || 'Select Type'
                }
                renderItem={(c) => getLocalizedProductType(c, currentLangCode)}
                className='w-full h-[50px]'
                color={color}
              />
            </div>

            <div className='md:col-span-2 space-y-1.5'>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                {t.fields?.status || 'Product Status'}
              </label>
              <div className='flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200 dark:border-gray-700'>
                <button
                  type='button'
                  onClick={() => setFormData({ ...formData, status: 'active' })}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${formData.status === 'active' || !formData.status ? 'bg-white dark:bg-gray-700 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-400'}`}
                >
                  {t.active || 'Active'}
                </button>
                <button
                  type='button'
                  onClick={() => setFormData({ ...formData, status: 'inactive' })}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${formData.status === 'inactive' ? 'bg-white dark:bg-gray-700 shadow-sm text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}
                >
                  {t.inactive || 'Inactive'}
                </button>
                <button
                  type='button'
                  onClick={() => setFormData({ ...formData, status: 'discontinued' })}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${formData.status === 'discontinued' ? 'bg-white dark:bg-gray-700 shadow-sm text-red-600 dark:text-red-400' : 'text-gray-400'}`}
                >
                  {t.discontinued || 'Discontinued'}
                </button>
              </div>
            </div>

            {/* Multi-Barcode Input */}
            <div className='md:col-span-2 space-y-1'>
              <label
                htmlFor='barcode-input'
                className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                {t.modal.barcode}
              </label>
              <div className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500 transition-all flex flex-wrap gap-2 items-center min-h-[42px]'>
                {formData.barcode && (
                  <span className='badge-info gap-1'>
                    <span className='material-symbols-rounded text-[14px]'>qr_code_2</span>
                    {formData.barcode}
                    <button
                      type='button'
                      onClick={() => setFormData({ ...formData, barcode: '' })}
                      className='hover:text-blue-950 dark:hover:text-blue-100'
                    >
                      <span className='material-symbols-rounded text-[14px]'>close</span>
                    </button>
                  </span>
                )}
                {formData.additionalBarcodes?.map((code, idx) => (
                  <span key={idx} className='badge-neutral gap-1'>
                    {code}
                    <button
                      type='button'
                      onClick={() => {
                        const newCodes = [...(formData.additionalBarcodes || [])];
                        newCodes.splice(idx, 1);
                        setFormData({ ...formData, additionalBarcodes: newCodes });
                      }}
                      className='hover:text-gray-950 dark:hover:text-gray-100'
                    >
                      <span className='material-symbols-rounded text-[14px]'>close</span>
                    </button>
                  </span>
                ))}
                <input
                  className='flex-1 bg-transparent border-none outline-hidden text-sm min-w-[120px]'
                  placeholder={!formData.barcode ? 'Scan primary barcode' : 'Add more...'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        if (!formData.barcode) setFormData({ ...formData, barcode: val });
                        else
                          setFormData({
                            ...formData,
                            additionalBarcodes: [...(formData.additionalBarcodes || []), val],
                          });
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className='md:col-span-2 space-y-1'>
              <label
                htmlFor='internal-code'
                className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                {t.modal.internalCode}
              </label>
              <div className='relative'>
                <SmartInput
                  id='internal-code'
                  className='font-mono pr-10'
                  placeholder='Auto-generated'
                  value={formData.internalCode || ''}
                  onChange={(e) => setFormData({ ...formData, internalCode: e.target.value })}
                />
                <button
                  type='button'
                  onClick={generateInternalCode}
                  className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary-500 transition-colors'
                  title='Auto-Generate'
                >
                  <span className='material-symbols-rounded text-[20px]'>autorenew</span>
                </button>
              </div>
            </div>

            <div className='md:col-span-2 flex flex-col min-h-[100px]'>
              <label
                htmlFor='description-input'
                className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                {t.modal.desc}
              </label>
              <SmartTextarea
                id='description-input'
                className='w-full flex-1 resize-none'
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-4'>
              <h4 className='text-xs font-bold text-gray-500 uppercase flex items-center gap-2'>
                <span className='material-symbols-rounded text-base'>inventory</span> Inventory
              </h4>
              <div className={pricingGridClass}>
                <div>
                  <label
                    htmlFor='stock-input'
                    className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
                  >
                    {t.modal.stock}
                  </label>
                  <SmartInput
                    id='stock-input'
                    type='number'
                    step='0.01'
                    required
                    value={formData.stock || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor='units-pack'
                    className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
                  >
                    {t.modal.unitsPerPack}
                  </label>
                  <SmartInput
                    id='units-pack'
                    type='number'
                    min='1'
                    value={formData.unitsPerPack || 1}
                    onChange={(e) =>
                      setFormData({ ...formData, unitsPerPack: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  {t.modal.expiry}
                </label>
                <SmartDateInput
                  required
                  className='w-full'
                  value={formData.expiryDate || ''}
                  onChange={(val) => setFormData({ ...formData, expiryDate: val })}
                />
              </div>
            </div>

            <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-4'>
              <h4 className='text-xs font-bold text-gray-500 uppercase flex items-center gap-2'>
                <span className='material-symbols-rounded text-base'>payments</span> Pricing
              </h4>
              <div className='space-y-4'>
                <div>
                  <label
                    htmlFor='public-price'
                    className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
                  >
                    {t.modal.publicPrice}
                  </label>
                  <SmartInput
                    id='public-price'
                    type='number'
                    step='0.01'
                    required
                    className='font-bold text-green-600'
                    value={formData.publicPrice || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, publicPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor='cost-price'
                    className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
                  >
                    {t.modal.cost}
                  </label>
                  <SmartInput
                    id='cost-price'
                    type='number'
                    step='0.01'
                    value={formData.costPrice || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className={pricingGridClass}>
                <div>
                  <label
                    htmlFor='unit-price'
                    className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
                  >
                    {currentLangCode === 'ar' ? 'سعر الشريط' : 'Unit Price'}
                  </label>
                  <SmartInput
                    id='unit-price'
                    type='number'
                    step='0.01'
                    className='font-bold text-amber-600'
                    value={formData.unitPrice || 0}
                    placeholder={
                      formData.publicPrice && formData.unitsPerPack
                        ? (formData.publicPrice / formData.unitsPerPack).toFixed(2)
                        : ''
                    }
                    onChange={(e) =>
                      setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor='unit-cost'
                    className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
                  >
                    {currentLangCode === 'ar' ? 'تكلفة الشريط' : 'Unit Cost'}
                  </label>
                  <SmartInput
                    id='unit-cost'
                    type='number'
                    step='0.01'
                    className='text-amber-700'
                    value={formData.unitCostPrice || 0}
                    placeholder={
                      formData.costPrice && formData.unitsPerPack
                        ? (formData.costPrice / formData.unitsPerPack).toFixed(2)
                        : ''
                    }
                    onChange={(e) =>
                      setFormData({ ...formData, unitCostPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor='max-discount'
                  className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
                >
                  Max Discount (%)
                </label>
                <SmartInput
                  id='max-discount'
                  type='number'
                  min='0'
                  max='100'
                  className='text-red-500'
                  value={formData.maxDiscount || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
